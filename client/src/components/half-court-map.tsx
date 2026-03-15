import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChartArea } from "lucide-react";

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

// Court dimensions based on NBA half-court (50ft x 47ft)
// ViewBox: 0 0 500 470. Baseline at y=435. Mid-court at y=5.
// 3-point arc bezier: left= Q(30,100) from (30,285)→(250,70), right= Q(470,100) from (250,70)→(470,285)
// Arc at x=70/430: y≈155. Arc peak at x=250: y=70.
// All 3-point locations must have y < arc-y at their x (closer to mid-court = outside the arc).
const COURT_LOCATIONS: Record<string, { x: number; y: number; label: string }> = {
  // Free throw line (center of key, 15ft from basket)
  "free-throw": { x: 250, y: 190, label: "Free Throw" },
  
  // Corners (baseline, outside 3pt line — straight section is at x=30/470)
  "corner-left": { x: 30, y: 410, label: "Corner Left" },
  "corner-right": { x: 470, y: 410, label: "Corner Right" },
  
  // Top of key — arc peaks at y=70, place clearly outside (above)
  "top-of-key": { x: 250, y: 55, label: "Top of Key" },
  
  // Wings — arc at x=75/425 is y≈149; place outside (above)
  "wing-left": { x: 72, y: 125, label: "Wing Left" },
  "wing-right": { x: 428, y: 125, label: "Wing Right" },
  
  // Hash marks (along the lane, inside the 3pt line — 2-pointers)
  "1st-hash-left": { x: 130, y: 320, label: "1st Hash Left" },
  "1st-hash-right": { x: 370, y: 320, label: "1st Hash Right" },
  "2nd-hash-left": { x: 100, y: 260, label: "2nd Hash Left" },
  "2nd-hash-right": { x: 400, y: 260, label: "2nd Hash Right" },
  "3rd-hash-left": { x: 88, y: 185, label: "3rd Hash Left" },
  "3rd-hash-right": { x: 412, y: 185, label: "3rd Hash Right" },
  
  // Blocks (near the basket, inside the lane)
  "block-left": { x: 170, y: 380, label: "Block Left" },
  "block-right": { x: 330, y: 380, label: "Block Right" },
  
  // Mid-range / elbow (between lane and 3pt line — 2-pointers)
  "mid-range-left": { x: 140, y: 240, label: "Mid-range Left" },
  "mid-range-right": { x: 360, y: 240, label: "Mid-range Right" },
  "elbow-left": { x: 170, y: 248, label: "Elbow Left" },
  "elbow-right": { x: 330, y: 248, label: "Elbow Right" },
};

function CourtSVG({ processedData, showLabels = false }: { processedData: Record<string, { made: number; missed: number }>; showLabels?: boolean }) {
  return (
    <svg
      viewBox="0 0 500 470"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Court wood texture gradient */}
        <linearGradient id="courtWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="25%" stopColor="#c4956a" />
          <stop offset="50%" stopColor="#d4a574" />
          <stop offset="75%" stopColor="#c4956a" />
          <stop offset="100%" stopColor="#d4a574" />
        </linearGradient>
        
        {/* Subtle wood grain pattern */}
        <pattern id="woodGrain" patternUnits="userSpaceOnUse" width="100" height="10">
          <rect width="100" height="10" fill="url(#courtWood)" />
          <line x1="0" y1="2" x2="100" y2="2" stroke="#bf8a5a" strokeWidth="0.5" opacity="0.3" />
          <line x1="0" y1="7" x2="100" y2="7" stroke="#bf8a5a" strokeWidth="0.3" opacity="0.2" />
        </pattern>

        {/* Glow effect for made shots */}
        <filter id="madeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Court background */}
      <rect x="0" y="0" width="500" height="470" fill="url(#woodGrain)" />
      
      {/* Court border */}
      <rect x="5" y="5" width="490" height="460" fill="none" stroke="#1a1a1a" strokeWidth="4" />
      
      {/* Baseline */}
      <line x1="5" y1="435" x2="495" y2="435" stroke="#1a1a1a" strokeWidth="3" />
      
      {/* Three-point line arc */}
      <path
        d="M 30 435 
           L 30 285
           Q 30 100, 250 70
           Q 470 100, 470 285
           L 470 435"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2.5"
      />
      
      {/* Paint/Key area (16ft wide, 19ft deep in NBA) */}
      <rect x="170" y="245" width="160" height="190" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
      
      {/* Free throw circle (top half) */}
      <path
        d="M 170 245 A 80 80 0 0 1 330 245"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2.5"
      />
      
      {/* Free throw circle (bottom half - dashed) */}
      <path
        d="M 330 245 A 80 80 0 0 1 170 245"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeDasharray="8,8"
      />
      
      {/* Restricted area arc (4ft radius) */}
      <path
        d="M 210 435 A 40 40 0 0 1 290 435"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2"
      />
      
      {/* Backboard */}
      <rect x="220" y="420" width="60" height="4" fill="#1a1a1a" />
      
      {/* Rim */}
      <circle cx="250" cy="405" r="9" fill="none" stroke="#e55039" strokeWidth="3" />
      
      {/* Rim connector */}
      <line x1="250" y1="414" x2="250" y2="420" stroke="#1a1a1a" strokeWidth="2" />
      
      {/* Lane hash marks (block areas) */}
      <line x1="170" y1="355" x2="155" y2="355" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="330" y1="355" x2="345" y2="355" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="170" y1="380" x2="155" y2="380" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="330" y1="380" x2="345" y2="380" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="170" y1="405" x2="155" y2="405" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="330" y1="405" x2="345" y2="405" stroke="#1a1a1a" strokeWidth="2" />
      
      {/* Center court line indicator at top */}
      <line x1="5" y1="5" x2="495" y2="5" stroke="#1a1a1a" strokeWidth="3" />

      {/* Shot markers - show individual makes and misses */}
      {Object.entries(processedData).map(([location, data]) => {
        const coords = COURT_LOCATIONS[location];
        if (!coords) return null;

        const total = data.made + data.missed;
        const percentage = total > 0 ? Math.round((data.made / total) * 100) : 0;
        
        // Small circle size
        const circleRadius = 5;
        const spacing = 12;
        
        // Create array of shot results for rendering
        const shots: boolean[] = [];
        for (let i = 0; i < data.made; i++) shots.push(true);
        for (let i = 0; i < data.missed; i++) shots.push(false);
        
        // Arrange shots in a grid pattern around the location
        const cols = Math.min(5, Math.ceil(Math.sqrt(total)));
        const rows = Math.ceil(total / cols);
        const startX = coords.x - ((cols - 1) * spacing) / 2;
        const startY = coords.y - ((rows - 1) * spacing) / 2;

        return (
          <g key={location}>
            {/* Individual shot circles */}
            {shots.map((made, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const cx = startX + col * spacing;
              const cy = startY + row * spacing;
              
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={circleRadius}
                  fill={made ? "#22c55e" : "#ef4444"}
                  stroke={made ? "#166534" : "#991b1b"}
                  strokeWidth="1.5"
                  opacity="0.9"
                >
                  <title>{`${coords.label}: ${made ? 'Made' : 'Missed'}`}</title>
                </circle>
              );
            })}
            
            {/* Stats label below the shots */}
            <text
              x={coords.x}
              y={startY + rows * spacing + 8}
              textAnchor="middle"
              fill="#1a1a1a"
              fontSize="9"
              fontWeight="bold"
              style={{ textShadow: '0 0 3px white, 0 0 3px white' }}
            >
              {data.made}/{total} ({percentage}%)
            </text>

            {/* Location label (optional) */}
            {showLabels && (
              <text
                x={coords.x}
                y={startY + rows * spacing + 20}
                textAnchor="middle"
                fill="#1a1a1a"
                fontSize="8"
                fontWeight="500"
              >
                {coords.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function HalfCourtMap({ shotData, title = "Shot Chart", className = "", compact = false }: HalfCourtMapProps) {
  const processedData = useMemo(() => {
    const result: Record<string, { made: number; missed: number }> = {};
    
    shotData.forEach((shot) => {
      if (!result[shot.location]) {
        result[shot.location] = { made: 0, missed: 0 };
      }
      result[shot.location].made += shot.made;
      result[shot.location].missed += Math.max(0, shot.attempted - shot.made);
    });
    
    return result;
  }, [shotData]);

  const hasShots = Object.keys(processedData).length > 0;
  
  // Calculate totals
  const totals = useMemo(() => {
    let made = 0;
    let attempted = 0;
    Object.values(processedData).forEach(data => {
      made += data.made;
      attempted += data.made + data.missed;
    });
    return { made, attempted, percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0 };
  }, [processedData]);

  if (!hasShots) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold">{totals.made}/{totals.attempted}</span>
            <span className={`font-bold ${totals.percentage >= 60 ? 'text-green-500' : totals.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
              ({totals.percentage}%)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[500/470] rounded-lg overflow-hidden shadow-inner">
          <CourtSVG processedData={processedData} />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-green-800" />
            <span className="text-foreground">Made</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-red-800" />
            <span className="text-foreground">Missed</span>
          </div>
        </div>

        {/* Location breakdown */}
        {!compact && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {Object.entries(processedData).map(([location, data]) => {
              const coords = COURT_LOCATIONS[location];
              if (!coords) return null;
              const total = data.made + data.missed;
              const percentage = total > 0 ? Math.round((data.made / total) * 100) : 0;
              
              return (
                <div 
                  key={location} 
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                  data-testid={`shot-location-stat-${location}`}
                >
                  <span className="text-muted-foreground truncate">{coords.label}</span>
                  <span className={`font-medium ${percentage >= 60 ? 'text-green-500' : percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {data.made}/{total} ({percentage}%)
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

// Button component to open shot chart in a dialog
export function ShotChartButton({ shotData, title = "Shot Chart", testId }: { shotData: ShotData[]; title?: string; testId?: string }) {
  const [open, setOpen] = useState(false);
  
  const hasShots = shotData.some(s => s.attempted > 0);
  
  if (!hasShots) return null;
  
  // Calculate quick totals for button
  const totals = useMemo(() => {
    let made = 0;
    let attempted = 0;
    shotData.forEach(s => {
      made += s.made;
      attempted += s.attempted;
    });
    return { made, attempted, percentage: attempted > 0 ? Math.round((made / attempted) * 100) : 0 };
  }, [shotData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid={testId || "button-view-shot-chart"}>
          <ChartArea className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Shot Chart</span>
          <span className={`text-xs ${totals.percentage >= 60 ? 'text-green-500' : totals.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
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

export { COURT_LOCATIONS };
export type { ShotData };
