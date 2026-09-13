import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramCard } from "@/components/program-card";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
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

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
        <Link href="/log" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Train
        </Link>

        <div className="mt-8 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs uppercase tracking-[0.22em] font-semibold">Train / Courses</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Build your game.</h1>
          <p className="text-muted-foreground max-w-xl">
            Focused training systems with a clear day-by-day path. Pick a course, follow the work, and keep improving.
          </p>
        </div>

        {(courses?.length ?? 0) > 1 && (
          <div className="mt-8 flex flex-col md:flex-row gap-3">
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
        )}

        <div className="mt-10">
          {isLoading ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">No courses match your search.</CardContent></Card>
          ) : (
            <div className="max-w-4xl">
              {featured && <ProgramCard program={featured} variant="featured" hrefBase="/courses" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}