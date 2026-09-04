import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronRight, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEVELOPMENT_STAGES = [
  {
    name: "Foundation Builder",
    description: "Just starting to build real basketball habits — learning fundamentals, getting comfortable, figuring out how the game works.",
    needsMost: "Repetition of the basics in a low-pressure environment. Confidence-building matters more than complex skill work right now.",
  },
  {
    name: "Aspiring Player",
    description: "Has the fundamentals but hasn't found a clear role yet — working hard without consistent payoff in games.",
    needsMost: "Help identifying natural strengths so the effort starts pointing in one clear direction instead of everywhere at once.",
  },
  {
    name: "Team Contributor",
    description: "Has earned a steady role and reliably contributes — not yet a primary option, but a trusted piece of the rotation.",
    needsMost: "Expanding their offensive or defensive role incrementally, and reps in slightly higher-pressure situations.",
  },
  {
    name: "Impact Player",
    description: "A player their team genuinely leans on — someone whose performance noticeably swings the outcome of games.",
    needsMost: "Skill refinement at game speed and mental tools for handling pressure — the margin for error is smaller at this stage.",
  },
  {
    name: "Difference Maker",
    description: "A go-to player capable of single-handedly changing a game's outcome through scoring, defense, or both.",
    needsMost: "Elite-level competition to stay challenged, and leadership development — how they affect teammates matters as much as their own production.",
  },
  {
    name: "Elite Competitor",
    description: "Operating at the highest level of their current environment — the standard others are measured against.",
    needsMost: "A path to the next level of competition and structured habits around recovery, mindset, and consistency.",
  },
] as const;

function parseGrowthAreas(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function DevelopmentPage() {
  const [, navigate] = useLocation();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const { data: career, isLoading } = useQuery<any>({ queryKey: ["/api/career"] });

  const { data: allArchetypes } = useQuery<any[]>({
    queryKey: ["/api/archetypes"],
    enabled: !!career?.assessmentArchetype,
  });

  useEffect(() => {
    if (career?.assessmentStage) setSelectedStage(career.assessmentStage);
  }, [career?.assessmentStage]);

  const hasAssessment = Boolean(career?.assessmentArchetype || career?.assessmentStage);
  const activeStage = selectedStage || career?.assessmentStage || DEVELOPMENT_STAGES[0].name;
  const stageInfo = DEVELOPMENT_STAGES.find(stage => stage.name === activeStage) || DEVELOPMENT_STAGES[0];
  const growthAreas = parseGrowthAreas(career?.assessmentCourtRoleDescription);
  const archetype = allArchetypes?.find((item: any) =>
    item.name === career?.assessmentArchetype || item.slug === career?.assessmentArchetype
  );
  const archetypeTagline = career?.assessmentArchetypeTagline || archetype?.tagline;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile-hub")}
          className="text-zinc-400 hover:text-white"
          data-testid="button-back-profile-hub"
          aria-label="Back to Profile Hub"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-400">Player Development</p>
          <h1 className="text-2xl font-black text-white">Development</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 animate-pulse">
          <div className="h-5 w-48 rounded bg-zinc-800" />
          <div className="h-4 w-full max-w-md rounded bg-zinc-800 mt-3" />
          <div className="h-32 rounded-xl bg-zinc-800 mt-5" />
        </div>
      ) : !hasAssessment ? (
        <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/50 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mb-4">
            <Target className="h-7 w-7 text-orange-400" />
          </div>
          <h2 className="text-lg font-black text-white">Discover your PLAYR1 profile</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mt-2 mb-5">
            Take the assessment to see your player archetype, development stage, competition role, and growth areas.
          </p>
          <Button
            onClick={() => navigate("/assessment")}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
            data-testid="button-take-assessment"
          >
            Take the Assessment <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Your PLAYR1 Assessment</h2>
              <p className="text-sm text-zinc-500 mt-1">A snapshot of where your game is today and what to work on next.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/assessment")}
              className="shrink-0 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 gap-1.5"
              data-testid="button-retake-assessment"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-900/60 border border-orange-500/20 p-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-orange-400/70 mb-2">Player Archetype</p>
              <p className="text-xl font-black text-white">{career.assessmentArchetype || "Your player type"}</p>
              {archetypeTagline && <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{archetypeTagline}</p>}
              {archetype?.description && <p className="text-xs text-zinc-400 mt-3 leading-relaxed">{archetype.description}</p>}
              {Array.isArray(archetype?.traits) && archetype.traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {archetype.traits.slice(0, 4).map((trait: string) => (
                    <span key={trait} className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-300 text-[10px] font-bold">{trait}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Competition Role</p>
              <p className="text-xl font-black text-white">{career.assessmentCourtRole || "Not available"}</p>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">How you currently show up and contribute on the court.</p>
              {career.assessmentPrimaryGoal && (
                <div className="mt-5 pt-4 border-t border-zinc-800">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 mb-1">Primary Goal</p>
                  <p className="text-sm font-bold text-orange-400">{career.assessmentPrimaryGoal}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Development Stage</p>
                <p className="text-xl font-black text-white mt-1">{career.assessmentStage || "Not available"}</p>
              </div>
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider text-right">Your current stage</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DEVELOPMENT_STAGES.map(stage => {
                const isCurrent = stage.name === career.assessmentStage;
                const isSelected = stage.name === activeStage;
                return (
                  <button
                    key={stage.name}
                    onClick={() => setSelectedStage(stage.name)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                      isSelected
                        ? "border-orange-500/60 bg-orange-500/15 text-white"
                        : "border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                    data-testid={`button-development-stage-${stage.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className={isCurrent ? "font-black" : "font-medium"}>{stage.name}</span>
                    {isCurrent && <span className="block text-[9px] text-orange-400 mt-1">YOU ARE HERE</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-base font-bold text-white">{stageInfo.name}</p>
              <p className="text-sm text-zinc-400 leading-relaxed mt-1">{stageInfo.description}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase text-orange-400/70 mt-4 mb-1">What you need most</p>
              <p className="text-sm text-zinc-500 leading-relaxed">{stageInfo.needsMost}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Main Growth Area</p>
              <p className="text-base font-black text-orange-400">{career.assessmentBottleneck || "Not available"}</p>
              {career.assessmentBottleneckDescription && (
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{career.assessmentBottleneckDescription}</p>
              )}
            </div>
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Other Focus Areas</p>
              {growthAreas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {growthAreas.map(area => (
                    <span key={area} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 font-semibold">{area}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Keep building your game across all areas.</p>
              )}
            </div>
          </div>

          {(career.assessmentMindsetBand || career.assessmentDedicationBand || career.assessmentExperienceBand) && (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-3">Assessment Signals</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[["Mindset", career.assessmentMindsetBand], ["Dedication", career.assessmentDedicationBand], ["Experience", career.assessmentExperienceBand]]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-zinc-800/60 px-3 py-2.5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
                      <p className="text-sm text-zinc-200 font-bold mt-0.5">{value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-1">
        <Link href="/profile-hub" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-orange-400 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile Hub
        </Link>
      </div>
    </div>
  );
}