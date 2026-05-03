import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Coffee,
  Dumbbell,
  Flame,
  Layers,
  ListChecks,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import type { Drill, ProgramItem } from "@shared/schema";

const itemTypeMeta: Record<
  string,
  { label: string; Icon: any; tone: string; ring: string }
> = {
  drill: {
    label: "Drill",
    Icon: Target,
    tone: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    ring: "ring-blue-500/30",
  },
  workout: {
    label: "Workout",
    Icon: Dumbbell,
    tone: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    ring: "ring-orange-500/30",
  },
  challenge: {
    label: "Challenge",
    Icon: Trophy,
    tone: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    ring: "ring-yellow-500/30",
  },
  watch: {
    label: "Watch",
    Icon: Video,
    tone: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    ring: "ring-purple-500/30",
  },
  rest: {
    label: "Rest",
    Icon: Coffee,
    tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ring: "ring-emerald-500/30",
  },
};

export interface ProgramStatRibbonProps {
  accent: string;
  lengthDays: number;
  totalItems: number;
  estimatedMinutesPerDay?: number | null;
  difficulty?: string | null;
  enrollmentCount?: number | null;
  extra?: { icon: any; label: string; value: string }[];
}

export function ProgramStatRibbon({
  accent,
  lengthDays,
  totalItems,
  estimatedMinutesPerDay,
  difficulty,
  enrollmentCount,
  extra,
}: ProgramStatRibbonProps) {
  const stats: { icon: any; label: string; value: string }[] = [
    { icon: Calendar, label: "Days", value: `${lengthDays}` },
    { icon: ListChecks, label: "Sessions", value: `${totalItems}` },
  ];
  if (estimatedMinutesPerDay) {
    stats.push({ icon: Clock, label: "Per day", value: `~${estimatedMinutesPerDay} min` });
  }
  if (difficulty) {
    stats.push({ icon: Flame, label: "Level", value: difficulty });
  }
  if (typeof enrollmentCount === "number" && enrollmentCount > 0) {
    stats.push({ icon: Users, label: "Joined", value: `${enrollmentCount}` });
  }
  if (extra) stats.push(...extra);

  return (
    <div
      className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden"
      data-testid="ribbon-program-stats"
    >
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}33)` }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border/60">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="p-4 flex items-center gap-3 group"
              data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${accent}33 0%, ${accent}11 100%)`,
                  color: accent,
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-sm font-bold capitalize truncate">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DayPlanGridProps {
  /** All program items, any order. Will be grouped by `dayNumber`. */
  items: ProgramItem[];
  /** Total days in the program (so empty days still appear). */
  totalDays: number;
  /** Set of completed item ids. */
  completedItemIds?: Set<string>;
  /** The day the user is currently on (highlighted as "today"). */
  currentDay?: number | null;
  /** Drill cache for resolving titles in expanded workouts. */
  drillsById?: Map<string, Drill>;
  accent: string;
  /** Whether to render as a 2-col grid (compact) or stacked rows (spacious). */
  layout?: "rows" | "grid";
}

export function DayPlanGrid({
  items,
  totalDays,
  completedItemIds,
  currentDay,
  drillsById,
  accent,
  layout = "rows",
}: DayPlanGridProps) {
  const itemsByDay = new Map<number, ProgramItem[]>();
  items.forEach((it) => {
    const arr = itemsByDay.get(it.dayNumber) ?? [];
    arr.push(it);
    itemsByDay.set(it.dayNumber, arr);
  });
  itemsByDay.forEach((arr) =>
    arr.sort((a: ProgramItem, b: ProgramItem) => a.orderInDay - b.orderInDay),
  );
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const wrapper =
    layout === "grid"
      ? "grid grid-cols-1 md:grid-cols-2 gap-4"
      : "space-y-3";

  return (
    <div className={wrapper} data-testid="day-plan-grid">
      {days.map((day) => {
        const dayItems = itemsByDay.get(day) ?? [];
        const dayDone =
          dayItems.length > 0 &&
          !!completedItemIds &&
          dayItems.every((it) => completedItemIds.has(it.id));
        const isCurrent = currentDay === day;
        const totalMin = dayItems.reduce(
          (sum, it) => sum + (it.estimatedMinutes ?? 0),
          0,
        );

        return (
          <Card
            key={day}
            className={`overflow-hidden border-border/60 group transition-all hover-elevate ${
              isCurrent ? "shadow-lg" : ""
            }`}
            style={
              isCurrent
                ? { boxShadow: `0 0 0 2px ${accent}66, 0 8px 24px -12px ${accent}80` }
                : undefined
            }
            data-testid={`card-day-${day}`}
          >
            <div className="flex items-stretch">
              <div
                className="relative flex flex-col items-center justify-center text-center py-4 px-3 shrink-0 w-20 md:w-24"
                style={{
                  background: dayDone
                    ? `linear-gradient(160deg, ${accent}55, ${accent}22)`
                    : isCurrent
                      ? `linear-gradient(160deg, ${accent}44, ${accent}11)`
                      : `linear-gradient(160deg, hsl(var(--muted) / 0.55), hsl(var(--muted) / 0.2))`,
                }}
              >
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Day
                </span>
                <span
                  className="text-3xl md:text-4xl font-black leading-none mt-0.5"
                  style={{
                    color: dayDone || isCurrent ? accent : undefined,
                    textShadow: isCurrent ? `0 0 18px ${accent}55` : undefined,
                  }}
                >
                  {day}
                </span>
                <div className="mt-2 h-5">
                  {dayDone ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 gap-1 text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" /> Done
                    </Badge>
                  ) : isCurrent ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 gap-1 text-[10px]"
                      style={{
                        background: `${accent}22`,
                        color: accent,
                        borderColor: `${accent}55`,
                      }}
                    >
                      <Flame className="w-2.5 h-2.5" /> Today
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 min-w-0 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {dayItems.length} session{dayItems.length === 1 ? "" : "s"}
                    </span>
                    {totalMin > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />~{totalMin} min
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {dayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 opacity-60" /> No items
                    scheduled for this day
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {dayItems.map((it) => (
                      <DayItemRow
                        key={it.id}
                        item={it}
                        completed={!!completedItemIds?.has(it.id)}
                        accent={accent}
                        drillsById={drillsById}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
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
  drillsById?: Map<string, Drill>;
}) {
  const meta = itemTypeMeta[item.itemType] ?? itemTypeMeta.drill;
  const Icon = meta.Icon;
  const isWorkout =
    item.itemType === "workout" && (item.workoutSpec?.length ?? 0) > 0;

  const Header = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="shrink-0">
        {completed ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: accent }} />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/40" />
        )}
      </div>
      <Badge
        variant="outline"
        className={`shrink-0 text-[10px] gap-1 capitalize ${meta.tone}`}
      >
        <Icon className="w-3 h-3" />
        {meta.label}
      </Badge>
      <p
        className={`font-medium text-sm truncate ${
          completed ? "line-through text-muted-foreground" : ""
        }`}
      >
        {item.title}
      </p>
      {item.estimatedMinutes ? (
        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {item.estimatedMinutes}m
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      className="rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/30"
      data-testid={`row-day-item-${item.id}`}
    >
      <Collapsible defaultOpen={false}>
        {isWorkout ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 text-left group"
              data-testid={`trigger-day-item-${item.id}`}
            >
              {Header}
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
            </button>
          </CollapsibleTrigger>
        ) : (
          <div className="flex items-center justify-between gap-2">{Header}</div>
        )}
        {isWorkout && (
          <CollapsibleContent>
            <div
              className="mt-2 ml-8 rounded-md border border-border/60 bg-card-overlay/40 px-3 py-2 space-y-1"
              data-testid={`workout-spec-${item.id}`}
            >
              {item.workoutSpec!.map((w, idx) => {
                const d = w.drillId ? drillsById?.get(w.drillId) : undefined;
                const detail = [
                  w.sets ? `${w.sets} sets` : null,
                  w.reps ? `${w.reps} reps` : null,
                  w.durationSec ? `${w.durationSec}s` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 text-sm"
                    data-testid={`row-spec-${item.id}-${idx}`}
                  >
                    {w.drillId ? (
                      <Link
                        href={`/drill/${w.drillId}`}
                        className="font-medium hover:underline truncate"
                      >
                        {d?.title ?? `Drill ${idx + 1}`}
                      </Link>
                    ) : (
                      <span className="font-medium truncate text-muted-foreground italic">
                        Drill {idx + 1}
                      </span>
                    )}
                    {detail && (
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {detail}
                      </span>
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
