import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrillCard } from "@/components/drill-card";
import { DrillLibraryCard } from "@/components/drill-library-card";
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
  onBuildYourOwn,
}: {
  drills: Drill[];
  onUseWorkout: (ids: string[]) => void;
  onBuildYourOwn: () => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [skills, setSkills] = useState<WorkoutSkillTag[]>([]);
  const [formats, setFormats] = useState<Record<string, string[]>>({});
  const [level, setLevel] = useState<DifficultyLevel>("intermediate");
  const [result, setResult] = useState<Drill[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);

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
      const eligible = drills.filter((drill) => {
        const hasSkill = getWorkoutSkillTags(drill).includes(skill);
        const hasSelectedFormat = selectedFormats.includes(MIX_WORKOUT_TAG)
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
  };

  const activeSkills = useMemo(() => WORKOUT_SKILL_OPTIONS.filter((item) => skills.includes(item.value)), [skills]);
  const formatsForSkill = (skill: WorkoutSkillTag) => WORKOUT_FORMAT_OPTIONS.filter((option) => (option.skills as readonly string[]).includes(skill));

  return (
    <main className="min-h-full bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-400">Pro-level builder · Open to everyone</p>
            <h1 className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">Build your workout</h1>
            <p className="mt-2 text-sm text-zinc-400">Choose your time and focus. PLAYR1 will put the session together.</p>
          </div>
          <Button variant="ghost" onClick={onBuildYourOwn} className="text-zinc-300">Choose drills yourself</Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-200"><Clock3 className="h-4 w-4 text-orange-400" />How long is your workout?</h2>
              <div className="flex flex-wrap gap-2">{DURATIONS.map((value) => <button key={value} type="button" onClick={() => { setMinutes(value); setResult([]); }} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${minutes === value ? "border-orange-400 bg-orange-500 text-black" : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"}`}>{value} min</button>)}</div>
            </div>

            <div>
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-zinc-200">What skills do you want to work on?</h2>
              <p className="mb-3 text-xs text-zinc-500">Select as many as you like, then choose a style for each.</p>
              <div className="flex flex-wrap gap-2">{WORKOUT_SKILL_OPTIONS.map((item) => <button key={item.value} type="button" onClick={() => toggleSkill(item.value)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${skills.includes(item.value) ? "border-orange-400 bg-orange-500/15 text-orange-200" : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"}`}>{item.label}</button>)}</div>
              <div className="mt-4 space-y-4">{activeSkills.map((skill) => <div key={skill.value} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{skill.label}</p><div className="flex flex-wrap gap-2">{formatsForSkill(skill.value).map((option) => <button key={option.value} type="button" onClick={() => toggleFormat(skill.value, option.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${formats[skill.value]?.includes(option.value) ? "border-white bg-white text-black" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>{option.label}</button>)}</div></div>)}</div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-200">Choose a level</h2>
              <div className="grid grid-cols-3 gap-2">{LEVELS.map((value) => <button key={value} type="button" onClick={() => { setLevel(value); setResult([]); }} className={`rounded-lg border px-3 py-3 text-sm font-bold capitalize ${level === value ? "border-orange-400 bg-orange-500 text-black" : "border-zinc-700 bg-zinc-950 text-zinc-300"}`}>{value}</button>)}</div>
              <p className="mt-2 text-xs text-zinc-500">Your selected level is the highest used; easier drills can be included.</p>
            </div>

            <Button onClick={build} disabled={!skills.length || skills.some((skill) => !formats[skill]?.length)} className="h-12 w-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400"><Shuffle className="mr-2 h-4 w-4" />Build my workout</Button>
          </div>

          <aside className="min-h-64 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-4 sm:p-5">
            {!result.length ? <div className="flex h-full min-h-56 flex-col justify-end"><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-500">Your session</p><h2 className="mt-2 text-2xl font-black text-white">{minutes} minutes</h2><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{skills.length ? `${skills.length} skill${skills.length === 1 ? "" : "s"} selected` : "Your selected drills will appear here."}</p>{unavailable.length > 0 && <p className="mt-4 text-xs leading-5 text-amber-300">No matching drills yet for {unavailable.join(", ")}. Try another style or tag more drills in the library.</p>}</div> : <><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{minutes} minute workout</p><h2 className="mt-1 text-xl font-black">{result.length} drills</h2></div><Check className="h-5 w-5 text-orange-400" /></div><div className="grid grid-cols-2 gap-3">{result.map((drill) => <DrillLibraryCard key={drill.id} drill={drill} link={false} />)}</div>{unavailable.length > 0 && <p className="mt-4 text-xs text-amber-300">No matching drills yet for: {unavailable.join(", ")}.</p>}<Button onClick={() => onUseWorkout(result.map((drill) => drill.id))} className="mt-4 w-full bg-white font-bold text-black hover:bg-zinc-200">Use this workout <ArrowRight className="ml-2 h-4 w-4" /></Button></>}
          </aside>
        </section>
      </div>
    </main>
  );
}
