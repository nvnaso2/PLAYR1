import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCoachPQuestion,
  getActiveCoachPFlow,
  getCoachPStarterFlow,
} from "../server/coach-p-flows";

describe("Coach P starter flows", () => {
  it("routes the four initial prompts to their intended flow", () => {
    assert.equal(getCoachPStarterFlow("Find my biggest opportunity"), "opportunity");
    assert.equal(getCoachPStarterFlow("Build my next workout"), "workout");
    assert.equal(getCoachPStarterFlow("Review my last training session"), "training-review");
    assert.equal(getCoachPStarterFlow("Prepare for my next game"), "game-prep");
  });

  it("classifies freeform opportunity and session-review requests before generic profile or training routes", () => {
    assert.equal(classifyCoachPQuestion("What is my biggest opportunity to improve?"), "opportunity");
    assert.equal(classifyCoachPQuestion("Review my training session from last week"), "training-review");
  });

  it("advances opportunity discovery through two clarifications, then ends the guided flow", () => {
    const start = "Find my biggest opportunity";
    assert.deepEqual(getActiveCoachPFlow(start, []), { type: "opportunity", clarificationPhase: 0 });
    assert.deepEqual(getActiveCoachPFlow(start, ["What role do you play most often?"]), {
      type: "opportunity",
      clarificationPhase: 1,
    });
    assert.deepEqual(getActiveCoachPFlow(start, ["Question one?", "Question two?"]), {
      type: "opportunity",
      clarificationPhase: 2,
    });
    assert.equal(getActiveCoachPFlow(start, ["Question one?", "Question two?", "Your biggest opportunity is..."]), null);
  });

  it("keeps session review active only while Coach P is waiting for clarification", () => {
    const start = "Review my last training session";
    assert.deepEqual(getActiveCoachPFlow(start, []), { type: "training-review" });
    assert.deepEqual(getActiveCoachPFlow(start, ["Which week do you mean?"]), { type: "training-review" });
    assert.equal(getActiveCoachPFlow(start, ["Here are your takeaways."]), null);
  });
});