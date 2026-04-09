import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type DrillCategory = "ball-handling" | "shooting" | "passing" | "finishing" | "defense" | "workouts" | "film-session";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type MetricName = "shots-made" | "shot-attempts" | "time" | "dribbles" | "passes" | "pass-attempts";

export interface AiGeneratedDrill {
  title: string;
  description: string;
  category: DrillCategory;
  difficulty: DifficultyLevel;
  duration: number; // seconds
  equipment: string[];
  tips: string[];
  metrics: MetricName[];
}

const CATEGORIES: DrillCategory[] = [
  "ball-handling",
  "shooting",
  "passing",
  "finishing",
  "defense",
  "workouts",
];

// Deterministic category rotation based on date
function pickCategoryForDate(dateStr: string): DrillCategory {
  const hash = dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CATEGORIES[hash % CATEGORIES.length];
}

// Extract JSON from a response that might have markdown code fences
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const brace = raw.match(/\{[\s\S]*\}/);
  if (brace) return brace[0];
  return raw.trim();
}

export async function generateAiDrill(dateStr: string): Promise<AiGeneratedDrill> {
  const suggestedCategory = pickCategoryForDate(dateStr);

  const prompt = `You are an expert basketball trainer creating the daily training challenge for players.

Date: ${dateStr}
Category: ${suggestedCategory}

Design a SOLO drill that one player can do alone on a basketball court. No partner needed.

CRITICAL RULES:
1. Use REAL, PHYSICAL actions only — no "imaginary" defenders, "invisible" cones, or abstract concepts.
2. Reference REAL court landmarks: free throw line, 3-point line, elbow, wing, baseline, paint, half court, lane lines, etc.
3. The description must be a numbered step-by-step breakdown (3-5 steps) that leaves zero ambiguity about what to do. Format exactly like: "1. Start at the free throw line. 2. Dribble to the right elbow and back. 3. Repeat for 60 seconds."
4. Difficulty: beginner = simple movements any newcomer can follow; intermediate = moderate athleticism; advanced = high-speed or complex footwork.
5. Tips must be specific to THIS drill, not generic advice.

Metric rules:
- shooting/finishing: MUST use shots-made + shot-attempts
- ball-handling: MUST use time (optionally dribbles)
- passing: MUST use time (wall passes only)
- defense/workouts: MUST use time

Respond with ONLY valid JSON (no markdown fences):
{
  "title": "Specific Drill Name Here",
  "description": "1. Step one with real court location. 2. Step two with clear action. 3. Step three.",
  "category": "${suggestedCategory}",
  "difficulty": "beginner|intermediate|advanced",
  "duration": 300,
  "equipment": ["Basketball"],
  "tips": ["Tip specific to this drill", "Second specific tip", "Third specific tip"],
  "metrics": ["time"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 900,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  if (!raw) throw new Error("AI returned empty content");

  const jsonStr = extractJson(raw);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const validCategories: DrillCategory[] = ["ball-handling", "shooting", "passing", "finishing", "defense", "workouts", "film-session"];
  const validDifficulties: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];
  const validMetrics: MetricName[] = ["shots-made", "shot-attempts", "time", "dribbles", "passes", "pass-attempts"];

  return {
    title: String(parsed.title ?? "Daily Basketball Drill").slice(0, 50),
    description: String(parsed.description ?? "Complete this drill to improve your basketball skills."),
    category: validCategories.includes(parsed.category) ? parsed.category : suggestedCategory,
    difficulty: validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : "intermediate",
    duration: Math.min(1800, Math.max(180, Number(parsed.duration) || 300)),
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment.slice(0, 5).map(String) : ["Basketball"],
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3).map(String) : ["Stay focused", "Go at game speed", "Track your reps"],
    metrics: Array.isArray(parsed.metrics)
      ? (parsed.metrics as any[]).filter((m) => validMetrics.includes(m)).slice(0, 3)
      : ["time"],
  };
}
