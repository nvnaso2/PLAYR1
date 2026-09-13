import type { Drill, CustomWorkoutRequestStatus } from "@shared/schema";

export const CUSTOM_WORKOUT_STATUS_TRANSITIONS: Record<CustomWorkoutRequestStatus, CustomWorkoutRequestStatus[]> = {
  submitted: ["in_progress", "declined"],
  in_progress: ["declined"],
  assigned: ["completed"],
  completed: [],
  declined: [],
};

export function canTransitionCustomWorkoutRequest(
  from: CustomWorkoutRequestStatus,
  to: CustomWorkoutRequestStatus,
): boolean {
  return CUSTOM_WORKOUT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isPlayr1CatalogDrill(drill: Drill | undefined): boolean {
  return Boolean(drill && drill.userId === null && drill.isAiGenerated !== true);
}

export function hasUniqueDrillIds(drillIds: string[]): boolean {
  return new Set(drillIds).size === drillIds.length;
}