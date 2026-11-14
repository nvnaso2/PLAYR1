import { useState, type FormEvent } from "react";
import { ArrowRight, BarChart3, ChevronRight, Clock, Dumbbell, Pencil, UserRound, X } from "lucide-react";
import type { Drill, WorkoutDrill } from "@shared/schema";
import { DrillDiagramPreview } from "@/components/drill-diagram-preview";
import { Button } from "@/components/ui/button";
import { formatWorkoutDescription } from "@/lib/workout-description";
import logoImg from "@assets/PNG_image_auth_trimmed.png";

export type DayFiveProfileDraft = {
  displayName: string;
  jerseyNumber: string;
  city: string;
  state: string;
  country: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  wingspan: string;
  schoolName: string;
  gradeLevel: string;
  gradYear: string;
  gpa: string;
  headline: string;
  bio: string;
  cardCareerStats: string[];
};

const CARD_STATS = [
  ["ppg", "PPG"], ["rpg", "RPG"], ["apg", "APG"],
  ["spg", "SPG"], ["bpg", "BPG"], ["games", "GP"], ["record", "W-L"],
] as const;

export function DayFiveProfileStep({
  initialValue,
  onContinue,
}: {
  initialValue: DayFiveProfileDraft;
  onContinue: (draft: DayFiveProfileDraft) => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const set = (key: keyof DayFiveProfileDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleStat = (stat: string) => setDraft((current) => {
    const includes = current.cardCareerStats.includes(stat);
    if (includes) return current.cardCareerStats.length > 1
      ? { ...current, cardCareerStats: current.cardCareerStats.filter((item) => item !== stat) }
      : current;
    if (current.cardCareerStats.length >= 3) return current;
    return { ...current, cardCareerStats: [...current.cardCareerStats, stat] };
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onContinue(draft);
  };
  const fieldClass = "auth-pill-input h-[50px] w-full px-4 text-sm text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0";
  const labelClass = "grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]";

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-black px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2.75rem)] text-white sm:px-8" data-testid="day-five-profile-step">
      <section className="mx-auto w-full max-w-[520px]">
        <img src={logoImg} alt="PLAYR1" className="mx-auto mb-6 h-10 w-auto max-w-[190px] object-contain" />
        <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-orange-400">Day 5 · Player Card</p>
        <h1 className="mt-2 font-heading text-3xl font-black uppercase leading-tight">Finish your profile</h1>
        <p className="mt-2 text-sm leading-5 text-zinc-400">Add the details that make your player card yours. Everything here is optional.</p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-heading text-sm font-black uppercase tracking-wide"><UserRound className="h-4 w-4 text-orange-400" />Player Card</h2>
            <div className="grid grid-cols-[1fr_92px] gap-3">
              <label className={labelClass}>Name<input className={fieldClass} value={draft.displayName} onChange={(event) => set("displayName", event.target.value)} placeholder="Name shown on your card" /></label>
              <label className={labelClass}>Jersey #<input inputMode="numeric" maxLength={2} className={fieldClass} value={draft.jerseyNumber} onChange={(event) => set("jerseyNumber", event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="00" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>City<input className={fieldClass} value={draft.city} onChange={(event) => set("city", event.target.value)} placeholder="City" /></label>
              <label className={labelClass}>State / region<input className={fieldClass} value={draft.state} onChange={(event) => set("state", event.target.value)} placeholder="State" /></label>
            </div>
            <label className={labelClass}>Country<input className={fieldClass} value={draft.country} onChange={(event) => set("country", event.target.value)} placeholder="Country" /></label>
            <label className={labelClass}>Headline<input maxLength={120} className={fieldClass} value={draft.headline} onChange={(event) => set("headline", event.target.value)} placeholder="A line that describes your game" /></label>
            <label className={labelClass}>Bio<textarea maxLength={1000} rows={3} className="auth-pill-input w-full resize-y px-4 py-3 text-sm text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0" value={draft.bio} onChange={(event) => set("bio", event.target.value)} placeholder="Your basketball journey, goals, and what makes you stand out" /></label>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-4">
            <h2 className="flex items-center gap-2 font-heading text-sm font-black uppercase tracking-wide"><Dumbbell className="h-4 w-4 text-orange-400" />Physical & Academics</h2>
            <div className="grid grid-cols-3 gap-2">
              <label className={labelClass}>Height · ft<input inputMode="numeric" maxLength={1} className={fieldClass} value={draft.heightFeet} onChange={(event) => set("heightFeet", event.target.value.replace(/\D/g, "").slice(0, 1))} placeholder="6" /></label>
              <label className={labelClass}>Height · in<input inputMode="numeric" maxLength={2} className={fieldClass} value={draft.heightInches} onChange={(event) => set("heightInches", event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="2" /></label>
              <label className={labelClass}>Weight<input inputMode="numeric" className={fieldClass} value={draft.weight} onChange={(event) => set("weight", event.target.value.replace(/\D/g, ""))} placeholder="180 lb" /></label>
            </div>
            <label className={labelClass}>Wingspan<input className={fieldClass} value={draft.wingspan} onChange={(event) => set("wingspan", event.target.value)} placeholder="6'5&quot;" /></label>
            <label className={labelClass}>School<input className={fieldClass} value={draft.schoolName} onChange={(event) => set("schoolName", event.target.value)} placeholder="School name" /></label>
            <div className="grid grid-cols-3 gap-2">
              <label className={labelClass}>Grade<input className={fieldClass} value={draft.gradeLevel} onChange={(event) => set("gradeLevel", event.target.value)} placeholder="Junior" /></label>
              <label className={labelClass}>Grad year<input inputMode="numeric" maxLength={4} className={fieldClass} value={draft.gradYear} onChange={(event) => set("gradYear", event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2027" /></label>
              <label className={labelClass}>GPA<input inputMode="decimal" className={fieldClass} value={draft.gpa} onChange={(event) => set("gpa", event.target.value)} placeholder="3.5" /></label>
            </div>
          </section>

          <fieldset className="space-y-3 border-t border-white/10 pt-4">
            <legend className="flex items-center gap-2 font-heading text-sm font-black uppercase tracking-wide"><BarChart3 className="h-4 w-4 text-orange-400" />Card Stats</legend>
            <p className="text-xs text-zinc-400">Choose up to three career stats to show on your card.</p>
            <div className="flex flex-wrap gap-2">
              {CARD_STATS.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={draft.cardCareerStats.includes(value)} onClick={() => toggleStat(value)} className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${draft.cardCareerStats.includes(value) ? "border-orange-300 bg-orange-500/15 text-orange-100" : "border-white/15 bg-[#090909] text-zinc-400"}`}>{label}</button>
              ))}
            </div>
          </fieldset>

          <Button type="submit" className="h-[54px] w-full rounded-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400" data-testid="button-day-five-profile-continue">
            Continue to Day 5 Hub <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </section>
    </main>
  );
}

export function DayFiveHubActionSurface({
  artwork,
  onEditProfile,
  onPreviewWorkout,
}: {
  artwork?: string;
  onEditProfile: () => void;
  onPreviewWorkout: () => void;
}) {
  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col justify-between gap-3 pb-2 text-white" data-testid="card-day-five-mission">
      <button type="button" onClick={onEditProfile} className="group flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950/80 px-4 py-3 text-left transition hover:border-orange-400/60" data-testid="button-day-five-edit-profile">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/40 bg-orange-500/10 text-orange-300"><Pencil className="h-5 w-5" /></span>
        <span className="flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-orange-300">Player Card</span><span className="font-heading text-base font-black uppercase">Edit Profile</span></span>
        <ChevronRight className="h-5 w-5 text-orange-300 transition group-hover:translate-x-1" />
      </button>
      <button type="button" onClick={onPreviewWorkout} className="group flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-[#f6f6f4] text-left text-zinc-950 shadow-[0_14px_38px_rgba(0,0,0,.3)]" data-testid="button-preview-day-five-workout">
        <span className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
          <span className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(135deg, transparent 0 34%, rgba(0,0,0,.035) 34% 35%, transparent 35% 65%, rgba(0,0,0,.025) 65% 66%, transparent 66%), repeating-linear-gradient(135deg, transparent 0 54px, rgba(0,0,0,.018) 55px 56px, transparent 57px 96px), radial-gradient(ellipse at top right, white, transparent 55%)" }} />
          <span className="relative z-10 border-b-[3px] border-black pb-3">
            <span className="block font-heading text-4xl font-black uppercase leading-none">Workout <span className="text-orange-600">#3</span></span>
            <span className="mt-2 block font-heading text-base font-black uppercase">Game-Like Reps</span>
            <span className="mt-1 block text-xs font-semibold text-zinc-600">6 drills · 140 shots · Advanced shooting</span>
          </span>
          <span className="relative flex min-h-0 flex-1 items-center justify-center">
            {artwork ? <img src={artwork} alt="Workout #3 basketball court diagram" className="max-h-full max-w-full object-contain mix-blend-multiply" /> : <Dumbbell className="h-16 w-16 text-zinc-700" />}
          </span>
          <span className="relative mt-2 flex min-h-12 items-center justify-between rounded-xl bg-black px-4 py-2 text-white">
            <span><span className="block text-xs font-black uppercase">Preview the workout</span><span className="mt-0.5 block text-[10px] text-zinc-400">140 shots · 6 drills</span></span>
            <span className="flex h-7 w-7 items-center justify-center text-orange-400"><ChevronRight className="h-5 w-5" /></span>
          </span>
        </span>
      </button>
    </section>
  );
}

export function DayFiveWorkoutPreview({
  drills, loading, error, onClose, onRetry, onLogWorkout,
}: {
  drills: Array<WorkoutDrill & { drill: Drill }>;
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
  onLogWorkout: () => void;
}) {
  return (
    <section role="dialog" aria-modal="true" aria-labelledby="day-five-workout-title" className="relative flex h-[min(88dvh,920px)] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem)] flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] text-zinc-950 shadow-2xl">
      <button type="button" aria-label="Close workout preview" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full border border-zinc-300 bg-white p-2"><X className="h-4 w-4" /></button>
      <header className="shrink-0 bg-white px-5 pb-4 pt-6 sm:px-8">
        <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Game-Like Reps</p>
        <h2 id="day-five-workout-title" className="font-heading text-5xl font-black uppercase">Workout <span className="text-orange-600">#3</span></h2>
        <div className="mt-3 h-1 bg-black" />
        <p className="mt-3 text-center font-heading text-base font-black uppercase leading-tight sm:text-lg">My recommended 140 shot workout for game-like reps and advanced shooting skills</p>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {loading ? <p className="text-center text-sm text-zinc-500">Loading workout drills…</p> : error ? (
          <div role="alert" className="rounded-xl bg-white p-5 text-sm text-zinc-700">This workout didn’t load. <button type="button" onClick={onRetry} className="font-bold text-orange-700 underline">Try again</button></div>
        ) : drills.map((entry, index) => (
          <article key={entry.drillId} className="grid grid-cols-[112px_1fr] gap-3 rounded-xl bg-white p-3 shadow-md sm:grid-cols-[165px_1fr] sm:gap-5 sm:p-4">
            <figure className="flex aspect-[1.08/1] items-center justify-center"><DrillDiagramPreview diagramData={entry.drill.diagramData} className="h-full w-full" /></figure>
            <div className="self-center">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-orange-600">Drill #{index + 1}</p>
              <h3 className="font-heading text-xl font-black uppercase">{entry.drill.title}</h3>
              <p className="mt-1 text-xs leading-snug text-zinc-700 sm:text-sm">{formatWorkoutDescription(entry.coachingNotes || entry.drill.description)}</p>
              <p className="mt-2 font-heading font-black uppercase">Total — {entry.defaultReps ?? "—"} shots</p>
            </div>
          </article>
        ))}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-4 bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] text-white">
        <p className="font-heading font-black uppercase">140 shots · 6 drills</p>
        <Button type="button" onClick={onLogWorkout} className="flex min-h-12 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 font-black text-black shadow-[0_0_20px_rgba(249,115,22,.45)]">Log Workout <Clock className="h-4 w-4" /></Button>
      </footer>
    </section>
  );
}
