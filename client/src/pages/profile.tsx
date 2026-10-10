import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Pencil, Settings, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCardShareButton } from "@/components/profile-card-share-button";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { queryClient } from "@/lib/queryClient";
import { BaseballCard } from "@/pages/career";
import { Link, useLocation } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const { openProOffer } = useProUpgrade();
  const [, setLocation] = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: playerProfile, isLoading: isPlayerProfileLoading } = useQuery<any>({
    queryKey: ["/api/player-profile"],
  });
  const { data: career, isLoading: isCareerLoading } = useQuery<any>({ queryKey: ["/api/career"] });
  const displayName =
    userProfile?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Player";
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "player-details") {
      setLocation("/profile/edit?returnTo=%2Fprofile");
    }
  }, [setLocation]);
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
    <main className="mx-auto flex h-full min-h-0 max-w-2xl flex-col px-4 py-3">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-black uppercase tracking-tight sm:text-3xl" data-testid="text-page-title">My Profile</h1>
        <div className="flex shrink-0 items-center gap-2">
          <ProfileCardShareButton
            cardRef={cardRef}
            slug={playerProfile?.slug}
            canShareInteractiveCard={playerProfile?.isPublic === true && playerProfile?.cardShowPlayerCard !== false}
            compact
            testId="button-share-profile"
            className="h-9 w-9 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800 hover:text-white"
          />
          <Button asChild size="icon" variant="outline" aria-label="Settings" title="Settings" className="h-9 w-9 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <Link href="/settings" aria-label="Settings" data-testid="button-profile-settings"><Settings className="h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      <div className="mt-3 flex shrink-0 justify-center gap-3">
        <Button asChild size="sm" className="h-10 border border-orange-400/80 bg-[#11100f] px-4 text-xs font-extrabold text-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.18)] hover:bg-[#1b1510] hover:text-white" data-testid="button-edit-profile">
          <Link href="/profile/edit?returnTo=%2Fprofile"><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit Profile</Link>
        </Button>
        <Button type="button" size="sm" onClick={() => openProOffer()} className="h-10 rounded-full border border-orange-200/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-4 text-xs font-black text-zinc-950 shadow-[0_0_16px_rgba(249,115,22,0.28)] hover:brightness-110" data-testid="button-playr1-pro">
          <Crown className="mr-1.5 h-3.5 w-3.5" />PLAYR1 Pro
        </Button>
      </div>

      <section className="flex min-h-0 flex-1 flex-col items-center pt-2" aria-label="Player profile">
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <div className="flex h-[347px] w-[327px] shrink-0 items-center justify-center min-[390px]:h-[361px] min-[390px]:w-[340px]">
            <div className="scale-[1.02] min-[390px]:scale-[1.06]">
              <BaseballCard
                profile={career || { cardPhotoUrl: null, jerseyNumber: null, positions: [], teamName: null, schoolName: null }}
                playerProfile={playerProfile}
                userProfile={userProfile || { profileImageUrl: user?.profileImageUrl }}
                userName={displayName}
                rootRef={cardRef}
                onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/career"] })}
              />
            </div>
          </div>
        </div>
        <div className="grid w-full max-w-md shrink-0 grid-cols-2 gap-3 pb-1 pt-2">
          <Button asChild variant="outline" className="h-12 rounded-full border border-orange-400/35 bg-zinc-950 px-3 text-sm font-bold text-orange-100 shadow-[0_0_18px_rgba(249,115,22,0.16)] hover:border-orange-300/70 hover:bg-zinc-900 hover:shadow-[0_0_24px_rgba(249,115,22,0.28)]" data-testid="button-open-career-stats">
            <Link href="/career-stats" className="flex items-center justify-center gap-2"><Trophy className="h-4 w-4 text-orange-300" />Career Stats</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full border border-amber-300/50 bg-[radial-gradient(ellipse_at_top,rgba(245,190,65,0.16),transparent_75%),#17140e] px-3 text-sm font-bold text-amber-100 shadow-[0_0_18px_rgba(245,190,65,0.18)] hover:border-amber-200 hover:bg-[#201a0e]" data-testid="button-open-trophy-room">
            <Link href="/trophy-room" className="flex items-center justify-center gap-2"><Trophy className="h-4 w-4 text-amber-300" />Trophy Room</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}