import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, Share2, Twitter, Instagram, Facebook, Youtube } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { shareToSocialPlatform } from "@/lib/share-utils";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

// ─── Platform Config ──────────────────────────────────────────────────────────
type Platform = "instagram" | "twitter" | "facebook" | "tiktok" | "youtube";
type CardType = "workout" | "week" | "month" | "year" | "season";

const PLATFORMS: Array<{ id: Platform; label: string; w: number; h: number; scale: number }> = [
  { id: "instagram", label: "Instagram", w: 1080, h: 1080, scale: 0.30 },
  { id: "twitter",   label: "X / Twitter", w: 1200, h: 675,  scale: 0.35 },
  { id: "facebook",  label: "Facebook",  w: 1200, h: 630,  scale: 0.35 },
  { id: "tiktok",    label: "TikTok",    w: 1080, h: 1920, scale: 0.21 },
  { id: "youtube",   label: "YouTube",   w: 1280, h: 720,  scale: 0.33 },
];

const PERIOD_LABEL: Record<string, string> = { week: "Weekly Recap", month: "Monthly Recap", year: "Year in Review" };

const CAT_COLORS: Record<string, string> = {
  "shooting": "#f97316",
  "ball-handling": "#fb923c",
  "finishing": "#22c55e",
  "passing": "#a78bfa",
  "defense": "#ef4444",
  "film-session": "#14b8a6",
  "workouts": "#eab308",
  "general": "#94a3b8",
};

// ─── Shot Zone Definitions ────────────────────────────────────────────────────
const ZONE_DEFS: Record<string, { cx: number; cy: number; rx: number; ry: number; label: string; is3pt?: boolean }> = {
  "top-of-key":           { cx: 250, cy: 40,  rx: 80, ry: 26, label: "Top of Key",       is3pt: true },
  "wing-left":            { cx: 52,  cy: 130, rx: 28, ry: 42, label: "Wing Left",        is3pt: true },
  "wing-right":           { cx: 448, cy: 130, rx: 28, ry: 42, label: "Wing Right",       is3pt: true },
  "corner-left":          { cx: 17,  cy: 375, rx: 12, ry: 52, label: "Corner Left",      is3pt: true },
  "corner-right":         { cx: 483, cy: 375, rx: 12, ry: 52, label: "Corner Right",     is3pt: true },
  "free-throw":           { cx: 250, cy: 208, rx: 52, ry: 38, label: "Free Throw"                    },
  "elbow-left":           { cx: 168, cy: 247, rx: 26, ry: 16, label: "Elbow Left"                    },
  "elbow-right":          { cx: 332, cy: 247, rx: 26, ry: 16, label: "Elbow Right"                   },
  "mid-range-left":       { cx: 102, cy: 228, rx: 52, ry: 28, label: "Mid-range Left"                },
  "mid-range-right":      { cx: 398, cy: 228, rx: 52, ry: 28, label: "Mid-range Right"               },
  "3rd-hash-left":        { cx: 80,  cy: 188, rx: 38, ry: 24, label: "3rd Hash Left"                 },
  "3rd-hash-right":       { cx: 420, cy: 188, rx: 38, ry: 24, label: "3rd Hash Right"                },
  "2nd-hash-left":        { cx: 96,  cy: 270, rx: 40, ry: 24, label: "2nd Hash Left"                 },
  "2nd-hash-right":       { cx: 404, cy: 270, rx: 40, ry: 24, label: "2nd Hash Right"                },
  "1st-hash-left":        { cx: 126, cy: 325, rx: 42, ry: 24, label: "1st Hash Left"                 },
  "1st-hash-right":       { cx: 374, cy: 325, rx: 42, ry: 24, label: "1st Hash Right"                },
  "block-left":           { cx: 163, cy: 382, rx: 30, ry: 20, label: "Block Left"                    },
  "block-right":          { cx: 337, cy: 382, rx: 30, ry: 20, label: "Block Right"                   },
  "floaters":             { cx: 250, cy: 293, rx: 80, ry: 48, label: "Floaters"                      },
  "form-shots-front":     { cx: 250, cy: 293, rx: 80, ry: 48, label: "Form Shots"                    },
  "post-shots":           { cx: 250, cy: 388, rx: 40, ry: 48, label: "Post Shots"                    },
  "left-corner-mid-range":  { cx: 102, cy: 340, rx: 44, ry: 24, label: "Short Corner L"             },
  "right-corner-mid-range": { cx: 398, cy: 340, rx: 44, ry: 24, label: "Short Corner R"             },
  "wing-left-mid-range":  { cx: 96,  cy: 210, rx: 38, ry: 22, label: "Wing Left Mid"               },
  "wing-right-mid-range": { cx: 404, cy: 210, rx: 38, ry: 22, label: "Wing Right Mid"              },
  "top-of-key-3-point":   { cx: 250, cy: 120, rx: 68, ry: 28, label: "Top Key 2PT"                 },
  "left-hand-layup":      { cx: 195, cy: 415, rx: 26, ry: 18, label: "Left Layup"                  },
  "right-hand-layup":     { cx: 305, cy: 415, rx: 26, ry: 18, label: "Right Layup"                 },
};

function zoneColor(pct: number): string {
  if (pct <= 30) return "#6B0E0E";
  if (pct <= 38) return "#9B1F0A";
  if (pct <= 45) return "#C03410";
  if (pct <= 52) return "#C86020";
  if (pct <= 58) return "#9B7820";
  if (pct <= 65) return "#6B7A20";
  if (pct <= 72) return "#3D7A2A";
  if (pct <= 80) return "#2E8E2E";
  if (pct <= 88) return "#1AA81A";
  return "#0DC80D";
}
function zoneOpacity(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0.78;
  return 0.72 + 0.18 * Math.sqrt(total / maxTotal);
}
function fmtMin(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`;
  return `${mins}m`;
}

// ─── Exact CourtSVG replica (pure data → SVG) ─────────────────────────────────
function CourtSVG({ shotData, width, height }: {
  shotData: Array<{ location: string; made: number; attempted: number }>;
  width: number; height: number;
}) {
  const processed: Record<string, { made: number; missed: number }> = {};
  shotData.forEach(s => {
    if (!processed[s.location]) processed[s.location] = { made: 0, missed: 0 };
    processed[s.location].made   += s.made;
    processed[s.location].missed += Math.max(0, s.attempted - s.made);
  });
  const maxTotal = Math.max(1, ...Object.values(processed).map(d => d.made + d.missed));

  return (
    <svg viewBox="0 0 500 470" width={width} height={height} style={{ display: "block" }}>
      <rect x="0" y="0" width="500" height="435" fill="#000000" />
      <rect x="0" y="435" width="500" height="35" fill="#0a0a0a" />
      {Object.entries(ZONE_DEFS).map(([name, z]) => (
        <ellipse key={`base-${name}`} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
          fill="#1a1a1a" opacity={0.85} stroke="white" strokeWidth="0.6" strokeOpacity="0.18" />
      ))}
      {Object.entries(processed).map(([loc, d]) => {
        const z = ZONE_DEFS[loc];
        if (!z) return null;
        const total = d.made + d.missed;
        const pct   = total > 0 ? Math.round((d.made / total) * 100) : 0;
        const fill  = zoneColor(pct);
        const alpha = zoneOpacity(total, maxTotal);
        const showPct  = z.rx >= 24 && z.ry >= 22;
        const showText = z.rx >= 24 && z.ry >= 16;
        return (
          <g key={loc}>
            <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill={fill} opacity={alpha} stroke={fill} strokeWidth="1.5" strokeOpacity="0.4" />
            {showPct && (
              <text x={z.cx} y={z.cy + 4} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={z.rx < 36 ? "9" : "11"} fontWeight="700"
                stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" paintOrder="stroke">{pct}%</text>
            )}
            {showText && (
              <text x={z.cx} y={z.cy + (showPct ? 14 : 4)} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="8" fontWeight="500"
                stroke="rgba(0,0,0,0.4)" strokeWidth="2" paintOrder="stroke">{d.made}/{total}</text>
            )}
          </g>
        );
      })}
      {/* Court lines */}
      <rect x="5" y="5" width="490" height="460" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="5" y1="5" x2="495" y2="5" stroke="white" strokeWidth="2" />
      <line x1="5" y1="435" x2="495" y2="435" stroke="white" strokeWidth="2" />
      <path d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435" fill="none" stroke="white" strokeWidth="2" />
      <rect x="170" y="245" width="160" height="190" fill="none" stroke="white" strokeWidth="2" />
      <path d="M 170 245 A 80 80 0 0 1 330 245" fill="none" stroke="white" strokeWidth="2" />
      <path d="M 330 245 A 80 80 0 0 1 170 245" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="8,6" />
      <path d="M 210 435 A 40 40 0 0 1 290 435" fill="none" stroke="white" strokeWidth="1.5" />
      <rect x="220" y="420" width="60" height="4" fill="white" />
      <circle cx="250" cy="405" r="9" fill="none" stroke="#E55039" strokeWidth="2.5" />
      <rect x="151" y="311" width="19" height="8" fill="white" />
      <rect x="330" y="311" width="19" height="8" fill="white" />
      <rect x="151" y="343" width="19" height="8" fill="white" />
      <rect x="330" y="343" width="19" height="8" fill="white" />
      <rect x="151" y="373" width="19" height="8" fill="white" />
      <rect x="330" y="373" width="19" height="8" fill="white" />
      <line x1="170" y1="320" x2="151" y2="320" stroke="white" strokeWidth="1.5" />
      <line x1="330" y1="320" x2="349" y2="320" stroke="white" strokeWidth="1.5" />
      <line x1="170" y1="350" x2="151" y2="350" stroke="white" strokeWidth="1.5" />
      <line x1="330" y1="350" x2="349" y2="350" stroke="white" strokeWidth="1.5" />
      <line x1="170" y1="380" x2="151" y2="380" stroke="white" strokeWidth="1.5" />
      <line x1="330" y1="380" x2="349" y2="380" stroke="white" strokeWidth="1.5" />
      {/* Legend */}
      <g transform="translate(28,450)">
        <text x="0" y="9" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="Arial,sans-serif">Cold</text>
        {["#6B0E0E","#9B1F0A","#C03410","#C86020","#9B7820","#6B7A20","#3D7A2A","#2E8E2E","#1AA81A","#0DC80D"].map((c,i) => (
          <rect key={c} x={30 + i * 18} y="1" width="18" height="12" fill={c} />
        ))}
        <text x="216" y="9" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="Arial,sans-serif">Hot</text>
      </g>
    </svg>
  );
}

// ─── Design tokens (black/dark grey — zero blue) ──────────────────────────────
const BG     = "#0a0a0a";
const BG2    = "#111111";
const BG3    = "#161616";
const ORANGE = "#f97316";
const OR15   = "rgba(249,115,22,0.15)";
const OR30   = "rgba(249,115,22,0.30)";
const W90    = "rgba(255,255,255,0.90)";
const W60    = "rgba(255,255,255,0.60)";
const W30    = "rgba(255,255,255,0.30)";
const W12    = "rgba(255,255,255,0.12)";
const W06    = "rgba(255,255,255,0.06)";

function cardBg(W: number, H: number): React.CSSProperties {
  return {
    width: W, height: H, position: "absolute", top: 0, left: 0,
    background: `linear-gradient(160deg, ${BG} 0%, ${BG2} 55%, ${BG3} 100%)`,
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    color: "#ffffff", overflow: "hidden", display: "flex", flexDirection: "column",
    boxSizing: "border-box",
  };
}

// ─── Logo badge ───────────────────────────────────────────────────────────────
function LogoBadge({ size = 48 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <img src={playr1Logo} width={size} height={size}
        style={{ borderRadius: 10, objectFit: "contain", background: ORANGE, padding: 4 }}
        alt="PLAYR1" crossOrigin="anonymous" />
      <span style={{ fontWeight: 900, fontSize: size * 0.38, letterSpacing: "0.04em",
        color: "#fff", lineHeight: 1 }}>PLAYR1</span>
    </div>
  );
}

// ─── Card header ─────────────────────────────────────────────────────────────
function CardHdr({ name, sub, tag, date, W, pad }: {
  name: string; sub?: string; tag: string; date?: string; W: number; pad: number;
}) {
  const big = W >= 1080;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: `${pad * 0.75}px ${pad}px`, borderBottom: `1px solid ${OR30}`,
      background: "rgba(0,0,0,0.35)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: big ? 18 : 12 }}>
        <LogoBadge size={big ? 56 : 44} />
        <div>
          <div style={{ fontWeight: 800, fontSize: big ? "1.75em" : "1.3em",
            letterSpacing: "-0.01em", color: "#fff", lineHeight: 1.1 }}>{name}</div>
          {sub && <div style={{ color: W60, fontSize: big ? "0.72em" : "0.60em", marginTop: 3 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 12 }}>
        <div style={{ color: ORANGE, fontWeight: 700, fontSize: big ? "0.72em" : "0.60em",
          letterSpacing: "0.10em", textTransform: "uppercase" }}>{tag}</div>
        {date && <div style={{ color: W30, fontSize: big ? "0.60em" : "0.52em", marginTop: 4 }}>{date}</div>}
      </div>
    </div>
  );
}

// ─── KPI row ─────────────────────────────────────────────────────────────────
function KPIRow({ items, pad, tall }: {
  items: Array<{ val: string | number; label: string; orange?: boolean }>;
  pad: number; tall?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexShrink: 0, borderBottom: `1px solid ${OR30}` }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: 1, textAlign: "center",
          padding: tall ? `${pad * 0.8}px 4px` : `${pad * 0.55}px 4px`,
          borderRight: i < items.length - 1 ? `1px solid ${OR15}` : "none",
          background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : OR15 + "44",
        }}>
          <div style={{ fontSize: tall ? "2.8em" : "2.2em", fontWeight: 900,
            letterSpacing: "-0.02em", lineHeight: 1.0,
            color: item.orange !== false ? ORANGE : "#fff" }}>{item.val}</div>
          <div style={{ fontSize: tall ? "0.58em" : "0.50em", color: W60,
            letterSpacing: "0.10em", fontWeight: 600, marginTop: 5, textTransform: "uppercase" }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Shot type bar ────────────────────────────────────────────────────────────
function ShotTypeBar({ label, made, attempted, emoji, h }: {
  label: string; made: number; attempted: number; emoji: string; h: number;
}) {
  if (attempted === 0) return null;
  const pct = Math.round((made / attempted) * 100);
  const col = zoneColor(pct);
  const barH = Math.round(h * 0.28);
  const fs   = Math.round(h * 0.115);
  const small = Math.round(h * 0.095);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(h * 0.18) }}>
      <span style={{ fontSize: Math.round(h * 0.16), lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div style={{ minWidth: Math.round(h * 1.8), color: W60, fontSize: small, fontWeight: 600, flexShrink: 0 }}>
        {label}
      </div>
      {/* Bar */}
      <div style={{ flex: 1, height: barH, background: W06, borderRadius: barH,
        overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: barH,
          transition: "none" }} />
      </div>
      <span style={{ fontWeight: 800, fontSize: fs, color: col, flexShrink: 0, minWidth: 44, textAlign: "right" }}>
        {pct}%
      </span>
      <span style={{ fontSize: small, color: W30, flexShrink: 0, minWidth: 60, textAlign: "right" }}>
        {made}/{attempted}
      </span>
    </div>
  );
}

// ─── Category bar ─────────────────────────────────────────────────────────────
function CatBar({ category, val, maxVal, unit, h }: {
  category: string; val: number; maxVal: number; unit: string; h: number;
}) {
  const col = CAT_COLORS[category] || ORANGE;
  const pct = Math.max(4, Math.round((val / maxVal) * 100));
  const barH = Math.round(h * 0.20);
  const fs   = Math.round(h * 0.10);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(h * 0.14) }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
      <div style={{ minWidth: Math.round(h * 2.0), fontSize: fs, color: W60,
        textTransform: "capitalize", fontWeight: 500, flexShrink: 0 }}>
        {category.replace(/-/g, " ")}
      </div>
      <div style={{ flex: 1, height: barH, background: W06, borderRadius: barH, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: barH }} />
      </div>
      <span style={{ fontSize: fs, color: col, fontWeight: 700, flexShrink: 0,
        minWidth: 50, textAlign: "right" }}>
        {unit === "m" ? fmtMin(val) : `${val}×`}
      </span>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SecLabel({ children, fs = 11 }: { children: React.ReactNode; fs?: number }) {
  return (
    <div style={{ fontSize: fs, fontWeight: 700, letterSpacing: "0.12em",
      color: ORANGE, textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ─── Card footer ──────────────────────────────────────────────────────────────
function CardFtr({ pad, streak, showBest = false }: {
  pad: number;
  streak?: { currentStreak: number; longestStreak: number };
  showBest?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: `9px ${pad}px`, borderTop: `1px solid ${OR30}`,
      background: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src={playr1Logo} width={22} height={22}
          style={{ borderRadius: 5, background: ORANGE, padding: 2, objectFit: "contain" }}
          alt="PLAYR1" crossOrigin="anonymous" />
        <span style={{ fontWeight: 900, fontSize: "0.70em", letterSpacing: "0.18em",
          color: "rgba(249,115,22,0.6)" }}>PLAYR1</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {streak && streak.currentStreak > 0 && (
          <span style={{ fontSize: "0.58em", color: W60, letterSpacing: "0.05em", fontWeight: 600 }}>
            {"🔥"} {streak.currentStreak}{showBest && streak.longestStreak > streak.currentStreak ? ` · Best ${streak.longestStreak}` : ""} day streak
          </span>
        )}
        <span style={{ color: W30, fontSize: "0.55em" }}>playr1.app</span>
      </div>
    </div>
  );
}

// ─── Shot breakdown table (zone rows) ────────────────────────────────────────
function ZoneTable({ shotData, fs, maxRows = 6 }: {
  shotData: Array<{ location: string; made: number; attempted: number }>;
  fs: number; maxRows?: number;
}) {
  const rows = shotData
    .filter(d => d.attempted > 0)
    .map(d => ({ ...d, pct: Math.round((d.made / d.attempted) * 100), label: ZONE_DEFS[d.location]?.label || d.location }))
    .sort((a, b) => b.attempted - a.attempted)
    .slice(0, maxRows);
  if (rows.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: zoneColor(r.pct), flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: fs, color: W60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.label}
          </span>
          <span style={{ fontSize: fs, fontWeight: 700, color: zoneColor(r.pct), flexShrink: 0 }}>{r.pct}%</span>
          <span style={{ fontSize: fs * 0.88, color: W30, flexShrink: 0, minWidth: 40, textAlign: "right" }}>
            {r.made}/{r.attempted}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Data types ───────────────────────────────────────────────────────────────
interface WorkoutData {
  sessionId: string; date: string; playerName: string; displayName?: string | null;
  teamName?: string | null; jerseyNumber?: number | null;
  totalDuration: number; drillCount: number;
  totalShotsAttempted: number; totalShotsMade: number; shootingPct?: number | null;
  drills: Array<{ title: string; category: string; duration: number; reps?: number | null;
    shotsAttempted?: number | null; shotsMade?: number | null; score?: number | null }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

interface ShotTypeBreakdown {
  threePoint: { made: number; attempted: number };
  midRange:   { made: number; attempted: number };
  layup:      { made: number; attempted: number };
  freeThrow:  { made: number; attempted: number };
}

interface PeriodData {
  period: string; playerName: string; displayName?: string | null; teamName?: string | null;
  jerseyNumber?: number | null;
  totalSessions: number; totalDrills: number; totalDuration: number;
  totalShotsAttempted: number; totalShotsMade: number; shootingPct?: number | null;
  shotTypeBreakdown?: ShotTypeBreakdown;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  dailyActivity: Array<{ date: string; minutes: number }>;
  topDrills: Array<{ name: string; count: number }>;
  bestDay?: { date: string; minutes: number } | null;
}

interface SeasonData {
  seasonName: string; seasonYear: string; teamName?: string | null;
  playerName: string; displayName?: string | null; jerseyNumber?: number | null;
  gamesPlayed: number; wins: number; losses: number; record: string;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
  fgPct: number; threePct: number; ftPct: number;
  totalFgM: number; totalFgA: number; total3PM: number; total3PA: number;
  totalFtM: number; totalFtA: number;
  totalPts: number; totalReb: number; totalAst: number; totalStl: number; totalBlk: number;
  topGame?: { points: number; rebounds: number; assists: number; steals: number;
    blocks: number; date: string | null; opponent: string | null; result: string | null } | null;
}

// ─── Workout Session Card ─────────────────────────────────────────────────────
function WorkoutCard({ data, platform, streak }: { data: WorkoutData; platform: Platform; streak?: { currentStreak: number; longestStreak: number } }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad = Math.round(W * 0.033);
  const isTT = platform === "tiktok";
  const isWide = W >= 1200;
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.some(d => d.attempted > 0);
  const totalMade = data.shotData.reduce((a, d) => a + d.made, 0);
  const totalAtt  = data.shotData.reduce((a, d) => a + d.attempted, 0);
  const pct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : null;

  const kpis = [
    { val: data.drillCount,       label: "Drills" },
    { val: fmtMin(data.totalDuration), label: "Time", orange: false },
    ...(pct != null ? [{ val: `${pct}%`, label: "FG%" }] : []),
    ...(totalAtt > 0 ? [{ val: totalAtt, label: "Shots", orange: false }] : []),
    ...(totalAtt > 0 ? [{ val: totalMade, label: "Made" }] : []),
  ].slice(0, isTT ? 5 : isWide ? 5 : 4);

  const courtW = isTT ? Math.round(W * 0.47) : Math.round(W * 0.38);
  const courtH = Math.round(courtW * (470 / 500));
  const drillsMax = isTT ? 8 : 5;
  const bodyFs = isTT ? 14 : 12;

  return (
    <div style={{ width: W*s, height: H*s, overflow:"hidden", flexShrink:0, position:"relative" }}>
      <div style={{ transform:`scale(${s})`, transformOrigin:"top left", position:"absolute", top:0, left:0 }}>
      <div data-share-card style={cardBg(W,H)}>
        {/* Left accent */}
        <div style={{ position:"absolute", top:0, left:0, width:5, height:"100%",
          background:`linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.15) 100%)`, zIndex:10 }} />
        <CardHdr
          name={name}
          sub={[data.jerseyNumber != null ? `#${data.jerseyNumber}` : null, data.teamName].filter(Boolean).join(" · ") || undefined}
          tag="Workout Recap"
          date={new Date(data.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
          W={W} pad={pad}
        />
        <KPIRow items={kpis} pad={pad} tall={isTT} />

        {/* Body */}
        <div style={{ flex:1, display:"flex", gap:pad, padding:`${pad*0.7}px ${pad}px`,
          minHeight:0, overflow:"hidden" }}>
          {/* Shot chart */}
          {hasShotData && (
            <div style={{ display:"flex", flexDirection:"column", flexShrink:0, width:courtW }}>
              <SecLabel fs={isTT ? 13 : 11}>Shot Chart</SecLabel>
              <CourtSVG shotData={data.shotData} width={courtW} height={courtH} />
              <div style={{ marginTop:8, flex:1, overflow:"hidden" }}>
                <ZoneTable shotData={data.shotData} fs={isTT ? 12 : 10} maxRows={isTT ? 6 : 4} />
              </div>
            </div>
          )}

          {/* Drills + categories */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:isTT?18:12, minWidth:0 }}>
            <div>
              <SecLabel fs={isTT ? 13 : 11}>Drills Completed</SecLabel>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {data.drills.slice(0, drillsMax).map((dr, i) => {
                  const col = CAT_COLORS[dr.category] || ORANGE;
                  const drPct = dr.shotsAttempted ? Math.round(((dr.shotsMade||0)/dr.shotsAttempted)*100) : null;
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:`${bodyFs*0.65}px ${bodyFs*0.9}px`,
                      background:W06, borderRadius:8, borderLeft:`4px solid ${col}` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:bodyFs, whiteSpace:"nowrap",
                          overflow:"hidden", textOverflow:"ellipsis", color:"#fff" }}>{dr.title}</div>
                        <div style={{ color:W30, fontSize:bodyFs*0.82, marginTop:2 }}>
                          {dr.duration}min
                          {dr.reps ? ` · ${dr.reps} reps` : ""}
                          {dr.shotsAttempted ? ` · ${dr.shotsMade}/${dr.shotsAttempted} shots` : ""}
                        </div>
                      </div>
                      {drPct != null && (
                        <span style={{ fontWeight:800, fontSize:bodyFs*1.05, color:zoneColor(drPct), flexShrink:0 }}>
                          {drPct}%
                        </span>
                      )}
                      {dr.score != null && (
                        <span style={{ fontWeight:700, fontSize:bodyFs*0.9, color:ORANGE, flexShrink:0 }}>
                          {dr.score}/10
                        </span>
                      )}
                    </div>
                  );
                })}
                {data.drills.length > drillsMax && (
                  <div style={{ color:W30, fontSize:bodyFs*0.8, textAlign:"center" }}>
                    +{data.drills.length - drillsMax} more drills
                  </div>
                )}
              </div>
            </div>
            {data.categoryBreakdown.length > 0 && (
              <div>
                <SecLabel fs={isTT?13:11}>By Category</SecLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {data.categoryBreakdown.slice(0, isTT?5:4).map((c,i) => (
                    <CatBar key={i} category={c.category} val={c.count}
                      maxVal={Math.max(1,...data.categoryBreakdown.map(x=>x.count))}
                      unit="×" h={isTT?100:80} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <CardFtr pad={pad} streak={streak} showBest={false} />
      </div>
      </div>
    </div>
  );
}

// ─── Training Period Card ─────────────────────────────────────────────────────
function PeriodCard({ data, platform, streak }: { data: PeriodData; platform: Platform; streak?: { currentStreak: number; longestStreak: number } }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad = Math.round(W * 0.033);
  const isTT = platform === "tiktok";
  const isWide = W >= 1200;
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.some(d => d.attempted > 0);
  const totalMade = data.shotData.reduce((a, d) => a + d.made, 0);
  const totalAtt  = data.shotData.reduce((a, d) => a + d.attempted, 0);
  const pct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : null;

  const kpis = [
    { val: data.totalSessions, label: "Sessions" },
    { val: data.totalDrills,   label: "Drills", orange: false },
    { val: fmtMin(data.totalDuration), label: "Time", orange: false },
    ...(pct != null ? [{ val: `${pct}%`, label: "FG%" }] : []),
    ...(totalAtt > 0 ? [{ val: totalAtt, label: "Shots", orange: false }] : []),
  ].slice(0, isTT ? 5 : isWide ? 5 : 4);

  // Shot type bars
  const stb = data.shotTypeBreakdown;
  const hasTypeBars = stb && (stb.threePoint.attempted + stb.midRange.attempted + stb.layup.attempted + stb.freeThrow.attempted > 0);
  const barRowH = isTT ? 110 : 88;

  const maxMin = Math.max(1, ...data.dailyActivity.map(d => d.minutes));
  const actBarMaxH = isTT ? 72 : 56;
  const bodyFs = isTT ? 13 : 11;
  const courtW = isTT ? Math.round(W * 0.46) : Math.round(W * 0.38);
  const courtH = Math.round(courtW * (470 / 500));
  const catMax = Math.max(1, ...data.categoryBreakdown.map(c => c.minutes));

  return (
    <div style={{ width:W*s, height:H*s, overflow:"hidden", flexShrink:0, position:"relative" }}>
      <div style={{ transform:`scale(${s})`, transformOrigin:"top left", position:"absolute", top:0, left:0 }}>
      <div data-share-card style={cardBg(W,H)}>
        {/* Left accent */}
        <div style={{ position:"absolute", top:0, left:0, width:5, height:"100%",
          background:`linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.15) 100%)`, zIndex:10 }} />

        <CardHdr
          name={name}
          sub={[data.jerseyNumber != null ? `#${data.jerseyNumber}` : null, data.teamName].filter(Boolean).join(" · ") || undefined}
          tag={PERIOD_LABEL[data.period] || data.period}
          date="Training Summary"
          W={W} pad={pad}
        />
        <KPIRow items={kpis} pad={pad} tall={isTT} />

        {/* Shot type breakdown bars — full width, high visibility */}
        {hasTypeBars && (
          <div style={{ padding:`${pad*0.6}px ${pad}px`, borderBottom:`1px solid ${W12}`,
            background:"rgba(0,0,0,0.20)", flexShrink:0 }}>
            <SecLabel fs={isTT ? 13 : 11}>Shot Breakdown</SecLabel>
            <div style={{ display:"flex", flexDirection:"column", gap:isTT ? 10 : 8 }}>
              <ShotTypeBar label="3-Pointers" made={stb!.threePoint.made} attempted={stb!.threePoint.attempted} emoji="🎯" h={barRowH} />
              <ShotTypeBar label="Mid-Range"  made={stb!.midRange.made}   attempted={stb!.midRange.attempted}   emoji="🏀" h={barRowH} />
              <ShotTypeBar label="Layups"     made={stb!.layup.made}     attempted={stb!.layup.attempted}      emoji="⚡" h={barRowH} />
              <ShotTypeBar label="Free Throws" made={stb!.freeThrow.made} attempted={stb!.freeThrow.attempted}  emoji="🎽" h={barRowH} />
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex:1, display:"flex", gap:pad, padding:`${pad*0.7}px ${pad}px`,
          minHeight:0, overflow:"hidden" }}>

          {/* Left column */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:isTT?16:12, minWidth:0 }}>

            {/* Daily activity bars */}
            {data.dailyActivity.length > 0 && (
              <div>
                <SecLabel fs={bodyFs}>Daily Activity</SecLabel>
                <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:actBarMaxH + 18 }}>
                  {data.dailyActivity.slice(-14).map((d, i) => {
                    const bh = Math.max(3, Math.round((d.minutes / maxMin) * actBarMaxH));
                    const day = new Date(d.date + "T00:00:00").toLocaleDateString("en-US",{weekday:"narrow"});
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
                        alignItems:"center", gap:2 }}>
                        <div style={{ width:"100%", maxWidth:28, height:bh,
                          background:`linear-gradient(180deg,${ORANGE} 0%,rgba(249,115,22,0.40) 100%)`,
                          borderRadius:"3px 3px 0 0" }} />
                        <span style={{ fontSize:bodyFs*0.78, color:W30 }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skills breakdown */}
            {data.categoryBreakdown.length > 0 && (
              <div style={{ flex:1 }}>
                <SecLabel fs={bodyFs}>Skills Breakdown</SecLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:isTT?9:7 }}>
                  {data.categoryBreakdown.slice(0, isTT?6:5).map((c,i) => (
                    <CatBar key={i} category={c.category} val={c.minutes} maxVal={catMax} unit="m" h={isTT?100:80} />
                  ))}
                </div>
              </div>
            )}

            {/* Top drills (when no shot data + no categories) */}
            {!hasShotData && data.topDrills.length > 0 && data.categoryBreakdown.length === 0 && (
              <div style={{ flex:1 }}>
                <SecLabel fs={bodyFs}>Top Drills</SecLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {data.topDrills.slice(0,5).map((d,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:`8px 12px`, background:W06, borderRadius:7 }}>
                      <span style={{ color:"rgba(249,115,22,0.6)", fontSize:bodyFs*0.9, fontWeight:700, minWidth:18 }}>
                        #{i+1}
                      </span>
                      <span style={{ flex:1, fontSize:bodyFs, fontWeight:600,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                      <span style={{ color:ORANGE, fontSize:bodyFs*0.9, fontWeight:700, flexShrink:0 }}>{d.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: shot chart */}
          {hasShotData && (
            <div style={{ display:"flex", flexDirection:"column", flexShrink:0, width:courtW }}>
              <SecLabel fs={bodyFs}>Shot Chart</SecLabel>
              <CourtSVG shotData={data.shotData} width={courtW} height={courtH} />
              <div style={{ marginTop:8, flex:1, overflow:"hidden" }}>
                <ZoneTable shotData={data.shotData} fs={isTT?11:9} maxRows={isTT?5:4} />
              </div>
            </div>
          )}
        </div>

        <CardFtr pad={pad} streak={streak} showBest={data.period === "month" || data.period === "year"} />
      </div>
      </div>
    </div>
  );
}

// ─── Season Stats Card ────────────────────────────────────────────────────────
function SeasonCard({ data, platform }: { data: SeasonData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad = Math.round(W * 0.033);
  const isTT = platform === "tiktok";
  const name = data.displayName || data.playerName || "Player";
  const big = W >= 1080;
  const numFs = isTT ? "2.8em" : "2.2em";
  const lblFs = isTT ? "0.60em" : "0.50em";
  const bodyFs = isTT ? 14 : 12;
  const secFs  = isTT ? 13 : 11;

  // Shooting split bars
  const splits = [
    { label: "FG%",  pct: data.fgPct,    made: data.totalFgM,  att: data.totalFgA,  col: data.fgPct >= 45 ? "#22c55e" : data.fgPct >= 35 ? ORANGE : "#ef4444" },
    { label: "3PT%", pct: data.threePct, made: data.total3PM, att: data.total3PA,  col: data.threePct >= 36 ? "#22c55e" : data.threePct >= 28 ? ORANGE : "#ef4444" },
    { label: "FT%",  pct: data.ftPct,    made: data.totalFtM, att: data.totalFtA,  col: data.ftPct >= 70 ? "#22c55e" : data.ftPct >= 55 ? ORANGE : "#ef4444" },
  ];

  const totals = [
    { val: data.totalPts, label: "PTS" },
    { val: data.totalReb, label: "REB" },
    { val: data.totalAst, label: "AST" },
    { val: data.totalStl, label: "STL" },
    { val: data.totalBlk, label: "BLK" },
  ];

  const kpis = [
    { val: data.gamesPlayed, label: "Games", orange: false },
    { val: data.wins,        label: "Wins" },
    { val: data.losses,      label: "Losses", orange: false },
    { val: data.record,      label: "Record" },
  ];

  return (
    <div style={{ width:W*s, height:H*s, overflow:"hidden", flexShrink:0, position:"relative" }}>
      <div style={{ transform:`scale(${s})`, transformOrigin:"top left", position:"absolute", top:0, left:0 }}>
      <div data-share-card style={cardBg(W,H)}>
        <div style={{ position:"absolute", top:0, left:0, width:5, height:"100%",
          background:`linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.15) 100%)`, zIndex:10 }} />

        <CardHdr
          name={name}
          sub={[data.jerseyNumber != null ? `#${data.jerseyNumber}` : null, data.teamName,
            `${data.seasonName} ${data.seasonYear}`].filter(Boolean).join(" · ") || undefined}
          tag="Season Stats"
          date={`${data.gamesPlayed} Games Played`}
          W={W} pad={pad}
        />

        {/* Record + KPI */}
        <KPIRow items={kpis} pad={pad} tall={isTT} />

        {/* Per game averages */}
        <div style={{ padding:`${pad*0.55}px ${pad}px`, borderBottom:`1px solid ${W12}`,
          background:"rgba(0,0,0,0.20)", flexShrink:0 }}>
          <SecLabel fs={secFs}>Per Game Averages</SecLabel>
          <div style={{ display:"flex", gap:pad*0.4 }}>
            {[{v:data.ppg,l:"PPG"},{v:data.rpg,l:"RPG"},{v:data.apg,l:"APG"},{v:data.spg,l:"SPG"},{v:data.bpg,l:"BPG"}].map((item,i) => (
              <div key={i} style={{ flex:1, textAlign:"center",
                background: i===0 ? OR15 : W06,
                border:`1px solid ${i===0 ? OR30 : W12}`,
                borderRadius:10, padding:`${isTT?18:14}px 4px` }}>
                <div style={{ fontSize:numFs, fontWeight:900, letterSpacing:"-0.02em", lineHeight:1.0,
                  color: i===0 ? ORANGE : "#fff" }}>{item.v}</div>
                <div style={{ fontSize:lblFs, color:W60, letterSpacing:"0.10em",
                  fontWeight:600, marginTop:5, textTransform:"uppercase" }}>{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Shooting splits */}
        <div style={{ padding:`${pad*0.55}px ${pad}px`, borderBottom:`1px solid ${W12}`,
          background:"rgba(0,0,0,0.15)", flexShrink:0 }}>
          <SecLabel fs={secFs}>Shooting Splits</SecLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:isTT?10:8 }}>
            {splits.map((sp,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:bodyFs, fontWeight:700, color:sp.col, minWidth:44 }}>{sp.label}</span>
                <span style={{ fontSize:isTT?"1.45em":"1.2em", fontWeight:900, color:sp.col, minWidth:56, textAlign:"right" }}>
                  {sp.pct}%
                </span>
                <div style={{ flex:1, height:isTT?10:8, background:W06, borderRadius:6, overflow:"hidden" }}>
                  <div style={{ width:`${Math.min(100,sp.pct)}%`, height:"100%", background:sp.col, borderRadius:6 }} />
                </div>
                {sp.att > 0 && (
                  <span style={{ fontSize:bodyFs*0.85, color:W30, flexShrink:0, minWidth:80, textAlign:"right" }}>
                    {sp.made}/{sp.att} ({sp.att > 0 ? sp.pct : 0}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body: season totals + best game */}
        <div style={{ flex:1, display:"flex", gap:pad, padding:`${pad*0.6}px ${pad}px`,
          minHeight:0, overflow:"hidden" }}>

          {/* Season totals */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:isTT?14:10 }}>
            <SecLabel fs={secFs}>Season Totals</SecLabel>
            <div style={{ display:"flex", flexWrap:"wrap", gap:isTT?10:8 }}>
              {totals.map((t,i) => (
                <div key={i} style={{ textAlign:"center",
                  background: i===0 ? OR15 : W06,
                  border:`1px solid ${i===0 ? OR30 : W12}`,
                  borderRadius:10, padding:`${isTT?14:11}px ${isTT?18:14}px`, flex:"0 0 auto" }}>
                  <div style={{ fontSize:isTT?"2.0em":"1.65em", fontWeight:900, letterSpacing:"-0.02em",
                    lineHeight:1.0, color: i===0 ? ORANGE : "#fff" }}>{t.val}</div>
                  <div style={{ fontSize:isTT?"0.58em":"0.50em", color:W60, letterSpacing:"0.10em",
                    fontWeight:600, marginTop:5, textTransform:"uppercase" }}>{t.label}</div>
                </div>
              ))}
            </div>

            {/* Also show total FG/3PT/FT made */}
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
              <SecLabel fs={secFs}>Shot Totals</SecLabel>
              {[
                { label:"Field Goals Made", val:data.totalFgM, att:data.totalFgA },
                { label:"3-Pointers Made",  val:data.total3PM, att:data.total3PA },
                { label:"Free Throws Made", val:data.totalFtM, att:data.totalFtA },
              ].map((row,i) => row.att > 0 && (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                  padding:`${isTT?8:6}px ${isTT?12:10}px`, background:W06, borderRadius:7 }}>
                  <span style={{ flex:1, fontSize:bodyFs, color:W60 }}>{row.label}</span>
                  <span style={{ fontWeight:700, fontSize:bodyFs, color:ORANGE }}>
                    {row.val}<span style={{ color:W30, fontWeight:400 }}>/{row.att}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Best game */}
          {data.topGame && data.topGame.points > 0 && (
            <div style={{ flexShrink:0, width: isTT ? Math.round(W*0.36) : Math.round(W*0.32),
              display:"flex", flexDirection:"column" }}>
              <SecLabel fs={secFs}>Best Game 🏆</SecLabel>
              <div style={{ flex:1, background:OR15, border:`1px solid ${OR30}`,
                borderRadius:14, padding:`${isTT?20:16}px ${isTT?20:16}px`,
                display:"flex", flexDirection:"column", justifyContent:"center", gap:isTT?12:8 }}>
                {data.topGame.opponent && (
                  <div style={{ fontSize:isTT?14:12, color:W60, fontWeight:600 }}>
                    vs {data.topGame.opponent}
                    {data.topGame.result && (
                      <span style={{ marginLeft:8, fontWeight:700,
                        color: data.topGame.result === "W" ? "#22c55e" : "#ef4444" }}>
                        · {data.topGame.result}
                      </span>
                    )}
                  </div>
                )}
                {[
                  { val:data.topGame.points,   label:"PTS", big:true },
                  { val:data.topGame.rebounds,  label:"REB" },
                  { val:data.topGame.assists,   label:"AST" },
                  ...(data.topGame.steals > 0 ? [{ val:data.topGame.steals, label:"STL" }] : []),
                  ...(data.topGame.blocks > 0 ? [{ val:data.topGame.blocks, label:"BLK" }] : []),
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize: item.big ? (isTT?"3.2em":"2.6em") : (isTT?"2.0em":"1.6em"),
                      fontWeight:900, color: item.big ? ORANGE : "#fff", lineHeight:1 }}>{item.val}</span>
                    <span style={{ fontSize:isTT?13:11, color:W60, fontWeight:600,
                      letterSpacing:"0.08em", textTransform:"uppercase" }}>{item.label}</span>
                  </div>
                ))}
                {data.topGame.date && (
                  <div style={{ fontSize:isTT?12:10, color:W30, marginTop:4 }}>
                    {new Date(data.topGame.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <CardFtr pad={pad} />
      </div>
      </div>
    </div>
  );
}

// ─── Capture helpers ──────────────────────────────────────────────────────────
async function captureCard(ref: React.RefObject<HTMLDivElement>, platform: Platform): Promise<HTMLCanvasElement | null> {
  if (!ref.current) return null;
  const el = ref.current.querySelector("[data-share-card]") as HTMLElement;
  if (!el) return null;
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  return html2canvas(el, {
    width: cfg.w, height: cfg.h, scale: 1,
    backgroundColor: null, logging: false, useCORS: true, allowTaint: true,
  });
}

function buildCaption(type: CardType, data: WorkoutData | PeriodData | SeasonData | undefined): string {
  const url = "https://playr1basketball.replit.app";
  if (!data) return `Training with PLAYR1 🏀\n${url}`;
  if (type === "workout") {
    const d = data as WorkoutData;
    const totalAtt = d.shotData.reduce((a,s) => a+s.attempted,0);
    const totalMade = d.shotData.reduce((a,s) => a+s.made,0);
    const pct = totalAtt > 0 ? Math.round((totalMade/totalAtt)*100) : null;
    return `🏀 WORKOUT RECAP · ${new Date(d.date).toLocaleDateString()}\n${d.displayName||d.playerName}\n\n✅ ${d.drillCount} Drills  ⏱️ ${d.totalDuration} min${pct!=null?`  🎯 ${pct}% FG (${totalMade}/${totalAtt})`:""}\n\n${d.drills.slice(0,4).map(dr=>`• ${dr.title}`).join("\n")}\n\nLog your training → ${url}\n\n#PLAYR1 #Basketball #HoopLife #Training`;
  }
  if (type === "season") {
    const d = data as SeasonData;
    return `🏀 SEASON STATS · ${d.seasonName} ${d.seasonYear}\n${d.displayName||d.playerName}${d.jerseyNumber?` #${d.jerseyNumber}`:""}${d.teamName?` | ${d.teamName}`:""}\n\n📊 ${d.ppg} PPG · ${d.rpg} RPG · ${d.apg} APG\n🎯 FG ${d.fgPct}% · 3PT ${d.threePct}% · FT ${d.ftPct}%\n🏆 Record: ${d.record} (${d.gamesPlayed} GP)\n\n→ ${url}\n\n#PLAYR1 #Basketball #SeasonStats`;
  }
  const d = data as PeriodData;
  const totalAtt = d.shotData.reduce((a,s) => a+s.attempted,0);
  const totalMade = d.shotData.reduce((a,s) => a+s.made,0);
  const pct = totalAtt > 0 ? Math.round((totalMade/totalAtt)*100) : null;
  return `🏀 ${PERIOD_LABEL[d.period]||"TRAINING SUMMARY"}\n${d.displayName||d.playerName}${d.teamName?` | ${d.teamName}`:""}\n\n📊 ${d.totalSessions} Sessions · ${d.totalDrills} Drills · ${fmtMin(d.totalDuration)}${pct!=null?`\n🎯 ${pct}% FG (${totalMade}/${totalAtt})`:""}\n\nTrack your game → ${url}\n\n#PLAYR1 #Basketball #HoopLife #Training`;
}

// shareToPlatform replaced by shareToSocialPlatform from @/lib/share-utils

// ─── Platform icon ─────────────────────────────────────────────────────────────
function PlatformIcon({ p }: { p: Platform }) {
  if (p === "twitter")   return <Twitter className="w-3.5 h-3.5" />;
  if (p === "instagram") return <Instagram className="w-3.5 h-3.5" />;
  if (p === "facebook")  return <Facebook className="w-3.5 h-3.5" />;
  if (p === "youtube")   return <Youtube className="w-3.5 h-3.5" />;
  return <span className="text-[10px] font-black leading-none">TT</span>;
}

// ─── Main Dialog ───────────────────────────────────────────────────────────────
export interface WorkoutShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutSessionId?: string | null;
  defaultTab?: CardType;
  seasonId?: string | null;
}

export function WorkoutShareDialog({ open, onOpenChange, workoutSessionId, defaultTab, seasonId }: WorkoutShareDialogProps) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [isBusy, setIsBusy] = useState(false);
  const initialTab: CardType = defaultTab || (workoutSessionId ? "workout" : seasonId ? "season" : "week");
  const [activeTab, setActiveTab] = useState<CardType>(initialTab);

  const { data: streakData } = useQuery<{ currentStreak: number; longestStreak: number }>({
    queryKey: ["/api/streak/me"],
    queryFn: async () => (await apiRequest("GET", "/api/streak/me")).json(),
    enabled: open,
  });

  const { data: workoutData, isLoading: lW } = useQuery<WorkoutData>({
    queryKey: ["/api/share/workout-session", workoutSessionId],
    queryFn: async () => (await apiRequest("GET", `/api/share/workout-session/${workoutSessionId}`)).json(),
    enabled: open && !!workoutSessionId && activeTab === "workout",
  });
  const { data: weekData,   isLoading: lWk } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "week"],
    queryFn: async () => (await apiRequest("GET", "/api/share/training-summary?period=week")).json(),
    enabled: open && activeTab === "week",
  });
  const { data: monthData,  isLoading: lMo } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "month"],
    queryFn: async () => (await apiRequest("GET", "/api/share/training-summary?period=month")).json(),
    enabled: open && activeTab === "month",
  });
  const { data: yearData,   isLoading: lYr } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "year"],
    queryFn: async () => (await apiRequest("GET", "/api/share/training-summary?period=year")).json(),
    enabled: open && activeTab === "year",
  });
  const { data: seasonData, isLoading: lSn } = useQuery<SeasonData>({
    queryKey: ["/api/share/season-stats", seasonId],
    queryFn: async () => (await apiRequest("GET", `/api/share/season-stats/${seasonId}`)).json(),
    enabled: open && !!seasonId && activeTab === "season",
  });

  const currentData = activeTab==="workout" ? workoutData : activeTab==="week" ? weekData
    : activeTab==="month" ? monthData : activeTab==="year" ? yearData : seasonData;
  const isLoading = (activeTab==="workout"&&lW)||(activeTab==="week"&&lWk)||(activeTab==="month"&&lMo)||(activeTab==="year"&&lYr)||(activeTab==="season"&&lSn);

  const getCanvas = async () => {
    const canvas = await captureCard(cardRef, platform);
    if (!canvas) { toast({ title:"Could not capture card — try again", variant:"destructive" }); return null; }
    return canvas;
  };

  const handleDownload = async () => {
    setIsBusy(true);
    try {
      const c = await getCanvas(); if (!c) return;
      const link = document.createElement("a");
      link.download = `playr1-${activeTab}-${platform}.png`;
      link.href = c.toDataURL("image/png"); link.click();
      toast({ title:"Image saved!" });
    } finally { setIsBusy(false); }
  };

  const handleShare = async (p: Platform) => {
    setIsBusy(true);
    try {
      const c = await getCanvas(); if (!c) return;
      await shareToSocialPlatform(p, c, buildCaption(activeTab, currentData), `${activeTab}-${platform}`, toast);
    } finally { setIsBusy(false); }
  };

  const tabs: Array<{ value: CardType; label: string }> = [
    ...(workoutSessionId ? [{ value:"workout" as CardType, label:"Workout" }] : []),
    { value:"week",  label:"Week"  },
    { value:"month", label:"Month" },
    { value:"year",  label:"Year"  },
    ...(seasonId ? [{ value:"season" as CardType, label:"Season" }] : []),
  ];
  const cfg = PLATFORMS.find(p => p.id === platform)!;

  const renderCard = (tab: CardType) => {
    if (tab==="workout" && workoutData)  return <div ref={cardRef}><WorkoutCard data={workoutData} platform={platform} streak={streakData} /></div>;
    if (tab==="week"    && weekData)     return <div ref={cardRef}><PeriodCard  data={weekData}   platform={platform} streak={streakData} /></div>;
    if (tab==="month"   && monthData)    return <div ref={cardRef}><PeriodCard  data={monthData}  platform={platform} streak={streakData} /></div>;
    if (tab==="year"    && yearData)     return <div ref={cardRef}><PeriodCard  data={yearData}   platform={platform} streak={streakData} /></div>;
    if (tab==="season"  && seasonData)   return <div ref={cardRef}><SeasonCard  data={seasonData} platform={platform} /></div>;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="dialog-workout-share">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Share Your Training
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as CardType)}>
          <TabsList className="w-full" data-testid="tabs-share-type">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs"
                data-testid={`tab-share-${t.value}`}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-3 space-y-3">

              {/* Platform selector */}
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-colors
                      ${platform===p.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    data-testid={`button-platform-${p.id}`}>
                    <PlatformIcon p={p.id} />
                    <span>{p.label.split(" /")[0]}</span>
                    <span className="text-[10px] opacity-50 hidden sm:inline">{p.w}×{p.h}</span>
                  </button>
                ))}
              </div>

              {/* Card preview */}
              {(() => {
                const card = renderCard(tab.value);
                return (
                  <div className="flex justify-center items-center bg-[#111] border border-border rounded-xl overflow-hidden" style={{ minHeight:240 }}>
                    {isLoading ? <Skeleton className="w-full h-52 rounded-lg" />
                      : card ? card
                      : <p className="text-muted-foreground text-sm text-center py-10 px-4">
                          {tab.value==="workout" && !workoutSessionId
                            ? "No workout session selected."
                            : "No training data for this period yet — log some sessions first!"}
                        </p>
                    }
                  </div>
                );
              })()}

              {/* Share to row */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Share directly to</p>
                <div className="grid grid-cols-5 gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => handleShare(p.id)}
                      disabled={isBusy || isLoading || !currentData}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium"
                      data-testid={`button-share-to-${p.id}`}>
                      <PlatformIcon p={p.id} />
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">{p.label.split(" /")[0]}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  <span className="font-medium">On phone:</span> opens your share sheet to post directly.&nbsp;
                  <span className="font-medium">On desktop:</span> downloads the image and copies it to your clipboard — just paste it when posting.
                </p>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
                <Badge variant="outline" className="text-xs text-muted-foreground mr-auto">
                  {cfg.label} · {cfg.w}×{cfg.h}px
                </Badge>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(buildCaption(activeTab, currentData))
                    .then(() => toast({ title:"Caption copied!" }))
                    .catch(() => toast({ title:"Copy failed", variant:"destructive" }));
                }} className="gap-1.5 text-xs" data-testid="button-copy-caption">
                  <Copy className="w-3.5 h-3.5" /> Copy Caption
                </Button>
                <Button size="sm" onClick={handleDownload}
                  disabled={isBusy || isLoading || !currentData}
                  className="gap-1.5 text-xs" data-testid="button-download-share">
                  <Download className="w-3.5 h-3.5" />
                  {isBusy ? "Saving…" : "Download"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
