import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Coffee,
  Dumbbell,
  ExternalLink,
  Flame,
  PartyPopper,
  Pause,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  Video,
} from "lucide-react";
import type { Program, ProgramItem, ProgramEnrollment, ProgramItemCompletion, Event, EventStatus, Drill } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

type EventListItem = Event & { status: EventStatus; program: Program | null };

interface ProgramDetailResponse {
  program: Program;
  items: ProgramItem[];
  enrollment: ProgramEnrollment | null;
  completions: ProgramItemCompletion[];
}

const itemTypeMeta: Record<string, { label: string; Icon: any; color: string; verb: string }> = {
  drill: { label: "Drill", Icon: Target, color: "text-blue-400", verb: "Open drill" },
  workout: { label: "Workout", Icon: Dumbbell, color: "text-orange-400", verb: "View workout" },
  challenge: { label: "Challenge", Icon: Trophy, color: "text-yellow-400", verb: "Take the challenge" },
  watch: { label: "Watch", Icon: Video, color: "text-purple-400", verb: "Watch now" },
  rest: { label: "Rest", Icon: Coffee, color: "text-green-400", verb: "Mark as rested" },
};

export default function ProgramTodayPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<ProgramDetailResponse>({
    queryKey: ["/api/programs", slug],
    enabled: !!slug,
  });

  // Drill library — used to resolve titles/categories for workout breakdowns
  const { data: allDrills } = useQuery<Drill[]>({ queryKey: ["/api/drills"] });
  const drillsById = useMemo(() => {
    const m = new Map<string, Drill>();
    (allDrills ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [allDrills]);

  // If this enrollment is event-scoped, fetch published events to find the
  // matching one and surface a badge + final-challenge CTA in the hero.
  const eventId = data?.enrollment?.eventId ?? null;
  const { data: allEvents } = useQuery<EventListItem[]>({
    queryKey: ["/api/events"],
    enabled: !!eventId,
  });
  const activeEvent = useMemo(
    () => (eventId ? (allEvents ?? []).find((e) => e.id === eventId) ?? null : null),
    [allEvents, eventId],
  );

  const [viewedDay, setViewedDay] = useState<number | null>(null);

  // Default the viewed day to the user's currentDay once data lands
  useEffect(() => {
    if (data?.enrollment && viewedDay === null) {
      setViewedDay(data.enrollment.currentDay);
    }
  }, [data?.enrollment, viewedDay]);

  useEffect(() => {
    if (data?.program && data?.enrollment) {
      track("program_today_view", {
        programId: data.program.id,
        slug,
        currentDay: data.enrollment.currentDay,
      });
    }
  }, [data?.program?.id, data?.enrollment?.id, slug]);

  const completedItemIds = useMemo(
    () => new Set((data?.completions ?? []).map((c) => c.programItemId)),
    [data?.completions],
  );
  const completionByItem = useMemo(() => {
    const m = new Map<string, ProgramItemCompletion>();
    (data?.completions ?? []).forEach((c) => m.set(c.programItemId, c));
    return m;
  }, [data?.completions]);

  const completeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!data?.enrollment) throw new Error("Not enrolled");
      return await apiRequest(
        "POST",
        `/api/programs/enrollments/${data.enrollment.id}/items/${itemId}/complete`,
        {},
      );
    },
    onSuccess: (_res, itemId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hub/recommendation"] });
      track("program_item_complete", { programSlug: slug, itemId });
      toast({ title: "Nice work.", description: "Logged. Keep stacking days." });
    },
    onError: () =>
      toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" }),
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      if (!data?.enrollment) throw new Error("Not enrolled");
      return await apiRequest("POST", `/api/programs/enrollments/${data.enrollment.id}/abandon`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs/me"] });
      track("program_abandon", { slug });
      toast({ title: "Program paused", description: "You can resume any time." });
    },
    onError: () =>
      toast({ title: "Couldn't pause", description: "Please try again.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center" data-testid="state-program-error">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold">We couldn't load this program</h1>
        <p className="text-muted-foreground mt-2">It may be private or temporarily unavailable.</p>
        <Link href="/programs">
          <Button className="mt-6" data-testid="button-back-to-programs">Back to Programs</Button>
        </Link>
      </div>
    );
  }

  const { program, items, enrollment } = data;

  // Not enrolled — bounce to detail
  if (!enrollment) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold">You're not enrolled in this program yet</h1>
        <p className="text-muted-foreground mt-2">Head back to the program page to start.</p>
        <Link href={`/programs/${slug}`}>
          <Button className="mt-4">Go to program</Button>
        </Link>
      </div>
    );
  }

  const accent = program.accentColor || "#f97316";
  const totalItems = items.length;
  const completedCount = completedItemIds.size;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const programDone = enrollment.status === "completed";
  const day = viewedDay ?? enrollment.currentDay;
  const dayItems = items.filter((it) => it.dayNumber === day).sort((a, b) => a.orderInDay - b.orderInDay);
  const dayDone = dayItems.length > 0 && dayItems.every((it) => completedItemIds.has(it.id));
  const isToday = day === enrollment.currentDay;

  return (
    <div className="min-h-screen pb-12">
      {/* ─── Day Hero ─── */}
      <div
        className="relative overflow-hidden border-b border-border/40"
        style={{
          background: program.coverImageUrl
            ? `linear-gradient(115deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.2) 100%), url("${program.coverImageUrl.replace(/["\\\n\r<>]/g, "")}") center/cover no-repeat`
            : `linear-gradient(135deg, ${accent}cc 0%, ${accent}55 40%, hsl(var(--background)) 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            opacity: program.coverImageUrl ? 0.18 : 0.5,
            background: `radial-gradient(circle at 15% 0%, ${accent}aa 0%, transparent 55%), radial-gradient(circle at 85% 100%, ${accent}66 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10" data-testid="button-back-program" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" data-testid="button-abandon">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause program
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Pause this program?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your progress will be saved. You can resume anytime from the program page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep training</AlertDialogCancel>
                  <AlertDialogAction onClick={() => abandonMutation.mutate()} data-testid="button-confirm-abandon">
                    Pause program
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {activeEvent && (
            <Link href={`/events/${activeEvent.slug}`}>
              <Badge
                className="mb-3 cursor-pointer text-white border-white/30 hover:bg-white/15"
                style={{ background: `${activeEvent.accentColor || "#f97316"}55` }}
                data-testid="badge-active-event"
              >
                <Trophy className="w-3.5 h-3.5 mr-1" /> Event: {activeEvent.title}
              </Badge>
            </Link>
          )}
          <p className="text-xs uppercase tracking-widest text-white/80 mb-1">{program.title}</p>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-md flex items-baseline gap-3" data-testid="text-day-title">
                <span className="text-white/60 text-3xl md:text-4xl font-semibold">Day</span>
                {day}
                <span className="text-white/60 text-2xl md:text-3xl font-semibold">/ {program.lengthDays}</span>
              </h1>
              {isToday ? (
                <p className="text-lg text-white/90 mt-2 flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  Your session for today
                </p>
              ) : (
                <p className="text-sm text-white/80 mt-2">
                  Reviewing day {day} (your current day is {enrollment.currentDay})
                </p>
              )}
            </div>
            {dayDone && (
              <Badge className="bg-white/95 text-black border-0 text-base py-1.5 px-3" data-testid="badge-day-complete">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Day complete
              </Badge>
            )}
          </div>

          {/* Day pager */}
          <div className="flex items-center gap-2 mt-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10"
              onClick={() => setViewedDay(Math.max(1, day - 1))}
              disabled={day <= 1}
              data-testid="button-prev-day"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/10"
                onClick={() => setViewedDay(enrollment.currentDay)}
                data-testid="button-jump-today"
              >
                Jump to today
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10"
              onClick={() => setViewedDay(Math.min(program.lengthDays, day + 1))}
              disabled={day >= program.lengthDays}
              data-testid="button-next-day"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          {programDone && (
            <Card className="border-2" style={{ borderColor: accent }} data-testid="card-program-complete">
              <CardContent className="p-6 text-center">
                <PartyPopper className="w-10 h-10 mx-auto mb-2" style={{ color: accent }} />
                <h2 className="text-xl font-bold">You finished the program.</h2>
                <p className="text-muted-foreground mt-1">
                  All {totalItems} items, done. That's the work.
                </p>
              </CardContent>
            </Card>
          )}

          {dayItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">No items planned for this day.</p>
              </CardContent>
            </Card>
          ) : (
            dayItems.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                completed={completedItemIds.has(it.id)}
                completion={completionByItem.get(it.id)}
                accent={accent}
                onComplete={() => completeMutation.mutate(it.id)}
                isPending={completeMutation.isPending}
                drillsById={drillsById}
                enrollmentId={enrollment.id}
              />
            ))
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Overall progress
              </h3>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold" data-testid="text-overall-percent">{pct}%</span>
                <span className="text-xs text-muted-foreground">{completedCount}/{totalItems}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
              </div>
              <Separator className="my-4" />
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Length</span><span className="font-medium">{program.lengthDays} days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Difficulty</span><span className="font-medium capitalize">{program.difficulty}</span></div>
                {program.estimatedMinutesPerDay && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Per day</span><span className="font-medium">~{program.estimatedMinutesPerDay} min</span></div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ─── Item Card ───
function ItemCard({
  item,
  completed,
  completion,
  accent,
  onComplete,
  isPending,
  drillsById,
  enrollmentId,
}: {
  item: ProgramItem;
  completed: boolean;
  completion?: ProgramItemCompletion;
  accent: string;
  onComplete: () => void;
  isPending: boolean;
  drillsById: Map<string, Drill>;
  enrollmentId: string;
}) {
  const meta = itemTypeMeta[item.itemType] ?? itemTypeMeta.drill;
  const Icon = meta.Icon;
  // Workout completes automatically after the user finishes logging in /log.
  // Only watch / rest / challenge items still need a manual button.
  const showManualComplete = item.itemType !== "workout" && item.itemType !== "drill";

  return (
    <Card
      className={`overflow-hidden transition-all ${completed ? "opacity-80" : ""}`}
      data-testid={`card-item-${item.id}`}
    >
      <div className="flex items-stretch">
        <div
          className="w-1.5 shrink-0"
          style={{ background: completed ? accent : `${accent}55` }}
        />
        <div className="flex-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${meta.color} flex items-center gap-1.5`}>
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
                {item.estimatedMinutes ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.estimatedMinutes} min
                  </span>
                ) : null}
              </div>
              <h3 className={`text-xl font-bold leading-snug ${completed ? "line-through text-muted-foreground" : ""}`} data-testid={`text-item-title-${item.id}`}>
                {item.title}
              </h3>
              {item.notes && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
                  {item.notes}
                </p>
              )}

              {/* Item-type specific body */}
              {item.itemType === "drill" && item.drillId && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/log?startDrills=${item.drillId}&programItemId=${item.id}&enrollmentId=${enrollmentId}`}>
                    <Button size="sm" className="font-semibold"
                      style={{ background: accent, color: "white" }}
                      data-testid={`button-start-workout-${item.id}`}>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {completed ? "Repeat" : "Start workout"}
                    </Button>
                  </Link>
                  <Link href={`/drill/${item.drillId}`}>
                    <Button variant="outline" size="sm" data-testid={`button-open-drill-${item.id}`}>
                      View drill
                    </Button>
                  </Link>
                </div>
              )}

              {item.itemType === "workout" && (item.workoutSpec?.length || item.drillId) && (() => {
                const validIds = (item.workoutSpec ?? [])
                  .map((w) => w.drillId)
                  .filter((id): id is string => !!id);
                const launchIds = validIds.length > 0 ? validIds : (item.drillId ? [item.drillId] : []);
                const launchHref = launchIds.length > 0
                  ? `/log?startDrills=${launchIds.join(",")}&programItemId=${item.id}&enrollmentId=${enrollmentId}`
                  : null;
                return (
                  <div className="mt-4 space-y-3">
                    {item.workoutSpec && item.workoutSpec.length > 0 && (
                      <Collapsible defaultOpen={false}>
                        <div className="rounded-lg border border-border/60 bg-card-overlay/40 overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 hover-elevate text-left"
                              data-testid={`trigger-workout-${item.id}`}
                            >
                              <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                                {item.workoutSpec.length} drill{item.workoutSpec.length === 1 ? "" : "s"} — view breakdown
                              </span>
                              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t border-border/60 px-3 py-2 space-y-1.5">
                              {item.workoutSpec.map((w, idx) => {
                                const d = w.drillId ? drillsById.get(w.drillId) : undefined;
                                const detail = [
                                  w.sets ? `${w.sets} sets` : null,
                                  w.reps ? `${w.reps} reps` : null,
                                  w.durationSec ? `${w.durationSec}s` : null,
                                ].filter(Boolean).join(" · ");
                                return (
                                  <div key={idx} className="flex items-center justify-between gap-3 text-sm" data-testid={`row-workout-${item.id}-${idx}`}>
                                    {w.drillId && d ? (
                                      <Link
                                        href={`/drill/${w.drillId}`}
                                        className="font-medium hover:underline truncate"
                                        data-testid={`link-workout-drill-${item.id}-${idx}`}
                                      >
                                        {d.title}
                                      </Link>
                                    ) : w.drillId ? (
                                      <Link
                                        href={`/drill/${w.drillId}`}
                                        className="font-medium hover:underline truncate text-muted-foreground"
                                      >
                                        Drill {idx + 1}
                                      </Link>
                                    ) : (
                                      <span className="font-medium truncate text-muted-foreground italic">
                                        Drill {idx + 1} (missing)
                                      </span>
                                    )}
                                    {detail && (
                                      <span className="text-muted-foreground text-xs whitespace-nowrap">{detail}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}
                    {launchHref ? (
                      <Link href={launchHref}>
                        <Button size="sm" className="font-semibold"
                          style={{ background: accent, color: "white" }}
                          data-testid={`button-start-workout-${item.id}`}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          {completed ? "Repeat workout" : "Start workout"}
                        </Button>
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No drills attached yet.</p>
                    )}
                    {completed && completion?.trainingLogId && (
                      <WorkoutStatsBlock
                        trainingLogId={completion.trainingLogId}
                        drillsById={drillsById}
                        accent={accent}
                        itemId={item.id}
                      />
                    )}
                  </div>
                );
              })()}
              {item.itemType === "drill" && completed && completion?.trainingLogId && (
                <WorkoutStatsBlock
                  trainingLogId={completion.trainingLogId}
                  drillsById={drillsById}
                  accent={accent}
                  itemId={item.id}
                />
              )}

              {item.itemType === "challenge" && item.challengeSpec && (
                <div
                  className="mt-4 rounded-lg p-4"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}55` }}
                >
                  <p className="text-xs uppercase tracking-wide font-bold flex items-center gap-1" style={{ color: accent }}>
                    <Sparkles className="w-3.5 h-3.5" /> Challenge
                  </p>
                  <p className="text-sm mt-1.5 font-medium">{item.challengeSpec.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {item.challengeSpec.target != null && (
                      <span>Target: <strong className="text-foreground">{item.challengeSpec.target}</strong> {item.challengeSpec.scoringMetric}</span>
                    )}
                    {item.challengeSpec.timeLimitSec != null && (
                      <span>Time limit: <strong className="text-foreground">{item.challengeSpec.timeLimitSec}s</strong></span>
                    )}
                  </div>
                </div>
              )}

              {item.itemType === "watch" && item.watchUrl && (
                <div className="mt-4">
                  <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" data-testid={`button-watch-${item.id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {meta.verb}
                    </Button>
                  </a>
                </div>
              )}

              {item.itemType === "rest" && (
                <div className="mt-3 text-sm text-muted-foreground italic">
                  Recovery is part of the work.
                </div>
              )}
            </div>

            <div className="shrink-0">
              {completed ? (
                <div className="flex flex-col items-center gap-1 text-sm" style={{ color: accent }}>
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-xs font-semibold">Done</span>
                </div>
              ) : showManualComplete ? (
                <Button
                  size="sm"
                  className="font-semibold"
                  style={{ background: accent, color: "white" }}
                  onClick={onComplete}
                  disabled={isPending}
                  data-testid={`button-complete-${item.id}`}
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Mark complete
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground text-right max-w-[120px]" data-testid={`text-auto-complete-hint-${item.id}`}>
                  Auto-completes when you finish logging
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Completed Workout Stats (expanded inline when an item has trainingLogId) ───
type SessionLog = {
  id: string;
  drillId: string | null;
  duration: number | null;
  shotsMade: number | null;
  shotsAttempted: number | null;
  shotLocation: string | null;
  notes: string | null;
  workoutSessionId: string | null;
  date: string;
  metrics: { metricId: string; value: string | number | null; metricName: string | null }[];
};

function WorkoutStatsBlock({
  trainingLogId,
  drillsById,
  accent,
  itemId,
}: {
  trainingLogId: string;
  drillsById: Map<string, Drill>;
  accent: string;
  itemId: string;
}) {
  const { data: logs, isLoading } = useQuery<SessionLog[]>({
    queryKey: ["/api/training-logs", trainingLogId, "session"],
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-card-overlay/40 p-3" data-testid={`stats-loading-${itemId}`}>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (!logs || logs.length === 0) return null;

  const totalShotsMade = logs.reduce((s, l) => s + (l.shotsMade ?? 0), 0);
  const totalShotsAttempted = logs.reduce((s, l) => s + (l.shotsAttempted ?? 0), 0);
  const totalMinutes = logs.reduce((s, l) => s + (l.duration ?? 0), 0);
  const pct = totalShotsAttempted > 0 ? Math.round((totalShotsMade / totalShotsAttempted) * 100) : null;

  return (
    <Collapsible defaultOpen={false}>
      <div className="rounded-lg border border-border/60 bg-card-overlay/40 overflow-hidden" data-testid={`stats-block-${itemId}`}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover-elevate text-left"
            data-testid={`trigger-stats-${itemId}`}
          >
            <span className="text-xs uppercase tracking-wide font-semibold flex items-center gap-1.5" style={{ color: accent }}>
              <Trophy className="w-3.5 h-3.5" /> Your results
              {pct != null && (
                <span className="text-foreground/80 normal-case font-normal">
                  · {totalShotsMade}/{totalShotsAttempted} shots ({pct}%)
                </span>
              )}
              {totalMinutes > 0 && (
                <span className="text-muted-foreground normal-case font-normal">· {totalMinutes} min</span>
              )}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 px-3 py-3 space-y-3">
            {pct != null && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/40 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Made</div>
                  <div className="text-lg font-bold">{totalShotsMade}</div>
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Attempts</div>
                  <div className="text-lg font-bold">{totalShotsAttempted}</div>
                </div>
                <div className="rounded-md px-2 py-2" style={{ background: `${accent}22` }}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">FG%</div>
                  <div className="text-lg font-bold" style={{ color: accent }}>{pct}%</div>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {logs.map((l, idx) => {
                const drill = l.drillId ? drillsById.get(l.drillId) : undefined;
                const lpct = l.shotsAttempted && l.shotsMade != null && l.shotsAttempted > 0
                  ? Math.round((l.shotsMade / l.shotsAttempted) * 100)
                  : null;
                const detail = [
                  l.shotsAttempted ? `${l.shotsMade ?? 0}/${l.shotsAttempted}` : null,
                  lpct != null ? `${lpct}%` : null,
                  l.duration ? `${l.duration}m` : null,
                  l.shotLocation ? l.shotLocation : null,
                ].filter(Boolean).join(" · ");
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 text-sm"
                    data-testid={`row-stat-${itemId}-${idx}`}
                  >
                    <span className="font-medium truncate">{drill?.title ?? "Drill"}</span>
                    {detail && <span className="text-xs text-muted-foreground whitespace-nowrap">{detail}</span>}
                  </div>
                );
              })}
            </div>
            <Link href={`/log?view=history`}>
              <Button variant="ghost" size="sm" className="text-xs" data-testid={`link-full-history-${itemId}`}>
                View in training log →
              </Button>
            </Link>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
