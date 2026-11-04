import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Eye, RotateCcw, X } from "lucide-react";
import AuthPage from "./auth-page";

function tomorrowAtFive() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<"auth" | "profile">("auth");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [playerName, setPlayerName] = useState("");
  const [trainingDays, setTrainingDays] = useState("");
  const [sessionLength, setSessionLength] = useState("");
  const [nextSession, setNextSession] = useState(tomorrowAtFive);
  const [error, setError] = useState("");

  function reset() {
    setScreen("auth");
    setAuthMode("login");
    setPlayerName("");
    setTrainingDays("");
    setSessionLength("");
    setNextSession(tomorrowAtFive());
    setError("");
  }

  function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trainingDays || !sessionLength) {
      setError("Complete each field to continue.");
      return;
    }
    sessionStorage.setItem("playr1-onboarding-preview", JSON.stringify({
      playerName,
      trainingDays: Number(trainingDays),
      sessionLength: Number(sessionLength),
      nextSession,
    }));
    navigate("/hub?preview=onboarding");
  }

  const adminControls = (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between border-b border-orange-500/25 bg-[#15110e]/95 px-3 py-2 backdrop-blur sm:px-4">
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
          onPreviewLogin={() => { setAuthMode("login"); setScreen("profile"); }}
          onPreviewRegister={() => { setAuthMode("register"); setScreen("profile"); }}
        />
      </div>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-black px-5 py-20 text-[#f5f2eb] sm:px-8" data-testid="onboarding-profile-preview">
      {adminControls}
      <section className="w-full max-w-[440px]">
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
