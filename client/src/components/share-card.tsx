import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Twitter, Instagram, Facebook, Youtube } from "lucide-react";

interface ShareCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
}

interface GameStatsRaw {
  playerName: string;
  teamName: string;
  jerseyNumber: number;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  gameDate: string;
  result: string;
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fgMade: number;
    fgAttempted: number;
    threePtMade: number;
    threePtAttempted: number;
    ftMade: number;
    ftAttempted: number;
  };
}

function computePercentage(made: number, attempted: number): number {
  if (!attempted) return 0;
  return Math.round((made / attempted) * 100);
}

interface GameStatsDisplay {
  playerName: string;
  teamName: string;
  jerseyNumber: number;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  date: string;
  result: string;
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fgMade: number;
    fgAttempted: number;
    fgPercentage: number;
    threePtMade: number;
    threePtAttempted: number;
    threePtPercentage: number;
    ftMade: number;
    ftAttempted: number;
    ftPercentage: number;
  };
}

function mapRawToDisplay(raw: GameStatsRaw): GameStatsDisplay {
  return {
    ...raw,
    date: raw.gameDate ? new Date(raw.gameDate).toLocaleDateString() : "",
    stats: {
      ...raw.stats,
      fgPercentage: computePercentage(raw.stats.fgMade, raw.stats.fgAttempted),
      threePtPercentage: computePercentage(raw.stats.threePtMade, raw.stats.threePtAttempted),
      ftPercentage: computePercentage(raw.stats.ftMade, raw.stats.ftAttempted),
    },
  };
}

type Platform = "twitter" | "instagram" | "facebook" | "youtube" | "tiktok";

const PLATFORM_CONFIG: Record<Platform, { label: string; width: number; height: number; tip: string }> = {
  twitter: { label: "X / Twitter", width: 1200, height: 675, tip: "Best for timeline posts and game recaps" },
  instagram: { label: "Instagram", width: 1080, height: 1080, tip: "Best for stories and feed posts" },
  facebook: { label: "Facebook", width: 1200, height: 630, tip: "Best for shared posts and highlights" },
  youtube: { label: "YouTube", width: 1280, height: 720, tip: "Best for community posts and thumbnails" },
  tiktok: { label: "TikTok", width: 1080, height: 1920, tip: "Best for portrait video overlays" },
};

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-center" data-testid={`stat-block-${label.toLowerCase()}`}>
      <span style={{ fontSize: "1.5em", fontWeight: 700, color: "#f97316", lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: "0.65em", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

function ShareCard({ data, platform }: { data: GameStatsDisplay; platform: Platform }) {
  const config = PLATFORM_CONFIG[platform];
  const scale = platform === "tiktok" ? 0.22 : 0.35;
  const previewWidth = config.width * scale;
  const previewHeight = config.height * scale;
  const isPortrait = platform === "tiktok";
  const isSquare = platform === "instagram";

  return (
    <div
      className="mx-auto"
      style={{ width: previewWidth, height: previewHeight, position: "relative" }}
    >
      <div
        data-share-card
        style={{
          width: config.width,
          height: config.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: isPortrait ? "center" : "space-between",
          padding: isPortrait ? "80px 60px" : isSquare ? "50px 50px" : "40px 60px",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: "#fff",
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.1) 40px,
            rgba(255,255,255,0.1) 41px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 40px,
            rgba(255,255,255,0.1) 40px,
            rgba(255,255,255,0.1) 41px
          )`,
          pointerEvents: "none",
        }} />

        <div style={{
          position: "absolute",
          top: isPortrait ? "15%" : "20%",
          right: "-5%",
          width: isPortrait ? "400px" : "300px",
          height: isPortrait ? "400px" : "300px",
          borderRadius: "50%",
          border: "3px solid rgba(249, 115, 22, 0.1)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: isPortrait ? 40 : 16,
          }}>
            <div style={{
              background: "#f97316",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 800,
              fontSize: isPortrait ? "1.8em" : "1.2em",
              letterSpacing: "0.02em",
            }}>
              #{data.jerseyNumber}
            </div>
            <div>
              <div style={{
                fontWeight: 800,
                fontSize: isPortrait ? "2.2em" : isSquare ? "2em" : "1.6em",
                lineHeight: 1.1,
              }}>
                {data.playerName}
              </div>
              <div style={{ color: "#94a3b8", fontSize: isPortrait ? "1.2em" : "0.9em" }}>
                {data.teamName}
              </div>
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: isPortrait ? 60 : isSquare ? 40 : 24,
            padding: "12px 20px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            borderLeft: "4px solid #f97316",
          }}>
            <span style={{
              fontWeight: 700,
              fontSize: isPortrait ? "1.4em" : "1.1em",
              color: data.result === "W" ? "#22c55e" : "#ef4444",
            }}>
              {data.result}
            </span>
            <span style={{ fontSize: isPortrait ? "1.2em" : "1em" }}>
              vs. {data.opponent}
            </span>
            <span style={{
              fontWeight: 800,
              fontSize: isPortrait ? "1.6em" : "1.2em",
              marginLeft: "auto",
            }}>
              {data.teamScore} - {data.opponentScore}
            </span>
            <span style={{ color: "#94a3b8", fontSize: isPortrait ? "0.9em" : "0.75em" }}>
              {data.date}
            </span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isPortrait ? "repeat(3, 1fr)" : isSquare ? "repeat(5, 1fr)" : "repeat(5, 1fr)",
            gap: isPortrait ? 24 : 16,
            textAlign: "center",
            marginBottom: isPortrait ? 40 : 16,
          }}>
            <StatBlock label="PTS" value={data.stats.points} />
            <StatBlock label="REB" value={data.stats.rebounds} />
            <StatBlock label="AST" value={data.stats.assists} />
            <StatBlock label="STL" value={data.stats.steals} />
            <StatBlock label="BLK" value={data.stats.blocks} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: isPortrait ? 24 : 16,
            textAlign: "center",
            padding: isPortrait ? "24px 0" : "12px 0",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}>
            <StatBlock label="FG%" value={`${data.stats.fgPercentage}%`} />
            <StatBlock label="3P%" value={`${data.stats.threePtPercentage}%`} />
            <StatBlock label="FT%" value={`${data.stats.ftPercentage}%`} />
          </div>
        </div>

        <div style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <span style={{
            fontWeight: 900,
            fontSize: isPortrait ? "1.4em" : "1em",
            letterSpacing: "0.15em",
            color: "rgba(249, 115, 22, 0.6)",
          }}>
            PLAYR1
          </span>
          <span style={{ color: "#64748b", fontSize: isPortrait ? "0.8em" : "0.65em" }}>
            GAME DAY STATS
          </span>
        </div>
      </div>
    </div>
  );
}

export function ShareCardDialog({ open, onOpenChange, gameId }: ShareCardDialogProps) {
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: rawStats, isLoading } = useQuery<GameStatsRaw>({
    queryKey: ["/api/share/game-stats", gameId],
    enabled: open && !!gameId,
  });

  const gameStats = rawStats ? mapRawToDisplay(rawStats) : null;

  const handleCopyStats = () => {
    if (!gameStats) return;

    const s = gameStats.stats;
    const text = `GAME DAY STATS
${gameStats.playerName} | #${gameStats.jerseyNumber} | ${gameStats.teamName}
vs. ${gameStats.opponent} | ${gameStats.result} ${gameStats.teamScore}-${gameStats.opponentScore}

PTS: ${s.points} | REB: ${s.rebounds} | AST: ${s.assists}
STL: ${s.steals} | BLK: ${s.blocks}
FG: ${s.fgMade}/${s.fgAttempted} (${s.fgPercentage}%) | 3PT: ${s.threePtMade}/${s.threePtAttempted} (${s.threePtPercentage}%)

#PLAYR1 #Basketball`;

    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Stats copied to clipboard!" });
    }).catch(() => {
      toast({ title: "Failed to copy stats", variant: "destructive" });
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);

    try {
      const cardElement = cardRef.current.querySelector("[data-share-card]") as HTMLElement;
      if (!cardElement) return;

      const config = PLATFORM_CONFIG[platform];
      const canvas = await html2canvas(cardElement, {
        width: config.width,
        height: config.height,
        scale: 1,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `playr1-stats-${platform}-${gameId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "Card downloaded!" });
    } catch {
      toast({ title: "Failed to download card", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const platformIcon = (p: Platform) => {
    switch (p) {
      case "twitter": return <Twitter className="w-4 h-4" />;
      case "instagram": return <Instagram className="w-4 h-4" />;
      case "facebook": return <Facebook className="w-4 h-4" />;
      case "youtube": return <Youtube className="w-4 h-4" />;
      case "tiktok": return <span className="text-xs font-bold">TT</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-share-card">
        <DialogHeader>
          <DialogTitle data-testid="text-share-card-title">Share Game Stats</DialogTitle>
        </DialogHeader>

        <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
          <TabsList className="w-full flex flex-wrap gap-1" data-testid="tabs-platform-selector">
            {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => (
              <TabsTrigger key={p} value={p} className="flex items-center gap-1" data-testid={`tab-platform-${p}`}>
                {platformIcon(p)}
                <span className="hidden sm:inline">{PLATFORM_CONFIG[p].label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => (
            <TabsContent key={p} value={p}>
              <div className="text-center mb-3">
                <Badge variant="outline" className="no-default-hover-elevate" data-testid={`badge-platform-tip-${p}`}>
                  {PLATFORM_CONFIG[p].tip}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {PLATFORM_CONFIG[p].width} x {PLATFORM_CONFIG[p].height}
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Skeleton className="w-full h-64 rounded-lg" />
                </div>
              ) : gameStats ? (
                <div ref={cardRef} className="flex justify-center">
                  <ShareCard data={gameStats} platform={p} />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-stats">
                  No stats available for this game
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCopyStats}
            disabled={!gameStats}
            data-testid="button-copy-stats"
          >
            <Copy className="w-4 h-4" />
            Copy Stats
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!gameStats || isDownloading}
            data-testid="button-download-card"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
