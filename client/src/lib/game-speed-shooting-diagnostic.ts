export const gameSpeedShootingQuestions = {
  q1: {
    title: "Which condition makes it hardest to perform in the fourth quarter?",
    answers: [
      {
        id: "fatigue",
        label: "My legs are heavy late in the game, and I struggle to have the conditioning and energy to perform.",
      },
      {
        id: "simulation",
        label: "The defense gets intense, causing me to rush and miss difficult shots I haven't practiced enough.",
      },
      {
        id: "pressure",
        label: "The pressure increases, causing me to stiffen up or overthink the situation and the shots I take.",
      },
    ],
  },
  q2: {
    title: "In what environment do you perform worst when shooting?",
    answers: [
      { id: "fatigue", label: "When I'm tired or fatigued." },
      { id: "simulation", label: "Taking game-like reps while moving instead of simple, stationary reps." },
      { id: "pressure", label: "Under high pressure or when taking pressure shots." },
    ],
  },
  q3: {
    title: "What is the biggest gap between your training sessions and real 5v5 games?",
    answers: [
      {
        id: "fatigue",
        label: "Intensity: My workouts involve too much standing around and resting between makes compared to a real game's pace.",
      },
      {
        id: "simulation",
        label: "Footwork & drill diversity: In workouts, I shoot simple, basic shots. In games, I have to shoot while dribbling downhill or coming off screens.",
      },
      {
        id: "pressure",
        label: "Accountability: In workouts, missing has zero consequences. In games, every miss feels costly and carries a lot of weight.",
      },
    ],
  },
} as const;

export type GameSpeedQuestionId = keyof typeof gameSpeedShootingQuestions;
export type GameSpeedCategory = "fatigue" | "simulation" | "pressure";
export type GameSpeedAnswers = Partial<Record<GameSpeedQuestionId, GameSpeedCategory>>;

export const gameSpeedCategoryResults = {
  fatigue: {
    title: "Fatigue-Limited Shooter",
    summary: "Your legs and energy are the main conversion leak. Train your shot quality when you're no longer fresh.",
  },
  simulation: {
    title: "Simulation-Limited Shooter",
    summary: "Your practice needs to look more like the movement, footwork, and shot situations you face in 5v5.",
  },
  pressure: {
    title: "Pressure-Limited Shooter",
    summary: "Game pressure is changing your focus or mechanics. Practice with clear targets and accountability.",
  },
  mixed: {
    title: "Multiple Conversion Leaks",
    summary: "Your answers point to more than one friction point. Use the three answer-matched drills below to train each one.",
  },
} as const;

export type GameSpeedOutcome = keyof typeof gameSpeedCategoryResults;

export const gameSpeedDrillBank: Record<
  GameSpeedCategory,
  Record<GameSpeedQuestionId, { title: string; focus: string }>
> = {
  fatigue: {
    q1: {
      title: "Baseline to Baseline 3's",
      focus: "Build conditioning while keeping your shooting mechanics consistent after the sprint.",
    },
    q2: {
      title: "Star Drill",
      focus: "Practice making shots while moving through a higher-work-rate drill.",
    },
    q3: {
      title: "17's into MR Pullups",
      focus: "Reduce standing and resting; work on pull-ups while carrying fatigue.",
    },
  },
  simulation: {
    q1: {
      title: "Transition 3's Top of Key",
      focus: "Rehearse a moving, game-like shot rather than a stationary warm-up three.",
    },
    q2: {
      title: "Curl 3's - Flare 3's",
      focus: "Build repetitions on shots created by movement and changing routes.",
    },
    q3: {
      title: "Combo Move High Ball Screen Down Hill Attack 2 Dribble MR & Pop 3",
      focus: "Add the dribble attack, screen read, and pull-up or pop shot that practice is missing.",
    },
  },
  pressure: {
    q1: {
      title: "2 In a Row to Move on",
      focus: "Use a make-to-advance target to practice shooting with a clear consequence.",
    },
    q2: {
      title: "1-2-3-5 Score Shooting Game",
      focus: "Turn pressure shots into a scored game with a target to reach.",
    },
    q3: {
      title: "Set Goal Streak Shooting",
      focus: "Set a make-streak goal and keep the result accountable throughout the drill.",
    },
  },
};

export function getGameSpeedShootingResult(answers: GameSpeedAnswers) {
  const questionIds = Object.keys(gameSpeedShootingQuestions) as GameSpeedQuestionId[];
  const counts: Record<GameSpeedCategory, number> = {
    fatigue: 0,
    simulation: 0,
    pressure: 0,
  };

  for (const questionId of questionIds) {
    const answer = answers[questionId];
    if (!answer) return null;
    counts[answer] += 1;
  }

  const outcome: GameSpeedOutcome =
    counts.fatigue === 1 && counts.simulation === 1 && counts.pressure === 1
      ? "mixed"
      : counts.fatigue > 1
        ? "fatigue"
        : counts.simulation > 1
          ? "simulation"
          : "pressure";

  const drills = questionIds.map((questionId) => {
    const category = answers[questionId]!;
    return {
      questionId,
      category,
      categoryTitle: gameSpeedCategoryResults[category].title,
      ...gameSpeedDrillBank[category][questionId],
    };
  });

  return { outcome, counts, drills };
}