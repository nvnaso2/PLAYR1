import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export interface LiveLocation {
  country: string | null;
  city: string | null;
  lat: number;
  lng: number;
  userCount: number;
  eventCount: number;
}

interface Props {
  locations: LiveLocation[];
}

export function LiveWorldMap({ locations }: Props) {
  const [hovered, setHovered] = useState<LiveLocation | null>(null);

  const maxUsers = useMemo(() => {
    return Math.max(1, ...locations.map((l) => l.userCount));
  }, [locations]);

  const totalUsers = useMemo(
    () => locations.reduce((sum, l) => sum + l.userCount, 0),
    [locations],
  );
  const totalCountries = useMemo(
    () => new Set(locations.map((l) => l.country).filter(Boolean)).size,
    [locations],
  );
  const totalEvents = useMemo(
    () => locations.reduce((sum, l) => sum + l.eventCount, 0),
    [locations],
  );
  const topMarket = useMemo(
    () => [...locations].sort((a, b) => b.userCount - a.userCount)[0],
    [locations],
  );
  const topLocationKeys = useMemo(
    () => new Set([...locations].sort((a, b) => b.userCount - a.userCount).slice(0, 2).map((location) => `${location.lat}-${location.lng}`)),
    [locations],
  );

  const intensityLabel = hovered
    ? hovered.userCount / maxUsers >= 0.75
      ? "High activity"
      : hovered.userCount / maxUsers >= 0.4
        ? "Medium activity"
        : "Low activity"
    : "";

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#111a20] shadow-[0_20px_60px_rgba(2,8,12,0.28)]"
      data-testid="live-world-map"
    >
      <style>{`
        @keyframes playr1-map-marker-in {
          0% { opacity: 0; transform: scale(.35); }
          70% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes playr1-map-pulse {
          0%, 100% { opacity: .15; transform: scale(.75); }
          50% { opacity: .48; transform: scale(1.65); }
        }
        @media (prefers-reduced-motion: reduce) {
          .playr1-map-marker, .playr1-map-pulse { animation: none !important; }
        }
      `}</style>
      <div className="border-b border-slate-700/70 bg-[#172228] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300/80">Live network</p>
            <h4 className="mt-1 text-xl font-bold tracking-tight text-white">Global activity</h4>
            <p className="mt-1 text-xs text-slate-400">Active users and event signals from the last 60 minutes.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-300" />
            </span>
            Live
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {[
            { label: "Active users", value: totalUsers, accent: "text-orange-200" },
            { label: "Events", value: totalEvents, accent: "text-sky-200" },
            { label: "Countries online", value: totalCountries, accent: "text-emerald-200" },
            { label: "Top market", value: topMarket?.city || topMarket?.country || "—", accent: "text-violet-200" },
          ].map((metric) => (
            <div key={metric.label} className="min-w-[128px] flex-1 rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
              <p className={`mt-1 truncate text-lg font-black tracking-tight ${metric.accent}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div
        className="relative bg-[#101b21]"
        style={{
          aspectRatio: "2 / 1",
          backgroundImage: "linear-gradient(rgba(125,154,163,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(125,154,163,.045) 1px, transparent 1px), radial-gradient(circle at 50% 35%, rgba(242,107,56,.08), transparent 48%)",
          backgroundSize: "42px 42px, 42px 42px, auto",
        }}
      >
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 155 }}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#253238"
                  stroke="#52636a"
                  strokeOpacity={0.6}
                  strokeWidth={0.35}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#304148" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {locations.map((loc, i) => {
            const intensity = Math.min(1, loc.userCount / maxUsers);
            const radius = 3 + intensity * 6;
            return (
              <Marker
                key={`${loc.lat}-${loc.lng}-${i}`}
                coordinates={[loc.lng, loc.lat]}
                onMouseEnter={() => setHovered(loc)}
                onMouseLeave={() => setHovered((h) => (h === loc ? null : h))}
                data-testid={`live-map-dot-${i}`}
                style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: {} }}
              >
                {topLocationKeys.has(`${loc.lat}-${loc.lng}`) && (
                  <circle
                    className="playr1-map-pulse"
                    r={radius + 8}
                    fill="none"
                    stroke="#f6b36b"
                    strokeWidth={1}
                    style={{ animation: `playr1-map-pulse 2.8s ease-in-out ${i * 120}ms infinite` }}
                    pointerEvents="none"
                  />
                )}
                <circle
                  r={radius + 4}
                  fill="#f26b38"
                  fillOpacity={0.12}
                  pointerEvents="none"
                />
                <circle
                  className="playr1-map-marker"
                  r={radius}
                  fill="#f26b38"
                  fillOpacity={0.52 + intensity * 0.48}
                  stroke="#ffe0bd"
                  strokeWidth={0.7}
                  style={{ transformOrigin: "center", animation: `playr1-map-marker-in 500ms ease-out ${Math.min(i * 55, 700)}ms both` }}
                >
                  <title>
                    {[loc.city, loc.country].filter(Boolean).join(", ") || "Unknown location"}
                    {" — "}
                    {loc.userCount} {loc.userCount === 1 ? "user" : "users"}, {loc.eventCount}{" "}
                    {loc.eventCount === 1 ? "event" : "events"}
                  </title>
                </circle>
              </Marker>
            );
          })}
        </ComposableMap>
        {locations.length === 0 && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            data-testid="live-world-map-empty"
          >
            <div className="rounded-2xl border border-orange-300/20 bg-[#172228]/90 px-5 py-4 text-center shadow-xl backdrop-blur">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-orange-300/30 text-orange-200">⌁</div>
              <p className="mt-2 text-sm font-semibold text-white">No located activity</p>
              <p className="mt-1 text-xs text-slate-400">The network is quiet in this window.</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-3 rounded-xl border border-slate-600/60 bg-[#172228]/85 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-slate-400 backdrop-blur">
          <p className="mb-1 font-bold text-slate-300">Activity</p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-300/50" />
            <span className="h-2 w-2 rounded-full bg-orange-300/75" />
            <span className="h-2.5 w-2.5 rounded-full bg-orange-300" />
            <span>Less</span><span className="text-slate-600">/</span><span>More</span>
          </div>
        </div>
        {hovered && (
          <div
            className="pointer-events-none absolute bottom-3 right-3 min-w-[190px] max-w-[calc(100%-1.5rem)] rounded-xl border border-orange-300/25 bg-[#172228]/95 px-3.5 py-3 text-xs shadow-2xl backdrop-blur"
            data-testid="live-map-hover-label"
            aria-live="polite"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-orange-300">Location readout</p>
            <p className="mt-1 text-sm font-bold text-white">
              {[hovered.city, hovered.country].filter(Boolean).join(", ") || "Unknown location"}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-700/70 pt-2">
              <div><p className="text-[9px] uppercase tracking-wider text-slate-500">Active users</p><p className="mt-0.5 font-bold text-orange-200">{hovered.userCount}</p></div>
              <div><p className="text-[9px] uppercase tracking-wider text-slate-500">Events</p><p className="mt-0.5 font-bold text-sky-200">{hovered.eventCount}</p></div>
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{intensityLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
