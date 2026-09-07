export const HUB_STAT_STORAGE_KEY = "playr1_hub_stat_order";

export const HUB_STAT_DEFINITIONS = [
  {
    key: "totalDrills",
    label: "Total Drills",
    shortLabel: "Drills",
    category: "Core",
    description: "Drills completed in the past month.",
  },
  {
    key: "workoutsCompleted",
    label: "Workouts Completed",
    shortLabel: "Workouts",
    category: "Core",
    description: "Workout sessions completed in the selected dashboard period.",
  },
  {
    key: "streak",
    label: "Day Streak",
    shortLabel: "Streak",
    category: "Core",
    description: "Consecutive training days in your current run.",
  },
  {
    key: "activeDays",
    label: "Active Days",
    shortLabel: "Active Days",
    category: "Core",
    description: "Different days you trained in the selected period.",
  },
  {
    key: "hoursTrained",
    label: "Hours Trained",
    shortLabel: "Hours",
    category: "Core",
    description: "Total training time in the past month.",
  },
  {
    key: "shotsMade",
    label: "Total Shots Made",
    shortLabel: "Shots Made",
    category: "Shooting",
    description: "All made shots logged in the selected period.",
  },
  {
    key: "shotsAttempted",
    label: "Total Shots Attempted",
    shortLabel: "Shots Attempted",
    category: "Shooting",
    description: "All shot attempts logged in the selected period.",
  },
  {
    key: "threePointersMade",
    label: "3-Pointers Made",
    shortLabel: "3s Made",
    category: "Shooting",
    description: "Made three-pointers from your logged shots.",
  },
  {
    key: "threePointersAttempted",
    label: "3-Pointers Attempted",
    shortLabel: "3s Attempted",
    category: "Shooting",
    description: "Three-point attempts from your logged shots.",
  },
  {
    key: "freeThrowsMade",
    label: "Free Throws Made",
    shortLabel: "Free Throws Made",
    category: "Shooting",
    description: "Made free throws from your logged shots.",
  },
  {
    key: "freeThrowsAttempted",
    label: "Free Throws Attempted",
    shortLabel: "Free Throws Attempted",
    category: "Shooting",
    description: "Free throw attempts from your logged shots.",
  },
  {
    key: "midRangeMade",
    label: "Mid-Range Shots Made",
    shortLabel: "Mid Made",
    category: "Shooting",
    description: "Made mid-range shots from your logged shots.",
  },
  {
    key: "midRangeAttempted",
    label: "Mid-Range Shots Attempted",
    shortLabel: "Mid Attempted",
    category: "Shooting",
    description: "Mid-range attempts from your logged shots.",
  },
  {
    key: "layupsMade",
    label: "Layups Made",
    shortLabel: "Layups Made",
    category: "Finishing",
    description: "Made layups from your logged shots.",
  },
  {
    key: "layupsAttempted",
    label: "Layups Attempted",
    shortLabel: "Layups Attempted",
    category: "Finishing",
    description: "Layup attempts from your logged shots.",
  },
  {
    key: "threePointPct",
    label: "3-Point Percentage",
    shortLabel: "3PT %",
    category: "Percentages",
    description: "Made three-pointers divided by three-point attempts.",
  },
  {
    key: "fgPct",
    label: "FG%",
    shortLabel: "FG %",
    category: "Percentages",
    description: "Made field goals divided by field-goal attempts.",
  },
  {
    key: "freeThrowPct",
    label: "Free Throw Percentage",
    shortLabel: "FT %",
    category: "Percentages",
    description: "Made free throws divided by free throw attempts.",
  },
  {
    key: "midRangePct",
    label: "Mid-Range Percentage",
    shortLabel: "Mid %",
    category: "Percentages",
    description: "Made mid-range shots divided by mid-range attempts.",
  },
  {
    key: "layupPct",
    label: "Layup Percentage",
    shortLabel: "Layup %",
    category: "Percentages",
    description: "Made layups divided by layup attempts.",
  },
  {
    key: "conditioningTime",
    label: "Conditioning Time",
    shortLabel: "Conditioning",
    category: "Training",
    description: "Time logged in conditioning work.",
  },
  {
    key: "ballHandlingMinutes",
    label: "Ball Handling Time",
    shortLabel: "Ball Handling Time",
    category: "Category Breakdown",
    description: "Training minutes in ball handling.",
  },
  {
    key: "ballHandlingDrills",
    label: "Ball Handling Drills",
    shortLabel: "Ball Handling Drills",
    category: "Category Breakdown",
    description: "Drills completed in ball handling.",
  },
  {
    key: "finishingMinutes",
    label: "Finishing Time",
    shortLabel: "Finishing Time",
    category: "Category Breakdown",
    description: "Training minutes in finishing.",
  },
  {
    key: "finishingDrills",
    label: "Finishing Drills",
    shortLabel: "Finishing Drills",
    category: "Category Breakdown",
    description: "Drills completed in finishing.",
  },
  {
    key: "defenseMinutes",
    label: "Defense Time",
    shortLabel: "Defense Time",
    category: "Category Breakdown",
    description: "Training minutes in defense.",
  },
  {
    key: "defenseDrills",
    label: "Defense Drills",
    shortLabel: "Defense Drills",
    category: "Category Breakdown",
    description: "Drills completed in defense.",
  },
  {
    key: "shootingMinutes",
    label: "Shooting Time",
    shortLabel: "Shooting Time",
    category: "Category Breakdown",
    description: "Training minutes in shooting.",
  },
  {
    key: "shootingDrills",
    label: "Shooting Drills",
    shortLabel: "Shooting Drills",
    category: "Category Breakdown",
    description: "Drills completed in shooting.",
  },
  {
    key: "passingMinutes",
    label: "Passing Time",
    shortLabel: "Passing Time",
    category: "Category Breakdown",
    description: "Training minutes in passing.",
  },
  {
    key: "passingDrills",
    label: "Passing Drills",
    shortLabel: "Passing Drills",
    category: "Category Breakdown",
    description: "Drills completed in passing.",
  },
  {
    key: "basketballIqMinutes",
    label: "Basketball IQ Time",
    shortLabel: "IQ Time",
    category: "Category Breakdown",
    description: "Training minutes in basketball IQ.",
  },
  {
    key: "basketballIqDrills",
    label: "Basketball IQ Drills",
    shortLabel: "IQ Drills",
    category: "Category Breakdown",
    description: "Drills completed in basketball IQ.",
  },
  {
    key: "filmSessionMinutes",
    label: "Film Session Time",
    shortLabel: "Film Time",
    category: "Category Breakdown",
    description: "Training minutes in film sessions.",
  },
  {
    key: "filmSessionDrills",
    label: "Film Session Drills",
    shortLabel: "Film Drills",
    category: "Category Breakdown",
    description: "Drills completed in film sessions.",
  },
  {
    key: "workoutsMinutes",
    label: "Workout Time",
    shortLabel: "Workout Time",
    category: "Category Breakdown",
    description: "Training minutes in workouts.",
  },
  {
    key: "workoutsDrills",
    label: "Workout Drills",
    shortLabel: "Workout Drills",
    category: "Category Breakdown",
    description: "Drills completed in workouts.",
  },
] as const;

export type HubStatKey = typeof HUB_STAT_DEFINITIONS[number]["key"];
export type HubStatOrder = HubStatKey[];

export const HUB_STAT_ACCENTS: Record<HubStatKey, {
  cardClass: string;
  textClass: string;
}> = {
  totalDrills: { cardClass: "border-sky-400/40 bg-sky-500/15", textClass: "text-sky-300" },
  workoutsCompleted: { cardClass: "border-cyan-400/40 bg-cyan-500/15", textClass: "text-cyan-300" },
  streak: { cardClass: "border-orange-500/40 bg-orange-500/15", textClass: "text-orange-300" },
  activeDays: { cardClass: "border-violet-400/40 bg-violet-500/15", textClass: "text-violet-300" },
  hoursTrained: { cardClass: "border-emerald-400/40 bg-emerald-500/15", textClass: "text-emerald-300" },
  shotsMade: { cardClass: "border-rose-400/40 bg-rose-500/15", textClass: "text-rose-300" },
  shotsAttempted: { cardClass: "border-amber-400/40 bg-amber-500/15", textClass: "text-amber-300" },
  threePointersMade: { cardClass: "border-lime-400/40 bg-lime-500/15", textClass: "text-lime-300" },
  threePointersAttempted: { cardClass: "border-white/40 bg-white/10", textClass: "text-white" },
  freeThrowsMade: { cardClass: "border-blue-400/40 bg-blue-500/15", textClass: "text-blue-300" },
  freeThrowsAttempted: { cardClass: "border-sky-400/40 bg-sky-500/15", textClass: "text-sky-300" },
  midRangeMade: { cardClass: "border-pink-400/40 bg-pink-500/15", textClass: "text-pink-300" },
  midRangeAttempted: { cardClass: "border-fuchsia-400/40 bg-fuchsia-500/15", textClass: "text-fuchsia-300" },
  layupsMade: { cardClass: "border-fuchsia-400/40 bg-fuchsia-500/15", textClass: "text-fuchsia-300" },
  layupsAttempted: { cardClass: "border-purple-400/40 bg-purple-500/15", textClass: "text-purple-300" },
  threePointPct: { cardClass: "border-lime-400/40 bg-lime-500/15", textClass: "text-lime-300" },
  fgPct: { cardClass: "border-red-400/40 bg-red-500/15", textClass: "text-red-300" },
  freeThrowPct: { cardClass: "border-blue-400/40 bg-blue-500/15", textClass: "text-blue-300" },
  midRangePct: { cardClass: "border-pink-400/40 bg-pink-500/15", textClass: "text-pink-300" },
  layupPct: { cardClass: "border-purple-400/40 bg-purple-500/15", textClass: "text-purple-300" },
  conditioningTime: { cardClass: "border-orange-400/40 bg-orange-500/15", textClass: "text-orange-300" },
  ballHandlingMinutes: { cardClass: "border-teal-400/40 bg-teal-500/15", textClass: "text-teal-300" },
  ballHandlingDrills: { cardClass: "border-cyan-400/40 bg-cyan-500/15", textClass: "text-cyan-300" },
  finishingMinutes: { cardClass: "border-fuchsia-400/40 bg-fuchsia-500/15", textClass: "text-fuchsia-300" },
  finishingDrills: { cardClass: "border-pink-400/40 bg-pink-500/15", textClass: "text-pink-300" },
  defenseMinutes: { cardClass: "border-indigo-400/40 bg-indigo-500/15", textClass: "text-indigo-300" },
  defenseDrills: { cardClass: "border-violet-400/40 bg-violet-500/15", textClass: "text-violet-300" },
  shootingMinutes: { cardClass: "border-red-400/40 bg-red-500/15", textClass: "text-red-300" },
  shootingDrills: { cardClass: "border-rose-400/40 bg-rose-500/15", textClass: "text-rose-300" },
  passingMinutes: { cardClass: "border-sky-400/40 bg-sky-500/15", textClass: "text-sky-300" },
  passingDrills: { cardClass: "border-blue-400/40 bg-blue-500/15", textClass: "text-blue-300" },
  basketballIqMinutes: { cardClass: "border-yellow-400/40 bg-yellow-500/15", textClass: "text-yellow-300" },
  basketballIqDrills: { cardClass: "border-amber-400/40 bg-amber-500/15", textClass: "text-amber-300" },
  filmSessionMinutes: { cardClass: "border-gray-400/40 bg-gray-500/15", textClass: "text-gray-300" },
  filmSessionDrills: { cardClass: "border-stone-400/40 bg-stone-500/15", textClass: "text-stone-300" },
  workoutsMinutes: { cardClass: "border-green-400/40 bg-green-500/15", textClass: "text-green-300" },
  workoutsDrills: { cardClass: "border-emerald-400/40 bg-emerald-500/15", textClass: "text-emerald-300" },
};

export const DEFAULT_HUB_STAT_ORDER: HubStatOrder = [
  "streak",
  "totalDrills",
  "hoursTrained",
  "shotsMade",
  "threePointersMade",
  "freeThrowsMade",
  "threePointPct",
  "freeThrowPct",
  "midRangePct",
];

const HUB_STAT_KEY_SET = new Set<string>(HUB_STAT_DEFINITIONS.map((stat) => stat.key));

export function isHubStatKey(value: unknown): value is HubStatKey {
  return typeof value === "string" && HUB_STAT_KEY_SET.has(value);
}

export function readHubStatOrder(): HubStatOrder {
  try {
    const saved = JSON.parse(localStorage.getItem(HUB_STAT_STORAGE_KEY) || "null");
    if (
      Array.isArray(saved) &&
      saved.length === 9 &&
      new Set(saved).size === 9 &&
      saved.every(isHubStatKey)
    ) {
      return saved as HubStatOrder;
    }
  } catch {
    // Fall back to the default layout when a preference is malformed.
  }
  return [...DEFAULT_HUB_STAT_ORDER];
}