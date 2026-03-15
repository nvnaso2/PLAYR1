import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// Court SVG reference (viewBox 0 0 500 470):
//   Baseline y=435, mid-court y=5, basket (250,405)
//   Key rect: x=170–330, y=245–435  (free-throw LINE at y=245)
//   FT circle: center (250,245) radius 80
//   3-pt arc: corners x=30/470 y=435 → straight x=30 y=285
//             bezier Q(30,100) from (30,285)→(250,70) and Q(470,100)→(470,285)

const COURT_ZONES: Record<string, {
  points: { x: number; y: number }[];
  label: string;
  center: { x: number; y: number };
}> = {
  "restricted-area": {
    points: [
      { x: 210, y: 435 }, { x: 290, y: 435 },
      { x: 290, y: 380 }, { x: 250, y: 360 }, { x: 210, y: 380 }
    ],
    label: "Restricted",
    center: { x: 250, y: 405 }
  },
  "paint-left": {
    points: [
      { x: 170, y: 435 }, { x: 210, y: 435 },
      { x: 210, y: 320 }, { x: 170, y: 320 }
    ],
    label: "Paint L",
    center: { x: 190, y: 378 }
  },
  "paint-right": {
    points: [
      { x: 290, y: 435 }, { x: 330, y: 435 },
      { x: 330, y: 320 }, { x: 290, y: 320 }
    ],
    label: "Paint R",
    center: { x: 310, y: 378 }
  },
  "free-throw": {
    points: [
      { x: 170, y: 320 }, { x: 330, y: 320 },
      { x: 330, y: 245 }, { x: 170, y: 245 }
    ],
    label: "Free Throw",
    center: { x: 250, y: 282 }
  },
  "mid-range-left": {
    points: [
      { x: 30, y: 435 }, { x: 170, y: 435 },
      { x: 170, y: 285 }, { x: 80, y: 285 }
    ],
    label: "Mid Left",
    center: { x: 110, y: 365 }
  },
  "mid-range-right": {
    points: [
      { x: 330, y: 435 }, { x: 470, y: 435 },
      { x: 420, y: 285 }, { x: 330, y: 285 }
    ],
    label: "Mid Right",
    center: { x: 390, y: 365 }
  },
  "elbow-left": {
    points: [
      { x: 80, y: 285 }, { x: 170, y: 285 },
      { x: 170, y: 165 }, { x: 100, y: 180 }
    ],
    label: "Elbow L",
    center: { x: 128, y: 232 }
  },
  "elbow-right": {
    points: [
      { x: 330, y: 285 }, { x: 420, y: 285 },
      { x: 400, y: 180 }, { x: 330, y: 165 }
    ],
    label: "Elbow R",
    center: { x: 370, y: 232 }
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
  "wing-left": {
    points: [
      { x: 5, y: 285 }, { x: 100, y: 180 },
      { x: 120, y: 100 }, { x: 5, y: 100 }
    ],
    label: "Wing L",
    center: { x: 52, y: 190 }
  },
  "wing-right": {
    points: [
      { x: 495, y: 285 }, { x: 400, y: 180 },
      { x: 380, y: 100 }, { x: 495, y: 100 }
    ],
    label: "Wing R",
    center: { x: 448, y: 190 }
  },
  "top-of-key": {
    points: [
      { x: 120, y: 100 }, { x: 170, y: 165 },
      { x: 330, y: 165 }, { x: 380, y: 100 },
      { x: 250, y: 70 }
    ],
    label: "Top of Key",
    center: { x: 250, y: 118 }
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
  "free-throw":      "free-throw",
  "corner-left":     "corner-left",
  "corner-right":    "corner-right",
  "top-of-key":      "top-of-key",
  "wing-left":       "wing-left",
  "wing-right":      "wing-right",
  "1st-hash-left":   "paint-left",
  "1st-hash-right":  "paint-right",
  "2nd-hash-left":   "elbow-left",
  "2nd-hash-right":  "elbow-right",
  "3rd-hash-left":   "elbow-left",
  "3rd-hash-right":  "elbow-right",
  "block-left":      "paint-left",
  "block-right":     "paint-right",
  "mid-range-left":  "mid-range-left",
  "mid-range-right": "mid-range-right",
};

// Cold (blue) → green → hot (red) colour scale by shooting percentage
function getHeatColor(pct: number): string {
  if (pct <= 20) return "#1e40af";
  if (pct <= 30) return "#0284c7";
  if (pct <= 40) return "#0891b2";
  if (pct <= 50) return "#16a34a";
  if (pct <= 60) return "#84cc16";
  if (pct <= 70) return "#eab308";
  if (pct <= 80) return "#f97316";
  return "#dc2626";
}

// Opacity scales with shot volume
function zoneOpacity(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0.55;
  return 0.45 + 0.45 * (total / maxTotal);
}

// Convert polygon points array to SVG "points" attribute string
function toSvgPoints(pts: { x: number; y: number }[]): string {
  return pts.map(p => `${p.x},${p.y}`).join(" ");
}

function HeatmapCourtSVG({
  zoneData,
}: {
  zoneData: Record<string, { made: number; missed: number; percentage: number }>;
}) {
  const maxTotal = useMemo(() => {
    return Math.max(
      1,
      ...Object.values(zoneData).map(d => d.made + d.missed)
    );
  }, [zoneData]);

  return (
    <svg
      viewBox="0 0 500 470"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="hmCourtWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#d4a574" />
          <stop offset="50%" stopColor="#c4956a" />
          <stop offset="100%" stopColor="#d4a574" />
        </linearGradient>
      </defs>

      {/* Court background */}
      <rect x="0" y="0" width="500" height="470" fill="url(#hmCourtWood)" />

      {/* ── Coloured zone fills (drawn BEFORE court lines) ── */}
      {Object.entries(COURT_ZONES).map(([zoneName, zone]) => {
        const data = zoneData[zoneName];
        if (!data || data.made + data.missed === 0) return null;

        const total   = data.made + data.missed;
        const color   = getHeatColor(data.percentage);
        const alpha   = zoneOpacity(total, maxTotal);
        const cx      = zone.center.x;
        const cy      = zone.center.y;

        // Decide how much text to show based on zone width/height
        const pts     = zone.points;
        const zoneW   = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x));
        const zoneH   = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
        const showPct   = zoneW >= 30 && zoneH >= 30;
        const showCount = zoneW >= 40 && zoneH >= 50;

        return (
          <g key={zoneName}>
            <polygon
              points={toSvgPoints(zone.points)}
              fill={color}
              opacity={alpha}
            >
              <title>{`${zone.label}: ${data.made}/${total} (${data.percentage}%)`}</title>
            </polygon>

            {showPct && (
              <text
                x={cx} y={cy + (showCount ? -6 : 4)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={zoneW < 60 ? "9" : "11"}
                fontWeight="700"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="2.5"
                paintOrder="stroke"
              >
                {data.percentage}%
              </text>
            )}

            {showCount && (
              <text
                x={cx} y={cy + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="8"
                fontWeight="500"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="2"
                paintOrder="stroke"
              >
                {data.made}/{total}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Court lines (drawn ON TOP of zone fills) ── */}
      <g opacity="0.75">
        <rect x="5" y="5" width="490" height="460" fill="none" stroke="#1a1a1a" strokeWidth="3" />
        <line x1="5" y1="435" x2="495" y2="435" stroke="#1a1a1a" strokeWidth="2" />
        <path
          d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435"
          fill="none" stroke="#1a1a1a" strokeWidth="2"
        />
        <rect x="170" y="245" width="160" height="190" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <path d="M 170 245 A 80 80 0 0 1 330 245" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <path
          d="M 330 245 A 80 80 0 0 1 170 245"
          fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="6,6"
        />
        <path d="M 210 435 A 40 40 0 0 1 290 435" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <rect x="220" y="420" width="60" height="4" fill="#1a1a1a" />
        <circle cx="250" cy="405" r="9" fill="none" stroke="#e55039" strokeWidth="2.5" />
        <line x1="5" y1="5" x2="495" y2="5" stroke="#1a1a1a" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function ShootingHeatmap({
  shotData,
  title = "Shooting Heatmap",
  className = "",
}: ShootingHeatmapProps) {
  const zoneData = useMemo(() => {
    const result: Record<string, { made: number; missed: number; percentage: number }> = {};

    Object.keys(COURT_ZONES).forEach(zone => {
      result[zone] = { made: 0, missed: 0, percentage: 0 };
    });

    shotData.forEach((shot) => {
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
    return { made, attempted, percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0 };
  }, [zoneData]);

  if (totals.attempted === 0) return null;

  return (
    <Card className={className} data-testid="shooting-heatmap">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg" data-testid="heatmap-title">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm" data-testid="heatmap-overall-stats">
            <span className="text-muted-foreground">Overall:</span>
            <span className="font-bold">{totals.made}/{totals.attempted}</span>
            <span className={`font-bold ${
              totals.percentage >= 50
                ? "text-green-500"
                : totals.percentage >= 40
                ? "text-amber-500"
                : "text-red-500"
            }`}>
              ({totals.percentage}%)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative w-full aspect-[500/470] rounded-lg overflow-hidden shadow-inner">
          <HeatmapCourtSVG zoneData={zoneData} />
        </div>

        {/* Colour-scale legend */}
        <div className="flex items-center justify-center gap-1 mt-4" data-testid="heatmap-legend">
          <span className="text-xs text-muted-foreground mr-2">Cold</span>
          <div className="flex h-4 rounded overflow-hidden" data-testid="heatmap-color-scale">
            <div className="w-6 bg-[#1e40af]" title="≤20%" />
            <div className="w-6 bg-[#0284c7]" title="21–30%" />
            <div className="w-6 bg-[#0891b2]" title="31–40%" />
            <div className="w-6 bg-[#16a34a]" title="41–50%" />
            <div className="w-6 bg-[#84cc16]" title="51–60%" />
            <div className="w-6 bg-[#eab308]" title="61–70%" />
            <div className="w-6 bg-[#f97316]" title="71–80%" />
            <div className="w-6 bg-[#dc2626]" title="81–100%" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Hot</span>
        </div>

        {/* Zone breakdown table */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(zoneData)
            .filter(([, d]) => d.made + d.missed > 0)
            .sort((a, b) => b[1].percentage - a[1].percentage)
            .map(([zoneName, data]) => {
              const zone = COURT_ZONES[zoneName];
              if (!zone) return null;
              const total = data.made + data.missed;
              const color = getHeatColor(data.percentage);
              return (
                <div
                  key={zoneName}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: color + "20" }}
                  data-testid={`heatmap-zone-${zoneName}`}
                >
                  <span className="text-foreground truncate">{zone.label}</span>
                  <span className="font-medium" style={{ color }}>
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
