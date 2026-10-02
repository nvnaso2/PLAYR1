export interface CoachPLeadMagnetResult {
  leadMagnetId: string;
  answers: Record<string, string>;
  resultId: string;
  createdAt: Date | string;
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