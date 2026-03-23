import { db } from "./db";
import { drills, benchmarks, evaluationAttributes, shotLocations, shotTypes, userProfiles } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

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

export async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
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

    const existingShotLocations = await db.select().from(shotLocations).limit(1);
    if (existingShotLocations.length === 0) {
      console.log("Inserting default shot locations...");
      await db.insert(shotLocations).values([
        { slug: "free-throw", label: "Free Throw", classification: "free-throw", sortOrder: 0 },
        { slug: "block-left", label: "Block Left", classification: "2-pointer", sortOrder: 1 },
        { slug: "block-right", label: "Block Right", classification: "2-pointer", sortOrder: 2 },
        { slug: "mid-range-left", label: "Mid Range Left", classification: "2-pointer", sortOrder: 3 },
        { slug: "mid-range-right", label: "Mid Range Right", classification: "2-pointer", sortOrder: 4 },
        { slug: "1st-hash-left", label: "1st Hash Left", classification: "2-pointer", sortOrder: 5 },
        { slug: "1st-hash-right", label: "1st Hash Right", classification: "2-pointer", sortOrder: 6 },
        { slug: "2nd-hash-left", label: "2nd Hash Left", classification: "2-pointer", sortOrder: 7 },
        { slug: "2nd-hash-right", label: "2nd Hash Right", classification: "2-pointer", sortOrder: 8 },
        { slug: "corner-left", label: "Corner Left", classification: "3-pointer", sortOrder: 9 },
        { slug: "corner-right", label: "Corner Right", classification: "3-pointer", sortOrder: 10 },
        { slug: "wing-left", label: "Wing Left", classification: "3-pointer", sortOrder: 11 },
        { slug: "wing-right", label: "Wing Right", classification: "3-pointer", sortOrder: 12 },
        { slug: "top-of-key", label: "Top of Key", classification: "3-pointer", sortOrder: 13 },
        { slug: "top-of-key-3-point", label: "Top of Key (Mid-Range)", classification: "2-pointer", sortOrder: 16 },
        { slug: "3rd-hash-left", label: "3rd Hash Left", classification: "3-pointer", sortOrder: 14 },
        { slug: "3rd-hash-right", label: "3rd Hash Right", classification: "3-pointer", sortOrder: 15 },
      ]);
      console.log("Inserted default shot locations");
    } else {
      console.log("Shot locations already exist, skipping seed");
    }

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
