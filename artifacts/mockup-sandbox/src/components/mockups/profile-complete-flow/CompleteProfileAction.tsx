import { ChevronRight, UserRound } from "lucide-react";
import "./_group.css";

export function CompleteProfileAction() {
  return (
    <main className="profile-complete-flow min-h-screen bg-[#090909] px-4 py-5 text-zinc-100">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          className="w-full rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-950 p-4 text-left transition hover:border-orange-400/60"
          data-testid="button-complete-profile"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="text-base font-black text-white">Complete Your Profile</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-orange-300" />
            </span>
          </span>
        </button>
      </div>
    </main>
  );
}