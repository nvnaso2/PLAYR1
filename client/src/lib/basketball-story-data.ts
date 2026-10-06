import type {
  BasketballStoryIdentity,
  CareerStatsStoryData,
  GameStatsStoryData,
  SeasonStatsStoryData,
} from "@/components/basketball-story-cards";

export type CareerStatsApiResponse = CareerStatsStoryData & {
  seasonBreakdown?: unknown[];
};

export type GameStatsShareResponse = BasketballStoryIdentity & {
  opponent?: string | null;
  teamScore?: number | null;
  opponentScore?: number | null;
  gameDate?: string | null;
  result?: string | null;
  stats?: Partial<Pick<
    GameStatsStoryData,
    | "points"
    | "rebounds"
    | "assists"
    | "steals"
    | "blocks"
    | "fgMade"
    | "fgAttempted"
    | "threePtMade"
    | "threePtAttempted"
    | "ftMade"
    | "ftAttempted"
  >>;
};

function resolveIdentity(
  primary: BasketballStoryIdentity,
  fallback?: BasketballStoryIdentity,
): BasketballStoryIdentity {
  return {
    displayName: primary.displayName?.trim() || fallback?.displayName?.trim() || null,
    playerName: primary.playerName?.trim() || fallback?.playerName?.trim() || null,
    positions: primary.positions?.length ? primary.positions : fallback?.positions ?? [],
    teamName: primary.teamName?.trim() || fallback?.teamName?.trim() || null,
    jerseyNumber: primary.jerseyNumber ?? fallback?.jerseyNumber ?? null,
    schoolName: primary.schoolName?.trim() || fallback?.schoolName?.trim() || null,
  };
}

export function buildCareerStatsStoryData(
  data?: CareerStatsApiResponse | null,
  identity?: BasketballStoryIdentity,
): CareerStatsStoryData | undefined {
  if (!data) return undefined;
  const hasGames = data.totalGames == null || Number(data.totalGames) > 0;
  return {
    ...data,
    ...resolveIdentity(data, identity),
    avgPoints: hasGames ? data.avgPoints : null,
    avgRebounds: hasGames ? data.avgRebounds : null,
    avgAssists: hasGames ? data.avgAssists : null,
    avgSteals: hasGames ? data.avgSteals : null,
    avgBlocks: hasGames ? data.avgBlocks : null,
  };
}

export function buildSeasonStatsStoryData(
  data?: SeasonStatsStoryData | null,
  identity?: BasketballStoryIdentity,
): SeasonStatsStoryData | undefined {
  if (!data) return undefined;
  const hasGames = data.gamesPlayed == null || Number(data.gamesPlayed) > 0;
  const pctWhenAttemptsExist = (value: number | null | undefined, attempts: number | null | undefined) =>
    attempts != null && Number(attempts) <= 0 ? null : value;

  return {
    ...data,
    ...resolveIdentity(data, identity),
    fgPct: pctWhenAttemptsExist(data.fgPct, data.totalFgA),
    threePct: pctWhenAttemptsExist(data.threePct, data.total3PA),
    ftPct: pctWhenAttemptsExist(data.ftPct, data.totalFtA),
    ppg: hasGames ? data.ppg : null,
    rpg: hasGames ? data.rpg : null,
    apg: hasGames ? data.apg : null,
    spg: hasGames ? data.spg : null,
    bpg: hasGames ? data.bpg : null,
  };
}

export function buildGameStatsStoryData(
  data?: GameStatsShareResponse | null,
  identity?: BasketballStoryIdentity,
): GameStatsStoryData | undefined {
  if (!data) return undefined;
  return {
    ...data,
    ...data.stats,
    ...resolveIdentity(data, identity),
  };
}
