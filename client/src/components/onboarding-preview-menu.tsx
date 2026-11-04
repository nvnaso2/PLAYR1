import { useLocation } from "wouter";
import { ChevronDown, X } from "lucide-react";

type PreviewPage = "login" | "register" | "profile" | "hub";

const previewPages: Array<{ value: PreviewPage; label: string }> = [
  { value: "login", label: "Sign in" },
  { value: "register", label: "Create account" },
  { value: "profile", label: "Complete profile" },
  { value: "hub", label: "Day 1 Hub" },
];

export function OnboardingPreviewMenu({ page }: { page: PreviewPage }) {
  const [, navigate] = useLocation();

  function changePage(value: PreviewPage) {
    navigate(`/admin/onboarding-preview?page=${value}`);
  }

  return (
    <div className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[70] flex items-center gap-1.5" data-testid="onboarding-preview-page-menu">
      <label className="sr-only" htmlFor="onboarding-preview-page">Preview page</label>
      <div className="relative">
        <select
          id="onboarding-preview-page"
          value={page}
          onChange={(event) => changePage(event.target.value as PreviewPage)}
          className="h-9 max-w-[155px] appearance-none rounded-full border border-white/15 bg-black/85 py-1 pl-3 pr-8 text-[11px] font-semibold text-zinc-200 shadow-lg outline-none backdrop-blur focus:border-orange-400"
          data-testid="select-onboarding-preview-page"
        >
          {previewPages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      </div>
      <button
        type="button"
        onClick={() => navigate("/admin")}
        aria-label="Exit onboarding preview"
        title="Exit onboarding preview"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/85 text-zinc-400 shadow-lg backdrop-blur transition hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        data-testid="button-exit-onboarding-preview"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
