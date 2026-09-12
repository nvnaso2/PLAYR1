import { z } from "zod";

export type CoachPWorkoutCatalogDrill = {
  id: string;
  title: string;
};

export type CoachPWorkoutDrillPreview = {
  drillId: string;
  title: string;
  durationMinutes: number;
  sets: number | null;
  reps: number | null;
  coachingNotes: string;
};

export type CoachPWorkoutPreview = {
  name: string;
  purpose: string;
  selectionRationale: string;
  successMeasure: string;
  estimatedDuration: number;
  drills: CoachPWorkoutDrillPreview[];
};

export type CoachPWorkoutResponse = {
  response: string;
  followUpQuestion: string | null;
  workout: CoachPWorkoutPreview | null;
};

export type CoachPWorkoutIntakeOption = {
  label: string;
  value: string;
};

export type CoachPWorkoutIntakeQuestion = {
  id: "durationMinutes" | "setting" | "primaryFocus" | "secondaryFocuses";
  question: string;
  selection: "single" | "multiple";
  options: CoachPWorkoutIntakeOption[];
  minSelections?: number;
  maxSelections?: number;
};

export type CoachPWorkoutIntake = {
  intro: string;
  questions: CoachPWorkoutIntakeQuestion[];
};

export type CoachPWorkoutAnswers = {
  durationMinutes: number;
  setting: "solo" | "partner" | "group";
  primaryFocus: string;
  secondaryFocuses: string[];
};

const FOCUS_OPTIONS: CoachPWorkoutIntakeOption[] = [
  { label: "Finishing at the rim", value: "finishing" },
  { label: "Shooting and shot-making", value: "shooting" },
  { label: "Ball-handling and creating space", value: "ball-handling" },
  { label: "Passing and playmaking", value: "playmaking" },
  { label: "Perimeter defense", value: "perimeter-defense" },
  { label: "Footwork and change of direction", value: "footwork" },
  { label: "Athleticism and movement", value: "athleticism" },
  { label: "Decision-making and game reads", value: "decision-making" },
];

export const COACH_P_WORKOUT_INTAKE: CoachPWorkoutIntake = {
  intro: "Before I build your one focused workout, choose a few details so I can make it fit your session and your game.",
  questions: [
    {
      id: "durationMinutes",
      question: "How long should the workout be?",
      selection: "single",
      options: [
        { label: "20 minutes", value: "20" },
        { label: "30 minutes", value: "30" },
        { label: "45 minutes", value: "45" },
        { label: "60 minutes", value: "60" },
      ],
    },
    {
      id: "setting",
      question: "What kind of workout is this?",
      selection: "single",
      options: [
        { label: "Solo", value: "solo" },
        { label: "With a partner", value: "partner" },
        { label: "Small group", value: "group" },
      ],
    },
    {
      id: "primaryFocus",
      question: "What is the primary thing you want to work on?",
      selection: "single",
      options: FOCUS_OPTIONS,
    },
    {
      id: "secondaryFocuses",
      question: "Choose exactly two secondary focuses.",
      selection: "multiple",
      options: FOCUS_OPTIONS,
      minSelections: 2,
      maxSelections: 2,
    },
  ],
};

export function formatCoachPWorkoutIntake(intake: CoachPWorkoutIntake = COACH_P_WORKOUT_INTAKE): string {
  return [
    intake.intro,
    ...intake.questions.map((question, index) =>
      `${index + 1}. ${question.question} ${question.options.map((option) => option.label).join(", ")}`
    ),
  ].join("\n\n");
}

export function normalizeCoachPWorkoutAnswers(input: unknown): CoachPWorkoutAnswers {
  if (!input || typeof input !== "object") throw new Error("Coach P workout preferences are required.");
  const value = input as Record<string, unknown>;
  const durationMinutes = Number(value.durationMinutes);
  if (![20, 30, 45, 60].includes(durationMinutes)) {
    throw new Error("Choose a valid workout duration.");
  }
  const setting = value.setting;
  if (setting !== "solo" && setting !== "partner" && setting !== "group") {
    throw new Error("Choose a valid workout setting.");
  }
  const focusValues = new Set(FOCUS_OPTIONS.map((option) => option.value));
  const primaryFocus = typeof value.primaryFocus === "string" ? value.primaryFocus : "";
  const secondaryFocuses = Array.isArray(value.secondaryFocuses)
    ? value.secondaryFocuses.filter((focus): focus is string => typeof focus === "string")
    : [];
  if (!focusValues.has(primaryFocus)) throw new Error("Choose a valid primary focus.");
  if (
    secondaryFocuses.length !== 2
    || new Set(secondaryFocuses).size !== 2
    || secondaryFocuses.some((focus) => !focusValues.has(focus) || focus === primaryFocus)
  ) {
    throw new Error("Choose two different secondary focuses.");
  }
  return {
    durationMinutes,
    setting,
    primaryFocus,
    secondaryFocuses,
  };
}

const rawWorkoutDrillSchema = z.object({
  drillId: z.string().trim().min(1).optional(),
  id: z.string().trim().min(1).optional(),
  durationMinutes: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  timeMinutes: z.coerce.number().optional(),
  sets: z.coerce.number().optional().nullable(),
  reps: z.coerce.number().optional().nullable(),
  coachingNotes: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const rawWorkoutSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  selectionRationale: z.string().optional(),
  whyTheseDrills: z.string().optional(),
  successMeasure: z.string().optional(),
  success: z.string().optional(),
  estimatedDuration: z.coerce.number().optional(),
  durationMinutes: z.coerce.number().optional(),
  drills: z.array(rawWorkoutDrillSchema).optional(),
  exercises: z.array(rawWorkoutDrillSchema).optional(),
}).passthrough();

const rawResponseSchema = z.object({
  response: z.string().optional(),
  explanation: z.string().optional(),
  message: z.string().optional(),
  followUpQuestion: z.string().optional().nullable(),
  question: z.string().optional().nullable(),
  workout: rawWorkoutSchema.nullable().optional(),
}).passthrough();

function cleanText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`Coach P workout is missing ${field}.`);
  const text = value.trim().slice(0, maxLength);
  if (!text) throw new Error(`Coach P workout is missing ${field}.`);
  return text;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, numeric));
}

function optionalInteger(value: unknown, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

/**
 * Parse and normalize model output while resolving every drill against the
 * server-owned catalog. The client never gets to choose which drills exist.
 */
export function normalizeCoachPWorkoutResponse(
  output: unknown,
  catalog: CoachPWorkoutCatalogDrill[],
): CoachPWorkoutResponse {
  let parsedOutput = output;
  if (typeof output === "string") {
    const text = output.trim();
    if (!text) throw new Error("Coach P returned empty workout output.");
    try {
      parsedOutput = JSON.parse(text);
    } catch {
      throw new Error("Coach P returned malformed workout output.");
    }
  }

  const parsed = rawResponseSchema.safeParse(parsedOutput);
  if (!parsed.success) throw new Error("Coach P returned malformed workout output.");
  const response = cleanText(
    parsed.data.response ?? parsed.data.explanation ?? parsed.data.message,
    "a coaching explanation",
    2000,
  );
  const rawFollowUp = parsed.data.followUpQuestion ?? parsed.data.question;
  const followUpQuestion = typeof rawFollowUp === "string" && rawFollowUp.trim()
    ? rawFollowUp.trim().slice(0, 500)
    : null;

  if (!parsed.data.workout) {
    if (!followUpQuestion) throw new Error("Coach P returned no workout or focused follow-up.");
    return { response, followUpQuestion, workout: null };
  }

  const rawWorkout = parsed.data.workout;
  const rawDrills = rawWorkout.drills ?? rawWorkout.exercises ?? [];
  if (rawDrills.length === 0) throw new Error("Coach P workout contains no drills.");
  const catalogById = new Map(catalog.map((drill) => [drill.id, drill]));
  const drills = rawDrills.map((rawDrill, index) => {
    const drillId = rawDrill.drillId ?? rawDrill.id;
    const catalogDrill = drillId ? catalogById.get(drillId) : undefined;
    if (!catalogDrill) {
      throw new Error(`Coach P selected an unavailable drill at position ${index + 1}.`);
    }
    const coachingNotes = typeof (rawDrill.coachingNotes ?? rawDrill.notes) === "string"
      ? String(rawDrill.coachingNotes ?? rawDrill.notes).trim().slice(0, 500)
      : "";
    if (!coachingNotes) {
      throw new Error(`Coach P is missing the reason for drill ${index + 1}.`);
    }
    return {
      drillId: catalogDrill.id,
      title: catalogDrill.title,
      durationMinutes: boundedInteger(
        rawDrill.durationMinutes ?? rawDrill.duration ?? rawDrill.timeMinutes,
        5,
        1,
        120,
      ),
      sets: optionalInteger(rawDrill.sets, 1, 20),
      reps: optionalInteger(rawDrill.reps, 1, 500),
      coachingNotes,
    };
  });

  const estimatedDuration = boundedInteger(
    rawWorkout.estimatedDuration ?? rawWorkout.durationMinutes,
    drills.reduce((sum, drill) => sum + drill.durationMinutes, 0),
    1,
    240,
  );

  return {
    response,
    followUpQuestion: null,
    workout: {
      name: cleanText(rawWorkout.name ?? rawWorkout.title, "a workout name", 120),
      purpose: cleanText(rawWorkout.purpose ?? rawWorkout.description, "a workout purpose", 500),
      selectionRationale: cleanText(
        rawWorkout.selectionRationale ?? rawWorkout.whyTheseDrills,
        "a drill-selection explanation",
        800,
      ),
      successMeasure: cleanText(rawWorkout.successMeasure ?? rawWorkout.success, "a success measure", 500),
      estimatedDuration,
      drills,
    },
  };
}