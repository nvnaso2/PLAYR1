export const footworkCourtRoles = [
  {
    id: "guard",
    label: "Guard",
    description: "Play on the perimeter, handle the ball, and play toward the top of the key.",
  },
  {
    id: "wing",
    label: "Wing",
    description: "Operate in the corners and wings along the perimeter.",
  },
  {
    id: "big",
    label: "Big man",
    description: "Play in the paint, trail in transition, and pop to the top of the key or elbows.",
  },
] as const;

export type FootworkCourtRole = (typeof footworkCourtRoles)[number]["id"];

export const footworkShotSources = [
  {
    id: "on-ball",
    label: "On Ball",
    description: "Score with the ball in my hands, creating space and breaking down the defense.",
  },
  {
    id: "off-ball",
    label: "Off Ball",
    description: "Score without the ball, finding open space off screens and in catch-and-shoot situations.",
  },
] as const;

export type FootworkShotSource = (typeof footworkShotSources)[number]["id"];

export const footworkFollowUpQuestions = {
  "on-ball": {
    question: "When you have the ball in your hands, which best matches your go-to move or a move you want to learn?",
    answers: [
      {
        id: "quick-lateral-separation",
        text: "Create quick lateral separation with just one or two dribbles.",
        outcome: "step-back-side-step",
      },
      {
        id: "attack-and-stop",
        text: "Attack downhill and stop on a dime to get an open shot.",
        outcome: "attack-off-dribble",
      },
      {
        id: "triple-threat-pivots",
        text: "Create space out of triple threats and pivots.",
        outcome: "jab-return",
      },
    ],
  },
  "off-ball": {
    question: "When you are off the ball, which situation best matches the shot you usually take or want to improve most?",
    answers: [
      {
        id: "stationary-catch-and-shoot",
        text: "Stationary catch-and-shoot shots.",
        outcome: "catch-and-shoot",
      },
      {
        id: "transition-corner",
        text: "Transition and sliding to the corner for threes.",
        outcome: "corner",
      },
      {
        id: "curls-and-screens",
        text: "Coming off tight curls or screens on the wings.",
        outcome: "wings",
      },
    ],
  },
} as const;

export const footworkResults = {
  "step-back-side-step": {
    title: "Step Back & Side Step",
    drills: ["Side Step", "Step Back"],
  },
  "attack-off-dribble": {
    title: "Attack Off the Dribble",
    drills: ["Quick 1 Dribbles", "1 Dribble Pull Up", "3 Dribbles Attacking"],
  },
  "jab-return": {
    title: "Jab Return",
    drills: ["Jab Return"],
  },
  "catch-and-shoot": {
    title: "Catch & Shoot",
    drills: [
      "Alternate 1-2 2 Foot Step In's From Wing",
      "1-2 Pointers",
      "2 Foot 3 Pointers",
    ],
  },
  corner: {
    title: "Corner",
    drills: ["Duncan Robinson Drill"],
  },
  wings: {
    title: "Wings",
    drills: ["Wing Curls", "Plant & Absorb", "2nd Foot Spring", "Off Screen Momentum"],
  },
} as const;

export type FootworkOutcome = keyof typeof footworkResults;

export function getFootworkOutcome(
  shotSource: FootworkShotSource,
  answerId: string,
): FootworkOutcome | null {
  const answer = footworkFollowUpQuestions[shotSource].answers.find((item) => item.id === answerId);
  return answer?.outcome ?? null;
}