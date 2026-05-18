import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getObjectUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, Clock, Users, Trophy, Medal, Target, Flame } from "lucide-react";
import type { LeaderboardChallenge, LCStatus } from "@shared/schema";
import { track } from "@/lib/track";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  username: string | null;
  score: number;
  isCurrentUser: boolean;
};

type ChallengeDetail = LeaderboardChallenge & {
  status: LCStatus;
  participantCount: number;
  isJoined: boolean;
};

const STATUS_BADGE: Record<LCStatus, { label: string; cls: string }> = {
  draft:     { label: "Draft",       cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Coming soon", cls: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  live:      { label: "Live now",    cls: "bg-green-500/20 text-green-300 border-green-500/40 animate-pulse" },
  finished:  { label: "Finished",    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
};

const METRIC_LABELS: Record<string, string> = {
  shots_made: "Shots Made",
  shots_attempted: "Shots Attempted",
  sessions: "Sessions",
  duration_minutes: "Practice Minutes",
};

function formatRange(s: Date | string, e: Date | string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(s).toLocaleDateString(undefined, opts)} → ${new Date(e).toLocaleDateString(undefined, opts)}`;
}

function countdown(target: Date | string) {
  const t = new Date(target).getTime() - Date.now();
  if (t <= 0) return null;
  const days = Math.floor(t / 86_400_000);
  const hours = Math.floor((t % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((t % 3_600_000) / 60_000);
  return `${hours}h ${mins}m`;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-zinc-300" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
  return <span className="text-sm text-muted-foreground font-mono w-4 text-center">{rank}</span>;
}

export default function ChallengeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: challenge, isLoading } = useQuery<ChallengeDetail>({
    queryKey: [`/api/leaderboard-challenges/${slug}`],
  });

  const { data: leaderboard, isLoading: lbLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/leaderboard-challenges/${challenge?.id}/leaderboard`],
    enabled: !!challenge?.id,
    refetchInterval: challenge?.status === "live" ? 30_000 : false,
  });

  useEffect(() => {
    if (challenge) track("challenge_view", { slug });
  }, [challenge, slug]);

  const joinMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/leaderboard-challenges/${challenge!.id}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leaderboard-challenges/${slug}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leaderboard-challenges/${challenge!.id}/leaderboard`] });
      toast({ title: "You're in!", description: "Your training logs will count toward the leaderboard." });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't join", description: err?.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-40" />
        <p className="text-lg font-semibold">Challenge not found</p>
      </div>
    );
  }

  const accent = challenge.accentColor || "#f97316";
  const sb = STATUS_BADGE[challenge.status];
  const cd = challenge.status === "scheduled" ? countdown(challenge.startsAt)
    : challenge.status === "live" ? countdown(challenge.endsAt) : null;
  const cdLabel = challenge.status === "scheduled" ? "Starts in" : "Ends in";
  const myEntry = leaderboard?.find(e => e.isCurrentUser);

  return (
    <div className="min-h-screen pb-12" data-testid="page-challenge-detail">
      {/* Hero */}
      <div
        className="relative overflow-hidden border-b border-border/40"
        style={{
          background: challenge.coverImageUrl
            ? `linear-gradient(115deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%), url("${getObjectUrl(challenge.coverImageUrl)}") center/cover no-repeat`
            : `linear-gradient(135deg, ${accent}cc 0%, ${accent}44 60%, transparent 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative max-w-3xl mx-auto px-4 py-10 md:py-14">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className={`backdrop-blur-md ${sb.cls}`}>{sb.label}</Badge>
            {challenge.shotLocation && (
              <Badge variant="outline" className="backdrop-blur-md border-white/20 text-white/80">
                <Target className="w-3 h-3 mr-1" />
                {challenge.shotLocation.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-md"
            data-testid="text-challenge-title">{challenge.title}</h1>
          {challenge.tagline && (
            <p className="text-lg text-white/80 mt-2">{challenge.tagline}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4" />
              {formatRange(challenge.startsAt, challenge.endsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {challenge.participantCount ?? 0} joined
            </span>
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              {METRIC_LABELS[challenge.metric]}
            </span>
            {cd && (
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Clock className="w-4 h-4" />
                {cdLabel}: {cd}
              </span>
            )}
          </div>
          {challenge.description && (
            <p className="text-white/70 text-sm mt-4 max-w-xl">{challenge.description}</p>
          )}

          {user && challenge.status !== "finished" && !challenge.isJoined && (
            <Button
              size="lg"
              className="mt-6 font-semibold"
              style={{ background: accent, color: "white" }}
              onClick={() => joinMut.mutate()}
              disabled={joinMut.isPending}
              data-testid="button-join-challenge"
            >
              <Flame className="w-5 h-5 mr-2" />
              {joinMut.isPending ? "Joining…" : "Join Challenge"}
            </Button>
          )}
          {challenge.isJoined && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium border border-white/20">
              <Trophy className="w-4 h-4" />
              You're competing · {myEntry ? `#${myEntry.rank} · ${myEntry.score} pts` : "Keep training!"}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Leaderboard</h2>
          {challenge.status === "live" && (
            <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">Live</Badge>
          )}
        </div>

        {lbLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (leaderboard ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No entries yet</p>
              <p className="text-sm mt-1">
                {challenge.status === "scheduled"
                  ? "The challenge hasn't started yet."
                  : "Join and start training to claim the top spot!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(leaderboard ?? []).map(entry => (
              <Card
                key={entry.userId}
                className={`overflow-hidden ${entry.isCurrentUser ? "ring-2 ring-primary/50" : ""}`}
                data-testid={`row-leaderboard-${entry.rank}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 flex items-center justify-center shrink-0">
                    <RankIcon rank={entry.rank} />
                  </div>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={entry.profileImageUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {[entry.firstName, entry.lastName].filter(Boolean).map(n => n![0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-none">
                      {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || entry.username || "Player"}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-primary font-normal">(you)</span>
                      )}
                    </div>
                    {entry.username && (
                      <div className="text-xs text-muted-foreground mt-0.5">@{entry.username}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold leading-none" style={{ color: accent }}>
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {METRIC_LABELS[challenge.metric]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!user && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">Log in to join this challenge and appear on the leaderboard.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
