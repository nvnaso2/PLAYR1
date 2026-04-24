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

  return (
    <div className="rounded-md border bg-card overflow-hidden" data-testid="live-world-map">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h4 className="text-sm font-semibold">Active users worldwide (60 min)</h4>
          <p className="text-xs text-muted-foreground">
            {totalUsers} {totalUsers === 1 ? "user" : "users"} across {totalCountries}{" "}
            {totalCountries === 1 ? "country" : "countries"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="h-2 w-2 rounded-full bg-orange-500/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-orange-500/60" />
          <div className="h-3 w-3 rounded-full bg-orange-500/80" />
          <div className="h-3.5 w-3.5 rounded-full bg-orange-500" />
          <span>More</span>
        </div>
      </div>
      <div className="relative bg-muted/20" style={{ aspectRatio: "2 / 1" }}>
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
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "hsl(var(--muted-foreground) / 0.2)" },
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
                <circle
                  r={radius + 4}
                  fill="hsl(24 95% 53%)"
                  fillOpacity={0.15}
                  pointerEvents="none"
                />
                <circle
                  r={radius}
                  fill="hsl(24 95% 53%)"
                  fillOpacity={0.4 + intensity * 0.6}
                  stroke="white"
                  strokeWidth={0.6}
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
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            data-testid="live-world-map-empty"
          >
            <p className="text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1.5 rounded">
              No located activity in the last 60 minutes yet
            </p>
          </div>
        )}
        {hovered && (
          <div
            className="absolute top-2 left-2 bg-background/95 backdrop-blur border rounded-md px-3 py-2 shadow-lg pointer-events-none text-xs space-y-0.5 max-w-xs"
            data-testid="live-map-hover-label"
          >
            <p className="font-semibold text-sm">
              {[hovered.city, hovered.country].filter(Boolean).join(", ") || "Unknown location"}
            </p>
            <p className="text-muted-foreground">
              <span className="text-orange-500 font-medium">{hovered.userCount}</span>{" "}
              {hovered.userCount === 1 ? "active user" : "active users"} ·{" "}
              <span className="font-medium">{hovered.eventCount}</span>{" "}
              {hovered.eventCount === 1 ? "event" : "events"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
