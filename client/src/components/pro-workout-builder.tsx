import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Shuffle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DrillDiagramPreview } from "@/components/drill-diagram-preview";
import { getObjectUrl } from "@/lib/queryClient";
import { formatWorkoutDescription } from "@/lib/workout-description";
import { getWorkoutFormatTags, getWorkoutSkillTags, WORKOUT_FORMAT_OPTIONS, WORKOUT_SKILL_OPTIONS, type WorkoutSkillTag } from "@shared/workout-builder-taxonomy";
import type { DifficultyLevel, Drill } from "@shared/schema";

const DURATIONS = [15, 30, 45, 60, 75, 90, 120];
const LEVELS: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];
const LEVEL_WEIGHT: Record<DifficultyLevel, number> = { beginner: 0, intermediate: 1, advanced: 2, elite: 3 };
const MIX_WORKOUT_TAG = "mix";

function weightedByLevel(drills: Drill[], targetLevel: number): Drill[] {
  const pool = [...drills];
  const result: Drill[] = [];
  while (pool.length) {
    const weights = pool.map((drill) => LEVEL_WEIGHT[drill.difficulty as DifficultyLevel] === targetLevel ? 4 : 1);
    let pick = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
    let index = weights.findIndex((weight) => {
      pick -= weight;
      return pick < 0;
    });
    if (index < 0) index = pool.length - 1;
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function randomize<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function estimatedDrillSeconds(drill: Drill) {
  return Math.max(5 * 60, drill.duration ?? 8 * 60);
}

function formatMinutes(seconds: number) {
  return `${Math.ceil(seconds / 60)} min`;
}

export function ProWorkoutBuilder({
  drills,
  onUseWorkout,
}: {
  drills: Drill[];
  onUseWorkout: (ids: string[]) => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [skills, setSkills] = useState<WorkoutSkillTag[]>([]);
  const [formats, setFormats] = useState<Record<string, string[]>>({});
  const [level, setLevel] = useState<DifficultyLevel>("intermediate");
  const [result, setResult] = useState<Drill[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [resultOpen, setResultOpen] = useState(false);

  const toggleSkill = (skill: WorkoutSkillTag) => {
    setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
    setResult([]);
  };

  const toggleFormat = (skill: WorkoutSkillTag, format: string) => {
    setFormats((current) => {
      const selected = current[skill] ?? [];
      const next = format === MIX_WORKOUT_TAG
        ? [format]
        : [...selected.filter((item) => item !== MIX_WORKOUT_TAG), ...(selected.includes(format) ? [] : [format])];
      return { ...current, [skill]: selected.includes(format) ? selected.filter((item) => item !== format) : next };
    });
    setResult([]);
  };

  const build = () => {
    const chosen: Drill[] = [];
    const missing: string[] = [];
    const used = new Set<string>();
    const targetLevel = LEVEL_WEIGHT[level];
    const requestedBySkill = skills.map((skill) => {
      const selectedFormats = formats[skill] ?? [];
      const availableFormats = formatsForSkill(skill);
      const eligible = drills.filter((drill) => {
        const hasSkill = getWorkoutSkillTags(drill).includes(skill);
        const hasSelectedFormat = availableFormats.length === 0
          || selectedFormats.includes(MIX_WORKOUT_TAG)
          || selectedFormats.some((tag) => getWorkoutFormatTags(drill).includes(tag as any));
        const withinLevel = LEVEL_WEIGHT[drill.difficulty as DifficultyLevel] <= targetLevel;
        return hasSkill && withinLevel && hasSelectedFormat;
      });
      if (!eligible.length) missing.push(WORKOUT_SKILL_OPTIONS.find((item) => item.value === skill)?.label ?? skill);
      return { skill, eligible: weightedByLevel(randomize(eligible), targetLevel) };
    });

    const totalSeconds = minutes * 60;
    let usedSeconds = 0;
    let index = 0;
    while (usedSeconds < totalSeconds && requestedBySkill.some((group) => group.eligible.some((drill) => !used.has(drill.id)))) {
      const group = requestedBySkill[index % requestedBySkill.length];
      const next = group.eligible.find((drill) => !used.has(drill.id));
      if (next) {
        chosen.push(next);
        used.add(next.id);
        usedSeconds += Math.max(5 * 60, next.duration ?? 8 * 60);
      }
      index += 1;
    }
    setUnavailable(missing);
    setResult(chosen);
    setResultOpen(true);
  };

  const activeSkills = useMemo(() => WORKOUT_SKILL_OPTIONS.filter((item) => skills.includes(item.value)), [skills]);
  const formatsForSkill = (skill: WorkoutSkillTag) => WORKOUT_FORMAT_OPTIONS.filter((option) => (option.skills as readonly string[]).includes(skill));
  const estimatedWorkoutMinutes = Math.ceil(result.reduce((total, drill) => total + estimatedDrillSeconds(drill), 0) / 60);

  return (
    <main className="min-h-full bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-black uppercase sm:text-4xl">Build your workout</h1>
        </div>

        <section className="space-y-8">
            <div>
              <h2 className="mb-4 flex items-center justify-center gap-2 text-center font-heading text-base font-black uppercase tracking-wide text-zinc-100"><Clock3 className="h-4 w-4 text-orange-400" />How long is your workout?</h2>
              <div className="flex flex-wrap justify-center gap-2.5">{DURATIONS.map((value) => <button key={value} type="button" onClick={() => { setMinutes(value); setResult([]); }} className={`min-w-24 rounded-full border px-5 py-3 text-sm font-semibold transition sm:text-base ${minutes === value ? "border-white bg-white text-black shadow-[0_0_18px_rgba(255,255,255,.16)]" : "border-orange-500/70 bg-zinc-950 text-zinc-200 hover:bg-orange-500/10"}`}>{value} min</button>)}</div>
            </div>

            <div>
              <h2 className="mb-4 text-center font-heading text-base font-black uppercase tracking-wide text-zinc-100">What skills do you want to work on?</h2>
              <div className="flex flex-wrap justify-center gap-2.5">{WORKOUT_SKILL_OPTIONS.map((item) => <button key={item.value} type="button" onClick={() => toggleSkill(item.value)} className={`rounded-full border px-5 py-3 text-sm font-semibold transition sm:text-base ${skills.includes(item.value) ? "border-white bg-white text-black shadow-[0_0_18px_rgba(255,255,255,.16)]" : "border-orange-500/70 bg-zinc-950 text-zinc-200 hover:bg-orange-500/10"}`}>{item.label}</button>)}</div>
              <div className="mt-5 space-y-5">{activeSkills.map((skill) => <div key={skill.value} className="px-2 py-2"><p className="mb-3 text-center text-xs font-black uppercase tracking-[.16em] text-white">{skill.label} style</p>{formatsForSkill(skill.value).length ? <div className="flex flex-wrap justify-center gap-2">{formatsForSkill(skill.value).map((option) => <button key={option.value} type="button" onClick={() => toggleFormat(skill.value, option.value)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${formats[skill.value]?.includes(option.value) ? "border-white bg-white text-black shadow-[0_0_14px_rgba(255,255,255,.15)]" : "border-orange-500/60 bg-black text-zinc-200 hover:bg-orange-500/10"}`}>{option.label}</button>)}</div> : <p className="text-center text-xs text-zinc-500">No additional tags needed for this skill.</p>}</div>)}</div>
            </div>

            <div>
              <h2 className="mb-4 text-center font-heading text-base font-black uppercase tracking-wide text-zinc-100">Choose a level</h2>
              <div className="mx-auto grid max-w-xl grid-cols-3 gap-2.5">{LEVELS.map((value) => <button key={value} type="button" onClick={() => { setLevel(value); setResult([]); }} className={`rounded-full border px-3 py-3 text-sm font-bold capitalize transition ${level === value ? "border-white bg-white text-black shadow-[0_0_18px_rgba(255,255,255,.16)]" : "border-orange-500/70 bg-zinc-950 text-zinc-200 hover:bg-orange-500/10"}`}>{value}</button>)}</div>
            </div>

            <Button onClick={build} disabled={!skills.length || skills.some((skill) => formatsForSkill(skill).length > 0 && !formats[skill]?.length)} className="mx-auto flex h-12 w-full max-w-xl justify-center bg-white font-black uppercase tracking-wide text-black hover:bg-zinc-200"><Shuffle className="mr-2 h-4 w-4" />Build my workout</Button>
        </section>
      </div>
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="flex h-[min(88dvh,920px)] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem)] w-[calc(100%-1rem)] max-w-xl flex-col overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-zinc-950 shadow-none sm:rounded-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:border [&>button]:border-zinc-300 [&>button]:bg-white [&>button]:opacity-100">
          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] text-zinc-950 shadow-2xl">
            <header className="shrink-0 bg-white px-5 pb-4 pt-6 sm:px-8">
              <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Workout Generated</p>
              <DialogHeader className="space-y-0 text-left">
                <DialogTitle className="max-w-[84%] font-heading text-4xl font-black uppercase leading-[.95] tracking-[-.04em] text-black sm:text-5xl">{minutes}-Minute Workout</DialogTitle>
                <div className="mt-3 h-1 bg-black" />
                <DialogDescription className="mx-auto mt-3 max-w-md text-center font-heading text-base font-black uppercase leading-tight text-zinc-900 sm:text-lg">
                  {result.length ? `${result.length} drills matched to your choices.` : "No drills matched these choices yet."}
                </DialogDescription>
              </DialogHeader>
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
              {result.length ? result.map((drill, index) => (
                <article key={drill.id} className="grid grid-cols-[minmax(112px,36%)_1fr] gap-3 overflow-hidden rounded-xl bg-white p-3 shadow-md sm:grid-cols-[165px_1fr] sm:gap-5 sm:p-4">
                  <figure className="relative flex aspect-[1.08/1] items-center justify-center overflow-hidden">
                    {drill.diagramData ? (
                      <DrillDiagramPreview diagramData={drill.diagramData} className="h-full w-full" />
                    ) : drill.thumbnailUrl ? (
                      <img src={getObjectUrl(drill.thumbnailUrl)} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#f7f6f2] text-orange-600">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-200 bg-orange-50"><Target className="h-5 w-5" /></span>
                      </div>
                    )}
                  </figure>
                  <div className="flex min-w-0 flex-col justify-center py-1 pr-1 sm:py-2 sm:pr-2">
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-orange-600">Drill #{index + 1}</p>
                    <h3 className="mt-0.5 font-heading text-lg font-black uppercase leading-tight tracking-[-.025em] text-zinc-950 sm:text-xl">{drill.title}</h3>
                    <p className="mt-1.5 text-xs leading-snug text-zinc-700 sm:text-sm">{formatWorkoutDescription(drill.description) || "Build your skills with focused, quality repetitions."}</p>
                    <p className="mt-2 font-heading text-sm font-black uppercase leading-none text-black sm:text-base">Total — {formatMinutes(estimatedDrillSeconds(drill))}</p>
                  </div>
                </article>
              )) : <p className="rounded-xl bg-white p-5 text-center text-sm text-zinc-600 shadow-md">Try another style, or tag more drills in the library.</p>}
              {unavailable.length > 0 && <p className="rounded-lg bg-orange-50 p-3 text-center text-xs text-orange-900">No matches yet for: {unavailable.join(", ")}.</p>}
            </div>
            <DialogFooter className="flex shrink-0 flex-row items-center justify-between gap-3 bg-zinc-950 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+.75rem)] text-white sm:p-4">
              <p className="min-w-0 font-heading text-sm font-black uppercase sm:text-base">{estimatedWorkoutMinutes || minutes} min · {result.length} drills</p>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" onClick={build} className="h-11 border-zinc-600 bg-transparent px-3 text-xs font-bold text-white hover:bg-zinc-800 hover:text-white sm:px-4"><Shuffle className="mr-1.5 h-4 w-4" />Another</Button>
                {result.length > 0 && <Button onClick={() => onUseWorkout(result.map((drill) => drill.id))} className="h-12 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 font-black text-black shadow-[0_0_20px_rgba(249,115,22,.45)] hover:brightness-110 sm:px-5">Use Workout <ArrowRight className="ml-1.5 h-4 w-4" /></Button>}
              </div>
          </DialogFooter>
          </section>
        </DialogContent>
      </Dialog>
    </main>
  );
}
