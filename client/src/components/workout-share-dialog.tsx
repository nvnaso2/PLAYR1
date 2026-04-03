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

const PERIOD_LABEL: Record<string, string> = { week: "This Week", month: "This Month", year: "This Year" };

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

// ─── Real PLAYR1 Zone Definitions (from half-court-map.tsx) ────────────────────
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

// ─── Exact CourtSVG replica (no hooks — pure data-in SVG-out) ─────────────────
function CourtSVG({ shotData, width, height }: {
  shotData: Array<{ location: string; made: number; attempted: number }>;
  width: number;
  height: number;
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
      {/* Court background */}
      <rect x="0" y="0" width="500" height="435" fill="#000000" />
      <rect x="0" y="435" width="500" height="35" fill="#111111" />

      {/* Base zone fills */}
      {Object.entries(ZONE_DEFS).map(([name, z]) => (
        <ellipse key={`base-${name}`} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
          fill="#1a1a2e" opacity={0.85} stroke="white" strokeWidth="0.6" strokeOpacity="0.2" />
      ))}

      {/* Shot zone fills */}
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
                stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" paintOrder="stroke">
                {pct}%
              </text>
            )}
            {showText && (
              <text x={z.cx} y={z.cy + (showPct ? 14 : 4)} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="8" fontWeight="500"
                stroke="rgba(0,0,0,0.35)" strokeWidth="2" paintOrder="stroke">
                {d.made}/{total}
              </text>
            )}
          </g>
        );
      })}

      {/* Court lines (on top) */}
      <rect x="5" y="5" width="490" height="460" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="5" y1="5" x2="495" y2="5" stroke="white" strokeWidth="2" />
      <line x1="5" y1="435" x2="495" y2="435" stroke="white" strokeWidth="2" />
      <path d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435"
        fill="none" stroke="white" strokeWidth="2" />
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

      {/* Color scale legend */}
      <g transform="translate(30, 450)">
        <text x="0" y="8" fill="rgba(255,255,255,0.4)" fontSize="8">Cold</text>
        {["#6B0E0E","#9B1F0A","#C03410","#C86020","#9B7820","#6B7A20","#3D7A2A","#2E8E2E","#1AA81A","#0DC80D"].map((c, i) => (
          <rect key={c} x={30 + i * 18} y="1" width="18" height="12" fill={c} />
        ))}
        <text x={220} y="8" fill="rgba(255,255,255,0.4)" fontSize="8">Hot</text>
      </g>
    </svg>
  );
}

// ─── Card theme constants ──────────────────────────────────────────────────────
const BG_DARK   = "#080d18";
const ORANGE    = "#f97316";
const ORANGE15  = "rgba(249,115,22,0.15)";
const ORANGE30  = "rgba(249,115,22,0.30)";
const WHITE60   = "rgba(255,255,255,0.60)";
const WHITE30   = "rgba(255,255,255,0.30)";
const WHITE10   = "rgba(255,255,255,0.10)";
const WHITE06   = "rgba(255,255,255,0.06)";

function cardBase(W: number, H: number): React.CSSProperties {
  return {
    width: W, height: H, position: "absolute", top: 0, left: 0,
    background: `linear-gradient(145deg, ${BG_DARK} 0%, #0c1220 50%, #0e1530 100%)`,
    fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    color: "#ffffff",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };
}

// ─── Reusable header ──────────────────────────────────────────────────────────
function CardHeader({ name, subtitle, tag, date, W, pad, isPortrait }: {
  name: string; subtitle?: string; tag: string; date?: string;
  W: number; pad: number; isPortrait: boolean;
}) {
  const fs = isPortrait ? 1.0 : W >= 1200 ? 1.0 : 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: `${pad}px ${pad}px ${pad * 0.6}px`, borderBottom: `1px solid ${ORANGE30}`,
      background: "rgba(0,0,0,0.25)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* PLAYR1 wordmark */}
        <div style={{ background: ORANGE, borderRadius: 8, padding: isPortrait ? "10px 20px" : "7px 16px",
          fontWeight: 900, fontSize: `${fs * 1.1}em`, letterSpacing: "0.06em", lineHeight: 1,
          color: "#fff", flexShrink: 0 }}>
          PLAYR1
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: `${fs * 1.7}em`, lineHeight: 1.1,
            letterSpacing: "-0.01em", color: "#fff" }}>{name}</div>
          {subtitle && (
            <div style={{ color: WHITE60, fontSize: `${fs * 0.72}em`, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: ORANGE, fontWeight: 700, fontSize: `${fs * 0.7}em`,
          letterSpacing: "0.1em", textTransform: "uppercase" }}>{tag}</div>
        {date && (
          <div style={{ color: WHITE30, fontSize: `${fs * 0.6}em`, marginTop: 3 }}>{date}</div>
        )}
      </div>
    </div>
  );
}

// ─── KPI bar ──────────────────────────────────────────────────────────────────
function KPIBar({ items, pad, isPortrait }: {
  items: Array<{ val: string | number; label: string; accent?: boolean }>;
  pad: number; isPortrait: boolean;
}) {
  const numFs = isPortrait ? "2.6em" : "2.1em";
  const lblFs = isPortrait ? "0.58em" : "0.50em";
  return (
    <div style={{ display: "flex", flexShrink: 0, borderBottom: `1px solid ${ORANGE30}` }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: 1, textAlign: "center",
          padding: isPortrait ? "20px 8px" : "14px 6px",
          borderRight: i < items.length - 1 ? `1px solid ${ORANGE15}` : "none",
          background: i % 2 === 0 ? "rgba(0,0,0,0.1)" : "rgba(249,115,22,0.03)",
        }}>
          <div style={{ fontSize: numFs, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.0,
            color: item.accent !== false ? ORANGE : "#fff" }}>
            {item.val}
          </div>
          <div style={{ fontSize: lblFs, color: WHITE60, letterSpacing: "0.1em",
            fontWeight: 600, marginTop: 5, textTransform: "uppercase" }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card footer ──────────────────────────────────────────────────────────────
function CardFooter({ pad }: { pad: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: `8px ${pad}px`, borderTop: `1px solid ${ORANGE30}`,
      background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
      <span style={{ fontWeight: 900, fontSize: "0.7em", letterSpacing: "0.25em",
        color: "rgba(249,115,22,0.5)" }}>PLAYR1</span>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ color: WHITE30, fontSize: "0.55em" }}>playr1.app</span>
      </div>
    </div>
  );
}

// ─── Shot summary table (zone breakdown) ────────────────────────────────────
function ShotBreakdown({ shotData, fontSize, maxRows = 6 }: {
  shotData: Array<{ location: string; made: number; attempted: number }>;
  fontSize: number; maxRows?: number;
}) {
  const rows = shotData
    .filter(d => d.attempted > 0)
    .map(d => ({ ...d, pct: Math.round((d.made / d.attempted) * 100), label: ZONE_DEFS[d.location]?.label || d.location }))
    .sort((a, b) => b.attempted - a.attempted)
    .slice(0, maxRows);

  if (rows.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: zoneColor(r.pct), flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize, color: WHITE60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.label}
          </span>
          <span style={{ fontSize, fontWeight: 700, color: zoneColor(r.pct), flexShrink: 0 }}>
            {r.pct}%
          </span>
          <span style={{ fontSize: fontSize * 0.88, color: WHITE30, flexShrink: 0 }}>
            {r.made}/{r.attempted}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Category bar chart ───────────────────────────────────────────────────────
function CategoryBars({ cats, fontSize, maxBars = 4 }: {
  cats: Array<{ category: string; minutes?: number; count?: number }>;
  fontSize: number; maxBars?: number;
}) {
  const data = cats.slice(0, maxBars);
  const maxVal = Math.max(1, ...data.map(c => (c.minutes || c.count || 0)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((c, i) => {
        const val = c.minutes || c.count || 0;
        const pct = Math.round((val / maxVal) * 100);
        const col = CAT_COLORS[c.category] || ORANGE;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize, color: WHITE60, textTransform: "capitalize" }}>
                {c.category.replace(/-/g, " ")}
              </span>
              <span style={{ fontSize, color: col, fontWeight: 700 }}>
                {c.minutes ? `${val}m` : `${val}×`}
              </span>
            </div>
            <div style={{ height: 6, background: WHITE06, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────
function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: "0.58em", fontWeight: 700, letterSpacing: "0.12em",
      color: ORANGE, textTransform: "uppercase", marginBottom: 8, ...style }}>
      {children}
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

interface PeriodData {
  period: string; playerName: string; displayName?: string | null; teamName?: string | null;
  totalSessions: number; totalDrills: number; totalDuration: number;
  totalShotsAttempted: number; totalShotsMade: number; shootingPct?: number | null;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  dailyActivity: Array<{ date: string; minutes: number }>;
  topDrills: Array<{ name: string; count: number }>;
}

interface SeasonData {
  seasonName: string; seasonYear: string; teamName?: string | null;
  playerName: string; displayName?: string | null; jerseyNumber?: number | null;
  gamesPlayed: number; record: string;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
  fgPct: number; threePct: number; ftPct: number;
}

// ─── Workout Session Card ─────────────────────────────────────────────────────
function WorkoutSessionCard({ data, platform }: { data: WorkoutData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad = Math.round(W * 0.035);
  const isPortrait = platform === "tiktok";
  const isWide = W >= 1200;
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.some(d => d.attempted > 0);
  const totalMade = data.shotData.reduce((a, d) => a + d.made, 0);
  const totalAtt  = data.shotData.reduce((a, d) => a + d.attempted, 0);
  const overallPct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : null;

  const kpis = [
    { val: data.drillCount,      label: "Drills" },
    { val: `${data.totalDuration}`, label: "Minutes" },
    ...(overallPct != null ? [{ val: `${overallPct}%`, label: "Shooting" }] : []),
    ...(totalAtt > 0 ? [{ val: `${totalAtt}`, label: "Shots" }] : []),
  ];

  // Court width in the card body
  const courtW = isPortrait ? Math.round(W * 0.48) : Math.round(W * 0.38);
  const courtH = Math.round(courtW * (470 / 500));
  const drillsVisible = isPortrait ? 8 : 5;

  return (
    <div style={{ width: W * s, height: H * s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={cardBase(W, H)}>

        {/* Left orange accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%",
          background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.2) 100%)`, zIndex: 10 }} />

        {/* Background glow */}
        <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 65%)",
          pointerEvents: "none" }} />

        <CardHeader
          name={name}
          subtitle={[data.jerseyNumber != null ? `#${data.jerseyNumber}` : null, data.teamName].filter(Boolean).join(" · ") || undefined}
          tag="Workout Recap"
          date={new Date(data.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          W={W} pad={pad} isPortrait={isPortrait}
        />

        <KPIBar items={kpis} pad={pad} isPortrait={isPortrait} />

        {/* Body */}
        <div style={{ flex: 1, display: "flex", gap: pad, padding: `${pad * 0.8}px ${pad}px`,
          minHeight: 0, overflow: "hidden" }}>

          {/* Shot chart column */}
          {hasShotData && (
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, width: courtW }}>
              <SectionLabel>Shot Chart</SectionLabel>
              <CourtSVG shotData={data.shotData} width={courtW} height={courtH} />
              {/* Shot breakdown table below court */}
              <div style={{ marginTop: 10, flex: 1 }}>
                <ShotBreakdown shotData={data.shotData}
                  fontSize={isPortrait ? 13 : 11}
                  maxRows={isPortrait ? 6 : 4} />
              </div>
            </div>
          )}

          {/* Drills + category column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: isPortrait ? 20 : 14, minWidth: 0 }}>
            {/* Drills */}
            <div>
              <SectionLabel>Drills Completed</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.drills.slice(0, drillsVisible).map((dr, i) => {
                  const col = CAT_COLORS[dr.category] || ORANGE;
                  const drPct = dr.shotsAttempted ? Math.round(((dr.shotsMade || 0) / dr.shotsAttempted) * 100) : null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: isPortrait ? "12px 14px" : "9px 12px",
                      background: WHITE06, borderRadius: 8, borderLeft: `4px solid ${col}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: isPortrait ? "0.88em" : "0.76em",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff" }}>
                          {dr.title}
                        </div>
                        <div style={{ color: WHITE30, fontSize: isPortrait ? "0.70em" : "0.60em", marginTop: 2 }}>
                          {dr.duration}min
                          {dr.reps ? ` · ${dr.reps} reps` : ""}
                          {dr.shotsAttempted ? ` · ${dr.shotsMade}/${dr.shotsAttempted} shots` : ""}
                        </div>
                      </div>
                      {drPct != null && (
                        <div style={{ fontWeight: 800, fontSize: isPortrait ? "1em" : "0.85em",
                          color: zoneColor(drPct), flexShrink: 0 }}>
                          {drPct}%
                        </div>
                      )}
                      {dr.score != null && (
                        <div style={{ fontWeight: 700, fontSize: isPortrait ? "0.85em" : "0.72em",
                          color: ORANGE, flexShrink: 0 }}>
                          {dr.score}/10
                        </div>
                      )}
                    </div>
                  );
                })}
                {data.drills.length > drillsVisible && (
                  <div style={{ color: WHITE30, fontSize: "0.62em", textAlign: "center", paddingTop: 2 }}>
                    +{data.drills.length - drillsVisible} more
                  </div>
                )}
              </div>
            </div>

            {/* Category breakdown */}
            {data.categoryBreakdown.length > 0 && (
              <div>
                <SectionLabel>By Category</SectionLabel>
                <CategoryBars cats={data.categoryBreakdown}
                  fontSize={isPortrait ? 13 : 11}
                  maxBars={isPortrait ? 5 : 4} />
              </div>
            )}
          </div>
        </div>

        <CardFooter pad={pad} />
      </div>
      </div>
    </div>
  );
}

// ─── Training Period Card ─────────────────────────────────────────────────────
function TrainingPeriodCard({ data, platform }: { data: PeriodData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad = Math.round(W * 0.035);
  const isPortrait = platform === "tiktok";
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.some(d => d.attempted > 0);
  const totalMade = data.shotData.reduce((a, d) => a + d.made, 0);
  const totalAtt  = data.shotData.reduce((a, d) => a + d.attempted, 0);
  const overallPct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : null;

  const maxMin = Math.max(1, ...data.dailyActivity.map(d => d.minutes));
  const barMaxH = isPortrait ? 80 : 60;
  const courtW = isPortrait ? Math.round(W * 0.46) : Math.round(W * 0.36);
  const courtH = Math.round(courtW * (470 / 500));

  const kpis = [
    { val: data.totalSessions, label: "Sessions" },
    { val: data.totalDrills,   label: "Drills" },
    { val: `${data.totalDuration}`, label: "Minutes" },
    ...(overallPct != null ? [{ val: `${overallPct}%`, label: "Shooting" }] : []),
  ];

  return (
    <div style={{ width: W * s, height: H * s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={cardBase(W, H)}>

        <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%",
          background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.2) 100%)`, zIndex: 10 }} />
        <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)",
          pointerEvents: "none" }} />

        <CardHeader
          name={name}
          subtitle={data.teamName || undefined}
          tag={PERIOD_LABEL[data.period] || data.period}
          date="Training Summary"
          W={W} pad={pad} isPortrait={isPortrait}
        />

        <KPIBar items={kpis} pad={pad} isPortrait={isPortrait} />

        {/* Body */}
        <div style={{ flex: 1, display: "flex", gap: pad, padding: `${pad * 0.8}px ${pad}px`,
          minHeight: 0, overflow: "hidden" }}>

          {/* Left: activity bars + category bars */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

            {/* Daily activity bar chart */}
            {data.dailyActivity.length > 0 && (
              <div>
                <SectionLabel>Daily Activity</SectionLabel>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: barMaxH + 20 }}>
                  {data.dailyActivity.slice(-14).map((d, i) => {
                    const h = Math.max(3, Math.round((d.minutes / maxMin) * barMaxH));
                    const day = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" });
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 2 }}>
                        <div style={{ width: "100%", maxWidth: 30, height: h,
                          background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.45) 100%)`,
                          borderRadius: "3px 3px 0 0" }} />
                        <span style={{ fontSize: isPortrait ? "0.52em" : "0.42em",
                          color: WHITE30, letterSpacing: "0.02em" }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {data.categoryBreakdown.length > 0 && (
              <div style={{ flex: 1 }}>
                <SectionLabel>Skills Breakdown</SectionLabel>
                <CategoryBars
                  cats={data.categoryBreakdown.map(c => ({ category: c.category, minutes: c.minutes }))}
                  fontSize={isPortrait ? 13 : 11}
                  maxBars={isPortrait ? 6 : 5}
                />
              </div>
            )}

            {/* Top drills (when no shot data) */}
            {!hasShotData && data.topDrills.length > 0 && (
              <div style={{ flex: 1 }}>
                <SectionLabel>Top Drills</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {data.topDrills.slice(0, 5).map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", background: WHITE06, borderRadius: 7 }}>
                      <span style={{ color: "rgba(249,115,22,0.6)", fontSize: "0.65em",
                        fontWeight: 700, minWidth: 18 }}>#{i + 1}</span>
                      <span style={{ flex: 1, fontSize: "0.68em", fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      <span style={{ color: ORANGE, fontSize: "0.65em", fontWeight: 700, flexShrink: 0 }}>
                        {d.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: shot chart */}
          {hasShotData && (
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, width: courtW }}>
              <SectionLabel>Shot Chart</SectionLabel>
              <CourtSVG shotData={data.shotData} width={courtW} height={courtH} />
              <div style={{ marginTop: 10, flex: 1 }}>
                <ShotBreakdown shotData={data.shotData}
                  fontSize={isPortrait ? 12 : 10}
                  maxRows={isPortrait ? 5 : 4} />
              </div>
            </div>
          )}
        </div>

        <CardFooter pad={pad} />
      </div>
      </div>
    </div>
  );
}

// ─── Season Stats Card ────────────────────────────────────────────────────────
function SeasonStatsCard({ data, platform }: { data: SeasonData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const { w: W, h: H, scale: s } = cfg;
  const pad = Math.round(W * 0.04);
  const isPortrait = platform === "tiktok";
  const name = data.displayName || data.playerName || "Player";
  const numFs = isPortrait ? "2.8em" : "2.3em";
  const lblFs = isPortrait ? "0.62em" : "0.52em";

  const mainStats = [
    { val: data.ppg, label: "PPG" },
    { val: data.rpg, label: "RPG" },
    { val: data.apg, label: "APG" },
    { val: data.spg, label: "SPG" },
    { val: data.bpg, label: "BPG" },
  ];

  const shootingStats = [
    { val: data.fgPct,    label: "FG%",   pct: data.fgPct },
    { val: data.threePct, label: "3PT%",  pct: data.threePct },
    { val: data.ftPct,    label: "FT%",   pct: data.ftPct },
  ];

  return (
    <div style={{ width: W * s, height: H * s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={cardBase(W, H)}>

        <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%",
          background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.2) 100%)`, zIndex: 10 }} />
        <div style={{ position: "absolute", top: -100, right: -100, width: 450, height: 450,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 65%)",
          pointerEvents: "none" }} />

        <CardHeader
          name={name}
          subtitle={[data.jerseyNumber != null ? `#${data.jerseyNumber}` : null, data.teamName,
            `${data.seasonName} ${data.seasonYear}`].filter(Boolean).join(" · ") || undefined}
          tag="Season Stats"
          date={`${data.gamesPlayed} GP · Record ${data.record}`}
          W={W} pad={pad} isPortrait={isPortrait}
        />

        {/* Main per-game stats */}
        <div style={{ display: "flex", padding: `${pad}px ${pad}px ${pad * 0.6}px`,
          gap: pad * 0.4, flexShrink: 0 }}>
          {mainStats.map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center",
              background: i === 0 ? ORANGE15 : WHITE06,
              border: `1px solid ${i === 0 ? ORANGE30 : WHITE10}`,
              borderRadius: 12, padding: isPortrait ? "22px 4px" : "18px 4px" }}>
              <div style={{ fontSize: numFs, fontWeight: 900, letterSpacing: "-0.02em",
                lineHeight: 1.0, color: i === 0 ? ORANGE : "#fff" }}>{item.val}</div>
              <div style={{ fontSize: lblFs, color: WHITE60, letterSpacing: "0.1em",
                fontWeight: 600, marginTop: 6, textTransform: "uppercase" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Shooting splits */}
        <div style={{ padding: `0 ${pad}px ${pad}px`, flexShrink: 0 }}>
          <SectionLabel>Shooting Splits</SectionLabel>
          <div style={{ display: "flex", gap: pad * 0.5 }}>
            {shootingStats.map((item, i) => (
              <div key={i} style={{ flex: 1, background: WHITE06,
                border: `1px solid ${WHITE10}`, borderRadius: 12,
                padding: isPortrait ? "18px 8px" : "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: isPortrait ? "2.2em" : "1.85em", fontWeight: 800,
                  letterSpacing: "-0.02em", lineHeight: 1.0,
                  color: item.pct >= 50 ? "#22c55e" : item.pct >= 35 ? ORANGE : "#ef4444" }}>
                  {item.val}%
                </div>
                <div style={{ fontSize: lblFs, color: WHITE60, letterSpacing: "0.1em",
                  fontWeight: 600, marginTop: 6, textTransform: "uppercase" }}>{item.label}</div>
                {/* Progress bar */}
                <div style={{ height: 4, background: WHITE10, borderRadius: 2, overflow: "hidden",
                  margin: "8px 0 0" }}>
                  <div style={{ width: `${Math.min(100, item.pct)}%`, height: "100%", borderRadius: 2,
                    background: item.pct >= 50 ? "#22c55e" : item.pct >= 35 ? ORANGE : "#ef4444" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Record spotlight */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: `0 ${pad}px` }}>
          <div style={{ textAlign: "center", background: ORANGE15,
            border: `1px solid ${ORANGE30}`, borderRadius: 16,
            padding: isPortrait ? "28px 40px" : "22px 32px" }}>
            <div style={{ fontSize: isPortrait ? "5em" : "4em", fontWeight: 900,
              letterSpacing: "-0.03em", lineHeight: 1.0, color: ORANGE }}>{data.record}</div>
            <div style={{ color: WHITE60, fontSize: isPortrait ? "0.75em" : "0.62em",
              letterSpacing: "0.12em", fontWeight: 600, marginTop: 8, textTransform: "uppercase" }}>
              Season Record
            </div>
          </div>
        </div>

        <CardFooter pad={pad} />
      </div>
      </div>
    </div>
  );
}

// ─── Capture + Share helpers ───────────────────────────────────────────────────
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
    const totalAtt = d.shotData.reduce((a, s) => a + s.attempted, 0);
    const totalMade = d.shotData.reduce((a, s) => a + s.made, 0);
    const pct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : null;
    return `🏀 WORKOUT RECAP · ${new Date(d.date).toLocaleDateString()}\n${d.displayName || d.playerName}\n\n✅ ${d.drillCount} Drills  ⏱️ ${d.totalDuration} min${pct != null ? `  🎯 ${pct}% FG (${totalMade}/${totalAtt})` : ""}\n\n${d.drills.slice(0, 4).map(dr => `• ${dr.title}`).join("\n")}\n\nLog your training → ${url}\n\n#PLAYR1 #Basketball #HoopLife #Training #Grind`;
  }
  if (type === "season") {
    const d = data as SeasonData;
    return `🏀 SEASON STATS · ${d.seasonName} ${d.seasonYear}\n${d.displayName || d.playerName}${d.jerseyNumber ? ` #${d.jerseyNumber}` : ""}${d.teamName ? ` | ${d.teamName}` : ""}\n\n📊 ${d.ppg} PPG · ${d.rpg} RPG · ${d.apg} APG\n🎯 FG ${d.fgPct}% · 3PT ${d.threePct}% · FT ${d.ftPct}%\n🏆 Record: ${d.record} (${d.gamesPlayed} GP)\n\n→ ${url}\n\n#PLAYR1 #Basketball #SeasonStats #HoopLife`;
  }
  const d = data as PeriodData;
  const totalAtt = d.shotData.reduce((a, s) => a + s.attempted, 0);
  const totalMade = d.shotData.reduce((a, s) => a + s.made, 0);
  const pct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : null;
  return `🏀 ${PERIOD_LABEL[d.period] || "TRAINING"} SUMMARY\n${d.displayName || d.playerName}${d.teamName ? ` | ${d.teamName}` : ""}\n\n📊 ${d.totalSessions} Sessions · ${d.totalDrills} Drills · ${d.totalDuration} min${pct != null ? `\n🎯 ${pct}% FG (${totalMade}/${totalAtt})` : ""}\n\nTrack your game → ${url}\n\n#PLAYR1 #Basketball #HoopLife #Training`;
}

async function shareToPlatform(
  p: Platform, canvas: HTMLCanvasElement, text: string,
  toast: ReturnType<typeof useToast>["toast"],
) {
  const url = "https://playr1basketball.replit.app";
  if (p === "twitter") {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`, "_blank");
    return;
  }
  if (p === "facebook") {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text.slice(0, 200))}`, "_blank");
    return;
  }
  if (p === "youtube") {
    window.open("https://studio.youtube.com", "_blank");
    toast({ title: "YouTube Studio opened", description: "Download your card image, then upload as a Community Post or Short." });
    return;
  }
  // Instagram + TikTok → Web Share API with image file
  if (navigator.share) {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `playr1-${p}.png`, { type: "image/png" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "PLAYR1", text });
        } else {
          await navigator.share({ title: "PLAYR1", text, url });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          toast({ title: "Download and share manually", description: `Open ${p} and upload from gallery.` });
        }
      }
    }, "image/png");
    return;
  }
  // Fallback — just download
  const link = document.createElement("a");
  link.download = `playr1-${p}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  toast({ title: "Image saved!", description: `Open ${p} and share from your gallery.` });
}

// ─── Main Dialog ───────────────────────────────────────────────────────────────
export interface WorkoutShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutSessionId?: string | null;
  defaultTab?: CardType;
  seasonId?: string | null;
}

const PlatformIcon = ({ p }: { p: Platform }) => {
  if (p === "twitter")   return <Twitter className="w-3.5 h-3.5" />;
  if (p === "instagram") return <Instagram className="w-3.5 h-3.5" />;
  if (p === "facebook")  return <Facebook className="w-3.5 h-3.5" />;
  if (p === "youtube")   return <Youtube className="w-3.5 h-3.5" />;
  return <span className="text-[10px] font-black leading-none">TT</span>;
};

export function WorkoutShareDialog({ open, onOpenChange, workoutSessionId, defaultTab, seasonId }: WorkoutShareDialogProps) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [isBusy, setIsBusy] = useState(false);
  const initialTab: CardType = defaultTab || (workoutSessionId ? "workout" : seasonId ? "season" : "week");
  const [activeTab, setActiveTab] = useState<CardType>(initialTab);

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

  const currentData = activeTab === "workout" ? workoutData
    : activeTab === "week"   ? weekData
    : activeTab === "month"  ? monthData
    : activeTab === "year"   ? yearData
    : seasonData;

  const isLoading = (activeTab === "workout" && lW) || (activeTab === "week" && lWk) ||
    (activeTab === "month" && lMo) || (activeTab === "year" && lYr) || (activeTab === "season" && lSn);

  const getCanvas = async () => {
    const canvas = await captureCard(cardRef, platform);
    if (!canvas) { toast({ title: "Could not capture card — try again", variant: "destructive" }); return null; }
    return canvas;
  };

  const handleDownload = async () => {
    setIsBusy(true);
    try {
      const c = await getCanvas(); if (!c) return;
      const link = document.createElement("a");
      link.download = `playr1-${activeTab}-${platform}.png`;
      link.href = c.toDataURL("image/png"); link.click();
      toast({ title: "Image saved!" });
    } finally { setIsBusy(false); }
  };

  const handleShare = async (p: Platform) => {
    setIsBusy(true);
    try {
      const c = await getCanvas(); if (!c) return;
      await shareToPlatform(p, c, buildCaption(activeTab, currentData), toast);
    } finally { setIsBusy(false); }
  };

  const tabs: Array<{ value: CardType; label: string }> = [
    ...(workoutSessionId ? [{ value: "workout" as CardType, label: "Workout" }] : []),
    { value: "week",  label: "This Week"  },
    { value: "month", label: "This Month" },
    { value: "year",  label: "This Year"  },
    ...(seasonId ? [{ value: "season" as CardType, label: "Season" }] : []),
  ];
  const cfg = PLATFORMS.find(p => p.id === platform)!;

  const renderCard = (tab: CardType) => {
    if (tab === "workout" && workoutData)  return <div ref={cardRef}><WorkoutSessionCard  data={workoutData}  platform={platform} /></div>;
    if (tab === "week"    && weekData)     return <div ref={cardRef}><TrainingPeriodCard  data={weekData}    platform={platform} /></div>;
    if (tab === "month"   && monthData)    return <div ref={cardRef}><TrainingPeriodCard  data={monthData}   platform={platform} /></div>;
    if (tab === "year"    && yearData)     return <div ref={cardRef}><TrainingPeriodCard  data={yearData}    platform={platform} /></div>;
    if (tab === "season"  && seasonData)   return <div ref={cardRef}><SeasonStatsCard     data={seasonData}  platform={platform} /></div>;
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
                      ${platform === p.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
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
                  <div className="flex justify-center items-center bg-card border border-border rounded-xl overflow-hidden"
                    style={{ minHeight: 240 }}>
                    {isLoading ? (
                      <Skeleton className="w-full h-52 rounded-lg" />
                    ) : card ? (
                      card
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-10 px-4">
                        {tab.value === "workout" && !workoutSessionId
                          ? "No workout session selected."
                          : "No training data for this period yet — log some sessions first!"}
                      </p>
                    )}
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
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">
                        {p.label.split(" /")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
                <Badge variant="outline" className="text-xs text-muted-foreground mr-auto">
                  {cfg.label} · {cfg.w}×{cfg.h}px
                </Badge>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(buildCaption(activeTab, currentData))
                    .then(() => toast({ title: "Caption copied!" }))
                    .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
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
