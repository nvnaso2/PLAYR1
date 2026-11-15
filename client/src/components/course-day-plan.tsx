import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { CalendarDays, CheckCircle2, Dumbbell, LockKeyhole, Play } from "lucide-react";
import type { ProgramItem } from "@shared/schema";

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
}) {
  const dayCount = Math.max(0, totalDays);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, index) => index + 1), [dayCount]);
  const [selectedDay, setSelectedDay] = useState(() => currentDay && currentDay >= 1 && currentDay <= dayCount ? currentDay : 1);
  const [videoStarted, setVideoStarted] = useState(false);
  const touchStartX = useRef<number | null>(null);

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

  const moveDay = (offset: number) => setSelectedDay((day) => Math.min(dayCount, Math.max(1, day + offset)));

  return (
    <section className="space-y-4" data-testid="course-day-plan" aria-label="Course day plan">
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
        className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
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
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden bg-black">
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

            <div className="flex flex-wrap items-center gap-2">
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
              <Link
                href={`/courses/${courseSlug}/today?day=${selectedDay}`}
                className="flex min-h-[124px] items-center gap-3 overflow-hidden rounded-xl border border-zinc-300 bg-[#f6f6f4] p-3 text-left text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5"
                data-testid={`link-course-workout-${selectedDay}`}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start justify-center pl-1">
                  <span className="font-heading text-xl font-black uppercase leading-tight sm:text-2xl">{workout.title}</span>
                  <span className="mt-1 text-xs font-semibold text-zinc-600">
                    Day {selectedDay} workout{workout.estimatedMinutes ? ` · ${workout.estimatedMinutes} min` : ""}
                  </span>
                  <span className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-md bg-zinc-950 px-3 text-[10px] font-black uppercase text-white">
                    <Dumbbell className="h-3.5 w-3.5" /> Open workout
                  </span>
                </span>
                {courseCoverImageUrl && <img src={courseCoverImageUrl} alt="" className="h-[100px] w-[34%] shrink-0 rounded-lg object-cover" />}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
