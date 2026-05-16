import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Zap, Shuffle, Shield, Eye, ArrowUpDown, Wind, Dumbbell,
  Check, Crown, ChevronLeft, ChevronDown, ChevronUp, Lock, Flame, BookOpen,
} from "lucide-react";
import type { Archetype, UserArchetype } from "@shared/schema";
import { ARCHETYPE_TIERS } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "wouter";

type UserArchetypeWithDef = UserArchetype & { archetype: Archetype };

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  sharpshooter: Target, slasher: Zap, playmaker: Shuffle,
  "two-way-lockdown": Shield, "floor-general": Eye,
  "stretch-big": ArrowUpDown, "versatile-wing": Wind, "glass-cleaner": Dumbbell,
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

type TierStatus = Record<string, {
  pct: number; gateDone: boolean; unlocked: boolean;
  programs: Array<{ programId: string; completed: boolean; isGate: boolean; linkId: string }>;
}>;

// ─── Roadmap preview sheet ────────────────────────────────────────────────────
function ArchetypeRoadmapSheet({
  archetype,
  userArchetype,
  open,
  onClose,
  onSelect,
}: {
  archetype: Archetype;
  userArchetype?: UserArchetypeWithDef;
  open: boolean;
  onClose: () => void;
  onSelect: (role: "main" | "secondary") => void;
}) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["prospect"]));

  const { data: tierPrograms = [] } = useQuery<TierProgram[]>({
    queryKey: ["/api/archetypes", archetype.id, "tier-programs"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-programs`).then(r => r.json()),
    enabled: open,
  });

  const { data: tierStatus } = useQuery<TierStatus>({
    queryKey: ["/api/archetypes", archetype.id, "tier-status"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-status`).then(r => r.json()),
    enabled: open && !!userArchetype,
  });

  const currentTierIdx = userArchetype ? ARCHETYPE_TIERS.indexOf(userArchetype.tier as any) : -1;

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-zinc-950 border-zinc-800 p-0">
        {/* Hero header */}
        <div
          className="px-5 pt-6 pb-5 border-b border-zinc-800"
          style={{ background: `linear-gradient(135deg, ${archetype.primaryHex}20, transparent)` }}
        >
          <SheetHeader className="mb-3">
            <SheetTitle className="text-2xl font-black text-white text-left">{archetype.name}</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-zinc-400 italic mb-3">"{archetype.tagline}"</p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">{archetype.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {archetype.traits.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${archetype.primaryHex}18`, color: archetype.primaryHex }}>
                {t}
              </span>
            ))}
          </div>
          {/* Action buttons */}
          {userArchetype ? (
            <div className="flex gap-2">
              <Badge className="flex items-center gap-1" style={{ background: archetype.primaryHex + "25", color: archetype.primaryHex, border: `1px solid ${archetype.primaryHex}40` }}>
                <Check className="w-3 h-3" /> {userArchetype.role === "main" ? "Your Main" : "Secondary"}
              </Badge>
              <span className="text-xs text-zinc-500 self-center">Tier: {TIER_LABELS[userArchetype.tier]}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs" style={{ background: archetype.primaryHex, color: "white" }}
                onClick={() => onSelect("main")} data-testid={`btn-sheet-set-main-${archetype.id}`}>
                Set as Main
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs"
                onClick={() => onSelect("secondary")} data-testid={`btn-sheet-set-secondary-${archetype.id}`}>
                Set as Secondary
              </Button>
            </div>
          )}
        </div>

        {/* Roadmap */}
        <div className="px-5 py-4 space-y-3">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Training Roadmap</h3>

          {tierPrograms.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Roadmap programs coming soon.</p>
              <p className="text-xs text-zinc-600 mt-1">An admin is building out this archetype's training plan.</p>
            </div>
          ) : (
            ARCHETYPE_TIERS.map((tier, tIdx) => {
              const programs = tierPrograms.filter(p => p.tier === tier);
              if (programs.length === 0) return null;

              const status = tierStatus?.[tier];
              const isCurrentTier = userArchetype?.tier === tier;
              const isPastTier = currentTierIdx > tIdx;
              const isLocked = !!userArchetype && !status?.unlocked && !isCurrentTier && !isPastTier;
              const expanded = expandedTiers.has(tier);
              const pct = status?.pct ?? 0;

              return (
                <div key={tier} className="border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                    onClick={() => toggleTier(tier)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TIER_COLORS[tier] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{TIER_LABELS[tier]}</span>
                        {isPastTier && <Badge className="text-[10px] bg-green-950/50 text-green-400 border-green-800">✓ Complete</Badge>}
                        {isCurrentTier && <Badge className="text-[10px]" style={{ background: TIER_COLORS[tier] + "25", color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}40` }}>In Progress</Badge>}
                        {isLocked && <span className="text-zinc-600"><Lock className="w-3 h-3" /></span>}
                      </div>
                      {status && isCurrentTier && (
                        <Progress value={pct} className="h-1 mt-1.5" />
                      )}
                    </div>
                    <span className="text-xs text-zinc-600">{programs.length} programs</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-zinc-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />}
                  </button>

                  {expanded && (
                    <div className="divide-y divide-zinc-800/60 border-t border-zinc-800">
                      {[...programs.filter(p => !p.isGateChallenge), ...programs.filter(p => p.isGateChallenge)].map(tp => {
                        const progStatus = status?.programs.find(p => p.programId === tp.programId);
                        const done = progStatus?.completed ?? false;
                        const canEnroll = !isLocked;

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
                                    <Flame className="w-2.5 h-2.5" /> Gate
                                  </span>
                                )}
                              </div>
                              {tp.program.tagline && <p className="text-xs text-zinc-500 mt-0.5">{tp.program.tagline}</p>}
                              {!isLocked && (
                                <Link href={`/programs/${tp.program.slug}`}>
                                  <button className="text-xs text-orange-400 hover:text-orange-300 mt-1" data-testid={`btn-view-program-${tp.program.id}`}>
                                    {done ? "View again →" : "View program →"}
                                  </button>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ArchetypesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewArchetype, setPreviewArchetype] = useState<Archetype | null>(null);

  const { data: definitions = [], isLoading } = useQuery<Archetype[]>({
    queryKey: ["/api/archetypes"],
  });

  const { data: userArchetypes = [] } = useQuery<UserArchetypeWithDef[]>({
    queryKey: ["/api/archetypes/user"],
  });

  const mainArchetype = userArchetypes.find((ua) => ua.role === "main");
  const secondaryArchetype = userArchetypes.find((ua) => ua.role === "secondary");

  const selectMutation = useMutation({
    mutationFn: ({ archetypeId, role }: { archetypeId: string; role: "main" | "secondary" }) =>
      apiRequest("POST", "/api/archetypes/user", { archetypeId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user"] });
      toast({ title: "Archetype selected", description: "Your identity has been updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deselectMutation = useMutation({
    mutationFn: (role: "main" | "secondary") => apiRequest("DELETE", `/api/archetypes/user/${role}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes/user"] });
      toast({ title: "Archetype removed" });
    },
  });

  const getStatus = (archetypeId: string): "main" | "secondary" | null => {
    if (mainArchetype?.archetypeId === archetypeId) return "main";
    if (secondaryArchetype?.archetypeId === archetypeId) return "secondary";
    return null;
  };

  const getUserArchetype = (archetypeId: string) =>
    userArchetypes.find(ua => ua.archetypeId === archetypeId);

  const handleSelect = (archetypeId: string, role: "main" | "secondary") => {
    if (getStatus(archetypeId) === role) {
      deselectMutation.mutate(role);
    } else {
      selectMutation.mutate({ archetypeId, role });
    }
  };

  const isBusy = selectMutation.isPending || deselectMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-zinc-800/60">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 via-transparent to-transparent" />
        <div className="relative px-4 sm:px-6 py-8 max-w-4xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Identity System</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Your Archetype</h1>
          <p className="text-zinc-400 mt-1 text-sm max-w-lg">
            Each archetype is a training roadmap. Click any card to preview its full program before you commit.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Current Selections */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Your Selections</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Main slot */}
            <div
              className={cn(
                "rounded-xl border-2 p-4 flex items-center gap-3 min-h-[72px] transition-all cursor-pointer",
                mainArchetype ? "border-orange-600/60 bg-orange-950/20 hover:bg-orange-950/30" : "border-dashed border-zinc-700 bg-zinc-900/40",
              )}
              onClick={() => mainArchetype && setPreviewArchetype(mainArchetype.archetype)}
              data-testid="slot-main-archetype"
            >
              {mainArchetype ? (
                <>
                  {(() => { const Icon = ARCHETYPE_ICONS[mainArchetype.archetypeId] ?? Target; return <Icon className="w-6 h-6 flex-shrink-0" style={{ color: mainArchetype.archetype.primaryHex }} />; })()}
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Main</p>
                    <p className="font-bold text-white text-sm truncate">{mainArchetype.archetype.name}</p>
                    <p className="text-xs text-zinc-400 capitalize">{TIER_LABELS[mainArchetype.tier] ?? mainArchetype.tier}</p>
                  </div>
                </>
              ) : (
                <div className="text-center w-full">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Main</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Not selected</p>
                </div>
              )}
            </div>

            {/* Secondary slot */}
            <div
              className={cn(
                "rounded-xl border-2 p-4 flex items-center gap-3 min-h-[72px] transition-all cursor-pointer",
                secondaryArchetype ? "border-zinc-600/60 bg-zinc-800/20 hover:bg-zinc-800/40" : "border-dashed border-zinc-700 bg-zinc-900/40",
              )}
              onClick={() => secondaryArchetype && setPreviewArchetype(secondaryArchetype.archetype)}
              data-testid="slot-secondary-archetype"
            >
              {secondaryArchetype ? (
                <>
                  {(() => { const Icon = ARCHETYPE_ICONS[secondaryArchetype.archetypeId] ?? Target; return <Icon className="w-6 h-6 flex-shrink-0" style={{ color: secondaryArchetype.archetype.primaryHex }} />; })()}
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Secondary</p>
                    <p className="font-bold text-white text-sm truncate">{secondaryArchetype.archetype.name}</p>
                    <p className="text-xs text-zinc-400 capitalize">{TIER_LABELS[secondaryArchetype.tier] ?? secondaryArchetype.tier}</p>
                  </div>
                </>
              ) : (
                <div className="text-center w-full">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Secondary</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Not selected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid of all archetypes */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">All Archetypes</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 h-56 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {definitions.map((def) => {
                const Icon = ARCHETYPE_ICONS[def.id] ?? Target;
                const status = getStatus(def.id);
                const ua = getUserArchetype(def.id);

                return (
                  <div
                    key={def.id}
                    data-testid={`card-archetype-${def.id}`}
                    className={cn(
                      "rounded-2xl border p-5 flex flex-col gap-4 transition-all",
                      status === "main" ? "border-orange-500/50 bg-orange-950/15"
                        : status === "secondary" ? "border-zinc-500/50 bg-zinc-800/20"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700",
                    )}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${def.primaryHex}18`, border: `1px solid ${def.primaryHex}35` }}>
                        <Icon className="w-6 h-6" style={{ color: def.primaryHex }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-white text-lg leading-tight">{def.name}</h3>
                          {status && (
                            <Badge className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider border-0"
                              style={{ background: status === "main" ? "#ea580c25" : "#52525b25", color: status === "main" ? "#fb923c" : "#a1a1aa" }}>
                              {status === "main" ? "Your Main" : "Secondary"}
                            </Badge>
                          )}
                          {ua && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                              style={{ color: TIER_COLORS[ua.tier], borderColor: TIER_COLORS[ua.tier] + "50", background: TIER_COLORS[ua.tier] + "18" }}>
                              {TIER_LABELS[ua.tier]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 italic">"{def.tagline}"</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{def.description}</p>

                    {/* Traits */}
                    <div className="flex flex-wrap gap-1.5">
                      {def.traits.slice(0, 4).map((trait) => (
                        <span key={trait} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${def.primaryHex}18`, color: def.primaryHex }}>
                          {trait}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs font-bold h-8 border-zinc-700"
                        onClick={() => setPreviewArchetype(def)}
                        data-testid={`button-preview-${def.id}`}
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        View Roadmap
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-bold h-8"
                        style={status === "main" ? { background: "#ea580c25", color: "#fb923c", border: "1px solid #ea580c50" } : { background: def.primaryHex, color: "white" }}
                        onClick={() => handleSelect(def.id, "main")}
                        disabled={isBusy}
                        data-testid={`button-set-main-${def.id}`}
                      >
                        {status === "main" ? <><Check className="w-3 h-3 mr-1" />Remove</> : "Set as Main"}
                      </Button>
                    </div>
                    {status !== "main" && (
                      <Button size="sm" variant="ghost" className="w-full text-xs h-7 text-zinc-500 -mt-2"
                        onClick={() => handleSelect(def.id, "secondary")}
                        disabled={isBusy || status === "main"}
                        data-testid={`button-set-secondary-${def.id}`}>
                        {status === "secondary" ? <><Check className="w-3 h-3 mr-1" />Remove Secondary</> : "Set as Secondary"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Roadmap preview sheet */}
      {previewArchetype && (
        <ArchetypeRoadmapSheet
          archetype={previewArchetype}
          userArchetype={getUserArchetype(previewArchetype.id) as UserArchetypeWithDef | undefined}
          open={!!previewArchetype}
          onClose={() => setPreviewArchetype(null)}
          onSelect={(role) => {
            handleSelect(previewArchetype.id, role);
            setPreviewArchetype(null);
          }}
        />
      )}
    </div>
  );
}
