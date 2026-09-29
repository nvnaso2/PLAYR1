import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gameSpeedDrillBank,
  gameSpeedShootingQuestions,
  getGameSpeedShootingResult,
} from "../client/src/lib/game-speed-shooting-diagnostic";

describe("game-speed shooting diagnostic", () => {
  it("returns three category-specific drills when one category wins all answers", () => {
    const result = getGameSpeedShootingResult({
      q1: "fatigue",
      q2: "fatigue",
      q3: "fatigue",
    });

    assert.equal(result?.outcome, "fatigue");
    assert.deepEqual(result?.counts, { fatigue: 3, simulation: 0, pressure: 0 });
    assert.deepEqual(
      result?.drills.map((drill) => drill.title),
      [
        gameSpeedDrillBank.fatigue.q1.title,
        gameSpeedDrillBank.fatigue.q2.title,
        gameSpeedDrillBank.fatigue.q3.title,
      ],
    );
  });

  it("keeps each answer's drill when the player has one of each conversion leak", () => {
    const result = getGameSpeedShootingResult({
      q1: "fatigue",
      q2: "simulation",
      q3: "pressure",
    });

    assert.equal(result?.outcome, "mixed");
    assert.deepEqual(
      result?.drills.map((drill) => drill.category),
      ["fatigue", "simulation", "pressure"],
    );
    assert.equal(result?.drills.length, 3);
  });

  it("uses the most frequent category for two-to-one answer splits", () => {
    const result = getGameSpeedShootingResult({
      q1: "simulation",
      q2: "pressure",
      q3: "simulation",
    });

    assert.equal(result?.outcome, "simulation");
    assert.deepEqual(result?.counts, { fatigue: 0, simulation: 2, pressure: 1 });
    assert.deepEqual(
      result?.drills.map((drill) => drill.category),
      ["simulation", "pressure", "simulation"],
    );
  });

  it("defines the three questions with three answer choices each and rejects incomplete answers", () => {
    assert.equal(Object.keys(gameSpeedShootingQuestions).length, 3);
    for (const question of Object.values(gameSpeedShootingQuestions)) {
      assert.equal(question.answers.length, 3);
    }
    assert.equal(getGameSpeedShootingResult({ q1: "fatigue", q2: "simulation" }), null);
  });
});