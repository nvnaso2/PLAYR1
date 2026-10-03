import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSummaryCard } from "@/components/profile/profile-summary-card";
import { StatsTab, TrophyRoomTab } from "@/pages/career";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Fingerprint, Target, Trophy } from "lucide-react";
import type { CareerProfile } from "@shared/schema";

export default function ProfileHubPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { openProOffer } = useProUpgrade();

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: playerProfile, isLoading: playerProfileLoading } = useQuery<any>({
    queryKey: ["/api/player-profile"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: career, isLoading: careerLoading } = useQuery<CareerProfile | null>({
    queryKey: ["/api/career"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: careerStats, isLoading: careerStatsLoading } = useQuery<any>({
    queryKey: ["/api/stats/career"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const { data: achievements } = useQuery<any[]>({ queryKey: ["/api/achievements/unlocked"], enabled: !!user });
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/my-challenges"], enabled: !!user });
  const { data: personalRecords } = useQuery<any[]>({ queryKey: ["/api/personal-records"], enabled: !!user });
  const { data: teamAwards } = useQuery<any[]>({ queryKey: ["/api/team-awards"], enabled: !!user });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 pb-8 sm:p-6">
      <ProfileSummaryCard
        user={user}
        userProfile={profile}
        playerProfile={playerProfile}
        career={career}
        careerStats={careerStats}
        isLoading={profileLoading || playerProfileLoading || careerLoading || careerStatsLoading}
        onEditProfile={() => navigate("/profile?tab=player-details")}
        onOpenPro={() => openProOffer()}
        onSettings={() => navigate("/settings")}
      />

      <section aria-labelledby="profile-stats-heading" className="space-y-3" data-testid="section-profile-career-stats">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-orange-400" />
          <h2 id="profile-stats-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-300">Career Stats</h2>
        </div>
        <StatsTab />
      </section>

      <section aria-labelledby="profile-development-heading" className="space-y-3">
        <h2 id="profile-development-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Player Development</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-12 justify-start gap-2 border-orange-500/30 bg-orange-500/5 text-orange-200 hover:bg-orange-500/10">
            <Link href="/archetypes"><Fingerprint className="h-4 w-4" />Archetype</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 justify-start gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
            <Link href="/development"><Target className="h-4 w-4" />Development Profile</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="profile-trophies-heading" className="space-y-3" data-testid="section-profile-trophy-room">
        <h2 id="profile-trophies-heading" className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-300">Trophy Room</h2>
        {careerLoading || !career ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : (
          <TrophyRoomTab
            achievements={achievements}
            userChallenges={userChallenges}
            personalRecords={personalRecords}
            teamAwards={teamAwards}
            profile={career}
          />
        )}
      </section>
    </main>
  );
}