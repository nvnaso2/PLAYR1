import { useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Coffee,
  Dumbbell,
  Flame,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import type { Program, ProgramItem, ProgramEnrollment, ProgramItemCompletion, Drill } from "@shared/schema";

interface ProgramDetailResponse {
  program: Program;
  items: ProgramItem[];
  enrollment: ProgramEnrollment | null;
  completions: ProgramItemCompletion[];
}

const itemTypeMeta: Record<string, { label: string; Icon: any; color: string }> = {
  drill: { label: "Drill", Icon: Target, color: "text-blue-400" },
  workout: { label: "Workout", Icon: Dumbbell, color: "text-orange-400" },
  challenge: { label: "Challenge", Icon: Trophy, color: "text-yellow-400" },
  watch: { label: "Watch", Icon: Video, color: "text-purple-400" },
  rest: { label: "Rest", Icon: Coffee, color: "text-green-400" },
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/15 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  advanced: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  elite: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function ProgramDetailPage() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const slug = params.slug;

  const { data, isLoading, isError } = useQuery<ProgramDetailResponse>({
    queryKey: ["/api/programs", slug],
    enabled: !!slug,
  });

  const { data: allDrills } = useQuery<Drill[]>({ queryKey: ["/api/drills"] });
  const drillsById = useMemo(() => {
    const m = new Map<string, Drill>();
    (allDrills ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [allDrills]);

  useEffect(() => {
    if (data?.program) {
      track("program_view", { programId: data.program.id, slug: data.program.slug });
    }
  }, [data?.program]);

  const enroll = useMutation({
    mutationFn: async () => {
      if (!data?.program.id) throw new Error("No program");
      return await apiRequest("POST", `/api/programs/${data.program.id}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs/me"] });
      track("program_enroll", { programId: data?.program.id, slug });
      toast({ title: "You're in!", description: "Let's get to work. Today's session is ready." });
      setLocation(`/programs/${slug}/today`);
    },
    onError: () => toast({ title: "Couldn't enroll", description: "Try again in a moment.", variant: "destructive" }),
  });

  const itemsByDay = useMemo(() => {
    const map = new Map<number, ProgramItem[]>();
    (data?.items ?? []).forEach((it) => {
      const arr = map.get(it.dayNumber) ?? [];
      arr.push(it);
      map.set(it.dayNumber, arr);
    });
    return map;
  }, [data?.items]);

  const completedItemIds = useMemo(
    () => new Set((data?.completions ?? []).map((c) => c.programItemId)),
    [data?.completions],
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center" data-testid="state-program-error">
        <h1 className="text-2xl font-bold">We couldn't load this program</h1>
        <p className="text-muted-foreground mt-2">It may not exist or it may not be available right now.</p>
        <Link href="/programs">
          <Button className="mt-6" data-testid="button-back-to-programs">Back to Programs</Button>
        </Link>
      </div>
    );
  }

  const { program, items, enrollment } = data;
  const accent = program.accentColor || "#f97316";
  const completedCount = completedItemIds.size;
  const totalItems = items.length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const totalDays = program.lengthDays;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="min-h-screen pb-12">
      {/* ─── Cinematic Hero ─── */}
      <div
        className="relative overflow-hidden border-b border-border/40"
        style={{
          background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}55 40%, hsl(var(--background)) 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(circle at 20% 0%, ${accent}aa 0%, transparent 50%), radial-gradient(circle at 90% 100%, ${accent}55 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          <Link href="/programs">
            <Button variant="ghost" size="sm" className="mb-6 text-white/90 hover:text-white hover:bg-white/10" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Programs
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {program.isFeatured && (
                  <Badge className="bg-white/95 text-black border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                <Badge variant="outline" className={`backdrop-blur ${difficultyColors[program.difficulty] || ""}`}>
                  {program.difficulty}
                </Badge>
                {(program.categoryTags ?? []).map((c) => (
                  <Badge key={c} variant="outline" className="border-white/30 text-white/90 backdrop-blur">
                    {c.replace("-", " ")}
                  </Badge>
                ))}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md" data-testid="text-program-title">
                {program.title}
              </h1>
              {program.tagline && (
                <p className="text-lg md:text-xl text-white/85 mt-3 max-w-2xl" data-testid="text-program-tagline">
                  {program.tagline}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-white/85">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {program.lengthDays} days
                </span>
                {program.estimatedMinutesPerDay && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    ~{program.estimatedMinutesPerDay} min/day
                  </span>
                )}
                {(program.enrollmentCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {program.enrollmentCount} enrolled
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  Player-paced
                </span>
              </div>
            </div>

            {/* Enrollment CTA */}
            <div className="flex flex-col items-stretch lg:items-end gap-2 min-w-[220px]">
              {enrollment ? (
                <>
                  <Link href={`/programs/${program.slug}/today`}>
                    <Button
                      size="lg"
                      className="w-full lg:w-auto shadow-lg"
                      style={{ background: accent, color: "white" }}
                      data-testid="button-go-to-today"
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Continue Day {enrollment.currentDay}
                    </Button>
                  </Link>
                  <p className="text-xs text-white/80 text-center lg:text-right" data-testid="text-progress-hero">
                    {completedCount}/{totalItems} done · {pct}%
                  </p>
                </>
              ) : (
                <Button
                  size="lg"
                  className="w-full lg:w-auto shadow-lg"
                  style={{ background: accent, color: "white" }}
                  onClick={() => enroll.mutate()}
                  disabled={enroll.isPending}
                  data-testid="button-enroll"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  {enroll.isPending ? "Starting…" : "Start Program"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Main */}
        <div className="space-y-8">
          {program.description && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-2">What you'll get</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-program-description">
                  {program.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Day-by-day outline */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: accent }} />
              Day-by-day plan
            </h2>

            <div className="space-y-3">
              {days.map((day) => {
                const dayItems = itemsByDay.get(day) ?? [];
                const dayDone =
                  dayItems.length > 0 && dayItems.every((it) => completedItemIds.has(it.id));
                const isCurrent = enrollment?.currentDay === day;

                return (
                  <Card
                    key={day}
                    className={`overflow-hidden transition-all ${
                      isCurrent ? "ring-2 ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={isCurrent ? { boxShadow: `0 0 0 2px ${accent}55` } : undefined}
                    data-testid={`card-day-${day}`}
                  >
                    <div className="flex items-stretch">
                      <div
                        className="w-16 md:w-20 flex flex-col items-center justify-center text-center py-4 shrink-0"
                        style={{
                          background: dayDone
                            ? `${accent}33`
                            : isCurrent
                            ? `${accent}1a`
                            : "hsl(var(--muted))",
                        }}
                      >
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Day</span>
                        <span className="text-2xl font-bold" style={{ color: dayDone || isCurrent ? accent : undefined }}>
                          {day}
                        </span>
                        {dayDone ? (
                          <CheckCircle2 className="w-4 h-4 mt-1" style={{ color: accent }} />
                        ) : isCurrent ? (
                          <Flame className="w-4 h-4 mt-1" style={{ color: accent }} />
                        ) : null}
                      </div>

                      <div className="flex-1 p-4 space-y-2">
                        {dayItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No items scheduled</p>
                        ) : (
                          dayItems.map((it) => (
                            <DayItemRow
                              key={it.id}
                              item={it}
                              completed={completedItemIds.has(it.id)}
                              accent={accent}
                              drillsById={drillsById}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Your progress
              </h3>
              {enrollment ? (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xl font-bold" data-testid="text-percent-complete">
                      {pct}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{totalItems} items
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                  </div>
                  <Separator className="my-4" />
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{enrollment.status}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Current day</span><span className="font-medium">Day {enrollment.currentDay}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span className="font-medium">{enrollment.startedAt ? new Date(enrollment.startedAt).toLocaleDateString() : "—"}</span></div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enroll to track your progress here.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">How it works</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3"><span className="text-primary font-bold">1.</span><span>Enroll once. Multiple programs allowed.</span></li>
                <li className="flex gap-3"><span className="text-primary font-bold">2.</span><span>Player-paced. Train when it works for you.</span></li>
                <li className="flex gap-3"><span className="text-primary font-bold">3.</span><span>Tap items to complete and track progress.</span></li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DayItemRow({
  item,
  completed,
  accent,
  drillsById,
}: {
  item: ProgramItem;
  completed: boolean;
  accent: string;
  drillsById: Map<string, Drill>;
}) {
  const meta = itemTypeMeta[item.itemType] ?? itemTypeMeta.drill;
  const Icon = meta.Icon;
  const isWorkout = item.itemType === "workout" && (item.workoutSpec?.length ?? 0) > 0;
  return (
    <div
      className={`p-2 -mx-2 rounded-lg transition-colors ${completed ? "opacity-70" : ""}`}
      data-testid={`row-item-${item.id}`}
    >
      <Collapsible defaultOpen={false}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {completed ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: accent }} />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium uppercase tracking-wide ${meta.color} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {meta.label}
              </span>
              {item.estimatedMinutes ? (
                <span className="text-xs text-muted-foreground">· {item.estimatedMinutes} min</span>
              ) : null}
              {isWorkout && (
                <span className="text-xs text-muted-foreground">
                  · {item.workoutSpec!.length} drill{item.workoutSpec!.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {isWorkout ? (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 group"
                  data-testid={`trigger-day-item-${item.id}`}
                >
                  <p className={`font-medium text-left ${completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.title}
                  </p>
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                </button>
              </CollapsibleTrigger>
            ) : (
              <p className={`font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>
                {item.title}
              </p>
            )}
          </div>
        </div>
        {isWorkout && (
          <CollapsibleContent>
            <div className="mt-2 ml-8 rounded-md border border-border/60 bg-card-overlay/40 px-3 py-2 space-y-1.5">
              {item.workoutSpec!.map((w, idx) => {
                const d = w.drillId ? drillsById.get(w.drillId) : undefined;
                const detail = [
                  w.sets ? `${w.sets} sets` : null,
                  w.reps ? `${w.reps} reps` : null,
                  w.durationSec ? `${w.durationSec}s` : null,
                ].filter(Boolean).join(" · ");
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 text-sm" data-testid={`row-day-workout-${item.id}-${idx}`}>
                    {w.drillId ? (
                      <Link href={`/drill/${w.drillId}`} className="font-medium hover:underline truncate">
                        {d?.title ?? `Drill ${idx + 1}`}
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
        )}
      </Collapsible>
    </div>
  );
}
