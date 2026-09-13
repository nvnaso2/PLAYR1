import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Play, Video } from "lucide-react";
import type { ProgramItem } from "@shared/schema";

function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("youtube.com") && !parsed.hostname.includes("youtu.be")) return null;
    const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
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
}: {
  items: ProgramItem[];
  totalDays: number;
  currentDay?: number | null;
  completedItemIds: Set<string>;
  accent: string;
  courseSlug: string;
}) {
  const byDay = new Map<number, ProgramItem[]>();
  items.forEach((item) => byDay.set(item.dayNumber, [...(byDay.get(item.dayNumber) ?? []), item]));

  return (
    <div className="space-y-2" data-testid="course-day-plan">
      {Array.from({ length: totalDays }, (_, index) => index + 1).map((day) => {
        const dayItems = (byDay.get(day) ?? []).sort((a, b) => a.orderInDay - b.orderInDay);
        const lesson = dayItems.find((item) => item.itemType === "watch");
        const workout = dayItems.find((item) => item.itemType === "workout" || item.itemType === "drill" || item.itemType === "challenge");
        const complete = dayItems.length > 0 && dayItems.every((item) => completedItemIds.has(item.id));
        const isCurrent = currentDay === day;
        const thumbnail = getYouTubeThumbnail(lesson?.watchUrl);
        const minutes = dayItems.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0);

        return (
          <div
            key={day}
            className={`group flex items-center gap-2 rounded-xl border p-2 transition-colors sm:gap-3 sm:p-3 ${
              isCurrent ? "border-primary/60 bg-primary/[0.04]" : "border-border/70 bg-card hover:border-border"
            }`}
            data-testid={`course-day-${day}`}
          >
            <div className="flex w-10 shrink-0 flex-col items-center justify-center text-center sm:w-12">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Day</span>
              <span className="text-xl font-black leading-none sm:text-2xl" style={{ color: complete || isCurrent ? accent : undefined }}>
                {day}
              </span>
              {complete && <CheckCircle2 className="mt-1 h-3.5 w-3.5" style={{ color: accent }} />}
            </div>

            <Link
              href={`/courses/${courseSlug}/today?day=${day}`}
              className="relative block w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-950 sm:w-40"
              data-testid={`link-course-day-${day}`}
            >
              <div className="relative aspect-video">
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100" />
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}bb, #111827 78%)` }}>
                    <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "14px 14px" }} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/25" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg transition-transform group-hover:scale-110">
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  </span>
                </span>
              </div>
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">Day {day}</p>
              <h3 className="truncate text-sm font-bold sm:text-base">{lesson?.title ?? workout?.title ?? "Course session"}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Video className="h-3.5 w-3.5" /> {minutes} min {complete ? "· Complete" : ""}
              </p>
            </div>

            <Link href={`/courses/${courseSlug}/today?day=${day}`} className="shrink-0">
              <Button
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className="px-2.5 text-xs sm:px-3"
                style={isCurrent ? { background: accent, color: "white" } : undefined}
              >
                Open workout
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}