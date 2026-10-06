import { useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CareerStatsStoryCard,
  GameStatsStoryCard,
  SeasonStatsStoryCard,
  BASKETBALL_STORY_SIZE,
  type BasketballStoryIdentity,
  type CareerStatsStoryData,
  type GameStatsStoryData,
  type SeasonStatsStoryData,
} from "@/components/basketball-story-cards";
import {
  buildCareerStatsStoryData,
  buildGameStatsStoryData,
  buildSeasonStatsStoryData,
  type CareerStatsApiResponse,
  type GameStatsShareResponse,
} from "@/lib/basketball-story-data";
import { shareBasketballStatsStoryImage, type BasketballStatsStoryType } from "@/lib/share-utils";

type BasketballStatsShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BasketballStatsStoryType;
  identity?: BasketballStoryIdentity;
  seasonId?: string | null;
  gameId?: string | null;
};

function StoryCard({
  mode,
  careerData,
  seasonData,
  gameData,
}: {
  mode: BasketballStatsStoryType;
  careerData?: CareerStatsStoryData;
  seasonData?: SeasonStatsStoryData;
  gameData?: GameStatsStoryData;
}) {
  if (mode === "career" && careerData) return <CareerStatsStoryCard data={careerData} />;
  if (mode === "season" && seasonData) return <SeasonStatsStoryCard data={seasonData} />;
  if (mode === "game" && gameData) return <GameStatsStoryCard data={gameData} />;
  return null;
}

const modeLabels: Record<BasketballStatsStoryType, string> = {
  career: "Career",
  season: "Season",
  game: "Game",
};

export function BasketballStatsShareDialog({
  open,
  onOpenChange,
  mode,
  identity,
  seasonId,
  gameId,
}: BasketballStatsShareDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const careerQuery = useQuery<CareerStatsApiResponse>({
    queryKey: ["/api/stats/career"],
    enabled: open && mode === "career",
  });
  const seasonQuery = useQuery<SeasonStatsStoryData>({
    queryKey: ["/api/share/season-stats", seasonId],
    enabled: open && mode === "season" && Boolean(seasonId),
  });
  const gameQuery = useQuery<GameStatsShareResponse>({
    queryKey: ["/api/share/game-stats", gameId],
    enabled: open && mode === "game" && Boolean(gameId),
  });

  const careerData = buildCareerStatsStoryData(careerQuery.data, identity);
  const seasonData = buildSeasonStatsStoryData(seasonQuery.data, identity);
  const gameData = buildGameStatsStoryData(gameQuery.data, identity);

  const activeQuery = mode === "career" ? careerQuery : mode === "season" ? seasonQuery : gameQuery;
  const storyDataExists = Boolean(careerData || seasonData || gameData);
  const title = `Share ${modeLabels[mode]} Stats`;

  const renderStoryCanvas = async () => {
    const card = cardRef.current?.querySelector<HTMLElement>("[data-basketball-story-card]");
    if (!card) throw new Error("The story preview is not ready.");
    if (document.fonts?.ready) await document.fonts.ready;
    return html2canvas(card, {
      width: BASKETBALL_STORY_SIZE.width,
      height: BASKETBALL_STORY_SIZE.height,
      scale: 1,
      backgroundColor: "#090a09",
      useCORS: true,
      logging: false,
    });
  };

  const handleShare = async () => {
    if (!storyDataExists || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      await shareBasketballStatsStoryImage(canvas, mode, toast);
    } catch {
      toast({
        title: `Could not create ${mode} story`,
        description: "Try again after the preview has finished loading.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!storyDataExists || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      const link = document.createElement("a");
      link.download = `playr1-${mode}-stats-story.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: `${modeLabels[mode]} story image download started` });
    } catch {
      toast({
        title: `Could not download ${mode} story`,
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
          <DialogTitle className="font-heading text-xl font-black uppercase tracking-wide">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            A single 9:16 PLAYR1 story image for this {mode} stat recap.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {activeQuery.isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80">
              <div className="w-full max-w-[350px] space-y-3 p-6" aria-label="Loading story preview">
                <Skeleton className="h-5 w-2/5 bg-zinc-800" />
                <Skeleton className="h-12 w-4/5 bg-zinc-800" />
                <Skeleton className="h-20 bg-zinc-900" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-16 bg-zinc-900" />
                  <Skeleton className="h-16 bg-zinc-900" />
                  <Skeleton className="h-16 bg-zinc-900" />
                </div>
              </div>
            </div>
          ) : activeQuery.isError && !storyDataExists ? (
            <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-6 text-center">
              <Image className="mx-auto mb-3 h-8 w-8 text-orange-400" />
              <p className="font-semibold text-white">Story data could not be loaded.</p>
              <p className="mt-1 text-sm text-zinc-400">Check your connection and try again.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4 border-zinc-700"
                onClick={() => activeQuery.refetch()}
                data-testid={`button-retry-${mode}-story`}
              >
                Try again
              </Button>
            </div>
          ) : storyDataExists ? (
            <>
              <div className="flex justify-center overflow-hidden rounded-xl border border-zinc-800 bg-[#080808] p-3">
                <div
                  aria-label={`${modeLabels[mode]} stats story preview`}
                  style={{ width: 324, height: 576, flex: "0 0 auto", position: "relative", overflow: "hidden" }}
                >
                  <div
                    ref={cardRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: BASKETBALL_STORY_SIZE.width,
                      height: BASKETBALL_STORY_SIZE.height,
                      transform: "scale(0.3)",
                      transformOrigin: "top left",
                    }}
                  >
                    <StoryCard mode={mode} careerData={careerData} seasonData={seasonData} gameData={gameData} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={handleShare}
                  disabled={isExporting}
                  className="h-11 bg-orange-500 font-bold text-black hover:bg-orange-400"
                  data-testid={`button-share-${mode}-story`}
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
                  data-testid={`button-download-${mode}-story`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download story image
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-400">
              {mode === "season" ? "Choose a season with saved stats to create a story." : "No story data is available."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
