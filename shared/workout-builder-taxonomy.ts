export const WORKOUT_SKILL_OPTIONS = [
  { value: "shooting", label: "Shooting" },
  { value: "finishing", label: "Finishing" },
  { value: "ball-handling", label: "Ball Handling" },
  { value: "footwork", label: "Footwork" },
  { value: "defense", label: "Defense" },
  { value: "rebounding", label: "Rebounding" },
] as const;

export const WORKOUT_FORMAT_OPTIONS = [
  { value: "volume", label: "Volume", skills: ["shooting"] },
  { value: "live", label: "Live", skills: ["shooting", "finishing", "defense", "rebounding", "footwork"] },
  { value: "on-the-move", label: "On the Move", skills: ["shooting"] },
  { value: "off-the-dribble", label: "Off the Dribble", skills: ["shooting", "finishing"] },
  { value: "stationary", label: "Stationary", skills: ["ball-handling", "finishing"] },
  { value: "moving", label: "Moving", skills: ["ball-handling"] },
  { value: "tennis-ball", label: "Tennis Ball", skills: ["ball-handling"] },
  { value: "two-ball", label: "Two Ball", skills: ["ball-handling"] },
  { value: "one-ball", label: "One Ball", skills: ["ball-handling"] },
  { value: "post-work", label: "Post Work", skills: ["finishing", "footwork"] },
  { value: "conditioning", label: "Conditioning", skills: ["defense"] },
  { value: "footwork-mechanics", label: "Footwork & Mechanics", skills: ["defense"] },
  { value: "on-your-own", label: "On Your Own", skills: ["rebounding"] },
  { value: "shooting", label: "Shooting", skills: ["footwork"] },
  { value: "finishing", label: "Finishing", skills: ["footwork"] },
  { value: "post", label: "Post", skills: ["footwork"] },
  { value: "speed-agility", label: "Speed & Agility", skills: ["footwork"] },
  { value: "mix", label: "Mix", skills: ["shooting", "ball-handling", "finishing"] },
] as const;

export type WorkoutSkillTag = typeof WORKOUT_SKILL_OPTIONS[number]["value"];
export type WorkoutFormatTag = typeof WORKOUT_FORMAT_OPTIONS[number]["value"];

const FORMAT_PATTERNS: Partial<Record<WorkoutFormatTag, RegExp>> = {
  volume: /volume|reps|makes|shots|form|routine/i,
  live: /live|game|defender|closeout|contact|1v1|pressure/i,
  "on-the-move": /moving|move|curl|transition|cut|run|on the move/i,
  "off-the-dribble": /off.dribble|pull.up|dribble.*shoot|drive/i,
  stationary: /stationary|spot|pound|form|warm.?up/i,
  moving: /moving|move|transition|down the|full court/i,
  "tennis-ball": /tennis ball/i,
  "two-ball": /two ball|2 ball/i,
  "one-ball": /one ball|1 ball/i,
  "post-work": /post|block|paint/i,
  conditioning: /conditioning|sprint|slide|shuttle|endurance/i,
  "footwork-mechanics": /stance|slide|footwork|mechanic|closeout/i,
  "on-your-own": /solo|on your own|individual/i,
  shooting: /shoot|jumper|shot/i,
  finishing: /finish|layup|floater|rim/i,
  post: /post|block/i,
  "speed-agility": /speed|agility|sprint|quickness/i,
};

export function getWorkoutSkillTags(drill: { category: string; title: string; description?: string | null; skillTags?: string[] | null }): WorkoutSkillTag[] {
  if (drill.skillTags?.length) return drill.skillTags as WorkoutSkillTag[];
  const text = `${drill.title} ${drill.description ?? ""}`;
  const skills = new Set<WorkoutSkillTag>();
  if (WORKOUT_SKILL_OPTIONS.some((option) => option.value === drill.category)) skills.add(drill.category as WorkoutSkillTag);
  if (/footwork|pivot|first step|jab step/i.test(text)) skills.add("footwork");
  if (/rebound|box.?out/i.test(text)) skills.add("rebounding");
  return [...skills];
}

export function getWorkoutFormatTags(drill: { category: string; title: string; description?: string | null; workoutTags?: string[] | null }): WorkoutFormatTag[] {
  if (drill.workoutTags?.length) return drill.workoutTags as WorkoutFormatTag[];
  const text = `${drill.title} ${drill.description ?? ""}`;
  return Object.entries(FORMAT_PATTERNS)
    .filter(([, pattern]) => pattern?.test(text))
    .map(([tag]) => tag as WorkoutFormatTag);
}
