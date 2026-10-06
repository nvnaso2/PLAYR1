import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BaseballCard } from "@/pages/career";
import type { PlayerProfile } from "@shared/schema";

type PublicCardData = {
  profile: PlayerProfile;
  user: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
  userProfile: {
    city: string | null;
    state: string | null;
  } | null;
  career: {
    positions: string[] | null;
    teamName: string | null;
    schoolName: string | null;
    gradeLevel: string | null;
    jerseyNumber: number | null;
    cardPhotoUrl: string | null;
  } | null;
  careerStats?: Record<string, number>;
};

export default function PlayerCardPublicPage() {
  const [, params] = useRoute("/player/:slug/card");
  const slug = params?.slug || "";
  const { data, isLoading, isError } = useQuery<PublicCardData>({
    queryKey: ["/api/player", slug],
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center overflow-hidden bg-black" aria-label="Loading player card">
        <Skeleton className="h-[340px] w-[240px] rounded-md bg-zinc-800" />
      </main>
    );
  }

  if (isError || !data?.profile?.isPublic || data.profile.cardShowPlayerCard === false) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black px-6 text-center text-zinc-300">
        <p role="status">This player card is not available.</p>
      </main>
    );
  }

  const displayName = [data.user?.firstName, data.user?.lastName].filter(Boolean).join(" ") || "Player";
  const showAcademics = data.profile.cardShowAcademic === true;
  const showMeasurements = data.profile.cardShowMeasurements === true;
  const showBio = data.profile.cardShowBio !== false;
  const playerProfile = {
    ...data.profile,
    headline: showBio ? data.profile.headline : null,
    bio: showBio ? data.profile.bio : null,
    heightFeet: showMeasurements ? data.profile.heightFeet : null,
    heightInches: showMeasurements ? data.profile.heightInches : null,
    weight: showMeasurements ? data.profile.weight : null,
    wingspan: showMeasurements ? data.profile.wingspan : null,
    schoolName: showAcademics ? data.profile.schoolName : null,
    gradYear: showAcademics ? data.profile.gradYear : null,
    gpa: showAcademics ? data.profile.gpa : null,
  };
  const career = {
    positions: data.career?.positions || [],
    teamName: data.career?.teamName || null,
    schoolName: showAcademics ? data.career?.schoolName || null : null,
    jerseyNumber: data.career?.jerseyNumber ?? null,
    cardPhotoUrl: data.career?.cardPhotoUrl || null,
  };
  const userProfile = {
    displayName,
    profileImageUrl: data.user?.profileImageUrl || null,
    city: data.userProfile?.city || null,
    state: data.userProfile?.state || null,
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center overflow-hidden bg-black px-4" data-testid="public-player-card">
      <BaseballCard
        profile={career as any}
        careerStats={data.careerStats as any}
        playerProfile={playerProfile}
        userProfile={userProfile}
        userName={displayName}
        hidePhotoUpload
      />
    </main>
  );
}
