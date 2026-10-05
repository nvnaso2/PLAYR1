import { ArrowUp, BookOpen, ChevronRight, Dumbbell, Layers3, MessageCircle, Play, UserRound } from "lucide-react";
import "./_group.css";

const coachPrompt = "What is one adjustment that could help me most in my next game?";

function navigate(_path: string) {
  // Preview actions are intentionally inert.
}

export function RequestedOnboarding() {
  const trainingChoices = [
    { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell },
    { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3 },
    { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen },
  ];

  return (
    <main className="player-hub-current min-h-[100dvh] bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto max-w-[430px]">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/35 bg-orange-500/15 text-orange-300"><span className="font-heading text-lg leading-none">P1</span></span>
            <div><p className="font-heading text-[17px] leading-none tracking-[0.06em] text-white">PLAYR1</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Player hub</p></div>
          </div>
          <div className="text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Welcome back</p><p className="mt-0.5 text-sm font-semibold text-zinc-200">Jordan Reyes</p></div>
        </header>

        <section className="relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950 p-5" aria-labelledby="welcome-title">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(249,115,22,0.24),transparent_38%),linear-gradient(110deg,#09090b,#18181b)]" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">The PLAYR1 trailer</p>
            <h1 id="welcome-title" className="mt-2 font-heading text-[30px] uppercase leading-[0.95] tracking-wide text-white">Start your road<br />to PLAYR1 here.</h1>
            <p className="mt-2 max-w-[265px] text-xs leading-relaxed text-zinc-300">Every player has a story. This is where you take the next step in yours.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 py-1.5 pl-1.5 pr-3 text-[11px] font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-zinc-950"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span>
              Watch the trailer
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate("/profile/edit")}
          className="group mt-3 flex min-h-[88px] w-full items-center gap-3 rounded-xl border border-white/50 bg-black p-3.5 text-left text-zinc-100 transition hover:border-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          data-testid="button-complete-profile"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400"><UserRound className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-sm uppercase leading-tight tracking-wide">Complete Your Profile</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-950 shadow-[0_0_16px_rgba(249,115,22,0.28)] transition group-hover:brightness-110 group-active:brightness-95">
            Complete Profile
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>

        <section className="mt-7 space-y-3" aria-labelledby="start-training-title" data-testid="section-start-training">
          <div className="flex items-end justify-between border-b border-zinc-800 pb-3">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Start training</p><h2 id="start-training-title" className="mt-1 font-heading text-[22px] uppercase leading-none tracking-wide text-white">Choose your next rep.</h2></div>
            <Dumbbell className="mb-0.5 h-5 w-5 text-orange-400" />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {trainingChoices.map(({ label, detail, path, icon: Icon }) => (
              <button key={path} type="button" onClick={() => navigate(path)} className="group flex min-h-[104px] flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400"><Icon className="h-4 w-4" /></span>
                <span><span className="block font-heading text-sm uppercase leading-tight tracking-wide">{label}</span><span className="mt-0.5 block text-[11px] text-zinc-500">{detail}</span></span>
              </button>
            ))}
            <button type="button" onClick={() => navigate(`/coach-p?prompt=${encodeURIComponent(coachPrompt)}`)} aria-label={`Open Coach P with prompt: ${coachPrompt}`} className="group flex min-h-[104px] w-full flex-row items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800" data-testid="button-start-coach-p-prompt">
              <span className="flex w-[58px] shrink-0 flex-col items-start gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400"><MessageCircle className="h-4 w-4" /></span>
                <span className="whitespace-nowrap font-heading text-sm uppercase leading-tight tracking-wide text-white">Coach P</span>
              </span>
              <span className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-full border border-orange-400/20 bg-zinc-950/95 py-1.5 pl-3 pr-1.5 shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_30px_rgba(249,115,22,0.08)]" aria-hidden="true">
                <span className="block min-w-0 flex-1 whitespace-normal break-words text-[10px] leading-tight text-zinc-400">{coachPrompt}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.22)]"><ArrowUp className="h-4 w-4" /></span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}