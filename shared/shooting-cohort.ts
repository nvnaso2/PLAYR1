import { z } from "zod";

export const SHOOTING_COHORT_STATUSES = [
  "active",
  "waitlisted",
  "invited",
  "withdrawn",
  "declined",
  "removed",
] as const;

export type ShootingCohortStatus = typeof SHOOTING_COHORT_STATUSES[number];

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

export const SHOOTING_COHORT_SPOT_UP_LOCATIONS = [
  "leftCorner",
  "leftWing",
  "top",
  "rightWing",
  "rightCorner",
] as const;

export const SHOOTING_COHORT_OFF_DRIBBLE_LOCATIONS = ["left", "center", "right"] as const;

const shotMakeCount = z.number().int().min(0).max(5);

export const shootingCohortAssessmentSchema = z.object({
  type: z.enum(["baseline", "retest"]),
  distanceFeet: z.number().int().min(3).max(40),
  freeThrowsMade: z.number().int().min(0).max(20),
  spotUp: z.object({
    leftCorner: shotMakeCount,
    leftWing: shotMakeCount,
    top: shotMakeCount,
    rightWing: shotMakeCount,
    rightCorner: shotMakeCount,
  }),
  offDribble: z.object({
    left: shotMakeCount,
    center: shotMakeCount,
    right: shotMakeCount,
  }),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type ShootingCohortAssessmentInput = z.infer<typeof shootingCohortAssessmentSchema>;
export type ShootingCohortAssessmentType = ShootingCohortAssessmentInput["type"];
export type ShootingCohortSpotUpResults = ShootingCohortAssessmentInput["spotUp"];
export type ShootingCohortOffDribbleResults = ShootingCohortAssessmentInput["offDribble"];

export function getShootingCohortAdmissionStatus(occupiedSeats: number, capacity: number): "active" | "waitlisted" {
  return occupiedSeats < capacity ? "active" : "waitlisted";
}

export function getAssessmentTotals(assessment: Pick<ShootingCohortAssessmentInput, "freeThrowsMade" | "spotUp" | "offDribble">) {
  const spotUpMade = Object.values(assessment.spotUp).reduce((total, made) => total + made, 0);
  const offDribbleMade = Object.values(assessment.offDribble).reduce((total, made) => total + made, 0);
  return {
    freeThrows: { made: assessment.freeThrowsMade, attempted: 20 },
    spotUp: { made: spotUpMade, attempted: 25 },
    offDribble: { made: offDribbleMade, attempted: 15 },
    total: { made: assessment.freeThrowsMade + spotUpMade + offDribbleMade, attempted: 60 },
  };
}