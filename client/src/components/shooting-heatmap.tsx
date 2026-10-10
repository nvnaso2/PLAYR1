import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShotLocationDB } from "@shared/schema";
import { ChevronDown } from "lucide-react";
import {
  getPersonalHeatScalePosition,
  getShotHeatmapSection,
  SHOT_HEATMAP_SECTIONS,
  type ShotHeatmapBaselines,
  type ShotHeatmapSection,
} from "@shared/shot-heatmap";
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
  personalizedScale?: boolean;
  personalBaselines?: ShotHeatmapBaselines;
  baselineLoading?: boolean;
  baselineError?: boolean;
};

type HeatmapZoneData = {
  made: number;
  missed: number;
  percentage: number;
  personalBaselinePct?: number;
  personalObservedPct?: number;
  personalDeviationPct?: number;
  personalScalePosition?: number;
  personalBaselineMissing?: boolean;
};

// ── Zone polygon definitions ─────────────────────────────────────────────────
// viewBox 0 0 500 470 | basket cy=405 | baseline y=435 | FT line y=245
const COURT_ZONES: Record<string, {
  points: { x: number; y: number }[];
  label: string;
  center: { x: number; y: number };
  noStroke?: boolean;
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
    // Full rectangle covering the entire key from the FT line up to FT circle top.
    // The corners outside the dome are left as black court surface (no zone borders needed).
    // noStroke hides the rectangle edges so only the FT circle line drawn later is visible.
    points: [
      { x: 170, y: 245 }, { x: 330, y: 245 },
      { x: 330, y: 165 }, { x: 170, y: 165 }
    ],
    label: "Free Throw",
    center: { x: 250, y: 208 },
    noStroke: true
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
    // Left mid-range: inner boundary follows the paint wall (x=170) straight up from the
    // FT line (y=245) through the FT circle top level (y=165) to where the paint wall meets
    // the 3PT arc (171,88), then a short hop to the arc corner (138,102). No FT circle arc —
    // that curve lives entirely inside the free-throw zone rectangle.
    points: [
      { x: 30, y: 285 }, { x: 170, y: 285 },    // bottom horizontal
      { x: 170, y: 245 },                         // FT line intersection (the "elbow")
      { x: 170, y: 165 },                         // straight up paint wall to FT circle top level
      { x: 171, y: 88 },                          // continue up to where paint wall meets 3PT arc
      { x: 138, y: 102 },                         // short hop to 3PT arc corner
      { x: 109, y: 119 }, { x: 85, y: 139 },     // ── outer 3PT arc ──
      { x: 65, y: 162 }, { x: 50, y: 188 },
      { x: 39, y: 217 }, { x: 32, y: 250 }
    ],
    label: "Elbow L",
    center: { x: 95, y: 210 }
  },
  "elbow-right": {
    // Right mid-range: mirror of elbow-left.
    // Inner boundary: 3PT arc corner (362,102) → arc meeting point (329,88) → straight
    // down paint wall (x=330) through (330,165) to FT line (330,245). No FT circle arc.
    points: [
      { x: 330, y: 285 }, { x: 470, y: 285 },    // bottom horizontal
      { x: 468, y: 250 }, { x: 461, y: 217 },    // ── outer 3PT arc ──
      { x: 450, y: 188 }, { x: 435, y: 162 },
      { x: 415, y: 139 }, { x: 391, y: 119 },
      { x: 362, y: 102 },                         // 3PT arc corner
      { x: 329, y: 88 },                          // where paint wall meets 3PT arc
      { x: 330, y: 165 },                         // straight down paint wall to FT circle top level
      { x: 330, y: 245 }                          // FT line intersection (the "elbow")
    ],
    label: "Elbow R",
    center: { x: 405, y: 210 }
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
  // Top of key mid-range: the zone inside the 3PT arc at top center, above the FT circle.
  // Left/right boundaries follow the paint walls (x=170/330) from the FT circle top (y=165)
  // straight up to where they meet the arc at (171,88) and (329,88). This matches the
  // inner boundaries of elbow-left and elbow-right exactly, so all three zones tile flush.
  "top-key-mid": {
    points: [
      { x: 170, y: 165 },                         // bottom-left (FT circle top / paint wall)
      { x: 171, y: 88 },                           // up left paint wall to arc meeting point
      { x: 250, y: 70 },                           // 3PT arc peak
      { x: 329, y: 88 },                           // right arc meeting point
      { x: 330, y: 165 }                           // bottom-right (FT circle top / paint wall)
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
// Direct performance scale: clear red at the low end, clean green at the high end.
export const SHOT_HEAT_COLOR_BANDS = [
  { maxPct: 30, label: "≤30%", color: "#6B0E0E" },
  { maxPct: 38, label: "31–38%", color: "#9B1F0A" },
  { maxPct: 45, label: "39–45%", color: "#C03410" },
  { maxPct: 52, label: "46–52%", color: "#C86020" },
  { maxPct: 58, label: "53–58%", color: "#9B7820" },
  { maxPct: 65, label: "59–65%", color: "#6B7A20" },
  { maxPct: 72, label: "66–72%", color: "#3D7A2A" },
  { maxPct: 80, label: "73–80%", color: "#2E8E2E" },
  { maxPct: 88, label: "81–88%", color: "#1AA81A" },
  { maxPct: Infinity, label: ">88%", color: "#0DC80D" },
] as const;

const PERSONAL_SHOT_HEAT_STOPS = [
  "#6B0E0E",
  "#9B1F0A",
  "#C03410",
  "#C86020",
  "#9B7820",
  "#3D7A2A",
  "#2E8E2E",
  "#1AA81A",
  "#0DC80D",
  "#18D218",
  "#2BE52B",
] as const;
const PERSONAL_SHOT_HEAT_GRADIENT = `linear-gradient(90deg, ${PERSONAL_SHOT_HEAT_STOPS
  .map((color, index) => `${color} ${index * 10}%`)
  .join(", ")})`;

const UNGRADED_ZONE_COLOR = "#52525B";

function getHeatColor(pct: number): string {
  return SHOT_HEAT_COLOR_BANDS.find((band) => pct <= band.maxPct)?.color
    ?? SHOT_HEAT_COLOR_BANDS[SHOT_HEAT_COLOR_BANDS.length - 1].color;
}

function getPersonalHeatColor(scalePosition: number): string {
  const position = Number.isFinite(scalePosition)
    ? Math.max(0, Math.min(10, scalePosition))
    : 5;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return PERSONAL_SHOT_HEAT_STOPS[lowerIndex];

  const mix = position - lowerIndex;
  const from = PERSONAL_SHOT_HEAT_STOPS[lowerIndex].slice(1);
  const to = PERSONAL_SHOT_HEAT_STOPS[upperIndex].slice(1);
  const channels = [0, 2, 4].map((offset) => {
    const start = Number.parseInt(from.slice(offset, offset + 2), 16);
    const end = Number.parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * mix).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

// Zone opacity — ramp up from 0.72 to 0.90 with volume
function zoneOpacity(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0.78;
  return 0.72 + 0.18 * Math.sqrt(total / maxTotal);
}

function toSvgPoints(pts: { x: number; y: number }[]): string {
  return pts.map(p => `${p.x},${p.y}`).join(" ");
}

function getZoneData(
  shotData: ShotData[],
  shotLocations: Array<Pick<ShotLocationDB, "slug" | "classification">> = [],
  personalBaselines?: ShotHeatmapBaselines,
) {
  const result: Record<string, HeatmapZoneData> = {};
  const sectionAttempts: Record<string, Record<ShotHeatmapSection, { made: number; attempted: number }>> = {};
  const classificationByLocation = new Map(shotLocations.map((location) => [location.slug, location.classification]));

  Object.keys(COURT_ZONES).forEach(zone => {
    result[zone] = { made: 0, missed: 0, percentage: 0 };
    sectionAttempts[zone] = {
      "three-pointers": { made: 0, attempted: 0 },
      "mid-range": { made: 0, attempted: 0 },
      "free-throws": { made: 0, attempted: 0 },
      layups: { made: 0, attempted: 0 },
    };
  });

  shotData.forEach(shot => {
    const zoneName = LOCATION_TO_ZONE[shot.location] || shot.location;
    if (!result[zoneName]) return;

    const made = Math.max(0, Number(shot.made) || 0);
    const attempted = Math.max(
      0,
      Number(shot.attempted ?? (made + (Number(shot.missed) || 0))) || 0,
    );
    result[zoneName].made += made;
    const missed =
      shot.missed !== undefined
        ? Math.max(0, Number(shot.missed) || 0)
        : shot.attempted !== undefined
        ? Math.max(0, attempted - made)
        : 0;
    result[zoneName].missed += missed;

    const section = getShotHeatmapSection(
      shot.location,
      classificationByLocation.get(shot.location),
    );
    if (section && attempted > 0) {
      sectionAttempts[zoneName][section].made += made;
      sectionAttempts[zoneName][section].attempted += attempted;
    }
  });

  Object.keys(result).forEach(zone => {
    const total = result[zone].made + result[zone].missed;
    result[zone].percentage = total > 0 ? Math.round((result[zone].made / total) * 100) : 0;

    if (!personalBaselines) return;
    let comparedMade = 0;
    let comparedAttempts = 0;
    let expectedPctTimesAttempts = 0;
    let hasSectionWithoutBaseline = false;

    for (const section of SHOT_HEATMAP_SECTIONS) {
      const sectionStats = sectionAttempts[zone][section];
      const baseline = personalBaselines[section];
      if (sectionStats.attempted === 0) continue;
      if (!baseline || baseline.averagePct === null || baseline.workouts === 0) {
        hasSectionWithoutBaseline = true;
        continue;
      }

      comparedMade += sectionStats.made;
      comparedAttempts += sectionStats.attempted;
      expectedPctTimesAttempts += baseline.averagePct * sectionStats.attempted;
    }

    if (hasSectionWithoutBaseline) {
      result[zone].personalBaselineMissing = true;
    } else if (comparedAttempts > 0) {
      const observedPct = (comparedMade / comparedAttempts) * 100;
      const baselinePct = expectedPctTimesAttempts / comparedAttempts;
      const deviationPct = observedPct - baselinePct;
      result[zone].personalObservedPct = observedPct;
      result[zone].personalBaselinePct = baselinePct;
      result[zone].personalDeviationPct = deviationPct;
      result[zone].personalScalePosition = getPersonalHeatScalePosition(observedPct, baselinePct);
    }
  });

  return result;
}

export function hasMappedWorkoutShotData(
  shotData: Array<{ location: string; attempted: number }>,
) {
  return shotData.some(shot => {
    const zoneName = LOCATION_TO_ZONE[shot.location] || shot.location;
    return shot.attempted > 0 && Boolean(COURT_ZONES[zoneName]);
  });
}

// ── Court SVG (black background, white lines) ────────────────────────────────
function HeatmapCourtSVG({
  zoneData,
  showLogo = true,
  blendIntoBackground = false,
  personalizedScale = false,
}: {
  zoneData: Record<string, HeatmapZoneData>;
  showLogo?: boolean;
  blendIntoBackground?: boolean;
  personalizedScale?: boolean;
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
      {/* Keep the workout map on the story surface; the dashboard retains its black court. */}
      {!blendIntoBackground && <rect x="0" y="0" width="500" height="435" fill="#000000" />}

      {showLogo && (
        <>
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
        </>
      )}


      {/* ── Base zone fills — dim dark tint so all zones are always visible ── */}
      {Object.entries(COURT_ZONES).map(([zoneName, zone]) => (
        <polygon
          key={`base-${zoneName}`}
          points={toSvgPoints(zone.points)}
          fill="#1a1a2e"
          opacity={blendIntoBackground ? 0.32 : 0.85}
          stroke={zone.noStroke ? "none" : "white"}
          strokeWidth={zone.noStroke ? "0" : "0.8"}
          strokeOpacity={zone.noStroke ? "0" : blendIntoBackground ? "0.12" : "0.25"}
        />
      ))}

      {/* ── Coloured zone fills (drawn BEFORE court lines) ── */}
      {Object.entries(COURT_ZONES).map(([zoneName, zone]) => {
        const data = zoneData[zoneName];
        if (!data || data.made + data.missed === 0) return null;

        const total   = data.made + data.missed;
        const color   = personalizedScale
          ? data.personalScalePosition !== undefined
            ? getPersonalHeatColor(data.personalScalePosition)
            : UNGRADED_ZONE_COLOR
          : getHeatColor(data.percentage);
        const alpha   = zoneOpacity(total, maxTotal);
        const cx      = zone.center.x;
        const cy      = zone.center.y;
        const comparisonText = data.personalBaselinePct !== undefined
          ? `; ${data.personalDeviationPct! >= 0 ? "+" : ""}${data.personalDeviationPct!.toFixed(1)} percentage points versus your ${data.personalBaselinePct.toFixed(1)}% recent average`
          : personalizedScale
            ? data.personalBaselineMissing
              ? "; a recent baseline is missing for one or more shot types in this zone"
              : "; no recent baseline available for this shot type"
            : "";

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
              stroke={zone.noStroke ? "none" : "white"}
              strokeWidth={zone.noStroke ? "0" : "1"}
              strokeOpacity={zone.noStroke ? "0" : blendIntoBackground ? "0.28" : "0.5"}
            >
              <title>{`${zone.label}: ${data.made}/${total} (${data.percentage}%)${comparisonText}`}</title>
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
      <g opacity={blendIntoBackground ? 0.68 : 1}>
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
/**
 * Dashboard shooting-court visualization without the dashboard card wrapper.
 * Reuses the same section polygons, location aggregation, percentages, and heat colors.
 */
export function WorkoutShootingCourt({
  shotData,
  blendIntoBackground = false,
}: {
  shotData: Array<{ location: string; made: number; attempted: number }>;
  blendIntoBackground?: boolean;
}) {
  const zoneData = useMemo(
    () => getZoneData(shotData.map(shot => ({ ...shot, missed: Math.max(0, shot.attempted - shot.made) }))),
    [shotData],
  );

  return (
    <div
      data-testid="workout-shooting-court"
      style={{ width: "100%", height: "100%" }}
    >
      <HeatmapCourtSVG zoneData={zoneData} showLogo={false} blendIntoBackground={blendIntoBackground} />
    </div>
  );
}

export function ShootingHeatmap({
  shotData,
  title = "Shooting Heatmap",
  className = "",
  personalizedScale = false,
  personalBaselines,
  baselineLoading = false,
  baselineError = false,
}: ShootingHeatmapProps) {
  const [zoneBreakdownOpen, setZoneBreakdownOpen] = useState(false);
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

  const zoneData = useMemo(
    () => getZoneData(shotData, shotLocationOptions || [], personalizedScale ? personalBaselines : undefined),
    [shotData, shotLocationOptions, personalBaselines, personalizedScale],
  );

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
  const pctColor = personalizedScale
    ? "text-zinc-100"
    : pct >= 65 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : pct >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <Card className={`bg-black border-zinc-800 ${className}`} data-testid="shooting-heatmap">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {title && <CardTitle className="text-lg text-white" data-testid="heatmap-title">{title}</CardTitle>}
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
          <HeatmapCourtSVG zoneData={zoneData} personalizedScale={personalizedScale} />
        </div>

        {personalizedScale ? (
          <div className="mt-3 space-y-1" data-testid="heatmap-legend">
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-zinc-500 mr-1">0%</span>
              <div
                className="h-3 w-36 sm:w-52 rounded"
                data-testid="heatmap-color-scale"
                role="img"
                aria-label="Smooth scale from red below average through green at average to brighter green above average"
                title="Your recent shot-type average is green"
                style={{ background: PERSONAL_SHOT_HEAT_GRADIENT }}
              />
              <span className="text-[10px] text-zinc-500 ml-1">100%</span>
            </div>
            <div className="flex justify-center gap-1 text-[10px] text-zinc-500">
              <span>Lower</span>
              <span className="mx-2" style={{ color: "#3D7A2A" }}>Your section average</span>
              <span>Higher</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 mt-3" data-testid="heatmap-legend">
            <span className="text-xs text-zinc-500 mr-1">Cold</span>
            <div className="flex h-3 rounded overflow-hidden" data-testid="heatmap-color-scale">
              {SHOT_HEAT_COLOR_BANDS.map((band) => (
                <div key={band.label} className="w-5" style={{ background: band.color }} title={band.label} />
              ))}
            </div>
            <span className="text-xs text-zinc-500 ml-1">Hot</span>
          </div>
        )}

        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setZoneBreakdownOpen((open) => !open)}
            aria-expanded={zoneBreakdownOpen}
            aria-controls="shooting-heatmap-zone-breakdown"
            className="flex min-h-10 w-full items-center justify-between px-3 text-left text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.03]"
            data-testid="button-toggle-shot-breakdown"
          >
            <span>Shot breakdown</span>
            <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${zoneBreakdownOpen ? "rotate-180 text-orange-300" : ""}`} />
          </button>
          {zoneBreakdownOpen && (
            <div id="shooting-heatmap-zone-breakdown" className="grid grid-cols-2 gap-1.5 border-t border-zinc-800 p-2 text-xs sm:grid-cols-3">
              {Object.entries(zoneData)
                .filter(([, d]) => d.made + d.missed > 0)
                .sort((a, b) => b[1].percentage - a[1].percentage)
                .map(([zoneName, data]) => {
                  const zone = COURT_ZONES[zoneName];
                  if (!zone) return null;
                  const total = data.made + data.missed;
                  const color = personalizedScale
                    ? data.personalScalePosition !== undefined
                      ? getPersonalHeatColor(data.personalScalePosition)
                      : UNGRADED_ZONE_COLOR
                    : getHeatColor(data.percentage);
                  const label = zoneLabelMap[zoneName]?.join(" / ") || zone.label;
                  const comparisonText = data.personalBaselinePct !== undefined
                    ? `${data.personalDeviationPct! >= 0 ? "+" : ""}${data.personalDeviationPct!.toFixed(1)} pp vs personal average`
                    : personalizedScale
                      ? data.personalBaselineMissing
                        ? "A recent baseline is missing for one or more shot types in this zone"
                        : "No recent personal baseline"
                      : "";
                  return (
                    <div
                      key={zoneName}
                      className="flex items-center justify-between rounded p-1.5"
                      style={{ backgroundColor: color + "28", border: `1px solid ${color}44` }}
                      data-testid={`heatmap-zone-${zoneName}`}
                      title={comparisonText || undefined}
                    >
                      <span className="truncate text-zinc-300">{label}</span>
                      <span className="ml-1 shrink-0 font-semibold" style={{ color }}>
                        {data.made}/{total} ({data.percentage}%)
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export type { ShotData };
