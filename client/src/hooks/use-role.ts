import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

type StaffRole = "coach" | "trainer" | "both" | null;
type ActiveView = "player" | "trainer";

interface CareerProfile {
  staffRole?: StaffRole;
  onboardingCompleted?: boolean;
}

const STORAGE_KEY = "playr1-active-view";

export function useRole() {
  const { data: profile, isLoading } = useQuery<CareerProfile>({
    queryKey: ["/api/career"],
    retry: false,
  });

  const staffRole = (profile?.staffRole as StaffRole) || null;
  const isTrainer = staffRole === "trainer" || staffRole === "both";
  const isCoach = staffRole === "coach" || staffRole === "both";
  const hasStaffRole = isTrainer || isCoach;

  const initialView = (): ActiveView => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "player" || stored === "trainer") return stored;
    return "player";
  };

  const [activeView, setActiveViewState] = useState<ActiveView>(initialView);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isLoading && profile && !hasInitialized.current) {
      hasInitialized.current = true;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored && hasStaffRole) {
        setActiveViewState("trainer");
        localStorage.setItem(STORAGE_KEY, "trainer");
      } else if (stored === "trainer" && !hasStaffRole) {
        setActiveViewState("player");
        localStorage.setItem(STORAGE_KEY, "player");
      }
    }
  }, [isLoading, profile, hasStaffRole]);

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    localStorage.setItem(STORAGE_KEY, view);
  }, []);

  const resolvedView = hasStaffRole ? activeView : "player" as ActiveView;

  return {
    staffRole,
    isTrainer,
    isCoach,
    hasStaffRole,
    isPlayer: !hasStaffRole,
    activeView: resolvedView,
    setActiveView,
    canToggle: staffRole === "both",
    isLoading,
  };
}
