export const confidenceRealityQuestions = {
  q1: {
    question: "Do you struggle with confidence on the basketball court?",
    answers: [
      { id: "yes", label: "Yes", description: "I struggle with confidence on the court." },
      { id: "no", label: "No", description: "I generally feel confident on the court." },
    ],
  },
  q2: {
    question: "Be honest with yourself: have you actually put in the serious hours and deliberate reps to expect the ball to go in every time?",
    answers: [
      {
        id: "no",
        label: "No",
        description: "Truthfully, I play when I can, but I haven't put in consistent, disciplined shooting reps every week.",
      },
      {
        id: "yes",
        label: "Yes",
        description: "Yes. I’ve put in the reps, spent hundreds of hours in the gym, and knock down shots in empty gyms, but I still get in my head and lose it when it matters.",
      },
    ],
  },
  q3: {
    question: "Where does your confidence break down the most?",
    answers: [
      {
        id: "pre-game-nerves",
        text: "Before games or big runs, my stomach drops, my hands feel cold, my heart races, and my muscles feel stiff before I even take a shot.",
        outcome: "pre-game-nerves",
      },
      {
        id: "external-factors",
        text: "I’m terrified of making mistakes in front of the coach, getting benched, getting judged by teammates or family, or getting thrown off by refs and trash talk.",
        outcome: "external-factors",
      },
      {
        id: "outcome-obsession",
        text: "If I miss two shots in a row, my rhythm falls apart. I start obsessing over percentages, and my jumper feels completely broken.",
        outcome: "outcome-obsession",
      },
    ],
  },
} as const;

export type ConfidenceRealityQuestionId = keyof typeof confidenceRealityQuestions;
export type ConfidenceRealityAnswerId =
  | (typeof confidenceRealityQuestions.q1.answers)[number]["id"]
  | (typeof confidenceRealityQuestions.q2.answers)[number]["id"]
  | (typeof confidenceRealityQuestions.q3.answers)[number]["id"];

export const confidenceRealityResults = {
  "unearned-confidence": {
    title: "Haven’t Earned It",
    diagnosis: "You Haven’t Earned the Right to Be Confident Yet. You don't have a mental block; you have a volume deficit.",
    coreLesson:
      "Confidence is not a mindset hack or a motivational quote; confidence is a byproduct of proof. If you haven't put in thousands of reps, your subconscious knows it, and it will panic under live game speed.",
    drills: [
      {
        title: "The 100-3's Structured Make",
        description: "Take 20 makes from each of 5 spots around the perimeter. Track clean makes instead of attempts.",
      },
      {
        title: "40 Mid-Range Pull-Up Ladder",
        description: "Take 20 going right and 20 going left, focusing strictly on stopping on balance.",
      },
      {
        title: "Handlz 15-Minute Daily Ball-Handling Workout",
        description: "Use a heavy finger-pad pound series to build automatic ball control.",
      },
    ],
  },
  "pre-game-nerves": {
    title: "Pre-Game Nerves & Arousal Control",
    coreLesson:
      "The cold water doesn't get warmer the longer you wait. You don't eliminate nerves by sitting in the locker room hoping they go away; you lean directly into the physical discomfort. Hold the fear in one hand, take the step forward with the other.",
    protocol: [
      {
        title: "Audio Anchor",
        description: "Put your headphones on and play the music that locks you into your zone, whether blaring or calming.",
      },
      {
        title: "Active Sweat",
        description: "You must be sweating before you take your first official shot. Cold nerves lead to tight jumpers.",
      },
      {
        title: "Physical Reset",
        description: "Drop and hit 10 crisp pushups to pull nervous energy into your chest and shoulders.",
      },
      {
        title: "Box Breathing",
        description: "Take 4 deep belly breaths: 4 seconds in, 4 seconds holding, 4 seconds out, and 4 seconds holding to calm the vagus nerve.",
      },
    ],
    drills: [
      {
        title: "Sprints into 2 Pressure Free Throws",
        description:
          "Sprint from baseline to baseline, run straight to the free-throw line with your chest heaving, control your breathing, and make 2 consecutive free throws. Miss one, repeat the sprint.",
      },
    ],
  },
  "external-factors": {
    title: "External vs. Internal Overload",
    coreLesson:
      "You cannot control when the coach puts you in, how long you play, what the defense does, or what the ref calls. When you step on the court worried about external factors, you are comparing apples to oranges. Put the blinders on and retreat into your own internal world. When you play with close friends, you play loose and fearless because you don't care about looking bad. Teleport into that exact frame of mind no matter who is sitting in the stands.",
    masterCue: "Put the blinders on—control the breath, trust the reps, stay in your world.",
    drills: [
      {
        title: "The “Blinders-On” 1v1 or Pickup Test Rep",
        description:
          "In a pickup run or 1v1, hunt discomfort. Don't pass out of open shots or hide in the corner to avoid mistakes. When the ball touches your hands, shoot without hesitation and let the result go.",
      },
    ],
  },
  "outcome-obsession": {
    title: "Outcome-Focused Fragility",
    subtitle: "The Ghost Slump",
    coreLesson:
      "I’d rather be 0 for 10 feeling like I'm shooting the ball great with a chance at a game winner, than 9 for 10 feeling like my jump shot is garbage. Amateurs judge a shot purely by whether the net moved. Elite shooters judge a shot strictly by rhythm, release, and physical feel. If the release felt clean and pure, an in-and-out miss is irrelevant—trust the practice and shoot the next one with identical form.",
    masterCue: "Execution over outcome—judge the feeling, not the rim.",
    drills: [
      {
        title: "Feel-Based Warmup (Swish Feedback)",
        description:
          "Start from 5 feet. Count only swishes, completely ignoring banked makes or ugly rim rolls. Swishes are immediate physical proof that your kinetic line was pure.",
      },
      {
        title: "Mid-Range 2-Dribble Pull-Up (Feel Scoring)",
        description:
          "Shoot 10 mid-range pull-ups going left and 10 going right. Do not count makes or misses; score each shot from 1 to 5 based purely on how smooth the momentum and release felt.",
      },
      {
        title: "Follow-Through Threes (Freeze the Frame)",
        description:
          "Shoot 20 threes and freeze your wrist in the follow-through for 3 full seconds after every release, whether the shot goes in or misses.",
      },
    ],
  },
} as const;

export type ConfidenceRealityOutcome = keyof typeof confidenceRealityResults;

export function getConfidenceRealityNextQuestion(
  questionId: "q1" | "q2",
  answerId: string,
): "q2" | "q3" | null {
  if (
    questionId === "q1" &&
    confidenceRealityQuestions.q1.answers.some((answer) => answer.id === answerId)
  ) {
    return "q2";
  }
  if (questionId === "q2" && answerId === "yes") return "q3";
  return null;
}

export function getConfidenceRealityOutcome(
  questionId: "q2" | "q3",
  answerId: string,
): ConfidenceRealityOutcome | null {
  if (questionId === "q2" && answerId === "no") return "unearned-confidence";
  if (questionId === "q2") return null;

  const answer = confidenceRealityQuestions.q3.answers.find((item) => item.id === answerId);
  return answer?.outcome ?? null;
}