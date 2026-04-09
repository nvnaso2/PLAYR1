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

// Weighted rotation: 3x shooting, 3x ball-handling, 2x finishing, 1x defense
// No workouts/conditioning (too hard to make realistic solo) or passing (requires partner)
const CATEGORY_ROTATION: DrillCategory[] = [
  "shooting",
  "ball-handling",
  "finishing",
  "shooting",
  "ball-handling",
  "finishing",
  "shooting",
  "ball-handling",
  "defense",
];

// Per-category duration guidelines (seconds) and realism notes for the prompt
const CATEGORY_GUIDELINES: Record<DrillCategory, { duration: string; realism: string }> = {
  "shooting":      { duration: "600–900 (10–15 min)", realism: "Count total makes and attempts from a specific spot or spot sequence. Include walking to retrieve ball as part of flow." },
  "ball-handling": { duration: "300–480 (5–8 min)",   realism: "Stationary or lateral movement dribbling. Include specific hand sequences and rest after each set." },
  "finishing":     { duration: "600–900 (10–15 min)", realism: "Count layup/finish makes and attempts from specific spots. Player retrieves their own ball each rep." },
  "defense":       { duration: "300–480 (5–8 min)",   realism: "Footwork and positioning drills. Include 3–5 sets of 45–60 seconds each with 30 seconds rest." },
  "workouts":      { duration: "300–480 (5–8 min)",   realism: "Break into sets of 30–60 seconds with rest. Never continuous exertion for more than 90 seconds." },
  "passing":       { duration: "300–480 (5–8 min)",   realism: "Wall passing only. Specify distance from wall and target area." },
  "film-session":  { duration: "300",                 realism: "N/A" },
};

// Deterministic category rotation based on date (stable for same day, cycles through 9-day pattern)
function pickCategoryForDate(dateStr: string): DrillCategory {
  // Use day-of-year offset for variety while keeping determinism
  const d = new Date(dateStr + "T00:00:00Z");
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getUTCFullYear() + "-01-01T00:00:00Z").getTime()) / 86400000);
  return CATEGORY_ROTATION[dayOfYear % CATEGORY_ROTATION.length];
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
  const guide = CATEGORY_GUIDELINES[category];

  const prompt = `You are an expert basketball trainer creating today's daily solo training challenge.

Date: ${dateStr}
Category: ${category}
Target duration: ${guide.duration} seconds
Realism note: ${guide.realism}

Design a SOLO drill — one player, alone on a basketball court, no partner needed.

RULES (all are required):
1. REAL actions only. No "imaginary" defenders, "invisible" cones, or abstract concepts.
2. Use REAL court landmarks: free throw line, three-point line, elbow, wing, block, baseline, half court, paint, lane line.
3. Description = numbered steps (3–5 steps), fully self-explanatory. Example format: "1. Stand at the right elbow. 2. Dribble hard with your right hand for 30 seconds. 3. Switch to left hand for 30 seconds. 4. Repeat 4 rounds with 20 seconds rest between each."
4. Include SETS + REST if it's a conditioning or timed drill. Never prescribe more than 90 seconds of continuous work without a rest.
5. Duration must be realistic: ${guide.duration} total seconds including rest.
6. Tips must be specific to this exact drill, not generic basketball advice.

Metrics:
- shooting or finishing: use shots-made + shot-attempts
- ball-handling: use time (optionally dribbles)
- defense: use time
- passing (wall only): use time

Respond with ONLY valid JSON, no markdown:
{
  "title": "Specific Drill Name",
  "description": "1. ... 2. ... 3. ...",
  "category": "${category}",
  "difficulty": "beginner|intermediate|advanced",
  "duration": 600,
  "equipment": ["Basketball"],
  "tips": ["Drill-specific tip", "Drill-specific tip", "Drill-specific tip"],
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

  const resolvedCategory: DrillCategory = validCategories.includes(parsed.category) ? parsed.category : category;
  const defaultDuration = resolvedCategory === "shooting" || resolvedCategory === "finishing" ? 720 : 360;

  return {
    title: String(parsed.title ?? "Daily Basketball Drill").slice(0, 60),
    description: String(parsed.description ?? "Complete this drill to improve your basketball skills."),
    category: resolvedCategory,
    difficulty: validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : "intermediate",
    duration: Math.min(1800, Math.max(180, Number(parsed.duration) || defaultDuration)),
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment.slice(0, 5).map(String) : ["Basketball"],
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3).map(String) : ["Stay focused", "Go at game speed", "Track your reps"],
    metrics: Array.isArray(parsed.metrics)
      ? (parsed.metrics as any[]).filter((m) => validMetrics.includes(m)).slice(0, 3)
      : (resolvedCategory === "shooting" || resolvedCategory === "finishing" ? ["shots-made", "shot-attempts"] : ["time"]),
  };
}
