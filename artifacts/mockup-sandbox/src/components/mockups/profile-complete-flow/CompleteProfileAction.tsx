import { ChevronRight, UserRound } from "lucide-react";
import "./_group.css";

export function CompleteProfileAction() {
  return (
    <main className="profile-complete-flow min-h-screen bg-[#090909] px-4 py-5 text-zinc-100">
      <div className="mx-auto max-w-[430px]">
        <button
          type="button"
          className="group flex min-h-[88px] w-full items-center gap-3 rounded-xl border border-zinc-800 bg-black p-3.5 text-left text-zinc-100 transition hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          data-testid="button-complete-profile"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-sm uppercase leading-tight tracking-wide text-zinc-100">Complete Your Profile</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-950 shadow-[0_0_16px_rgba(249,115,22,0.28)] transition group-hover:brightness-110 group-active:brightness-95">
            Complete Profile
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>
    </main>
  );
}