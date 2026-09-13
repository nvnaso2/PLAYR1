import type { NotificationCategory } from "./schema";

export type NotificationAudience = "player" | "admin";

export type NotificationCatalogItem = {
  id: string;
  audience: NotificationAudience;
  category: NotificationCategory;
  label: string;
  title: string;
  body: string;
  url: string;
  trigger: string;
};

export const NOTIFICATION_CATALOG: NotificationCatalogItem[] = [
  { id: "player-friend-invite", audience: "player", category: "connections", label: "Friend invite", title: "Friend Invite", body: "Jordan wants to be your friend", url: "/community", trigger: "When another player sends a friend request." },
  { id: "player-challenge-invite", audience: "player", category: "challengeInvites", label: "Challenge invite", title: "Challenge Invite", body: "Jordan invited you to 50-in-a-Row", url: "/community?tab=challenges", trigger: "When you are invited to a group or community challenge." },
  { id: "player-messages", audience: "player", category: "messages", label: "Player message", title: "New Message", body: "Jordan: Great work on that session.", url: "/chat", trigger: "When a player or group sends you a message." },
  { id: "player-support", audience: "player", category: "support", label: "PLAYR1 support reply", title: "New PLAYR1 Support Reply", body: "PLAYR1 Support: We have an update for you.", url: "/contact", trigger: "When an admin replies to your PLAYR1 inbox message." },
  { id: "player-session", audience: "player", category: "sessions", label: "Session update", title: "Session Confirmed", body: "Your training session with Coach Jordan has been confirmed.", url: "/my-trainer", trigger: "When a training session is requested, confirmed, declined, cancelled, or rescheduled." },
  { id: "player-workout", audience: "player", category: "drills", label: "Workout sent", title: "A custom workout is ready", body: "A PLAYR1 custom workout was built for you and is ready to start.", url: "/log", trigger: "When PLAYR1 sends or assigns you a workout." },
  { id: "player-program", audience: "player", category: "programs", label: "New program", title: "New training program", body: "Finishing Under Pressure is now available in PLAYR1.", url: "/programs", trigger: "When a new program is published." },
  { id: "player-friend-activity", audience: "player", category: "friendActivity", label: "Friend activity", title: "Jordan is active on PLAYR1", body: "Completed a workout: Ball-Handling Pressure Series", url: "/community", trigger: "When a friend completes a shareable activity." },
  { id: "player-challenge-update", audience: "player", category: "challengeUpdates", label: "Challenge update", title: "Challenge update", body: "Jordan logged a score of 42 in 50-in-a-Row.", url: "/streak-challenges/50-in-a-row", trigger: "When another participant posts progress in your challenge." },
  { id: "player-weekly-summary", audience: "player", category: "weeklySummary", label: "Weekly summary", title: "Your PLAYR1 week", body: "4 workouts completed · 126 minutes trained", url: "/progress", trigger: "Weekly, when you have completed work to report." },
  { id: "player-streak", audience: "player", category: "streakReminders", label: "Streak reminder", title: "Keep your streak alive", body: "You have a daily challenge waiting. Log today's attempt and keep building momentum.", url: "/community?tab=challenges", trigger: "Daily, when a daily challenge needs attention." },
  { id: "player-training-suggestion", audience: "player", category: "trainingSuggestions", label: "Training suggestion", title: "Ready for your next rep?", body: "You have not logged a workout in a few days. Pick a quick drill and keep your development moving.", url: "/hub", trigger: "After several days without a completed workout." },
  { id: "admin-inbox", audience: "admin", category: "adminInbox", label: "Player inbox message", title: "New PLAYR1 Support Message", body: "Jordan: I have a question about my training plan.", url: "/admin/support-messages", trigger: "When a player sends a PLAYR1 inbox message." },
  { id: "admin-custom-workout", audience: "admin", category: "adminCustomWorkouts", label: "Custom workout request", title: "New custom workout request", body: "Jordan requested a custom workout: improve finishing through contact.", url: "/admin", trigger: "When a player submits a custom workout request." },
  { id: "admin-community", audience: "admin", category: "adminCommunity", label: "Community 3-pointer", title: "New 3-pointer community score", body: "Jordan logged 42 in 50-in-a-Row.", url: "/admin", trigger: "When a player posts a community 3-pointer score." },
  { id: "admin-feedback", audience: "admin", category: "adminFeedback", label: "Feedback post", title: "New feedback post", body: "Jordan: Add more left-hand finishing drills — It would help me train this weakness.", url: "/admin", trigger: "When a player submits feedback or an idea." },
  { id: "admin-weekly-digest", audience: "admin", category: "adminWeeklyDigest", label: "Weekly admin digest", title: "PLAYR1 weekly report", body: "12 new users · 684 tracked app minutes · 3 feedback posts · $249.00 subscription revenue", url: "/admin", trigger: "Weekly, with growth, usage, subscription, and revenue totals." },
];

export const NOTIFICATION_AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  player: "Player",
  admin: "Admin",
};