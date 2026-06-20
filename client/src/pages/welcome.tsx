import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { apiRequest, storeAuthToken } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/track";
import logoImg from "@assets/PNG_image_auth_trimmed.png";
import { Eye, EyeOff, ChevronRight, Dumbbell, Target, Zap, Shield, Brain } from "lucide-react";

// ─── Quiz questions (7 basketball + 3 account) ───────────────────────────────
const BASKETBALL_QUESTIONS = [
  {
    question: "How would you describe your playing style?",
    options: ["The Scorer — I put points on the board", "The Playmaker — I make everyone better", "The Defender — I take the best player every night", "The All-Around Player — I do whatever it takes"],
  },
  {
    question: "Which skill are you most confident in right now?",
    options: ["Ball handling & creating off the dribble", "Shooting — pull-up, spot-up, deep range", "Finishing at the rim & drawing contact", "Defense, reading the game & positioning"],
  },
  {
    question: "What's the #1 thing holding your game back?",
    options: ["Ball handling — my weak hand and dribble moves", "Shooting — my release, range, or consistency", "Athleticism — my first step and explosiveness", "Basketball IQ — my reads and court vision", "Mental game — staying locked in when it matters"],
  },
  {
    question: "Game's on the line. What do you do?",
    options: ["Give me the ball — I live for that moment", "I trust my teammates to execute", "I lock in on defense — that's my moment", "I calm everyone down and run the play"],
  },
  {
    question: "What best describes your role on your team?",
    options: ["Primary ball handler / lead guard", "Wing scorer / shooter", "Interior presence — paint and post", "Defensive specialist / energy guy", "I'm versatile — I play multiple positions"],
  },
  {
    question: "How many days per week can you realistically train?",
    options: ["1–2 days (limited schedule)", "3–4 days (solid commitment)", "5–6 days (serious grind)", "Every day — I'm all in"],
  },
  {
    question: "Where are you trying to take your basketball journey?",
    options: ["Just for the love of the game", "High school — make / dominate my team", "College basketball is the goal", "Professional / overseas player"],
  },
];

// ─── Result slide config ──────────────────────────────────────────────────────
const SLIDE_CONFIGS = [
  {
    key: "archetype",
    label: "YOUR ARCHETYPE",
    gradient: "from-orange-600 via-orange-500 to-amber-400",
    bg: "bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400",
    icon: "🏀",
    accentClass: "text-orange-900",
    subClass: "text-orange-950/70",
  },
  {
    key: "stage",
    label: "YOUR DEVELOPMENT STAGE",
    gradient: "from-blue-700 via-blue-500 to-cyan-400",
    bg: "bg-gradient-to-br from-blue-700 via-blue-500 to-cyan-400",
    icon: "📈",
    accentClass: "text-blue-950",
    subClass: "text-blue-950/70",
  },
  {
    key: "courtRole",
    label: "YOUR COURT ROLE",
    gradient: "from-purple-700 via-purple-500 to-violet-400",
    bg: "bg-gradient-to-br from-purple-700 via-purple-500 to-violet-400",
    icon: "⚡",
    accentClass: "text-purple-950",
    subClass: "text-purple-950/70",
  },
  {
    key: "bottleneck",
    label: "YOUR BOTTLENECK",
    gradient: "from-red-700 via-red-500 to-rose-400",
    bg: "bg-gradient-to-br from-red-700 via-red-500 to-rose-400",
    icon: "🔓",
    accentClass: "text-red-950",
    subClass: "text-red-950/70",
  },
  {
    key: "summary",
    label: "YOUR PLAYER PROFILE",
    gradient: "from-zinc-900 via-zinc-800 to-zinc-900",
    bg: "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900",
    icon: "✨",
    accentClass: "text-white",
    subClass: "text-zinc-300",
  },
];

const FOCUS_ICONS: Record<string, any> = {
  "Ball Handling": Zap,
  "Shooting": Target,
  "Finishing": Dumbbell,
  "Defense": Shield,
  "Conditioning": Dumbbell,
  "Basketball IQ": Brain,
};

type Phase = "intro" | "quiz" | "account" | "loading" | "results" | "workout";

interface AssessmentResult {
  archetype: string;
  archetypeTagline: string;
  stage: string;
  stageDescription: string;
  courtRole: string;
  courtRoleDescription: string;
  bottleneck: string;
  bottleneckDescription: string;
  summary: string;
  firstWorkout: { name: string; focus: string; duration: string; description: string }[];
}

export default function WelcomePage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Account fields
  const [firstName, setFirstName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountStep, setAccountStep] = useState(0); // 0=name, 1=email, 2=password
  const [accountError, setAccountError] = useState("");

  // Results
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [resultSlide, setResultSlide] = useState(0);
  const [slideIn, setSlideIn] = useState(true);

  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intro: auto-advance after 4s
  useEffect(() => {
    if (phase === "intro") {
      introTimerRef.current = setTimeout(() => setPhase("quiz"), 4000);
      return () => { if (introTimerRef.current) clearTimeout(introTimerRef.current); };
    }
  }, [phase]);

  const advanceIntro = useCallback(() => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    setPhase("quiz");
  }, []);

  // Quiz: handle answer selection with brief animation
  function handleAnswer(answer: string) {
    if (transitioning) return;
    setSelectedOption(answer);
    setTransitioning(true);
    setTimeout(() => {
      const newAnswers = [...answers, { question: BASKETBALL_QUESTIONS[quizStep].question, answer }];
      setAnswers(newAnswers);
      setSelectedOption(null);
      if (quizStep < BASKETBALL_QUESTIONS.length - 1) {
        setQuizStep(q => q + 1);
      } else {
        setPhase("account");
      }
      setTransitioning(false);
    }, 350);
  }

  // Account: advance between sub-steps
  function handleAccountNext() {
    setAccountError("");
    if (accountStep === 0) {
      if (!firstName.trim()) { setAccountError("Please enter your first name"); return; }
      setAccountStep(1);
    } else if (accountStep === 1) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim());
      if (!emailOk) { setAccountError("Please enter a valid email address"); return; }
      setAccountStep(2);
    } else {
      if (accountPassword.length < 8) { setAccountError("Password must be at least 8 characters"); return; }
      handleSubmit();
    }
  }

  async function handleSubmit() {
    setPhase("loading");
    try {
      // Register account
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), email: accountEmail.trim().toLowerCase(), password: accountPassword }),
        credentials: "include",
      });
      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        setAccountError(err.message || "Registration failed. Try a different email.");
        setAccountStep(1);
        setPhase("account");
        return;
      }
      const registerData = await registerRes.json();
      if (registerData?.token) storeAuthToken(registerData.token);
      track("signup", { userId: registerData?.id, source: "cinematic-onboarding" });

      // Run assessment
      const assessRes = await apiRequest("POST", "/api/onboarding/assess", { answers });
      const assessData: AssessmentResult = await assessRes.json();
      setResults(assessData);
      // Invalidate career query so hub picks up the new profile
      qc.invalidateQueries({ queryKey: ["/api/career"] });
      setPhase("results");
    } catch (err) {
      console.error("Onboarding error:", err);
      setAccountError("Something went wrong. Please try again.");
      setPhase("account");
    }
  }

  // Result slides navigation
  function advanceResult() {
    if (resultSlide < SLIDE_CONFIGS.length - 1) {
      setSlideIn(false);
      setTimeout(() => {
        setResultSlide(r => r + 1);
        setSlideIn(true);
      }, 250);
    } else {
      setPhase("workout");
    }
  }

  function finishOnboarding() {
    localStorage.setItem("playr1_new_onboarding", "1");
    // Invalidate auth so router recognizes the newly registered user
    qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    navigate("/hub");
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={advanceIntro}
        data-testid="screen-intro"
      >
        {/* Animated glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full bg-orange-500/20 blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">
          {/* Logo */}
          <img
            src={logoImg}
            alt="PLAYR1"
            className="h-20 w-auto object-contain"
            style={{ filter: "invert(0)" }}
            data-testid="img-intro-logo"
          />

          {/* Tagline */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs tracking-[0.3em] uppercase">Welcome to</p>
            <p className="text-white text-2xl font-bold tracking-tight">Your Basketball Journey</p>
          </div>

          {/* Orange line */}
          <div className="w-16 h-0.5 bg-orange-500 rounded-full" />

          {/* Subtitle */}
          <p className="text-white/60 text-sm max-w-xs leading-relaxed">
            Let's figure out who you are as a player in the next 2 minutes.
          </p>

          {/* Tap hint */}
          <p className="text-white/30 text-xs animate-pulse mt-4">Tap anywhere to begin</p>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = BASKETBALL_QUESTIONS[quizStep];
    const totalSteps = BASKETBALL_QUESTIONS.length + 3; // 7 quiz + 3 account
    const progress = ((quizStep + 1) / totalSteps) * 100;

    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col" data-testid="screen-quiz">
        {/* Progress */}
        <div className="shrink-0 px-5 pt-safe pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-500 text-xs font-medium">
              {quizStep + 1} of {BASKETBALL_QUESTIONS.length}
            </span>
            <span className="text-orange-400 text-xs font-bold tracking-wide">PLAYER ASSESSMENT</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col justify-center px-5 py-6 overflow-y-auto">
          <h2 className="text-white text-2xl font-bold leading-tight mb-8" data-testid="text-quiz-question">
            {q.question}
          </h2>

          <div className="space-y-3">
            {q.options.map((option, i) => {
              const isSelected = selectedOption === option;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  disabled={transitioning}
                  data-testid={`button-quiz-option-${i}`}
                  className={`
                    w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 active:scale-[0.98]
                    ${isSelected
                      ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20"
                      : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-orange-500/40 hover:bg-zinc-800"
                    }
                  `}
                >
                  <span className="text-sm font-medium leading-snug">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "account") {
    const totalSteps = BASKETBALL_QUESTIONS.length + 3;
    const progress = ((BASKETBALL_QUESTIONS.length + accountStep + 1) / totalSteps) * 100;

    const accountPrompts = [
      { label: "What's your first name?", sub: "We'll personalize everything for you.", type: "text", value: firstName, setter: setFirstName, placeholder: "Your first name", testId: "input-first-name" },
      { label: "What's your email address?", sub: "We'll save your results here.", type: "email", value: accountEmail, setter: setAccountEmail, placeholder: "you@example.com", testId: "input-email" },
      { label: "Create your password", sub: "Minimum 8 characters.", type: showPassword ? "text" : "password", value: accountPassword, setter: setAccountPassword, placeholder: "Min. 8 characters", testId: "input-password" },
    ];
    const cur = accountPrompts[accountStep];

    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col" data-testid="screen-account">
        {/* Progress */}
        <div className="shrink-0 px-5 pt-safe pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-500 text-xs font-medium">
              {BASKETBALL_QUESTIONS.length + accountStep + 1} of {totalSteps}
            </span>
            <span className="text-orange-400 text-xs font-bold tracking-wide">BUILD YOUR PROFILE</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-5 py-6">
          <h2 className="text-white text-2xl font-bold leading-tight mb-2">{cur.label}</h2>
          <p className="text-zinc-500 text-sm mb-8">{cur.sub}</p>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={cur.type as string}
                value={cur.value}
                onChange={e => cur.setter(e.target.value)}
                placeholder={cur.placeholder}
                autoFocus
                data-testid={cur.testId}
                onKeyDown={e => e.key === "Enter" && handleAccountNext()}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-5 py-4 text-base placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {accountStep === 2 && (
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              )}
            </div>

            {accountError && (
              <p className="text-red-400 text-sm" data-testid="text-account-error">{accountError}</p>
            )}

            <button
              onClick={handleAccountNext}
              data-testid="button-account-next"
              className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2"
            >
              {accountStep === 2 ? "Build My Profile" : "Continue"}
              <ChevronRight className="h-5 w-5" />
            </button>

            {accountStep > 0 && (
              <button
                onClick={() => { setAccountError(""); setAccountStep(s => s - 1); }}
                className="w-full text-zinc-500 text-sm py-2"
                data-testid="button-account-back"
              >
                Go back
              </button>
            )}
          </div>
        </div>

        {/* Already have account link */}
        <div className="shrink-0 px-5 pb-safe pb-8 text-center">
          <a href="/auth" className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-8" data-testid="screen-loading">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-zinc-800" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-white text-xl font-bold">Building your profile…</p>
          <p className="text-zinc-500 text-sm">Our AI is analyzing your answers</p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (phase === "results" && results) {
    const cfg = SLIDE_CONFIGS[resultSlide];
    const isLast = resultSlide === SLIDE_CONFIGS.length - 1;

    const getTitle = () => {
      switch (cfg.key) {
        case "archetype": return results.archetype;
        case "stage": return results.stage;
        case "courtRole": return results.courtRole;
        case "bottleneck": return results.bottleneck;
        case "summary": return `${results.archetype.split(" ").slice(1).join(" ")}`;
        default: return "";
      }
    };

    const getDescription = () => {
      switch (cfg.key) {
        case "archetype": return results.archetypeTagline;
        case "stage": return results.stageDescription;
        case "courtRole": return results.courtRoleDescription;
        case "bottleneck": return results.bottleneckDescription;
        case "summary": return results.summary;
        default: return "";
      }
    };

    return (
      <div
        className={`fixed inset-0 ${cfg.bg} flex flex-col`}
        onClick={advanceResult}
        data-testid={`screen-result-${resultSlide}`}
        style={{ cursor: "pointer" }}
      >
        {/* Dot indicator */}
        <div className="shrink-0 flex items-center justify-center gap-2 pt-safe pt-8">
          {SLIDE_CONFIGS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${i === resultSlide ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/30"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div
          className={`flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-250 ${slideIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transition: "opacity 0.25s, transform 0.25s" }}
        >
          {/* Label */}
          <p className={`text-xs font-bold tracking-[0.3em] uppercase mb-4 ${cfg.subClass}`} data-testid="text-result-label">
            {cfg.label}
          </p>

          {/* Icon */}
          <div className="text-6xl mb-6" role="img">{cfg.icon}</div>

          {/* Title */}
          <h1 className={`text-4xl font-black leading-tight mb-4 ${cfg.accentClass}`} data-testid="text-result-title">
            {getTitle()}
          </h1>

          {/* Description */}
          <p className={`text-lg leading-relaxed max-w-sm ${cfg.key === "summary" ? "text-zinc-300" : cfg.subClass}`} data-testid="text-result-description">
            {getDescription()}
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0 px-8 pb-safe pb-10 text-center">
          {isLast ? (
            <button
              onClick={(e) => { e.stopPropagation(); setPhase("workout"); }}
              data-testid="button-see-workout"
              className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              See My First Workout <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <p className={`text-sm ${cfg.key === "summary" ? "text-zinc-500" : cfg.subClass}`}>
              Tap anywhere to continue
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "workout" && results) {
    const drills = results.firstWorkout || [];
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col overflow-y-auto" data-testid="screen-workout">
        {/* Header */}
        <div className="shrink-0 px-5 pt-safe pt-8 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">Your First Workout</p>
          </div>
          <h1 className="text-white text-2xl font-black leading-tight">
            Built for {results.archetype}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Targeting your bottleneck: <span className="text-orange-400 font-medium">{results.bottleneck}</span>
          </p>
        </div>

        {/* Drills */}
        <div className="flex-1 px-4 space-y-3 pb-4">
          {drills.map((drill, i) => {
            const FocusIcon = FOCUS_ICONS[drill.focus] || Dumbbell;
            return (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                data-testid={`card-workout-drill-${i}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FocusIcon className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-white font-bold text-sm leading-snug">{drill.name}</p>
                      <span className="text-orange-400 text-xs font-medium shrink-0">{drill.duration}</span>
                    </div>
                    <p className="text-zinc-500 text-xs">{drill.focus}</p>
                    <p className="text-zinc-400 text-sm mt-1.5 leading-snug">{drill.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="shrink-0 px-4 pb-safe pb-8 space-y-3 pt-2">
          <button
            onClick={finishOnboarding}
            data-testid="button-start-training"
            className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white rounded-2xl py-4 font-black text-base transition-all"
          >
            Let's Get to Work 🏀
          </button>
          <p className="text-zinc-600 text-xs text-center">
            You can save this workout and log it from your hub
          </p>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
      <div className="text-white">Loading…</div>
    </div>
  );
}
