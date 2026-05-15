import { useLocation } from "wouter";
import { useSidebar } from "@/components/ui/sidebar";
import { Dumbbell, Zap, Home, Flame, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    label: "Train",
    icon: Dumbbell,
    path: "/log",
    activePatterns: ["/log"],
  },
  {
    label: "Journey",
    icon: Zap,
    path: "/journey",
    activePatterns: ["/journey", "/my-goal", "/my-archetype", "/archetypes", "/career"],
  },
  {
    label: "Hub",
    icon: Home,
    path: "/hub",
    center: true,
    activePatterns: ["/hub", "/dashboard", "/progress"],
  },
  {
    label: "Events",
    icon: Flame,
    path: "/events",
    activePatterns: ["/events", "/game-day", "/challenge-history"],
  },
  {
    label: "More",
    icon: LayoutGrid,
    path: null,
    activePatterns: [],
  },
];

export function BottomTabBar() {
  const [location, navigate] = useLocation();
  const { setOpenMobile } = useSidebar();

  function isTabActive(tab: typeof tabs[0]): boolean {
    if (tab.path === "/hub") return location === "/" || location === "/hub" || location === "/dashboard" || location === "/progress";
    return tab.activePatterns.some((p) => location === p || location.startsWith(p + "/"));
  }

  function handleTap(tab: typeof tabs[0]) {
    if (tab.path === null) {
      setOpenMobile(true);
    } else {
      navigate(tab.path);
    }
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
              key={tab.label}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              onClick={() => handleTap(tab)}
              className="flex flex-col items-center justify-center pb-2 pt-1 flex-1 relative"
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
            key={tab.label}
            data-testid={`tab-${tab.label.toLowerCase()}`}
            onClick={() => handleTap(tab)}
            className="flex flex-col items-center justify-center pt-3 pb-2 flex-1 gap-1 transition-all duration-150 active:scale-95"
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
