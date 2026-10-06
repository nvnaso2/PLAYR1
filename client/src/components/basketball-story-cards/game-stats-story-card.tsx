import {
  formatDate,
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
  resultTone,
} from "./shared";

export type GameStatsStoryData = BasketballStoryIdentity & {
  opponent?: string | null;
  teamScore?: MaybeNumber;
  opponentScore?: MaybeNumber;
  gameDate?: string | null;
  result?: string | null;
  points?: MaybeNumber;
  rebounds?: MaybeNumber;
  assists?: MaybeNumber;
  steals?: MaybeNumber;
  blocks?: MaybeNumber;
  fgMade?: MaybeNumber;
  fgAttempted?: MaybeNumber;
  threePtMade?: MaybeNumber;
  threePtAttempted?: MaybeNumber;
  ftMade?: MaybeNumber;
  ftAttempted?: MaybeNumber;
};

export function GameStatsStoryCard({ data }: { data: GameStatsStoryData }) {
  const C = STORY_COLORS;
  const hasScore = data.teamScore != null || data.opponentScore != null;
  const shots = [
    { label: "Field goals", tag: "FG", made: data.fgMade, attempted: data.fgAttempted },
    { label: "Three pointers", tag: "3PT", made: data.threePtMade, attempted: data.threePtAttempted },
    { label: "Free throws", tag: "FT", made: data.ftMade, attempted: data.ftAttempted },
  ];

  return (
    <StoryFrame type="GAME">
      <StoryBrandHeader label="Game day" />
      <PlayerIdentity identity={data} />

      <section style={{
        position: "relative",
        zIndex: 1,
        flex: "1 1 260px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "22px 28px",
        borderTop: `1px solid ${C.line}`,
        borderBottom: `1px solid ${C.line}`,
        background: "linear-gradient(100deg, rgba(255,255,255,0.025), rgba(255,255,255,0.045) 50%, rgba(255,255,255,0.025))",
      }}>
        <div style={{ color: C.secondary, fontSize: 36, fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {data.opponent?.trim() ? `vs ${data.opponent.trim()}` : "Opponent not recorded"}
        </div>
        {hasScore ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginTop: 18 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              color: C.orangeLight,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 91,
              lineHeight: 0.85,
              fontWeight: 950,
              letterSpacing: "-0.04em",
            }}>{formatStat(data.teamScore, 0)}</div>
            <div style={{ marginTop: 10, color: C.quiet, fontSize: 30, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Your team</div>
          </div>
          <div style={{ color: C.quiet, fontSize: 31, fontWeight: 500 }}>—</div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              color: C.ink,
              fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
              fontSize: 91,
              lineHeight: 0.85,
              fontWeight: 950,
              letterSpacing: "-0.04em",
            }}>{formatStat(data.opponentScore, 0)}</div>
            <div style={{ marginTop: 10, color: C.quiet, fontSize: 30, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Opponent</div>
          </div>
        </div> : <div style={{
          marginTop: 25,
          color: C.quiet,
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
        }}>Score not recorded</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
          {data.result?.trim() && <span style={{
            color: resultTone(data.result),
            border: `1px solid ${resultTone(data.result)}66`,
            borderRadius: 5,
            padding: "5px 11px",
            fontSize: 29,
            fontWeight: 950,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}>{data.result.trim()}</span>}
          <span style={{ color: C.quiet, fontSize: 30, fontWeight: 750 }}>{formatDate(data.gameDate)}</span>
        </div>
      </section>

      <section style={{
        position: "relative",
        zIndex: 1,
        flex: "1 1 302px",
        display: "grid",
        gridTemplateColumns: "1.08fr 0.92fr",
        overflow: "hidden",
        border: `1px solid ${C.line}`,
        borderRadius: 13,
        background: "linear-gradient(130deg, rgba(255,255,255,0.045), #111310 58%)",
      }}>
        <div style={{ padding: "27px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: C.orangeLight, fontSize: 33, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase" }}>Points</div>
          <div style={{
            marginTop: 10,
            color: C.orangeLight,
            fontFamily: "'Arial Narrow', 'Franklin Gothic Medium', Impact, sans-serif",
            fontSize: 142,
            lineHeight: 0.78,
            fontWeight: 950,
            letterSpacing: "-0.06em",
          }}>{formatStat(data.points, 0)}</div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          alignContent: "center",
          gap: 8,
          padding: "24px 22px",
          borderLeft: "1px solid rgba(243,107,33,0.24)",
          background: "rgba(0,0,0,0.2)",
        }}>
          {[
            { label: "Rebounds", value: data.rebounds },
            { label: "Assists", value: data.assists },
            { label: "Steals", value: data.steals },
            { label: "Blocks", value: data.blocks },
          ].map((item, index) => <MetricCell key={item.label} label={item.label} value={formatStat(item.value, 0)} accent={index === 1} />)}
        </div>
      </section>

      <StoryPanel style={{ flex: "1 1 272px" }}>
        <StorySectionTitle detail="Made / attempted">Shooting performance</StorySectionTitle>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {shots.map((shot, index) => (
            <div key={shot.label} style={{
              minHeight: 69,
              display: "grid",
              gridTemplateColumns: "76px minmax(0, 1fr) 125px 125px",
              alignItems: "center",
              gap: 13,
              borderBottom: index < shots.length - 1 ? "1px solid rgba(255,244,232,0.08)" : "none",
            }}>
               <span style={{ color: C.orangeLight, fontSize: 31, fontWeight: 950, letterSpacing: "0.08em" }}>{shot.tag}</span>
               <span style={{ color: C.secondary, fontSize: 33, fontWeight: 750 }}>{shot.label}</span>
               <span style={{ color: C.ink, fontSize: 34, fontWeight: 850, textAlign: "right" }}>
                <MadeAttempt made={shot.made} attempted={shot.attempted} />
              </span>
               <span style={{ color: C.orangeLight, fontSize: 35, fontWeight: 900, textAlign: "right" }}>
                {formatPct(null, shot.made, shot.attempted)}
              </span>
            </div>
          ))}
        </div>
      </StoryPanel>

      <StoryFooter note="Keep showing up" />
    </StoryFrame>
  );
}

