import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Search, Filter, Calendar, Clock, Target } from "lucide-react";
import { DRILL_CATEGORIES } from "@shared/schema";

interface TrainingLog {
  id: string;
  odlk?: string;
  odl?: string;
  odlm?: string;
  odln?: string;
  userId?: string;
  drillId?: string;
  drillTitle?: string;
  playerName?: string;
  firstName?: string;
  lastName?: string;
  category?: string;
  duration?: number;
  score?: number;
  completedAt?: string;
  createdAt?: string;
  date?: string;
  notes?: string;
}

export default function TrainerLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: trainerLogs, isLoading: trainerLoading } = useQuery<TrainingLog[]>({
    queryKey: ["/api/trainer/all-training-logs"],
  });

  const { data: coachLogs, isLoading: coachLoading } = useQuery<TrainingLog[]>({
    queryKey: ["/api/coach/all-training-logs"],
  });

  const isLoading = trainerLoading || coachLoading;

  const mergedLogs = useMemo(() => {
    const all: TrainingLog[] = [];
    const seen = new Set<string>();

    const addLogs = (logs: TrainingLog[] | undefined) => {
      if (!logs) return;
      for (const log of logs) {
        const key = log.id;
        if (!seen.has(key)) {
          seen.add(key);
          all.push(log);
        }
      }
    };

    addLogs(trainerLogs);
    addLogs(coachLogs);

    all.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.completedAt || b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });

    return all;
  }, [trainerLogs, coachLogs]);

  const filteredLogs = useMemo(() => {
    return mergedLogs.filter((log) => {
      const playerName = log.playerName || `${log.firstName || ""} ${log.lastName || ""}`.trim();
      const drillTitle = log.drillTitle || "";
      const searchLower = searchQuery.toLowerCase();

      const matchesSearch =
        !searchQuery ||
        playerName.toLowerCase().includes(searchLower) ||
        drillTitle.toLowerCase().includes(searchLower);

      const matchesCategory =
        categoryFilter === "all" || log.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [mergedLogs, searchQuery, categoryFilter]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" data-testid="loading-logs">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">
          Training Logs
        </h1>
        <Badge variant="secondary" data-testid="badge-log-count">
          {filteredLogs.length}
        </Badge>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player or drill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-logs"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DRILL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium" data-testid="text-empty-state">
              No training logs found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Training logs from your players will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-training-logs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Player</th>
                    <th className="px-4 py-2 font-medium">Drill</th>
                    <th className="px-4 py-2 font-medium hidden sm:table-cell">Category</th>
                    <th className="px-4 py-2 font-medium hidden md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Duration
                      </span>
                    </th>
                    <th className="px-4 py-2 font-medium hidden md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> Score
                      </span>
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Date
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => {
                    const playerName =
                      log.playerName ||
                      `${log.firstName || ""} ${log.lastName || ""}`.trim() ||
                      "Unknown";
                    const drillTitle = log.drillTitle || "—";
                    const logDate = log.completedAt || log.createdAt || log.date;

                    return (
                      <tr
                        key={log.id || idx}
                        className="border-b last:border-0 hover-elevate"
                        data-testid={`row-log-${log.id || idx}`}
                      >
                        <td className="px-4 py-2.5 font-medium" data-testid={`text-player-${log.id || idx}`}>
                          {playerName}
                        </td>
                        <td className="px-4 py-2.5" data-testid={`text-drill-${log.id || idx}`}>
                          {drillTitle}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          {log.category ? (
                            <Badge variant="outline" data-testid={`badge-category-${log.id || idx}`}>
                              {log.category
                                .split("-")
                                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" ")}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">
                          {formatDuration(log.duration)}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          {log.score != null ? (
                            <span className="font-medium">{log.score}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatDate(logDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
