import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, CheckCircle2, Clock, Dumbbell, Lock, PlayCircle, Target, Video } from "lucide-react";
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
        const takeaways = Array.from(new Set(dayItems.flatMap((item) => item.keyTakeaways ?? [])));
        const complete = dayItems.length > 0 && dayItems.every((item) => completedItemIds.has(item.id));
        const isCurrent = currentDay === day;
        const embedUrl = getYouTubeEmbed(lesson?.watchUrl);

        return (
          <Card key={day} className="overflow-hidden" style={isCurrent ? { boxShadow: `0 0 0 2px ${accent}88` } : undefined} data-testid={`course-day-${day}`}>
            <div className="flex items-stretch">
              <div className="w-20 md:w-24 shrink-0 flex flex-col items-center justify-center p-3 text-center" style={{ background: complete || isCurrent ? `${accent}22` : "hsl(var(--muted) / 0.35)" }}>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Day</span>
                <span className="text-3xl font-black" style={{ color: complete || isCurrent ? accent : undefined }}>{day}</span>
                {complete ? <CheckCircle2 className="w-4 h-4 mt-2" style={{ color: accent }} /> : isCurrent ? <Badge className="mt-2 text-[10px] px-1.5" style={{ background: accent }}>Today</Badge> : null}
              </div>
              <CardContent className="p-4 md:p-5 flex-1 min-w-0 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Day {day} lesson</p>
                    <h3 className="text-lg font-bold mt-1">{lesson?.title ?? workout?.title ?? "Course session"}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Clock className="w-3.5 h-3.5" /> {dayItems.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0)} min</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {lesson && (
                    <div className="rounded-xl border bg-muted/20 overflow-hidden">
                      <div className="p-3 flex items-center gap-2 text-sm font-semibold"><Video className="w-4 h-4" style={{ color: accent }} /> Video lesson</div>
                      {embedUrl ? (
                        <div className="aspect-video bg-black"><iframe src={embedUrl} title={lesson.title} className="w-full h-full" allowFullScreen /></div>
                      ) : lesson.watchUrl ? (
                        <a href={lesson.watchUrl} target="_blank" rel="noopener noreferrer" className="block p-4 text-sm underline">Open lesson video</a>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Lock className="w-4 h-4" /> Video attachment coming soon</div>
                      )}
                      {lesson.notes && <p className="p-3 text-sm text-muted-foreground leading-relaxed">{lesson.notes}</p>}
                    </div>
                  )}
                  {workout && (
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold"><Dumbbell className="w-4 h-4" style={{ color: accent }} /> Workout assignment</div>
                      <h4 className="font-semibold mt-3">{workout.title}</h4>
                      {workout.notes && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{workout.notes}</p>}
                      <Link href={`/courses/${courseSlug}/today`} className="inline-flex items-center gap-1.5 text-sm font-semibold mt-4 hover:underline" style={{ color: accent }}>
                        <PlayCircle className="w-4 h-4" /> Open course day
                      </Link>
                    </div>
                  )}
                </div>

                {takeaways.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: `${accent}12`, border: `1px solid ${accent}33` }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}><Target className="w-4 h-4" /> Key takeaways</div>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {takeaways.map((takeaway) => <li key={takeaway} className="flex gap-2"><span style={{ color: accent }}>•</span><span>{takeaway}</span></li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>
  );
}