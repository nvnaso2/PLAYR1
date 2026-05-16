import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchetypeRingChart, type RingSegment } from "@/components/archetype-ring-chart";
import type { Archetype, UserArchetype } from "@shared/schema";
import { ARCHETYPE_TIERS } from "@shared/schema";
import {
  Crown, Fingerprint, ChevronLeft, Check, Lock,
  ChevronDown, ChevronUp, Flame, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserArchetypeEnriched = UserArchetype & { archetype: Archetype };

type TierProgram = {
  id: string; archetypeId: string; tier: string; programId: string;
  sortOrder: number; isGateChallenge: boolean | null;
  program: { id: string; title: string; slug: string; tagline: string | null; description: string | null; lengthDays: number; difficulty: string; isPublished: boolean | null; accentColor: string | null };
};

type TierStatus = Record<string, {
  pct: number; gateDone: boolean; unlocked: boolean;
  programs: Array<{ programId: string; completed: boolean; isGate: boolean; linkId: string }>;
}>;

const TIER_LABELS: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};

const TIER_COLORS: Record<string, string> = {
  prospect: "#6b7280", rising: "#3b82f6", starter: "#8b5cf6",
  star: "#f59e0b", elite: "#ef4444", playr1: "#f97316",
};

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] ?? "#6b7280";
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color + "50", background: color + "18" }}>
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

function ArchetypeProgressSection({ ua }: { ua: UserArchetypeEnriched }) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set([ua.tier]));

  const { data: tierPrograms = [], isLoading: programsLoading } = useQuery<TierProgram[]>({
    queryKey: ["/api/archetypes", ua.archetypeId, "tier-programs"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${ua.archetypeId}/tier-programs`).then(r => r.json()),
  });

  const { data: tierStatus, isLoading: statusLoading } = useQuery<TierStatus>({
    queryKey: ["/api/archetypes", ua.archetypeId, "tier-status"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${ua.archetypeId}/tier-status`).then(r => r.json()),
  });

  const currentTierStatus = tierStatus?.[ua.tier];
  const currentTierIdx = ARCHETYPE_TIERS.indexOf(ua.tier as any);
  const color = ua.archetype.primaryHex;

  // Ring chart data
  const totalPrograms = tierPrograms.filter(p => !p.isGateChallenge).length;
  const completedPrograms = tierStatus
    ? Object.values(tierStatus).reduce((sum, ts) => sum + ts.programs.filter(p => !p.isGate && p.completed).length, 0)
    : 0;

  const rings: [RingSegment, RingSegment, RingSegment] = [
    {
      label: "Programs",
      value: totalPrograms > 0 ? completedPrograms / totalPrograms : 0,
      color: color,
      count: `${completedPrograms}/${totalPrograms}`,
    },
    {
      label: "Tier",
      value: (currentTierStatus?.pct ?? 0) / 100,
      color: TIER_COLORS[ua.tier] ?? "#6b7280",
      count: `${currentTierStatus?.pct ?? 0}%`,
    },
    {
      label: "Days Active",
      value: Math.min(completedPrograms / 20, 1),
      count: `${completedPrograms * 3}d`,
      color: "#22c55e",
    },
  ];

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  if (programsLoading || statusLoading) {
    return <div className="space-y-2 mt-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Ring chart */}
      <div className="flex justify-center mt-2">
        <ArchetypeRingChart
          rings={rings}
          centerLabel={`${currentTierStatus?.pct ?? 0}%`}
          centerSub={TIER_LABELS[ua.tier] ?? ua.tier}
          size={200}
        />
      </div>

      {/* Tier progress bar */}
      {currentTierStatus && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Tier Progress</span>
            <span>{currentTierStatus.pct}%{currentTierStatus.gateDone ? " · Gate ✓" : currentTierStatus.pct >= 100 ? " · Complete gate to advance" : ""}</span>
          </div>
          <Progress value={currentTierStatus.pct} className="h-2" />
          {currentTierStatus.pct >= 100 && !currentTierStatus.gateDone && (
            <p className="text-xs text-amber-400 mt-1">Complete the gate challenge program to unlock the next tier!</p>
          )}
        </div>
      )}

      {/* Tier ladder */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {ARCHETYPE_TIERS.map((t, i) => {
          const isCurrent = t === ua.tier;
          const isPast = i < currentTierIdx;
          const tColor = TIER_COLORS[t];
          return (
            <div key={t} className="flex items-center gap-1 shrink-0">
              <div className={cn("px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider", isCurrent && "ring-1")}
                style={{
                  color: isCurrent || isPast ? tColor : "#374151",
                  borderColor: isCurrent ? tColor : "transparent",
                  background: isCurrent ? tColor + "20" : isPast ? tColor + "10" : "transparent",
                }}>
                {isPast ? "✓ " : ""}{TIER_LABELS[t]}
              </div>
              {i < ARCHETYPE_TIERS.length - 1 && <div className="w-3 h-px bg-zinc-700 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Roadmap — programs per tier */}
      {tierPrograms.length === 0 ? (
        <div className="text-center py-8 border border-zinc-800 rounded-xl">
          <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Roadmap programs coming soon.</p>
          <p className="text-xs text-zinc-600 mt-1">This archetype's training plan is being built.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ARCHETYPE_TIERS.map((tier, tIdx) => {
            const programs = tierPrograms.filter(p => p.tier === tier);
            if (programs.length === 0) return null;

            const status = tierStatus?.[tier];
            const isCurrentTier = tier === ua.tier;
            const isPastTier = tIdx < currentTierIdx;
            const isLocked = !status?.unlocked && !isCurrentTier && !isPastTier;
            const expanded = expandedTiers.has(tier);
            const regular = programs.filter(p => !p.isGateChallenge);
            const gate = programs.find(p => p.isGateChallenge);
            const completedInTier = status?.programs.filter(p => !p.isGate && p.completed).length ?? 0;

            return (
              <div key={tier} className="rounded-xl border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => toggleTier(tier)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                  data-testid={`tier-header-${tier}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isLocked ? "#374151" : TIER_COLORS[tier] }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <TierBadge tier={tier} />
                        {isPastTier && <Badge className="text-[10px] bg-green-950/50 text-green-400 border-green-800">✓ Complete</Badge>}
                        {isCurrentTier && !isPastTier && <Badge className="text-[10px]" style={{ background: TIER_COLORS[tier] + "25", color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}40` }}>Active</Badge>}
                        {isLocked && <span className="flex items-center gap-0.5 text-xs text-zinc-600"><Lock className="w-3 h-3" /> Locked</span>}
                      </div>
                      <span className="text-xs text-zinc-500 mt-0.5">
                        {completedInTier}/{regular.length} programs{gate && (status?.programs.find(p => p.isGate)?.completed ? " · Gate ✓" : " · Gate pending")}
                      </span>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                </button>

                {/* Progress bar for current tier */}
                {isCurrentTier && status && (
                  <div className="px-4 pb-2">
                    <Progress value={status.pct} className="h-1" />
                  </div>
                )}

                {expanded && (
                  <div className="divide-y divide-zinc-800/60 border-t border-zinc-800">
                    {[...regular, ...(gate ? [gate] : [])].map(tp => {
                      const progStatus = status?.programs.find(p => p.programId === tp.programId);
                      const done = progStatus?.completed ?? false;

                      return (
                        <div key={tp.id} className={cn("px-4 py-3 flex items-start gap-3", tp.isGateChallenge && "bg-amber-950/10", done && "opacity-70")}>
                          <div className="mt-0.5 shrink-0">
                            {done ? (
                              <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-400" />
                              </div>
                            ) : isLocked ? (
                              <Lock className="w-5 h-5 text-zinc-700" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-zinc-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn("text-sm font-semibold", done ? "text-zinc-400 line-through" : "text-zinc-100")}>
                                {tp.program.title}
                              </span>
                              {tp.isGateChallenge && (
                                <span className="text-[10px] font-bold text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" /> Gate Challenge
                                </span>
                              )}
                            </div>
                            {tp.program.tagline && <p className="text-xs text-zinc-500 mt-0.5">{tp.program.tagline}</p>}
                            {!isLocked && (
                              <Link href={`/programs/${tp.program.slug}`}>
                                <button className="text-xs text-orange-400 hover:text-orange-300 mt-1.5" data-testid={`btn-program-${tp.program.id}`}>
                                  {done ? "View again →" : "Start program →"}
                                </button>
                              </Link>
                            )}
                            {isLocked && (
                              <p className="text-xs text-zinc-600 mt-1">
                                Complete {TIER_LABELS[ARCHETYPE_TIERS[tIdx - 1] ?? "prospect"]} to unlock
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function MyArchetypePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"main" | "secondary">("main");

  const { data: userArchetypes = [], isLoading } = useQuery<UserArchetypeEnriched[]>({
    queryKey: ["/api/archetypes/user"],
  });

  const main = userArchetypes.find((ua) => ua.role === "main");
  const secondary = userArchetypes.find((ua) => ua.role === "secondary");
  const activeUA = activeTab === "main" ? main : secondary;

  const playerName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email?.split("@")[0] ?? "Player";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-40 w-40 rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!main) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center">
        <Fingerprint className="w-16 h-16 text-zinc-700" />
        <div>
          <h2 className="text-2xl font-black text-white">No Archetype Yet</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs">
            Choose your main archetype to start your training roadmap and unlock your player identity.
          </p>
        </div>
        <Link href="/archetypes">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold" data-testid="btn-choose-archetype">
            Choose Your Archetype
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <Link href="/archetypes">
          <button className="text-zinc-400 hover:text-white" data-testid="btn-back">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-white text-lg truncate">My Identity</h1>
          <p className="text-xs text-zinc-500 truncate">{playerName}</p>
        </div>
        <Crown className="w-5 h-5 text-orange-500" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {/* Archetype switcher tabs */}
        <div className="flex gap-2">
          {(["main", "secondary"] as const).map((role) => {
            const ua = role === "main" ? main : secondary;
            const active = activeTab === role;
            return (
              <button
                key={role}
                onClick={() => ua && setActiveTab(role)}
                disabled={!ua}
                data-testid={`tab-${role}-archetype`}
                className={cn(
                  "flex-1 rounded-xl px-3 py-3 flex flex-col items-center gap-1 border transition-all",
                  ua && active ? "border-orange-600/50 bg-orange-600/10"
                    : ua ? "border-zinc-700 hover:border-zinc-600"
                    : "border-zinc-800 opacity-40 cursor-not-allowed",
                )}
              >
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {role === "main" ? "Primary" : "Secondary"}
                </span>
                {ua ? (
                  <>
                    <span className="text-sm font-black text-white">{ua.archetype.name}</span>
                    <TierBadge tier={ua.tier} />
                  </>
                ) : (
                  <span className="text-xs text-zinc-600">Not selected</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active archetype content */}
        {activeUA && (
          <div>
            {/* Archetype header */}
            <div
              className="rounded-2xl p-5 mb-5"
              style={{ background: `linear-gradient(135deg, ${activeUA.archetype.primaryHex}20, transparent)`, border: `1px solid ${activeUA.archetype.primaryHex}30` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white" data-testid="archetype-name">{activeUA.archetype.name}</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">{activeUA.archetype.tagline}</p>
                </div>
                <TierBadge tier={activeUA.tier} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {activeUA.archetype.traits.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>
                ))}
              </div>
            </div>

            <ArchetypeProgressSection ua={activeUA} />
          </div>
        )}

        {/* Footer link */}
        <div className="border-t border-zinc-800 pt-4">
          <Link href="/archetypes">
            <Button variant="outline" className="w-full text-xs h-9" data-testid="btn-change-archetypes">
              Browse & Change Archetypes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
