import { 
  drills, type Drill, type InsertDrill,
  trainingLogs, type TrainingLog, type InsertTrainingLog,
  userProfiles, type UserProfile, type InsertUserProfile,
  userVideos, type UserVideo, type InsertUserVideo,
  drillProgress, type DrillProgress, type InsertDrillProgress,
  benchmarks, type Benchmark,
  drillMetrics, type DrillMetric, type InsertDrillMetric,
  trainingLogMetrics, type TrainingLogMetric, type InsertTrainingLogMetric,
  videoLibrary, type VideoLibrary, type InsertVideoLibrary,
  pdfLibrary, type PdfLibrary, type InsertPdfLibrary,
  metricTemplates, type MetricTemplate, type InsertMetricTemplate,
  LOCATION_CLASSIFICATIONS, type ShotLocation,
  workouts, type Workout, type InsertWorkout,
  workoutDrills, type WorkoutDrill, type InsertWorkoutDrill,
  careerProfiles, type CareerProfile, type InsertCareerProfile,
  careerAchievements, type CareerAchievement, type InsertCareerAchievement,
  userAchievements, type UserAchievement, type InsertUserAchievement,
  challenges, type Challenge, type InsertChallenge,
  userChallenges, type UserChallenge, type InsertUserChallenge,
  personalRecords, type PersonalRecord, type InsertPersonalRecord,
  teamAwards, type TeamAward, type InsertTeamAward,
  seasons, type Season, type InsertSeason,
  games, type Game, type InsertGame,
  drillRatings, type DrillRating
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, sql, gte, isNotNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Drills
  getDrills(): Promise<Drill[]>;
  getDrillById(id: string): Promise<Drill | undefined>;
  getFeaturedDrills(): Promise<Drill[]>;
  getDrillsByCategory(category: string): Promise<Drill[]>;
  getDrillsForUser(userId: string): Promise<Drill[]>; // Admin drills + user's own drills
  getUserDrills(userId: string): Promise<Drill[]>; // Only user's own drills
  getCommunityDrills(): Promise<Drill[]>; // Shared user drills
  toggleDrillSharing(id: string, isShared: boolean): Promise<Drill | undefined>;
  createDrill(drill: InsertDrill): Promise<Drill>;
  updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill | undefined>;
  deleteDrill(id: string): Promise<boolean>;
  
  // Admin
  isUserAdmin(userId: string): Promise<boolean>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<boolean>;
  getAllUsers(): Promise<Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean }>>;
  createUser(userData: { email: string; firstName?: string; lastName?: string; isAdmin?: boolean }): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean }>;

  // Training Logs
  getTrainingLogs(userId: string): Promise<TrainingLog[]>;
  getRecentTrainingLogs(userId: string, limit?: number): Promise<TrainingLog[]>;
  getTrainingLog(id: string): Promise<TrainingLog | undefined>;
  createTrainingLog(log: InsertTrainingLog): Promise<TrainingLog>;
  updateTrainingLog(id: string, updates: Partial<InsertTrainingLog>): Promise<TrainingLog>;

  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;

  // User Videos
  getUserVideos(userId: string): Promise<UserVideo[]>;
  createUserVideo(video: InsertUserVideo): Promise<UserVideo>;
  deleteUserVideo(id: string, userId: string): Promise<boolean>;

  // Progress
  getDrillProgress(userId: string): Promise<DrillProgress[]>;
  updateDrillProgress(userId: string, drillId: string, duration: number, score?: number): Promise<DrillProgress>;
  getUserDrillsWithPersonalBests(userId: string, limit?: number): Promise<Array<Drill & { personalBest: number | null; totalSessions: number }>>;

  // Stats
  getUserStats(userId: string, period?: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }>;
  getWeeklyStats(userId: string, period?: string): Promise<{ date: string; minutes: number; sessions: number }[]>;
  getCategoryStats(userId: string, period?: string): Promise<{ category: string; minutes: number; sessions: number }[]>;
  getDashboardTrainingStats(userId: string, period?: string): Promise<Record<string, number>>;

  // Benchmarks
  getBenchmarks(): Promise<Benchmark[]>;

  // Video Library
  getVideoLibrary(): Promise<VideoLibrary[]>;
  getVideoLibraryById(id: string): Promise<VideoLibrary | undefined>;
  createVideoLibraryItem(video: InsertVideoLibrary): Promise<VideoLibrary>;
  updateVideoLibraryItem(id: string, video: Partial<InsertVideoLibrary>): Promise<VideoLibrary | undefined>;
  deleteVideoLibraryItem(id: string): Promise<boolean>;

  // PDF Library
  getPdfLibrary(): Promise<PdfLibrary[]>;
  getPdfLibraryById(id: string): Promise<PdfLibrary | undefined>;
  createPdfLibraryItem(pdf: InsertPdfLibrary): Promise<PdfLibrary>;
  updatePdfLibraryItem(id: string, pdf: Partial<InsertPdfLibrary>): Promise<PdfLibrary | undefined>;
  deletePdfLibraryItem(id: string): Promise<boolean>;

  // Metric Templates
  getMetricTemplates(): Promise<MetricTemplate[]>;
  getMetricTemplateById(id: string): Promise<MetricTemplate | undefined>;
  createMetricTemplate(template: InsertMetricTemplate): Promise<MetricTemplate>;
  updateMetricTemplate(id: string, template: Partial<InsertMetricTemplate>): Promise<MetricTemplate | undefined>;
  deleteMetricTemplate(id: string): Promise<boolean>;

  // Drill Metrics (links drills to metric templates)
  getDrillMetrics(drillId: string): Promise<DrillMetric[]>;
  getDrillMetricsWithTemplates(drillId: string): Promise<Array<DrillMetric & { template: MetricTemplate }>>;
  setDrillMetrics(drillId: string, metricTemplateIds: string[]): Promise<DrillMetric[]>;
  createDrillMetric(metric: InsertDrillMetric): Promise<DrillMetric>;
  updateDrillMetric(id: string, metric: Partial<InsertDrillMetric>): Promise<DrillMetric | undefined>;
  deleteDrillMetric(id: string): Promise<boolean>;
  
  // Training Log Metrics
  getTrainingLogMetrics(trainingLogId: string): Promise<TrainingLogMetric[]>;
  saveTrainingLogMetrics(trainingLogId: string, metrics: Array<{ metricId: string; value: number }>): Promise<TrainingLogMetric[]>;

  // Workouts
  getWorkouts(): Promise<Workout[]>;
  getHandlzWorkouts(): Promise<Workout[]>; // Admin-created workouts (userId is null)
  getUserWorkouts(userId: string): Promise<Workout[]>; // User's own workouts
  getWorkoutById(id: string): Promise<Workout | undefined>;
  getWorkoutWithDrills(id: string): Promise<{ workout: Workout; drills: Array<WorkoutDrill & { drill: Drill }> } | undefined>;
  createWorkout(workout: InsertWorkout, drillIds: string[]): Promise<Workout>;
  updateWorkout(id: string, workout: Partial<InsertWorkout>, drillIds?: string[]): Promise<Workout | undefined>;
  deleteWorkout(id: string): Promise<boolean>;

  // Career Profiles
  getCareerProfile(userId: string): Promise<CareerProfile | undefined>;
  createCareerProfile(profile: InsertCareerProfile): Promise<CareerProfile>;
  updateCareerProfile(userId: string, profile: Partial<InsertCareerProfile>): Promise<CareerProfile | undefined>;
  addXpToCareer(userId: string, xp: number): Promise<CareerProfile | undefined>;

  // Achievements
  getAchievements(): Promise<CareerAchievement[]>;
  getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: CareerAchievement }>>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]>;

  // Challenges
  getChallenges(): Promise<Challenge[]>;
  getAppGeneratedChallenges(): Promise<Challenge[]>;
  getUserCreatedChallenges(userId: string): Promise<Challenge[]>;
  getChallengeById(id: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, challenge: Partial<InsertChallenge>): Promise<Challenge | undefined>;
  deleteChallenge(id: string): Promise<boolean>;
  getUserChallenges(userId: string): Promise<Array<UserChallenge & { challenge: Challenge }>>;
  startChallenge(userId: string, challengeId: string): Promise<UserChallenge>;
  updateChallengeProgress(id: string, currentValue: number): Promise<UserChallenge | undefined>;
  completeChallenge(id: string): Promise<UserChallenge | undefined>;

  // Personal Records
  getUserPersonalRecords(userId: string): Promise<Array<PersonalRecord & { drill: Drill }>>;
  createPersonalRecord(record: InsertPersonalRecord): Promise<PersonalRecord>;
  
  // Team Awards
  getUserTeamAwards(userId: string): Promise<TeamAward[]>;
  createTeamAward(award: InsertTeamAward): Promise<TeamAward>;
  updateTeamAward(id: string, award: Partial<InsertTeamAward>): Promise<TeamAward | undefined>;
  deleteTeamAward(id: string): Promise<boolean>;

  // Drill Ratings
  getDrillRatings(drillId: string): Promise<{ averageRating: number; totalRatings: number }>;
  getUserDrillRating(drillId: string, userId: string): Promise<number | null>;
  rateDrill(drillId: string, userId: string, rating: number): Promise<DrillRating>;
  getDrillRatingsBatch(drillIds: string[]): Promise<Record<string, { averageRating: number; totalRatings: number }>>;

  // Shot Stats (for heatmap)
  getUserShotStats(userId: string): Promise<Array<{ location: string; made: number; missed: number }>>;

  // Seasons
  getUserSeasons(userId: string): Promise<Season[]>;
  getSeasonWithGames(seasonId: string): Promise<{ season: Season; games: Game[] } | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: string, season: Partial<InsertSeason>): Promise<Season | undefined>;
  deleteSeason(id: string): Promise<boolean>;

  // Games
  getSeasonGames(seasonId: string): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;

  // Career Stats
  getCareerStats(userId: string): Promise<{
    totalGames: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
    seasonBreakdown: Array<{
      seasonId: string;
      seasonName: string;
      seasonType: string;
      year: string;
      gamesPlayed: number;
      avgPoints: number;
      avgRebounds: number;
      avgAssists: number;
      avgSteals: number;
      avgBlocks: number;
    }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Drills
  async getDrills(): Promise<Drill[]> {
    return await db.select().from(drills).orderBy(drills.title);
  }

  async getDrillById(id: string): Promise<Drill | undefined> {
    const [drill] = await db.select().from(drills).where(eq(drills.id, id));
    return drill;
  }

  async getFeaturedDrills(): Promise<Drill[]> {
    return await db.select().from(drills).where(eq(drills.isFeatured, true)).limit(8);
  }

  async getDrillsByCategory(category: string): Promise<Drill[]> {
    return await db.select().from(drills).where(eq(drills.category, category as any));
  }

  async getDrillsForUser(userId: string): Promise<Drill[]> {
    // Get admin drills (userId is null) and user's own drills
    return await db.select().from(drills)
      .where(sql`${drills.userId} IS NULL OR ${drills.userId} = ${userId}`)
      .orderBy(drills.title);
  }

  async getUserDrills(userId: string): Promise<Drill[]> {
    // Get only user's own drills
    return await db.select().from(drills)
      .where(eq(drills.userId, userId))
      .orderBy(desc(drills.createdAt));
  }

  async getCommunityDrills(): Promise<Drill[]> {
    return await db.select().from(drills)
      .where(and(
        isNotNull(drills.userId),
        eq(drills.isShared, true)
      ))
      .orderBy(desc(drills.createdAt));
  }

  async toggleDrillSharing(id: string, isShared: boolean): Promise<Drill | undefined> {
    const [updated] = await db.update(drills)
      .set({ isShared })
      .where(eq(drills.id, id))
      .returning();
    return updated;
  }

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill as any).returning();
    return newDrill;
  }

  async updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill | undefined> {
    const [updated] = await db.update(drills)
      .set(drill as any)
      .where(eq(drills.id, id))
      .returning();
    return updated;
  }

  async deleteDrill(id: string): Promise<boolean> {
    await db.delete(drills).where(eq(drills.id, id));
    return true;
  }

  // Admin - checks both env var (bootstrap) and database field
  async isUserAdmin(userId: string): Promise<boolean> {
    // Check environment variable first (bootstrap admins)
    const envAdminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    if (envAdminIds.includes(userId)) {
      return true;
    }
    // Then check database
    const [profile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile?.isAdmin === true;
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<boolean> {
    const [existing] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    
    if (existing) {
      await db.update(userProfiles)
        .set({ isAdmin, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));
    } else {
      await db.insert(userProfiles)
        .values({ userId, isAdmin });
    }
    return true;
  }

  // User management
  async getAllUsers(): Promise<Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean }>> {
    const allUsers = await db.select().from(users);
    const profiles = await db.select().from(userProfiles);
    const envAdminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    
    return allUsers.map(user => {
      const profile = profiles.find(p => p.userId === user.id);
      const isEnvAdmin = envAdminIds.includes(user.id);
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: isEnvAdmin || (profile?.isAdmin === true),
      };
    });
  }

  async createUser(userData: { email: string; firstName?: string; lastName?: string; isAdmin?: boolean }): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean }> {
    const [newUser] = await db.insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
      })
      .returning();
    
    // If isAdmin is set, create a user profile with admin flag
    if (userData.isAdmin) {
      await db.insert(userProfiles)
        .values({
          userId: newUser.id,
          isAdmin: true,
        });
    }
    
    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      isAdmin: userData.isAdmin || false,
    };
  }

  // Training Logs
  async getTrainingLogs(userId: string): Promise<TrainingLog[]> {
    return await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId))
      .orderBy(desc(trainingLogs.completedAt));
  }

  async getRecentTrainingLogs(userId: string, limit = 10): Promise<TrainingLog[]> {
    return await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId))
      .orderBy(desc(trainingLogs.completedAt))
      .limit(limit);
  }

  async getTrainingLog(id: string): Promise<TrainingLog | undefined> {
    const [log] = await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.id, id));
    return log;
  }

  async createTrainingLog(log: InsertTrainingLog): Promise<TrainingLog> {
    const [newLog] = await db.insert(trainingLogs).values(log).returning();
    
    // Update drill progress
    if (log.drillId) {
      await this.updateDrillProgress(log.userId, log.drillId, log.duration, log.score ?? undefined);
    }
    
    return newLog;
  }

  async updateTrainingLog(id: string, updates: Partial<InsertTrainingLog>): Promise<TrainingLog> {
    const [updated] = await db.update(trainingLogs)
      .set(updates)
      .where(eq(trainingLogs.id, id))
      .returning();
    return updated;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db.insert(userProfiles)
      .values(profile as any)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profile,
          updatedAt: new Date()
        } as any
      })
      .returning();
    return result;
  }

  // User Videos
  async getUserVideos(userId: string): Promise<UserVideo[]> {
    return await db.select()
      .from(userVideos)
      .where(eq(userVideos.userId, userId))
      .orderBy(desc(userVideos.createdAt));
  }

  async createUserVideo(video: InsertUserVideo): Promise<UserVideo> {
    const [newVideo] = await db.insert(userVideos).values(video).returning();
    return newVideo;
  }

  async deleteUserVideo(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(userVideos)
      .where(and(eq(userVideos.id, id), eq(userVideos.userId, userId)));
    return true;
  }

  // Progress
  async getDrillProgress(userId: string): Promise<DrillProgress[]> {
    return await db.select()
      .from(drillProgress)
      .where(eq(drillProgress.userId, userId));
  }

  async updateDrillProgress(userId: string, drillId: string, duration: number, score?: number): Promise<DrillProgress> {
    const existing = await db.select()
      .from(drillProgress)
      .where(and(eq(drillProgress.userId, userId), eq(drillProgress.drillId, drillId)));

    if (existing.length > 0) {
      const current = existing[0];
      const newTotalSessions = (current.totalSessions || 0) + 1;
      const newTotalMinutes = (current.totalMinutes || 0) + duration;
      const newBestScore = score && (!current.bestScore || score > current.bestScore) ? score : current.bestScore;
      
      let newAvgScore = current.averageScore;
      if (score) {
        const currentTotal = Number(current.averageScore || 0) * (current.totalSessions || 0);
        newAvgScore = String(((currentTotal + score) / newTotalSessions).toFixed(1));
      }

      const [updated] = await db.update(drillProgress)
        .set({
          totalSessions: newTotalSessions,
          totalMinutes: newTotalMinutes,
          averageScore: newAvgScore,
          bestScore: newBestScore,
          lastPracticedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(eq(drillProgress.userId, userId), eq(drillProgress.drillId, drillId)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(drillProgress)
        .values({
          userId,
          drillId,
          totalSessions: 1,
          totalMinutes: duration,
          averageScore: score ? String(score) : null,
          bestScore: score,
          lastPracticedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async getUserDrillsWithPersonalBests(userId: string, limit: number = 4): Promise<Array<Drill & { personalBest: number | null; totalSessions: number }>> {
    // Get user's drill progress ordered by most recently practiced with drill data in a single query
    const progressWithDrills = await db.select({
      drill: drills,
      bestScore: drillProgress.bestScore,
      totalSessions: drillProgress.totalSessions,
    })
      .from(drillProgress)
      .innerJoin(drills, eq(drillProgress.drillId, drills.id))
      .where(eq(drillProgress.userId, userId))
      .orderBy(desc(drillProgress.lastPracticedAt))
      .limit(limit);

    const result: Array<Drill & { personalBest: number | null; totalSessions: number }> = progressWithDrills.map(p => ({
      ...p.drill,
      personalBest: p.bestScore,
      totalSessions: p.totalSessions || 0
    }));

    // If we have fewer than limit items, fill with featured drills
    if (result.length < limit) {
      const existingIds = result.map(d => d.id);
      const remainingLimit = limit - result.length;
      
      const featuredDrills = await db.select()
        .from(drills)
        .where(eq(drills.isFeatured, true))
        .limit(remainingLimit + 5); // Get extra in case of overlap
      
      for (const drill of featuredDrills) {
        if (!existingIds.includes(drill.id) && result.length < limit) {
          result.push({
            ...drill,
            personalBest: null,
            totalSessions: 0
          });
        }
      }
    }

    return result;
  }

  // Helper to get date range based on period
  private getDateRangeForPeriod(period: string = "weekly"): Date {
    const now = new Date();
    switch (period) {
      case "daily":
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        return startOfDay;
      case "weekly":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case "monthly":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      case "annual":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return yearAgo;
      default:
        const defaultWeekAgo = new Date(now);
        defaultWeekAgo.setDate(defaultWeekAgo.getDate() - 7);
        return defaultWeekAgo;
    }
  }

  // Stats
  async getUserStats(userId: string, period: string = "weekly"): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }> {
    const startDate = this.getDateRangeForPeriod(period);
    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    const totalSessions = logs.length;
    const totalMinutes = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const scoresWithValues = logs.filter(log => log.score != null);
    const avgScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((sum, log) => sum + (log.score || 0), 0) / scoresWithValues.length 
      : 0;

    // Calculate streak (simplified - count consecutive days)
    let streak = 0;
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastLogDate = new Date(sortedLogs[0].completedAt!);
      lastLogDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        streak = 1;
        let prevDate = lastLogDate;
        
        for (let i = 1; i < sortedLogs.length; i++) {
          const logDate = new Date(sortedLogs[i].completedAt!);
          logDate.setHours(0, 0, 0, 0);
          
          const diff = Math.floor((prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 0) continue;
          if (diff === 1) {
            streak++;
            prevDate = logDate;
          } else {
            break;
          }
        }
      }
    }

    return { totalSessions, totalMinutes, avgScore: Math.round(avgScore * 10) / 10, streak };
  }

  async getWeeklyStats(userId: string, period: string = "weekly"): Promise<{ date: string; minutes: number; sessions: number }[]> {
    const startDate = this.getDateRangeForPeriod(period);

    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    const dailyStats: Record<string, { minutes: number; sessions: number }> = {};
    
    // Initialize days based on period
    const daysToShow = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
    for (let i = 0; i < Math.min(daysToShow, 30); i++) { // Cap at 30 days for display
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = { minutes: 0, sessions: 0 };
    }

    // Aggregate logs
    logs.forEach(log => {
      const dateStr = new Date(log.completedAt!).toISOString().split('T')[0];
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].minutes += log.duration || 0;
        dailyStats[dateStr].sessions += 1;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCategoryStats(userId: string, period: string = "weekly"): Promise<{ category: string; minutes: number; sessions: number }[]> {
    const startDate = this.getDateRangeForPeriod(period);
    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    const drillIds = Array.from(new Set(logs.map(l => l.drillId)));
    
    if (drillIds.length === 0) return [];

    const drillsData = await db.select()
      .from(drills)
      .where(sql`${drills.id} IN ${drillIds}`);

    const drillCategoryMap = new Map(drillsData.map(d => [d.id, d.category]));

    const categoryStats: Record<string, { minutes: number; sessions: number }> = {};

    logs.forEach(log => {
      const category = drillCategoryMap.get(log.drillId) || 'unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { minutes: 0, sessions: 0 };
      }
      categoryStats[category].minutes += log.duration || 0;
      categoryStats[category].sessions += 1;
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  async getDashboardTrainingStats(userId: string, period: string = "weekly"): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const startDate = this.getDateRangeForPeriod(period);

    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    let totalShotsMade = 0;
    let threePointersMade = 0;
    let freeThrowsMade = 0;
    let fieldGoalsMade = 0;
    let layupsMade = 0;

    for (const log of logs) {
      if (log.shotLocation && log.shotsMade && log.shotsMade > 0) {
        const classification = LOCATION_CLASSIFICATIONS[log.shotLocation as ShotLocation];
        totalShotsMade += log.shotsMade;
        if (classification === "3-pointer") threePointersMade += log.shotsMade;
        else if (classification === "free-throw") freeThrowsMade += log.shotsMade;
        else if (classification === "2-pointer") {
          const loc = log.shotLocation as string;
          if (loc.includes("block")) {
            layupsMade += log.shotsMade;
          } else {
            fieldGoalsMade += log.shotsMade;
          }
        }
      }
    }

    if (totalShotsMade > 0) result["totalShotsMade"] = totalShotsMade;
    if (threePointersMade > 0) result["threePointersMade"] = threePointersMade;
    if (freeThrowsMade > 0) result["freeThrowsMade"] = freeThrowsMade;
    if (fieldGoalsMade > 0) result["fieldGoalsMade"] = fieldGoalsMade;
    if (layupsMade > 0) result["layupsMade"] = layupsMade;

    const totalConditioningMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
    if (totalConditioningMinutes > 0) result["conditioningTime"] = totalConditioningMinutes;

    const logIds = logs.map(l => l.id);
    if (logIds.length > 0) {
      const metrics = await db.select({
        metricId: trainingLogMetrics.metricId,
        value: trainingLogMetrics.value,
      })
        .from(trainingLogMetrics)
        .where(inArray(trainingLogMetrics.trainingLogId, logIds));

      const templates = await db.select().from(metricTemplates);
      const templateMap = new Map(templates.map(t => [t.id, t]));

      const metricTotals: Record<string, number> = {};
      for (const m of metrics) {
        const tmpl = templateMap.get(m.metricId);
        if (!tmpl || !m.value) continue;
        const val = Number(m.value);
        if (val <= 0) continue;
        if (!metricTotals[tmpl.name]) metricTotals[tmpl.name] = 0;
        metricTotals[tmpl.name] += val;
      }

      const ballHandlingTime = (metricTotals["time"] || 0);
      const leftHandDribbles = (metricTotals["left_hand_dribbles"] || 0) + (metricTotals["left_hand"] || 0);
      const rightHandDribbles = (metricTotals["right_hand_dribbles"] || 0) + (metricTotals["right_hand"] || 0);
      const totalDribbles = (metricTotals["total_dribbles"] || 0) + (metricTotals["dribbles"] || 0);
      const passesMade = (metricTotals["passes"] || 0) + (metricTotals["total_passes"] || 0) + (metricTotals["left_hand_passes"] || 0) + (metricTotals["right_hand_passes"] || 0);
      const formShotsMade = metricTotals["form_shots_made"] || 0;
      const metricShotsMade = metricTotals["shot(s)_made"] || 0;
      const metricFreeThrowsMade = metricTotals["free_throws_made"] || 0;
      const metricLayups = (metricTotals["total_layups"] || 0) + (metricTotals["left_hand_layups"] || 0) + (metricTotals["right_hand_layups"] || 0);

      if (metricShotsMade > 0 && !result["totalShotsMade"]) result["totalShotsMade"] = metricShotsMade;
      else if (metricShotsMade > 0) result["totalShotsMade"] += metricShotsMade;

      if (metricFreeThrowsMade > 0 && !result["freeThrowsMade"]) result["freeThrowsMade"] = metricFreeThrowsMade;
      else if (metricFreeThrowsMade > 0) result["freeThrowsMade"] += metricFreeThrowsMade;

      if (metricLayups > 0 && !result["layupsMade"]) result["layupsMade"] = metricLayups;
      else if (metricLayups > 0) result["layupsMade"] += metricLayups;

      const totalBallHandling = leftHandDribbles + rightHandDribbles + totalDribbles;

      if (totalBallHandling > 0 || ballHandlingTime > 0) result["timeBallHandling"] = totalBallHandling || ballHandlingTime;
      if (passesMade > 0) result["passesMade"] = passesMade;
      if (leftHandDribbles > 0) result["leftHandBallHandling"] = leftHandDribbles;
      if (rightHandDribbles > 0) result["rightHandBallHandling"] = rightHandDribbles;
      if (formShotsMade > 0) result["formShotsMade"] = formShotsMade;
    }

    return result;
  }

  // Benchmarks
  async getBenchmarks(): Promise<Benchmark[]> {
    return await db.select().from(benchmarks);
  }

  // Video Library
  async getVideoLibrary(): Promise<VideoLibrary[]> {
    return await db.select().from(videoLibrary).orderBy(desc(videoLibrary.createdAt));
  }

  async getVideoLibraryById(id: string): Promise<VideoLibrary | undefined> {
    const [video] = await db.select().from(videoLibrary).where(eq(videoLibrary.id, id));
    return video;
  }

  async createVideoLibraryItem(video: InsertVideoLibrary): Promise<VideoLibrary> {
    const [newVideo] = await db.insert(videoLibrary).values(video as any).returning();
    return newVideo;
  }

  async updateVideoLibraryItem(id: string, video: Partial<InsertVideoLibrary>): Promise<VideoLibrary | undefined> {
    const [updated] = await db.update(videoLibrary)
      .set(video as any)
      .where(eq(videoLibrary.id, id))
      .returning();
    return updated;
  }

  async deleteVideoLibraryItem(id: string): Promise<boolean> {
    await db.delete(videoLibrary).where(eq(videoLibrary.id, id));
    return true;
  }

  // PDF Library
  async getPdfLibrary(): Promise<PdfLibrary[]> {
    return await db.select().from(pdfLibrary).orderBy(desc(pdfLibrary.createdAt));
  }

  async getPdfLibraryById(id: string): Promise<PdfLibrary | undefined> {
    const [pdf] = await db.select().from(pdfLibrary).where(eq(pdfLibrary.id, id));
    return pdf;
  }

  async createPdfLibraryItem(pdf: InsertPdfLibrary): Promise<PdfLibrary> {
    const [newPdf] = await db.insert(pdfLibrary).values(pdf as any).returning();
    return newPdf;
  }

  async updatePdfLibraryItem(id: string, pdf: Partial<InsertPdfLibrary>): Promise<PdfLibrary | undefined> {
    const [updated] = await db.update(pdfLibrary)
      .set(pdf as any)
      .where(eq(pdfLibrary.id, id))
      .returning();
    return updated;
  }

  async deletePdfLibraryItem(id: string): Promise<boolean> {
    await db.delete(pdfLibrary).where(eq(pdfLibrary.id, id));
    return true;
  }

  // Metric Templates
  async getMetricTemplates(): Promise<MetricTemplate[]> {
    return await db.select().from(metricTemplates).orderBy(metricTemplates.name);
  }

  async getMetricTemplateById(id: string): Promise<MetricTemplate | undefined> {
    const [template] = await db.select().from(metricTemplates).where(eq(metricTemplates.id, id));
    return template;
  }

  async createMetricTemplate(template: InsertMetricTemplate): Promise<MetricTemplate> {
    const [newTemplate] = await db.insert(metricTemplates).values(template as any).returning();
    return newTemplate;
  }

  async updateMetricTemplate(id: string, template: Partial<InsertMetricTemplate>): Promise<MetricTemplate | undefined> {
    const [updated] = await db.update(metricTemplates)
      .set(template as any)
      .where(eq(metricTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteMetricTemplate(id: string): Promise<boolean> {
    await db.delete(metricTemplates).where(eq(metricTemplates.id, id));
    return true;
  }

  // Drill Metrics
  async getDrillMetrics(drillId: string): Promise<DrillMetric[]> {
    return await db.select()
      .from(drillMetrics)
      .where(eq(drillMetrics.drillId, drillId))
      .orderBy(drillMetrics.sortOrder);
  }

  async getDrillMetricsWithTemplates(drillId: string): Promise<Array<DrillMetric & { template: MetricTemplate }>> {
    const results = await db.select({
      drillMetric: drillMetrics,
      template: metricTemplates,
    })
      .from(drillMetrics)
      .innerJoin(metricTemplates, eq(drillMetrics.metricTemplateId, metricTemplates.id))
      .where(eq(drillMetrics.drillId, drillId))
      .orderBy(drillMetrics.sortOrder);
    
    return results.map(r => ({
      ...r.drillMetric,
      template: r.template
    }));
  }

  async setDrillMetrics(drillId: string, metricTemplateIds: string[]): Promise<DrillMetric[]> {
    // Delete existing drill metrics
    await db.delete(drillMetrics).where(eq(drillMetrics.drillId, drillId));
    
    if (metricTemplateIds.length === 0) return [];
    
    // Insert new drill metrics
    const values = metricTemplateIds.map((id, index) => ({
      drillId,
      metricTemplateId: id,
      sortOrder: index,
      isRequired: false,
    }));
    
    const inserted = await db.insert(drillMetrics).values(values).returning();
    return inserted;
  }

  async createDrillMetric(metric: InsertDrillMetric): Promise<DrillMetric> {
    const [newMetric] = await db.insert(drillMetrics).values(metric as any).returning();
    return newMetric;
  }

  async updateDrillMetric(id: string, metric: Partial<InsertDrillMetric>): Promise<DrillMetric | undefined> {
    const [updated] = await db.update(drillMetrics)
      .set(metric as any)
      .where(eq(drillMetrics.id, id))
      .returning();
    return updated;
  }

  async deleteDrillMetric(id: string): Promise<boolean> {
    await db.delete(drillMetrics).where(eq(drillMetrics.id, id));
    return true;
  }

  // Training Log Metrics
  async getTrainingLogMetrics(trainingLogId: string): Promise<TrainingLogMetric[]> {
    return await db.select()
      .from(trainingLogMetrics)
      .where(eq(trainingLogMetrics.trainingLogId, trainingLogId));
  }

  async saveTrainingLogMetrics(trainingLogId: string, metrics: Array<{ metricId: string; value: number }>): Promise<TrainingLogMetric[]> {
    // Delete existing metrics for this training log first
    await db.delete(trainingLogMetrics).where(eq(trainingLogMetrics.trainingLogId, trainingLogId));
    
    if (metrics.length === 0) return [];
    
    // Insert new metrics
    const values = metrics.map(m => ({
      trainingLogId,
      metricId: m.metricId,
      value: String(m.value)
    }));
    
    const inserted = await db.insert(trainingLogMetrics).values(values).returning();
    return inserted;
  }

  // Workouts
  async getWorkouts(): Promise<Workout[]> {
    return await db.select().from(workouts).orderBy(desc(workouts.createdAt));
  }

  async getHandlzWorkouts(): Promise<Workout[]> {
    return await db.select().from(workouts)
      .where(sql`${workouts.userId} IS NULL`)
      .orderBy(workouts.name);
  }

  async getUserWorkouts(userId: string): Promise<Workout[]> {
    return await db.select().from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.createdAt));
  }

  async getWorkoutById(id: string): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async getWorkoutWithDrills(id: string): Promise<{ workout: Workout; drills: Array<WorkoutDrill & { drill: Drill }> } | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    if (!workout) return undefined;

    const results = await db.select({
      workoutDrill: workoutDrills,
      drill: drills
    })
      .from(workoutDrills)
      .innerJoin(drills, eq(workoutDrills.drillId, drills.id))
      .where(eq(workoutDrills.workoutId, id))
      .orderBy(workoutDrills.sortOrder);

    return {
      workout,
      drills: results.map(r => ({
        ...r.workoutDrill,
        drill: r.drill
      }))
    };
  }

  async createWorkout(workout: InsertWorkout, drillIds: string[]): Promise<Workout> {
    const [newWorkout] = await db.insert(workouts).values(workout as any).returning();
    
    if (drillIds.length > 0) {
      const drillValues = drillIds.map((drillId, index) => ({
        workoutId: newWorkout.id,
        drillId,
        sortOrder: index
      }));
      await db.insert(workoutDrills).values(drillValues);
    }
    
    return newWorkout;
  }

  async updateWorkout(id: string, workout: Partial<InsertWorkout>, drillIds?: string[]): Promise<Workout | undefined> {
    const [updated] = await db.update(workouts)
      .set({ ...workout, updatedAt: new Date() } as any)
      .where(eq(workouts.id, id))
      .returning();
    
    if (!updated) return undefined;
    
    // Update drills if provided
    if (drillIds !== undefined) {
      await db.delete(workoutDrills).where(eq(workoutDrills.workoutId, id));
      
      if (drillIds.length > 0) {
        const drillValues = drillIds.map((drillId, index) => ({
          workoutId: id,
          drillId,
          sortOrder: index
        }));
        await db.insert(workoutDrills).values(drillValues);
      }
    }
    
    return updated;
  }

  async deleteWorkout(id: string): Promise<boolean> {
    // Delete associated workout drills first
    await db.delete(workoutDrills).where(eq(workoutDrills.workoutId, id));
    await db.delete(workouts).where(eq(workouts.id, id));
    return true;
  }

  // Career Profiles
  async getCareerProfile(userId: string): Promise<CareerProfile | undefined> {
    const [profile] = await db.select().from(careerProfiles).where(eq(careerProfiles.userId, userId));
    return profile;
  }

  async createCareerProfile(profile: InsertCareerProfile): Promise<CareerProfile> {
    const [newProfile] = await db.insert(careerProfiles).values(profile as any).returning();
    return newProfile;
  }

  async updateCareerProfile(userId: string, profile: Partial<InsertCareerProfile>): Promise<CareerProfile | undefined> {
    const [updated] = await db.update(careerProfiles)
      .set({ ...profile, updatedAt: new Date() } as any)
      .where(eq(careerProfiles.userId, userId))
      .returning();
    return updated;
  }

  async addXpToCareer(userId: string, xpToAdd: number): Promise<CareerProfile | undefined> {
    const existingProfile = await this.getCareerProfile(userId);
    if (!existingProfile) return undefined;

    const newXp = (existingProfile.xp || 0) + xpToAdd;
    const newTotalXp = (existingProfile.totalXp || 0) + xpToAdd;
    
    // Calculate level based on XP (100 XP per level, increasing by 50 each level)
    let level = existingProfile.level || 1;
    let xpForNextLevel = level * 100 + 50;
    let currentXp = newXp;
    
    while (currentXp >= xpForNextLevel) {
      currentXp -= xpForNextLevel;
      level++;
      xpForNextLevel = level * 100 + 50;
    }

    const [updated] = await db.update(careerProfiles)
      .set({ 
        xp: currentXp, 
        totalXp: newTotalXp, 
        level,
        updatedAt: new Date() 
      } as any)
      .where(eq(careerProfiles.userId, userId))
      .returning();
    
    return updated;
  }

  // Achievements
  async getAchievements(): Promise<CareerAchievement[]> {
    return await db.select().from(careerAchievements).orderBy(careerAchievements.name);
  }

  async getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: CareerAchievement }>> {
    const results = await db
      .select()
      .from(userAchievements)
      .innerJoin(careerAchievements, eq(userAchievements.achievementId, careerAchievements.id))
      .where(eq(userAchievements.userId, userId));
    
    return results.map(r => ({
      ...r.user_achievements,
      achievement: r.career_achievements
    }));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Check if already unlocked
    const [existing] = await db
      .select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
    
    if (existing) return existing;

    const [newAchievement] = await db
      .insert(userAchievements)
      .values({ userId, achievementId })
      .returning();
    
    // Add XP from achievement
    const [achievement] = await db
      .select()
      .from(careerAchievements)
      .where(eq(careerAchievements.id, achievementId));
    
    if (achievement?.xpReward) {
      await this.addXpToCareer(userId, achievement.xpReward);
    }
    
    return newAchievement;
  }

  async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];
    
    // Get user's stats
    const stats = await this.getUserStats(userId);
    const allAchievements = await this.getAchievements();
    const userAchievementsList = await this.getUserAchievements(userId);
    const unlockedIds = new Set(userAchievementsList.map(ua => ua.achievementId));
    
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;
      
      let shouldUnlock = false;
      const [reqType, reqDetail] = achievement.requirement.split(':');
      
      switch (reqType) {
        case 'sessions':
          shouldUnlock = stats.totalSessions >= achievement.requirementValue;
          break;
        case 'minutes':
          shouldUnlock = stats.totalMinutes >= achievement.requirementValue;
          break;
        case 'streak':
          shouldUnlock = stats.streak >= achievement.requirementValue;
          break;
        case 'score':
          shouldUnlock = stats.avgScore >= achievement.requirementValue;
          break;
      }
      
      if (shouldUnlock) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        unlockedAchievements.push(unlocked);
      }
    }
    
    return unlockedAchievements;
  }

  // Challenges
  async getChallenges(): Promise<Challenge[]> {
    return await db.select().from(challenges).orderBy(desc(challenges.createdAt));
  }

  async getAppGeneratedChallenges(): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.isAppGenerated, true));
  }

  async getUserCreatedChallenges(userId: string): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.createdBy, userId));
  }

  async getChallengeById(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [newChallenge] = await db.insert(challenges).values(challenge).returning();
    return newChallenge;
  }

  async updateChallenge(id: string, challenge: Partial<InsertChallenge>): Promise<Challenge | undefined> {
    const [updated] = await db.update(challenges).set(challenge).where(eq(challenges.id, id)).returning();
    return updated;
  }

  async deleteChallenge(id: string): Promise<boolean> {
    const result = await db.delete(challenges).where(eq(challenges.id, id));
    return true;
  }

  async getUserChallenges(userId: string): Promise<Array<UserChallenge & { challenge: Challenge }>> {
    const results = await db
      .select()
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId))
      .orderBy(desc(userChallenges.startedAt));
    
    return results.map(r => ({
      ...r.user_challenges,
      challenge: r.challenges
    }));
  }

  async startChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    // Check if already started
    const [existing] = await db
      .select()
      .from(userChallenges)
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ));
    
    if (existing) return existing;

    const [newUserChallenge] = await db
      .insert(userChallenges)
      .values({ userId, challengeId })
      .returning();
    
    return newUserChallenge;
  }

  async updateChallengeProgress(id: string, currentValue: number): Promise<UserChallenge | undefined> {
    const [updated] = await db
      .update(userChallenges)
      .set({ currentValue })
      .where(eq(userChallenges.id, id))
      .returning();
    return updated;
  }

  async completeChallenge(id: string): Promise<UserChallenge | undefined> {
    const [updated] = await db
      .update(userChallenges)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(userChallenges.id, id))
      .returning();
    
    // Add XP reward if completed
    if (updated) {
      const challenge = await this.getChallengeById(updated.challengeId);
      if (challenge?.xpReward) {
        await this.addXpToCareer(updated.userId, challenge.xpReward);
      }
    }
    
    return updated;
  }

  // Personal Records
  async getUserPersonalRecords(userId: string): Promise<Array<PersonalRecord & { drill: { title: string } }>> {
    const results = await db
      .select()
      .from(personalRecords)
      .leftJoin(drills, eq(personalRecords.drillId, drills.id))
      .where(eq(personalRecords.userId, userId))
      .orderBy(desc(personalRecords.achievedAt));
    
    return results.map(r => ({
      ...r.personal_records,
      drill: { title: r.drills?.title || (r.personal_records.source === "game" ? "Game Stats" : "Unknown") }
    }));
  }

  async createPersonalRecord(record: InsertPersonalRecord): Promise<PersonalRecord> {
    const [newRecord] = await db.insert(personalRecords).values(record).returning();
    return newRecord;
  }

  async checkAndCreateDrillPRs(userId: string, drillId: string, trainingLogId: string, metrics: { metricName: string; value: number }[]): Promise<PersonalRecord[]> {
    const created: PersonalRecord[] = [];
    for (const metric of metrics) {
      if (metric.value <= 0) continue;
      const existing = await db
        .select()
        .from(personalRecords)
        .where(and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.drillId, drillId),
          eq(personalRecords.metricName, metric.metricName),
          eq(personalRecords.source, "drill")
        ))
        .orderBy(desc(personalRecords.newValue))
        .limit(1);
      
      const currentBest = existing.length > 0 ? Number(existing[0].newValue) : 0;
      if (metric.value > currentBest) {
        const pr = await this.createPersonalRecord({
          userId,
          drillId,
          metricName: metric.metricName,
          previousValue: currentBest.toFixed(2),
          newValue: metric.value.toFixed(2),
          trainingLogId,
          source: "drill"
        });
        created.push(pr);
      }
    }
    return created;
  }

  async checkAndCreateGamePRs(userId: string, gameId: string, stats: Record<string, number>): Promise<PersonalRecord[]> {
    const created: PersonalRecord[] = [];
    const statNames: Record<string, string> = {
      points: "Points",
      rebounds: "Rebounds",
      assists: "Assists",
      steals: "Steals",
      blocks: "Blocks",
      fgMade: "FG Made",
      threePtMade: "3PT Made",
      ftMade: "FT Made"
    };
    
    for (const [key, label] of Object.entries(statNames)) {
      const value = stats[key];
      if (value === undefined || value === null || value <= 0) continue;
      
      const existing = await db
        .select()
        .from(personalRecords)
        .where(and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.metricName, label),
          eq(personalRecords.source, "game")
        ))
        .orderBy(desc(personalRecords.newValue))
        .limit(1);
      
      const currentBest = existing.length > 0 ? Number(existing[0].newValue) : 0;
      if (value > currentBest) {
        const pr = await this.createPersonalRecord({
          userId,
          metricName: label,
          previousValue: currentBest.toFixed(2),
          newValue: value.toFixed(2),
          gameId,
          source: "game"
        });
        created.push(pr);
      }
    }
    return created;
  }

  // Team Awards
  async getUserTeamAwards(userId: string): Promise<TeamAward[]> {
    return await db.select().from(teamAwards).where(eq(teamAwards.userId, userId)).orderBy(desc(teamAwards.awardedAt));
  }

  async createTeamAward(award: InsertTeamAward): Promise<TeamAward> {
    const [newAward] = await db.insert(teamAwards).values(award).returning();
    return newAward;
  }

  async updateTeamAward(id: string, award: Partial<InsertTeamAward>): Promise<TeamAward | undefined> {
    const [updated] = await db.update(teamAwards).set(award).where(eq(teamAwards.id, id)).returning();
    return updated;
  }

  async deleteTeamAward(id: string): Promise<boolean> {
    await db.delete(teamAwards).where(eq(teamAwards.id, id));
    return true;
  }

  // Shot Stats (for heatmap)
  async getUserShotStats(userId: string): Promise<Array<{ location: string; made: number; missed: number }>> {
    const logs = await db
      .select({
        location: trainingLogs.shotLocation,
        made: sql<number>`COALESCE(SUM(${trainingLogs.shotsMade}), 0)::int`,
        attempted: sql<number>`COALESCE(SUM(${trainingLogs.shotsAttempted}), 0)::int`
      })
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        sql`${trainingLogs.shotLocation} IS NOT NULL`
      ))
      .groupBy(trainingLogs.shotLocation);
    
    return logs
      .filter(l => l.location)
      .map(l => ({
        location: l.location!,
        made: l.made,
        missed: l.attempted - l.made
      }));
  }

  // Seasons
  async getUserSeasons(userId: string): Promise<Season[]> {
    return await db.select().from(seasons).where(eq(seasons.userId, userId)).orderBy(desc(seasons.createdAt));
  }

  async getSeasonWithGames(seasonId: string): Promise<{ season: Season; games: Game[] } | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));
    if (!season) return undefined;
    const seasonGames = await db.select().from(games).where(eq(games.seasonId, seasonId)).orderBy(desc(games.gameDate));
    return { season, games: seasonGames };
  }

  async createSeason(season: InsertSeason): Promise<Season> {
    const [newSeason] = await db.insert(seasons).values(season).returning();
    return newSeason;
  }

  async updateSeason(id: string, season: Partial<InsertSeason>): Promise<Season | undefined> {
    const [updated] = await db.update(seasons).set({ ...season, updatedAt: new Date() }).where(eq(seasons.id, id)).returning();
    return updated;
  }

  async deleteSeason(id: string): Promise<boolean> {
    await db.delete(games).where(eq(games.seasonId, id));
    await db.delete(seasons).where(eq(seasons.id, id));
    return true;
  }

  // Games
  async getSeasonGames(seasonId: string): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.seasonId, seasonId)).orderBy(desc(games.gameDate));
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined> {
    const [updated] = await db.update(games).set({ ...game, updatedAt: new Date() }).where(eq(games.id, id)).returning();
    return updated;
  }

  async deleteGame(id: string): Promise<boolean> {
    await db.delete(games).where(eq(games.id, id));
    return true;
  }

  // Career Stats
  async getCareerStats(userId: string): Promise<{
    totalGames: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
    wins: number;
    losses: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
    seasonBreakdown: Array<{
      seasonId: string;
      seasonName: string;
      seasonType: string;
      year: string;
      gamesPlayed: number;
      avgPoints: number;
      avgRebounds: number;
      avgAssists: number;
      avgSteals: number;
      avgBlocks: number;
      totalPoints: number;
      totalRebounds: number;
      totalAssists: number;
      totalSteals: number;
      totalBlocks: number;
      wins: number;
      losses: number;
    }>;
  }> {
    const userSeasons = await this.getUserSeasons(userId);
    
    let totalGames = 0;
    let totalPoints = 0;
    let totalRebounds = 0;
    let totalAssists = 0;
    let totalSteals = 0;
    let totalBlocks = 0;
    let totalWins = 0;
    let totalLosses = 0;
    
    const seasonBreakdown = [];
    
    for (const season of userSeasons) {
      const seasonGames = await this.getSeasonGames(season.id);
      const gamesPlayed = seasonGames.length;
      
      if (gamesPlayed === 0) continue;
      
      const seasonPoints = seasonGames.reduce((sum, g) => sum + (g.points || 0), 0);
      const seasonRebounds = seasonGames.reduce((sum, g) => sum + (g.rebounds || 0), 0);
      const seasonAssists = seasonGames.reduce((sum, g) => sum + (g.assists || 0), 0);
      const seasonSteals = seasonGames.reduce((sum, g) => sum + (g.steals || 0), 0);
      const seasonBlocks = seasonGames.reduce((sum, g) => sum + (g.blocks || 0), 0);
      const seasonWins = seasonGames.filter(g => g.result === "W").length;
      const seasonLosses = seasonGames.filter(g => g.result === "L").length;
      
      totalGames += gamesPlayed;
      totalPoints += seasonPoints;
      totalRebounds += seasonRebounds;
      totalAssists += seasonAssists;
      totalSteals += seasonSteals;
      totalBlocks += seasonBlocks;
      totalWins += seasonWins;
      totalLosses += seasonLosses;
      
      seasonBreakdown.push({
        seasonId: season.id,
        seasonName: season.name,
        seasonType: season.seasonType,
        year: season.year,
        gamesPlayed,
        avgPoints: Math.round((seasonPoints / gamesPlayed) * 10) / 10,
        avgRebounds: Math.round((seasonRebounds / gamesPlayed) * 10) / 10,
        avgAssists: Math.round((seasonAssists / gamesPlayed) * 10) / 10,
        avgSteals: Math.round((seasonSteals / gamesPlayed) * 10) / 10,
        avgBlocks: Math.round((seasonBlocks / gamesPlayed) * 10) / 10,
        totalPoints: seasonPoints,
        totalRebounds: seasonRebounds,
        totalAssists: seasonAssists,
        totalSteals: seasonSteals,
        totalBlocks: seasonBlocks,
        wins: seasonWins,
        losses: seasonLosses
      });
    }
    
    return {
      totalGames,
      totalPoints,
      totalRebounds,
      totalAssists,
      totalSteals,
      totalBlocks,
      wins: totalWins,
      losses: totalLosses,
      avgPoints: totalGames > 0 ? Math.round((totalPoints / totalGames) * 10) / 10 : 0,
      avgRebounds: totalGames > 0 ? Math.round((totalRebounds / totalGames) * 10) / 10 : 0,
      avgAssists: totalGames > 0 ? Math.round((totalAssists / totalGames) * 10) / 10 : 0,
      avgSteals: totalGames > 0 ? Math.round((totalSteals / totalGames) * 10) / 10 : 0,
      avgBlocks: totalGames > 0 ? Math.round((totalBlocks / totalGames) * 10) / 10 : 0,
      seasonBreakdown
    };
  }
  // Drill Ratings
  async getDrillRatings(drillId: string): Promise<{ averageRating: number; totalRatings: number }> {
    const result = await db.select({
      avg: sql<number>`COALESCE(AVG(${drillRatings.rating}), 0)`,
      count: sql<number>`COUNT(*)::int`
    }).from(drillRatings).where(eq(drillRatings.drillId, drillId));
    return {
      averageRating: Math.round((result[0]?.avg || 0) * 10) / 10,
      totalRatings: result[0]?.count || 0
    };
  }

  async getUserDrillRating(drillId: string, userId: string): Promise<number | null> {
    const [rating] = await db.select().from(drillRatings)
      .where(and(eq(drillRatings.drillId, drillId), eq(drillRatings.userId, userId)));
    return rating?.rating ?? null;
  }

  async rateDrill(drillId: string, userId: string, rating: number): Promise<DrillRating> {
    const existing = await db.select().from(drillRatings)
      .where(and(eq(drillRatings.drillId, drillId), eq(drillRatings.userId, userId)));
    if (existing.length > 0) {
      const [updated] = await db.update(drillRatings)
        .set({ rating, updatedAt: new Date() })
        .where(eq(drillRatings.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(drillRatings)
      .values({ drillId, userId, rating })
      .returning();
    return created;
  }

  async getDrillRatingsBatch(drillIds: string[]): Promise<Record<string, { averageRating: number; totalRatings: number }>> {
    if (drillIds.length === 0) return {};
    const results = await db.select({
      drillId: drillRatings.drillId,
      avg: sql<number>`COALESCE(AVG(${drillRatings.rating}), 0)`,
      count: sql<number>`COUNT(*)::int`
    }).from(drillRatings)
      .where(sql`${drillRatings.drillId} IN (${sql.join(drillIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(drillRatings.drillId);
    const map: Record<string, { averageRating: number; totalRatings: number }> = {};
    for (const r of results) {
      map[r.drillId] = {
        averageRating: Math.round((r.avg || 0) * 10) / 10,
        totalRatings: r.count || 0
      };
    }
    return map;
  }
}

export const storage = new DatabaseStorage();
