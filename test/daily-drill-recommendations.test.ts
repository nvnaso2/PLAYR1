import assert from "node:assert/strict";
import test from "node:test";
import { selectDailyDrillSuggestions, type DailyDrillProfile } from "../shared/daily-drill-recommendations";
import type { DrillCategory, DifficultyLevel } from "../shared/schema";

type TestDrill = {
  id: string;
  category: DrillCategory;
  difficulty: DifficultyLevel;
  isAiGenerated: boolean;
  userId: string | null;
};

const drill = (
  id: string,
  category: DrillCategory,
  difficulty: DifficultyLevel = "intermediate",
  extra: Partial<TestDrill> = {},
): TestDrill => ({
  id,
  category,
  difficulty,
  isAiGenerated: false,
  userId: null,
  ...extra,
});

const dailyProfile: DailyDrillProfile = {
  userId: "player-1",
  positions: ["PG"],
  currentSituation: "Varsity",
  experienceYears: 7,
  skillRankings: {
    best: "Passing",
    secondBest: "Ball Handling",
    worst: "Finishing",
    improveMost: "Shooting",
  },
};

test("daily suggestions prioritize the player's improvement focus and experience level", () => {
  const drills = [
    drill("shooting-advanced-1", "shooting", "advanced"),
    drill("shooting-advanced-2", "shooting", "advanced"),
    drill("shooting-advanced-3", "shooting", "advanced"),
    drill("finishing-beginner", "finishing", "beginner"),
    drill("passing-elite", "passing", "elite"),
  ];

  const suggestions = selectDailyDrillSuggestions(drills, dailyProfile, "2026-10-04");
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.every((item) => item.category === "shooting"));
  assert.ok(suggestions.every((item) => item.difficulty === "advanced"));
});

test("suggestions are stable within a day and rotate across days", () => {
  const drills = Array.from({ length: 8 }, (_, index) =>
    drill(`shooting-${index}`, "shooting", "advanced")
  );

  const today = selectDailyDrillSuggestions(drills, dailyProfile, "2026-10-04").map(({ id }) => id);
  const repeatToday = selectDailyDrillSuggestions(drills, dailyProfile, "2026-10-04").map(({ id }) => id);
  const tomorrow = selectDailyDrillSuggestions(drills, dailyProfile, "2026-10-05").map(({ id }) => id);

  assert.deepEqual(repeatToday, today);
  assert.notDeepEqual(tomorrow, today);
});

test("recommendations exclude private, AI-generated, workout, and film entries", () => {
  const drills = [
    drill("shooting-1", "shooting"),
    drill("shooting-2", "shooting"),
    drill("shooting-3", "shooting"),
    drill("private", "shooting", "advanced", { userId: "player-1" }),
    drill("generated", "shooting", "advanced", { isAiGenerated: true }),
    drill("workout", "workouts"),
    drill("film", "film-session"),
  ];

  const suggestions = selectDailyDrillSuggestions(drills, dailyProfile, "2026-10-04");
  assert.deepEqual(new Set(suggestions.map(({ id }) => id)), new Set(["shooting-1", "shooting-2", "shooting-3"]));
});

test("profile positions affect category relevance when skill focus is unavailable", () => {
  const drills = [
    drill("guard-handle-1", "ball-handling"),
    drill("guard-handle-2", "ball-handling"),
    drill("guard-pass", "passing"),
    drill("big-finish", "finishing", "intermediate"),
    drill("big-defend", "defense", "intermediate"),
    drill("big-defense-2", "defense", "intermediate"),
  ];
  const profile: DailyDrillProfile = {
    userId: "player-2",
    positions: ["C"],
    experienceYears: 3,
    skillRankings: {},
  };

  const suggestions = selectDailyDrillSuggestions(drills, profile, "2026-10-04");
  assert.ok(suggestions.every((item) => ["finishing", "defense"].includes(item.category)));
});