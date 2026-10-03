import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Crown, Fingerprint, Medal, Pencil, Settings, Target, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareMenu } from "@/components/share-menu";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { queryClient } from "@/lib/queryClient";
import { BaseballCard } from "@/pages/career";
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
  const { data: achievements } = useQuery<any[]>({ queryKey: ["/api/achievements/unlocked"], enabled: !!user });
  const { data: teamAwards } = useQuery<any[]>({ queryKey: ["/api/team-awards"], enabled: !!user });
  const { data: personalRecords } = useQuery<any[]>({ queryKey: ["/api/personal-records"], enabled: !!user });

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
  const totalGames = Number(careerStats?.totalGames || 0);
  const unlockedAchievements = (achievements ?? [])
    .map((entry) => entry?.achievement ?? entry)
    .filter((entry) => entry && (entry.name || entry.title));
  const recentRecords = [...(personalRecords ?? [])]
    .sort((a, b) => new Date(b?.achievedAt ?? 0).getTime() - new Date(a?.achievedAt ?? 0).getTime())
    .slice(0, 1);
  const trophyHighlights = [
    ...unlockedAchievements.slice(0, 2).map((item) => ({
      kind: item.tier ? `${item.tier} achievement` : "Achievement",
      title: item.name || item.title,
      detail: item.description || "A milestone in your development",
      icon: Award,
      tone: "text-amber-300",
    })),
    ...(teamAwards ?? []).slice(0, 2).map((item) => ({
      kind: item.season ? `Team honor · ${item.season}` : "Team honor",
      title: item.awardName || "Team award",
      detail: item.teamName || "A moment from your season",
      icon: Trophy,
      tone: "text-orange-300",
    })),
    ...recentRecords.map((item) => ({
      kind: "Personal record",
      title: `${item.newValue}${item.metricName ? ` ${item.metricName}` : ""}`,
      detail: item.achievedAt
        ? `Set ${new Date(item.achievedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
        : "A new best",
      icon: Medal,
      tone: "text-sky-300",
    })),
  ].slice(0, 3);
  const trophyCount = unlockedAchievements.length + (teamAwards?.length ?? 0) + (personalRecords?.length ?? 0);

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
          <button
            type="button"
            onClick={() => editing ? returnToCard() : window.history.back()}
            className="mt-1 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            aria-label={editing ? "Return to player card" : "Go back"}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
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
          onSaved={returnToCard}
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
          <ShareMenu
            url={`/player/${slug}`}
            title={`${displayName} - PLAYR1 Player Profile`}
            description="Check out my basketball profile on PLAYR1!"
            testId="button-share-profile"
          />

          <section aria-labelledby="profile-stats-heading" className="w-full max-w-xl space-y-3" data-testid="section-profile-career-stats">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 id="profile-stats-heading" className="mt-1 text-lg font-black tracking-tight text-zinc-100">Career stats</h2>
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {totalGames} games logged
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414]">
              <div className="grid grid-cols-3 gap-y-4 px-4 py-4 sm:grid-cols-6">
                {[
                  ["Points", careerStats?.avgPoints],
                  ["Rebounds", careerStats?.avgRebounds],
                  ["Assists", careerStats?.avgAssists],
                  ["Steals", careerStats?.avgSteals],
                  ["Blocks", careerStats?.avgBlocks],
                ].map(([label, value], index) => (
                  <div key={String(label)} className="text-center">
                    <p className={`text-lg font-black tabular-nums ${index === 0 ? "text-orange-300" : "text-zinc-100"}`}>
                      {totalGames > 0 && Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "—"}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</p>
                  </div>
                ))}
                <div className="text-center">
                  <p className="text-lg font-black tabular-nums text-zinc-100">
                    {totalGames > 0 ? `${Number(careerStats?.wins || 0)}–${Number(careerStats?.losses || 0)}` : "—"}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">Record</p>
                </div>
              </div>
              <details className="group border-t border-white/[0.07] bg-black/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
                  Season &amp; game management
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Import · Share · Edit</span>
                </summary>
                <div className="border-t border-white/[0.07] px-4 py-3">
                  <Link href="/profile-hub" className="text-xs font-semibold text-orange-300 hover:text-orange-200">
                    Open season and game management
                  </Link>
                </div>
              </details>
            </div>
          </section>

          <section aria-labelledby="profile-trophies-heading" className="w-full max-w-xl space-y-3" data-testid="section-profile-trophy-room">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Every rep leaves a mark</p>
                <h2 id="profile-trophies-heading" className="mt-1 text-lg font-black tracking-tight text-zinc-100">Trophy room</h2>
              </div>
              <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2.5 py-1 text-[10px] font-bold text-amber-100/70">
                {trophyCount} milestones
              </span>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#141414] p-3">
              {trophyHighlights.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {trophyHighlights.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <article key={`${item.kind}-${item.title}-${index}`} className="min-w-0 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                        <Icon className={`h-4 w-4 ${item.tone}`} />
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{item.kind}</p>
                        <p className="mt-1 truncate text-xs font-bold text-zinc-100">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{item.detail}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
                  <div>
                    <p className="text-sm font-bold text-zinc-100">Your next milestone is waiting.</p>
                    <p className="mt-1 text-xs text-zinc-500">Training, challenges, and new personal bests show up here.</p>
                  </div>
                  <Link href="/training-log" className="text-xs font-semibold text-orange-300 hover:text-orange-200">Go to training</Link>
                </div>
              )}
              <details className="group mt-3 border-t border-white/[0.07] pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
                  Manage challenges, records &amp; awards
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Reorder · Add · Edit</span>
                </summary>
                <div className="pt-3">
                  <Link href="/profile-hub" className="text-xs font-semibold text-orange-300 hover:text-orange-200">
                    Open Trophy Room management
                  </Link>
                </div>
              </details>
            </div>
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