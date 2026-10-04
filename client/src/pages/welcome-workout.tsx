import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";

type WelcomeWorkoutResult = {
  status: "ready";
  snapshot: {
    firstName: string;
    currentSituation: string;
    primaryGoal: string;
    trainingDaysPerUnit: number | null;
    trainingPeriodUnit: string;
    teamName: string;
    teamRole: string;
    positions: string[];
    skillRankings: Record<string, string> | null;
  };
  recap: string;
  conversationId: string;
  workout: {
    id: string;
    name: string;
    purpose: string;
    selectionRationale: string;
    successMeasure: string;
    estimatedDuration: number;
    drills: Array<{
      drillId: string;
      title: string;
      durationMinutes: number;
      sets: number | null;
      reps: number | null;
      coachingNotes: string;
    }>;
  };
};

type WelcomeWorkoutResponse = WelcomeWorkoutResult | { status: "generating"; retryAfterMs?: number };

export default function WelcomeWorkoutPage() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<WelcomeWorkoutResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const loadWorkout = useCallback(async () => {
    if (stoppedRef.current) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("POST", "/api/player-setup/welcome-workout", {});
      if (stoppedRef.current) return;
      const data = await response.json() as WelcomeWorkoutResponse & { message?: string };
      if (stoppedRef.current) return;
      if (data.status === "generating") {
        timerRef.current = window.setTimeout(() => void loadWorkout(), Math.max(500, data.retryAfterMs ?? 1500));
        return;
      }
      if (!response.ok) throw new Error(data.message || "Coach P couldn't build your workout.");
      setResult(data);
      setLoading(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/workouts"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/coach-p/conversations"] }),
      ]);
    } catch (cause) {
      if (!stoppedRef.current) {
        setError(cause instanceof Error ? cause.message : "Coach P couldn't build your workout.");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    void loadWorkout();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [loadWorkout]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full border-orange-500/20 bg-zinc-950/80 text-center">
          <CardContent className="flex flex-col items-center px-6 py-12">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-300">
              <LoaderCircle className="h-7 w-7 animate-spin" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-orange-300">Coach P is working</p>
            <h1 className="mt-2 text-2xl font-black text-white">Building your first workout</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
              Coach P is matching your setup to real drills from the PLAYR1 library.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full border-zinc-800 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-white">Your workout is not ready yet</CardTitle>
            <CardDescription className="text-zinc-400">{error || "Coach P could not load your saved workout."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void loadWorkout()} className="bg-orange-500 font-bold text-black hover:bg-orange-400">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => setLocation("/hub")}>Go to Hub</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const improveMost = result.snapshot.skillRankings?.improveMost;
  const snapshotItems = [
    result.snapshot.currentSituation,
    result.snapshot.primaryGoal,
    improveMost ? `Focus: ${improveMost}` : null,
    result.snapshot.teamRole,
    result.snapshot.positions.length ? result.snapshot.positions.join(" / ") : null,
    result.snapshot.trainingDaysPerUnit !== null
      ? `${result.snapshot.trainingDaysPerUnit} days per ${result.snapshot.trainingPeriodUnit || "week"}`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-28 sm:py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">Your PLAYR1 starting point</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          {result.snapshot.firstName ? `${result.snapshot.firstName}, your first workout is ready.` : "Your first workout is ready."}
        </h1>
      </div>

      <Card className="overflow-hidden border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-zinc-950 to-zinc-950">
        <CardHeader>
          <div className="flex items-center gap-2 text-orange-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">A note from Coach P</span>
          </div>
          <CardDescription className="whitespace-pre-wrap pt-2 text-sm leading-6 text-zinc-200">
            {result.recap}
          </CardDescription>
        </CardHeader>
        {snapshotItems.length > 0 && (
          <CardContent className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              <UserRound className="h-4 w-4" />
              Built from your setup
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshotItems.map((item) => (
                <span key={item} className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300">
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black text-white">{result.workout.name}</CardTitle>
              <CardDescription className="mt-1 text-zinc-400">{result.workout.purpose}</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300">
              <Clock3 className="h-3.5 w-3.5 text-orange-300" />
              About {result.workout.estimatedDuration} min
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-6 text-zinc-400">{result.workout.selectionRationale}</p>
          <ol className="space-y-3">
            {result.workout.drills.map((drill, index) => (
              <li key={`${drill.drillId}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-black text-orange-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-bold text-white">{drill.title}</h2>
                      {drill.coachingNotes && <p className="mt-1 text-sm leading-5 text-zinc-400">{drill.coachingNotes}</p>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-zinc-500">{drill.durationMinutes} min</span>
                </div>
                {(drill.sets || drill.reps) && (
                  <p className="ml-10 mt-2 text-xs text-zinc-500">
                    {[drill.sets && `${drill.sets} sets`, drill.reps && `${drill.reps} reps`].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span><strong>Success check:</strong> {result.workout.successMeasure}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          onClick={() => setLocation(`/log?workoutId=${encodeURIComponent(result.workout.id)}`)}
          className="h-auto min-h-12 bg-orange-500 py-3 font-black text-black hover:bg-orange-400"
          data-testid="button-start-welcome-workout"
        >
          Start this workout
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation("/hub")}
          className="h-auto min-h-12 border-zinc-700 py-3 font-bold text-zinc-100"
          data-testid="button-visit-hub"
        >
          Visit your Hub
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation(`/coach-p?conversationId=${encodeURIComponent(result.conversationId)}`)}
          className="h-auto min-h-12 border-zinc-700 py-3 font-bold text-zinc-100"
          data-testid="button-continue-coach-p"
        >
          <MessageCircle className="mr-2 h-4 w-4 text-orange-300" />
          Continue with Coach P
        </Button>
      </div>
    </main>
  );
}