import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertTrainingLogSchema, insertUserVideoSchema, insertUserProfileSchema, insertDrillSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // ===== DRILLS =====
  
  // Get all drills
  app.get("/api/drills", async (req, res) => {
    try {
      const drills = await storage.getDrills();
      res.json(drills);
    } catch (error) {
      console.error("Error fetching drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Get featured drills
  app.get("/api/drills/featured", async (req, res) => {
    try {
      const drills = await storage.getFeaturedDrills();
      res.json(drills);
    } catch (error) {
      console.error("Error fetching featured drills:", error);
      res.status(500).json({ message: "Failed to fetch featured drills" });
    }
  });

  // Get single drill
  app.get("/api/drills/:id", async (req, res) => {
    try {
      const drill = await storage.getDrillById(req.params.id);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      res.json(drill);
    } catch (error) {
      console.error("Error fetching drill:", error);
      res.status(500).json({ message: "Failed to fetch drill" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const admin = await storage.isUserAdmin(userId);
    if (!admin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Check if current user is admin
  app.get("/api/admin/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isAdmin = await storage.isUserAdmin(userId);
      res.json({ isAdmin });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  // Create drill (admin only)
  app.post("/api/drills", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertDrillSchema.parse(req.body);
      const drill = await storage.createDrill(data);
      res.status(201).json(drill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating drill:", error);
      res.status(500).json({ message: "Failed to create drill" });
    }
  });

  // Update drill (admin only)
  app.put("/api/drills/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertDrillSchema.partial().parse(req.body);
      const drill = await storage.updateDrill(req.params.id, data);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      res.json(drill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating drill:", error);
      res.status(500).json({ message: "Failed to update drill" });
    }
  });

  // Delete drill (admin only)
  app.delete("/api/drills/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteDrill(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting drill:", error);
      res.status(500).json({ message: "Failed to delete drill" });
    }
  });

  // ===== USER MANAGEMENT (Admin only) =====

  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user admin status (admin only)
  app.put("/api/admin/users/:id/admin", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { isAdmin: newAdminStatus } = req.body;
      if (typeof newAdminStatus !== 'boolean') {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }
      await storage.setUserAdmin(req.params.id, newAdminStatus);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // ===== TRAINING LOGS =====

  // Get user's training logs
  app.get("/api/training-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getTrainingLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching training logs:", error);
      res.status(500).json({ message: "Failed to fetch training logs" });
    }
  });

  // Get recent training logs
  app.get("/api/training-logs/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getRecentTrainingLogs(userId, 10);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching recent logs:", error);
      res.status(500).json({ message: "Failed to fetch recent logs" });
    }
  });

  // Create training log
  app.post("/api/training-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTrainingLogSchema.parse({ ...req.body, userId });
      const log = await storage.createTrainingLog(data);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training log:", error);
      res.status(500).json({ message: "Failed to create training log" });
    }
  });

  // ===== USER PROFILE =====

  // Get user profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.json(null);
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertUserProfileSchema.parse({ ...req.body, userId });
      const profile = await storage.upsertUserProfile(data);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== USER VIDEOS =====

  // Get user's videos
  app.get("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videos = await storage.getUserVideos(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Create video
  app.post("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertUserVideoSchema.parse({ ...req.body, userId });
      const video = await storage.createUserVideo(data);
      res.status(201).json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  // Delete video
  app.delete("/api/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteUserVideo(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // ===== PROGRESS =====

  // Get user's drill progress
  app.get("/api/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getDrillProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // ===== STATS =====

  // Get overview stats
  app.get("/api/stats/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get weekly stats
  app.get("/api/stats/weekly", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getWeeklyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  // Get category stats
  app.get("/api/stats/by-category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getCategoryStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching category stats:", error);
      res.status(500).json({ message: "Failed to fetch category stats" });
    }
  });

  // ===== BENCHMARKS =====

  // Get benchmarks
  app.get("/api/benchmarks", async (req, res) => {
    try {
      const benchmarks = await storage.getBenchmarks();
      res.json(benchmarks);
    } catch (error) {
      console.error("Error fetching benchmarks:", error);
      res.status(500).json({ message: "Failed to fetch benchmarks" });
    }
  });

  return httpServer;
}
