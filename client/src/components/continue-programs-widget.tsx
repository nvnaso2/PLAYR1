import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Flame, Sparkles, UserCheck } from "lucide-react";
import type { Program, ProgramEnrollment } from "@shared/schema";

type EnrollmentRow = ProgramEnrollment & {
  program: Program;
  completedItemCount: number;
  totalItemCount: number;
};

type AssignedRow = EnrollmentRow & {
  trainer: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
};

export function ContinueProgramsWidget() {
  const { data: enrollments, isLoading } = useQuery<EnrollmentRow[]>({
    queryKey: ["/api/programs/me"],
  });
  const { data: assigned } = useQuery<AssignedRow[]>({
    queryKey: ["/api/programs/discover/assigned"],
  });

  if (isLoading) return null;

  // Build a map programId → trainer name so we can label assigned rows.
  const trainerByProgramId = new Map<string, string>();
  (assigned ?? []).forEach((a) => {
    const name = [a.trainer?.firstName, a.trainer?.lastName].filter(Boolean).join(" ").trim();
    if (a.trainer && name) trainerByProgramId.set(a.programId, name);
    else if (a.trainer) trainerByProgramId.set(a.programId, "your coach");
  });

  const active = (enrollments ?? []).filter((e) => e.status === "active");

  if (active.length === 0) {
    // Empty state — invite the user into the feature
    return (
      <Card className="overflow-hidden border-border/60" data-testid="card-programs-empty">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.5) 100%)" }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">Start a Training Course</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Hand-built plans for handle, shooting, and finishing. Pick one and follow along.
            </p>
          </div>
          <Link href="/courses">
            <Button size="sm" data-testid="button-browse-courses">
              Browse courses
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="section-continue-programs">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Continue training
        </h2>
        <Link href="/courses">
          <Button variant="ghost" size="sm" className="text-xs">
            All courses
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {active.slice(0, 3).map((e) => {
          const accent = e.program.accentColor || "#f97316";
          const pct =
            e.totalItemCount > 0 ? Math.round((e.completedItemCount / e.totalItemCount) * 100) : 0;
          return (
            <Link key={e.id} href={`/courses/${e.program.slug}/today`} data-testid={`link-dash-course-${e.program.slug}`}>
              <Card className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden border-border/60 h-full">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      Day {e.currentDay} of {e.program.lengthDays}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                    {e.program.title}
                  </h3>
                  {trainerByProgramId.has(e.programId) ? (
                    <p
                      className="text-[11px] text-primary mt-1 flex items-center gap-1"
                      data-testid={`text-assigned-by-${e.program.slug}`}
                    >
                      <UserCheck className="w-3 h-3" />
                      Assigned by {trainerByProgramId.get(e.programId)}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 mb-1">
                    <span>{e.completedItemCount}/{e.totalItemCount} items</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
