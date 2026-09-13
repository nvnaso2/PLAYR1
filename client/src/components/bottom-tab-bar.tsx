import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { nativeFetch } from "@/lib/queryClient";
import { Dumbbell, Trophy, Home, Users, UserCircle, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/use-role";

const playerTabs = [
  {
    id: "train",
    label: "Train",
    icon: Dumbbell,
    path: "/log",
    activePatterns: ["/log", "/programs", "/courses", "/lead-magnets"],
  },
  {
    id: "compete",
    label: "Compete",
    icon: Trophy,
    path: "/events",
    activePatterns: ["/events"],
  },
  {
    id: "hub",
    label: "Hub",
    icon: Home,
    path: "/hub",
    center: true,
    activePatterns: ["/hub", "/dashboard"],
  },
  {
    id: "community",
    label: "Community",
    icon: Users,
    path: "/community",
    activePatterns: ["/community", "/connect"],
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserCircle,
    path: "/profile-hub",
    activePatterns: ["/profile-hub", "/profile", "/subscription", "/career", "/development", "/archetypes", "/my-archetype", "/my-goal", "/game-day"],
  },
];

const trainerTabs = [
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    path: "/trainer/schedule",
    activePatterns: ["/trainer/schedule"],
  },
  {
    id: "content",
    label: "Content",
    icon: Dumbbell,
    path: "/trainer/drills",
    activePatterns: ["/trainer/drills", "/trainer/programs", "/trainer/logs"],
  },
  {
    id: "trainer-hub",
    label: "Hub",
    icon: Home,
    path: "/trainer",
    center: true,
    activePatterns: ["/trainer"],
  },
  {
    id: "players",
    label: "Players",
    icon: Users,
    path: "/trainer/roster",
    activePatterns: ["/trainer/roster", "/trainer/chat", "/trainer/evaluations", "/trainer/progress"],
  },
  {
    id: "trainer-profile",
    label: "Profile",
    icon: UserCircle,
    path: "/trainer/profile",
    activePatterns: ["/trainer/profile"],
  },
];

export function BottomTabBar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { activeView } = useRole();
  const { data: supportUnread } = useQuery<{ available: boolean; unreadCount: number }>({
    queryKey: ["/api/support/unread", user?.id],
    queryFn: async () => {
      const response = await nativeFetch("/api/support/unread", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load message notifications");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Keep trainer navigation code available without exposing trainer mode in
  // the current player-facing app.
  const isTrainerView = false;
  const tabs = isTrainerView ? trainerTabs : playerTabs;

  function isTabActive(tab: typeof tabs[0]): boolean {
    if (tab.id === "hub" || tab.id === "trainer-hub") {
      if (isTrainerView) return location === "/trainer";
      return location === "/" || location === "/hub" || location === "/dashboard";
    }
    // "players" tab: active for /trainer but NOT /trainer/profile etc. handled by activePatterns
    return tab.activePatterns.some(
      (p) => location === p || location.startsWith(p + "/")
    );
  }

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="shrink-0 w-full z-50 flex items-end justify-around bg-zinc-950/98 backdrop-blur-xl border-t border-zinc-800/80"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab);
        const Icon = tab.icon;

        if (tab.center) {
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-end pb-2 pt-1 flex-1 relative"
              aria-label={tab.label}
            >
              <div
                className={cn(
                  "w-14 h-14 -mt-7 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200",
                  active
                    ? "bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/50 scale-105"
                    : "bg-gradient-to-br from-orange-500 to-orange-700 shadow-orange-600/30"
                )}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium mt-1 transition-colors",
                  active ? "text-orange-400" : "text-zinc-500"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-end pt-3 pb-2 flex-1 gap-1 transition-all duration-150 active:scale-95"
            aria-label={tab.label}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "w-[22px] h-[22px] transition-colors",
                  active ? "text-orange-400" : "text-zinc-500"
                )}
              />
              {tab.id === "profile" && (supportUnread?.unreadCount || 0) > 0 && (
                <span
                  className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-zinc-950 bg-red-500 px-1 text-[9px] font-bold leading-none text-white"
                  aria-label={`${supportUnread?.unreadCount} new messages`}
                  data-testid="badge-bottom-profile-unread"
                >
                  {(supportUnread?.unreadCount || 0) > 99 ? "99+" : supportUnread?.unreadCount}
                </span>
              )}
              {active && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                active ? "text-orange-400" : "text-zinc-500"
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
