export const PLAYER_SETUP_SITUATIONS = [
  "Elementary School",
  "Middle School",
  "Freshman / JV",
  "Varsity",
  "College Basketball",
  "Intramural League",
  "Adult Rec League",
  "Just Playing For Fun",
] as const;

export const PLAYER_SETUP_SKILLS = [
  "Ball Handling",
  "Shooting",
  "Finishing",
  "Passing",
  "Defense",
  "Basketball IQ",
  "Athleticism",
  "Rebounding",
] as const;

export const PLAYER_SETUP_GOALS = [
  "Make a team I'm trying out for",
  "Earn more playing time / a bigger role",
  "Play at the next level",
  "Just looking to improve in general",
  "Play for fun",
] as const;

export const PLAYER_SETUP_TEAM_ROLES = [
  "Not On A Team / Learning the game",
  "Limited Minutes / Looking to Make a Team",
  "Rotation Player",
  "Starter / 6th Man",
  "Key Player",
  "Team Leader",
] as const;

export const PLAYER_SETUP_RANK_FIELDS = [
  { key: "best", label: "Strongest skill" },
  { key: "secondBest", label: "Second strongest" },
  { key: "worst", label: "Needs the most work" },
  { key: "improveMost", label: "Top improvement focus" },
] as const;

export type PlayerSetupSkillRankings = Record<
  (typeof PLAYER_SETUP_RANK_FIELDS)[number]["key"],
  string
>;

export type PlayerSetupAnswers = {
  firstName: string;
  lastName: string;
  currentSituation: string;
  skillRoles: string[];
  skillRankings: PlayerSetupSkillRankings;
  primaryGoal: string;
  trainingDaysPerUnit: number;
  trainingPeriodUnit: "week" | "month";
  experienceYears: number | string;
  competitiveExperienceYears: number;
  teamName: string;
  teamRole: string;
  positions: string[];
  aspiration: string;
};

export type PlayerSetupResponse = {
  answers?: Partial<PlayerSetupAnswers>;
  completed?: boolean;
};

const DEFAULT_RANKINGS: PlayerSetupSkillRankings = {
  best: "Shooting",
  secondBest: "Ball Handling",
  worst: "Defense",
  improveMost: "Basketball IQ",
};

export function makeUniqueRankings(value?: Partial<PlayerSetupSkillRankings> | null): PlayerSetupSkillRankings {
  const result = {} as PlayerSetupSkillRankings;
  const used = new Set<string>();
  for (const field of PLAYER_SETUP_RANK_FIELDS) {
    const candidate = value?.[field.key];
    const fallback = DEFAULT_RANKINGS[field.key];
    const selected = typeof candidate === "string" &&
      PLAYER_SETUP_SKILLS.includes(candidate as (typeof PLAYER_SETUP_SKILLS)[number]) &&
      !used.has(candidate)
      ? candidate
      : !used.has(fallback)
        ? fallback
        : PLAYER_SETUP_SKILLS.find((skill) => !used.has(skill))!;
    result[field.key] = selected;
    used.add(selected);
  }
  return result;
}

export function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function experienceValue(value: unknown): number | string {
  if (typeof value === "string" && ["0", "1 to 3", "4 to 6", "7 to 10", "10+"].includes(value)) return value;
  return numberValue(value, 0);
}