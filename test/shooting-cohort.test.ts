import assert from "node:assert/strict";
import test from "node:test";
import {
  getAssessmentTotals,
  getShootingCohortAdmissionStatus,
  shootingCohortApplicationSchema,
  shootingCohortAssessmentSchema,
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
  distanceFeet: 18,
  freeThrowsMade: 12,
  spotUp: {
    leftCorner: 2,
    leftWing: 3,
    top: 4,
    rightWing: 4,
    rightCorner: 5,
  },
  offDribble: {
    left: 2,
    center: 3,
    right: 1,
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

test("shooting cohort assessment enforces fixed-attempt makes and totals sixty shots", () => {
  const parsed = shootingCohortAssessmentSchema.safeParse(validAssessment);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.deepEqual(getAssessmentTotals(parsed.data), {
    freeThrows: { made: 12, attempted: 20 },
    spotUp: { made: 18, attempted: 25 },
    offDribble: { made: 6, attempted: 15 },
    total: { made: 36, attempted: 60 },
  });
});

test("shooting cohort assessment rejects makes above the attempts for a location", () => {
  assert.equal(shootingCohortAssessmentSchema.safeParse({
    ...validAssessment,
    spotUp: { ...validAssessment.spotUp, top: 6 },
  }).success, false);
  assert.equal(shootingCohortAssessmentSchema.safeParse({
    ...validAssessment,
    freeThrowsMade: 21,
  }).success, false);
});