// Centralized lazy page loaders. Exposing each loader as a named function
// lets us call them imperatively from the sidebar (on hover/touch) so that
// route chunks are downloaded BEFORE the user clicks. This eliminates the
// blank-skeleton wait that happens on the first visit to each tab.

export const pageLoaders = {
  drills: () => import("@/pages/drills"),
  drill: () => import("@/pages/drill"),
  trainingLog: () => import("@/pages/training-log"),
  dashboard: () => import("@/pages/progress"),
  videos: () => import("@/pages/videos"),
  profile: () => import("@/pages/profile"),
  career: () => import("@/pages/career"),
  playerPublic: () => import("@/pages/player-public"),
  trainerPublic: () => import("@/pages/trainer-public"),
  admin: () => import("@/pages/admin"),
  trainerDashboard: () => import("@/pages/trainer/index"),
  trainerRoster: () => import("@/pages/trainer/roster"),
  trainerDrills: () => import("@/pages/trainer/drills"),
  trainerLogs: () => import("@/pages/trainer/logs"),
  trainerChat: () => import("@/pages/trainer/chat"),
  trainerProgress: () => import("@/pages/trainer/progress"),
  trainerProfile: () => import("@/pages/trainer/profile"),
  trainerSchedule: () => import("@/pages/trainer/schedule"),
  trainerEvaluations: () => import("@/pages/trainer/evaluations"),
  trainerPlayerDetail: () => import("@/pages/trainer/player-detail"),
  challengeHistory: () => import("@/pages/challenge-history"),
  finder: () => import("@/pages/finder"),
  teamProfile: () => import("@/pages/team-profile"),
  leagueProfile: () => import("@/pages/league-profile"),
  myTrainer: () => import("@/pages/my-trainer"),
  parentDashboard: () => import("@/pages/parent-dashboard"),
  findPeople: () => import("@/pages/find-people"),
  feedback: () => import("@/pages/feedback"),
  programs: () => import("@/pages/programs"),
  programDetail: () => import("@/pages/program-detail"),
  programToday: () => import("@/pages/program-today"),
  programEditor: () => import("@/pages/program-editor"),
  trainerPrograms: () => import("@/pages/trainer/programs"),
  events: () => import("@/pages/events"),
  eventDetail: () => import("@/pages/event-detail"),
  eventEditor: () => import("@/pages/event-editor"),
  journal: () => import("@/pages/journal"),
  gameDay: () => import("@/pages/game-day"),
  archetypes: () => import("@/pages/archetypes"),
  myArchetype: () => import("@/pages/my-archetype"),
  myGoal: () => import("@/pages/my-goal"),
  hub: () => import("@/pages/hub"),
  journey: () => import("@/pages/journey"),
  onboardingPreview: () => import("@/pages/onboarding-preview"),
  adminBrandPrinciples: () => import("@/pages/admin-brand-principles"),
} as const;

// Map URL path → loader key. Used by the sidebar to preload on hover/touch.
const routeToLoader: Record<string, keyof typeof pageLoaders> = {
  "/dashboard": "dashboard",
  "/progress": "dashboard",
  "/drills": "drills",
  "/log": "trainingLog",
  "/videos": "videos",
  "/profile": "profile",
  "/career": "career",
  "/admin": "admin",
  "/admin/onboarding-preview": "onboardingPreview",
  "/admin/brand-principles": "adminBrandPrinciples",
  "/teams": "finder",
  "/connect": "findPeople",
  "/feedback": "feedback",
  "/journal": "journal",
  "/game-day": "gameDay",
  "/archetypes": "archetypes",
  "/my-archetype": "myArchetype",
  "/my-goal": "myGoal",
  "/hub": "hub",
  "/journey": "journey",
  "/programs": "programs",
  "/events": "events",
  "/my-trainer": "myTrainer",
  "/parent": "parentDashboard",
  "/challenge-history": "challengeHistory",
  "/trainer": "trainerDashboard",
  "/trainer/roster": "trainerRoster",
  "/trainer/drills": "trainerDrills",
  "/trainer/logs": "trainerLogs",
  "/trainer/chat": "trainerChat",
  "/trainer/progress": "trainerProgress",
  "/trainer/profile": "trainerProfile",
  "/trainer/schedule": "trainerSchedule",
  "/trainer/evaluations": "trainerEvaluations",
  "/trainer/programs": "trainerPrograms",
};

const preloadedKeys = new Set<keyof typeof pageLoaders>();

function preloadByKey(key: keyof typeof pageLoaders) {
  if (preloadedKeys.has(key)) return;
  preloadedKeys.add(key);
  // Fire and forget — errors swallowed since this is a perf hint, not a hard load.
  pageLoaders[key]().catch(() => preloadedKeys.delete(key));
}

/**
 * Preload the JS chunk for a route URL. Safe to call from `onMouseEnter`,
 * `onTouchStart`, etc. Strips query strings before lookup so that things
 * like `/drills?category=shooting` resolve to the `/drills` loader.
 */
export function preloadRoute(url: string) {
  const path = url.split("?")[0];
  const key = routeToLoader[path];
  if (key) preloadByKey(key);
}

/**
 * Preload the most-visited authenticated pages in idle time after login.
 * Greatly improves perceived performance on the first tap of each tab.
 */
export function preloadCommonPages(isTrainer: boolean) {
  const playerKeys: (keyof typeof pageLoaders)[] = [
    "dashboard", "trainingLog", "drills", "videos", "career", "myTrainer",
  ];
  const trainerKeys: (keyof typeof pageLoaders)[] = [
    "trainerDashboard", "trainerRoster", "trainerDrills", "trainerChat", "trainerSchedule",
  ];
  const keys = isTrainer ? trainerKeys : playerKeys;

  const run = () => keys.forEach((k) => preloadByKey(k));
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (typeof ric === "function") {
    ric(run, { timeout: 2500 });
  } else {
    setTimeout(run, 800);
  }
}
