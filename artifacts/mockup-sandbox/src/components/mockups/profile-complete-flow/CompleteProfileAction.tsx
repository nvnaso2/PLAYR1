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
            <span className="mt-1 block text-[11px] text-zinc-500">Add the details that make your Hub yours.</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-950 transition group-hover:bg-orange-400">
            Complete Profile
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>
    </main>
  );
}