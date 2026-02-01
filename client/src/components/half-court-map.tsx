import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShotData = {
  location: string;
  made: number;
  attempted: number;
};

type HalfCourtMapProps = {
  shotData: ShotData[];
  title?: string;
  className?: string;
};

const COURT_LOCATIONS: Record<string, { x: number; y: number; label: string }> = {
  "free-throw": { x: 50, y: 58, label: "Free Throw" },
  "corner-left": { x: 8, y: 92, label: "Corner Left" },
  "corner-right": { x: 92, y: 92, label: "Corner Right" },
  "top-of-key": { x: 50, y: 35, label: "Top of Key" },
  "wing-left": { x: 18, y: 50, label: "Wing Left" },
  "wing-right": { x: 82, y: 50, label: "Wing Right" },
  "1st-hash-left": { x: 25, y: 65, label: "1st Hash Left" },
  "1st-hash-right": { x: 75, y: 65, label: "1st Hash Right" },
  "2nd-hash-left": { x: 30, y: 55, label: "2nd Hash Left" },
  "2nd-hash-right": { x: 70, y: 55, label: "2nd Hash Right" },
  "3rd-hash-left": { x: 35, y: 45, label: "3rd Hash Left" },
  "3rd-hash-right": { x: 65, y: 45, label: "3rd Hash Right" },
  "block-left": { x: 30, y: 80, label: "Block Left" },
  "block-right": { x: 70, y: 80, label: "Block Right" },
  "mid-range-left": { x: 25, y: 70, label: "Mid-range Left" },
  "mid-range-right": { x: 75, y: 70, label: "Mid-range Right" },
};

export function HalfCourtMap({ shotData, title = "Shot Chart", className = "" }: HalfCourtMapProps) {
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

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[1.2/1] bg-gradient-to-b from-amber-900/20 to-amber-800/30 rounded-lg overflow-hidden border-2 border-amber-600/50">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="courtGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#b45309" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#92400e" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="100" height="100" fill="url(#courtGradient)" />
            
            <line x1="0" y1="100" x2="100" y2="100" stroke="#f59e0b" strokeWidth="0.5" />
            
            <rect x="19" y="62" width="62" height="38" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
            
            <circle cx="50" cy="62" r="18" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
            
            <rect x="33" y="85" width="34" height="15" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
            
            <circle cx="50" cy="95" r="2" fill="none" stroke="#f59e0b" strokeWidth="0.5" />
            
            <path
              d="M 6 100 Q 6 45, 50 30 Q 94 45, 94 100"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.8"
            />
            
            <circle cx="50" cy="30" r="6" fill="none" stroke="#f59e0b" strokeWidth="0.8" />

            {Object.entries(processedData).map(([location, data]) => {
              const coords = COURT_LOCATIONS[location];
              if (!coords) return null;

              const dots: JSX.Element[] = [];
              const dotSize = 2.5;
              const spacing = 1.5;

              for (let i = 0; i < data.made; i++) {
                const offset = (i - (data.made - 1) / 2) * spacing;
                dots.push(
                  <circle
                    key={`made-${location}-${i}`}
                    cx={coords.x + offset}
                    cy={coords.y - dotSize}
                    r={dotSize}
                    fill="#22c55e"
                    stroke="#166534"
                    strokeWidth="0.3"
                    className="drop-shadow-sm"
                  >
                    <title>{`${coords.label}: Made (${data.made})`}</title>
                  </circle>
                );
              }

              for (let i = 0; i < data.missed; i++) {
                const offset = (i - (data.missed - 1) / 2) * spacing;
                dots.push(
                  <circle
                    key={`missed-${location}-${i}`}
                    cx={coords.x + offset}
                    cy={coords.y + dotSize + 1}
                    r={dotSize}
                    fill="#ef4444"
                    stroke="#991b1b"
                    strokeWidth="0.3"
                    className="drop-shadow-sm"
                  >
                    <title>{`${coords.label}: Missed (${data.missed})`}</title>
                  </circle>
                );
              }

              return <g key={location}>{dots}</g>;
            })}
          </svg>

          {!hasShots && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No shot data recorded</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-green-800" />
            <span className="text-sm text-foreground">Made</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-red-800" />
            <span className="text-sm text-foreground">Missed</span>
          </div>
        </div>

        {hasShots && (
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
                  <span className="font-medium text-foreground">
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

export { COURT_LOCATIONS };
export type { ShotData };
