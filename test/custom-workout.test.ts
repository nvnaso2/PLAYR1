import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionCustomWorkoutRequest, hasUniqueDrillIds, isPlayr1CatalogDrill } from "../server/custom-workout";

test("custom workout request lifecycle only permits forward transitions", () => {
  assert.equal(canTransitionCustomWorkoutRequest("submitted", "in_progress"), true);
  assert.equal(canTransitionCustomWorkoutRequest("submitted", "declined"), true);
  assert.equal(canTransitionCustomWorkoutRequest("in_progress", "assigned"), false);
  assert.equal(canTransitionCustomWorkoutRequest("assigned", "completed"), true);
  assert.equal(canTransitionCustomWorkoutRequest("completed", "submitted"), false);
  assert.equal(canTransitionCustomWorkoutRequest("declined", "assigned"), false);
});

test("custom workout assignments only accept PLAYR1 catalog drills", () => {
  assert.equal(isPlayr1CatalogDrill({ userId: null, isAiGenerated: false } as any), true);
  assert.equal(isPlayr1CatalogDrill({ userId: null, isAiGenerated: null } as any), true);
  assert.equal(isPlayr1CatalogDrill({ userId: "player-1", isAiGenerated: false } as any), false);
  assert.equal(isPlayr1CatalogDrill({ userId: null, isAiGenerated: true } as any), false);
  assert.equal(isPlayr1CatalogDrill(undefined), false);
});

test("custom workout builders reject duplicate drills while preserving selected order", () => {
  assert.equal(hasUniqueDrillIds(["drill-a", "drill-b", "drill-c"]), true);
  assert.equal(hasUniqueDrillIds(["drill-a", "drill-a"]), false);
});