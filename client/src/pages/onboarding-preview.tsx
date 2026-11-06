import { useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { CalendarDays, ChevronDown, ArrowRight, Clock3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import AuthPage from "./auth-page";
import logoLandscape from "@assets/PNG_image_auth_trimmed.png";
import { OnboardingPreviewMenu } from "@/components/onboarding-preview-menu";
import HubPage from "./hub";
import { OnboardingTrailerStep } from "@/components/onboarding-trailer-step";

function tomorrowAtFive() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return toLocalDateTime(date);
}

function toLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Choose a date and time";
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export default function OnboardingPreviewPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const requestedPage = new URLSearchParams(search).get("page");
  const page = (["login", "register", "profile", "welcome", "hub", "player-profile", "day2", "day3"].includes(requestedPage || "")
    ? requestedPage
    : "login") as "login" | "register" | "profile" | "welcome" | "hub" | "player-profile" | "day2" | "day3";
  const [playerName, setPlayerName] = useState("");
  const [trainingFrequency, setTrainingFrequency] = useState("");
  const [frequencyUnit, setFrequencyUnit] = useState<"week" | "month">("week");
  const [sessionLength, setSessionLength] = useState("");
  const [nextSession, setNextSession] = useState(tomorrowAtFive);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState("");

  function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const frequency = Number(trainingFrequency);
    if (!frequency || frequency < 1 || frequency > 99 || !sessionLength || !nextSession) {
      setError("Complete each field to continue.");
      return;
    }
    sessionStorage.setItem("playr1-onboarding-preview", JSON.stringify({
      playerName,
      trainingFrequency: frequency,
      frequencyUnit,
      sessionLength: Number(sessionLength),
      nextSession,
    }));
    navigate("/admin/onboarding-preview?page=welcome");
  }

  function updateSessionDate(date: Date) {
    const selected = new Date(date);
    const current = new Date(nextSession);
    selected.setHours(current.getHours(), current.getMinutes(), 0, 0);
    setNextSession(toLocalDateTime(selected));
  }

  function updateSessionTime(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
    const updated = new Date(nextSession);
    updated.setHours(hours, minutes, 0, 0);
    setNextSession(toLocalDateTime(updated));
  }

  if (page === "welcome") {
    return <OnboardingTrailerStep previewMode />;
  }

  if (page === "hub" || page === "player-profile" || page === "day2" || page === "day3") {
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
      <section className="mx-auto w-full max-w-[340px] sm:max-w-[400px]">
        <img src={logoLandscape} alt="PLAYR1" className="mx-auto mb-11 h-12 w-[200px] max-w-[72%] object-contain object-center mix-blend-screen sm:mb-12 sm:h-[58px] sm:w-[228px]" />
        <h1 className="mb-7 font-heading text-3xl font-bold uppercase leading-tight tracking-wide sm:text-4xl">Complete your profile</h1>
        <form onSubmit={handleProfile} className="space-y-5">
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">
            Name
            <input required autoComplete="name" placeholder="Your name" value={playerName} onChange={event => setPlayerName(event.target.value)}
              className="auth-pill-input h-[58px] px-5 text-[15px] text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
          </label>
          <div className="grid gap-2">
            <label htmlFor="training-frequency" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">How often do you train outside of practice?</label>
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
              <input
                id="training-frequency"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                required
                value={trainingFrequency}
                onChange={(event) => {
                  setTrainingFrequency(event.target.value.replace(/\D/g, "").slice(0, 2));
                  setError("");
                }}
                placeholder="2"
                aria-label="Training frequency number"
                className="auth-pill-input h-[58px] min-w-0 px-5 text-center text-[16px] font-semibold text-[#f5f2eb] placeholder:text-[#88837e] outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-training-frequency"
              />
              <Select value={frequencyUnit} onValueChange={(value: "week" | "month") => setFrequencyUnit(value)}>
                <SelectTrigger className="auth-pill-input h-[58px] rounded-full px-5 text-[15px] text-[#f5f2eb] focus:ring-0 focus:ring-offset-0" aria-label="Training frequency time unit" data-testid="select-training-frequency-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-orange-500/30 bg-[#111] text-zinc-100">
                  <SelectItem value="week" className="focus:bg-orange-500/15 focus:text-white">per week</SelectItem>
                  <SelectItem value="month" className="focus:bg-orange-500/15 focus:text-white">per month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="session-length" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">How long do you usually train for?</label>
            <Select value={sessionLength} onValueChange={(value) => setSessionLength(value)}>
              <SelectTrigger id="session-length" className="auth-pill-input h-[58px] rounded-full px-5 text-[15px] text-[#f5f2eb] focus:ring-0 focus:ring-offset-0" data-testid="select-session-length">
                <SelectValue placeholder="Choose session length" />
              </SelectTrigger>
              <SelectContent className="border-orange-500/30 bg-[#111] text-zinc-100">
                {[20, 30, 45, 60, 75, 90].map((minutes) => <SelectItem key={minutes} value={String(minutes)} className="focus:bg-orange-500/15 focus:text-white">{minutes} minutes</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">When do you plan on training next?</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="auth-pill-input flex h-[58px] w-full items-center justify-between gap-3 px-5 text-left text-[14px] text-[#f5f2eb] outline-none focus-visible:ring-0" aria-label="Choose next training date and time" data-testid="button-next-session-calendar">
                  <span className="flex min-w-0 items-center gap-3">
                    <CalendarDays className="h-4 w-4 shrink-0 text-orange-400" />
                    <span className="truncate">{formatSessionDate(nextSession)}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${calendarOpen ? "rotate-180" : ""}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" sideOffset={8} className="w-[min(21rem,calc(100vw-2.5rem))] border border-orange-500/25 bg-[#0c0c0c] p-3 text-zinc-100 shadow-[0_16px_50px_rgba(0,0,0,0.7)]">
                <div className="mb-1 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                  <CalendarDays className="h-3.5 w-3.5" /> Pick your next session
                </div>
                <Calendar
                  mode="single"
                  selected={new Date(nextSession)}
                  onSelect={(date) => { if (date) updateSessionDate(date); }}
                  disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                  initialFocus
                  className="mx-auto"
                  classNames={{
                    caption_label: "text-sm font-semibold text-white",
                    head_cell: "text-zinc-500 rounded-md w-9 font-medium text-[0.7rem]",
                    day: "h-9 w-9 rounded-full p-0 font-normal text-zinc-300 hover:bg-orange-500/15 hover:text-white",
                    day_selected: "bg-orange-500 text-black hover:bg-orange-400 hover:text-black focus:bg-orange-500 focus:text-black",
                    day_today: "border border-orange-400/60 text-orange-300",
                    day_disabled: "text-zinc-700 opacity-40",
                    nav_button: "h-8 w-8 border border-white/10 bg-white/[0.03] p-0 text-zinc-300 hover:bg-white/10 hover:opacity-100",
                  }}
                  data-testid="calendar-next-session"
                />
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-1 pt-3">
                  <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <Clock3 className="h-3.5 w-3.5 text-orange-400" /> Time
                  </span>
                  <input
                    type="time"
                    value={nextSession.slice(11, 16)}
                    onChange={(event) => updateSessionTime(event.target.value)}
                    aria-label="Next session time"
                    className="h-9 rounded-full border border-orange-500/25 bg-black px-3 text-sm text-white outline-none focus:border-orange-400"
                    data-testid="input-next-session-time"
                  />
                </div>
                <button type="button" onClick={() => setCalendarOpen(false)} className="mt-3 h-10 w-full rounded-full bg-orange-500 text-xs font-bold text-black transition hover:bg-orange-400">Done</button>
              </PopoverContent>
            </Popover>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="mt-1 inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-full border border-orange-300 bg-orange-500 px-4 text-center text-[13px] font-bold tracking-[0.04em] text-black shadow-[0_8px_28px_rgba(249,115,22,0.22)] transition-colors hover:bg-orange-400">
            Continue <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </form>
      </section>
    </main>
  );
}
