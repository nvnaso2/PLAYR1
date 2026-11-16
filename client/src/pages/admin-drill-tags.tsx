import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Info, Loader2,
  RotateCw, Trash2, X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DrillLibraryCard } from "@/components/drill-library-card";
import { DrillDiagramBuilder } from "@/components/drill-diagram-builder";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [activeStage, setActiveStage] = useState<ReviewStage>("diagram-tags");
  const [selectedId, setSelectedId] = useState("");
  const [immersive, setImmersive] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [infoDrill, setInfoDrill] = useState<ReviewDrill | null>(null);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [workoutTags, setWorkoutTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("beginner");
  const [diagramData, setDiagramData] = useState<DrillDiagramData | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [variationId, setVariationId] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReviewDrill | null>(null);
  const { data: drills = [], isLoading, isError, refetch } = useQuery<ReviewDrill[]>({ queryKey: queueKey });

  const stationDrills = useMemo(
    () => drills.filter((drill) => drill.tagReviewStage === activeStage),
    [drills, activeStage],
  );
  const selectedDrill = stationDrills.find((drill) => drill.id === selectedId) ?? stationDrills[0];
  const completedDrills = useMemo(() => drills.filter((drill) => drill.tagReviewStage === "complete"), [drills]);
  const pendingDrills = useMemo(() => drills.filter((drill) => drill.tagReviewStage !== "complete"), [drills]);
  const activeIndex = selectedDrill ? stationDrills.findIndex((drill) => drill.id === selectedDrill.id) : -1;
  const stageIndex = stages.findIndex((stage) => stage.id === activeStage);
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

  const deleteDrill = useMutation({
    mutationFn: async (drill: ReviewDrill) => {
      await apiRequest("DELETE", `/api/drills/${drill.id}`);
      return drill;
    },
    onSuccess: (deleted) => {
      queryClient.setQueryData<ReviewDrill[]>(queueKey, (current = []) =>
        current.filter((drill) => drill.id !== deleted.id),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/drills"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/drills/featured"] });
      setDeleteTarget(null);
      toast({ title: `${deleted.title} deleted` });
    },
    onError: (error: Error) => toast({
      title: "Could not delete drill",
      description: error.message,
      variant: "destructive",
    }),
  });

  const launchDrill = (drill: ReviewDrill) => {
    setActiveStage(drill.tagReviewStage);
    setSelectedId(drill.id);
    setQueueOpen(false);
    setCompletedOpen(false);
    setImmersive(true);
  };

  const saveAndAdvance = (fields: Partial<ReviewDrill>, nextStage: ReviewStage, successMessage: string) => {
    if (!selectedDrill) return;
    saveReview.mutate({ drill: selectedDrill, fields: { ...fields, tagReviewStage: nextStage } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData<ReviewDrill[]>(queueKey, (current = []) =>
          current.map((drill) => drill.id === updated.id ? updated : drill),
        );
        toast({ title: successMessage });
        if (nextStage !== "complete") {
          setActiveStage(nextStage);
          setSelectedId(updated.id);
        } else {
          const next = drills.find((drill) => drill.tagReviewStage === activeStage && drill.id !== updated.id);
          if (next) setSelectedId(next.id);
          else {
            setActiveStage("complete");
            setSelectedId(updated.id);
          }
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
        toast({ title: `${drill.title} moved to ${nextStage === "complete" ? "Completed" : stages.find((stage) => stage.id === nextStage)?.title}` });
        if (drill.id === selectedId) {
          const remaining = stationDrills.find((item) => item.id !== drill.id);
          if (remaining) setSelectedId(remaining.id);
          else if (nextStage === "complete") {
            setActiveStage("complete");
            setSelectedId(updated.id);
          } else {
            setActiveStage(nextStage);
            setSelectedId(updated.id);
          }
        }
      },
    });
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
  const toggleTag = (tag: string) => setWorkoutTags((current) =>
    current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
  );
  const chooseAdjacent = (direction: -1 | 1) => {
    if (!stationDrills.length) return;
    const index = Math.max(0, activeIndex);
    setSelectedId(stationDrills[(index + direction + stationDrills.length) % stationDrills.length].id);
  };

  const renderEditor = () => {
    if (!selectedDrill) {
      return <Card className="border-white/10 bg-zinc-950"><CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-7 text-center">
        <Check className="h-8 w-8 text-emerald-400" />
        <h2 className="font-heading text-xl font-bold uppercase">{activeStage === "complete" ? "Review complete" : "Station clear"}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-zinc-400">No drills are waiting here. Choose another station or open the queue.</p>
        <Button variant="outline" onClick={() => setQueueOpen(true)}>Open queue</Button>
      </CardContent></Card>;
    }
    const currentStage = stages.find((stage) => stage.id === activeStage);
    return <Card className="min-w-0 overflow-hidden border-white/10 bg-zinc-950 shadow-[0_24px_70px_rgba(0,0,0,.36)]">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-sm"><DrillLibraryCard drill={selectedDrill} link={false} /></div>
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">{activeStage === "complete" ? "Completed drill" : "Current station"}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{currentStage?.title ?? "Completed"}</p></div>
          <label className="min-w-0 sm:w-52"><span className="sr-only">Move drill to another station</span>
            <select className={inputClass} value={selectedDrill.tagReviewStage} onChange={(event) => moveDrill(selectedDrill, event.target.value as ReviewStage)} disabled={saveReview.isPending}>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>Move to · {stage.number} {stage.title}</option>)}
              <option value="complete">Move to · Completed</option>
            </select>
          </label>
        </div>
        {activeStage === "complete" ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-100"><Check className="mr-2 inline h-4 w-4" />This drill has cleared all four review stations.</div> : null}
        {activeStage === "diagram-tags" && <>
          <section className="space-y-3"><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Choose skills</h2><div className="flex flex-wrap gap-2">
            {WORKOUT_SKILL_OPTIONS.map((option) => { const active = skillTags.includes(option.value); return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleSkill(option.value)} className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>{option.label}</button>; })}
          </div></section>
          {WORKOUT_SKILL_OPTIONS.filter((skill) => skillTags.includes(skill.value)).map((skill) => {
            const formats = WORKOUT_FORMAT_OPTIONS.filter((option) => (option.skills as readonly string[]).includes(skill.value));
            return <section key={skill.value} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{skill.label} tags</h2>
              {formats.length ? <div className="flex flex-wrap gap-2">{formats.map((option) => { const active = workoutTags.includes(option.value); return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleTag(option.value)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>{option.label}</button>; })}</div> : <p className="text-sm text-zinc-500">No additional tags for this skill.</p>}
            </section>;
          })}
          <section className="space-y-3"><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Difficulty</h2><div className="grid grid-cols-3 gap-2">
            {(["beginner", "intermediate", "advanced"] as const).map((level) => <button key={level} type="button" aria-pressed={difficulty === level} onClick={() => setDifficulty(level)} className={`rounded-lg border px-2 py-2.5 text-sm font-semibold capitalize transition ${difficulty === level ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-orange-500/70"}`}>{level}</button>)}
          </div></section>
          <section className="space-y-3"><div><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Court diagram</h2><p className="mt-1 text-xs text-zinc-500">Add at least one marker to map the drill.</p></div><div className="h-[min(640px,85dvh)] min-h-[420px] w-full overflow-hidden rounded-xl border border-zinc-800"><DrillDiagramBuilder value={diagramData} onChange={setDiagramData} /></div></section>
          {skillTags.length === 0 ? <p role="status" className="text-center text-xs text-amber-300">Choose at least one skill before continuing.</p> : !diagramData?.elements.length ? <p role="status" className="text-center text-xs text-amber-300">Add one or more markers to the court diagram before continuing.</p> : null}
          <Button onClick={() => saveAndAdvance({ skillTags, workoutTags, difficulty: difficulty as Drill["difficulty"], diagramData }, "name-time", "Tags and diagram saved")} disabled={saveReview.isPending || skillTags.length === 0 || !diagramData?.elements.length} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">{saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}Save and continue</Button>
        </>}
        {activeStage === "name-time" && <>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Drill name</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Two-ball rhythm series" /></label><label><span className={labelClass}>Estimated minutes</span><input className={inputClass} type="number" inputMode="numeric" min="1" max="180" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="12" /></label></div>
          <label className="block"><span className={labelClass}>Variation of <span className="normal-case tracking-normal text-zinc-500">(optional)</span></span><select className={inputClass} value={variationId} onChange={(event) => setVariationId(event.target.value)}><option value="">Standalone drill</option>{variationOptions.map((drill) => <option key={drill.id} value={drill.id}>{drill.title}</option>)}</select></label>
          <div className="rounded-lg border border-orange-500/25 bg-orange-500/[0.07] px-3.5 py-3 text-xs leading-relaxed text-orange-100/80">A variation stays unpublished until every review station is complete. Only completed, standalone catalog drills are available as its parent.</div>
          <Button onClick={() => saveAndAdvance({ title: title.trim(), duration: minutes ? Number(minutes) * 60 : null, variationOfDrillId: variationId || null }, "description", "Name and timing saved")} disabled={saveReview.isPending || !title.trim() || !minutes || Number(minutes) < 1} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">{saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}Save and continue</Button>
        </>}
        {activeStage === "description" && <>
          <label className="block"><span className={labelClass}>Player instructions</span><textarea className={`${inputClass} h-48 resize-y py-3 leading-relaxed`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the setup, sequence, and what a good rep feels like." /></label>
          <p className="text-xs leading-relaxed text-zinc-500">Keep it direct: setup, action, and one useful coaching cue.</p>
          <Button onClick={() => saveAndAdvance({ description: description.trim() || null }, "video", "Description saved")} disabled={saveReview.isPending || !description.trim()} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">{saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}Save and continue</Button>
        </>}
        {activeStage === "video" && <>
          <label className="block"><span className={labelClass}>Video URL</span><input className={inputClass} value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://… or /objects/…" /></label>
          <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3.5 py-3 text-xs leading-relaxed text-zinc-400">A video is required to finish this station. Once completed, this drill moves into the player catalog.</div>
          <Button onClick={() => saveAndAdvance({ videoUrl: videoUrl.trim() || null }, "complete", "Drill review complete")} disabled={saveReview.isPending || !videoUrl.trim() || !(/^(https?:\/\/|\/objects\/)/i.test(videoUrl.trim()))} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400">{saveReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Save and complete</Button>
        </>}
      </CardContent>
    </Card>;
  };

  const renderDrillList = (items: ReviewDrill[], emptyMessage: string) => items.length ? <div className="max-h-[65dvh] space-y-2 overflow-y-auto pr-1">
    {items.map((drill, index) => <div key={drill.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-2 sm:p-3">
      <button type="button" onClick={() => launchDrill(drill)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-xs text-orange-300">{String(index + 1).padStart(2, "0")}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-zinc-100">{drill.title}</span><span className="mt-1 block truncate text-[10px] uppercase tracking-[.12em] text-zinc-500">{drill.category.replaceAll("-", " ")}{drill.tagReviewStage !== "complete" ? ` · ${stages.find((stage) => stage.id === drill.tagReviewStage)?.title}` : " · completed"}</span></span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-zinc-500" />
      </button>
      <button type="button" aria-label={`View full drill card for ${drill.title}`} title="Drill details" onClick={() => setInfoDrill(drill)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-orange-400/60 hover:text-orange-300"><Info className="h-4 w-4" /></button>
      <button type="button" aria-label={`Delete ${drill.title}`} title="Delete drill" onClick={() => setDeleteTarget(drill)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-red-300 transition hover:border-red-400/70 hover:bg-red-500/10 hover:text-red-200"><Trash2 className="h-4 w-4" /></button>
    </div>)}
  </div> : <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center"><ClipboardList className="mx-auto h-6 w-6 text-zinc-600" /><p className="mt-3 text-sm text-zinc-400">{emptyMessage}</p></div>;

  return <main className="min-h-[100dvh] w-full bg-[#11100f] px-3 pb-10 pt-4 text-zinc-100 sm:px-6 sm:pt-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <nav aria-label="Drill review stations" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stages.map((stage) => {
          const count = drills.filter((drill) => drill.tagReviewStage === stage.id).length;
          return <button key={stage.id} type="button" onClick={() => { setActiveStage(stage.id); setSelectedId(drills.find((drill) => drill.tagReviewStage === stage.id)?.id ?? ""); setImmersive(true); }} className="group flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-[#191817] p-3 text-left transition hover:border-orange-400/70 hover:bg-orange-500/[0.06] sm:gap-3 sm:p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 font-mono text-xs font-black text-black">{stage.number}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold uppercase text-zinc-100 sm:text-sm">{stage.title}</span><span className="mt-0.5 hidden truncate text-[10px] text-zinc-500 sm:block">{stage.subtitle}</span></span>
            <span className="font-mono text-lg font-bold text-orange-300">{count}</span>
          </button>;
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#191817] px-3 py-3 sm:px-4">
        <p className="text-xs text-zinc-400">Choose a station or browse the drill lists.</p>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" className="h-10 flex-1 border-white/15 bg-transparent text-zinc-200 hover:bg-white/5 sm:flex-none" onClick={() => setQueueOpen(true)}><ClipboardList className="mr-2 h-4 w-4 text-orange-300" />Queue</Button>
          <Button variant="outline" className="h-10 flex-1 border-white/15 bg-transparent text-zinc-200 hover:bg-white/5 sm:flex-none" onClick={() => setCompletedOpen(true)}><Check className="mr-2 h-4 w-4 text-emerald-400" />Completed</Button>
        </div>
      </div>

      {isLoading ? <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-[#191817] p-5"><div className="h-6 w-1/3 animate-pulse rounded bg-zinc-800" /><div className="h-48 animate-pulse rounded-xl bg-zinc-800" /><div className="h-12 animate-pulse rounded-lg bg-zinc-800" /></div>
        : isError ? <Card className="border-red-500/20 bg-zinc-950"><CardContent className="flex flex-col items-center gap-3 p-8 text-center"><p className="text-sm text-zinc-300">The drill catalog could not be loaded.</p><Button variant="outline" onClick={() => refetch()}><RotateCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>
          : immersive ? <section className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-[#11100f] px-3 pb-[env(safe-area-inset-bottom)] pt-2 text-zinc-100 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-4">
            <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between gap-3 border-b border-white/10 bg-[#11100f]/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <Button variant="ghost" onClick={() => setImmersive(false)} className="text-zinc-300 hover:bg-white/5 hover:text-white"><X className="mr-2 h-4 w-4" />Close</Button>
              <div className="min-w-0 flex-1 text-center"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">{activeStage === "complete" ? "Completed" : `Station ${String(stageIndex + 1).padStart(2, "0")} / 04`}</p><p className="truncate text-xs text-zinc-400">{activeIndex >= 0 ? `${activeIndex + 1} of ${stationDrills.length}` : "Station complete"}</p></div>
              <button type="button" aria-label="Open queue" onClick={() => setQueueOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:border-orange-400/60"><ClipboardList className="h-4 w-4" /></button>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${stationDrills.length ? ((activeIndex + 1) / stationDrills.length) * 100 : 100}%` }} /></div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={() => chooseAdjacent(-1)} disabled={stationDrills.length < 2} className="border-white/15 bg-transparent"><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
              <span className="max-w-[45%] truncate text-xs font-semibold text-zinc-300">{selectedDrill?.title ?? "No drill selected"}</span>
              <div className="flex shrink-0 items-center gap-2">
                {selectedDrill ? <Button variant="outline" onClick={() => setDeleteTarget(selectedDrill)} className="border-red-500/25 bg-transparent px-2 text-red-300 hover:bg-red-500/10 hover:text-red-200 sm:px-3"><Trash2 className="h-4 w-4 sm:mr-1" /><span className="sr-only sm:not-sr-only">Delete</span></Button> : null}
                <Button variant="outline" onClick={() => chooseAdjacent(1)} disabled={stationDrills.length < 2} className="border-white/15 bg-transparent">Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </div>
            {renderEditor()}
            </div>
          </section> : <section className="flex min-h-[34vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#191817]/70 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/[0.08] text-orange-300"><CircleHelp className="h-5 w-5" /></div>
            <h1 className="mt-4 font-heading text-lg font-bold uppercase tracking-wide">Choose a station to get started</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">Open any station counter to see its drills, then review them one at a time.</p>
            <Button onClick={() => setQueueOpen(true)} className="mt-5 bg-orange-500 font-bold text-black hover:bg-orange-400"><ClipboardList className="mr-2 h-4 w-4" />Open queue</Button>
          </section>}
    </div>

    <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#171615] p-4 text-zinc-100 sm:max-w-xl sm:p-6">
        <DialogHeader><DialogTitle className="font-heading text-xl font-black uppercase">Drill queue</DialogTitle><DialogDescription className="text-zinc-400">Choose a drill to open its review station. Use the info button for the full player card.</DialogDescription></DialogHeader>
        {renderDrillList(pendingDrills, "The review queue is clear.")}
      </DialogContent>
    </Dialog>
    <Dialog open={completedOpen} onOpenChange={setCompletedOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#171615] p-4 text-zinc-100 sm:max-w-xl sm:p-6">
        <DialogHeader><DialogTitle className="font-heading text-xl font-black uppercase">Completed drills</DialogTitle><DialogDescription className="text-zinc-400">Finished reviews, ready for the player catalog.</DialogDescription></DialogHeader>
        {renderDrillList(completedDrills, "No drills have cleared all four stations yet.")}
      </DialogContent>
    </Dialog>
    <Dialog open={!!infoDrill} onOpenChange={(open) => { if (!open) setInfoDrill(null); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#171615] p-4 text-zinc-100 sm:max-w-lg sm:p-6">
        <DialogHeader><DialogTitle className="font-heading text-xl font-black uppercase">Drill details</DialogTitle><DialogDescription className="text-zinc-400">Full player-facing catalog card.</DialogDescription></DialogHeader>
        {infoDrill ? <div className="mx-auto w-full max-w-sm"><DrillLibraryCard drill={infoDrill} link={false} /></div> : null}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleteDrill.isPending) setDeleteTarget(null); }}>
      <AlertDialogContent className="border-white/10 bg-[#171615] text-zinc-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl font-black uppercase">Delete this drill?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This permanently removes “{deleteTarget?.title}” from the drill catalog. Existing course or training references may be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDrill.isPending} className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/5">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteDrill.isPending || !deleteTarget}
            onClick={(event) => {
              event.preventDefault();
              if (deleteTarget) deleteDrill.mutate(deleteTarget);
            }}
            className="bg-red-600 text-white hover:bg-red-500"
          >
            {deleteDrill.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete drill
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>;
}
