export const LEAD_MAGNET_IDS = [
  "shooting-mechanics",
  "footwork-open-shots",
  "confidence-reality-check",
  "game-speed-shooting",
] as const;

export type LeadMagnetId = typeof LEAD_MAGNET_IDS[number];
export type LeadMagnetAnswers = Record<string, string>;

export interface ValidatedLeadMagnetSubmission {
  leadMagnetId: LeadMagnetId;
  clientSubmissionId: string;
  answers: LeadMagnetAnswers;
  resultId: string;
}

const shootingOutcomes: Record<string, Record<string, string>> = {
  spray: {
    "release-friction": "guide-hand",
    "balance-drift": "stay-on-line",
  },
  short: {
    "dead-disconnected": "floor-springboard",
    "flat-or-high-arc": "elbow-wrist-load",
    "smooth-but-short": "snap-wrist",
  },
  clunky: {
    "playing-catch-up": "ball-first-hips-load",
    "rushed-or-choppy": "slow-smooth",
    "off-from-start": "set-feet-balance",
  },
};

const footworkOutcomes: Record<string, Record<string, string>> = {
  "on-ball": {
    "quick-lateral-separation": "step-back-side-step",
    "attack-and-stop": "attack-off-dribble",
    "triple-threat-pivots": "jab-return",
  },
  "off-ball": {
    "stationary-catch-and-shoot": "catch-and-shoot",
    "transition-corner": "corner",
    "curls-and-screens": "wings",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(answers: LeadMagnetAnswers, expected: string[]): boolean {
  const keys = Object.keys(answers);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function validateAnswers(value: unknown): LeadMagnetAnswers {
  if (!isRecord(value)) throw new Error("Answers must be an object");

  const answers: LeadMagnetAnswers = {};
  for (const [key, answer] of Object.entries(value)) {
    if (!/^[a-z0-9-]{1,40}$/.test(key) || typeof answer !== "string" || answer.length > 80) {
      throw new Error("Answers contain an invalid question or answer");
    }
    answers[key] = answer;
  }
  return answers;
}

export function validateAndScoreLeadMagnetSubmission(
  value: unknown,
): ValidatedLeadMagnetSubmission {
  if (!isRecord(value)) throw new Error("Submission must be an object");

  const leadMagnetId = value.leadMagnetId;
  if (!LEAD_MAGNET_IDS.includes(leadMagnetId as LeadMagnetId)) {
    throw new Error("Unknown lead magnet");
  }
  const clientSubmissionId = value.clientSubmissionId;
  if (
    typeof clientSubmissionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientSubmissionId)
  ) {
    throw new Error("Invalid submission ID");
  }

  const answers = validateAnswers(value.answers);
  let resultId: string | undefined;

  switch (leadMagnetId as LeadMagnetId) {
    case "shooting-mechanics": {
      const branch = answers.q1;
      const questionKey = `q2-${branch}`;
      if (!shootingOutcomes[branch] || !exactKeys(answers, ["q1", questionKey])) {
        throw new Error("Invalid shooting mechanics answers");
      }
      resultId = shootingOutcomes[branch][answers[questionKey]];
      break;
    }
    case "footwork-open-shots": {
      if (
        !["guard", "wing", "big"].includes(answers.q1) ||
        !Object.hasOwn(footworkOutcomes, answers.q2) ||
        !exactKeys(answers, ["q1", "q2", `q3-${answers.q2}`])
      ) {
        throw new Error("Invalid footwork answers");
      }
      resultId = footworkOutcomes[answers.q2][answers[`q3-${answers.q2}`]];
      break;
    }
    case "confidence-reality-check": {
      if (!["yes", "no"].includes(answers.q1) || !["yes", "no"].includes(answers.q2)) {
        throw new Error("Invalid confidence answers");
      }
      if (answers.q2 === "no") {
        if (!exactKeys(answers, ["q1", "q2"])) throw new Error("Invalid confidence answers");
        resultId = "unearned-confidence";
      } else {
        if (
          !exactKeys(answers, ["q1", "q2", "q3"]) ||
          !["pre-game-nerves", "external-factors", "outcome-obsession"].includes(answers.q3)
        ) {
          throw new Error("Invalid confidence answers");
        }
        resultId = answers.q3;
      }
      break;
    }
    case "game-speed-shooting": {
      const categories = ["fatigue", "simulation", "pressure"];
      if (!exactKeys(answers, ["q1", "q2", "q3"]) || Object.values(answers).some((answer) => !categories.includes(answer))) {
        throw new Error("Invalid game-speed shooting answers");
      }
      const counts = Object.fromEntries(categories.map((category) => [
        category,
        Object.values(answers).filter((answer) => answer === category).length,
      ])) as Record<string, number>;
      resultId = Object.values(counts).every((count) => count === 1)
        ? "mixed"
        : categories.find((category) => counts[category] > 1);
      break;
    }
  }

  if (!resultId) throw new Error("Answers do not map to a valid result");
  return {
    leadMagnetId: leadMagnetId as LeadMagnetId,
    clientSubmissionId,
    answers,
    resultId,
  };
}