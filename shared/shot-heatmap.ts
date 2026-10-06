import { LOCATION_CLASSIFICATIONS, type ShotLocation, type ShotLocationDB } from "./schema";

export const SHOT_HEATMAP_SECTIONS = [
  "three-pointers",
  "mid-range",
  "free-throws",
  "layups",
] as const;

export type ShotHeatmapSection = (typeof SHOT_HEATMAP_SECTIONS)[number];

export type ShotHeatmapBaseline = {
  averagePct: number | null;
  workouts: number;
};

export type ShotHeatmapBaselines = Record<ShotHeatmapSection, ShotHeatmapBaseline>;

export type ShotHeatmapBaselineResponse = {
  workoutWindow: number;
  sections: ShotHeatmapBaselines;
};

export type ShotHeatmapLog = {
  id: string;
  workoutSessionId: string | null;
  shotLocation: string | null;
  shotsMade: number | null;
  shotsAttempted: number | null;
  completedAt: Date | string | null;
};

const EMPTY_BASELINE: ShotHeatmapBaseline = { averagePct: null, workouts: 0 };

export const EMPTY_SHOT_HEATMAP_BASELINES: ShotHeatmapBaselines = {
  "three-pointers": EMPTY_BASELINE,
  "mid-range": EMPTY_BASELINE,
  "free-throws": EMPTY_BASELINE,
  layups: EMPTY_BASELINE,
};

export function getShotHeatmapSection(
  location: string,
  classification?: string | null,
): ShotHeatmapSection | null {
  const slug = location.toLowerCase();
  const storedClassification = classification?.toLowerCase();
  const legacyClassification =
    (LOCATION_CLASSIFICATIONS as Partial<Record<ShotLocation, string>>)[location as ShotLocation];
  const resolvedClassification = storedClassification || legacyClassification;

  if (resolvedClassification === "3-pointer") return "three-pointers";
  if (resolvedClassification === "free-throw") return "free-throws";
  if (slug.includes("layup") || slug.includes("block")) return "layups";
  if (resolvedClassification === "2-pointer") return "mid-range";
  return null;
}

export function buildRecentShotHeatmapBaselines(
  logs: ShotHeatmapLog[],
  locations: Array<Pick<ShotLocationDB, "slug" | "classification">>,
  requestedWorkoutWindow = 10,
): ShotHeatmapBaselineResponse {
  const workoutWindow = Number.isFinite(requestedWorkoutWindow)
    ? Math.max(1, Math.min(10, Math.floor(requestedWorkoutWindow)))
    : 10;
  const classificationByLocation = new Map(locations.map((location) => [location.slug, location.classification]));
  const sessions = new Map<
    string,
    {
      completedAt: number;
      sections: Record<ShotHeatmapSection, { made: number; attempted: number }>;
    }
  >();

  for (const log of logs) {
    if (!log.shotLocation || !log.completedAt) continue;
    const completedAt = new Date(log.completedAt).getTime();
    if (!Number.isFinite(completedAt)) continue;

    const attempted = Math.max(0, Math.floor(Number(log.shotsAttempted) || 0));
    if (attempted === 0) continue;
    const made = Math.min(attempted, Math.max(0, Math.floor(Number(log.shotsMade) || 0)));
    const section = getShotHeatmapSection(
      log.shotLocation,
      classificationByLocation.get(log.shotLocation),
    );
    if (!section) continue;

    // Logs without a workoutSessionId are standalone completed workouts.
    const sessionId = log.workoutSessionId || `log:${log.id}`;
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        completedAt,
        sections: {
          "three-pointers": { made: 0, attempted: 0 },
          "mid-range": { made: 0, attempted: 0 },
          "free-throws": { made: 0, attempted: 0 },
          layups: { made: 0, attempted: 0 },
        },
      };
      sessions.set(sessionId, session);
    } else {
      session.completedAt = Math.max(session.completedAt, completedAt);
    }

    session.sections[section].made += made;
    session.sections[section].attempted += attempted;
  }

  const orderedSessions = [...sessions.values()].sort((a, b) => b.completedAt - a.completedAt);
  const sectionAverages = {} as ShotHeatmapBaselines;

  for (const section of SHOT_HEATMAP_SECTIONS) {
    const recentWorkouts = orderedSessions
      .filter((session) => session.sections[section].attempted > 0)
      .slice(0, workoutWindow);
    const averagePct = recentWorkouts.length > 0
      ? recentWorkouts.reduce((sum, session) => {
          const stats = session.sections[section];
          return sum + (stats.made / stats.attempted) * 100;
        }, 0) / recentWorkouts.length
      : null;

    sectionAverages[section] = {
      averagePct: averagePct === null ? null : Math.round(averagePct * 10) / 10,
      workouts: recentWorkouts.length,
    };
  }

  return { workoutWindow, sections: sectionAverages };
}

// Eleven equal bands center the player's recent average and move one color
// for every five percentage points above or below it.
export function getPersonalHeatBandIndex(observedPct: number, baselinePct: number): number {
  const center = 5;
  const stepSizePct = 5;
  const deviationSteps = Math.round((observedPct - baselinePct) / stepSizePct);
  return Math.max(0, Math.min(10, center + deviationSteps));
}
