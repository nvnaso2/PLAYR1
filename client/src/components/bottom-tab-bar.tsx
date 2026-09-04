import { useLocation } from "wouter";
import { Dumbbell, Trophy, Home, Users, UserCircle, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/use-role";

const playerTabs = [
  {
    id: "train",
    label: "Train",
    icon: Dumbbell,
    path: "/log",
    activePatterns: ["/log", "/programs"],
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
  const { activeView } = useRole();

  const isTrainerView = activeView === "trainer";
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
