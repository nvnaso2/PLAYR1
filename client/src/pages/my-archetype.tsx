import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArchetypeCard } from "@/components/archetype-card";
import { ArchetypeRingChart, type RingSegment } from "@/components/archetype-ring-chart";
import { useAuth } from "@/hooks/use-auth";
import type { Archetype, UserArchetype, ArchetypeXpLog, ArchetypeTier } from "@shared/schema";
import { ARCHETYPE_TIER_XP } from "@shared/schema";
import { Crown, Sparkles, Zap, ClipboardList, Star, Fingerprint } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type UserArchetypeEnriched = UserArchetype & {
  archetype: Archetype;
  nextTierXp: number | null;
  currentTierXp: number;
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  training_log: <ClipboardList className="w-3 h-3 text-blue-400" />,
  program: <Sparkles className="w-3 h-3 text-purple-400" />,
  challenge: <Zap className="w-3 h-3 text-orange-400" />,
};

const TIER_ORDER: ArchetypeTier[] = ["prospect", "rising", "starter", "star", "elite", "playr1"];

export default function MyArchetypePage() {
  const { user } = useAuth();

  const { data: userArchetypes = [], isLoading } = useQuery<UserArchetypeEnriched[]>({
    queryKey: ["/api/archetypes/user"],
  });

  const { data: xpLog = [] } = useQuery<ArchetypeXpLog[]>({
    queryKey: ["/api/archetypes/xp-log"],
  });

  const main = userArchetypes.find((ua) => ua.role === "main");
  const secondary = userArchetypes.find((ua) => ua.role === "secondary");
  const playerName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email?.split("@")[0] ?? "Player";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-600 text-sm">Loading your identity...</div>
      </div>
    );
  }

  if (!main) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center">
        <Fingerprint className="w-14 h-14 text-zinc-700" />
        <h2 className="text-2xl font-black text-white">No Archetype Yet</h2>
        <p className="text-zinc-500 text-sm max-w-xs">
          Choose your main archetype to unlock your identity card and start earning XP.
        </p>
        <Link href="/archetypes">
          <Button
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
            data-testid="button-choose-archetype"
          >
            Choose My Archetype
          </Button>
        </Link>
      </div>
    );
  }

  const buildRings = (ua: UserArchetypeEnriched): [RingSegment, RingSegment, RingSegment] => {
    const userLog = xpLog.filter((l) => l.userArchetypeId === ua.id);
    const logCount = userLog.filter((l) => l.sourceType === "training_log").length;
    const progCount = userLog.filter((l) => l.sourceType === "program").length;
    const chalCount = userLog.filter((l) => l.sourceType === "challenge").length;

    const tierIdx = TIER_ORDER.indexOf(ua.tier as ArchetypeTier);
    const nextTier = TIER_ORDER[tierIdx + 1];
    const currentThreshold = ARCHETYPE_TIER_XP[ua.tier as ArchetypeTier] ?? 0;
    const nextThreshold = nextTier ? ARCHETYPE_TIER_XP[nextTier] : null;
    const tierProgress = nextThreshold
      ? Math.min((ua.totalXp - currentThreshold) / (nextThreshold - currentThreshold), 1)
      : 1;

    const totalActions = Math.max(logCount + progCount + chalCount, 1);

    return [
      {
        label: "Tier",
        value: tierProgress,
        color: ua.archetype.primaryHex,
        count: `${Math.round(tierProgress * 100)}%`,
      },
      {
        label: "Sessions",
        value: Math.min(logCount / Math.max(totalActions, 10), 1),
        color: "#3b82f6",
        count: logCount,
      },
      {
        label: "Programs",
        value: Math.min(progCount / Math.max(totalActions, 10), 1),
        color: "#a855f7",
        count: progCount,
      },
    ];
  };

  const mainTierIdx = TIER_ORDER.indexOf(main.tier as ArchetypeTier);
  const mainNextTier = TIER_ORDER[mainTierIdx + 1];
  const mainCurrentThreshold = ARCHETYPE_TIER_XP[main.tier as ArchetypeTier] ?? 0;
  const mainNextThreshold = mainNextTier ? ARCHETYPE_TIER_XP[mainNextTier] : null;
  const mainProgress = mainNextThreshold
    ? Math.min((main.totalXp - mainCurrentThreshold) / (mainNextThreshold - mainCurrentThreshold), 1)
    : 1;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-zinc-800/60">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 via-transparent to-transparent" />
        <div className="relative px-4 sm:px-6 py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">
              My Identity
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">My Archetype</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Your play-style identity, built through consistent training.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6 pt-6">
        {/* Cards row */}
        <div className="flex gap-4 items-start justify-center flex-wrap">
          <ArchetypeCard
            archetypeId={main.archetypeId}
            archetypeName={main.archetype.name}
            primaryHex={main.archetype.primaryHex}
            tier={main.tier}
            totalXp={main.totalXp}
            playerName={playerName}
            role="main"
          />
          {secondary && (
            <ArchetypeCard
              archetypeId={secondary.archetypeId}
              archetypeName={secondary.archetype.name}
              primaryHex={secondary.archetype.primaryHex}
              tier={secondary.tier}
              totalXp={secondary.totalXp}
              playerName={playerName}
              role="secondary"
              compact
            />
          )}
        </div>

        {/* Tier Progress */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Current Tier</p>
              <h2 className="text-2xl font-black text-white capitalize">{main.tier}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Total XP</p>
              <p className="text-2xl font-black text-white">{main.totalXp.toLocaleString()}</p>
            </div>
          </div>

          {mainNextThreshold ? (
            <>
              <div className="flex justify-between text-xs text-zinc-600 mb-1">
                <span>
                  → {mainNextTier ? mainNextTier.charAt(0).toUpperCase() + mainNextTier.slice(1) : ""}
                </span>
                <span>
                  {(main.totalXp - mainCurrentThreshold).toLocaleString()} /{" "}
                  {(mainNextThreshold - mainCurrentThreshold).toLocaleString()} XP
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(mainProgress * 100, 2)}%`,
                    background: main.archetype.primaryHex,
                    boxShadow: `0 0 8px ${main.archetype.primaryHex}80`,
                  }}
                />
              </div>
            </>
          ) : (
            <div
              className="h-2 rounded-full"
              style={{ background: main.archetype.primaryHex }}
            />
          )}

          {/* Tier ladder */}
          <div className="flex items-center gap-1.5 pt-1">
            {TIER_ORDER.map((t, i) => {
              const reached = i <= mainTierIdx;
              return (
                <div key={t} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full h-1 rounded-full"
                    style={{ background: reached ? main.archetype.primaryHex : "#27272a" }}
                  />
                  <span
                    className={`text-[8px] uppercase tracking-wider ${reached ? "text-zinc-300" : "text-zinc-700"}`}
                  >
                    {t === "playr1" ? "P1" : t.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ring Chart */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col items-center gap-2">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest self-start mb-2">
            XP Breakdown
          </h3>
          <ArchetypeRingChart
            rings={buildRings(main)}
            centerLabel={`${Math.round(mainProgress * 100)}%`}
            centerSub="to next tier"
          />
        </div>

        {/* Change archetype */}
        <div className="flex justify-center">
          <Link href="/archetypes">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              data-testid="button-change-archetype"
            >
              Change / Add Archetype
            </Button>
          </Link>
        </div>

        {/* XP Log */}
        {xpLog.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent XP</h3>
            <div className="space-y-0">
              {xpLog.slice(0, 15).map((entry) => {
                const ua = userArchetypes.find((a) => a.id === entry.userArchetypeId);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-2.5 border-b border-zinc-800/40 last:border-0"
                    data-testid={`row-xp-${entry.id}`}
                  >
                    <div className="flex-shrink-0 w-5 flex items-center justify-center">
                      {SOURCE_ICONS[entry.sourceType] ?? (
                        <Star className="w-3 h-3 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate">
                        {entry.note ?? entry.sourceType}
                      </p>
                      {ua && (
                        <p className="text-[10px] text-zinc-600 capitalize">
                          {ua.archetype.name} · {ua.role}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className="text-xs font-bold"
                        style={{ color: ua?.archetype.primaryHex ?? "#f97316" }}
                      >
                        +{entry.xpEarned} XP
                      </span>
                      <p className="text-[10px] text-zinc-600">
                        {entry.earnedAt
                          ? formatDistanceToNow(new Date(entry.earnedAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
