import { z } from "zod";

export const SHOOTING_COHORT_STATUSES = [
  "active",
  "needs_review",
  "waitlisted",
  "invited",
  "withdrawn",
  "declined",
  "removed",
] as const;

export type ShootingCohortStatus = typeof SHOOTING_COHORT_STATUSES[number];
export const ADMIN_SHOOTING_COHORT_STATUSES = ["active", "invited", "waitlisted", "needs_review"] as const;
export type AdminShootingCohortStatus = typeof ADMIN_SHOOTING_COHORT_STATUSES[number];

export function getShootingCohortSenderDisplayName(
  displayName: string | null | undefined,
  isAdmin: boolean | null | undefined,
): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) return trimmedName;
  return isAdmin ? "PLAYR1 Founder" : "PLAYR1 player";
}

export const SHOOTING_COHORT_FOCUS_AREAS = [
  "catch-and-shoot",
  "off-the-dribble",
  "movement-shooting",
  "shooting-range",
  "free-throws",
  "pressure-consistency",
] as const;

export const SHOOTING_COHORT_FOCUS_LABELS: Record<typeof SHOOTING_COHORT_FOCUS_AREAS[number], string> = {
  "catch-and-shoot": "Catch-and-shoot",
  "off-the-dribble": "Off-the-dribble",
  "movement-shooting": "Movement shooting",
  "shooting-range": "Shooting range",
  "free-throws": "Free throws",
  "pressure-consistency": "Consistency under pressure",
};

export const shootingCohortApplicationSchema = z.object({
  practiceDays: z.array(z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])).min(1).max(7),
  sessionMinutes: z.number().int().min(10).max(180),
  hoopAccess: z.enum(["indoor", "outdoor", "both", "limited"]),
  weeklyShots: z.number().int().min(0).max(10000),
  focusAreas: z.array(z.enum(SHOOTING_COHORT_FOCUS_AREAS)).min(1).max(2),
  confidence: z.number().int().min(1).max(5),
  goal: z.string().trim().min(8).max(1000),
  currentRoutine: z.string().trim().max(1000).optional().default(""),
});

export type ShootingCohortApplicationAnswers = z.infer<typeof shootingCohortApplicationSchema>;

export const SHOOTING_COHORT_TEST_SPOTS = [
  "leftCorner",
  "leftWing",
  "top",
  "rightWing",
  "rightCorner",
] as const;

export const SHOOTING_COHORT_SPOT_UP_LOCATIONS = SHOOTING_COHORT_TEST_SPOTS;
const threePointMakeCount = z.number().int().min(0).max(20);
const midRangeMakeCount = z.number().int().min(0).max(8);

export const shootingCohortAssessmentSchema = z.object({
  type: z.enum(["baseline", "retest"]),
  freeThrowsMade: z.number().int().min(0).max(50),
  threePointResults: z.object({
    leftCorner: threePointMakeCount,
    leftWing: threePointMakeCount,
    top: threePointMakeCount,
    rightWing: threePointMakeCount,
    rightCorner: threePointMakeCount,
  }),
  midRangeResults: z.object({
    leftCorner: midRangeMakeCount,
    leftWing: midRangeMakeCount,
    top: midRangeMakeCount,
    rightWing: midRangeMakeCount,
    rightCorner: midRangeMakeCount,
  }),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type ShootingCohortAssessmentInput = z.infer<typeof shootingCohortAssessmentSchema>;
export type ShootingCohortAssessmentType = ShootingCohortAssessmentInput["type"];
export type ShootingCohortThreePointResults = ShootingCohortAssessmentInput["threePointResults"];
export type ShootingCohortMidRangeResults = ShootingCohortAssessmentInput["midRangeResults"];
// Retained only for reading assessments recorded under the retired test format.
export type ShootingCohortSpotUpResults = Record<string, number>;
export type ShootingCohortOffDribbleResults = Record<string, number>;

export const shootingCohortVideoSubmissionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  videoUrl: z.string().trim().min(1).max(2048).startsWith("/objects/cohort-private/"),
  thumbnailUrl: z.string().trim().max(2048).startsWith("/objects/cohort-private/").optional().nullable(),
  description: z.string().trim().max(1000).optional().default(""),
});

export type ShootingCohortVideoSubmissionInput = z.infer<typeof shootingCohortVideoSubmissionSchema>;

export const shootingCohortWorkoutRequestSchema = z.object({
  skills: z.array(z.enum(SHOOTING_COHORT_FOCUS_AREAS)).min(1).max(SHOOTING_COHORT_FOCUS_AREAS.length),
  availableTime: z.number().int().min(5).max(240),
  desiredOutcome: z.string().trim().min(3).max(1000),
  video: shootingCohortVideoSubmissionSchema.pick({ title: true, videoUrl: true, description: true }).optional(),
});

export type ShootingCohortWorkoutRequestInput = z.infer<typeof shootingCohortWorkoutRequestSchema>;

export function getShootingCohortAdmissionStatus(occupiedSeats: number, capacity: number): "active" | "waitlisted" {
  return occupiedSeats < capacity ? "active" : "waitlisted";
}

export function canAssignShootingCohortSeat(
  currentStatus: ShootingCohortStatus,
  nextStatus: AdminShootingCohortStatus,
  occupiedSeats: number,
  capacity: number,
): boolean {
  const currentReservesSeat = currentStatus === "active" || currentStatus === "invited";
  const nextReservesSeat = nextStatus === "active" || nextStatus === "invited";
  return !nextReservesSeat || currentReservesSeat || occupiedSeats < capacity;
}

export function getAssessmentTotals(assessment: Pick<ShootingCohortAssessmentInput, "freeThrowsMade" | "threePointResults" | "midRangeResults">) {
  const threePointMade = Object.values(assessment.threePointResults).reduce((total, made) => total + made, 0);
  const midRangeMade = Object.values(assessment.midRangeResults).reduce((total, made) => total + made, 0);
  return {
    freeThrows: { made: assessment.freeThrowsMade, attempted: 50, percent: assessment.freeThrowsMade * 2 },
    threePoint: { made: threePointMade, attempted: 100, percent: threePointMade },
    midRange: { made: midRangeMade, attempted: 40, percent: midRangeMade * 2.5 },
  };
}