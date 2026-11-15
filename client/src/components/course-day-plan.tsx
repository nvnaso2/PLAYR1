import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CalendarDays,
  Dumbbell,
  LockKeyhole,
  Play,
  Video,
} from "lucide-react";
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
}: {
  items: ProgramItem[];
  totalDays: number;
  currentDay?: number | null;
  completedItemIds: Set<string>;
  accent: string;
  courseSlug: string;
  /** Day numbers that are access-restricted. Their item details are never rendered. */
  lockedDays?: Set<number>;
  trainingDaysPerWeek?: number;
  scheduleStartDate?: Date | string | null;
  onUpgrade?: () => void;
}) {
  const dayCount = Math.max(0, totalDays);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, index) => index + 1), [dayCount]);
  const [selectedDay, setSelectedDay] = useState(() =>
    currentDay && currentDay >= 1 && currentDay <= dayCount ? currentDay : 1,
  );
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setSelectedDay((day) => Math.min(Math.max(day, 1), Math.max(dayCount, 1)));
  }, [dayCount]);

  const byDay = useMemo(() => {
    const grouped = new Map<number, ProgramItem[]>();
    items.forEach((item) => grouped.set(item.dayNumber, [...(grouped.get(item.dayNumber) ?? []), item]));
    grouped.forEach((dayItems, day) => grouped.set(day, dayItems.sort((a, b) => a.orderInDay - b.orderInDay)));
    return grouped;
  }, [items]);

  const dayItems = byDay.get(selectedDay) ?? [];
  const isLocked = lockedDays?.has(selectedDay) ?? false;
  const lesson = isLocked ? undefined : dayItems.find((item) => item.itemType === "watch");
  const workout = isLocked
    ? undefined
    : dayItems.find((item) => item.itemType === "workout" || item.itemType === "drill" || item.itemType === "challenge");
  const complete = !isLocked && dayItems.length > 0 && dayItems.every((item) => completedItemIds.has(item.id));
  const isCurrent = currentDay === selectedDay;
  const minutes = isLocked ? 0 : dayItems.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0);
  const embedUrl = getYouTubeEmbed(lesson?.watchUrl);
  const dayHref = `/courses/${courseSlug}/today?day=${selectedDay}`;
  const scheduledDate = scheduleStartDate
    ? new Date(new Date(scheduleStartDate).getTime() + Math.floor((selectedDay - 1) * 7 / Math.max(1, trainingDaysPerWeek)) * 86400000)
    : null;

  const moveDay = (offset: number) => {
    setSelectedDay((day) => Math.min(dayCount, Math.max(1, day + offset)));
  };

  return (
    <section className="space-y-4" data-testid="course-day-plan" aria-label="Course day plan">
      <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#12171d] shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Your course</p>
            <h2 className="mt-0.5 text-sm font-bold text-white sm:text-base">Day {selectedDay} <span className="font-medium text-white/40">/ {dayCount}</span></h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => moveDay(-1)}
              disabled={selectedDay <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12171d] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous course day"
              data-testid="button-course-day-previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveDay(1)}
              disabled={selectedDay >= dayCount}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12171d] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next course day"
              data-testid="button-course-day-next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav aria-label="Choose a course day" className="overflow-x-auto border-b border-white/[0.07] px-3 py-3 [scrollbar-width:thin] sm:px-4">
          <ol className="flex min-w-max items-center gap-1.5">
            {days.map((day) => {
              const dayItemsForStrip = byDay.get(day) ?? [];
              const dayIsLocked = lockedDays?.has(day) ?? false;
              const dayIsComplete =
                !dayIsLocked &&
                dayItemsForStrip.length > 0 &&
                dayItemsForStrip.every((item) => completedItemIds.has(item.id));
              const dayIsCurrent = currentDay === day;
              const selected = selectedDay === day;

              return (
                <li key={day}>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    aria-label={`Day ${day}${dayIsCurrent ? ", current day" : ""}${dayIsComplete ? ", completed" : ""}${dayIsLocked ? ", locked" : ""}`}
                    aria-current={selected ? "step" : undefined}
                    aria-pressed={selected}
                    className={`relative flex h-12 min-w-[2.7rem] flex-col items-center justify-center rounded-xl border px-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12171d] ${
                      selected
                        ? "border-transparent text-white shadow-[0_5px_18px_rgba(0,0,0,0.25)]"
                        : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                    }`}
                    style={{
                      ...(selected ? { backgroundColor: accent } : {}),
                    }}
                    data-testid={`button-course-day-${day}`}
                  >
                    <span className="text-sm font-extrabold leading-none">{day}</span>
                    <span className="mt-1 flex h-2.5 items-center">
                      {dayIsLocked ? (
                        <LockKeyhole className="h-2.5 w-2.5" />
                      ) : dayIsComplete ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : dayIsCurrent ? (
                        <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : ""}`} style={!selected ? { background: accent } : undefined} />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div
          className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          role="region"
          aria-label={`Day ${selectedDay} session. Use left and right arrow keys to browse days.`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              moveDay(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              moveDay(1);
            }
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (startX === null || endX === undefined) return;
            const distance = endX - startX;
            if (Math.abs(distance) > 48) moveDay(distance < 0 ? 1 : -1);
          }}
          data-testid={`course-day-${selectedDay}`}
        >
          {isLocked ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center px-5 py-10 text-center sm:min-h-[290px]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">Day {selectedDay} is locked</h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/50">
                 Day 1 is free to try. Unlock the rest of the course with PLAYR1 Pro.
              </p>
              {onUpgrade && (
                <button type="button" onClick={onUpgrade} className="mt-4 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" data-testid="button-course-upgrade">
                  View Pro options
                </button>
              )}
            </div>
          ) : (
            <div className="grid min-h-[250px] md:grid-cols-[1.08fr_0.92fr]">
              <div className="relative flex min-h-[210px] items-center justify-center overflow-hidden bg-[#090c10] md:min-h-[300px]">
                {embedUrl ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={embedUrl}
                      title={lesson?.title ?? `Day ${selectedDay} lesson`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : lesson?.watchUrl ? (
                  <video
                    src={lesson.watchUrl}
                    controls
                    preload="metadata"
                    className="aspect-video w-full object-contain"
                    aria-label={lesson.title}
                  />
                ) : (
                  <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: `linear-gradient(135deg, ${accent}35, #090c10 76%)` }}>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/85">
                      {lesson ? <Play className="ml-0.5 h-5 w-5 fill-current" /> : <Video className="h-5 w-5" />}
                    </span>
                    <p className="text-sm font-semibold text-white/75">
                      {lesson ? "Video link unavailable" : "No video in this session"}
                    </p>
                  </div>
                )}
                {lesson && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/80 backdrop-blur">
                    <Video className="h-3 w-3" /> Lesson
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-6 p-4 sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>Day {selectedDay} session</span>
                    {isCurrent && (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">
                        Current day
                      </span>
                    )}
                    {complete && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Complete
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl font-extrabold leading-tight text-white sm:text-2xl">
                    {lesson?.title ?? workout?.title ?? `Day ${selectedDay}`}
                  </h3>
                  {lesson?.notes && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/55">{lesson.notes}</p>}
                </div>

                <div className="space-y-3">
                  {workout ? (
                    <div className="rounded-xl border border-white/[0.09] bg-white/[0.035] p-3.5 sm:p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ color: accent, background: `${accent}1b` }}>
                          <Dumbbell className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                              {workout.itemType === "challenge" ? "Challenge" : workout.itemType === "drill" ? "Drill" : "Workout"}
                            </span>
                            {workout.estimatedMinutes ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-white/45">
                                <Clock3 className="h-3 w-3" /> {workout.estimatedMinutes} min
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-bold leading-snug text-white">{workout.title}</p>
                          {workout.notes && <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-white/50">{workout.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-white/40">
                      No workout details for this day.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                      {minutes > 0 && <span>{minutes} min total</span>}
                      {scheduledDate && !Number.isNaN(scheduledDate.getTime()) && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {scheduledDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </span>
                    <Link
                      href={dayHref}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12171d]"
                      style={{ background: accent }}
                      aria-label={`Open course day ${selectedDay}`}
                      data-testid={`link-course-day-${selectedDay}`}
                    >
                      Open day <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground/80">
        Swipe to browse · Use arrow keys or select a day above
      </p>
    </section>
  );
}
