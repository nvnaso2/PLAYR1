import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { pool } from "../server/db";
import { storage } from "../server/storage";

const DAY = 24 * 60 * 60 * 1000;
const fixtureUsers = [
  { key: "activityOnly", firstName: "Analytics", lastName: "Browser", daysAgo: 20 },
  { key: "multiplied", firstName: "Analytics", lastName: "High Activity", daysAgo: 40 },
  { key: "d1", firstName: "Analytics", lastName: "Day One", daysAgo: 2 },
  { key: "d7", firstName: "Analytics", lastName: "Day Seven", daysAgo: 8 },
  { key: "cohort", firstName: "Analytics", lastName: "Cohort", daysAgo: 8 },
  { key: "d30", firstName: "Analytics", lastName: "Day Thirty", daysAgo: 40 },
] as const;

type FixtureKey = (typeof fixtureUsers)[number]["key"];
const userIds = new Map<FixtureKey, string>();

const fixtureUserId = (key: FixtureKey) => userIds.get(key)!;
const sumMetric = (rows: Array<{ events?: number; count?: number }>, key: "events" | "count") =>
  rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);

let baselineAdmin: any;
let baselineRetention: any;
let baselineCohort: any;
let baselineEngagement: any;
let baselineSegments: any;

async function insertFixtureData() {
  const now = Date.now();

  for (const fixture of fixtureUsers) {
    const id = `analytics-test-${fixture.key}-${randomUUID()}`;
    userIds.set(fixture.key, id);
    const createdAt = new Date(now - fixture.daysAgo * DAY);
    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'player', $5, $5)`,
      [id, `${id}@example.invalid`, fixture.firstName, fixture.lastName, createdAt],
    );
  }

  const events: Array<{ key: FixtureKey; event: string; page: string; createdAt: Date }> = [
    { key: "activityOnly", event: "analytics_test_browse", page: "/drills", createdAt: new Date(now - 2 * DAY) },
    { key: "d1", event: "analytics_test_d1", page: "/dashboard", createdAt: new Date(now - 1.5 * DAY) },
    { key: "d7", event: "analytics_test_d7", page: "/dashboard", createdAt: new Date(now - 7 * DAY) },
    { key: "cohort", event: "analytics_test_cohort", page: "/drills", createdAt: new Date(now - 2 * DAY) },
    { key: "d30", event: "analytics_test_d30", page: "/dashboard", createdAt: new Date(now - 39 * DAY) },
  ];

  // A user with one event on each of the last 28 days makes engagement
  // calculations deterministic and exposes any event/log join multiplication.
  for (let day = 0; day < 28; day++) {
    events.push({
      key: "multiplied",
      event: `analytics_test_engagement_${day}`,
      page: `/analytics-test/${day}`,
      createdAt: new Date(now - day * DAY),
    });
  }

  for (const event of events) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO analytics_events (id, user_id, event, page, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        id,
        fixtureUserId(event.key),
        event.event,
        event.page,
        JSON.stringify({ analyticsTest: true }),
        event.createdAt,
      ],
    );
  }

  for (let index = 0; index < 3; index++) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO training_logs (id, user_id, duration, completed_at)
       VALUES ($1, $2, 30, $3)`,
      [id, fixtureUserId("multiplied"), new Date(now - index * 5 * DAY)],
    );
  }
}

async function removeFixtureData() {
  const ids = [...userIds.values()];
  if (ids.length === 0) return;
  await pool.query(`DELETE FROM analytics_events WHERE user_id = ANY($1::text[])`, [ids]);
  await pool.query(`DELETE FROM training_logs WHERE user_id = ANY($1::text[])`, [ids]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [ids]);
}

function detailFor(result: any, segment: string, userId: string) {
  return result.segmentDetails[segment]?.find((detail: any) => detail.userId === userId);
}

describe("analytics aggregation boundaries", () => {
  before(async () => {
    // Snapshot the existing database so this suite can run against a populated
    // development database without assuming it is empty.
    [baselineAdmin, baselineRetention, baselineCohort, baselineEngagement, baselineSegments] =
      await Promise.all([
        storage.getAdminAnalytics(),
        storage.getRetentionCurves(),
        storage.getCohortRetention(),
        storage.getEngagementScores(),
        storage.getUserSegments(),
      ]);
    await insertFixtureData();
  });

  after(async () => {
    await removeFixtureData();
    await pool.end();
  });

  it("counts app-active users separately from training participants", async () => {
    const analytics = await storage.getAdminAnalytics();

    assert.equal(
      analytics.totals.activeUsers7d - baselineAdmin.totals.activeUsers7d,
      4,
      "four fixture users generated activity within seven days",
    );
    assert.equal(
      analytics.totals.activeUsers30d - baselineAdmin.totals.activeUsers30d,
      5,
      "the day-7 fixture is active within 30 days",
    );
    assert.equal(
      analytics.totals.trainingLogs - baselineAdmin.totals.trainingLogs,
      3,
      "only the training fixture contributed training logs",
    );
    assert.equal(
      sumMetric(analytics.activityByWeek, "events") - sumMetric(baselineAdmin.activityByWeek, "events"),
      33,
      "all fixture events are represented once in activity totals",
    );
    assert.equal(
      sumMetric(analytics.logsByWeek, "count") - sumMetric(baselineAdmin.logsByWeek, "count"),
      3,
      "training activity is not multiplied by app events",
    );
  });

  it("calculates D1, D7, and D30 retention from app activity only", async () => {
    const retention = await storage.getRetentionCurves();

    assert.deepEqual(
      {
        eligibleD1: retention.eligibleD1 - baselineRetention.eligibleD1,
        eligibleD7: retention.eligibleD7 - baselineRetention.eligibleD7,
        eligibleD30: retention.eligibleD30 - baselineRetention.eligibleD30,
        d1: retention.d1,
        d7: retention.d7,
        d30: retention.d30,
      },
      {
        eligibleD1: 6,
        eligibleD7: 5,
        eligibleD30: 2,
        d1: Math.round((((baselineRetention.d1 / 100) * baselineRetention.eligibleD1 + 3) /
          (baselineRetention.eligibleD1 + 6)) * 1000) / 10,
        d7: Math.round((((baselineRetention.d7 / 100) * baselineRetention.eligibleD7 + 3) /
          (baselineRetention.eligibleD7 + 5)) * 1000) / 10,
        d30: Math.round((((baselineRetention.d30 / 100) * baselineRetention.eligibleD30 + 2) /
          (baselineRetention.eligibleD30 + 2)) * 1000) / 10,
      },
      "retention windows and eligible denominators should remain independent of training logs",
    );
  });

  it("keeps engagement activity independent from training-log counts", async () => {
    const engagement = await storage.getEngagementScores();

    assert.equal(
      engagement.activeUserCount - baselineEngagement.activeUserCount,
      5,
      "only users with an event in the last 28 days are active",
    );
    assert.ok(engagement.avgScore > 0, "active users receive an engagement score");

    const highActivityUser = engagement.topUsers.find(
      (user: any) => user.userId === fixtureUserId("multiplied"),
    );
    assert.ok(highActivityUser, "the consistently active fixture appears among top users");
    assert.equal(highActivityUser.logs28d, 3, "engagement sees each training log once");
    assert.equal(highActivityUser.appEvents28d, 28, "engagement sees each app event once");
  });

  it("classifies a browser as app-active without making them a training participant", async () => {
    const segments = await storage.getUserSegments();
    const browser = detailFor(segments, "casual", fixtureUserId("activityOnly"));
    const highActivity = detailFor(segments, "power", fixtureUserId("multiplied"));

    assert.ok(browser, "a recent app browser belongs to the casual app-activity segment");
    assert.equal(browser.appEvents28d, 1);
    assert.equal(browser.appDays28d, 1);
    assert.equal(browser.logs28d, 0, "browsing without a workout is not training participation");

    assert.ok(highActivity, "the 28-day activity fixture is classified as a power user");
    assert.equal(highActivity.appEvents28d, 28);
    assert.equal(highActivity.logs28d, 3, "multiple app events do not multiply training logs");
    assert.equal(
      segments.totalUsers - baselineSegments.totalUsers,
      fixtureUsers.length,
      "all fixture users are included exactly once",
    );
    assert.equal(
      segments.segments.reduce((sum: number, segment: any) => sum + segment.count, 0),
      segments.totalUsers,
      "each user is assigned to exactly one segment",
    );
  });

  it("includes event-driven cohort activity in retention without using workout logs", async () => {
    const cohorts = await storage.getCohortRetention();
    const baselineByWeek = new Map(
      baselineCohort.cohorts.map((cohort: any) => [cohort.cohortWeek, cohort]),
    );
    const cohortWeekResult = await pool.query(
      `SELECT DATE_TRUNC('week', created_at)::date::text AS week
       FROM users WHERE id = $1`,
      [fixtureUserId("cohort")],
    );
    const cohortWeek = cohortWeekResult.rows[0]?.week;
    const newCohort = cohorts.cohorts.find((cohort: any) => cohort.cohortWeek === cohortWeek);

    assert.ok(newCohort, "the fixture signup is present in a cohort");
    assert.equal(
      newCohort.cohortSize,
      (baselineByWeek.get(cohortWeek)?.cohortSize ?? 0) + 2,
      "the cohort includes the two fixtures that share this signup week",
    );
    assert.ok(
      newCohort.retention.some((week: any) => week.activeUsers > 0),
      "the fixture's app event makes its cohort active",
    );
    assert.equal(
      cohorts.cohorts.reduce((sum: number, cohort: any) => sum + cohort.cohortSize, 0) -
        baselineCohort.cohorts.reduce((sum: number, cohort: any) => sum + cohort.cohortSize, 0),
      6,
      "only fixture users inside the 12-week cohort window are included",
    );
  });
});