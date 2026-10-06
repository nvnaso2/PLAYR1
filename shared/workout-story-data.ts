export const WORKOUT_STORY_SIZE = { width: 1080, height: 1920 } as const;

export type WorkoutShareMetricInput = {
  id?: string | null;
  name?: string | null;
  label?: string | null;
  unit?: string | null;
  value?: number | string | null;
};

export type WorkoutShareLogTotalsInput = {
  id?: string | null;
  drillId?: string | null;
  duration: number;
  shotsAttempted?: number | null;
  shotsMade?: number | null;
  metrics?: WorkoutShareMetricInput[] | null;
};

export type WorkoutShareDrillInput = WorkoutShareLogTotalsInput & {
  drillTitle?: string | null;
  drillCategory?: string | null;
  reps?: number | null;
  sets?: number | null;
  score?: number | null;
};

export type WorkoutShareDrill = {
  id: string;
  title: string;
  category: string;
  duration: number;
  roundCount: number;
  reps: number | null;
  sets: number | null;
  score: number | null;
  scoreValues: number[];
  shotsAttempted: number | null;
  shotsMade: number | null;
  shootingPct: number | null;
  metrics: Array<{
    id: string;
    label: string;
    unit: string | null;
    values: number[];
  }>;
};

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getWorkoutShareLogShootingTotals(log: WorkoutShareLogTotalsInput) {
  const directAttempts = finiteNumber(log.shotsAttempted);
  const directMade = finiteNumber(log.shotsMade);
  if (directAttempts !== null && directAttempts > 0) {
    return {
      attempted: directAttempts,
      made: directMade ?? 0,
    };
  }

  let metricAttempts = 0;
  let metricMade = 0;
  for (const metric of log.metrics ?? []) {
    const value = finiteNumber(metric.value);
    if (value === null) continue;
    const name = `${metric.name ?? ""} ${metric.label ?? ""}`.toLowerCase();
    if (name.includes("attempt")) metricAttempts += value;
    else if (name.includes("made")) metricMade += value;
  }

  return metricAttempts > 0
    ? { attempted: metricAttempts, made: metricMade }
    : null;
}

export function calculateWorkoutShareTotals(logs: WorkoutShareLogTotalsInput[]) {
  const totalDuration = logs.reduce((sum, log) => sum + (Number(log.duration) || 0), 0);
  const shotTotals = logs.map(getWorkoutShareLogShootingTotals).filter((value) => value !== null);
  const totalShotsAttempted = shotTotals.reduce((sum, shots) => sum + Math.max(0, shots.attempted), 0);
  const totalShotsMade = shotTotals.reduce((sum, shots) => sum + Math.max(0, shots.made), 0);
  const drillIds = new Set(logs.map((log) => log.drillId).filter((id): id is string => Boolean(id)));
  const logsWithoutDrillId = logs.filter((log) => !log.drillId).length;

  return {
    drillCount: drillIds.size + logsWithoutDrillId,
    totalDuration,
    totalShotsAttempted,
    totalShotsMade,
    shootingPct: totalShotsAttempted > 0
      ? Math.round((totalShotsMade / totalShotsAttempted) * 100)
      : null,
  };
}

export function buildWorkoutShareDrills(logs: WorkoutShareDrillInput[]): WorkoutShareDrill[] {
  const grouped = new Map<string, {
    id: string;
    drillId: string | null;
    title: string;
    category: string;
    duration: number;
    roundCount: number;
    reps: number;
    hasReps: boolean;
    sets: number;
    hasSets: boolean;
    scoreValues: number[];
    shotsAttempted: number;
    shotsMade: number;
    hasShotData: boolean;
    metrics: Map<string, { id: string; label: string; unit: string | null; values: number[] }>;
  }>();

  logs.forEach((log, index) => {
    const key = log.drillId ? `drill:${log.drillId}` : `log:${log.id ?? index}`;
    let group = grouped.get(key);
    if (!group) {
      group = {
        id: log.drillId || log.id || `drill-${index + 1}`,
        drillId: log.drillId ?? null,
        title: log.drillTitle || (log.drillId ? "Drill" : "Free session"),
        category: log.drillCategory || "general",
        duration: 0,
        roundCount: 0,
        reps: 0,
        hasReps: false,
        sets: 0,
        hasSets: false,
        scoreValues: [],
        shotsAttempted: 0,
        shotsMade: 0,
        hasShotData: false,
        metrics: new Map(),
      };
      grouped.set(key, group);
    }

    group.duration += finiteNumber(log.duration) ?? 0;
    group.roundCount += 1;

    const reps = finiteNumber(log.reps);
    if (reps !== null) {
      group.reps += reps;
      group.hasReps = true;
    }
    const sets = finiteNumber(log.sets);
    if (sets !== null) {
      group.sets += sets;
      group.hasSets = true;
    }
    const score = finiteNumber(log.score);
    if (score !== null) group.scoreValues.push(score);

    const shots = getWorkoutShareLogShootingTotals(log);
    if (shots) {
      group.shotsAttempted += shots.attempted;
      group.shotsMade += shots.made;
      group.hasShotData = true;
    }

    for (const metric of log.metrics ?? []) {
      const value = finiteNumber(metric.value);
      if (value === null) continue;
      const label = metric.label?.trim() || metric.name?.trim() || "Metric";
      const id = metric.id || metric.name || label;
      const metricGroup = group.metrics.get(id) ?? {
        id,
        label,
        unit: metric.unit?.trim() || null,
        values: [],
      };
      metricGroup.values.push(value);
      group.metrics.set(id, metricGroup);
    }
  });

  return Array.from(grouped.values()).map((group) => ({
    id: group.id,
    title: group.title,
    category: group.category,
    duration: group.duration,
    roundCount: group.roundCount,
    reps: group.hasReps ? group.reps : null,
    sets: group.hasSets ? group.sets : null,
    score: group.scoreValues.length === 1 ? group.scoreValues[0] : null,
    scoreValues: group.scoreValues,
    shotsAttempted: group.hasShotData ? group.shotsAttempted : null,
    shotsMade: group.hasShotData ? group.shotsMade : null,
    shootingPct: group.shotsAttempted > 0 ? Math.round((group.shotsMade / group.shotsAttempted) * 100) : null,
    metrics: Array.from(group.metrics.values()),
  }));
}

export function getWorkoutStoryDrillColumns(drills: WorkoutShareDrill[]) {
  const rowsPerColumn = Math.ceil(drills.length / 2);
  return [
    drills.slice(0, rowsPerColumn),
    drills.slice(rowsPerColumn),
  ] as const;
}

export function getWorkoutStoryIdentity(data: {
  playerName?: string | null;
  displayName?: string | null;
  positions?: string[] | null;
  jerseyNumber?: number | null;
  teamName?: string | null;
}) {
  const name = data.displayName?.trim() || data.playerName?.trim() || null;
  const positions = (data.positions ?? []).map((position) => position.trim()).filter(Boolean);
  const details = [
    data.jerseyNumber != null ? `#${data.jerseyNumber}` : null,
    positions.length ? positions.join(" / ") : null,
    data.teamName?.trim() || null,
  ].filter((value): value is string => Boolean(value));

  return { name, details };
}
