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

// Zone definitions with polygonal boundaries for heatmap rendering
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
    label: "Restricted Area",
    center: { x: 250, y: 400 }
  },
  "paint-left": {
    points: [
      { x: 170, y: 435 }, { x: 210, y: 435 },
      { x: 210, y: 320 }, { x: 170, y: 320 }
    ],
    label: "Paint Left",
    center: { x: 190, y: 375 }
  },
  "paint-right": {
    points: [
      { x: 290, y: 435 }, { x: 330, y: 435 },
      { x: 330, y: 320 }, { x: 290, y: 320 }
    ],
    label: "Paint Right",
    center: { x: 310, y: 375 }
  },
  "free-throw": {
    points: [
      { x: 170, y: 320 }, { x: 330, y: 320 },
      { x: 330, y: 245 }, { x: 170, y: 245 }
    ],
    label: "Free Throw",
    center: { x: 250, y: 280 }
  },
  "mid-range-left": {
    points: [
      { x: 30, y: 435 }, { x: 170, y: 435 },
      { x: 170, y: 285 }, { x: 80, y: 285 }
    ],
    label: "Mid Left",
    center: { x: 110, y: 360 }
  },
  "mid-range-right": {
    points: [
      { x: 330, y: 435 }, { x: 470, y: 435 },
      { x: 420, y: 285 }, { x: 330, y: 285 }
    ],
    label: "Mid Right",
    center: { x: 390, y: 360 }
  },
  "elbow-left": {
    points: [
      { x: 80, y: 285 }, { x: 170, y: 285 },
      { x: 170, y: 165 }, { x: 100, y: 180 }
    ],
    label: "Elbow Left",
    center: { x: 130, y: 230 }
  },
  "elbow-right": {
    points: [
      { x: 330, y: 285 }, { x: 420, y: 285 },
      { x: 400, y: 180 }, { x: 330, y: 165 }
    ],
    label: "Elbow Right",
    center: { x: 370, y: 230 }
  },
  "corner-left": {
    points: [
      { x: 5, y: 435 }, { x: 30, y: 435 },
      { x: 30, y: 285 }, { x: 5, y: 285 }
    ],
    label: "Corner Left",
    center: { x: 17, y: 360 }
  },
  "corner-right": {
    points: [
      { x: 470, y: 435 }, { x: 495, y: 435 },
      { x: 495, y: 285 }, { x: 470, y: 285 }
    ],
    label: "Corner Right",
    center: { x: 483, y: 360 }
  },
  "wing-left": {
    points: [
      { x: 5, y: 285 }, { x: 100, y: 180 },
      { x: 120, y: 100 }, { x: 5, y: 100 }
    ],
    label: "Wing Left",
    center: { x: 55, y: 180 }
  },
  "wing-right": {
    points: [
      { x: 495, y: 285 }, { x: 400, y: 180 },
      { x: 380, y: 100 }, { x: 495, y: 100 }
    ],
    label: "Wing Right",
    center: { x: 445, y: 180 }
  },
  "top-of-key": {
    points: [
      { x: 120, y: 100 }, { x: 170, y: 165 },
      { x: 330, y: 165 }, { x: 380, y: 100 },
      { x: 250, y: 70 }
    ],
    label: "Top of Key",
    center: { x: 250, y: 120 }
  },
  "deep-left": {
    points: [
      { x: 5, y: 100 }, { x: 120, y: 100 },
      { x: 100, y: 5 }, { x: 5, y: 5 }
    ],
    label: "Deep Left",
    center: { x: 60, y: 55 }
  },
  "deep-center": {
    points: [
      { x: 100, y: 5 }, { x: 120, y: 100 },
      { x: 250, y: 70 }, { x: 380, y: 100 },
      { x: 400, y: 5 }
    ],
    label: "Deep Center",
    center: { x: 250, y: 45 }
  },
  "deep-right": {
    points: [
      { x: 380, y: 100 }, { x: 495, y: 100 },
      { x: 495, y: 5 }, { x: 400, y: 5 }
    ],
    label: "Deep Right",
    center: { x: 440, y: 55 }
  }
};

// Map shot location names to zones
const LOCATION_TO_ZONE: Record<string, string> = {
  "free-throw": "free-throw",
  "corner-left": "corner-left",
  "corner-right": "corner-right",
  "top-of-key": "top-of-key",
  "wing-left": "wing-left",
  "wing-right": "wing-right",
  "1st-hash-left": "paint-left",
  "1st-hash-right": "paint-right",
  "2nd-hash-left": "elbow-left",
  "2nd-hash-right": "elbow-right",
  "3rd-hash-left": "elbow-left",
  "3rd-hash-right": "elbow-right",
  "block-left": "paint-left",
  "block-right": "paint-right",
  "mid-range-left": "mid-range-left",
  "mid-range-right": "mid-range-right"
};

// Get color based on shooting percentage (cold to hot gradient)
function getHeatColor(percentage: number): string {
  // Blue (cold) -> Cyan -> Green -> Yellow -> Orange -> Red (hot)
  if (percentage <= 20) return "#1e40af"; // Deep blue
  if (percentage <= 30) return "#0284c7"; // Blue
  if (percentage <= 40) return "#0891b2"; // Cyan
  if (percentage <= 50) return "#16a34a"; // Green
  if (percentage <= 60) return "#84cc16"; // Lime
  if (percentage <= 70) return "#eab308"; // Yellow
  if (percentage <= 80) return "#f97316"; // Orange
  return "#dc2626"; // Red
}

// Generate random points within a polygon
function generatePointsInPolygon(
  polygon: { x: number; y: number }[],
  count: number,
  seed: number = 0
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  // Get bounding box
  const minX = Math.min(...polygon.map(p => p.x));
  const maxX = Math.max(...polygon.map(p => p.x));
  const minY = Math.min(...polygon.map(p => p.y));
  const maxY = Math.max(...polygon.map(p => p.y));
  
  // Simple seeded random for consistency
  const random = (i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000;
    return x - Math.floor(x);
  };
  
  let attempts = 0;
  let i = 0;
  while (points.length < count && attempts < count * 10) {
    const x = minX + random(i * 2) * (maxX - minX);
    const y = minY + random(i * 2 + 1) * (maxY - minY);
    
    // Check if point is inside polygon (ray casting)
    if (isPointInPolygon(x, y, polygon)) {
      points.push({ x, y });
    }
    attempts++;
    i++;
  }
  
  return points;
}

function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function HeatmapCourtSVG({ zoneData }: { zoneData: Record<string, { made: number; missed: number; percentage: number }> }) {
  // Generate dots for each zone
  const zoneDots = useMemo(() => {
    const result: { zone: string; dots: { x: number; y: number; color: string }[] }[] = [];
    
    Object.entries(COURT_ZONES).forEach(([zoneName, zone]) => {
      const data = zoneData[zoneName];
      if (!data || data.made + data.missed === 0) return;
      
      // More shots = more dots, scaled by total attempts
      const totalShots = data.made + data.missed;
      const dotCount = Math.min(200, Math.max(20, totalShots * 4));
      
      const points = generatePointsInPolygon(zone.points, dotCount, zoneName.length * 1000);
      const color = getHeatColor(data.percentage);
      
      result.push({
        zone: zoneName,
        dots: points.map(p => ({ ...p, color }))
      });
    });
    
    return result;
  }, [zoneData]);

  return (
    <svg
      viewBox="0 0 500 470"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="heatmapCourtWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="50%" stopColor="#c4956a" />
          <stop offset="100%" stopColor="#d4a574" />
        </linearGradient>
      </defs>

      {/* Court background */}
      <rect x="0" y="0" width="500" height="470" fill="url(#heatmapCourtWood)" />
      
      {/* Heatmap dots */}
      {zoneDots.map(({ zone, dots }) => (
        <g key={zone}>
          {dots.map((dot, idx) => (
            <circle
              key={idx}
              cx={dot.x}
              cy={dot.y}
              r={3}
              fill={dot.color}
              opacity={0.7}
            />
          ))}
        </g>
      ))}
      
      {/* Court lines overlay */}
      <g opacity="0.6">
        {/* Court border */}
        <rect x="5" y="5" width="490" height="460" fill="none" stroke="#1a1a1a" strokeWidth="3" />
        
        {/* Baseline */}
        <line x1="5" y1="435" x2="495" y2="435" stroke="#1a1a1a" strokeWidth="2" />
        
        {/* Three-point line arc */}
        <path
          d="M 30 435 
             L 30 285
             Q 30 100, 250 70
             Q 470 100, 470 285
             L 470 435"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2"
        />
        
        {/* Paint/Key area */}
        <rect x="170" y="245" width="160" height="190" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        
        {/* Free throw circle (top half) */}
        <path
          d="M 170 245 A 80 80 0 0 1 330 245"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2"
        />
        
        {/* Free throw circle (bottom half - dashed) */}
        <path
          d="M 330 245 A 80 80 0 0 1 170 245"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeDasharray="6,6"
        />
        
        {/* Restricted area arc */}
        <path
          d="M 210 435 A 40 40 0 0 1 290 435"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.5"
        />
        
        {/* Backboard */}
        <rect x="220" y="420" width="60" height="4" fill="#1a1a1a" />
        
        {/* Rim */}
        <circle cx="250" cy="405" r="9" fill="none" stroke="#e55039" strokeWidth="2.5" />
        
        {/* Center court line */}
        <line x1="5" y1="5" x2="495" y2="5" stroke="#1a1a1a" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function ShootingHeatmap({ shotData, title = "Shooting Heatmap", className = "" }: ShootingHeatmapProps) {
  // Process shot data into zones
  const zoneData = useMemo(() => {
    const result: Record<string, { made: number; missed: number; percentage: number }> = {};
    
    // Initialize all zones
    Object.keys(COURT_ZONES).forEach(zone => {
      result[zone] = { made: 0, missed: 0, percentage: 0 };
    });
    
    // Aggregate shots by zone
    shotData.forEach((shot) => {
      const zoneName = LOCATION_TO_ZONE[shot.location] || shot.location;
      if (result[zoneName]) {
        result[zoneName].made += shot.made;
        const missed = shot.missed !== undefined ? shot.missed : 
                       shot.attempted !== undefined ? Math.max(0, shot.attempted - shot.made) : 0;
        result[zoneName].missed += missed;
      }
    });
    
    // Calculate percentages
    Object.keys(result).forEach(zone => {
      const total = result[zone].made + result[zone].missed;
      result[zone].percentage = total > 0 ? Math.round((result[zone].made / total) * 100) : 0;
    });
    
    return result;
  }, [shotData]);

  // Calculate totals
  const totals = useMemo(() => {
    let made = 0;
    let attempted = 0;
    Object.values(zoneData).forEach(data => {
      made += data.made;
      attempted += data.made + data.missed;
    });
    return { made, attempted, percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0 };
  }, [zoneData]);

  const hasShots = totals.attempted > 0;

  if (!hasShots) {
    return null;
  }

  return (
    <Card className={className} data-testid="shooting-heatmap">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg" data-testid="heatmap-title">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm" data-testid="heatmap-overall-stats">
            <span className="text-muted-foreground">Overall:</span>
            <span className="font-bold">{totals.made}/{totals.attempted}</span>
            <span className={`font-bold ${totals.percentage >= 60 ? 'text-green-500' : totals.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
              ({totals.percentage}%)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[500/470] rounded-lg overflow-hidden shadow-inner">
          <HeatmapCourtSVG zoneData={zoneData} />
        </div>

        {/* Color legend */}
        <div className="flex items-center justify-center gap-1 mt-4" data-testid="heatmap-legend">
          <span className="text-xs text-muted-foreground mr-2">Cold</span>
          <div className="flex h-4 rounded overflow-hidden" data-testid="heatmap-color-scale">
            <div className="w-6 bg-[#1e40af]" title="0-20%" />
            <div className="w-6 bg-[#0284c7]" title="20-30%" />
            <div className="w-6 bg-[#0891b2]" title="30-40%" />
            <div className="w-6 bg-[#16a34a]" title="40-50%" />
            <div className="w-6 bg-[#84cc16]" title="50-60%" />
            <div className="w-6 bg-[#eab308]" title="60-70%" />
            <div className="w-6 bg-[#f97316]" title="70-80%" />
            <div className="w-6 bg-[#dc2626]" title="80-100%" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Hot</span>
        </div>
        
        {/* Zone breakdown */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(zoneData)
            .filter(([_, data]) => data.made + data.missed > 0)
            .sort((a, b) => b[1].percentage - a[1].percentage)
            .map(([zoneName, data]) => {
              const zone = COURT_ZONES[zoneName];
              if (!zone) return null;
              const total = data.made + data.missed;
              
              return (
                <div 
                  key={zoneName} 
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: getHeatColor(data.percentage) + '20' }}
                  data-testid={`heatmap-zone-${zoneName}`}
                >
                  <span className="text-foreground truncate">{zone.label}</span>
                  <span 
                    className="font-medium"
                    style={{ color: getHeatColor(data.percentage) }}
                  >
                    {data.percentage}%
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
