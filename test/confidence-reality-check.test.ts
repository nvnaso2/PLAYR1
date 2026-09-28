import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confidenceRealityQuestions,
  confidenceRealityResults,
  getConfidenceRealityNextQuestion,
  getConfidenceRealityOutcome,
} from "../client/src/lib/confidence-reality-check";

describe("confidence reality check", () => {
  it("keeps the first yes/no answer as self-reflection, not a route decision", () => {
    assert.deepEqual(
      confidenceRealityQuestions.q1.answers.map((answer) => answer.id),
      ["yes", "no"],
    );
    assert.equal(getConfidenceRealityNextQuestion("q1", "yes"), "q2");
    assert.equal(getConfidenceRealityNextQuestion("q1", "no"), "q2");
    assert.equal(getConfidenceRealityOutcome("q2", "yes"), null);
    assert.equal(getConfidenceRealityOutcome("q2", "no"), "unearned-confidence");
  });

  it("maps the confidence leak answers to their three targeted results", () => {
    const outcomes = confidenceRealityQuestions.q3.answers.map((answer) => {
      const outcome = getConfidenceRealityOutcome("q3", answer.id);
      assert.equal(outcome, answer.outcome);
      return outcome;
    });

    assert.deepEqual(outcomes, ["pre-game-nerves", "external-factors", "outcome-obsession"]);
    assert.equal(Object.keys(confidenceRealityResults).length, 4);
    for (const result of Object.values(confidenceRealityResults)) {
      assert.ok(result.title.length > 0);
      assert.ok(result.coreLesson.length > 0);
      assert.ok(result.drills.length > 0);
    }
  });

  it("returns no result for an unknown final answer", () => {
    assert.equal(getConfidenceRealityOutcome("q3", "unknown-answer"), null);
  });
});