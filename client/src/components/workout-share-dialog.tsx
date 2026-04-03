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
  { id: "instagram", label: "Instagram", w: 1080, h: 1080, scale: 0.31 },
  { id: "twitter",   label: "X / Twitter", w: 1200, h: 675,  scale: 0.35 },
  { id: "facebook",  label: "Facebook",  w: 1200, h: 630,  scale: 0.35 },
  { id: "tiktok",    label: "TikTok",    w: 1080, h: 1920, scale: 0.21 },
  { id: "youtube",   label: "YouTube",   w: 1280, h: 720,  scale: 0.32 },
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

// ─── Inline SVG Shot Chart ────────────────────────────────────────────────────

const ZONES: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  "top-of-key":      { cx: 250, cy: 42,  rx: 78, ry: 24 },
  "wing-left":       { cx: 50,  cy: 125, rx: 26, ry: 40 },
  "wing-right":      { cx: 450, cy: 125, rx: 26, ry: 40 },
  "corner-left":     { cx: 18,  cy: 375, rx: 12, ry: 50 },
  "corner-right":    { cx: 482, cy: 375, rx: 12, ry: 50 },
  "free-throw":      { cx: 250, cy: 200, rx: 52, ry: 36 },
  "elbow-left":      { cx: 168, cy: 242, rx: 26, ry: 16 },
  "elbow-right":     { cx: 332, cy: 242, rx: 26, ry: 16 },
  "mid-range-left":  { cx: 100, cy: 220, rx: 50, ry: 26 },
  "mid-range-right": { cx: 400, cy: 220, rx: 50, ry: 26 },
  "paint":           { cx: 250, cy: 348, rx: 68, ry: 58 },
  "restricted":      { cx: 250, cy: 412, rx: 28, ry: 18 },
};

function pctColor(pct: number) {
  if (pct >= 55) return "#22c55e";
  if (pct >= 35) return "#f97316";
  return "#ef4444";
}

function ShotChartSVG({
  shotData,
  w = 500,
  h = 450,
}: {
  shotData: Array<{ location: string; made: number; attempted: number }>;
  w?: number;
  h?: number;
}) {
  const dataMap = new Map(shotData.map(d => [d.location, d]));
  return (
    <svg viewBox="0 0 500 450" width={w} height={h} style={{ display: "block" }}>
      {/* Court background */}
      <rect width={500} height={450} fill="#0f172a" rx={6} />
      {/* 3pt arc */}
      <path d="M 30 440 L 30 280 Q 30 90 250 65 Q 470 90 470 280 L 470 440" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
      {/* Key */}
      <rect x={170} y={238} width={160} height={195} fill="rgba(249,115,22,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      {/* FT circle */}
      <circle cx={250} cy={238} r={80} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
      {/* Restricted area */}
      <circle cx={250} cy={415} r={40} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      {/* Basket */}
      <circle cx={250} cy={420} r={9} fill="none" stroke="rgba(249,115,22,0.6)" strokeWidth={2} />
      <line x1={232} y1={432} x2={268} y2={432} stroke="rgba(249,115,22,0.4)" strokeWidth={2} />

      {/* Zone markers */}
      {Object.entries(ZONES).map(([loc, z]) => {
        const d = dataMap.get(loc);
        if (!d || d.attempted === 0) {
          return (
            <ellipse key={loc} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          );
        }
        const pct = (d.made / d.attempted) * 100;
        const col = pctColor(pct);
        const op = Math.min(0.85, 0.25 + (d.attempted / 12) * 0.6);
        return (
          <g key={loc}>
            <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill={col} fillOpacity={op} stroke={col} strokeWidth={1.5} strokeOpacity={0.9} />
            <text x={z.cx} y={z.cy - 3} textAnchor="middle" fill="white" fontSize={8.5} fontWeight="700">
              {d.made}/{d.attempted}
            </text>
            <text x={z.cx} y={z.cy + 9} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={7.5}>
              {Math.round(pct)}%
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(6, 442)">
        {[{ c: "#22c55e", l: "55%+" }, { c: "#f97316", l: "35-54%" }, { c: "#ef4444", l: "<35%" }].map((item, i) => (
          <g key={i} transform={`translate(${i * 60}, 0)`}>
            <rect width={8} height={6} fill={item.c} rx={1.5} />
            <text x={10} y={6} fill="rgba(255,255,255,0.5)" fontSize={6}>{item.l}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Card Base Styles ─────────────────────────────────────────────────────────

const BG = "linear-gradient(145deg, #0a0f1e 0%, #0d1628 45%, #121c34 100%)";
const ORANGE = "#f97316";
const ORANGE_DIM = "rgba(249,115,22,0.15)";
const BORDER = "rgba(249,115,22,0.2)";

function cardStyle(w: number, h: number): React.CSSProperties {
  return {
    width: w, height: h,
    background: BG,
    fontFamily: "'Inter','Helvetica Neue',sans-serif",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    borderRadius: 0,
  };
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: "0.62em", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(249,115,22,0.8)", textTransform: "uppercase", ...style }}>
      {children}
    </div>
  );
}

// ─── Workout Session Card ─────────────────────────────────────────────────────

interface WorkoutData {
  sessionId: string; date: string; playerName: string; displayName?: string | null;
  teamName?: string | null; jerseyNumber?: number | null;
  totalDuration: number; drillCount: number;
  totalShotsAttempted: number; totalShotsMade: number; shootingPct?: number | null;
  drills: Array<{ title: string; category: string; duration: number; reps?: number | null; shotsAttempted?: number | null; shotsMade?: number | null; score?: number | null }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

function WorkoutSessionCard({ data, platform }: { data: WorkoutData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const s = cfg.scale;
  const isPortrait = platform === "tiktok";
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.length > 0;
  const showDrills = data.drills.slice(0, isPortrait ? 7 : hasShotData ? 4 : 6);
  const W = cfg.w; const H = cfg.h;
  const pad = isPortrait ? 52 : 40;

  return (
    <div style={{ width: W * s, height: H * s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={{ ...cardStyle(W, H), padding: `${pad}px ${pad}px` }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Left orange stripe */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.3) 100%)` }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: isPortrait ? 40 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: ORANGE, borderRadius: 6, padding: isPortrait ? "8px 18px" : "6px 14px", fontWeight: 900, fontSize: isPortrait ? "1.5em" : "1.1em", letterSpacing: "0.05em", lineHeight: 1 }}>
              PLAYR1
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: isPortrait ? "2em" : "1.55em", lineHeight: 1.1, letterSpacing: "-0.01em" }}>{name}</div>
              {(data.teamName || data.jerseyNumber != null) && (
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: isPortrait ? "0.9em" : "0.72em", marginTop: 2 }}>
                  {data.jerseyNumber != null ? `#${data.jerseyNumber}` : ""}{data.teamName ? (data.jerseyNumber != null ? " · " : "") + data.teamName : ""}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: ORANGE, fontWeight: 700, fontSize: isPortrait ? "0.85em" : "0.68em", letterSpacing: "0.08em" }}>WORKOUT RECAP</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: isPortrait ? "0.75em" : "0.6em", marginTop: 2 }}>
              {new Date(data.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: isPortrait ? 36 : 20, overflow: "hidden" }}>
          {[
            { val: data.drillCount, lbl: "DRILLS" },
            { val: `${data.totalDuration}`, lbl: "MINUTES" },
            ...(data.shootingPct != null ? [{ val: `${data.shootingPct}%`, lbl: "SHOOTING" }] : []),
          ].map((item, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: isPortrait ? "22px 8px" : "14px 8px", borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ fontSize: isPortrait ? "2.4em" : "1.9em", fontWeight: 800, color: ORANGE, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{item.val}</div>
              <div style={{ fontSize: isPortrait ? "0.65em" : "0.52em", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", marginTop: 4, fontWeight: 600 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Body: drills + shot chart */}
        <div style={{ flex: 1, display: "flex", gap: hasShotData ? 24 : 0, minHeight: 0 }}>
          {/* Drills */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, overflow: "hidden" }}>
            <Label>DRILLS COMPLETED</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {showDrills.map((drill, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,0.035)", borderRadius: 8, borderLeft: `3px solid ${CAT_COLORS[drill.category] || "#94a3b8"}`, flexShrink: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: isPortrait ? "0.95em" : "0.78em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{drill.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: isPortrait ? "0.75em" : "0.6em", marginTop: 2 }}>
                      {drill.duration}min{drill.reps ? ` · ${drill.reps} reps` : ""}{drill.shotsAttempted ? ` · ${drill.shotsMade}/${drill.shotsAttempted} made` : ""}
                    </div>
                  </div>
                  {drill.score != null && (
                    <div style={{ color: ORANGE, fontWeight: 700, fontSize: isPortrait ? "0.9em" : "0.75em", flexShrink: 0 }}>{drill.score}/10</div>
                  )}
                </div>
              ))}
              {data.drills.length > showDrills.length && (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: isPortrait ? "0.75em" : "0.6em", textAlign: "center", paddingTop: 2 }}>
                  +{data.drills.length - showDrills.length} more drill{data.drills.length - showDrills.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Shot Chart */}
          {hasShotData && (
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>SHOT CHART</Label>
              <ShotChartSVG shotData={data.shotData} w={isPortrait ? 270 : W < 1100 ? 200 : 220} h={isPortrait ? 252 : 188} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginTop: 14, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontWeight: 900, fontSize: isPortrait ? "1em" : "0.8em", letterSpacing: "0.2em", color: "rgba(249,115,22,0.4)" }}>PLAYR1</span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: isPortrait ? "0.65em" : "0.52em" }}>playr1.app</span>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Training Period Card ─────────────────────────────────────────────────────

interface PeriodData {
  period: string; playerName: string; displayName?: string | null; teamName?: string | null;
  totalSessions: number; totalDrills: number; totalDuration: number;
  totalShotsAttempted: number; totalShotsMade: number; shootingPct?: number | null;
  categoryBreakdown: Array<{ category: string; minutes: number }>;
  shotData: Array<{ location: string; made: number; attempted: number }>;
  dailyActivity: Array<{ date: string; minutes: number }>;
  topDrills: Array<{ name: string; count: number }>;
}

function TrainingPeriodCard({ data, platform }: { data: PeriodData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const s = cfg.scale;
  const isPortrait = platform === "tiktok";
  const W = cfg.w; const H = cfg.h;
  const pad = isPortrait ? 52 : 40;
  const name = data.displayName || data.playerName || "Player";
  const hasShotData = data.shotData.length > 0;
  const maxMin = Math.max(1, ...data.dailyActivity.map(d => d.minutes));
  const barMaxH = isPortrait ? 80 : 60;

  return (
    <div style={{ width: W * s, height: H * s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={{ ...cardStyle(W, H), padding: `${pad}px ${pad}px` }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.3) 100%)` }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: isPortrait ? 36 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: ORANGE, borderRadius: 6, padding: isPortrait ? "8px 18px" : "6px 14px", fontWeight: 900, fontSize: isPortrait ? "1.5em" : "1.1em", letterSpacing: "0.05em", lineHeight: 1 }}>PLAYR1</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: isPortrait ? "2em" : "1.55em", lineHeight: 1.1, letterSpacing: "-0.01em" }}>{name}</div>
              {data.teamName && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: isPortrait ? "0.9em" : "0.72em", marginTop: 2 }}>{data.teamName}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: ORANGE, fontWeight: 700, fontSize: isPortrait ? "0.85em" : "0.68em", letterSpacing: "0.08em" }}>{(PERIOD_LABEL[data.period] || data.period).toUpperCase()}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: isPortrait ? "0.72em" : "0.58em", marginTop: 2 }}>TRAINING SUMMARY</div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: isPortrait ? 32 : 18, overflow: "hidden" }}>
          {[
            { val: data.totalSessions, lbl: "SESSIONS" },
            { val: data.totalDrills, lbl: "DRILLS" },
            { val: `${data.totalDuration}`, lbl: "MINUTES" },
            ...(data.shootingPct != null ? [{ val: `${data.shootingPct}%`, lbl: "SHOOTING" }] : []),
          ].map((item, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: isPortrait ? "18px 6px" : "12px 6px", borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ fontSize: isPortrait ? "2.2em" : "1.75em", fontWeight: 800, color: ORANGE, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{item.val}</div>
              <div style={{ fontSize: isPortrait ? "0.6em" : "0.48em", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", marginTop: 4, fontWeight: 600 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", gap: 24, minHeight: 0 }}>
          {/* Left: activity + categories */}
          <div style={{ flex: "1 1 55%", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Daily bars */}
            {data.dailyActivity.length > 0 && (
              <div>
                <Label style={{ marginBottom: 8 }}>DAILY ACTIVITY</Label>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: barMaxH + 16 }}>
                  {data.dailyActivity.slice(-14).map((d, i) => {
                    const h = Math.max(3, Math.round((d.minutes / maxMin) * barMaxH));
                    const day = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" });
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
                        <div style={{ width: "100%", maxWidth: 28, height: h, background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.5) 100%)`, borderRadius: "3px 3px 0 0" }} />
                        <span style={{ fontSize: isPortrait ? "0.5em" : "0.4em", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category bars */}
            {data.categoryBreakdown.slice(0, isPortrait ? 5 : 4).length > 0 && (
              <div>
                <Label style={{ marginBottom: 8 }}>TOP SKILLS</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {data.categoryBreakdown.slice(0, isPortrait ? 5 : 4).map((cat, i) => {
                    const max = data.categoryBreakdown[0]?.minutes || 1;
                    const pct = Math.round((cat.minutes / max) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: isPortrait ? "0.72em" : "0.58em", marginBottom: 3 }}>
                          <span style={{ color: "rgba(255,255,255,0.75)", textTransform: "capitalize" }}>{cat.category.replace(/-/g, " ")}</span>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{cat.minutes}m</span>
                        </div>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[cat.category] || ORANGE, borderRadius: 3 }} />
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
                <Label style={{ marginBottom: 8 }}>SHOT CHART</Label>
                <ShotChartSVG shotData={data.shotData} w={isPortrait ? 260 : 200} h={isPortrait ? 240 : 185} />
              </>
            ) : data.topDrills.length > 0 ? (
              <>
                <Label style={{ marginBottom: 8 }}>TOP DRILLS</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {data.topDrills.slice(0, 5).map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.035)", borderRadius: 7 }}>
                      <span style={{ color: "rgba(249,115,22,0.6)", fontSize: isPortrait ? "0.8em" : "0.65em", fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                      <span style={{ flex: 1, fontSize: isPortrait ? "0.82em" : "0.66em", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      <span style={{ color: ORANGE, fontSize: isPortrait ? "0.78em" : "0.62em", fontWeight: 700, flexShrink: 0 }}>{d.count}×</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginTop: 14, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontWeight: 900, fontSize: isPortrait ? "1em" : "0.8em", letterSpacing: "0.2em", color: "rgba(249,115,22,0.4)" }}>PLAYR1</span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: isPortrait ? "0.65em" : "0.52em" }}>playr1.app</span>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Season Stats Card ────────────────────────────────────────────────────────

interface SeasonData {
  seasonName: string; seasonYear: string; teamName?: string | null;
  playerName: string; displayName?: string | null; jerseyNumber?: number | null;
  gamesPlayed: number; record: string;
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
  fgPct: number; threePct: number; ftPct: number;
}

function SeasonStatsCard({ data, platform }: { data: SeasonData; platform: Platform }) {
  const cfg = PLATFORMS.find(p => p.id === platform)!;
  const s = cfg.scale;
  const isPortrait = platform === "tiktok";
  const W = cfg.w; const H = cfg.h;
  const pad = isPortrait ? 60 : 44;
  const name = data.displayName || data.playerName || "Player";

  const mainStats = [
    { val: data.ppg, lbl: "PPG" },
    { val: data.rpg, lbl: "RPG" },
    { val: data.apg, lbl: "APG" },
    { val: data.spg, lbl: "SPG" },
    { val: data.bpg, lbl: "BPG" },
  ];
  const shootingStats = [
    { val: `${data.fgPct}%`, lbl: "FG%" },
    { val: `${data.threePct}%`, lbl: "3PT%" },
    { val: `${data.ftPct}%`, lbl: "FT%" },
  ];

  return (
    <div style={{ width: W * s, height: H * s, overflow: "hidden", flexShrink: 0, position: "relative" }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
      <div data-share-card style={{ ...cardStyle(W, H), padding: `${pad}px ${pad}px`, justifyContent: "space-between" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: `linear-gradient(180deg, ${ORANGE} 0%, rgba(249,115,22,0.3) 100%)` }} />

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: isPortrait ? 44 : 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {data.jerseyNumber != null && (
                <div style={{ background: ORANGE, borderRadius: 6, padding: isPortrait ? "8px 18px" : "6px 16px", fontWeight: 900, fontSize: isPortrait ? "1.8em" : "1.4em", letterSpacing: "0.02em", lineHeight: 1 }}>
                  #{data.jerseyNumber}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: isPortrait ? "2em" : "1.6em", lineHeight: 1.1, letterSpacing: "-0.01em" }}>{name}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: isPortrait ? "0.9em" : "0.72em", marginTop: 2 }}>
                  {[data.teamName, data.seasonName, data.seasonYear].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: isPortrait ? "2em" : "1.6em", fontWeight: 800, color: ORANGE, lineHeight: 1 }}>{data.record}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: isPortrait ? "0.7em" : "0.56em", marginTop: 4, letterSpacing: "0.06em" }}>{data.gamesPlayed} GAMES PLAYED</div>
            </div>
          </div>

          {/* Main stats */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${mainStats.length}, 1fr)`, gap: 8, textAlign: "center", marginBottom: isPortrait ? 36 : 22 }}>
            {mainStats.map(item => (
              <div key={item.lbl} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: isPortrait ? "20px 8px" : "14px 8px" }}>
                <div style={{ fontSize: isPortrait ? "2.6em" : "2.1em", fontWeight: 800, color: ORANGE, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{item.val}</div>
                <div style={{ fontSize: isPortrait ? "0.6em" : "0.5em", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", fontWeight: 600, marginTop: 5 }}>{item.lbl}</div>
              </div>
            ))}
          </div>

          {/* Shooting splits */}
          <div>
            <Label style={{ marginBottom: 10 }}>SHOOTING SPLITS</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
              {shootingStats.map(item => (
                <div key={item.lbl} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(249,115,22,0.15)`, borderRadius: 10, padding: isPortrait ? "18px 8px" : "12px 8px" }}>
                  <div style={{ fontSize: isPortrait ? "2.2em" : "1.8em", fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.02em" }}>{item.val}</div>
                  <div style={{ fontSize: isPortrait ? "0.6em" : "0.5em", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", fontWeight: 600, marginTop: 4 }}>{item.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${BORDER}`, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: ORANGE, borderRadius: 4, padding: "4px 10px", fontWeight: 900, fontSize: isPortrait ? "0.85em" : "0.68em", letterSpacing: "0.05em", lineHeight: 1 }}>PLAYR1</div>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: isPortrait ? "0.65em" : "0.52em" }}>SEASON STATS</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: isPortrait ? "0.65em" : "0.52em" }}>playr1.app</span>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Share Helpers ────────────────────────────────────────────────────────────

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

function getShareText(type: CardType, data: WorkoutData | PeriodData | SeasonData | undefined, platform: Platform): string {
  const appUrl = "https://playr1basketball.replit.app";
  if (!data) return `Training with PLAYR1 🏀\n${appUrl}`;
  if (type === "workout") {
    const d = data as WorkoutData;
    return `🏀 WORKOUT RECAP — ${new Date(d.date).toLocaleDateString()}\n${d.displayName || d.playerName}\n\n✅ ${d.drillCount} Drills  ⏱️ ${d.totalDuration} min${d.shootingPct != null ? `  🎯 ${d.shootingPct}%` : ""}\n\n${d.drills.slice(0, 4).map(dr => `• ${dr.title}`).join("\n")}\n\nLog your training on PLAYR1 👇\n${appUrl}\n\n#PLAYR1 #Basketball #HoopLife #Training`;
  }
  if (type === "season") {
    const d = data as SeasonData;
    return `🏀 SEASON STATS — ${d.seasonName} ${d.seasonYear}\n${d.displayName || d.playerName}${d.jerseyNumber ? ` #${d.jerseyNumber}` : ""}\n\nPPG: ${d.ppg}  RPG: ${d.rpg}  APG: ${d.apg}  SPG: ${d.spg}\nFG: ${d.fgPct}%  3PT: ${d.threePct}%  FT: ${d.ftPct}%\nRecord: ${d.record} (${d.gamesPlayed} GP)\n\nTrack your season on PLAYR1 👇\n${appUrl}\n\n#PLAYR1 #Basketball #SeasonStats`;
  }
  const d = data as PeriodData;
  return `🏀 ${PERIOD_LABEL[d.period] || d.period.toUpperCase()} TRAINING SUMMARY\n${d.displayName || d.playerName}\n\n📊 ${d.totalSessions} Sessions  ${d.totalDrills} Drills  ${d.totalDuration} Minutes${d.shootingPct != null ? `  🎯 ${d.shootingPct}%` : ""}\n\nTrack your grind on PLAYR1 👇\n${appUrl}\n\n#PLAYR1 #Basketball #HoopLife`;
}

async function shareToSocial(
  platform: Platform,
  canvasEl: HTMLCanvasElement,
  text: string,
  toast: ReturnType<typeof useToast>["toast"],
) {
  const appUrl = "https://playr1basketball.replit.app";
  const twitterText = encodeURIComponent(text.split("\n").slice(0, 3).join("\n"));
  const fbUrl = encodeURIComponent(appUrl);

  if (platform === "twitter") {
    window.open(`https://twitter.com/intent/tweet?text=${twitterText}`, "_blank");
    return;
  }
  if (platform === "facebook") {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${fbUrl}&quote=${encodeURIComponent(text.slice(0, 200))}`, "_blank");
    return;
  }
  if (platform === "youtube") {
    window.open("https://studio.youtube.com", "_blank");
    toast({ title: "YouTube Studio opened", description: "Download your image first, then upload to YouTube." });
    return;
  }

  // Instagram + TikTok → use Web Share API with image file if available
  if (navigator.share) {
    try {
      canvasEl.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `playr1-${platform}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "PLAYR1", text });
        } else {
          await navigator.share({ title: "PLAYR1", text, url: appUrl });
        }
      }, "image/png");
      return;
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast({ title: "Sharing cancelled", description: "Download the image and share manually." });
      }
      return;
    }
  }

  // Fallback for unsupported — download
  const link = document.createElement("a");
  link.download = `playr1-${platform}.png`;
  link.href = canvasEl.toDataURL("image/png");
  link.click();
  toast({ title: "Image saved", description: `Open ${platform === "instagram" ? "Instagram" : "TikTok"} and upload from your gallery.` });
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
  const [isBusy, setIsBusy] = useState(false);

  const initialTab: CardType = defaultTab || (workoutSessionId ? "workout" : seasonId ? "season" : "week");
  const [activeTab, setActiveTab] = useState<CardType>(initialTab);

  const { data: workoutData, isLoading: lW } = useQuery<WorkoutData>({
    queryKey: ["/api/share/workout-session", workoutSessionId],
    queryFn: async () => (await apiRequest("GET", `/api/share/workout-session/${workoutSessionId}`)).json(),
    enabled: open && !!workoutSessionId && activeTab === "workout",
  });
  const { data: weekData, isLoading: lWk } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "week"],
    queryFn: async () => (await apiRequest("GET", "/api/share/training-summary?period=week")).json(),
    enabled: open && activeTab === "week",
  });
  const { data: monthData, isLoading: lMo } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "month"],
    queryFn: async () => (await apiRequest("GET", "/api/share/training-summary?period=month")).json(),
    enabled: open && activeTab === "month",
  });
  const { data: yearData, isLoading: lYr } = useQuery<PeriodData>({
    queryKey: ["/api/share/training-summary", "year"],
    queryFn: async () => (await apiRequest("GET", "/api/share/training-summary?period=year")).json(),
    enabled: open && activeTab === "year",
  });
  const { data: seasonData, isLoading: lSn } = useQuery<SeasonData>({
    queryKey: ["/api/share/season-stats", seasonId],
    queryFn: async () => (await apiRequest("GET", `/api/share/season-stats/${seasonId}`)).json(),
    enabled: open && !!seasonId && activeTab === "season",
  });

  const currentData: WorkoutData | PeriodData | SeasonData | undefined =
    activeTab === "workout" ? workoutData :
    activeTab === "week" ? weekData :
    activeTab === "month" ? monthData :
    activeTab === "year" ? yearData :
    seasonData;

  const isLoading = (activeTab === "workout" && lW) || (activeTab === "week" && lWk) ||
    (activeTab === "month" && lMo) || (activeTab === "year" && lYr) || (activeTab === "season" && lSn);

  const getCanvas = async () => {
    const canvas = await captureCard(cardRef, platform);
    if (!canvas) { toast({ title: "Could not capture card", variant: "destructive" }); return null; }
    return canvas;
  };

  const handleDownload = async () => {
    setIsBusy(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `playr1-${activeTab}-${platform}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Image saved!" });
    } finally { setIsBusy(false); }
  };

  const handleShare = async (p: Platform) => {
    setIsBusy(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const text = getShareText(activeTab, currentData, p);
      await shareToSocial(p, canvas, text, toast);
    } finally { setIsBusy(false); }
  };

  const handleCopyCaption = () => {
    const text = getShareText(activeTab, currentData, platform);
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Caption copied!" }),
      () => toast({ title: "Failed to copy", variant: "destructive" }),
    );
  };

  const tabs: Array<{ value: CardType; label: string }> = [
    ...(workoutSessionId ? [{ value: "workout" as CardType, label: "Workout" }] : []),
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
    ...(seasonId ? [{ value: "season" as CardType, label: "Season" }] : []),
  ];

  const cfg = PLATFORMS.find(p => p.id === platform)!;

  const PlatformIcon = ({ p }: { p: Platform }) => {
    if (p === "twitter") return <Twitter className="w-3.5 h-3.5" />;
    if (p === "instagram") return <Instagram className="w-3.5 h-3.5" />;
    if (p === "facebook") return <Facebook className="w-3.5 h-3.5" />;
    if (p === "youtube") return <Youtube className="w-3.5 h-3.5" />;
    return <span className="text-[10px] font-black">TT</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="dialog-workout-share">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Share Your Training
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as CardType)}>
          <TabsList className="w-full" data-testid="tabs-share-type">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs" data-testid={`tab-share-${t.value}`}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-3 space-y-3">
              {/* Format selector */}
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-colors ${platform === p.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    data-testid={`button-platform-${p.id}`}
                  >
                    <PlatformIcon p={p.id} />
                    <span>{p.label}</span>
                    <span className="text-[10px] opacity-60 hidden sm:inline">({p.w}×{p.h})</span>
                  </button>
                ))}
              </div>

              {/* Card preview */}
              <div className="flex justify-center bg-card rounded-xl p-4 items-center border border-border overflow-hidden" style={{ minHeight: "240px" }}>
                {isLoading ? (
                  <Skeleton className="w-full h-52 rounded-lg" />
                ) : tab.value === "workout" && workoutData ? (
                  <div ref={cardRef}><WorkoutSessionCard data={workoutData} platform={platform} /></div>
                ) : tab.value === "week" && weekData ? (
                  <div ref={cardRef}><TrainingPeriodCard data={weekData} platform={platform} /></div>
                ) : tab.value === "month" && monthData ? (
                  <div ref={cardRef}><TrainingPeriodCard data={monthData} platform={platform} /></div>
                ) : tab.value === "year" && yearData ? (
                  <div ref={cardRef}><TrainingPeriodCard data={yearData} platform={platform} /></div>
                ) : tab.value === "season" && seasonData ? (
                  <div ref={cardRef}><SeasonStatsCard data={seasonData} platform={platform} /></div>
                ) : !isLoading ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    {tab.value === "workout" && !workoutSessionId ? "No workout session selected." : "No data available for this period yet."}
                  </p>
                ) : null}
              </div>

              {/* Share buttons */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Share directly to</p>
                <div className="grid grid-cols-5 gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleShare(p.id)}
                      disabled={isBusy || isLoading || !currentData}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors disabled:opacity-50 text-xs font-medium"
                      data-testid={`button-share-to-${p.id}`}
                    >
                      <PlatformIcon p={p.id} />
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">{p.label.split(" /")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
                <Badge variant="outline" className="text-xs text-muted-foreground mr-auto">
                  {cfg.label} · {cfg.w}×{cfg.h}px
                </Badge>
                <Button variant="outline" size="sm" onClick={handleCopyCaption} className="gap-1.5 text-xs" data-testid="button-copy-caption">
                  <Copy className="w-3.5 h-3.5" />
                  Copy Caption
                </Button>
                <Button size="sm" onClick={handleDownload} disabled={isBusy || isLoading || !currentData} className="gap-1.5 text-xs" data-testid="button-download-share">
                  <Download className="w-3.5 h-3.5" />
                  {isBusy ? "Saving..." : "Download"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
