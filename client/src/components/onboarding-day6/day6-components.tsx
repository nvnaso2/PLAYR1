import { BarChart3, BookOpen, Trophy } from "lucide-react";
import { BaseballCard } from "@/pages/career";
import type { DayFiveProfileDraft } from "@/components/onboarding-day5/day5-components";

export function DaySixHubActionSurface({
  profile,
  career,
  careerStats,
  playerProfile,
  userProfile,
  onProfileChange,
  onCareerStats,
  onTrophyRoom,
  onWorkoutLibrary,
}: {
  profile: DayFiveProfileDraft;
  career?: any;
  careerStats?: any;
  playerProfile?: any;
  userProfile?: any;
  onProfileChange: (draft: DayFiveProfileDraft) => void;
  onCareerStats: () => void;
  onTrophyRoom: () => void;
  onWorkoutLibrary: () => void;
}) {
  const cardCareer = {
    ...(career || {}),
    jerseyNumber: profile.jerseyNumber ? Number(profile.jerseyNumber) : career?.jerseyNumber ?? null,
    schoolName: profile.schoolName || career?.schoolName || null,
    cardPhotoUrl: career?.cardPhotoUrl || null,
  };
  const cardUserProfile = {
    ...(userProfile || {}),
    displayName: profile.displayName || userProfile?.displayName || "Player",
    city: profile.city || userProfile?.city || null,
    state: profile.state || userProfile?.state || null,
    country: profile.country || userProfile?.country || null,
  };
  const cardPlayerProfile = {
    ...(playerProfile || {}),
    headline: profile.headline,
    bio: profile.bio,
    heightFeet: profile.heightFeet ? Number(profile.heightFeet) : null,
    heightInches: profile.heightInches ? Number(profile.heightInches) : null,
    weight: profile.weight ? Number(profile.weight) : null,
    wingspan: profile.wingspan,
    schoolName: profile.schoolName,
    gradeLevel: profile.gradeLevel,
    gradYear: profile.gradYear ? Number(profile.gradYear) : null,
    gpa: profile.gpa,
    cardCareerStats: profile.cardCareerStats,
  };

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-3 pb-1 text-white" data-testid="card-day-six-hub">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="origin-center scale-[0.78]">
          <BaseballCard
            profile={cardCareer}
            careerStats={careerStats}
            playerProfile={cardPlayerProfile}
            userProfile={cardUserProfile}
            userName={cardUserProfile.displayName}
            previewOnly
            previewPhotoUrl={profile.profilePhotoDataUrl}
            onPreviewPhotoChange={(profilePhotoDataUrl) => {
              const next = { ...profile, profilePhotoDataUrl };
              sessionStorage.setItem("playr1-onboarding-day5-profile", JSON.stringify(next));
              onProfileChange(next);
            }}
          />
        </div>
      </div>

      <div className="flex shrink-0 justify-center gap-2">
        <button type="button" onClick={onCareerStats} className="inline-flex h-10 items-center gap-2 rounded-full border border-orange-400/35 bg-zinc-950 px-4 text-xs font-bold text-orange-100 shadow-[0_0_18px_rgba(249,115,22,0.16)]">
          <BarChart3 className="h-4 w-4 text-orange-300" />Career Stats
        </button>
        <button type="button" onClick={onTrophyRoom} className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-300/50 bg-[#17140e] px-4 text-xs font-bold text-amber-100 shadow-[0_0_18px_rgba(245,190,65,0.18)]">
          <Trophy className="h-4 w-4 text-amber-300" />Trophy Room
        </button>
      </div>

      <button type="button" onClick={onWorkoutLibrary} className="flex h-[150px] shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-zinc-300 bg-[#f6f6f4] p-4 text-left text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5" data-testid="button-day-six-workout-library">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <BookOpen className="h-6 w-6 text-orange-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-2xl font-black uppercase leading-none">Workout Library</span>
          <span className="mt-1 block text-xs font-semibold text-zinc-600">Browse drills and build your next workout.</span>
          <span className="mt-3 inline-flex min-h-8 items-center rounded-md bg-black px-3 text-[10px] font-black uppercase text-white">Explore workouts</span>
        </span>
      </button>
    </section>
  );
}
