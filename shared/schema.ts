import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, doublePrecision, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Drill categories enum
export const DRILL_CATEGORIES = [
  "ball-handling",
  "shooting",
  "passing",
  "finishing",
  "defense",
  "film-session",
  "workouts"
] as const;

export type DrillCategory = typeof DRILL_CATEGORIES[number];

// Difficulty levels
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "elite"] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// Basketball positions
export const BASKETBALL_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
export type BasketballPosition = typeof BASKETBALL_POSITIONS[number];

// Basketball aspirations/goals
export const BASKETBALL_ASPIRATIONS = [
  "recreational",
  "feeder-team", 
  "aau",
  "middle-school",
  "high-school",
  "college",
  "professional-non-nba",
  "nba"
] as const;
export type BasketballAspiration = typeof BASKETBALL_ASPIRATIONS[number];

// Grade levels
export const GRADE_LEVELS = [
  "elementary",
  "6th",
  "7th", 
  "8th",
  "freshman",
  "sophomore",
  "junior",
  "senior",
  "college-freshman",
  "college-sophomore",
  "college-junior",
  "college-senior",
  "post-college"
] as const;
export type GradeLevel = typeof GRADE_LEVELS[number];

// Avatar customization options
export const AVATAR_SKIN_TONES = ["light", "medium-light", "medium", "medium-dark", "dark"] as const;
export const AVATAR_HAIR_STYLES = ["short", "medium", "long", "braids", "afro", "bald", "buzz"] as const;
export const AVATAR_HAIR_COLORS = ["black", "brown", "blonde", "red", "gray"] as const;

// Career profiles - My Career mode data
export const careerProfiles = pgTable("career_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  
  // Basic info
  birthMonth: integer("birth_month"), // 1-12
  birthYear: integer("birth_year"),
  gradeLevel: varchar("grade_level").$type<GradeLevel>(),
  
  // Team info
  teamName: varchar("team_name"),
  schoolName: varchar("school_name"),
  positions: text("positions").array(), // Array of positions like ["PG", "SG"]
  jerseyNumber: integer("jersey_number"),
  
  // Goals
  aspiration: varchar("aspiration").$type<BasketballAspiration>(),
  focusSkill: varchar("focus_skill").$type<DrillCategory>(),
  
  // Self-evaluation skills (1-10 scale)
  skillBallHandling: integer("skill_ball_handling"),
  skillShooting: integer("skill_shooting"),
  skillPassing: integer("skill_passing"),
  skillFinishing: integer("skill_finishing"),
  skillDefense: integer("skill_defense"),
  skillBasketballIQ: integer("skill_basketball_iq"),
  skillAthletics: integer("skill_athletics"),
  
  // Progression
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  totalXp: integer("total_xp").default(0),
  
  // Avatar customization
  avatarSkinTone: varchar("avatar_skin_tone").default("medium"),
  avatarHairStyle: varchar("avatar_hair_style").default("short"),
  avatarHairColor: varchar("avatar_hair_color").default("black"),
  avatarAccessory: varchar("avatar_accessory"), // headband, glasses, etc.
  
  cardPhotoUrl: varchar("card_photo_url"),
  
  trophyRoomOrder: text("trophy_room_order").array(),
  
  // Staff role for Coach/Trainer mode
  staffRole: varchar("staff_role"), // "coach", "trainer", or "both"
  alsoPlayer: boolean("also_player").default(false),
  
  // Trainer-specific fields
  trainerSpecialties: text("trainer_specialties"), // JSON array of ranked specialties
  trainerAlsoCoaches: boolean("trainer_also_coaches").default(false),
  trainerTeamName: varchar("trainer_team_name"),
  
  // Primary reason for using the app
  primaryReason: varchar("primary_reason"), // "game-stats", "skill-development", "find-trainer", "find-team"
  
  // Onboarding teams (JSON array of team objects with in-season flags)
  onboardingTeams: text("onboarding_teams"), // JSON string: [{name, type, inSeason, seasonStartMonth?}]
  
  // Minor/Parent
  isMinor: boolean("is_minor").default(false),
  parentEmail: varchar("parent_email"),
  parentInviteCode: varchar("parent_invite_code"),

  // Onboarding status
  onboardingCompleted: boolean("onboarding_completed").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Career achievements - unlockable badges/milestones
export const careerAchievements = pgTable("career_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // icon name or emoji
  category: varchar("category").$type<DrillCategory>(),
  xpReward: integer("xp_reward").default(100),
  requirement: varchar("requirement").notNull(), // e.g., "sessions:10", "streak:7", "score:9"
  requirementValue: integer("requirement_value").notNull(),
  tier: varchar("tier").default("bronze"), // bronze, silver, gold, platinum
  createdAt: timestamp("created_at").defaultNow()
});

// User unlocked achievements
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  achievementId: varchar("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow()
});

// Challenge categories
export const CHALLENGE_CATEGORIES = ["shooting", "ball-handling", "passing", "workout"] as const;
export type ChallengeCategory = typeof CHALLENGE_CATEGORIES[number];

// Challenge metric types
export const CHALLENGE_METRICS = ["makes", "dribbles", "passes", "reps", "time", "score"] as const;
export type ChallengeMetric = typeof CHALLENGE_METRICS[number];

// Challenge goal types
export const CHALLENGE_GOAL_TYPES = ["total", "consecutive", "timed"] as const;
export type ChallengeGoalType = typeof CHALLENGE_GOAL_TYPES[number];

// Challenges - app-generated or user-created
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").$type<ChallengeCategory>().notNull(),
  metric: varchar("metric").$type<ChallengeMetric>().notNull(),
  goalType: varchar("goal_type").$type<ChallengeGoalType>().notNull(),
  targetValue: integer("target_value").notNull(), // e.g., 100 makes
  timeLimit: integer("time_limit"), // in seconds, for timed challenges
  isAppGenerated: boolean("is_app_generated").default(false), // true for system challenges
  createdBy: varchar("created_by"), // userId who created it (null for app-generated)
  icon: varchar("icon"), // icon name for badge
  tier: varchar("tier").default("bronze"), // bronze, silver, gold, platinum
  xpReward: integer("xp_reward").default(50),
  createdAt: timestamp("created_at").defaultNow()
});

// User challenge progress/completion
export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  challengeId: varchar("challenge_id").notNull(),
  currentValue: integer("current_value").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at").defaultNow()
});

// Personal Records - earned when beating prior records
export const personalRecords = pgTable("personal_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  drillId: varchar("drill_id"),
  metricName: varchar("metric_name").notNull(),
  previousValue: decimal("previous_value", { precision: 10, scale: 2 }).notNull(),
  newValue: decimal("new_value", { precision: 10, scale: 2 }).notNull(),
  trainingLogId: varchar("training_log_id"),
  gameId: varchar("game_id"),
  source: varchar("source").default("drill"),
  achievedAt: timestamp("achieved_at").defaultNow()
});

// Team Awards - awards from organized teams
export const teamAwards = pgTable("team_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  teamName: varchar("team_name").notNull(),
  awardName: varchar("award_name").notNull(),
  description: text("description"),
  awardType: varchar("award_type").default("team"),
  season: varchar("season"), // e.g., "2024-25"
  awardedAt: timestamp("awarded_at"),
  icon: varchar("icon"),
  createdAt: timestamp("created_at").defaultNow()
});

// Season types for basketball stats tracking
export const SEASON_TYPES = [
  "middle-school",
  "high-school",
  "aau-travel-club",
  "recreational"
] as const;
export type SeasonType = typeof SEASON_TYPES[number];

// Seasons - for tracking game stats across seasons
export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(), // e.g., "Freshman Season", "AAU Summer 2024"
  teamName: varchar("team_name"),
  seasonType: varchar("season_type").$type<SeasonType>().notNull(),
  year: varchar("year").notNull(), // e.g., "2024-25" or "2024"
  isActive: boolean("is_active").default(true),
  isPublicProfile: boolean("is_public_profile").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Games - individual game stats within a season
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seasonId: varchar("season_id").notNull(),
  userId: varchar("user_id").notNull(),
  
  // Game info
  gameDate: timestamp("game_date").notNull(),
  opponent: varchar("opponent"),
  isHome: boolean("is_home").default(true),
  result: varchar("result"), // "W" or "L"
  teamScore: integer("team_score"),
  opponentScore: integer("opponent_score"),
  
  // Basic stats
  points: integer("points").default(0),
  rebounds: integer("rebounds").default(0),
  assists: integer("assists").default(0),
  steals: integer("steals").default(0),
  blocks: integer("blocks").default(0),
  turnovers: integer("turnovers").default(0),
  fouls: integer("fouls").default(0),
  
  // Shooting stats
  fgMade: integer("fg_made").default(0),
  fgAttempted: integer("fg_attempted").default(0),
  threePtMade: integer("three_pt_made").default(0),
  threePtAttempted: integer("three_pt_attempted").default(0),
  ftMade: integer("ft_made").default(0),
  ftAttempted: integer("ft_attempted").default(0),
  
  // Advanced stats
  offensiveRebounds: integer("offensive_rebounds").default(0),
  defensiveRebounds: integer("defensive_rebounds").default(0),
  minutesPlayed: integer("minutes_played").default(0),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// User profiles with location and age
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  displayName: varchar("display_name"),
  email: varchar("email"),
  age: integer("age"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  country: varchar("country").default("USA"),
  skillLevel: varchar("skill_level").$type<DifficultyLevel>().default("beginner"),
  profilePhotoUrl: varchar("profile_photo_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Drills table
export const drills = pgTable("drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").$type<DrillCategory>().notNull(),
  difficulty: varchar("difficulty").$type<DifficultyLevel>().notNull().default("beginner"),
  videoLibraryId: varchar("video_library_id"), // Reference to video library
  pdfLibraryId: varchar("pdf_library_id"), // Reference to PDF library
  videoUrl: varchar("video_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  pdfUrl: varchar("pdf_url"), // URL to linked PDF
  duration: integer("duration"), // in seconds
  equipment: text("equipment").array(),
  tips: text("tips").array(),
  isFeatured: boolean("is_featured").default(false),
  trackShots: boolean("track_shots").default(false), // Enable shot location tracking
  isShared: boolean("is_shared").default(false), // Share user drill with community
  isAiGenerated: boolean("is_ai_generated").default(false), // true = AI-generated daily challenge drill
  userId: varchar("user_id"), // null = admin drill, set = user-created drill
  presetRounds: jsonb("preset_rounds").$type<Array<{ shotLocation?: string; metricValues: Record<string, number> }>>(), // Preset round configs for auto-loading when drill is started
  comboComponents: jsonb("combo_components").$type<Array<{ drillId: string; order: number }>>(), // Ordered sub-drills for combo drills
  createdAt: timestamp("created_at").defaultNow()
});

// Video library for admin-uploaded training videos
export const videoLibrary = pgTable("video_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  duration: integer("duration"), // in seconds
  category: varchar("category").$type<DrillCategory>(),
  difficulty: varchar("difficulty").$type<DifficultyLevel>(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow()
});

// PDF library for admin-uploaded training PDFs
export const pdfLibrary = pgTable("pdf_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  pdfUrl: varchar("pdf_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  category: varchar("category").$type<DrillCategory>(),
  difficulty: varchar("difficulty").$type<DifficultyLevel>(),
  tags: text("tags").array(),
  drillId: varchar("drill_id"), // Optional link to a drill
  createdAt: timestamp("created_at").defaultNow()
});

export const tutorialVideos = pgTable("tutorial_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Metric types for drill configuration
export const METRIC_TYPES = ["number", "calculated"] as const;
export type MetricType = typeof METRIC_TYPES[number];

// Shot locations on half-court
export const SHOT_LOCATIONS = [
  "free-throw",
  "corner-left", 
  "corner-right",
  "top-of-key",
  "wing-left",
  "wing-right",
  "1st-hash-left",
  "1st-hash-right",
  "2nd-hash-left",
  "2nd-hash-right",
  "3rd-hash-left",
  "3rd-hash-right",
  "block-left",
  "block-right",
  "mid-range-left",
  "mid-range-right"
] as const;
export type ShotLocation = typeof SHOT_LOCATIONS[number];

// Shot classification types (auto-determined from location)
export const SHOT_CLASSIFICATIONS = ["free-throw", "2-pointer", "3-pointer"] as const;
export type ShotClassification = typeof SHOT_CLASSIFICATIONS[number];

// Location to classification mapping
export const LOCATION_CLASSIFICATIONS: Record<ShotLocation, ShotClassification> = {
  "free-throw": "free-throw",
  "block-left": "2-pointer",
  "block-right": "2-pointer",
  "mid-range-left": "2-pointer",
  "mid-range-right": "2-pointer",
  "1st-hash-left": "2-pointer",
  "1st-hash-right": "2-pointer",
  "2nd-hash-left": "2-pointer",
  "2nd-hash-right": "2-pointer",
  "corner-left": "3-pointer",
  "corner-right": "3-pointer",
  "wing-left": "3-pointer",
  "wing-right": "3-pointer",
  "top-of-key": "3-pointer",
  "3rd-hash-left": "3-pointer",
  "3rd-hash-right": "3-pointer"
};

// Helper function to get shot classification from location
export function getShotClassification(location: ShotLocation): ShotClassification {
  return LOCATION_CLASSIFICATIONS[location];
}

// DB-managed shot locations (replaces hardcoded SHOT_LOCATIONS array)
export const shotLocations = pgTable("shot_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  label: varchar("label").notNull(),
  classification: varchar("classification").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

// DB-managed shot types
export const shotTypes = pgTable("shot_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  label: varchar("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const insertShotLocationSchema = createInsertSchema(shotLocations).omit({ id: true });
export const insertShotTypeSchema = createInsertSchema(shotTypes).omit({ id: true });
export type ShotLocationDB = typeof shotLocations.$inferSelect;
export type ShotTypeDB = typeof shotTypes.$inferSelect;

// Metric templates - reusable metric definitions (not tied to specific drills)
export const metricTemplates = pgTable("metric_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "Shot Attempts", "Shots Made"
  label: varchar("label").notNull(), // Display label
  type: varchar("type").$type<MetricType>().notNull().default("number"),
  unit: varchar("unit"), // e.g., "shots", "seconds", "%"
  formula: varchar("formula"), // For calculated fields
  formulaInputs: text("formula_inputs").array(), // Names of metrics used in formula
  category: varchar("category").$type<DrillCategory>(), // Required category association
  createdAt: timestamp("created_at").defaultNow()
});

// Drill metrics - links drills to their chosen metric templates
export const drillMetrics = pgTable("drill_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drillId: varchar("drill_id").notNull(),
  metricTemplateId: varchar("metric_template_id").notNull(),
  sortOrder: integer("sort_order").default(0),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Training log metric values - stores actual values for each metric per training log
export const trainingLogMetrics = pgTable("training_log_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainingLogId: varchar("training_log_id").notNull(),
  metricId: varchar("metric_id").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow()
});

// User favorite drills
export const userFavoriteDrills = pgTable("user_favorite_drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  drillId: varchar("drill_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserFavoriteDrill = typeof userFavoriteDrills.$inferSelect;

// Workouts - saved workout templates (combination of 2+ drills)
export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  userId: varchar("user_id"), // null = Handlz workout, set = user-created workout
  category: varchar("category").$type<DrillCategory>(),
  estimatedDuration: integer("estimated_duration"), // in minutes
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Workout drills - links workouts to their component drills
export const workoutDrills = pgTable("workout_drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull(),
  drillId: varchar("drill_id").notNull(),
  sortOrder: integer("sort_order").default(0),
  defaultDuration: integer("default_duration"), // suggested duration in minutes
  defaultSets: integer("default_sets"),
  defaultReps: integer("default_reps"),
  createdAt: timestamp("created_at").defaultNow()
});

// Training logs - users track their drill practice
export const trainingLogs = pgTable("training_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  drillId: varchar("drill_id"), // nullable for free-shoot sessions
  workoutSessionId: varchar("workout_session_id"), // groups logs from same workout session
  duration: integer("duration").notNull(), // in minutes
  reps: integer("reps"),
  sets: integer("sets"),
  score: integer("score"), // self-assessed score 1-10
  notes: text("notes"),
  shotLocation: varchar("shot_location").$type<ShotLocation>(), // Shot location for shooting drills
  shotsAttempted: integer("shots_attempted"), // Number of shots attempted
  shotsMade: integer("shots_made"), // Number of shots made
  completedAt: timestamp("completed_at").defaultNow()
});

// Personal training videos uploaded by users
export const userVideos = pgTable("user_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  drillId: varchar("drill_id"),
  title: varchar("title").notNull(),
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// User drill progress - aggregated stats per drill
export const drillProgress = pgTable("drill_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  drillId: varchar("drill_id").notNull(),
  totalSessions: integer("total_sessions").default(0),
  totalMinutes: integer("total_minutes").default(0),
  averageScore: decimal("average_score", { precision: 3, scale: 1 }),
  bestScore: integer("best_score"),
  lastPracticedAt: timestamp("last_practiced_at"),
  updatedAt: timestamp("updated_at").defaultNow()
});

// National/Community benchmarks by age group
export const benchmarks = pgTable("benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").$type<DrillCategory>().notNull(),
  ageGroup: varchar("age_group").notNull(), // e.g., "12-14", "15-17", "18-24", "25+"
  averageScore: decimal("average_score", { precision: 3, scale: 1 }),
  averageMinutesPerWeek: integer("avg_minutes_per_week"),
  topPercentileScore: decimal("top_percentile_score", { precision: 3, scale: 1 }),
  sampleSize: integer("sample_size").default(0),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  trainingLogs: many(trainingLogs),
  userVideos: many(userVideos),
  drillProgress: many(drillProgress)
}));

export const drillsRelations = relations(drills, ({ many }) => ({
  trainingLogs: many(trainingLogs),
  userVideos: many(userVideos),
  drillProgress: many(drillProgress),
  metrics: many(drillMetrics)
}));

export const metricTemplatesRelations = relations(metricTemplates, ({ many }) => ({
  drillMetrics: many(drillMetrics)
}));

export const drillMetricsRelations = relations(drillMetrics, ({ one }) => ({
  drill: one(drills, { fields: [drillMetrics.drillId], references: [drills.id] }),
  metricTemplate: one(metricTemplates, { fields: [drillMetrics.metricTemplateId], references: [metricTemplates.id] })
}));

export const trainingLogMetricsRelations = relations(trainingLogMetrics, ({ one }) => ({
  trainingLog: one(trainingLogs, { fields: [trainingLogMetrics.trainingLogId], references: [trainingLogs.id] }),
  metricTemplate: one(metricTemplates, { fields: [trainingLogMetrics.metricId], references: [metricTemplates.id] })
}));

export const trainingLogsRelations = relations(trainingLogs, ({ one }) => ({
  drill: one(drills, { fields: [trainingLogs.drillId], references: [drills.id] })
}));

export const workoutsRelations = relations(workouts, ({ many }) => ({
  workoutDrills: many(workoutDrills)
}));

export const workoutDrillsRelations = relations(workoutDrills, ({ one }) => ({
  workout: one(workouts, { fields: [workoutDrills.workoutId], references: [workouts.id] }),
  drill: one(drills, { fields: [workoutDrills.drillId], references: [drills.id] })
}));

// URL validation helper - accepts http(s) URLs or /objects/ paths (null/undefined allowed)
const urlOrObjectPath = z.string().nullish().refine(
  (val) => !val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/objects/"),
  { message: "Must be a valid URL or object storage path" }
);

// Public player profiles - recruiting-style profile page
export const playerProfiles = pgTable("player_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  slug: varchar("slug").notNull().unique(),
  headline: varchar("headline"),
  bio: text("bio"),
  heightFeet: integer("height_feet"),
  heightInches: integer("height_inches"),
  weight: integer("weight"),
  wingspan: varchar("wingspan"),
  gradYear: integer("grad_year"),
  gpa: varchar("gpa"),
  highlightVideoUrl: varchar("highlight_video_url"),
  socialTwitter: varchar("social_twitter"),
  socialInstagram: varchar("social_instagram"),
  socialTiktok: varchar("social_tiktok"),
  socialYoutube: varchar("social_youtube"),
  isPublic: boolean("is_public").default(false),
  showStats: boolean("show_stats").default(false),
  showAchievements: boolean("show_achievements").default(false),
  showVideos: boolean("show_videos").default(false),
  showPersonalRecords: boolean("show_personal_records").default(false),
  showTrainingLog: boolean("show_training_log").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Trainer/Coach teams
export const trainerTeams = pgTable("trainer_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  sport: varchar("sport").default("basketball"),
  teamCode: varchar("team_code").notNull().unique(),
  teamType: varchar("team_type").default("coach"),
  seasonYear: integer("season_year"),
  ageGroup: varchar("age_group"),
  position: varchar("position"),
  level: varchar("level"),
  playerClass: varchar("player_class"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Team members (players on a trainer's team)
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role").default("player"),
  position: varchar("position"),
  jerseyNumber: varchar("jersey_number"),
  joinedAt: timestamp("joined_at").defaultNow()
});

// Drill assignments from coach to team/players
export const drillAssignments = pgTable("drill_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drillId: varchar("drill_id").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  teamId: varchar("team_id"),
  assignedTo: varchar("assigned_to"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  status: varchar("status").default("assigned"),
  trainingLogId: varchar("training_log_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// Messages for Player-Coach/Trainer chat
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  teamId: varchar("team_id"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Player invitations
export const playerInvitations = pgTable("player_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id"),
  invitedBy: varchar("invited_by").notNull(),
  email: varchar("email").notNull(),
  playerName: varchar("player_name"),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow()
});

export const sharedVideos = pgTable("shared_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  teamId: varchar("team_id").notNull(),
  assignmentId: varchar("assignment_id"),
  title: varchar("title").notNull(),
  videoUrl: text("video_url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});

// Group chat threads
export const chatThreads = pgTable("chat_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  name: varchar("name").notNull(),
  scopeType: varchar("scope_type").notNull(), // "team" | "group" | "position" | "custom"
  scopeId: varchar("scope_id"), // teamId/groupId for team/group chats, position value for position chats
  mode: varchar("mode").default("coach"), // "coach" | "trainer"
  isSaved: boolean("is_saved").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const chatThreadMembers = pgTable("chat_thread_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  userId: varchar("user_id").notNull(),
  addedAt: timestamp("added_at").defaultNow()
});

export const chatThreadMessages = pgTable("chat_thread_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: varchar("sender_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Coach-managed players (independent of teams)
export const coachPlayers = pgTable("coach_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  position: varchar("position"),
  jerseyNumber: varchar("jersey_number"),
  ageGroup: varchar("age_group"),
  teamType: varchar("team_type"),
  notes: text("notes"),
  linkedUserId: varchar("linked_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Coach player to team assignments
export const coachPlayerAssignments = pgTable("coach_player_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachPlayerId: varchar("coach_player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  position: varchar("position"),
  jerseyNumber: varchar("jersey_number"),
  assignedAt: timestamp("assigned_at").defaultNow()
});

// Trainer-managed players (independent of groups)
export const trainerPlayers = pgTable("trainer_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  position: varchar("position"),
  jerseyNumber: varchar("jersey_number"),
  ageGroup: varchar("age_group"),
  teamType: varchar("team_type"),
  gradYear: integer("grad_year"),
  notes: text("notes"),
  linkedUserId: varchar("linked_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Trainer player to group assignments
export const trainerPlayerAssignments = pgTable("trainer_player_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerPlayerId: varchar("trainer_player_id").notNull(),
  groupId: varchar("group_id").notNull(),
  position: varchar("position"),
  jerseyNumber: varchar("jersey_number"),
  assignedAt: timestamp("assigned_at").defaultNow()
});

// Player to team assignments (unified: links trainerPlayers to coachTeams)
export const playerTeamAssignments = pgTable("player_team_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  position: varchar("position"),
  jerseyNumber: varchar("jersey_number"),
  assignedAt: timestamp("assigned_at").defaultNow()
});

// Drill ratings - users rate drills 1-5
export const drillRatings = pgTable("drill_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drillId: varchar("drill_id").notNull(),
  userId: varchar("user_id").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Insert schemas
export const insertDrillRatingSchema = createInsertSchema(drillRatings).omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDrillSchema = createInsertSchema(drills).omit({ id: true, createdAt: true }).extend({
  videoUrl: urlOrObjectPath,
  thumbnailUrl: urlOrObjectPath,
});
export const insertVideoLibrarySchema = createInsertSchema(videoLibrary).omit({ id: true, createdAt: true }).extend({
  videoUrl: z.string().refine(
    (val) => val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/objects/"),
    { message: "Must be a valid URL or object storage path" }
  ),
  thumbnailUrl: urlOrObjectPath,
});
export const insertPdfLibrarySchema = createInsertSchema(pdfLibrary).omit({ id: true, createdAt: true }).extend({
  pdfUrl: z.string().refine(
    (val) => val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/objects/"),
    { message: "Must be a valid URL or object storage path" }
  ),
  thumbnailUrl: urlOrObjectPath,
});
export const insertMetricTemplateSchema = createInsertSchema(metricTemplates).omit({ id: true, createdAt: true });
export const insertTrainingLogSchema = createInsertSchema(trainingLogs).omit({ id: true, completedAt: true });
export const insertUserVideoSchema = createInsertSchema(userVideos).omit({ id: true, createdAt: true });
export const insertDrillProgressSchema = createInsertSchema(drillProgress).omit({ id: true, updatedAt: true });
export const insertDrillMetricSchema = createInsertSchema(drillMetrics).omit({ id: true, createdAt: true });
export const insertTrainingLogMetricSchema = createInsertSchema(trainingLogMetrics).omit({ id: true, createdAt: true });
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutDrillSchema = createInsertSchema(workoutDrills).omit({ id: true, createdAt: true });
export const insertCareerProfileSchema = createInsertSchema(careerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCareerAchievementSchema = createInsertSchema(careerAchievements).omit({ id: true, createdAt: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true, unlockedAt: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({ id: true, startedAt: true });
export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({ id: true, achievedAt: true });
export const insertTeamAwardSchema = createInsertSchema(teamAwards).omit({ id: true, createdAt: true });
export const insertSeasonSchema = createInsertSchema(seasons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainerTeamSchema = createInsertSchema(trainerTeams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, joinedAt: true });
export const insertDrillAssignmentSchema = createInsertSchema(drillAssignments).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });
export const insertPlayerInvitationSchema = createInsertSchema(playerInvitations).omit({ id: true, createdAt: true, status: true });
export const insertSharedVideoSchema = createInsertSchema(sharedVideos).omit({ id: true, createdAt: true });
export const insertCoachPlayerSchema = createInsertSchema(coachPlayers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCoachPlayerAssignmentSchema = createInsertSchema(coachPlayerAssignments).omit({ id: true, assignedAt: true });
export const insertTrainerPlayerSchema = createInsertSchema(trainerPlayers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainerPlayerAssignmentSchema = createInsertSchema(trainerPlayerAssignments).omit({ id: true, assignedAt: true });
export const insertPlayerTeamAssignmentSchema = createInsertSchema(playerTeamAssignments).omit({ id: true, assignedAt: true });
export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({ id: true, createdAt: true });
export const insertChatThreadMemberSchema = createInsertSchema(chatThreadMembers).omit({ id: true, addedAt: true });
export const insertChatThreadMessageSchema = createInsertSchema(chatThreadMessages).omit({ id: true, createdAt: true });

// Types
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertDrill = z.infer<typeof insertDrillSchema>;
export type Drill = typeof drills.$inferSelect;
export type InsertVideoLibrary = z.infer<typeof insertVideoLibrarySchema>;
export type VideoLibrary = typeof videoLibrary.$inferSelect;
export const insertTutorialVideoSchema = createInsertSchema(tutorialVideos).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  videoUrl: z.string().refine(
    (val) => val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/objects/"),
    { message: "Must be a valid URL or object storage path" }
  ),
});
export type InsertTutorialVideo = z.infer<typeof insertTutorialVideoSchema>;
export type TutorialVideo = typeof tutorialVideos.$inferSelect;
export type InsertPdfLibrary = z.infer<typeof insertPdfLibrarySchema>;
export type PdfLibrary = typeof pdfLibrary.$inferSelect;
export type InsertMetricTemplate = z.infer<typeof insertMetricTemplateSchema>;
export type MetricTemplate = typeof metricTemplates.$inferSelect;
export type InsertShotLocation = z.infer<typeof insertShotLocationSchema>;
export type InsertShotType = z.infer<typeof insertShotTypeSchema>;
export type InsertTrainingLog = z.infer<typeof insertTrainingLogSchema>;
export type TrainingLog = typeof trainingLogs.$inferSelect;
export type InsertUserVideo = z.infer<typeof insertUserVideoSchema>;
export type UserVideo = typeof userVideos.$inferSelect;
export type InsertDrillProgress = z.infer<typeof insertDrillProgressSchema>;
export type DrillProgress = typeof drillProgress.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
export type InsertDrillMetric = z.infer<typeof insertDrillMetricSchema>;
export type DrillMetric = typeof drillMetrics.$inferSelect;
export type InsertTrainingLogMetric = z.infer<typeof insertTrainingLogMetricSchema>;
export type TrainingLogMetric = typeof trainingLogMetrics.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkoutDrill = z.infer<typeof insertWorkoutDrillSchema>;
export type WorkoutDrill = typeof workoutDrills.$inferSelect;
export type InsertCareerProfile = z.infer<typeof insertCareerProfileSchema>;
export type CareerProfile = typeof careerProfiles.$inferSelect;
export type InsertCareerAchievement = z.infer<typeof insertCareerAchievementSchema>;
export type CareerAchievement = typeof careerAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertTeamAward = z.infer<typeof insertTeamAwardSchema>;
export type TeamAward = typeof teamAwards.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertDrillRating = z.infer<typeof insertDrillRatingSchema>;
export type DrillRating = typeof drillRatings.$inferSelect;
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertTrainerTeam = z.infer<typeof insertTrainerTeamSchema>;
export type TrainerTeam = typeof trainerTeams.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertDrillAssignment = z.infer<typeof insertDrillAssignmentSchema>;
export type DrillAssignment = typeof drillAssignments.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertPlayerInvitation = z.infer<typeof insertPlayerInvitationSchema>;
export type PlayerInvitation = typeof playerInvitations.$inferSelect;
export type InsertSharedVideo = z.infer<typeof insertSharedVideoSchema>;
export type SharedVideo = typeof sharedVideos.$inferSelect;
export type InsertCoachPlayer = z.infer<typeof insertCoachPlayerSchema>;
export type CoachPlayer = typeof coachPlayers.$inferSelect;
export type InsertCoachPlayerAssignment = z.infer<typeof insertCoachPlayerAssignmentSchema>;
export type CoachPlayerAssignment = typeof coachPlayerAssignments.$inferSelect;
export type InsertTrainerPlayer = z.infer<typeof insertTrainerPlayerSchema>;
export type TrainerPlayer = typeof trainerPlayers.$inferSelect;
export type InsertTrainerPlayerAssignment = z.infer<typeof insertTrainerPlayerAssignmentSchema>;
export type TrainerPlayerAssignment = typeof trainerPlayerAssignments.$inferSelect;
export type InsertPlayerTeamAssignment = z.infer<typeof insertPlayerTeamAssignmentSchema>;
export type PlayerTeamAssignment = typeof playerTeamAssignments.$inferSelect;
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThreadMember = z.infer<typeof insertChatThreadMemberSchema>;
export type ChatThreadMember = typeof chatThreadMembers.$inferSelect;
export type InsertChatThreadMessage = z.infer<typeof insertChatThreadMessageSchema>;
export type ChatThreadMessage = typeof chatThreadMessages.$inferSelect;

// Trainer content videos (instructional videos created by trainers)
export const trainerVideos = pgTable("trainer_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  videoUrl: varchar("video_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  category: varchar("category").$type<DrillCategory>(),
  difficulty: varchar("difficulty").$type<DifficultyLevel>(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertTrainerVideoSchema = createInsertSchema(trainerVideos).omit({ id: true, createdAt: true }).extend({
  videoUrl: z.string().refine(
    (val) => val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/objects/"),
    { message: "Must be a valid URL or object storage path" }
  ),
  thumbnailUrl: urlOrObjectPath,
});

export type InsertTrainerVideo = z.infer<typeof insertTrainerVideoSchema>;
export type TrainerVideo = typeof trainerVideos.$inferSelect;

// ===== TEAM & LEAGUE FINDER =====

export const TEAM_ORGANIZATION_TYPES = ["AAU", "Travel", "Club", "Competitive", "Select", "Prep"] as const;
export type TeamOrganizationType = typeof TEAM_ORGANIZATION_TYPES[number];

export const LEAGUE_TYPES = ["Community", "Recreational", "Church", "YMCA", "Parks & Rec", "School", "Pro-Am", "Adult"] as const;
export type LeagueType = typeof LEAGUE_TYPES[number];

export const AGE_GROUPS = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U", "High School", "College", "Adult"] as const;
export type AgeGroup = typeof AGE_GROUPS[number];

export const SEASONS = ["Fall", "Winter", "Spring", "Summer", "Year-Round"] as const;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
] as const;

export const GENDERS = ["Boys", "Girls", "Coed"] as const;

export const CIRCUITS = ["UA Association", "UA Rise", "UA Future", "Nike EYBL", "Nike EYCL", "Nike EYBL Scholastic", "Adidas 3SSB", "Adidas 3Stripes Gold", "Adidas Jr. 3SSB", "Puma PRO16", "Puma NXTPRO", "Puma Jr. PRO16", "On The Radar Hoops", "Independent"] as const;
export type Circuit = typeof CIRCUITS[number];

export const teamClubs = pgTable("team_clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  organizationType: varchar("organization_type").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  gender: varchar("gender"),
  circuit: varchar("circuit"),
  ageGroups: text("age_groups").array(),
  description: text("description"),
  website: varchar("website"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  socialInstagram: varchar("social_instagram"),
  socialTwitter: varchar("social_twitter"),
  logoUrl: varchar("logo_url"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isVerified: boolean("is_verified").default(false),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamClubSchema = createInsertSchema(teamClubs).omit({
  id: true,
  isVerified: true,
  createdAt: true,
});

export const leagues = pgTable("leagues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  leagueType: varchar("league_type").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  ageGroups: text("age_groups").array(),
  seasons: text("seasons").array(),
  description: text("description"),
  website: varchar("website"),
  registrationUrl: varchar("registration_url"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  costInfo: varchar("cost_info"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isVerified: boolean("is_verified").default(false),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeagueSchema = createInsertSchema(leagues).omit({
  id: true,
  isVerified: true,
  createdAt: true,
});

export type InsertTeamClub = z.infer<typeof insertTeamClubSchema>;
export type TeamClub = typeof teamClubs.$inferSelect;
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leagues.$inferSelect;

export const TRAINER_EQUIPMENT = [
  "Weighted Basketball",
  "Shooting Machine",
  "Resistance Bands",
  "Agility Ladder",
  "Cones",
  "Speed Hurdles",
  "Dribble Goggles",
  "Training Pads",
  "Medicine Ball",
  "Jump Rope",
  "Weights / Dumbbells",
  "Kettlebells",
  "Foam Roller",
  "Ball Cart",
  "Scoreboard / Timer",
] as const;

export const TRAINER_SESSION_TYPES = [
  "1-on-1",
  "Small Group (2-4)",
  "Group (5+)",
  "Virtual/Remote",
  "Camp/Clinic",
] as const;

export const TRAINER_SPECIALTIES = [
  "Ball Handling",
  "Shooting",
  "Defense",
  "Strength & Conditioning",
  "Basketball IQ",
  "Finishing",
  "Passing",
  "Post Play",
  "Guard Skills",
  "Big Man Skills",
  "Speed & Agility",
  "Mental Performance",
] as const;

export const trainerProfiles = pgTable("trainer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  headline: varchar("headline"),
  bio: text("bio"),
  specialties: text("specialties").array(),
  city: varchar("city"),
  state: varchar("state"),
  hourlyRate: integer("hourly_rate"),
  sessionTypes: text("session_types").array(),
  equipment: text("equipment").array(),
  experienceYears: integer("experience_years"),
  certifications: text("certifications"),
  availability: text("availability"),
  profilePhotoUrl: varchar("profile_photo_url"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  socialInstagram: varchar("social_instagram"),
  socialTwitter: varchar("social_twitter"),
  website: varchar("website"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isPublic: boolean("is_public").default(false),
  stripeAccountId: varchar("stripe_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainerProfileSchema = createInsertSchema(trainerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainerProfile = z.infer<typeof insertTrainerProfileSchema>;
export type TrainerProfile = typeof trainerProfiles.$inferSelect;

export const trainingLocations = pgTable("training_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address"),
  description: text("description"),
  city: varchar("city"),
  state: varchar("state"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainingLocationSchema = createInsertSchema(trainingLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingLocation = z.infer<typeof insertTrainingLocationSchema>;
export type TrainingLocation = typeof trainingLocations.$inferSelect;

export const trainerProfileLocations = pgTable("trainer_profile_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerProfileId: varchar("trainer_profile_id").notNull(),
  locationId: varchar("location_id").notNull(),
  availability: text("availability"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrainerProfileLocationSchema = createInsertSchema(trainerProfileLocations).omit({
  id: true,
  createdAt: true,
});

export type InsertTrainerProfileLocation = z.infer<typeof insertTrainerProfileLocationSchema>;
export type TrainerProfileLocation = typeof trainerProfileLocations.$inferSelect;

export const playerTrainerFavorites = pgTable("player_trainer_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  trainerId: varchar("trainer_id").notNull(),
  isMyTrainer: boolean("is_my_trainer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlayerTrainerFavoriteSchema = createInsertSchema(playerTrainerFavorites).omit({
  id: true,
  createdAt: true,
});

export type InsertPlayerTrainerFavorite = z.infer<typeof insertPlayerTrainerFavoriteSchema>;
export type PlayerTrainerFavorite = typeof playerTrainerFavorites.$inferSelect;

export const SESSION_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed"] as const;

export const trainingSessions = pgTable("training_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  playerId: varchar("player_id").notNull(),
  trainerProfileId: varchar("trainer_profile_id").notNull(),
  locationId: varchar("location_id"),
  sessionDate: varchar("session_date").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  status: varchar("status").notNull().default("requested"),
  playerNotes: text("player_notes"),
  trainerNotes: text("trainer_notes"),
  declineReason: text("decline_reason"),
  sessionType: varchar("session_type"),
  groupSessionId: varchar("group_session_id"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

export const EVALUATION_SCALE_TYPES = ["1-10", "1-5", "word"] as const;
export type EvaluationScaleType = typeof EVALUATION_SCALE_TYPES[number];

export const EVALUATION_TYPES = ["initial", "progress"] as const;
export type EvaluationType = typeof EVALUATION_TYPES[number];

export const evaluationAttributes = pgTable("evaluation_attributes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category"),
  scaleType: varchar("scale_type").notNull(),
  wordOptions: text("word_options"),
  isDefault: boolean("is_default").default(false),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvaluationAttributeSchema = createInsertSchema(evaluationAttributes).omit({
  id: true,
  createdAt: true,
});

export type InsertEvaluationAttribute = z.infer<typeof insertEvaluationAttributeSchema>;
export type EvaluationAttribute = typeof evaluationAttributes.$inferSelect;

export const playerEvaluations = pgTable("player_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  playerId: varchar("player_id").notNull(),
  evaluationType: varchar("evaluation_type").notNull(),
  notes: text("notes"),
  evaluationDate: varchar("evaluation_date").notNull(),
  sharedWithPlayer: boolean("shared_with_player").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlayerEvaluationSchema = createInsertSchema(playerEvaluations).omit({
  id: true,
  createdAt: true,
});

export type InsertPlayerEvaluation = z.infer<typeof insertPlayerEvaluationSchema>;
export type PlayerEvaluation = typeof playerEvaluations.$inferSelect;

export const playerEvaluationRatings = pgTable("player_evaluation_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evaluationId: varchar("evaluation_id").notNull(),
  attributeId: varchar("attribute_id").notNull(),
  numericValue: integer("numeric_value"),
  wordValue: varchar("word_value"),
  notes: text("notes"),
});

export const insertPlayerEvaluationRatingSchema = createInsertSchema(playerEvaluationRatings).omit({
  id: true,
});

export type InsertPlayerEvaluationRating = z.infer<typeof insertPlayerEvaluationRatingSchema>;
export type PlayerEvaluationRating = typeof playerEvaluationRatings.$inferSelect;

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;

export const playerTrainerConnections = pgTable("player_trainer_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  trainerId: varchar("trainer_id").notNull(),
  status: varchar("status").$type<"pending" | "accepted" | "declined">().default("pending").notNull(),
  initiatedBy: varchar("initiated_by").$type<"player" | "trainer">().notNull(),
  requesterUserId: varchar("requester_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(playerTrainerConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type PlayerTrainerConnection = typeof playerTrainerConnections.$inferSelect;

export const parentLinks = pgTable("parent_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentUserId: varchar("parent_user_id").notNull(),
  playerUserId: varchar("player_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertParentLinkSchema = createInsertSchema(parentLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertParentLink = z.infer<typeof insertParentLinkSchema>;
export type ParentLink = typeof parentLinks.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const nativePushTokens = pgTable("native_push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull(),
  platform: varchar("platform").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type NativePushToken = typeof nativePushTokens.$inferSelect;

// ─── User Feedback Forum ───────────────────────────────────────────────────

export const FEEDBACK_CATEGORIES = ["bug", "feature-request", "suggestion", "general"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_STATUSES = ["open", "in-review", "planned", "done", "closed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const feedbackPosts = pgTable("feedback_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeedbackPostSchema = createInsertSchema(feedbackPosts).omit({
  id: true,
  voteCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFeedbackPost = z.infer<typeof insertFeedbackPostSchema>;
export type FeedbackPost = typeof feedbackPosts.$inferSelect;

export const feedbackVotes = pgTable("feedback_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  postId: varchar("post_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FeedbackVote = typeof feedbackVotes.$inferSelect;

export const feedbackComments = pgTable("feedback_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => feedbackPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  authorName: varchar("author_name", { length: 100 }).notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FeedbackComment = typeof feedbackComments.$inferSelect;

// ─── User Analytics Events ────────────────────────────────────────────────

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  page: varchar("page", { length: 200 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for funnel/retention queries that filter by event + window
  // and walk events per user in time order.
  eventCreatedAtIdx: index("analytics_events_event_created_at_idx").on(table.event, table.createdAt),
  userCreatedAtIdx:  index("analytics_events_user_created_at_idx").on(table.userId, table.createdAt),
}));

// ─── Analytics Insights (cached AI-generated insights & anomaly alerts) ────

export const analyticsInsights = pgTable("analytics_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // 'daily_summary' | 'weekly_summary' | 'anomaly' | 'top_movers' | 'manual'
  kind: varchar("kind", { length: 50 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  body: text("body").notNull(), // markdown
  // 'info' | 'warn' | 'critical' | 'positive'
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  metadata: jsonb("metadata"),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsInsight = typeof analyticsInsights.$inferSelect;

// ─── Daily Streak Challenge ───────────────────────────────────────────────

// Which drill is the daily challenge for a given date (YYYY-MM-DD)
export const dailyChallenges = pgTable("daily_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeDate: varchar("challenge_date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  drillId: varchar("drill_id").notNull(),
  isAdminOverride: boolean("is_admin_override").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DailyChallenge = typeof dailyChallenges.$inferSelect;

// Per-user daily completion record
export const dailyCompletions = pgTable("daily_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  challengeDate: varchar("challenge_date", { length: 10 }).notNull(), // YYYY-MM-DD
  drillId: varchar("drill_id").notNull(),
  trainingLogId: varchar("training_log_id"),
  completedAt: timestamp("completed_at").defaultNow(),
});

export type DailyCompletion = typeof dailyCompletions.$inferSelect;

// Per-user streak state (current and all-time best)
export const userStreaks = pgTable("user_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastCompletedDate: varchar("last_completed_date", { length: 10 }), // YYYY-MM-DD
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserStreak = typeof userStreaks.$inferSelect;

// ─── Programs ─────────────────────────────────────────────────────────────
// Structured multi-day training journeys. Player-paced by default; events
// (added later) wrap a program with strict timing + leaderboards. Trainers
// will later author custom programs and assign them to players.

export const PROGRAM_AUTHOR_TYPES = ["system", "trainer", "event"] as const;
export type ProgramAuthorType = typeof PROGRAM_AUTHOR_TYPES[number];

export const PROGRAM_CADENCES = ["userPaced", "daily", "fixedDates"] as const;
export type ProgramCadence = typeof PROGRAM_CADENCES[number];

export const PROGRAM_VISIBILITY = ["public", "unlisted", "private", "connections"] as const;
export type ProgramVisibility = typeof PROGRAM_VISIBILITY[number];

export const PROGRAM_ITEM_TYPES = ["workout", "drill", "challenge", "watch", "rest"] as const;
export type ProgramItemType = typeof PROGRAM_ITEM_TYPES[number];

export const PROGRAM_ENROLLMENT_STATUS = ["active", "completed", "abandoned"] as const;
export type ProgramEnrollmentStatus = typeof PROGRAM_ENROLLMENT_STATUS[number];

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: varchar("title").notNull(),
  tagline: varchar("tagline"),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url"),
  accentColor: varchar("accent_color"), // optional hex like "#f97316" — themes the hero
  authorType: varchar("author_type").$type<ProgramAuthorType>().notNull().default("system"),
  authorUserId: varchar("author_user_id"), // null for system; set for trainer-authored
  lengthDays: integer("length_days").notNull(),
  cadence: varchar("cadence").$type<ProgramCadence>().notNull().default("userPaced"),
  difficulty: varchar("difficulty").$type<DifficultyLevel>().notNull().default("beginner"),
  categoryTags: text("category_tags").array(),
  estimatedMinutesPerDay: integer("estimated_minutes_per_day"),
  visibility: varchar("visibility").$type<ProgramVisibility>().notNull().default("public"),
  isPublished: boolean("is_published").default(false),
  isFeatured: boolean("is_featured").default(false),
  enrollmentCount: integer("enrollment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const programItems = pgTable("program_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  dayNumber: integer("day_number").notNull(),
  orderInDay: integer("order_in_day").notNull().default(0),
  itemType: varchar("item_type").$type<ProgramItemType>().notNull(),
  title: varchar("title").notNull(),
  notes: text("notes"), // coach-style instructions for the user
  // Polymorphic refs — only one is populated based on itemType:
  drillId: varchar("drill_id"), // for "drill" or simple "workout" w/ a single drill
  workoutSpec: jsonb("workout_spec").$type<Array<{
    drillId: string;
    sets?: number;
    reps?: number;
    durationSec?: number;
    targetScore?: number;
    notes?: string;
  }>>(), // for multi-drill "workout" items
  challengeSpec: jsonb("challenge_spec").$type<{
    scoringMetric: string; // "points" | "timeSeconds" | "madeShots" | "streak" | "custom"
    target?: number;
    timeLimitSec?: number;
    description?: string;
  }>(), // for "challenge" items
  watchUrl: varchar("watch_url"), // for "watch" items
  watchProvider: varchar("watch_provider"), // "youtube" | "vimeo" | "internal"
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  byProgramDay: index("program_items_program_day_idx").on(table.programId, table.dayNumber, table.orderInDay),
}));

export const programEnrollments = pgTable("program_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  programId: varchar("program_id").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  currentDay: integer("current_day").notNull().default(1),
  completedAt: timestamp("completed_at"),
  assignedByTrainerId: varchar("assigned_by_trainer_id"),
  eventId: varchar("event_id"), // null until events ship
  status: varchar("status").$type<ProgramEnrollmentStatus>().notNull().default("active"),
}, (table) => ({
  byUserStatus: index("program_enrollments_user_status_idx").on(table.userId, table.status),
  byProgram: index("program_enrollments_program_idx").on(table.programId),
  byUserProgram: index("program_enrollments_user_program_idx").on(table.userId, table.programId),
  // Race-safe: at most one ACTIVE enrollment per (user, program). Allows
  // multiple completed/abandoned rows so re-enrollment after a pause works.
  uqUserProgramActive: uniqueIndex("program_enrollments_user_program_active_uq")
    .on(table.userId, table.programId)
    .where(sql`status = 'active'`),
}));

export const programItemCompletions = pgTable("program_item_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").notNull(),
  programItemId: varchar("program_item_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  trainingLogId: varchar("training_log_id"), // links to training_logs when applicable
  score: decimal("score", { precision: 8, scale: 2 }), // for challenges / leaderboards
  notes: text("notes"),
}, (table) => ({
  byEnrollment: index("program_item_completions_enrollment_idx").on(table.enrollmentId),
  // Race-safe: a given (enrollment, item) pair can complete at most once.
  uqEnrollmentItem: uniqueIndex("program_item_completions_enrollment_item_uq").on(table.enrollmentId, table.programItemId),
}));

// Relations
export const programsRelations = relations(programs, ({ many }) => ({
  items: many(programItems),
  enrollments: many(programEnrollments),
}));

export const programItemsRelations = relations(programItems, ({ one, many }) => ({
  program: one(programs, { fields: [programItems.programId], references: [programs.id] }),
  drill: one(drills, { fields: [programItems.drillId], references: [drills.id] }),
  completions: many(programItemCompletions),
}));

export const programEnrollmentsRelations = relations(programEnrollments, ({ one, many }) => ({
  program: one(programs, { fields: [programEnrollments.programId], references: [programs.id] }),
  completions: many(programItemCompletions),
}));

export const programItemCompletionsRelations = relations(programItemCompletions, ({ one }) => ({
  enrollment: one(programEnrollments, { fields: [programItemCompletions.enrollmentId], references: [programEnrollments.id] }),
  programItem: one(programItems, { fields: [programItemCompletions.programItemId], references: [programItems.id] }),
}));

// Insert schemas + types
export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true, createdAt: true, updatedAt: true, enrollmentCount: true,
}).extend({
  coverImageUrl: urlOrObjectPath,
});

export const insertProgramItemSchema = createInsertSchema(programItems).omit({
  id: true, createdAt: true,
}).extend({
  watchUrl: urlOrObjectPath,
});

export const insertProgramEnrollmentSchema = createInsertSchema(programEnrollments).omit({
  id: true, startedAt: true, completedAt: true,
});

export const insertProgramItemCompletionSchema = createInsertSchema(programItemCompletions).omit({
  id: true, completedAt: true,
});

export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type ProgramItem = typeof programItems.$inferSelect;
export type InsertProgramItem = z.infer<typeof insertProgramItemSchema>;
export type ProgramEnrollment = typeof programEnrollments.$inferSelect;
export type InsertProgramEnrollment = z.infer<typeof insertProgramEnrollmentSchema>;
export type ProgramItemCompletion = typeof programItemCompletions.$inferSelect;
export type InsertProgramItemCompletion = z.infer<typeof insertProgramItemCompletionSchema>;

// ─── Events (Program Wrapper w/ Time Window + Leaderboard) ───────────────
// ── Leaderboard Challenges ────────────────────────────────────────────────────
// Standalone competitive challenges: track a metric (shots made, sessions, etc.)
// over a time window, rank all participants on a live leaderboard.
export const LC_METRICS = ["shots_made", "shots_attempted", "sessions", "duration_minutes"] as const;
export type LCMetric = typeof LC_METRICS[number];

export const LC_STATUSES = ["draft", "scheduled", "live", "finished"] as const;
export type LCStatus = typeof LC_STATUSES[number];

export const leaderboardChallenges = pgTable("leaderboard_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: varchar("title").notNull(),
  tagline: varchar("tagline"),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url"),
  accentColor: varchar("accent_color").default("#f97316"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isPublished: boolean("is_published").default(false),
  metric: varchar("metric").$type<LCMetric>().notNull().default("shots_made"),
  shotLocation: varchar("shot_location"), // null = any location
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lcParticipants = pgTable("lc_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull(),
  userId: varchar("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (t) => ({
  uq: uniqueIndex("lc_participants_uq").on(t.challengeId, t.userId),
}));

export const insertLCSchema = createInsertSchema(leaderboardChallenges).omit({ id: true, createdAt: true }).extend({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  metric: z.enum(LC_METRICS).default("shots_made"),
});
export type LeaderboardChallenge = typeof leaderboardChallenges.$inferSelect;
export type InsertLC = z.infer<typeof insertLCSchema>;
export type LCParticipant = typeof lcParticipants.$inferSelect;

// An Event wraps a Program with a strict start/end window and a leaderboard.
// During the window players join → auto-enrolls them in the wrapped program
// with `programEnrollments.eventId` set so all completions are scoped. The
// optional final-challenge item points at a specific program_items row whose
// score becomes the final-leaderboard input.
export const EVENT_LEADERBOARD_METRICS = ["completions", "finalScore", "composite"] as const;
export type EventLeaderboardMetric = typeof EVENT_LEADERBOARD_METRICS[number];

// `status` is derived (not stored): draft (!isPublished), scheduled (now < startsAt),
// live (startsAt <= now <= endsAt), finished (now > endsAt).
export const EVENT_STATUSES = ["draft", "scheduled", "live", "finished"] as const;
export type EventStatus = typeof EVENT_STATUSES[number];

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: varchar("title").notNull(),
  tagline: varchar("tagline"),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url"),
  accentColor: varchar("accent_color"),
  programId: varchar("program_id").notNull(),
  finalChallengeItemId: varchar("final_challenge_item_id"), // optional explicit pointer
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isPublished: boolean("is_published").default(false),
  leaderboardMetric: varchar("leaderboard_metric").$type<EventLeaderboardMetric>().notNull().default("composite"),
  participantCount: integer("participant_count").default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  byProgram: index("events_program_idx").on(table.programId),
  byPublishedWindow: index("events_published_window_idx").on(table.isPublished, table.startsAt, table.endsAt),
}));

export const eventParticipants = pgTable("event_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  userId: varchar("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  finalScore: decimal("final_score", { precision: 10, scale: 2 }),
  finalSubmittedAt: timestamp("final_submitted_at"),
  finalNotes: text("final_notes"),
  /** How many attempts the player needed to complete the final challenge. */
  attemptsTaken: integer("attempts_taken"),
}, (table) => ({
  byEvent: index("event_participants_event_idx").on(table.eventId),
  byUser: index("event_participants_user_idx").on(table.userId),
  uqEventUser: uniqueIndex("event_participants_event_user_uq").on(table.eventId, table.userId),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  program: one(programs, { fields: [events.programId], references: [programs.id] }),
  finalChallengeItem: one(programItems, { fields: [events.finalChallengeItemId], references: [programItems.id] }),
  participants: many(eventParticipants),
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
}));

export const insertEventSchema = createInsertSchema(events).omit({
  id: true, createdAt: true, updatedAt: true, participantCount: true,
}).extend({
  coverImageUrl: urlOrObjectPath,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  leaderboardMetric: z.enum(EVENT_LEADERBOARD_METRICS).default("composite"),
});

export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({
  id: true, joinedAt: true, finalScore: true, finalSubmittedAt: true, finalNotes: true,
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;
