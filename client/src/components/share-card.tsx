import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Share2, Twitter, Instagram, Facebook, Youtube } from "lucide-react";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ShareCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
}

interface GameStatsRaw {
  playerName: string;
  displayName?: string | null;
  teamName: string;
  jerseyNumber: number;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  gameDate: string;
  result: string;
  schoolName?: string | null;
  positions?: string[] | null;
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

type Platform = "instagram" | "twitter" | "facebook" | "tiktok" | "youtube";

const PLATFORMS: Array<{ id: Platform; label: string; w: number; h: number; scale: number }> = [
  { id: "instagram", label: "Instagram",   w: 1080, h: 1080, scale: 0.30 },
  { id: "twitter",   label: "X / Twitter", w: 1200, h: 675,  scale: 0.35 },
  { id: "facebook",  label: "Facebook",    w: 1200, h: 630,  scale: 0.35 },
  { id: "tiktok",    label: "TikTok",      w: 1080, h: 1920, scale: 0.21 },
  { id: "youtube",   label: "YouTube",     w: 1280, h: 720,  scale: 0.33 },
];

// ─── Design tokens (black, no blue) ──────────────────────────────────────────
const BG    = "#0a0a0a";
const BG2   = "#111111";
const BG3   = "#161616";
const OR    = "#f97316";
const OR15  = "rgba(249,115,22,0.15)";
const OR30  = "rgba(249,115,22,0.30)";
const W90   = "rgba(255,255,255,0.90)";
const W60   = "rgba(255,255,255,0.60)";
const W30   = "rgba(255,255,255,0.30)";
const W12   = "rgba(255,255,255,0.12)";
const W06   = "rgba(255,255,255,0.06)";
const WIN   = "#22c55e";
const LOSS  = "#ef4444";

function pct(made: number, attempted: number): number {
  return attempted > 0 ? Math.round((made / attempted) * 100) : 0;
}
function shotCol(p: number): string {
  if (p >= 55) return WIN;
  if (p >= 40) return OR;
  return LOSS;
}

// ─── The actual card ──────────────────────────────────────────────────────────
function GameCard({ raw, platform }: { raw: GameStatsRaw; platform: Platform }) {
  const cfg  = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad  = Math.round(W * 0.035);
  const isTT = platform === "tiktok";
  const isWide = W >= 1200;

  const name   = raw.displayName || raw.playerName || "Player";
  const result = (raw.result || "").toUpperCase();
  const isWin  = result === "W";
  const hasScore = raw.teamScore != null && raw.opponentScore != null;

  const st = raw.stats;
  const fgPct  = pct(st.fgMade,     st.fgAttempted);
  const tpPct  = pct(st.threePtMade, st.threePtAttempted);
  const ftPct  = pct(st.ftMade,     st.ftAttempted);

  const bigFs  = isTT ? "3.4em" : isWide ? "3.0em" : "2.8em";
  const midFs  = isTT ? "2.0em" : "1.7em";
  const bodyFs = isTT ? 14 : 12;
  const lblFs  = isTT ? "0.60em" : "0.50em";

  const scoreNum = isTT ? "4.0em" : isWide ? "3.4em" : "3.0em";

  // Sub-stats: rebounds, assists, steals, blocks
  const subStats = [
    { val: st.rebounds, label: "REB" },
    { val: st.assists,  label: "AST" },
    { val: st.steals,   label: "STL" },
    { val: st.blocks,   label: "BLK" },
  ];

  const splits = [
    { label: "FG%",  pct: fgPct,  made: st.fgMade,     att: st.fgAttempted },
    { label: "3PT%", pct: tpPct,  made: st.threePtMade, att: st.threePtAttempted },
    { label: "FT%",  pct: ftPct,  made: st.ftMade,     att: st.ftAttempted },
  ];

  return (
    <div style={{ width: W*s, height: H*s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={{
        width: W, height: H, position: "absolute", top: 0, left: 0,
        background: `linear-gradient(160deg, ${BG} 0%, ${BG2} 55%, ${BG3} 100%)`,
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        color: "#fff", overflow: "hidden", display: "flex", flexDirection: "column",
        boxSizing: "border-box",
      }}>
        {/* Left orange accent */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 5, height: "100%",
          background: `linear-gradient(180deg, ${OR} 0%, rgba(249,115,22,0.15) 100%)`, zIndex: 10 }} />

        {/* Subtle diagonal glow */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 380, height: 380,
          borderRadius: "50%", background: `radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)`,
          pointerEvents: "none" }} />

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: `${pad*0.7}px ${pad}px`, borderBottom: `1px solid ${OR30}`,
          background: "rgba(0,0,0,0.35)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={playr1Logo} width={isTT?54:44} height={isTT?54:44}
              style={{ borderRadius: 10, objectFit: "contain", background: OR, padding: 4 }}
              alt="PLAYR1" crossOrigin="anonymous" />
            <span style={{ fontWeight: 900, fontSize: isTT?"1.05em":"0.85em",
              letterSpacing: "0.04em", color: "#fff" }}>PLAYR1</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: OR, fontWeight: 700, fontSize: isTT?"0.70em":"0.60em",
              letterSpacing: "0.10em", textTransform: "uppercase" }}>Game Day Stats</div>
            {raw.gameDate && (
              <div style={{ color: W30, fontSize: isTT?"0.60em":"0.52em", marginTop: 3 }}>
                {new Date(raw.gameDate).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
              </div>
            )}
          </div>
        </div>

        {/* ── Player identity ── */}
        <div style={{ display: "flex", alignItems: "center", gap: pad,
          padding: `${pad*0.65}px ${pad}px`, borderBottom: `1px solid ${W12}`,
          background: "rgba(0,0,0,0.20)", flexShrink: 0 }}>
          {/* Jersey bubble */}
          {raw.jerseyNumber != null && (
            <div style={{ background: OR15, border: `2px solid ${OR30}`, borderRadius: 12,
              padding: isTT?"16px 22px":"12px 18px", textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: isTT?"2.4em":"1.9em", fontWeight: 900, color: OR, lineHeight: 1 }}>
                #{raw.jerseyNumber}
              </div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: isTT?"2.0em":isWide?"1.7em":"1.55em",
              letterSpacing: "-0.01em", color: "#fff", lineHeight: 1.1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ color: W60, fontSize: isTT?"0.75em":"0.62em", marginTop: 4 }}>
              {[raw.teamName, raw.schoolName, raw.positions?.join(" / ")].filter(Boolean).join(" · ")}
            </div>
          </div>
          {/* Win/Loss badge */}
          {result && (
            <div style={{ flexShrink: 0, background: isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `2px solid ${isWin ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              borderRadius: 10, padding: isTT?"12px 20px":"10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: isTT?"2.0em":"1.6em", fontWeight: 900, lineHeight: 1,
                color: isWin ? WIN : LOSS }}>{result}</div>
              <div style={{ fontSize: isTT?"0.60em":"0.52em", color: W30,
                letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>Result</div>
            </div>
          )}
        </div>

        {/* ── Score banner ── */}
        {hasScore && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            gap: pad, padding: `${pad*0.5}px ${pad}px`, borderBottom: `1px solid ${W12}`,
            background: OR15, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: scoreNum, fontWeight: 900, lineHeight: 1,
                color: isWin ? WIN : "#fff" }}>{raw.teamScore}</div>
              <div style={{ fontSize: isTT?"0.60em":"0.50em", color: W60,
                letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 4 }}>
                {raw.teamName || "Team"}
              </div>
            </div>
            <div style={{ fontSize: isTT?"2.2em":"1.8em", color: W30, fontWeight: 300, lineHeight: 1 }}>—</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: scoreNum, fontWeight: 900, lineHeight: 1,
                color: isWin ? "#fff" : LOSS }}>{raw.opponentScore}</div>
              <div style={{ fontSize: isTT?"0.60em":"0.50em", color: W60,
                letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 4 }}>
                vs {raw.opponent || "Opponent"}
              </div>
            </div>
          </div>
        )}

        {/* ── Big PTS + sub-stats ── */}
        <div style={{ display: "flex", alignItems: "stretch", flexShrink: 0,
          borderBottom: `1px solid ${W12}` }}>
          {/* Points — hero stat */}
          <div style={{ textAlign: "center", padding: `${pad*0.7}px ${pad}px`,
            background: OR15, borderRight: `1px solid ${OR30}`, flexShrink: 0,
            display: "flex", flexDirection: "column", justifyContent: "center", minWidth: isTT?200:160 }}>
            <div style={{ fontSize: bigFs, fontWeight: 900, letterSpacing: "-0.03em",
              lineHeight: 1.0, color: OR }}>{st.points}</div>
            <div style={{ fontSize: lblFs, color: W60, letterSpacing: "0.12em",
              fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>Points</div>
          </div>
          {/* Secondary stats */}
          <div style={{ flex: 1, display: "flex" }}>
            {subStats.map((item, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center",
                padding: `${pad*0.7}px 4px`,
                borderRight: i < subStats.length-1 ? `1px solid ${W12}` : "none",
                background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : W06 }}>
                <div style={{ fontSize: midFs, fontWeight: 800, letterSpacing: "-0.02em",
                  lineHeight: 1.0, color: "#fff" }}>{item.val}</div>
                <div style={{ fontSize: lblFs, color: W60, letterSpacing: "0.10em",
                  fontWeight: 600, marginTop: 5, textTransform: "uppercase" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Shooting splits ── */}
        <div style={{ padding: `${pad*0.6}px ${pad}px`, borderBottom: `1px solid ${W12}`,
          background: "rgba(0,0,0,0.20)", flexShrink: 0 }}>
          <div style={{ fontSize: isTT?13:11, fontWeight: 700, letterSpacing: "0.12em",
            color: OR, textTransform: "uppercase", marginBottom: 12 }}>Shooting Splits</div>
          <div style={{ display: "flex", flexDirection: "column", gap: isTT?12:9 }}>
            {splits.map((sp, i) => {
              const col = shotCol(sp.pct);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: bodyFs, fontWeight: 700, color: col, minWidth: 44 }}>{sp.label}</span>
                  <span style={{ fontSize: isTT?"1.55em":"1.25em", fontWeight: 900, color: col,
                    minWidth: 60, textAlign: "right" }}>{sp.pct}%</span>
                  <div style={{ flex: 1, height: isTT?10:8, background: W06, borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, sp.pct)}%`, height: "100%",
                      background: col, borderRadius: 6 }} />
                  </div>
                  {sp.att > 0 && (
                    <span style={{ fontSize: bodyFs*0.88, color: W30, flexShrink: 0,
                      minWidth: 80, textAlign: "right" }}>
                      {sp.made}/{sp.att}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Shot totals + game context ── */}
        <div style={{ flex: 1, display: "flex", gap: pad,
          padding: `${pad*0.6}px ${pad}px`, minHeight: 0, overflow: "hidden" }}>

          {/* Shot totals column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: isTT?12:9 }}>
            <div style={{ fontSize: isTT?13:11, fontWeight: 700, letterSpacing: "0.12em",
              color: OR, textTransform: "uppercase", marginBottom: 4 }}>Shot Detail</div>
            {[
              { label: "Field Goals",  made: st.fgMade,     att: st.fgAttempted,     pct: fgPct },
              { label: "3-Pointers",   made: st.threePtMade, att: st.threePtAttempted, pct: tpPct },
              { label: "Free Throws",  made: st.ftMade,     att: st.ftAttempted,     pct: ftPct },
              // 2PT can be derived
              ...(st.fgAttempted > 0 && st.threePtAttempted <= st.fgAttempted ? [{
                label: "2-Pointers",
                made: Math.max(0, st.fgMade - st.threePtMade),
                att:  Math.max(0, st.fgAttempted - st.threePtAttempted),
                pct:  pct(Math.max(0, st.fgMade - st.threePtMade), Math.max(0, st.fgAttempted - st.threePtAttempted)),
              }] : []),
            ].map((row, i) => row.att > 0 && (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                padding: `${isTT?10:8}px ${isTT?14:12}px`, background: W06, borderRadius: 8,
                borderLeft: `3px solid ${shotCol(row.pct)}` }}>
                <span style={{ flex: 1, fontSize: bodyFs, color: W60 }}>{row.label}</span>
                <span style={{ fontWeight: 700, fontSize: bodyFs, color: shotCol(row.pct) }}>
                  {row.pct}%
                </span>
                <span style={{ fontSize: bodyFs*0.88, color: W30, minWidth: 55, textAlign: "right" }}>
                  {row.made}/{row.att}
                </span>
              </div>
            ))}
          </div>

          {/* Efficiency summary box */}
          <div style={{ flexShrink: 0, width: isTT ? Math.round(W*0.32) : Math.round(W*0.28),
            display: "flex", flexDirection: "column", gap: isTT?12:9 }}>
            <div style={{ fontSize: isTT?13:11, fontWeight: 700, letterSpacing: "0.12em",
              color: OR, textTransform: "uppercase", marginBottom: 4 }}>Efficiency</div>

            {/* True shooting % (pts / 2*(FGA + 0.44*FTA)) */}
            {(() => {
              const fga = st.fgAttempted, fta = st.ftAttempted;
              const ts = fga + 0.44*fta > 0
                ? Math.round((st.points / (2*(fga + 0.44*fta)))*100) : 0;
              const eqp = Math.max(0, st.points - (st.fgAttempted - st.fgMade) - (0.44*st.ftAttempted - st.ftMade));
              return (
                <div style={{ background: OR15, border: `1px solid ${OR30}`, borderRadius: 12,
                  padding: isTT?"20px 16px":"16px 12px", textAlign: "center", flex: 1,
                  display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: isTT?"2.8em":"2.2em", fontWeight: 900, color: OR, lineHeight: 1 }}>
                      {ts}%
                    </div>
                    <div style={{ fontSize: isTT?"0.60em":"0.50em", color: W60,
                      letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5 }}>
                      True Shooting
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${W12}`, paddingTop: 10 }}>
                    <div style={{ fontSize: isTT?"1.9em":"1.5em", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                      {fgPct}%
                    </div>
                    <div style={{ fontSize: isTT?"0.58em":"0.48em", color: W60,
                      letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
                      Field Goal %
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${W12}`, paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-around" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: isTT?"1.4em":"1.15em", fontWeight: 800,
                          color: shotCol(tpPct), lineHeight: 1 }}>{tpPct}%</div>
                        <div style={{ fontSize: isTT?"0.52em":"0.44em", color: W30,
                          letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 3 }}>3PT</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: isTT?"1.4em":"1.15em", fontWeight: 800,
                          color: shotCol(ftPct), lineHeight: 1 }}>{ftPct}%</div>
                        <div style={{ fontSize: isTT?"0.52em":"0.44em", color: W30,
                          letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 3 }}>FT</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: `9px ${pad}px`, borderTop: `1px solid ${OR30}`,
          background: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={playr1Logo} width={22} height={22}
              style={{ borderRadius: 5, background: OR, padding: 2, objectFit: "contain" }}
              alt="PLAYR1" crossOrigin="anonymous" />
            <span style={{ fontWeight: 900, fontSize: "0.70em", letterSpacing: "0.18em",
              color: "rgba(249,115,22,0.6)" }}>PLAYR1</span>
          </div>
          <span style={{ color: W30, fontSize: "0.55em" }}>playr1.app</span>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Platform icon ─────────────────────────────────────────────────────────────
function PlatformIcon({ p }: { p: Platform }) {
  if (p === "twitter")   return <Twitter className="w-3.5 h-3.5" />;
  if (p === "instagram") return <Instagram className="w-3.5 h-3.5" />;
  if (p === "facebook")  return <Facebook className="w-3.5 h-3.5" />;
  if (p === "youtube")   return <Youtube className="w-3.5 h-3.5" />;
  return <span className="text-[10px] font-black leading-none">TT</span>;
}

// ─── Dialog ────────────────────────────────────────────────────────────────────
export function ShareCardDialog({ open, onOpenChange, gameId }: ShareCardDialogProps) {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [isBusy, setIsBusy]     = useState(false);
  const cardRef  = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: raw, isLoading } = useQuery<GameStatsRaw>({
    queryKey: ["/api/share/game-stats", gameId],
    enabled: open && !!gameId,
  });

  const cfg = PLATFORMS.find(p => p.id === platform)!;

  const capture = async () => {
    if (!cardRef.current) return null;
    const el = cardRef.current.querySelector("[data-share-card]") as HTMLElement;
    if (!el) return null;
    return html2canvas(el, {
      width: cfg.w, height: cfg.h, scale: 1,
      backgroundColor: null, logging: false, useCORS: true, allowTaint: true,
    });
  };

  const handleDownload = async () => {
    setIsBusy(true);
    try {
      const canvas = await capture();
      if (!canvas) { toast({ title: "Could not capture card", variant: "destructive" }); return; }
      const link = document.createElement("a");
      link.download = `playr1-game-${platform}-${gameId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Card saved!" });
    } finally { setIsBusy(false); }
  };

  const handleCopyCaption = () => {
    if (!raw) return;
    const s = raw.stats;
    const fgP = pct(s.fgMade, s.fgAttempted);
    const tpP = pct(s.threePtMade, s.threePtAttempted);
    const ftP = pct(s.ftMade, s.ftAttempted);
    const dateStr = raw.gameDate ? new Date(raw.gameDate).toLocaleDateString() : "";
    const text = [
      `🏀 GAME DAY STATS · ${dateStr}`,
      `${raw.displayName || raw.playerName}${raw.jerseyNumber != null ? ` #${raw.jerseyNumber}` : ""}${raw.teamName ? ` | ${raw.teamName}` : ""}`,
      `vs ${raw.opponent} · ${raw.result} ${raw.teamScore}-${raw.opponentScore}`,
      "",
      `🔥 ${s.points} PTS · ${s.rebounds} REB · ${s.assists} AST · ${s.steals} STL · ${s.blocks} BLK`,
      `🎯 FG ${fgP}% (${s.fgMade}/${s.fgAttempted}) · 3PT ${tpP}% (${s.threePtMade}/${s.threePtAttempted}) · FT ${ftP}% (${s.ftMade}/${s.ftAttempted})`,
      "",
      "Track your game → https://playr1basketball.replit.app",
      "",
      "#PLAYR1 #Basketball #GameDay #HoopLife",
    ].join("\n");
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: "Caption copied!" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="dialog-share-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-share-card-title">
            <Share2 className="w-4 h-4 text-primary" />
            Share Game Stats
          </DialogTitle>
        </DialogHeader>

        {/* Platform selector */}
        <div className="flex flex-wrap gap-1.5" data-testid="tabs-platform-selector">
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setPlatform(p.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-colors
                ${platform === p.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              data-testid={`tab-platform-${p.id}`}>
              <PlatformIcon p={p.id} />
              <span>{p.label.split(" /")[0]}</span>
              <span className="text-[10px] opacity-50 hidden sm:inline">{p.w}×{p.h}</span>
            </button>
          ))}
        </div>

        {/* Card preview */}
        <div className="flex justify-center items-center bg-[#111] border border-border rounded-xl overflow-hidden"
          style={{ minHeight: 240 }}>
          {isLoading ? (
            <Skeleton className="w-full h-52 rounded-lg" />
          ) : raw ? (
            <div ref={cardRef}>
              <GameCard raw={raw} platform={platform} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-10 px-4" data-testid="text-no-stats">
              No stats available for this game
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
          <Badge variant="outline" className="text-xs text-muted-foreground mr-auto">
            {cfg.label} · {cfg.w}×{cfg.h}px
          </Badge>
          <Button variant="outline" size="sm" onClick={handleCopyCaption}
            disabled={!raw} className="gap-1.5 text-xs" data-testid="button-copy-stats">
            <Copy className="w-3.5 h-3.5" /> Copy Caption
          </Button>
          <Button size="sm" onClick={handleDownload}
            disabled={!raw || isBusy} className="gap-1.5 text-xs" data-testid="button-download-card">
            <Download className="w-3.5 h-3.5" />
            {isBusy ? "Saving…" : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
