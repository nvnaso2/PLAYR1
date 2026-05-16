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
import type { Archetype, UserArchetype, ArchetypeRoadmapItem, ArchetypeItemCompletion, ArchetypeTier } from "@shared/schema";
import { ARCHETYPE_TIERS, ARCHETYPE_TIER_ITEM_COUNTS } from "@shared/schema";
import {
  Crown, Fingerprint, ChevronLeft, CheckCircle2, Circle, Lock,
  Dumbbell, Swords, Eye, Zap, Coffee, ChevronDown, ChevronUp, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserArchetypeEnriched = UserArchetype & { archetype: Archetype };

const TIER_LABELS: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};

const TIER_COLORS: Record<string, string> = {
  prospect: "#6b7280", rising: "#3b82f6", starter: "#8b5cf6",
  star: "#f59e0b", elite: "#ef4444", playr1: "#f97316",
};

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  workout: <Dumbbell className="w-3.5 h-3.5" />,
  drill:   <Zap className="w-3.5 h-3.5" />,
  challenge: <Swords className="w-3.5 h-3.5" />,
  watch:   <Eye className="w-3.5 h-3.5" />,
  rest:    <Coffee className="w-3.5 h-3.5" />,
};

const ITEM_TYPE_COLORS: Record<string, string> = {
  workout: "text-blue-400", drill: "text-orange-400",
  challenge: "text-red-400", watch: "text-purple-400", rest: "text-green-400",
};

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] ?? "#6b7280";
  return (
    <span
      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color + "50", background: color + "18" }}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

function ArchetypeRoadmapSection({
  ua,
}: {
  ua: UserArchetypeEnriched;
}) {
  const { toast } = useToast();
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set([ua.tier]));

  const { data: roadmap = [], isLoading: roadmapLoading } = useQuery<ArchetypeRoadmapItem[]>({
    queryKey: ["/api/archetypes", ua.archetypeId, "roadmap"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${ua.archetypeId}/roadmap`).then(r => r.json()),
  });

  const { data: completions = [] } = useQuery<ArchetypeItemCompletion[]>({
    queryKey: ["/api/archetypes/user/completions", ua.id],
    queryFn: () => apiRequest("GET", `/api/archetypes/user/completions/${ua.id}`).then(r => r.json()),
  });

  const completedIds = new Set(completions.map((c) => c.roadmapItemId));

  const completeMutation = useMutation({
    mutationFn: (roadmapItemId: string) =>
      apiRequest("POST", "/api/archetypes/user/completions", { userArchetypeId: ua.id, roadmapItemId }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user/completions", ua.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user"] });
      if (data.newTier) {
        toast({ title: `Tier Unlocked: ${TIER_LABELS[data.newTier]}!`, description: "You've advanced to the next tier. Keep grinding." });
      }
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: (roadmapItemId: string) =>
      apiRequest("DELETE", `/api/archetypes/user/completions/${roadmapItemId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user/completions", ua.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user"] });
    },
  });

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  const tierIdx = ARCHETYPE_TIERS.indexOf(ua.tier as ArchetypeTier);

  // Ring chart data
  const currentTierItems = roadmap.filter(i => i.tier === ua.tier && !i.isGateChallenge);
  const completedCurrentTier = currentTierItems.filter(i => completedIds.has(i.id)).length;
  const totalCompleted = roadmap.filter(i => !i.isGateChallenge && completedIds.has(i.id)).length;
  const totalItems = roadmap.filter(i => !i.isGateChallenge).length;
  const color = ua.archetype.primaryHex;

  const rings: [RingSegment, RingSegment, RingSegment] = [
    {
      label: "Workouts",
      value: totalItems > 0 ? totalCompleted / totalItems : 0,
      color: color,
      count: `${totalCompleted}/${totalItems}`,
    },
    {
      label: "Tier %",
      value: (ua.tierPct ?? 0) / 100,
      color: TIER_COLORS[ua.tier] ?? "#6b7280",
      count: `${ua.tierPct ?? 0}%`,
    },
    {
      label: "Days Active",
      value: Math.min(completions.length / 30, 1),
      count: `${completions.length}`,
      color: "#22c55e",
    },
  ];

  if (roadmapLoading) {
    return <div className="space-y-2 mt-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Ring chart */}
      <div className="flex justify-center mt-2">
        <ArchetypeRingChart
          rings={rings}
          centerLabel={`${ua.tierPct ?? 0}%`}
          centerSub={TIER_LABELS[ua.tier] ?? ua.tier}
          size={200}
        />
      </div>

      {/* Tier progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Tier Progress</span>
          <span>{ua.tierPct ?? 0}% complete{(ua.tierGateDone) ? " · Gate done" : ""}</span>
        </div>
        <Progress value={ua.tierPct ?? 0} className="h-2" style={{ "--progress-color": color } as React.CSSProperties} />
        {!ua.tierGateDone && (ua.tierPct ?? 0) >= 100 && (
          <p className="text-xs text-amber-400 mt-1">Complete the gate challenge below to unlock the next tier!</p>
        )}
      </div>

      {/* Tier ladder */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {ARCHETYPE_TIERS.map((t, i) => {
          const isCurrent = t === ua.tier;
          const isPast = i < tierIdx;
          const tColor = TIER_COLORS[t];
          return (
            <div key={t} className="flex items-center gap-1 shrink-0">
              <div
                className={cn("px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider", isCurrent && "ring-1")}
                style={{
                  color: isCurrent || isPast ? tColor : "#374151",
                  borderColor: isCurrent ? tColor : "transparent",
                  background: isCurrent ? tColor + "20" : isPast ? tColor + "10" : "transparent",
                }}
              >
                {isPast ? "✓ " : ""}{TIER_LABELS[t]}
              </div>
              {i < ARCHETYPE_TIERS.length - 1 && (
                <div className="w-3 h-px bg-zinc-700 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Roadmap items grouped by tier */}
      <div className="space-y-3">
        {ARCHETYPE_TIERS.map((tier, tIdx) => {
          const tierItems = roadmap.filter(i => i.tier === tier);
          if (tierItems.length === 0) return null;
          const isLocked = tIdx > tierIdx;
          const isCurrentTier = tier === ua.tier;
          const gateItem = tierItems.find(i => i.isGateChallenge);
          const regularItems = tierItems.filter(i => !i.isGateChallenge);
          const completedInTier = regularItems.filter(i => completedIds.has(i.id)).length;
          const expanded = expandedTiers.has(tier);

          return (
            <div key={tier} className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                onClick={() => !isLocked && toggleTier(tier)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 text-left",
                  isLocked ? "cursor-default opacity-50" : "hover:bg-zinc-800/50",
                )}
                data-testid={`tier-header-${tier}`}
              >
                <div className="flex items-center gap-2">
                  {isLocked ? <Lock className="w-4 h-4 text-zinc-600" /> : null}
                  <TierBadge tier={tier} />
                  <span className="text-xs text-zinc-500">
                    {completedInTier}/{regularItems.length} items
                    {gateItem && (completedIds.has(gateItem.id) ? " · Gate ✓" : " · Gate pending")}
                  </span>
                </div>
                {!isLocked && (expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />)}
              </button>

              {expanded && !isLocked && (
                <div className="divide-y divide-zinc-800/60">
                  {regularItems.map(item => {
                    const done = completedIds.has(item.id);
                    return (
                      <RoadmapItemRow
                        key={item.id}
                        item={item}
                        done={done}
                        onToggle={() => {
                          if (done) uncompleteMutation.mutate(item.id);
                          else completeMutation.mutate(item.id);
                        }}
                        pending={completeMutation.isPending || uncompleteMutation.isPending}
                        isCurrentTier={isCurrentTier}
                      />
                    );
                  })}
                  {gateItem && (
                    <div className="bg-amber-950/20 border-t border-amber-900/40">
                      <RoadmapItemRow
                        item={gateItem}
                        done={completedIds.has(gateItem.id)}
                        onToggle={() => {
                          if (completedIds.has(gateItem.id)) uncompleteMutation.mutate(gateItem.id);
                          else completeMutation.mutate(gateItem.id);
                        }}
                        pending={completeMutation.isPending || uncompleteMutation.isPending}
                        isGate
                        isCurrentTier={isCurrentTier}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadmapItemRow({
  item, done, onToggle, pending, isGate, isCurrentTier,
}: {
  item: ArchetypeRoadmapItem;
  done: boolean;
  onToggle: () => void;
  pending: boolean;
  isGate?: boolean;
  isCurrentTier: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn("px-4 py-3 flex items-start gap-3", done && "opacity-60")}>
      <button
        onClick={onToggle}
        disabled={pending}
        className="mt-0.5 shrink-0"
        data-testid={`roadmap-item-toggle-${item.id}`}
      >
        {done
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-zinc-600 hover:text-zinc-400" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("shrink-0", ITEM_TYPE_COLORS[item.itemType])}>
            {ITEM_TYPE_ICONS[item.itemType]}
          </span>
          <span className={cn("text-sm font-semibold", done ? "line-through text-zinc-500" : "text-zinc-100")}>
            {item.title}
          </span>
          {isGate && (
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider border border-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" /> Gate Challenge
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {item.durationMins && (
            <span className="text-[11px] text-zinc-500">{item.durationMins} min</span>
          )}
          {item.repsOrSets && (
            <span className="text-[11px] text-zinc-500">{item.repsOrSets}</span>
          )}
          {item.description && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 underline"
            >
              {expanded ? "less" : "details"}
            </button>
          )}
        </div>
        {expanded && item.description && (
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{item.description}</p>
        )}
      </div>
    </div>
  );
}

export default function MyArchetypePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"main" | "secondary">("main");

  const { data: userArchetypes = [], isLoading } = useQuery<UserArchetypeEnriched[]>({
    queryKey: ["/api/archetypes/user"],
  });

  const main = userArchetypes.find((ua) => ua.role === "main");
  const secondary = userArchetypes.find((ua) => ua.role === "secondary");

  const playerName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email?.split("@")[0] ?? "Player";

  const activeUA = activeTab === "main" ? main : secondary;

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
        <Link href="/profile">
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
                  ua && active
                    ? "border-orange-600/50 bg-orange-600/10"
                    : ua
                    ? "border-zinc-700 hover:border-zinc-600"
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

            {/* Roadmap */}
            <ArchetypeRoadmapSection ua={activeUA} />
          </div>
        )}

        {/* Change archetype links */}
        <div className="border-t border-zinc-800 pt-4 flex gap-3">
          <Link href="/archetypes" className="flex-1">
            <Button variant="outline" className="w-full text-xs h-9" data-testid="btn-change-archetypes">
              Change Archetypes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
