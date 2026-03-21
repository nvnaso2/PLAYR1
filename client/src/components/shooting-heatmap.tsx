import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShotLocationDB } from "@shared/schema";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

type ShotData = {
  location: string;
  made: number;
  attempted?: number;
  missed?: number;
};

type ShootingHeatmapProps = {
  shotData: ShotData[];
  title?: string;
  className?: string;
};

// ── Zone polygon definitions ─────────────────────────────────────────────────
// viewBox 0 0 500 470 | basket cy=405 | baseline y=435 | FT line y=245
const COURT_ZONES: Record<string, {
  points: { x: number; y: number }[];
  label: string;
  center: { x: number; y: number };
}> = {
  "restricted-area": {
    // Post zone: straight-top rectangle, center lane from baseline up to floater bottom (y=340)
    points: [
      { x: 210, y: 435 }, { x: 290, y: 435 },
      { x: 290, y: 340 }, { x: 210, y: 340 }
    ],
    label: "Post",
    // Text anchor placed above the basket (y=405) so labels stay legible
    center: { x: 250, y: 358 }
  },
  "paint-left": {
    // Left paint column, top aligned with post/floater boundary at y=340
    points: [
      { x: 170, y: 435 }, { x: 210, y: 435 },
      { x: 210, y: 340 }, { x: 170, y: 340 }
    ],
    label: "Paint L",
    center: { x: 190, y: 390 }
  },
  "paint-right": {
    // Right paint column, top aligned with post/floater boundary at y=340
    points: [
      { x: 290, y: 435 }, { x: 330, y: 435 },
      { x: 330, y: 340 }, { x: 290, y: 340 }
    ],
    label: "Paint R",
    center: { x: 310, y: 390 }
  },
  "floater": {
    // Full paint-width zone: FT line (y=245) to y=340 (flat bottom), x=170-330.
    // Covers the previously blank space on both sides of the narrow zone.
    points: [
      { x: 170, y: 245 }, { x: 330, y: 245 },
      { x: 330, y: 340 }, { x: 170, y: 340 }
    ],
    label: "Floater",
    center: { x: 250, y: 293 }
  },
  "free-throw": {
    // Dome (semicircle) tracing the FT circle arc from (170,245) up to (250,165) and back.
    // FT circle: center (250,245) radius 80. Corner gaps covered by extended elbow zones below.
    points: [
      { x: 170, y: 245 },
      { x: 171, y: 230 }, { x: 178, y: 210 }, { x: 192, y: 190 },
      { x: 211, y: 175 }, { x: 250, y: 165 },
      { x: 289, y: 175 }, { x: 308, y: 190 }, { x: 322, y: 210 },
      { x: 329, y: 230 }, { x: 330, y: 245 }
    ],
    label: "Free Throw",
    center: { x: 250, y: 208 }
  },
  "mid-range-left": {
    // Full rectangle from 3PT straight line (x=30) to paint (x=170), baseline to arc corner (y=285)
    points: [
      { x: 30, y: 435 }, { x: 170, y: 435 },
      { x: 170, y: 285 }, { x: 30, y: 285 }
    ],
    label: "Mid Left",
    center: { x: 100, y: 365 }
  },
  "mid-range-right": {
    // Full rectangle from paint (x=330) to 3PT straight line (x=470), baseline to arc corner (y=285)
    points: [
      { x: 330, y: 435 }, { x: 470, y: 435 },
      { x: 470, y: 285 }, { x: 330, y: 285 }
    ],
    label: "Mid Right",
    center: { x: 400, y: 365 }
  },
  "elbow-left": {
    // Left mid-range: inner boundary extends down to FT line (y=245) to fill the key corner,
    // then up to where the FT circle meets the paint (y=165).
    points: [
      { x: 30, y: 285 }, { x: 170, y: 285 },
      { x: 170, y: 245 }, { x: 170, y: 165 }, { x: 138, y: 102 },
      { x: 109, y: 119 }, { x: 85, y: 139 },
      { x: 65, y: 162 }, { x: 50, y: 188 },
      { x: 39, y: 217 }, { x: 32, y: 250 }
    ],
    label: "Elbow L",
    center: { x: 108, y: 215 }
  },
  "elbow-right": {
    // Right mid-range: inner boundary extends down to FT line (y=245) to fill the key corner,
    // then up to where the FT circle meets the paint (y=165).
    points: [
      { x: 330, y: 285 }, { x: 470, y: 285 },
      { x: 468, y: 250 }, { x: 461, y: 217 },
      { x: 450, y: 188 }, { x: 435, y: 162 },
      { x: 415, y: 139 }, { x: 391, y: 119 },
      { x: 362, y: 102 }, { x: 330, y: 165 }, { x: 330, y: 245 }
    ],
    label: "Elbow R",
    center: { x: 392, y: 215 }
  },
  "corner-left": {
    points: [
      { x: 5, y: 435 }, { x: 30, y: 435 },
      { x: 30, y: 285 }, { x: 5, y: 285 }
    ],
    label: "Corner L",
    center: { x: 17, y: 360 }
  },
  "corner-right": {
    points: [
      { x: 470, y: 435 }, { x: 495, y: 435 },
      { x: 495, y: 285 }, { x: 470, y: 285 }
    ],
    label: "Corner R",
    center: { x: 483, y: 360 }
  },
  // Wing left: above the arc on the left side.
  // Lower boundary follows the 3-pt arc using the same dense sample points as elbow-left
  // so the two polygons tile flush with no visible gap along the arc.
  "wing-left": {
    points: [
      { x: 5, y: 285 }, { x: 30, y: 285 },
      { x: 32, y: 250 }, { x: 39, y: 217 },
      { x: 50, y: 188 }, { x: 65, y: 162 },
      { x: 85, y: 139 }, { x: 109, y: 119 },
      { x: 138, y: 102 },
      { x: 138, y: 5 }, { x: 5, y: 5 }
    ],
    label: "Wing L",
    center: { x: 55, y: 145 }
  },
  // Wing right: symmetric mirror of wing-left, same dense arc sample points.
  "wing-right": {
    points: [
      { x: 362, y: 102 }, { x: 391, y: 119 },
      { x: 415, y: 139 }, { x: 435, y: 162 },
      { x: 450, y: 188 }, { x: 461, y: 217 },
      { x: 468, y: 250 }, { x: 470, y: 285 },
      { x: 495, y: 285 },
      { x: 495, y: 5 }, { x: 362, y: 5 }
    ],
    label: "Wing R",
    center: { x: 445, y: 145 }
  },
  // Top of key mid-range: inside the 3-pt arc at top center, above the FT circle.
  // Bounded above by the arc (138,102)→(250,70)→(362,102) and below by FT circle top (y=165).
  "top-key-mid": {
    points: [
      { x: 138, y: 102 }, { x: 171, y: 88 },
      { x: 250, y: 70 }, { x: 329, y: 88 }, { x: 362, y: 102 },
      { x: 330, y: 165 }, { x: 170, y: 165 }
    ],
    label: "Top Key 2PT",
    center: { x: 250, y: 120 }
  },
  // Top of key: above-the-break 3-pt zone.
  // Lower boundary follows the arc from (138,102) across the peak (250,70) to (362,102).
  "top-of-key": {
    points: [
      { x: 138, y: 5 }, { x: 362, y: 5 },
      { x: 362, y: 102 }, { x: 329, y: 88 },
      { x: 250, y: 70 },
      { x: 171, y: 88 }, { x: 138, y: 102 }
    ],
    label: "Top of Key",
    center: { x: 250, y: 55 }
  },
  "deep-left": {
    points: [
      { x: 5, y: 100 }, { x: 120, y: 100 },
      { x: 100, y: 5 }, { x: 5, y: 5 }
    ],
    label: "Deep L",
    center: { x: 58, y: 55 }
  },
  "deep-center": {
    points: [
      { x: 100, y: 5 }, { x: 120, y: 100 },
      { x: 250, y: 70 }, { x: 380, y: 100 },
      { x: 400, y: 5 }
    ],
    label: "Deep C",
    center: { x: 250, y: 45 }
  },
  "deep-right": {
    points: [
      { x: 380, y: 100 }, { x: 495, y: 100 },
      { x: 495, y: 5 }, { x: 400, y: 5 }
    ],
    label: "Deep R",
    center: { x: 440, y: 55 }
  }
};

// Map shot location names → zone keys
const LOCATION_TO_ZONE: Record<string, string> = {
  // Standard locations
  "free-throw":             "free-throw",
  "corner-left":            "corner-left",
  "corner-right":           "corner-right",
  "top-of-key":             "top-of-key",
  "wing-left":              "wing-left",
  "wing-right":             "wing-right",
  "1st-hash-left":          "paint-left",
  "1st-hash-right":         "paint-right",
  "2nd-hash-left":          "elbow-left",
  "2nd-hash-right":         "elbow-right",
  "3rd-hash-left":          "elbow-left",
  "3rd-hash-right":         "elbow-right",
  "block-left":             "paint-left",
  "block-right":            "paint-right",
  "mid-range-left":         "mid-range-left",
  "mid-range-right":        "mid-range-right",
  // DB slugs added to picklists
  "floaters":               "floater",
  "post-shots":             "restricted-area",
  "left-corner-mid-range":  "mid-range-left",
  "right-corner-mid-range": "mid-range-right",
  "wing-left-mid-range":    "elbow-left",
  "wing-right-mid-range":   "elbow-right",
  "top-of-key-3-point":     "top-key-mid",
  "form-shot-left":         "paint-left",
  "form-shots-right":       "paint-right",
  "form-shots-front":       "floater",
  // Layups — left hand attacks left side, right hand attacks right side
  "left-hand-layup":        "paint-left",
  "right-hand-layup":       "paint-right",
};

// ── Color scale matching the PLAYR1 reference heatmap ───────────────────────
// Dark maroon (cold/poor) → orange → olive → bright green (hot/excellent)
function getHeatColor(pct: number): string {
  if (pct <= 30) return "#6B0E0E"; // dark maroon
  if (pct <= 38) return "#9B1F0A"; // dark red
  if (pct <= 45) return "#C03410"; // red-orange
  if (pct <= 52) return "#C86020"; // burnt orange
  if (pct <= 58) return "#9B7820"; // dark olive/khaki
  if (pct <= 65) return "#6B7A20"; // olive green
  if (pct <= 72) return "#3D7A2A"; // medium green
  if (pct <= 80) return "#2E8E2E"; // green
  if (pct <= 88) return "#1AA81A"; // bright green
  return "#0DC80D";               // very bright green (elite)
}

// Zone opacity — ramp up from 0.72 to 0.90 with volume
function zoneOpacity(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0.78;
  return 0.72 + 0.18 * Math.sqrt(total / maxTotal);
}

function toSvgPoints(pts: { x: number; y: number }[]): string {
  return pts.map(p => `${p.x},${p.y}`).join(" ");
}

// ── Court SVG (black background, white lines) ────────────────────────────────
function HeatmapCourtSVG({
  zoneData,
}: {
  zoneData: Record<string, { made: number; missed: number; percentage: number }>;
}) {
  const maxTotal = useMemo(
    () => Math.max(1, ...Object.values(zoneData).map(d => d.made + d.missed)),
    [zoneData]
  );

  return (
    <svg
      viewBox="0 0 500 470"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* ── Black court background (stops at baseline — logo strip below is transparent) ── */}
      <rect x="0" y="0" width="500" height="435" fill="#000000" />

      {/* ── PLAYR1 logo in the strip below the baseline ── */}
      <defs>
        <clipPath id="heatmapLogoClip">
          <rect x="0" y="435" width="500" height="35" />
        </clipPath>
      </defs>
      {/* Render the square logo large, clipped to the 35px strip — shows the centred text portion */}
      <image
        href={playr1Logo}
        x="175" y="378"
        width="150" height="150"
        clipPath="url(#heatmapLogoClip)"
        preserveAspectRatio="xMidYMid meet"
      />


      {/* ── Base zone fills — dim dark tint so all zones are always visible ── */}
      {Object.entries(COURT_ZONES).map(([zoneName, zone]) => (
        <polygon
          key={`base-${zoneName}`}
          points={toSvgPoints(zone.points)}
          fill="#1a1a2e"
          opacity={0.85}
          stroke="white"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />
      ))}

      {/* ── Coloured zone fills (drawn BEFORE court lines) ── */}
      {Object.entries(COURT_ZONES).map(([zoneName, zone]) => {
        const data = zoneData[zoneName];
        if (!data || data.made + data.missed === 0) return null;

        const total   = data.made + data.missed;
        const color   = getHeatColor(data.percentage);
        const alpha   = zoneOpacity(total, maxTotal);
        const cx      = zone.center.x;
        const cy      = zone.center.y;

        const pts  = zone.points;
        const zoneW = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x));
        const zoneH = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
        const showPct   = zoneW >= 28 && zoneH >= 28;
        const showCount = zoneW >= 45 && zoneH >= 50;

        return (
          <g key={zoneName}>
            <polygon
              points={toSvgPoints(zone.points)}
              fill={color}
              opacity={alpha}
              stroke="white"
              strokeWidth="1"
              strokeOpacity="0.5"
            >
              <title>{`${zone.label}: ${data.made}/${total} (${data.percentage}%)`}</title>
            </polygon>

            {showPct && (
              <text
                x={cx}
                y={cy + (showCount ? -6 : 5)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={zoneW < 55 ? "9" : "12"}
                fontWeight="700"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {data.percentage}%
              </text>
            )}

            {showCount && (
              <text
                x={cx}
                y={cy + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize="8"
                fontWeight="500"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="2"
                paintOrder="stroke"
              >
                {data.made}/{total}
              </text>
            )}
          </g>
        );
      })}

      {/* ── White court lines (drawn ON TOP of zone fills) ── */}
      <g>
        {/* Court border */}
        <rect x="5" y="5" width="490" height="460" fill="none" stroke="white" strokeWidth="2.5" />

        {/* Baseline */}
        <line x1="5" y1="435" x2="495" y2="435" stroke="white" strokeWidth="2" />

        {/* Three-point arc */}
        <path
          d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435"
          fill="none" stroke="white" strokeWidth="2"
        />

        {/* Key / paint rectangle */}
        <rect x="170" y="245" width="160" height="190" fill="none" stroke="white" strokeWidth="2" />

        {/* Lane blocks (filled rectangles — court branding) */}
        <rect x="151" y="311" width="19" height="8" fill="white" />
        <rect x="330" y="311" width="19" height="8" fill="white" />
        <rect x="151" y="343" width="19" height="8" fill="white" />
        <rect x="330" y="343" width="19" height="8" fill="white" />
        <rect x="151" y="373" width="19" height="8" fill="white" />
        <rect x="330" y="373" width="19" height="8" fill="white" />

        {/* Hash marks on sides of key (at block edges) */}
        <line x1="170" y1="320" x2="151" y2="320" stroke="white" strokeWidth="1.5" />
        <line x1="330" y1="320" x2="349" y2="320" stroke="white" strokeWidth="1.5" />
        <line x1="170" y1="350" x2="151" y2="350" stroke="white" strokeWidth="1.5" />
        <line x1="330" y1="350" x2="349" y2="350" stroke="white" strokeWidth="1.5" />
        <line x1="170" y1="380" x2="151" y2="380" stroke="white" strokeWidth="1.5" />
        <line x1="330" y1="380" x2="349" y2="380" stroke="white" strokeWidth="1.5" />

        {/* Free-throw circle (solid top arc) */}
        <path
          d="M 170 245 A 80 80 0 0 1 330 245"
          fill="none" stroke="white" strokeWidth="2"
        />

        {/* Free-throw circle (dashed bottom arc) */}
        <path
          d="M 330 245 A 80 80 0 0 1 170 245"
          fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="8,6"
        />

        {/* Restricted area arc */}
        <path
          d="M 210 435 A 40 40 0 0 1 290 435"
          fill="none" stroke="white" strokeWidth="1.5"
        />

        {/* Backboard */}
        <rect x="215" y="418" width="70" height="5" fill="white" />

        {/* Rim — orange */}
        <circle cx="250" cy="405" r="10" fill="none" stroke="#E55039" strokeWidth="2.5" />

        {/* Top mid-court line */}
        <line x1="5" y1="5" x2="495" y2="5" stroke="white" strokeWidth="2" />
      </g>

    </svg>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
export function ShootingHeatmap({
  shotData,
  title = "Shooting Heatmap",
  className = "",
}: ShootingHeatmapProps) {
  const { data: shotLocationOptions } = useQuery<ShotLocationDB[]>({
    queryKey: ['/api/shot-locations'],
  });

  // Build a map from SVG zone name → display label(s) using DB slug labels.
  // Multiple DB slugs can map to the same SVG zone (e.g. block-left + 1st-hash-left → paint-left),
  // so we join their labels. Falls back to hardcoded COURT_ZONES label if no DB match.
  const zoneLabelMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (shotLocationOptions || []).forEach(loc => {
      const zoneName = LOCATION_TO_ZONE[loc.slug] || loc.slug;
      if (!map[zoneName]) map[zoneName] = [];
      if (!map[zoneName].includes(loc.label)) map[zoneName].push(loc.label);
    });
    return map;
  }, [shotLocationOptions]);

  const zoneData = useMemo(() => {
    const result: Record<string, { made: number; missed: number; percentage: number }> = {};

    Object.keys(COURT_ZONES).forEach(zone => {
      result[zone] = { made: 0, missed: 0, percentage: 0 };
    });

    shotData.forEach(shot => {
      const zoneName = LOCATION_TO_ZONE[shot.location] || shot.location;
      if (result[zoneName]) {
        result[zoneName].made += shot.made;
        const missed =
          shot.missed !== undefined
            ? shot.missed
            : shot.attempted !== undefined
            ? Math.max(0, shot.attempted - shot.made)
            : 0;
        result[zoneName].missed += missed;
      }
    });

    Object.keys(result).forEach(zone => {
      const total = result[zone].made + result[zone].missed;
      result[zone].percentage = total > 0 ? Math.round((result[zone].made / total) * 100) : 0;
    });

    return result;
  }, [shotData]);

  const totals = useMemo(() => {
    let made = 0, attempted = 0;
    Object.values(zoneData).forEach(d => {
      made      += d.made;
      attempted += d.made + d.missed;
    });
    return {
      made,
      attempted,
      percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0,
    };
  }, [zoneData]);

  if (totals.attempted === 0) return null;

  const pct = totals.percentage;
  const pctColor = pct >= 65 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : pct >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <Card className={`bg-black border-zinc-800 ${className}`} data-testid="shooting-heatmap">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg text-white" data-testid="heatmap-title">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm" data-testid="heatmap-overall-stats">
            <span className="text-zinc-400">Overall:</span>
            <span className="font-bold text-white">{totals.made}/{totals.attempted}</span>
            <span className={`font-bold ${pctColor}`}>({pct}%)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {/* Court */}
        <div className="relative w-full aspect-[500/470] rounded-lg overflow-hidden">
          <HeatmapCourtSVG zoneData={zoneData} />
        </div>

        {/* Colour-scale legend */}
        <div className="flex items-center justify-center gap-1 mt-3" data-testid="heatmap-legend">
          <span className="text-xs text-zinc-500 mr-1">Cold</span>
          <div className="flex h-3 rounded overflow-hidden" data-testid="heatmap-color-scale">
            <div className="w-5" style={{ background: "#6B0E0E" }} title="≤30%" />
            <div className="w-5" style={{ background: "#9B1F0A" }} title="31–38%" />
            <div className="w-5" style={{ background: "#C03410" }} title="39–45%" />
            <div className="w-5" style={{ background: "#C86020" }} title="46–52%" />
            <div className="w-5" style={{ background: "#9B7820" }} title="53–58%" />
            <div className="w-5" style={{ background: "#6B7A20" }} title="59–65%" />
            <div className="w-5" style={{ background: "#3D7A2A" }} title="66–72%" />
            <div className="w-5" style={{ background: "#2E8E2E" }} title="73–80%" />
            <div className="w-5" style={{ background: "#1AA81A" }} title="81–88%" />
            <div className="w-5" style={{ background: "#0DC80D" }} title=">88%" />
          </div>
          <span className="text-xs text-zinc-500 ml-1">Hot</span>
        </div>

        {/* Zone breakdown */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
          {Object.entries(zoneData)
            .filter(([, d]) => d.made + d.missed > 0)
            .sort((a, b) => b[1].percentage - a[1].percentage)
            .map(([zoneName, data]) => {
              const zone = COURT_ZONES[zoneName];
              if (!zone) return null;
              const total = data.made + data.missed;
              const color = getHeatColor(data.percentage);
              const label = zoneLabelMap[zoneName]?.join(' / ') || zone.label;
              return (
                <div
                  key={zoneName}
                  className="flex items-center justify-between p-1.5 rounded"
                  style={{ backgroundColor: color + "28", border: `1px solid ${color}44` }}
                  data-testid={`heatmap-zone-${zoneName}`}
                >
                  <span className="text-zinc-300 truncate">{label}</span>
                  <span className="font-semibold ml-1 shrink-0" style={{ color }}>
                    {data.made}/{total} ({data.percentage}%)
                  </span>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

export type { ShotData };
