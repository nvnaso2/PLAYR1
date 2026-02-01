import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
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

// User profiles with location and age
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  displayName: varchar("display_name"),
  age: integer("age"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("USA"),
  skillLevel: varchar("skill_level").$type<DifficultyLevel>().default("beginner"),
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
  userId: varchar("user_id"), // null = admin drill, set = user-created drill
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

// Metric types for drill configuration
export const METRIC_TYPES = ["number", "calculated"] as const;
export type MetricType = typeof METRIC_TYPES[number];

// Shot types for shooting metrics
export const SHOT_TYPES = ["form", "free-throw", "mid-range", "3-pointer"] as const;
export type ShotType = typeof SHOT_TYPES[number];

// Made or Attempted
export const MADE_ATTEMPTED = ["made", "attempted"] as const;
export type MadeAttempted = typeof MADE_ATTEMPTED[number];

// Shot locations
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
  shotType: varchar("shot_type").$type<ShotType>(), // For shooting category
  madeAttempted: varchar("made_attempted").$type<MadeAttempted>(), // Made or Attempted
  shotLocation: varchar("shot_location").$type<ShotLocation>(), // Shot location
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

// Workouts - saved workout templates (combination of 2+ drills)
export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  userId: varchar("user_id"), // null = Handlz workout, set = user-created workout
  category: varchar("category").$type<DrillCategory>(),
  estimatedDuration: integer("estimated_duration"), // in minutes
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
  drillId: varchar("drill_id").notNull(),
  workoutSessionId: varchar("workout_session_id"), // groups logs from same workout session
  duration: integer("duration").notNull(), // in minutes
  reps: integer("reps"),
  sets: integer("sets"),
  score: integer("score"), // self-assessed score 1-10
  notes: text("notes"),
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

// Insert schemas
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

// Types
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertDrill = z.infer<typeof insertDrillSchema>;
export type Drill = typeof drills.$inferSelect;
export type InsertVideoLibrary = z.infer<typeof insertVideoLibrarySchema>;
export type VideoLibrary = typeof videoLibrary.$inferSelect;
export type InsertPdfLibrary = z.infer<typeof insertPdfLibrarySchema>;
export type PdfLibrary = typeof pdfLibrary.$inferSelect;
export type InsertMetricTemplate = z.infer<typeof insertMetricTemplateSchema>;
export type MetricTemplate = typeof metricTemplates.$inferSelect;
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
