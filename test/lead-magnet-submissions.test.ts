import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAndScoreLeadMagnetSubmission } from "../shared/lead-magnet-submissions";

const clientSubmissionId = "a5d62744-829d-4df4-9e32-516ad1222e57";

function submit(leadMagnetId: string, answers: Record<string, string>) {
  return validateAndScoreLeadMagnetSubmission({
    leadMagnetId,
    clientSubmissionId,
    answers,
  });
}

describe("validateAndScoreLeadMagnetSubmission", () => {
  it("validates and scores shooting-mechanics answers", () => {
    assert.deepEqual(submit("shooting-mechanics", {
      q1: "spray",
      "q2-spray": "release-friction",
    }), {
      leadMagnetId: "shooting-mechanics",
      clientSubmissionId,
      answers: { q1: "spray", "q2-spray": "release-friction" },
      resultId: "guide-hand",
    });
  });

  it("validates and scores footwork answers", () => {
    assert.deepEqual(submit("footwork-open-shots", {
      q1: "guard",
      q2: "on-ball",
      "q3-on-ball": "quick-lateral-separation",
    }), {
      leadMagnetId: "footwork-open-shots",
      clientSubmissionId,
      answers: { q1: "guard", q2: "on-ball", "q3-on-ball": "quick-lateral-separation" },
      resultId: "step-back-side-step",
    });
  });

  it("preserves the confidence reflection answer and scores the selected leak", () => {
    assert.equal(submit("confidence-reality-check", {
      q1: "no",
      q2: "yes",
      q3: "pre-game-nerves",
    }).resultId, "pre-game-nerves");
  });

  it("scores game-speed shooting from all three selections", () => {
    assert.equal(submit("game-speed-shooting", {
      q1: "fatigue",
      q2: "pressure",
      q3: "fatigue",
    }).resultId, "fatigue");
  });

  it("returns mixed when game-speed answers split evenly", () => {
    assert.equal(submit("game-speed-shooting", {
      q1: "fatigue",
      q2: "simulation",
      q3: "pressure",
    }).resultId, "mixed");
  });

  it("rejects answers that could change the displayed result", () => {
    assert.throws(() => submit("shooting-mechanics", {
      q1: "spray",
      "q2-spray": "release-friction",
      "q2-short": "dead-disconnected",
    }), /Invalid shooting mechanics answers/);
    assert.throws(() => submit("confidence-reality-check", {
      q1: "yes",
      q2: "no",
      q3: "external-factors",
    }), /Invalid confidence answers/);
    assert.throws(() => submit("game-speed-shooting", {
      q1: "fatigue",
      q2: "pressure",
      q3: "not-a-category",
    }), /Invalid game-speed shooting answers/);
  });
});