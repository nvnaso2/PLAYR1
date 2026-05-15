import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShootingHeatmap } from "@/components/shooting-heatmap";
import {
  Zap, Sparkles, Download, RefreshCw, Calendar, Target, Clock, Flame, Trophy,
  TrendingUp, ArrowRight, ArrowLeft, Minus, Plus, CheckCircle2, XCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type ShotStat = { location: string; made: number; missed: number };

type GameDayWeeklyStats = {
  totalSessions: number;
  totalMinutes: number;
  shotsMade: number;
  shotsAttempted: number;
  shootingPct: number;
  activeDays: number;
  avgScore: number | null;
};

type ChallengeTask = {
  id: string;
  title: string;
  description: string;
  target: number;
  total: number;
  unit: string;
};

type ChallengeStructure = {
  title: string;
  scenario: string;
  briefing: string;
  intensity: "ROOKIE" | "PRO" | "ELITE";
  tasks: ChallengeTask[];
  verdicts: { S: string; A: string; B: string; C: string; F: string };
};

type ExistingAttempt = {
  id: string;
  taskResults: Array<{ taskId: string; achieved: number; total: number }>;
  overallScore: number | null;
  verdict: string | null;
  verdictText: string | null;
};

type WeeklyGameDayResponse = {
  id: string;
  weekStart: string;
  weekEnd: string;
  scoutingReport: string | null;
  weeklyStats: GameDayWeeklyStats | null;
  challengeStructure: ChallengeStructure | null;
  existingAttempt: ExistingAttempt | null;
};

type ChallengePhase =
  | { kind: "idle" }
  | { kind: "briefing" }
  | { kind: "task"; index: number }
  | { kind: "verdict"; score: number; grade: string; verdictText: string; saved: boolean };

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcVerdict(tasks: ChallengeTask[], results: Record<string, number>) {
  const pcts = tasks.map(t => Math.min(results[t.id] ?? 0, t.total) / t.total);
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const score = Math.round(avg * 100);
  let grade: string;
  if (score >= 90) grade = "S";
  else if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 50) grade = "C";
  else grade = "F";
  return { score, grade };
}

const GRADE_COLORS: Record<string, string> = {
  S: "#FFD700", A: "#22c55e", B: "#60a5fa", C: "#f97316", F: "#ef4444",
};

const INTENSITY_STYLES: Record<string, string> = {
  ROOKIE: "border-blue-500/40 text-blue-400",
  PRO: "border-orange-500/40 text-orange-400",
  ELITE: "border-yellow-500/40 text-yellow-400",
};

// ── Mini court for share card ──────────────────────────────────────────────
function zoneColor(shots: ShotStat[], slugs: string[]) {
  const rel = shots.filter(s =>
    slugs.some(sl => s.location.toLowerCase().includes(sl) || sl.includes(s.location.toLowerCase()))
  );
  const made = rel.reduce((n, s) => n + s.made, 0);
  const missed = rel.reduce((n, s) => n + (s.missed ?? 0), 0);
  const total = made + missed;
  if (total === 0) return "#111827";
  const p = made / total;
  if (p < 0.3) return "#7f1d1d";
  if (p < 0.42) return "#92400e";
  if (p < 0.52) return "#44403c";
  if (p < 0.62) return "#166534";
  return "#14532d";
}

function MiniCourtSVG({ shots }: { shots: ShotStat[] }) {
  const paint = zoneColor(shots, ["restricted", "paint", "post"]);
  const floater = zoneColor(shots, ["floater", "free-throw"]);
  const elbowL = zoneColor(shots, ["left-elbow", "elbow-left", "left-mid"]);
  const elbowR = zoneColor(shots, ["right-elbow", "elbow-right", "right-mid"]);
  const cornerL = zoneColor(shots, ["left-corner", "corner-left"]);
  const cornerR = zoneColor(shots, ["right-corner", "corner-right"]);
  const wingL = zoneColor(shots, ["left-wing", "wing-left"]);
  const wingR = zoneColor(shots, ["right-wing", "wing-right"]);
  const top3 = zoneColor(shots, ["top-of-key", "top-key", "above-break"]);
  return (
    <svg viewBox="0 0 200 175" style={{ display: "block", width: "100%" }}>
      <rect width="200" height="175" fill="#0d1117" rx="6" />
      {/* Top 3pt zones */}
      <rect x="0" y="0" width="38" height="175" fill={cornerL} />
      <rect x="162" y="0" width="38" height="175" fill={cornerR} />
      <rect x="38" y="0" width="60" height="72" fill={wingL} />
      <rect x="102" y="0" width="60" height="72" fill={wingR} />
      <rect x="72" y="0" width="56" height="50" fill={top3} />
      {/* Mid-range */}
      <rect x="38" y="72" width="32" height="103" fill={elbowL} />
      <rect x="130" y="72" width="32" height="103" fill={elbowR} />
      {/* Floater zone */}
      <rect x="70" y="50" width="60" height="52" fill={floater} />
      {/* Paint */}
      <rect x="70" y="102" width="60" height="73" fill={paint} />
      {/* Court border */}
      <rect x="0.75" y="0.75" width="198.5" height="173.5" fill="none" stroke="#1f2937" strokeWidth="1.5" rx="5.5" />
      {/* Paint box */}
      <rect x="70" y="102" width="60" height="73" fill="none" stroke="#1f2937" strokeWidth="1" />
      {/* FT line */}
      <line x1="70" y1="102" x2="130" y2="102" stroke="#1f2937" strokeWidth="1" />
      {/* 3pt line simplified arc */}
      <path d="M38 175 L38 90 Q100 20 162 90 L162 175" fill="none" stroke="#1f2937" strokeWidth="1" />
      {/* Basket */}
      <circle cx="100" cy="158" r="5.5" fill="none" stroke="#f97316" strokeWidth="1.5" />
      <circle cx="100" cy="158" r="1.5" fill="#f97316" />
    </svg>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function StatBox({ label, value, icon: Icon, hot }: { label: string; value: string | number; icon: React.ElementType; hot?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl p-3 text-center border ${hot ? "bg-primary/10 border-primary/30" : "bg-muted/20 border-border"}`}
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Icon className={`w-3.5 h-3.5 mb-1 ${hot ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-xl font-black leading-none ${hot ? "text-primary" : "text-foreground"}`}>{value}</span>
      <span className="text-[9px] font-semibold text-muted-foreground mt-1 uppercase tracking-widest leading-tight">{label}</span>
    </div>
  );
}

// ── Loading / Generating states ─────────────────────────────────────────────
function GeneratingState() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Generating Your Game Day</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Analyzing your week, writing your scouting report, and building your challenge…
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GameDayPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const shareCardRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery<WeeklyGameDayResponse>({
    queryKey: ["/api/game-day/current"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: weekShotData = [] } = useQuery<ShotStat[]>({
    queryKey: ["/api/stats/shots", "weekly"],
    queryFn: () => fetch("/api/stats/shots?period=weekly", { credentials: "include" }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    enabled: !!data,
  });

  // Challenge state machine
  const [phase, setPhase] = useState<ChallengePhase>({ kind: "idle" });
  const [taskResults, setTaskResults] = useState<Record<string, number>>({});
  const [currentInput, setCurrentInput] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (data?.existingAttempt && phase.kind === "idle") {
      const ea = data.existingAttempt;
      const r: Record<string, number> = {};
      (ea.taskResults ?? []).forEach(t => { r[t.taskId] = t.achieved; });
      setTaskResults(r);
      setPhase({
        kind: "verdict",
        score: ea.overallScore ?? 0,
        grade: ea.verdict ?? "C",
        verdictText: ea.verdictText ?? "",
        saved: true,
      });
    }
  }, [data?.existingAttempt]);

  const regenerateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/game-day/regenerate"),
    onSuccess: () => {
      setPhase({ kind: "idle" });
      setTaskResults({});
      qc.removeQueries({ queryKey: ["/api/game-day/current"] });
      qc.invalidateQueries({ queryKey: ["/api/game-day/current"] });
    },
    onError: () => toast({ title: "Failed to regenerate", variant: "destructive" }),
  });

  async function handleSaveAttempt(challenge: ChallengeStructure) {
    if (!data) return;
    setIsSaving(true);
    try {
      const { score, grade } = calcVerdict(challenge.tasks, taskResults);
      const verdictText = challenge.verdicts[grade as keyof typeof challenge.verdicts] ?? "";
      const taskResultsArr = challenge.tasks.map(t => ({ taskId: t.id, achieved: taskResults[t.id] ?? 0, total: t.total }));
      await apiRequest("POST", "/api/game-day/attempt", {
        weekGameDayId: data.id,
        taskResults: taskResultsArr,
        overallScore: score,
        verdict: grade,
        verdictText,
      });
      setPhase(p => p.kind === "verdict" ? { ...p, saved: true } : p);
      toast({ title: "Result locked in 🏆" });
    } catch {
      toast({ title: "Failed to save result", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownload() {
    if (!shareCardRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: "#070b14",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `game-day-${data?.weekStart ?? "week"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────
  if (isLoading || regenerateMutation.isPending) return <GeneratingState />;

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Zap className="w-10 h-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Unable to load Game Day</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Something went wrong. Give it another shot.</p>
        <Button onClick={() => qc.invalidateQueries({ queryKey: ["/api/game-day/current"] })} data-testid="button-retry">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) return <GeneratingState />;

  const stats = data.weeklyStats;
  const challenge = data.challengeStructure;

  // ── Full page render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-primary/4 to-transparent px-4 pt-8 pb-7">
        <div className="max-w-xl mx-auto">
          <Badge className="bg-primary text-primary-foreground text-[10px] font-bold tracking-widest px-2.5 py-0.5 mb-3" data-testid="badge-game-day">
            <Zap className="w-2.5 h-2.5 mr-1" /> GAME DAY WEEKLY
          </Badge>
          <h1 className="text-3xl font-black tracking-tight leading-none">
            Your Week<br /><span className="text-primary">In Review.</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(data.weekStart)} – {formatDate(data.weekEnd)}
          </p>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* Stats grid */}
        {stats && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Week at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Sessions" value={stats.totalSessions} icon={Flame} hot={stats.totalSessions >= 3} />
                <StatBox label="Minutes" value={stats.totalMinutes} icon={Clock} />
                <StatBox label="Shooting" value={stats.shotsAttempted > 0 ? `${stats.shootingPct}%` : "—"} icon={Target} hot={stats.shootingPct >= 50} />
                <StatBox label="Active Days" value={`${stats.activeDays}/7`} icon={Trophy} hot={stats.activeDays >= 5} />
              </div>
              {stats.avgScore !== null && (
                <p className="text-xs text-muted-foreground text-center">Avg session score: <span className="text-foreground font-semibold">{stats.avgScore}/10</span></p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shooting heatmap */}
        {weekShotData.length > 0 && (
          <ShootingHeatmap shotData={weekShotData} title="This Week's Shooting Chart" />
        )}

        {/* Scouting Report */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-transparent">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 text-primary">
              <Sparkles className="w-3.5 h-3.5" /> AI Scouting Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5">
            <p className="text-sm leading-relaxed text-foreground" data-testid="text-scouting-report">
              {data.scoutingReport ?? "Log at least one training session this week to unlock your scouting report."}
            </p>
          </CardContent>
        </Card>

        {/* ── Challenge of the Week ────────────────────────────────────── */}
        {challenge ? (
          <div className="rounded-2xl border border-border overflow-hidden bg-card" data-testid="challenge-section">

            {/* Idle */}
            {phase.kind === "idle" && (
              <>
                <div className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent p-5 pb-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Badge className="bg-primary text-primary-foreground text-[9px] tracking-widest px-2 py-0.5">
                      <Zap className="w-2 h-2 mr-1" /> CHALLENGE OF THE WEEK
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] tracking-wider ${INTENSITY_STYLES[challenge.intensity]}`}>
                      {challenge.intensity}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-black text-foreground leading-tight">{challenge.title}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{challenge.scenario}</p>
                  <div className="flex items-center gap-3 mt-3 pb-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />{challenge.tasks.length} tasks</span>
                    <span>·</span>
                    <span>Game simulation</span>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-border">
                  <Button
                    className="w-full font-bold tracking-wide"
                    size="lg"
                    onClick={() => setPhase({ kind: "briefing" })}
                    data-testid="button-accept-challenge"
                  >
                    ACCEPT THE CHALLENGE <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Briefing */}
            {phase.kind === "briefing" && (
              <div className="p-5 space-y-4">
                <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={() => setPhase({ kind: "idle" })}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div>
                  <Badge variant="outline" className={`text-[9px] tracking-wider mb-3 ${INTENSITY_STYLES[challenge.intensity]}`}>
                    {challenge.intensity}
                  </Badge>
                  <h2 className="text-xl font-black">{challenge.title}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{challenge.scenario}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{challenge.briefing}</p>
                  <div className="space-y-2">
                    {challenge.tasks.map((t, i) => (
                      <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                        <span className="text-primary font-black text-sm mt-0.5">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{t.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Target: {t.target} of {t.total} {t.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full font-bold" onClick={() => { setCurrentInput(0); setPhase({ kind: "task", index: 0 }); }} data-testid="button-begin-challenge">
                  BEGIN CHALLENGE
                </Button>
              </div>
            )}

            {/* Task */}
            {phase.kind === "task" && (() => {
              const { index } = phase;
              const task = challenge.tasks[index];
              const progress = ((index + 1) / challenge.tasks.length) * 100;
              return (
                <div className="p-5 space-y-5">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Task {index + 1} of {challenge.tasks.length}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {/* Task info */}
                  <div>
                    <h3 className="text-2xl font-black leading-tight">{task.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{task.description}</p>
                  </div>
                  {/* Target */}
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Target</p>
                    <p className="text-base font-black mt-0.5">{task.target} of {task.total} {task.unit}</p>
                  </div>
                  {/* Stepper */}
                  <div className="flex items-center justify-center gap-8">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full text-lg"
                      onClick={() => setCurrentInput(Math.max(0, currentInput - 1))}
                      data-testid="button-decrement"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <div className="text-center min-w-[5rem]">
                      <span className="text-6xl font-black tabular-nums" data-testid="input-achieved">{currentInput}</span>
                      <p className="text-xs text-muted-foreground mt-1">of {task.total} {task.unit}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => setCurrentInput(Math.min(task.total, currentInput + 1))}
                      data-testid="button-increment"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  {/* Next / Verdict */}
                  <Button
                    className="w-full font-bold"
                    onClick={() => {
                      const newResults = { ...taskResults, [task.id]: currentInput };
                      setTaskResults(newResults);
                      if (index < challenge.tasks.length - 1) {
                        setCurrentInput(0);
                        setPhase({ kind: "task", index: index + 1 });
                      } else {
                        const { score, grade } = calcVerdict(challenge.tasks, newResults);
                        const verdictText = challenge.verdicts[grade as keyof typeof challenge.verdicts] ?? "";
                        setPhase({ kind: "verdict", score, grade, verdictText, saved: false });
                      }
                    }}
                    data-testid="button-task-done"
                  >
                    {index < challenge.tasks.length - 1 ? `Next Task →` : `See My Verdict`}
                  </Button>
                </div>
              );
            })()}

            {/* Verdict */}
            {phase.kind === "verdict" && (() => {
              const { score, grade, verdictText, saved } = phase;
              const gradeColor = GRADE_COLORS[grade] ?? "#f97316";
              return (
                <div className="p-5 space-y-5">
                  {/* Grade reveal */}
                  <div className="text-center space-y-2 py-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Verdict</p>
                    <div
                      className="text-[96px] font-black leading-none"
                      style={{ color: gradeColor, textShadow: `0 0 60px ${gradeColor}55, 0 0 120px ${gradeColor}22` }}
                      data-testid="text-verdict-grade"
                    >
                      {grade}
                    </div>
                    <p className="text-3xl font-bold" data-testid="text-verdict-score">{score}%</p>
                    <p className="text-sm text-muted-foreground italic max-w-[240px] mx-auto leading-relaxed" data-testid="text-verdict-text">
                      "{verdictText}"
                    </p>
                  </div>
                  {/* Task breakdown */}
                  <div className="space-y-2">
                    {challenge.tasks.map(t => {
                      const achieved = taskResults[t.id] ?? 0;
                      const hit = achieved >= t.target;
                      return (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                          <span className="text-sm font-semibold truncate mr-2">{t.title}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm text-muted-foreground">{achieved}/{t.total}</span>
                            {hit
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : <XCircle className="w-4 h-4 text-red-400" />
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {saved
                    ? <p className="text-xs text-center text-muted-foreground">Result saved ✓</p>
                    : (
                      <Button
                        className="w-full font-bold"
                        onClick={() => handleSaveAttempt(challenge)}
                        disabled={isSaving}
                        data-testid="button-save-result"
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />}
                        {isSaving ? "Saving…" : "Lock In Result"}
                      </Button>
                    )
                  }
                </div>
              );
            })()}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No challenge generated — log sessions to get your personalised challenge.</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button onClick={handleDownload} disabled={isDownloading} className="flex-1" data-testid="button-download-card">
            {isDownloading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isDownloading ? "Exporting…" : "Download Card"}
          </Button>
          <Button
            variant="outline"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            data-testid="button-regenerate"
            title="Regenerate this week's report"
          >
            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Hidden Share Card ───────────────────────────────────────────── */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={shareCardRef}
          data-share-card
          style={{
            width: 420, backgroundColor: "#070b14",
            fontFamily: "'system-ui', '-apple-system', sans-serif",
            padding: "32px 28px 36px", position: "relative", overflow: "hidden",
          }}
        >
          {/* Grid background */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} aria-hidden="true">
            <defs>
              <pattern id="pg" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#4f7cff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pg)" />
          </svg>
          {/* Orange glow */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(249,115,22,0.12)", filter: "blur(50px)" }} />
          {/* Content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", color: "#f97316" }}>PLAYR1</div>
                <div style={{ fontSize: 9, color: "#666", letterSpacing: "0.15em", marginTop: 2 }}>GAME DAY WEEKLY</div>
              </div>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
                {formatDate(data.weekStart)} – {formatDate(data.weekEnd)}
              </div>
            </div>
            {/* Title */}
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
              Your Week<br />
              <span style={{ color: "#f97316" }}>In Review.</span>
            </div>
            {/* Court + Stats row */}
            <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
              {/* Mini court */}
              <div style={{ flex: "0 0 150px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 8, overflow: "hidden" }}>
                <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>Shot Chart</div>
                <MiniCourtSVG shots={weekShotData} />
              </div>
              {/* Stats */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { label: "SESSIONS", value: stats?.totalSessions ?? 0 },
                  { label: "MINUTES", value: stats?.totalMinutes ?? 0 },
                  { label: "SHOOTING", value: stats && stats.shotsAttempted > 0 ? `${stats.shootingPct}%` : "—" },
                  { label: "ACTIVE DAYS", value: `${stats?.activeDays ?? 0}/7` },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#555", letterSpacing: "0.12em" }}>{s.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Scouting excerpt */}
            {data.scoutingReport && (
              <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 8, fontWeight: 800, color: "#f97316", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 5 }}>Scouting Report</div>
                <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.55 }}>
                  {data.scoutingReport.split(".")[0]}.
                </div>
              </div>
            )}
            {/* Challenge row */}
            {challenge && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, marginBottom: 16 }}>
                <Zap style={{ width: 12, height: 12, color: "#f97316", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", flex: 1 }}>{challenge.title}</span>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#f97316", background: "rgba(249,115,22,0.15)", padding: "2px 7px", borderRadius: 4, letterSpacing: "0.1em" }}>
                  {challenge.intensity}
                </span>
              </div>
            )}
            {/* Footer */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.12em" }}>PLAYR1.APP</span>
              <span style={{ fontSize: 9, color: "#1a202c" }}>#{data.weekStart.replace(/-/g, "")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
