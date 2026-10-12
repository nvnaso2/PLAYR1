import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BaseballCard, StatsTab } from "@/pages/career";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Fingerprint, Target, Trophy, Settings, Pencil, Crown } from "lucide-react";
import { ProfileCardShareButton } from "@/components/profile-card-share-button";
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

export default function ProfileHubPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { openProOffer } = useProUpgrade();
  const cardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const appScroller = document.querySelector<HTMLElement>("[data-app-scroll-container]");
    if (appScroller) appScroller.scrollTop = 0;
  }, []);
  const params = new URLSearchParams(window.location.search);
  const checkoutValue = params.get("checkout");
  const checkoutReturn = checkoutValue === "success" || checkoutValue === "cancelled" ? checkoutValue : null;
  const showProOffer = params.get("showPro") === "1";

  useEffect(() => {
    if (!checkoutReturn && !showProOffer) return;

    openProOffer(undefined, checkoutReturn);
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("showPro");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [checkoutReturn, openProOffer, showProOffer]);

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
  const { data: playerProfile, isLoading: playerProfileLoading } = useQuery<any>({
    queryKey: ["/api/player-profile"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const loadingCard = profileLoading || careerLoading || careerStatsLoading || playerProfileLoading;
  const displayName =
    profile?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Player";
  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col px-4 py-3 text-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-zinc-50 sm:text-3xl" data-testid="text-page-title">My Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          <ProfileCardShareButton
            cardRef={cardRef}
            slug={playerProfile?.slug}
            canShareInteractiveCard={playerProfile?.isPublic === true && playerProfile?.cardShowPlayerCard !== false}
            compact
            testId="button-share-profile"
            className="h-9 w-9 border-zinc-700 bg-zinc-900 p-0 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          />
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
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
      <div className="flex shrink-0 justify-center gap-3" aria-label="Profile editing actions">
          <Button
            type="button"
            size="sm"
            onClick={() => navigate("/profile/edit?returnTo=%2Fprofile-hub")}
            className="h-10 border border-orange-400/80 bg-[#11100f] px-4 text-xs font-extrabold text-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.18)] hover:bg-[#1b1510] hover:text-white"
            data-testid="button-edit-profile"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Profile
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openProOffer()}
            className="h-10 rounded-full border border-orange-200/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-4 text-xs font-black text-zinc-950 shadow-[0_0_16px_rgba(249,115,22,0.28)] hover:brightness-110"
            data-testid="button-playr1-pro"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5" />
            PLAYR1 Pro
          </Button>
      </div>

      <div className="flex h-[347px] w-[327px] shrink-0 items-center justify-center min-[390px]:h-[361px] min-[390px]:w-[340px]" aria-label="Basketball player trading card">
          {loadingCard ? (
            <Skeleton className="h-[330px] w-[310px] rounded-md bg-zinc-800" />
          ) : (
              <BaseballCard
                profile={(career || { cardPhotoUrl: null, jerseyNumber: null, positions: [], teamName: null, schoolName: null }) as CareerProfile}
                careerStats={careerStats as any}
                playerProfile={playerProfile}
                userProfile={profile}
                userName={displayName}
                rootRef={cardRef}
              />
          )}
      </div>
      {!loadingCard && !career && (
        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-3 text-center">
          <Trophy className="h-6 w-6 text-orange-400" />
          <p className="mt-2 font-display font-bold">Your player card is waiting</p>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">Add your player details to put your identity on the court.</p>
          <Button onClick={() => navigate("/profile/edit?returnTo=%2Fprofile-hub")} className="mt-3 bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400">
            Set up player profile
          </Button>
        </div>
      )}

      <section className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2" aria-label="Profile navigation" data-testid="section-profile-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/career-stats")}
          className="h-10 rounded-full border border-orange-400/35 bg-zinc-950 px-4 text-xs font-bold text-orange-100 shadow-[0_0_18px_rgba(249,115,22,0.16)] hover:border-orange-300/70 hover:bg-zinc-900 hover:shadow-[0_0_24px_rgba(249,115,22,0.28)]"
          data-testid="button-career-stats-hub"
        >
          <Target className="mr-2 h-4 w-4 text-orange-300" />
          Career Stats
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-full border border-amber-300/50 bg-[radial-gradient(ellipse_at_top,rgba(245,190,65,0.16),transparent_75%),#17140e] px-4 text-xs font-bold text-amber-100 shadow-[0_0_18px_rgba(245,190,65,0.18)] hover:border-amber-200 hover:bg-[#201a0e]"
          data-testid="button-open-trophy-room-hub"
        >
          <Link href="/trophy-room" className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            Trophy Room
          </Link>
        </Button>
      </section>
      </div>
      <section aria-labelledby="profile-development-heading" className="space-y-3" hidden>
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

export function CareerStatsPage() {
  const [, navigate] = useLocation();
  return (
    <main className="mx-auto min-h-full w-full min-w-0 max-w-7xl space-y-5 overflow-x-clip bg-[#090909] p-4 text-zinc-100 sm:space-y-6 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase tracking-wide text-white sm:text-3xl" data-testid="text-career-stats-title">
          Career Stats
        </h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/profile-hub")}
          className="h-9 shrink-0 border-zinc-800 bg-transparent px-3 text-xs text-zinc-300 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300"
          data-testid="button-back-to-profile"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Profile
        </Button>
      </header>
      <StatsTab />
    </main>
  );
}