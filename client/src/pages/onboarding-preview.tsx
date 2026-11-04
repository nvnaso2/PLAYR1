import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, Check, Eye, Flame,
  Play, RotateCcw, Target, Trophy, X,
} from "lucide-react";
import AuthPage from "./auth-page";
import logoLandscape from "@assets/PNG_image_auth_trimmed.png";

type Screen = "auth" | "profile" | "hub";
type BaselineId = "full" | "standard" | "quick";
type BaselineOption = {
  id: BaselineId;
  name: string;
  threes: number;
  midrange: number;
  freeThrows: number;
};
type ShotKey = "threes" | "midrange" | "freeThrows";

const baselineOptions: BaselineOption[] = [
  { id: "full", name: "Full", threes: 100, midrange: 40, freeThrows: 25 },
  { id: "standard", name: "Standard", threes: 50, midrange: 40, freeThrows: 25 },
  { id: "quick", name: "Quick", threes: 50, midrange: 20, freeThrows: 15 },
];
const shotTypes: { key: ShotKey; label: string; icon: typeof Target }[] = [
  { key: "threes", label: "3-Pointers", icon: Target },
  { key: "midrange", label: "Mid-Range Pull-Ups", icon: Target },
  { key: "freeThrows", label: "Free Throws", icon: Trophy },
];
const dayNumbers = [1, 2, 3, 4, 5, 6, 7];

function tomorrowAtFive() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("auth");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [day, setDay] = useState(1);
  const [playerName, setPlayerName] = useState("");
  const [trainingDays, setTrainingDays] = useState("");
  const [sessionLength, setSessionLength] = useState("");
  const [nextSession, setNextSession] = useState(tomorrowAtFive);
  const [baselineId, setBaselineId] = useState<BaselineId>("standard");
  const [results, setResults] = useState<Record<ShotKey, string>>({
    threes: "", midrange: "", freeThrows: "",
  });
  const [baselineComplete, setBaselineComplete] = useState(false);
  const [error, setError] = useState("");

  const baseline = baselineOptions.find(item => item.id === baselineId)!;
  const baselineTotal = baseline.threes + baseline.midrange + baseline.freeThrows;
  const attempts = (key: ShotKey) => baseline[key];
  const enteredCount = shotTypes.filter(({ key }) => {
    const made = Number(results[key]);
    return results[key] !== "" && Number.isInteger(made) && made >= 0 && made <= attempts(key);
  }).length;

  function reset() {
    setScreen("auth");
    setAuthMode("login");
    setDay(1);
    setPlayerName("");
    setTrainingDays("");
    setSessionLength("");
    setNextSession(tomorrowAtFive());
    setBaselineId("standard");
    setResults({ threes: "", midrange: "", freeThrows: "" });
    setBaselineComplete(false);
    setError("");
  }

  function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trainingDays || !sessionLength) {
      setError("Complete each field to continue.");
      return;
    }
    setError("");
    setScreen("hub");
  }

  const adminControls = (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-orange-500/25 bg-[#15110e]/95 px-3 py-2 backdrop-blur sm:px-4">
      <div className="flex items-center gap-2 text-orange-300">
        <Eye className="h-4 w-4" />
        <span className="text-[11px] font-bold tracking-wider">PREVIEW MODE</span>
        <span className="hidden text-xs text-white/45 sm:inline">No account or results are saved</span>
      </div>
      <div className="flex gap-2">
        <button onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold hover:bg-white/15" data-testid="button-restart-preview">
          <RotateCcw className="h-3.5 w-3.5" /> Restart
        </button>
        <button onClick={() => navigate("/admin")} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold hover:bg-white/15" data-testid="button-exit-preview">
          <X className="h-3.5 w-3.5" /> Exit
        </button>
      </div>
    </div>
  );

  if (screen === "auth") {
    return (
      <div data-testid="onboarding-auth-preview">
        {adminControls}
        <AuthPage
          previewMode
          initialMode={authMode}
          onPreviewLogin={() => { setAuthMode("login"); setScreen("hub"); }}
          onPreviewRegister={() => { setAuthMode("register"); setScreen("profile"); }}
        />
      </div>
    );
  }

  if (screen === "profile") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black px-5 py-20 text-[#f5f2eb] sm:px-8" data-testid="onboarding-profile-preview">
        {adminControls}
        <section className="w-full max-w-[440px]">
          <img src={logoLandscape} alt="PLAYR1" className="mx-auto mb-8 h-11 w-[190px] object-contain object-center mix-blend-screen" />
          <button type="button" onClick={() => setScreen("auth")} className="mb-5 inline-flex min-h-9 items-center gap-2 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f07836]">
            <span className="h-px w-7 bg-[#f07836]" /> One last step
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase leading-tight tracking-wide sm:text-4xl">Complete your profile</h1>
          <p className="mb-6 mt-2 text-sm text-[#a6a39c]">Tell us when you train so PLAYR1 can start with your schedule.</p>
          <form onSubmit={handleProfile} className="space-y-4">
            <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">
              Name
              <input required autoComplete="name" placeholder="Your name" value={playerName} onChange={event => setPlayerName(event.target.value)}
                className="h-12 rounded-md border border-[#45433f] bg-[#201f1d] px-4 text-[15px] text-[#f5f2eb] outline-none placeholder:text-[#96928a] focus:border-[#f07836]" />
            </label>
            <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">
              How often do you train outside of practice?
              <select required value={trainingDays} onChange={event => setTrainingDays(event.target.value)} className="h-12 rounded-md border border-[#45433f] bg-[#201f1d] px-4 text-[15px] text-[#f5f2eb] outline-none focus:border-[#f07836]">
                <option value="" disabled>Select days per week</option>
                {[1, 2, 3, 4, 5, 6, 7].map(days => <option key={days} value={days}>{days === 7 ? "Every day" : `${days} ${days === 1 ? "day" : "days"} a week`}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">
              How long is your next training session?
              <select required value={sessionLength} onChange={event => setSessionLength(event.target.value)} className="h-12 rounded-md border border-[#45433f] bg-[#201f1d] px-4 text-[15px] text-[#f5f2eb] outline-none focus:border-[#f07836]">
                <option value="" disabled>Choose session length</option>
                {[20, 30, 45, 60, 75, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">
              When is your next training session?
              <input required type="datetime-local" value={nextSession} onChange={event => setNextSession(event.target.value)} className="h-12 rounded-md border border-[#45433f] bg-[#201f1d] px-4 text-[15px] text-[#f5f2eb] outline-none focus:border-[#f07836]" />
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="mt-2 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-md border border-[#f07836] bg-[#f07836] px-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#17120f] transition hover:bg-[#ff8b4b]">
              Complete profile and start your PLAYR1 journey <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#090909] pb-24 text-white" data-testid="onboarding-hub-preview">
      {adminControls}
      <header className="sticky top-[53px] z-30 flex h-[66px] items-center justify-center border-b border-white/10 bg-black/95 px-4 backdrop-blur">
        <img src={logoLandscape} alt="PLAYR1" className="h-9 w-[170px] object-contain object-center mix-blend-screen" />
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <section className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-400">Your first week</p>
            <h1 className="mt-1 text-2xl font-extrabold">{playerName ? `Welcome, ${playerName}` : "Welcome to PLAYR1"}</h1>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400"><Flame className="h-5 w-5" /></span>
        </section>

        <section className="rounded-2xl border border-orange-500/20 bg-[#111] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Your PLAYR1 journey</p>
              <h2 className="mt-1 text-lg font-bold">One step at a time</h2>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Days in your onboarding journey">
            {dayNumbers.map(number => (
              <button key={number} onClick={() => setDay(number)} aria-current={day === number ? "step" : undefined}
                className={`min-w-[72px] rounded-lg border px-3 py-2.5 text-left transition ${day === number ? "border-orange-500 bg-orange-500 text-black" : number === 1 ? "border-white/15 bg-black text-zinc-300" : "border-white/10 bg-black/40 text-zinc-600"}`}>
                <span className="block text-[10px] font-bold uppercase tracking-wider">Day</span>
                <span className="block text-lg font-black">{number}</span>
              </button>
            ))}
          </nav>
        </section>

        {day === 1 ? (
          <section className="mt-5 space-y-5">
            {!baselineComplete ? (
              <div className="rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400"><Target className="h-5 w-5" /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Day 1 · Your first workout</p>
                    <h2 className="mt-1 text-xl font-extrabold">Set your shooting baseline</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">One session. Choose the volume that fits your time, then enter your makes.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {baselineOptions.map(option => {
                    const total = option.threes + option.midrange + option.freeThrows;
                    return (
                      <button key={option.id} onClick={() => { setBaselineId(option.id); setResults({ threes: "", midrange: "", freeThrows: "" }); }} aria-pressed={baselineId === option.id}
                        className={`rounded-xl border p-3 text-left ${baselineId === option.id ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/25"}`}>
                        <span className="flex items-center justify-between gap-2 text-sm font-bold">{option.name}<span className="text-xs text-orange-300">{total} shots</span></span>
                        <span className="mt-1 block text-xs leading-5 text-zinc-400">{option.threes} threes · {option.midrange} mid-range · {option.freeThrows} free throws</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {shotTypes.map(({ key, label, icon: Icon }) => {
                    const max = attempts(key);
                    const made = Number(results[key]);
                    const valid = results[key] !== "" && Number.isInteger(made) && made >= 0 && made <= max;
                    return (
                      <label key={key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-300"><Icon className="h-4 w-4 text-orange-400" />{label}</span>
                        <span className="flex items-center gap-2 text-sm text-zinc-500">
                          <input type="number" min={0} max={max} step={1} inputMode="numeric" value={results[key]} aria-label={`${label} makes`}
                            onChange={event => setResults(current => ({ ...current, [key]: event.target.value }))}
                            className="h-10 w-16 rounded-md border border-white/10 bg-[#111] px-2 text-center font-bold text-white outline-none focus:border-orange-500" />
                          <span>of {max}</span>
                          {valid && <span className="ml-auto text-xs font-bold text-orange-300">{Math.round(made / max * 100)}%</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                  <span>{enteredCount} of 3 results entered</span><span>{sessionLength || "—"} min planned</span>
                </div>
                <button disabled={enteredCount !== 3} onClick={() => setBaselineComplete(true)}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500">
                  Log baseline <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-orange-500/20 bg-[#111] p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Baseline complete</p>
                <h2 className="mt-1 text-xl font-extrabold">This is your starting point.</h2>
                <p className="mt-1 text-sm text-zinc-400">{baselineTotal} shots logged in one session.</p>
                <div className="mt-5 space-y-4">
                  {shotTypes.map(({ key, label }) => {
                    const max = attempts(key);
                    const made = Number(results[key]);
                    const percent = Math.round(made / max * 100);
                    return (
                      <div key={key}>
                        <div className="mb-1.5 flex justify-between gap-3 text-sm">
                          <span className="text-zinc-300">{label}</span><span className="font-bold">{made}/{max} · {percent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-300 transition-all duration-700" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setBaselineComplete(false)} className="mt-4 text-xs font-semibold text-zinc-500 underline underline-offset-4 hover:text-white">Edit results</button>
              </div>
            )}

            {baselineComplete && (
              <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]" data-testid="card-day-one-trailer">
                <div className="p-4 sm:p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Your PLAYR1 story starts now</p>
                  <h2 className="mt-1 text-lg font-extrabold">Watch the trailer</h2>
                  <p className="mt-1 text-sm text-zinc-400">See what you can build from here.</p>
                </div>
                <video className="aspect-video w-full bg-black object-cover" controls preload="metadata" playsInline src="/welcome.mp4">
                  Your browser does not support embedded video.
                </video>
              </section>
            )}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Day {day}</p>
            <h2 className="mt-2 text-xl font-extrabold">This day’s experience is coming next.</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">The journey will reveal new Hub content over time. Only Day 1 is included in this preview.</p>
          </section>
        )}
      </div>
      <nav aria-label="PLAYR1 navigation" className="fixed inset-x-0 bottom-0 z-30 flex h-[66px] items-center justify-around border-t border-white/10 bg-black/95 text-[10px] text-zinc-500">
        <span className="px-3 py-2">Train</span><span className="px-3 py-2">Dashboard</span><span className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-black">Hub</span><span className="px-3 py-2">Coach P</span><span className="px-3 py-2">Profile</span>
      </nav>
    </main>
  );
}
