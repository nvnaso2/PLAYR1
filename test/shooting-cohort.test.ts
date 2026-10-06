import assert from "node:assert/strict";
import test from "node:test";
import {
  canAssignShootingCohortSeat,
  getAssessmentTotals,
  getShootingCohortAdmissionStatus,
  getShootingCohortSenderDisplayName,
  shootingCohortApplicationSchema,
  shootingCohortAssessmentSchema,
  shootingCohortVideoSubmissionSchema,
  shootingCohortWorkoutRequestSchema,
} from "../shared/shooting-cohort";

const validApplication = {
  practiceDays: ["Tuesday", "Saturday"],
  sessionMinutes: 45,
  hoopAccess: "outdoor",
  weeklyShots: 250,
  focusAreas: ["catch-and-shoot", "off-the-dribble"],
  confidence: 3,
  goal: "Get more consistent on open shots late in games.",
  currentRoutine: "Two short sessions each week.",
};

const validAssessment = {
  type: "baseline",
  freeThrowsMade: 37,
  threePointResults: {
    leftCorner: 2,
    leftWing: 3,
    top: 4,
    rightWing: 4,
    rightCorner: 5,
  },
  midRangeResults: {
    leftCorner: 2,
    leftWing: 3,
    top: 4,
    rightWing: 5,
    rightCorner: 6,
  },
};

test("shooting cohort applications validate the approved survey fields", () => {
  assert.equal(shootingCohortApplicationSchema.safeParse(validApplication).success, true);
  assert.equal(shootingCohortApplicationSchema.safeParse({
    ...validApplication,
    focusAreas: ["catch-and-shoot", "off-the-dribble", "free-throws"],
  }).success, false);
  assert.equal(shootingCohortApplicationSchema.safeParse({
    ...validApplication,
    confidence: 6,
  }).success, false);
});

test("shooting cohort applications fill open seats before using the waitlist", () => {
  assert.equal(getShootingCohortAdmissionStatus(0, 10), "active");
  assert.equal(getShootingCohortAdmissionStatus(9, 10), "active");
  assert.equal(getShootingCohortAdmissionStatus(10, 10), "waitlisted");
});

test("admin status changes reserve seats only for accepted or invited applications", () => {
  assert.equal(canAssignShootingCohortSeat("waitlisted", "active", 10, 10), false);
  assert.equal(canAssignShootingCohortSeat("needs_review", "invited", 9, 10), true);
  assert.equal(canAssignShootingCohortSeat("invited", "active", 10, 10), true);
  assert.equal(canAssignShootingCohortSeat("active", "needs_review", 10, 10), true);
  assert.equal(canAssignShootingCohortSeat("needs_review", "waitlisted", 10, 10), true);
});

test("cohort chat sender names fall back safely when profile names are missing", () => {
  assert.equal(getShootingCohortSenderDisplayName(null, true), "PLAYR1 Founder");
  assert.equal(getShootingCohortSenderDisplayName(undefined, false), "PLAYR1 player");
  assert.equal(getShootingCohortSenderDisplayName("  Maya Torres  ", false), "Maya Torres");
});

test("shooting cohort baseline enforces 100 threes, 40 mid-range pull-ups, and 50 free throws", () => {
  const parsed = shootingCohortAssessmentSchema.safeParse(validAssessment);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.deepEqual(getAssessmentTotals(parsed.data), {
    freeThrows: { made: 37, attempted: 50, percent: 74 },
    threePoint: { made: 18, attempted: 100, percent: 18 },
    midRange: { made: 20, attempted: 40, percent: 50 },
  });
});

test("shooting cohort assessment rejects makes above the attempts for any category", () => {
  assert.equal(shootingCohortAssessmentSchema.safeParse({
    ...validAssessment,
    threePointResults: { ...validAssessment.threePointResults, top: 21 },
  }).success, false);
  assert.equal(shootingCohortAssessmentSchema.safeParse({
    ...validAssessment,
    midRangeResults: { ...validAssessment.midRangeResults, rightCorner: 9 },
  }).success, false);
  assert.equal(shootingCohortAssessmentSchema.safeParse({
    ...validAssessment,
    freeThrowsMade: 51,
  }).success, false);
});

test("cohort workout requests require a skill, duration, details, and optional private video", () => {
  const request = {
    skills: ["catch-and-shoot", "free-throws"],
    availableTime: 45,
    desiredOutcome: "Build consistency on catch-and-shoot reps late in workouts.",
  };
  assert.equal(shootingCohortWorkoutRequestSchema.safeParse(request).success, true);
  assert.equal(shootingCohortWorkoutRequestSchema.safeParse({
    ...request,
    video: {
      title: "Live rep",
      videoUrl: "/objects/cohort-private/request-clip",
      description: "",
    },
  }).success, true);
  assert.equal(shootingCohortWorkoutRequestSchema.safeParse({ ...request, skills: [] }).success, false);
  assert.equal(shootingCohortWorkoutRequestSchema.safeParse({ ...request, availableTime: 0 }).success, false);
  assert.equal(shootingCohortWorkoutRequestSchema.safeParse({
    ...request,
    video: { title: "Public", videoUrl: "/objects/uploads/public-video", description: "" },
  }).success, false);
});

test("cohort video submissions accept only private cohort object paths", () => {
  const validSubmission = {
    title: "Corner catch and shoot",
    videoUrl: "/objects/cohort-private/clip-123",
    description: "Check my footwork on the catch.",
  };
  assert.equal(shootingCohortVideoSubmissionSchema.safeParse(validSubmission).success, true);
  assert.equal(shootingCohortVideoSubmissionSchema.safeParse({
    ...validSubmission,
    videoUrl: "/objects/uploads/public-library-video",
  }).success, false);
});