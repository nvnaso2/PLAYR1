export interface CoachPLeadMagnetResult {
  leadMagnetId: string;
  answers: Record<string, string>;
  resultId: string;
  createdAt: Date | string;
}

export function selectRelevantCoachPLeadMagnetResults(
  submissions: readonly CoachPLeadMagnetResult[],
  focuses: readonly string[],
): CoachPLeadMagnetResult[] {
  if (focuses.length === 0) return [...submissions];

  const selectedFocuses = new Set(focuses);
  const shootingRelated = selectedFocuses.has("shooting");
  const footworkRelated = selectedFocuses.has("footwork");
  const shootingQuizzes = new Set([
    "shooting-mechanics",
    "footwork-open-shots",
    "game-speed-shooting",
  ]);

  return submissions.filter(({ leadMagnetId }) => {
    if (leadMagnetId === "confidence-reality-check") return true;
    if (shootingRelated && shootingQuizzes.has(leadMagnetId)) return true;
    if (footworkRelated && leadMagnetId === "footwork-open-shots") return true;
    return false;
  });
}

const leadMagnetTitles: Record<string, string> = {
  "shooting-mechanics": "Shooting Mechanics",
  "footwork-open-shots": "Footwork That Leads to Open Shots",
  "confidence-reality-check": "Confidence Reality Check",
  "game-speed-shooting": "Game-Speed Shooting",
};

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function formatQuestionId(questionId: string): string {
  const match = questionId.match(/^q(\d+)(?:-(.+))?$/i);
  if (!match) return titleCase(questionId);
  return `Q${match[1]}${match[2] ? ` (${titleCase(match[2])})` : ""}`;
}

export function formatCoachPLeadMagnetResults(
  submissions: readonly CoachPLeadMagnetResult[],
): string {
  if (submissions.length === 0) return "No lead magnet quiz results have been saved.";

  return submissions.map((submission) => {
    const date = new Date(submission.createdAt);
    const dateLabel = Number.isNaN(date.getTime())
      ? "date unknown"
      : date.toISOString().slice(0, 10);
    const title = leadMagnetTitles[submission.leadMagnetId] ?? titleCase(submission.leadMagnetId);
    const answers = Object.entries(submission.answers)
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([questionId, answerId]) => `${formatQuestionId(questionId)}: ${titleCase(answerId)}`)
      .join("; ");

    return `- ${dateLabel}: ${title} → ${titleCase(submission.resultId)}${answers ? `; answers: ${answers}` : ""}`;
  }).join("\n");
}