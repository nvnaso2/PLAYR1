import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { nativeFetch } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, ArrowLeft, Calendar, Timer, Share2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkoutShareDialog } from "@/components/workout-share-dialog";

interface HistoryEntry {
  challengeDate: string;
  drill: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    duration?: number;
    isAiGenerated?: boolean;
  };
  trainingLogId?: string | null;
  completed?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  shooting: "text-orange-400",
  "ball-handling": "text-blue-400",
  passing: "text-green-400",
  conditioning: "text-red-400",
  workout: "text-purple-400",
  defense: "text-yellow-400",
  finishing: "text-emerald-400",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  elite: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatCategory(cat: string) {
  return cat.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diffMs = today.getTime() - d.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  return m > 0 ? `~${m}m` : `${seconds}s`;
}

export default function ChallengeHistory() {
  const [, navigate] = useLocation();
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { data: history, isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["/api/daily-challenge/history"],
    queryFn: async () => {
      const res = await nativeFetch("/api/daily-challenge/history?limit=60");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleShare = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setShareSessionId(sessionId);
    setShowShareDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="shrink-0"
            data-testid="btn-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Challenge Archive
            </h1>
            <p className="text-sm text-muted-foreground">Every daily streak challenge, ever</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card animate-pulse h-20" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!history || history.length === 0) && (
          <div className="text-center py-20 text-muted-foreground">
            <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No challenges yet</p>
            <p className="text-sm mt-1">Check back once the daily challenge starts.</p>
          </div>
        )}

        {/* List */}
        {history && history.length > 0 && (
          <div className="space-y-2">
            {history.map((entry, idx) => {
              const isToday = idx === 0 && formatDate(entry.challengeDate) === "Today";
              const hasSession = !!entry.trainingLogId;
              return (
                <div
                  key={entry.challengeDate}
                  className={cn(
                    "w-full rounded-xl border p-4 flex items-center gap-4 transition-colors",
                    isToday ? "border-orange-500/40 bg-orange-500/5" : "border-border bg-card"
                  )}
                  data-testid={`challenge-history-row-${entry.challengeDate}`}
                >
                  {/* Date + streak icon — clickable to start a new session */}
                  <button
                    className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 transition-opacity hover:opacity-70",
                      isToday ? "bg-orange-500/20" : "bg-muted"
                    )}
                    onClick={() => navigate(`/log?drill=${entry.drill.id}`)}
                    data-testid={`challenge-start-${entry.challengeDate}`}
                  >
                    <span className="text-lg leading-none">🔥</span>
                    <span className={cn("text-[10px] font-bold mt-0.5 uppercase tracking-wide", isToday ? "text-orange-400" : "text-muted-foreground")}>
                      {isToday ? "Today" : new Date(entry.challengeDate + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </span>
                  </button>

                  {/* Info — clickable to start a new session */}
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/log?drill=${entry.drill.id}`)}
                    data-testid={`challenge-info-${entry.challengeDate}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm leading-tight truncate" data-testid={`challenge-title-${entry.challengeDate}`}>
                        {entry.drill.title}
                      </p>
                      {entry.completed && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn("text-[11px] font-medium", CATEGORY_COLORS[entry.drill.category] || "text-muted-foreground")}>
                        {formatCategory(entry.drill.category)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-4 border capitalize", DIFFICULTY_COLORS[entry.drill.difficulty] || "")}
                      >
                        {entry.drill.difficulty}
                      </Badge>
                      {formatDuration(entry.drill.duration) && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Timer className="w-2.5 h-2.5" />
                          {formatDuration(entry.drill.duration)}
                        </span>
                      )}
                      {!isToday && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(entry.challengeDate)}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Share button — the API also accepts legacy single-log IDs. */}
                  {hasSession && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => handleShare(e, entry.trainingLogId!)}
                      data-testid={`challenge-share-${entry.challengeDate}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share dialog */}
      <WorkoutShareDialog
        open={showShareDialog}
        onOpenChange={(open) => {
          setShowShareDialog(open);
          if (!open) setShareSessionId(null);
        }}
        workoutSessionId={shareSessionId}
        defaultTab="workout"
      />
    </div>
  );
}
