import type { Drill, DrillCategory, DifficultyLevel } from "./schema";

type DrillCandidate = Pick<Drill, "id" | "category" | "difficulty" | "isAiGenerated" | "userId">;

export type DailyDrillProfile = {
  userId?: string | null;
  positions?: string[] | null;
  currentSituation?: string | null;
  experienceYears?: number | string | null;
  skillRankings?: Partial<Record<"best" | "secondBest" | "worst" | "improveMost", string>>;
};

const skillCategories: Record<string, DrillCategory[]> = {
  "ball handling": ["ball-handling"],
  shooting: ["shooting"],
  finishing: ["finishing"],
  passing: ["passing"],
  defense: ["defense"],
  "basketball iq": ["passing", "defense"],
  athleticism: ["finishing", "defense"],
  rebounding: ["finishing", "defense"],
};

const difficultyOrder: DifficultyLevel[] = ["beginner", "intermediate", "advanced", "elite"];

function normalizeSkill(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function categoriesForSkill(value?: string | null): DrillCategory[] {
  return skillCategories[normalizeSkill(value)] ?? [];
}

function yearsPlayed(value: number | string | null | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.endsWith("+")) {
    const lowerBound = Number(normalized.slice(0, -1));
    return Number.isFinite(lowerBound) ? lowerBound : undefined;
  }

  const range = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function targetDifficulty(profile: DailyDrillProfile): DifficultyLevel {
  const years = yearsPlayed(profile.experienceYears);
  if (years !== undefined) {
    if (years <= 1) return "beginner";
    if (years <= 4) return "intermediate";
    if (years <= 8) return "advanced";
    return "elite";
  }

  const situation = profile.currentSituation?.toLowerCase() ?? "";
  if (/elementary|middle school|just playing for fun|intramural/.test(situation)) return "beginner";
  if (/college|professional|nba/.test(situation)) return "advanced";
  return "intermediate";
}

function positionCategoryBonus(positions: string[] | null | undefined, category: DrillCategory): number {
  const normalized = new Set((positions ?? []).map((position) => position.trim().toUpperCase()));
  let bonus = 0;
  if (normalized.has("PG")) {
    if (category === "ball-handling" || category === "passing") bonus += 2;
    if (category === "shooting") bonus += 1;
  }
  if (normalized.has("SG")) {
    if (category === "shooting") bonus += 2;
    if (category === "ball-handling") bonus += 1;
  }
  if (normalized.has("SF")) {
    if (category === "shooting" || category === "finishing" || category === "defense") bonus += 1;
  }
  if (normalized.has("PF") || normalized.has("C")) {
    if (category === "finishing" || category === "defense") bonus += 2;
  }
  return bonus;
}

function recommendationScore(drill: DrillCandidate, profile: DailyDrillProfile, target: DifficultyLevel): number {
  let score = 0;
  const category = drill.category;
  if (categoriesForSkill(profile.skillRankings?.improveMost).includes(category)) score += 8;
  if (categoriesForSkill(profile.skillRankings?.worst).includes(category)) score += 6;
  if (categoriesForSkill(profile.skillRankings?.secondBest).includes(category)) score += 2;
  if (categoriesForSkill(profile.skillRankings?.best).includes(category)) score += 1;
  score += positionCategoryBonus(profile.positions, category);

  const targetIndex = difficultyOrder.indexOf(target);
  const drillIndex = difficultyOrder.indexOf(drill.difficulty);
  if (drillIndex >= 0 && targetIndex >= 0) {
    const distance = Math.abs(targetIndex - drillIndex);
    score += distance === 0 ? 2 : distance === 1 ? 1 : -2;
  }
  return score;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function dayOrdinal(dateKey: string): number {
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) throw new Error("Daily drill recommendations require a YYYY-MM-DD date key.");
  return Math.floor(timestamp / 86_400_000);
}

export function selectDailyDrillSuggestions<T extends DrillCandidate>(
  drills: readonly T[],
  profile: DailyDrillProfile,
  dateKey: string,
): T[] {
  const eligible = drills.filter((drill) =>
    !drill.userId &&
    !drill.isAiGenerated &&
    drill.category !== "workouts" &&
    drill.category !== "film-session"
  );
  if (!eligible.length) return [];

  const target = targetDifficulty(profile);
  const ranked = eligible
    .map((drill) => ({ drill, score: recommendationScore(drill, profile, target) }))
    .sort((left, right) => right.score - left.score || left.drill.id.localeCompare(right.drill.id));
  const profileKey = [
    profile.userId ?? "",
    normalizeSkill(profile.skillRankings?.improveMost),
    normalizeSkill(profile.skillRankings?.worst),
    [...(profile.positions ?? [])].sort().join(","),
    target,
  ].join("|");
  const rotationSeed = dayOrdinal(dateKey) + hashString(profileKey);
  if (ranked.length <= 3) {
    const offset = positiveModulo(rotationSeed, ranked.length);
    const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];
    return rotated.map(({ drill }) => drill);
  }

  const scoreGroups = new Map<number, T[]>();
  for (const item of ranked) {
    const group = scoreGroups.get(item.score) ?? [];
    group.push(item.drill);
    scoreGroups.set(item.score, group);
  }

  const suggestions: T[] = [];
  for (const score of [...scoreGroups.keys()].sort((left, right) => right - left)) {
    const group = scoreGroups.get(score)!;
    const offset = positiveModulo(rotationSeed + score, group.length);
    const rotated = [...group.slice(offset), ...group.slice(0, offset)];
    for (const drill of rotated) {
      suggestions.push(drill);
      if (suggestions.length === 3) return suggestions;
    }
  }
  return suggestions;
}