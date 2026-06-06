import { cn } from "@/lib/utils";
import { Target, Zap, Shuffle, Shield, Eye, ArrowUpDown, Wind, Dumbbell } from "lucide-react";
import { ARCHETYPE_TIER_XP, type ArchetypeTier } from "@shared/schema";

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

const TIER_CONFIG: Record<ArchetypeTier, {
  label: string;
  bgGradient: string;
  borderColor: string;
  badgeBg: string;
  badgeColor: string;
  glowColor: string;
}> = {
  prospect: {
    label: "PROSPECT",
    bgGradient: "linear-gradient(160deg, #18181b 0%, #27272a 100%)",
    borderColor: "#52525b",
    badgeBg: "rgba(82,82,91,0.4)",
    badgeColor: "#a1a1aa",
    glowColor: "transparent",
  },
  rising: {
    label: "RISING",
    bgGradient: "linear-gradient(160deg, #18181b 0%, #431407 100%)",
    borderColor: "#b45309",
    badgeBg: "rgba(146,64,14,0.5)",
    badgeColor: "#fbbf24",
    glowColor: "rgba(180,83,9,0.35)",
  },
  starter: {
    label: "STARTER",
    bgGradient: "linear-gradient(160deg, #18181b 0%, #172554 100%)",
    borderColor: "#2563eb",
    badgeBg: "rgba(30,58,138,0.5)",
    badgeColor: "#93c5fd",
    glowColor: "rgba(37,99,235,0.35)",
  },
  star: {
    label: "STAR",
    bgGradient: "linear-gradient(160deg, #18181b 0%, #3b0764 100%)",
    borderColor: "#9333ea",
    badgeBg: "rgba(88,28,135,0.5)",
    badgeColor: "#d8b4fe",
    glowColor: "rgba(147,51,234,0.45)",
  },
  elite: {
    label: "ELITE",
    bgGradient: "linear-gradient(160deg, #18181b 0%, #422006 100%)",
    borderColor: "#ca8a04",
    badgeBg: "rgba(113,63,18,0.5)",
    badgeColor: "#fde047",
    glowColor: "rgba(202,138,4,0.55)",
  },
  playr1: {
    label: "PLAYR1",
    bgGradient: "linear-gradient(160deg, #18181b 0%, #431407 50%, #422006 100%)",
    borderColor: "#f97316",
    badgeBg: "rgba(154,52,18,0.6)",
    badgeColor: "#fb923c",
    glowColor: "rgba(249,115,22,0.65)",
  },
};

export type ArchetypeCardProps = {
  archetypeId: string;
  archetypeName: string;
  primaryHex: string;
  tier: string;
  totalXp: number;
  playerName: string;
  role: "main" | "secondary";
  compact?: boolean;
};

export function ArchetypeCard({
  archetypeId,
  archetypeName,
  primaryHex,
  tier,
  totalXp,
  playerName,
  role,
  compact = false,
}: ArchetypeCardProps) {
  const Icon = ARCHETYPE_ICONS[archetypeId] ?? Target;
  const cfg = TIER_CONFIG[tier as ArchetypeTier] ?? TIER_CONFIG.prospect;

  const tierOrder: ArchetypeTier[] = ["prospect", "rising", "starter", "star", "elite", "playr1"];
  const currentIdx = tierOrder.indexOf(tier as ArchetypeTier);
  const currentThreshold = ARCHETYPE_TIER_XP[tier as ArchetypeTier] ?? 0;
  const nextTier = tierOrder[currentIdx + 1];
  const nextThreshold = nextTier ? ARCHETYPE_TIER_XP[nextTier] : null;
  const progress = nextThreshold
    ? Math.min((totalXp - currentThreshold) / (nextThreshold - currentThreshold), 1)
    : 1;

  const w = compact ? 160 : 260;
  const h = compact ? 210 : 360;

  return (
    <div
      className="relative rounded-2xl overflow-hidden select-none flex-shrink-0"
      data-testid={`card-archetype-identity-${role}`}
      style={{
        width: w,
        height: h,
        background: cfg.bgGradient,
        border: `1.5px solid ${cfg.borderColor}`,
        boxShadow:
          cfg.glowColor !== "transparent"
            ? `0 0 20px ${cfg.glowColor}, 0 0 50px ${cfg.glowColor}60`
            : "none",
      }}
    >
      {/* Top accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: primaryHex }} />

      <div className={cn("relative z-10 flex flex-col h-full", compact ? "p-3" : "p-5")}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ color: `${primaryHex}99` }}
          >
            {role === "main" ? "Main" : "Secondary"}
          </span>
          <div
            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase"
            style={{ background: cfg.badgeBg, color: cfg.badgeColor }}
          >
            {cfg.label}
          </div>
        </div>

        {/* Icon area */}
        <div
          className={cn(
            "flex items-center justify-center rounded-xl",
            compact ? "h-14 my-2" : "h-28 my-4",
          )}
          style={{ background: `${primaryHex}15`, border: `1px solid ${primaryHex}25` }}
        >
          <Icon className={compact ? "w-7 h-7" : "w-14 h-14"} style={{ color: primaryHex }} />
        </div>

        {/* Bottom */}
        <div className="mt-auto">
          <h3
            className={cn(
              "font-black uppercase tracking-tight text-white text-center leading-none",
              compact ? "text-base" : "text-2xl",
            )}
          >
            {archetypeName}
          </h3>
          {!compact && (
            <p className="text-xs text-zinc-500 text-center mt-1 truncate">{playerName}</p>
          )}

          {/* XP bar */}
          <div className={compact ? "mt-2" : "mt-4"}>
            {!compact && (
              <div className="flex justify-between text-[10px] text-zinc-600 mb-1.5">
                <span>{totalXp.toLocaleString()} XP</span>
                <span>
                  {nextThreshold ? `${nextThreshold.toLocaleString()} XP` : "MAX TIER"}
                </span>
              </div>
            )}
            <div className="h-[3px] rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(progress * 100, 4)}%`,
                  background: primaryHex,
                  boxShadow: `0 0 6px ${primaryHex}`,
                }}
              />
            </div>
            {compact && (
              <p className="text-[9px] text-zinc-600 mt-1 text-center">{totalXp} XP</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
