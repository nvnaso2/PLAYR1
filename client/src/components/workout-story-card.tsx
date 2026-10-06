import type { CSSProperties } from "react";
import { getWorkoutStoryDrillColumns, getWorkoutStoryIdentity, WORKOUT_STORY_SIZE } from "@shared/workout-story-data";
import type { WorkoutShareDrill } from "@shared/workout-story-data";
import { hasMappedWorkoutShotData, WorkoutShootingCourt } from "@/components/shooting-heatmap";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

export type WorkoutStoryData = {
  date: string;
  playerName: string;
  displayName?: string | null;
  positions?: string[];
  teamName?: string | null;
  jerseyNumber?: number | null;
  totalDuration: number;
  drillCount: number;
  totalShotsAttempted: number;
  totalShotsMade: number;
  shootingPct?: number | null;
  drills: WorkoutShareDrill[];
  shotData: Array<{ location: string; made: number; attempted: number }>;
};

type WorkoutStoryCardProps = { data: WorkoutStoryData };

const C = {
  background: "#080808",
  panel: "#111111",
  panelDeep: "#090909",
  orange: "#F36B21",
  orangeLight: "#FF9A55",
  ink: "#F6F1EB",
  secondary: "#BDB8B2",
  quiet: "#817C77",
  line: "rgba(255,255,255,0.13)",
} as const;

const HEAT_COLORS = [
  "#6B0E0E", "#9B1F0A", "#C03410", "#C86020", "#9B7820",
  "#6B7A20", "#3D7A2A", "#2E8E2E", "#1AA81A", "#0DC80D",
];

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function compactDuration(minutes: number) {
  const value = Math.max(0, Math.floor(minutes || 0));
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  if (!hours) return `${value}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function drillDetailParts(drill: WorkoutShareDrill) {
  const parts: string[] = [];
  if (drill.reps != null) parts.push(`${formatMetricValue(drill.reps)} reps`);
  if (drill.sets != null) parts.push(`${formatMetricValue(drill.sets)} sets`);

  const metrics = Array.isArray(drill.metrics) ? drill.metrics : [];
  for (const metric of metrics) {
    const legacyMetric = metric as typeof metric & { name?: string | null; value?: number | string | null };
    const label = metric.label || legacyMetric.name || "Metric";
    const normalizedLabel = label.toLowerCase();
    if (normalizedLabel.includes("score")) continue;
    if (/(shot|attempt|made)/.test(normalizedLabel)) continue;
    if (drill.reps != null && normalizedLabel.includes("rep")) continue;
    if (drill.sets != null && normalizedLabel.includes("set")) continue;
    const rawValues = Array.isArray(metric.values)
      ? metric.values
      : legacyMetric.value != null
        ? [Number(legacyMetric.value)]
        : [];
    const values = rawValues.map(Number).filter(Number.isFinite);
    if (!values.length) continue;

    const isCount = /(rep|count|made|attempt|pass|dribble|set|shot)/.test(`${normalizedLabel} ${metric.unit ?? ""}`.toLowerCase());
    const valueText = isCount && values.length > 1
      ? formatMetricValue(values.reduce((sum, value) => sum + value, 0))
      : values.map(formatMetricValue).join(" / ");
    const unitSuffix = metric.unit && !normalizedLabel.includes(metric.unit.toLowerCase())
      ? ` ${metric.unit}`
      : "";
    parts.push(`${label} ${valueText}${unitSuffix}`);
  }

  return parts;
}

function MetricIcon({ kind }: { kind: "time" | "attempts" | "made" | "accuracy" }) {
  const common = {
    fill: "none",
    stroke: C.orange,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <span style={{
      width: 46,
      height: 46,
      flex: "0 0 46px",
      display: "grid",
      placeItems: "center",
      border: "1px solid rgba(243,107,33,0.34)",
      borderRadius: 9,
      background: "rgba(243,107,33,0.055)",
      boxSizing: "border-box",
    }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="27" height="27" {...common}>
        {kind === "time" && <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.2 2" />
          <path d="M9 2.8h6" />
        </>}
        {kind === "attempts" && <>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.6" />
          <circle cx="12" cy="12" r="1" />
        </>}
        {kind === "made" && <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.1 12.1 2.5 2.5 5.4-5.4" />
        </>}
        {kind === "accuracy" && <>
          <circle cx="7" cy="7" r="2.4" />
          <circle cx="17" cy="17" r="2.4" />
          <path d="m18.3 5.7-12.6 12.6" />
        </>}
      </svg>
    </span>
  );
}

function MetricCard({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: "time" | "attempts" | "made" | "accuracy";
}) {
  return (
    <div style={{
      minWidth: 0,
      boxSizing: "border-box",
      height: "100%",
      padding: "17px 15px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid rgba(255,255,255,0.13)",
      borderRadius: 12,
      background: "#080808",
    }}>
      <div style={{
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}>
        <MetricIcon kind={icon} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: C.quiet,
            fontSize: 11,
            lineHeight: 1.15,
            fontWeight: 850,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>{label}</div>
          <div style={{
            marginTop: 7,
            color: C.ink,
            fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
            fontSize: String(value).length > 8 ? 34 : 42,
            lineHeight: 0.98,
            fontWeight: 950,
            letterSpacing: "-0.025em",
            whiteSpace: "nowrap",
          }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function DrillTile({
  drill,
  index,
  rowCount,
  tileHeight,
}: {
  drill: WorkoutShareDrill;
  index: number;
  rowCount: number;
  tileHeight: number;
}) {
  const dense = rowCount > 8;
  const veryDense = rowCount > 13;
  const shotsAttempted = Number(drill.shotsAttempted) || 0;
  const shotsMade = Number(drill.shotsMade) || 0;
  const hasShots = shotsAttempted > 0;
  const shootingPct = drill.shootingPct ?? (hasShots ? Math.round((shotsMade / shotsAttempted) * 100) : null);
  const details = drillDetailParts(drill);
  const shotSummary = hasShots ? `${shotsMade}/${shotsAttempted} shots${shootingPct === null ? "" : ` · ${shootingPct}%`}` : null;
  const detailSummary = details.join(" · ");
  const roundCount = Math.max(1, Number(drill.roundCount) || 1);
  const duration = Number(drill.duration) || 0;
  const sessionMeta = [
    `${roundCount} ${roundCount === 1 ? "round" : "rounds"}`,
    duration > 0 ? compactDuration(duration) : null,
  ].filter(Boolean).join(" · ");
  const allStats = [
    sessionMeta,
    shotSummary,
    detailSummary,
    !hasShots && !detailSummary ? "No drill stats logged" : null,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{
      width: "100%",
      height: tileHeight,
      boxSizing: "border-box",
      display: "grid",
      gridTemplateColumns: `${veryDense ? 21 : 25}px minmax(0, 1fr)`,
      alignItems: "center",
      gap: veryDense ? 5 : 8,
      padding: veryDense ? "2px 5px" : dense ? "4px 7px" : "6px 9px",
      borderRadius: 6,
      border: "1px solid rgba(255,244,232,0.065)",
      background: index % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.014)",
    }}>
      <span style={{
        color: C.quiet,
        fontFamily: "'Arial Narrow', Impact, sans-serif",
        fontSize: veryDense ? 9 : dense ? 10 : 12,
        fontWeight: 900,
        letterSpacing: "0.035em",
      }}>{String(index + 1).padStart(2, "0")}</span>
      <div style={{
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: veryDense ? 1 : 3,
        overflow: "visible",
      }}>
        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          minWidth: 0,
        }}>
          <div style={{
            minWidth: 0,
            color: C.ink,
            fontSize: veryDense ? 10 : dense ? 11 : 14,
            lineHeight: 1.05,
            fontWeight: 800,
            overflowWrap: "anywhere",
          }}>{drill.title}</div>
        </div>
        <div style={{
          minWidth: 0,
          color: dense ? C.secondary : C.quiet,
          fontSize: veryDense ? 7 : dense ? 8 : 10,
          lineHeight: 1.08,
          fontWeight: 650,
          overflowWrap: "anywhere",
        }}>{allStats || "No drill stats logged"}</div>
      </div>
    </div>
  );
}

function EmptyDrills() {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderTop: `1px solid ${C.line}`,
      color: C.secondary,
      fontSize: 17,
      fontWeight: 600,
    }}>
      <span style={{ color: C.orange, marginRight: 12, fontSize: 13, fontWeight: 900, letterSpacing: "0.15em" }}>
        NO DRILLS LOGGED
      </span>
      Your next session starts here.
    </div>
  );
}

export function WorkoutStoryCard({ data }: WorkoutStoryCardProps) {
  const attempts = Math.max(0, data.totalShotsAttempted);
  const made = Math.max(0, data.totalShotsMade);
  const { name, details: identity } = getWorkoutStoryIdentity(data);
  const hasMappedShotData = hasMappedWorkoutShotData(data.shotData);
  const drillLength = data.drills.length;
  const drillColumns = getWorkoutStoryDrillColumns(data.drills);
  const rowsPerColumn = drillColumns[0].length;
  const drillGridGap = 5;
  const drillSectionChrome = 97;
  const maxDrillSectionHeight = WORKOUT_STORY_SIZE.height - 80 - 64 - 222 - 132 - 40 - 430;
  const preferredTileHeight = rowsPerColumn <= 3 ? 80
    : rowsPerColumn <= 6 ? 64
      : rowsPerColumn <= 9 ? 48
        : rowsPerColumn <= 13 ? 36
          : 30;
  const tileHeight = rowsPerColumn > 0
    ? Math.max(20, Math.min(
      preferredTileHeight,
      Math.floor((maxDrillSectionHeight - drillSectionChrome - drillGridGap * Math.max(0, rowsPerColumn - 1)) / rowsPerColumn),
    ))
    : 0;
  const drillSectionHeight = rowsPerColumn > 0
    ? drillSectionChrome + rowsPerColumn * tileHeight + drillGridGap * Math.max(0, rowsPerColumn - 1)
    : 220;
  const shootingPct = attempts > 0
    ? data.shootingPct ?? Math.round((made / attempts) * 100)
    : null;
  const identityStyle: CSSProperties = {
    color: C.secondary,
    fontSize: 15,
    fontWeight: 750,
    letterSpacing: "0.035em",
  };
  const playerNameSize = (name?.length ?? 0) > 26 ? 44 : (name?.length ?? 0) > 18 ? 54 : 66;

  return (
    <div
      data-workout-story-card
      style={{
        width: WORKOUT_STORY_SIZE.width,
        height: WORKOUT_STORY_SIZE.height,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "42px 54px 38px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        color: C.ink,
        background: `linear-gradient(155deg, #0b0b0b 0%, ${C.background} 48%, #060606 100%)`,
        fontFamily: "'Aptos', 'Trebuchet MS', sans-serif",
        WebkitFontSmoothing: "antialiased",
        textRendering: "geometricPrecision",
      }}
    >
      <div aria-hidden="true" style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        border: "1px solid rgba(255,244,232,0.07)",
        boxShadow: "inset 0 0 0 11px rgba(0,0,0,0.14)",
      }} />

      <header style={{
        flex: "0 0 222px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        paddingBottom: 18,
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 22, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: C.orangeLight,
              fontSize: 16,
              fontWeight: 950,
              letterSpacing: "0.23em",
              textTransform: "uppercase",
            }}>TRAINING SESSION</div>
            <div style={{
              marginTop: 8,
              color: C.ink,
              fontSize: 14,
              fontWeight: 850,
              letterSpacing: "0.19em",
              textTransform: "uppercase",
            }}>Workout recap</div>
          </div>
          <div style={{
            flex: "0 0 auto",
            maxWidth: 380,
            padding: "11px 15px",
            border: "1px solid rgba(255,244,232,0.14)",
            borderRadius: 10,
            background: "rgba(255,255,255,0.035)",
            color: C.secondary,
            fontSize: 13,
            lineHeight: 1.3,
            fontWeight: 650,
            textAlign: "right",
          }}>{formatDate(data.date)}</div>
        </div>

        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <img
            src={playr1Logo}
            alt="PLAYR1 app icon"
            style={{
              width: 132,
              height: 132,
              flex: "0 0 132px",
              objectFit: "contain",
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "#050505",
              boxShadow: "0 14px 28px rgba(0,0,0,0.44), 0 5px 10px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              color: C.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: playerNameSize,
              fontWeight: 950,
              lineHeight: 0.96,
              letterSpacing: "-0.028em",
              textTransform: "uppercase",
              overflowWrap: "anywhere",
            }}>{name || "Workout"}</div>
            {identity.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 10px", marginTop: 11 }}>
                <span style={identityStyle}>{identity.join(" · ")}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <section aria-label="Workout recap stats" style={{
        flex: "0 0 132px",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
        overflow: "visible",
      }}>
        <MetricCard value={compactDuration(data.totalDuration)} label="Time trained" icon="time" />
        <MetricCard value={attempts} label="Shots attempted" icon="attempts" />
        <MetricCard value={made} label="Shots made" icon="made" />
        <MetricCard
          value={shootingPct === null ? "—" : `${shootingPct}%`}
          label="FG%"
          icon="accuracy"
        />
      </section>

      <section aria-label="Completed drills" style={{
        flex: `0 0 ${drillSectionHeight}px`,
        minHeight: 0,
        boxSizing: "border-box",
        padding: "17px 19px 16px",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${C.panel} 0%, ${C.panelDeep} 100%)`,
      }}>
        <div style={{
          flex: "0 0 52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "0 2px 11px",
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div>
            <div style={{
              color: C.orangeLight,
              fontSize: 11,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "0.19em",
              textTransform: "uppercase",
            }}>Session work</div>
            <div style={{
              marginTop: 6,
              color: C.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 26,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "0.005em",
              textTransform: "uppercase",
            }}>Completed drills</div>
          </div>
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: 9,
            color: C.secondary,
            fontSize: 12,
            fontWeight: 750,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            <span style={{
              color: C.orangeLight,
              fontFamily: "'Arial Narrow', Impact, sans-serif",
              fontSize: 31,
              fontWeight: 950,
              letterSpacing: "-0.03em",
            }}>{String(drillLength).padStart(2, "0")}</span>
            {drillLength === 1 ? "drill" : "drills"}
          </div>
        </div>

        {drillLength === 0 ? (
          <EmptyDrills />
        ) : (
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            paddingTop: 10,
          }}>
            {drillColumns.map((column, columnIndex) => (
              <div key={`drill-column-${columnIndex}`} style={{
                minWidth: 0,
                minHeight: 0,
                display: "grid",
                gridTemplateRows: `repeat(${rowsPerColumn}, ${tileHeight}px)`,
                gap: drillGridGap,
              }}>
                {column.map((drill, localIndex) => {
                  const index = columnIndex === 0 ? localIndex : rowsPerColumn + localIndex;
                  return <DrillTile
                    key={drill.id || `${index}-${drill.title || "drill"}`}
                    drill={drill}
                    index={index}
                    rowCount={rowsPerColumn}
                    tileHeight={tileHeight}
                  />;
                })}
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Shot chart" style={{
        flex: "1 1 auto",
        minHeight: 430,
        minWidth: 0,
        boxSizing: "border-box",
        padding: "12px 18px 12px",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
      }}>
        <div style={{
          flex: "0 0 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <div>
            <div style={{
              color: C.orangeLight,
              fontSize: 11,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "0.19em",
              textTransform: "uppercase",
            }}>Accuracy by court zone</div>
            <div style={{
              marginTop: 5,
              color: C.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 28,
              lineHeight: 1,
              fontWeight: 900,
              textTransform: "uppercase",
            }}>Shot chart</div>
          </div>
          <div style={{ color: C.secondary, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Half court
          </div>
        </div>

        <div style={{
          position: "relative",
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          <div style={{
            width: "100%",
            maxWidth: 930,
            aspectRatio: "500 / 470",
            flex: "0 1 auto",
          }}>
            <WorkoutShootingCourt shotData={data.shotData} blendIntoBackground />
          </div>
          {attempts === 0 && (
            <div style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(72%, 540px)",
              padding: "23px 28px",
              border: "1px solid rgba(243,107,33,0.62)",
              borderRadius: 12,
              background: "rgba(17,18,16,0.96)",
              boxShadow: "0 14px 36px rgba(0,0,0,0.44)",
              textAlign: "center",
              boxSizing: "border-box",
            }}>
              <div style={{ color: C.orangeLight, fontSize: 11, fontWeight: 900, letterSpacing: "0.19em" }}>SHOT TRACKING</div>
              <div style={{
                marginTop: 8,
                color: C.ink,
                fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
                fontSize: 26,
                lineHeight: 1.1,
                fontWeight: 900,
                textTransform: "uppercase",
              }}>No shot data logged</div>
              <div style={{ marginTop: 7, color: C.secondary, fontSize: 14, lineHeight: 1.4 }}>
                The court is ready for your next session.
              </div>
            </div>
          )}
          {attempts > 0 && !hasMappedShotData && (
            <div style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(72%, 540px)",
              padding: "23px 28px",
              border: "1px solid rgba(243,107,33,0.56)",
              borderRadius: 12,
              background: "rgba(17,18,16,0.96)",
              textAlign: "center",
              boxSizing: "border-box",
            }}>
              <div style={{ color: C.orangeLight, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em" }}>SHOT LOCATIONS</div>
              <div style={{
                marginTop: 8,
                color: C.ink,
                fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
                fontSize: 24,
                lineHeight: 1.1,
                fontWeight: 900,
                textTransform: "uppercase",
              }}>Locations not recorded</div>
              <div style={{ marginTop: 7, color: C.secondary, fontSize: 14, lineHeight: 1.4 }}>
                Shots were logged, but no mapped court zones are available.
              </div>
            </div>
          )}
        </div>

        <div style={{
          flex: "0 0 31px",
          display: "flex",
          alignItems: "center",
          gap: 13,
          paddingTop: 9,
          borderTop: `1px solid ${C.line}`,
        }}>
          <span style={{ color: C.quiet, fontSize: 10, fontWeight: 850, letterSpacing: "0.1em" }}>LOWER</span>
          <div style={{ flex: 1, display: "flex", height: 8, borderRadius: 5, overflow: "hidden" }}>
            {HEAT_COLORS.map((color) => <span key={color} style={{ flex: 1, background: color }} />)}
          </div>
          <span style={{ color: C.quiet, fontSize: 10, fontWeight: 850, letterSpacing: "0.1em" }}>HIGHER ACCURACY</span>
        </div>
      </section>

      <footer style={{
        flex: "0 0 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${C.line}`,
        color: C.quiet,
      }}>
        <div style={{ fontSize: 11, fontWeight: 750, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          One session at a time.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ color: C.secondary, fontSize: 12, fontWeight: 750, letterSpacing: "0.14em" }}>SESSION COMPLETE</span>
        </div>
      </footer>
    </div>
  );
}
