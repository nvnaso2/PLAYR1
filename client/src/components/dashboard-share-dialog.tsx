import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Download, Image, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DashboardStoryCard,
  DASHBOARD_STORY_SIZE,
  type DashboardStoryData,
  type DashboardStoryPeriod,
} from "@/components/dashboard-story-card";
import { nativeFetch, statsUrl } from "@/lib/queryClient";
import { shareDashboardStoryImage } from "@/lib/share-utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Overview = { totalSessions: number; totalMinutes: number; avgScore: number; streak: number };
type ShotRow = { location: string; made: number; missed: number };
type CategoryRow = { category: string; minutes: number; sessions: number };
type ProfileData = { displayName?: string | null };
type CareerData = { positions?: string[] | null; teamName?: string | null; jerseyNumber?: number | null };
type DashboardStats = {
  overview: Overview;
  trainingStats: Record<string, number>;
  shots: ShotRow[];
  categories: CategoryRow[];
};
export type DashboardShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPeriod?: DashboardStoryPeriod;
};

const PERIODS: Array<{ value: DashboardStoryPeriod; label: string }> = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "annual", label: "This Year" },
];

async function fetchJson<T>(path: string, period: DashboardStoryPeriod): Promise<T> {
  const response = await nativeFetch(statsUrl(path, period));
  if (!response.ok) throw new Error(`Could not load dashboard data (${response.status}).`);
  return response.json() as Promise<T>;
}

async function fetchDashboardStats(period: DashboardStoryPeriod): Promise<DashboardStats> {
  const [overview, trainingStats, shots, categories] = await Promise.all([
    fetchJson<Overview>("/api/stats/overview", period),
    fetchJson<Record<string, number>>("/api/stats/dashboard-training", period),
    fetchJson<ShotRow[]>("/api/stats/shots", period),
    fetchJson<CategoryRow[]>("/api/stats/by-category", period),
  ]);
  return { overview, trainingStats, shots, categories };
}

export function DashboardShareDialog({
  open,
  onOpenChange,
  initialPeriod = "weekly",
}: DashboardShareDialogProps) {
  const [period, setPeriod] = useState<DashboardStoryPeriod>(initialPeriod);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) setPeriod(initialPeriod);
  }, [open, initialPeriod]);

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard-story", period],
    queryFn: () => fetchDashboardStats(period),
    enabled: open,
  });
  const { data: profile, isLoading: isProfileLoading } = useQuery<ProfileData>({ queryKey: ["/api/profile"], enabled: open });
  const { data: career, isLoading: isCareerLoading } = useQuery<CareerData>({ queryKey: ["/api/career"], enabled: open });
  const previewLoading = statsQuery.isFetching || isAuthLoading || isProfileLoading || isCareerLoading;

  const storyData = useMemo<DashboardStoryData | null>(() => {
    if (!statsQuery.data) return null;
    const first = user?.firstName?.trim() || "";
    const last = user?.lastName?.trim() || "";
    const playerName = [first, last].filter(Boolean).join(" ") || null;
    return {
      ...statsQuery.data,
      period,
      playerName,
      displayName: profile?.displayName || null,
      positions: career?.positions || [],
      teamName: career?.teamName || null,
      jerseyNumber: career?.jerseyNumber ?? null,
    };
  }, [statsQuery.data, period, user?.firstName, user?.lastName, profile?.displayName, career?.positions, career?.teamName, career?.jerseyNumber]);

  const renderStoryCanvas = async () => {
    const card = cardRef.current?.querySelector<HTMLElement>("[data-dashboard-story-card]");
    if (!card) throw new Error("The dashboard story preview is not ready.");
    if (document.fonts?.ready) await document.fonts.ready;
    return html2canvas(card, {
      width: DASHBOARD_STORY_SIZE.width,
      height: DASHBOARD_STORY_SIZE.height,
      scale: 1,
      backgroundColor: "#080808",
      useCORS: true,
      logging: false,
    });
  };

  const handleShare = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      await shareDashboardStoryImage(canvas, toast);
    } catch {
      toast({
        title: "Could not create dashboard story",
        description: "Try again, or close the preview and reopen it.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      const link = document.createElement("a");
      link.download = `playr1-dashboard-${period}-story.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Dashboard story downloaded" });
    } catch {
      toast({
        title: "Could not download dashboard story",
        description: "Try again after the preview has finished loading.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(94vw,760px)] overflow-y-auto border-zinc-800 bg-[#101010] p-4 text-white sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-xl font-black uppercase tracking-wide">Share dashboard</DialogTitle>
          <DialogDescription className="text-zinc-400">
            A single 9:16 story image with your stats for the selected period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Choose story time range">
            {PERIODS.map((item) => <Button
              key={item.value}
              type="button"
              size="sm"
              variant={period === item.value ? "default" : "outline"}
              onClick={() => setPeriod(item.value)}
              className={period === item.value
                ? "h-10 min-w-0 bg-orange-500 px-1 text-[10px] font-bold text-black hover:bg-orange-400 sm:px-3 sm:text-xs"
                : "h-10 min-w-0 border-zinc-700 bg-transparent px-1 text-[10px] text-zinc-400 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300 sm:px-3 sm:text-xs"}
              aria-pressed={period === item.value}
              data-testid={`button-story-period-${item.value}`}
            >{item.label}</Button>)}
          </div>

          {previewLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80">
              <div className="w-full max-w-[350px] space-y-3 p-6" aria-label="Loading story preview">
                <div className="h-5 w-2/5 animate-pulse rounded bg-zinc-800" />
                <div className="h-12 w-4/5 animate-pulse rounded bg-zinc-800" />
                <div className="h-20 animate-pulse rounded bg-zinc-900" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 animate-pulse rounded bg-zinc-900" />
                  <div className="h-16 animate-pulse rounded bg-zinc-900" />
                  <div className="h-16 animate-pulse rounded bg-zinc-900" />
                </div>
              </div>
            </div>
          ) : statsQuery.isError ? (
            <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-6 text-center">
              <Image className="mx-auto mb-3 h-8 w-8 text-orange-400" />
              <p className="font-semibold text-white">Story data could not be loaded.</p>
              <p className="mt-1 text-sm text-zinc-400">Check your connection and try again.</p>
              <Button type="button" size="sm" variant="outline" className="mt-4 border-zinc-700" onClick={() => statsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : storyData ? (
            <>
              <div className="flex justify-center overflow-hidden rounded-xl border border-zinc-800 bg-[#080808] p-3">
                <div
                  aria-label={`${PERIODS.find((item) => item.value === period)?.label} story preview`}
                  style={{ width: 324, height: 576, flex: "0 0 auto", position: "relative", overflow: "hidden" }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, transform: "scale(0.3)", transformOrigin: "top left" }}>
                    <div ref={cardRef}>
                      <DashboardStoryCard data={storyData} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={handleShare}
                  disabled={isExporting}
                  className="h-11 bg-orange-500 font-bold text-black hover:bg-orange-400"
                  data-testid="button-share-dashboard-story"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {isExporting ? "Preparing image…" : "Share image"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="h-11 border-zinc-700 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  data-testid="button-download-dashboard-story"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download story image
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
