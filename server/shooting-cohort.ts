import { and, asc, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "./db";
import {
  shootingCohortApplications,
  shootingCohortAssessments,
  shootingCohortMessages,
  shootingCohortSettings,
  shootingCohortVideoSubmissions,
  customWorkoutRequests,
  userProfiles,
} from "@shared/schema";
import type {
  AdminShootingCohortStatus,
  ShootingCohortApplicationAnswers,
  ShootingCohortAssessmentInput,
  ShootingCohortStatus,
  ShootingCohortVideoSubmissionInput,
  ShootingCohortWorkoutRequestInput,
} from "@shared/shooting-cohort";
import {
  canAssignShootingCohortSeat,
  getShootingCohortAdmissionStatus,
  getShootingCohortSenderDisplayName,
  SHOOTING_COHORT_FOCUS_LABELS,
} from "@shared/shooting-cohort";

const ACTIVE_SEAT_STATUSES: readonly ShootingCohortStatus[] = ["active", "invited"];
const VISIBLE_APPLICATION_STATUSES: readonly ShootingCohortStatus[] = ["active", "invited", "waitlisted", "needs_review"];

export class ShootingCohortError extends Error {
  constructor(message: string, readonly statusCode: number = 400) {
    super(message);
    this.name = "ShootingCohortError";
  }
}

async function ensureSettingsRow() {
  await db.insert(shootingCohortSettings).values({ id: 1 }).onConflictDoNothing();
  const [settings] = await db
    .select()
    .from(shootingCohortSettings)
    .where(eq(shootingCohortSettings.id, 1));
  if (!settings) throw new Error("Shooting cohort settings could not be loaded");
  return settings;
}

async function countApplications(statuses: readonly ShootingCohortStatus[]) {
  const [result] = await db
    .select({ value: count() })
    .from(shootingCohortApplications)
    .where(inArray(shootingCohortApplications.status, [...statuses]));
  return Number(result?.value || 0);
}

export async function hasActiveShootingCohortMembership(userId: string): Promise<boolean> {
  const [application] = await db
    .select({ id: shootingCohortApplications.id })
    .from(shootingCohortApplications)
    .where(and(
      eq(shootingCohortApplications.userId, userId),
      eq(shootingCohortApplications.status, "active"),
    ))
    .limit(1);
  return Boolean(application);
}

export async function getShootingCohortStatus(userId: string) {
  const [application] = await db
    .select()
    .from(shootingCohortApplications)
    .where(eq(shootingCohortApplications.userId, userId))
    .limit(1);
  const [settings, activeCount, invitedCount, waitlistCount] = await Promise.all([
    ensureSettingsRow(),
    countApplications(["active"]),
    countApplications(["invited"]),
    countApplications(["waitlisted"]),
  ]);
  const assessments = application
    ? await db.select().from(shootingCohortAssessments)
      .where(and(
        eq(shootingCohortAssessments.userId, userId),
        eq(shootingCohortAssessments.protocolVersion, 2),
      ))
      .orderBy(desc(shootingCohortAssessments.createdAt))
    : [];

  return {
    settings: {
      capacity: settings.capacity,
      applicationsOpen: settings.applicationsOpen,
      goalThreePointPercent: settings.goalThreePointPercent,
      goalMidRangePercent: settings.goalMidRangePercent,
      goalFreeThrowPercent: settings.goalFreeThrowPercent,
      activeCount,
      invitedCount,
    },
    application: application ? {
      id: application.id,
      status: application.status,
      answers: application.answers,
      appliedAt: application.appliedAt,
      invitedAt: application.invitedAt,
      acceptedAt: application.acceptedAt,
    } : null,
    assessments,
    waitlistCount,
  };
}

export async function submitShootingCohortApplication(
  userId: string,
  answers: ShootingCohortApplicationAnswers,
) {
  return db.transaction(async (tx) => {
    await tx.insert(shootingCohortSettings).values({ id: 1 }).onConflictDoNothing();
    const [settings] = await tx
      .select()
      .from(shootingCohortSettings)
      .where(eq(shootingCohortSettings.id, 1))
      .for("update");
    if (!settings) throw new Error("Shooting cohort settings could not be loaded");
    if (!settings.applicationsOpen) {
      throw new ShootingCohortError("Applications are currently closed.", 403);
    }

    const [existing] = await tx
      .select()
      .from(shootingCohortApplications)
      .where(eq(shootingCohortApplications.userId, userId))
      .for("update");
    if (existing && !["withdrawn", "declined", "removed"].includes(existing.status)) {
      throw new ShootingCohortError("You already have a cohort application.", 409);
    }

    const [seatCount] = await tx.select({ value: count() })
      .from(shootingCohortApplications)
      .where(inArray(shootingCohortApplications.status, [...ACTIVE_SEAT_STATUSES]));
    const occupiedSeats = Number(seatCount?.value || 0);
    const status = getShootingCohortAdmissionStatus(occupiedSeats, settings.capacity);
    const now = new Date();

    if (existing) {
      const [updated] = await tx.update(shootingCohortApplications)
        .set({
          status,
          answers,
          appliedAt: now,
          invitedAt: null,
          acceptedAt: status === "active" ? now : null,
          updatedAt: now,
        })
        .where(eq(shootingCohortApplications.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await tx.insert(shootingCohortApplications).values({
      userId,
      status,
      answers,
      acceptedAt: status === "active" ? now : null,
    }).returning();
    return created;
  });
}

export async function updateShootingCohortApplication(
  userId: string,
  answers: ShootingCohortApplicationAnswers,
) {
  const [application] = await db.update(shootingCohortApplications)
    .set({ answers, updatedAt: new Date() })
    .where(and(
      eq(shootingCohortApplications.userId, userId),
      inArray(shootingCohortApplications.status, [...VISIBLE_APPLICATION_STATUSES]),
    ))
    .returning();
  if (!application) throw new ShootingCohortError("There is no active cohort application to update.", 404);
  return application;
}

export async function createShootingCohortVideoSubmission(
  userId: string,
  submission: ShootingCohortVideoSubmissionInput,
) {
  const [created] = await db.insert(shootingCohortVideoSubmissions)
    .values({ ...submission, userId })
    .returning();
  return created;
}

export async function getShootingCohortVideoSubmissionsForPlayer(userId: string) {
  return db.select().from(shootingCohortVideoSubmissions)
    .where(eq(shootingCohortVideoSubmissions.userId, userId))
    .orderBy(desc(shootingCohortVideoSubmissions.createdAt));
}

export async function getShootingCohortVideoSubmissionForPlayer(videoId: string, userId: string) {
  const [submission] = await db.select().from(shootingCohortVideoSubmissions)
    .where(and(
      eq(shootingCohortVideoSubmissions.id, videoId),
      eq(shootingCohortVideoSubmissions.userId, userId),
    ))
    .limit(1);
  return submission;
}

export async function getShootingCohortVideoSubmissionsForAdmin(applicationId: string) {
  const [application] = await db.select({
    userId: shootingCohortApplications.userId,
    status: shootingCohortApplications.status,
  })
    .from(shootingCohortApplications)
    .where(eq(shootingCohortApplications.id, applicationId))
    .limit(1);
  if (!application || application.status !== "active") {
    throw new ShootingCohortError("Active cohort member not found.", 404);
  }
  return getShootingCohortVideoSubmissionsForPlayer(application.userId);
}

export async function getAllActiveShootingCohortVideoSubmissionsForAdmin() {
  return db.select({
    id: shootingCohortVideoSubmissions.id,
    userId: shootingCohortVideoSubmissions.userId,
    title: shootingCohortVideoSubmissions.title,
    videoUrl: shootingCohortVideoSubmissions.videoUrl,
    thumbnailUrl: shootingCohortVideoSubmissions.thumbnailUrl,
    description: shootingCohortVideoSubmissions.description,
    workoutRequestId: shootingCohortVideoSubmissions.workoutRequestId,
    founderFeedback: shootingCohortVideoSubmissions.founderFeedback,
    feedbackUpdatedAt: shootingCohortVideoSubmissions.feedbackUpdatedAt,
    createdAt: shootingCohortVideoSubmissions.createdAt,
    displayName: userProfiles.displayName,
    email: userProfiles.email,
  })
    .from(shootingCohortVideoSubmissions)
    .innerJoin(shootingCohortApplications, and(
      eq(shootingCohortApplications.userId, shootingCohortVideoSubmissions.userId),
      eq(shootingCohortApplications.status, "active"),
    ))
    .leftJoin(userProfiles, eq(userProfiles.userId, shootingCohortVideoSubmissions.userId))
    .orderBy(desc(shootingCohortVideoSubmissions.createdAt));
}

export async function updateShootingCohortVideoFeedback(
  videoId: string,
  adminId: string,
  founderFeedback: string,
) {
  const [eligibleSubmission] = await db.select({ id: shootingCohortVideoSubmissions.id })
    .from(shootingCohortVideoSubmissions)
    .innerJoin(shootingCohortApplications, and(
      eq(shootingCohortApplications.userId, shootingCohortVideoSubmissions.userId),
      eq(shootingCohortApplications.status, "active"),
    ))
    .where(eq(shootingCohortVideoSubmissions.id, videoId))
    .limit(1);
  if (!eligibleSubmission) throw new ShootingCohortError("Active member video not found.", 404);

  const [updated] = await db.update(shootingCohortVideoSubmissions)
    .set({
      founderFeedback: founderFeedback || null,
      feedbackUpdatedAt: new Date(),
      feedbackUpdatedBy: adminId,
    })
    .where(eq(shootingCohortVideoSubmissions.id, videoId))
    .returning();
  return updated;
}

export async function updateShootingCohortSettings(
  capacity: number,
  applicationsOpen: boolean,
  updatedBy: string,
  goals: {
    goalThreePointPercent: number | null;
    goalMidRangePercent: number | null;
    goalFreeThrowPercent: number | null;
  },
) {
  await db.insert(shootingCohortSettings).values({ id: 1 }).onConflictDoNothing();
  const [updated] = await db.update(shootingCohortSettings)
    .set({ capacity, applicationsOpen, ...goals, updatedBy, updatedAt: new Date() })
    .where(eq(shootingCohortSettings.id, 1))
    .returning();
  return updated;
}

export async function createShootingCohortWorkoutRequest(
  userId: string,
  input: ShootingCohortWorkoutRequestInput,
) {
  return db.transaction(async (tx) => {
    const [application] = await tx.select()
      .from(shootingCohortApplications)
      .where(and(
        eq(shootingCohortApplications.userId, userId),
        eq(shootingCohortApplications.status, "active"),
      ))
      .for("update");
    if (!application) throw new ShootingCohortError("Active cohort members only.", 403);

    const [existingRequest] = await tx.select({ id: customWorkoutRequests.id })
      .from(customWorkoutRequests)
      .where(and(
        eq(customWorkoutRequests.userId, userId),
        inArray(customWorkoutRequests.status, ["submitted", "in_progress", "assigned"]),
      ))
      .limit(1);
    if (existingRequest) throw new ShootingCohortError("You already have an active custom-workout request.", 409);

    const hoopAccessLabels = {
      indoor: "Indoor hoop",
      outdoor: "Outdoor hoop",
      both: "Indoor and outdoor hoop",
      limited: "Limited hoop access",
    } as const;
    const [request] = await tx.insert(customWorkoutRequests).values({
      userId,
      improvementFocus: input.skills.map((skill) => SHOOTING_COHORT_FOCUS_LABELS[skill]).join(", "),
      desiredOutcome: input.desiredOutcome,
      availableTime: input.availableTime,
      equipmentConstraints: `Hoop access on application: ${hoopAccessLabels[application.answers.hoopAccess]}`,
      additionalNotes: null,
    }).returning();

    const [video] = input.video
      ? await tx.insert(shootingCohortVideoSubmissions).values({
        ...input.video,
        userId,
        workoutRequestId: request.id,
      }).returning()
      : [null];

    return { request, video };
  });
}

export async function inviteShootingCohortApplicant(applicationId: string) {
  return db.transaction(async (tx) => {
    await tx.insert(shootingCohortSettings).values({ id: 1 }).onConflictDoNothing();
    const [settings] = await tx.select().from(shootingCohortSettings)
      .where(eq(shootingCohortSettings.id, 1))
      .for("update");
    if (!settings) throw new Error("Shooting cohort settings could not be loaded");

    const [application] = await tx.select().from(shootingCohortApplications)
      .where(eq(shootingCohortApplications.id, applicationId))
      .for("update");
    if (!application) throw new ShootingCohortError("Application not found.", 404);
    if (application.status !== "waitlisted") {
      throw new ShootingCohortError("Only waitlisted applicants can be invited.", 409);
    }

    const [seatCount] = await tx.select({ value: count() })
      .from(shootingCohortApplications)
      .where(inArray(shootingCohortApplications.status, [...ACTIVE_SEAT_STATUSES]));
    const occupiedSeats = Number(seatCount?.value || 0);
    if (occupiedSeats >= settings.capacity) {
      throw new ShootingCohortError("The cohort is at capacity. Increase the cap or free a seat before inviting.", 409);
    }

    const [updated] = await tx.update(shootingCohortApplications)
      .set({ status: "invited", invitedAt: new Date(), updatedAt: new Date() })
      .where(eq(shootingCohortApplications.id, application.id))
      .returning();
    return updated;
  });
}

export async function updateShootingCohortApplicationStatus(
  applicationId: string,
  status: AdminShootingCohortStatus,
) {
  return db.transaction(async (tx) => {
    await tx.insert(shootingCohortSettings).values({ id: 1 }).onConflictDoNothing();
    const [settings] = await tx.select().from(shootingCohortSettings)
      .where(eq(shootingCohortSettings.id, 1))
      .for("update");
    if (!settings) throw new Error("Shooting cohort settings could not be loaded");

    const [application] = await tx.select().from(shootingCohortApplications)
      .where(eq(shootingCohortApplications.id, applicationId))
      .for("update");
    if (!application || !VISIBLE_APPLICATION_STATUSES.includes(application.status)) {
      throw new ShootingCohortError("Application not found.", 404);
    }
    if (application.status === status) return { application, changed: false };

    const [seatCount] = await tx.select({ value: count() })
      .from(shootingCohortApplications)
      .where(inArray(shootingCohortApplications.status, [...ACTIVE_SEAT_STATUSES]));
    const occupiedSeats = Number(seatCount?.value || 0);
    if (!canAssignShootingCohortSeat(application.status, status, occupiedSeats, settings.capacity)) {
      throw new ShootingCohortError("The cohort is at capacity. Increase the cap or free a seat before assigning this status.", 409);
    }

    const now = new Date();
    const [updated] = await tx.update(shootingCohortApplications)
      .set({
        status,
        invitedAt: status === "invited" ? now : null,
        acceptedAt: status === "active" ? now : null,
        updatedAt: now,
      })
      .where(eq(shootingCohortApplications.id, application.id))
      .returning();
    return { application: updated, changed: true };
  });
}

export async function respondToShootingCohortInvitation(userId: string, response: "accept" | "decline") {
  return db.transaction(async (tx) => {
    const [application] = await tx.select().from(shootingCohortApplications)
      .where(eq(shootingCohortApplications.userId, userId))
      .for("update");
    if (!application || application.status !== "invited") {
      throw new ShootingCohortError("There is no pending cohort invitation.", 409);
    }
    const now = new Date();
    const [updated] = await tx.update(shootingCohortApplications)
      .set({
        status: response === "accept" ? "active" : "declined",
        acceptedAt: response === "accept" ? now : null,
        updatedAt: now,
      })
      .where(eq(shootingCohortApplications.id, application.id))
      .returning();
    return updated;
  });
}

export async function removeShootingCohortApplication(applicationId: string) {
  const [application] = await db.update(shootingCohortApplications)
    .set({ status: "removed", updatedAt: new Date() })
    .where(and(
      eq(shootingCohortApplications.id, applicationId),
      inArray(shootingCohortApplications.status, [...VISIBLE_APPLICATION_STATUSES]),
    ))
    .returning();
  if (!application) throw new ShootingCohortError("Active application not found.", 404);
  return application;
}

export async function getShootingCohortAdminOverview() {
  const settings = await ensureSettingsRow();
  const applications = await db.select({
    id: shootingCohortApplications.id,
    userId: shootingCohortApplications.userId,
    status: shootingCohortApplications.status,
    answers: shootingCohortApplications.answers,
    appliedAt: shootingCohortApplications.appliedAt,
    invitedAt: shootingCohortApplications.invitedAt,
    acceptedAt: shootingCohortApplications.acceptedAt,
    displayName: userProfiles.displayName,
    email: userProfiles.email,
    profilePhotoUrl: userProfiles.profilePhotoUrl,
  })
    .from(shootingCohortApplications)
    .leftJoin(userProfiles, eq(userProfiles.userId, shootingCohortApplications.userId))
    .where(inArray(shootingCohortApplications.status, [...VISIBLE_APPLICATION_STATUSES]))
    .orderBy(asc(shootingCohortApplications.appliedAt), asc(shootingCohortApplications.id));

  const cohortUserIds = applications.map((application) => application.userId);
  const assessments = cohortUserIds.length > 0
    ? await db.select().from(shootingCohortAssessments)
      .where(and(
        inArray(shootingCohortAssessments.userId, cohortUserIds),
        eq(shootingCohortAssessments.protocolVersion, 2),
      ))
      .orderBy(desc(shootingCohortAssessments.createdAt))
    : [];
  const assessmentMap = new Map<string, typeof assessments>();
  for (const assessment of assessments) {
    assessmentMap.set(assessment.userId, [...(assessmentMap.get(assessment.userId) || []), assessment]);
  }

  const [activeCount, invitedCount, waitlistCount, needsReviewCount] = await Promise.all([
    countApplications(["active"]),
    countApplications(["invited"]),
    countApplications(["waitlisted"]),
    countApplications(["needs_review"]),
  ]);

  return {
    settings: {
      capacity: settings.capacity,
      applicationsOpen: settings.applicationsOpen,
      goalThreePointPercent: settings.goalThreePointPercent,
      goalMidRangePercent: settings.goalMidRangePercent,
      goalFreeThrowPercent: settings.goalFreeThrowPercent,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    },
    counts: { active: activeCount, invited: invitedCount, waitlisted: waitlistCount, needsReview: needsReviewCount },
    applications: applications.map((application) => ({
      ...application,
      assessments: assessmentMap.get(application.userId) || [],
    })),
  };
}

export async function getShootingCohortNotificationCounts() {
  const [applicationRows, filmReviewRows, customRequestRows] = await Promise.all([
    db.select({ value: count() })
      .from(shootingCohortApplications)
      .where(inArray(shootingCohortApplications.status, ["needs_review", "waitlisted"])),
    db.select({ value: count() })
      .from(shootingCohortVideoSubmissions)
      .innerJoin(shootingCohortApplications, and(
        eq(shootingCohortApplications.userId, shootingCohortVideoSubmissions.userId),
        eq(shootingCohortApplications.status, "active"),
      ))
      .where(or(
        isNull(shootingCohortVideoSubmissions.founderFeedback),
        eq(shootingCohortVideoSubmissions.founderFeedback, ""),
      )),
    db.select({ value: count() })
      .from(customWorkoutRequests)
      .where(inArray(customWorkoutRequests.status, ["submitted", "in_progress"])),
  ]);

  const applications = Number(applicationRows[0]?.value ?? 0);
  const filmReview = Number(filmReviewRows[0]?.value ?? 0);
  const customRequests = Number(customRequestRows[0]?.value ?? 0);
  return { applications, filmReview, customRequests };
}

export async function getShootingCohortMessages(limit = 100) {
  const rows = await db.select({
    id: shootingCohortMessages.id,
    senderId: shootingCohortMessages.senderId,
    content: shootingCohortMessages.content,
    createdAt: shootingCohortMessages.createdAt,
    displayName: userProfiles.displayName,
    profilePhotoUrl: userProfiles.profilePhotoUrl,
    isAdmin: userProfiles.isAdmin,
  })
    .from(shootingCohortMessages)
    .leftJoin(userProfiles, eq(userProfiles.userId, shootingCohortMessages.senderId))
    .where(isNull(shootingCohortMessages.deletedAt))
    .orderBy(desc(shootingCohortMessages.createdAt))
    .limit(limit);
  return rows.reverse().map(({ isAdmin, ...message }) => ({
    ...message,
    displayName: getShootingCohortSenderDisplayName(message.displayName, isAdmin),
    profilePhotoUrl: message.profilePhotoUrl ?? null,
  }));
}

export async function createShootingCohortMessage(senderId: string, content: string) {
  const [created] = await db.insert(shootingCohortMessages)
    .values({ senderId, content })
    .returning();
  const [profile] = await db.select({
    displayName: userProfiles.displayName,
    profilePhotoUrl: userProfiles.profilePhotoUrl,
    isAdmin: userProfiles.isAdmin,
  }).from(userProfiles).where(eq(userProfiles.userId, senderId));
  return {
    ...created,
    displayName: getShootingCohortSenderDisplayName(profile?.displayName, profile?.isAdmin),
    profilePhotoUrl: profile?.profilePhotoUrl || null,
  };
}

export async function deleteShootingCohortMessage(messageId: string, deletedBy: string) {
  const [updated] = await db.update(shootingCohortMessages)
    .set({ deletedAt: new Date(), deletedBy })
    .where(and(
      eq(shootingCohortMessages.id, messageId),
      isNull(shootingCohortMessages.deletedAt),
    ))
    .returning({ id: shootingCohortMessages.id });
  if (!updated) throw new ShootingCohortError("Message not found.", 404);
}

export async function createShootingCohortAssessment(
  userId: string,
  assessment: ShootingCohortAssessmentInput,
) {
  return db.transaction(async (tx) => {
    const [application] = await tx.select().from(shootingCohortApplications)
      .where(eq(shootingCohortApplications.userId, userId))
      .for("update");
    if (!application || application.status !== "active") {
      throw new ShootingCohortError("Only active cohort members can submit shooting results.", 403);
    }

    const existingAssessments = await tx.select({
      id: shootingCohortAssessments.id,
      type: shootingCohortAssessments.type,
      protocolVersion: shootingCohortAssessments.protocolVersion,
    }).from(shootingCohortAssessments)
      .where(eq(shootingCohortAssessments.userId, userId));
    const currentProtocolAssessments = existingAssessments.filter((entry) => entry.protocolVersion === 2);
    if (assessment.type === "baseline" && currentProtocolAssessments.some((entry) => entry.type === "baseline")) {
      throw new ShootingCohortError("Your baseline test is already saved. Submit a retest to record new results.", 409);
    }
    if (assessment.type === "retest" && !currentProtocolAssessments.some((entry) => entry.type === "baseline")) {
      throw new ShootingCohortError("Submit your baseline test before recording a retest.", 409);
    }

    const [created] = await tx.insert(shootingCohortAssessments).values({
      userId,
      type: assessment.type,
      protocolVersion: 2,
      freeThrowsMade: assessment.freeThrowsMade,
      threePointResults: assessment.threePointResults,
      midRangeResults: assessment.midRangeResults,
      notes: assessment.notes || null,
    }).returning();
    return created;
  });
}

export async function getPlayerShootingCohortAssessments(userId: string) {
  return db.select().from(shootingCohortAssessments)
    .where(and(
      eq(shootingCohortAssessments.userId, userId),
      eq(shootingCohortAssessments.protocolVersion, 2),
    ))
    .orderBy(desc(shootingCohortAssessments.createdAt));
}