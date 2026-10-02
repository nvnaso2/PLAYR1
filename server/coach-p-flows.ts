export type CoachPContextMode =
  | "general"
  | "profile"
  | "training"
  | "workout"
  | "game"
  | "goal"
  | "opportunity"
  | "training-review";

export type CoachPStarterFlow = "opportunity" | "workout" | "training-review" | "game-prep";

export type ActiveCoachPFlow = {
  type: CoachPStarterFlow;
  clarificationPhase?: number;
};

export function getCoachPStarterFlow(message: string): CoachPStarterFlow | null {
  const text = message.toLowerCase().replace(/\s+/g, " ").trim();
  if (/\b(biggest opportunity|opportunity to improve|make the biggest difference)\b/.test(text)) return "opportunity";
  if (/\bbuild my next workout\b/.test(text) || /\bbuild a workout\b/.test(text)) return "workout";
  if (
    /\b(review|analy[sz]e|break down)\b/.test(text)
    && /\b(training session|training history|workout session|workout|session)\b/.test(text)
  ) return "training-review";
  if (/\b(prepare|prep)\b.{0,30}\b(next game|game)\b/.test(text)) return "game-prep";
  return null;
}

export function classifyCoachPQuestion(question: string): CoachPContextMode {
  const text = question.toLowerCase();
  if (/\b(biggest opportunity|opportunity to improve)\b/.test(text)) return "opportunity";
  if (
    /\b(review|analy[sz]e|break down)\b/.test(text)
    && /\b(training session|training history|workout session|workout|session)\b/.test(text)
  ) {
    return "training-review";
  }
  if (/\b(game|matchup|opponent|scout|competition|stats|statistic|heat ?map|shot chart|shooting percentage|box score)\b/.test(text)) return "game";
  if (/\b(workout|session|practice|train|training|drill|exercise|sets|reps|routine|program)\b/.test(text)) return "workout";
  if (/\b(goal|objective|plan|focus|priority|mindset|confidence|motivation|journal|reflection)\b/.test(text)) return "goal";
  if (/\b(archetype|profile|assessment|bottleneck|stage|strength|weakness|identity|career|position)\b/.test(text)) return "profile";
  if (/\b(progress|improv|develop|recent|last session|history|habit|streak)\b/.test(text)) return "training";
  return "general";
}

function endsWithQuestion(message: string | undefined): boolean {
  return !!message && /\?\s*[*_`"'’)]*\s*$/.test(message.trim());
}

/**
 * Keep guided flows active across their clarification turns without treating
 * every later message in a completed conversation as part of the same flow.
 */
export function getActiveCoachPFlow(
  firstUserMessage: string,
  priorAssistantMessages: string[],
): ActiveCoachPFlow | null {
  const type = getCoachPStarterFlow(firstUserMessage);
  if (!type) return null;
  const assistantTurns = priorAssistantMessages.length;
  const lastAssistantMessage = priorAssistantMessages[assistantTurns - 1];

  if (type === "opportunity" && assistantTurns === 0) {
    return { type, clarificationPhase: assistantTurns };
  }
  if (type === "opportunity" && assistantTurns < 3 && endsWithQuestion(lastAssistantMessage)) {
    return { type, clarificationPhase: assistantTurns };
  }
  if (
    type === "workout"
    && assistantTurns < 3
    && (
      assistantTurns === 0
      || lastAssistantMessage?.includes("How long should the workout be")
      || endsWithQuestion(lastAssistantMessage)
    )
  ) return { type };
  if (type === "training-review" && (assistantTurns === 0 || endsWithQuestion(lastAssistantMessage))) {
    return { type };
  }
  if (type === "game-prep" && (assistantTurns === 0 || endsWithQuestion(lastAssistantMessage))) {
    return { type };
  }
  return null;
}