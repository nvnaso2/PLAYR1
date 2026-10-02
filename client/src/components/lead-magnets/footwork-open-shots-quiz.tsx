import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadMagnetResultGate } from "@/components/lead-magnets/lead-magnet-result-gate";
import { clearLeadMagnetDraft, readLeadMagnetDraft } from "@/lib/lead-magnet-drafts";
import {
  footworkCourtRoles,
  footworkFollowUpQuestions,
  footworkResults,
  footworkShotSources,
  getFootworkOutcome,
  type FootworkCourtRole,
  type FootworkOutcome,
  type FootworkShotSource,
} from "@/lib/footwork-open-shots-diagnostic";

type QuizStep = 1 | 2 | 3 | 4;

const roleQuestion = "What is your primary role on the court?";
const shotSourceQuestion = "Where do the majority of your shots come from?";

export function FootworkOpenShotsQuiz() {
  const [restored] = useState(() => {
    const draft = readLeadMagnetDraft("footwork-open-shots");
    const answers = draft?.answers;
    const role = answers?.q1 as FootworkCourtRole | undefined;
    const shotSource = answers?.q2 as FootworkShotSource | undefined;
    const followUpAnswerId = shotSource ? answers?.[`q3-${shotSource}`] : undefined;
    const outcome = shotSource && followUpAnswerId ? getFootworkOutcome(shotSource, followUpAnswerId) : null;
    return {
      role: role ?? null,
      shotSource: shotSource ?? null,
      followUpAnswerId: followUpAnswerId ?? null,
      outcome,
      step: outcome ? 4 as QuizStep : shotSource ? 3 as QuizStep : role ? 2 as QuizStep : 1 as QuizStep,
    };
  });
  const [step, setStep] = useState<QuizStep>(restored.step);
  const [role, setRole] = useState<FootworkCourtRole | null>(restored.role);
  const [shotSource, setShotSource] = useState<FootworkShotSource | null>(restored.shotSource);
  const [followUpAnswerId, setFollowUpAnswerId] = useState<string | null>(restored.followUpAnswerId);
  const [outcome, setOutcome] = useState<FootworkOutcome | null>(restored.outcome);

  const result = outcome ? footworkResults[outcome] : null;
  const followUp = shotSource ? footworkFollowUpQuestions[shotSource] : null;
  const progressValue = step === 4 ? 100 : Math.round((step / 3) * 100);

  const chooseRole = (selectedRole: FootworkCourtRole) => {
    setRole(selectedRole);
    setShotSource(null);
    setFollowUpAnswerId(null);
    setOutcome(null);
    setStep(2);
  };

  const chooseShotSource = (selectedSource: FootworkShotSource) => {
    setShotSource(selectedSource);
    setFollowUpAnswerId(null);
    setOutcome(null);
    setStep(3);
  };

  const chooseFollowUp = (answerId: string) => {
    if (!shotSource || !role) return;
    const selectedOutcome = getFootworkOutcome(shotSource, answerId);
    if (!selectedOutcome) return;
    setOutcome(selectedOutcome);
    setFollowUpAnswerId(answerId);
    setStep(4);
  };

  const goBack = () => {
    if (step === 4) {
      setOutcome(null);
      setStep(3);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const resetQuiz = () => {
    clearLeadMagnetDraft("footwork-open-shots");
    setStep(1);
    setRole(null);
    setShotSource(null);
    setFollowUpAnswerId(null);
    setOutcome(null);
  };

  const question = step === 1
    ? roleQuestion
    : step === 2
      ? shotSourceQuestion
      : followUp?.question;

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Footwork and open shots</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Footwork That Leads to Open Shots
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          Find the footwork drills that fit the way you create or find your shots.
        </p>
      </header>

      {!result ? (
        <section
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
          aria-labelledby="footwork-question"
          aria-live="polite"
        >
          <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300">
                Question {step} of 3
              </p>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
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
              aria-label={`Question ${step} of 3`}
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={step}
            >
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <h3 id="footwork-question" className="text-xl font-black leading-snug sm:text-2xl">
              {question}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">Choose the option that fits you best.</p>
            <div className="mt-5 space-y-2">
              {step === 1 && footworkCourtRoles.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseRole(answer.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-orange-500/50 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-black text-orange-400">
                    0{index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-zinc-200">{answer.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{answer.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                </button>
              ))}

              {step === 2 && footworkShotSources.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseShotSource(answer.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-orange-500/50 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-black text-orange-400">
                    0{index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-zinc-200">{answer.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{answer.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                </button>
              ))}

              {step === 3 && followUp?.answers.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseFollowUp(answer.id)}
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
          </div>
        </section>
      ) : (
        <section
          className="overflow-hidden rounded-2xl border border-orange-500/30 bg-zinc-900/70"
          aria-labelledby="footwork-result"
          aria-live="polite"
        >
          <div className="border-b border-zinc-800 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                <Check className="h-4 w-4" />
                Your footwork focus
              </p>
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>
            <div
              className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"
              role="progressbar"
              aria-label="Check-in complete"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={100}
            >
              <div className="h-full w-full rounded-full bg-orange-500" />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Your focus</p>
            <h3 id="footwork-result" className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {result.title}
            </h3>

            <LeadMagnetResultGate
              leadMagnetId="footwork-open-shots"
              resultId={outcome!}
              answers={{
                q1: role!,
                q2: shotSource!,
                [`q3-${shotSource!}`]: followUpAnswerId!,
              }}
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
  );
}