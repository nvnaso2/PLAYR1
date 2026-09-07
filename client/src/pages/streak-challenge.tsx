import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChevronLeft, Flame, Trophy, Medal, Star, Target, Users,
  Play, Plus, CheckCircle2, Info, Video, Upload, Link2, X,
  Loader2, LogOut, ExternalLink, Film, Crown,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StreakChallenge, StreakChallengeParticipant, StreakChallengeAttempt } from "@shared/schema";

const SIGNATURE_CHALLENGE_RULES = "Shoot from behind the 3-point line until you miss. Log every session honestly and see how many you can make in a row. You can attempt it multiple times with your best scoring counting on the leaderboard. Optional: record your attempt and share the link to be featured in creator content.";

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
  recentScore: number | null;
  recordVideoUrl: string | null;
  attemptVideoUrl: string | null;
};

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-zinc-400" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
  return <span className="text-xs font-bold text-zinc-500 w-4 text-center inline-block">{rank}</span>;
}

function HoloRing({ percent, size = 88, stroke = 6, color = "#f97316" }: {
  percent: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}99)`, transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

async function uploadVideoFile(file: File): Promise<string> {
  const urlRes = await fetch("/api/user/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    credentials: "include",
  });
  if (!urlRes.ok) throw new Error("Could not get upload URL");
  const { uploadURL, objectPath } = await urlRes.json();
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed");
  return objectPath as string;
}

function VideoPlayer({ url }: { url: string }) {
  const isInternal = url.startsWith("/objects/");
  if (isInternal) {
    return (
      <video
        src={url}
        controls
        className="w-full rounded-lg mt-2 max-h-52 bg-black"
        playsInline
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-1"
    >
      <ExternalLink className="w-3 h-3" />View video
    </a>
  );
}

function VideoUploadSection({
  videoMode, setVideoMode,
  selectedFile, setSelectedFile,
  videoUrl, setVideoUrl,
  fileInputRef,
}: {
  videoMode: "file" | "link";
  setVideoMode: (m: "file" | "link") => void;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  videoUrl: string;
  setVideoUrl: (u: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        <button
          type="button"
          onClick={() => setVideoMode("file")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${videoMode === "file" ? "bg-blue-500/20 text-blue-300" : "text-zinc-500 hover:bg-white/5"}`}
          data-testid="button-video-file-mode"
        >
          <Upload className="w-3.5 h-3.5" />Upload from device
        </button>
        <button
          type="button"
          onClick={() => setVideoMode("link")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${videoMode === "link" ? "bg-blue-500/20 text-blue-300" : "text-zinc-500 hover:bg-white/5"}`}
          data-testid="button-video-link-mode"
        >
          <Link2 className="w-3.5 h-3.5" />Paste a link
        </button>
      </div>
      {videoMode === "file" ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            data-testid="input-video-file"
          />
          {selectedFile ? (
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
              <Video className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-300 flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-white/10 py-4 flex flex-col items-center gap-1.5 text-zinc-500 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
              data-testid="button-select-video"
            >
              <Upload className="w-5 h-5" />
              <span className="text-xs">Tap to select from photo library or files</span>
            </button>
          )}
        </div>
      ) : (
        <Input
          type="url"
          placeholder="YouTube, TikTok, Instagram link…"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="bg-black border-white/10 text-white focus:border-blue-500/50 placeholder:text-zinc-700"
          data-testid="input-attempt-video"
        />
      )}
    </div>
  );
}

export default function StreakChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [challengeView, setChallengeView] = useState<"progress" | "leaderboard">("progress");
  const [leaderSort, setLeaderSort] = useState<"best" | "closest" | "percent">("best");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showLeaveConfirm1, setShowLeaveConfirm1] = useState(false);
  const [showLeaveConfirm2, setShowLeaveConfirm2] = useState(false);
  const [showRecordVideoModal, setShowRecordVideoModal] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  // Attempt form state
  const [attemptForm, setAttemptForm] = useState({
    score: "",
    attemptDate: new Date().toISOString().slice(0, 10),
    showOnLeaderboard: false,
    submitToCreator: false,
  });
  const [videoMode, setVideoMode] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Record video modal state
  const [rvMode, setRvMode] = useState<"file" | "link">("file");
  const [rvFile, setRvFile] = useState<File | null>(null);
  const [rvLink, setRvLink] = useState("");
  const [rvUploading, setRvUploading] = useState(false);
  const rvFileRef = useRef<HTMLInputElement>(null);

  // Join form state
  const [joinForm, setJoinForm] = useState({
    personalGoal: 10,
    currentBest: 0,
    dayNumber: 1,
    isDaily: false,
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
      toast({ title: "You're in!", description: "Your record is now on the leaderboard." });
    },
    onError: () => toast({ title: "Error", description: "Could not join. Please try again.", variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/streak-challenges/${slug}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug, "leaderboard", leaderSort] });
      setShowLeaveConfirm2(false);
      toast({ title: "Left challenge", description: "You've been removed. You can re-join anytime." });
    },
    onError: () => toast({ title: "Error", description: "Could not leave. Please try again.", variant: "destructive" }),
  });

  const attemptMutation = useMutation({
    mutationFn: async () => {
      let finalVideoUrl: string | undefined = videoMode === "link" ? videoUrl || undefined : undefined;
      if (videoMode === "file" && selectedFile) {
        setUploadingVideo(true);
        try {
          finalVideoUrl = await uploadVideoFile(selectedFile);
        } finally {
          setUploadingVideo(false);
        }
      }
      const hasVideo = Boolean(finalVideoUrl);
      return apiRequest("POST", `/api/streak-challenges/${slug}/attempt`, {
        score: Number(attemptForm.score),
        videoUrl: finalVideoUrl,
        attemptDate: attemptForm.attemptDate,
        showOnLeaderboard: hasVideo ? attemptForm.showOnLeaderboard : false,
        submitToCreator: hasVideo ? attemptForm.submitToCreator : false,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug, "leaderboard", leaderSort] });
      setShowLogModal(false);
      setAttemptForm({ score: "", attemptDate: new Date().toISOString().slice(0, 10), showOnLeaderboard: false, submitToCreator: false });
      setSelectedFile(null);
      setVideoUrl("");
      const isNewRecord = res?.attempt?.isNewRecord;
      toast({
        title: isNewRecord ? "🏆 New Personal Record!" : "Attempt logged!",
        description: isNewRecord ? `${attemptForm.score} consecutive makes — your new best!` : `${attemptForm.score} makes logged.`,
      });
    },
    onError: () => toast({ title: "Error", description: "Could not log attempt.", variant: "destructive" }),
  });

  const recordVideoMutation = useMutation({
    mutationFn: async () => {
      let finalUrl = rvMode === "link" ? rvLink : "";
      if (rvMode === "file" && rvFile) {
        setRvUploading(true);
        try { finalUrl = await uploadVideoFile(rvFile); }
        finally { setRvUploading(false); }
      }
      if (!finalUrl) throw new Error("No video");
      return apiRequest("PATCH", `/api/streak-challenges/${slug}/record-video`, { videoUrl: finalUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak-challenges", slug, "leaderboard", leaderSort] });
      setShowRecordVideoModal(false);
      setRvFile(null); setRvLink("");
      toast({ title: "Record video saved!", description: "It now appears on the leaderboard next to your name." });
    },
    onError: () => toast({ title: "Error", description: "Could not save video.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black px-4 py-8 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48 bg-zinc-900" />
        <Skeleton className="h-56 rounded-2xl bg-zinc-900" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl bg-zinc-900" />
          <Skeleton className="h-80 rounded-xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500">Challenge not found.</p>
        <Link href="/events">
          <Button variant="ghost" className="mt-4 text-zinc-400"><ChevronLeft className="w-4 h-4 mr-1" />Back to Compete</Button>
        </Link>
      </div>
    );
  }

  const { challenge, participantCount, myParticipation } = data;
  const accent = challenge.accentColor || "#f97316";
  const myPercent = myParticipation
    ? Math.min(Math.round((myParticipation.bestRecord / myParticipation.personalGoal) * 100), 100)
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayAttempt = myParticipation?.recentAttempts?.find((a) => a.attemptDate === today) ?? null;
  const latestAttempt = myParticipation?.recentAttempts?.[0] ?? null;
  const recentScore = todayAttempt ?? latestAttempt;
  const recentScoreLabel = todayAttempt ? "Today's Score" : myParticipation?.isDaily ? "Last Daily Score" : "Latest Score";

  const hasVideo = videoMode === "file" ? Boolean(selectedFile) : Boolean(videoUrl);
  const displayedRules = challenge.slug === "fifty-in-a-row" ? SIGNATURE_CHALLENGE_RULES : challenge.rules;

  return (
    <div className="min-h-screen bg-black pb-16" data-testid="page-streak-challenge">

      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden border-b border-zinc-800/80 bg-zinc-950">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-7">
          <Link href="/events">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-zinc-500 hover:text-white" data-testid="button-back-compete">
              <ChevronLeft className="w-4 h-4 mr-1" />Compete
            </Button>
          </Link>
          <div className="border-l-2 border-orange-400 pl-4 sm:pl-5" style={{ borderColor: accent }}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300">
                <Flame className="w-3 h-3 mr-1" aria-hidden="true" />Live now
              </Badge>
              <Badge className="border-white/10 bg-white/[0.04] text-zinc-400">
                <Users className="w-3 h-3 mr-1" aria-hidden="true" />{participantCount} players
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-heading uppercase tracking-wide leading-none text-white md:text-4xl" data-testid="text-challenge-title">
              {challenge.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">{challenge.description}</p>
            {displayedRules && (
              <details className="mt-3">
                <summary className="flex w-fit cursor-pointer items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300">
                  <Info className="h-3 w-3" aria-hidden="true" />Rules & how it works
                </summary>
                <p className="mt-2 max-w-xl border-l border-zinc-700 pl-3 text-xs leading-relaxed text-zinc-500">{displayedRules}</p>
              </details>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-zinc-950 p-1" role="tablist" aria-label="Challenge view">
          <Button
            type="button"
            variant="ghost"
            className={`h-10 rounded-lg text-sm font-semibold ${challengeView === "progress" ? "bg-orange-500/15 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"}`}
            onClick={() => setChallengeView("progress")}
            role="tab"
            aria-selected={challengeView === "progress"}
            data-testid="tab-challenge-progress"
          >
            <Target className="mr-2 h-4 w-4" />My Progress
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`h-10 rounded-lg text-sm font-semibold ${challengeView === "leaderboard" ? "bg-orange-500/15 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"}`}
            onClick={() => setChallengeView("leaderboard")}
            role="tab"
            aria-selected={challengeView === "leaderboard"}
            data-testid="tab-challenge-leaderboard"
          >
            <Trophy className="mr-2 h-4 w-4" />Leaderboard
          </Button>
        </div>

        <div>

          {/* ─── Left: My Progress / Join ─── */}
          <div className={challengeView === "progress" ? "mx-auto max-w-2xl space-y-4" : "hidden"}>
            {myParticipation ? (
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "linear-gradient(160deg,#0d0d0d 0%,#000 100%)", borderColor: `${accent}30` }}
                data-testid="card-my-progress"
              >
                <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">My Progress</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm" variant="ghost"
                        className="text-xs h-8 px-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setShowLeaveConfirm1(true)}
                        data-testid="button-leave-challenge"
                      >
                        <LogOut className="w-3 h-3 mr-1" />Leave
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs font-semibold h-8 px-3 rounded-lg"
                        style={{ background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 0 12px ${accent}55` }}
                        onClick={() => setShowLogModal(true)}
                        data-testid="button-log-attempt"
                      >
                        <Plus className="w-3 h-3 mr-1" />Log Attempt
                      </Button>
                    </div>
                  </div>

                  {/* Ring + stats */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <HoloRing percent={myPercent} color={accent} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black leading-none text-white" data-testid="text-my-best-record">{myParticipation.bestRecord}</span>
                        <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">best</span>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {[
                        { label: "Goal", value: myParticipation.personalGoal },
                        { label: "Day", value: `#${myParticipation.dayNumber}` },
                        { label: "To Go", value: Math.max(0, myParticipation.personalGoal - myParticipation.bestRecord) },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-white/[0.04] p-2 text-center border border-white/[0.04]">
                          <p className="text-lg font-bold text-white leading-tight">{value}</p>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wide mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span>0</span>
                      <span className="font-semibold" style={{ color: accent }}>{myPercent}% to goal</span>
                      <span>{myParticipation.personalGoal}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${myPercent}%`, background: `linear-gradient(90deg,${accent},${accent}cc)`, boxShadow: `0 0 8px ${accent}66` }} />
                    </div>
                  </div>

                  {/* Recent score */}
                  {recentScore && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{recentScoreLabel}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">{recentScore.score}</span>
                        <span className="text-xs text-zinc-500">makes</span>
                        {recentScore.isNewRecord && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                            <Star className="w-2.5 h-2.5 mr-0.5" />PR
                          </Badge>
                        )}
                        {recentScore.videoUrl && (
                          <button onClick={() => setExpandedVideo(expandedVideo === recentScore.id ? null : recentScore.id)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                            <Video className="w-3.5 h-3.5" />{expandedVideo === recentScore.id ? "hide" : "play"}
                          </button>
                        )}
                      </div>
                      {expandedVideo === recentScore.id && recentScore.videoUrl && <VideoPlayer url={recentScore.videoUrl} />}
                      <p className="text-[10px] text-zinc-600 mt-0.5">{recentScore.attemptDate}</p>
                    </div>
                  )}

                  {/* Attempt history */}
                  {myParticipation.recentAttempts.length > 1 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">History</p>
                      {myParticipation.recentAttempts.slice(1, 5).map((a) => (
                        <div key={a.id} className="space-y-0.5" data-testid={`row-attempt-${a.id}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-600">{a.attemptDate}</span>
                            <div className="flex items-center gap-1.5">
                              {a.isNewRecord && <Star className="w-3 h-3 text-yellow-400" />}
                              {a.videoUrl && (
                                <button onClick={() => setExpandedVideo(expandedVideo === a.id ? null : a.id)} className="text-blue-400/70 hover:text-blue-400">
                                  <Video className="w-3 h-3" />
                                </button>
                              )}
                              <span className="text-xs font-semibold text-zinc-300">{a.score}</span>
                            </div>
                          </div>
                          {expandedVideo === a.id && a.videoUrl && <VideoPlayer url={a.videoUrl} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Record video button */}
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-yellow-400" />Record Footage
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {(myParticipation as any).recordVideoUrl ? "Showing on leaderboard ✓" : "Set your highlight clip — shows on leaderboard"}
                        </p>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        className="text-xs h-7 px-2 border-white/10 text-zinc-400 hover:bg-white/5"
                        onClick={() => setShowRecordVideoModal(true)}
                        data-testid="button-set-record-video"
                      >
                        {(myParticipation as any).recordVideoUrl ? "Update" : "Upload"}
                      </Button>
                    </div>
                    {(myParticipation as any).recordVideoUrl && (
                      <button
                        onClick={() => setExpandedVideo(expandedVideo === "record" ? null : "record")}
                        className="flex items-center gap-1 text-xs text-yellow-400/80 hover:text-yellow-400 mt-2"
                      >
                        <Film className="w-3 h-3" />{expandedVideo === "record" ? "Hide" : "Preview"} record video
                      </button>
                    )}
                    {expandedVideo === "record" && (myParticipation as any).recordVideoUrl && (
                      <VideoPlayer url={(myParticipation as any).recordVideoUrl} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ─── Join Card ─── */
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: "linear-gradient(160deg,#0d0d0d 0%,#000 100%)", borderColor: `${accent}30` }}
                data-testid="card-join-challenge"
              >
                <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
                <div className="p-5">
                  {!showJoinForm ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                        <Target className="w-8 h-8" style={{ color: accent }} />
                      </div>
                      <h2 className="font-bold text-white text-lg mb-1">Join the Challenge</h2>
                      <p className="text-sm text-zinc-500 mb-5 max-w-xs mx-auto">Enter your current record and goal. Your streak lives on the leaderboard.</p>
                      <Button className="w-full font-bold rounded-xl" style={{ background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 0 20px ${accent}44` }} onClick={() => setShowJoinForm(true)} data-testid="button-start-join">
                        <Play className="w-4 h-4 mr-2" />Enter the Challenge
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h2 className="font-bold text-white text-base">Set Up Your Challenge</h2>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Your Current Best Record</Label>
                        <Input type="number" min={0} value={joinForm.currentBest} onChange={(e) => setJoinForm((f) => ({ ...f, currentBest: Number(e.target.value) }))} className="bg-zinc-950 border-white/10 text-white text-center font-bold text-xl h-12 focus:border-orange-500/50" placeholder="0" data-testid="input-current-best" />
                        <p className="text-[10px] text-zinc-600">Your highest consecutive 3-pointers made so far.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Personal Goal</Label>
                        <Input type="number" min={1} value={joinForm.personalGoal} onChange={(e) => setJoinForm((f) => ({ ...f, personalGoal: Number(e.target.value) }))} className="bg-zinc-950 border-white/10 text-white text-center font-bold text-xl h-12 focus:border-orange-500/50" data-testid="input-personal-goal" />
                        <p className="text-[10px] text-zinc-600">Default is {challenge.defaultGoal}. Set your own target to beat.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">What day are you on?</Label>
                        <Input type="number" min={1} value={joinForm.dayNumber} onChange={(e) => setJoinForm((f) => ({ ...f, dayNumber: Number(e.target.value) }))} className="bg-zinc-950 border-white/10 text-white text-center focus:border-orange-500/50" data-testid="input-day-number" />
                        <p className="text-[10px] text-zinc-600">If you've been training, enter which day you're on.</p>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-white/[0.06]">
                        <div>
                          <p className="text-sm font-medium text-white">Daily challenge mode</p>
                          <p className="text-[10px] text-zinc-500">Track an attempt every day</p>
                        </div>
                        <Switch checked={joinForm.isDaily} onCheckedChange={(v) => setJoinForm((f) => ({ ...f, isDaily: v }))} data-testid="toggle-daily-mode" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1 border-white/10 text-zinc-400 hover:bg-white/5" onClick={() => setShowJoinForm(false)} data-testid="button-cancel-join">Cancel</Button>
                        <Button className="flex-1 font-bold" style={{ background: `linear-gradient(135deg,${accent},${accent}cc)` }} onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid="button-confirm-join">
                          {joinMutation.isPending ? "Joining…" : "Join Challenge"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video tip */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
              <Film className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">Film your attempts</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  When you log an attempt with video, you choose whether to show it on your leaderboard row, submit it to be featured in creator content, or both.
                </p>
              </div>
            </div>
          </div>

          {/* ─── Right: Leaderboard ─── */}
          <div className={challengeView === "leaderboard" ? "mx-auto max-w-3xl" : "hidden"}>
            <div className="rounded-2xl border overflow-hidden" style={{ background: "linear-gradient(160deg,#0d0d0d 0%,#000 100%)", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />

              <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
                <h2 className="font-bold text-white text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />Leaderboard
                </h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">All players · public ranking</p>
              </div>

              <Tabs value={leaderSort} onValueChange={(v) => setLeaderSort(v as any)} className="px-4 pt-3 pb-2">
                <TabsList className="w-full grid grid-cols-3 h-8 bg-white/[0.04] border border-white/[0.06]" data-testid="tabs-leaderboard-sort">
                  <TabsTrigger value="best" className="text-xs data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" data-testid="tab-sort-best">Best Record</TabsTrigger>
                  <TabsTrigger value="closest" className="text-xs data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" data-testid="tab-sort-closest">Closest</TabsTrigger>
                  <TabsTrigger value="percent" className="text-xs data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" data-testid="tab-sort-percent">% to Goal</TabsTrigger>
                </TabsList>

                <TabsContent value={leaderSort} className="mt-2">
                  {/* Column headers */}
                  <div className="flex items-center px-2 pb-2 border-b border-white/[0.04]">
                    <div className="w-6 flex-shrink-0" />
                    <div className="w-8 flex-shrink-0" />
                    <div className="flex-1 min-w-0" />
                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                      <div className="w-5 text-center" title="Most recent attempt video">
                        <Video className="w-2.5 h-2.5 text-blue-500/60 mx-auto" />
                      </div>
                      <div className="w-5 text-center" title="Record footage">
                        <Crown className="w-2.5 h-2.5 text-yellow-500/60 mx-auto" />
                      </div>
                      <div className="w-9 text-center text-[9px] uppercase tracking-wider text-zinc-600">Goal</div>
                      <div className="w-9 text-center text-[9px] uppercase tracking-wider text-zinc-600">Day</div>
                      <div className="w-10 text-center text-[9px] uppercase tracking-wider text-zinc-600">Recent</div>
                      <div className="w-10 text-center text-[9px] uppercase tracking-wider" style={{ color: `${accent}cc` }}>Best ★</div>
                    </div>
                  </div>

                  {leaderLoading ? (
                    <div className="space-y-2 py-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg bg-zinc-900" />)}</div>
                  ) : !leaderboard?.length ? (
                    <div className="py-12 text-center" data-testid="text-leaderboard-empty">
                      <Trophy className="w-10 h-10 mx-auto text-zinc-800 mb-3" />
                      <p className="text-sm text-zinc-600">No entries yet — be first!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.03]" data-testid="list-leaderboard">
                      {leaderboard.map((entry) => {
                        const isMe = myParticipation?.userId === entry.userId;
                        const vidKey = `lb-${entry.userId}`;
                        return (
                          <div key={entry.userId} className="space-y-0">
                            <div
                              className={`flex items-center gap-2 px-2 py-3 rounded-lg transition-colors ${isMe ? "bg-orange-500/5 border border-orange-500/15" : "hover:bg-white/[0.02]"}`}
                              data-testid={`row-leaderboard-${entry.userId}`}
                            >
                              <div className="w-6 flex-shrink-0 flex items-center justify-center">{rankIcon(entry.rank)}</div>
                              <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-white/10">
                                <AvatarImage src={entry.profilePhotoUrl ?? undefined} />
                                <AvatarFallback className="text-[10px] bg-zinc-900 text-zinc-400">{entry.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isMe ? "text-orange-400" : "text-white"}`}>
                                  {entry.displayName}
                                  {isMe && <span className="text-[10px] text-zinc-600 ml-1 font-normal">(you)</span>}
                                </p>
                              </div>
                              {/* Stats row */}
                              <div className="flex gap-1.5 flex-shrink-0 items-center">
                                {/* Blue: most recent attempt video */}
                                <div className="w-5 flex items-center justify-center">
                                  {entry.attemptVideoUrl ? (
                                    <button
                                      onClick={() => setExpandedVideo(expandedVideo === `${vidKey}-attempt` ? null : `${vidKey}-attempt`)}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                      title="Watch most recent attempt"
                                      data-testid={`button-attempt-video-${entry.userId}`}
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="w-3.5 h-3.5 inline-block" />
                                  )}
                                </div>
                                {/* Crown: record footage */}
                                <div className="w-5 flex items-center justify-center">
                                  {entry.recordVideoUrl ? (
                                    <button
                                      onClick={() => setExpandedVideo(expandedVideo === `${vidKey}-record` ? null : `${vidKey}-record`)}
                                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                      title="Watch record footage"
                                      data-testid={`button-record-video-${entry.userId}`}
                                    >
                                      <Crown className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="w-3.5 h-3.5 inline-block" />
                                  )}
                                </div>
                                <div className="w-9 text-center">
                                  <p className="text-sm font-bold text-zinc-300">{entry.personalGoal}</p>
                                  <p className="text-[9px] text-zinc-600">goal</p>
                                </div>
                                <div className="w-9 text-center">
                                  <p className="text-sm font-bold text-zinc-300">{entry.dayNumber}</p>
                                  <p className="text-[9px] text-zinc-600">day</p>
                                </div>
                                <div className="w-10 text-center">
                                  <p className="text-sm font-bold text-zinc-400">{entry.recentScore != null ? entry.recentScore : "—"}</p>
                                  <p className="text-[9px] text-zinc-600">recent</p>
                                </div>
                                <div className="w-10 text-center">
                                  <p className="text-base font-black" style={{ color: accent, textShadow: `0 0 10px ${accent}66` }} data-testid={`text-score-${entry.userId}`}>
                                    {leaderSort === "percent" ? `${entry.percentToGoal}%` : entry.bestRecord}
                                  </p>
                                  <p className="text-[9px]" style={{ color: `${accent}88` }}>
                                    {leaderSort === "closest" ? "left" : leaderSort === "percent" ? "done" : "best"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {/* Inline video — attempt */}
                            {expandedVideo === `${vidKey}-attempt` && entry.attemptVideoUrl && (
                              <div className="px-4 pb-3 space-y-1">
                                <p className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                                  <Video className="w-3 h-3" />Most recent attempt
                                </p>
                                <VideoPlayer url={entry.attemptVideoUrl} />
                              </div>
                            )}
                            {/* Inline video — record footage */}
                            {expandedVideo === `${vidKey}-record` && entry.recordVideoUrl && (
                              <div className="px-4 pb-3 space-y-1">
                                <p className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                                  <Crown className="w-3 h-3" />Record footage
                                </p>
                                <VideoPlayer url={entry.recordVideoUrl} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Log Attempt Modal ─── */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10" data-testid="modal-log-attempt">
          <DialogHeader>
            <DialogTitle className="text-white">Log an Attempt</DialogTitle>
            <DialogDescription className="text-zinc-500">How many consecutive 3-pointers did you make?</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="attempt-score" className="text-zinc-400 text-xs uppercase tracking-wider">
                Consecutive Makes <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="attempt-score" type="number" min={0} placeholder="0"
                value={attemptForm.score}
                onChange={(e) => setAttemptForm((f) => ({ ...f, score: e.target.value }))}
                className="bg-black border-white/10 text-white text-3xl font-black text-center h-16 focus:border-orange-500/50"
                data-testid="input-attempt-score"
              />
              {myParticipation && (
                <p className="text-[11px] text-zinc-600 text-center">
                  Current best: <span className="text-zinc-400 font-semibold">{myParticipation.bestRecord}</span>
                  {Number(attemptForm.score) > myParticipation.bestRecord && Number(attemptForm.score) > 0 && (
                    <span className="text-yellow-400 ml-2 font-bold">🏆 New record!</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attempt-date" className="text-zinc-400 text-xs uppercase tracking-wider">Date</Label>
              <Input
                id="attempt-date" type="date"
                value={attemptForm.attemptDate}
                onChange={(e) => setAttemptForm((f) => ({ ...f, attemptDate: e.target.value }))}
                className="bg-black border-white/10 text-white focus:border-orange-500/50"
                data-testid="input-attempt-date"
              />
            </div>

            {/* Video section */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-400" />Video <span className="text-zinc-600 normal-case font-normal">(optional)</span>
              </Label>
              <VideoUploadSection
                videoMode={videoMode} setVideoMode={setVideoMode}
                selectedFile={selectedFile} setSelectedFile={setSelectedFile}
                videoUrl={videoUrl} setVideoUrl={setVideoUrl}
                fileInputRef={fileInputRef}
              />

              {/* Video visibility options — only shown when a video is attached */}
              {hasVideo && (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2.5 mt-1">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">How should this video be used?</p>

                  <label className="flex items-start gap-3 cursor-pointer group" data-testid="checkbox-show-leaderboard">
                    <Checkbox
                      checked={attemptForm.showOnLeaderboard}
                      onCheckedChange={(v) => setAttemptForm((f) => ({ ...f, showOnLeaderboard: Boolean(v) }))}
                      className="mt-0.5 border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">Show on leaderboard</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">A play button appears next to your name so anyone can watch your attempt inline.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group" data-testid="checkbox-submit-creator">
                    <Checkbox
                      checked={attemptForm.submitToCreator}
                      onCheckedChange={(v) => setAttemptForm((f) => ({ ...f, submitToCreator: Boolean(v) }))}
                      className="mt-0.5 border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-orange-300 transition-colors">Submit for creator content</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">Your clip goes to @nicknaso's review queue. Outstanding submissions may be featured in videos.</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 border-white/10 text-zinc-400 hover:bg-white/5" onClick={() => setShowLogModal(false)} data-testid="button-cancel-attempt">Cancel</Button>
              <Button
                className="flex-1 font-bold"
                style={{ background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 0 12px ${accent}44` }}
                onClick={() => attemptMutation.mutate()}
                disabled={attemptMutation.isPending || uploadingVideo || !attemptForm.score}
                data-testid="button-submit-attempt"
              >
                {(attemptMutation.isPending || uploadingVideo) ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{uploadingVideo ? "Uploading…" : "Saving…"}</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-1.5" />Log Attempt</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Set Record Video Modal ─── */}
      <Dialog open={showRecordVideoModal} onOpenChange={setShowRecordVideoModal}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10" data-testid="modal-record-video">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />Set Record Footage
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Upload your best attempt clip. It will show as a video button on your leaderboard row for everyone to watch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <VideoUploadSection
              videoMode={rvMode} setVideoMode={setRvMode}
              selectedFile={rvFile} setSelectedFile={setRvFile}
              videoUrl={rvLink} setVideoUrl={setRvLink}
              fileInputRef={rvFileRef}
            />
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 border-white/10 text-zinc-400 hover:bg-white/5" onClick={() => setShowRecordVideoModal(false)}>Cancel</Button>
              <Button
                className="flex-1 font-bold"
                style={{ background: `linear-gradient(135deg,#eab308,#f59e0b)` }}
                onClick={() => recordVideoMutation.mutate()}
                disabled={recordVideoMutation.isPending || rvUploading || (rvMode === "file" ? !rvFile : !rvLink)}
                data-testid="button-save-record-video"
              >
                {(recordVideoMutation.isPending || rvUploading) ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{rvUploading ? "Uploading…" : "Saving…"}</>
                ) : (
                  <><Crown className="w-4 h-4 mr-1.5" />Save Record Video</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Leave Confirm Step 1 ─── */}
      <AlertDialog open={showLeaveConfirm1} onOpenChange={setShowLeaveConfirm1}>
        <AlertDialogContent className="bg-zinc-950 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave the challenge?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will remove you and all your logged attempts from the leaderboard. You can re-join anytime, but your history will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-zinc-400 hover:bg-white/5" data-testid="button-leave-cancel-1">Keep my progress</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border-0" onClick={() => { setShowLeaveConfirm1(false); setShowLeaveConfirm2(true); }} data-testid="button-leave-confirm-1">
              Yes, leave challenge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Leave Confirm Step 2 ─── */}
      <AlertDialog open={showLeaveConfirm2} onOpenChange={setShowLeaveConfirm2}>
        <AlertDialogContent className="bg-zinc-950 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              All your attempts and your leaderboard position will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-zinc-400 hover:bg-white/5" data-testid="button-leave-cancel-2">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} data-testid="button-leave-confirm-2">
              {leaveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Leaving…</> : "Delete everything & leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
