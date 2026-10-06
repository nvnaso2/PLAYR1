import type { CSSProperties } from "react";
import { Activity, Clock3, Flame, Target } from "lucide-react";
import { hasMappedWorkoutShotData, SHOT_HEAT_COLOR_BANDS, WorkoutShootingCourt } from "@/components/shooting-heatmap";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

export type DashboardStoryPeriod = "daily" | "weekly" | "monthly" | "annual";
export const DASHBOARD_STORY_SIZE = { width: 1080, height: 1920 } as const;

export type DashboardStoryData = {
  period: DashboardStoryPeriod;
  overview: {
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  };
  trainingStats: Record<string, number>;
  shots: Array<{ location: string; made: number; missed: number }>;
  categories: Array<{ category: string; minutes: number; sessions: number }>;
  playerName?: string | null;
  displayName?: string | null;
  positions?: string[];
  teamName?: string | null;
  jerseyNumber?: number | null;
};

type DashboardStoryCardProps = { data: DashboardStoryData };

const PERIOD_LABELS: Record<DashboardStoryPeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  annual: "This Year",
};

const COLORS = {
  background: "#080808",
  panel: "#111111",
  orange: "#F36B21",
  orangeLight: "#FF9A55",
  ink: "#F6F1EB",
  secondary: "#BDB8B2",
  quiet: "#817C77",
  line: "rgba(255,255,255,0.13)",
};

const TRAINING_LABELS: Record<string, string> = {
  totalShotsMade: "Total Shots Made",
  threePointersMade: "3-Pointers Made",
  freeThrowsMade: "Free Throws Made",
  fieldGoalsMade: "Field Goals Made",
  formShotsMade: "Form Shots Made",
  layupsMade: "Layups Made",
  timeBallHandling: "Ball Handling",
  leftHandBallHandling: "Left-Hand Handling",
  rightHandBallHandling: "Right-Hand Handling",
  passesMade: "Passes Made",
  fgPct: "Field Goal %",
};

const CATEGORY_LABELS: Record<string, string> = {
  "ball-handling": "Ball Handling",
  shooting: "Shooting",
  passing: "Passing",
  finishing: "Finishing",
  defense: "Defense",
  "film-session": "Film Session",
  workouts: "Workouts",
  "basketball-iq": "Basketball IQ",
};

function humanizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactMinutes(value: number) {
  const minutes = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function metricValue(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(1)).toLocaleString();
}

function dateRange(period: DashboardStoryPeriod) {
  const now = new Date();
  const start = new Date(now);
  if (period === "daily") start.setHours(0, 0, 0, 0);
  if (period === "weekly") start.setDate(start.getDate() - 7);
  if (period === "monthly") start.setMonth(start.getMonth() - 1);
  if (period === "annual") start.setFullYear(start.getFullYear() - 1);
  if (period !== "daily") start.setHours(0, 0, 0, 0);
  const format = (date: Date) => date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: start.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
  return `${format(start)} – ${format(now)}`;
}

const sectionTitle: CSSProperties = {
  color: COLORS.orangeLight,
  fontSize: 13,
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: "0.17em",
  textTransform: "uppercase",
};

function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div style={{
      minHeight: 38,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderBottom: `1px solid ${COLORS.line}`,
      paddingBottom: 10,
      marginBottom: 10,
    }}>
      <div style={sectionTitle}>{title}</div>
      {detail && <div style={{
        color: COLORS.quiet,
        fontSize: 11,
        lineHeight: 1.2,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        textAlign: "right",
      }}>{detail}</div>}
    </div>
  );
}

function OverviewTile({ label, value, icon }: { label: string; value: string | number; icon: "drills" | "time" | "streak" }) {
  const Icon = icon === "drills" ? Target : icon === "time" ? Clock3 : Flame;
  return (
    <div style={{
      minWidth: 0,
      boxSizing: "border-box",
      padding: "14px 16px",
      borderRadius: 10,
      border: `1px solid ${COLORS.line}`,
      background: "linear-gradient(145deg, #131313, #090909)",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{
        width: 42,
        height: 42,
        flex: "0 0 42px",
        display: "grid",
        placeItems: "center",
        borderRadius: 9,
        color: COLORS.orange,
        border: "1px solid rgba(243,107,33,0.34)",
        background: "rgba(243,107,33,0.06)",
      }}><Icon size={23} strokeWidth={1.8} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          color: COLORS.quiet,
          fontSize: 10,
          lineHeight: 1.1,
          fontWeight: 850,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>{label}</div>
        <div style={{
          marginTop: 6,
          color: COLORS.ink,
          fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
          fontSize: String(value).length > 7 ? 29 : 36,
          lineHeight: 0.98,
          fontWeight: 950,
          letterSpacing: "-0.025em",
          whiteSpace: "nowrap",
        }}>{value}</div>
      </div>
    </div>
  );
}

export function DashboardStoryCard({ data }: DashboardStoryCardProps) {
  const displayName = data.displayName?.trim() || data.playerName?.trim() || "Player";
  const identityDetails = [
    data.jerseyNumber != null ? `#${data.jerseyNumber}` : null,
    data.positions?.length ? data.positions.join(" / ") : null,
    data.teamName?.trim() || null,
  ].filter((value): value is string => Boolean(value));
  const trainingMetrics = Object.entries(data.trainingStats || {})
    .filter(([key, value]) => key !== "conditioningTime" && Number.isFinite(Number(value)) && Number(value) > 0)
    .map(([key, value]) => ({
      label: TRAINING_LABELS[key] || humanizeKey(key),
      value: key.toLowerCase().includes("pct") ? `${metricValue(Number(value))}%` : metricValue(Number(value)),
    }));
  const categories = (data.categories || []).filter((item) => Number(item.minutes) > 0 || Number(item.sessions) > 0);
  const courtData = (data.shots || []).map((shot) => ({
    location: shot.location,
    made: Number(shot.made) || 0,
    attempted: (Number(shot.made) || 0) + (Number(shot.missed) || 0),
  }));
  const attempts = courtData.reduce((total, shot) => total + shot.attempted, 0);
  const hasMappedShots = hasMappedWorkoutShotData(courtData);

  return (
    <div
      data-dashboard-story-card
      style={{
        width: DASHBOARD_STORY_SIZE.width,
        height: DASHBOARD_STORY_SIZE.height,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "42px 50px 34px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        color: COLORS.ink,
        background: "linear-gradient(155deg, #10100f 0%, #080808 48%, #060606 100%)",
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
        flex: "0 0 240px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
        paddingBottom: 18,
        borderBottom: `1px solid ${COLORS.line}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ ...sectionTitle, fontSize: 15 }}>Player Dashboard</div>
            <div style={{
              marginTop: 10,
              color: COLORS.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 60,
              lineHeight: 0.96,
              fontWeight: 950,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
            }}>{PERIOD_LABELS[data.period]}</div>
          </div>
          <div style={{
            flex: "0 0 auto",
            padding: "10px 14px",
            borderRadius: 9,
            border: `1px solid ${COLORS.line}`,
            background: "rgba(255,255,255,0.035)",
            color: COLORS.secondary,
            fontSize: 14,
            fontWeight: 750,
            letterSpacing: "0.04em",
          }}>{dateRange(data.period)}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22, minWidth: 0 }}>
          <img
            src={playr1Logo}
            alt="PLAYR1 app icon"
            style={{
              width: 116,
              height: 116,
              flex: "0 0 116px",
              objectFit: "contain",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "#050505",
              boxShadow: "0 14px 28px rgba(0,0,0,0.44), 0 5px 10px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              color: COLORS.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: displayName.length > 24 ? 42 : displayName.length > 17 ? 51 : 62,
              lineHeight: 0.98,
              fontWeight: 950,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              overflowWrap: "anywhere",
            }}>{displayName}</div>
            {identityDetails.length > 0 && <div style={{
              marginTop: 9,
              color: COLORS.secondary,
              fontSize: 14,
              lineHeight: 1.25,
              fontWeight: 750,
              letterSpacing: "0.06em",
            }}>{identityDetails.join(" · ")}</div>}
            <div style={{
              marginTop: identityDetails.length ? 5 : 9,
              color: COLORS.quiet,
              fontSize: 12,
              fontWeight: 850,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}>Training report · PLAYR1</div>
          </div>
        </div>
      </header>

      <section aria-label="Dashboard summary" style={{
        flex: "0 0 114px",
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
      }}>
        <OverviewTile icon="drills" label="Drills" value={Number(data.overview.totalSessions || 0).toLocaleString()} />
        <OverviewTile icon="time" label="Time trained" value={compactMinutes(data.overview.totalMinutes)} />
        <OverviewTile icon="streak" label="Day streak" value={Number(data.overview.streak || 0).toLocaleString()} />
      </section>

      <section aria-label="Training metrics" style={{
        flex: `0 0 ${Math.max(208, 81 + Math.ceil(trainingMetrics.length / 4) * 42)}px`,
        minHeight: 0,
        boxSizing: "border-box",
        padding: "14px 17px",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${COLORS.panel}, #090909)`,
        overflow: "hidden",
      }}>
        <SectionHeading title="Training Metrics" detail={`${trainingMetrics.length} tracked`} />
        {trainingMetrics.length ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "5px 10px",
          }}>
            {trainingMetrics.map((metric) => <div key={metric.label} style={{
              minWidth: 0,
              minHeight: 37,
              padding: "5px 7px",
              boxSizing: "border-box",
              borderRadius: 6,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                color: COLORS.quiet,
                fontSize: 9,
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: "0.045em",
                textTransform: "uppercase",
                overflowWrap: "anywhere",
              }}>{metric.label}</div>
              <div style={{
                marginTop: 4,
                color: COLORS.ink,
                fontSize: 16,
                lineHeight: 1,
                fontWeight: 900,
              }}>{metric.value}</div>
            </div>)}
          </div>
        ) : (
          <div style={{ color: COLORS.secondary, fontSize: 15, lineHeight: 1.35, padding: "16px 2px" }}>
            No training metrics recorded for this period.
          </div>
        )}
      </section>

      <section aria-label="Time by category" style={{
        flex: "0 0 auto",
        minHeight: 160,
        boxSizing: "border-box",
        padding: "13px 17px",
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${COLORS.panel}, #090909)`,
        overflow: "hidden",
      }}>
        <SectionHeading title="Time by Category" detail={categories.length ? `${categories.length} categories` : undefined} />
        {categories.length ? <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "8px 18px",
        }}>
          {categories.map((item, index) => <div key={`${item.category}-${index}`} style={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            minHeight: 28,
            borderBottom: "1px solid rgba(255,255,255,0.055)",
          }}>
            <span style={{ minWidth: 0, color: COLORS.secondary, fontSize: 12, fontWeight: 750, overflowWrap: "anywhere" }}>
              {CATEGORY_LABELS[item.category] || humanizeKey(item.category)}
            </span>
            <span style={{ color: COLORS.ink, fontSize: 12, fontWeight: 850, whiteSpace: "nowrap" }}>
              {compactMinutes(Number(item.minutes) || 0)} · {Number(item.sessions) || 0} drills
            </span>
          </div>)}
        </div> : <div style={{ color: COLORS.secondary, fontSize: 14, padding: "12px 2px" }}>
          No category time logged for this period.
        </div>}
      </section>

      <section aria-label="Shooting court" style={{
        flex: "1 1 auto",
        minHeight: 430,
        minWidth: 0,
        boxSizing: "border-box",
        padding: "12px 18px",
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
              color: COLORS.orangeLight,
              fontSize: 11,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "0.19em",
              textTransform: "uppercase",
            }}>Accuracy by court zone</div>
            <div style={{
              marginTop: 5,
              color: COLORS.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 28,
              lineHeight: 1,
              fontWeight: 900,
              textTransform: "uppercase",
            }}>Shot chart</div>
          </div>
          <div style={{ color: COLORS.secondary, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "right" }}>
            Half court{attempts > 0 ? ` · ${attempts.toLocaleString()} attempts` : ""}
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
            <WorkoutShootingCourt shotData={courtData} blendIntoBackground />
          </div>
          {(attempts === 0 || !hasMappedShots) && <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(72%, 540px)",
            padding: "23px 28px",
            boxSizing: "border-box",
            border: "1px solid rgba(243,107,33,0.56)",
            borderRadius: 12,
            background: "rgba(17,18,16,0.96)",
            boxShadow: "0 14px 36px rgba(0,0,0,0.44)",
            textAlign: "center",
          }}>
            <div style={{ color: COLORS.orangeLight, fontSize: 11, fontWeight: 900, letterSpacing: "0.19em" }}>
              {attempts === 0 ? "SHOT TRACKING" : "SHOT LOCATIONS"}
            </div>
            <div style={{
              marginTop: 8,
              color: COLORS.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 26,
              lineHeight: 1.1,
              fontWeight: 900,
              textTransform: "uppercase",
            }}>{attempts === 0 ? "No shot data logged" : "Locations not recorded"}</div>
            <div style={{ marginTop: 7, color: COLORS.secondary, fontSize: 14, lineHeight: 1.4 }}>
              {attempts === 0
                ? "The court is ready for your next session."
                : "Shots were logged, but no mapped court zones are available."}
            </div>
          </div>}
        </div>
        <div
          role="img"
          aria-label="Field goal percentage color scale from low to high"
          style={{
            flex: "0 0 34px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 4px",
          }}
        >
          <span style={{
            flex: "0 0 auto",
            color: COLORS.quiet,
            fontSize: 10,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>FG%</span>
          <span style={{
            flex: "0 0 auto",
            color: COLORS.secondary,
            fontSize: 10,
            lineHeight: 1,
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>Low</span>
          <div style={{
            height: 10,
            flex: "1 1 auto",
            minWidth: 80,
            display: "flex",
            overflow: "hidden",
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.16)",
          }}>
            {SHOT_HEAT_COLOR_BANDS.map((band) => (
              <span
                key={band.label}
                title={band.label}
                style={{ flex: "1 1 0", background: band.color }}
              />
            ))}
          </div>
          <span style={{
            flex: "0 0 auto",
            color: COLORS.secondary,
            fontSize: 10,
            lineHeight: 1,
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>High</span>
        </div>
      </section>

      <footer style={{
        flex: "0 0 38px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${COLORS.line}`,
        color: COLORS.quiet,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Progress is built one session at a time.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.secondary, fontSize: 11, fontWeight: 850, letterSpacing: "0.13em" }}>
          <Activity size={15} color={COLORS.orange} /> PLAYR1
        </div>
      </footer>
    </div>
  );
}
