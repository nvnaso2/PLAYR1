import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight,
  Download, Share2, RotateCcw,
} from "lucide-react";
import logoImg from "@assets/PNG_image_auth_trimmed.png";
import {
  ARCHETYPE_META,
  BOTTLENECKS,
  STAGES,
  STAGE_ORDER,
} from "@/pages/welcome";
import type { Archetype } from "@shared/schema";
import { ARCHETYPE_DISPLAY_ORDER, findArchetypeDefinition, getCoreCharacteristics } from "@/components/archetype-content";

function getCharIcon(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("shoot") || text.includes("shot") || text.includes("range") || text.includes("arc")) return "🎯";
  if (text.includes("handling") || text.includes("dribble") || text.includes("ball")) return "🏀";
  if (text.includes("defense") || text.includes("defensive") || text.includes("deny") || text.includes("pressure")) return "🛡️";
  if (text.includes("finish") || text.includes("contact") || text.includes("paint")) return "💪";
  if (text.includes("pass") || text.includes("vision") || text.includes("making") || text.includes("court")) return "👁️";
  if (text.includes("speed") || text.includes("burst") || text.includes("quick") || text.includes("lateral") || text.includes("explosive")) return "⚡";
  if (text.includes("rebound")) return "🏆";
  if (text.includes("block") || text.includes("protect") || text.includes("anchor")) return "🤚";
  if (text.includes("iq") || text.includes("versatil") || text.includes("selfless")) return "🧠";
  if (text.includes("leadership") || text.includes("tempo")) return "⭐";
  return "🏀";
}

function ScoreBar({ label, score, band, color = "bg-orange-500" }: {
  label: string;
  score: number;
  band: string;
  color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">{label}</span>
        <span className="text-zinc-400 text-xs">
          {score} · <span className="text-white font-semibold">{band}</span>
        </span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalizeArchetype(value: unknown): string {
  if (typeof value !== "string") return "Two-Way Player";
  const withoutArticle = value.replace(/^the\s+/i, "").trim().toLowerCase();
  return Object.keys(ARCHETYPE_META).find(name => name.toLowerCase() === withoutArticle) || "Two-Way Player";
}

export default function DevelopmentPage() {
  const [, navigate] = useLocation();
  const [resultSlide, setResultSlide] = useState(0);
  const [slideIn, setSlideIn] = useState(true);
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedBottleneck, setSelectedBottleneck] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "shared">("idle");
  const summaryCardRef = useRef<HTMLDivElement>(null);

  const { data: career, isLoading } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: profile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: archetypeDefinitions = [] } = useQuery<Archetype[]>({ queryKey: ["/api/archetypes"] });

  useEffect(() => {
    if (career?.assessmentArchetype) setSelectedArchetype(normalizeArchetype(career.assessmentArchetype));
    if (career?.assessmentStage) setSelectedStage(career.assessmentStage);
    if (career?.assessmentBottleneck) setSelectedBottleneck(career.assessmentBottleneck);
  }, [career?.assessmentArchetype, career?.assessmentStage, career?.assessmentBottleneck]);

  const hasAssessment = Boolean(career?.assessmentArchetype || career?.assessmentStage);
  const currentArchetype = normalizeArchetype(career?.assessmentArchetype);
  const viewingArchetype = selectedArchetype || currentArchetype;
  const archetypeMeta = ARCHETYPE_META[viewingArchetype] || ARCHETYPE_META["Two-Way Player"];
  const archetypeDefinition = findArchetypeDefinition(archetypeDefinitions, viewingArchetype);
  const archetypePrimaryHex = archetypeDefinition?.primaryHex || archetypeMeta.primaryHex;
  const coreCharacteristics = archetypeDefinition
    ? getCoreCharacteristics(archetypeDefinition.traits)
    : archetypeMeta.strengths.slice(0, 4);
  const currentStage = career?.assessmentStage || STAGE_ORDER[0];
  const viewingStage = selectedStage || currentStage;
  const stageInfo = STAGES[viewingStage] || STAGES[STAGE_ORDER[0]];
  const currentBottleneck = career?.assessmentBottleneck || "Basketball IQ";
  const viewingBottleneck = selectedBottleneck || currentBottleneck;
  const bottleneckInfo = BOTTLENECKS[viewingBottleneck] || BOTTLENECKS["Basketball IQ"];
  const topGrowthAreas = parseArray(career?.assessmentCourtRoleDescription);
  const archetypeOptions = ARCHETYPE_DISPLAY_ORDER.filter(name => ARCHETYPE_META[name]);
  const bottleneckOptions = Object.keys(BOTTLENECKS);
  const displayName = profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const actualArchetypeLabel = career?.assessmentArchetype || currentArchetype;
  const actualMeta = ARCHETYPE_META[currentArchetype] || ARCHETYPE_META["Two-Way Player"];
  const slideBgs = [
    "bg-black",
    "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900",
    "bg-gradient-to-br from-zinc-950 via-red-950/40 to-zinc-950",
    "bg-black",
  ];
  const slideLabels = ["YOUR ARCHETYPE", "YOUR DEVELOPMENT STAGE", "YOUR #1 GROWTH AREA", "YOUR PLAYR1 JOURNEY"];
  const isLast = resultSlide === 3;

  function moveToSlide(nextSlide: number) {
    if (nextSlide < 0 || nextSlide > 3 || nextSlide === resultSlide) return;
    setSlideIn(false);
    window.setTimeout(() => {
      setResultSlide(nextSlide);
      setSlideIn(true);
    }, 160);
  }

  function handleNext(e?: React.MouseEvent) {
    e?.stopPropagation();
    moveToSlide(resultSlide + 1);
  }

  function handlePrevious(e?: React.MouseEvent) {
    e?.stopPropagation();
    moveToSlide(resultSlide - 1);
  }

  async function handleShareSummary() {
    if (!summaryCardRef.current || shareState !== "idle") return;
    setShareState("sharing");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(summaryCardRef.current, {
        backgroundColor: "#09090b",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "playr1-player-profile.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My PLAYR1 Player Profile" });
      } else {
        const link = document.createElement("a");
        link.download = "playr1-player-profile.png";
        link.href = dataUrl;
        link.click();
      }
      setShareState("shared");
      window.setTimeout(() => setShareState("idle"), 3000);
    } catch {
      setShareState("idle");
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-white text-xl font-bold">Loading your development profile…</p>
      </div>
    );
  }

  if (!hasAssessment) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 text-center">
        <p className="text-orange-500/70 text-[10px] font-black tracking-[0.45em] uppercase mb-3">PLAYER DEVELOPMENT</p>
        <h1 className="text-white text-3xl font-black">Your profile is waiting.</h1>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mt-3 mb-6">
          Complete the PLAYR1 assessment to unlock your archetype, stage, role, and growth path.
        </p>
        <button
          onClick={() => navigate("/assessment")}
          className="w-full max-w-sm bg-orange-600 hover:bg-orange-500 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2"
          data-testid="button-take-assessment"
        >
          Take the Assessment <ArrowRight className="h-5 w-5" />
        </button>
        <button onClick={() => navigate("/profile-hub")} className="text-zinc-600 text-sm mt-4 hover:text-zinc-400" data-testid="button-back-profile-hub">
          Back to Profile Hub
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 ${slideBgs[resultSlide]} flex flex-col overflow-hidden`}
      data-testid={`screen-development-result-${resultSlide}`}
    >
      <div className="relative z-20 shrink-0 flex items-center justify-between px-5 pt-4 pb-1">
        <button
          onClick={handlePrevious}
          disabled={resultSlide === 0}
          className={`flex items-center gap-1 text-[10px] font-bold tracking-[0.25em] uppercase transition-colors ${
            resultSlide === 0 ? "text-white/15 cursor-default" : "text-white/50 hover:text-white"
          }`}
          data-testid="button-development-back"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <button
              key={i}
              onClick={() => moveToSlide(i)}
              aria-label={`Go to result ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${i === resultSlide ? "w-5 h-1.5 bg-white/70" : "w-1.5 h-1.5 bg-white/20"}`}
            />
          ))}
        </div>
        <button
          onClick={() => navigate("/profile-hub")}
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/35 hover:text-white/70"
          data-testid="button-development-exit"
        >
          Exit
        </button>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto transition-opacity duration-200 ${slideIn ? "opacity-100" : "opacity-0"}`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {resultSlide === 0 && (
          <div className="px-5 pb-7 pt-2 max-w-lg mx-auto">
            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.4em] uppercase text-center mb-3">ASSESSMENT COMPLETE</p>
            <div className="text-center mb-5">
              {displayName && <p className="text-white text-2xl font-black tracking-tight leading-tight">{displayName.toUpperCase()},</p>}
              <p className="text-zinc-400 text-sm font-bold tracking-[0.2em] uppercase mb-1">YOU ARE A</p>
              <h1
                className="text-5xl font-black leading-tight tracking-tight"
                 style={{ color: archetypePrimaryHex, textShadow: `0 0 30px ${archetypePrimaryHex}55, 0 0 60px ${archetypePrimaryHex}22` }}
                data-testid="text-development-archetype"
              >
                {viewingArchetype.toUpperCase()}
              </h1>
              {viewingArchetype === currentArchetype && (
                <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-white/10 text-white/55 text-[9px] font-bold tracking-widest uppercase">
                  Your profile answer
                </span>
              )}
            </div>

            <div className="flex justify-center mb-5">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-5xl"
                style={{
                   background: `radial-gradient(circle, ${archetypePrimaryHex}28 0%, ${archetypePrimaryHex}0a 55%, transparent 75%)`,
                   border: `1.5px solid ${archetypePrimaryHex}55`,
                   boxShadow: `0 0 32px ${archetypePrimaryHex}40, 0 0 64px ${archetypePrimaryHex}18, inset 0 0 20px ${archetypePrimaryHex}10`,
                }}
              >
                {archetypeMeta.icon}
              </div>
            </div>

            <p className="text-white/45 text-[10px] font-bold tracking-[0.3em] uppercase mb-2">EXPLORE ARCHETYPES</p>
            <div className="grid grid-cols-2 gap-1.5 mb-5">
              {archetypeOptions.map(name => {
                const isCurrent = name === currentArchetype;
                const isViewing = name === viewingArchetype;
                return (
                  <button
                    key={name}
                    onClick={e => { e.stopPropagation(); setSelectedArchetype(name); }}
                    className={`text-left px-2.5 py-2 rounded-xl border transition-all ${
                      isViewing ? "border-white/50 bg-white/15 text-white" : isCurrent ? "border-orange-500/60 bg-orange-500/10 text-white/85" : "border-white/10 bg-white/5 text-white/45 hover:text-white/75"
                    }`}
                    data-testid={`button-development-archetype-${name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="text-xs font-semibold">{name}</span>
                    {isCurrent && <span className="block text-[8px] text-orange-300 mt-0.5 uppercase tracking-wider">Your answer</span>}
                  </button>
                );
              })}
            </div>

             {archetypeDefinition?.description && (
               <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-5">
                 <p className="font-black tracking-[0.25em] uppercase text-[10px] mb-2" style={{ color: archetypePrimaryHex }}>ARCHETYPE PROFILE</p>
                 <p className="text-zinc-300 text-sm leading-relaxed">{archetypeDefinition.description}</p>
               </div>
             )}

             <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-5">
               <p className="font-black tracking-[0.25em] uppercase text-[10px] mb-3" style={{ color: archetypePrimaryHex }}>COACH P SAYS</p>
              <div className="flex gap-2.5 items-start">
                 <span className="text-2xl leading-none font-black shrink-0 mt-0.5" style={{ color: `${archetypePrimaryHex}70` }}>"</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{archetypeMeta.coachP}</p>
              </div>
            </div>

             <p className="font-black tracking-[0.25em] uppercase text-[10px] mb-3" style={{ color: archetypePrimaryHex }}>CORE CHARACTERISTICS</p>
            <div className="space-y-2 mb-5">
               {coreCharacteristics.map((strength, i) => (
                 <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border" style={{ background: `${archetypePrimaryHex}08`, borderColor: `${archetypePrimaryHex}20` }}>
                   <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: `${archetypePrimaryHex}18`, border: `1px solid ${archetypePrimaryHex}30` }}>
                    {getCharIcon(strength)}
                  </div>
                  <span className="text-white text-sm font-semibold flex-1">{strength}</span>
                   <ChevronRight className="w-4 h-4 shrink-0" style={{ color: `${archetypePrimaryHex}60` }} />
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl font-black text-sm tracking-[0.3em] uppercase transition-all active:scale-[0.98]"
               style={{ background: archetypePrimaryHex, color: "#000", boxShadow: `0 0 24px ${archetypePrimaryHex}50` }}
              data-testid="button-development-next"
            >
              CONTINUE <ArrowRight className="inline-block ml-2 h-4 w-4" />
            </button>
          </div>
        )}

        {resultSlide === 1 && (
          <div className="px-6 pb-7 pt-2 max-w-lg mx-auto">
            <p className="text-white/50 text-[10px] font-bold tracking-[0.3em] uppercase mb-3">{slideLabels[1]}</p>
            <div className="flex flex-col gap-1.5 mb-5">
              {STAGE_ORDER.map((stage, i) => {
                const isCurrent = stage === currentStage;
                const isViewing = stage === viewingStage;
                const isBefore = STAGE_ORDER.indexOf(currentStage) > i;
                return (
                  <button
                    key={stage}
                    onClick={e => { e.stopPropagation(); setSelectedStage(stage); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${
                      isViewing ? "bg-white/20 border-white/40" : isCurrent ? "bg-orange-500/10 border-orange-500/50" : isBefore ? "opacity-40 border-transparent" : "opacity-25 border-transparent"
                    }`}
                    data-testid={`button-development-stage-${stage.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? "bg-orange-400" : isViewing ? "bg-white" : "bg-white/40"}`} />
                    <span className={`text-sm flex-1 ${isViewing || isCurrent ? "font-black text-white" : "font-medium text-white/65"}`}>{stage}</span>
                    {isCurrent && <span className="text-[9px] font-bold text-orange-300 tracking-wider uppercase">Your answer</span>}
                  </button>
                );
              })}
            </div>
            <h1 className="text-white text-2xl font-black leading-tight mb-2" data-testid="text-development-stage">{viewingStage.toUpperCase()}</h1>
            <p className="text-white/65 text-sm leading-relaxed mb-3">{stageInfo.description}</p>
            <div className="rounded-2xl p-3.5 bg-white/8 border border-white/10">
              <p className="text-white/35 text-[10px] font-bold tracking-widest mb-1.5">WHAT YOU NEED MOST</p>
              <p className="text-white/75 text-sm leading-relaxed">{stageInfo.needsMost}</p>
            </div>
            {viewingStage !== currentStage && <p className="text-orange-300/70 text-xs mt-3">Previewing another stage. Your saved answer is highlighted above.</p>}
            <div className="flex gap-2 mt-6">
              <button onClick={handlePrevious} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/55 text-sm font-bold hover:text-white" data-testid="button-development-previous">BACK</button>
              <button onClick={handleNext} className="flex-1 py-3 rounded-2xl bg-white/90 text-black text-sm font-black hover:bg-white" data-testid="button-development-next">NEXT <ArrowRight className="inline-block ml-1 h-4 w-4" /></button>
            </div>
          </div>
        )}

        {resultSlide === 2 && (
          <div className="px-6 pb-7 pt-2 max-w-lg mx-auto">
            <p className="text-white/50 text-[10px] font-bold tracking-[0.3em] uppercase mb-3">{slideLabels[2]}</p>
            {topGrowthAreas.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                {topGrowthAreas.map((area, i) => (
                  <div key={area} className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 shrink-0 ${area === currentBottleneck ? "text-white" : "text-white/40"}`}>#{i + 1}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${area === currentBottleneck ? "bg-white" : "bg-white/30"}`} style={{ width: i === 0 ? "100%" : i === 1 ? "60%" : "40%" }} />
                    </div>
                    <span className={`text-xs font-semibold w-28 ${area === currentBottleneck ? "text-white" : "text-white/50"}`}>{area}</span>
                  </div>
                ))}
              </div>
            )}
            <h1 className="text-white text-3xl font-black leading-tight mb-3" data-testid="text-development-bottleneck">{viewingBottleneck.toUpperCase()}</h1>
            <p className="text-white/65 text-sm leading-relaxed mb-3">
              This isn't a weakness call-out — it's the single highest-leverage area you can work on right now to get better, faster.
            </p>
            <div className="rounded-2xl p-3.5 bg-white/8 border border-white/10 mb-5">
              <p className="text-white/35 text-[10px] font-bold tracking-widest mb-1.5">WHAT IMPROVING THIS UNLOCKS</p>
              <p className="text-white/75 text-sm leading-relaxed">{bottleneckInfo.unlocks}</p>
            </div>
            <p className="text-white/45 text-[10px] font-bold tracking-[0.3em] uppercase mb-2">EXPLORE GROWTH AREAS</p>
            <div className="grid grid-cols-2 gap-1.5">
              {bottleneckOptions.map(area => {
                const isCurrent = area === currentBottleneck;
                const isViewing = area === viewingBottleneck;
                return (
                  <button
                    key={area}
                    onClick={e => { e.stopPropagation(); setSelectedBottleneck(area); }}
                    className={`text-left px-2.5 py-2 rounded-xl border text-xs transition-all ${isViewing ? "bg-white/20 border-white/45 text-white" : isCurrent ? "bg-orange-500/10 border-orange-500/55 text-white/85" : "bg-white/5 border-white/10 text-white/45 hover:text-white/75"}`}
                    data-testid={`button-development-growth-${area.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {area}
                    {isCurrent && <span className="block text-[8px] text-orange-300 mt-0.5 uppercase tracking-wider">Your answer</span>}
                  </button>
                );
              })}
            </div>
            {viewingBottleneck !== currentBottleneck && <p className="text-orange-300/70 text-xs mt-3">Previewing another growth area. Your saved answer is highlighted above.</p>}
            <div className="flex gap-2 mt-6">
              <button onClick={handlePrevious} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/55 text-sm font-bold hover:text-white" data-testid="button-development-previous">BACK</button>
              <button onClick={handleNext} className="flex-1 py-3 rounded-2xl bg-white/90 text-black text-sm font-black hover:bg-white" data-testid="button-development-next">NEXT <ArrowRight className="inline-block ml-1 h-4 w-4" /></button>
            </div>
          </div>
        )}

        {resultSlide === 3 && (
          <div className="px-4 py-4 max-w-lg mx-auto">
            <div ref={summaryCardRef} className="rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 mb-4" data-testid="card-development-summary">
              <div className={`bg-gradient-to-br ${actualMeta.gradient} px-5 pt-5 pb-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white/40 text-[9px] font-bold tracking-[0.3em] uppercase mb-1">PLAYR1 PLAYER PROFILE</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl leading-none">{actualMeta.icon}</span>
                      <div>
                        <h3 className="text-white text-lg font-black leading-tight">{actualArchetypeLabel}</h3>
                        <p className="text-white/55 text-[10px] leading-snug max-w-[180px]">{career.assessmentArchetypeTagline || actualMeta.tagline}</p>
                      </div>
                    </div>
                  </div>
                  <img src={logoImg} alt="PLAYR1" className="h-6 w-auto object-contain shrink-0 opacity-70" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/70 text-[10px] font-bold">{career.assessmentStage || currentStage}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/70 text-[10px] font-bold">{career.assessmentCourtRole || "Player"}</span>
                </div>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="pb-3 border-b border-zinc-800">
                  <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mb-1">#1 GROWTH AREA</p>
                  <p className="text-orange-400 text-xl font-black">{career.assessmentBottleneck || currentBottleneck}</p>
                  <p className="text-zinc-500 text-xs mt-0.5 leading-snug">{bottleneckInfo.unlocks.slice(0, 80)}…</p>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Mindset" score={career.assessmentMindsetScore || 0} band={career.assessmentMindsetBand || "Not scored"} />
                  <ScoreBar label="Dedication" score={career.assessmentDedicationScore || 0} band={career.assessmentDedicationBand || "Not scored"} color="bg-blue-500" />
                  <ScoreBar label="Experience" score={career.assessmentExperienceScore || 0} band={career.assessmentExperienceBand || "Not scored"} color="bg-purple-500" />
                </div>
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <p className="text-zinc-700 text-[10px]">playr1.app</p>
                  {displayName && <p className="text-zinc-700 text-[10px]">{displayName}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button onClick={handleShareSummary} disabled={shareState === "sharing"} className="w-full bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white rounded-2xl py-3.5 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-zinc-800" data-testid="button-share-development">
                {shareState === "shared" ? <><Check className="h-4 w-4 text-green-400" />Saved!</> : shareState === "sharing" ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : typeof navigator.canShare === "function" ? <><Share2 className="h-4 w-4" />Share My PLAYR1 Card</> : <><Download className="h-4 w-4" />Save My PLAYR1 Card</>}
              </button>
              <button onClick={() => navigate("/assessment")} className="w-full bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-2xl py-4 font-bold text-base transition-all flex items-center justify-center gap-2" data-testid="button-retake-assessment">
                <RotateCcw className="h-5 w-5" /> Retake Assessment
              </button>
              <button onClick={() => navigate("/profile-hub")} className="w-full text-white/45 text-sm py-2 hover:text-white transition-colors" data-testid="button-back-profile-hub">
                Back to Profile Hub
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handlePrevious} className="flex-1 py-3 rounded-2xl border border-white/10 text-white/55 text-sm font-bold hover:text-white" data-testid="button-development-previous">BACK</button>
              <span className="flex-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}