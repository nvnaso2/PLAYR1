import assert from "node:assert/strict";
import test from "node:test";
import { PLAYER_SETUP_SKILLS } from "../client/src/lib/player-setup-answers";
import {
  COACH_P_HUB_FALLBACK_PROMPTS,
  COACH_P_HUB_PROMPT_BANK,
  getDailyCoachPrompt,
} from "../client/src/lib/coach-p-hub-prompts";

const FIVE_DAYS = [
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
];

test("every player skill has five distinct Coach P prompts", () => {
  assert.equal(Object.keys(COACH_P_HUB_PROMPT_BANK).length, PLAYER_SETUP_SKILLS.length);

  for (const skill of PLAYER_SETUP_SKILLS) {
    const prompts = COACH_P_HUB_PROMPT_BANK[skill];
    assert.equal(prompts.length, 5, `${skill} should have five prompts`);
    assert.equal(new Set(prompts).size, 5, `${skill} prompts should be distinct`);
  }
});

test("a focus prompt stays stable within a day and rotates through its bank daily", () => {
  const dailyPrompts = FIVE_DAYS.map((dateKey) => getDailyCoachPrompt("Shooting", dateKey));

  assert.equal(getDailyCoachPrompt("Shooting", FIVE_DAYS[0]), dailyPrompts[0]);
  assert.equal(new Set(dailyPrompts).size, 5);
  assert.equal(getDailyCoachPrompt("Shooting", "2026-10-09"), dailyPrompts[0]);
});

test("missing or unsupported focus rotates through five general prompts", () => {
  const prompts = FIVE_DAYS.map((dateKey) => getDailyCoachPrompt(undefined, dateKey));

  assert.equal(COACH_P_HUB_FALLBACK_PROMPTS.length, 5);
  assert.equal(new Set(prompts).size, 5);
  assert.equal(getDailyCoachPrompt("Other", "2026-10-04"), prompts[0]);
});

test("invalid date keys fail explicitly", () => {
  assert.throws(() => getDailyCoachPrompt("Shooting", "not-a-day"), /valid YYYY-MM-DD/);
});