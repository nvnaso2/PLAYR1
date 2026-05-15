import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Zap,
  Sparkles,
  Dumbbell,
  Download,
  RefreshCw,
  Calendar,
  Target,
  Clock,
  Flame,
  Quote,
  Trophy,
  TrendingUp,
} from "lucide-react";

type GameDayWeeklyStats = {
  totalSessions: number;
  totalMinutes: number;
  shotsMade: number;
  shotsAttempted: number;
  shootingPct: number;
  activeDays: number;
  avgScore: number | null;
};

type WeeklyGameDay = {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  scoutingReport: string | null;
  weeklyStats: GameDayWeeklyStats | null;
  challengeDrillId: string | null;
  challengeDrillTitle: string | null;
  challengeDrillDescription: string | null;
  challengeDrillCategory: string | null;
  reflectionPrompt: string | null;
  generatedAt: string | null;
};

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatBox({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl p-3 text-center border ${
        highlight
          ? "bg-primary/10 border-primary/30"
          : "bg-muted/30 border-border"
      }`}
      data-testid={`stat-box-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon
        className={`w-4 h-4 mb-1 ${highlight ? "text-primary" : "text-muted-foreground"}`}
      />
      <span
        className={`text-xl font-black leading-none ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </span>
      <span className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wide leading-tight">
        {label}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-gradient-to-b from-primary/8 to-background px-4 py-8">
        <div className="max-w-xl mx-auto space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Generating Your Game Day Report</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Analyzing your week and writing your scouting report...
        </p>
      </div>
    </div>
  );
}

export default function GameDayPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery<WeeklyGameDay>({
    queryKey: ["/api/game-day/current"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const regenerateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/game-day/regenerate"),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["/api/game-day/current"] });
      qc.invalidateQueries({ queryKey: ["/api/game-day/current"] });
    },
    onError: () => {
      toast({ title: "Failed to regenerate", variant: "destructive" });
    },
  });

  const handleDownload = async () => {
    if (!shareCardRef.current || !data) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `game-day-${data.weekStart}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast({ title: "Download failed", description: "Try again", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Zap className="w-10 h-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Unable to load Game Day</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Something went wrong generating your report. Give it another try.
        </p>
        <Button
          onClick={() => qc.invalidateQueries({ queryKey: ["/api/game-day/current"] })}
          data-testid="button-retry-gameday"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (regenerateMutation.isPending) return <GeneratingState />;

  if (!data) return <GeneratingState />;

  const stats = data.weeklyStats;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-primary/5 to-transparent px-4 pt-8 pb-7">
        <div className="max-w-xl mx-auto">
          <Badge
            className="bg-primary text-primary-foreground text-[10px] font-bold tracking-widest px-2.5 py-0.5 mb-3"
            data-testid="badge-game-day"
          >
            <Zap className="w-2.5 h-2.5 mr-1" />
            GAME DAY WEEKLY
          </Badge>
          <h1 className="text-3xl font-black tracking-tight leading-none">
            Your Week
            <br />
            <span className="text-primary">In Review.</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(data.weekStart)} – {formatDate(data.weekEnd)}
          </p>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* Stats Grid */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Week at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats ? (
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Sessions" value={stats.totalSessions} icon={Flame} highlight={stats.totalSessions >= 3} />
                <StatBox label="Minutes" value={stats.totalMinutes} icon={Clock} />
                <StatBox
                  label="Shooting"
                  value={stats.shotsAttempted > 0 ? `${stats.shootingPct}%` : "—"}
                  icon={Target}
                  highlight={stats.shootingPct >= 50}
                />
                <StatBox
                  label="Active Days"
                  value={`${stats.activeDays}/7`}
                  icon={Trophy}
                  highlight={stats.activeDays >= 5}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No training sessions logged this week yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Scouting Report */}
        <Card className="border-primary/25 bg-gradient-to-br from-primary/8 to-transparent">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              Scouting Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5">
            <p
              className="text-sm leading-relaxed text-foreground"
              data-testid="text-scouting-report"
            >
              {data.scoutingReport ?? "Report not available — log a session to unlock your evaluation."}
            </p>
          </CardContent>
        </Card>

        {/* Challenge of the Week */}
        {data.challengeDrillTitle && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                <Dumbbell className="w-3.5 h-3.5" />
                Challenge of the Week
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5 space-y-2">
              {data.challengeDrillCategory && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 capitalize">
                  {data.challengeDrillCategory.replace(/-/g, " ")}
                </Badge>
              )}
              <p
                className="font-bold text-base text-foreground"
                data-testid="text-challenge-drill-title"
              >
                {data.challengeDrillTitle}
              </p>
              {data.challengeDrillDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.challengeDrillDescription}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reflection Prompt */}
        {data.reflectionPrompt && (
          <Card className="border-dashed">
            <CardContent className="px-5 py-5 flex gap-3">
              <Quote className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p
                className="text-sm italic leading-relaxed text-muted-foreground"
                data-testid="text-reflection-prompt"
              >
                {data.reflectionPrompt}
              </p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1"
            data-testid="button-download-card"
          >
            {isDownloading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloading ? "Exporting…" : "Download Card"}
          </Button>
          <Button
            variant="outline"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            data-testid="button-regenerate-gameday"
            title="Regenerate this week's report"
          >
            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Hidden Share Card (html2canvas target) ──────── */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={shareCardRef}
          data-share-card
          style={{ width: 390, background: "#0a0a0a", fontFamily: "system-ui, sans-serif", padding: "36px 28px 40px", borderRadius: 0, color: "#fff" }}
        >
          {/* Top accent */}
          <div style={{ width: 40, height: 4, background: "#f97316", borderRadius: 2, marginBottom: 24 }} />

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#f97316", textTransform: "uppercase", marginBottom: 8 }}>
            PLAYR1 — Game Day Weekly
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1, marginBottom: 4 }}>
            {formatDate(data.weekStart)}
            <span style={{ color: "#555" }}> — </span>
            {formatDate(data.weekEnd)}
          </div>

          {/* Stats row */}
          {stats && (
            <div style={{ display: "flex", gap: 12, marginTop: 24, marginBottom: 28 }}>
              {[
                { label: "Sessions", value: stats.totalSessions },
                { label: "Minutes", value: stats.totalMinutes },
                { label: "Shooting", value: stats.shotsAttempted > 0 ? `${stats.shootingPct}%` : "—" },
                { label: "Days", value: `${stats.activeDays}/7` },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, background: "#151515", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#f97316" }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Scouting excerpt */}
          {data.scoutingReport && (
            <div style={{ background: "#111", borderLeft: "3px solid #f97316", padding: "12px 14px", borderRadius: "0 8px 8px 0", marginBottom: 24 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "#f97316", textTransform: "uppercase", marginBottom: 6 }}>Scouting Report</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#ccc" }}>
                {data.scoutingReport.slice(0, 160)}{data.scoutingReport.length > 160 ? "…" : ""}
              </div>
            </div>
          )}

          {/* Challenge */}
          {data.challengeDrillTitle && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Challenge of the Week</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{data.challengeDrillTitle}</div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em" }}>PLAYR1.APP</div>
            <div style={{ fontSize: 10, color: "#333" }}>#{data.weekStart.replace(/-/g, "")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
