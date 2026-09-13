import { db } from "./db";
import { programs, programItems, drills, type ProgramItemType } from "@shared/schema";
import { eq } from "drizzle-orm";

// ─── Drill ID lookups (resolved at runtime by slug-like title match) ──────
// Keeps the seed resilient if drill IDs change between environments.
type DrillKey =
  | "crossover" | "btl" | "hesitation" | "weightedBall" | "comboMoves"
  | "formShooting" | "freeThrows" | "catchShoot" | "heatUp" | "starDrill"
  | "workBack" | "tenThrees" | "shooting200" | "pullUp" | "missTwiceElbow" | "dontMissTwice"
  | "layups" | "floater" | "euroStep"
  | "defensiveStance";

const TITLE_BY_KEY: Record<DrillKey, string> = {
  crossover: "Crossover",
  btl: "Between the Legs",
  hesitation: "Hesitation Dribble",
  weightedBall: "Weighted Ball Drills",
  comboMoves: "Combo Moves Series",
  formShooting: "Form Shooting",
  freeThrows: "Free Throws",
  catchShoot: "Catch and Shoot",
  heatUp: "Heat Up Shooting",
  starDrill: "Star Drill",
  workBack: "1-2-3 Work Back",
  tenThrees: "10 3’s In a Row",
  shooting200: "Shooting Workout - 200 Makes",
  pullUp: "Pull-Up Jumper",
  missTwiceElbow: "Miss Twice Elbow Series",
  dontMissTwice: "Don’t Miss Twice",
  layups: "Layups",
  floater: "Floater",
  euroStep: "Euro Step",
  defensiveStance: "Defensive Stance",
};

async function resolveDrillIds(): Promise<Partial<Record<DrillKey, string>>> {
  const wanted = Object.values(TITLE_BY_KEY);
  const rows = await db.select().from(drills);
  const byTitle = new Map(rows.map((d) => [d.title.trim(), d.id]));
  const resolved: Partial<Record<DrillKey, string>> = {};
  for (const [key, title] of Object.entries(TITLE_BY_KEY) as [DrillKey, string][]) {
    const id = byTitle.get(title.trim());
    if (id) resolved[key] = id;
  }
  return resolved;
}

type SeedItem = {
  dayNumber: number;
  orderInDay?: number;
  itemType: ProgramItemType;
  title: string;
  notes?: string;
  keyTakeaways?: string[];
  drillKey?: DrillKey;
  workout?: Array<{ drillKey: DrillKey; sets?: number; reps?: number; durationSec?: number; notes?: string }>;
  challenge?: { scoringMetric: string; target?: number; timeLimitSec?: number; description?: string };
  watchUrl?: string;
  watchProvider?: "youtube" | "vimeo" | "internal";
  estimatedMinutes?: number;
};

type SeedProgram = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  accentColor: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "elite";
  lengthDays: number;
  categoryTags: string[];
  estimatedMinutesPerDay: number;
  isFeatured: boolean;
  contentType?: "program" | "course";
  isPro?: boolean;
  trailerVideoUrl?: string;
  items: SeedItem[];
};

// ─── Programs ─────────────────────────────────────────────────────────────

const PROGRAMS: SeedProgram[] = [
  // ─────────── Program 1: 7-Day Ball Handling Foundation ───────────
  {
    slug: "ball-handling-foundation-7",
    title: "7-Day Ball Handling Foundation",
    tagline: "Build a handle that doesn't break under pressure.",
    description:
      "A focused week to build the fundamentals every guard needs: tight crossovers, reliable between-the-legs, and the hesitation move that freezes defenders. Short daily sessions, one rest day, finished off with a real challenge.",
    accentColor: "#f97316", // orange
    difficulty: "beginner",
    lengthDays: 7,
    categoryTags: ["ball-handling"],
    estimatedMinutesPerDay: 25,
    isFeatured: true,
    items: [
      {
        dayNumber: 1, orderInDay: 0,
        itemType: "watch",
        title: "Why your handle holds you back",
        notes: "Quick mindset video. The players who get separation aren't the fastest — they're the most committed to fundamentals.",
        watchUrl: "https://www.youtube.com/watch?v=1MeUfc1NPvU",
        watchProvider: "youtube",
        estimatedMinutes: 5,
      },
      {
        dayNumber: 1, orderInDay: 1,
        itemType: "drill",
        title: "Crossover — pure reps",
        notes: "Eyes up the entire time. If your eyes drop, restart your set.",
        drillKey: "crossover",
        estimatedMinutes: 20,
      },
      {
        dayNumber: 2, orderInDay: 0,
        itemType: "workout",
        title: "Stack day: Crossover + Between the Legs",
        notes: "Warm up with crossovers, then drill the BTL. Smooth before fast.",
        workout: [
          { drillKey: "crossover", sets: 3, reps: 30, notes: "Warm-up — eyes up, low stance" },
          { drillKey: "btl", sets: 4, reps: 20, notes: "Step wide, ball tight to your body" },
        ],
        estimatedMinutes: 30,
      },
      {
        dayNumber: 3, orderInDay: 0,
        itemType: "drill",
        title: "Hesitation Dribble",
        notes: "Sell. The. Pause. Defenders only freeze if they believe you stopped.",
        drillKey: "hesitation",
        estimatedMinutes: 25,
      },
      {
        dayNumber: 4, orderInDay: 0,
        itemType: "rest",
        title: "Recovery day",
        notes: "Foam roll your forearms and wrists. Mentally walk through tomorrow's combo.",
        estimatedMinutes: 0,
      },
      {
        dayNumber: 5, orderInDay: 0,
        itemType: "workout",
        title: "Combo flow",
        notes: "Weave all three moves together. The goal is smoothness, not speed.",
        workout: [
          { drillKey: "crossover", sets: 2, reps: 20, notes: "Warm-up" },
          { drillKey: "btl", sets: 3, reps: 15 },
          { drillKey: "hesitation", sets: 3, reps: 10 },
        ],
        estimatedMinutes: 35,
      },
      {
        dayNumber: 6, orderInDay: 0,
        itemType: "drill",
        title: "Weighted Ball Strength",
        notes: "Heavy ball for control & wrist strength. Slow and deliberate reps.",
        drillKey: "weightedBall",
        estimatedMinutes: 20,
      },
      {
        dayNumber: 7, orderInDay: 0,
        itemType: "challenge",
        title: "Final Challenge: 100-Dribble Combo",
        notes: "100 alternating dribbles (right hand, left hand, crossover, between-the-legs) in under 60 seconds without losing the ball. Log your fastest time.",
        challenge: {
          scoringMetric: "timeSeconds",
          target: 60,
          timeLimitSec: 120,
          description: "100 alternating dribbles in the fastest time possible without losing the ball.",
        },
        estimatedMinutes: 15,
      },
    ],
  },

  // ─────────── Program 2: 30-Day Shooter's Mindset ───────────
  {
    slug: "shooters-mindset-30",
    title: "30-Day Shooter's Mindset",
    tagline: "Form. Footwork. Fearless reps.",
    description:
      "A full month built around one idea: shooters are made in the gym, not born. You'll move from form-shooting and free throws into mid-range, then to the three. We've left rest days in. Trust the process.",
    accentColor: "#ef4444", // red
    difficulty: "intermediate",
    lengthDays: 30,
    categoryTags: ["shooting"],
    estimatedMinutesPerDay: 35,
    isFeatured: true,
    items: [
      // Week 1 — Form & free throws (days 1-7)
      { dayNumber: 1, itemType: "watch", title: "The Shooter's Mindset", notes: "Set the tone for the next 30 days.", watchUrl: "https://www.youtube.com/watch?v=NIFK8x-1qPA", watchProvider: "youtube", estimatedMinutes: 6 },
      { dayNumber: 1, orderInDay: 1, itemType: "drill", title: "Form Shooting (close range)", drillKey: "formShooting", notes: "Goal isn't volume — it's perfect form on every rep.", estimatedMinutes: 25 },
      { dayNumber: 2, itemType: "drill", title: "Free Throws", drillKey: "freeThrows", notes: "Same routine every shot. Visualize. Breathe. Shoot.", estimatedMinutes: 25 },
      { dayNumber: 3, itemType: "workout", title: "Form + Free Throws", workout: [
        { drillKey: "formShooting", sets: 3, reps: 25, notes: "Warm-up close" },
        { drillKey: "freeThrows", sets: 5, reps: 10, notes: "Track your make %" },
      ], estimatedMinutes: 40 },
      { dayNumber: 4, itemType: "rest", title: "Rest", notes: "Stretch your shoulders, wrist, fingers. Watch tape." },
      { dayNumber: 5, itemType: "drill", title: "Catch and Shoot", drillKey: "catchShoot", notes: "Stay low. Hands ready. No dip on the catch.", estimatedMinutes: 30 },
      { dayNumber: 6, itemType: "drill", title: "Free Throws — pressure reps", drillKey: "freeThrows", notes: "Sprint a baseline-to-baseline before each set of 5. Shoot tired.", estimatedMinutes: 25 },
      { dayNumber: 7, itemType: "watch", title: "How elite shooters practice", watchUrl: "https://www.youtube.com/watch?v=4F8NIwHVmw0", watchProvider: "youtube", estimatedMinutes: 8 },

      // Week 2 — Mid-range (days 8-14)
      { dayNumber: 8, itemType: "drill", title: "1-2-3 Work Back", drillKey: "workBack", notes: "Mid-range mastery. Footwork is everything.", estimatedMinutes: 35 },
      { dayNumber: 9, itemType: "drill", title: "Star Drill", drillKey: "starDrill", notes: "5 spots. Move with purpose. Each shot earns the next.", estimatedMinutes: 30 },
      { dayNumber: 10, itemType: "workout", title: "Mid-range stack", workout: [
        { drillKey: "formShooting", sets: 2, reps: 20, notes: "Quick warm-up" },
        { drillKey: "workBack", sets: 3, reps: 15 },
        { drillKey: "starDrill", sets: 2, reps: 20 },
      ], estimatedMinutes: 45 },
      { dayNumber: 11, itemType: "rest", title: "Rest", notes: "Don't skip. Recovery makes the work stick." },
      { dayNumber: 12, itemType: "drill", title: "Catch and Shoot — full speed", drillKey: "catchShoot", notes: "Every shot a game shot.", estimatedMinutes: 30 },
      { dayNumber: 13, itemType: "drill", title: "Heat Up Shooting", drillKey: "heatUp", notes: "Find your rhythm. Stay in it.", estimatedMinutes: 35 },
      { dayNumber: 14, itemType: "workout", title: "Pressure mid-range", workout: [
        { drillKey: "starDrill", sets: 3, reps: 25 },
        { drillKey: "freeThrows", sets: 4, reps: 5, notes: "Between every set, sprint" },
      ], estimatedMinutes: 40 },

      // Week 3 — From three (days 15-21)
      { dayNumber: 15, itemType: "watch", title: "The 3-point shot mechanics", watchUrl: "https://www.youtube.com/watch?v=4F8NIwHVmw0", watchProvider: "youtube", estimatedMinutes: 7 },
      { dayNumber: 16, itemType: "drill", title: "Heat Up Shooting (from 3)", drillKey: "heatUp", notes: "Step back to the line. Same form, just deeper.", estimatedMinutes: 35 },
      { dayNumber: 17, itemType: "drill", title: "10 Threes In a Row", drillKey: "tenThrees", notes: "Patience. Don't rush. Reset if you miss.", estimatedMinutes: 40 },
      { dayNumber: 18, itemType: "rest", title: "Rest", notes: "Visualize game-winning shots. Believe them." },
      { dayNumber: 19, itemType: "drill", title: "Catch and Shoot from 3", drillKey: "catchShoot", notes: "Game-speed catch, set, release. No hesitation.", estimatedMinutes: 30 },
      { dayNumber: 20, itemType: "workout", title: "Three-point grind", workout: [
        { drillKey: "tenThrees", sets: 3, reps: 1, notes: "Earn it" },
        { drillKey: "catchShoot", sets: 3, reps: 25 },
      ], estimatedMinutes: 45 },
      { dayNumber: 21, itemType: "drill", title: "Free Throws — pressure", drillKey: "freeThrows", notes: "After tired threes, knock these down.", estimatedMinutes: 20 },

      // Week 4 — Mixed & ramp (days 22-29)
      { dayNumber: 22, itemType: "workout", title: "200 Makes Workout", workout: [
        { drillKey: "shooting200", sets: 1, reps: 200, notes: "Track makes vs. attempts" },
      ], estimatedMinutes: 60 },
      { dayNumber: 23, itemType: "rest", title: "Rest", notes: "Massive day yesterday. Take it easy." },
      { dayNumber: 24, itemType: "drill", title: "Star Drill (timed)", drillKey: "starDrill", notes: "Beat your day-9 time.", estimatedMinutes: 30 },
      { dayNumber: 25, itemType: "drill", title: "10 Threes In a Row", drillKey: "tenThrees", notes: "Compare your reps to day 17.", estimatedMinutes: 40 },
      { dayNumber: 26, itemType: "workout", title: "Tired-shooter combo", workout: [
        { drillKey: "freeThrows", sets: 5, reps: 10, notes: "Sprint between sets" },
        { drillKey: "catchShoot", sets: 4, reps: 20 },
      ], estimatedMinutes: 45 },
      { dayNumber: 27, itemType: "rest", title: "Rest", notes: "Mental rep day. Walk through tomorrow's challenge." },
      { dayNumber: 28, itemType: "drill", title: "Heat Up Shooting", drillKey: "heatUp", notes: "Find your shot before the final challenge.", estimatedMinutes: 30 },
      { dayNumber: 29, itemType: "watch", title: "Pre-challenge prep", watchUrl: "https://www.youtube.com/watch?v=NIFK8x-1qPA", watchProvider: "youtube", estimatedMinutes: 5 },

      // Day 30 — Challenge
      { dayNumber: 30, itemType: "challenge", title: "Final Challenge: 5-Spot Three-Point Test",
        notes: "From 5 spots around the arc (corners, wings, top of key) — make 10 threes total in under 5 minutes. Log your makes & time.",
        challenge: {
          scoringMetric: "madeShots",
          target: 10,
          timeLimitSec: 300,
          description: "Make 10 three-pointers across all 5 arc spots in under 5 minutes.",
        },
        estimatedMinutes: 20,
      },
    ],
  },

  // ─────────── Program 3: 14-Day Finishing Mastery ───────────
  {
    slug: "finishing-mastery-14",
    title: "14-Day Finishing Mastery",
    tagline: "Score through contact. From every angle.",
    description:
      "Two weeks dedicated to finishing at the rim. Layups, floaters, Euro steps, and finishing through contact. By day 14, you'll attack the rim with a plan instead of a prayer.",
    accentColor: "#a855f7", // purple
    difficulty: "advanced",
    lengthDays: 14,
    categoryTags: ["finishing"],
    estimatedMinutesPerDay: 30,
    isFeatured: false,
    items: [
      { dayNumber: 1, itemType: "watch", title: "How to attack the rim", watchUrl: "https://www.youtube.com/watch?v=Ck5fYJ3Tmuo", watchProvider: "youtube", estimatedMinutes: 6 },
      { dayNumber: 1, orderInDay: 1, itemType: "drill", title: "Layups — both hands", drillKey: "layups", notes: "Strong-hand and weak-hand finishes. 25 each.", estimatedMinutes: 20 },
      { dayNumber: 2, itemType: "drill", title: "Floater", drillKey: "floater", notes: "High arc. Soft touch. Use the rim.", estimatedMinutes: 25 },
      { dayNumber: 3, itemType: "workout", title: "Layup + Floater combo", workout: [
        { drillKey: "layups", sets: 3, reps: 20, notes: "Both hands" },
        { drillKey: "floater", sets: 3, reps: 10 },
      ], estimatedMinutes: 35 },
      { dayNumber: 4, itemType: "rest", title: "Rest", notes: "Stretch your hips and ankles." },
      { dayNumber: 5, itemType: "drill", title: "Euro Step", drillKey: "euroStep", notes: "Exaggerate the change of direction. Read the defender.", estimatedMinutes: 30 },
      { dayNumber: 6, itemType: "workout", title: "Triple-finish stack", workout: [
        { drillKey: "layups", sets: 2, reps: 15, notes: "Warm-up" },
        { drillKey: "floater", sets: 3, reps: 10 },
        { drillKey: "euroStep", sets: 3, reps: 8 },
      ], estimatedMinutes: 40 },
      { dayNumber: 7, itemType: "rest", title: "Rest", notes: "Halfway there. Watch tape of your favorite finisher." },
      { dayNumber: 8, itemType: "drill", title: "Layups under fatigue", drillKey: "layups", notes: "Sprint baseline-to-baseline before each set of 10.", estimatedMinutes: 25 },
      { dayNumber: 9, itemType: "drill", title: "Floater — game speed", drillKey: "floater", notes: "Two dribbles into floater. Repeat.", estimatedMinutes: 25 },
      { dayNumber: 10, itemType: "workout", title: "Heavy finishing day", workout: [
        { drillKey: "layups", sets: 4, reps: 20 },
        { drillKey: "floater", sets: 4, reps: 10 },
        { drillKey: "euroStep", sets: 3, reps: 10 },
      ], estimatedMinutes: 50 },
      { dayNumber: 11, itemType: "rest", title: "Rest", notes: "You've earned it." },
      { dayNumber: 12, itemType: "drill", title: "Euro Step — combo finishing", drillKey: "euroStep", notes: "Euro into reverse. Euro into floater. Mix it up.", estimatedMinutes: 30 },
      { dayNumber: 13, itemType: "workout", title: "Pre-challenge tune-up", workout: [
        { drillKey: "layups", sets: 2, reps: 20 },
        { drillKey: "floater", sets: 2, reps: 10 },
        { drillKey: "euroStep", sets: 2, reps: 10 },
      ], estimatedMinutes: 35 },
      { dayNumber: 14, itemType: "challenge", title: "Final Challenge: 20-Finish Gauntlet",
        notes: "From 4 angles (right baseline, right wing, left wing, left baseline), make 5 finishes per angle (mix layups, floaters, Euro steps). 20 total. Log how many attempts it took.",
        challenge: {
          scoringMetric: "madeShots",
          target: 20,
          description: "Make 20 finishes across 4 attack angles, mixing all three finish types.",
        },
        estimatedMinutes: 25,
      },
    ],
  },

  // ─────────── Course 1: The Mechanical Foundation ───────────
  {
    slug: "mechanical-foundation-14",
    title: "The Mechanical Foundation",
    tagline: "Build a repeatable jumper from the ground up.",
    description:
      "A 14-day shooting course built in four phases: establish the mechanical foundation, create space with purpose, track high-volume reps, and convert the work at game speed. Each day pairs a lesson with a focused workout and a small set of ideas to carry into the gym.",
    accentColor: "#f97316",
    difficulty: "intermediate",
    lengthDays: 14,
    categoryTags: ["shooting", "mechanics", "courses"],
    estimatedMinutesPerDay: 35,
    isFeatured: true,
    contentType: "course",
    isPro: true,
    items: [
      {
        dayNumber: 1,
        orderInDay: 0,
        itemType: "watch",
        title: "Ground Force & Balance",
        notes: "Using the balls of your feet as a springboard; maintaining vertical-axis balance under fatigue.",
        keyTakeaways: [
          "Stay connected to the floor through the balls of your feet.",
          "Keep your head, hips, and shooting shoulder stacked as fatigue rises.",
          "Balance is the starting point for every repeatable make.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 1,
        orderInDay: 1,
        itemType: "workout",
        title: "Base Balance Warm-up & 100-Make Springboard Progression",
        notes: "Own your base before adding speed. Reset your feet and vertical axis after every miss.",
        workout: [
          { drillKey: "formShooting", sets: 3, reps: 20, notes: "Close-range balance reps" },
          { drillKey: "catchShoot", sets: 4, reps: 25, notes: "Finish with 100 balanced makes" },
        ],
        estimatedMinutes: 35,
      },
      {
        dayNumber: 2,
        orderInDay: 0,
        itemType: "watch",
        title: "Explosive Sequencing & The Dip",
        notes: "Hips drop, ball moves first, and the elbow/hand loads under the ball without a pause.",
        keyTakeaways: [
          "Let the ball and hips begin the shot together.",
          "A compact dip is faster than a long wind-up.",
          "Load under the ball so the release travels in one direction.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 2,
        orderInDay: 1,
        itemType: "workout",
        title: "Energy Transfer Reps",
        notes: "Move from low hips to a fast pocket lift. Keep the sequence compact and repeatable.",
        workout: [
          { drillKey: "formShooting", sets: 3, reps: 25, notes: "Low-hips to pocket lift" },
          { drillKey: "catchShoot", sets: 4, reps: 15, notes: "Game-speed sequence" },
        ],
        estimatedMinutes: 35,
      },
      {
        dayNumber: 3,
        orderInDay: 0,
        itemType: "watch",
        title: "The Frictionless Follow-Through",
        notes: "Guide-hand release, wrist snap, clean backspin, and holding your finish.",
        keyTakeaways: [
          "The guide hand leaves the ball without steering it.",
          "A relaxed wrist creates clean backspin and a soft flight.",
          "Hold your finish long enough to see the result.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 3,
        orderInDay: 1,
        itemType: "workout",
        title: "Straight-Line Spin Test & 50 Swishes Only",
        notes: "Start close enough to make clean feedback unavoidable. Do not move back until the ball is spinning correctly.",
        workout: [
          { drillKey: "formShooting", sets: 4, reps: 25, notes: "Straight-line spin test" },
          { drillKey: "freeThrows", sets: 5, reps: 10, notes: "50 swishes target" },
        ],
        estimatedMinutes: 35,
      },
      {
        dayNumber: 4,
        orderInDay: 0,
        itemType: "watch",
        title: "Mechanics Lock-In & Testing",
        notes: "Put balance, sequencing, and follow-through into one continuous motion.",
        keyTakeaways: [
          "The best motion is the one you can repeat without extra thought.",
          "Use the same checkpoints at every distance.",
          "Today creates the baseline you will compare against later.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 4,
        orderInDay: 1,
        itemType: "workout",
        title: "The Mechanical Benchmark Test",
        notes: "Log your initial baseline percentages before moving into dynamic movement.",
        workout: [
          { drillKey: "formShooting", sets: 2, reps: 25, notes: "Mechanics reset" },
          { drillKey: "catchShoot", sets: 4, reps: 25, notes: "Record makes and attempts" },
        ],
        estimatedMinutes: 40,
      },
      {
        dayNumber: 5,
        orderInDay: 0,
        itemType: "watch",
        title: "The 5 Essential Shot-Creation Moves",
        notes: "Build your five core moves off the bounce while keeping your base balanced on every pickup.",
        keyTakeaways: [
          "Create space with your feet before trying to create it with speed.",
          "Every move needs a balanced pickup and a clear shot pocket.",
          "Choose a small menu you can trust instead of collecting moves.",
        ],
        estimatedMinutes: 10,
      },
      {
        dayNumber: 5,
        orderInDay: 1,
        itemType: "workout",
        title: "The 5-Move Matrix",
        notes: "Complete 10 makes per move from three spots. Keep the pickup quiet and the finish balanced.",
        workout: [
          { drillKey: "pullUp", sets: 3, reps: 10, notes: "Three spots" },
          { drillKey: "catchShoot", sets: 3, reps: 10, notes: "One set per move" },
          { drillKey: "heatUp", sets: 2, reps: 15, notes: "Game-speed finish" },
        ],
        estimatedMinutes: 45,
      },
      {
        dayNumber: 6,
        orderInDay: 0,
        itemType: "watch",
        title: "Off-Ball Catch & Footwork Mechanics",
        notes: "1-2 steps, hop pickups, and aligning your body to the rim out of full-sprint movement.",
        keyTakeaways: [
          "Win the catch before the ball reaches your hands.",
          "Use 1-2 and hop footwork intentionally rather than reactively.",
          "Arrive square enough to shoot without a second adjustment.",
        ],
        estimatedMinutes: 9,
      },
      {
        dayNumber: 6,
        orderInDay: 1,
        itemType: "workout",
        title: "Off-Ball Relocation Shooting",
        notes: "Relocate, catch, and sweep into the shot without letting the feet outrun the upper body.",
        workout: [
          { drillKey: "catchShoot", sets: 4, reps: 20, notes: "1-2 and hop pickups" },
          { drillKey: "heatUp", sets: 3, reps: 15, notes: "Sweep-and-sway reps" },
        ],
        estimatedMinutes: 40,
      },
      {
        dayNumber: 7,
        orderInDay: 0,
        itemType: "watch",
        title: "Dynamic Pickups & Ball Handling",
        notes: "Clean pocket gathers, high-to-low transitions, and eliminating wasted motion off the dribble.",
        keyTakeaways: [
          "Gather the ball into the pocket instead of carrying it around the body.",
          "A lower pickup buys time without adding extra steps.",
          "Remove motion that does not help you get balanced or create space.",
        ],
        estimatedMinutes: 9,
      },
      {
        dayNumber: 7,
        orderInDay: 1,
        itemType: "workout",
        title: "Heavy-Ball / High-Speed Gather Series",
        notes: "Alternate controlled strength reps with game-speed pickups. Keep the final motion smooth.",
        workout: [
          { drillKey: "pullUp", sets: 3, reps: 15, notes: "High-to-low transitions" },
          { drillKey: "heatUp", sets: 3, reps: 20, notes: "Fast pocket gathers" },
        ],
        estimatedMinutes: 40,
      },
      {
        dayNumber: 8,
        orderInDay: 0,
        itemType: "watch",
        title: "Space Creation Combine",
        notes: "Combine off-ball catches and on-ball creation in one continuous circuit.",
        keyTakeaways: [
          "The same base rules apply whether you catch or create.",
          "Space is useful only if you can rise into a stable shot.",
          "Treat every transition as a chance to rehearse game speed.",
        ],
        estimatedMinutes: 10,
      },
      {
        dayNumber: 8,
        orderInDay: 1,
        itemType: "workout",
        title: "150-Make Dynamic Movement Circuit",
        notes: "Cycle through relocation, pull-ups, and catch-and-shoot reps without losing your mechanical checkpoints.",
        workout: [
          { drillKey: "catchShoot", sets: 3, reps: 25, notes: "Relocation makes" },
          { drillKey: "pullUp", sets: 3, reps: 15, notes: "Space creation" },
          { drillKey: "heatUp", sets: 2, reps: 15, notes: "Close the circuit" },
        ],
        estimatedMinutes: 50,
      },
      {
        dayNumber: 9,
        orderInDay: 0,
        itemType: "watch",
        title: "The Mindset of the Streak",
        notes: "Frame consecutive makes correctly and overcome the fear of missing after three makes.",
        keyTakeaways: [
          "A streak is a process target, not a reason to change your mechanics.",
          "Stay present on the next rep instead of protecting the last one.",
          "Misses are information; they do not change your identity as a shooter.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 9,
        orderInDay: 1,
        itemType: "workout",
        title: "Streak 5 Challenge",
        notes: "Hit five in a row from five spots to advance. Reset calmly after a miss.",
        workout: [
          { drillKey: "tenThrees", sets: 5, reps: 1, notes: "Five consecutive makes per spot" },
          { drillKey: "freeThrows", sets: 3, reps: 10, notes: "Reset routine" },
        ],
        estimatedMinutes: 40,
      },
      {
        dayNumber: 10,
        orderInDay: 0,
        itemType: "watch",
        title: "The Warm-up Ritual & Flow State",
        notes: "Use a repeatable mental and physical routine to unlock confidence before the first game-speed jump shot.",
        keyTakeaways: [
          "A ritual removes decisions when confidence is low.",
          "Start with makes that feel familiar before adding speed.",
          "Flow is built through consistent cues, not forced emotion.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 10,
        orderInDay: 1,
        itemType: "workout",
        title: "Pre-Workout Activation Protocol",
        notes: "Run the same activation sequence every time and notice which cues settle your shot.",
        workout: [
          { drillKey: "formShooting", sets: 3, reps: 20, notes: "Touch and rhythm" },
          { drillKey: "catchShoot", sets: 3, reps: 20, notes: "Move into flow" },
        ],
        estimatedMinutes: 30,
      },
      {
        dayNumber: 11,
        orderInDay: 0,
        itemType: "watch",
        title: "Data & Volume Tracking",
        notes: "Track makes versus misses systematically so confidence is built on evidence.",
        keyTakeaways: [
          "Record the work honestly so the data can help you.",
          "Compare trends over time instead of judging one session.",
          "Volume only matters when the rep quality stays connected to the goal.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 11,
        orderInDay: 1,
        itemType: "workout",
        title: "The 200-Make Metric Log",
        notes: "Use in-app tracking to record makes, attempts, and the conditions of the session.",
        workout: [
          { drillKey: "shooting200", sets: 1, reps: 200, notes: "Log every attempt" },
        ],
        estimatedMinutes: 60,
      },
      {
        dayNumber: 12,
        orderInDay: 0,
        itemType: "watch",
        title: "High-Fatigue Conversion",
        notes: "Keep balance and sequencing intact when your legs are burning.",
        keyTakeaways: [
          "Fatigue exposes the first mechanical shortcut you take.",
          "Slow down the setup if you cannot stay balanced.",
          "Game-speed does not mean rushed; it means decisive.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 12,
        orderInDay: 1,
        itemType: "workout",
        title: "Sprint-to-Shot Burnout Drills",
        notes: "Sprint, settle, and shoot. Protect your base and finish through the same checkpoints.",
        workout: [
          { drillKey: "heatUp", sets: 4, reps: 15, notes: "Sprint into game shots" },
          { drillKey: "catchShoot", sets: 3, reps: 20, notes: "Hold the finish" },
        ],
        estimatedMinutes: 45,
      },
      {
        dayNumber: 13,
        orderInDay: 0,
        itemType: "watch",
        title: "Game-Simulation Testing",
        notes: "Simulate defensive pressure, contested vision, and quick-trigger releases.",
        keyTakeaways: [
          "Pressure changes the decision window, not the mechanics.",
          "See the target early and trust the first clean read.",
          "Use a score that tells you what to repeat next time.",
        ],
        estimatedMinutes: 9,
      },
      {
        dayNumber: 13,
        orderInDay: 1,
        itemType: "workout",
        title: "The Game-Speed Benchmark Test",
        notes: "Create a controlled pressure environment and compare the result to Day 4.",
        workout: [
          { drillKey: "pullUp", sets: 3, reps: 15, notes: "Quick-trigger pull-ups" },
          { drillKey: "tenThrees", sets: 3, reps: 1, notes: "Contested-vision simulation" },
        ],
        estimatedMinutes: 45,
      },
      {
        dayNumber: 14,
        orderInDay: 0,
        itemType: "watch",
        title: "The Final 100 & Graduation",
        notes: "Maintain this standard for 200+ days and integrate the system into your off-season.",
        keyTakeaways: [
          "The course is a starting standard, not a finish line.",
          "Keep the checkpoints visible as volume and speed increase.",
          "Build the next phase around the part of your game that still breaks.",
        ],
        estimatedMinutes: 8,
      },
      {
        dayNumber: 14,
        orderInDay: 1,
        itemType: "workout",
        title: "The Adaptive Shot Final Challenge",
        notes: "Complete the final 100 with the shot mix that best tests your current game.",
        workout: [
          { drillKey: "shooting200", sets: 1, reps: 100, notes: "Final 100 makes" },
          { drillKey: "freeThrows", sets: 2, reps: 10, notes: "Close with pressure free throws" },
        ],
        estimatedMinutes: 50,
      },
    ],
  },
];

// ─── Seed function ────────────────────────────────────────────────────────

export async function seedPrograms() {
  // Idempotent: skip if any of our seeded programs already exist
  const existing = await db.select({ slug: programs.slug }).from(programs);
  const existingSlugs = new Set(existing.map((r) => r.slug));

  const drillIds = await resolveDrillIds();
  let inserted = 0;

  // The product now exposes courses only. Keep the historical definitions in
  // this file for reference, but never recreate the retired programs.
  for (const p of PROGRAMS.filter((program) => program.contentType === "course")) {
    if (existingSlugs.has(p.slug)) continue;

    const [program] = await db
      .insert(programs)
      .values({
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        description: p.description,
        accentColor: p.accentColor,
        contentType: p.contentType ?? "program",
        isPro: p.isPro ?? true,
        trailerVideoUrl: p.trailerVideoUrl,
        authorType: "system",
        lengthDays: p.lengthDays,
        cadence: "userPaced",
        difficulty: p.difficulty,
        categoryTags: p.categoryTags,
        estimatedMinutesPerDay: p.estimatedMinutesPerDay,
        visibility: "public",
        isPublished: true,
        isFeatured: p.isFeatured,
      })
      .returning();

    const itemRows = p.items.map((it) => {
      const row: any = {
        programId: program.id,
        dayNumber: it.dayNumber,
        orderInDay: it.orderInDay ?? 0,
        itemType: it.itemType,
        title: it.title,
        notes: it.notes,
        keyTakeaways: it.keyTakeaways,
        estimatedMinutes: it.estimatedMinutes,
      };
      if (it.drillKey) row.drillId = drillIds[it.drillKey] ?? null;
      if (it.workout) {
        row.workoutSpec = it.workout
          .map((w) => ({ ...w, drillId: drillIds[w.drillKey] ?? null }))
          .filter((w) => w.drillId)
          .map(({ drillKey, ...rest }) => rest);
      }
      if (it.challenge) row.challengeSpec = it.challenge;
      if (it.watchUrl) {
        row.watchUrl = it.watchUrl;
        row.watchProvider = it.watchProvider ?? "youtube";
      }
      return row;
    });

    if (itemRows.length > 0) {
      await db.insert(programItems).values(itemRows);
    }
    inserted++;
  }

  if (inserted > 0) {
    console.log(`Programs seeded: ${inserted} new`);
  } else {
    console.log("Programs already seeded, skipping");
  }
}
