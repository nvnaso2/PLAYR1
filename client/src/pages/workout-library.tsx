import { useLocation } from "wouter";
import { Play } from "lucide-react";
import workoutOneCover from "@/assets/onboarding-workout-covers/workout-1-cover-cropped.png";
import workoutTwoCover from "@/assets/onboarding-workout-covers/workout-2-cover-cropped.png";
import workoutThreeCover from "@/assets/onboarding-workout-covers/workout-3-cover-cropped.png";
import { DAY_TWO_RANGE_WORKOUT_ID } from "@/lib/day-two-workout-art";
import { DAY_THREE_VOLUME_WORKOUT_ID } from "@/lib/day-three-workout-art";
import { DAY_FIVE_GAME_LIKE_WORKOUT_ID } from "@shared/onboarding-workout-ids";

const workouts = [
  {
    number: "1",
    name: "Volume Workout",
    focus: "Build your shooting rhythm",
    detail: "200-shot recommended session",
    id: DAY_THREE_VOLUME_WORKOUT_ID,
    cover: workoutOneCover,
    alt: "Workout 1 cover showing a recommended 200-shot shooting workout",
  },
  {
    number: "2",
    name: "Find Your Shooting Range",
    focus: "Find the range that feels game-ready",
    detail: "125-shot recommended session",
    id: DAY_TWO_RANGE_WORKOUT_ID,
    cover: workoutTwoCover,
    alt: "Workout 2 cover showing the Find Your Range shooting workout",
  },
  {
    number: "3",
    name: "Game-Like Reps",
    focus: "Train with pace and purpose",
    detail: "140-shot recommended session",
    id: DAY_FIVE_GAME_LIKE_WORKOUT_ID,
    cover: workoutThreeCover,
    alt: "Workout 3 cover showing a game-like shooting workout",
  },
] as const;

export default function WorkoutLibraryPage() {
  const [, navigate] = useLocation();

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6" data-testid="page-workout-library">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl" data-testid="text-page-title">Workout Library</h1>
        <span className="shrink-0 text-xs text-muted-foreground">3 workouts</span>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {workouts.map((workout) => (
            <button
              key={workout.id}
              type="button"
              onClick={() => navigate(`/log?workoutId=${encodeURIComponent(workout.id)}`)}
              aria-label={`Start ${workout.name}, ${workout.detail}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/20 border-b-2 border-b-orange-500/70 bg-black text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-white/50 hover:border-b-orange-400 hover:shadow-[0_12px_30px_rgba(255,255,255,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              data-testid={`card-workout-${workout.number}`}
            >
              <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-white">
                  <img
                    src={workout.cover}
                    alt={workout.alt}
                    className="h-full w-full object-cover"
                  />
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-transparent transition-colors group-hover:bg-black/20">
                  <span className="flex h-11 w-11 scale-90 items-center justify-center rounded-full border border-white/25 bg-zinc-950/70 text-orange-300 opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:scale-100 group-hover:border-white/60 group-hover:bg-zinc-950/90 group-hover:text-orange-400 group-hover:opacity-100">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </span>
              </div>
              <div className="flex min-h-[54px] flex-1 flex-col gap-1 bg-black p-2">
                <h2 className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">
                  {workout.name}
                </h2>
                <div className="flex items-center justify-between gap-1 text-[9px] text-zinc-400">
                  <span className="truncate">{workout.detail}</span>
                  <span className="shrink-0 text-orange-400">#{workout.number}</span>
                </div>
              </div>
            </button>
          ))}
      </div>
    </main>
  );
}
