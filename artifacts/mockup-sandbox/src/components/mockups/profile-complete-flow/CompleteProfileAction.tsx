import { UserRound } from "lucide-react";
import "./_group.css";

export function CompleteProfileAction() {
  return (
    <main className="profile-complete-flow min-h-screen bg-[#090909] px-4 py-5 text-zinc-100">
      <div className="mx-auto max-w-[430px]">
        <button
          type="button"
          className="group flex min-h-[104px] w-full flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          data-testid="button-complete-profile"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="font-heading text-sm uppercase leading-tight tracking-wide text-zinc-100">
            Complete Your Profile
          </span>
        </button>
      </div>
    </main>
  );
}