export const shootingMechanicsBranches = {
  spray: {
    question: "When your shot sprays left and right, what do you physically feel?",
    answers: [
      {
        id: "release-friction",
        text: "There’s friction in my release, keeping me from having a clean follow-through.",
        outcome: "guide-hand",
      },
      {
        id: "balance-drift",
        text: "I feel off balance, especially while moving, with my shoulders and body drifting in different directions.",
        outcome: "stay-on-line",
      },
    ],
  },
  short: {
    question: "When you miss short or getting the ball to the rim feels like a chore, what do you feel?",
    answers: [
      {
        id: "dead-disconnected",
        text: "My shot feels dead and disconnected. I have to launch it with my upper body just to reach the rim.",
        outcome: "floor-springboard",
      },
      {
        id: "flat-or-high-arc",
        text: "My ball flight is either a line drive or a rainbow, and it keeps landing short on the front of the rim.",
        outcome: "elbow-wrist-load",
      },
      {
        id: "smooth-but-short",
        text: "Everything feels normal and smooth, but the ball seems to die at the front of the rim.",
        outcome: "snap-wrist",
      },
    ],
  },
  clunky: {
    question: "When your shot feels out of sync or clunky, how does it feel?",
    answers: [
      {
        id: "playing-catch-up",
        text: "My shot feels like it’s playing catch-up, and I end up flicking the ball at the rim.",
        outcome: "ball-first-hips-load",
      },
      {
        id: "rushed-or-choppy",
        text: "My shot feels rushed or unnaturally slow and choppy instead of one smooth motion.",
        outcome: "slow-smooth",
      },
      {
        id: "off-from-start",
        text: "Everything feels off from the start. I feel unbalanced or forced to make adjustments during the shot.",
        outcome: "set-feet-balance",
      },
    ],
  },
} as const;

export type ShootingMechanicsBranch = keyof typeof shootingMechanicsBranches;

export const shootingMechanicsResults = {
  "guide-hand": {
    cue: "The guide hand is just a gentle guide",
    drills: ["1 Hand Form Shooting", "Penny Form Shots", "Gentle Guide Hand", "Guide Hand Leaves Early"],
  },
  "stay-on-line": {
    cue: "Stay on the line, up and down",
    drills: ["1 Dribble Pull-Ups", "Spins", "Turnarounds", "Spin Out Leg Kicks"],
  },
  "floor-springboard": {
    cue: "The floor is a springboard",
    drills: ["3 Little Dips", "Form Shots", "Bounce Set Shot"],
  },
  "elbow-wrist-load": {
    cue: "Elbow under the ball, load the wrist",
    drills: ["Over the Backboard Shooting", "High Arc Mid-Range", "High Arc 3-Point", "Eyebrow Elbow Finish"],
  },
  "snap-wrist": {
    cue: "Snap the wrist",
    drills: [
      "Free Throw Level Side Step Follow Through",
      "Start From Logo: 2 Dribbles, Pull Up, Follow Through",
      "Form Shots 2 Handed",
      "C&S Follow Through",
    ],
  },
  "ball-first-hips-load": {
    cue: "Ball moves first, hips load",
    drills: ["Form Shots: Hips Load", "Form Shots: Ball Moves First", "Free Throws (One Focus)"],
  },
  "slow-smooth": {
    cue: "Slow is smooth, smooth is fast",
    drills: ["3 Little Dips From Deep", "C&S Follow Through"],
  },
  "set-feet-balance": {
    cue: "Set your feet, start on balance",
    drills: ["Bounce Set Drills", "1 Leg 2 Foot Shot", "Side Twist Shots"],
  },
} as const;

export type ShootingMechanicsOutcome = keyof typeof shootingMechanicsResults;

export function getShootingMechanicsOutcome(
  branch: ShootingMechanicsBranch,
  answerId: string,
): ShootingMechanicsOutcome | null {
  const answer = shootingMechanicsBranches[branch].answers.find((item) => item.id === answerId);
  return answer?.outcome ?? null;
}