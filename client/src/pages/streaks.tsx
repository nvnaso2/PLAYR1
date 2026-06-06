import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, ChevronLeft, Medal } from "lucide-react";
import { getObjectUrl } from "@/lib/queryClient";

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  currentStreak: number;
  profilePhotoUrl: string | null;
};

type StreakStats = {
  currentStreak: number;
  longestStreak: number;
};

export function getStreakLevel(n: number) {
  if (n >= 30) return { label: "Legendary", flames: 3, color: "text-red-400", bg: "bg-red-500/20", border: "border-red-400/40", animate: true };
  if (n >= 14) return { label: "Inferno",   flames: 3, color: "text-orange-300", bg: "bg-orange-500/20", border: "border-orange-400/40", animate: true };
  if (n >= 7)  return { label: "On Fire",   flames: 2, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-400/30", animate: false };
  if (n >= 3)  return { label: "Heating Up",flames: 1, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", animate: false };
  return       { label: "Warming Up",       flames: 1, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", animate: false };
}

export default function StreaksPage() {
  const { user } = useAuth();

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/streak/leaderboard"],
    enabled: !!user,
  });

  const { data: myStats } = useQuery<StreakStats>({
    queryKey: ["/api/streak/me"],
    enabled: !!user,
  });

  const myStreak = myStats?.currentStreak ?? 0;
  const myLongest = myStats?.longestStreak ?? 0;
  const level = getStreakLevel(myStreak);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-orange-950/30 to-transparent px-4 pt-8 pb-7">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Streak Leaderboard</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Heat Check</h1>
          <p className="text-muted-foreground text-sm mt-1">Who's on the biggest training runs right now</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {myStreak > 0 && (
          <Card className={`overflow-hidden border ${level.border} ${level.bg}`} data-testid="card-my-streak">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Your Streak</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-5xl font-black ${level.color}`}>{myStreak}</span>
                    <div className="space-y-1">
                      <p className="text-xl leading-none">{"🔥".repeat(level.flames)}</p>
                      <Badge variant="outline" className={`text-[10px] ${level.border} ${level.color}`}>{level.label}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Personal best: {myLongest} days</p>
                </div>
                <div className={`w-20 h-20 rounded-2xl ${level.bg} border ${level.border} flex items-center justify-center`}>
                  <Flame className={`w-10 h-10 ${level.color} ${level.animate ? "animate-pulse" : ""}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {myStreak === 0 && (
          <Card className="border-border/60" data-testid="card-no-streak">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 flex items-center justify-center shrink-0">
                <Flame className="w-7 h-7 text-zinc-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">No streak yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Log a session today to start your streak!</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" /> Top Streaks
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(leaderboard ?? []).map((entry, idx) => {
                const lvl = getStreakLevel(entry.currentStreak);
                const isMe = entry.userId === user?.id;
                return (
                  <Card
                    key={entry.userId}
                    className={`border-border/60 ${isMe ? `${lvl.bg} ${lvl.border}` : ""}`}
                    data-testid={`row-leaderboard-${idx}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-none w-7 text-center">
                        {idx === 0 ? <Medal className="w-5 h-5 text-yellow-400 mx-auto" /> :
                         idx === 1 ? <Medal className="w-5 h-5 text-zinc-300 mx-auto" /> :
                         idx === 2 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                         <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>}
                      </div>
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={entry.profilePhotoUrl ? getObjectUrl(entry.profilePhotoUrl) : undefined} />
                        <AvatarFallback className="text-xs bg-orange-500/20 text-orange-400">
                          {entry.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {entry.displayName ?? "Player"}{isMe ? " (You)" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{"🔥".repeat(lvl.flames)} {lvl.label}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Flame className={`w-4 h-4 ${lvl.color}`} />
                        <span className={`font-bold text-base ${lvl.color}`}>{entry.currentStreak}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {(!leaderboard || leaderboard.length === 0) && (
                <Card className="border-border/60">
                  <CardContent className="p-8 text-center">
                    <Flame className="w-10 h-10 text-orange-500/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No active streaks yet.</p>
                    <p className="text-muted-foreground text-xs mt-1">Log a session to start yours!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
