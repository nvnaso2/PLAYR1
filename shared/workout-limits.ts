export const FREE_SAVED_WORKOUT_LIMIT = 3;

export function getSavedWorkoutLimit(plan?: string | null): number | null {
  return plan === "pro" || plan === "pro-infinity" ? null : FREE_SAVED_WORKOUT_LIMIT;
}

export function isAtSavedWorkoutLimit(savedCount: number, limit: number | null): boolean {
  return limit !== null && savedCount >= limit;
}

export function countSavedWorkouts(workouts: ReadonlyArray<{ isAssigned?: boolean }>): number {
  return workouts.reduce((count, workout) => count + (workout.isAssigned ? 0 : 1), 0);
}