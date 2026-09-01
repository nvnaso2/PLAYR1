import { pool } from "./db";
import { MICRO_QUIZZES, DEFAULT_MICRO_QUIZ_ID } from "@shared/micro-quizzes";

export type MicroQuizPayload = {
  quizId: string;
  responses: Record<string, string>;
};

const FIX_CATEGORY_BY_QUIZ: Record<string, string> = {
  "thumb-flick": "shooting",
  "jumpshot-default": "shooting",
};

export async function ensureOnboardingSchema() {
  await pool.query(`
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS initial_quiz_id varchar,
      ADD COLUMN IF NOT EXISTS quiz_responses jsonb,
      ADD COLUMN IF NOT EXISTS assigned_fix_drill_ids text[],
      ADD COLUMN IF NOT EXISTS full_profile_completed boolean DEFAULT false
  `);
}

export function validateMicroQuizPayload(payload: unknown): MicroQuizPayload {
  const body = payload as Partial<MicroQuizPayload> | null;
  const quizId = typeof body?.quizId === "string" && MICRO_QUIZZES[body.quizId]
    ? body.quizId
    : DEFAULT_MICRO_QUIZ_ID;
  const quiz = MICRO_QUIZZES[quizId];
  const incoming = body?.responses && typeof body.responses === "object" ? body.responses : {};
  const responses: Record<string, string> = {};

  for (const question of quiz.questions) {
    const value = incoming[question.id];
    if (typeof value !== "string" || !question.options.some((option) => option.value === value)) {
      throw new Error(`Missing or invalid response for ${question.id}`);
    }
    responses[question.id] = value;
  }
  return { quizId, responses };
}

export function getFixCategory(quizId: string) {
  return FIX_CATEGORY_BY_QUIZ[quizId] || "shooting";
}

export function getDiagnosticSummary(payload: MicroQuizPayload) {
  const response = payload.responses;
  if (payload.quizId === "thumb-flick") {
    if (response.thumb === "flick") {
      return "Your guide hand is getting active at release. Start by training a quiet guide hand close to the rim.";
    }
    if (response.miss === "left" || response.miss === "right") {
      return "Your release path is pulling the shot off line. Start close and build a straighter finish.";
    }
    if (response.cue === "side-spin") {
      return "Side spin is your clearest signal. Own the ball with your shooting hand and let the guide hand stay quiet.";
    }
    return "Your best first move is a repeatable release close to the rim, then add distance one step at a time.";
  }
  if (response.setup === "short" || response.feel === "legs") {
    return "Your first opportunity is building more lift from the floor so your range and arc stay consistent.";
  }
  if (response.setup === "left" || response.setup === "right" || response.feel === "guide") {
    return "Your release path is the first thing to clean up. A quiet, repeatable finish will tighten your misses.";
  }
  if (response.context === "pressure" || response.goal === "pressure") {
    return "Your mechanics need to stay available when the game speeds up. Start with clean reps, then add a closeout.";
  }
  return "Your best first move is a repeatable release close to the rim, then add distance one step at a time.";
}