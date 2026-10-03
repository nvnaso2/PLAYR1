import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BaseballCard, StatsTab, TrophyRoomTab } from "@/pages/career";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Fingerprint, Target, Trophy, Settings, Pencil, Crown, ChevronDown, Medal, Award, Sparkles } from "lucide-react";
import type { CareerProfile } from "@shared/schema";

type CareerNumbers = {
  totalGames?: number;
  totalPoints?: number;
  totalRebounds?: number;
  totalAssists?: number;
  wins?: number;
  losses?: number;
  avgPoints?: number;
  avgRebounds?: number;
  avgAssists?: number;
  avgSteals?: number;
  avgBlocks?: number;
  seasonBreakdown?: Array<{
    seasonId?: string;
    seasonName?: string;
    year?: string;
    gamesPlayed?: number;
    avgPoints?: number;
    avgRebounds?: number;
    avgAssists?: number;
  }>;
};

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function TrophyHighlight({ eyebrow, title, detail, icon: Icon, tone = "orange" }: {
  eyebrow: string;
  title: string;
  detail?: string;
  icon: typeof Trophy;
  tone?: "orange" | "gold" | "ice";
}) {
  const tones = {
    orange: "border-orange-400/20 bg-orange-400/[0.07] text-orange-300",
    gold: "border-amber-300/20 bg-amber-300/[0.07] text-amber-200",
    ice: "border-sky-300/20 bg-sky-300/[0.07] text-sky-200",
  };
  return (
    <article className="group flex min-w-0 items-start gap-3 rounded-xl border border-white/[0.07] bg-[#171717] p-3.5 transition-colors hover:border-white/[0.14] sm:p-4">
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-zinc-500">{eyebrow}</p>
        <p className="mt-1 truncate text-sm font-bold text-zinc-100">{title}</p>
        {detail && <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{detail}</p>}
      </div>
    </article>
  );
}

export default function ProfileHubPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { openProOffer } = useProUpgrade();
  const [hasOpenedTrophyManagement, setHasOpenedTrophyManagement] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: career, isLoading: careerLoading } = useQuery<CareerProfile | null>({
    queryKey: ["/api/career"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: careerStats, isLoading: careerStatsLoading } = useQuery<CareerNumbers>({
    queryKey: ["/api/stats/career"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: achievements } = useQuery<any[]>({ queryKey: ["/api/achievements/unlocked"], enabled: !!user });
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/my-challenges"], enabled: !!user });
  const { data: personalRecords } = useQuery<any[]>({ queryKey: ["/api/personal-records"], enabled: !!user });
  const { data: teamAwards } = useQuery<any[]>({ queryKey: ["/api/team-awards"], enabled: !!user });

  const loadingCard = profileLoading || careerLoading || careerStatsLoading;
  const activeChallenges = (userChallenges ?? []).filter((entry) => !entry?.isCompleted && entry?.challenge);
  const unlocked = (achievements ?? [])
    .map((entry) => entry?.achievement ?? entry)
    .filter((entry) => entry && (entry.name || entry.title));
  const recentRecords = [...(personalRecords ?? [])]
    .sort((a, b) => new Date(b?.achievedAt ?? 0).getTime() - new Date(a?.achievedAt ?? 0).getTime())
    .slice(0, 2);
  const featuredItems = [
    ...unlocked.slice(0, 2).map((item) => ({
      eyebrow: item.tier ? `${item.tier} achievement` : "Achievement unlocked",
      title: item.name || item.title,
      detail: item.description || "A milestone in your development",
      icon: Sparkles,
      tone: "gold" as const,
    })),
    ...(teamAwards ?? []).slice(0, Math.max(0, 2 - Math.min(unlocked.length, 2))).map((item) => ({
      eyebrow: item.season ? `Team honor · ${item.season}` : "Team honor",
      title: item.awardName,
      detail: item.teamName,
      icon: Trophy,
      tone: "orange" as const,
    })),
    ...recentRecords.slice(0, 1).map((item) => ({
      eyebrow: "Personal record",
      title: `${item.newValue}${item.metricName ? ` ${item.metricName}` : ""}`,
      detail: item.achievedAt ? `Set ${new Date(item.achievedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : "A new best",
      icon: Medal,
      tone: "ice" as const,
    })),
  ].slice(0, 3);
  return (
    <main className="mx-auto min-h-[100dvh] max-w-6xl space-y-8 px-4 pb-12 pt-5 text-zinc-100 sm:px-6 sm:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-zinc-50 sm:text-3xl" data-testid="text-page-title">My Profile</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => navigate("/profile?tab=player-details")}
            className="h-9 border border-orange-400/80 bg-[#11100f] px-3.5 text-xs font-extrabold text-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.18),inset_0_0_0_1px_rgba(249,115,22,0.08)] transition hover:border-orange-300 hover:bg-[#1b1510] hover:text-white hover:shadow-[0_0_18px_rgba(249,115,22,0.3)]"
            data-testid="button-edit-profile"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Profile
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openProOffer()}
            className="h-9 rounded-full border border-orange-200/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-3 text-[11px] font-black text-zinc-950 shadow-[0_0_16px_rgba(249,115,22,0.28)] transition hover:brightness-110"
            data-testid="button-playr1-pro"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5" />
            PLAYR1 Pro
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Settings"
            title="Settings"
            onClick={() => navigate("/settings")}
            className="h-9 w-9 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <section className="flex justify-center" aria-label="Basketball player trading card">
        <div className="flex flex-col items-center">
          {loadingCard ? (
            <div className="space-y-3">
              <Skeleton className="h-[340px] w-[240px] rounded-md bg-zinc-800" />
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Loading player card</p>
            </div>
          ) : career ? (
            <>
              <BaseballCard
                profile={career}
                careerStats={careerStats as any}
                userName={profile?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "Player"}
              />
            </>
          ) : (
            <div className="flex min-h-[250px] w-full max-w-md flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 text-center">
              <Trophy className="h-8 w-8 text-orange-400" />
              <p className="mt-3 font-display text-lg font-bold">Your player card is waiting</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">Add your player details to put your identity on the court.</p>
              <Button onClick={() => navigate("/profile?tab=player-details")} className="mt-4 bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400">
                Set up player profile
              </Button>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="profile-stats-heading" className="space-y-4" data-testid="section-profile-career-stats">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="profile-stats-heading" className="mt-1 font-display text-xl font-black tracking-tight sm:text-2xl">Career stats</h2>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {numeric(careerStats?.totalGames)} games logged
          </span>
        </div>
        {careerStatsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-xl bg-zinc-900" />
            <Skeleton className="h-36 w-full rounded-xl bg-zinc-900" />
          </div>
        ) : (
          <StatsTab readOnly />
        )}
      </section>

      <section aria-labelledby="profile-trophies-heading" className="space-y-4" data-testid="section-profile-trophy-room">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Every rep leaves a mark</p>
            <h2 id="profile-trophies-heading" className="mt-1 font-display text-xl font-black tracking-tight sm:text-2xl">Trophy room</h2>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2.5 py-1 text-[10px] font-bold text-amber-100/70">{unlocked.length} unlocked</span>
            <span className="rounded-full border border-orange-300/15 bg-orange-300/[0.05] px-2.5 py-1 text-[10px] font-bold text-orange-100/70">{activeChallenges.length} active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-4 sm:p-5">
          {featuredItems.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {featuredItems.map((item, index) => (
                <TrophyHighlight key={`${item.eyebrow}-${item.title}-${index}`} {...item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/[0.07] text-orange-300">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-100">The first one is still out there.</p>
                  <p className="mt-1 text-xs text-zinc-500">Train, set a new personal best, and make it yours.</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="border-orange-500/30 text-orange-200 hover:bg-orange-500/10">
                <Link href="/training-log">Go to training</Link>
              </Button>
            </div>
          )}

          {activeChallenges.length > 0 && (
            <div className="mt-4 border-t border-white/[0.07] pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-orange-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">In progress</p>
              </div>
              <div className="space-y-3">
                {activeChallenges.slice(0, 2).map((entry) => {
                  const challenge = entry.challenge;
                  const current = numeric(entry.currentValue);
                  const target = Math.max(1, numeric(challenge.targetValue));
                  const progress = Math.min(100, (current / target) * 100);
                  return (
                    <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
                      <p className="truncate text-xs font-semibold text-zinc-300">{challenge.name}</p>
                      <p className="text-[10px] font-bold tabular-nums text-zinc-500">{current} / {target} {challenge.metric}</p>
                      <div className="col-span-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <details
          className="group overflow-hidden rounded-xl border border-white/[0.07] bg-zinc-950/50"
          data-testid="details-trophy-management"
          onToggle={(event) => {
            if (event.currentTarget.open) setHasOpenedTrophyManagement(true);
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
            <span>Manage challenges, records &amp; awards</span>
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Reorder · Add · Edit
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          {hasOpenedTrophyManagement && (
            <div className="border-t border-white/[0.07] p-3 sm:p-4">
              {careerLoading || !career ? (
                <Skeleton className="h-48 w-full rounded-xl bg-zinc-900" />
              ) : (
                <TrophyRoomTab
                  achievements={achievements}
                  userChallenges={userChallenges}
                  personalRecords={personalRecords}
                  teamAwards={teamAwards}
                  profile={career}
                />
              )}
            </div>
          )}
        </details>
      </section>

      <section aria-labelledby="profile-development-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Build your next level</p>
            <h2 id="profile-development-heading" className="mt-1 font-display text-lg font-black tracking-tight">Player development</h2>
          </div>
          <span className="hidden text-[10px] uppercase tracking-wider text-zinc-600 sm:block">Keep putting in work</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-12 justify-start gap-3 border-orange-500/25 bg-orange-500/[0.06] text-orange-100 hover:border-orange-400/40 hover:bg-orange-500/10">
            <Link href="/archetypes"><Fingerprint className="h-4 w-4 text-orange-400" />Discover your archetype</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 justify-start gap-3 border-zinc-700/80 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800">
            <Link href="/development"><Target className="h-4 w-4 text-zinc-400" />Development profile</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}