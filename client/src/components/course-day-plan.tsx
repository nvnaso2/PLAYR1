import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Clock, Dumbbell, Lock, Play, Video } from "lucide-react";
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
    <div className="space-y-4" data-testid="course-day-plan">
      {Array.from({ length: totalDays }, (_, index) => index + 1).map((day) => {
        const dayItems = (byDay.get(day) ?? []).sort((a, b) => a.orderInDay - b.orderInDay);
        const lesson = dayItems.find((item) => item.itemType === "watch");
        const workout = dayItems.find((item) => item.itemType === "workout" || item.itemType === "drill" || item.itemType === "challenge");
        const complete = dayItems.length > 0 && dayItems.every((item) => completedItemIds.has(item.id));
        const isCurrent = currentDay === day;
        const thumbnail = getYouTubeThumbnail(lesson?.watchUrl);
        const minutes = dayItems.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0);

        return (
          <Card key={day} className={`overflow-hidden transition-all ${isCurrent ? "ring-2 ring-offset-2 ring-offset-background" : "border-border/70"}`} style={isCurrent ? { "--tw-ring-color": `${accent}99` } as any : undefined} data-testid={`course-day-${day}`}>
            <div className="grid grid-cols-[68px_1fr] md:grid-cols-[84px_1fr]">
              <div className="flex flex-col items-center justify-center gap-1 border-r border-border/60 p-3 text-center" style={{ background: complete || isCurrent ? `${accent}18` : "hsl(var(--muted) / 0.25)" }}>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Day</span>
                <span className="text-3xl font-black leading-none" style={{ color: complete || isCurrent ? accent : undefined }}>{day}</span>
                {complete ? <CheckCircle2 className="mt-2 h-4 w-4" style={{ color: accent }} /> : isCurrent ? <Badge className="mt-2 px-1.5 text-[10px]" style={{ background: accent }}>Today</Badge> : null}
              </div>
              <div className="min-w-0 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Day {day}</p>
                    <h3 className="mt-1 truncate text-lg font-bold">{lesson?.title ?? workout?.title ?? "Course session"}</h3>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {minutes} min</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(200px,0.8fr)]">
                  <Link href={`/courses/${courseSlug}/today?day=${day}`} className="group relative block overflow-hidden rounded-xl border border-border/70 bg-zinc-950" data-testid={`link-course-day-${day}`}>
                    <div className="aspect-[16/8] relative overflow-hidden">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-90" />
                      ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}bb, #111827 78%)` }}>
                          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "14px 14px" }} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-xl transition-transform group-hover:scale-110">
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-semibold text-white">
                        <Video className="h-3.5 w-3.5" /> {lesson ? "Lesson video" : "Open day"}
                      </div>
                    </div>
                  </Link>

                  <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        <Dumbbell className="h-3.5 w-3.5" style={{ color: accent }} /> Workout
                      </div>
                      <h4 className="mt-2 font-semibold leading-snug">{workout?.title ?? "Training session"}</h4>
                      {workout?.notes && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{workout.notes}</p>}
                    </div>
                    <Link href={`/courses/${courseSlug}/today?day=${day}`} className="mt-4 inline-flex items-center justify-between gap-2 text-sm font-semibold" style={{ color: accent }}>
                      <span>{complete ? "Review day" : "Open workout"}</span><ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>

                {lesson?.notes && (
                  <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} /> {lesson.notes}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}