import { and, eq, isNull, or } from "drizzle-orm";
import { trainingLogs } from "@shared/schema";

export type WorkoutShareScopeCandidate = {
  id: string;
  workoutSessionId: string | null;
};

export function resolveWorkoutShareSessionId(
  requestedId: string,
  candidates: WorkoutShareScopeCandidate[],
) {
  if (candidates.some((candidate) => candidate.workoutSessionId === requestedId)) {
    return requestedId;
  }
  return candidates.find((candidate) => candidate.id === requestedId)?.workoutSessionId || requestedId;
}

/**
 * Match logs for an authenticated player's workout session, with a legacy
 * single-log ID fallback for history rows created before session IDs existed.
 */
export function getWorkoutShareScope(userId: string, sessionId: string) {
  return and(
    eq(trainingLogs.userId, userId),
    or(
      eq(trainingLogs.workoutSessionId, sessionId),
      and(eq(trainingLogs.id, sessionId), isNull(trainingLogs.workoutSessionId)),
    ),
  );
}
