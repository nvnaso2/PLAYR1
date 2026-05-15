import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Target, Zap, Shuffle, Shield, Eye, ArrowUpDown, Wind, Dumbbell, Check, Crown, ChevronLeft } from "lucide-react";
import type { Archetype, UserArchetype } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

type UserArchetypeWithDef = UserArchetype & { archetype: Archetype };

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  sharpshooter: Target,
  slasher: Zap,
  playmaker: Shuffle,
  "two-way-lockdown": Shield,
  "floor-general": Eye,
  "stretch-big": ArrowUpDown,
  "versatile-wing": Wind,
  "glass-cleaner": Dumbbell,
};

export default function ArchetypesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deselectMutation = useMutation({
    mutationFn: (role: "main" | "secondary") =>
      apiRequest("DELETE", `/api/archetypes/user/${role}`),
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
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4" data-testid="button-back">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">
              Identity System
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Choose Your Archetype</h1>
          <p className="text-zinc-400 mt-1 text-sm max-w-lg">
            Pick a Main and Secondary archetype. Your training logs, programs, and challenges will
            build toward your chosen identity.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Current Selections */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Your Selections
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Main slot */}
            <div
              className={cn(
                "rounded-xl border-2 p-4 flex items-center gap-3 min-h-[72px] transition-all",
                mainArchetype
                  ? "border-orange-600/60 bg-orange-950/20"
                  : "border-dashed border-zinc-700 bg-zinc-900/40",
              )}
              data-testid="slot-main-archetype"
            >
              {mainArchetype ? (
                <>
                  {(() => {
                    const Icon = ARCHETYPE_ICONS[mainArchetype.archetypeId] ?? Target;
                    return (
                      <Icon
                        className="w-6 h-6 flex-shrink-0"
                        style={{ color: mainArchetype.archetype.primaryHex }}
                      />
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Main</p>
                    <p className="font-bold text-white text-sm truncate">
                      {mainArchetype.archetype.name}
                    </p>
                    <p className="text-xs text-zinc-400 capitalize">{mainArchetype.tier}</p>
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
                "rounded-xl border-2 p-4 flex items-center gap-3 min-h-[72px] transition-all",
                secondaryArchetype
                  ? "border-zinc-600/60 bg-zinc-800/20"
                  : "border-dashed border-zinc-700 bg-zinc-900/40",
              )}
              data-testid="slot-secondary-archetype"
            >
              {secondaryArchetype ? (
                <>
                  {(() => {
                    const Icon = ARCHETYPE_ICONS[secondaryArchetype.archetypeId] ?? Target;
                    return (
                      <Icon
                        className="w-6 h-6 flex-shrink-0"
                        style={{ color: secondaryArchetype.archetype.primaryHex }}
                      />
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Secondary</p>
                    <p className="font-bold text-white text-sm truncate">
                      {secondaryArchetype.archetype.name}
                    </p>
                    <p className="text-xs text-zinc-400 capitalize">{secondaryArchetype.tier}</p>
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

          {(mainArchetype || secondaryArchetype) && (
            <div className="flex justify-end mt-2">
              <Link href="/my-archetype">
                <Button variant="outline" size="sm" className="text-xs" data-testid="link-view-identity">
                  View My Identity →
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Grid */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
            All Archetypes
          </h2>
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

                return (
                  <div
                    key={def.id}
                    data-testid={`card-archetype-${def.id}`}
                    className={cn(
                      "rounded-2xl border p-5 flex flex-col gap-4 transition-all",
                      status === "main"
                        ? "border-orange-500/50 bg-orange-950/15"
                        : status === "secondary"
                          ? "border-zinc-500/50 bg-zinc-800/20"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700",
                    )}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${def.primaryHex}18`,
                          border: `1px solid ${def.primaryHex}35`,
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: def.primaryHex }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-white text-lg leading-tight">{def.name}</h3>
                          {status && (
                            <Badge
                              className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider border-0"
                              style={{
                                background: status === "main" ? "#ea580c25" : "#52525b25",
                                color: status === "main" ? "#fb923c" : "#a1a1aa",
                              }}
                            >
                              {status === "main" ? "Your Main" : "Secondary"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 italic">"{def.tagline}"</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed">{def.description}</p>

                    {/* Traits */}
                    <div className="flex flex-wrap gap-1.5">
                      {def.traits.map((trait) => (
                        <span
                          key={trait}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${def.primaryHex}18`, color: def.primaryHex }}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>

                    {/* Focus categories */}
                    <div className="flex flex-wrap gap-1">
                      {def.drillCategories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] px-2 py-0.5 bg-zinc-800/60 text-zinc-500 rounded-full capitalize"
                        >
                          {cat.replace("-", " ")}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-bold h-8"
                        style={
                          status === "main"
                            ? {
                                background: "#ea580c25",
                                color: "#fb923c",
                                border: "1px solid #ea580c50",
                              }
                            : { background: def.primaryHex, color: "white" }
                        }
                        onClick={() => handleSelect(def.id, "main")}
                        disabled={isBusy}
                        data-testid={`button-set-main-${def.id}`}
                      >
                        {status === "main" ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Remove Main
                          </>
                        ) : (
                          "Set as Main"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs font-bold h-8"
                        onClick={() => handleSelect(def.id, "secondary")}
                        disabled={isBusy || status === "main"}
                        data-testid={`button-set-secondary-${def.id}`}
                      >
                        {status === "secondary" ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Remove
                          </>
                        ) : (
                          "Set as Secondary"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
