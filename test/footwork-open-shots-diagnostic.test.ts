import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  footworkCourtRoles,
  footworkFollowUpQuestions,
  footworkResults,
  footworkShotSources,
  getFootworkOutcome,
} from "../client/src/lib/footwork-open-shots-diagnostic";

describe("footwork open shots diagnostic", () => {
  it("collects all three court roles before the on-ball/off-ball split", () => {
    assert.deepEqual(
      footworkCourtRoles.map((role) => role.id),
      ["guard", "wing", "big"],
    );
    assert.deepEqual(
      footworkShotSources.map((source) => source.id),
      ["on-ball", "off-ball"],
    );
  });

  it("maps all six final answers to their intended drill groups", () => {
    const answers = Object.entries(footworkFollowUpQuestions).flatMap(([source, question]) =>
      question.answers.map((answer) => {
        const outcome = getFootworkOutcome(source as keyof typeof footworkFollowUpQuestions, answer.id);
        assert.equal(outcome, answer.outcome);
        return outcome;
      }),
    );

    assert.equal(answers.length, 6);
    assert.equal(new Set(answers).size, 6);
    assert.equal(Object.keys(footworkResults).length, 6);
    for (const outcome of answers) {
      assert.ok(outcome);
      assert.ok(footworkResults[outcome].title.length > 0);
      assert.ok(footworkResults[outcome].drills.length > 0);
    }
  });

  it("returns no result for an unknown follow-up answer", () => {
    assert.equal(getFootworkOutcome("on-ball", "unknown-answer"), null);
  });
});