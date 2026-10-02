import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCoachPLeadMagnetResults } from "../server/coach-p-context";

describe("formatCoachPLeadMagnetResults", () => {
  it("formats every saved quiz attempt with readable result and answer identifiers", () => {
    const results = formatCoachPLeadMagnetResults([
      {
        leadMagnetId: "shooting-mechanics",
        answers: { "q2-spray": "release-friction", q1: "spray" },
        resultId: "guide-hand",
        createdAt: new Date("2026-09-18T12:00:00.000Z"),
      },
      {
        leadMagnetId: "footwork-open-shots",
        answers: { q1: "guard", q2: "on-ball", "q3-on-ball": "quick-lateral-separation" },
        resultId: "step-back-side-step",
        createdAt: "2026-09-17T12:00:00.000Z",
      },
    ]);

    assert.match(results, /2026-09-18: Shooting Mechanics → Guide Hand/);
    assert.match(results, /Q1: Spray; Q2 \(Spray\): Release Friction/);
    assert.match(results, /2026-09-17: Footwork That Leads to Open Shots → Step Back Side Step/);
    assert.match(results, /Q3 \(On Ball\): Quick Lateral Separation/);
    assert.equal(results.split("\n").length, 2);
  });

  it("clearly reports when no quiz results are stored", () => {
    assert.equal(
      formatCoachPLeadMagnetResults([]),
      "No lead magnet quiz results have been saved.",
    );
  });
});