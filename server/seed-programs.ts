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
];

// ─── Seed function ────────────────────────────────────────────────────────

export async function seedPrograms() {
  // Idempotent: skip if any of our seeded programs already exist
  const existing = await db.select({ slug: programs.slug }).from(programs);
  const existingSlugs = new Set(existing.map((r) => r.slug));

  const drillIds = await resolveDrillIds();
  let inserted = 0;

  for (const p of PROGRAMS) {
    if (existingSlugs.has(p.slug)) continue;

    const [program] = await db
      .insert(programs)
      .values({
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        description: p.description,
        accentColor: p.accentColor,
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
