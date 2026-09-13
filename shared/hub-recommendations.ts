export const HUB_RECOMMENDATION_SOURCES = [
  "active_program",
  "human_assignment",
  "coach_p_workout",
  "assessment_focus",
  "personalized_drill",
  "library_fallback",
] as const;

export type HubRecommendationSource = typeof HUB_RECOMMENDATION_SOURCES[number];
export type HubRecommendationAction = "Start" | "Continue" | "View";
export type HubRecommendationPlan = "free" | "pro" | "pro-infinity";

export type HubRecommendationProvenance = {
  source: HubRecommendationSource;
  reasonCode: string;
  enrollmentId?: string;
  programId?: string;
  programItemId?: string;
  assignmentId?: string;
  workoutId?: string;
  drillId?: string;
};

export type HubRecommendation = {
  id: string;
  source: HubRecommendationSource;
  title: string;
  description: string;
  reason: string;
  durationMinutes: number | null;
  actionLabel: HubRecommendationAction;
  route: string;
  provenance: HubRecommendationProvenance;
};

export type HubRecommendationResponse = {
  recommendation: HubRecommendation;
  supporting: HubRecommendation[];
  plan: HubRecommendationPlan;
  fallbackReason: string | null;
  generatedAt: string;
};