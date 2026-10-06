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

export type CareerStatsStoryData = BasketballStoryIdentity & {
  totalGames?: MaybeNumber;
  totalPoints?: MaybeNumber;
  totalRebounds?: MaybeNumber;
  totalAssists?: MaybeNumber;
  totalSteals?: MaybeNumber;
  totalBlocks?: MaybeNumber;
  totalFgMade?: MaybeNumber;
  totalFgAttempted?: MaybeNumber;
  totalThreePtMade?: MaybeNumber;
  totalThreePtAttempted?: MaybeNumber;
  totalFtMade?: MaybeNumber;
  totalFtAttempted?: MaybeNumber;
  wins?: MaybeNumber;
  losses?: MaybeNumber;
  avgPoints?: MaybeNumber;
  avgRebounds?: MaybeNumber;
  avgAssists?: MaybeNumber;
  avgSteals?: MaybeNumber;
  avgBlocks?: MaybeNumber;
};

export function CareerStatsStoryCard({ data }: { data: CareerStatsStoryData }) {
  const C = STORY_COLORS;
  const recordAvailable = data.wins != null || data.losses != null;
  const careerRecord = `${formatStat(data.wins, 0)} W · ${formatStat(data.losses, 0)} L`;
  const careerRecordFontSize = fitStoryFontSize(careerRecord, 330, 31, 20, 0.56);
  const totalPoints = formatStat(data.totalPoints, 0);
  const pointsFontSize = fitStoryFontSize(totalPoints, 480, 88, 32, 0.6);
  const shooting = [
    { label: "Field goals", made: data.totalFgMade, attempted: data.totalFgAttempted },
    { label: "Three pointers", made: data.totalThreePtMade, attempted: data.totalThreePtAttempted },
    { label: "Free throws", made: data.totalFtMade, attempted: data.totalFtAttempted },
  ];
  const averages = [
    { label: "Points / game", value: data.avgPoints },
    { label: "Rebounds / game", value: data.avgRebounds },
    { label: "Assists / game", value: data.avgAssists },
    { label: "Steals / game", value: data.avgSteals },
    { label: "Blocks / game", value: data.avgBlocks },
  ];

  return (
    <StoryFrame type="CAREER">
      <StoryBrandHeader label="Career totals" />
      <PlayerIdentity identity={data} />

      <section style={{
        position: "relative",
        zIndex: 1,
        flex: "1 1 292px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
        overflow: "hidden",
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        background: "linear-gradient(125deg, rgba(255,255,255,0.045), rgba(17,19,17,0.96) 58%)",
      }}>
        <div style={{ minWidth: 0, padding: "31px 33px", borderLeft: "4px solid #f36b21", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{
            color: C.orangeLight,
             fontSize: 34,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}>Career scoring</div>
          <div style={{
            marginTop: 13,
            color: C.orangeLight,
            fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
             fontSize: pointsFontSize,
            lineHeight: 0.84,
            fontWeight: 950,
            letterSpacing: "-0.055em",
            whiteSpace: "nowrap",
          }}>{totalPoints}</div>
          <div style={{
            marginTop: 15,
            color: C.secondary,
             fontSize: 38,
            fontWeight: 850,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}>Total points</div>
        </div>
        <div style={{
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "27px 30px",
          borderLeft: "1px solid rgba(243,107,33,0.24)",
          background: "rgba(0,0,0,0.2)",
        }}>
           <div style={{ color: C.quiet, fontSize: 31, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Games played</div>
          <div style={{
            marginTop: 8,
            color: C.ink,
            fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
            fontSize: 66,
            lineHeight: 0.9,
            fontWeight: 950,
          }}>{formatStat(data.totalGames, 0)}</div>
          {recordAvailable && <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: `1px solid ${C.line}`,
          }}>
             <div style={{ color: C.quiet, fontSize: 29, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Record</div>
              <div style={{
                marginTop: 6,
                color: C.secondary,
                fontSize: careerRecordFontSize,
                fontWeight: 850,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}>
                {formatStat(data.wins, 0)} <span style={{ color: C.quiet, fontSize: Math.max(16, careerRecordFontSize * 0.83) }}>W</span>
                <span style={{ color: C.quiet, margin: "0 7px" }}>·</span>
                {formatStat(data.losses, 0)} <span style={{ color: C.quiet, fontSize: Math.max(16, careerRecordFontSize * 0.83) }}>L</span>
            </div>
          </div>}
        </div>
      </section>

      <StoryPanel style={{ flex: "1 1 236px" }}>
        <StorySectionTitle>Career totals</StorySectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <MetricCell label="Rebounds" value={formatStat(data.totalRebounds, 0)} />
          <MetricCell label="Assists" value={formatStat(data.totalAssists, 0)} accent />
          <MetricCell label="Steals" value={formatStat(data.totalSteals, 0)} />
          <MetricCell label="Blocks" value={formatStat(data.totalBlocks, 0)} />
          <MetricCell label="Wins" value={formatStat(data.wins, 0)} />
          <MetricCell label="Losses" value={formatStat(data.losses, 0)} />
        </div>
      </StoryPanel>

      <StoryPanel style={{ flex: "1 1 267px" }}>
        <StorySectionTitle detail="Made / attempted">Shooting totals</StorySectionTitle>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {shooting.map((item, index) => (
            <div key={item.label} style={{
               minHeight: 82,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) max-content max-content",
              alignItems: "center",
              gap: 10,
              borderBottom: index < shooting.length - 1 ? "1px solid rgba(255,244,232,0.08)" : "none",
            }}>
              <span style={{ minWidth: 0, color: C.secondary, fontSize: 35, fontWeight: 750 }}>{item.label}</span>
              <span style={{
                color: C.ink,
                fontSize: fitStoryFontSize(
                  item.made == null && item.attempted == null
                    ? "—"
                    : `${formatStat(item.made, 0)} / ${formatStat(item.attempted, 0)}`,
                  440,
                  34,
                  20,
                  0.58,
                ),
                fontWeight: 850,
                textAlign: "right",
                whiteSpace: "nowrap",
              }}>
                <MadeAttempt made={item.made} attempted={item.attempted} />
              </span>
              <span style={{ color: C.orangeLight, fontSize: 36, fontWeight: 900, textAlign: "right", whiteSpace: "nowrap" }}>
                {formatPct(null, item.made, item.attempted)}
              </span>
            </div>
          ))}
        </div>
      </StoryPanel>

      <StoryPanel style={{ flex: "1 1 281px" }}>
        <StorySectionTitle detail="Per game">Career averages</StorySectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {averages.map((item, index) => (
            <MetricCell key={item.label} label={item.label} value={formatStat(item.value)} accent={index === 0} />
          ))}
        </div>
      </StoryPanel>
      <StoryFooter note="Built game by game" />
    </StoryFrame>
  );
}

