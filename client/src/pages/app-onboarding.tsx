import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, LoaderCircle, LockKeyhole } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface AppOnboardingAnswers {
  firstName: string;
  lastName: string;
  gradeLevel: string;
  currentSituation: string;
  skillRoles: string[];
  primaryGoal: string;
  seriousness: string;
  trainingFrequency: string;
  experienceYears: string;
  teamType: string;
  positions: string[];
  customDrillEmail: string;
}

type PartialAnswers = Partial<AppOnboardingAnswers>;
type SetupResponse = { answers: PartialAnswers; completed: boolean };

const SETUP_KEY = ["/api/player-setup"];
const SITUATIONS = [
  "Elementary School",
  "Middle School",
  "Freshman / JV",
  "Varsity",
  "College Basketball",
  "Intramural League",
  "Adult Rec League",
  "Just Playing For Fun",
];
const SKILLS = [
  "Ball Handling",
  "Shooting",
  "Finishing",
  "Passing",
  "Defense",
  "Basketball IQ",
  "Athleticism",
  "Rebounding",
];
const GOALS = [
  "Make a team I'm trying out for",
  "Earn more playing time / a bigger role",
  "Play at the next level (high school, college, etc.)",
  "Become the best version of my game, for myself",
  "Compete at the highest level I possibly can",
];
const SERIOUSNESS = ["Casual Hobby", "Serious Hobby", "Major Priority", "My Biggest Goal"];
const FREQUENCIES = ["Never", "Rarely", "1 to 2 Times a Week", "3 to 4 Times a Week", "5 to 6 Times a Week", "Daily"];
const EXPERIENCE = ["0", "1 to 3", "4 to 6", "7 to 10", "10+"];
const TEAM_TYPES = ["School", "Club / AAU", "Recreation", "Intramural", "No current team"];
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const GRADES = [
  "Elementary School",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "College Freshman",
  "College Sophomore",
  "College Junior",
  "College Senior",
  "Post-college",
  "Not in school / not applicable",
];

const emptyAnswers: AppOnboardingAnswers = {
  firstName: "",
  lastName: "",
  gradeLevel: "",
  currentSituation: "",
  skillRoles: [],
  primaryGoal: "",
  seriousness: "",
  trainingFrequency: "",
  experienceYears: "",
  teamType: "",
  positions: [],
  customDrillEmail: "",
};

function getStartingStep(answers: PartialAnswers): number {
  if (!answers.firstName?.trim() || !answers.lastName?.trim() || !answers.gradeLevel || !answers.currentSituation) return 1;
  if (answers.skillRoles?.length !== 4) return 2;
  if (!answers.primaryGoal || !answers.seriousness || !answers.trainingFrequency || !answers.experienceYears) return 3;
  if (!answers.teamType || (answers.teamType !== "No current team" && !answers.positions?.length)) return 4;
  return 5;
}

function validateStep(step: number, answers: AppOnboardingAnswers): string | null {
  if (step === 1) {
    if (!answers.firstName.trim() || !answers.lastName.trim()) return "Add your first and last name to continue.";
    if (!answers.gradeLevel) return "Choose your school grade.";
    if (!answers.currentSituation) return "Choose the option that best describes your basketball situation.";
  }
  if (step === 2 && answers.skillRoles.length !== 4) return "Choose exactly four skills to focus on.";
  if (step === 3) {
    if (!answers.primaryGoal || !answers.seriousness || !answers.trainingFrequency || !answers.experienceYears) {
      return "Choose an answer for each question to continue.";
    }
  }
  if (step === 4) {
    if (!answers.teamType) return "Choose your current team type.";
    if (answers.teamType !== "No current team" && !answers.positions.length) return "Choose at least one position.";
  }
  if (step === 5 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.customDrillEmail.trim())) {
    return "Enter a valid email address for your customized drills.";
  }
  return null;
}

function ChoiceButton({
  label,
  selected,
  onClick,
  testId,
  compact = false,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  testId?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:cursor-not-allowed disabled:opacity-45 ${
        compact ? "py-2.5 text-sm" : "py-3 text-[14px]"
      } ${
        selected
          ? "border-orange-400/70 bg-orange-500/[0.11] text-orange-50 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.08)]"
          : "border-zinc-800 bg-[#111110] text-zinc-300 hover:border-zinc-700 hover:bg-[#171716]"
      }`}
    >
      <span className="font-semibold leading-snug">{label}</span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-orange-400 bg-orange-500 text-zinc-950" : "border-zinc-700 text-transparent group-hover:border-zinc-500"
        }`}
        aria-hidden="true"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-bold text-zinc-200">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="h-12 w-full appearance-none rounded-xl border border-zinc-800 bg-[#111110] px-4 pr-11 text-[14px] text-zinc-100 outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-500/15"
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
      </div>
    </div>
  );
}

function ChoiceGroup({
  title,
  options,
  value,
  onChange,
  testPrefix,
  columns = 1,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  testPrefix: string;
  columns?: 1 | 2;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2 text-sm font-bold text-zinc-200">{title}</legend>
      <div className={`grid gap-2 ${columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {options.map((option) => (
          <ChoiceButton
            key={option}
            label={option}
            selected={value === option}
            onClick={() => onChange(option)}
            testId={`${testPrefix}-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
            compact
          />
        ))}
      </div>
    </fieldset>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-bold text-zinc-200">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-xl border border-zinc-800 bg-[#111110] px-4 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-500/15"
      />
      {hint && <p className="text-xs leading-relaxed text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function AppOnboardingPage({
  onComplete,
  previewMode = false,
}: {
  onComplete?: () => void;
  previewMode?: boolean;
}) {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = previewMode
    ? { firstName: "Jordan", lastName: "Reyes", email: "jordan.reyes@example.com" }
    : authUser;
  const isAuthLoading = previewMode ? false : authLoading;
  const [, setLocation] = useLocation();
  const { data, isLoading, isError, refetch } = useQuery<SetupResponse>({
    queryKey: previewMode ? [...SETUP_KEY, "preview"] : SETUP_KEY,
    enabled: !previewMode,
    initialData: previewMode ? { answers: {}, completed: false } : undefined,
  });
  const [answers, setAnswers] = useState<AppOnboardingAnswers>({
    ...emptyAnswers,
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    customDrillEmail: user?.email || "",
  });
  const [step, setStep] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!data || isAuthLoading || initialized.current) return;
    const loaded = { ...emptyAnswers, ...data.answers };
    setAnswers({
      ...loaded,
      firstName: loaded.firstName || user?.firstName || "",
      lastName: loaded.lastName || user?.lastName || "",
      customDrillEmail: loaded.customDrillEmail || user?.email || "",
      skillRoles: Array.isArray(loaded.skillRoles) ? loaded.skillRoles : [],
      positions: Array.isArray(loaded.positions) ? loaded.positions : [],
    });
    setStep(getStartingStep(loaded));
    initialized.current = true;
  }, [data, isAuthLoading, user?.email, user?.firstName, user?.lastName]);

  const update = (field: keyof AppOnboardingAnswers, value: string | string[]) => {
    setAnswers((current) => ({ ...current, [field]: value }));
    setActionError("");
  };

  const skillsToggle = (skill: string) => {
    setAnswers((current) => {
      const selected = current.skillRoles.includes(skill);
      if (selected) return { ...current, skillRoles: current.skillRoles.filter((item) => item !== skill) };
      if (current.skillRoles.length >= 4) return current;
      return { ...current, skillRoles: [...current.skillRoles, skill] };
    });
    setActionError("");
  };

  const positionsToggle = (position: string) => {
    setAnswers((current) => ({
      ...current,
      positions: current.positions.includes(position)
        ? current.positions.filter((item) => item !== position)
        : [...current.positions, position],
    }));
    setActionError("");
  };

  const validationError = attempted ? validateStep(step, answers) : null;

  const saveStep = async () => {
    const error = validateStep(step, answers);
    setAttempted(true);
    if (error) return;
    setBusy(true);
    setActionError("");
    try {
      const screenAnswers: PartialAnswers = step === 1
        ? { firstName: answers.firstName.trim(), lastName: answers.lastName.trim(), gradeLevel: answers.gradeLevel, currentSituation: answers.currentSituation }
        : step === 2
          ? { skillRoles: answers.skillRoles }
          : step === 3
            ? { primaryGoal: answers.primaryGoal, seriousness: answers.seriousness, trainingFrequency: answers.trainingFrequency, experienceYears: answers.experienceYears }
            : { teamType: answers.teamType, positions: answers.positions };
      if (!previewMode) {
        const response = await apiRequest("PUT", "/api/player-setup", { answers: screenAnswers });
        const merged = await response.json() as SetupResponse;
        queryClient.setQueryData(SETUP_KEY, merged);
        await queryClient.invalidateQueries({ queryKey: SETUP_KEY });
      }
      setStep((current) => Math.min(current + 1, 5));
      setAttempted(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "We couldn't save that just yet. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async () => {
    const error = validateStep(5, answers);
    setAttempted(true);
    if (error) return;
    setBusy(true);
    setActionError("");
    try {
      const completeAnswers: AppOnboardingAnswers = {
        ...answers,
        firstName: answers.firstName.trim(),
        lastName: answers.lastName.trim(),
        customDrillEmail: answers.customDrillEmail.trim(),
      };
      if (previewMode) {
        if (onComplete) onComplete();
        else setLocation("/hub");
        return;
      }
      await apiRequest("PUT", "/api/player-setup", {
        answers: { customDrillEmail: completeAnswers.customDrillEmail },
      });
      await apiRequest("POST", "/api/player-setup/complete", { answers: completeAnswers });
      await queryClient.invalidateQueries({ queryKey: SETUP_KEY });
      if (onComplete) onComplete();
      else setLocation("/hub");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "We couldn't finish setting up your profile. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
      setAttempted(false);
      setActionError("");
    } else {
      window.history.back();
    }
  };

  const handleContinue = () => {
    if (step === 5) void finishSetup();
    else void saveStep();
  };

  const stepCopy = [
    { eyebrow: "YOUR FOUNDATION", title: "First, the basics.", description: "Let’s get to know the player behind the work." },
    { eyebrow: "YOUR GAME", title: "Where do you want to grow?", description: "Pick the four skills you want your training to build." },
    { eyebrow: "YOUR DRIVE", title: "What’s pushing you?", description: "A little context helps us meet you at your level." },
    { eyebrow: "YOUR COURT", title: "Tell us about your team.", description: "We’ll shape your experience around where you play." },
    { eyebrow: "YOUR TRAINING", title: "Your drills, your inbox.", description: "We’ll send customized drill ideas to the email you choose." },
  ][step - 1];

  if (isLoading || isAuthLoading) {
    return (
      <main className="min-h-[100dvh] bg-[#090909] px-4 py-8 text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-xl animate-pulse space-y-7">
          <div className="h-4 w-28 rounded bg-zinc-800" />
          <div className="h-2 w-full rounded-full bg-zinc-800" />
          <div className="space-y-3 pt-8"><div className="h-3 w-32 rounded bg-zinc-800" /><div className="h-9 w-3/4 rounded bg-zinc-800" /><div className="h-4 w-2/3 rounded bg-zinc-800" /></div>
          <div className="space-y-3 pt-4"><div className="h-12 rounded-xl bg-zinc-900" /><div className="h-12 rounded-xl bg-zinc-900" /><div className="h-12 rounded-xl bg-zinc-900" /></div>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#090909] px-4 py-10 text-zinc-100">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111110] p-6 sm:p-8" aria-labelledby="setup-error-title">
          <CircleAlert className="mb-4 h-6 w-6 text-orange-400" aria-hidden="true" />
          <h1 id="setup-error-title" className="text-xl font-black tracking-tight">Your setup didn’t load.</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Your answers are safe. Check your connection and try loading your player setup again.</p>
          <button type="button" onClick={() => void refetch()} className="mt-6 h-11 rounded-lg border border-orange-400/60 bg-orange-500/10 px-5 text-sm font-extrabold text-orange-100 transition hover:bg-orange-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" data-testid="button-retry-setup">Try again</button>
        </section>
      </main>
    );
  }

  const progress = (step / 5) * 100;

  return (
    <main className={`relative min-h-[100dvh] overflow-hidden bg-[#090909] px-4 pb-8 text-zinc-100 sm:px-6 ${previewMode ? "pt-14 sm:pt-16" : "pt-5 sm:pt-8"}`}>
      <div className="pointer-events-none absolute -right-24 top-44 h-72 w-72 rounded-full border border-orange-500/[0.07]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-12 top-56 h-48 w-48 rounded-full border border-orange-500/[0.06]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/[0.09] text-[11px] font-black tracking-tight text-orange-300">P1</div>
            <span className="text-[12px] font-black tracking-[0.2em] text-zinc-300">PLAYR1</span>
          </div>
          <button
            type="button"
            onClick={goBack}
            aria-label={step > 1 ? "Go to previous setup page" : "Go back"}
            disabled={step === 1}
            data-testid="button-back"
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:pointer-events-none disabled:opacity-35"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </header>

        <section aria-label={`Setup step ${step} of 5`} className="mb-9">
          <div className="mb-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em]">
            <span className="text-zinc-500">Player setup</span>
            <span className="text-zinc-400"><span className="text-orange-300">{String(step).padStart(2, "0")}</span><span className="px-1.5 text-zinc-700">/</span>05</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-zinc-800/90" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={step} aria-label="Onboarding progress">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-300 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className={`h-0.5 rounded-full transition-colors ${index < step ? "bg-orange-500/55" : "bg-zinc-800"}`} />
            ))}
          </div>
        </section>

        <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="mb-7">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-orange-400">{stepCopy.eyebrow}</p>
            <h1 className="text-[30px] font-black leading-[1.08] tracking-[-0.04em] text-zinc-50 sm:text-[38px]" data-testid="text-setup-title">{stepCopy.title}</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">{stepCopy.description}</p>
          </div>

          <section className="space-y-6 rounded-2xl border border-zinc-800/90 bg-[#0e0e0d] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-6" aria-label={`Step ${step} questions`}>
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField id="first-name" label="First name" value={answers.firstName} onChange={(value) => update("firstName", value)} placeholder="First name" autoComplete="given-name" />
                  <TextField id="last-name" label="Last name" value={answers.lastName} onChange={(value) => update("lastName", value)} placeholder="Last name" autoComplete="family-name" />
                </div>
                <SelectField id="grade-level" label="School grade" value={answers.gradeLevel} onChange={(value) => update("gradeLevel", value)} options={GRADES} placeholder="Choose your grade" />
                <ChoiceGroup title="What best describes your current basketball situation?" options={SITUATIONS} value={answers.currentSituation} onChange={(value) => update("currentSituation", value)} testPrefix="situation" columns={2} />
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-orange-50">Choose four focus skills</p>
                    <p className="mt-0.5 text-xs text-zinc-500">Make your next reps count.</p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-bold ${answers.skillRoles.length === 4 ? "text-orange-300" : "text-zinc-400"}`} aria-live="polite">{answers.skillRoles.length}<span className="text-zinc-600">/4</span></span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SKILLS.map((skill) => (
                    <ChoiceButton
                      key={skill}
                      label={skill}
                      selected={answers.skillRoles.includes(skill)}
                      onClick={() => skillsToggle(skill)}
                      disabled={answers.skillRoles.length >= 4 && !answers.skillRoles.includes(skill)}
                      testId={`skill-option-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    />
                  ))}
                </div>
                {answers.skillRoles.length === 4 && (
                  <p className="flex items-center gap-2 text-xs font-semibold text-orange-300"><Check className="h-3.5 w-3.5" />Your focus is set. You can change it before continuing.</p>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <ChoiceGroup title="What's your primary basketball goal right now?" options={GOALS} value={answers.primaryGoal} onChange={(value) => update("primaryGoal", value)} testPrefix="goal" />
                <ChoiceGroup title="How serious is basketball in your life right now?" options={SERIOUSNESS} value={answers.seriousness} onChange={(value) => update("seriousness", value)} testPrefix="seriousness" columns={2} />
                <ChoiceGroup title="How often do you train outside of team practice?" options={FREQUENCIES} value={answers.trainingFrequency} onChange={(value) => update("trainingFrequency", value)} testPrefix="frequency" columns={2} />
                <ChoiceGroup title="How many years have you played basketball in general?" options={EXPERIENCE} value={answers.experienceYears} onChange={(value) => update("experienceYears", value)} testPrefix="experience" columns={2} />
              </>
            )}

            {step === 4 && (
              <>
                <ChoiceGroup title="What type of team are you part of?" options={TEAM_TYPES} value={answers.teamType} onChange={(value) => update("teamType", value)} testPrefix="team-type" columns={2} />
                <fieldset className="space-y-2.5">
                  <legend className="text-sm font-bold text-zinc-200">
                    Current position{answers.teamType === "No current team" ? "s (optional)" : "s"}
                  </legend>
                  <p className="text-xs text-zinc-500">Select every position you play.</p>
                  <div className="grid grid-cols-5 gap-2">
                    {POSITIONS.map((position) => (
                      <button
                        key={position}
                        type="button"
                        aria-pressed={answers.positions.includes(position)}
                        onClick={() => positionsToggle(position)}
                        data-testid={`position-${position.toLowerCase()}`}
                        className={`flex h-12 items-center justify-center rounded-xl border text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          answers.positions.includes(position)
                            ? "border-orange-400/70 bg-orange-500/[0.12] text-orange-100"
                            : "border-zinc-800 bg-[#111110] text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                        }`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {step === 5 && (
              <>
                <div className="rounded-xl border border-zinc-800 bg-[#111110] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-300">
                      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">A better fit starts with you.</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">We’ll use this address for personalized basketball drills. It won’t change the email on your PLAYR1 account.</p>
                    </div>
                  </div>
                </div>
                <TextField
                  id="custom-drill-email"
                  label="Email for customized drills"
                  value={answers.customDrillEmail}
                  onChange={(value) => update("customDrillEmail", value)}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  hint={user?.email ? `Your account email is ${user.email}. Change this if you’d like drills sent somewhere else.` : "Choose the inbox where you want to receive drill recommendations."}
                />
              </>
            )}

            {(validationError || actionError) && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3 text-sm leading-relaxed text-red-200">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
                <span>{actionError || validationError}</span>
              </p>
            )}
          </section>

          <footer className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="px-1 text-xs text-zinc-600">Your answers help tune training to your game.</p>
            <button
              type="button"
              onClick={handleContinue}
              disabled={busy}
              data-testid={step === 5 ? "button-finish-setup" : "button-next"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-300/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 px-6 text-sm font-black text-[#17100b] shadow-[0_8px_28px_rgba(249,115,22,0.12)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-44"
            >
              {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" />{step === 5 ? "Finishing setup…" : "Saving…"}</> : <>{step === 5 ? "Finish setup" : "Continue"}<ArrowRight className="h-4 w-4" /></>}
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}