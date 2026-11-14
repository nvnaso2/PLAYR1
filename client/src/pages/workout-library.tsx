import { useLocation } from "wouter";
import { ArrowUpRight, Dumbbell } from "lucide-react";
import workoutOneCover from "@/assets/onboarding-workout-covers/workout-1-cover.png";
import workoutTwoCover from "@/assets/onboarding-workout-covers/workout-2-cover.png";
import workoutThreeCover from "@/assets/onboarding-workout-covers/workout-3-cover.png";
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
    <section className="min-h-full bg-[#10100f] px-4 pb-10 pt-7 text-[#f4f0e8] sm:px-7 sm:pt-10 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#393733] pb-6 sm:mb-9 sm:pb-8">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#ef6b3d]">
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
            <span>Training plans</span>
          </div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                Workout library
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#aaa59d] sm:text-base">
                Three focused sessions to take from the page to the court.
              </p>
            </div>
            <p className="shrink-0 font-mono text-xs tracking-[0.12em] text-[#827d75]">
              03 WORKOUTS
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {workouts.map((workout, index) => (
            <button
              key={workout.id}
              type="button"
              onClick={() => navigate(`/log?workoutId=${encodeURIComponent(workout.id)}`)}
              aria-label={`Start ${workout.name}, ${workout.detail}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-[#373430] bg-[#1a1917] text-left shadow-[0_16px_40px_rgba(0,0,0,0.16)] transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-[#ef6b3d]/70 hover:bg-[#201e1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a5f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10100f]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="relative w-full overflow-hidden bg-[#e9e7e2]">
                <div className="aspect-[4/5] w-full">
                  <img
                    src={workout.cover}
                    alt={workout.alt}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="absolute left-3 top-3 rounded-full border border-black/10 bg-[#171615]/90 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-[#f7f2e9]">
                  WORKOUT #{workout.number}
                </span>
                <span aria-hidden="true" className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#ef6b3d] text-[#1b1512] shadow-lg transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ef8059]">
                  {workout.detail}
                </p>
                <h2 className="font-display text-xl font-bold leading-tight tracking-[-0.02em] text-[#f5f1e9] sm:text-[1.35rem]">
                  {workout.name}
                </h2>
                <div className="mt-4 flex items-center justify-between border-t border-[#393733] pt-3 text-xs text-[#aaa59d]">
                  <span>{workout.focus}</span>
                  <span className="font-semibold text-[#f0a084]">Start</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
