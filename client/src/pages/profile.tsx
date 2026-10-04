import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Fingerprint, Pencil, Settings, Target, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareMenu } from "@/components/share-menu";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { queryClient } from "@/lib/queryClient";
import { BaseballCard, StatsTab } from "@/pages/career";
import { PlayerProfileSection } from "@/pages/player-profile";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const { openProOffer } = useProUpgrade();
  const [editing, setEditing] = useState(
    () => new URLSearchParams(window.location.search).get("tab") === "player-details",
  );

  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: playerProfile, isLoading: isPlayerProfileLoading } = useQuery<any>({
    queryKey: ["/api/player-profile"],
  });
  const { data: career, isLoading: isCareerLoading } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: careerStats } = useQuery<any>({ queryKey: ["/api/stats/career"] });

  const displayName =
    userProfile?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Player";
  const returnToCard = () => {
    setEditing(false);
    const params = new URLSearchParams(window.location.search);
    params.delete("tab");
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  };
  const slug =
    playerProfile?.slug ||
    `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player"}${user?.id ? `-${user.id.slice(-5)}` : ""}`;
  if (isCareerLoading || isPlayerProfileLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-5">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mx-auto h-[380px] w-[320px] max-w-full rounded-xl" />
        <Skeleton className="mx-auto h-11 w-48 rounded-full" />
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex items-start gap-3">
          {!editing && (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-1 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
              aria-label="Go back"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl" data-testid="text-page-title">My Profile</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!editing && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => setEditing(true)}
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
            </>
          )}
          <Button
            asChild
            size="icon"
            variant="outline"
            aria-label="Settings"
            title="Settings"
            className="h-9 w-9 shrink-0 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Link href="/settings" aria-label="Settings" data-testid="button-profile-settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {editing ? (
        <PlayerProfileSection
          concise
          onCancel={returnToCard}
        />
      ) : (
        <section className="flex flex-col items-center gap-5">
          <div className="flex w-full justify-center">
            <BaseballCard
              profile={career || { cardPhotoUrl: null, jerseyNumber: null, positions: [], teamName: null, schoolName: null }}
              careerStats={careerStats}
              playerProfile={playerProfile}
              userProfile={userProfile || { profileImageUrl: user?.profileImageUrl }}
              userName={displayName}
              onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/career"] })}
            />
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <ShareMenu
              url={`/player/${slug}`}
              title={`${displayName} - PLAYR1 Player Profile`}
              description="Check out my basketball profile on PLAYR1!"
              testId="button-share-profile"
              className="h-10 border-zinc-700 bg-zinc-900 px-4 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            />
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border border-amber-300/60 bg-[radial-gradient(ellipse_at_top,rgba(245,190,65,0.16),transparent_75%),#17140e] px-4 text-xs font-black text-amber-100 shadow-[0_0_18px_rgba(245,190,65,0.2),inset_0_0_0_1px_rgba(245,190,65,0.08)] transition hover:border-amber-200 hover:bg-[#201a0e] hover:text-amber-50 hover:shadow-[0_0_24px_rgba(245,190,65,0.32)]"
              data-testid="button-open-trophy-room"
            >
              <Link href="/trophy-room" className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-300" />
                Trophy Room
              </Link>
            </Button>
          </div>

          <section aria-labelledby="profile-stats-heading" className="w-full min-w-0 space-y-3" data-testid="section-profile-career-stats">
            <h2 id="profile-stats-heading" className="mt-1 text-lg font-black tracking-tight text-zinc-100">Career &amp; Season Stats</h2>
            <StatsTab />
          </section>

          <section aria-labelledby="profile-development-heading" className="w-full max-w-xl space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Build your next level</p>
              <h2 id="profile-development-heading" className="mt-1 text-lg font-black tracking-tight text-zinc-100">Player development</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-11 justify-start gap-3 border-orange-500/25 bg-orange-500/[0.06] text-orange-100 hover:border-orange-400/40 hover:bg-orange-500/10">
                <Link href="/archetypes"><Fingerprint className="h-4 w-4 text-orange-400" />Discover your archetype</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 justify-start gap-3 border-zinc-700/80 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800">
                <Link href="/development"><Target className="h-4 w-4 text-zinc-400" />Development profile</Link>
              </Button>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}