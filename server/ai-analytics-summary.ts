import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AnalyticsSummary {
  title: string;
  body: string;
  severity: "info" | "warn" | "critical" | "positive";
}

function pct(now: number, prev: number): string {
  if (prev === 0) return now > 0 ? "+∞%" : "0%";
  const p = ((now - prev) / prev) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const brace = raw.match(/\{[\s\S]*\}/);
  if (brace) return brace[0];
  return raw.trim();
}

export async function generateWeeklyExecutiveSummary(snapshot: {
  total_users: number;
  signups_7d: number;
  signups_prev_7d: number;
  logs_7d: number;
  logs_prev_7d: number;
  active_users_7d: number;
  daily_challenge_7d: number;
  bookings_7d: number;
}): Promise<AnalyticsSummary> {
  const prompt = `You are a senior product analyst writing a weekly executive summary for the PLAYR1 basketball training platform.

Here are this week's metrics vs last week:

- Total users on platform: ${snapshot.total_users.toLocaleString()}
- New signups: this week ${snapshot.signups_7d}, last week ${snapshot.signups_prev_7d} (${pct(snapshot.signups_7d, snapshot.signups_prev_7d)})
- Training logs created: this week ${snapshot.logs_7d}, last week ${snapshot.logs_prev_7d} (${pct(snapshot.logs_7d, snapshot.logs_prev_7d)})
- Weekly active users (logged at least once): ${snapshot.active_users_7d}
- Daily streak challenge completions: ${snapshot.daily_challenge_7d}
- Training session bookings: ${snapshot.bookings_7d}

Write a SHORT executive summary (3-5 bullet points, ~120 words total) that:
1. Calls out the most important trend (good or bad).
2. Highlights one specific number worth celebrating or worrying about.
3. Suggests ONE concrete action the team should consider this week.

Pick a single overall severity: "positive" if things are clearly trending up, "warn" if there's a concerning drop, "critical" only for severe regressions, "info" for steady/mixed.

Respond with ONLY valid JSON, no markdown:
{
  "title": "Weekly summary headline (max 80 chars)",
  "body": "Markdown bullet points",
  "severity": "info|warn|critical|positive"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  if (!raw) throw new Error("AI returned empty content");

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const validSev = ["info", "warn", "critical", "positive"] as const;
  const severity = validSev.includes(parsed.severity) ? parsed.severity : "info";

  return {
    title: String(parsed.title ?? "Weekly Summary").slice(0, 200),
    body: String(parsed.body ?? raw),
    severity,
  };
}
