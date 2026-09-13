import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramCard } from "@/components/program-card";
import { ArrowLeft, BookOpen, Lock, Search, Sparkles } from "lucide-react";
import type { Program } from "@shared/schema";

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");

  useEffect(() => {
    track("courses_browse_view");
  }, []);

  const { data: courses, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs?contentType=course"],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (courses ?? []).filter((course) => {
      if (difficulty !== "all" && course.difficulty !== difficulty) return false;
      if (!q) return true;
      return `${course.title} ${course.tagline ?? ""} ${course.description ?? ""}`.toLowerCase().includes(q);
    });
  }, [courses, difficulty, search]);

  const featured = filtered.find((course) => course.isFeatured) ?? filtered[0];
  const rest = filtered.filter((course) => course.id !== featured?.id);

  return (
    <div className="min-h-screen pb-12">
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 10% 10%, hsl(var(--primary) / 0.25), transparent 50%), radial-gradient(circle at 90% 80%, hsl(24 95% 53% / 0.2), transparent 50%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-3">
            <BookOpen className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs">PLAYR1 Courses</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Courses</h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
            Premium, lesson-driven training journeys. Watch the trailer, then unlock the complete day-by-day system with PLAYR1 Pro.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Badge variant="outline" className="gap-1.5"><Lock className="w-3 h-3" /> Pro access</Badge>
            <Badge variant="outline">Lessons + workouts</Badge>
            <Badge variant="outline">Track your progress</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <Card className="border-primary/30 bg-primary/5 overflow-hidden">
          <CardContent className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Free starter</p>
              <h2 className="text-xl font-bold">Take the Mechanical Foundation Scorecard</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Find the part of your shot that needs the most attention before you start the full 14-day course.</p>
            </div>
            <Link href="/courses/mechanical-foundation-14/lead-magnet">
              <Badge className="h-10 px-4 gap-2 cursor-pointer"><Sparkles className="w-4 h-4" /> Start free</Badge>
            </Link>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" className="pl-9" />
          </div>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="elite">Elite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No courses match your search.</CardContent></Card>
        ) : (
          <>
            {featured && (
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-primary" /> Featured course</h2>
                <div className="max-w-2xl">
                  <ProgramCard program={featured} variant="featured" hrefBase="/courses" />
                </div>
              </section>
            )}
            {rest.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">All courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((course) => <ProgramCard key={course.id} program={course} hrefBase="/courses" />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}