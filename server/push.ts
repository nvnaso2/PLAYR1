import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions, notificationPreferences, NOTIFICATION_CATEGORIES, type NotificationCategory, type NotificationCategoryPreferences } from "@shared/schema";
import { users } from "@shared/models/auth";
import { and, eq, isNull, or } from "drizzle-orm";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:noreply@handlz.co";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export type { NotificationCategory };

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  messages: "Direct and group messages",
  support: "PLAYR1 support messages",
  sessions: "Training session updates",
  drills: "Workout and drill assignments",
  connections: "Friend and connection invites",
  challengeInvites: "Challenge invitations",
  challengeUpdates: "Challenge progress and updates",
  friendActivity: "Friend activity",
  programs: "New programs",
  weeklySummary: "Weekly progress summary",
  streakReminders: "Streak reminders",
  trainingSuggestions: "Suggested drills and workouts",
  adminInbox: "Player inbox messages",
  adminCustomWorkouts: "Custom workout requests",
  adminCommunity: "Community and 3-pointer activity",
  adminFeedback: "New feedback posts",
  adminWeeklyDigest: "Weekly admin digest",
};

export const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategoryPreferences = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((category) => [category, true]),
) as NotificationCategoryPreferences;

export async function getNotificationPreferences(userId: string) {
  const [row] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
  return {
    pushEnabled: row?.pushEnabled ?? true,
    categories: { ...DEFAULT_NOTIFICATION_CATEGORIES, ...(row?.categories ?? {}) },
    onboardingPromptSeen: row?.onboardingPromptSeen ?? false,
  };
}

export async function saveNotificationPreferences(
  userId: string,
  values: { pushEnabled?: boolean; categories?: NotificationCategoryPreferences; onboardingPromptSeen?: boolean },
) {
  const current = await getNotificationPreferences(userId);
  const categories = { ...current.categories, ...(values.categories ?? {}) };
  const [row] = await db.insert(notificationPreferences).values({
    userId,
    pushEnabled: values.pushEnabled ?? current.pushEnabled,
    categories,
    onboardingPromptSeen: values.onboardingPromptSeen ?? current.onboardingPromptSeen,
  }).onConflictDoUpdate({
    target: notificationPreferences.userId,
    set: {
      ...(values.pushEnabled === undefined ? {} : { pushEnabled: values.pushEnabled }),
      ...(values.categories === undefined ? {} : { categories }),
      ...(values.onboardingPromptSeen === undefined ? {} : { onboardingPromptSeen: values.onboardingPromptSeen }),
      updatedAt: new Date(),
    },
  }).returning();
  return {
    pushEnabled: row.pushEnabled,
    categories: { ...DEFAULT_NOTIFICATION_CATEGORIES, ...(row.categories ?? {}) },
    onboardingPromptSeen: row.onboardingPromptSeen,
  };
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
  category?: NotificationCategory,
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return;
  }

  const preferences = await getNotificationPreferences(userId);
  if (!preferences.pushEnabled || (category && preferences.categories[category] === false)) {
    return;
  }

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}

export async function getAdminUserIds(): Promise<string[]> {
  const rows = await db.select({ id: users.id }).from(users)
    .innerJoin(userProfilesForAdmin, eq(userProfilesForAdmin.userId, users.id))
    .where(eq(userProfilesForAdmin.isAdmin, true));
  return rows.map((row) => row.id);
}

// Kept as a small local table reference so the push module can target admins
// without importing the much larger application schema module.
import { userProfiles as userProfilesForAdmin } from "@shared/schema";

export async function sendPushToAdmins(payload: PushPayload, category: NotificationCategory): Promise<void> {
  const adminIds = await getAdminUserIds();
  await Promise.all(adminIds.map((userId) => sendPushNotification(userId, payload, category)));
}

export async function getPlayerUserIds(): Promise<string[]> {
  const rows = await db.select({ id: users.id }).from(users)
    .leftJoin(userProfilesForAdmin, eq(userProfilesForAdmin.userId, users.id))
    .where(or(isNull(userProfilesForAdmin.isAdmin), eq(userProfilesForAdmin.isAdmin, false)));
  return rows.map((row) => row.id);
}

export async function sendPushToPlayers(payload: PushPayload, category: NotificationCategory): Promise<void> {
  const playerIds = await getPlayerUserIds();
  await Promise.all(playerIds.map((userId) => sendPushNotification(userId, payload, category)));
}

export function getVapidPublicKey(): string | undefined {
  return vapidPublicKey;
}
