import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Brain, Check, Crosshair, RotateCcw, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ConfidenceRealityCheckQuiz } from "@/components/lead-magnets/confidence-reality-check-quiz";
import { FootworkOpenShotsQuiz } from "@/components/lead-magnets/footwork-open-shots-quiz";
import { GameSpeedShootingQuiz } from "@/components/lead-magnets/game-speed-shooting-quiz";
import { LeadMagnetResultGate } from "@/components/lead-magnets/lead-magnet-result-gate";
import { clearLeadMagnetDraft, readLeadMagnetDraft } from "@/lib/lead-magnet-drafts";
import { track } from "@/lib/track";
import { LEAD_MAGNET_IDS, type LeadMagnetAnswers, type LeadMagnetId } from "@shared/lead-magnet-submissions";
import {
  getShootingMechanicsOutcome,
  shootingMechanicsBranches,
  shootingMechanicsResults,
  type ShootingMechanicsBranch,
  type ShootingMechanicsOutcome,
} from "@/lib/shooting-mechanics-diagnostic";

const questionOneAnswers: Array<{
  branch: ShootingMechanicsBranch;
  text: string;
}> = [
  {
    branch: "spray",
    text: "I feel like I’m spraying the ball all over the place, with most of my misses left and right.",
  },
  {
    branch: "short",
    text: "Shooting feels like a chore, and most of my misses are short.",
  },
  {
    branch: "clunky",
    text: "My shot feels robotic or clunky, with friction keeping it from feeling natural and smooth.",
  },
];

const stepProgress = {
  question: "w-1/2",
  result: "w-full",
};

const leadMagnetCards = [
  {
    id: "shooting-mechanics",
    title: "Shooting Mechanics",
    category: "Shooting",
    description: "Find a clear adjustment for your shot and the drills to practice it.",
    icon: Target,
  },
  {
    id: "footwork-open-shots",
    title: "Footwork That Leads to Open Shots",
    category: "Footwork",
    description: "Build the footwork habits that help you create cleaner looks.",
    icon: Crosshair,
  },
  {
    id: "confidence-reality-check",
    title: "Confidence Reality Check",
    category: "Confidence",
    description: "Turn what you feel on court into a useful focus for your next reps.",
    icon: Brain,
  },
  {
    id: "game-speed-shooting",
    title: "Game-Speed Shooting",
    category: "Game performance",
    description: "See what changes when your shot moves from practice into live play.",
    icon: Zap,
  },
] as const;

export default function LeadMagnetsPage() {
  const pathParts = window.location.pathname.split("/");
  const routeMagnetId = pathParts[1] === "lead-magnets" ? pathParts[2] : undefined;
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const validRouteMagnet = LEAD_MAGNET_IDS.includes(routeMagnetId as LeadMagnetId)
    ? routeMagnetId as LeadMagnetId
    : null;
  const initialShootingDraft = readLeadMagnetDraft("shooting-mechanics");
  const initialBranch = initialShootingDraft?.answers.q1 as ShootingMechanicsBranch | undefined;
  const initialSecondAnswer = initialBranch
    ? initialShootingDraft?.answers[`q2-${initialBranch}`]
    : undefined;
  const [branch, setBranch] = useState<ShootingMechanicsBranch | null>(initialBranch ?? null);
  const [secondAnswerId, setSecondAnswerId] = useState<string | null>(initialSecondAnswer ?? null);
  const [outcome, setOutcome] = useState<ShootingMechanicsOutcome | null>(
    initialBranch && initialSecondAnswer
      ? getShootingMechanicsOutcome(initialBranch, initialSecondAnswer)
      : null,
  );
  const [activeLeadMagnet, setActiveLeadMagnet] = useState<LeadMagnetId>(validRouteMagnet ?? "shooting-mechanics");

  useEffect(() => {
    if (isAuthenticated) track("lead_magnets_browse_view");
  }, [isAuthenticated]);

  useEffect(() => {
    if (validRouteMagnet) setActiveLeadMagnet(validRouteMagnet);
  }, [validRouteMagnet]);

  const resetQuiz = () => {
    clearLeadMagnetDraft("shooting-mechanics");
    setBranch(null);
    setSecondAnswerId(null);
    setOutcome(null);
  };

  const chooseFirstAnswer = (selectedBranch: ShootingMechanicsBranch) => {
    setBranch(selectedBranch);
    setSecondAnswerId(null);
    setOutcome(null);
  };

  const chooseSecondAnswer = (answerId: string) => {
    if (!branch) return;
    const selectedOutcome = getShootingMechanicsOutcome(branch, answerId);
    if (!selectedOutcome) return;
    setSecondAnswerId(answerId);
    setOutcome(selectedOutcome);
  };

  const selectLeadMagnet = (selected: LeadMagnetId) => {
    setActiveLeadMagnet(selected);
    if (isAuthenticated) track("lead_magnet_selected", { lead_magnet: selected });
    navigate(`/lead-magnets/${selected}`);
  };

  const result = outcome ? shootingMechanicsResults[outcome] : null;
  const secondQuestion = branch ? shootingMechanicsBranches[branch] : null;

  if (routeMagnetId && !validRouteMagnet) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-black">Game insight not found</h1>
          <p className="mt-2 text-sm text-zinc-400">Choose one of the available PLAYR1 tools.</p>
          <Link href="/lead-magnets">
            <Button className="mt-5 bg-orange-500 font-bold text-black hover:bg-orange-400">Browse Game Insights</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!routeMagnetId) {
    return (
      <main className="min-h-full bg-zinc-950 px-4 pb-10 pt-5 text-white sm:px-6 sm:pt-7">
        <div className="mx-auto max-w-5xl">
          <Link href="/profile-hub">
            <Button
              type="button"
              variant="ghost"
              className="h-9 gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              data-testid="button-back-to-profile"
            >
              <ArrowLeft className="h-4 w-4" />
              Profile
            </Button>
          </Link>

          <header className="mb-6 mt-5 max-w-2xl sm:mb-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">PLAYR1 · Player tools</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl" data-testid="text-game-insights-title">
              Game Insights
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Take a short quiz and get customized drills tailored to help improve your game.
            </p>
          </header>

          <section aria-label="Game insight tools">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {leadMagnetCards.map((magnet) => {
                const Icon = magnet.icon;
                return (
                  <button
                    key={magnet.id}
                    type="button"
                    onClick={() => selectLeadMagnet(magnet.id)}
                    className="group flex min-h-44 flex-col rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:p-5"
                    data-testid={`card-lead-magnet-${magnet.id}`}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-300 transition group-hover:border-orange-300/40 group-hover:bg-orange-500/15">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-500">
                        {magnet.category}
                      </span>
                    </div>
                    <h2 className="mt-4 text-base font-bold leading-snug text-white sm:text-lg">
                      {magnet.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {magnet.description}
                    </p>
                    <span className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-semibold text-orange-300">
                      Explore
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-zinc-950 px-4 pb-10 pt-6 text-white sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5">
          <Link href="/lead-magnets">
            <Button
              type="button"
              variant="ghost"
              className="h-9 gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              data-testid="button-back-to-game-insights"
            >
              <ArrowLeft className="h-4 w-4" />
              All Game Insights
            </Button>
          </Link>
        </header>

        <div className="mx-auto max-w-2xl">
          <div className="min-w-0 max-w-2xl">
            <div id="shooting-mechanics" hidden={activeLeadMagnet !== "shooting-mechanics"}>
              <header className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Shooting mechanics</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Find your shooting cue.</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                  Answer two quick questions to find one clear mechanics cue and the drills to work on next.
                </p>
              </header>
            {!result ? (
          <section
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
            aria-labelledby="shooting-question"
            aria-live="polite"
          >
            <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300">
                  Question {branch ? "2" : "1"} of 2
                </p>
                {branch && (
                  <button
                    type="button"
                    onClick={() => {
                      setBranch(null);
                      setSecondAnswerId(null);
                      setOutcome(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 transition hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                )}
              </div>
              <div
                className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-label={branch ? "Question 2 of 2" : "Question 1 of 2"}
                aria-valuemin={1}
                aria-valuemax={2}
                aria-valuenow={branch ? 2 : 1}
              >
                <div className={`h-full rounded-full bg-orange-500 transition-all ${stepProgress.question}`} />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {!branch ? (
                <>
                  <h2 id="shooting-question" className="text-xl font-black leading-snug sm:text-2xl">
                    When your shot feels off or inconsistent, what do you notice most?
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">Choose the one that sounds most like you.</p>
                  <div className="mt-5 space-y-2">
                    {questionOneAnswers.map((answer, index) => (
                      <button
                        key={answer.branch}
                        type="button"
                        onClick={() => chooseFirstAnswer(answer.branch)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-orange-500/50 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-black text-orange-400">
                          0{index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-zinc-200">{answer.text}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                      </button>
                    ))}
                  </div>
                </>
              ) : secondQuestion ? (
                <>
                  <h2 id="shooting-question" className="text-xl font-black leading-snug sm:text-2xl">
                    {secondQuestion.question}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">Pick the feeling that fits best.</p>
                  <div className="mt-5 space-y-2">
                    {secondQuestion.answers.map((answer, index) => (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() => chooseSecondAnswer(answer.id)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-orange-500/50 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-black text-orange-400">
                          0{index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-zinc-200">{answer.text}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : (
          <section
            className="overflow-hidden rounded-2xl border border-orange-500/30 bg-zinc-900/70"
            aria-labelledby="shooting-result"
            aria-live="polite"
          >
            <div className="border-b border-zinc-800 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                  <Check className="h-4 w-4" />
                  Your focus
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Result</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Check-in complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
                <div className={`h-full rounded-full bg-orange-500 ${stepProgress.result}`} />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Your shooting cue</p>
              <h2 id="shooting-result" className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                {result.cue}
              </h2>

              <LeadMagnetResultGate
                leadMagnetId="shooting-mechanics"
                resultId={outcome!}
                answers={{ q1: branch!, [`q2-${branch}`]: secondAnswerId! }}
              >
              <div className="mt-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Drills to try</p>
                <ul className="mt-3 space-y-2">
                  {result.drills.map((drill, index) => (
                    <li key={drill} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-black text-zinc-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold leading-relaxed text-zinc-200">{drill}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 border-t border-zinc-800 pt-5">
                <Link href="/drills">
                  <Button className="w-full bg-orange-500 font-black text-black hover:bg-orange-400 sm:w-auto">
                    Explore the Drill Library <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              </LeadMagnetResultGate>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetQuiz}
                  className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake the quiz
                </Button>
              </div>
            </div>
          </section>
            )}
            </div>
            <div id="footwork-open-shots" hidden={activeLeadMagnet !== "footwork-open-shots"}>
              <FootworkOpenShotsQuiz />
            </div>
            <div id="confidence-reality-check" hidden={activeLeadMagnet !== "confidence-reality-check"}>
              <ConfidenceRealityCheckQuiz />
            </div>
            <div id="game-speed-shooting" hidden={activeLeadMagnet !== "game-speed-shooting"}>
              <GameSpeedShootingQuiz />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}