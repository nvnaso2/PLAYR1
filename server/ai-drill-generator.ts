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

// Only these three categories for daily challenges — equal weight, pseudo-random by date
const DAILY_CATEGORIES: DrillCategory[] = ["shooting", "ball-handling", "finishing"];

// Pseudo-random but deterministic pick — uses a non-obvious hash so there's no visible pattern
function pickCategoryForDate(dateStr: string): DrillCategory {
  // Mix the date bytes in multiple passes so sequential dates feel unrelated
  let h = 2166136261;
  for (const c of dateStr) {
    h ^= c.charCodeAt(0);
    h = (Math.imul(h, 16777619) >>> 0);
    h ^= (h >>> 16);
  }
  h = (Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0);
  return DAILY_CATEGORIES[h % DAILY_CATEGORIES.length];
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
  const category = pickCategoryForDate(dateStr);

  const categoryGuidance: Record<string, string> = {
    shooting:      "A focused shooting drill from a specific spot or short sequence of spots. Player makes a set number of attempts then moves on.",
    "ball-handling": "A stationary or tight-space dribbling drill that isolates a specific handle move. Simple enough to pick up and start immediately.",
    finishing:     "A finishing drill at or near the basket — layups, floaters, or power moves from one or two specific spots. Player retrieves their own ball each rep.",
  };

  const metricGuidance: Record<string, string> = {
    shooting:      "MUST use: shots-made and shot-attempts",
    "ball-handling": "MUST use: time",
    finishing:     "MUST use: shots-made and shot-attempts",
  };

  const prompt = `You are an expert basketball trainer designing a quick solo warmup drill — the kind of focused drill a player does at the START of a practice to get their body and mind dialed in.

Date: ${dateStr}
Category: ${category}
Drill style: ${categoryGuidance[category]}
Metrics: ${metricGuidance[category]}

RULES:
1. Keep it SHORT and SIMPLE — this is a warmup, not a full workout. Total time: 5–8 minutes max.
2. Focus on ONE specific skill or move, not a circuit.
3. Use REAL court landmarks only: free throw line, elbow, wing, block, three-point line, paint, baseline, lane line.
4. Description = numbered steps (3–4 steps) that anyone can follow immediately with zero confusion.
5. No imaginary defenders, invisible cones, or abstract concepts.
6. Tips must be specific to this exact drill.
7. SOLO only — no partner, no rebounder. Player retrieves their own ball.

Respond with ONLY valid JSON, no markdown:
{
  "title": "Drill Name",
  "description": "1. First step. 2. Second step. 3. Third step.",
  "category": "${category}",
  "difficulty": "beginner|intermediate|advanced",
  "duration": 360,
  "equipment": ["Basketball"],
  "tips": ["Specific tip", "Specific tip", "Specific tip"],
  "metrics": ["time"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 800,
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

  const resolvedCategory: DrillCategory = validCategories.includes(parsed.category) ? parsed.category : category;

  return {
    title: String(parsed.title ?? "Daily Basketball Drill").slice(0, 60),
    description: String(parsed.description ?? "Complete this drill to improve your basketball skills."),
    category: resolvedCategory,
    difficulty: validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : "intermediate",
    duration: Math.min(900, Math.max(180, Number(parsed.duration) || 360)),
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment.slice(0, 5).map(String) : ["Basketball"],
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3).map(String) : ["Stay focused", "Go at game speed", "Track your reps"],
    metrics: Array.isArray(parsed.metrics)
      ? (parsed.metrics as any[]).filter((m: any) => validMetrics.includes(m)).slice(0, 3)
      : (resolvedCategory === "shooting" || resolvedCategory === "finishing" ? ["shots-made", "shot-attempts"] : ["time"]),
  };
}
