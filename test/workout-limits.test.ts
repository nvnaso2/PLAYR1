import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FREE_SAVED_WORKOUT_LIMIT,
  countSavedWorkouts,
  getSavedWorkoutLimit,
  isAtSavedWorkoutLimit,
} from "../shared/workout-limits";

test("free accounts can save up to three workouts", () => {
  const limit = getSavedWorkoutLimit("free");

  assert.equal(FREE_SAVED_WORKOUT_LIMIT, 3);
  assert.equal(limit, 3);
  assert.equal(isAtSavedWorkoutLimit(2, limit), false);
  assert.equal(isAtSavedWorkoutLimit(3, limit), true);
  assert.equal(isAtSavedWorkoutLimit(4, limit), true);
});

test("Pro and Pro Infinity accounts have no saved-workout limit", () => {
  for (const plan of ["pro", "pro-infinity"]) {
    const limit = getSavedWorkoutLimit(plan);
    assert.equal(limit, null);
    assert.equal(isAtSavedWorkoutLimit(100, limit), false);
  }
});

test("unknown or missing plans use the free saved-workout limit", () => {
  assert.equal(getSavedWorkoutLimit(undefined), 3);
  assert.equal(getSavedWorkoutLimit("unknown"), 3);
});

test("coach-assigned workouts do not count toward a player's saved-workout limit", () => {
  assert.equal(countSavedWorkouts([
    { isAssigned: true },
    { isAssigned: false },
    {},
    { isAssigned: true },
  ]), 2);
});