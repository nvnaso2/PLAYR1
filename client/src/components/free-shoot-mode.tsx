import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, Timer, Circle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

type ZoneDef = { cx: number; cy: number; rx: number; ry: number; label: string; is3pt?: boolean };

const ZONE_DEFS: Record<string, ZoneDef> = {
  "top-of-key":      { cx: 250, cy: 40,  rx: 80, ry: 26, label: "Top of Key",    is3pt: true },
  "wing-left":       { cx: 52,  cy: 130, rx: 28, ry: 42, label: "Wing Left",     is3pt: true },
  "wing-right":      { cx: 448, cy: 130, rx: 28, ry: 42, label: "Wing Right",    is3pt: true },
  "corner-left":     { cx: 17,  cy: 375, rx: 12, ry: 52, label: "Corner Left",   is3pt: true },
  "corner-right":    { cx: 483, cy: 375, rx: 12, ry: 52, label: "Corner Right",  is3pt: true },
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
  "block-left":      { cx: 163, cy: 382, rx: 30, ry: 20, label: "Block Left"       },
  "block-right":     { cx: 337, cy: 382, rx: 30, ry: 20, label: "Block Right"      },
  "floaters":        { cx: 250, cy: 293, rx: 80, ry: 48, label: "Floaters"         },
  "post-shots":      { cx: 250, cy: 388, rx: 40, ry: 48, label: "Post Shots"       },
  "left-hand-layup": { cx: 195, cy: 415, rx: 26, ry: 18, label: "Left Layup"       },
  "right-hand-layup":{ cx: 305, cy: 415, rx: 26, ry: 18, label: "Right Layup"      },
};

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

type ShotRecord = { made: number; missed: number };

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
      <image
        href={playr1Logo}
        x="175" y="378" width="150" height="150"
        clipPath="url(#fsLogoClip)"
        preserveAspectRatio="xMidYMid meet"
      />

      {Object.entries(ZONE_DEFS).map(([name, zone]) => {
        const data = shots[name];
        const total = data ? data.made + data.missed : 0;
        const pct = total > 0 ? Math.round((data.made / total) * 100) : 0;
        const fill = total > 0 ? zoneColor(pct) : "#1a1a2e";
        const isActive = activeZone === name;
        const touchRx = Math.max(zone.rx, 22);
        const touchRy = Math.max(zone.ry, 22);

        return (
          <g
            key={name}
            onClick={() => onZoneClick(name)}
            style={{ cursor: "pointer" }}
            data-testid={`zone-${name}`}
          >
            <ellipse cx={zone.cx} cy={zone.cy} rx={touchRx} ry={touchRy} fill="transparent" />
            <ellipse
              cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry}
              fill={fill}
              opacity={total > 0 ? 0.92 : 0.78}
              stroke={isActive ? "#F97316" : (total > 0 ? fill : "white")}
              strokeWidth={isActive ? 3.5 : 0.6}
              strokeOpacity={isActive ? 1 : 0.3}
            />
            {total > 0 && zone.rx >= 26 && (
              <text
                x={zone.cx} y={zone.cy - (zone.ry >= 22 ? 4 : 0)}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={zone.rx >= 40 ? "11" : "9"} fontWeight="700"
                stroke="rgba(0,0,0,0.55)" strokeWidth="2.5" paintOrder="stroke"
              >
                {pct}%
              </text>
            )}
            {total > 0 && zone.rx >= 30 && zone.ry >= 20 && (
              <text
                x={zone.cx} y={zone.cy + (zone.ry >= 22 ? 9 : 4)}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="8" fontWeight="500"
                stroke="rgba(0,0,0,0.4)" strokeWidth="2" paintOrder="stroke"
              >
                {data.made}/{total}
              </text>
            )}
            {total > 0 && zone.rx < 26 && (
              <text
                x={zone.cx} y={zone.cy}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="8" fontWeight="700"
                stroke="rgba(0,0,0,0.5)" strokeWidth="2" paintOrder="stroke"
              >
                {data.made}/{total}
              </text>
            )}
          </g>
        );
      })}

      {/* Court lines on top */}
      <rect x="5" y="5" width="490" height="460" fill="none" stroke="white" strokeWidth="2.5" />
      <line x1="5" y1="5" x2="495" y2="5" stroke="white" strokeWidth="2" />
      <line x1="5" y1="435" x2="495" y2="435" stroke="white" strokeWidth="2" />
      <path d="M 30 435 L 30 285 Q 30 100, 250 70 Q 470 100, 470 285 L 470 435" fill="none" stroke="white" strokeWidth="2" />
      <rect x="170" y="245" width="160" height="190" fill="none" stroke="white" strokeWidth="2" />
      <path d="M 170 245 A 80 80 0 0 1 330 245" fill="none" stroke="white" strokeWidth="2" />
      <path d="M 330 245 A 80 80 0 0 1 170 245" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="8,6" />
      <path d="M 210 435 A 40 40 0 0 1 290 435" fill="none" stroke="white" strokeWidth="1.5" />
      <rect x="220" y="420" width="60" height="4" fill="white" />
      <circle cx="250" cy="405" r="9" fill="none" stroke="#E55039" strokeWidth="2.5" />
      <rect x="151" y="311" width="19" height="8" fill="white" />
      <rect x="330" y="311" width="19" height="8" fill="white" />
      <rect x="151" y="343" width="19" height="8" fill="white" />
      <rect x="330" y="343" width="19" height="8" fill="white" />
      <rect x="151" y="373" width="19" height="8" fill="white" />
      <rect x="330" y="373" width="19" height="8" fill="white" />
    </svg>
  );
}

// ── Free Shoot Mode ────────────────────────────────────────────────────────────

type FreeShotModeProps = {
  onClose: () => void;
  drillId?: string;
  drillTitle?: string;
};

export function FreeShotMode({ onClose, drillId, drillTitle }: FreeShotModeProps) {
  const [shots, setShots] = useState<Record<string, ShotRecord>>({});
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
      queryClient.invalidateQueries({ queryKey: ["/api/training-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      toast({
        title: "Session saved!",
        description: `${totalMade}/${totalAttempted} (${totalPct}%)`,
      });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const activeZoneDef = activeZone ? ZONE_DEFS[activeZone] : null;
  const currentZoneShots = activeZone ? shots[activeZone] : null;
  const currentZoneTotal = currentZoneShots ? currentZoneShots.made + currentZoneShots.missed : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <Button
          variant="ghost" size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={onClose}
          data-testid="button-close-free-shoot"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mb-0.5">
            {drillTitle || "Free Shoot"}
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
          <InteractiveCourtSVG
            shots={shots}
            onZoneClick={setActiveZone}
            activeZone={activeZone}
          />
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
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-zinc-500"
              onClick={() => setActiveZone(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-[72px] text-2xl font-black bg-green-600 hover:bg-green-500 active:scale-95 transition-transform text-white rounded-xl"
              onClick={() => addShot(true)}
              data-testid="button-made-shot"
            >
              ✓ MADE
            </Button>
            <Button
              className="h-[72px] text-2xl font-black bg-red-800 hover:bg-red-700 active:scale-95 transition-transform text-white rounded-xl"
              onClick={() => addShot(false)}
              data-testid="button-missed-shot"
            >
              ✗ MISS
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-4 pb-6 pt-3 bg-zinc-950 border-t border-zinc-800">
          {totalAttempted === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-1">
              Tap any zone on the court to log a shot
            </p>
          ) : (
            <div className="flex gap-3">
              {history.length > 0 && (
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400 hover:text-white h-12 shrink-0"
                  onClick={undo}
                  data-testid="button-undo-shot"
                >
                  Undo
                </Button>
              )}
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-bold rounded-xl"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-free-shoot"
              >
                {saveMutation.isPending
                  ? "Saving…"
                  : `Save · ${totalMade}/${totalAttempted} (${totalPct}%)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live Shot Counter ─────────────────────────────────────────────────────────
// Used within a drill entry for "Record Your Shooting" — tracks one location

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

  const label =
    locationLabel ||
    ZONE_DEFS[location]?.label ||
    location.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between">
        <div className="w-8" />
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Recording</div>
          <div className="text-xl font-bold text-white">{label}</div>
        </div>
        <Button
          variant="ghost" size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={onClose}
          data-testid="button-close-live-counter"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Big counter */}
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

        {attempted > 0 && (
          <div className={`text-3xl font-black mt-2 ${pctColor}`}>{pct}%</div>
        )}

        {attempted > 0 && (
          <div className="flex gap-6 text-sm text-zinc-500 mt-1">
            <span>{made} made</span>
            <span>{missed} missed</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-20 text-2xl font-black bg-green-600 hover:bg-green-500 active:scale-95 transition-transform text-white rounded-xl"
            onClick={() => addShot(true)}
            data-testid="button-live-made"
          >
            ✓ MADE
          </Button>
          <Button
            className="h-20 text-2xl font-black bg-red-800 hover:bg-red-700 active:scale-95 transition-transform text-white rounded-xl"
            onClick={() => addShot(false)}
            data-testid="button-live-miss"
          >
            ✗ MISS
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-400 hover:text-white h-12 shrink-0"
            onClick={undo}
            disabled={history.length === 0}
            data-testid="button-live-undo"
          >
            Undo
          </Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 font-bold rounded-xl"
            onClick={() => onDone(made, attempted)}
            data-testid="button-live-done"
          >
            {attempted === 0 ? "Cancel" : `Done · ${made}/${attempted}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ZONE_DEFS };
export type { ShotRecord };
