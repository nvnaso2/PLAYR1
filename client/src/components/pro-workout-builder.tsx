import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrillLibraryCard } from "@/components/drill-library-card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        <DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto border border-orange-500/45 bg-zinc-950 text-white shadow-[0_0_50px_rgba(249,115,22,.12)]">
          <DialogHeader className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">Workout generated</p>
            <DialogTitle className="font-heading text-2xl font-black uppercase">{minutes}-minute workout</DialogTitle>
            <DialogDescription className="text-zinc-400">{result.length ? `${result.length} drills matched to your choices.` : "There are no matching drills for these choices yet."}</DialogDescription>
          </DialogHeader>
          {result.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{result.map((drill) => <DrillLibraryCard key={drill.id} drill={drill} link={false} />)}</div> : <p className="rounded-xl border border-orange-500/30 bg-black p-4 text-center text-sm text-zinc-300">Try another style, or tag more drills in the library.</p>}
          {unavailable.length > 0 && <p className="text-center text-xs text-amber-300">No matches yet for: {unavailable.join(", ")}.</p>}
          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" onClick={build} className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"><Shuffle className="mr-2 h-4 w-4" />Build another</Button>
            {result.length > 0 && <Button onClick={() => onUseWorkout(result.map((drill) => drill.id))} className="bg-orange-500 font-bold text-black hover:bg-orange-400">Use this workout <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
