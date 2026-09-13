import { db } from "./db";
import { notificationDispatches } from "@shared/schema";
import { sql } from "drizzle-orm";
import {
  getAdminUserIds,
  getPlayerUserIds,
  sendPushNotification,
} from "./push";

function startOfUtcWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + offset);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

async function claimDispatch(userId: string, kind: string, periodKey: string): Promise<boolean> {
  const result = await db.insert(notificationDispatches).values({ userId, kind, periodKey })
    .onConflictDoNothing()
    .returning({ id: notificationDispatches.id });
  return result.length > 0;
}

async function sendWeeklyAdminDigest(weekStart: Date, periodKey: string) {
  const [newUsers, trackedMinutes, feedbackPosts, communityScores, monthBilling] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= ${weekStart}`),
    db.execute(sql`SELECT COALESCE(SUM(duration), 0)::int AS minutes FROM training_logs WHERE completed_at >= ${weekStart}`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM feedback_posts WHERE created_at >= ${weekStart}`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM streak_challenge_attempts WHERE show_on_leaderboard = true AND created_at >= ${weekStart}`),
    db.execute(sql`
      SELECT
        COUNT(*)::int AS invoices,
        COALESCE(SUM(amount_paid), 0)::numeric AS revenue
      FROM stripe.invoices
      WHERE created >= date_trunc('month', CURRENT_DATE)
        AND paid = true
    `).catch(() => ({ rows: [{ invoices: 0, revenue: 0 }] } as any)),
  ]);

  const first = (result: any) => result.rows?.[0] ?? {};
  const billing = first(monthBilling);
  const body = [
    `${Number(first(newUsers).count || 0)} new users`,
    `${Number(first(trackedMinutes).minutes || 0)} tracked app minutes`,
    `${Number(first(feedbackPosts).count || 0)} new feedback posts`,
    `${Number(first(communityScores).count || 0)} community 3-pointer scores`,
    `${Number(billing.invoices || 0)} paid subscription invoices this month`,
    `$${Number(billing.revenue || 0).toFixed(2)} subscription revenue this month`,
  ].join(" · ");

  const adminIds = await getAdminUserIds();
  await Promise.all(adminIds.map(async (adminId) => {
    if (!await claimDispatch(adminId, "admin-weekly-digest", periodKey)) return;
    await sendPushNotification(adminId, {
      title: "PLAYR1 weekly report",
      body,
      url: "/admin",
    }, "adminWeeklyDigest");
  }));
}

async function sendWeeklyPlayerSummaries(weekStart: Date, periodKey: string) {
  const playerIds = await getPlayerUserIds();
  await Promise.all(playerIds.map(async (userId) => {
    const [summary] = (await db.execute(sql`
      SELECT COUNT(*)::int AS workouts, COALESCE(SUM(duration), 0)::int AS minutes
      FROM training_logs
      WHERE user_id = ${userId} AND completed_at >= ${weekStart}
    `)).rows as any[];
    const workouts = Number(summary?.workouts || 0);
    const minutes = Number(summary?.minutes || 0);
    if (workouts === 0 && minutes === 0) return;
    if (!await claimDispatch(userId, "player-weekly-summary", periodKey)) return;
    await sendPushNotification(userId, {
      title: "Your PLAYR1 week",
      body: `${workouts} workout${workouts === 1 ? "" : "s"} completed · ${minutes} minute${minutes === 1 ? "" : "s"} trained`,
      url: "/progress",
    }, "weeklySummary");
  }));
}

async function sendReengagementReminders(now: Date, periodKey: string) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 5);
  const playerIds = await getPlayerUserIds();
  await Promise.all(playerIds.map(async (userId) => {
    const [row] = (await db.execute(sql`
      SELECT MAX(completed_at) AS last_completed
      FROM training_logs
      WHERE user_id = ${userId}
    `)).rows as any[];
    if (!row?.last_completed || new Date(row.last_completed) > cutoff) return;
    if (!await claimDispatch(userId, "training-suggestion", periodKey)) return;
    await sendPushNotification(userId, {
      title: "Ready for your next rep?",
      body: "You have not logged a workout in a few days. Pick a quick drill and keep your development moving.",
      url: "/hub",
    }, "trainingSuggestions");
  }));
}

async function sendStreakReminders(periodKey: string) {
  const rows = (await db.execute(sql`
    SELECT DISTINCT user_id
    FROM streak_challenge_participants
    WHERE is_daily = true
      AND (last_attempt_date IS NULL OR last_attempt_date < CURRENT_DATE - 1)
  `)).rows as Array<{ user_id: string }>;
  await Promise.all(rows.map(async ({ user_id: userId }) => {
    if (!await claimDispatch(userId, "streak-reminder", periodKey)) return;
    await sendPushNotification(userId, {
      title: "Keep your streak alive",
      body: "You have a daily challenge waiting. Log today's attempt and keep building momentum.",
      url: "/community?tab=challenges",
    }, "streakReminders");
  }));
}

/**
 * The job is intentionally safe to call often. It only emits weekly work on
 * Monday morning and uses a unique dispatch row for every recipient and period.
 */
export async function runNotificationJobs(now = new Date()): Promise<void> {
  const weekStart = startOfUtcWeek(now);
  const periodKey = weekStart.toISOString().slice(0, 10);
  const isDigestWindow = now.getUTCDay() === 1 && now.getUTCHours() === 13;

  if (isDigestWindow) {
    await sendWeeklyAdminDigest(weekStart, periodKey);
    await sendWeeklyPlayerSummaries(weekStart, periodKey);
  }

  const reminderPeriod = now.toISOString().slice(0, 10);
  if (now.getUTCHours() === 15) {
    await Promise.all([
      sendReengagementReminders(now, reminderPeriod),
      sendStreakReminders(reminderPeriod),
    ]);
  }
}