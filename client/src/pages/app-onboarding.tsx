import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Medal,
  Star,
  Target,
  TrendingDown,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, storeAuthToken } from "@/lib/queryClient";

type SkillRankKey = "best" | "secondBest" | "worst" | "improveMost";
type SkillRankings = Record<SkillRankKey, string>;

export interface AppOnboardingAnswers {
  firstName: string;
  lastName: string;
  currentSituation: string;
  skillRoles: string[];
  skillRankings: SkillRankings;
  primaryGoal: string;
  trainingDaysPerUnit: string;
  trainingPeriodUnit: "week" | "month";
  experienceYears: string;
  competitiveExperienceYears: string;
  teamName: string;
  teamRole: string;
  positions: string[];
  /** Legacy saved value; the current setup flow no longer collects it. */
  customDrillEmail: string;
}

type PartialAnswers = Omit<
  Partial<AppOnboardingAnswers>,
  "skillRankings" | "trainingDaysPerUnit" | "experienceYears" | "competitiveExperienceYears"
> & {
  skillRankings?: Partial<SkillRankings>;
  trainingDaysPerUnit?: string | number;
  experienceYears?: string | number;
  competitiveExperienceYears?: string | number;
};
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
  "Play at the next level",
  "Just looking to improve in general",
  "Play for fun",
];
const SKILL_RANKS: { key: SkillRankKey; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { key: "best", label: "Best", shortLabel: "Best", icon: Trophy },
  { key: "secondBest", label: "2nd Best", shortLabel: "2nd Best", icon: Medal },
  { key: "worst", label: "Worst", shortLabel: "Worst", icon: TrendingDown },
  { key: "improveMost", label: "Want to improve the most", shortLabel: "Improve most", icon: Target },
];
const TEAM_ROLES = [
  "Not On A Team / Learning the game",
  "Limited Minutes / Looking to Make a Team",
  "Rotation Player",
  "Starter / 6th Man",
  "Key Player",
  "Team Leader",
];
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

const emptyAnswers: AppOnboardingAnswers = {
  firstName: "",
  lastName: "",
  currentSituation: "",
  skillRoles: [],
  skillRankings: { best: "", secondBest: "", worst: "", improveMost: "" },
  primaryGoal: "",
  trainingDaysPerUnit: "",
  trainingPeriodUnit: "week",
  experienceYears: "",
  competitiveExperienceYears: "",
  teamName: "",
  teamRole: "",
  positions: [],
  customDrillEmail: "",
};

function normalizeNumericAnswer(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return String(value);
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)) && Number(value) >= 0) {
    return value.trim();
  }
  return "";
}

function normalizeAnswers(source: PartialAnswers): AppOnboardingAnswers {
  const rawRankings = source.skillRankings ?? {};
  const skillRankings = Object.fromEntries(
    SKILL_RANKS.map(({ key }) => [
      key,
      typeof rawRankings[key] === "string" && SKILLS.includes(rawRankings[key]) ? rawRankings[key] : "",
    ]),
  ) as SkillRankings;
  const rankedSkills = SKILL_RANKS.map(({ key }) => skillRankings[key]).filter(Boolean);
  const rankingsComplete =
    rankedSkills.length === SKILL_RANKS.length && new Set(rankedSkills).size === SKILL_RANKS.length;

  return {
    firstName: typeof source.firstName === "string" ? source.firstName : "",
    lastName: typeof source.lastName === "string" ? source.lastName : "",
    currentSituation: typeof source.currentSituation === "string" && SITUATIONS.includes(source.currentSituation)
      ? source.currentSituation
      : "",
    skillRoles: rankingsComplete ? rankedSkills : [],
    skillRankings,
    primaryGoal: typeof source.primaryGoal === "string" && GOALS.includes(source.primaryGoal)
      ? source.primaryGoal
      : "",
    trainingDaysPerUnit: normalizeNumericAnswer(source.trainingDaysPerUnit),
    trainingPeriodUnit: source.trainingPeriodUnit === "month" ? "month" : "week",
    experienceYears: normalizeNumericAnswer(source.experienceYears),
    competitiveExperienceYears: normalizeNumericAnswer(source.competitiveExperienceYears),
    teamName: typeof source.teamName === "string" ? source.teamName : "",
    teamRole: typeof source.teamRole === "string" && TEAM_ROLES.includes(source.teamRole)
      ? source.teamRole
      : "",
    positions: Array.isArray(source.positions)
      ? source.positions.filter((position) => POSITIONS.includes(position))
      : [],
    customDrillEmail: typeof source.customDrillEmail === "string" ? source.customDrillEmail : "",
  };
}

function hasCompleteSkillRankings(answers: PartialAnswers): boolean {
  const values = SKILL_RANKS.map(({ key }) => answers.skillRankings?.[key] || "");
  return values.every((skill) => SKILLS.includes(skill)) && new Set(values).size === SKILL_RANKS.length;
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const raw = error.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // Preserve plain-text API errors.
  }
  return raw || fallback;
}

function getStartingStep(answers: PartialAnswers): number {
  if (!answers.firstName?.trim() || !answers.lastName?.trim() || !answers.currentSituation) return 1;
  if (answers.skillRoles?.length !== 4 || !hasCompleteSkillRankings(answers)) return 2;
  if (
    !answers.primaryGoal ||
    !answers.trainingDaysPerUnit ||
    !answers.trainingPeriodUnit ||
    !answers.experienceYears ||
    !answers.competitiveExperienceYears
  ) return 3;
  if (!answers.teamRole) return 4;
  return 5;
}

function validateStep(
  step: number,
  answers: AppOnboardingAnswers,
  credentialsRequired = false,
  accountEmail = "",
  password = "",
): string | null {
  if (step === 1) {
    if (!answers.firstName.trim() || !answers.lastName.trim()) return "Add your first and last name to continue.";
    if (!answers.currentSituation) return "Choose the option that best describes your basketball situation.";
  }
  if (step === 2) {
    if (answers.skillRoles.length !== 4 || !hasCompleteSkillRankings(answers)) {
      return "Assign a different skill to each of the four labels.";
    }
    const ranked = SKILL_RANKS.map(({ key }) => answers.skillRankings[key]);
    if (new Set(answers.skillRoles).size !== 4 || ranked.some((skill) => !answers.skillRoles.includes(skill))) {
      return "Assign a different skill to each of the four labels.";
    }
  }
  if (step === 3) {
    if (!answers.primaryGoal) return "Choose your primary basketball goal.";
    const maxDays = answers.trainingPeriodUnit === "month" ? 31 : 7;
    const trainingDays = Number(answers.trainingDaysPerUnit);
    if (!/^\d+$/.test(answers.trainingDaysPerUnit) || trainingDays < 0 || trainingDays > maxDays) {
      return `Enter 0 to ${maxDays} training days per ${answers.trainingPeriodUnit}.`;
    }
    const validYears = (value: string) => /^\d+(\.\d+)?$/.test(value) && Number(value) <= 100;
    if (!validYears(answers.experienceYears) || !validYears(answers.competitiveExperienceYears)) {
      return "Enter a number of years for both experience questions.";
    }
  }
  if (step === 4 && !answers.teamRole) return "Choose the role that best describes you on your team.";
  if (step === 5) {
    if (credentialsRequired) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())) return "Enter a valid email for your PLAYR1 account.";
      if (password.length < 8) return "Your password must be at least 8 characters.";
    }
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
  min,
  max,
  step,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
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
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-zinc-800 bg-[#111110] px-4 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-500/15 disabled:cursor-not-allowed disabled:opacity-55"
      />
      {hint && <p className="text-xs leading-relaxed text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function AppOnboardingPage({
  onComplete,
  previewMode = false,
  signupMode = false,
}: {
  onComplete?: () => void;
  previewMode?: boolean;
  signupMode?: boolean;
}) {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = previewMode
    ? { firstName: "Jordan", lastName: "Reyes", email: "jordan.reyes@example.com" }
    : authUser;
  const isAuthLoading = previewMode || signupMode ? false : authLoading;
  const [, setLocation] = useLocation();
  const setupKey = previewMode ? [...SETUP_KEY, "preview"] : signupMode ? [...SETUP_KEY, "signup"] : SETUP_KEY;
  const { data, isLoading, isError, refetch } = useQuery<SetupResponse>({
    queryKey: setupKey,
    enabled: !previewMode && !signupMode,
    initialData: previewMode || signupMode ? { answers: {}, completed: false } : undefined,
  });
  const [answers, setAnswers] = useState<AppOnboardingAnswers>(() => ({
    ...emptyAnswers,
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  }));
  const [accountEmail, setAccountEmail] = useState(() => user?.email || "");
  const [password, setPassword] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<Record<string, unknown> | null>(null);
  const [step, setStep] = useState(1);
  const [activeSkillRank, setActiveSkillRank] = useState<SkillRankKey>("best");
  const [draggingSkillRank, setDraggingSkillRank] = useState<SkillRankKey | null>(null);
  const [dropTargetSkill, setDropTargetSkill] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!data || isAuthLoading || initialized.current) return;
    const loaded = normalizeAnswers(data.answers);
    const merged = {
      ...loaded,
      firstName: loaded.firstName || user?.firstName || "",
      lastName: loaded.lastName || user?.lastName || "",
    };
    setAnswers(merged);
    setAccountEmail(user?.email || "");
    setStep(getStartingStep(merged));
    initialized.current = true;
  }, [data, isAuthLoading, user?.email, user?.firstName, user?.lastName]);

  const update = (field: keyof AppOnboardingAnswers, value: string | string[]) => {
    setAnswers((current) => ({ ...current, [field]: value }));
    setActionError("");
  };

  const updateAccountEmail = (value: string) => {
    setAccountEmail(value);
    setActionError("");
  };

  const assignSkill = (skill: string, rankKey: SkillRankKey = activeSkillRank) => {
    setAnswers((current) => {
      const nextRankings = { ...current.skillRankings };
      if (nextRankings[rankKey] === skill) {
        nextRankings[rankKey] = "";
      } else {
        for (const rank of SKILL_RANKS) {
          if (rank.key !== rankKey && nextRankings[rank.key] === skill) {
            nextRankings[rank.key] = "";
          }
        }
        nextRankings[rankKey] = skill;
      }
      return {
        ...current,
        skillRankings: nextRankings,
        skillRoles: SKILL_RANKS.map(({ key }) => nextRankings[key]).filter(Boolean),
      };
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

  const credentialsRequired = signupMode && !previewMode && !accountCreated;
  const validationError = attempted
    ? validateStep(step, answers, credentialsRequired, accountEmail, password)
    : null;

  const saveStep = async () => {
    const error = validateStep(step, answers);
    setAttempted(true);
    if (error) return;
    setBusy(true);
    setActionError("");
    try {
      const screenAnswers: PartialAnswers = step === 1
        ? {
            firstName: answers.firstName.trim(),
            lastName: answers.lastName.trim(),
            currentSituation: answers.currentSituation,
            positions: answers.positions,
          }
        : step === 2
          ? { skillRoles: answers.skillRoles, skillRankings: answers.skillRankings }
          : step === 3
            ? {
                primaryGoal: answers.primaryGoal,
                trainingDaysPerUnit: Number(answers.trainingDaysPerUnit),
                trainingPeriodUnit: answers.trainingPeriodUnit,
                experienceYears: Number(answers.experienceYears),
                competitiveExperienceYears: Number(answers.competitiveExperienceYears),
              }
            : { teamName: answers.teamName.trim(), teamRole: answers.teamRole };
      if (!previewMode && !signupMode) {
        const response = await apiRequest("PUT", "/api/player-setup", { answers: screenAnswers });
        const merged = await response.json() as SetupResponse;
        queryClient.setQueryData(SETUP_KEY, merged);
        await queryClient.invalidateQueries({ queryKey: SETUP_KEY });
      }
      setStep((current) => Math.min(current + 1, 5));
      setAttempted(false);
    } catch (error) {
      setActionError(errorMessage(error, "We couldn't save that just yet. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async () => {
    const error = validateStep(5, answers, credentialsRequired, accountEmail, password);
    setAttempted(true);
    if (error) return;
    setBusy(true);
    setActionError("");
    try {
      const completeAnswers = {
        firstName: answers.firstName.trim(),
        lastName: answers.lastName.trim(),
        currentSituation: answers.currentSituation,
        skillRoles: answers.skillRoles,
        skillRankings: answers.skillRankings,
        primaryGoal: answers.primaryGoal,
        trainingDaysPerUnit: Number(answers.trainingDaysPerUnit),
        trainingPeriodUnit: answers.trainingPeriodUnit,
        experienceYears: Number(answers.experienceYears),
        competitiveExperienceYears: Number(answers.competitiveExperienceYears),
        teamName: answers.teamName.trim(),
        teamRole: answers.teamRole,
        positions: answers.positions,
      };
      let userForCache = registeredUser;
      if (previewMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        if (onComplete) onComplete();
        else setLocation("/hub");
        return;
      }
      if (signupMode && !accountCreated) {
        const registerResponse = await apiRequest("POST", "/api/auth/register", {
          firstName: completeAnswers.firstName,
          lastName: completeAnswers.lastName,
          email: accountEmail.trim().toLowerCase(),
          password,
        });
        const registrationData = await registerResponse.json();
        if (registrationData?.token) storeAuthToken(registrationData.token);
        const { token: _token, ...userData } = registrationData;
        userForCache = userData;
        setRegisteredUser(userData);
        setAccountCreated(true);
        setPassword("");
      }
      if (signupMode) {
        await apiRequest("PUT", "/api/player-setup", { answers: completeAnswers });
      }
      await apiRequest("POST", "/api/player-setup/complete", { answers: completeAnswers });
      queryClient.setQueryData(SETUP_KEY, { answers: completeAnswers, completed: true });
      if (signupMode && userForCache) queryClient.setQueryData(["/api/auth/user"], userForCache);
      if (onComplete) onComplete();
      else setLocation("/welcome-workout");
    } catch (error) {
      setActionError(errorMessage(error, "We couldn't finish setting up your profile. Try again."));
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
    { eyebrow: "YOUR GAME", title: "Rank your skills.", description: "Give each label a different skill so we can focus training where it matters." },
    { eyebrow: "YOUR DRIVE", title: "Your goal and training rhythm.", description: "A few numbers help us match the plan to your experience." },
    { eyebrow: "YOUR COURT", title: "Name your team and role.", description: "Tell us which team you play for and how you contribute." },
    { eyebrow: "YOUR ACCOUNT", title: signupMode ? "Create your PLAYR1 profile." : "Finish your player setup.", description: signupMode ? "" : "Your customized drills will be built in your PLAYR1 profile." },
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
          {signupMode && step === 1 && !previewMode && (
            <button
              type="button"
              onClick={() => setLocation("/auth")}
              className="ml-auto mr-2 rounded-lg px-2 py-2 text-xs font-semibold text-zinc-400 transition hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              data-testid="button-existing-account-signin"
            >
              Already have an account? Sign in
            </button>
          )}
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
            {stepCopy.description && <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">{stepCopy.description}</p>}
          </div>

          <section className="space-y-6 rounded-2xl border border-zinc-800/90 bg-[#0e0e0d] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-6" aria-label={`Step ${step} questions`}>
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField id="first-name" label="First name" value={answers.firstName} onChange={(value) => update("firstName", value)} placeholder="First name" autoComplete="given-name" />
                  <TextField id="last-name" label="Last name" value={answers.lastName} onChange={(value) => update("lastName", value)} placeholder="Last name" autoComplete="family-name" />
                </div>
                <ChoiceGroup title="What best describes your current basketball situation?" options={SITUATIONS} value={answers.currentSituation} onChange={(value) => update("currentSituation", value)} testPrefix="situation" columns={2} />
                <fieldset className="space-y-2.5">
                  <legend className="text-sm font-bold text-zinc-200">Which positions do you play?</legend>
                  <p className="text-xs text-zinc-500">Select all that fit.</p>
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

            {step === 2 && (
              <div className="space-y-3">
                <p id="skill-rank-instructions" className="text-xs leading-relaxed text-zinc-400">
                  Drag one label to the skill that best fits the description.
                  <span className="sr-only"> On touch or keyboard, select a label, then select a skill. Each skill can only be used once.</span>
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SKILL_RANKS.map((rank) => (
                    <button
                      key={rank.key}
                      type="button"
                      draggable
                      aria-pressed={activeSkillRank === rank.key}
                      aria-label={`${rank.label}${answers.skillRankings[rank.key] ? `, assigned to ${answers.skillRankings[rank.key]}` : ""}. Drag onto a skill or select to choose one.`}
                      aria-describedby="skill-rank-instructions"
                      title={rank.label}
                      onClick={() => setActiveSkillRank(rank.key)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", rank.key);
                        event.dataTransfer.effectAllowed = "move";
                        setActiveSkillRank(rank.key);
                        setDraggingSkillRank(rank.key);
                      }}
                      onDragEnd={() => {
                        setDraggingSkillRank(null);
                        setDropTargetSkill(null);
                      }}
                      data-testid={`skill-rank-${rank.key}`}
                      className={`group flex min-h-[66px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        draggingSkillRank === rank.key
                          ? "border-orange-300 bg-orange-500/[0.18] opacity-70"
                          : activeSkillRank === rank.key
                          ? "border-orange-400/70 bg-orange-500/[0.12] shadow-[0_0_0_1px_rgba(251,146,60,0.15)]"
                          : "border-zinc-800 bg-[#111110] hover:border-zinc-700"
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-orange-400/20 bg-orange-500/10 text-orange-300">
                        <rank.icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="block max-w-full text-[10px] font-extrabold leading-tight text-zinc-100">{rank.shortLabel}</span>
                      <span className={`block max-w-full truncate text-[9px] leading-none ${answers.skillRankings[rank.key] ? "text-orange-200" : "text-zinc-600"}`}>
                        {answers.skillRankings[rank.key] || "Unassigned"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      aria-pressed={answers.skillRoles.includes(skill)}
                      onClick={() => assignSkill(skill)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropTargetSkill(skill);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                          setDropTargetSkill(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const droppedRank = SKILL_RANKS.find(({ key }) => key === event.dataTransfer.getData("text/plain"))?.key;
                        const rankKey = droppedRank ?? draggingSkillRank ?? activeSkillRank;
                        assignSkill(skill, rankKey);
                        setActiveSkillRank(rankKey);
                        setDraggingSkillRank(null);
                        setDropTargetSkill(null);
                      }}
                      data-testid={`skill-option-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      className={`flex min-h-[58px] flex-col items-start justify-center rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        dropTargetSkill === skill
                          ? "border-orange-300 bg-orange-500/[0.18] text-orange-50 shadow-[0_0_0_1px_rgba(251,146,60,0.18)]"
                          : answers.skillRoles.includes(skill)
                          ? "border-orange-400/60 bg-orange-500/[0.09] text-orange-50"
                          : "border-zinc-800 bg-[#111110] text-zinc-300 hover:border-zinc-700 hover:text-white"
                      }`}
                    >
                      <span className="text-sm font-bold">{skill}</span>
                      {answers.skillRoles.includes(skill) && (
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-orange-300">
                          {SKILL_RANKS.find((rank) => answers.skillRankings[rank.key] === skill)?.shortLabel}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {hasCompleteSkillRankings(answers) && (
                  <p className="flex items-center gap-2 text-xs font-semibold text-orange-300"><Check className="h-3.5 w-3.5" />All four labels have a unique skill.</p>
                )}
              </div>
            )}

            {step === 3 && (
              <>
                <SelectField id="primary-goal" label="What is your primary basketball goal?" value={answers.primaryGoal} onChange={(value) => update("primaryGoal", value)} options={GOALS} placeholder="Choose your goal" />
                <div className="space-y-2">
                  <label htmlFor="training-days" className="block text-sm font-bold text-zinc-200">How often do you train?</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="training-days"
                      type="number"
                      min={0}
                      max={answers.trainingPeriodUnit === "month" ? 31 : 7}
                      step={1}
                      value={answers.trainingDaysPerUnit}
                      onChange={(event) => update("trainingDaysPerUnit", event.target.value)}
                      placeholder="0"
                      className="h-12 w-24 rounded-xl border border-zinc-800 bg-[#111110] px-4 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-500/15"
                      data-testid="input-training-days"
                    />
                    <span className="text-sm text-zinc-400">days per</span>
                    <select
                      value={answers.trainingPeriodUnit}
                      onChange={(event) => update("trainingPeriodUnit", event.target.value)}
                      className="h-12 flex-1 rounded-xl border border-zinc-800 bg-[#111110] px-3 text-sm font-semibold text-zinc-100 outline-none focus:border-orange-400/70 focus:ring-2 focus:ring-orange-500/15"
                      aria-label="Training frequency period"
                      data-testid="select-training-period"
                    >
                      <option value="week">week</option>
                      <option value="month">month</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    id="experience-years"
                    label="Years playing basketball"
                    value={answers.experienceYears}
                    onChange={(value) => update("experienceYears", value)}
                    placeholder="e.g., 5"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                  <TextField
                    id="competitive-experience-years"
                    label="Years on a competitive team"
                    value={answers.competitiveExperienceYears}
                    onChange={(value) => update("competitiveExperienceYears", value)}
                    placeholder="e.g., 3"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <TextField
                  id="team-name"
                  label="Team name"
                  value={answers.teamName}
                  onChange={(value) => update("teamName", value)}
                  placeholder="Enter your current team"
                  autoComplete="organization"
                />
                <ChoiceGroup
                  title="How would you describe your current role on your team?"
                  options={TEAM_ROLES}
                  value={answers.teamRole}
                  onChange={(value) => update("teamRole", value)}
                  testPrefix="team-role"
                  columns={2}
                />
              </>
            )}

            {step === 5 && signupMode && (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  handleContinue();
                }}
                className="space-y-4"
              >
                <TextField
                  id="account-email"
                  label="Account email"
                  value={accountEmail}
                  onChange={updateAccountEmail}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  disabled={accountCreated}
                />
                <TextField
                  id="account-password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 8 characters"
                  type="password"
                  autoComplete="new-password"
                  disabled={accountCreated}
                />
                <p className="text-center text-sm font-bold leading-snug text-white">
                  Access Customized Drills Based on Your Profile
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="button-finish-setup"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-300/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 px-6 text-sm font-black text-[#17100b] shadow-[0_8px_28px_rgba(249,115,22,0.12)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:cursor-wait disabled:opacity-70"
                >
                  {busy
                    ? <><LoaderCircle className="h-4 w-4 animate-spin" />Creating profile…</>
                    : "Create Profile"}
                </button>
              </form>
            )}

            {(validationError || actionError) && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3 text-sm leading-relaxed text-red-200">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
                <span>{actionError || validationError}</span>
              </p>
            )}
          </section>

          {!(step === 5 && signupMode) && (
            <footer className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step < 5 && <p className="px-1 text-xs text-zinc-600">
                {signupMode ? "Your account is created after your player details are ready." : "Your answers help tune training to your game."}
            </p>}
            <button
              type="button"
              onClick={handleContinue}
              disabled={busy}
              data-testid={step === 5 ? "button-finish-setup" : "button-next"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-300/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-600 px-6 text-sm font-black text-[#17100b] shadow-[0_8px_28px_rgba(249,115,22,0.12)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-44"
            >
              {busy
                ? <><LoaderCircle className="h-4 w-4 animate-spin" />{step === 5 ? signupMode ? "Creating profile…" : "Finishing setup…" : "Saving…"}</>
                : <>{step === 5 ? signupMode ? "Create Profile" : "Finish Setup" : "Continue"}{step !== 5 && <ArrowRight className="h-4 w-4" />}</>}
            </button>
            </footer>
          )}
        </div>
      </div>
    </main>
  );
}