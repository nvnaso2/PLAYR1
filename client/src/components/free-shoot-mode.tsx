import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, Timer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

// ── Polygon court zones (same as shooting-heatmap.tsx) ───────────────────────
type ZoneDef = {
  points: { x: number; y: number }[];
  label: string;
  center: { x: number; y: number };
  noStroke?: boolean;
};

export const COURT_ZONES: Record<string, ZoneDef> = {
  "restricted-area": {
    points: [{ x: 210, y: 435 }, { x: 290, y: 435 }, { x: 290, y: 340 }, { x: 210, y: 340 }],
    label: "Post", center: { x: 250, y: 370 },
  },
  "paint-left": {
    points: [{ x: 170, y: 435 }, { x: 210, y: 435 }, { x: 210, y: 340 }, { x: 170, y: 340 }],
    label: "Paint L", center: { x: 190, y: 390 },
  },
  "paint-right": {
    points: [{ x: 290, y: 435 }, { x: 330, y: 435 }, { x: 330, y: 340 }, { x: 290, y: 340 }],
    label: "Paint R", center: { x: 310, y: 390 },
  },
  "floater": {
    points: [{ x: 170, y: 245 }, { x: 330, y: 245 }, { x: 330, y: 340 }, { x: 170, y: 340 }],
    label: "Floater", center: { x: 250, y: 293 },
  },
  "free-throw": {
    points: [{ x: 170, y: 245 }, { x: 330, y: 245 }, { x: 330, y: 165 }, { x: 170, y: 165 }],
    label: "Free Throw", center: { x: 250, y: 208 }, noStroke: true,
  },
  "mid-range-left": {
    points: [{ x: 30, y: 435 }, { x: 170, y: 435 }, { x: 170, y: 285 }, { x: 30, y: 285 }],
    label: "Mid Left", center: { x: 100, y: 365 },
  },
  "mid-range-right": {
    points: [{ x: 330, y: 435 }, { x: 470, y: 435 }, { x: 470, y: 285 }, { x: 330, y: 285 }],
    label: "Mid Right", center: { x: 400, y: 365 },
  },
  "elbow-left": {
    points: [
      { x: 30, y: 285 }, { x: 170, y: 285 }, { x: 170, y: 245 }, { x: 170, y: 165 },
      { x: 171, y: 88 }, { x: 138, y: 102 }, { x: 109, y: 119 }, { x: 85, y: 139 },
      { x: 65, y: 162 }, { x: 50, y: 188 }, { x: 39, y: 217 }, { x: 32, y: 250 },
    ],
    label: "Elbow L", center: { x: 95, y: 210 },
  },
  "elbow-right": {
    points: [
      { x: 330, y: 285 }, { x: 470, y: 285 }, { x: 468, y: 250 }, { x: 461, y: 217 },
      { x: 450, y: 188 }, { x: 435, y: 162 }, { x: 415, y: 139 }, { x: 391, y: 119 },
      { x: 362, y: 102 }, { x: 329, y: 88 }, { x: 330, y: 165 }, { x: 330, y: 245 },
    ],
    label: "Elbow R", center: { x: 405, y: 210 },
  },
  "corner-left": {
    points: [{ x: 5, y: 435 }, { x: 30, y: 435 }, { x: 30, y: 285 }, { x: 5, y: 285 }],
    label: "Corner L", center: { x: 17, y: 360 },
  },
  "corner-right": {
    points: [{ x: 470, y: 435 }, { x: 495, y: 435 }, { x: 495, y: 285 }, { x: 470, y: 285 }],
    label: "Corner R", center: { x: 483, y: 360 },
  },
  "wing-left": {
    points: [
      { x: 5, y: 285 }, { x: 30, y: 285 }, { x: 32, y: 250 }, { x: 39, y: 217 },
      { x: 50, y: 188 }, { x: 65, y: 162 }, { x: 85, y: 139 }, { x: 109, y: 119 },
      { x: 138, y: 102 }, { x: 138, y: 5 }, { x: 5, y: 5 },
    ],
    label: "Wing L", center: { x: 55, y: 145 },
  },
  "wing-right": {
    points: [
      { x: 362, y: 102 }, { x: 391, y: 119 }, { x: 415, y: 139 }, { x: 435, y: 162 },
      { x: 450, y: 188 }, { x: 461, y: 217 }, { x: 468, y: 250 }, { x: 470, y: 285 },
      { x: 495, y: 285 }, { x: 495, y: 5 }, { x: 362, y: 5 },
    ],
    label: "Wing R", center: { x: 445, y: 145 },
  },
  "top-key-mid": {
    points: [
      { x: 170, y: 165 }, { x: 171, y: 88 }, { x: 250, y: 70 }, { x: 329, y: 88 }, { x: 330, y: 165 },
    ],
    label: "Top Key 2PT", center: { x: 250, y: 120 },
  },
  "top-of-key": {
    points: [
      { x: 138, y: 5 }, { x: 362, y: 5 }, { x: 362, y: 102 }, { x: 329, y: 88 },
      { x: 250, y: 70 }, { x: 171, y: 88 }, { x: 138, y: 102 },
    ],
    label: "Top of Key", center: { x: 250, y: 48 },
  },
};

function toSvgPoints(pts: { x: number; y: number }[]): string {
  return pts.map(p => `${p.x},${p.y}`).join(" ");
}

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

export type ShotRecord = { made: number; missed: number };

// ── Interactive polygon court ─────────────────────────────────────────────────
function InteractiveCourtSVG({
  shots,
  onZoneClick,
  activeZone,
}: {
  shots: Record<string, ShotRecord>;
  onZoneClick: (zone: string) => void;
  activeZone: string | null;
}) {
  return (
    <svg
      viewBox="0 0 500 470"
      className="w-full h-full select-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: "manipulation" }}
    >
      <rect x="0" y="0" width="500" height="435" fill="#000000" />

      <defs>
        <clipPath id="fsLogoClip">
          <rect x="0" y="435" width="500" height="35" />
        </clipPath>
      </defs>
      <image href={playr1Logo} x="175" y="378" width="150" height="150"
        clipPath="url(#fsLogoClip)" preserveAspectRatio="xMidYMid meet" />

      {/* Base tints for all zones */}
      {Object.entries(COURT_ZONES).map(([name, zone]) => (
        <polygon
          key={`base-${name}`}
          points={toSvgPoints(zone.points)}
          fill="#1a1a2e"
          opacity={0.85}
          stroke={zone.noStroke ? "none" : "white"}
          strokeWidth={zone.noStroke ? "0" : "0.8"}
          strokeOpacity={zone.noStroke ? "0" : "0.22"}
        />
      ))}

      {/* Coloured fills for zones with shots */}
      {Object.entries(COURT_ZONES).map(([name, zone]) => {
        const data = shots[name];
        const total = data ? data.made + data.missed : 0;
        if (total === 0) return null;
        const pct = Math.round((data.made / total) * 100);
        const color = zoneColor(pct);
        return (
          <polygon
            key={`fill-${name}`}
            points={toSvgPoints(zone.points)}
            fill={color}
            opacity={0.88}
            stroke={zone.noStroke ? "none" : "white"}
            strokeWidth={zone.noStroke ? "0" : "1"}
            strokeOpacity={zone.noStroke ? "0" : "0.5"}
          />
        );
      })}

      {/* Court lines on top */}
      <rect x="5" y="5" width="490" height="460" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="5" y1="5" x2="495" y2="5" stroke="white" strokeWidth="2" />
      <line x1="5" y1="435" x2="495" y2="435" stroke="white" strokeWidth="2" />
      <path d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435" fill="none" stroke="white" strokeWidth="2" />
      <rect x="170" y="245" width="160" height="190" fill="none" stroke="white" strokeWidth="2" />
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
      <path d="M 170 245 A 80 80 0 0 1 330 245" fill="none" stroke="white" strokeWidth="2" />
      <path d="M 330 245 A 80 80 0 0 1 170 245" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="8,6" />
      <path d="M 210 435 A 40 40 0 0 1 290 435" fill="none" stroke="white" strokeWidth="1.5" />
      <rect x="215" y="418" width="70" height="5" fill="white" />
      <circle cx="250" cy="405" r="10" fill="none" stroke="#E55039" strokeWidth="2.5" />

      {/* Active zone highlight (on top of lines) */}
      {activeZone && COURT_ZONES[activeZone] && (
        <polygon
          points={toSvgPoints(COURT_ZONES[activeZone].points)}
          fill="none"
          stroke="#F97316"
          strokeWidth="3"
          opacity={0.9}
        />
      )}

      {/* Clickable zones + stats text */}
      {Object.entries(COURT_ZONES).map(([name, zone]) => {
        const data = shots[name];
        const total = data ? data.made + data.missed : 0;
        const pct = total > 0 ? Math.round((data.made / total) * 100) : 0;
        const cx = zone.center.x;
        const cy = zone.center.y;

        const pts = zone.points;
        const zoneW = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x));
        const zoneH = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
        const showPct = total > 0 && zoneW >= 28 && zoneH >= 24;
        const showCount = total > 0 && zoneW >= 45 && zoneH >= 45;

        return (
          <g
            key={`hit-${name}`}
            onClick={() => onZoneClick(name)}
            style={{ cursor: "pointer" }}
            data-testid={`zone-${name}`}
          >
            <polygon points={toSvgPoints(zone.points)} fill="transparent" />
            {showPct && (
              <text x={cx} y={cy + (showCount ? -6 : 4)}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={zoneW < 60 ? "9" : "12"} fontWeight="700"
                stroke="rgba(0,0,0,0.6)" strokeWidth="3" paintOrder="stroke"
              >{pct}%</text>
            )}
            {showCount && (
              <text x={cx} y={cy + 9}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.85)" fontSize="8" fontWeight="500"
                stroke="rgba(0,0,0,0.6)" strokeWidth="2" paintOrder="stroke"
              >{data.made}/{total}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Free Shoot Mode ───────────────────────────────────────────────────────────

type FreeShotModeProps = {
  onClose: () => void;
  drillId?: string;
  drillTitle?: string;
  initialShots?: Record<string, ShotRecord>;
  onSaveOverride?: (shots: Record<string, ShotRecord>, elapsedMs: number) => void;
  headerLabel?: string;
};

export function FreeShotMode({
  onClose,
  drillId,
  drillTitle,
  initialShots,
  onSaveOverride,
  headerLabel,
}: FreeShotModeProps) {
  const [shots, setShots] = useState<Record<string, ShotRecord>>(initialShots || {});
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<Array<{ zone: string; made: boolean }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const addShot = (made: boolean) => {
    if (!activeZone) return;
    const zone = activeZone;
    setShots(prev => ({
      ...prev,
      [zone]: {
        made: (prev[zone]?.made || 0) + (made ? 1 : 0),
        missed: (prev[zone]?.missed || 0) + (made ? 0 : 1),
      },
    }));
    setHistory(prev => [...prev, { zone, made }]);
    setActiveZone(null);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setShots(prev => {
      const z = prev[last.zone];
      if (!z) return prev;
      const newMade = z.made - (last.made ? 1 : 0);
      const newMissed = z.missed - (last.made ? 0 : 1);
      if (newMade <= 0 && newMissed <= 0) {
        const next = { ...prev };
        delete next[last.zone];
        return next;
      }
      return { ...prev, [last.zone]: { made: Math.max(0, newMade), missed: Math.max(0, newMissed) } };
    });
  };

  const totalMade = Object.values(shots).reduce((s, z) => s + z.made, 0);
  const totalAttempted = Object.values(shots).reduce((s, z) => s + z.made + z.missed, 0);
  const totalPct = totalAttempted > 0 ? Math.round((totalMade / totalAttempted) * 100) : 0;
  const pctColor = totalPct >= 50 ? "text-green-400" : totalPct >= 40 ? "text-orange-400" : "text-red-400";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (onSaveOverride) { onSaveOverride(shots, elapsed); return; }
      const sessionId = `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const zoneKeys = Object.keys(shots);
      const entries = zoneKeys.map((location, idx) => {
        const data = shots[location];
        return {
          drillId: drillId || null,
          duration: idx === 0 ? Math.max(0, Math.round(elapsed / 60000)) : 0,
          workoutSessionId: zoneKeys.length > 1 ? sessionId : undefined,
          shotLocation: location,
          shotsAttempted: data.made + data.missed,
          shotsMade: data.made,
          metrics: [],
        };
      });
      const clientDate = new Date().toLocaleDateString("en-CA");
      await apiRequest("POST", "/api/training-logs/bulk", { entries, clientDate });
    },
    onSuccess: () => {
      if (!onSaveOverride) {
        queryClient.invalidateQueries({ queryKey: ["/api/training-logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard-training"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/by-category"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Session saved!", description: `${totalMade}/${totalAttempted} (${totalPct}%)` });
        onClose();
      }
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const activeZoneDef = activeZone ? COURT_ZONES[activeZone] : null;
  const currentZoneShots = activeZone ? shots[activeZone] : null;
  const currentZoneTotal = currentZoneShots ? currentZoneShots.made + currentZoneShots.missed : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"
          onClick={onClose} data-testid="button-close-free-shoot">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mb-0.5">
            {headerLabel || drillTitle || "Free Shoot"}
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="text-2xl font-bold text-white leading-none">{totalMade}/{totalAttempted}</span>
            {totalAttempted > 0 && (
              <span className={`text-lg font-bold leading-none ${pctColor}`}>{totalPct}%</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Court */}
      <div className="flex-1 flex items-center justify-center px-3 py-2 min-h-0">
        <div className="w-full max-w-[420px] aspect-[500/470]">
          <InteractiveCourtSVG shots={shots} onZoneClick={setActiveZone} activeZone={activeZone} />
        </div>
      </div>

      {/* Bottom panel */}
      {activeZone && activeZoneDef ? (
        <div className="shrink-0 bg-zinc-900 border-t-2 border-orange-500/50 px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-white font-bold text-base">{activeZoneDef.label}</span>
              {currentZoneTotal > 0 && currentZoneShots && (
                <span className="ml-2 text-sm text-zinc-400">
                  {currentZoneShots.made}/{currentZoneTotal} here
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500"
              onClick={() => setActiveZone(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-[72px] text-2xl font-black bg-green-600 hover:bg-green-500 active:scale-95 transition-transform text-white rounded-xl"
              onClick={() => addShot(true)} data-testid="button-made-shot"
            >✓ MADE</Button>
            <Button
              className="h-[72px] text-2xl font-black bg-red-800 hover:bg-red-700 active:scale-95 transition-transform text-white rounded-xl"
              onClick={() => addShot(false)} data-testid="button-missed-shot"
            >✗ MISS</Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-4 pb-6 pt-3 bg-zinc-950 border-t border-zinc-800">
          {totalAttempted === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-1">Tap any zone on the court to log a shot</p>
          ) : (
            <div className="flex gap-3">
              {history.length > 0 && (
                <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white h-12 shrink-0"
                  onClick={undo} data-testid="button-undo-shot">Undo</Button>
              )}
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-bold rounded-xl"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending} data-testid="button-save-free-shoot"
              >
                {saveMutation.isPending ? "Saving…" : `Save · ${totalMade}/${totalAttempted} (${totalPct}%)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live Shot Counter ─────────────────────────────────────────────────────────
type LiveShotCounterProps = {
  location: string;
  locationLabel?: string;
  initialMade?: number;
  initialAttempted?: number;
  onDone: (made: number, attempted: number) => void;
  onClose: () => void;
};

export function LiveShotCounter({
  location,
  locationLabel,
  initialMade = 0,
  initialAttempted = 0,
  onDone,
  onClose,
}: LiveShotCounterProps) {
  const [made, setMade] = useState(initialMade);
  const [attempted, setAttempted] = useState(initialAttempted);
  const [history, setHistory] = useState<boolean[]>([]);

  const addShot = (isMade: boolean) => {
    if (isMade) setMade(m => m + 1);
    setAttempted(a => a + 1);
    setHistory(prev => [...prev, isMade]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    if (last) setMade(m => Math.max(0, m - 1));
    setAttempted(a => Math.max(0, a - 1));
  };

  const missed = attempted - made;
  const pct = attempted > 0 ? Math.round((made / attempted) * 100) : 0;
  const pctColor = pct >= 50 ? "text-green-400" : pct >= 40 ? "text-orange-400" : "text-red-400";
  const label = locationLabel || COURT_ZONES[location]?.label
    || location.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6">
      <div className="w-full flex items-center justify-between">
        <div className="w-8" />
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Recording</div>
          <div className="text-xl font-bold text-white">{label}</div>
        </div>
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"
          onClick={onClose} data-testid="button-close-live-counter">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-end gap-6">
          <div className="text-center">
            <div className="text-7xl font-black text-green-400 leading-none">{made}</div>
            <div className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Made</div>
          </div>
          <div className="text-5xl font-black text-zinc-600 pb-3">/</div>
          <div className="text-center">
            <div className="text-7xl font-black text-white leading-none">{attempted}</div>
            <div className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Attempted</div>
          </div>
        </div>
        {attempted > 0 && <div className={`text-3xl font-black mt-2 ${pctColor}`}>{pct}%</div>}
        {attempted > 0 && (
          <div className="flex gap-6 text-sm text-zinc-500 mt-1">
            <span>{made} made</span><span>{missed} missed</span>
          </div>
        )}
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-20 text-2xl font-black bg-green-600 hover:bg-green-500 active:scale-95 transition-transform text-white rounded-xl"
            onClick={() => addShot(true)} data-testid="button-live-made">✓ MADE</Button>
          <Button className="h-20 text-2xl font-black bg-red-800 hover:bg-red-700 active:scale-95 transition-transform text-white rounded-xl"
            onClick={() => addShot(false)} data-testid="button-live-miss">✗ MISS</Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white h-12 shrink-0"
            onClick={undo} disabled={history.length === 0} data-testid="button-live-undo">Undo</Button>
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 font-bold rounded-xl"
            onClick={() => onDone(made, attempted)} data-testid="button-live-done">
            {attempted === 0 ? "Cancel" : `Done · ${made}/${attempted}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { type ShotRecord as ShotRecordType };
