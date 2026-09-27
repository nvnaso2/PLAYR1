import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
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

export default function LeadMagnetsPage() {
  const [branch, setBranch] = useState<ShootingMechanicsBranch | null>(null);
  const [outcome, setOutcome] = useState<ShootingMechanicsOutcome | null>(null);

  useEffect(() => {
    track("lead_magnets_browse_view");
  }, []);

  const resetQuiz = () => {
    setBranch(null);
    setOutcome(null);
  };

  const chooseFirstAnswer = (selectedBranch: ShootingMechanicsBranch) => {
    setBranch(selectedBranch);
    setOutcome(null);
    track("shooting_mechanics_diagnostic_q1", { branch: selectedBranch });
  };

  const chooseSecondAnswer = (answerId: string) => {
    if (!branch) return;
    const selectedOutcome = getShootingMechanicsOutcome(branch, answerId);
    if (!selectedOutcome) return;
    setOutcome(selectedOutcome);
    track("shooting_mechanics_diagnostic_completed", { outcome: selectedOutcome });
  };

  const result = outcome ? shootingMechanicsResults[outcome] : null;
  const secondQuestion = branch ? shootingMechanicsBranches[branch] : null;

  return (
    <main className="min-h-full bg-zinc-950 px-4 pb-10 pt-6 text-white sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
          <Target className="h-4 w-4 text-orange-400" />
          Free shooting diagnostic
        </div>

        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">PLAYR1 Lead Magnet</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Find your shooting cue.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
            Answer two quick questions to find one clear mechanics cue and the drills to work on next.
          </p>
        </header>

        {!result ? (
          <section
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
            aria-labelledby="diagnostic-question"
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
                  <h2 id="diagnostic-question" className="text-xl font-black leading-snug sm:text-2xl">
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
                  <h2 id="diagnostic-question" className="text-xl font-black leading-snug sm:text-2xl">
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
            aria-labelledby="diagnostic-result"
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
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Diagnostic complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
                <div className={`h-full rounded-full bg-orange-500 ${stepProgress.result}`} />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Your shooting cue</p>
              <h2 id="diagnostic-result" className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                {result.cue}
              </h2>

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

              <div className="mt-6 flex flex-col gap-2 border-t border-zinc-800 pt-5 sm:flex-row">
                <Link href="/drills">
                  <Button className="w-full bg-orange-500 font-black text-black hover:bg-orange-400 sm:w-auto">
                    Explore the Drill Library <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
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
    </main>
  );
}