type DrillTitleEntry = { title: string };

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const courseTitleAliases: Record<string, string[]> = {
  [normalizeTitle("1 Hand Form Shooting")]: ["Form Shots — 1 Handed"],
  [normalizeTitle("Penny Form Shots")]: ["Form Shots — Penny"],
  [normalizeTitle("Form Shots 2 Handed")]: ["Form Shots — 2 Handed"],
  [normalizeTitle("Form Shots: Hips Load")]: ["Form Shots — Hips Load"],
  [normalizeTitle("Form Shots: Ball Moves First")]: ["Form Shots — Ball Moves First"],
  [normalizeTitle("Free Throws (One Focus)")]: ["20 Free Throws (One Focus)"],
};

export function findRecommendedDrill<T extends DrillTitleEntry>(
  recommendedTitle: string,
  catalogDrills: readonly T[],
): T | undefined {
  const requestedTitles = [
    recommendedTitle,
    ...(courseTitleAliases[normalizeTitle(recommendedTitle)] ?? []),
  ];

  for (const requestedTitle of requestedTitles) {
    const normalizedTitle = normalizeTitle(requestedTitle);
    const match = catalogDrills.find((drill) => normalizeTitle(drill.title) === normalizedTitle);
    if (match) return match;
  }

  return undefined;
}
