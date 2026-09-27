import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getShootingMechanicsOutcome,
  shootingMechanicsBranches,
  shootingMechanicsResults,
} from "../client/src/lib/shooting-mechanics-diagnostic";

describe("shooting mechanics diagnostic", () => {
  it("offers three distinct follow-up paths from the first question", () => {
    assert.deepEqual(Object.keys(shootingMechanicsBranches), ["spray", "short", "clunky"]);
    assert.deepEqual(
      Object.values(shootingMechanicsBranches).map((branch) => branch.answers.length),
      [2, 3, 3],
    );
  });

  it("maps all eight follow-up answers to their matching cue and drill list", () => {
    const mappedOutcomes = Object.entries(shootingMechanicsBranches).flatMap(([branch, question]) =>
      question.answers.map((answer) => {
        const outcome = getShootingMechanicsOutcome(branch as keyof typeof shootingMechanicsBranches, answer.id);
        assert.equal(outcome, answer.outcome);
        return outcome;
      }),
    );

    assert.equal(mappedOutcomes.length, 8);
    assert.equal(new Set(mappedOutcomes).size, 8);
    assert.equal(Object.keys(shootingMechanicsResults).length, 8);
    for (const outcome of mappedOutcomes) {
      assert.ok(outcome);
      assert.ok(shootingMechanicsResults[outcome].cue.length > 0);
      assert.ok(shootingMechanicsResults[outcome].drills.length > 0);
    }
  });

  it("returns no result for an unknown answer", () => {
    assert.equal(getShootingMechanicsOutcome("spray", "unknown-answer"), null);
  });
});