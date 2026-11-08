export type LeadMagnetOption = {
  id:
    | "shooting-mechanics"
    | "footwork-open-shots"
    | "confidence-reality-check"
    | "game-speed-shooting";
  title: string;
};

export const DAY4_LEAD_MAGNET_OPTIONS: readonly LeadMagnetOption[] = [
  {
    id: "game-speed-shooting",
    title: "Game Speed",
  },
  {
    id: "footwork-open-shots",
    title: "Footwork",
  },
  {
    id: "shooting-mechanics",
    title: "Shooting",
  },
  {
    id: "confidence-reality-check",
    title: "Confidence",
  },
];
