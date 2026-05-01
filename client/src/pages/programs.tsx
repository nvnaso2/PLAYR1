import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgramCard } from "@/components/program-card";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Calendar, Compass, Flame, Search, Sparkles, Trophy, UserCheck, Users } from "lucide-react";
import type { Program, ProgramEnrollment } from "@shared/schema";

type Trainer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type EnrollmentRow = ProgramEnrollment & {
  program: Program;
  completedItemCount: number;
  totalItemCount: number;
};

type AssignedRow = EnrollmentRow & { trainer: Trainer | null };
type TrainerProgram = Program & { trainer: Trainer | null };

function trainerName(t: Trainer | null | undefined): string {
  if (!t) return "your coach";
  return [t.firstName, t.lastName].filter(Boolean).join(" ").trim() || "your coach";
}

export default function ProgramsPage() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    track("programs_browse_view");
  }, []);

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const { data: enrollments } = useQuery<EnrollmentRow[]>({
    queryKey: ["/api/programs/me"],
  });

  const { data: assignedToMe } = useQuery<AssignedRow[]>({
    queryKey: ["/api/programs/discover/assigned"],
  });

  const { data: fromTrainers } = useQuery<TrainerProgram[]>({
    queryKey: ["/api/programs/discover/from-trainers"],
  });

  const enrollmentByProgramId = useMemo(() => {
    const map = new Map<string, EnrollmentRow>();
    (enrollments ?? []).forEach((e) => map.set(e.programId, e));
    return map;
  }, [enrollments]);

  const filtered = useMemo(() => {
    if (!programs) return [];
    return programs.filter((p) => {
      if (search) {
        const haystack = `${p.title} ${p.tagline ?? ""} ${p.description ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      if (difficulty !== "all" && p.difficulty !== difficulty) return false;
      if (category !== "all" && !(p.categoryTags ?? []).includes(category)) return false;
      return true;
    });
  }, [programs, search, difficulty, category]);

  // Hide catalog entries that are already surfaced in "From your trainers" so
  // the same trainer-published public program is not rendered twice on the page.
  const fromTrainerIds = useMemo(
    () => new Set((fromTrainers ?? []).map((p) => p.id)),
    [fromTrainers],
  );
  const catalogFiltered = useMemo(
    () => filtered.filter((p) => !fromTrainerIds.has(p.id)),
    [filtered, fromTrainerIds],
  );
  const featured = catalogFiltered.find((p) => p.isFeatured) ?? catalogFiltered[0];
  const grid = catalogFiltered.filter((p) => p.id !== featured?.id);

  const activeEnrollments = enrollments ?? [];

  return (
    <div className="min-h-screen pb-12">
      {/* ─── Page Hero ─── */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-background via-background to-background">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10% 20%, hsl(var(--primary) / 0.25) 0%, transparent 50%), radial-gradient(circle at 90% 80%, hsl(24 95% 53% / 0.2) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs">Structured Training</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" data-testid="text-page-title">
            Programs
          </h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
            Hand-built training plans that take the guesswork out of getting better. Pick one. Show up. Get game.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* ─── Continue training (active enrollments) ─── */}
        {activeEnrollments.length > 0 && (
          <section data-testid="section-continue">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Continue training
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick up where you left off.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEnrollments.map((e) => (
                <ContinueCard key={e.id} enrollment={e} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Assigned by your coach ─── */}
        {(assignedToMe?.length ?? 0) > 0 && (
          <section data-testid="section-assigned-by-coach">
            <div className="mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Assigned to you
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your trainer wants you on these.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(assignedToMe ?? []).map((row) => (
                <Link
                  key={row.id}
                  href={`/programs/${row.program.slug}/today`}
                  data-testid={`link-assigned-${row.program.slug}`}
                >
                  <Card className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden border-primary/40 h-full">
                    <div
                      className="h-2 w-full"
                      style={{ background: `linear-gradient(90deg, ${row.program.accentColor || "#f97316"}, ${(row.program.accentColor || "#f97316")}66)` }}
                    />
                    <CardContent className="p-5">
                      <Badge variant="default" className="mb-2 text-xs">
                        Assigned by {trainerName(row.trainer)}
                      </Badge>
                      <h3 className="font-semibold leading-tight" data-testid={`text-assigned-title-${row.program.slug}`}>
                        {row.program.title}
                      </h3>
                      {row.program.tagline ? (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{row.program.tagline}</p>
                      ) : null}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                        <span>Day {row.currentDay} of {row.program.lengthDays}</span>
                        <span>{row.completedItemCount}/{row.totalItemCount} items</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── From your trainers (roster-tier programs not yet enrolled) ─── */}
        {(() => {
          const enrolledIds = new Set((enrollments ?? []).map((e) => e.programId));
          const trainerOnly = (fromTrainers ?? []).filter((p) => !enrolledIds.has(p.id));
          if (trainerOnly.length === 0) return null;
          return (
            <section data-testid="section-from-trainers">
              <div className="mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  From your trainers
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Programs published by trainers you're connected to.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainerOnly.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <ProgramCard
                      program={p}
                      enrolledCount={enrollmentByProgramId.get(p.id)?.completedItemCount}
                      totalItems={enrollmentByProgramId.get(p.id)?.totalItemCount}
                    />
                    {p.trainer ? (
                      <p className="text-xs text-muted-foreground px-1" data-testid={`text-trainer-${p.slug}`}>
                        By {trainerName(p.trainer)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* ─── Filters ─── */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search programs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-full md:w-44" data-testid="select-difficulty">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="ball-handling">Ball Handling</SelectItem>
                <SelectItem value="shooting">Shooting</SelectItem>
                <SelectItem value="passing">Passing</SelectItem>
                <SelectItem value="finishing">Finishing</SelectItem>
                <SelectItem value="defense">Defense</SelectItem>
                <SelectItem value="workouts">Workouts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ─── Featured ─── */}
        {!isLoading && featured && (
          <section data-testid="section-featured">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Featured
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ProgramCard
                program={featured}
                variant="featured"
                enrolledCount={enrollmentByProgramId.get(featured.id)?.completedItemCount}
                totalItems={enrollmentByProgramId.get(featured.id)?.totalItemCount}
              />
              {grid[0] && (
                <ProgramCard
                  program={grid[0]}
                  variant="featured"
                  enrolledCount={enrollmentByProgramId.get(grid[0].id)?.completedItemCount}
                  totalItems={enrollmentByProgramId.get(grid[0].id)?.totalItemCount}
                />
              )}
            </div>
          </section>
        )}

        {/* ─── All programs ─── */}
        <section data-testid="section-all-programs">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-muted-foreground" />
              All programs
            </h2>
            <span className="text-sm text-muted-foreground" data-testid="text-result-count">
              {isLoading ? "Loading…" : `${catalogFiltered.length} program${catalogFiltered.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : catalogFiltered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-lg font-semibold">No programs match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try clearing some filters or searching for something else.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featured ? grid.slice(1) : grid).map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  enrolledCount={enrollmentByProgramId.get(p.id)?.completedItemCount}
                  totalItems={enrollmentByProgramId.get(p.id)?.totalItemCount}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ContinueCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const accent = enrollment.program.accentColor || "#f97316";
  const pct =
    enrollment.totalItemCount > 0
      ? Math.round((enrollment.completedItemCount / enrollment.totalItemCount) * 100)
      : 0;
  return (
    <Link href={`/programs/${enrollment.program.slug}/today`} data-testid={`link-continue-${enrollment.program.slug}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden border-border/60 h-full">
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}66)` }}
        />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <Badge variant="outline" className="mb-2 text-xs">
                Day {enrollment.currentDay} of {enrollment.program.lengthDays}
              </Badge>
              <h3 className="font-semibold leading-tight" data-testid={`text-continue-title-${enrollment.program.slug}`}>
                {enrollment.program.title}
              </h3>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 mb-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {enrollment.completedItemCount}/{enrollment.totalItemCount} items
            </span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: accent }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
