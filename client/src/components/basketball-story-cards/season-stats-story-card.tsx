import {
  formatPct,
  formatStat,
  PlayerIdentity,
  StoryBrandHeader,
  StoryFooter,
  StoryFrame,
  StoryPanel,
  StorySectionTitle,
  MetricCell,
  MadeAttempt,
  type BasketballStoryIdentity,
  type MaybeNumber,
  STORY_COLORS,
} from "./shared";
import { fitStoryFontSize } from "./story-layout";

export type SeasonStatsStoryData = BasketballStoryIdentity & {
  seasonName?: string | null;
  seasonYear?: string | number | null;
  gamesPlayed?: MaybeNumber;
  wins?: MaybeNumber;
  losses?: MaybeNumber;
  record?: string | null;
  ppg?: MaybeNumber;
  rpg?: MaybeNumber;
  apg?: MaybeNumber;
  spg?: MaybeNumber;
  bpg?: MaybeNumber;
  fgPct?: MaybeNumber;
  threePct?: MaybeNumber;
  ftPct?: MaybeNumber;
  totalFgM?: MaybeNumber;
  totalFgA?: MaybeNumber;
  total3PM?: MaybeNumber;
  total3PA?: MaybeNumber;
  totalFtM?: MaybeNumber;
  totalFtA?: MaybeNumber;
  totalPts?: MaybeNumber;
  totalReb?: MaybeNumber;
  totalAst?: MaybeNumber;
  totalStl?: MaybeNumber;
  totalBlk?: MaybeNumber;
  topGame?: {
    points?: MaybeNumber;
    rebounds?: MaybeNumber;
    assists?: MaybeNumber;
    steals?: MaybeNumber;
    blocks?: MaybeNumber;
    date?: string | null;
    opponent?: string | null;
    result?: string | null;
  } | null;
};

export function SeasonStatsStoryCard({ data }: { data: SeasonStatsStoryData }) {
  const C = STORY_COLORS;
  const seasonHeading = [data.seasonName?.trim(), data.seasonYear != null ? String(data.seasonYear).trim() : null]
    .filter(Boolean)
    .join(" · ") || "SEASON NOT RECORDED";
  const seasonTotals = [
    { label: "Points", value: data.totalPts },
    { label: "Rebounds", value: data.totalReb },
    { label: "Assists", value: data.totalAst },
    { label: "Steals", value: data.totalStl },
    { label: "Blocks", value: data.totalBlk },
  ];
  const shooting = [
    { label: "FG%", pct: data.fgPct, made: data.totalFgM, attempted: data.totalFgA },
    { label: "3PT%", pct: data.threePct, made: data.total3PM, attempted: data.total3PA },
    { label: "FT%", pct: data.ftPct, made: data.totalFtM, attempted: data.totalFtA },
  ];
  const record = data.record?.trim() || (
    data.wins != null || data.losses != null
      ? `${formatStat(data.wins, 0)}–${formatStat(data.losses, 0)}`
      : "—"
  );

  return (
    <StoryFrame type="SEASON">
      <StoryBrandHeader label="Season in review" />
      <PlayerIdentity identity={data} />

      <section style={{
        position: "relative",
        zIndex: 1,
        flex: "1 1 280px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "25px 30px",
        borderLeft: "4px solid #f36b21",
        background: "linear-gradient(100deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018) 62%, transparent)",
      }}>
        <div>
          <div style={{ color: C.quiet, fontSize: 32, fontWeight: 900, letterSpacing: "0.19em", textTransform: "uppercase" }}>Selected</div>
          <div style={{
            marginTop: 12,
            fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
            color: C.ink,
            fontSize: seasonHeading.length > 27 ? 50 : 66,
            lineHeight: 0.95,
            fontWeight: 950,
            letterSpacing: "-0.035em",
            textTransform: "uppercase",
            overflowWrap: "anywhere",
          }}>{seasonHeading}</div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          paddingTop: 18,
          borderTop: `1px solid ${C.line}`,
        }}>
          <div>
            <div style={{ color: C.orangeLight, fontSize: 29, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Team record</div>
            <div style={{
              marginTop: 5,
              color: C.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: fitStoryFontSize(record, 460, 42, 24, 0.58),
              lineHeight: 0.98,
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}>{record}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.quiet, fontSize: 27, fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase" }}>Games played</div>
            <div style={{
              marginTop: 5,
              color: C.orangeLight,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 49,
              lineHeight: 0.98,
              fontWeight: 950,
            }}>{formatStat(data.gamesPlayed, 0)}</div>
          </div>
        </div>
      </section>

      <StoryPanel style={{ flex: "1 1 210px" }}>
        <StorySectionTitle>Per-game averages</StorySectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 7 }}>
          {[
            { label: "PPG", value: data.ppg },
            { label: "RPG", value: data.rpg },
            { label: "APG", value: data.apg },
            { label: "SPG", value: data.spg },
            { label: "BPG", value: data.bpg },
          ].map((item, index) => <MetricCell key={item.label} label={item.label} value={formatStat(item.value)} accent={index === 0} />)}
        </div>
      </StoryPanel>

      <StoryPanel style={{ flex: "1 1 195px" }}>
        <StorySectionTitle>Season totals</StorySectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 7 }}>
          {seasonTotals.map((item, index) => <MetricCell key={item.label} label={item.label} value={formatStat(item.value, 0)} accent={index === 0} />)}
        </div>
      </StoryPanel>

      <StoryPanel style={{ flex: "1 1 257px" }}>
        <StorySectionTitle detail="Made / attempted">Shooting splits</StorySectionTitle>
        {shooting.map((item, index) => (
          <div key={item.label} style={{
          minHeight: 76,
            display: "grid",
            gridTemplateColumns: "82px minmax(0, 1fr) 130px",
            alignItems: "center",
            gap: 12,
            borderBottom: index < shooting.length - 1 ? "1px solid rgba(255,244,232,0.08)" : "none",
          }}>
            <span style={{ color: C.orangeLight, fontSize: 33, fontWeight: 900 }}>{item.label}</span>
            <div style={{ minWidth: 0, height: 8, borderRadius: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {item.pct != null && <div style={{ width: `${Math.max(0, Math.min(100, Number(item.pct)))}%`, height: "100%", background: C.orange }} />}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.ink, fontSize: 35, fontWeight: 850 }}>{formatPct(item.pct, item.made, item.attempted)}</div>
              <div style={{ color: C.quiet, fontSize: 27, fontWeight: 750 }}>
                <MadeAttempt made={item.made} attempted={item.attempted} />
              </div>
            </div>
          </div>
        ))}
      </StoryPanel>

      {data.topGame && <StoryPanel style={{ flex: "1 1 194px", borderColor: "rgba(243,107,33,0.3)" }}>
        <StorySectionTitle detail={data.topGame.date || undefined}>Top game</StorySectionTitle>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.ink, fontSize: 41, lineHeight: 1.1, fontWeight: 900 }}>
              {data.topGame.opponent?.trim() ? `vs ${data.topGame.opponent.trim()}` : "Opponent not recorded"}
            </div>
            {data.topGame.result && <div style={{
              marginTop: 7,
              color: C.orangeLight,
              fontSize: 29,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}>{data.topGame.result}</div>}
          </div>
          <div style={{ display: "flex", gap: 13, flexShrink: 0 }}>
            {[
              { label: "PTS", value: data.topGame.points },
              { label: "REB", value: data.topGame.rebounds },
              { label: "AST", value: data.topGame.assists },
            ].map((item) => <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ color: C.ink, fontFamily: "'Arial Narrow', Impact, sans-serif", fontSize: 43, lineHeight: 1, fontWeight: 950 }}>{formatStat(item.value, 0)}</div>
              <div style={{ marginTop: 5, color: C.quiet, fontSize: 27, fontWeight: 900, letterSpacing: "0.1em" }}>{item.label}</div>
            </div>)}
          </div>
        </div>
      </StoryPanel>}
      <StoryFooter note="One season. A thousand reps." />
    </StoryFrame>
  );
}

