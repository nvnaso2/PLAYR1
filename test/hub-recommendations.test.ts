import assert from "node:assert/strict";
import test from "node:test";
import { selectHubRecommendation, type HubRecommendationCandidate } from "../server/hub-recommendations";

const candidate = (
  source: HubRecommendationCandidate["source"],
  id: string,
  priority: number,
): HubRecommendationCandidate => ({
  id,
  source,
  title: id,
  description: id,
  reason: id,
  durationMinutes: 15,
  actionLabel: "Start",
  route: `/${id}`,
  provenance: { source, reasonCode: id },
  priority,
});

test("paid recommendations use program, assignment, Coach P, then focus order", () => {
  const result = selectHubRecommendation("pro", [
    candidate("assessment_focus", "focus", 300),
    candidate("coach_p_workout", "coach-p", 200),
    candidate("human_assignment", "assignment", 100),
    candidate("active_program", "program", 10),
  ]);
  assert.equal(result.recommendation.source, "active_program");
});

test("free recommendations are gated to assessment focus before library fallback", () => {
  const result = selectHubRecommendation("free", [
    candidate("coach_p_workout", "coach-p", 1),
    candidate("assessment_focus", "focus", 300),
    candidate("library_fallback", "library", 1000),
  ]);
  assert.equal(result.recommendation.source, "assessment_focus");
  assert.equal(result.supporting[0]?.source, "library_fallback");
});

test("free players without onboarding receive a useful deterministic fallback", () => {
  const result = selectHubRecommendation("free", [candidate("library_fallback", "library", 1000)]);
  assert.equal(result.recommendation.route, "/library");
  assert.match(result.fallbackReason ?? "", /No active personalized/);
});

test("candidate ordering breaks equal priorities by stable id", () => {
  const result = selectHubRecommendation("pro", [
    candidate("human_assignment", "z-assignment", 100),
    candidate("human_assignment", "a-assignment", 100),
  ]);
  assert.equal(result.recommendation.id, "a-assignment");
});