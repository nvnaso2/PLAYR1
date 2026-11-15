import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { CalendarDays, CheckCircle2, Dumbbell, LockKeyhole, Play, Target } from "lucide-react";
import type { Drill, ProgramItem } from "@shared/schema";
import { DrillDiagramPreview } from "@/components/drill-diagram-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatWorkoutDescription } from "@/lib/workout-description";

function getYouTubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("youtube.com") && !parsed.hostname.includes("youtu.be")) return null;
    const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function CourseDayPlan({
  items,
  totalDays,
  currentDay,
  completedItemIds,
  accent,
  courseSlug,
  lockedDays,
  trainingDaysPerWeek = 3,
  scheduleStartDate,
  onUpgrade,
  courseCoverImageUrl,
  drills,
  enrollmentId,
}: {
  items: ProgramItem[];
  totalDays: number;
  currentDay?: number | null;
  completedItemIds: Set<string>;
  accent: string;
  courseSlug: string;
  lockedDays?: Set<number>;
  trainingDaysPerWeek?: number;
  scheduleStartDate?: Date | string | null;
  onUpgrade?: () => void;
  courseCoverImageUrl?: string | null;
  drills: Drill[];
  enrollmentId?: string | null;
}) {
  const dayCount = Math.max(0, totalDays);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, index) => index + 1), [dayCount]);
  const [selectedDay, setSelectedDay] = useState(() => currentDay && currentDay >= 1 && currentDay <= dayCount ? currentDay : 1);
  const [videoStarted, setVideoStarted] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => setSelectedDay((day) => Math.min(Math.max(day, 1), Math.max(dayCount, 1))), [dayCount]);
  useEffect(() => setVideoStarted(false), [selectedDay]);

  const byDay = useMemo(() => {
    const grouped = new Map<number, ProgramItem[]>();
    items.forEach((item) => grouped.set(item.dayNumber, [...(grouped.get(item.dayNumber) ?? []), item]));
    grouped.forEach((dayItems, day) => grouped.set(day, dayItems.sort((a, b) => a.orderInDay - b.orderInDay)));
    return grouped;
  }, [items]);

  const dayItems = byDay.get(selectedDay) ?? [];
  const isLocked = lockedDays?.has(selectedDay) ?? false;
  const lesson = isLocked ? undefined : dayItems.find((item) => item.itemType === "watch");
  const workout = isLocked ? undefined : dayItems.find((item) => ["workout", "drill", "challenge"].includes(item.itemType));
  const complete = !isLocked && dayItems.length > 0 && dayItems.every((item) => completedItemIds.has(item.id));
  const isCurrent = currentDay === selectedDay;
  const videoUrl = getYouTubeEmbed(lesson?.watchUrl);
  const scheduledDate = scheduleStartDate
    ? new Date(new Date(scheduleStartDate).getTime() + Math.floor((selectedDay - 1) * 7 / Math.max(1, trainingDaysPerWeek)) * 86400000)
    : null;
  const drillsById = useMemo(() => new Map(drills.map((drill) => [drill.id, drill])), [drills]);
  const workoutSpec = workout?.workoutSpec ?? [];
  const availableDrillIds = workoutSpec.flatMap((entry) => entry.drillId ? [entry.drillId] : []);
  const missingLibraryDrillCount = workoutSpec.filter((entry) => !entry.drillId).length;
  const workoutTotal = workoutSpec.reduce((total, entry) => total + (entry.reps ?? 0), 0);
  const logWorkout = () => {
    if (!workout || availableDrillIds.length === 0) return;
    const params = new URLSearchParams({ startDrills: availableDrillIds.join(","), programItemId: workout.id });
    if (enrollmentId) params.set("enrollmentId", enrollmentId);
    setWorkoutOpen(false);
    setLocation(`/log?${params.toString()}`);
  };

  const moveDay = (offset: number) => setSelectedDay((day) => Math.min(dayCount, Math.max(1, day + offset)));

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" data-testid="course-day-plan" aria-label="Course day plan">
      <nav aria-label="Choose a course day" className="overflow-x-auto border-y border-white/20 [scrollbar-width:thin]">
        <ol className="flex min-w-max">
          {days.map((day) => {
            const dayItems = byDay.get(day) ?? [];
            const locked = lockedDays?.has(day) ?? false;
            const isComplete = !locked && dayItems.length > 0 && dayItems.every((item) => completedItemIds.has(item.id));
            const active = day === selectedDay;
            return (
              <li key={day} className="flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-label={`Day ${day}${locked ? ", locked" : ""}${isComplete ? ", completed" : ""}`}
                  aria-current={active ? "step" : undefined}
                  className={`relative flex min-h-12 w-full min-w-[2.4rem] items-center justify-center gap-1.5 border-r border-white/15 px-2 text-xs font-bold transition last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                    active ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                  style={active ? { backgroundColor: `${accent}22` } : undefined}
                  data-testid={`button-course-day-${day}`}
                >
                  <span>{day}</span>
                  {locked ? <LockKeyhole className="h-3 w-3" /> : isComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : null}
                  {active && <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: accent }} />}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div
        className="min-h-0 flex-1 touch-pan-y overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
        role="region"
        aria-label={`Day ${selectedDay} session. Use left and right arrow keys to browse days.`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); moveDay(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); moveDay(1); }
        }}
        onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          const endX = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (startX !== null && endX !== undefined && Math.abs(endX - startX) > 48) moveDay(endX < startX ? 1 : -1);
        }}
      >
        {isLocked ? (
          <div className="flex flex-col items-center py-10 text-center">
            <LockKeyhole className="h-8 w-8 text-amber-300" />
            <h2 className="mt-3 text-lg font-bold">Day {selectedDay} is for PLAYR1 Pro</h2>
            <p className="mt-1 text-sm text-muted-foreground">Day 1 is free to try. Unlock the rest of this course with Pro.</p>
            {onUpgrade && <button type="button" onClick={onUpgrade} className="mt-3 font-bold text-orange-400 underline-offset-4 hover:underline">View Pro options</button>}
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="relative aspect-video max-h-[27dvh] w-full shrink-0 overflow-hidden bg-black">
              {videoUrl && videoStarted ? (
                <iframe
                  src={videoUrl}
                  title={lesson?.title ?? `Day ${selectedDay} lesson`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : lesson?.watchUrl && !videoUrl ? (
                <video src={lesson.watchUrl} controls preload="metadata" poster={courseCoverImageUrl ?? undefined} className="h-full w-full object-contain" aria-label={lesson.title} />
              ) : (
                <button
                  type="button"
                  onClick={() => videoUrl && setVideoStarted(true)}
                  disabled={!videoUrl}
                  className="group absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-default"
                  aria-label={videoUrl ? `Play Day ${selectedDay} lesson` : `Day ${selectedDay} lesson preview`}
                >
                  {courseCoverImageUrl ? (
                    <img src={courseCoverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}99, #111 80%)` }} />
                  )}
                  <span className="absolute inset-0 bg-black/35" />
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-xl transition group-hover:scale-105">
                    <Play className="ml-0.5 h-6 w-6 fill-current" />
                  </span>
                </button>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-black uppercase sm:text-2xl">{lesson?.title ?? `Day ${selectedDay}`}</h2>
              {isCurrent && <span className="text-xs font-bold uppercase tracking-wide text-orange-400">Current day</span>}
              {complete && <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">Complete</span>}
              {scheduledDate && !Number.isNaN(scheduledDate.getTime()) && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {scheduledDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            {workout && (
              <button
                type="button"
                onClick={() => setWorkoutOpen(true)}
                className="flex min-h-[88px] w-full shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-zinc-300 bg-[#f6f6f4] p-2 text-left text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5"
                data-testid={`button-course-workout-${selectedDay}`}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start justify-center pl-1">
                  <span className="font-heading text-xl font-black uppercase leading-tight sm:text-2xl">{workout.title}</span>
                  <span className="mt-1 text-xs font-semibold text-zinc-600">
                    Day {selectedDay} workout{workout.estimatedMinutes ? ` · ${workout.estimatedMinutes} min` : ""}
                  </span>
                  <span className="mt-2 inline-flex min-h-7 items-center gap-2 rounded-md bg-zinc-950 px-3 text-[10px] font-black uppercase text-white">
                    <Dumbbell className="h-3.5 w-3.5" /> Preview workout
                  </span>
                </span>
                {courseCoverImageUrl && <img src={courseCoverImageUrl} alt="" className="h-[72px] w-[30%] shrink-0 rounded-lg object-cover" />}
              </button>
            )}
          </div>
        )}
      </div>
      <Dialog open={workoutOpen} onOpenChange={setWorkoutOpen}>
        <DialogContent className="flex h-[min(88dvh,920px)] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem)] w-[calc(100%-1rem)] max-w-xl flex-col overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-zinc-950 shadow-none [&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:border [&>button]:border-zinc-300 [&>button]:bg-white [&>button]:opacity-100">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] text-zinc-950 shadow-2xl">
            <header className="shrink-0 bg-white px-5 pb-4 pt-6 sm:px-8">
              <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Mechanical Foundation</p>
              <DialogTitle className="max-w-[84%] font-heading text-4xl font-black uppercase leading-[.95] tracking-[-.04em] text-black sm:text-5xl">
                Workout <span className="text-orange-600">#{selectedDay}</span>
              </DialogTitle>
              <div className="mt-3 h-1 bg-black" />
              <DialogDescription className="mx-auto mt-3 max-w-md text-center font-heading text-base font-black uppercase leading-tight text-zinc-900 sm:text-lg">
                {workout?.title}
              </DialogDescription>
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
              {workoutSpec.map((entry, index) => {
                const drill = entry.drillId ? drillsById.get(entry.drillId) : undefined;
                const displayTitle = drill?.title ?? entry.title ?? `Drill ${index + 1}`;
                return (
                  <article key={`${entry.drillId ?? displayTitle}-${index}`} className="grid grid-cols-[minmax(96px,34%)_1fr] gap-3 overflow-hidden rounded-xl bg-white p-3 shadow-md sm:grid-cols-[150px_1fr] sm:gap-5 sm:p-4">
                    <figure className="flex aspect-[1.08/1] items-center justify-center overflow-hidden">
                      {drill?.diagramData ? <DrillDiagramPreview diagramData={drill.diagramData} className="h-full w-full" /> : drill?.thumbnailUrl ? (
                        <img src={drill.thumbnailUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#f7f6f2] text-orange-600"><Target className="h-8 w-8" /></div>
                      )}
                    </figure>
                    <div className="flex min-w-0 flex-col justify-center">
                      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-orange-600">Drill #{index + 1}</p>
                      <h3 className="font-heading text-lg font-black uppercase leading-tight sm:text-xl">{displayTitle}</h3>
                      <p className="mt-1 text-xs leading-snug text-zinc-700 sm:text-sm">
                        {formatWorkoutDescription(drill?.description ?? entry.notes ?? "") || "Follow the listed reps and focus on controlled, game-ready technique."}
                      </p>
                      <p className="mt-2 font-heading text-sm font-black uppercase sm:text-base">
                        Total — {entry.reps !== undefined ? `${entry.reps} ${/dribble|pound|cross|between|behind|tween|hang|crossover|in-out/i.test(displayTitle) ? "reps" : "shots"}` : "See instructions"}
                      </p>
                      {!drill && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Drill not in library yet</p>}
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 bg-zinc-950 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+.75rem)] text-white sm:p-4">
              <div className="min-w-0">
                <p className="font-heading text-sm font-black uppercase sm:text-base">
                  {workoutTotal ? `${workoutTotal} reps · ` : ""}{workoutSpec.length} drills
                </p>
                {missingLibraryDrillCount > 0 && (
                  <p className="mt-1 text-[10px] font-semibold leading-tight text-orange-200">
                    {missingLibraryDrillCount} drills still need to be added; only linked drills can be logged.
                  </p>
                )}
              </div>
              <Button type="button" onClick={logWorkout} disabled={!availableDrillIds.length} className="h-12 shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 font-black text-black shadow-[0_0_20px_rgba(249,115,22,.45)] disabled:opacity-50">
                {availableDrillIds.length ? "Log Workout" : "Add drills to log"}
              </Button>
            </footer>
          </section>
        </DialogContent>
      </Dialog>
    </section>
  );
}
