export type LeadMagnetOption = {
  id:
    | "shooting-mechanics"
    | "footwork-open-shots"
    | "confidence-reality-check"
    | "game-speed-shooting";
  title: string;
  category: string;
  description: string;
};

export const DAY4_LEAD_MAGNET_OPTIONS: readonly LeadMagnetOption[] = [
  {
    id: "shooting-mechanics",
    title: "Shooting Mechanics",
    category: "Shooting",
    description: "Find a clear adjustment for your shot and the drills to practice it.",
  },
  {
    id: "footwork-open-shots",
    title: "Footwork That Leads to Open Shots",
    category: "Footwork",
    description: "Build the footwork habits that help you create cleaner looks.",
  },
  {
    id: "confidence-reality-check",
    title: "Confidence Reality Check",
    category: "Confidence",
    description: "Turn what you feel on court into a useful focus for your next reps.",
  },
  {
    id: "game-speed-shooting",
    title: "Game-Speed Shooting",
    category: "Game performance",
    description: "See what changes when your shot moves from practice into live play.",
  },
];
