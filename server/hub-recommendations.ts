import type {
  HubRecommendation,
  HubRecommendationPlan,
  HubRecommendationSource,
} from "@shared/hub-recommendations";

export type HubRecommendationCandidate = HubRecommendation & {
  priority: number;
};

export function selectHubRecommendation(
  plan: HubRecommendationPlan,
  candidates: HubRecommendationCandidate[],
): { recommendation: HubRecommendation; supporting: HubRecommendation[]; fallbackReason: string | null } {
  const available = candidates
    .filter((candidate) => plan !== "free" || candidate.source === "assessment_focus" || candidate.source === "library_fallback")
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const selected = available[0] ?? createFallbackCandidate();
  const { priority: _priority, ...recommendation } = selected;
  const supporting = available
    .slice(1, 4)
    .map(({ priority: _supportingPriority, ...candidate }) => candidate);

  return {
    recommendation,
    supporting,
    fallbackReason: selected.source === "library_fallback"
      ? "No active personalized training item was available."
      : null,
  };
}

function createFallbackCandidate(): HubRecommendationCandidate {
  const source: HubRecommendationSource = "library_fallback";
  return {
    id: "library-fallback",
    source,
    title: "Find your next drill",
    description: "Browse the PLAYR1 drill library and choose a session that fits today.",
    reason: "A simple place to keep training when no personalized item is ready.",
    durationMinutes: 15,
    actionLabel: "View",
    route: "/drills",
    provenance: {
      source,
      reasonCode: "generic_library_fallback",
    },
    priority: Number.MAX_SAFE_INTEGER,
  };
}