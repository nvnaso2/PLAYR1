import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecentShotHeatmapBaselines,
  getPersonalHeatScalePosition,
  getShotHeatmapSection,
  type ShotHeatmapLog,
} from "../shared/shot-heatmap";

const locations = [
  { slug: "corner-left", classification: "3-pointer" },
  { slug: "mid-range-left", classification: "2-pointer" },
  { slug: "free-throw", classification: "free-throw" },
  { slug: "left-hand-layup", classification: "2-pointer" },
];

function log(
  id: string,
  sessionId: string | null,
  date: string,
  location: string,
  made: number,
  attempted: number,
): ShotHeatmapLog {
  return {
    id,
    workoutSessionId: sessionId,
    completedAt: date,
    shotLocation: location,
    shotsMade: made,
    shotsAttempted: attempted,
  };
}

describe("personalized shot heatmap baselines", () => {
  it("maps the four shooting sections from stored classifications and legacy layup slugs", () => {
    assert.equal(getShotHeatmapSection("corner-left", "3-pointer"), "three-pointers");
    assert.equal(getShotHeatmapSection("free-throw", "free-throw"), "free-throws");
    assert.equal(getShotHeatmapSection("mid-range-left", "2-pointer"), "mid-range");
    assert.equal(getShotHeatmapSection("left-hand-layup", "2-pointer"), "layups");
  });

  it("averages each workout percentage equally after combining that workout's logs", () => {
    const result = buildRecentShotHeatmapBaselines([
      log("a1", "workout-a", "2026-10-01", "corner-left", 4, 5),
      log("a2", "workout-a", "2026-10-01", "corner-left", 5, 5),
      log("b1", "workout-b", "2026-10-02", "corner-left", 1, 100),
    ], locations);

    assert.deepEqual(result.sections["three-pointers"], { averagePct: 45.5, workouts: 2 });
  });

  it("uses only the ten most recent workouts that contain attempts in that section", () => {
    const logs = Array.from({ length: 11 }, (_, index) => {
      const isOldest = index === 10;
      return log(
        `three-${index}`,
        `workout-${index}`,
        new Date(Date.UTC(2026, 9, 6 - index)).toISOString(),
        "corner-left",
        isOldest ? 10 : 5,
        10,
      );
    });
    logs.push(log("ft-1", "ft-workout", "2026-10-06", "free-throw", 4, 10));

    const result = buildRecentShotHeatmapBaselines(logs, locations);

    assert.deepEqual(result.sections["three-pointers"], { averagePct: 50, workouts: 10 });
    assert.deepEqual(result.sections["free-throws"], { averagePct: 40, workouts: 1 });
    assert.deepEqual(result.sections["mid-range"], { averagePct: null, workouts: 0 });
    assert.equal(result.workoutWindow, 10);
  });

  it("maps actual 0–100% rates continuously around each player's average", () => {
    assert.equal(getPersonalHeatScalePosition(20, 20), 5);
    assert.equal(getPersonalHeatScalePosition(80, 80), 5);
    assert.equal(getPersonalHeatScalePosition(0, 60), 0);
    assert.equal(getPersonalHeatScalePosition(100, 60), 10);
    assert.equal(getPersonalHeatScalePosition(30, 60), 0);
    assert.equal(getPersonalHeatScalePosition(54, 60), 1.25);
    assert.equal(getPersonalHeatScalePosition(80, 60), 10);
    assert.equal(getPersonalHeatScalePosition(0, 0), 5);
    assert.equal(getPersonalHeatScalePosition(100, 100), 5);
  });
});
