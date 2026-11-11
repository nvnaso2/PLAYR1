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
