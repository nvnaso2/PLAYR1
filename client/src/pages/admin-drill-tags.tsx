import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Loader2, Search, Tags } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Drill } from "@shared/schema";
import { WORKOUT_FORMAT_OPTIONS, WORKOUT_SKILL_OPTIONS } from "@shared/workout-builder-taxonomy";

type QueueView = "needs-review" | "reviewed";
const queueKey = ["/api/admin/drill-tag-review"];

export default function AdminDrillTagsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<QueueView>("needs-review");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [workoutTags, setWorkoutTags] = useState<string[]>([]);
  const { data: drills = [], isLoading, isError } = useQuery<Drill[]>({ queryKey: queueKey });

  const pendingCount = drills.filter((drill) => !drill.tagsReviewed).length;
  const reviewedCount = drills.length - pendingCount;
  const filteredDrills = useMemo(() => drills
    .filter((drill) => view === "needs-review" ? !drill.tagsReviewed : drill.tagsReviewed)
    .filter((drill) => `${drill.title} ${drill.category}`.toLowerCase().includes(search.trim().toLowerCase())),
  [drills, search, view]);
  const selectedDrill = filteredDrills.find((drill) => drill.id === selectedId) ?? filteredDrills[0];

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
        : nextDrills.find((drill) => drill.tagsReviewed && drill.id !== updated.id);
      setSelectedId(next?.id ?? "");
      toast({ title: "Drill tags saved" });
    },
    onError: () => toast({ title: "Could not save drill tags", variant: "destructive" }),
  });

  const toggleTag = (values: string[], tag: string, update: (next: string[]) => void) => {
    update(values.includes(tag) ? values.filter((value) => value !== tag) : [...values, tag]);
  };

  const progress = drills.length ? Math.round((reviewedCount / drills.length) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Admin · Training</p>
        <h1 className="font-heading text-3xl font-black uppercase">Drill Tag Review</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Confirm the skills and workout styles for each drill. New admin-created drills will appear here until reviewed.
        </p>
      </header>

      <Card className="border-white/10 bg-zinc-950">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Tags className="h-4 w-4 text-orange-400" />
              <span>{reviewedCount} of {drills.length} reviewed</span>
            </div>
            <span className="text-xs text-zinc-400">{pendingCount} waiting</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="border-white/10 bg-zinc-950">
          <CardHeader className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={view === "needs-review" ? "default" : "outline"} onClick={() => setView("needs-review")} className={view === "needs-review" ? "bg-white text-black hover:bg-zinc-200" : "border-zinc-700"}>
                Needs review ({pendingCount})
              </Button>
              <Button variant={view === "reviewed" ? "default" : "outline"} onClick={() => setView("reviewed")} className={view === "reviewed" ? "bg-white text-black hover:bg-zinc-200" : "border-zinc-700"}>
                Reviewed ({reviewedCount})
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a drill" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto p-2 pt-0">
            {isLoading ? <p className="p-4 text-sm text-zinc-400">Loading drills…</p>
              : filteredDrills.length === 0 ? <p className="p-4 text-sm text-zinc-400">{isError ? "Could not load the review queue." : "No drills in this list."}</p>
              : filteredDrills.map((drill) => (
                <button key={drill.id} type="button" onClick={() => setSelectedId(drill.id)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition ${selectedDrill?.id === drill.id ? "bg-white text-black" : "text-zinc-200 hover:bg-zinc-900"}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{drill.title}</span>
                    <span className={`mt-1 block text-xs capitalize ${selectedDrill?.id === drill.id ? "text-zinc-600" : "text-zinc-500"}`}>{drill.category.replace("-", " ")} · {drill.difficulty}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-950">
          {selectedDrill ? (
            <>
              <CardHeader className="border-b border-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
                  {selectedDrill.category.replace("-", " ")} · {selectedDrill.difficulty}
                </p>
                <CardTitle className="font-heading text-2xl font-black uppercase">{selectedDrill.title}</CardTitle>
                {selectedDrill.description && <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{selectedDrill.description}</p>}
              </CardHeader>
              <CardContent className="space-y-7 p-5">
                <section className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {WORKOUT_SKILL_OPTIONS.map((option) => {
                      const active = skillTags.includes(option.value);
                      return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleTag(skillTags, option.value, setSkillTags)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-400/60"}`}>{option.label}</button>;
                    })}
                  </div>
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide">Workout styles</h2>
                  <div className="flex flex-wrap gap-2">
                    {WORKOUT_FORMAT_OPTIONS.map((option) => {
                      const active = workoutTags.includes(option.value);
                      return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleTag(workoutTags, option.value, setWorkoutTags)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-400/60"}`}>{option.label}</button>;
                    })}
                  </div>
                </section>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-xs text-zinc-500">{selectedDrill.tagsReviewed ? "Previously reviewed" : "Not reviewed yet"}</p>
                  <Button onClick={() => saveTags.mutate({ drill: selectedDrill, skills: skillTags, formats: workoutTags })} disabled={saveTags.isPending} className="bg-white font-bold text-black hover:bg-zinc-200">
                    {saveTags.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    {view === "needs-review" ? "Save Tags & Next" : "Save Tags"}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
              <Check className="h-8 w-8 text-emerald-400" />
              <h2 className="font-heading text-xl font-bold uppercase">{view === "needs-review" ? "All caught up" : "No reviewed drills yet"}</h2>
              <p className="max-w-sm text-sm text-zinc-400">{view === "needs-review" ? "Every current drill is tagged. New admin-created drills will appear here." : "Reviewed drills will show here so you can edit their tags later."}</p>
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  );
}
