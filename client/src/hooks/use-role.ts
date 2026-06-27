import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { createElement } from "react";

type StaffRole = "coach" | "trainer" | "both" | null;
type ActiveView = "player" | "trainer";

interface CareerProfile {
  staffRole?: StaffRole;
  alsoPlayer?: boolean;
  onboardingCompleted?: boolean;
}

export interface RoleContextValue {
  staffRole: StaffRole;
  isTrainer: boolean;
  isCoach: boolean;
  hasStaffRole: boolean;
  isPlayer: boolean;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  canToggle: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = "playr1-active-view";
export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useQuery<CareerProfile>({
    queryKey: ["/api/career"],
    retry: false,
  });

  const staffRole = (profile?.staffRole as StaffRole) || null;
  const isTrainer = staffRole === "trainer" || staffRole === "both";
  const isCoach = staffRole === "coach" || staffRole === "both";
  const hasStaffRole = isTrainer || isCoach;
  const alsoPlayer = profile?.alsoPlayer === true;

  const initialView = (): ActiveView => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "player" || stored === "trainer") return stored;
    return "player";
  };

  const [activeViewState, setActiveViewState] = useState<ActiveView>(initialView);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isLoading && profile && !hasInitialized.current) {
      hasInitialized.current = true;
      if (hasStaffRole && !alsoPlayer) {
        setActiveViewState("trainer");
        localStorage.setItem(STORAGE_KEY, "trainer");
      } else if (hasStaffRole && alsoPlayer) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setActiveViewState("trainer");
          localStorage.setItem(STORAGE_KEY, "trainer");
        }
      } else if (!hasStaffRole) {
        setActiveViewState("player");
        localStorage.setItem(STORAGE_KEY, "player");
      }
    }
  }, [isLoading, profile, hasStaffRole, alsoPlayer]);

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    localStorage.setItem(STORAGE_KEY, view);
  }, []);

  let resolvedView: ActiveView;
  if (hasStaffRole && !alsoPlayer) {
    resolvedView = "trainer";
  } else if (hasStaffRole) {
    resolvedView = activeViewState;
  } else {
    resolvedView = "player";
  }

  const value: RoleContextValue = {
    staffRole,
    isTrainer,
    isCoach,
    hasStaffRole,
    isPlayer: !hasStaffRole || alsoPlayer,
    activeView: resolvedView,
    setActiveView,
    canToggle: hasStaffRole && alsoPlayer,
    isLoading,
  };

  return createElement(RoleContext.Provider, { value }, children);
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
