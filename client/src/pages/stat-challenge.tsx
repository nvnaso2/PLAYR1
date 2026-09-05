import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart2, CalendarRange, ChevronLeft, Flame, Medal, Target, Trophy,
} from "lucide-react";
import type { StatChallenge } from "@shared/schema";
import { STAT_CHALLENGE_METRIC_LABELS } from "@shared/schema";

const SHOT_LOCATION_LABELS: Record<string, string> = {
  "free-throw":    "Free Throw Line",
  "corner-left":   "Corner Left (3pt)",
  "corner-right":  "Corner Right (3pt)",
  "top-of-key":    "Top of the Key (3pt)",
  "wing-left":     "Wing Left (3pt)",
  "wing-right":    "Wing Right (3pt)",
  "1st-hash-left": "1st Hash Left",
  "1st-hash-right":"1st Hash Right",
  "2nd-hash-left": "2nd Hash Left",
  "2nd-hash-right":"2nd Hash Right",
  "3rd-hash-left": "3rd Hash Left",
  "3rd-hash-right":"3rd Hash Right",
  "block-left":    "Block Left",
  "block-right":   "Block Right",
  "mid-range-left":"Mid-Range Left",
  "mid-range-right":"Mid-Range Right",
};

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  score: number;
};

function getStatus(c: StatChallenge) {
  if (!c.isPublished) return { label: "Draft", color: "text-muted-foreground", cls: "bg-muted text-muted-foreground" };
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end   = new Date(c.endsAt).getTime();
  if (now < start) return { label: "Coming soon", color: "text-blue-400", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (now > end)   return { label: "Finished",    color: "text-zinc-400",  cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  return { label: "Live now", color: "text-green-400", cls: "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse" };
}

function formatRange(s: string | Date, e: string | Date) {
  const fmt = (d: string | Date) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 text-center text-sm text-muted-foreground font-semibold inline-block">{rank}</span>;
}

function scoreLabel(metric: string, score: number) {
  if (metric === "sessions")       return `${score} session${score !== 1 ? "s" : ""}`;
  if (metric === "total_minutes")  return `${score} min`;
  return `${score} made`;
}

export default function StatChallengePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: challenge, isLoading: loadingChallenge } = useQuery<StatChallenge>({
    queryKey: ["/api/stat-challenges", slug],
    queryFn: async () => {
      const res = await fetch(`/api/stat-challenges/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: leaderboard, isLoading: loadingBoard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/stat-challenges", slug, "leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/stat-challenges/${slug}/leaderboard`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!challenge,
    refetchInterval: 60_000,
  });

  if (loadingChallenge) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
          <p className="text-lg font-semibold">Challenge not found</p>
          <Link href="/events">
            <Button variant="outline">Back to Compete</Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = getStatus(challenge);
  const accent = challenge.accentColor || "#f97316";
  const metricLabel = STAT_CHALLENGE_METRIC_LABELS[challenge.metric as keyof typeof STAT_CHALLENGE_METRIC_LABELS] ?? challenge.metric;
  const locationLabel = challenge.shotLocationFilter ? SHOT_LOCATION_LABELS[challenge.shotLocationFilter] ?? challenge.shotLocationFilter : null;

  return (
    <div className="min-h-screen pb-16" data-testid="page-stat-challenge">
      {/* Hero */}
      <div
        className="relative overflow-hidden border-b border-border/40"
        style={{ background: `linear-gradient(135deg, ${accent}33 0%, ${accent}11 50%, transparent 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Link href="/events">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground" data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-1" /> Compete
            </Button>
          </Link>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: accent }}
            >
              <BarChart2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={status.cls} data-testid="badge-challenge-status">
                  {status.label === "Live now" && <Flame className="w-3 h-3 mr-1" />}
                  {status.label}
                </Badge>
                <Badge variant="outline" className="text-xs border-border/50">
                  <Target className="w-3 h-3 mr-1" />
                  Stat Challenge
                </Badge>
              </div>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight"
                data-testid="text-challenge-title"
              >
                {challenge.title}
              </h1>
              {challenge.description && (
                <p className="text-muted-foreground mt-2 max-w-xl" data-testid="text-challenge-desc">
                  {challenge.description}
                </p>
              )}
            </div>
          </div>

          {/* Info strips */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card/60 backdrop-blur border border-border/40 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tracking</p>
              <p className="font-semibold text-sm">{metricLabel}</p>
              {locationLabel && <p className="text-xs text-primary mt-0.5">@ {locationLabel}</p>}
            </div>
            <div className="bg-card/60 backdrop-blur border border-border/40 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Window</p>
              <p className="font-semibold text-sm flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" />
                {formatRange(challenge.startsAt, challenge.endsAt)}
              </p>
            </div>
            <div className="bg-card/60 backdrop-blur border border-border/40 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entries</p>
              <p className="font-semibold text-sm">{leaderboard?.length ?? "—"} players</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Leaderboard</h2>
          {status.label === "Live now" && (
            <Badge variant="outline" className="text-xs text-green-400 border-green-500/30 ml-auto animate-pulse">
              Live · refreshes every 60s
            </Badge>
          )}
        </div>

        {loadingBoard ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (leaderboard ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center" data-testid="text-leaderboard-empty">
              <BarChart2 className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
              <p className="font-semibold">No entries yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Log a training session during the challenge window to appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" data-testid="list-leaderboard">
            {(leaderboard ?? []).map((entry, idx) => {
              const rank = idx + 1;
              const initials = entry.displayName.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
              const isTop3 = rank <= 3;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
                    rank === 1
                      ? "bg-yellow-500/8 border-yellow-500/20"
                      : rank === 2
                      ? "bg-zinc-400/5 border-zinc-500/20"
                      : rank === 3
                      ? "bg-amber-600/5 border-amber-600/20"
                      : "bg-card/50 border-border/40"
                  }`}
                  data-testid={`row-leaderboard-${rank}`}
                >
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {rankIcon(rank)}
                  </div>
                  <Avatar className={`shrink-0 ${isTop3 ? "w-10 h-10" : "w-9 h-9"}`}>
                    <AvatarImage src={entry.profilePhotoUrl ?? undefined} />
                    <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isTop3 ? "text-base" : "text-sm"}`} data-testid={`text-player-name-${rank}`}>
                      {entry.displayName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-bold tabular-nums ${isTop3 ? "text-xl" : "text-base"}`}
                      style={rank === 1 ? { color: accent } : undefined}
                      data-testid={`text-score-${rank}`}
                    >
                      {scoreLabel(challenge.metric, entry.score)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Stats auto-counted from training sessions logged during the challenge window.
          Log your shots in the Training tab to climb the board.
        </p>
      </div>
    </div>
  );
}
