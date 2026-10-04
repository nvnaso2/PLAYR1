import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Layers3,
  Play,
  UserRound,
  X,
} from "lucide-react";
import "./_group.css";

const introTrailer = "/__mockup/images/playr1-intro-trailer.mp4";

const trainingChoices = [
  { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell },
  { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3 },
  { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen },
  { label: "Custom workout", detail: "Request a session built for you", path: "/custom-workouts", icon: ClipboardCheck },
];

function navigate(_path: string) {
  // Mockup navigation is intentionally local and inert.
}

export function Onboarding() {
  const [trailerVisible, setTrailerVisible] = useState(true);

  return (
    <main className="player-hub-current min-h-[100dvh] bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto max-w-[430px]">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/35 bg-orange-500/15 text-orange-300">
              <span className="font-heading text-lg leading-none">P1</span>
            </span>
            <div>
              <p className="font-heading text-[17px] leading-none tracking-[0.06em] text-white">PLAYR1</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">Player hub</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Welcome back</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-200">Jordan Reyes</p>
          </div>
        </header>

        {trailerVisible && <section
          className="relative isolate min-h-[244px] overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950"
          aria-labelledby="welcome-title"
          data-testid="card-intro-trailer"
        >
          <video
            src={introTrailer}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50"
            aria-label="Welcome to the PLAYR1 intro trailer"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(5,5,5,0.97)_0%,rgba(5,5,5,0.72)_58%,rgba(5,5,5,0.18)_100%)]" />
          <div className="absolute right-0 top-0 h-44 w-44 -translate-y-1/4 translate-x-1/4 rounded-full border border-orange-500/20" />
          <div className="absolute right-6 top-6 h-28 w-28 rounded-full border border-orange-500/15" />
          <button
            type="button"
            onClick={() => setTrailerVisible(false)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/65 transition hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label="Dismiss intro trailer"
            data-testid="button-dismiss-trailer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex min-h-[244px] max-w-[315px] flex-col justify-end p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">The PLAYR1 trailer</p>
            <h1 id="welcome-title" className="mt-2 font-heading text-[32px] uppercase leading-[0.95] tracking-[0.025em] text-white">
              Start your road<br />to PLAYR1 here.
            </h1>
            <p className="mt-2 max-w-[265px] text-xs leading-relaxed text-zinc-300">
              Every player has a story. This is where you take the next step in yours.
            </p>
            <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/40 py-1.5 pl-1.5 pr-3 text-[11px] font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-zinc-950">
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
              </span>
              Watch the trailer
            </div>
          </div>
          <span className="absolute bottom-5 right-5 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-white/45 sm:block">
            Your game. Your story.
          </span>
        </section>}

        <button
          type="button"
          onClick={() => navigate("/profile/edit")}
          data-nav-target="/profile/edit"
          data-testid="button-complete-profile"
          className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-orange-500/35 bg-[linear-gradient(110deg,rgba(249,115,22,0.18),rgba(24,24,27,0.92)_72%)] p-4 text-left transition hover:border-orange-400/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-500/15 text-orange-300">
            <UserRound className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">One quick step</span>
            <span className="mt-1 block text-sm font-black text-white">Complete Your Profile</span>
            <span className="mt-0.5 block text-[11px] text-zinc-400">Add the details that make your experience yours.</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-orange-300">
            Edit Profile
            <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </button>

        <section className="mt-7 space-y-3" aria-labelledby="start-training-title" data-testid="section-start-training">
          <div className="flex items-end justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Start training</p>
              <h2 id="start-training-title" className="mt-1 font-heading text-[22px] uppercase leading-none tracking-wide text-white">
                Choose your next rep.
              </h2>
            </div>
            <Dumbbell className="mb-0.5 h-5 w-5 text-orange-400" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {trainingChoices.map(({ label, detail, path, icon: Icon }, index) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                data-nav-target={path}
                className="group flex min-h-[78px] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/75 p-3.5 text-left transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                data-testid={`button-start-choice-${index}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Icon className="h-[17px] w-[17px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-[14px] uppercase leading-tight tracking-wide text-zinc-100">{label}</span>
                  <span className="mt-1 block text-[10px] leading-snug text-zinc-500">{detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1.5 pt-1 text-[10px] text-zinc-600">
            <Check className="h-3 w-3 text-orange-500/70" />
            Start where you are. Build from there.
          </p>
        </section>
      </div>
    </main>
  );
}