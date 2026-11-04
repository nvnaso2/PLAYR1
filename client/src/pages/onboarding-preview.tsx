import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Eye, Play,
  RotateCcw, Target, Trophy, UserRound, X,
} from "lucide-react";

type DayOneStage = "setup" | "baseline" | "complete";
type BaselineOption = {
  id: "full" | "standard" | "quick";
  label: string;
  description: string;
  threes: number;
  midrange: number;
  freeThrows: number;
};

const baselineOptions: BaselineOption[] = [
  { id: "full", label: "Full baseline", description: "More reps for a detailed starting point", threes: 100, midrange: 40, freeThrows: 25 },
  { id: "standard", label: "Standard baseline", description: "A balanced first-day session", threes: 50, midrange: 40, freeThrows: 25 },
  { id: "quick", label: "Quick baseline", description: "A shorter session to get started", threes: 50, midrange: 20, freeThrows: 15 },
];

const baselineDrills = [
  { key: "threes", label: "Three-pointers", icon: Target },
  { key: "midrange", label: "Mid-range pull-ups", icon: Target },
  { key: "freeThrows", label: "Free throws", icon: Trophy },
] as const;

const dayLabels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

function localDateTimeDefault() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const [activeDay, setActiveDay] = useState(1);
  const [stage, setStage] = useState<DayOneStage>("setup");
  const [baselineId, setBaselineId] = useState<BaselineOption["id"]>("standard");
  const [baselineResults, setBaselineResults] = useState<Record<"threes" | "midrange" | "freeThrows", string>>({
    threes: "", midrange: "", freeThrows: "",
  });
  const [trainingDays, setTrainingDays] = useState("");
  const [sessionLength, setSessionLength] = useState("");
  const [formError, setFormError] = useState("");

  const baseline = baselineOptions.find(option => option.id === baselineId)!;
  const attempts = baseline.threes + baseline.midrange + baseline.freeThrows;
  const completed = baselineDrills.filter(({ key }) => {
    const value = baselineResults[key];
    const made = Number(value);
    return value !== "" && Number.isInteger(made) && made >= 0 && made <= baseline[key];
  });

  const restart = () => {
    setActiveDay(1);
    setStage("setup");
    setBaselineId("standard");
    setBaselineResults({ threes: "", midrange: "", freeThrows: "" });
    setTrainingDays("");
    setSessionLength("");
    setFormError("");
  };

  const continueToBaseline = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || !trainingDays || !sessionLength) {
      setFormError("Complete each field to continue through the preview.");
      return;
    }
    setFormError("");
    setStage("baseline");
  };

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-orange-500/25 bg-[#15110e]/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-orange-300">
          <Eye className="h-4 w-4" />
          <span className="text-xs font-bold tracking-wider">ONBOARDING PREVIEW</span>
          <span className="hidden text-xs text-white/50 sm:inline">No information is saved</span>
        </div>
        <div className="flex gap-2">
          <button onClick={restart} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold hover:bg-white/15" data-testid="button-restart-preview">
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button onClick={() => navigate("/admin")} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold hover:bg-white/15" data-testid="button-exit-preview">
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-8">
        <header className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-400">PLAYR1 · New player journey</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Seven days to build a training habit.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Preview each day of the proposed onboarding. Day 1 is interactive; later days are reserved for the next design pass.
          </p>
        </header>

        <nav aria-label="Onboarding preview days" className="mb-7 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {dayLabels.map((label, index) => {
            const day = index + 1;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                aria-current={activeDay === day ? "step" : undefined}
                className={`min-h-12 rounded-lg border px-2 text-sm font-bold transition-colors ${
                  activeDay === day
                    ? "border-orange-500 bg-orange-500 text-black"
                    : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-orange-500/50 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {activeDay !== 1 ? (
          <section className="rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
              <CalendarDays className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Day {activeDay}</p>
            <h2 className="mt-2 text-2xl font-extrabold">This day is not designed yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              The day selector is ready for the seven-day plan. Day {activeDay} content will be added once its purpose and player activity are defined.
            </p>
            <button onClick={() => setActiveDay(activeDay - 1)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" /> Previous day
            </button>
          </section>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-black">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Day 1 · Start simple</p>
                <h2 className="text-xl font-extrabold">Set up your first training week</h2>
              </div>
            </div>

            {stage === "setup" && (
              <form onSubmit={continueToBaseline} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-7">
                  <h3 className="text-lg font-bold">Create your account</h3>
                  <p className="mb-5 mt-1 text-sm text-zinc-400">Just the basics to get started.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      Name
                      <input required autoComplete="name" placeholder="Your name" className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white outline-none placeholder:text-zinc-600 focus:border-orange-500" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      Email
                      <input required type="email" autoComplete="email" placeholder="you@example.com" className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white outline-none placeholder:text-zinc-600 focus:border-orange-500" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      Password
                      <input required type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white outline-none placeholder:text-zinc-600 focus:border-orange-500" />
                    </label>
                  </div>
                  <div className="my-6 border-t border-white/10" />
                  <h3 className="text-lg font-bold">Plan your next session</h3>
                  <p className="mb-5 mt-1 text-sm text-zinc-400">We’ll use this to shape your first week.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">
                      How often do you train outside practice?
                      <select required value={trainingDays} onChange={event => setTrainingDays(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white outline-none focus:border-orange-500">
                        <option value="" disabled>Select days per week</option>
                        {[1, 2, 3, 4, 5, 6, 7].map(days => <option key={days} value={days}>{days === 7 ? "Every day" : `${days} ${days === 1 ? "day" : "days"} a week`}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      How long will you train?
                      <select required value={sessionLength} onChange={event => setSessionLength(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white outline-none focus:border-orange-500">
                        <option value="" disabled>Choose session length</option>
                        {[20, 30, 45, 60, 75, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      When is your next training session?
                      <input required type="datetime-local" defaultValue={localDateTimeDefault()} className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white outline-none focus:border-orange-500" />
                    </label>
                  </div>
                  {formError && <p role="alert" className="mt-4 text-sm text-red-400">{formError}</p>}
                  <button type="submit" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 font-bold text-black transition hover:bg-orange-400">
                    Continue to your one-day baseline <ArrowRight className="h-4 w-4" />
                  </button>
                </section>

                <aside className="flex flex-col gap-5">
                  <section className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-5 sm:p-6">
                    <div className="mb-3 flex items-center gap-2 text-orange-400"><CalendarDays className="h-5 w-5" /><span className="text-sm font-bold">Your schedule comes first</span></div>
                    <p className="text-sm leading-6 text-zinc-300">The first questions set a realistic training rhythm around the player’s next session—not a long questionnaire up front.</p>
                  </section>
                  <section className="rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2 text-sm font-bold"><Play className="h-4 w-4 text-orange-400" /> Day 1 at a glance</div>
                    <ol className="space-y-3 text-sm text-zinc-300">
                      <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-bold text-orange-300">1</span><span>Quick account and schedule setup</span></li>
                      <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-bold text-orange-300">2</span><span>Complete one shooting baseline session</span></li>
                      <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-bold text-orange-300">3</span><span>Watch the PLAYR1 trailer</span></li>
                    </ol>
                  </section>
                </aside>
              </form>
            )}

            {stage === "baseline" && (
              <section className="rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-8">
                <button onClick={() => setStage("setup")} className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4" /> Back to setup
                </button>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">One session · Day 1</p>
                <h3 className="mt-2 text-2xl font-extrabold">Set your shooting baseline</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Choose one volume. All three shooting checks happen in this single session; the smaller option simply uses fewer attempts.
                </p>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {baselineOptions.map(option => {
                    const total = option.threes + option.midrange + option.freeThrows;
                    const selected = baselineId === option.id;
                    return (
                      <button key={option.id} type="button" onClick={() => { setBaselineId(option.id); setBaselineResults({ threes: "", midrange: "", freeThrows: "" }); }}
                        aria-pressed={selected}
                        className={`rounded-xl border p-4 text-left transition ${
                          selected ? "border-orange-500 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.12)]" : "border-white/10 bg-black/30 hover:border-white/25"
                        }`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold">{option.label}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selected ? "bg-orange-500 text-black" : "bg-white/10 text-zinc-300"}`}>{total} shots</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{option.description}</p>
                        <p className="mt-4 text-sm font-semibold leading-6 text-zinc-200">{option.threes} threes · {option.midrange} mid-range · {option.freeThrows} free throws</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-7 rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold">Your one-day baseline</h4>
                      <p className="mt-1 text-sm text-zinc-400">Complete all three checks in your next training session.</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300"><Clock3 className="h-4 w-4 text-orange-400" /> {sessionLength || "—"} min planned</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {baselineDrills.map(drill => {
                      const Icon = drill.icon;
                      const count = baseline[drill.key];
                      return (
                        <div key={drill.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <div className="mb-3 flex items-center gap-2">
                            <Icon className="h-5 w-5 shrink-0 text-orange-400" />
                            <span className="min-w-0 flex-1 text-sm font-semibold">{drill.label}</span>
                            {completed.some(item => item.key === drill.key) && <Check className="h-4 w-4 text-emerald-400" />}
                          </div>
                          <label className="flex items-center gap-2 text-sm text-zinc-400">
                            Makes
                            <input type="number" inputMode="numeric" min={0} max={count} step={1}
                              aria-label={`${drill.label} made out of ${count}`}
                              placeholder="0"
                              value={baselineResults[drill.key]}
                              onChange={event => setBaselineResults(current => ({ ...current, [drill.key]: event.target.value }))}
                              className="h-10 w-20 rounded-md border border-white/10 bg-black px-2 text-center font-bold text-white outline-none focus:border-orange-500"
                            />
                            <span>of {count}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Baseline progress</span>
                    <span className="font-bold">{completed.length} / 3 results entered</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${completed.length / 3 * 100}%` }} />
                  </div>
                  <button disabled={completed.length !== 3} onClick={() => setStage("complete")} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500">
                    Finish Day 1 baseline <Check className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {stage === "complete" && (
              <section className="rounded-2xl border border-emerald-500/25 bg-[#111] p-6 text-center sm:p-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Check className="h-8 w-8" /></div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Day 1 complete</p>
                <h3 className="mt-2 text-2xl font-extrabold">Your baseline is set.</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">
                  {attempts} total attempts recorded. This preview does not save results.
                </p>
                <div className="mx-auto mt-5 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
                  {baselineDrills.map(({ key, label }) => {
                    const made = Number(baselineResults[key]);
                    const total = baseline[key];
                    const percent = total ? Math.round(made / total * 100) : 0;
                    return (
                      <div key={key} className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <p className="text-xs text-zinc-400">{label}</p>
                        <p className="mt-1 text-lg font-extrabold">{made}/{total} <span className="text-sm text-orange-300">{percent}%</span></p>
                      </div>
                    );
                  })}
                </div>
                <div className="mx-auto mt-7 max-w-2xl overflow-hidden rounded-xl border border-white/10 text-left">
                  <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold"><Play className="h-4 w-4 text-orange-400" /> PLAYR1 trailer</div>
                  <video className="aspect-video w-full bg-black object-cover" controls preload="metadata" playsInline src="/welcome.mp4">
                    Your browser does not support embedded video.
                  </video>
                </div>
                <button onClick={() => { setActiveDay(2); setStage("setup"); }} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold hover:bg-white/5">
                  Preview Day 2 <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
