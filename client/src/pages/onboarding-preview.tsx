import { useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowRight } from "lucide-react";
import AuthPage from "./auth-page";
import logoLandscape from "@assets/PNG_image_auth_trimmed.png";
import { OnboardingPreviewMenu } from "@/components/onboarding-preview-menu";
import HubPage from "./hub";

function tomorrowAtFive() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const requestedPage = new URLSearchParams(search).get("page");
  const page = (["login", "register", "profile", "hub"].includes(requestedPage || "")
    ? requestedPage
    : "login") as "login" | "register" | "profile" | "hub";
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
    navigate("/admin/onboarding-preview?page=hub");
  }

  if (page === "hub") {
    return <HubPage />;
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
        <img src={logoLandscape} alt="PLAYR1" className="mx-auto mb-11 h-12 w-[200px] max-w-[72%] object-contain object-center mix-blend-screen sm:mb-12 sm:h-[58px] sm:w-[228px]" />
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f07836]">
          <span className="h-px w-7 bg-[#f07836]" /> One last step
        </p>
        <h1 className="font-heading text-3xl font-bold uppercase leading-tight tracking-wide sm:text-4xl">Complete your profile</h1>
        <p className="mb-7 mt-2 text-sm text-[#a6a39c]">Tell us when you train so PLAYR1 can start with your schedule.</p>
        <form onSubmit={handleProfile} className="space-y-5">
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            Name
            <input required autoComplete="name" placeholder="Your name" value={playerName} onChange={event => setPlayerName(event.target.value)}
              className="auth-pill-input h-[58px] px-5 text-[15px] text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            How often do you train outside of practice?
            <select required value={trainingDays} onChange={event => setTrainingDays(event.target.value)} className="auth-pill-input h-[58px] w-full appearance-none px-5 text-[15px] text-[#f5f2eb] outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
              <option value="" disabled>Select days per week</option>
              {[1, 2, 3, 4, 5, 6, 7].map(days => <option key={days} value={days}>{days === 7 ? "Every day" : `${days} ${days === 1 ? "day" : "days"} a week`}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            How long is your next training session?
            <select required value={sessionLength} onChange={event => setSessionLength(event.target.value)} className="auth-pill-input h-[58px] w-full appearance-none px-5 text-[15px] text-[#f5f2eb] outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
              <option value="" disabled>Choose session length</option>
              {[20, 30, 45, 60, 75, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            When is your next training session?
            <input required type="datetime-local" value={nextSession} onChange={event => setNextSession(event.target.value)} className="auth-pill-input h-[58px] w-full px-5 text-[15px] text-[#f5f2eb] outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="mt-1 inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-full border border-orange-300 bg-orange-500 px-4 text-center text-[13px] font-bold tracking-[0.04em] text-black shadow-[0_8px_28px_rgba(249,115,22,0.22)] transition-colors hover:bg-orange-400">
            Continue <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </form>
      </section>
    </main>
  );
}
