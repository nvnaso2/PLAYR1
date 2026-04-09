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

  const prompt = `You are an expert basketball trainer. Design a unique, creative basketball training drill for ${dateStr}.

Category (you can adjust if it makes the drill better): ${suggestedCategory}

Requirements:
- SOLO ONLY: The drill must be completable by a single player alone on a basketball court. No partner, coach, or rebounder required. Players should be able to retrieve their own ball.
- Give it a specific, creative name (not generic like "Ball Handling Drill")
- Write a 2-3 sentence description explaining what to do and why it builds skill
- Choose appropriate difficulty: beginner, intermediate, or advanced
- List 1-3 pieces of equipment needed (minimal — basketball, hoop, and optional cones/markers only)
- Write exactly 3 short coaching tips (under 60 chars each, specific and actionable)
- Choose 1-3 metrics to track from: shots-made, shot-attempts, time, dribbles, passes, pass-attempts
  - shooting/finishing MUST use: shots-made, shot-attempts
  - ball-handling MUST use: time (optionally: dribbles)
  - passing MUST use: time (wall-passing drills only)
  - defense/workouts MUST use: time

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "title": "Creative Drill Name",
  "description": "2-3 sentence description.",
  "category": "ball-handling",
  "difficulty": "intermediate",
  "duration": 300,
  "equipment": ["Basketball"],
  "tips": ["Tip one", "Tip two", "Tip three"],
  "metrics": ["time"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 600,
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
