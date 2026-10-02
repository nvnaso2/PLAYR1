import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadMagnetResultGate } from "@/components/lead-magnets/lead-magnet-result-gate";
import { clearLeadMagnetDraft, readLeadMagnetDraft } from "@/lib/lead-magnet-drafts";
import {
  gameSpeedCategoryResults,
  gameSpeedShootingQuestions,
  getGameSpeedShootingResult,
  type GameSpeedAnswers,
  type GameSpeedCategory,
  type GameSpeedQuestionId,
} from "@/lib/game-speed-shooting-diagnostic";

const QUESTION_IDS: GameSpeedQuestionId[] = ["q1", "q2", "q3"];
const CATEGORY_LABELS: Record<GameSpeedCategory, string> = {
  fatigue: "Fatigue",
  simulation: "Simulation",
  pressure: "Pressure",
};

export function GameSpeedShootingQuiz() {
  const [restored] = useState(() => {
    const draft = readLeadMagnetDraft("game-speed-shooting");
    const answers = (draft?.answers ?? {}) as GameSpeedAnswers;
    const result = getGameSpeedShootingResult(answers);
    const firstUnanswered = QUESTION_IDS.findIndex((id) => !answers[id]);
    return {
      answers,
      result,
      questionIndex: firstUnanswered < 0 ? 0 : firstUnanswered,
    };
  });
  const [questionIndex, setQuestionIndex] = useState(restored.questionIndex);
  const [answers, setAnswers] = useState<GameSpeedAnswers>(restored.answers);
  const [result, setResult] = useState<NonNullable<ReturnType<typeof getGameSpeedShootingResult>> | null>(restored.result);
  const currentQuestionId = QUESTION_IDS[questionIndex];
  const currentQuestion = gameSpeedShootingQuestions[currentQuestionId];
  const progress = result ? 100 : Math.round(((questionIndex + 1) / QUESTION_IDS.length) * 100);
  const resultSummary = result ? gameSpeedCategoryResults[result.outcome] : null;

  const chooseAnswer = (category: GameSpeedCategory) => {
    const updatedAnswers = { ...answers, [currentQuestionId]: category };
    setAnswers(updatedAnswers);

    if (currentQuestionId !== "q3") {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const completedResult = getGameSpeedShootingResult(updatedAnswers);
    if (!completedResult) return;
    setResult(completedResult);
  };

  const goBack = () => {
    if (result) {
      setResult(null);
      setQuestionIndex(2);
    } else if (questionIndex > 0) {
      setQuestionIndex((index) => index - 1);
    }
  };

  const resetQuiz = () => {
    clearLeadMagnetDraft("game-speed-shooting");
    setQuestionIndex(0);
    setAnswers({});
    setResult(null);
  };

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Game-speed shooting</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Why Your Makes in the Empty Gym Aren’t Translating to 5v5
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          Find your main conversion leak—fatigue, simulation, or pressure—and get one drill matched to each answer.
        </p>
      </header>

      {!result ? (
        <section
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
          aria-labelledby="game-speed-question"
          aria-live="polite"
        >
          <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300">
                Question {questionIndex + 1} of {QUESTION_IDS.length}
              </p>
              {questionIndex > 0 && (
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
              aria-label={`Question ${questionIndex + 1} of ${QUESTION_IDS.length}`}
              aria-valuemin={1}
              aria-valuemax={QUESTION_IDS.length}
              aria-valuenow={questionIndex + 1}
            >
              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <h3 id="game-speed-question" className="text-xl font-black leading-snug sm:text-2xl">
              {currentQuestion.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">Choose the answer that best describes your game.</p>
            <div className="mt-5 space-y-2">
              {currentQuestion.answers.map((answer, index) => (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => chooseAnswer(answer.id)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-orange-500/50 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-black text-orange-400">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-zinc-200">{answer.label}</span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : resultSummary ? (
        <section
          className="overflow-hidden rounded-2xl border border-orange-500/30 bg-zinc-900/70"
          aria-labelledby="game-speed-result"
          aria-live="polite"
        >
          <div className="border-b border-zinc-800 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                <Check className="h-4 w-4" />
                Your conversion profile
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
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Check-in complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
              <div className="h-full w-full rounded-full bg-orange-500" />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              {result.outcome === "mixed" ? "Your conversion profile" : "Primary conversion leak"}
            </p>
            <h3 id="game-speed-result" className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {resultSummary.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{resultSummary.summary}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(["fatigue", "simulation", "pressure"] as const).map((category) => (
                <span
                  key={category}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    result.counts[category] > 0
                      ? "border-orange-500/25 bg-orange-500/10 text-orange-200"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-500"
                  }`}
                >
                  {CATEGORY_LABELS[category]} · {result.counts[category]}
                </span>
              ))}
            </div>

            <LeadMagnetResultGate
              leadMagnetId="game-speed-shooting"
              resultId={result.outcome}
              answers={{ q1: answers.q1!, q2: answers.q2!, q3: answers.q3! }}
            >
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">
                  One drill matched to each answer
                </p>
                <ol className="mt-3 space-y-2">
                  {result.drills.map((drill, index) => {
                    const question = gameSpeedShootingQuestions[drill.questionId];
                    const answer = question.answers.find((option) => option.id === drill.category);
                    return (
                      <li key={drill.questionId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            Question {index + 1} · {CATEGORY_LABELS[drill.category]}
                          </p>
                          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                            Your answer
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{answer?.label}</p>
                        <h4 className="mt-3 break-words text-sm font-black text-zinc-100">{drill.title}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{drill.focus}</p>
                      </li>
                    );
                  })}
                </ol>
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
      ) : null}
    </div>
  );
}