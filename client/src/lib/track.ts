import { useEffect } from "react";
import { useLocation } from "wouter";
import { nativeFetch } from "./queryClient";

/**
 * Fire-and-forget analytics event tracker.
 * Silent on failure — never block UI on analytics.
 */
export function track(event: string, metadata?: Record<string, any>): void {
  try {
    const page = typeof window !== "undefined" ? window.location.pathname : undefined;
    nativeFetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, page, metadata }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export function trackLeadMagnetAnswer(
  leadMagnet: string,
  questionId: string,
  answerId: string,
): void {
  track("lead_magnet_answer_selected", {
    lead_magnet: leadMagnet,
    question_id: questionId,
    answer_id: answerId,
  });
}

export function trackLeadMagnetResult(leadMagnet: string, resultId: string): void {
  track("lead_magnet_result_reached", {
    lead_magnet: leadMagnet,
    result_id: resultId,
  });
}

/**
 * Hook that auto-tracks a page_view event whenever the route changes.
 * Mount once at the App root.
 */
export function usePageViewTracking(): void {
  const [location] = useLocation();

  useEffect(() => {
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("playr1-analytics-session") ?? "";
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("playr1-analytics-session", sessionId);
      }
    } catch {
      sessionId = "browser-session";
    }

    const metadata = { sessionId };
    track("app_open", metadata);
    const heartbeat = window.setInterval(() => track("app_heartbeat", metadata), 60_000);
    return () => window.clearInterval(heartbeat);
  }, []);

  useEffect(() => {
    track("page_view", { path: location });
  }, [location]);
}
