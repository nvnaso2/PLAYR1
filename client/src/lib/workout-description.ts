export const MAX_WORKOUT_DESCRIPTION_LENGTH = 142;

export function formatWorkoutDescription(description?: string | null) {
  const text = description?.trim() ?? "";
  if (text.length <= MAX_WORKOUT_DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, MAX_WORKOUT_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}
