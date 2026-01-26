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
  metricTemplates, type MetricTemplate, type InsertMetricTemplate
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, sql, gte } from "drizzle-orm";

export interface IStorage {
  // Drills
  getDrills(): Promise<Drill[]>;
  getDrillById(id: string): Promise<Drill | undefined>;
  getFeaturedDrills(): Promise<Drill[]>;
  getDrillsByCategory(category: string): Promise<Drill[]>;
  getDrillsForUser(userId: string): Promise<Drill[]>; // Admin drills + user's own drills
  getUserDrills(userId: string): Promise<Drill[]>; // Only user's own drills
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
  createTrainingLog(log: InsertTrainingLog): Promise<TrainingLog>;

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
  getUserStats(userId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }>;
  getWeeklyStats(userId: string): Promise<{ date: string; minutes: number; sessions: number }[]>;
  getCategoryStats(userId: string): Promise<{ category: string; minutes: number; sessions: number }[]>;

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

  async createTrainingLog(log: InsertTrainingLog): Promise<TrainingLog> {
    const [newLog] = await db.insert(trainingLogs).values(log).returning();
    
    // Update drill progress
    if (log.drillId) {
      await this.updateDrillProgress(log.userId, log.drillId, log.duration, log.score ?? undefined);
    }
    
    return newLog;
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

  // Stats
  async getUserStats(userId: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }> {
    const logs = await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId));

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

  async getWeeklyStats(userId: string): Promise<{ date: string; minutes: number; sessions: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, sevenDaysAgo)
      ));

    const dailyStats: Record<string, { minutes: number; sessions: number }> = {};
    
    // Initialize all 7 days
    for (let i = 0; i < 7; i++) {
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

  async getCategoryStats(userId: string): Promise<{ category: string; minutes: number; sessions: number }[]> {
    const logs = await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId));

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
}

export const storage = new DatabaseStorage();
