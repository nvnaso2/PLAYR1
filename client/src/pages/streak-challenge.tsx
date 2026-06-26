import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChevronLeft, Flame, Trophy, Medal, Star, Target, Users, CalendarDays,
  Play, Plus, CheckCircle2, Info, Video,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StreakChallenge, StreakChallengeParticipant, StreakChallengeAttempt } from "@shared/schema";

type ChallengeDetail = {
  challenge: StreakChallenge;
  participantCount: number;
  myParticipation: (StreakChallengeParticipant & { recentAttempts: StreakChallengeAttempt[] }) | null;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  personalGoal: number;
  bestRecord: number;
  dayNumber: number;
  percentToGoal: number;
};

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center inline-block">{rank}</span>;
}

function ProgressRing({ percent, size = 80, stroke = 7, color = "#f97316" }: {
  percent: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700"
      />
    </svg>
  );
}

export default function StreakChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [leaderSort, setLeaderSort] = useState<"best" | "closest" | "percent">("best");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const [joinForm, setJoinForm] = useState({ personalGoal: 50, dayNumber: 1, isDaily: false });
  const [attemptForm, setAttemptForm] = useState({
    score: "",
    note: "",
    videoUrl: "",
    attemptDate: new Date().toISOString().slice(0, 10),
  });

  const { data, isLoading } = useQuery<ChallengeDetail>({
    queryKey: ["/api/streak-challenges", slug],
    queryFn: async () => {
      const res = await fetch(`/api/streak-challenges/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: leaderboard, isLoading: leaderLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/streak-challenges", slug, "leaderboard", leaderSort],
    queryFn: async () => {
      const res = await fetch(`/api/streak-challenges/${slug}/leaderboard?sort=${leaderSort}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/streak-challenges/${slug}/join`, joinForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug, "leaderboard", leaderSort] });
      setShowJoinForm(false);
      toast({ title: "You're in!", description: "Your progress is now on the leaderboard." });
    },
    onError: () => toast({ title: "Error", description: "Could not join. Please try again.", variant: "destructive" }),
  });

  const attemptMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/streak-challenges/${slug}/attempt`, {
      score: Number(attemptForm.score),
      note: attemptForm.note || undefined,
      videoUrl: attemptForm.videoUrl || undefined,
      attemptDate: attemptForm.attemptDate,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug, "leaderboard", leaderSort] });
      setShowLogModal(false);
      setAttemptForm({ score: "", note: "", videoUrl: "", attemptDate: new Date().toISOString().slice(0, 10) });
      const isNewRecord = res?.attempt?.isNewRecord;
      toast({
        title: isNewRecord ? "🏆 New Personal Record!" : "Attempt logged!",
        description: isNewRecord
          ? `${attemptForm.score} consecutive makes — your new best!`
          : `${attemptForm.score} makes logged.`,
      });
    },
    onError: () => toast({ title: "Error", description: "Could not log attempt.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Challenge not found.</p>
        <Link href="/events"><Button variant="ghost" className="mt-4"><ChevronLeft className="w-4 h-4 mr-1" />Back to Compete</Button></Link>
      </div>
    );
  }

  const { challenge, participantCount, myParticipation } = data;
  const accent = challenge.accentColor || "#f97316";
  const myPercent = myParticipation
    ? Math.min(Math.round((myParticipation.bestRecord / myParticipation.personalGoal) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen pb-16" data-testid="page-streak-challenge">

      {/* ─── Hero Banner ─── */}
      <div
        className="relative overflow-hidden border-b border-border/40"
        style={{
          background: `linear-gradient(135deg, ${accent}22 0%, transparent 60%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
        />
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: accent }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <Link href="/events">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground" data-testid="button-back-compete">
              <ChevronLeft className="w-4 h-4 mr-1" />Compete
            </Button>
          </Link>

          <div className="flex items-start gap-3 mb-2">
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 animate-pulse">
              <Flame className="w-3 h-3 mr-1" />Live Challenge
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              <Users className="w-3 h-3 mr-1" />{participantCount} players
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1" data-testid="text-challenge-title">
            {challenge.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
            {challenge.description}
          </p>

          {challenge.rules && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 w-fit hover:text-foreground transition-colors">
                <Info className="w-3 h-3" />Rules & how it works
              </summary>
              <p className="text-xs text-muted-foreground mt-2 max-w-xl leading-relaxed">{challenge.rules}</p>
            </details>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

          {/* ─── Left: My Progress / Join ─── */}
          <div className="space-y-4">

            {myParticipation ? (
              /* ─── My Stats Card ─── */
              <Card className="border-border/60 overflow-hidden" data-testid="card-my-progress">
                <div className="h-1 w-full" style={{ background: accent }} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">My Progress</h2>
                    <Button
                      size="sm"
                      onClick={() => setShowLogModal(true)}
                      className="text-xs"
                      style={{ background: accent }}
                      data-testid="button-log-attempt"
                    >
                      <Plus className="w-3 h-3 mr-1" />Log Attempt
                    </Button>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <ProgressRing percent={myPercent} size={90} color={accent} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold leading-none" data-testid="text-my-best-record">{myParticipation.bestRecord}</span>
                        <span className="text-[10px] text-muted-foreground">best</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div>
                        <p className="text-xs text-muted-foreground">Personal goal</p>
                        <p className="font-semibold" data-testid="text-personal-goal">{myParticipation.personalGoal} in a row</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="font-semibold">{myPercent}% to goal</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Day</p>
                        <p className="font-semibold">#{myParticipation.dayNumber}</p>
                      </div>
                    </div>
                  </div>

                  {myParticipation.recentAttempts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Attempts</p>
                      {myParticipation.recentAttempts.slice(0, 3).map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm" data-testid={`row-attempt-${a.id}`}>
                          <div className="flex items-center gap-2">
                            {a.isNewRecord && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                            <span className="text-muted-foreground text-xs">{a.attemptDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.videoUrl && <Video className="w-3 h-3 text-blue-400" />}
                            <span className="font-semibold">{a.score}</span>
                            <span className="text-muted-foreground text-xs">makes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* ─── Join Card ─── */
              <Card className="border-border/60 overflow-hidden" data-testid="card-join-challenge">
                <div className="h-1 w-full" style={{ background: accent }} />
                <CardContent className="p-5">
                  {!showJoinForm ? (
                    <div className="text-center py-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: `${accent}22` }}
                      >
                        <Target className="w-8 h-8" style={{ color: accent }} />
                      </div>
                      <h2 className="font-bold text-lg mb-1">Join the Challenge</h2>
                      <p className="text-sm text-muted-foreground mb-5">
                        Set your personal goal and start logging your best streaks. Leaderboard is public.
                      </p>
                      <Button
                        className="w-full"
                        style={{ background: accent }}
                        onClick={() => setShowJoinForm(true)}
                        data-testid="button-start-join"
                      >
                        <Play className="w-4 h-4 mr-2" />Enter the Challenge
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h2 className="font-bold text-base">Set Up Your Challenge</h2>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Your personal goal (consecutive makes)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={joinForm.personalGoal}
                          onChange={(e) => setJoinForm((f) => ({ ...f, personalGoal: Number(e.target.value) }))}
                          className="text-center font-bold text-xl h-12"
                          data-testid="input-personal-goal"
                        />
                        <p className="text-[11px] text-muted-foreground">Default is {challenge.defaultGoal}. Set your own target.</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">What day are you on? <span className="text-muted-foreground/60">(optional)</span></Label>
                        <Input
                          type="number"
                          min={1}
                          value={joinForm.dayNumber}
                          onChange={(e) => setJoinForm((f) => ({ ...f, dayNumber: Number(e.target.value) }))}
                          data-testid="input-day-number"
                        />
                        <p className="text-[11px] text-muted-foreground">If you've already started, enter which day you're on.</p>
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-border/40">
                        <div>
                          <p className="text-sm font-medium">Daily challenge mode</p>
                          <p className="text-[11px] text-muted-foreground">Attempt every day</p>
                        </div>
                        <Switch
                          checked={joinForm.isDaily}
                          onCheckedChange={(v) => setJoinForm((f) => ({ ...f, isDaily: v }))}
                          data-testid="toggle-daily-mode"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowJoinForm(false)}
                          data-testid="button-cancel-join"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          style={{ background: accent }}
                          onClick={() => joinMutation.mutate()}
                          disabled={joinMutation.isPending}
                          data-testid="button-confirm-join"
                        >
                          {joinMutation.isPending ? "Joining…" : "Join Challenge"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ─── Video Upload Note ─── */}
            <Card className="border-border/40 bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4 flex gap-3">
                <Video className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Share your footage</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    When logging an attempt, paste a link to your video (YouTube, TikTok, Instagram).
                    Outstanding clips may be featured in creator content.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Right: Leaderboard ─── */}
          <div>
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="px-5 pt-5 pb-3 border-b border-border/40">
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />Leaderboard
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">All players — public ranking</p>
                </div>

                <Tabs value={leaderSort} onValueChange={(v) => setLeaderSort(v as any)} className="px-3 pt-3">
                  <TabsList className="w-full grid grid-cols-3 h-8 text-xs" data-testid="tabs-leaderboard-sort">
                    <TabsTrigger value="best" className="text-xs" data-testid="tab-sort-best">Best Record</TabsTrigger>
                    <TabsTrigger value="closest" className="text-xs" data-testid="tab-sort-closest">Closest</TabsTrigger>
                    <TabsTrigger value="percent" className="text-xs" data-testid="tab-sort-percent">% to Goal</TabsTrigger>
                  </TabsList>

                  <TabsContent value={leaderSort} className="mt-0">
                    {leaderLoading ? (
                      <div className="space-y-3 px-2 py-4">
                        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                      </div>
                    ) : !leaderboard?.length ? (
                      <div className="py-12 text-center" data-testid="text-leaderboard-empty">
                        <Trophy className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                        <p className="text-sm text-muted-foreground">No entries yet — be first!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30 pb-2" data-testid="list-leaderboard">
                        {leaderboard.map((entry) => {
                          const isMe = myParticipation?.userId === entry.userId;
                          return (
                            <div
                              key={entry.userId}
                              className={`flex items-center gap-3 px-3 py-3 ${isMe ? "bg-primary/5 rounded-lg" : ""}`}
                              data-testid={`row-leaderboard-${entry.userId}`}
                            >
                              <div className="w-5 flex-shrink-0 flex items-center justify-center">
                                {rankIcon(entry.rank)}
                              </div>
                              <Avatar className="w-9 h-9 flex-shrink-0">
                                <AvatarImage src={entry.profilePhotoUrl ?? undefined} />
                                <AvatarFallback className="text-xs">{entry.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                                  {entry.displayName}{isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Goal: {entry.personalGoal} · Day #{entry.dayNumber}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-sm" data-testid={`text-score-${entry.userId}`}>
                                  {leaderSort === "percent" ? `${entry.percentToGoal}%` : entry.bestRecord}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {leaderSort === "percent" ? "to goal" : leaderSort === "closest" ? `${entry.personalGoal - entry.bestRecord} to go` : "best"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── Log Attempt Modal ─── */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md" data-testid="modal-log-attempt">
          <DialogHeader>
            <DialogTitle>Log an Attempt</DialogTitle>
            <DialogDescription>
              How many consecutive 3-pointers did you make this session?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="attempt-score">Consecutive makes <span className="text-red-400">*</span></Label>
              <Input
                id="attempt-score"
                type="number"
                min={0}
                placeholder="e.g. 23"
                value={attemptForm.score}
                onChange={(e) => setAttemptForm((f) => ({ ...f, score: e.target.value }))}
                className="text-2xl font-bold text-center h-14"
                data-testid="input-attempt-score"
              />
              {myParticipation && (
                <p className="text-xs text-muted-foreground text-center">
                  Your best so far: <strong>{myParticipation.bestRecord}</strong>
                  {Number(attemptForm.score) > myParticipation.bestRecord && Number(attemptForm.score) > 0 && (
                    <span className="text-yellow-400 ml-2 font-semibold">🏆 New record!</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attempt-date">Date</Label>
              <Input
                id="attempt-date"
                type="date"
                value={attemptForm.attemptDate}
                onChange={(e) => setAttemptForm((f) => ({ ...f, attemptDate: e.target.value }))}
                data-testid="input-attempt-date"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attempt-video" className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-400" />
                Video link <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="attempt-video"
                type="url"
                placeholder="YouTube, TikTok, Instagram link…"
                value={attemptForm.videoUrl}
                onChange={(e) => setAttemptForm((f) => ({ ...f, videoUrl: e.target.value }))}
                data-testid="input-attempt-video"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
                Great clips may be featured in creator content. Paste any public video link.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attempt-note">
                Note <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="attempt-note"
                placeholder="How did it feel? Any context…"
                value={attemptForm.note}
                onChange={(e) => setAttemptForm((f) => ({ ...f, note: e.target.value }))}
                className="resize-none h-20"
                data-testid="input-attempt-note"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLogModal(false)}
                data-testid="button-cancel-attempt"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                style={{ background: accent }}
                onClick={() => attemptMutation.mutate()}
                disabled={attemptMutation.isPending || !attemptForm.score}
                data-testid="button-submit-attempt"
              >
                {attemptMutation.isPending ? "Saving…" : (
                  <><CheckCircle2 className="w-4 h-4 mr-1.5" />Log Attempt</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
