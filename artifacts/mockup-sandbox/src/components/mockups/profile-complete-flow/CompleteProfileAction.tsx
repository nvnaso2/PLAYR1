import { ChevronRight, UserRound } from "lucide-react";
import "./_group.css";

export function CompleteProfileAction() {
  return (
    <main className="profile-complete-flow min-h-screen bg-[#090909] px-4 py-5 text-zinc-100">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          className="group relative isolate w-full overflow-hidden rounded-2xl border border-orange-400/25 bg-gradient-to-r from-orange-500/10 via-zinc-900 to-zinc-950 p-4 text-left shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-orange-400/60 hover:shadow-[0_16px_36px_rgba(249,115,22,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          data-testid="button-complete-profile"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-5 -top-7 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl transition-colors group-hover:bg-orange-400/15"
          />
          <span className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-400/20 to-orange-600/10 text-orange-200 shadow-inner shadow-orange-200/5">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="text-base font-black text-white">Complete Your Profile</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/60 text-orange-300 transition group-hover:border-orange-400/40 group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </span>
            </span>
          </span>
        </button>
      </div>
    </main>
  );
}