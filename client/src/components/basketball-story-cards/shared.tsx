import type { CSSProperties, ReactNode } from "react";
import playr1Logo from "@assets/Playr1_App_Logo_1774122925857.png";

export const BASKETBALL_STORY_SIZE = { width: 1080, height: 1920 } as const;

export type BasketballStoryIdentity = {
  displayName?: string | null;
  playerName?: string | null;
  positions?: string[] | null;
  teamName?: string | null;
  jerseyNumber?: number | string | null;
  schoolName?: string | null;
};

export type MaybeNumber = number | null | undefined;

const C = {
  bg: "#090a09",
  panel: "#111311",
  panelDeep: "#0c0e0d",
  orange: "#f36b21",
  orangeLight: "#ff9a55",
  ink: "#f6f1eb",
  secondary: "#bdb8b2",
  quiet: "#817c77",
  line: "rgba(255,244,232,0.13)",
  green: "#91bd83",
  red: "#d77969",
} as const;

export { C as STORY_COLORS };

export function formatStat(value: MaybeNumber, decimals = 1) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  return Number.isInteger(number)
    ? number.toLocaleString("en-US")
    : Number(number.toFixed(decimals)).toLocaleString("en-US");
}

export function formatPct(value: MaybeNumber, made?: MaybeNumber, attempted?: MaybeNumber) {
  let pct = value;
  if (pct == null && made != null && attempted != null && Number(attempted) > 0) {
    pct = (Number(made) / Number(attempted)) * 100;
  }
  return pct == null || !Number.isFinite(Number(pct)) ? "—" : `${formatStat(pct, 1)}%`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function resultTone(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "w" || normalized === "win" || normalized === "won") return C.green;
  if (normalized === "l" || normalized === "loss" || normalized === "lost") return C.red;
  return C.orangeLight;
}

export function StoryFrame({
  type,
  children,
}: {
  type: "CAREER" | "SEASON" | "GAME";
  children: ReactNode;
}) {
  const number = type === "CAREER" ? "01" : type === "SEASON" ? "02" : "03";
  return (
    <div
      data-basketball-story-card={type.toLowerCase()}
      style={{
        width: BASKETBALL_STORY_SIZE.width,
        height: BASKETBALL_STORY_SIZE.height,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
         padding: "45px 54px 38px",
        display: "flex",
        flexDirection: "column",
         gap: 16,
        color: C.ink,
        background: "linear-gradient(155deg, #111210 0%, #090a09 48%, #070807 100%)",
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
      <div aria-hidden="true" style={{
        position: "absolute",
        top: 98,
        right: 40,
        color: "rgba(255,244,232,0.025)",
        fontFamily: "'Arial Narrow', Impact, sans-serif",
        fontSize: 260,
        lineHeight: 0.8,
        fontWeight: 950,
        letterSpacing: "-0.07em",
        pointerEvents: "none",
      }}>{number}</div>
      {children}
    </div>
  );
}

export function StoryBrandHeader({ label }: { label: string }) {
  return (
    <div style={{
      position: "relative",
      zIndex: 1,
       flex: "0 0 76px",
      minWidth: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${C.line}`,
       paddingBottom: 16,
    }}>
       <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <img
          src={playr1Logo}
          alt="PLAYR1"
          crossOrigin="anonymous"
           style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 10, background: "#050605" }}
        />
         <span style={{ color: C.ink, fontSize: 29, fontWeight: 950, letterSpacing: "0.16em" }}>PLAYR1</span>
      </div>
      <div style={{
        color: C.orangeLight,
         fontSize: 31,
        fontWeight: 900,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
}

export function PlayerIdentity({
  identity,
  descriptor,
}: {
  identity: BasketballStoryIdentity;
  descriptor?: string;
}) {
  const name = identity.displayName?.trim() || identity.playerName?.trim() || "";
  const details = [
    identity.jerseyNumber != null && String(identity.jerseyNumber).trim() !== "" ? `#${identity.jerseyNumber}` : null,
    identity.positions?.filter(Boolean).length ? identity.positions.filter(Boolean).join(" / ") : null,
    identity.teamName?.trim() || null,
  ].filter((value): value is string => Boolean(value));
  return (
    <div style={{
      position: "relative",
      zIndex: 1,
      flex: "0 0 auto",
      minHeight: details.length > 0 ? 142 : 108,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      borderBottom: `1px solid ${C.line}`,
      paddingBottom: 16,
    }}>
      {descriptor && <div style={{
        color: C.orangeLight,
        fontSize: 31,
        lineHeight: 1,
        fontWeight: 900,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}>{descriptor}</div>}
      <div style={{
        marginTop: 12,
        color: name ? C.ink : C.secondary,
        fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
         fontSize: !name ? 48 : name.length > 25 ? 48 : name.length > 17 ? 60 : 72,
        lineHeight: 0.98,
        fontWeight: 950,
        letterSpacing: "-0.03em",
        textTransform: "uppercase",
        overflowWrap: "anywhere",
      }}>{name || "NAME NOT RECORDED"}</div>
      {details.length > 0 && <div style={{
        marginTop: 10,
        color: C.secondary,
         fontSize: 38,
         lineHeight: 1.2,
        fontWeight: 750,
        letterSpacing: "0.04em",
      }}>{details.join("  ·  ")}</div>}
    </div>
  );
}

export function StorySectionTitle({ children, detail }: { children: ReactNode; detail?: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
       minHeight: 46,
       paddingBottom: 12,
       marginBottom: 14,
      borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{
        color: C.orangeLight,
         fontSize: 35,
        lineHeight: 1,
        fontWeight: 900,
        letterSpacing: "0.17em",
        textTransform: "uppercase",
      }}>{children}</div>
      {detail && <div style={{
        color: C.quiet,
         fontSize: 29,
        fontWeight: 850,
        letterSpacing: "0.1em",
        textAlign: "right",
        textTransform: "uppercase",
      }}>{detail}</div>}
    </div>
  );
}

export function StoryPanel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section style={{
      position: "relative",
      zIndex: 1,
      boxSizing: "border-box",
       padding: "23px 25px",
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      background: "linear-gradient(140deg, rgba(20,22,19,0.98), rgba(10,12,11,0.98))",
      ...style,
    }}>{children}</section>
  );
}

export function MetricCell({
  label,
  value,
  accent = false,
  detail,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  detail?: string;
}) {
  return (
    <div style={{
      minWidth: 0,
       minHeight: 108,
      boxSizing: "border-box",
       padding: "14px 13px",
      borderLeft: `2px solid ${accent ? C.orange : "rgba(255,244,232,0.11)"}`,
      background: accent ? "rgba(243,107,33,0.07)" : "rgba(255,255,255,0.025)",
    }}>
      <div style={{
        color: C.quiet,
         fontSize: 30,
        lineHeight: 1.15,
        fontWeight: 850,
        letterSpacing: "0.11em",
        textTransform: "uppercase",
      }}>{label}</div>
      <div style={{
        marginTop: 7,
        color: accent ? C.orangeLight : C.ink,
        fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
         fontSize: String(value).length > 8 ? 42 : 49,
        lineHeight: 0.95,
        fontWeight: 950,
        letterSpacing: "-0.025em",
        whiteSpace: "nowrap",
      }}>{value}</div>
       {detail && <div style={{ marginTop: 5, color: C.quiet, fontSize: 29, fontWeight: 700 }}>{detail}</div>}
    </div>
  );
}

export function StoryFooter({ note }: { note: string }) {
  return (
    <footer style={{
      position: "relative",
      zIndex: 1,
       flex: "0 0 42px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      marginTop: "auto",
      borderTop: `1px solid ${C.line}`,
      color: C.quiet,
       fontSize: 28,
      fontWeight: 800,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    }}>
      <span>{note}</span>
      <span style={{ color: C.secondary }}>PLAYR1 · playr1.app</span>
    </footer>
  );
}

export function MadeAttempt({ made, attempted }: { made: MaybeNumber; attempted: MaybeNumber }) {
  if (made == null && attempted == null) return "—";
  return `${formatStat(made, 0)} / ${formatStat(attempted, 0)}`;
}

