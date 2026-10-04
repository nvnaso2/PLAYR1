import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BaseballCard, StatsTab } from "@/pages/career";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Fingerprint, Target, Trophy, Settings, Pencil, Crown, ChevronRight } from "lucide-react";
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

export default function ProfileHubPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { openProOffer } = useProUpgrade();

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
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/my-challenges"], enabled: !!user });

  const loadingCard = profileLoading || careerLoading || careerStatsLoading;
  const activeChallenges = (userChallenges ?? []).filter((entry) => !entry?.isCompleted && entry?.challenge);
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
          <StatsTab />
        )}
      </section>

      <section aria-labelledby="profile-trophies-heading" className="space-y-4" data-testid="section-profile-trophy-room">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Awards &amp; records</p>
            <h2 id="profile-trophies-heading" className="mt-1 font-display text-xl font-black tracking-tight sm:text-2xl">Trophy room</h2>
          </div>
        </div>
        <Button asChild variant="outline" className="group h-auto w-full justify-between border-amber-300/15 bg-[radial-gradient(ellipse_at_top,rgba(245,190,65,0.08),transparent_72%),#141414] px-4 py-4 text-left text-zinc-100 hover:border-amber-300/30 hover:bg-[#191714]" data-testid="button-open-trophy-room-hub">
          <Link href="/trophy-room">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/[0.07] text-amber-200">
                <Trophy className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">Open Trophy Room</span>
                <span className="mt-1 block text-xs font-normal text-zinc-500">Custom awards, game and season bests, and personal records</span>
              </span>
            </span>
            <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-200" />
          </Link>
        </Button>
      </section>

      {activeChallenges.length > 0 && (
        <section aria-labelledby="hub-active-challenges-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-400" />
            <h2 id="hub-active-challenges-heading" className="text-sm font-bold text-zinc-200">Challenges in progress</h2>
          </div>
          <div className="space-y-3 rounded-xl border border-white/[0.07] bg-zinc-950/50 p-4">
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
        </section>
      )}

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