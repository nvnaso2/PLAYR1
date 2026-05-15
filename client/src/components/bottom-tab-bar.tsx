import { useState } from "react";
import { useLocation } from "wouter";
import { Dumbbell, Trophy, Home, Users, UserCircle, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreDrawer } from "@/components/more-drawer";

const tabs = [
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
    path: "/my-trainer",
    activePatterns: ["/my-trainer", "/teams", "/connect"],
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserCircle,
    path: "/profile",
    activePatterns: ["/profile", "/career", "/archetypes", "/my-archetype", "/my-goal", "/game-day"],
  },
];

const moreTabs = {
  id: "more",
  label: "More",
  icon: LayoutGrid,
  path: null,
};

export function BottomTabBar() {
  const [location, navigate] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  function isTabActive(tab: typeof tabs[0]): boolean {
    if (tab.id === "hub") {
      return location === "/" || location === "/hub" || location === "/dashboard";
    }
    return tab.activePatterns.some(
      (p) => location === p || location.startsWith(p + "/")
    );
  }

  function handleTap(path: string | null) {
    if (path === null) {
      setMoreOpen(true);
    } else {
      navigate(path);
    }
  }

  const allTabs = [...tabs.slice(0, 2), tabs[2], ...tabs.slice(3)];

  return (
    <>
      <nav
        data-testid="bottom-tab-bar"
        className="shrink-0 w-full z-50 flex items-end justify-around bg-zinc-950/98 backdrop-blur-xl border-t border-zinc-800/80"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
      >
        {/* Train */}
        {renderTab(tabs[0], isTabActive(tabs[0]), handleTap)}

        {/* Compete */}
        {renderTab(tabs[1], isTabActive(tabs[1]), handleTap)}

        {/* Hub — center raised button */}
        <button
          data-testid="tab-hub"
          onClick={() => handleTap(tabs[2].path)}
          className="flex flex-col items-center justify-end pb-2 pt-1 flex-1 relative"
          aria-label="Hub"
        >
          <div
            className={cn(
              "w-14 h-14 -mt-7 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200",
              isTabActive(tabs[2])
                ? "bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/50 scale-105"
                : "bg-gradient-to-br from-orange-500 to-orange-700 shadow-orange-600/30"
            )}
          >
            <Home className="w-6 h-6 text-white" />
          </div>
          <span
            className={cn(
              "text-[10px] font-medium mt-1 transition-colors",
              isTabActive(tabs[2]) ? "text-orange-400" : "text-zinc-500"
            )}
          >
            Hub
          </span>
        </button>

        {/* Community */}
        {renderTab(tabs[3], isTabActive(tabs[3]), handleTap)}

        {/* Profile */}
        {renderTab(tabs[4], isTabActive(tabs[4]), handleTap)}

        {/* More */}
        <button
          data-testid="tab-more"
          onClick={() => handleTap(null)}
          className="flex flex-col items-center justify-end pt-3 pb-2 flex-1 gap-1 transition-all duration-150 active:scale-95"
          aria-label="More"
        >
          <LayoutGrid
            className={cn(
              "w-[22px] h-[22px] transition-colors",
              moreOpen ? "text-orange-400" : "text-zinc-500"
            )}
          />
          <span
            className={cn(
              "text-[10px] font-medium transition-colors",
              moreOpen ? "text-orange-400" : "text-zinc-500"
            )}
          >
            More
          </span>
        </button>
      </nav>

      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function renderTab(
  tab: { id: string; label: string; icon: React.ElementType; path: string | null; activePatterns: string[] },
  active: boolean,
  onTap: (path: string | null) => void
) {
  const Icon = tab.icon;
  return (
    <button
      key={tab.id}
      data-testid={`tab-${tab.id}`}
      onClick={() => onTap(tab.path)}
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
}
