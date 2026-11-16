import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Circle, Loader2, RotateCw, Tags } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DrillLibraryCard } from "@/components/drill-library-card";
import { DrillDiagramBuilder } from "@/components/drill-diagram-builder";
import type { Drill, DrillDiagramData } from "@shared/schema";
import { WORKOUT_FORMAT_OPTIONS, WORKOUT_SKILL_OPTIONS } from "@shared/workout-builder-taxonomy";

type ReviewStage = "diagram-tags" | "name-time" | "description" | "video" | "complete";
type ReviewDrill = Drill & { tagReviewStage: ReviewStage; variationOfDrillId?: string | null };
type StationStage = Exclude<ReviewStage, "complete">;

const queueKey = ["/api/admin/drill-tag-review"];
const stages: { id: StationStage; number: string; title: string; subtitle: string }[] = [
  { id: "diagram-tags", number: "01", title: "Diagram + tags", subtitle: "Court, skills, difficulty" },
  { id: "name-time", number: "02", title: "Name + time", subtitle: "Title, minutes, variation" },
  { id: "description", number: "03", title: "Description", subtitle: "Player-facing instructions" },
  { id: "video", number: "04", title: "Video", subtitle: "Link, then complete" },
];

const inputClass = "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400 placeholder:text-zinc-600";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400";

export default function AdminDrillTagsPage() {
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState<StationStage>("diagram-tags");
  const [selectedId, setSelectedId] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [workoutTags, setWorkoutTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("beginner");
  const [diagramData, setDiagramData] = useState<DrillDiagramData | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [variationId, setVariationId] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const { data: drills = [], isLoading, isError, refetch } = useQuery<ReviewDrill[]>({ queryKey: queueKey });

  const activeDrills = useMemo(
    () => drills.filter((drill) => drill.tagReviewStage === activeStage),
    [drills, activeStage],
  );
  const selectedDrill = activeDrills.find((drill) => drill.id === selectedId) ?? activeDrills[0];
  const completedDrills = drills.filter((drill) => drill.tagReviewStage === "complete");
  const stageIndex = stages.findIndex((stage) => stage.id === activeStage);
  const completeCount = completedDrills.length;
  const pendingCount = drills.length - completeCount;
  const variationOptions = drills.filter((drill) =>
    drill.id !== selectedDrill?.id && !drill.variationOfDrillId && drill.tagReviewStage === "complete",
  );

  useEffect(() => {
    if (!selectedDrill) {
      setSelectedId("");
      setSkillTags([]);
      setWorkoutTags([]);
      setDifficulty("beginner");
      setDiagramData(null);
      setTitle("");
      setMinutes("");
      setVariationId("");
      setDescription("");
      setVideoUrl("");
      return;
    }
    if (selectedId !== selectedDrill.id) setSelectedId(selectedDrill.id);
    setSkillTags(selectedDrill.skillTags ?? []);
    setWorkoutTags(selectedDrill.workoutTags ?? []);
    setDifficulty(selectedDrill.difficulty === "elite" ? "advanced" : selectedDrill.difficulty ?? "beginner");
    setDiagramData(selectedDrill.diagramData ?? null);
    setTitle(selectedDrill.title ?? "");
    setMinutes(selectedDrill.duration ? String(Math.max(1, Math.round(selectedDrill.duration / 60))) : "");
    setVariationId(selectedDrill.variationOfDrillId ?? "");
    setDescription(selectedDrill.description ?? "");
    setVideoUrl(selectedDrill.videoUrl ?? "");
  }, [selectedDrill, selectedId]);

  const saveReview = useMutation({
    mutationFn: async ({ drill, fields }: { drill: ReviewDrill; fields: Partial<ReviewDrill> }) => {
      const response = await apiRequest("PATCH", `/api/admin/drill-tag-review/${drill.id}`, fields);
      return response.json() as Promise<ReviewDrill>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ReviewDrill[]>(queueKey, (current = []) =>
        current.map((drill) => drill.id === updated.id ? updated : drill),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/drills"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/drills/featured"] });
    },
    onError: () => toast({ title: "Could not save drill", variant: "destructive" }),
  });

  const saveAndAdvance = (fields: Partial<ReviewDrill>, nextStage: ReviewStage, successMessage: string) => {
    if (!selectedDrill) return;
    saveReview.mutate({ drill: selectedDrill, fields: { ...fields, tagReviewStage: nextStage } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData<ReviewDrill[]>(queueKey, (current = []) =>
          current.map((drill) => drill.id === updated.id ? updated : drill),
        );
        toast({ title: successMessage });
        if (nextStage !== "complete") {
          const nextStation = nextStage as StationStage;
          setActiveStage(nextStation);
          setSelectedId(updated.id);
        } else {
          const next = drills.find((drill) => drill.tagReviewStage === activeStage && drill.id !== updated.id);
          setSelectedId(next?.id ?? "");
        }
      },
    });
  };

  const moveDrill = (drill: ReviewDrill, nextStage: ReviewStage) => {
    if (nextStage === drill.tagReviewStage) return;
    saveReview.mutate({ drill, fields: { tagReviewStage: nextStage } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData<ReviewDrill[]>(queueKey, (current = []) =>
          current.map((item) => item.id === updated.id ? updated : item),
        );
        if (drill.id === selectedId) setSelectedId("");
        toast({ title: `${drill.title} moved to ${nextStage === "complete" ? "Complete" : stages.find((stage) => stage.id === nextStage)?.title}` });
      },
    });
  };

  const selectStage = (stage: StationStage) => {
    setActiveStage(stage);
    setSelectedId("");
  };

  const toggleSkill = (skill: string) => {
    const nextSkills = skillTags.includes(skill)
      ? skillTags.filter((value) => value !== skill)
      : [...skillTags, skill];
    setSkillTags(nextSkills);
    setWorkoutTags((current) => current.filter((tag) => {
      const option = WORKOUT_FORMAT_OPTIONS.find((candidate) => candidate.value === tag);
      return option?.skills.some((supportedSkill) => nextSkills.includes(supportedSkill)) ?? false;
    }));
  };

  const toggleTag = (tag: string) => {
    setWorkoutTags((current) => current.includes(tag)
      ? current.filter((value) => value !== tag)
      : [...current, tag]);
  };

  const renderEditor = () => {
    if (!selectedDrill) {
      return (
        <Card className="border-white/10 bg-zinc-950">
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-7 text-center">
            {activeDrills.length === 0 ? <Check className="h-8 w-8 text-emerald-400" /> : <Circle className="h-7 w-7 text-zinc-600" />}
            <h2 className="font-heading text-xl font-bold uppercase">{activeDrills.length === 0 ? "Station clear" : "Select a drill"}</h2>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
              {activeDrills.length === 0
                ? "No drills are waiting here. Move a drill into this station from its review controls, or keep working through the stations."
                : "Choose a drill from the station list to continue its review."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="min-w-0 overflow-hidden border-white/10 bg-zinc-950">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-sm"><DrillLibraryCard drill={selectedDrill} link={false} /></div>
          <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">Current station</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{stages.find((stage) => stage.id === selectedDrill.tagReviewStage)?.title}</p>
            </div>
            <label className="min-w-0 sm:w-48">
              <span className="sr-only">Move drill to another station</span>
              <select className={inputClass} value={selectedDrill.tagReviewStage} onChange={(event) => moveDrill(selectedDrill, event.target.value as ReviewStage)} disabled={saveReview.isPending}>
                {stages.map((stage) => <option key={stage.id} value={stage.id}>Move to · {stage.number} {stage.title}</option>)}
                <option value="complete">Move to · Complete</option>
              </select>
            </label>
          </div>

          {activeStage === "diagram-tags" && (
            <>
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Choose skills</h2>
                <div className="flex flex-wrap gap-2">
                  {WORKOUT_SKILL_OPTIONS.map((option) => {
                    const active = skillTags.includes(option.value);
                    return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleSkill(option.value)} className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>{option.label}</button>;
                  })}
                </div>
              </section>
              {WORKOUT_SKILL_OPTIONS.filter((skill) => skillTags.includes(skill.value)).map((skill) => {
                const formats = WORKOUT_FORMAT_OPTIONS.filter((option) => (option.skills as readonly string[]).includes(skill.value));
                return (
                  <section key={skill.value} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{skill.label} tags</h2>
                    {formats.length ? <div className="flex flex-wrap gap-2">{formats.map((option) => {
                      const active = workoutTags.includes(option.value);
                      return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleTag(option.value)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>{option.label}</button>;
                    })}</div> : <p className="text-sm text-zinc-500">No additional tags for this skill.</p>}
                  </section>
                );
              })}
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Difficulty</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(["beginner", "intermediate", "advanced"] as const).map((level) => <button key={level} type="button" aria-pressed={difficulty === level} onClick={() => setDifficulty(level)} className={`rounded-lg border px-2 py-2.5 text-sm font-semibold capitalize transition ${difficulty === level ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>{level}</button>)}
                </div>
              </section>
              <section className="space-y-3">
                <div><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Court diagram</h2><p className="mt-1 text-xs text-zinc-500">Add at least one marker to map the drill.</p></div>
                <div className="h-[min(640px,85dvh)] min-h-[420px] w-full overflow-hidden rounded-xl border border-zinc-800"><DrillDiagramBuilder value={diagramData} onChange={setDiagramData} /></div>
              </section>
              {skillTags.length === 0 ? <p role="status" className="text-center text-xs text-amber-300">Choose at least one skill before continuing.</p> : !diagramData?.elements.length ? <p role="status" className="text-center text-xs text-amber-300">Add one or more markers to the court diagram before continuing.</p> : null}
              <Button onClick={() => saveAndAdvance({ skillTags, workoutTags, difficulty: difficulty as Drill["difficulty"], diagramData }, "name-time", "Tags and diagram saved")} disabled={saveReview.isPending || skillTags.length === 0 || !diagramData?.elements.length} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">
                {saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}Save and continue
              </Button>
            </>
          )}

          {activeStage === "name-time" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className={labelClass}>Drill name</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Two-ball rhythm series" /></label>
                <label><span className={labelClass}>Estimated minutes</span><input className={inputClass} type="number" inputMode="numeric" min="1" max="180" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="12" /></label>
              </div>
              <label className="block"><span className={labelClass}>Variation of <span className="normal-case tracking-normal text-zinc-500">(optional)</span></span>
                <select className={inputClass} value={variationId} onChange={(event) => setVariationId(event.target.value)}>
                  <option value="">Standalone drill</option>
                  {variationOptions.map((drill) => <option key={drill.id} value={drill.id}>{drill.title}</option>)}
                </select>
              </label>
              <div className="rounded-lg border border-orange-500/25 bg-orange-500/[0.07] px-3.5 py-3 text-xs leading-relaxed text-orange-100/80">
                A variation stays unpublished until every review station is complete. Only completed, standalone catalog drills are available as its parent.
              </div>
              <Button onClick={() => saveAndAdvance({ title: title.trim(), duration: minutes ? Number(minutes) * 60 : null, variationOfDrillId: variationId || null }, "description", "Name and timing saved")} disabled={saveReview.isPending || !title.trim() || !minutes || Number(minutes) < 1} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">
                {saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}Save and continue
              </Button>
            </>
          )}

          {activeStage === "description" && (
            <>
              <label className="block"><span className={labelClass}>Player instructions</span><textarea className={`${inputClass} h-48 resize-y py-3 leading-relaxed`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the setup, sequence, and what a good rep feels like." /></label>
              <p className="text-xs leading-relaxed text-zinc-500">Keep it direct: setup, action, and one useful coaching cue.</p>
              <Button onClick={() => saveAndAdvance({ description: description.trim() || null }, "video", "Description saved")} disabled={saveReview.isPending || !description.trim()} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">
                {saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}Save and continue
              </Button>
            </>
          )}

          {activeStage === "video" && (
            <>
              <label className="block"><span className={labelClass}>Video URL</span><input className={inputClass} value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://… or /objects/…" /></label>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3.5 py-3 text-xs leading-relaxed text-zinc-400">A video is required to finish this station. Once completed, this drill moves into the player catalog.</div>
              <Button onClick={() => saveAndAdvance({ videoUrl: videoUrl.trim() || null }, "complete", "Drill review complete")} disabled={saveReview.isPending || !videoUrl.trim() || !(/^(https?:\/\/|\/objects\/)/i.test(videoUrl.trim()))} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">
                {saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Complete review
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-3 pb-10 sm:space-y-6 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-400">Admin / Training catalog</p>
          <h1 className="mt-1 font-heading text-3xl font-black uppercase tracking-tight sm:text-4xl">Drill review</h1>
          <p className="mt-1 text-sm text-zinc-400">Four stations. One clean catalog.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300">
          <Tags className="h-4 w-4 text-orange-400" /><span>{pendingCount} in review</span><span className="text-zinc-600">/</span><span>{completeCount} complete</span>
        </div>
      </header>

      <nav aria-label="Drill review stations" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stages.map((stage, index) => {
          const count = drills.filter((drill) => drill.tagReviewStage === stage.id).length;
          const active = activeStage === stage.id;
          return <button key={stage.id} type="button" onClick={() => selectStage(stage.id)} className={`group flex min-w-0 items-center gap-2 rounded-xl border p-3 text-left transition sm:gap-3 sm:p-4 ${active ? "border-orange-400/60 bg-orange-500/[0.09]" : "border-white/10 bg-zinc-950 hover:border-white/25"}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${active ? "bg-orange-500 text-black" : "bg-zinc-900 text-zinc-500"}`}>{stage.number}</span>
            <span className="min-w-0 flex-1"><span className={`block truncate text-xs font-bold uppercase sm:text-sm ${active ? "text-zinc-100" : "text-zinc-300"}`}>{stage.title}</span><span className="mt-0.5 hidden truncate text-[10px] text-zinc-500 sm:block">{stage.subtitle}</span></span>
            <span className={`font-mono text-xs ${active ? "text-orange-300" : "text-zinc-500"}`}>{count}</span>
            {index < 3 && <ChevronRight className="hidden h-3 w-3 text-zinc-700 xl:block" />}
          </button>;
        })}
      </nav>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
          <Card className="border-white/10 bg-zinc-950"><CardContent className="space-y-3 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-zinc-900" />)}</CardContent></Card>
          <Card className="border-white/10 bg-zinc-950"><CardContent className="space-y-4 p-6"><div className="h-5 w-40 animate-pulse rounded bg-zinc-900" /><div className="h-48 animate-pulse rounded-xl bg-zinc-900" /><div className="h-10 animate-pulse rounded bg-zinc-900" /></CardContent></Card>
        </div>
      ) : isError ? (
        <Card className="border-red-500/20 bg-zinc-950"><CardContent className="flex flex-col items-center gap-3 p-8 text-center"><p className="text-sm text-zinc-300">The drill catalog could not be loaded.</p><Button variant="outline" onClick={() => refetch()}><RotateCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start">
          <aside className="min-w-0 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.17em] text-zinc-400">Station queue</h2>
              <span className="font-mono text-xs text-zinc-500">{activeDrills.length} drills</span>
            </div>
            <div className="max-h-[35vh] space-y-1.5 overflow-auto pr-1 lg:max-h-[70vh]">
              {activeDrills.map((drill, index) => {
                const active = selectedDrill?.id === drill.id;
                return <button key={drill.id} type="button" onClick={() => setSelectedId(drill.id)} className={`flex w-full min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${active ? "border-orange-500/40 bg-orange-500/[0.08]" : "border-transparent bg-zinc-950 hover:border-white/10 hover:bg-zinc-900/80"}`}>
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] ${active ? "bg-orange-500 text-black" : "bg-zinc-900 text-zinc-500"}`}>{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-semibold ${active ? "text-white" : "text-zinc-300"}`}>{drill.title}</span><span className="mt-1 block truncate text-[10px] uppercase tracking-wide text-zinc-600">{drill.category.replaceAll("-", " ")}</span></span>
                </button>;
              })}
              {activeDrills.length === 0 && <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs leading-relaxed text-zinc-500">Nothing waiting in this station.</div>}
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between"><h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Completed</h3><span className="font-mono text-xs text-emerald-400">{completeCount}</span></div>
              {completeCount > 0 ? <div className="mt-2 max-h-36 space-y-1 overflow-auto">{completedDrills.map((drill) => <div key={drill.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md px-1 py-1 text-xs text-zinc-400"><span className="min-w-0 truncate">{drill.title}</span><label className="shrink-0"><span className="sr-only">Move {drill.title} from completed to another station</span><select aria-label={`Move ${drill.title} from completed to another station`} className="max-w-32 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 outline-none focus:border-orange-400" value="complete" onChange={(event) => moveDrill(drill, event.target.value as ReviewStage)} disabled={saveReview.isPending}><option value="complete">Completed</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>Reopen · {stage.title}</option>)}</select></label></div>)}</div> : <p className="mt-2 text-[11px] text-zinc-600">Finished drills will appear here.</p>}
            </div>
          </aside>

          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Station {String(stageIndex + 1).padStart(2, "0")} / 04</p><h2 className="mt-0.5 font-heading text-xl font-black uppercase">{stages[stageIndex]?.title}</h2></div>
              <span className="text-xs text-zinc-500">{activeDrills.length ? `${activeDrills.findIndex((drill) => drill.id === selectedDrill?.id) + 1} of ${activeDrills.length}` : "Queue empty"}</span>
            </div>
            {renderEditor()}
          </section>
        </div>
      )}
    </main>
  );
}
