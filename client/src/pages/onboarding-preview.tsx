import { useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowRight } from "lucide-react";
import AuthPage from "./auth-page";
import logoLandscape from "@assets/PNG_image_auth_trimmed.png";
import { OnboardingPreviewMenu } from "@/components/onboarding-preview-menu";

function tomorrowAtFive() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const page = (new URLSearchParams(search).get("page") || "login") as "login" | "register" | "profile";
  const [playerName, setPlayerName] = useState("");
  const [trainingDays, setTrainingDays] = useState("");
  const [sessionLength, setSessionLength] = useState("");
  const [nextSession, setNextSession] = useState(tomorrowAtFive);
  const [error, setError] = useState("");

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

  if (page !== "profile") {
    return (
      <div data-testid="onboarding-auth-preview">
        <OnboardingPreviewMenu page={page} />
        <AuthPage
          key={page}
          previewMode
          initialMode={page}
          onPreviewModeChange={(mode) => navigate(`/admin/onboarding-preview?page=${mode}`)}
          onPreviewLogin={() => navigate("/admin/onboarding-preview?page=profile")}
          onPreviewRegister={() => navigate("/admin/onboarding-preview?page=profile")}
        />
      </div>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black px-5 py-16 text-[#f5f2eb] safe-area-inset sm:px-8" data-testid="onboarding-profile-preview">
      <OnboardingPreviewMenu page="profile" />
      <section className="w-full max-w-[400px]">
        <img src={logoLandscape} alt="PLAYR1" className="mx-auto mb-8 h-12 w-[200px] max-w-[72%] object-contain object-center mix-blend-screen sm:mb-10 sm:h-[58px] sm:w-[228px]" />
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f07836]">
          <span className="h-px w-7 bg-[#f07836]" /> One last step
        </p>
        <h1 className="font-heading text-3xl font-bold uppercase leading-tight tracking-wide sm:text-4xl">Complete your profile</h1>
        <p className="mb-7 mt-2 text-sm text-[#a6a39c]">Tell us when you train so PLAYR1 can start with your schedule.</p>
        <form onSubmit={handleProfile} className="space-y-5">
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            Name
            <input required autoComplete="name" placeholder="Your name" value={playerName} onChange={event => setPlayerName(event.target.value)}
              className="h-[58px] rounded-sm border border-[#45433f] bg-[#201f1d] px-5 text-[15px] text-[#f5f2eb] outline-none placeholder:text-[#96928a] focus:border-[#f07836]" />
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            How often do you train outside of practice?
            <select required value={trainingDays} onChange={event => setTrainingDays(event.target.value)} className="h-[58px] rounded-sm border border-[#45433f] bg-[#201f1d] px-5 text-[15px] text-[#f5f2eb] outline-none focus:border-[#f07836]">
              <option value="" disabled>Select days per week</option>
              {[1, 2, 3, 4, 5, 6, 7].map(days => <option key={days} value={days}>{days === 7 ? "Every day" : `${days} ${days === 1 ? "day" : "days"} a week`}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            How long is your next training session?
            <select required value={sessionLength} onChange={event => setSessionLength(event.target.value)} className="h-[58px] rounded-sm border border-[#45433f] bg-[#201f1d] px-5 text-[15px] text-[#f5f2eb] outline-none focus:border-[#f07836]">
              <option value="" disabled>Choose session length</option>
              {[20, 30, 45, 60, 75, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            When is your next training session?
            <input required type="datetime-local" value={nextSession} onChange={event => setNextSession(event.target.value)} className="h-[58px] rounded-sm border border-[#45433f] bg-[#201f1d] px-5 text-[15px] text-[#f5f2eb] outline-none focus:border-[#f07836]" />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="mt-1 inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-sm border border-[#f07836] bg-[#f07836] px-4 text-center text-xs font-bold uppercase tracking-[0.17em] text-[#17120f] transition hover:bg-[#ff8b4b]">
            Complete profile and start your PLAYR1 journey <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </form>
      </section>
    </main>
  );
}
