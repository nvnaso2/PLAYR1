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