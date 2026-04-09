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
  metrics: MetricName[]; // which metrics to track
}

const CATEGORIES: DrillCategory[] = [
  "ball-handling",
  "shooting",
  "passing",
  "finishing",
  "defense",
  "workouts",
];

const METRIC_OPTIONS: Record<string, string> = {
  "shots-made":    "shots-made (number of shots made)",
  "shot-attempts": "shot-attempts (number of shots attempted)",
  "time":          "time (timer/duration in seconds)",
  "dribbles":      "dribbles (number of dribbles)",
  "passes":        "passes (number of passes completed)",
  "pass-attempts": "pass-attempts (number of passes attempted)",
};

// Use the date string as a seed for category rotation so it's deterministic
// but different from the old library rotation
function pickCategoryForDate(dateStr: string): DrillCategory {
  const hash = dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CATEGORIES[hash % CATEGORIES.length];
}

export async function generateAiDrill(dateStr: string): Promise<AiGeneratedDrill> {
  const suggestedCategory = pickCategoryForDate(dateStr);

  const systemPrompt = `You are an expert basketball trainer with 20+ years of experience coaching players at all levels. 
Your job is to design creative, practical, and effective basketball training drills.
You will create a unique drill for the date ${dateStr}. This drill will be the "Daily Challenge" seen by every player on the PLAYR1 app.
Make it engaging, clearly described, and suitable for players to do on their own with minimal equipment.
Return ONLY valid JSON with no markdown or extra text.`;

  const userPrompt = `Design a unique basketball training drill for ${dateStr}. 
Suggested category (you can choose a different one if it makes the drill better): ${suggestedCategory}.

The drill must be fresh and not generic. Give it a creative, specific name (not just "Ball Handling Drill").

Return a JSON object with EXACTLY this structure:
{
  "title": "string - creative specific name (max 50 chars)",
  "description": "string - 2-3 sentence description explaining what to do and why it builds skill",
  "category": "one of: ball-handling, shooting, passing, finishing, defense, workouts",
  "difficulty": "one of: beginner, intermediate, advanced",
  "duration": number (seconds, between 180 and 1800),
  "equipment": ["array of equipment needed, keep it minimal"],
  "tips": ["exactly 3 coaching tips as short actionable strings"],
  "metrics": ["array of 1-3 metric names to track from this list only: shots-made, shot-attempts, time, dribbles, passes, pass-attempts"]
}

Rules:
- shooting/finishing drills MUST include shots-made and shot-attempts in metrics
- ball-handling drills MUST include time in metrics, optionally dribbles
- passing drills MUST include time in metrics, optionally passes and pass-attempts
- defense/workouts MUST include time in metrics
- Keep equipment minimal (1-3 items max, always include Basketball unless it's a pure conditioning drill)
- Tips must be short, specific, and actionable (under 60 chars each)
- Description must explain the drill clearly in 2-3 sentences`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 500,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw}`);
  }

  const validCategories: DrillCategory[] = ["ball-handling", "shooting", "passing", "finishing", "defense", "workouts", "film-session"];
  const validDifficulties: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];
  const validMetrics: MetricName[] = ["shots-made", "shot-attempts", "time", "dribbles", "passes", "pass-attempts"];

  const drill: AiGeneratedDrill = {
    title: String(parsed.title ?? "Daily Basketball Drill").slice(0, 50),
    description: String(parsed.description ?? "Complete this drill to improve your game."),
    category: validCategories.includes(parsed.category) ? parsed.category : suggestedCategory,
    difficulty: validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : "intermediate",
    duration: Math.min(1800, Math.max(180, Number(parsed.duration) || 300)),
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment.slice(0, 5).map(String) : ["Basketball"],
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3).map(String) : ["Stay focused", "Go at game speed", "Track your reps"],
    metrics: Array.isArray(parsed.metrics)
      ? parsed.metrics.filter((m: any) => validMetrics.includes(m)).slice(0, 3)
      : ["time"],
  };

  return drill;
}
