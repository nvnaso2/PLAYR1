import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadMagnetResultGate } from "@/components/lead-magnets/lead-magnet-result-gate";
import { clearLeadMagnetDraft, readLeadMagnetDraft } from "@/lib/lead-magnet-drafts";
import {
  confidenceRealityQuestions,
  confidenceRealityResults,
  getConfidenceRealityNextQuestion,
  getConfidenceRealityOutcome,
  type ConfidenceRealityOutcome,
} from "@/lib/confidence-reality-check";
import type { LeadMagnetAnswers } from "@shared/lead-magnet-submissions";

type QuizStep = 1 | 2 | 3 | 4;

export function ConfidenceRealityCheckQuiz() {
  const [restored] = useState(() => {
    const draft = readLeadMagnetDraft("confidence-reality-check");
    const answers = draft?.answers ?? {};
    const q2Outcome = answers.q2 ? getConfidenceRealityOutcome("q2", answers.q2) : null;
    const q3Outcome = answers.q3 ? getConfidenceRealityOutcome("q3", answers.q3) : null;
    const outcome = q2Outcome ?? q3Outcome;
    return {
      answers,
      outcome,
      step: outcome ? 4 as QuizStep : answers.q2 === "yes" ? 3 as QuizStep : answers.q1 ? 2 as QuizStep : 1 as QuizStep,
    };
  });
  const [answers, setAnswers] = useState<LeadMagnetAnswers>(restored.answers);
  const [step, setStep] = useState<QuizStep>(restored.step);
  const [outcome, setOutcome] = useState<ConfidenceRealityOutcome | null>(restored.outcome);
  const result = outcome ? confidenceRealityResults[outcome] : null;
  const progressValue = step === 4 ? 100 : Math.round((step / 3) * 100);

  const chooseConfidenceAnswer = (answerId: string) => {
    if (getConfidenceRealityNextQuestion("q1", answerId) !== "q2") return;
    setAnswers({ q1: answerId });
    setOutcome(null);
    setStep(2);
  };

  const chooseRepsAnswer = (answerId: string) => {
    setAnswers((current) => ({ q1: current.q1 ?? "no", q2: answerId }));
    const selectedOutcome = getConfidenceRealityOutcome("q2", answerId);
    if (selectedOutcome) {
      setOutcome(selectedOutcome);
      setStep(4);
    } else if (getConfidenceRealityNextQuestion("q2", answerId) === "q3") {
      setOutcome(null);
      setStep(3);
    }
  };

  const chooseConfidenceLeak = (answerId: string) => {
    const selectedOutcome = getConfidenceRealityOutcome("q3", answerId);
    if (!selectedOutcome) return;
    setAnswers((current) => ({ ...current, q3: answerId }));
    setOutcome(selectedOutcome);
    setStep(4);
  };

  const goBack = () => {
    if (step === 4) {
      setOutcome(null);
      setStep(outcome === "unearned-confidence" ? 2 : 3);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const resetQuiz = () => {
    clearLeadMagnetDraft("confidence-reality-check");
    setAnswers({});
    setStep(1);
    setOutcome(null);
  };

  const question = step === 1
    ? confidenceRealityQuestions.q1.question
    : step === 2
      ? confidenceRealityQuestions.q2.question
      : confidenceRealityQuestions.q3.question;

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Confidence diagnostic</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Confidence Reality Check
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          Find out whether your confidence needs more reps or a stronger response under pressure.
        </p>
      </header>

      {!result ? (
        <section
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
          aria-labelledby="confidence-question"
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
            <h3 id="confidence-question" className="text-xl font-black leading-snug sm:text-2xl">
              {question}
            </h3>
            {step === 3 && (
              <div className="mt-4 rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
                  The True Confidence Bottleneck
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Your reps are in place. Identify where confidence leaks when pressure rises.
                </p>
              </div>
            )}
            <p className="mt-2 text-sm text-zinc-500">Choose the answer that feels most honest.</p>
            <div className="mt-5 space-y-2">
              {step === 1 && confidenceRealityQuestions.q1.answers.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseConfidenceAnswer(answer.id)}
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

              {step === 2 && confidenceRealityQuestions.q2.answers.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseRepsAnswer(answer.id)}
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

              {step === 3 && confidenceRealityQuestions.q3.answers.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseConfidenceLeak(answer.id)}
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
          aria-labelledby="confidence-result"
          aria-live="polite"
        >
          <div className="border-b border-zinc-800 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                <Check className="h-4 w-4" />
                Your confidence focus
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
              aria-label="Diagnostic complete"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={100}
            >
              <div className="h-full w-full rounded-full bg-orange-500" />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Your focus</p>
            <h3 id="confidence-result" className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {result.title}
            </h3>
            {"subtitle" in result && (
              <p className="mt-1 text-sm font-semibold text-orange-300">{result.subtitle}</p>
            )}
            {"diagnosis" in result && (
              <p className="mt-3 text-sm font-bold text-orange-300">{result.diagnosis}</p>
            )}

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Core lesson</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{result.coreLesson}</p>
            </div>

            <LeadMagnetResultGate
              leadMagnetId="confidence-reality-check"
              resultId={outcome!}
              answers={answers}
            >
            {"protocol" in result && (
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">4-step pre-game protocol</p>
                <ol className="mt-3 space-y-2">
                  {result.protocol.map((stepItem, index) => (
                    <li key={stepItem.title} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-black text-orange-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-zinc-200">{stepItem.title}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{stepItem.description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {"masterCue" in result && (
              <div className="mt-6 rounded-xl border border-orange-500/25 bg-orange-500/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Master cue</p>
                <p className="mt-2 text-base font-bold leading-relaxed text-white">“{result.masterCue}”</p>
              </div>
            )}

            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">
                {outcome === "unearned-confidence" ? "Workouts to build your proof" : "Actionable drills"}
              </p>
              <ul className="mt-3 space-y-2">
                {result.drills.map((drill, index) => (
                  <li key={drill.title} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-black text-zinc-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-zinc-200">{drill.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{drill.description}</span>
                    </span>
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