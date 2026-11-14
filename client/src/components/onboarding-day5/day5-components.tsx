import { useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Clock, Dumbbell, X } from "lucide-react";
import type { Drill, WorkoutDrill } from "@shared/schema";
import { DrillDiagramPreview } from "@/components/drill-diagram-preview";
import { Button } from "@/components/ui/button";
import { formatWorkoutDescription } from "@/lib/workout-description";
import { ProfileSummaryCard } from "@/components/profile/profile-summary-card";

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
  profilePhotoDataUrl?: string;
};

export const EMPTY_DAY_FIVE_PROFILE: DayFiveProfileDraft = {
  displayName: "", jerseyNumber: "", city: "", state: "", country: "", heightFeet: "", heightInches: "",
  weight: "", wingspan: "", schoolName: "", gradeLevel: "", gradYear: "", gpa: "", headline: "", bio: "",
  cardCareerStats: ["ppg", "rpg", "apg"],
};

export function readDayFiveProfileDraft(): DayFiveProfileDraft {
  try {
    const saved = JSON.parse(sessionStorage.getItem("playr1-onboarding-day5-profile") || "{}");
    const setup = JSON.parse(sessionStorage.getItem("playr1-onboarding-preview") || "{}");
    return { ...EMPTY_DAY_FIVE_PROFILE, ...saved, displayName: saved.displayName || setup.playerName || "" };
  } catch {
    return EMPTY_DAY_FIVE_PROFILE;
  }
}

export function mergeDayFiveProfileDraft(userProfile: any, playerProfile: any): DayFiveProfileDraft {
  let saved: Partial<DayFiveProfileDraft> = {};
  try {
    saved = JSON.parse(sessionStorage.getItem("playr1-onboarding-day5-profile") || "{}");
  } catch {}
  const base = {
    ...EMPTY_DAY_FIVE_PROFILE,
    displayName: userProfile?.displayName || playerProfile?.displayName || "",
    jerseyNumber: String(playerProfile?.jerseyNumber ?? ""),
    city: userProfile?.city || "",
    state: userProfile?.state || "",
    country: userProfile?.country || "",
    heightFeet: String(playerProfile?.heightFeet ?? ""),
    heightInches: String(playerProfile?.heightInches ?? ""),
    weight: String(playerProfile?.weight ?? ""),
    wingspan: String(playerProfile?.wingspan ?? ""),
    schoolName: playerProfile?.schoolName || "",
    gradeLevel: playerProfile?.gradeLevel || "",
    gradYear: String(playerProfile?.gradYear ?? ""),
    gpa: String(playerProfile?.gpa ?? ""),
    headline: playerProfile?.headline || "",
    bio: playerProfile?.bio || "",
  };
  return {
    ...base,
    ...saved,
    displayName: saved.displayName || base.displayName,
    cardCareerStats: saved.cardCareerStats?.length ? saved.cardCareerStats : EMPTY_DAY_FIVE_PROFILE.cardCareerStats,
  };
}

const CARD_STATS = [
  ["ppg", "PPG"], ["rpg", "RPG"], ["apg", "APG"],
  ["spg", "SPG"], ["bpg", "BPG"], ["games", "GP"], ["record", "W-L"],
] as const;

export function DayFiveProfileStep({
  initialValue,
  onContinue,
  onBack,
}: {
  initialValue: DayFiveProfileDraft;
  onContinue: (draft: DayFiveProfileDraft) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [step, setStep] = useState(0);
  const set = (key: keyof DayFiveProfileDraft, value: string) => setDraft((current) => {
    const next = { ...current, [key]: value };
    sessionStorage.setItem("playr1-onboarding-day5-profile", JSON.stringify(next));
    return next;
  });
  const toggleStat = (stat: string) => setDraft((current) => {
    const includes = current.cardCareerStats.includes(stat);
    let next = current;
    if (includes && current.cardCareerStats.length > 1) {
      next = { ...current, cardCareerStats: current.cardCareerStats.filter((item) => item !== stat) };
    } else if (!includes && current.cardCareerStats.length < 3) {
      next = { ...current, cardCareerStats: [...current.cardCareerStats, stat] };
    }
    sessionStorage.setItem("playr1-onboarding-day5-profile", JSON.stringify(next));
    return next;
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step < 2) setStep((current) => current + 1);
    else onContinue(draft);
  };
  const fieldClass = "auth-pill-input h-12 w-full px-4 text-sm text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0";
  const labelClass = "grid gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]";
  const field = (key: keyof DayFiveProfileDraft, title: string, placeholder: string, props: Record<string, any> = {}) => (
    <label className={labelClass}>{title}<input className={fieldClass} value={String(draft[key] ?? "")} onChange={(event) => set(key, event.target.value)} placeholder={placeholder} {...props} /></label>
  );

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-black px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] text-white sm:px-8" data-testid="day-five-profile-step">
      <section className="mx-auto flex min-h-0 w-full max-w-[520px] flex-1 flex-col">
        <button type="button" onClick={onBack} className="mb-3 flex w-fit items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Profile</button>
        <div className="flex items-end justify-between">
          <h1 className="font-heading text-3xl font-black uppercase leading-tight">Finish your profile</h1>
          <span className="font-mono text-xs font-bold text-orange-400">{String(step + 1).padStart(2, "0")} / 03</span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-label={`Page ${step + 1} of 3`}>
          {[0, 1, 2].map((index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-orange-500" : "bg-white/15"}`} />)}
        </div>
        <form onSubmit={submit} className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3">
            {step === 0 && <>
              <h2 className="font-heading text-lg font-black uppercase">Player details</h2>
              <div className="grid grid-cols-[1fr_88px] gap-2">{field("displayName", "Name", "Name on your card")}{field("jerseyNumber", "Jersey #", "00", { inputMode: "numeric", maxLength: 2, onChange: (event: ChangeEvent<HTMLInputElement>) => set("jerseyNumber", event.target.value.replace(/\D/g, "").slice(0, 2)) })}</div>
              <div className="grid grid-cols-2 gap-2">{field("city", "City", "City")}{field("state", "State / region", "State")}</div>
              {field("country", "Country", "Country")}
            </>}
            {step === 1 && <>
              <h2 className="font-heading text-lg font-black uppercase">Physical & academics</h2>
              <div className="grid grid-cols-3 gap-2">{field("heightFeet", "Height · ft", "6", { inputMode: "numeric", maxLength: 1 })}{field("heightInches", "Height · in", "2", { inputMode: "numeric", maxLength: 2 })}{field("weight", "Weight", "180 lb", { inputMode: "numeric" })}</div>
              {field("wingspan", "Wingspan", "6'5&quot;")}
              {field("schoolName", "School", "School name")}
              <div className="grid grid-cols-3 gap-2">{field("gradeLevel", "Grade", "Junior")}{field("gradYear", "Grad year", "2027", { inputMode: "numeric", maxLength: 4 })}{field("gpa", "GPA", "3.5", { inputMode: "decimal" })}</div>
            </>}
            {step === 2 && <>
              <h2 className="font-heading text-lg font-black uppercase">About & card stats</h2>
              {field("headline", "Headline", "A line about your game", { maxLength: 120 })}
              <label className={labelClass}>Bio<textarea maxLength={1000} rows={3} className="auth-pill-input min-h-24 w-full resize-none px-4 py-3 text-sm text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0" value={draft.bio} onChange={(event) => set("bio", event.target.value)} placeholder="Your basketball journey" /></label>
              <fieldset className="space-y-2">
                <legend className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">Card stats</legend>
                <div className="flex flex-wrap gap-2">
                  {CARD_STATS.map(([value, label]) => <button key={value} type="button" aria-pressed={draft.cardCareerStats.includes(value)} onClick={() => toggleStat(value)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${draft.cardCareerStats.includes(value) ? "border-orange-300 bg-orange-500/15 text-orange-100" : "border-white/15 bg-[#090909] text-zinc-400"}`}>{label}</button>)}
                </div>
              </fieldset>
            </>}
          </div>
          <div className="mt-4 flex shrink-0 gap-2">
            {step > 0 && <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} className="h-12 flex-1 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
            <Button type="submit" className="h-12 flex-1 rounded-full bg-orange-500 font-black uppercase tracking-wide text-black hover:bg-orange-400" data-testid="button-day-five-profile-continue">
              {step === 2 ? "Finish profile" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

export function DayFiveProfileLanding({
  initialValue, user, existingPhotoUrl, onEditProfile, onChange,
}: {
  initialValue: DayFiveProfileDraft;
  user?: any;
  existingPhotoUrl?: string;
  onEditProfile: () => void;
  onChange: (draft: DayFiveProfileDraft) => void;
}) {
  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-black px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+2rem)] text-white sm:px-8" data-testid="day-five-profile-landing">
      <section className="mx-auto w-full max-w-xl">
        <ProfileSummaryCard
          user={user}
          userProfile={{ displayName: initialValue.displayName, city: initialValue.city, state: initialValue.state, country: initialValue.country }}
          playerProfile={{ headline: initialValue.headline, bio: initialValue.bio, heightFeet: initialValue.heightFeet, heightInches: initialValue.heightInches, weight: initialValue.weight, wingspan: initialValue.wingspan, gradYear: initialValue.gradYear, gpa: initialValue.gpa }}
          career={{ jerseyNumber: initialValue.jerseyNumber ? Number(initialValue.jerseyNumber) : null, positions: [] }}
          careerStats={null}
          isLoading={false}
          onEditProfile={onEditProfile}
          onOpenPro={() => undefined}
          onSettings={() => undefined}
          onboardingMode
          avatarSrcOverride={initialValue.profilePhotoDataUrl || existingPhotoUrl}
          onUploadPhoto={() => document.getElementById("day-five-profile-photo")?.click()}
        />
        <input id="day-five-profile-photo" type="file" accept="image/*" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 640 / Math.max(image.width, image.height));
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
            const next = { ...initialValue, profilePhotoDataUrl: canvas.toDataURL("image/jpeg", 0.82) };
            sessionStorage.setItem("playr1-onboarding-day5-profile", JSON.stringify(next));
            onChange(next);
            URL.revokeObjectURL(url);
            event.target.value = "";
          };
          image.onerror = () => URL.revokeObjectURL(url);
          image.src = url;
        }} />
      </section>
    </main>
  );
}

export function DayFiveHubActionSurface({
  artwork, profile, user, existingPhotoUrl, onEditProfile, onProfileChange, onPreviewWorkout,
}: {
  artwork?: string;
  profile: DayFiveProfileDraft;
  user?: any;
  existingPhotoUrl?: string;
  onEditProfile: () => void;
  onProfileChange: (draft: DayFiveProfileDraft) => void;
  onPreviewWorkout: () => void;
}) {
  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-3 pb-1 text-white" data-testid="card-day-five-mission">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProfileSummaryCard
          user={user}
          userProfile={{ displayName: profile.displayName, city: profile.city, state: profile.state, country: profile.country }}
          playerProfile={{ headline: profile.headline, bio: profile.bio, heightFeet: profile.heightFeet, heightInches: profile.heightInches, weight: profile.weight, wingspan: profile.wingspan, gradYear: profile.gradYear, gpa: profile.gpa }}
          career={{ jerseyNumber: profile.jerseyNumber ? Number(profile.jerseyNumber) : null, positions: [] }}
          careerStats={null}
          isLoading={false}
          onEditProfile={onEditProfile}
          onOpenPro={() => undefined}
          onSettings={() => undefined}
          onboardingMode
          avatarSrcOverride={profile.profilePhotoDataUrl || existingPhotoUrl}
          onUploadPhoto={() => document.getElementById("day-five-hub-photo")?.click()}
        />
        <input id="day-five-hub-photo" type="file" accept="image/*" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 640 / Math.max(image.width, image.height));
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
            const next = { ...profile, profilePhotoDataUrl: canvas.toDataURL("image/jpeg", 0.82) };
            sessionStorage.setItem("playr1-onboarding-day5-profile", JSON.stringify(next));
            onProfileChange(next);
            URL.revokeObjectURL(url);
            event.target.value = "";
          };
          image.onerror = () => URL.revokeObjectURL(url);
          image.src = url;
        }} />
      </div>
      <button type="button" onClick={onPreviewWorkout} className="flex h-[150px] shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-zinc-300 bg-[#f6f6f4] p-3 text-left text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 sm:h-[170px] sm:p-4" data-testid="button-preview-day-five-workout">
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-2xl font-black uppercase leading-none">Workout <span className="text-orange-600">#3</span></span>
          <span className="mt-1 block font-heading text-sm font-black uppercase">Game-Like Reps</span>
          <span className="mt-1 block text-[10px] font-semibold text-zinc-600">6 drills · 140 shots</span>
          <span className="mt-3 inline-flex min-h-8 items-center gap-1 rounded-md bg-black px-3 text-[10px] font-black uppercase text-white">Preview workout <ChevronRight className="h-3.5 w-3.5 text-orange-400" /></span>
        </span>
        {artwork && <img src={artwork} alt="" className="h-full w-[36%] shrink-0 object-contain mix-blend-multiply" />}
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
