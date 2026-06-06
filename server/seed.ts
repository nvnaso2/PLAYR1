import { db } from "./db";
import { drills, benchmarks, evaluationAttributes, shotLocations, shotTypes, userProfiles, metricTemplates, drillMetrics, teamClubs, leagues, archetypes, archetypeRoadmapItems, type ArchetypeTier, type ArchetypeRoadmapItemType } from "@shared/schema";
// seedPrograms disabled — generic programs removed per user request
// import { seedPrograms } from "./seed-programs";
import { users } from "@shared/models/auth";
import { eq, sql, notInArray, isNull } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

const sampleDrills = [
  // Ball Handling
  {
    title: "Basic Crossover",
    description: "Master the fundamental crossover move to change directions and create space from your defender.",
    category: "ball-handling" as const,
    difficulty: "beginner" as const,
    duration: 300,
    equipment: ["Basketball"],
    tips: ["Keep your eyes up", "Stay low in your stance", "Use your fingertips, not your palm"],
    isFeatured: true
  },
  {
    title: "Between the Legs",
    description: "Learn to protect the ball while moving laterally using the between-the-legs dribble.",
    category: "ball-handling" as const,
    difficulty: "intermediate" as const,
    duration: 420,
    equipment: ["Basketball"],
    tips: ["Practice stationary first", "Step wide to create space", "Keep the ball tight to your body"],
    isFeatured: true
  },
  {
    title: "Hesitation Dribble",
    description: "Use the hesitation move to freeze defenders and create attacking opportunities.",
    category: "ball-handling" as const,
    difficulty: "intermediate" as const,
    duration: 360,
    equipment: ["Basketball"],
    tips: ["Sell the pause", "Explode out of the hesitation", "Keep your head up to read the defense"],
    isFeatured: false
  },
  {
    title: "Combo Moves Series",
    description: "Chain multiple moves together: crossover to between-the-legs to behind-the-back.",
    category: "ball-handling" as const,
    difficulty: "advanced" as const,
    duration: 600,
    equipment: ["Basketball", "Cones"],
    tips: ["Start slow and build speed", "Focus on smooth transitions", "Practice both directions"],
    isFeatured: true
  },
  {
    title: "Weighted Ball Drills",
    description: "Use a Handlz weighted basketball to build strength and improve ball control.",
    category: "ball-handling" as const,
    difficulty: "intermediate" as const,
    duration: 480,
    equipment: ["Handlz Weighted Basketball"],
    tips: ["Start with basic dribbles", "Focus on control over speed", "Your regular ball will feel lighter after"],
    isFeatured: true
  },
  
  // Shooting
  {
    title: "Form Shooting",
    description: "Perfect your shooting form with close-range one-hand shots.",
    category: "shooting" as const,
    difficulty: "beginner" as const,
    duration: 300,
    equipment: ["Basketball", "Hoop"],
    tips: ["Elbow under the ball", "Follow through with your wrist", "Focus on arc"],
    isFeatured: true
  },
  {
    title: "Free Throw Routine",
    description: "Develop a consistent free throw routine for pressure situations.",
    category: "shooting" as const,
    difficulty: "beginner" as const,
    duration: 420,
    equipment: ["Basketball", "Hoop"],
    tips: ["Same routine every time", "Visualize the shot going in", "Breathe and relax"],
    isFeatured: false
  },
  {
    title: "Catch and Shoot",
    description: "Practice receiving the ball and getting into your shot quickly.",
    category: "shooting" as const,
    difficulty: "intermediate" as const,
    duration: 480,
    equipment: ["Basketball", "Hoop", "Partner or Rebounder"],
    tips: ["Square up on the catch", "Keep your hands ready", "Shoot in rhythm"],
    isFeatured: true
  },
  {
    title: "Pull-Up Jumper",
    description: "Master the mid-range pull-up shot off the dribble.",
    category: "shooting" as const,
    difficulty: "advanced" as const,
    duration: 540,
    equipment: ["Basketball", "Hoop"],
    tips: ["Gather the ball cleanly", "Jump straight up", "Maintain balance"],
    isFeatured: false
  },
  
  // Passing
  {
    title: "Chest Pass Fundamentals",
    description: "Learn proper technique for accurate chest passes.",
    category: "passing" as const,
    difficulty: "beginner" as const,
    duration: 240,
    equipment: ["Basketball", "Partner or Wall"],
    tips: ["Step into your pass", "Snap your thumbs down", "Follow through to your target"],
    isFeatured: false
  },
  {
    title: "Bounce Pass Drill",
    description: "Practice bounce passes that hit your teammate at their waist.",
    category: "passing" as const,
    difficulty: "beginner" as const,
    duration: 240,
    equipment: ["Basketball", "Partner"],
    tips: ["Aim for 2/3 of the way to your target", "Put backspin on the ball", "Lead your receiver"],
    isFeatured: false
  },
  {
    title: "No-Look Passing",
    description: "Develop court vision and deception with no-look passes.",
    category: "passing" as const,
    difficulty: "advanced" as const,
    duration: 360,
    equipment: ["Basketball", "Partners"],
    tips: ["See the whole floor", "Use peripheral vision", "Sell the fake"],
    isFeatured: true
  },
  
  // Finishing
  {
    title: "Layup Fundamentals",
    description: "Master the basic layup from both sides of the basket.",
    category: "finishing" as const,
    difficulty: "beginner" as const,
    duration: 300,
    equipment: ["Basketball", "Hoop"],
    tips: ["Use the backboard", "Protect with off-hand", "Focus on soft touch"],
    isFeatured: false
  },
  {
    title: "Floater",
    description: "Learn the runner/floater to finish over bigger defenders.",
    category: "finishing" as const,
    difficulty: "intermediate" as const,
    duration: 420,
    equipment: ["Basketball", "Hoop"],
    tips: ["High release point", "Soft touch", "Practice from different angles"],
    isFeatured: true
  },
  {
    title: "Euro Step",
    description: "Use the Euro step to evade shot blockers and finish at the rim.",
    category: "finishing" as const,
    difficulty: "advanced" as const,
    duration: 480,
    equipment: ["Basketball", "Hoop"],
    tips: ["Gather and read the defense", "Long first step", "Change levels"],
    isFeatured: true
  },
  
  // Defense
  {
    title: "Defensive Stance",
    description: "Build the foundation of great defense with proper stance and footwork.",
    category: "defense" as const,
    difficulty: "beginner" as const,
    duration: 300,
    equipment: ["None"],
    tips: ["Stay low", "Keep your hands active", "Stay on the balls of your feet"],
    isFeatured: false
  },
  {
    title: "Closeout Drill",
    description: "Practice closing out on shooters with proper technique.",
    category: "defense" as const,
    difficulty: "intermediate" as const,
    duration: 360,
    equipment: ["Basketball", "Partner"],
    tips: ["Short choppy steps", "High hands", "Don't fly by"],
    isFeatured: true
  },
  {
    title: "Lateral Slides",
    description: "Improve lateral quickness for better on-ball defense.",
    category: "defense" as const,
    difficulty: "beginner" as const,
    duration: 240,
    equipment: ["Cones"],
    tips: ["Don't cross your feet", "Stay low", "Quick push off"],
    isFeatured: false
  },
  
  // Film Session
  {
    title: "Reading Pick and Roll",
    description: "Learn to read and react to pick and roll defense.",
    category: "film-session" as const,
    difficulty: "intermediate" as const,
    duration: 600,
    equipment: ["None (Film Study)"],
    tips: ["Identify the coverage", "Read the defense's reaction", "Make quick decisions"],
    isFeatured: true
  },
  {
    title: "Spacing Concepts",
    description: "Understand proper floor spacing for better team offense.",
    category: "film-session" as const,
    difficulty: "beginner" as const,
    duration: 480,
    equipment: ["None (Film Study)"],
    tips: ["Maintain 12-15 feet between players", "Fill empty spots", "Read the ball movement"],
    isFeatured: false
  },
  
  // Workouts
  {
    title: "30-Minute Ball Handling Workout",
    description: "Complete ball handling session combining multiple drills.",
    category: "workouts" as const,
    difficulty: "intermediate" as const,
    duration: 1800,
    equipment: ["Basketball", "Cones"],
    tips: ["Warm up properly", "Push yourself on each drill", "Cool down and stretch"],
    isFeatured: true
  },
  {
    title: "Shooting Workout - 200 Makes",
    description: "Structured shooting workout to get quality reps from different spots.",
    category: "workouts" as const,
    difficulty: "intermediate" as const,
    duration: 2400,
    equipment: ["Basketball", "Hoop"],
    tips: ["Track your makes", "Mix in game-speed shots", "Work on weak areas"],
    isFeatured: false
  },
  {
    title: "Full Court Conditioning",
    description: "Basketball-specific conditioning to improve game endurance.",
    category: "workouts" as const,
    difficulty: "advanced" as const,
    duration: 1800,
    equipment: ["Basketball", "Full Court"],
    tips: ["Stay hydrated", "Push through fatigue", "Simulate game situations"],
    isFeatured: false
  }
];

const sampleBenchmarks = [
  { category: "ball-handling" as const, ageGroup: "12-14", averageScore: "6.2", averageMinutesPerWeek: 45, topPercentileScore: "8.5", sampleSize: 1250 },
  { category: "ball-handling" as const, ageGroup: "15-17", averageScore: "6.8", averageMinutesPerWeek: 60, topPercentileScore: "9.0", sampleSize: 2100 },
  { category: "ball-handling" as const, ageGroup: "18-24", averageScore: "7.2", averageMinutesPerWeek: 75, topPercentileScore: "9.2", sampleSize: 1800 },
  { category: "shooting" as const, ageGroup: "12-14", averageScore: "5.8", averageMinutesPerWeek: 50, topPercentileScore: "8.0", sampleSize: 1250 },
  { category: "shooting" as const, ageGroup: "15-17", averageScore: "6.5", averageMinutesPerWeek: 65, topPercentileScore: "8.8", sampleSize: 2100 },
  { category: "shooting" as const, ageGroup: "18-24", averageScore: "7.0", averageMinutesPerWeek: 80, topPercentileScore: "9.0", sampleSize: 1800 },
  { category: "defense" as const, ageGroup: "12-14", averageScore: "6.0", averageMinutesPerWeek: 30, topPercentileScore: "8.2", sampleSize: 1250 },
  { category: "defense" as const, ageGroup: "15-17", averageScore: "6.5", averageMinutesPerWeek: 40, topPercentileScore: "8.5", sampleSize: 2100 },
];

const ARCHETYPE_DEFINITIONS = [
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    tagline: "Lives beyond the arc. Their shot opens up everything.",
    description: "The Sharpshooter is a player whose scoring threat from range forces defenses to make impossible choices. Their dedication to shot mechanics, off-ball movement, and repetition is what separates them from average scorers.",
    traits: ["Elite shooting range", "Catch-and-shoot mastery", "Shot creation off the dribble"],
    colorTheme: "blue",
    primaryHex: "#3b82f6",
    drillCategories: ["shooting", "workouts"],
    displayOrder: 1,
  },
  {
    id: "slasher",
    name: "Slasher",
    tagline: "Attacks the rim relentlessly. Contact is the point.",
    description: "The Slasher is an explosive, physical threat who sees the lane and takes it. They've built the finishing package and athleticism to convert in traffic, and they don't shy away from contact — they seek it.",
    traits: ["Explosive first step", "Finishing through contact", "Paint presence"],
    colorTheme: "red",
    primaryHex: "#ef4444",
    drillCategories: ["finishing", "ball-handling", "workouts"],
    displayOrder: 2,
  },
  {
    id: "playmaker",
    name: "Playmaker",
    tagline: "Makes everyone better. The table setter.",
    description: "The Playmaker sees the game before it happens. They build their game around finding the right play, elevating teammates, and making the smart decision under pressure. Assists are their currency.",
    traits: ["Court vision", "Precision passing", "Pick-and-roll mastery"],
    colorTheme: "green",
    primaryHex: "#22c55e",
    drillCategories: ["passing", "ball-handling"],
    displayOrder: 3,
  },
  {
    id: "two-way-lockdown",
    name: "Two-Way Lockdown",
    tagline: "Dominant on both ends. The hardest player to face.",
    description: "The Two-Way Lockdown is the rarest player on the court. They've put in the defensive reps to neutralize opponents while maintaining offensive value. They understand that winning starts with stops.",
    traits: ["Perimeter defense", "Defensive IQ", "Physicality without fouling"],
    colorTheme: "purple",
    primaryHex: "#a855f7",
    drillCategories: ["defense", "workouts"],
    displayOrder: 4,
  },
  {
    id: "floor-general",
    name: "Floor General",
    tagline: "Runs the team. Sees the game three steps ahead.",
    description: "The Floor General is the engine of every team they play on. They combine elite ball handling with an encyclopedic knowledge of the game, dictating tempo and reading defenses to put teammates in the best positions.",
    traits: ["Tempo control", "Defensive reads", "Leadership under pressure"],
    colorTheme: "teal",
    primaryHex: "#14b8a6",
    drillCategories: ["ball-handling", "passing", "film-session"],
    displayOrder: 5,
  },
  {
    id: "stretch-big",
    name: "Stretch Big",
    tagline: "Size with range. Defends the paint, spaces the floor.",
    description: "The Stretch Big has broken the mold of what a big player looks like. They've developed a reliable outside shot to pull opposing bigs off the floor while anchoring their team's defense inside.",
    traits: ["Mid-range and 3pt shooting", "Post footwork", "Rim protection"],
    colorTheme: "orange",
    primaryHex: "#f97316",
    drillCategories: ["shooting", "defense", "workouts"],
    displayOrder: 6,
  },
  {
    id: "versatile-wing",
    name: "Versatile Wing",
    tagline: "Does everything. The Swiss Army knife of the roster.",
    description: "The Versatile Wing is the modern game's most valuable archetype. They can guard multiple positions, score in multiple ways, and adapt to whatever their team needs in any given moment.",
    traits: ["Multi-position defense", "Scoring variety", "Basketball IQ"],
    colorTheme: "indigo",
    primaryHex: "#6366f1",
    drillCategories: ["shooting", "defense", "finishing", "ball-handling"],
    displayOrder: 7,
  },
  {
    id: "glass-cleaner",
    name: "Glass Cleaner",
    tagline: "Outworks everyone for every board. Every time.",
    description: "The Glass Cleaner lives where other players don't want to be. They've built the physicality, anticipation, and relentless motor to dominate the boards on both ends — turning missed shots into second chances.",
    traits: ["Offensive rebounding", "Box out technique", "Motor and hustle"],
    colorTheme: "amber",
    primaryHex: "#f59e0b",
    drillCategories: ["workouts", "defense"],
    displayOrder: 8,
  },
];

export async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
    // Schema migration: replace old preset columns with single preset_rounds JSONB column
    await db.execute(sql`
      ALTER TABLE drills
        DROP COLUMN IF EXISTS default_rounds,
        DROP COLUMN IF EXISTS default_shot_locations,
        DROP COLUMN IF EXISTS default_metric_values,
        ADD COLUMN IF NOT EXISTS preset_rounds jsonb;
    `);

    // Check if drills already exist
    const existingDrills = await db.select().from(drills).limit(1);
    
    if (existingDrills.length === 0) {
      console.log("Inserting sample drills...");
      await db.insert(drills).values(sampleDrills);
      console.log(`Inserted ${sampleDrills.length} drills`);
    } else {
      console.log("Drills already exist, skipping seed");
    }

    // Check if benchmarks already exist
    const existingBenchmarks = await db.select().from(benchmarks).limit(1);
    
    if (existingBenchmarks.length === 0) {
      console.log("Inserting sample benchmarks...");
      await db.insert(benchmarks).values(sampleBenchmarks);
      console.log(`Inserted ${sampleBenchmarks.length} benchmarks`);
    } else {
      console.log("Benchmarks already exist, skipping seed");
    }

    const existingAttributes = await db.select().from(evaluationAttributes).limit(1);
    if (existingAttributes.length === 0) {
      console.log("Inserting default evaluation attributes...");
      await db.insert(evaluationAttributes).values([
        { name: "Ball Handling", category: "Offense", scaleType: "1-10", isDefault: true },
        { name: "Shooting", category: "Offense", scaleType: "1-10", isDefault: true },
        { name: "Finishing", category: "Offense", scaleType: "1-10", isDefault: true },
        { name: "Passing", category: "Offense", scaleType: "1-10", isDefault: true },
        { name: "Court Vision", category: "Offense", scaleType: "1-5", isDefault: true },
        { name: "Defense", category: "Defense", scaleType: "1-10", isDefault: true },
        { name: "Rebounding", category: "Defense", scaleType: "1-5", isDefault: true },
        { name: "Basketball IQ", category: "Intangibles", scaleType: "1-5", isDefault: true },
        { name: "Athleticism", category: "Intangibles", scaleType: "1-10", isDefault: true },
        { name: "Effort", category: "Intangibles", scaleType: "word", isDefault: true, wordOptions: JSON.stringify(["Needs Work", "Developing", "Solid", "Strong", "Elite"]) },
      ]);
      console.log("Inserted default evaluation attributes");
    } else {
      console.log("Evaluation attributes already exist, skipping seed");
    }

    const canonicalShotLocations = [
      { slug: "free-throw",            label: "Free Throw",             classification: "free-throw", sortOrder: 0  },
      { slug: "block-left",            label: "Block Left",             classification: "2-pointer",  sortOrder: 1  },
      { slug: "block-right",           label: "Block Right",            classification: "2-pointer",  sortOrder: 2  },
      { slug: "post-shots",            label: "Post Shots",             classification: "2-pointer",  sortOrder: 3  },
      { slug: "floaters",              label: "Floaters",               classification: "2-pointer",  sortOrder: 4  },
      { slug: "left-corner-mid-range", label: "Corner Left (MR)",      classification: "2-pointer",  sortOrder: 5  },
      { slug: "right-corner-mid-range",label: "Corner Right (MR)",     classification: "2-pointer",  sortOrder: 6  },
      { slug: "wing-left-mid-range",   label: "Wing Left (MR)",        classification: "2-pointer",  sortOrder: 7  },
      { slug: "wing-right-mid-range",  label: "Wing Right (MR)",       classification: "2-pointer",  sortOrder: 8  },
      { slug: "top-of-key-3-point",    label: "Top of Key (MR)",       classification: "2-pointer",  sortOrder: 9  },
      { slug: "corner-left",           label: "Corner Left (3)",       classification: "3-pointer",  sortOrder: 10 },
      { slug: "corner-right",          label: "Corner Right (3)",      classification: "3-pointer",  sortOrder: 11 },
      { slug: "wing-left",             label: "Wing Left (3)",         classification: "3-pointer",  sortOrder: 12 },
      { slug: "wing-right",            label: "Wing Right (3)",        classification: "3-pointer",  sortOrder: 13 },
      { slug: "top-of-key",            label: "Top of Key (3)",        classification: "3-pointer",  sortOrder: 14 },
      { slug: "form-shot-left",        label: "Form Shots Left Block", classification: "2-pointer",  sortOrder: 15 },
      { slug: "form-shots-right",      label: "Form Shots Right Block",classification: "2-pointer",  sortOrder: 16 },
      { slug: "form-shots-1st-hash",   label: "Form Shots 1st Hash",  classification: "2-pointer",  sortOrder: 17 },
      { slug: "left-hand-layup",       label: "Left Hand Layup",      classification: "2-pointer",  sortOrder: 18 },
      { slug: "right-hand-layup",      label: "Right Hand Layup",     classification: "2-pointer",  sortOrder: 19 },
    ];
    const canonicalSlugs = canonicalShotLocations.map(l => l.slug);
    for (const loc of canonicalShotLocations) {
      await db.insert(shotLocations).values({ ...loc, active: true } as any).onConflictDoUpdate({
        target: shotLocations.slug,
        set: { label: sql`EXCLUDED.label`, classification: sql`EXCLUDED.classification`, sortOrder: sql`EXCLUDED.sort_order`, active: sql`true` },
      });
    }
    // Deactivate any shot locations not in the canonical list
    if (canonicalSlugs.length > 0) {
      await db.update(shotLocations).set({ active: false }).where(notInArray(shotLocations.slug, canonicalSlugs));
    }
    console.log("Shot locations synced");

    const existingShotTypes = await db.select().from(shotTypes).limit(1);
    if (existingShotTypes.length === 0) {
      console.log("Inserting default shot types...");
      await db.insert(shotTypes).values([
        { name: "3-pointer", label: "3 Pointer", sortOrder: 0 },
        { name: "mid-range", label: "Mid Range", sortOrder: 1 },
        { name: "free-throw", label: "Free Throw", sortOrder: 2 },
        { name: "floater", label: "Floater", sortOrder: 3 },
        { name: "post-shot", label: "Post Shot", sortOrder: 4 },
        { name: "form-shot", label: "Form Shot", sortOrder: 5 },
        { name: "layup", label: "Layup", sortOrder: 6 },
      ]);
      console.log("Inserted default shot types");
    } else {
      console.log("Shot types already exist, skipping seed");
    }

    const canonicalMetrics = [
      { name: "dribbles",      label: "Dribbles",       type: "number" as const, unit: "dribbles" },
      { name: "passes",        label: "Passes",          type: "number" as const, unit: "passes"   },
      { name: "pass-attempts", label: "Pass Attempts",   type: "number" as const, unit: "passes"   },
      { name: "shots-made",    label: "Shots Made",      type: "number" as const, unit: "shots"    },
      { name: "shot-attempts", label: "Shot Attempts",   type: "number" as const, unit: "shots"    },
      { name: "time",          label: "Time",            type: "timer"  as const, unit: "seconds"  },
    ];
    const canonicalMetricNames = canonicalMetrics.map(m => m.name);
    const existingMetrics = await db.select().from(metricTemplates);
    const existingNames = existingMetrics.map(m => m.name).sort().join(",");
    const expectedNames = [...canonicalMetricNames].sort().join(",");
    if (existingNames !== expectedNames) {
      console.log("Syncing metric templates...");
      await db.delete(drillMetrics);
      await db.delete(metricTemplates);
      await db.insert(metricTemplates).values(canonicalMetrics);
      console.log("Metric templates synced");
    } else {
      console.log("Metric templates already synced");
    }

    // Always ensure drill-metric associations exist for admin (system) drills
    const existingDrillMetrics = await db.select().from(drillMetrics).limit(1);
    if (existingDrillMetrics.length === 0) {
      console.log("Seeding drill-metric associations...");
      const allTemplates = await db.select().from(metricTemplates);
      const tmByName = Object.fromEntries(allTemplates.map(t => [t.name, t.id]));
      const adminDrills = await db.select().from(drills).where(isNull(drills.userId));

      // Metric assignments per category
      const categoryMetrics: Record<string, { name: string; isRequired: boolean }[]> = {
        "shooting":     [
          { name: "shots-made",    isRequired: true  },
          { name: "shot-attempts", isRequired: true  },
          { name: "time",          isRequired: false },
        ],
        "finishing":    [
          { name: "shots-made",    isRequired: true  },
          { name: "shot-attempts", isRequired: true  },
          { name: "time",          isRequired: false },
        ],
        "ball-handling":[
          { name: "dribbles",      isRequired: false },
          { name: "time",          isRequired: true  },
        ],
        "passing":      [
          { name: "passes",        isRequired: false },
          { name: "pass-attempts", isRequired: false },
          { name: "time",          isRequired: true  },
        ],
        "defense":      [
          { name: "time",          isRequired: true  },
        ],
        "workouts":     [
          { name: "shots-made",    isRequired: false },
          { name: "shot-attempts", isRequired: false },
          { name: "time",          isRequired: true  },
        ],
        "film-session": [
          { name: "time",          isRequired: true  },
        ],
      };

      const associations: { drillId: number; metricTemplateId: number; isRequired: boolean; sortOrder: number }[] = [];
      for (const drill of adminDrills) {
        const metrics = categoryMetrics[drill.category] ?? [{ name: "time", isRequired: true }];
        metrics.forEach((m, idx) => {
          const tmId = tmByName[m.name];
          if (tmId) associations.push({ drillId: drill.id, metricTemplateId: tmId, isRequired: m.isRequired, sortOrder: idx });
        });
      }
      if (associations.length > 0) {
        await db.insert(drillMetrics).values(associations).onConflictDoNothing();
        console.log(`Seeded ${associations.length} drill-metric associations`);
      }
    } else {
      console.log("Drill-metric associations already exist");
    }

    const existingTeams = await db.select().from(teamClubs).limit(1);
    if (existingTeams.length === 0) {
      console.log("Inserting team clubs from data file...");
      const teamClubsData = JSON.parse(readFileSync(join(process.cwd(), "server", "data", "team-clubs-seed.json"), "utf-8"));
      const teamBatchSize = 50;
      for (let i = 0; i < teamClubsData.length; i += teamBatchSize) {
        const batch = teamClubsData.slice(i, i + teamBatchSize).map((t: any) => ({
          ...t,
          createdByUserId: "system",
        }));
        await db.insert(teamClubs).values(batch).onConflictDoNothing();
      }
      console.log(`Inserted ${teamClubsData.length} team clubs`);
    } else {
      console.log("Team clubs already exist, skipping seed");
    }

    const existingLeagues = await db.select().from(leagues).limit(1);
    if (existingLeagues.length === 0) {
      console.log("Inserting leagues from data file...");
      const leaguesData = JSON.parse(readFileSync(join(process.cwd(), "server", "data", "leagues-seed.json"), "utf-8"));
      await db.insert(leagues).values(leaguesData.map((l: any) => ({
        ...l,
        createdByUserId: "system",
      }))).onConflictDoNothing();
      console.log(`Inserted ${leaguesData.length} leagues`);
    } else {
      console.log("Leagues already exist, skipping seed");
    }

    // seedPrograms() removed — generic default programs deleted from DB

    // Seed archetypes (upsert so changes to definitions are applied on restart)
    for (const def of ARCHETYPE_DEFINITIONS) {
      await db.insert(archetypes).values(def).onConflictDoUpdate({
        target: archetypes.id,
        set: {
          name: def.name,
          tagline: def.tagline,
          description: def.description,
          traits: def.traits,
          colorTheme: def.colorTheme,
          primaryHex: def.primaryHex,
          drillCategories: def.drillCategories,
          displayOrder: def.displayOrder,
        },
      });
    }
    console.log(`Archetypes synced (${ARCHETYPE_DEFINITIONS.length})`);

    // Seed archetype roadmap items (only if none exist yet)
    const existingRoadmap = await db.select().from(archetypeRoadmapItems).limit(1);
    if (existingRoadmap.length === 0) {
      const roadmapSeed: Array<{
        archetypeId: string; tier: ArchetypeTier; sortOrder: number;
        itemType: ArchetypeRoadmapItemType; title: string; description: string;
        durationMins: number; repsOrSets: string | null; isGateChallenge: boolean;
      }> = [
        // ── SHARPSHOOTER ──────────────────────────────────────────────────
        { archetypeId:"sharpshooter", tier:"prospect", sortOrder:1, itemType:"drill", title:"Spot Shooting Fundamentals", description:"Learn proper 3-point form from 5 spots around the arc. Focus on balance, hop, and follow-through.", durationMins:20, repsOrSets:"5x10", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"prospect", sortOrder:2, itemType:"drill", title:"Catch-and-Shoot Reps", description:"Practice catching off a pass and rising immediately into your shot. Minimize gather time.", durationMins:20, repsOrSets:"50 makes", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"prospect", sortOrder:3, itemType:"workout", title:"Off-Ball Movement Circuit", description:"5 cut patterns to get open: V-cut, L-cut, backdoor, flare, curl. Chain them into a 10-minute flow.", durationMins:15, repsOrSets:"3 rounds", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"prospect", sortOrder:4, itemType:"drill", title:"Free Throw Routine", description:"Build a consistent pre-shot routine at the line. Make 75% from the charity stripe.", durationMins:15, repsOrSets:"50 FTs", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"prospect", sortOrder:5, itemType:"watch", title:"Study Splash Brothers Film", description:"Watch 20 min of Steph Curry / Klay Thompson off-ball clips. Identify spacing principles and trigger reads.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Make 25 Consecutive Mid-Range Shots", description:"From 15 feet, make 25 in a row without missing. Start over on any miss.", durationMins:30, repsOrSets:"25 consecutive", isGateChallenge:true },
        // Rising
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:1, itemType:"drill", title:"Pull-Up 3 Off the Dribble", description:"1-2 dribble pull-up from beyond the arc. Work both directions.", durationMins:25, repsOrSets:"60 makes", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:2, itemType:"drill", title:"Corner 3 Shooting Series", description:"50 corner threes each side. Track makes per session.", durationMins:20, repsOrSets:"100 total", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:3, itemType:"workout", title:"Shooting Off Screens", description:"Come off a chair or cone screen and rise into catch-and-shoot. Simulate real game looks.", durationMins:25, repsOrSets:"4 rounds", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:4, itemType:"drill", title:"3-Point Shooting Fatigue Test", description:"Sprint the court 3 times, immediately shoot from the arc. Simulate late-game effort.", durationMins:20, repsOrSets:"3x5 spots", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:5, itemType:"drill", title:"Step-Back 3 Footwork", description:"Jab step to create separation and hit a controlled step-back 3.", durationMins:20, repsOrSets:"3x15", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:6, itemType:"drill", title:"Logo 3 Challenge", description:"Shoot from the logo — 30-35 feet out. Build range and confidence.", durationMins:15, repsOrSets:"30 attempts", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:7, itemType:"watch", title:"Spacing & Movement Film Study", description:"Study how elite shooters create space off the ball. Focus on reading the help defender.", durationMins:25, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:8, itemType:"workout", title:"Full Shooting Workout (Rising)", description:"Full session: spot shooting, pull-ups, off-screen, corner. Track makes vs attempts.", durationMins:45, repsOrSets:"200 attempts", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"rising", sortOrder:9, itemType:"challenge", title:"Shoot 40% From 3 in a Live Drill", description:"In a 3-on-3 or 5-on-5 live setting, hit 40% of your 3-point attempts across a session.", durationMins:45, repsOrSets:"40%+ from 3", isGateChallenge:true },
        // Starter
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:1, itemType:"drill", title:"HORSE From 3 — Win 3 Straight", description:"Play yourself in HORSE requiring only 3-point makes. Build shot variety.", durationMins:20, repsOrSets:"3 wins", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:2, itemType:"workout", title:"Pressure Shooting Circuit", description:"Partner counts down 5 seconds — you must shoot before zero. Simulate shot-clock pressure.", durationMins:30, repsOrSets:"5 rounds", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:3, itemType:"drill", title:"Transition 3 Off the Break", description:"Sprint from halfcourt, receive a pass in stride, and shoot a 3. No gather, immediate release.", durationMins:20, repsOrSets:"50 makes", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:4, itemType:"drill", title:"Pin-Down Screen Series", description:"Work pin-down cuts to catch and shoot in one motion from the wing.", durationMins:20, repsOrSets:"3x20", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:5, itemType:"watch", title:"Off-Ball IQ Film Review", description:"Study 3 game clips of yourself or a peer and identify 5 open-shot opportunities missed off the ball.", durationMins:30, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:6, itemType:"workout", title:"Mikan Drill + Arc Shooting", description:"10 Mikan makes then immediately sprint to the arc for 5 catch-and-shoot attempts.", durationMins:25, repsOrSets:"6 rounds", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:7, itemType:"drill", title:"Hand-Off 3 Series", description:"Receive a dribble hand-off and immediately rise into a 3. Work both sides.", durationMins:20, repsOrSets:"4x15", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:8, itemType:"drill", title:"One-Leg Balance Shooting", description:"Focus on balance — shoot from one-leg staggered stance to develop leg strength and arc.", durationMins:15, repsOrSets:"3x20", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:9, itemType:"workout", title:"Full Shooting Workout (Starter)", description:"90-minute elite shooting session. All zones, all looks, track splits.", durationMins:90, repsOrSets:"300+ shots", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:10, itemType:"drill", title:"End-of-Quarter 3 Drill", description:"With 5 seconds on the clock, inbound and shoot a 3 — make 7 of 10 clutch attempts.", durationMins:20, repsOrSets:"7/10", isGateChallenge:false },
        { archetypeId:"sharpshooter", tier:"starter", sortOrder:11, itemType:"challenge", title:"Make 10 Straight 3s From 5 Spots", description:"2 consecutive makes from each of 5 spots. Any miss resets that spot. Finish all 5.", durationMins:45, repsOrSets:"10 consecutive per spot", isGateChallenge:true },

        // ── SLASHER ───────────────────────────────────────────────────────
        { archetypeId:"slasher", tier:"prospect", sortOrder:1, itemType:"drill", title:"First Step Explosion Drill", description:"From a triple-threat stance, explode into a one-dribble attack. Focus on low center of gravity and burst.", durationMins:15, repsOrSets:"4x10", isGateChallenge:false },
        { archetypeId:"slasher", tier:"prospect", sortOrder:2, itemType:"drill", title:"Layup Package: Both Hands", description:"Master basic layup angles — power layup, finger-roll, reverse — with both hands equally.", durationMins:20, repsOrSets:"60 makes", isGateChallenge:false },
        { archetypeId:"slasher", tier:"prospect", sortOrder:3, itemType:"workout", title:"Attack the Basket Circuit", description:"Drive from the wing and elbow using crossover, between-the-legs, and hesitation moves.", durationMins:25, repsOrSets:"3 rounds", isGateChallenge:false },
        { archetypeId:"slasher", tier:"prospect", sortOrder:4, itemType:"drill", title:"Floater Development", description:"The slasher's secret weapon: teardrop floater at 8–12 feet over a defender. Both hands.", durationMins:20, repsOrSets:"50 makes", isGateChallenge:false },
        { archetypeId:"slasher", tier:"prospect", sortOrder:5, itemType:"watch", title:"Study Elite Slashers Film", description:"Watch 20 min of Ja Morant or Derrick Rose highlights. Track how they create contact and finish.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"slasher", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Score 10 Layups in 3 Minutes", description:"Get to the rack and finish 10 layups (off dribble) in under 3 minutes, alternating hands.", durationMins:10, repsOrSets:"10 in 3 mins", isGateChallenge:true },
        // Rising
        { archetypeId:"slasher", tier:"rising", sortOrder:1, itemType:"drill", title:"Euro Step to Finish", description:"Attack middle, plant and euro step to finish on the opposite side. Vary the angle.", durationMins:20, repsOrSets:"3x20", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:2, itemType:"workout", title:"Contact Layup Reps", description:"Have a partner add light contest. Finish through and around contact without flinching.", durationMins:25, repsOrSets:"5 rounds", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:3, itemType:"drill", title:"Jab Series + Drive Combo", description:"Jab step to set up the drive — cross, same, or rocker step. React to the defender's feet.", durationMins:20, repsOrSets:"4x15", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:4, itemType:"drill", title:"Spin Move to Finish", description:"Off an initial drive, spin off the defender and finish with opposite hand or floater.", durationMins:20, repsOrSets:"3x15", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:5, itemType:"drill", title:"Pick-and-Roll Attack", description:"Use a ball screen to attack downhill. Practice the space between staying low and rising through contact.", durationMins:25, repsOrSets:"4 rounds", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:6, itemType:"workout", title:"Speed Dribbling & Control", description:"Full-court speed dribble control — stay in control at top speed using inside hand.", durationMins:20, repsOrSets:"10 trips", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:7, itemType:"drill", title:"Free Throw Focus", description:"Slashers live at the line. Shoot 100 FTs building a rhythmic, repeatable routine.", durationMins:20, repsOrSets:"100 FTs", isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:8, itemType:"watch", title:"Finish Angle Film Study", description:"Study angles to the rim and how elite slashers choose power vs finesse based on defender position.", durationMins:25, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"slasher", tier:"rising", sortOrder:9, itemType:"challenge", title:"Score 5 Euro Steps on a Live Defender", description:"In 3-on-3, successfully execute 5 euro steps to finish in the same game or session.", durationMins:45, repsOrSets:"5 live euro steps", isGateChallenge:true },

        // ── PLAYMAKER ─────────────────────────────────────────────────────
        { archetypeId:"playmaker", tier:"prospect", sortOrder:1, itemType:"drill", title:"Ball Handling Foundation", description:"Two-ball dribbling, stationary — alternating, simultaneous, crossover patterns. Control before speed.", durationMins:15, repsOrSets:"5 min", isGateChallenge:false },
        { archetypeId:"playmaker", tier:"prospect", sortOrder:2, itemType:"drill", title:"Pass and Go Patterns", description:"Wall passing — chest, bounce, overhead, wrap. 100 clean passes per hand.", durationMins:20, repsOrSets:"100 each", isGateChallenge:false },
        { archetypeId:"playmaker", tier:"prospect", sortOrder:3, itemType:"drill", title:"Pick-and-Roll Read Series", description:"Call a P&R with a partner. Read: pop, roll, or trail — make the right pass each time.", durationMins:25, repsOrSets:"4 rounds", isGateChallenge:false },
        { archetypeId:"playmaker", tier:"prospect", sortOrder:4, itemType:"watch", title:"Point Guard IQ Film", description:"Watch 20 min of Chris Paul or LeBron James at PG. Identify when they pass vs shoot vs drive.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"playmaker", tier:"prospect", sortOrder:5, itemType:"workout", title:"Half-Court Offense Walkthrough", description:"Walk through 3 half-court sets — motion, horns, high-low. Understand every player's role.", durationMins:30, repsOrSets:"3 sets", isGateChallenge:false },
        { archetypeId:"playmaker", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Record 10 Assists in a Pickup Game", description:"In one session of pickup basketball, accumulate 10 genuine assists (passes directly leading to a score).", durationMins:60, repsOrSets:"10 assists", isGateChallenge:true },

        // ── TWO-WAY LOCKDOWN ──────────────────────────────────────────────
        { archetypeId:"two-way-lockdown", tier:"prospect", sortOrder:1, itemType:"drill", title:"Defensive Stance & Slides", description:"Wide base, chest to the ball. Slide laterally 10 feet each direction without crossing feet.", durationMins:15, repsOrSets:"10 min", isGateChallenge:false },
        { archetypeId:"two-way-lockdown", tier:"prospect", sortOrder:2, itemType:"drill", title:"Ball Pressure Drill", description:"Crowd the ball handler and contest every dribble with active hands. No reaching.", durationMins:15, repsOrSets:"4x2 min", isGateChallenge:false },
        { archetypeId:"two-way-lockdown", tier:"prospect", sortOrder:3, itemType:"workout", title:"Close-Out Technique", description:"Sprint from the paint and close out with a high hand on a shooter. Controlled, not over-running.", durationMins:20, repsOrSets:"5 rounds", isGateChallenge:false },
        { archetypeId:"two-way-lockdown", tier:"prospect", sortOrder:4, itemType:"drill", title:"Deny the Wing", description:"Position correctly to deny a perimeter pass. Shadow your man for 5 possessions without a catch.", durationMins:20, repsOrSets:"3 rounds", isGateChallenge:false },
        { archetypeId:"two-way-lockdown", tier:"prospect", sortOrder:5, itemType:"watch", title:"DPOY Film Study", description:"Watch 20 min of Jrue Holiday or Kawhi Leonard on-ball defense. Track their footwork patterns.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"two-way-lockdown", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Hold Your Man to 0 Points for 3 Possessions", description:"In a live drill, completely contain your matchup for 3 straight possessions with no points allowed.", durationMins:20, repsOrSets:"3 straight stops", isGateChallenge:true },

        // ── FLOOR GENERAL ─────────────────────────────────────────────────
        { archetypeId:"floor-general", tier:"prospect", sortOrder:1, itemType:"drill", title:"Coach the Play — Call It Out", description:"Watch 3 film plays, then verbally call out the correct decision before it happens.", durationMins:20, repsOrSets:"10 plays", isGateChallenge:false },
        { archetypeId:"floor-general", tier:"prospect", sortOrder:2, itemType:"workout", title:"Voice Leadership Drill", description:"Run a 5-on-5 and narrate every defensive assignment and transition out loud. Lead verbally.", durationMins:30, repsOrSets:"3 possessions", isGateChallenge:false },
        { archetypeId:"floor-general", tier:"prospect", sortOrder:3, itemType:"drill", title:"Set Play Execution x5", description:"Run 5 different half-court sets as the initiator with no mistakes in player assignments.", durationMins:25, repsOrSets:"5 sets", isGateChallenge:false },
        { archetypeId:"floor-general", tier:"prospect", sortOrder:4, itemType:"drill", title:"Clock Management Drill", description:"Simulate end-of-quarter scenarios — 8 seconds, run a play. Practice reading when to go slow.", durationMins:20, repsOrSets:"10 scenarios", isGateChallenge:false },
        { archetypeId:"floor-general", tier:"prospect", sortOrder:5, itemType:"watch", title:"Coach Huddle Film Study", description:"Watch 15 min of timeout film. Observe how coaches draw up plays and how point guards execute them.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"floor-general", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Lead Your Team to a 10-Point Run", description:"Be the floor general who orchestrates a 10-0 run in a pickup game — all decisions through you.", durationMins:45, repsOrSets:"10-0 run", isGateChallenge:true },

        // ── STRETCH BIG ───────────────────────────────────────────────────
        { archetypeId:"stretch-big", tier:"prospect", sortOrder:1, itemType:"drill", title:"Post Footwork Foundation", description:"Drop step, up-and-under, and hook shot footwork from the block. Each move 20 times each side.", durationMins:20, repsOrSets:"3x20", isGateChallenge:false },
        { archetypeId:"stretch-big", tier:"prospect", sortOrder:2, itemType:"drill", title:"Mid-Range Elbow Game", description:"Catch and shoot from the elbow extended. The big's bread and butter mid-range.", durationMins:20, repsOrSets:"60 makes", isGateChallenge:false },
        { archetypeId:"stretch-big", tier:"prospect", sortOrder:3, itemType:"workout", title:"Stretch 3 for Bigs", description:"Start shooting from 18 feet, progress to 22, then 24 feet. Build range progressively.", durationMins:25, repsOrSets:"3 zones", isGateChallenge:false },
        { archetypeId:"stretch-big", tier:"prospect", sortOrder:4, itemType:"drill", title:"Screen Setting + Pop", description:"Set a hard ball screen then pop to the 3-point line. Catch and shoot in rhythm.", durationMins:20, repsOrSets:"4x15", isGateChallenge:false },
        { archetypeId:"stretch-big", tier:"prospect", sortOrder:5, itemType:"watch", title:"Stretch Big Film Study", description:"Watch Karl-Anthony Towns or Nikola Jokic. Track how they space the floor and force bigs to guard them out.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"stretch-big", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Hit 5 Straight 3s as a Big", description:"As a power forward or center, make 5 consecutive 3-pointers from the arc to prove your range.", durationMins:20, repsOrSets:"5 consecutive", isGateChallenge:true },

        // ── VERSATILE WING ────────────────────────────────────────────────
        { archetypeId:"versatile-wing", tier:"prospect", sortOrder:1, itemType:"drill", title:"3-Level Scoring Reps", description:"Score from 3 zones in one session — paint finish, mid-range pull-up, 3-pointer. 20 makes each.", durationMins:30, repsOrSets:"20 per zone", isGateChallenge:false },
        { archetypeId:"versatile-wing", tier:"prospect", sortOrder:2, itemType:"drill", title:"Multi-Position Defense", description:"Guard the point guard for 3 possessions, then switch to guarding the power forward. No breaks.", durationMins:20, repsOrSets:"3 each position", isGateChallenge:false },
        { archetypeId:"versatile-wing", tier:"prospect", sortOrder:3, itemType:"workout", title:"Positional Versatility Circuit", description:"Play 10 min at guard, 10 min at forward, 10 min at center in 3-on-3 scenarios.", durationMins:30, repsOrSets:"3 positions", isGateChallenge:false },
        { archetypeId:"versatile-wing", tier:"prospect", sortOrder:4, itemType:"drill", title:"Handle + Finish Off the Drive", description:"Drive from wing with 2-3 dribbles using crossover and hesitation, then finish strong.", durationMins:20, repsOrSets:"4x15", isGateChallenge:false },
        { archetypeId:"versatile-wing", tier:"prospect", sortOrder:5, itemType:"watch", title:"Swiss Army Film Study", description:"Watch LeBron James or Scottie Barnes — track how they make 3 different plays in a single game.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"versatile-wing", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Score, Assist, and Steal in One Session", description:"In pickup or practice, register at least one score, one assist, and one steal in a single session.", durationMins:45, repsOrSets:"All 3 in 1 session", isGateChallenge:true },

        // ── GLASS CLEANER ─────────────────────────────────────────────────
        { archetypeId:"glass-cleaner", tier:"prospect", sortOrder:1, itemType:"drill", title:"Box-Out Fundamentals", description:"Make first contact, pivot into your man, and hold position for 3 seconds. Repeat 20 times.", durationMins:15, repsOrSets:"3x20", isGateChallenge:false },
        { archetypeId:"glass-cleaner", tier:"prospect", sortOrder:2, itemType:"drill", title:"Mikan Drill — 50 Makes", description:"Classic Mikan: alternating layups off the glass at close range. Build hands and timing.", durationMins:15, repsOrSets:"50 makes", isGateChallenge:false },
        { archetypeId:"glass-cleaner", tier:"prospect", sortOrder:3, itemType:"workout", title:"Rebounding Angles Study", description:"Walk through missed shot trajectories from each zone. Position yourself at the 45° angle to the corner.", durationMins:20, repsOrSets:"5 zones", isGateChallenge:false },
        { archetypeId:"glass-cleaner", tier:"prospect", sortOrder:4, itemType:"drill", title:"Outlet Pass Drill", description:"After securing the rebound, immediately pivot and hit an outlet pass in stride. 30 reps each side.", durationMins:15, repsOrSets:"3x20", isGateChallenge:false },
        { archetypeId:"glass-cleaner", tier:"prospect", sortOrder:5, itemType:"watch", title:"Rebounding IQ Film", description:"Watch Dennis Rodman or Draymond Green film. Track their pre-shot movement and anticipation.", durationMins:20, repsOrSets:null, isGateChallenge:false },
        { archetypeId:"glass-cleaner", tier:"prospect", sortOrder:6, itemType:"challenge", title:"Grab 10 Rebounds in a Game", description:"In a pickup or practice game, secure 10 rebounds (offensive or defensive) in a single game.", durationMins:45, repsOrSets:"10 rebounds", isGateChallenge:true },
      ];

      await db.insert(archetypeRoadmapItems).values(roadmapSeed).onConflictDoNothing();
      console.log(`Archetype roadmap seeded (${roadmapSeed.length} items)`);
    } else {
      console.log("Archetype roadmap already seeded, skipping");
    }

    console.log("Database seeding complete!");

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const [adminUser] = await db.select().from(users).where(eq(users.email, adminEmail.toLowerCase()));
      if (adminUser) {
        const [existingProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, adminUser.id));
        if (existingProfile) {
          if (!existingProfile.isAdmin) {
            await db.update(userProfiles).set({ isAdmin: true }).where(eq(userProfiles.userId, adminUser.id));
            console.log(`Admin privileges granted to ${adminEmail}`);
          }
        } else {
          await db.insert(userProfiles).values({ userId: adminUser.id, isAdmin: true });
          console.log(`Admin profile created for ${adminEmail}`);
        }
      }
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
