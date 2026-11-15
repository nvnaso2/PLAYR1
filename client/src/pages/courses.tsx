import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramCard } from "@/components/program-card";
import { ArrowLeft, Search } from "lucide-react";
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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 pb-12 sm:p-6" data-testid="page-courses">
      <div className="space-y-4">
        <Link href="/log" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Train
        </Link>

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold sm:text-2xl" data-testid="text-page-title">Courses</h1>
          <span className="shrink-0 text-xs text-muted-foreground">
            {isLoading ? "Loading courses…" : `${courses?.length ?? 0} ${(courses?.length ?? 0) === 1 ? "course" : "courses"}`}
          </span>
        </div>
      </div>

      {(courses?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" className="pl-9" aria-label="Search courses" />
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
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="aspect-video rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No courses match your search.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="grid-courses">
          {filtered.map((course) => (
            <ProgramCard key={course.id} program={course} hrefBase="/courses" />
          ))}
        </div>
      )}
    </main>
  );
}