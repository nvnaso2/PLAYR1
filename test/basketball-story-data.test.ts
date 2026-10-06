import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCareerStatsStoryData,
  buildGameStatsStoryData,
  buildSeasonStatsStoryData,
} from "../client/src/lib/basketball-story-data";
import { fitStoryFontSize } from "../client/src/components/basketball-story-cards/story-layout";

test("story display numbers shrink to fit their card boxes", () => {
  const points = "1,234,567,890";
  const pointSize = fitStoryFontSize(points, 480, 88, 32, 0.6);
  assert.ok(pointSize < 88);
  assert.ok(pointSize * points.length * 0.6 <= 480);

  const record = "123–456";
  const recordSize = fitStoryFontSize(record, 460, 42, 24, 0.58);
  assert.ok(recordSize <= 42);
  assert.ok(recordSize * record.length * 0.58 <= 460);

  const unusuallyLongValue = "9".repeat(40);
  const smallPointSize = fitStoryFontSize(unusuallyLongValue, 480, 88, 32, 0.6);
  assert.ok(smallPointSize < 32);
  assert.ok(smallPointSize * unusuallyLongValue.length * 0.6 <= 480);
});

test("career story uses saved player identity and does not show averages without games", () => {
  const story = buildCareerStatsStoryData({
    totalGames: 0,
    totalPoints: 0,
    totalRebounds: 0,
    totalAssists: 0,
    totalSteals: 0,
    totalBlocks: 0,
    totalFgMade: 0,
    totalFgAttempted: 0,
    totalThreePtMade: 0,
    totalThreePtAttempted: 0,
    totalFtMade: 0,
    totalFtAttempted: 0,
    wins: 0,
    losses: 0,
    avgPoints: 0,
    avgRebounds: 0,
    avgAssists: 0,
    avgSteals: 0,
    avgBlocks: 0,
  }, {
    displayName: "Jordan",
    playerName: "Jordan Player",
    positions: ["PG"],
    teamName: "City Hoops",
    jerseyNumber: 0,
  });

  assert.equal(story?.displayName, "Jordan");
  assert.deepEqual(story?.positions, ["PG"]);
  assert.equal(story?.jerseyNumber, 0);
  assert.equal(story?.totalGames, 0);
  assert.equal(story?.avgPoints, null);
  assert.equal(story?.avgBlocks, null);
});

test("season story leaves percentages and per-game averages unavailable when there are no attempts or games", () => {
  const story = buildSeasonStatsStoryData({
    seasonName: "Winter",
    seasonYear: "2026",
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    record: "0-0",
    ppg: 0,
    rpg: 0,
    apg: 0,
    spg: 0,
    bpg: 0,
    fgPct: 0,
    threePct: 0,
    ftPct: 0,
    totalFgM: 0,
    totalFgA: 0,
    total3PM: 0,
    total3PA: 0,
    totalFtM: 0,
    totalFtA: 0,
    totalPts: 0,
    totalReb: 0,
    totalAst: 0,
    totalStl: 0,
    totalBlk: 0,
  }, {
    playerName: "Jordan Player",
    positions: ["PG", "SG"],
  });

  assert.equal(story?.seasonName, "Winter");
  assert.equal(story?.seasonYear, "2026");
  assert.equal(story?.playerName, "Jordan Player");
  assert.deepEqual(story?.positions, ["PG", "SG"]);
  assert.equal(story?.fgPct, null);
  assert.equal(story?.threePct, null);
  assert.equal(story?.ftPct, null);
  assert.equal(story?.ppg, null);
  assert.equal(story?.bpg, null);
});

test("season story preserves measured percentages and all totals when attempts exist", () => {
  const story = buildSeasonStatsStoryData({
    gamesPlayed: 4,
    wins: 3,
    losses: 1,
    record: "3-1",
    ppg: 12.5,
    rpg: 5,
    apg: 2.5,
    spg: 1,
    bpg: 0.5,
    fgPct: 42,
    threePct: 33,
    ftPct: 80,
    totalFgM: 20,
    totalFgA: 48,
    total3PM: 8,
    total3PA: 24,
    totalFtM: 12,
    totalFtA: 15,
    totalPts: 50,
    totalReb: 20,
    totalAst: 10,
    totalStl: 4,
    totalBlk: 2,
  });

  assert.equal(story?.fgPct, 42);
  assert.equal(story?.threePct, 33);
  assert.equal(story?.ftPct, 80);
  assert.equal(story?.ppg, 12.5);
  assert.equal(story?.totalPts, 50);
  assert.equal(story?.record, "3-1");
});

test("game story flattens the saved box score and uses identity only when missing", () => {
  const story = buildGameStatsStoryData({
    playerName: "Jordan Player",
    teamName: "",
    jerseyNumber: null,
    positions: [],
    opponent: "North",
    teamScore: 61,
    opponentScore: 54,
    gameDate: "2026-01-02",
    result: "W",
    stats: {
      points: 18,
      rebounds: 6,
      assists: 4,
      fgMade: 7,
      fgAttempted: 13,
      threePtMade: 2,
      threePtAttempted: 5,
    },
  }, {
    displayName: "Jordan",
    teamName: "City Hoops",
    jerseyNumber: 12,
    positions: ["PG"],
  });

  assert.equal(story?.displayName, "Jordan");
  assert.equal(story?.teamName, "City Hoops");
  assert.equal(story?.jerseyNumber, 12);
  assert.deepEqual(story?.positions, ["PG"]);
  assert.equal(story?.points, 18);
  assert.equal(story?.fgAttempted, 13);
  assert.equal(story?.teamScore, 61);
  assert.equal(story?.opponent, "North");
  assert.equal(story?.steals, undefined);
});
