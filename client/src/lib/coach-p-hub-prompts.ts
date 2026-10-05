import { PLAYER_SETUP_SKILLS } from "./player-setup-answers";

type SetupSkill = (typeof PLAYER_SETUP_SKILLS)[number];
type FivePrompts = readonly [string, string, string, string, string];

export const COACH_P_HUB_PROMPT_BANK = {
  "Ball Handling": [
    "How can I keep my handle under control when a defender picks me up early?",
    "What change of pace could help me create space without overdribbling?",
    "How can I protect the ball while still attacking the gap?",
    "What should I read before choosing my next dribble move?",
    "How can I turn a clean first step into a better decision when help arrives?",
  ],
  Shooting: [
    "What can I focus on to keep my shot consistent when the game speeds up?",
    "How can I get into my shot quickly without rushing my mechanics?",
    "What should I look for when a defender closes out on my catch?",
    "How can I stay balanced and confident on a late-clock shot?",
    "What adjustment could make my catch-and-shoot more reliable under pressure?",
  ],
  Finishing: [
    "How can I finish through contact without losing control at the rim?",
    "What should I read to choose the best finish when help rotates?",
    "How can I use either hand more confidently around the basket?",
    "What change of angle or pace could help me avoid a shot blocker?",
    "How can I turn more drives into strong, controlled finishes?",
  ],
  Passing: [
    "How can I spot the next pass sooner when the defense collapses?",
    "What can help me make accurate passes while moving at game speed?",
    "What should I read before attacking so I can create for a teammate?",
    "How can I reduce risky passes without becoming predictable?",
    "How can I improve the timing of passes out of a drive?",
  ],
  Defense: [
    "How can I stay in front after my matchup's first move?",
    "What can help me keep position without reaching or fouling?",
    "How do I recognize screens earlier and react the right way?",
    "How can I close out under control and still challenge the shot?",
    "What should I watch so I can communicate and rotate sooner?",
  ],
  "Basketball IQ": [
    "What cue can I read earlier to make a faster decision?",
    "How do I know when to attack, pass, or reset the play?",
    "What should I watch off the ball to anticipate the next action?",
    "How can I make better reads when the defense changes coverage?",
    "What can I look for before my move to read the help defender?",
  ],
  Athleticism: [
    "What can I do to stay explosive late in a game?",
    "How can I improve my first step while staying balanced?",
    "What should I focus on to change direction more efficiently?",
    "How can I use strength and balance better through contact?",
    "What can help me repeat game-speed efforts without losing form?",
  ],
  Rebounding: [
    "What should I look for to get the first move on a rebound?",
    "How can I box out more consistently against a stronger player?",
    "What can help me read the ball's path earlier off the rim?",
    "How can I secure the ball in traffic and start the next play quickly?",
    "What positioning adjustment should I make before the shot goes up?",
  ],
} as const satisfies Record<SetupSkill, FivePrompts>;

export const COACH_P_HUB_FALLBACK_PROMPTS = [
  "What is one adjustment that could help me most in my next game?",
  "What should I focus on next to help my team more?",
  "What simple change could help me play with more confidence?",
  "Which part of my game would be most valuable to improve next?",
  "What can I practice today that will carry over to game day?",
] as const satisfies FivePrompts;

const DAY_IN_MILLISECONDS = 86_400_000;

function dayOrdinal(dateKey: string): number {
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== dateKey
  ) {
    throw new Error("Coach P Hub prompts require a valid YYYY-MM-DD date key.");
  }
  return Math.floor(timestamp / DAY_IN_MILLISECONDS);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function getDailyCoachPrompt(
  focus: string | null | undefined,
  dateKey: string,
): string {
  const prompts = focus && PLAYER_SETUP_SKILLS.includes(focus as SetupSkill)
    ? COACH_P_HUB_PROMPT_BANK[focus as SetupSkill]
    : COACH_P_HUB_FALLBACK_PROMPTS;
  return prompts[positiveModulo(dayOrdinal(dateKey), prompts.length)];
}