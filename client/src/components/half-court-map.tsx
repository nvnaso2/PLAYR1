import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChartArea } from "lucide-react";
import type { ShotLocationDB } from "@shared/schema";

type ShotData = {
  location: string;
  made: number;
  attempted: number;
};

type HalfCourtMapProps = {
  shotData: ShotData[];
  title?: string;
  className?: string;
  compact?: boolean;
};

// Court SVG reference (viewBox 0 0 500 470):
//   Baseline y=435, mid-court y=5, basket (250,405)
//   Key rect: x=170–330, y=245–435  (free-throw LINE at y=245)
//   FT circle: center (250,245) radius 80  → top of arc at y=165
//   3-pt arc: corners at x=30/470 y=435, straight x=30 y=285→435
//             bezier Q(30,100) from (30,285)→(250,70) and Q(470,100)→(470,285)
//
// Zone ellipses – each zone is ONE colored ellipse.
// All 3-pt zones must be completely ABOVE the arc (smaller y than arc at that x).
// FT zone is centered AT the FT line (y=245).

type ZoneDef = { cx: number; cy: number; rx: number; ry: number; label: string; is3pt?: boolean };

const ZONE_DEFS: Record<string, ZoneDef> = {
  // ── 3-point zones (outside the arc) ──────────────────────────────
  // Arc peak: y=70 at x=250. At x≈52, arc y≈184. Corners: straight line x=30, y=285–435.

  "top-of-key":   { cx: 250, cy: 40,  rx: 80, ry: 26, label: "Top of Key",    is3pt: true },
  "wing-left":    { cx: 52,  cy: 130, rx: 28, ry: 42, label: "Wing Left",     is3pt: true },
  "wing-right":   { cx: 448, cy: 130, rx: 28, ry: 42, label: "Wing Right",    is3pt: true },
  "corner-left":  { cx: 17,  cy: 375, rx: 12, ry: 52, label: "Corner Left",   is3pt: true },
  "corner-right": { cx: 483, cy: 375, rx: 12, ry: 52, label: "Corner Right",  is3pt: true },

  // ── 2-point zones (inside the arc) ───────────────────────────────
  // FT line at y=245. Key rect x=170–330.
  // Free throw zone is placed ABOVE the FT line (cy=208, top of the FT circle area)

  "free-throw":      { cx: 250, cy: 208, rx: 52, ry: 38, label: "Free Throw"      },
  "elbow-left":      { cx: 168, cy: 247, rx: 26, ry: 16, label: "Elbow Left"      },
  "elbow-right":     { cx: 332, cy: 247, rx: 26, ry: 16, label: "Elbow Right"     },
  "mid-range-left":  { cx: 102, cy: 228, rx: 52, ry: 28, label: "Mid-range Left"  },
  "mid-range-right": { cx: 398, cy: 228, rx: 52, ry: 28, label: "Mid-range Right" },
  "3rd-hash-left":   { cx: 80,  cy: 188, rx: 38, ry: 24, label: "3rd Hash Left"   },
  "3rd-hash-right":  { cx: 420, cy: 188, rx: 38, ry: 24, label: "3rd Hash Right"  },
  "2nd-hash-left":   { cx: 96,  cy: 270, rx: 40, ry: 24, label: "2nd Hash Left"   },
  "2nd-hash-right":  { cx: 404, cy: 270, rx: 40, ry: 24, label: "2nd Hash Right"  },
  "1st-hash-left":   { cx: 126, cy: 325, rx: 42, ry: 24, label: "1st Hash Left"   },
  "1st-hash-right":  { cx: 374, cy: 325, rx: 42, ry: 24, label: "1st Hash Right"  },
  "block-left":      { cx: 163, cy: 382, rx: 30, ry: 20, label: "Block Left"      },
  "block-right":     { cx: 337, cy: 382, rx: 30, ry: 20, label: "Block Right"     },

  // ── DB picklist slugs ──────────────────────────────────────────────
  // Floater zone: between free throw line (y=245) and top of paint (y=320)
  "floaters":               { cx: 250, cy: 283, rx: 60, ry: 30, label: "Floaters"           },
  "form-shots-front":       { cx: 250, cy: 283, rx: 42, ry: 22, label: "Form Shots Front"   },
  // Post / restricted area
  "post-shots":             { cx: 250, cy: 390, rx: 40, ry: 22, label: "Post Shots"         },
  // Short-corner mid-range (inside the lane extended)
  "left-corner-mid-range":  { cx: 102, cy: 340, rx: 44, ry: 24, label: "Short Corner L"    },
  "right-corner-mid-range": { cx: 398, cy: 340, rx: 44, ry: 24, label: "Short Corner R"    },
  // Wing mid-range (elbow extended)
  "wing-left-mid-range":    { cx: 96,  cy: 210, rx: 38, ry: 22, label: "Wing Left Mid"     },
  "wing-right-mid-range":   { cx: 404, cy: 210, rx: 38, ry: 22, label: "Wing Right Mid"    },
  // Top of key 2-pointer: inside the arc at the top center, above the FT circle
  "top-of-key-3-point":     { cx: 250, cy: 120, rx: 68, ry: 28, label: "Top of Key 2PT" },
  // Form shots (block area)
  "form-shot-left":         { cx: 163, cy: 382, rx: 30, ry: 20, label: "Form Shots L"      },
  "form-shots-right":       { cx: 337, cy: 382, rx: 30, ry: 20, label: "Form Shots R"      },
  // Layups — left hand on left side of basket, right hand on right side
  "left-hand-layup":        { cx: 195, cy: 415, rx: 26, ry: 18, label: "Left Layup"        },
  "right-hand-layup":       { cx: 305, cy: 415, rx: 26, ry: 18, label: "Right Layup"       },
};

// Shooting-percentage colour matching PLAYR1 reference heatmap
// Dark maroon (cold/poor) → orange → olive → bright green (hot/excellent)
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

// Opacity scales with volume (more shots = more visible)
function zoneOpacity(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0.78;
  return 0.72 + 0.18 * Math.sqrt(total / maxTotal);
}

function CourtSVG({
  processedData,
}: {
  processedData: Record<string, { made: number; missed: number }>;
}) {
  const maxTotal = useMemo(() => {
    return Math.max(
      1,
      ...Object.values(processedData).map((d) => d.made + d.missed)
    );
  }, [processedData]);

  return (
    <svg viewBox="0 0 500 470" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* ── Black court background ─────────────────── */}
      <rect x="0" y="0" width="500" height="470" fill="#000000" />


      {/* ── Shot zones (drawn BEFORE court lines so lines stay on top) ── */}
      {Object.entries(processedData).map(([location, data]) => {
        const zone = ZONE_DEFS[location];
        if (!zone) return null;

        const total = data.made + data.missed;
        const pct   = total > 0 ? Math.round((data.made / total) * 100) : 0;
        const fill  = zoneColor(pct);
        const alpha = zoneOpacity(total, maxTotal);
        const showText = zone.rx >= 24 && zone.ry >= 16;
        const showPct  = zone.rx >= 24 && zone.ry >= 22;

        return (
          <g key={location}>
            <ellipse
              cx={zone.cx}
              cy={zone.cy}
              rx={zone.rx}
              ry={zone.ry}
              fill={fill}
              opacity={alpha}
              stroke={fill}
              strokeWidth="1.5"
              strokeOpacity="0.4"
            >
              <title>{`${zone.label}: ${data.made}/${total} (${pct}%)`}</title>
            </ellipse>

            {/* Percentage — only if zone is big enough */}
            {showPct && (
              <text
                x={zone.cx}
                y={zone.cy + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={zone.rx < 36 ? "9" : "11"}
                fontWeight="700"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                paintOrder="stroke"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="2.5"
              >
                {pct}%
              </text>
            )}

            {/* Made/total — smaller line below pct */}
            {showText && (
              <text
                x={zone.cx}
                y={zone.cy + (showPct ? 14 : 4)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="8"
                fontWeight="500"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="2"
                paintOrder="stroke"
              >
                {data.made}/{total}
              </text>
            )}
          </g>
        );
      })}

      {/* ── White court lines (drawn ON TOP of zones) ──────────────────── */}

      {/* Border */}
      <rect x="5" y="5" width="490" height="460" fill="none" stroke="white" strokeWidth="2.5" />

      {/* Mid-court / top edge */}
      <line x1="5" y1="5" x2="495" y2="5" stroke="white" strokeWidth="2" />

      {/* Baseline */}
      <line x1="5" y1="435" x2="495" y2="435" stroke="white" strokeWidth="2" />

      {/* Three-point line */}
      <path
        d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />

      {/* Paint / Key */}
      <rect x="170" y="245" width="160" height="190" fill="none" stroke="white" strokeWidth="2" />

      {/* Free-throw circle – top half (solid) */}
      <path d="M 170 245 A 80 80 0 0 1 330 245" fill="none" stroke="white" strokeWidth="2" />

      {/* Free-throw circle – bottom half (dashed) */}
      <path
        d="M 330 245 A 80 80 0 0 1 170 245"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeDasharray="8,6"
      />

      {/* Restricted area arc */}
      <path d="M 210 435 A 40 40 0 0 1 290 435" fill="none" stroke="white" strokeWidth="1.5" />

      {/* Backboard */}
      <rect x="220" y="420" width="60" height="4" fill="white" />

      {/* Rim */}
      <circle cx="250" cy="405" r="9" fill="none" stroke="#E55039" strokeWidth="2.5" />

      {/* Lane blocks (filled rectangles — court branding) */}
      <rect x="151" y="311" width="19" height="8" fill="white" />
      <rect x="330" y="311" width="19" height="8" fill="white" />
      <rect x="151" y="343" width="19" height="8" fill="white" />
      <rect x="330" y="343" width="19" height="8" fill="white" />
      <rect x="151" y="373" width="19" height="8" fill="white" />
      <rect x="330" y="373" width="19" height="8" fill="white" />

      {/* Lane hash marks */}
      <line x1="170" y1="320" x2="151" y2="320" stroke="white" strokeWidth="1.5" />
      <line x1="330" y1="320" x2="349" y2="320" stroke="white" strokeWidth="1.5" />
      <line x1="170" y1="350" x2="151" y2="350" stroke="white" strokeWidth="1.5" />
      <line x1="330" y1="350" x2="349" y2="350" stroke="white" strokeWidth="1.5" />
      <line x1="170" y1="380" x2="151" y2="380" stroke="white" strokeWidth="1.5" />
      <line x1="330" y1="380" x2="349" y2="380" stroke="white" strokeWidth="1.5" />

    </svg>
  );
}

export function HalfCourtMap({
  shotData,
  title = "Shot Chart",
  className = "",
  compact = false,
}: HalfCourtMapProps) {
  const { data: shotLocationOptions } = useQuery<ShotLocationDB[]>({
    queryKey: ['/api/shot-locations'],
  });

  const dbLabels = useMemo(() => {
    const map: Record<string, string> = {};
    (shotLocationOptions || []).forEach(loc => { map[loc.slug] = loc.label; });
    return map;
  }, [shotLocationOptions]);

  const processedData = useMemo(() => {
    const result: Record<string, { made: number; missed: number }> = {};
    shotData.forEach((shot) => {
      if (!result[shot.location]) result[shot.location] = { made: 0, missed: 0 };
      result[shot.location].made   += shot.made;
      result[shot.location].missed += Math.max(0, shot.attempted - shot.made);
    });
    return result;
  }, [shotData]);

  const hasShots = Object.keys(processedData).length > 0;

  const totals = useMemo(() => {
    let made = 0, attempted = 0;
    Object.values(processedData).forEach((d) => {
      made      += d.made;
      attempted += d.made + d.missed;
    });
    return { made, attempted, percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0 };
  }, [processedData]);

  if (!hasShots) return null;

  const pct = totals.percentage;
  const pctColor = pct >= 65 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : pct >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <Card className={`bg-black border-zinc-800 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">Total:</span>
            <span className="font-bold text-white">{totals.made}/{totals.attempted}</span>
            <span className={`font-bold ${pctColor}`}>({totals.percentage}%)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative w-full aspect-[500/470] rounded-lg overflow-hidden">
          <CourtSVG processedData={processedData} />
        </div>

        {/* Colour-scale legend */}
        <div className="flex items-center justify-center gap-1 mt-3">
          <span className="text-xs text-zinc-500 mr-1">Cold</span>
          <div className="flex h-3 rounded overflow-hidden">
            <div className="w-5" style={{ background: "#6B0E0E" }} />
            <div className="w-5" style={{ background: "#9B1F0A" }} />
            <div className="w-5" style={{ background: "#C03410" }} />
            <div className="w-5" style={{ background: "#C86020" }} />
            <div className="w-5" style={{ background: "#9B7820" }} />
            <div className="w-5" style={{ background: "#6B7A20" }} />
            <div className="w-5" style={{ background: "#3D7A2A" }} />
            <div className="w-5" style={{ background: "#2E8E2E" }} />
            <div className="w-5" style={{ background: "#1AA81A" }} />
            <div className="w-5" style={{ background: "#0DC80D" }} />
          </div>
          <span className="text-xs text-zinc-500 ml-1">Hot</span>
        </div>

        {/* Zone breakdown table */}
        {!compact && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {Object.entries(processedData).map(([location, data]) => {
              const zone = ZONE_DEFS[location];
              if (!zone) return null;
              const total = data.made + data.missed;
              const zonePct = total > 0 ? Math.round((data.made / total) * 100) : 0;
              const color   = zoneColor(zonePct);
              const label   = dbLabels[location] || zone.label;
              return (
                <div
                  key={location}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: color + "28", border: `1px solid ${color}44` }}
                  data-testid={`shot-location-stat-${location}`}
                >
                  <span className="text-zinc-300 truncate">{label}</span>
                  <span className="font-medium ml-1 shrink-0" style={{ color }}>
                    {data.made}/{total} ({zonePct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inline shot-chart button that opens the map in a dialog
export function ShotChartButton({
  shotData,
  title = "Shot Chart",
  testId,
}: {
  shotData: ShotData[];
  title?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasShots = shotData.some((s) => s.attempted > 0);
  if (!hasShots) return null;

  const totals = useMemo(() => {
    let made = 0, attempted = 0;
    shotData.forEach((s) => { made += s.made; attempted += s.attempted; });
    return { made, attempted, percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0 };
  }, [shotData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          data-testid={testId || "button-view-shot-chart"}
        >
          <ChartArea className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Shot Chart</span>
          <span
            className={`text-xs ${
              totals.percentage >= 50
                ? "text-green-500"
                : totals.percentage >= 40
                ? "text-amber-500"
                : "text-red-500"
            }`}
          >
            {totals.percentage}%
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <HalfCourtMap shotData={shotData} title="" className="border-0 shadow-none" compact />
      </DialogContent>
    </Dialog>
  );
}

// Keep COURT_LOCATIONS export for backward compat (consumers may import it)
export const COURT_LOCATIONS: Record<string, { x: number; y: number; label: string }> = Object.fromEntries(
  Object.entries(ZONE_DEFS).map(([k, v]) => [k, { x: v.cx, y: v.cy, label: v.label }])
);

export type { ShotData };
