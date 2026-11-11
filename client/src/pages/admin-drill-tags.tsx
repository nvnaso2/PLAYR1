import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2, Tags } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DrillLibraryCard } from "@/components/drill-library-card";
import type { Drill } from "@shared/schema";
import { WORKOUT_FORMAT_OPTIONS, WORKOUT_SKILL_OPTIONS } from "@shared/workout-builder-taxonomy";

type QueueView = "needs-review" | "reviewed";
const queueKey = ["/api/admin/drill-tag-review"];

export default function AdminDrillTagsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<QueueView>("needs-review");
  const [selectedId, setSelectedId] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [workoutTags, setWorkoutTags] = useState<string[]>([]);
  const { data: drills = [], isLoading, isError } = useQuery<Drill[]>({ queryKey: queueKey });

  const pending = drills.filter((drill) => !drill.tagsReviewed);
  const reviewed = drills.filter((drill) => drill.tagsReviewed);
  const queue = view === "needs-review" ? pending : reviewed;
  const selectedDrill = queue.find((drill) => drill.id === selectedId) ?? queue[0];
  const currentIndex = selectedDrill ? queue.findIndex((drill) => drill.id === selectedDrill.id) : -1;

  useEffect(() => {
    if (!selectedDrill) {
      setSelectedId("");
      setSkillTags([]);
      setWorkoutTags([]);
      return;
    }
    if (selectedId !== selectedDrill.id) setSelectedId(selectedDrill.id);
    setSkillTags(selectedDrill.skillTags ?? []);
    setWorkoutTags(selectedDrill.workoutTags ?? []);
  }, [selectedDrill, selectedId]);

  const saveTags = useMutation({
    mutationFn: async ({ drill, skills, formats }: { drill: Drill; skills: string[]; formats: string[] }) => {
      const response = await apiRequest("PATCH", `/api/admin/drill-tag-review/${drill.id}`, {
        skillTags: skills,
        workoutTags: formats,
      });
      return response.json() as Promise<Drill>;
    },
    onSuccess: (updated) => {
      const nextDrills = drills.map((drill) => drill.id === updated.id ? updated : drill);
      queryClient.setQueryData(queueKey, nextDrills);
      const next = view === "needs-review"
        ? nextDrills.find((drill) => !drill.tagsReviewed && drill.id !== updated.id)
        : updated;
      setSelectedId(next?.id ?? "");
      setSkillTags(next?.skillTags ?? []);
      setWorkoutTags(next?.workoutTags ?? []);
      toast({ title: view === "needs-review" ? "Saved — next drill" : "Drill tags saved" });
    },
    onError: () => toast({ title: "Could not save drill tags", variant: "destructive" }),
  });

  const toggleTag = (values: string[], tag: string, update: (next: string[]) => void) => {
    update(values.includes(tag) ? values.filter((value) => value !== tag) : [...values, tag]);
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Admin · Training</p>
          <h1 className="mt-1 font-heading text-3xl font-black uppercase">Drill Tags</h1>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Tags className="h-4 w-4 text-orange-400" />
          {pending.length} left
        </div>
      </header>

      <div className="flex gap-2">
        <Button onClick={() => { setView("needs-review"); setSelectedId(""); }} className={`flex-1 ${view === "needs-review" ? "bg-white text-black hover:bg-zinc-200" : "border-zinc-700 text-zinc-300"}`} variant={view === "needs-review" ? "default" : "outline"}>
          To review · {pending.length}
        </Button>
        <Button onClick={() => { setView("reviewed"); setSelectedId(""); }} className={`flex-1 ${view === "reviewed" ? "bg-white text-black hover:bg-zinc-200" : "border-zinc-700 text-zinc-300"}`} variant={view === "reviewed" ? "default" : "outline"}>
          Reviewed · {reviewed.length}
        </Button>
      </div>

      {isLoading ? (
        <Card className="border-white/10 bg-zinc-950"><CardContent className="p-8 text-center text-sm text-zinc-400">Loading drills…</CardContent></Card>
      ) : isError ? (
        <Card className="border-white/10 bg-zinc-950"><CardContent className="p-8 text-center text-sm text-zinc-400">Could not load drills. Refresh and try again.</CardContent></Card>
      ) : selectedDrill ? (
        <>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>{view === "needs-review" ? "Drill to tag" : "Reviewed drill"}</span>
            <span>{currentIndex + 1} / {queue.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }} />
          </div>

          <Card className="border-white/10 bg-zinc-950">
            <CardContent className="space-y-6 p-4 sm:p-6">
              <div className="mx-auto w-full max-w-sm">
                <DrillLibraryCard drill={selectedDrill} link={false} />
              </div>

              {selectedDrill.description && (
                <details className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <summary className="cursor-pointer text-zinc-400">Show drill details</summary>
                  <p className="mt-2 leading-relaxed text-zinc-300">{selectedDrill.description}</p>
                </details>
              )}

              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Choose skills</h2>
                <div className="flex flex-wrap gap-2">
                  {WORKOUT_SKILL_OPTIONS.map((option) => {
                    const active = skillTags.includes(option.value);
                    return (
                      <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleTag(skillTags, option.value, setSkillTags)} className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Choose workout styles</h2>
                <div className="flex flex-wrap gap-2">
                  {WORKOUT_FORMAT_OPTIONS.map((option) => {
                    const active = workoutTags.includes(option.value);
                    return (
                      <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleTag(workoutTags, option.value, setWorkoutTags)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <Button onClick={() => saveTags.mutate({ drill: selectedDrill, skills: skillTags, formats: workoutTags })} disabled={saveTags.isPending} className="h-12 w-full bg-white font-black uppercase tracking-wide text-black hover:bg-zinc-200">
                {saveTags.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {view === "needs-review" ? "Submit" : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-white/10 bg-zinc-950">
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <Check className="h-8 w-8 text-emerald-400" />
            <h2 className="font-heading text-xl font-bold uppercase">{view === "needs-review" ? "All caught up" : "No reviewed drills yet"}</h2>
            <p className="max-w-sm text-sm text-zinc-400">{view === "needs-review" ? "Every drill is tagged. New admin-created drills will appear here." : "Drills you submit will be available here to edit later."}</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
