import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMicroQuiz } from "@shared/micro-quizzes";

type Phase = "quiz" | "calculating" | "gate" | "saving" | "error";
const STORAGE_PREFIX = "playr1_guest_micro_quiz:";

export default function MicroQuizPage() {
  const { quizId: routeQuizId } = useParams<{ quizId?: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const quiz = useMemo(() => getMicroQuiz(routeQuizId || new URLSearchParams(window.location.search).get("quiz_id")), [routeQuizId]);
  const storageKey = `${STORAGE_PREFIX}${quiz.id}`;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => Object.keys(answers).length === quiz.questions.length ? "gate" : "quiz");
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  useEffect(() => {
    if (!user || phase !== "gate") return;
    let cancelled = false;
    setPhase("saving");
    apiRequest("POST", "/api/onboarding/micro-quiz/complete", { quizId: quiz.id, responses: answers })
      .then(async () => {
        if (cancelled) return;
        localStorage.removeItem(storageKey);
        await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/onboarding/fix-drills"] });
        navigate("/hub?onboarding=complete");
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message.replace(/^\d+:\s*/, ""));
          setPhase("error");
        }
      });
    return () => { cancelled = true; };
  }, [answers, navigate, phase, queryClient, quiz.id, storageKey, user]);

  useEffect(() => {
    if (phase !== "calculating") return;
    const timer = window.setTimeout(() => setPhase("gate"), 900);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const currentQuestion = quiz.questions[questionIndex];
  const progress = ((questionIndex + (answers[currentQuestion?.id] ? 1 : 0)) / quiz.questions.length) * 100;

  function choose(value: string) {
    if (!currentQuestion) return;
    const next = { ...answers, [currentQuestion.id]: value };
    setAnswers(next);
    if (questionIndex < quiz.questions.length - 1) {
      window.setTimeout(() => setQuestionIndex((index) => index + 1), 160);
    } else {
      setPhase("calculating");
    }
  }

  function restart() {
    localStorage.removeItem(storageKey);
    setAnswers({});
    setQuestionIndex(0);
    setError("");
    setPhase("quiz");
  }

  if (phase === "calculating") {
    return <FullScreenState icon={<Loader2 className="h-8 w-8 animate-spin text-orange-400" />} title="Analyzing your shot mechanics…" detail="Finding the one adjustment that will move your game forward." />;
  }

  if (phase === "saving") {
    return <FullScreenState icon={<Loader2 className="h-8 w-8 animate-spin text-orange-400" />} title="Building your PLAYR1 Hub…" detail="Your custom fix is almost ready." />;
  }

  if (phase === "gate" || phase === "error") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md border-orange-500/20 bg-zinc-900/80">
          <CardContent className="p-7 text-center space-y-5">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-orange-500/15 flex items-center justify-center">
              <LockKeyhole className="h-7 w-7 text-orange-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-orange-400 font-bold">Your read is ready</p>
              <h1 className="text-2xl font-black mt-2">Unlock your diagnostic &amp; free fix drill</h1>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                Create your free PLAYR1 account and we’ll send your {quiz.topic} fix straight to your Hub.
              </p>
            </div>
            {phase === "error" && <p className="text-sm text-red-400">{error || "Something went wrong. Try again."}</p>}
            {user ? (
              <Button onClick={() => setPhase("gate")} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold">
                Try again
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(`/quiz/${quiz.id}`)}`)}
                className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold"
                data-testid="button-unlock-diagnostic"
              >
                Create account or sign in <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            <p className="text-[11px] text-zinc-500">Your answers stay on this device until you sign in.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-6 sm:py-10">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate("/")} className="text-zinc-500 hover:text-white flex items-center gap-1 text-sm mb-8">
          <ArrowLeft className="h-4 w-4" /> Exit
        </button>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-400 font-bold flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> PLAYR1 quick read
            </p>
            <h1 className="text-3xl sm:text-4xl font-black mt-2">{quiz.title}</h1>
          </div>
          <span className="text-sm text-zinc-500">{questionIndex + 1}/{quiz.questions.length}</span>
        </div>
        <p className="text-zinc-400 mb-6">{quiz.subtitle}</p>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-10">
          <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${Math.max(progress, 8)}%` }} />
        </div>

        <div key={currentQuestion.id} className="animate-in fade-in slide-in-from-right-3 duration-200">
          <h2 className="text-xl sm:text-2xl font-bold mb-5">{currentQuestion.prompt}</h2>
          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const selected = answers[currentQuestion.id] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => choose(option.value)}
                  className={`flex items-center gap-4 text-left rounded-2xl border p-4 transition-all active:scale-[0.99] ${selected ? "border-orange-400 bg-orange-500/15" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"}`}
                  data-testid={`quiz-option-${currentQuestion.id}-${option.value}`}
                >
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl font-bold ${selected ? "bg-orange-500 text-black" : "bg-zinc-800 text-orange-400"}`}>{option.icon}</span>
                  <span className="font-semibold flex-1">{option.label}</span>
                  {selected && <Check className="h-5 w-5 text-orange-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function FullScreenState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-5">
      <div className="text-center max-w-sm space-y-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-500/15 flex items-center justify-center">{icon}</div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="text-sm text-zinc-400">{detail}</p>
      </div>
    </main>
  );
}