import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Target, Zap, Shuffle, Shield, Eye, ArrowUpDown, Wind, Dumbbell, Layers, Repeat2,
  Check, Crown, Fingerprint, Lock, Flame, BookOpen, Trophy,
  ChevronDown, ChevronUp, ChevronLeft,
} from "lucide-react";
import type { Archetype, UserArchetype } from "@shared/schema";
import { ARCHETYPE_TIERS, ARCHETYPE_CHALLENGE_METRIC_LABELS } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchetypeRingChart, type RingSegment } from "@/components/archetype-ring-chart";
import { getCoreCharacteristics, sortArchetypeDefinitions } from "@/components/archetype-content";
import { Link } from "wouter";

type UserArchetypeWithDef = UserArchetype & { archetype: Archetype };

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  sharpshooter: Target, slasher: Zap, playmaker: Shuffle,
  "two-way-lockdown": Shield, "floor-general": Eye,
  "stretch-big": ArrowUpDown, "versatile-wing": Wind, "glass-cleaner": Dumbbell,
  "rim-protector": Layers, "two-way-player": Repeat2,
};

const TIER_LABELS: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};
const TIER_COLORS: Record<string, string> = {
  prospect: "#6b7280", rising: "#3b82f6", starter: "#8b5cf6",
  star: "#f59e0b", elite: "#ef4444", playr1: "#f97316",
};

type TierProgram = {
  id: string; archetypeId: string; tier: string; programId: string;
  sortOrder: number; isGateChallenge: boolean | null;
  program: { id: string; title: string; slug: string; tagline: string | null; description: string | null; lengthDays: number; difficulty: string; isPublished: boolean | null };
};
type TierChallenge = {
  id: string; archetypeId: string; tier: string; title: string; description: string | null;
  metric: string; target: number; shotLocationFilter: string | null; isGateChallenge: boolean | null; sortOrder: number;
};
type TierStatus = Record<string, {
  pct: number; gateDone: boolean; unlocked: boolean;
  programs: Array<{ programId: string; completed: boolean; isGate: boolean; linkId: string }>;
  challenges: Array<{ challengeId: string; completed: boolean; isGate: boolean; title: string; metric: string; target: number; description: string | null; shotLocationFilter: string | null }>;
}>;

// ─── Roadmap preview sheet ────────────────────────────────────────────────────
function ArchetypeRoadmapSheet({
  archetype, userArchetype, open, onClose, onSelect,
}: { archetype: Archetype; userArchetype?: UserArchetypeWithDef; open: boolean; onClose: () => void; onSelect: (role: "main" | "secondary") => void }) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["prospect"]));

  const { data: tierPrograms = [] } = useQuery<TierProgram[]>({
    queryKey: ["/api/archetypes", archetype.id, "tier-programs"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-programs`).then(r => r.json()),
    enabled: open,
  });
  const { data: tierChallenges = [] } = useQuery<TierChallenge[]>({
    queryKey: ["/api/archetypes", archetype.id, "tier-challenges"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-challenges`).then(r => r.json()),
    enabled: open,
  });
  const { data: tierStatus } = useQuery<TierStatus>({
    queryKey: ["/api/archetypes", archetype.id, "tier-status"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-status`).then(r => r.json()),
    enabled: open && !!userArchetype,
  });

  const currentTierIdx = userArchetype ? ARCHETYPE_TIERS.indexOf(userArchetype.tier as any) : -1;
  const toggleTier = (t: string) => setExpandedTiers(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const totalItems = tierPrograms.length + tierChallenges.length;

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-zinc-950 border-zinc-800 p-0">
        <div className="px-5 pt-6 pb-5 border-b border-zinc-800"
          style={{ background: `linear-gradient(135deg, ${archetype.primaryHex}20, transparent)` }}>
          <SheetHeader className="mb-3">
            <SheetTitle className="text-2xl font-black text-white text-left">{archetype.name}</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-zinc-400 italic mb-3">"{archetype.tagline}"</p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">{archetype.description}</p>
           <div className="flex flex-wrap gap-1.5 mb-4">
             {getCoreCharacteristics(archetype.traits).map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${archetype.primaryHex}18`, color: archetype.primaryHex }}>{t}</span>
            ))}
          </div>
          {userArchetype ? (
            <div className="flex gap-2">
              <Badge style={{ background: archetype.primaryHex + "25", color: archetype.primaryHex, border: `1px solid ${archetype.primaryHex}40` }}>
                <Check className="w-3 h-3 mr-1" />{userArchetype.role === "main" ? "Your Main" : "Secondary"}
              </Badge>
              <span className="text-xs text-zinc-500 self-center">Tier: {TIER_LABELS[userArchetype.tier]}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs" style={{ background: archetype.primaryHex }}
                onClick={() => onSelect("main")} data-testid={`btn-sheet-set-main-${archetype.id}`}>Set as Main</Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs"
                onClick={() => onSelect("secondary")} data-testid={`btn-sheet-set-secondary-${archetype.id}`}>Set as Secondary</Button>
            </div>
          )}
        </div>
        <div className="px-5 py-4 space-y-3">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Training Roadmap</h3>
          {totalItems === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Roadmap coming soon.</p>
            </div>
          ) : (
            ARCHETYPE_TIERS.map((tier, tIdx) => {
              const progs = tierPrograms.filter(p => p.tier === tier);
              const challs = tierChallenges.filter(c => c.tier === tier);
              if (progs.length + challs.length === 0) return null;
              const status = tierStatus?.[tier];
              const isCurrentTier = userArchetype?.tier === tier;
              const isPastTier = currentTierIdx > tIdx;
              const isLocked = !!userArchetype && !status?.unlocked && !isCurrentTier && !isPastTier;
              const expanded = expandedTiers.has(tier);
              const allItems = [
                ...progs.map(p => ({ type: "program" as const, item: p, done: !!status?.programs.find(x => x.programId === p.programId)?.completed, isGate: !!p.isGateChallenge })),
                ...challs.map(c => ({ type: "challenge" as const, item: c, done: !!status?.challenges.find(x => x.challengeId === c.id)?.completed, isGate: !!c.isGateChallenge })),
              ].sort((a, b) => (a.isGate ? 1 : 0) - (b.isGate ? 1 : 0));

              return (
                <div key={tier} className="border border-zinc-800 rounded-xl overflow-hidden">
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors" onClick={() => toggleTier(tier)}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TIER_COLORS[tier] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{TIER_LABELS[tier]}</span>
                        {isPastTier && <Badge className="text-[10px] bg-green-950/50 text-green-400 border-green-800">✓ Done</Badge>}
                        {isCurrentTier && <Badge className="text-[10px]" style={{ background: TIER_COLORS[tier] + "25", color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}40` }}>Active</Badge>}
                        {isLocked && <Lock className="w-3 h-3 text-zinc-600" />}
                      </div>
                      {status && isCurrentTier && <Progress value={status.pct} className="h-1 mt-1.5" />}
                    </div>
                    <span className="text-xs text-zinc-600">{progs.length + challs.length} items</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-zinc-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />}
                  </button>
                  {expanded && (
                    <div className="divide-y divide-zinc-800/60 border-t border-zinc-800">
                      {allItems.map(({ type, item, done, isGate }) => (
                        <div key={item.id} className={cn("px-4 py-3 flex items-start gap-3", isGate && "bg-amber-950/10", done && "opacity-70")}>
                          <div className="mt-0.5 shrink-0">
                            {done ? <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center"><Check className="w-3 h-3 text-green-400" /></div>
                              : isLocked ? <Lock className="w-5 h-5 text-zinc-700" />
                              : <div className="w-5 h-5 rounded-full border border-zinc-700" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {type === "program"
                                ? <Target className="w-3 h-3 text-blue-400 shrink-0" />
                                : <Trophy className="w-3 h-3 text-orange-400 shrink-0" />}
                              <span className={cn("text-sm font-semibold", done ? "text-zinc-400 line-through" : "text-zinc-100")}>
                                {type === "program" ? (item as TierProgram).program.title : (item as TierChallenge).title}
                              </span>
                              {isGate && <span className="text-[10px] font-bold text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />Gate</span>}
                            </div>
                            {type === "challenge" && (
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {ARCHETYPE_CHALLENGE_METRIC_LABELS[(item as TierChallenge).metric as keyof typeof ARCHETYPE_CHALLENGE_METRIC_LABELS]}: <strong className="text-zinc-300">{(item as TierChallenge).target.toLocaleString()}</strong>
                                {(item as TierChallenge).shotLocationFilter && <span className="ml-1 text-zinc-600">· {(item as TierChallenge).shotLocationFilter}</span>}
                              </p>
                            )}
                            {type === "program" && !isLocked && (
                              <Link href={`/programs/${(item as TierProgram).program.slug}`}>
                                <button className="text-xs text-orange-400 hover:text-orange-300 mt-1">{done ? "View again →" : "View program →"}</button>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── My Identity inner view ──────────────────────────────────────────────────
function MyIdentityView({ userArchetypes, definitions }: { userArchetypes: UserArchetypeWithDef[]; definitions: Archetype[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"main" | "secondary">("main");
  const { user } = useAuth();

  const main = userArchetypes.find(ua => ua.role === "main");
  const secondary = userArchetypes.find(ua => ua.role === "secondary");
  const activeUA = activeTab === "main" ? main : secondary;

  const playerName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}` : user?.email?.split("@")[0] ?? "Player";

  if (!main) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 px-6 text-center">
        <Fingerprint className="w-16 h-16 text-zinc-700" />
        <div>
          <h2 className="text-2xl font-black text-white">No Archetype Selected</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs">Switch to Browse to choose your main archetype and start your training roadmap.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-20 space-y-6">
      {/* Archetype switcher */}
      <div className="flex gap-2">
        {(["main", "secondary"] as const).map(role => {
          const ua = role === "main" ? main : secondary;
          const active = activeTab === role;
          return (
            <button key={role} onClick={() => ua && setActiveTab(role)} disabled={!ua}
              data-testid={`tab-${role}-archetype`}
              className={cn("flex-1 rounded-xl px-3 py-3 flex flex-col items-center gap-1 border transition-all",
                ua && active ? "border-orange-600/50 bg-orange-600/10" : ua ? "border-zinc-700 hover:border-zinc-600" : "border-zinc-800 opacity-40 cursor-not-allowed")}>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{role === "main" ? "Primary" : "Secondary"}</span>
              {ua ? <>
                <span className="text-sm font-black text-white">{ua.archetype.name}</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                  style={{ color: TIER_COLORS[ua.tier], borderColor: TIER_COLORS[ua.tier] + "50", background: TIER_COLORS[ua.tier] + "18" }}>
                  {TIER_LABELS[ua.tier]}
                </span>
              </> : <span className="text-xs text-zinc-600">Not selected</span>}
            </button>
          );
        })}
      </div>

      {activeUA && <ArchetypeIdentityDetail ua={activeUA} />}

      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-600 text-center">You can change your archetype from the Browse tab.</p>
      </div>
    </div>
  );
}

// ─── Per-archetype identity detail (roadmap, ring, progress) ─────────────────
function ArchetypeIdentityDetail({ ua }: { ua: UserArchetypeWithDef }) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set([ua.tier]));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tierPrograms = [] } = useQuery<TierProgram[]>({
    queryKey: ["/api/archetypes", ua.archetypeId, "tier-programs"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${ua.archetypeId}/tier-programs`).then(r => r.json()),
  });
  const { data: tierChallenges = [] } = useQuery<TierChallenge[]>({
    queryKey: ["/api/archetypes", ua.archetypeId, "tier-challenges"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${ua.archetypeId}/tier-challenges`).then(r => r.json()),
  });
  const { data: tierStatus } = useQuery<TierStatus>({
    queryKey: ["/api/archetypes", ua.archetypeId, "tier-status"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${ua.archetypeId}/tier-status`).then(r => r.json()),
  });

  const completeMutation = useMutation({
    mutationFn: (challengeId: string) =>
      apiRequest("POST", `/api/archetypes/${ua.archetypeId}/challenges/${challengeId}/complete`, {}).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", ua.archetypeId, "tier-status"] });
      toast({ title: "Challenge marked complete!" });
    },
  });
  const uncompleteMutation = useMutation({
    mutationFn: (challengeId: string) =>
      apiRequest("DELETE", `/api/archetypes/${ua.archetypeId}/challenges/${challengeId}/complete`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/archetypes", ua.archetypeId, "tier-status"] }),
  });

  const currentTierIdx = ARCHETYPE_TIERS.indexOf(ua.tier as any);
  const currentTierStatus = tierStatus?.[ua.tier];
  const color = ua.archetype.primaryHex;

  const totalRegular = Object.values(tierStatus ?? {}).reduce((s, t) => s + t.programs.filter(p => !p.isGate).length + t.challenges.filter(c => !c.isGate).length, 0);
  const completedTotal = Object.values(tierStatus ?? {}).reduce((s, t) => s + t.programs.filter(p => !p.isGate && p.completed).length + t.challenges.filter(c => !c.isGate && c.completed).length, 0);

  const rings: [RingSegment, RingSegment, RingSegment] = [
    { label: "Completed", value: totalRegular > 0 ? completedTotal / totalRegular : 0, color, count: `${completedTotal}/${totalRegular}` },
    { label: "Tier", value: (currentTierStatus?.pct ?? 0) / 100, color: TIER_COLORS[ua.tier] ?? "#6b7280", count: `${currentTierStatus?.pct ?? 0}%` },
    { label: "Days Active", value: Math.min(completedTotal / 20, 1), color: "#22c55e", count: `${completedTotal * 3}d` },
  ];

  const toggleTier = (t: string) => setExpandedTiers(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <div className="space-y-6">
      {/* Archetype card */}
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${color}20, transparent)`, border: `1px solid ${color}30` }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">{ua.archetype.name}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{ua.archetype.tagline}</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0"
            style={{ color: TIER_COLORS[ua.tier], borderColor: TIER_COLORS[ua.tier] + "50", background: TIER_COLORS[ua.tier] + "18" }}>
            {TIER_LABELS[ua.tier]}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {getCoreCharacteristics(ua.archetype.traits).map(t => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>)}
        </div>
      </div>

      {/* Ring chart */}
      <div className="flex justify-center">
        <ArchetypeRingChart rings={rings} centerLabel={`${currentTierStatus?.pct ?? 0}%`} centerSub={TIER_LABELS[ua.tier] ?? ua.tier} size={200} />
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
            <p className="text-xs text-amber-400 mt-1">Complete the gate challenge to unlock the next tier!</p>
          )}
        </div>
      )}

      {/* Tier ladder */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 py-1">
        {ARCHETYPE_TIERS.map((t, i) => {
          const isCurrent = t === ua.tier;
          const isPast = i < currentTierIdx;
          const tColor = TIER_COLORS[t];
          return (
            <div key={t} className="flex items-center gap-1 shrink-0">
              <div className={cn("px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider", isCurrent && "ring-1")}
                style={{ color: isCurrent || isPast ? tColor : "#374151", borderColor: isCurrent ? tColor : "transparent", background: isCurrent ? tColor + "20" : isPast ? tColor + "10" : "transparent" }}>
                {isPast ? "✓ " : ""}{TIER_LABELS[t]}
              </div>
              {i < ARCHETYPE_TIERS.length - 1 && <div className="w-3 h-px bg-zinc-700 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Roadmap */}
      {(tierPrograms.length + tierChallenges.length) === 0 ? (
        <div className="text-center py-8 border border-zinc-800 rounded-xl">
          <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Roadmap coming soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ARCHETYPE_TIERS.map((tier, tIdx) => {
            const progs = tierPrograms.filter(p => p.tier === tier);
            const challs = tierChallenges.filter(c => c.tier === tier);
            if (progs.length + challs.length === 0) return null;

            const status = tierStatus?.[tier];
            const isCurrentTier = tier === ua.tier;
            const isPastTier = tIdx < currentTierIdx;
            const isLocked = !status?.unlocked && !isCurrentTier && !isPastTier;
            const expanded = expandedTiers.has(tier);
            const completedInTier = (status?.programs.filter(p => !p.isGate && p.completed).length ?? 0) +
              (status?.challenges.filter(c => !c.isGate && c.completed).length ?? 0);
            const regularInTier = progs.filter(p => !p.isGateChallenge).length + challs.filter(c => !c.isGateChallenge).length;

            const allItems = [
              ...progs.map(p => ({ type: "program" as const, item: p, done: !!status?.programs.find(x => x.programId === p.programId)?.completed, isGate: !!p.isGateChallenge })),
              ...challs.map(c => ({ type: "challenge" as const, item: c, done: !!status?.challenges.find(x => x.challengeId === c.id)?.completed, isGate: !!c.isGateChallenge })),
            ].sort((a, b) => (a.isGate ? 1 : 0) - (b.isGate ? 1 : 0));

            return (
              <div key={tier} className="rounded-xl border border-zinc-800 overflow-hidden">
                <button onClick={() => toggleTier(tier)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                  data-testid={`tier-header-${tier}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isLocked ? "#374151" : TIER_COLORS[tier] }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                          style={{ color: isLocked ? "#374151" : TIER_COLORS[tier], borderColor: (isLocked ? "#374151" : TIER_COLORS[tier]) + "50", background: (isLocked ? "#374151" : TIER_COLORS[tier]) + "18" }}>
                          {TIER_LABELS[tier]}
                        </span>
                        {isPastTier && <Badge className="text-[10px] bg-green-950/50 text-green-400 border-green-800">✓ Complete</Badge>}
                        {isCurrentTier && !isPastTier && <Badge className="text-[10px]" style={{ background: TIER_COLORS[tier] + "25", color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}40` }}>Active</Badge>}
                        {isLocked && <span className="flex items-center gap-0.5 text-xs text-zinc-600"><Lock className="w-3 h-3" />Locked</span>}
                      </div>
                      <span className="text-xs text-zinc-500 mt-0.5">
                        {completedInTier}/{regularInTier} items{status?.gateDone ? " · Gate ✓" : ""}
                      </span>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                </button>
                {isCurrentTier && status && <div className="px-4 pb-2"><Progress value={status.pct} className="h-1" /></div>}

                {expanded && (
                  <div className="divide-y divide-zinc-800/60 border-t border-zinc-800">
                    {allItems.map(({ type, item, done, isGate }) => (
                      <div key={item.id} className={cn("px-4 py-3 flex items-start gap-3", isGate && "bg-amber-950/10", done && "opacity-70")}>
                        {type === "challenge" ? (
                          <button
                            className="mt-0.5 shrink-0"
                            onClick={() => done ? uncompleteMutation.mutate(item.id) : completeMutation.mutate(item.id)}
                            disabled={isLocked}
                            title={done ? "Mark incomplete" : "Mark complete"}
                            data-testid={`btn-challenge-toggle-${item.id}`}
                          >
                            {done
                              ? <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center"><Check className="w-3 h-3 text-green-400" /></div>
                              : isLocked ? <Lock className="w-5 h-5 text-zinc-700" />
                              : <div className="w-5 h-5 rounded-full border-2 border-zinc-600 hover:border-orange-500 transition-colors" />}
                          </button>
                        ) : (
                          <div className="mt-0.5 shrink-0">
                            {done ? <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center"><Check className="w-3 h-3 text-green-400" /></div>
                              : isLocked ? <Lock className="w-5 h-5 text-zinc-700" />
                              : <div className="w-5 h-5 rounded-full border border-zinc-700" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {type === "program" ? <Target className="w-3 h-3 text-blue-400 shrink-0" /> : <Trophy className="w-3 h-3 text-orange-400 shrink-0" />}
                            <span className={cn("text-sm font-semibold", done ? "text-zinc-400 line-through" : "text-zinc-100")}>
                              {type === "program" ? (item as TierProgram).program.title : (item as TierChallenge).title}
                            </span>
                            {isGate && <span className="text-[10px] font-bold text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />Gate</span>}
                          </div>
                          {type === "challenge" && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {ARCHETYPE_CHALLENGE_METRIC_LABELS[(item as TierChallenge).metric as keyof typeof ARCHETYPE_CHALLENGE_METRIC_LABELS]}: <strong className="text-zinc-300">{(item as TierChallenge).target.toLocaleString()}</strong>
                              {(item as TierChallenge).shotLocationFilter && <span className="ml-1 text-zinc-600">· {(item as TierChallenge).shotLocationFilter}</span>}
                            </p>
                          )}
                          {type === "challenge" && (item as TierChallenge).description && (
                            <p className="text-xs text-zinc-600 mt-0.5">{(item as TierChallenge).description}</p>
                          )}
                          {type === "program" && !isLocked && (
                            <Link href={`/programs/${(item as TierProgram).program.slug}`}>
                              <button className="text-xs text-orange-400 hover:text-orange-300 mt-1.5" data-testid={`btn-program-${(item as TierProgram).program.id}`}>
                                {done ? "View again →" : "Start program →"}
                              </button>
                            </Link>
                          )}
                          {isLocked && type === "program" && (
                            <p className="text-xs text-zinc-600 mt-1">Complete {TIER_LABELS[ARCHETYPE_TIERS[tIdx - 1] ?? "prospect"]} to unlock</p>
                          )}
                        </div>
                      </div>
                    ))}
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

// ─── Browse tab ───────────────────────────────────────────────────────────────
function BrowseTab({ definitions, userArchetypes }: { definitions: Archetype[]; userArchetypes: UserArchetypeWithDef[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewArchetype, setPreviewArchetype] = useState<Archetype | null>(null);

  const mainArchetype = userArchetypes.find(ua => ua.role === "main");
  const secondaryArchetype = userArchetypes.find(ua => ua.role === "secondary");

  const selectMutation = useMutation({
    mutationFn: ({ archetypeId, role }: { archetypeId: string; role: "main" | "secondary" }) =>
      apiRequest("POST", "/api/archetypes/user", { archetypeId, role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user"] }); toast({ title: "Archetype selected" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const deselectMutation = useMutation({
    mutationFn: (role: "main" | "secondary") => apiRequest("DELETE", `/api/archetypes/user/${role}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user"] }); toast({ title: "Archetype removed" }); },
  });

  const getStatus = (id: string) => mainArchetype?.archetypeId === id ? "main" : secondaryArchetype?.archetypeId === id ? "secondary" : null;
  const getUserArchetype = (id: string) => userArchetypes.find(ua => ua.archetypeId === id);
  const handleSelect = (id: string, role: "main" | "secondary") => {
    if (getStatus(id) === role) deselectMutation.mutate(role);
    else selectMutation.mutate({ archetypeId: id, role });
  };
  const isBusy = selectMutation.isPending || deselectMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-20">
      {/* Current selections */}
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Your Selections</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["main", "secondary"] as const).map(role => {
            const ua = role === "main" ? mainArchetype : secondaryArchetype;
            return (
              <div key={role}
                className={cn("rounded-xl border-2 p-4 flex items-center gap-3 min-h-[72px] transition-all cursor-pointer",
                  ua ? role === "main" ? "border-orange-600/60 bg-orange-950/20 hover:bg-orange-950/30" : "border-zinc-600/60 bg-zinc-800/20 hover:bg-zinc-800/40"
                    : "border-dashed border-zinc-700 bg-zinc-900/40")}
                onClick={() => ua && setPreviewArchetype(ua.archetype)} data-testid={`slot-${role}-archetype`}>
                {ua ? (
                  <>
                    {(() => { const Icon = ARCHETYPE_ICONS[ua.archetypeId] ?? Target; return <Icon className="w-6 h-6 flex-shrink-0" style={{ color: ua.archetype.primaryHex }} />; })()}
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider capitalize">{role}</p>
                      <p className="font-bold text-white text-sm truncate">{ua.archetype.name}</p>
                      <p className="text-xs text-zinc-400">{TIER_LABELS[ua.tier]}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center w-full">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider capitalize">{role}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Not selected</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All archetypes grid */}
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">All Archetypes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortArchetypeDefinitions(definitions).map(def => {
            const Icon = ARCHETYPE_ICONS[def.id] ?? Target;
            const status = getStatus(def.id);
            const ua = getUserArchetype(def.id);
            return (
              <div key={def.id} data-testid={`card-archetype-${def.id}`}
                className={cn("rounded-2xl border p-5 flex flex-col gap-4 transition-all",
                  status === "main" ? "border-orange-500/50 bg-orange-950/15" : status === "secondary" ? "border-zinc-500/50 bg-zinc-800/20" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700")}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${def.primaryHex}18`, border: `1px solid ${def.primaryHex}35` }}>
                    <Icon className="w-6 h-6" style={{ color: def.primaryHex }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-white text-lg leading-tight">{def.name}</h3>
                      {status && <Badge className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider border-0"
                        style={{ background: status === "main" ? "#ea580c25" : "#52525b25", color: status === "main" ? "#fb923c" : "#a1a1aa" }}>
                        {status === "main" ? "Your Main" : "Secondary"}
                      </Badge>}
                      {ua && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                        style={{ color: TIER_COLORS[ua.tier], borderColor: TIER_COLORS[ua.tier] + "50", background: TIER_COLORS[ua.tier] + "18" }}>
                        {TIER_LABELS[ua.tier]}
                      </span>}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 italic">"{def.tagline}"</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{def.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {def.traits.slice(0, 4).map(trait => (
                    <span key={trait} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${def.primaryHex}18`, color: def.primaryHex }}>{trait}</span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold h-8 border-zinc-700"
                    onClick={() => setPreviewArchetype(def)} data-testid={`button-preview-${def.id}`}>
                    <BookOpen className="w-3 h-3 mr-1" /> View Roadmap
                  </Button>
                  <Button size="sm" className="flex-1 text-xs font-bold h-8"
                    style={status === "main" ? { background: "#ea580c25", color: "#fb923c", border: "1px solid #ea580c50" } : { background: def.primaryHex, color: "white" }}
                    onClick={() => handleSelect(def.id, "main")} disabled={isBusy} data-testid={`button-set-main-${def.id}`}>
                    {status === "main" ? <><Check className="w-3 h-3 mr-1" />Remove</> : "Set as Main"}
                  </Button>
                </div>
                {status !== "main" && (
                  <Button size="sm" variant="ghost" className="w-full text-xs h-7 text-zinc-500 -mt-2"
                    onClick={() => handleSelect(def.id, "secondary")} disabled={isBusy}
                    data-testid={`button-set-secondary-${def.id}`}>
                    {status === "secondary" ? <><Check className="w-3 h-3 mr-1" />Remove Secondary</> : "Set as Secondary"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Roadmap preview sheet */}
      {previewArchetype && (
        <ArchetypeRoadmapSheet
          archetype={previewArchetype}
          userArchetype={getUserArchetype(previewArchetype.id) as UserArchetypeWithDef | undefined}
          open={!!previewArchetype}
          onClose={() => setPreviewArchetype(null)}
          onSelect={role => { handleSelect(previewArchetype.id, role); setPreviewArchetype(null); }}
        />
      )}
    </div>
  );
}

// ─── Main unified page ────────────────────────────────────────────────────────
export default function ArchetypesPage() {
  const initialTab = typeof window !== "undefined" && window.location.search.includes("tab=identity") ? "identity" : "browse";
  const [activeView, setActiveView] = useState<"browse" | "identity">(initialTab as "browse" | "identity");

  const { data: definitions = [], isLoading: defsLoading } = useQuery<Archetype[]>({
    queryKey: ["/api/archetypes"],
  });
  const { data: userArchetypes = [], isLoading: uaLoading } = useQuery<UserArchetypeWithDef[]>({
    queryKey: ["/api/archetypes/user"],
  });

  const isLoading = defsLoading || uaLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => window.history.back()} className="text-zinc-400 hover:text-white" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-orange-400" />
                <h1 className="font-black text-white text-lg">Identity System</h1>
              </div>
              <p className="text-xs text-zinc-500">Choose your archetype · Track your roadmap</p>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 bg-zinc-900 rounded-xl p-1">
            <button
              onClick={() => setActiveView("browse")}
              data-testid="tab-browse"
              className={cn("flex-1 rounded-lg py-2 text-sm font-bold transition-all",
                activeView === "browse" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Browse Archetypes
            </button>
            <button
              onClick={() => setActiveView("identity")}
              data-testid="tab-identity"
              className={cn("flex-1 rounded-lg py-2 text-sm font-bold transition-all",
                activeView === "identity" ? "bg-orange-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              My Identity
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : activeView === "browse" ? (
        <BrowseTab definitions={definitions} userArchetypes={userArchetypes} />
      ) : (
        <MyIdentityView userArchetypes={userArchetypes} definitions={definitions} />
      )}
    </div>
  );
}
