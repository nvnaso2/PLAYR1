import { 
  drills, type Drill, type InsertDrill,
  trainingLogs, type TrainingLog, type InsertTrainingLog,
  userProfiles, type UserProfile, type InsertUserProfile,
  userVideos, type UserVideo, type InsertUserVideo,
  drillProgress, type DrillProgress, type InsertDrillProgress,
  benchmarks, type Benchmark
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte } from "drizzle-orm";

export interface IStorage {
  // Drills
  getDrills(): Promise<Drill[]>;
  getDrillById(id: string): Promise<Drill | undefined>;
  getFeaturedDrills(): Promise<Drill[]>;
  getDrillsByCategory(category: string): Promise<Drill[]>;
  createDrill(drill: InsertDrill): Promise<Drill>;

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

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill).returning();
    return newDrill;
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
      .values(profile)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profile,
          updatedAt: new Date()
        }
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

    const drillIds = [...new Set(logs.map(l => l.drillId))];
    
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
}

export const storage = new DatabaseStorage();
