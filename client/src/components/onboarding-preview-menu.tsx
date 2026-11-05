import { useLocation } from "wouter";
import { ChevronDown, MessageSquarePlus, X } from "lucide-react";

type PreviewPage = "login" | "register" | "profile" | "welcome" | "hub" | "player-profile" | "day2";

const previewPages: Array<{ value: PreviewPage; label: string }> = [
  { value: "login", label: "Sign in" },
  { value: "register", label: "Create account" },
  { value: "profile", label: "Complete profile" },
  { value: "welcome", label: "Welcome video" },
  { value: "hub", label: "Day 1 Hub" },
  { value: "player-profile", label: "Day 2 profile questions" },
  { value: "day2", label: "Day 2 Hub" },
];

export function OnboardingPreviewMenu({ page, inline = false, showFeedback = false }: { page: PreviewPage; inline?: boolean; showFeedback?: boolean }) {
  const [, navigate] = useLocation();

  function changePage(value: PreviewPage) {
    navigate(`/admin/onboarding-preview?page=${value}`);
  }

  return (
    <div className={inline ? "mb-3 flex items-center justify-end gap-1.5" : "fixed right-3 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[70] flex items-center gap-1.5"} data-testid="onboarding-preview-page-menu">
      <label className="sr-only" htmlFor="onboarding-preview-page">Preview page</label>
      <div className="relative">
        <select
          id="onboarding-preview-page"
          value={page}
          onChange={(event) => changePage(event.target.value as PreviewPage)}
          className="h-8 max-w-[120px] appearance-none rounded-full border border-white/15 bg-black/85 py-1 pl-3 pr-7 text-[10px] font-semibold text-zinc-200 shadow-lg outline-none backdrop-blur focus:border-orange-400"
          data-testid="select-onboarding-preview-page"
        >
          {previewPages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
      </div>
      <button
        type="button"
        onClick={() => navigate("/admin")}
        aria-label="Exit onboarding preview"
        title="Exit onboarding preview"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/85 text-zinc-400 shadow-lg backdrop-blur transition hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        data-testid="button-exit-onboarding-preview"
      >
        <X className="h-4 w-4" />
      </button>
      {showFeedback && (
        <button
          type="button"
          onClick={() => navigate("/feedback")}
          aria-label="Send feedback"
          title="Send feedback"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/85 text-zinc-400 shadow-lg backdrop-blur transition hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          data-testid="button-header-feedback-preview"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
