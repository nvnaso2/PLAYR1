import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, Twitter, Instagram, Facebook, Youtube, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "twitter" | "tiktok" | "facebook";
type CardType = "workout" | "week" | "month" | "year" | "season";

const PLATFORM_CFG: Record<Platform, { label: string; w: number; h: number; scale: number }> = {
  instagram: { label: "Instagram", w: 1080, h: 1080, scale: 0.32 },
  twitter:   { label: "X / Twitter", w: 1200, h: 675,  scale: 0.35 },
  tiktok:    { label: "TikTok", w: 1080, h: 1920, scale: 0.22 },
  facebook:  { label: "Facebook", w: 1200, h: 630,  scale: 0.35 },
};

const PERIOD_LABEL: Record<string, string> = { week: "This Week", month: "This Month", year: "This Year" };

const CAT_COLORS: Record<string, string> = {
  "shooting": "#f97316",
  "ball-handling": "#3b82f6",
  "finishing": "#22c55e",
  "passing": "#a855f7",
  "defense": "#ef4444",
  "film-session": "#14b8a6",
  "workouts": "#eab308",
  "general": "#6b7280",
};

// ─── Inline SVG Shot Chart ────────────────────────────────────────────────────

const ZONES: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  "top-of-key":     { cx: 250, cy: 40,  rx: 80, ry: 26 },
  "wing-left":      { cx: 52,  cy: 130, rx: 28, ry: 42 },
  "wing-right":     { cx: 448, cy: 130, rx: 28, ry: 42 },
  "corner-left":    { cx: 17,  cy: 375, rx: 12, ry: 52 },
  "corner-right":   { cx: 483, cy: 375, rx: 12, ry: 52 },
  "free-throw":     { cx: 250, cy: 208, rx: 52, ry: 38 },
  "elbow-left":     { cx: 168, cy: 247, rx: 26, ry: 16 },
  "elbow-right":    { cx: 332, cy: 247, rx: 26, ry: 16 },
  "mid-range-left": { cx: 102, cy: 228, rx: 52, ry: 28 },
  "mid-range-right":{ cx: 398, cy: 228, rx: 52, ry: 28 },
  "paint":          { cx: 250, cy: 350, rx: 70, ry: 60 },
  "restricted":     { cx: 250, cy: 415, rx: 30, ry: 18 },
};

function pctColor(pct: number): string {
  if (pct >= 60) return "#22c55e";
  if (pct >= 40) return "#f97316";
  return "#ef4444";
}

function ShotChartSVG({ shotData, w = 500, h = 460 }: { shotData: Array<{ location: string; made: number; attempted: number }>; w?: number; h?: number }) {
  const dataMap = new Map(shotData.map(d => [d.location, d]));

  return (
    <svg viewBox="0 0 500 460" width={w} height={h} style={{ display: "block" }}>
      {/* Court floor */}
      <rect x={0} y={0} width={500} height={460} fill="#1a2744" rx={8} />
      {/* 3pt arc */}
      <path d="M 30 435 L 30 285 Q 30 100 250 70 Q 470 100 470 285 L 470 435" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
      {/* Key */}
      <rect x={170} y={245} width={160} height={190} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      {/* FT circle */}
      <circle cx={250} cy={245} r={80} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      {/* Basket */}
      <circle cx={250} cy={420} r={10} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <line x1={230} y1={428} x2={270} y2={428} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />

      {/* Zone ellipses */}
      {Object.entries(ZONES).map(([loc, z]) => {
        const d = dataMap.get(loc);
        if (!d) {
          return <ellipse key={loc} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
        }
        const pct = d.attempted > 0 ? (d.made / d.attempted) * 100 : 0;
        const fill = pctColor(pct);
        const opacity = Math.min(0.8, 0.3 + (d.attempted / 10) * 0.5);
        return (
          <g key={loc}>
            <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={fill} fillOpacity={opacity} stroke={fill} strokeWidth={1.5} strokeOpacity={0.8} />
            <text x={z.cx} y={z.cy - 4} textAnchor="middle" fill="white" fontSize={9} fontWeight="700">{d.made}/{d.attempted}</text>
            <text x={z.cx} y={z.cy + 9} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={8}>{Math.round(pct)}%</text>
          </g>
        );
      })}

      {/* Legend */}
      {[{ c: "#22c55e", l: "60%+" }, { c: "#f97316", l: "40-59%" }, { c: "#ef4444", l: "<40%" }].map((item, i) => (
        <g key={i} transform={`translate(${6 + i * 58}, 448)`}>
          <rect x={0} y={0} width={10} height={8} fill={item.c} rx={2} />
          <text x={13} y={8} fill="rgba(255,255,255,0.6)" fontSize={7}>{item.l}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Card: Workout Session ────────────────────────────────────────────────────

interface WorkoutData {
  sessionId: string;
  date: string;
  playerName: string;
  displayName?: string | null;
  teamName?: string | null;
  jerseyNumber?: number | null;
  totalDuration: number;
  drillCount: number;
  totalShotsAttempted: number;
  totalShotsMade: number;
  shootingPct?: number | null;
  drills: Array<{ title: string; category: string; duration: number; reps?: number | null; shotsAttempted?: number | null; shotsMade?: number | null; score?: number | null }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

function WorkoutSessionCard({ data, platform }: { data: WorkoutData; platform: Platform }) {
  const cfg = PLATFORM_CFG[platform];
  const isPortrait = platform === "tiktok";
  const isSquare = platform === "instagram";
  const s = cfg.scale;

  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.length > 0;
  const showDrills = data.drills.slice(0, isPortrait ? 6 : 4);
  const cardW = cfg.w; const cardH = cfg.h;

  return (
    <div style={{ width: cardW * s, height: cardH * s, position: "relative" }}>
      <div data-share-card style={{
        width: cardW, height: cardH,
        transform: `scale(${s})`, transformOrigin: "top left",
        background: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #1a1040 100%)",
        fontFamily: "'Inter','Segoe UI',sans-serif", color: "#fff",
        display: "flex", flexDirection: "column", gap: 0,
        overflow: "hidden", position: "relative", padding: isPortrait ? "60px 50px" : "40px 50px",
      }}>
        {/* Decorative circle */}
        <div style={{ position: "absolute", top: "-8%", right: "-8%", width: isPortrait ? 500 : 380, height: isPortrait ? 500 : 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: isPortrait ? 48 : 28 }}>
          <div style={{ background: "#f97316", borderRadius: 10, padding: isPortrait ? "10px 20px" : "8px 14px", fontWeight: 900, fontSize: isPortrait ? "2em" : "1.4em", letterSpacing: "0.02em" }}>
            PLAYR1
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: isPortrait ? "2.4em" : isSquare ? "2em" : "1.7em", lineHeight: 1.1 }}>{name}</div>
            {data.teamName && <div style={{ color: "#94a3b8", fontSize: isPortrait ? "1.1em" : "0.85em" }}>{data.teamName}</div>}
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ color: "#94a3b8", fontSize: isPortrait ? "0.9em" : "0.7em" }}>
              {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ color: "#f97316", fontWeight: 700, fontSize: isPortrait ? "1.1em" : "0.9em" }}>
              WORKOUT RECAP
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 0, marginBottom: isPortrait ? 40 : 24 }}>
          {[
            { val: data.drillCount, lbl: "DRILLS" },
            { val: `${data.totalDuration}m`, lbl: "MINUTES" },
            ...(data.shootingPct !== null && data.shootingPct !== undefined ? [{ val: `${data.shootingPct}%`, lbl: "SHOOTING" }] : []),
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "12px 8px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <div style={{ fontSize: isPortrait ? "2.4em" : "1.8em", fontWeight: 800, color: "#f97316", lineHeight: 1.1 }}>{item.val}</div>
              <div style={{ fontSize: isPortrait ? "0.75em" : "0.6em", color: "#64748b", letterSpacing: "0.1em", marginTop: 4 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Content: drills + optional shot chart */}
        <div style={{ flex: 1, display: "flex", gap: 28, minHeight: 0 }}>
          {/* Drills list */}
          <div style={{ flex: hasShotData ? "1 1 50%" : "1 1 100%", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            <div style={{ fontSize: isPortrait ? "0.9em" : "0.72em", color: "#64748b", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>DRILLS COMPLETED</div>
            {showDrills.map((drill, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, borderLeft: `3px solid ${CAT_COLORS[drill.category] || "#6b7280"}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: isPortrait ? "1em" : "0.82em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{drill.title}</div>
                  <div style={{ color: "#64748b", fontSize: isPortrait ? "0.8em" : "0.65em" }}>
                    {drill.duration}min{drill.reps ? ` · ${drill.reps} reps` : ""}{drill.shotsAttempted ? ` · ${drill.shotsMade}/${drill.shotsAttempted}` : ""}
                  </div>
                </div>
                {drill.score && <div style={{ color: "#f97316", fontWeight: 700, fontSize: isPortrait ? "1em" : "0.82em" }}>{drill.score}/10</div>}
              </div>
            ))}
            {data.drills.length > showDrills.length && (
              <div style={{ color: "#64748b", fontSize: isPortrait ? "0.85em" : "0.7em", textAlign: "center", paddingTop: 4 }}>
                +{data.drills.length - showDrills.length} more drill{data.drills.length - showDrills.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Shot Chart */}
          {hasShotData && (
            <div style={{ flex: "1 1 45%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: isPortrait ? "0.9em" : "0.72em", color: "#64748b", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8, alignSelf: "flex-start" }}>SHOT CHART</div>
              <ShotChartSVG shotData={data.shotData} w={isPortrait ? 280 : 220} h={isPortrait ? 260 : 200} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 16 }}>
          <span style={{ fontWeight: 900, fontSize: isPortrait ? "1.2em" : "0.9em", letterSpacing: "0.15em", color: "rgba(249,115,22,0.5)" }}>PLAYR1</span>
          <span style={{ color: "#334155", fontSize: isPortrait ? "0.75em" : "0.6em" }}>playr1.app</span>
        </div>
      </div>
    </div>
  );
}

// ─── Card: Training Period Summary ────────────────────────────────────────────

interface PeriodData {
  period: string;
  playerName: string;
  displayName?: string | null;
  teamName?: string | null;
  totalSessions: number;
  totalDrills: number;
  totalDuration: number;
  totalShotsAttempted: number;
  totalShotsMade: number;
  shootingPct?: number | null;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  dailyActivity: Array<{ date: string; minutes: number }>;
  topDrills: Array<{ name: string; count: number }>;
}

function TrainingPeriodCard({ data, platform }: { data: PeriodData; platform: Platform }) {
  const cfg = PLATFORM_CFG[platform];
  const isPortrait = platform === "tiktok";
  const s = cfg.scale;
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.length > 0;
  const maxMinutes = Math.max(1, ...data.dailyActivity.map(d => d.minutes));
  const barW = isPortrait ? 36 : 26;
  const barMaxH = isPortrait ? 80 : 60;

  return (
    <div style={{ width: cfg.w * s, height: cfg.h * s, position: "relative" }}>
      <div data-share-card style={{
        width: cfg.w, height: cfg.h,
        transform: `scale(${s})`, transformOrigin: "top left",
        background: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #1a1040 100%)",
        fontFamily: "'Inter','Segoe UI',sans-serif", color: "#fff",
        display: "flex", flexDirection: "column",
        overflow: "hidden", position: "relative", padding: isPortrait ? "60px 50px" : "36px 48px",
      }}>
        <div style={{ position: "absolute", top: "-8%", right: "-8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: isPortrait ? 44 : 24 }}>
          <div style={{ background: "#3b82f6", borderRadius: 10, padding: isPortrait ? "10px 20px" : "7px 14px", fontWeight: 900, fontSize: isPortrait ? "1.8em" : "1.3em" }}>PLAYR1</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: isPortrait ? "2.2em" : "1.6em", lineHeight: 1.1 }}>{name}</div>
            {data.teamName && <div style={{ color: "#94a3b8", fontSize: isPortrait ? "1em" : "0.8em" }}>{data.teamName}</div>}
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: isPortrait ? "1.1em" : "0.9em" }}>{PERIOD_LABEL[data.period] || data.period.toUpperCase()}</div>
            <div style={{ color: "#64748b", fontSize: isPortrait ? "0.75em" : "0.62em" }}>TRAINING SUMMARY</div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", marginBottom: isPortrait ? 40 : 22, gap: 0 }}>
          {[
            { val: data.totalSessions, lbl: "SESSIONS" },
            { val: data.totalDrills, lbl: "DRILLS" },
            { val: `${data.totalDuration}m`, lbl: "MINUTES" },
            ...(data.shootingPct !== null && data.shootingPct !== undefined ? [{ val: `${data.shootingPct}%`, lbl: "SHOOTING" }] : []),
          ].map((item, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 6px", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <div style={{ fontSize: isPortrait ? "2.2em" : "1.6em", fontWeight: 800, color: "#3b82f6", lineHeight: 1 }}>{item.val}</div>
              <div style={{ fontSize: isPortrait ? "0.7em" : "0.58em", color: "#64748b", letterSpacing: "0.1em", marginTop: 4 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Main content row */}
        <div style={{ flex: 1, display: "flex", gap: 28, minHeight: 0 }}>
          {/* Left: activity bars + categories */}
          <div style={{ flex: "1 1 55%", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Daily activity sparkline */}
            {data.dailyActivity.length > 0 && (
              <div>
                <div style={{ fontSize: isPortrait ? "0.85em" : "0.68em", color: "#64748b", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>DAILY ACTIVITY</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: barMaxH + 20 }}>
                  {data.dailyActivity.slice(-14).map((d, i) => {
                    const h = Math.max(4, Math.round((d.minutes / maxMinutes) * barMaxH));
                    const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
                        <div style={{ width: "100%", maxWidth: barW, height: h, background: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)", borderRadius: "3px 3px 0 0" }} />
                        <span style={{ fontSize: isPortrait ? "0.55em" : "0.44em", color: "#64748b" }}>{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {data.categoryBreakdown.slice(0, 4).length > 0 && (
              <div>
                <div style={{ fontSize: isPortrait ? "0.85em" : "0.68em", color: "#64748b", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>TOP SKILLS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.categoryBreakdown.slice(0, isPortrait ? 5 : 4).map((cat, i) => {
                    const max = data.categoryBreakdown[0]?.minutes || 1;
                    const pct = Math.round((cat.minutes / max) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: isPortrait ? "0.8em" : "0.65em", marginBottom: 3 }}>
                          <span style={{ textTransform: "capitalize" }}>{cat.category.replace(/-/g, " ")}</span>
                          <span style={{ color: "#64748b" }}>{cat.minutes}m</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[cat.category] || "#6b7280", borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: shot chart or top drills */}
          <div style={{ flex: "1 1 42%", display: "flex", flexDirection: "column" }}>
            {hasShotData ? (
              <>
                <div style={{ fontSize: isPortrait ? "0.85em" : "0.68em", color: "#64748b", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>SHOT CHART</div>
                <ShotChartSVG shotData={data.shotData} w={isPortrait ? 260 : 200} h={isPortrait ? 240 : 185} />
              </>
            ) : data.topDrills.length > 0 ? (
              <>
                <div style={{ fontSize: isPortrait ? "0.85em" : "0.68em", color: "#64748b", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>TOP DRILLS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.topDrills.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                      <span style={{ color: "#64748b", fontSize: isPortrait ? "0.9em" : "0.72em", minWidth: 18 }}>#{i + 1}</span>
                      <span style={{ flex: 1, fontSize: isPortrait ? "0.9em" : "0.72em", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      <span style={{ color: "#3b82f6", fontSize: isPortrait ? "0.85em" : "0.68em" }}>{d.count}x</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 12 }}>
          <span style={{ fontWeight: 900, fontSize: isPortrait ? "1.2em" : "0.85em", letterSpacing: "0.15em", color: "rgba(59,130,246,0.5)" }}>PLAYR1</span>
          <span style={{ color: "#334155", fontSize: isPortrait ? "0.75em" : "0.58em" }}>playr1.app</span>
        </div>
      </div>
    </div>
  );
}

// ─── Card: Season Stats ───────────────────────────────────────────────────────

interface SeasonData {
  seasonName: string;
  seasonYear: string;
  teamName?: string | null;
  playerName: string;
  displayName?: string | null;
  jerseyNumber?: number | null;
  gamesPlayed: number;
  record: string;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
  fgPct: number; threePct: number; ftPct: number;
}

function SeasonStatsCard({ data, platform }: { data: SeasonData; platform: Platform }) {
  const cfg = PLATFORM_CFG[platform];
  const isPortrait = platform === "tiktok";
  const s = cfg.scale;
  const name = data.displayName || data.playerName || "Player";

  return (
    <div style={{ width: cfg.w * s, height: cfg.h * s, position: "relative" }}>
      <div data-share-card style={{
        width: cfg.w, height: cfg.h,
        transform: `scale(${s})`, transformOrigin: "top left",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "'Inter','Segoe UI',sans-serif", color: "#fff",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        overflow: "hidden", position: "relative", padding: isPortrait ? "70px 55px" : "44px 55px",
      }}>
        <div style={{ position: "absolute", top: "15%", right: "-8%", width: isPortrait ? 450 : 340, height: isPortrait ? 450 : 340, borderRadius: "50%", border: "3px solid rgba(249,115,22,0.08)", pointerEvents: "none" }} />

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: isPortrait ? 44 : 24 }}>
            {data.jerseyNumber !== null && data.jerseyNumber !== undefined && (
              <div style={{ background: "#f97316", borderRadius: 8, padding: isPortrait ? "10px 20px" : "7px 14px", fontWeight: 900, fontSize: isPortrait ? "1.8em" : "1.3em" }}>#{data.jerseyNumber}</div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: isPortrait ? "2.2em" : isPortrait ? "2em" : "1.7em", lineHeight: 1.1 }}>{name}</div>
              <div style={{ color: "#94a3b8", fontSize: isPortrait ? "1em" : "0.8em" }}>{data.teamName || data.seasonName} · {data.seasonYear}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: isPortrait ? "1.8em" : "1.4em", fontWeight: 800, color: "#f97316" }}>{data.record}</div>
              <div style={{ color: "#64748b", fontSize: isPortrait ? "0.75em" : "0.62em" }}>{data.gamesPlayed} GP</div>
            </div>
          </div>

          {/* Main stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, textAlign: "center", marginBottom: isPortrait ? 44 : 24 }}>
            {[{ val: data.ppg, lbl: "PPG" }, { val: data.rpg, lbl: "RPG" }, { val: data.apg, lbl: "APG" }, { val: data.spg, lbl: "SPG" }, { val: data.bpg, lbl: "BPG" }].map(item => (
              <div key={item.lbl}>
                <div style={{ fontSize: isPortrait ? "2.6em" : "2em", fontWeight: 800, color: "#f97316", lineHeight: 1.1 }}>{item.val}</div>
                <div style={{ fontSize: isPortrait ? "0.72em" : "0.6em", color: "#94a3b8", letterSpacing: "0.08em", marginTop: 4 }}>{item.lbl}</div>
              </div>
            ))}
          </div>

          {/* Shooting pcts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center", paddingTop: isPortrait ? 32 : 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[{ val: `${data.fgPct}%`, lbl: "FG%" }, { val: `${data.threePct}%`, lbl: "3P%" }, { val: `${data.ftPct}%`, lbl: "FT%" }].map(item => (
              <div key={item.lbl}>
                <div style={{ fontSize: isPortrait ? "2em" : "1.6em", fontWeight: 800, color: "#38bdf8", lineHeight: 1.1 }}>{item.val}</div>
                <div style={{ fontSize: isPortrait ? "0.72em" : "0.6em", color: "#94a3b8", letterSpacing: "0.08em", marginTop: 4 }}>{item.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Season badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "rgba(249,115,22,0.06)", borderRadius: 10, borderLeft: "3px solid #f97316", marginTop: isPortrait ? 40 : 22 }}>
          <span style={{ fontSize: isPortrait ? "0.9em" : "0.75em", color: "#94a3b8" }}>{data.seasonName}</span>
          <span style={{ fontSize: isPortrait ? "0.9em" : "0.75em", fontWeight: 700, color: "#f97316", marginLeft: "auto" }}>SEASON STATS</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 16 }}>
          <span style={{ fontWeight: 900, fontSize: isPortrait ? "1.2em" : "0.9em", letterSpacing: "0.15em", color: "rgba(249,115,22,0.5)" }}>PLAYR1</span>
          <span style={{ color: "#334155", fontSize: isPortrait ? "0.75em" : "0.6em" }}>playr1.app</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

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
  const [isDownloading, setIsDownloading] = useState(false);

  const initialTab: CardType =
    defaultTab ||
    (workoutSessionId ? "workout" : seasonId ? "season" : "week");

  const [activeTab, setActiveTab] = useState<CardType>(initialTab);

  const { data: workoutData, isLoading: loadingWorkout } = useQuery<WorkoutData>({
    queryKey: ["/api/share/workout-session", workoutSessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/share/workout-session/${workoutSessionId}`);
      return res.json();
    },
    enabled: open && !!workoutSessionId && activeTab === "workout",
  });

  const { data: weekData, isLoading: loadingWeek } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "week"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/share/training-summary?period=week");
      return res.json();
    },
    enabled: open && activeTab === "week",
  });

  const { data: monthData, isLoading: loadingMonth } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "month"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/share/training-summary?period=month");
      return res.json();
    },
    enabled: open && activeTab === "month",
  });

  const { data: yearData, isLoading: loadingYear } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "year"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/share/training-summary?period=year");
      return res.json();
    },
    enabled: open && activeTab === "year",
  });

  const { data: seasonData, isLoading: loadingSeason } = useQuery<SeasonData>({
    queryKey: ["/api/share/season-stats", seasonId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/share/season-stats/${seasonId}`);
      return res.json();
    },
    enabled: open && !!seasonId && activeTab === "season",
  });

  const isLoading =
    (activeTab === "workout" && loadingWorkout) ||
    (activeTab === "week" && loadingWeek) ||
    (activeTab === "month" && loadingMonth) ||
    (activeTab === "year" && loadingYear) ||
    (activeTab === "season" && loadingSeason);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const el = cardRef.current.querySelector("[data-share-card]") as HTMLElement;
      if (!el) throw new Error("Card element not found");
      const cfg = PLATFORM_CFG[platform];
      const canvas = await html2canvas(el, {
        width: cfg.w, height: cfg.h, scale: 1,
        backgroundColor: null, logging: false,
        useCORS: true, allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `playr1-${activeTab}-${platform}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Card downloaded!" });
    } catch {
      toast({ title: "Failed to download card", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = () => {
    let text = "";
    if (activeTab === "workout" && workoutData) {
      const d = workoutData;
      text = `🏀 WORKOUT RECAP — ${new Date(d.date).toLocaleDateString()}\n${d.displayName || d.playerName}\n\n✅ ${d.drillCount} Drills | ⏱️ ${d.totalDuration} min${d.shootingPct !== null && d.shootingPct !== undefined ? ` | 🎯 ${d.shootingPct}% shooting` : ""}\n\nDrills:\n${d.drills.map(dr => `• ${dr.title} (${dr.duration}min)`).join("\n")}\n\n#PLAYR1 #Basketball #Training`;
    } else if ((activeTab === "week" || activeTab === "month" || activeTab === "year") && (weekData || monthData || yearData)) {
      const d = (activeTab === "week" ? weekData : activeTab === "month" ? monthData : yearData)!;
      text = `🏀 ${PERIOD_LABEL[d.period]} TRAINING SUMMARY\n${d.displayName || d.playerName}\n\n📊 ${d.totalSessions} Sessions | ${d.totalDrills} Drills | ${d.totalDuration} Minutes${d.shootingPct !== null && d.shootingPct !== undefined ? ` | 🎯 ${d.shootingPct}% Shooting` : ""}\n\n#PLAYR1 #Basketball #HoopLife`;
    } else if (activeTab === "season" && seasonData) {
      const d = seasonData;
      text = `🏀 SEASON STATS — ${d.seasonName} ${d.seasonYear}\n${d.displayName || d.playerName}${d.jerseyNumber ? ` #${d.jerseyNumber}` : ""}\n\nRecord: ${d.record} | ${d.gamesPlayed} GP\nPPG: ${d.ppg} | RPG: ${d.rpg} | APG: ${d.apg} | SPG: ${d.spg}\nFG: ${d.fgPct}% | 3PT: ${d.threePct}% | FT: ${d.ftPct}%\n\n#PLAYR1 #Basketball #SeasonStats`;
    }
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Caption copied to clipboard!" }),
      () => toast({ title: "Failed to copy", variant: "destructive" })
    );
  };

  const tabs: Array<{ value: CardType; label: string; show: boolean }> = [
    { value: "workout", label: "Workout", show: !!workoutSessionId },
    { value: "week",    label: "This Week",  show: true },
    { value: "month",   label: "This Month", show: true },
    { value: "year",    label: "This Year",  show: true },
    { value: "season",  label: "Season",     show: !!seasonId },
  ].filter(t => t.show);

  const platformIcon = (p: Platform) => {
    switch (p) {
      case "twitter":   return <Twitter className="w-3.5 h-3.5" />;
      case "instagram": return <Instagram className="w-3.5 h-3.5" />;
      case "facebook":  return <Facebook className="w-3.5 h-3.5" />;
      case "tiktok":    return <span className="text-xs font-bold leading-none">TT</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="dialog-workout-share">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Training
          </DialogTitle>
        </DialogHeader>

        {/* Tab selector */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CardType)}>
          <TabsList className="w-full flex flex-wrap gap-1 mb-0" data-testid="tabs-share-type">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs" data-testid={`tab-share-${t.value}`}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-3">
              {/* Platform selector */}
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {activeTab === "workout" ? "Share today's workout" : activeTab === "season" ? "Share season stats" : `Share ${PERIOD_LABEL[activeTab]?.toLowerCase()} summary`}
                </p>
                <div className="flex gap-1">
                  {(Object.keys(PLATFORM_CFG) as Platform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs border transition-colors ${platform === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                      data-testid={`button-platform-${p}`}
                    >
                      {platformIcon(p)}
                      <span className="hidden sm:inline">{PLATFORM_CFG[p].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card preview */}
              <div className="flex justify-center bg-[#0d1117] rounded-xl p-4 min-h-[220px] items-center">
                {isLoading ? (
                  <Skeleton className="w-full h-56 rounded-lg" />
                ) : tab.value === "workout" && workoutData ? (
                  <div ref={cardRef}><WorkoutSessionCard data={workoutData} platform={platform} /></div>
                ) : (tab.value === "week" && weekData) ? (
                  <div ref={cardRef}><TrainingPeriodCard data={weekData} platform={platform} /></div>
                ) : (tab.value === "month" && monthData) ? (
                  <div ref={cardRef}><TrainingPeriodCard data={monthData} platform={platform} /></div>
                ) : (tab.value === "year" && yearData) ? (
                  <div ref={cardRef}><TrainingPeriodCard data={yearData} platform={platform} /></div>
                ) : (tab.value === "season" && seasonData) ? (
                  <div ref={cardRef}><SeasonStatsCard data={seasonData} platform={platform} /></div>
                ) : !isLoading ? (
                  <p className="text-muted-foreground text-sm text-center">
                    {tab.value === "workout" && !workoutSessionId ? "No workout session selected." : "No data available for this period."}
                  </p>
                ) : null}
              </div>

              {/* Dimensions badge */}
              <div className="flex justify-center mt-2">
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {PLATFORM_CFG[platform].label} · {PLATFORM_CFG[platform].w}×{PLATFORM_CFG[platform].h}
                </Badge>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 flex-wrap border-t">
          <Button variant="outline" onClick={handleCopyText} className="gap-2" data-testid="button-copy-caption">
            <Copy className="w-4 h-4" />
            Copy Caption
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading || isLoading} className="gap-2" data-testid="button-download-share">
            <Download className="w-4 h-4" />
            {isDownloading ? "Saving..." : "Download Image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
