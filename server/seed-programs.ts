import { db } from "./db";
import { programs, programItems, drills, type ProgramItemType } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { mechanicalFoundationWorkouts } from "./mechanical-foundation-workouts";

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
  workout?: Array<{ drillKey?: DrillKey; title?: string; matchTitle?: string; sets?: number; reps?: number; durationSec?: number; notes?: string }>;
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
        title: "Balance & Springboard Shooting",
        notes: "Work through the listed form, balance, and movement shots. Keep the ball of the foot connected to the floor and stay balanced through every release.",
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
        title: "Ball Moves First, Hips Load",
        notes: "Move from low hips into a fast pocket lift. Keep the sequence compact and repeatable.",
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
        title: "Follow-Through & Spin Test",
        notes: "Hold your finish on the first shooting block, then complete the form-shot and touch work listed below.",
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
        title: "Mechanics Recap & Volume Test",
        notes: "Pick a cue from the first three days, then complete the recap and volume workout while tracking how the shots feel.",
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
        title: "Creating Space & Movement Patterns",
        notes: "Practice the listed quick-dribble, jab-return, side-step, and step-back patterns. Get balanced before every pickup.",
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
        title: "Off-Ball Catch & Movement",
        notes: "Practice 1-2 and two-foot catches, curls, and slide drags. Plant and absorb before the shot.",
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
        title: "Ball on a String — Handle & Game Shots",
        notes: "Repeat the handle series for three rounds, then apply the combinations to pull-ups and step-backs.",
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
        title: "Smooth Pickups & Dynamic Shooting",
        notes: "Combine balanced pickups, attack dribbles, floaters, and shooting from the listed spots.",
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
        title: "Mindset, Range & Streaks",
        notes: "Warm up, find your range, and run the listed calibration and streak challenges. Reset calmly after a miss.",
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
        title: "75-Minute Complete Workout",
        notes: "Complete the full warm-up, shooting, finishing, ball-screen, and ball-handling session from the blueprint.",
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
        title: "Confidence & Measurement Workout",
        notes: "Record how each shot felt without obsessing over the result. Finish the running and pre-game nerves protocol.",
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
        title: "High-Fatigue Conversion Workout",
        notes: "Sprint the court, settle, and shoot under fatigue. Protect your balance and keep the same mechanics.",
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
        title: "Game-Simulation Workout",
        notes: "Use chairs and cones to recreate off-ball and on-ball reads, then test the shots in pickup games.",
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
        title: "Pressure Games & Final Challenge",
        notes: "Set a goal, compete through the shooting games, and finish with pressure free throws and pickup play.",
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
  const existing = await db.select({ id: programs.id, slug: programs.slug }).from(programs);
  const existingBySlug = new Map(existing.map((r) => [r.slug, r.id]));
  const drillIds = await resolveDrillIds();
  const catalog = await db.select({ id: drills.id, title: drills.title }).from(drills);
  const drillIdByTitle = new Map(catalog.map((d) => [d.title.trim().toLowerCase(), d.id]));
  let inserted = 0;
  let updated = 0;

  // The product now exposes courses only. Keep the historical definitions in
  // this file for reference, but never recreate the retired programs.
  for (const p of PROGRAMS.filter((program) => program.contentType === "course")) {
    let programId = existingBySlug.get(p.slug);
    if (!programId) {
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
      programId = program.id;
      inserted++;
    }

    const itemRows = p.items.map((it) => {
      const row: any = {
        programId,
        dayNumber: it.dayNumber,
        orderInDay: it.orderInDay ?? 0,
        itemType: it.itemType,
        title: it.title,
        notes: it.notes,
        keyTakeaways: it.keyTakeaways,
        estimatedMinutes: it.estimatedMinutes,
      };
      if (it.drillKey) row.drillId = drillIds[it.drillKey] ?? null;
      const courseWorkout = p.slug === "mechanical-foundation-14" ? mechanicalFoundationWorkouts[it.dayNumber] : undefined;
      const workout = courseWorkout ?? it.workout;
      if (workout) {
        row.workoutSpec = workout.map((w: { drillKey?: DrillKey; title?: string; matchTitle?: string; sets?: number; reps?: number; durationSec?: number; notes?: string }) => {
          const title = w.title ?? (w.drillKey ? TITLE_BY_KEY[w.drillKey] : "Workout drill");
          const catalogAliases: Record<string, string> = {
            "Free Throw Routine": "Free Throws",
            "Pull-Up Jumper": "Mid Range Pull-ups",
            "Catch and Shoot": "Catch & Shoot 3s",
            "Behind the Backs": "Behind the Back",
            "Cross Tweens": "Cross Between",
            "Tween Behinds": "Between Behind",
            "Cross Behinds": "Cross Behind",
            "Cross, Tween, Behinds": "Cross Between Behind",
            "In & Outs": "In & Out Crossover Combo",
            "Find Your Range Drill": "Find Your Range",
            "Warm Up": "The Warmup",
            "3s": "Catch & Shoot 3s",
            "Wing Curls": "Wing Curl 3’s – 20 Makes",
            "Transition 3s — Top of Key": "Transition 3's",
            "Curry Drill — Mid Range": "Curry Drill",
            "Curry Drill — 3PT": "Curry Drill",
          };
          const requestedCatalogTitle = w.matchTitle ?? catalogAliases[title] ?? title;
          const catalogTitle = catalogAliases[requestedCatalogTitle] ?? requestedCatalogTitle;
          const drillId = drillIdByTitle.get(catalogTitle.trim().toLowerCase())
            ?? (w.drillKey ? drillIds[w.drillKey] : undefined);
          return {
            ...(drillId ? { drillId } : {}),
            title,
            ...(w.sets ? { sets: w.sets } : {}),
            ...(w.reps !== undefined ? { reps: w.reps } : {}),
            ...(w.durationSec ? { durationSec: w.durationSec } : {}),
            ...(w.notes ? { notes: w.notes } : {}),
          };
        });
      }
      if (it.challenge) row.challengeSpec = it.challenge;
      if (it.watchUrl) {
        row.watchUrl = it.watchUrl;
        row.watchProvider = it.watchProvider ?? "youtube";
      }
      return row;
    });

    for (const row of itemRows) {
      const [current] = await db.select({
        id: programItems.id,
        itemType: programItems.itemType,
        workoutSpec: programItems.workoutSpec,
      })
        .from(programItems)
        .where(and(
          eq(programItems.programId, programId),
          eq(programItems.dayNumber, row.dayNumber),
          eq(programItems.orderInDay, row.orderInDay),
        ))
        .limit(1);
      if (current) {
        if (current.itemType !== "workout") continue;
        if (p.slug === "mechanical-foundation-14" && Array.isArray(current.workoutSpec)) {
          // Apply the user's verified drill-name corrections only where the
          // stored entry still has the original seeded title. This avoids
          // replacing unrelated edits made later in Program Studio.
          const legacyTitlesByDay: Record<number, Record<number, string>> = {
            1: { 6: "1 Dribble Pull-Ups" },
            2: {
              2: "Free Throws — One Focus",
              3: "Mid Range",
              7: "High-Arcing Mid-Range Pull-Ups",
              8: "High-Arcing 3 Pointers",
            },
            3: {
              4: "Logo 2-Dribble Pull-Up — Follow-Through",
              5: "Catch & Shoot — Follow-Through",
              9: "Logo 2-Dribble Pull-Up — Regular",
            },
            4: {
              3: "Free Throws — One Focus",
              7: "Mid Range",
              8: "3 Pointers",
              10: "Logo 2-Dribble Pull-Up — Follow-Through",
            },
            5: {
              3: "1 Dribble Pull-Up",
              6: "1 Move at each Spot 3's",
              7: "3 Pointers",
            },
            6: { 4: "2-Foot 3 Pointers", 6: "Slide Drag 3 Pointers" },
            8: {
              2: "Pull-Ups at Elbow",
              3: "Attack Dribble Quick Pound Stop — Mid Range",
              4: "Attack Dribble Quick Pound Stop — 3PT",
              8: "Curry Drill — Mid Range",
              9: "Curry Drill — 3PT",
            },
            9: { 9: "Streak 3PT" },
            10: {
              4: "Curl 2-Dribble Pull-Ups",
              7: "High Ball Screen — In & Out Attack",
              8: "Pick-Up 3",
              9: "1-Dribble Pull-Up",
              10: "2-Dribble Floater",
              11: "Scoop Finish",
              12: "Reverse Finish",
            },
            11: { 2: "Mid-Range Pull-Ups — Both Sides" },
            12: {
              1: "Trust Walking the Ground — Mid-Range Pull-Ups",
              3: "Baseline-to-Baseline 3s",
              7: "17s Into Mid-Range Pull-Ups",
            },
            13: {
              2: "Curl 3s — Flare 3s",
              3: "Transition 3s — Top of Key",
              4: "Triple-Threat Jab & Attack Mid Range",
              5: "Step-Back 3s",
              6: "High Ball Screen Combo — Downhill 2-Dribble Mid Range",
              7: "High Ball Screen Combo — Pop 3",
            },
            14: {
              2: "12345 Catch & Shoot 3s — How Long?",
              6: "Must Make Free Throws in a Row to Leave",
              8: "Pressure Free Throw Game (+3, -2)",
            },
          };
          const corrections = legacyTitlesByDay[row.dayNumber];
          const stored = current.workoutSpec as Array<{ title?: string }>;
          const nextSpec = Array.isArray(row.workoutSpec) ? [...row.workoutSpec] : [];
          let corrected = false;
          for (const [indexText, legacyTitle] of Object.entries(corrections ?? {})) {
            const index = Number(indexText);
            if (stored[index]?.title === legacyTitle && nextSpec[index]) {
              stored[index] = nextSpec[index];
              corrected = true;
            }
          }
          const legacyLinkedDrillIdsByDay: Record<number, Record<number, string | undefined>> = {
            12: { 8: drillIdByTitle.get("free throws") },
          };
          for (const [indexText, legacyDrillId] of Object.entries(legacyLinkedDrillIdsByDay[row.dayNumber] ?? {})) {
            const index = Number(indexText);
            if (
              legacyDrillId
              && stored[index]?.title === nextSpec[index]?.title
              && (stored[index] as { drillId?: string }).drillId === legacyDrillId
              && nextSpec[index]
            ) {
              stored[index] = nextSpec[index];
              corrected = true;
            }
          }
          if (corrected) {
            await db.update(programItems)
              .set({ workoutSpec: stored as any })
              .where(eq(programItems.id, current.id));
            updated++;
          }
        }
        // Upgrade legacy seed rows once, but do not overwrite later Program
        // Studio edits after the new custom workout titles have been written.
        const alreadyUpgraded = Array.isArray(current.workoutSpec)
          && current.workoutSpec.some((entry) => !!entry.title);
        if (alreadyUpgraded) continue;
        const { id: _id, programId: _programId, ...values } = row;
        await db.update(programItems).set(values).where(eq(programItems.id, current.id));
        updated++;
      } else {
        await db.insert(programItems).values(row);
      }
    }
  }

  console.log(`Course content synchronized: ${inserted} new programs, ${updated} existing items refreshed`);
}
