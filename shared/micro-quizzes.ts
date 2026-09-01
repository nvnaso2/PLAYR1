export type MicroQuizOption = {
  label: string;
  icon: string;
  value: string;
};

export type MicroQuizQuestion = {
  id: string;
  prompt: string;
  helper?: string;
  options: MicroQuizOption[];
};

export type MicroQuiz = {
  id: string;
  topic: string;
  title: string;
  subtitle: string;
  questions: MicroQuizQuestion[];
};

const shotOptions = (options: Array<[string, string, string]>): MicroQuizOption[] =>
  options.map(([value, label, icon]) => ({ value, label, icon }));

export const MICRO_QUIZZES: Record<string, MicroQuiz> = {
  "jumpshot-default": {
    id: "jumpshot-default",
    topic: "your jumper",
    title: "Find your shot fix",
    subtitle: "Five quick questions. One clear next step for your jumper.",
    questions: [
      {
        id: "setup",
        prompt: "What happens most often when you shoot?",
        options: shotOptions([
          ["short", "It comes up short", "↘"],
          ["left", "It misses left", "←"],
          ["right", "It misses right", "→"],
          ["flat", "The arc is flat", "⌒"],
          ["inconsistent", "It changes every time", "∿"],
        ]),
      },
      {
        id: "context",
        prompt: "When does your shot feel least reliable?",
        options: shotOptions([
          ["catch", "Catch-and-shoot", "◎"],
          ["dribble", "Off the dribble", "↗"],
          ["fatigue", "When I get tired", "◔"],
          ["pressure", "When defenders close out", "⚡"],
          ["game", "In live games", "◉"],
        ]),
      },
      {
        id: "release",
        prompt: "Where does the ball usually leave your hand?",
        options: shotOptions([
          ["low", "Below my eyes", "↓"],
          ["side", "From the side", "↔"],
          ["center", "Right in front", "⊙"],
          ["late", "I hold it too long", "…"],
          ["unsure", "I'm not sure", "?"],
        ]),
      },
      {
        id: "feel",
        prompt: "What does your miss feel like?",
        options: shotOptions([
          ["legs", "My legs disappear", "▾"],
          ["balance", "I fade or lean", "◒"],
          ["guide", "My guide hand gets involved", "✋"],
          ["speed", "My release is rushed", "»"],
          ["focus", "I lose my target", "◎"],
        ]),
      },
      {
        id: "goal",
        prompt: "What would make the biggest difference this week?",
        options: shotOptions([
          ["consistent", "A repeatable base", "▤"],
          ["range", "More range", "⌁"],
          ["quick", "A faster release", "⚡"],
          ["pressure", "Making shots under pressure", "🔥"],
          ["confidence", "Trusting my shot", "★"],
        ]),
      },
    ],
  },
  "thumb-flick": {
    id: "thumb-flick",
    topic: "your thumb flick",
    title: "Fix your thumb flick",
    subtitle: "Five quick reads to find the shooting habit holding you back.",
    questions: [
      {
        id: "miss",
        prompt: "Where does your shot usually miss?",
        options: shotOptions([
          ["left", "Left", "←"],
          ["right", "Right", "→"],
          ["short", "Short", "↘"],
          ["long", "Long", "↗"],
          ["all", "Everywhere", "∿"],
        ]),
      },
      {
        id: "thumb",
        prompt: "What does your guide hand do?",
        options: shotOptions([
          ["quiet", "Stays quiet", "—"],
          ["flick", "Thumb flicks", "☝"],
          ["push", "Pushes the ball", "→"],
          ["late", "Comes off late", "…"],
          ["unsure", "I haven't noticed", "?"],
        ]),
      },
      {
        id: "distance",
        prompt: "Where is the habit most obvious?",
        options: shotOptions([
          ["close", "Close range", "⊙"],
          ["mid", "Mid-range", "◎"],
          ["three", "Three-point line", "◉"],
          ["off-dribble", "Off the dribble", "↗"],
          ["fatigue", "When tired", "◔"],
        ]),
      },
      {
        id: "cue",
        prompt: "What do you feel at release?",
        options: shotOptions([
          ["side-spin", "Side spin", "⟳"],
          ["tension", "Tension in my hand", "✊"],
          ["rush", "I rush it", "»"],
          ["float", "The ball floats", "⌒"],
          ["nothing", "I don't feel anything", "—"],
        ]),
      },
      {
        id: "result",
        prompt: "What would you like your next session to feel like?",
        options: shotOptions([
          ["smooth", "Smooth and repeatable", "〰"],
          ["straight", "Straight through the rim", "⊙"],
          ["quick", "Quick and ready", "⚡"],
          ["calm", "Calm under pressure", "◌"],
          ["confident", "Confident", "★"],
        ]),
      },
    ],
  },
};

export const DEFAULT_MICRO_QUIZ_ID = "jumpshot-default";

export function getMicroQuiz(id?: string | null): MicroQuiz {
  return MICRO_QUIZZES[id || DEFAULT_MICRO_QUIZ_ID] || MICRO_QUIZZES[DEFAULT_MICRO_QUIZ_ID];
}