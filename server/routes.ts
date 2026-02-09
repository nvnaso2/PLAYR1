import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { insertTrainingLogSchema, insertUserVideoSchema, insertUserProfileSchema, insertDrillSchema, insertDrillMetricSchema, insertVideoLibrarySchema, insertPdfLibrarySchema, insertMetricTemplateSchema, insertCareerProfileSchema, insertChallengeSchema, insertTeamAwardSchema, insertSeasonSchema, insertGameSchema, insertPlayerProfileSchema, insertTrainerTeamSchema, insertDrillAssignmentSchema, insertTeamClubSchema, insertLeagueSchema, games } from "@shared/schema";
import { users } from "@shared/models/auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Setup object storage for file uploads
  registerObjectStorageRoutes(app);

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

  // Get user's drills with personal bests (MUST be before :id route)
  app.get("/api/drills/my-drills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 4;
      const drillsWithBests = await storage.getUserDrillsWithPersonalBests(userId, limit);
      res.json(drillsWithBests);
    } catch (error) {
      console.error("Error fetching user drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Get community drills (shared by other users)
  app.get("/api/drills/community", async (req, res) => {
    try {
      const drills = await storage.getCommunityDrills();
      res.json(drills);
    } catch (error) {
      console.error("Error fetching community drills:", error);
      res.status(500).json({ message: "Failed to fetch community drills" });
    }
  });

  // Toggle drill sharing with community
  app.put("/api/drills/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      if (drill.userId !== userId) {
        return res.status(403).json({ message: "You can only share your own drills" });
      }
      const shareSchema = z.object({ isShared: z.boolean() });
      const parsed = shareSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "isShared must be a boolean" });
      }
      const updated = await storage.toggleDrillSharing(req.params.id, parsed.data.isShared);
      res.json(updated);
    } catch (error) {
      console.error("Error toggling drill sharing:", error);
      res.status(500).json({ message: "Failed to update sharing" });
    }
  });

  // Get drill ratings (batch for all drills)
  app.get("/api/drill-ratings", async (req, res) => {
    try {
      const drillIds = req.query.drillIds as string;
      if (!drillIds) {
        return res.json({});
      }
      const ids = drillIds.split(",").filter(Boolean);
      const ratings = await storage.getDrillRatingsBatch(ids);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching drill ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // Get single drill rating (public + user's own rating if authenticated)
  app.get("/api/drills/:id/rating", async (req: any, res) => {
    try {
      const stats = await storage.getDrillRatings(req.params.id);
      let userRating: number | null = null;
      if (req.isAuthenticated?.() && req.user?.claims?.sub) {
        userRating = await storage.getUserDrillRating(req.params.id, req.user.claims.sub);
      }
      res.json({ userRating, ...stats });
    } catch (error) {
      console.error("Error fetching drill rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  // Rate a drill
  app.post("/api/drills/:id/rating", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });
      const parsed = ratingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      }
      await storage.rateDrill(req.params.id, userId, parsed.data.rating);
      const stats = await storage.getDrillRatings(req.params.id);
      res.json({ userRating: parsed.data.rating, ...stats });
    } catch (error) {
      console.error("Error rating drill:", error);
      res.status(500).json({ message: "Failed to rate drill" });
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
      
      // Sync bidirectional PDF library link
      if (data.pdfLibraryId) {
        await storage.updatePdfLibraryItem(data.pdfLibraryId, { drillId: drill.id });
      }
      
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
      
      // Get old drill to check for PDF library changes
      const oldDrill = await storage.getDrillById(req.params.id);
      
      const drill = await storage.updateDrill(req.params.id, data);
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      
      // Sync bidirectional PDF library link
      if (data.pdfLibraryId !== undefined) {
        // Clear old PDF link if it changed
        if (oldDrill?.pdfLibraryId && oldDrill.pdfLibraryId !== data.pdfLibraryId) {
          await storage.updatePdfLibraryItem(oldDrill.pdfLibraryId, { drillId: null });
        }
        // Set new PDF link
        if (data.pdfLibraryId) {
          await storage.updatePdfLibraryItem(data.pdfLibraryId, { drillId: drill.id });
        }
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

  // Create new user (admin only)
  const createUserSchema = z.object({
    email: z.string().email("Must be a valid email"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    isAdmin: z.boolean().optional().default(false),
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, firstName, lastName, isAdmin: makeAdmin } = parsed.data;
      const newUser = await storage.createUser({
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        isAdmin: makeAdmin,
      });
      res.status(201).json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.code === '23505') {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // ===== VIDEO LIBRARY (Admin only) =====

  // Get all videos in library (admin only)
  app.get("/api/video-library", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const videos = await storage.getVideoLibrary();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching video library:", error);
      res.status(500).json({ message: "Failed to fetch video library" });
    }
  });

  // Get single video from library (admin only)
  app.get("/api/video-library/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const video = await storage.getVideoLibraryById(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  // Create video in library (admin only)
  app.post("/api/video-library", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertVideoLibrarySchema.parse(req.body);
      const video = await storage.createVideoLibraryItem(data);
      res.status(201).json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  // Update video in library (admin only)
  app.put("/api/video-library/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertVideoLibrarySchema.partial().parse(req.body);
      const video = await storage.updateVideoLibraryItem(req.params.id, data);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating video:", error);
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  // Delete video from library (admin only)
  app.delete("/api/video-library/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteVideoLibraryItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // ===== PDF LIBRARY (Admin only) =====

  // Get all PDFs in library (admin only)
  app.get("/api/pdf-library", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pdfs = await storage.getPdfLibrary();
      res.json(pdfs);
    } catch (error) {
      console.error("Error fetching PDF library:", error);
      res.status(500).json({ message: "Failed to fetch PDF library" });
    }
  });

  // Get single PDF (admin only)
  app.get("/api/pdf-library/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pdf = await storage.getPdfLibraryById(req.params.id);
      if (!pdf) {
        return res.status(404).json({ message: "PDF not found" });
      }
      res.json(pdf);
    } catch (error) {
      console.error("Error fetching PDF:", error);
      res.status(500).json({ message: "Failed to fetch PDF" });
    }
  });

  // Create PDF in library (admin only)
  app.post("/api/pdf-library", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertPdfLibrarySchema.parse(req.body);
      const pdf = await storage.createPdfLibraryItem(data);
      
      // Sync bidirectional drill link
      if (data.drillId) {
        await storage.updateDrill(data.drillId, { 
          pdfLibraryId: pdf.id, 
          pdfUrl: pdf.pdfUrl 
        });
      }
      
      res.status(201).json(pdf);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating PDF:", error);
      res.status(500).json({ message: "Failed to create PDF" });
    }
  });

  // Update PDF in library (admin only)
  app.put("/api/pdf-library/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertPdfLibrarySchema.partial().parse(req.body);
      
      // Get old PDF to check for drill changes
      const oldPdf = await storage.getPdfLibraryById(req.params.id);
      
      const pdf = await storage.updatePdfLibraryItem(req.params.id, data);
      if (!pdf) {
        return res.status(404).json({ message: "PDF not found" });
      }
      
      // Sync bidirectional drill link
      if (data.drillId !== undefined) {
        // Clear old drill link if it changed
        if (oldPdf?.drillId && oldPdf.drillId !== data.drillId) {
          await storage.updateDrill(oldPdf.drillId, { pdfLibraryId: null, pdfUrl: null });
        }
        // Set new drill link
        if (data.drillId) {
          await storage.updateDrill(data.drillId, { 
            pdfLibraryId: pdf.id, 
            pdfUrl: pdf.pdfUrl 
          });
        }
      }
      
      res.json(pdf);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating PDF:", error);
      res.status(500).json({ message: "Failed to update PDF" });
    }
  });

  // Delete PDF from library (admin only)
  app.delete("/api/pdf-library/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deletePdfLibraryItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PDF:", error);
      res.status(500).json({ message: "Failed to delete PDF" });
    }
  });

  // ===== METRIC TEMPLATES =====

  // Get all metric templates (accessible to all authenticated users for drill configuration)
  app.get("/api/metric-templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getMetricTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching metric templates:", error);
      res.status(500).json({ message: "Failed to fetch metric templates" });
    }
  });

  // Get single metric template (admin only)
  app.get("/api/metric-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const template = await storage.getMetricTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Metric template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching metric template:", error);
      res.status(500).json({ message: "Failed to fetch metric template" });
    }
  });

  // Create metric template (admin only)
  app.post("/api/metric-templates", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertMetricTemplateSchema.parse(req.body);
      const template = await storage.createMetricTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating metric template:", error);
      res.status(500).json({ message: "Failed to create metric template" });
    }
  });

  // Update metric template (admin only)
  app.put("/api/metric-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertMetricTemplateSchema.partial().parse(req.body);
      const template = await storage.updateMetricTemplate(req.params.id, data);
      if (!template) {
        return res.status(404).json({ message: "Metric template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating metric template:", error);
      res.status(500).json({ message: "Failed to update metric template" });
    }
  });

  // Delete metric template (admin only)
  app.delete("/api/metric-templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteMetricTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting metric template:", error);
      res.status(500).json({ message: "Failed to delete metric template" });
    }
  });

  // Set drill metrics (link metric templates to a drill)
  // Allowed for admins OR the drill owner
  app.post("/api/drills/:id/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      
      if (!drill) {
        return res.status(404).json({ message: "Drill not found" });
      }
      
      // Check if user is admin or drill owner
      const isAdmin = await storage.isUserAdmin(userId);
      const isOwner = drill.userId === userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized to modify this drill" });
      }
      
      const { metricTemplateIds } = req.body;
      if (!Array.isArray(metricTemplateIds)) {
        return res.status(400).json({ message: "metricTemplateIds must be an array" });
      }
      const metrics = await storage.setDrillMetrics(req.params.id, metricTemplateIds);
      res.json(metrics);
    } catch (error) {
      console.error("Error setting drill metrics:", error);
      res.status(500).json({ message: "Failed to set drill metrics" });
    }
  });

  // Get drill metrics with templates
  app.get("/api/drills/:id/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDrillMetricsWithTemplates(req.params.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching drill metrics:", error);
      res.status(500).json({ message: "Failed to fetch drill metrics" });
    }
  });

  // ===== USER DRILLS =====

  // Get all drills available to user (admin drills + user's own)
  app.get("/api/user/drills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drillList = await storage.getDrillsForUser(userId);
      res.json(drillList);
    } catch (error) {
      console.error("Error fetching user drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Get only user's own created drills
  app.get("/api/user/my-drills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drillList = await storage.getUserDrills(userId);
      res.json(drillList);
    } catch (error) {
      console.error("Error fetching user's drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  // Create user's own drill
  app.post("/api/user/drills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertDrillSchema.parse({
        ...req.body,
        userId, // Set the user as the owner
        isFeatured: false, // User drills can't be featured
      });
      const drill = await storage.createDrill(data);
      res.status(201).json(drill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating user drill:", error);
      res.status(500).json({ message: "Failed to create drill" });
    }
  });

  // Update user's own drill
  app.put("/api/user/drills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      
      // Only allow updating user's own drills
      if (!drill || drill.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this drill" });
      }
      
      // Parse and strip restricted fields - users cannot modify userId or isFeatured
      const rawData = insertDrillSchema.partial().parse(req.body);
      const { userId: _, isFeatured: __, ...safeData } = rawData;
      
      const updated = await storage.updateDrill(req.params.id, safeData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating user drill:", error);
      res.status(500).json({ message: "Failed to update drill" });
    }
  });

  // Delete user's own drill
  app.delete("/api/user/drills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      
      // Only allow deleting user's own drills
      if (!drill || drill.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this drill" });
      }
      
      await storage.deleteDrill(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user drill:", error);
      res.status(500).json({ message: "Failed to delete drill" });
    }
  });

  // ===== WORKOUTS =====

  // Get Handlz (admin) workouts
  app.get("/api/workouts/handlz", async (req, res) => {
    try {
      const workouts = await storage.getHandlzWorkouts();
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching Handlz workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  // Get user's personal workouts
  app.get("/api/workouts/personal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workouts = await storage.getUserWorkouts(userId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching user workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  // Get single workout with drills
  app.get("/api/workouts/:id", async (req, res) => {
    try {
      const result = await storage.getWorkoutWithDrills(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Workout not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching workout:", error);
      res.status(500).json({ message: "Failed to fetch workout" });
    }
  });

  // Create workout (users can create their own workouts)
  app.post("/api/workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description, category, estimatedDuration, drillIds } = req.body;
      
      if (!name || !drillIds || !Array.isArray(drillIds) || drillIds.length < 2) {
        return res.status(400).json({ message: "Workout must have a name and at least 2 drills" });
      }
      
      const workout = await storage.createWorkout(
        { name, description, category, estimatedDuration, userId },
        drillIds
      );
      res.status(201).json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  // Create Handlz workout (admin only)
  app.post("/api/workouts/handlz", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { name, description, category, estimatedDuration, drillIds } = req.body;
      
      if (!name || !drillIds || !Array.isArray(drillIds) || drillIds.length < 1) {
        return res.status(400).json({ message: "Workout must have a name and at least 1 drill" });
      }
      
      const workout = await storage.createWorkout(
        { name, description, category, estimatedDuration, userId: null },
        drillIds
      );
      res.status(201).json(workout);
    } catch (error) {
      console.error("Error creating Handlz workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  // Update workout
  app.put("/api/workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workout = await storage.getWorkoutById(req.params.id);
      
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Check ownership or admin status
      const isAdminUser = await storage.isUserAdmin(userId);
      if (workout.userId !== userId && !isAdminUser) {
        return res.status(403).json({ message: "Not authorized to update this workout" });
      }
      
      const { name, description, category, estimatedDuration, drillIds } = req.body;
      const updated = await storage.updateWorkout(
        req.params.id,
        { name, description, category, estimatedDuration },
        drillIds
      );
      res.json(updated);
    } catch (error) {
      console.error("Error updating workout:", error);
      res.status(500).json({ message: "Failed to update workout" });
    }
  });

  // Delete workout
  app.delete("/api/workouts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workout = await storage.getWorkoutById(req.params.id);
      
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Check ownership or admin status
      const isAdminUser = await storage.isUserAdmin(userId);
      if (workout.userId !== userId && !isAdminUser) {
        return res.status(403).json({ message: "Not authorized to delete this workout" });
      }
      
      await storage.deleteWorkout(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });

  // ===== TRAINING LOGS =====

  // Get user's training logs with metrics
  app.get("/api/training-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getTrainingLogs(userId);
      // Fetch metrics for each log
      const logsWithMetrics = await Promise.all(
        logs.map(async (log) => {
          const metrics = await storage.getTrainingLogMetrics(log.id);
          return { ...log, metrics };
        })
      );
      res.json(logsWithMetrics);
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
      
      const prMetrics: { metricName: string; value: number }[] = [];
      if (log.score && log.score > 0) prMetrics.push({ metricName: "Score", value: log.score });
      if (log.shotsMade && log.shotsMade > 0) prMetrics.push({ metricName: "Shots Made", value: log.shotsMade });
      if (log.duration && log.duration > 0) prMetrics.push({ metricName: "Duration (min)", value: log.duration });
      if (log.reps && log.reps > 0) prMetrics.push({ metricName: "Reps", value: log.reps });
      if (log.shotsAttempted && log.shotsMade && log.shotsAttempted > 0) {
        const pct = Math.round((log.shotsMade / log.shotsAttempted) * 100);
        if (pct > 0) prMetrics.push({ metricName: "Shooting %", value: pct });
      }
      if (prMetrics.length > 0) {
        try { await storage.checkAndCreateDrillPRs(userId, log.drillId, log.id, prMetrics); } catch (e) { console.error("PR check error:", e); }
      }
      
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training log:", error);
      res.status(500).json({ message: "Failed to create training log" });
    }
  });

  // Get single training log with metrics
  app.get("/api/training-logs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const log = await storage.getTrainingLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Training log not found" });
      }
      if (log.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const metrics = await storage.getTrainingLogMetrics(req.params.id);
      res.json({ ...log, metrics });
    } catch (error) {
      console.error("Error fetching training log:", error);
      res.status(500).json({ message: "Failed to fetch training log" });
    }
  });

  // Update training log
  app.put("/api/training-logs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const log = await storage.getTrainingLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Training log not found" });
      }
      if (log.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { duration, score, notes, reps, sets, metrics, shotLocation, shotsAttempted, shotsMade } = req.body;
      const updated = await storage.updateTrainingLog(req.params.id, { duration, score, notes, reps, sets, shotLocation, shotsAttempted, shotsMade });
      if (metrics && Array.isArray(metrics)) {
        await storage.saveTrainingLogMetrics(req.params.id, metrics);
      }
      
      const prMetrics: { metricName: string; value: number }[] = [];
      const s = updated || log;
      if (s.score && s.score > 0) prMetrics.push({ metricName: "Score", value: s.score });
      if (s.shotsMade && s.shotsMade > 0) prMetrics.push({ metricName: "Shots Made", value: s.shotsMade });
      if (s.duration && s.duration > 0) prMetrics.push({ metricName: "Duration (min)", value: s.duration });
      if (s.reps && s.reps > 0) prMetrics.push({ metricName: "Reps", value: s.reps });
      if (s.shotsAttempted && s.shotsMade && s.shotsAttempted > 0) {
        const pct = Math.round((s.shotsMade / s.shotsAttempted) * 100);
        if (pct > 0) prMetrics.push({ metricName: "Shooting %", value: pct });
      }
      if (prMetrics.length > 0) {
        try { await storage.checkAndCreateDrillPRs(userId, log.drillId, req.params.id, prMetrics); } catch (e) { console.error("PR check error:", e); }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating training log:", error);
      res.status(500).json({ message: "Failed to update training log" });
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
      const period = (req.query.period as string) || "weekly";
      const stats = await storage.getUserStats(userId, period);
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
      const period = (req.query.period as string) || "weekly";
      const stats = await storage.getWeeklyStats(userId, period);
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
      const period = (req.query.period as string) || "weekly";
      const stats = await storage.getCategoryStats(userId, period);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching category stats:", error);
      res.status(500).json({ message: "Failed to fetch category stats" });
    }
  });

  app.get("/api/stats/dashboard-training", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const period = (req.query.period as string) || "weekly";
      const stats = await storage.getDashboardTrainingStats(userId, period);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard training stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard training stats" });
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

  // Note: Drill metrics routes are defined earlier in this file (line ~465-495)

  // Update drill metric (admin only)
  app.put("/api/drill-metrics/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const data = insertDrillMetricSchema.partial().parse(req.body);
      const metric = await storage.updateDrillMetric(req.params.id, data);
      if (!metric) {
        return res.status(404).json({ message: "Metric not found" });
      }
      res.json(metric);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating drill metric:", error);
      res.status(500).json({ message: "Failed to update drill metric" });
    }
  });

  // Delete drill metric (admin only)
  app.delete("/api/drill-metrics/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteDrillMetric(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting drill metric:", error);
      res.status(500).json({ message: "Failed to delete drill metric" });
    }
  });

  // ===== TRAINING LOG METRICS =====

  // Get metrics for a training log
  app.get("/api/training-logs/:id/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const metrics = await storage.getTrainingLogMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching training log metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Save metrics for a training log
  app.post("/api/training-logs/:id/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { metrics } = req.body;
      if (!Array.isArray(metrics)) {
        return res.status(400).json({ message: "metrics must be an array" });
      }
      const saved = await storage.saveTrainingLogMetrics(req.params.id, metrics);
      
      const log = await storage.getTrainingLog(req.params.id);
      if (log && log.userId === userId) {
        const templates = await storage.getMetricTemplates();
        const prMetrics: { metricName: string; value: number }[] = [];
        for (const m of saved) {
          if (m.value !== null && Number(m.value) > 0) {
            const template = templates.find(t => t.id === m.metricId);
            const name = template?.name || m.metricId;
            prMetrics.push({ metricName: name, value: Number(m.value) });
          }
        }
        if (prMetrics.length > 0) {
          try { await storage.checkAndCreateDrillPRs(userId, log.drillId, req.params.id, prMetrics); } catch (e) { console.error("Metric PR check error:", e); }
        }
      }
      
      res.json(saved);
    } catch (error) {
      console.error("Error saving training log metrics:", error);
      res.status(500).json({ message: "Failed to save metrics" });
    }
  });

  // ===== MY CAREER =====

  // Get career profile for current user
  app.get("/api/career", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getCareerProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching career profile:", error);
      res.status(500).json({ message: "Failed to fetch career profile" });
    }
  });

  // Create career profile (onboarding)
  app.post("/api/career", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if profile already exists
      const existing = await storage.getCareerProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Career profile already exists" });
      }
      
      const data = insertCareerProfileSchema.parse({ ...req.body, userId });
      const profile = await storage.createCareerProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating career profile:", error);
      res.status(500).json({ message: "Failed to create career profile" });
    }
  });

  // Update career profile
  app.put("/api/career", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Whitelist allowed fields - exclude userId, level, xp, totalXp to prevent manipulation
      const allowedFields = [
        'birthMonth', 'birthYear', 'gradeLevel', 'teamName', 'schoolName',
        'positions', 'jerseyNumber', 'aspiration', 'focusSkill',
        'skillBallHandling', 'skillShooting', 'skillPassing', 'skillFinishing',
        'skillDefense', 'skillBasketballIQ', 'skillAthletics',
        'avatarSkinTone', 'avatarHairStyle', 'avatarHairColor', 'avatarAccessory',
        'cardPhotoUrl',
        'trophyRoomOrder',
        'onboardingCompleted'
      ];
      
      const filteredBody: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filteredBody[key] = req.body[key];
        }
      }
      
      const data = insertCareerProfileSchema.partial().parse(filteredBody);
      const profile = await storage.updateCareerProfile(userId, data);
      if (!profile) {
        return res.status(404).json({ message: "Career profile not found" });
      }
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating career profile:", error);
      res.status(500).json({ message: "Failed to update career profile" });
    }
  });

  // Complete onboarding
  app.post("/api/career/complete-onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.updateCareerProfile(userId, { onboardingCompleted: true });
      if (!profile) {
        return res.status(404).json({ message: "Career profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // ===== ACHIEVEMENTS =====

  // Get all available achievements
  app.get("/api/achievements", isAuthenticated, async (req: any, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Get user's unlocked achievements
  app.get("/api/achievements/unlocked", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // Check and unlock new achievements
  app.post("/api/achievements/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newAchievements = await storage.checkAndUnlockAchievements(userId);
      res.json(newAchievements);
    } catch (error) {
      console.error("Error checking achievements:", error);
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });

  // Add XP to career (used after training sessions)
  app.post("/api/career/add-xp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { xp } = req.body;
      
      if (typeof xp !== 'number' || xp < 0) {
        return res.status(400).json({ message: "XP must be a positive number" });
      }
      
      const profile = await storage.addXpToCareer(userId, xp);
      if (!profile) {
        return res.status(404).json({ message: "Career profile not found" });
      }
      
      // Check for new achievements
      const newAchievements = await storage.checkAndUnlockAchievements(userId);
      
      res.json({ profile, newAchievements });
    } catch (error) {
      console.error("Error adding XP:", error);
      res.status(500).json({ message: "Failed to add XP" });
    }
  });

  // ===== CHALLENGES =====

  // Get all challenges
  app.get("/api/challenges", isAuthenticated, async (req: any, res) => {
    try {
      const challenges = await storage.getChallenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // Get user's challenges (with progress)
  app.get("/api/challenges/my-challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userChallenges = await storage.getUserChallenges(userId);
      res.json(userChallenges);
    } catch (error) {
      console.error("Error fetching user challenges:", error);
      res.status(500).json({ message: "Failed to fetch user challenges" });
    }
  });

  // Create a new challenge
  app.post("/api/challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertChallengeSchema.parse({
        ...req.body,
        createdBy: userId,
        isAppGenerated: false
      });
      const challenge = await storage.createChallenge(validatedData);
      res.status(201).json(challenge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // Start a challenge
  app.post("/api/challenges/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = req.params.id;
      const userChallenge = await storage.startChallenge(userId, challengeId);
      res.json(userChallenge);
    } catch (error) {
      console.error("Error starting challenge:", error);
      res.status(500).json({ message: "Failed to start challenge" });
    }
  });

  // Update challenge progress
  app.put("/api/challenges/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const { currentValue } = req.body;
      const updated = await storage.updateChallengeProgress(req.params.id, currentValue);
      if (!updated) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Failed to update challenge progress" });
    }
  });

  // Complete a challenge
  app.post("/api/challenges/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const completed = await storage.completeChallenge(req.params.id);
      if (!completed) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      res.json(completed);
    } catch (error) {
      console.error("Error completing challenge:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });

  // Delete a challenge (only owner can delete)
  app.delete("/api/challenges/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challenge = await storage.getChallengeById(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      if (challenge.createdBy !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this challenge" });
      }
      await storage.deleteChallenge(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting challenge:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  // ===== PERSONAL RECORDS =====

  // Get user's personal records
  app.get("/api/personal-records", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getUserPersonalRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching personal records:", error);
      res.status(500).json({ message: "Failed to fetch personal records" });
    }
  });

  // Backfill PRs from existing games and training logs
  app.post("/api/personal-records/backfill", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let created = 0;

      // Backfill from games - process in chronological order
      const allSeasons = await storage.getUserSeasons(userId);
      for (const season of allSeasons) {
        const games = await storage.getSeasonGames(season.id);
        const userGames = games.filter(g => g.userId === userId).sort((a, b) => 
          new Date(a.gameDate || 0).getTime() - new Date(b.gameDate || 0).getTime()
        );
        for (const game of userGames) {
          try {
            const prs = await storage.checkAndCreateGamePRs(userId, game.id, {
              points: game.points ?? 0,
              rebounds: game.rebounds ?? 0,
              assists: game.assists ?? 0,
              steals: game.steals ?? 0,
              blocks: game.blocks ?? 0,
              fgMade: game.fgMade ?? 0,
              threePtMade: game.threePtMade ?? 0,
              ftMade: game.ftMade ?? 0
            });
            created += prs.length;
          } catch (e) { /* skip errors */ }
        }
      }

      // Backfill from training logs - process in chronological order
      const logs = await storage.getTrainingLogs(userId);
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime()
      );
      for (const log of sortedLogs) {
        const prMetrics: { metricName: string; value: number }[] = [];
        if (log.score && log.score > 0) prMetrics.push({ metricName: "Score", value: log.score });
        if (log.shotsMade && log.shotsMade > 0) prMetrics.push({ metricName: "Shots Made", value: log.shotsMade });
        if (log.duration && log.duration > 0) prMetrics.push({ metricName: "Duration (min)", value: log.duration });
        if (log.reps && log.reps > 0) prMetrics.push({ metricName: "Reps", value: log.reps });
        if (log.shotsAttempted && log.shotsMade && log.shotsAttempted > 0) {
          const pct = Math.round((log.shotsMade / log.shotsAttempted) * 100);
          if (pct > 0) prMetrics.push({ metricName: "Shooting %", value: pct });
        }
        if (prMetrics.length > 0) {
          try {
            const prs = await storage.checkAndCreateDrillPRs(userId, log.drillId, log.id, prMetrics);
            created += prs.length;
          } catch (e) { /* skip errors */ }
        }
      }

      res.json({ message: `Backfill complete. Created ${created} PRs.`, created });
    } catch (error) {
      console.error("Error backfilling PRs:", error);
      res.status(500).json({ message: "Failed to backfill PRs" });
    }
  });

  // ===== TEAM AWARDS =====

  // Get user's team awards
  app.get("/api/team-awards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const awards = await storage.getUserTeamAwards(userId);
      res.json(awards);
    } catch (error) {
      console.error("Error fetching team awards:", error);
      res.status(500).json({ message: "Failed to fetch team awards" });
    }
  });

  // Create a team award
  app.post("/api/team-awards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTeamAwardSchema.parse({
        ...req.body,
        userId
      });
      const award = await storage.createTeamAward(validatedData);
      res.status(201).json(award);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating team award:", error);
      res.status(500).json({ message: "Failed to create team award" });
    }
  });

  // Update a team award
  app.put("/api/team-awards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateTeamAward(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Team award not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating team award:", error);
      res.status(500).json({ message: "Failed to update team award" });
    }
  });

  // Delete a team award
  app.delete("/api/team-awards/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTeamAward(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team award:", error);
      res.status(500).json({ message: "Failed to delete team award" });
    }
  });

  // ===== SHOT STATS (for heatmap) =====

  // Get user's shot statistics by location
  app.get("/api/stats/shots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const period = (req.query.period as string) || "weekly";
      const shotStats = await storage.getUserShotStats(userId, period);
      res.json(shotStats);
    } catch (error) {
      console.error("Error fetching shot stats:", error);
      res.status(500).json({ message: "Failed to fetch shot stats" });
    }
  });

  // ===== SEASONS AND GAMES (Baseball Card Stats) =====

  // Get user's seasons
  app.get("/api/seasons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userSeasons = await storage.getUserSeasons(userId);
      res.json(userSeasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ message: "Failed to fetch seasons" });
    }
  });

  // Get a specific season with its games
  app.get("/api/seasons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const season = await storage.getSeasonWithGames(req.params.id);
      if (!season) {
        return res.status(404).json({ message: "Season not found" });
      }
      res.json(season);
    } catch (error) {
      console.error("Error fetching season:", error);
      res.status(500).json({ message: "Failed to fetch season" });
    }
  });

  // Create a season
  app.post("/api/seasons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSeasonSchema.parse({
        ...req.body,
        userId
      });
      const season = await storage.createSeason(validatedData);
      res.status(201).json(season);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating season:", error);
      res.status(500).json({ message: "Failed to create season" });
    }
  });

  // Update a season
  app.put("/api/seasons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateSeason(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Season not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating season:", error);
      res.status(500).json({ message: "Failed to update season" });
    }
  });

  // Delete a season
  app.delete("/api/seasons/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSeason(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting season:", error);
      res.status(500).json({ message: "Failed to delete season" });
    }
  });

  // Get games for a season
  app.get("/api/seasons/:seasonId/games", isAuthenticated, async (req: any, res) => {
    try {
      const seasonGames = await storage.getSeasonGames(req.params.seasonId);
      res.json(seasonGames);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  // Create a game
  app.post("/api/seasons/:seasonId/games", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const gameData = {
        ...req.body,
        seasonId: req.params.seasonId,
        userId,
        gameDate: req.body.gameDate ? new Date(req.body.gameDate + 'T12:00:00Z') : new Date()
      };
      const validatedData = insertGameSchema.parse(gameData);
      const game = await storage.createGame(validatedData);
      
      try {
        await storage.checkAndCreateGamePRs(userId, game.id, {
          points: game.points ?? 0,
          rebounds: game.rebounds ?? 0,
          assists: game.assists ?? 0,
          steals: game.steals ?? 0,
          blocks: game.blocks ?? 0,
          fgMade: game.fgMade ?? 0,
          threePtMade: game.threePtMade ?? 0,
          ftMade: game.ftMade ?? 0
        });
      } catch (e) { console.error("Game PR check error:", e); }
      
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating game:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  // Update a game
  app.put("/api/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const gameData = {
        ...req.body,
        gameDate: req.body.gameDate ? new Date(req.body.gameDate + 'T12:00:00Z') : undefined
      };
      const updated = await storage.updateGame(req.params.id, gameData);
      if (!updated) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      try {
        const userId = req.user.claims.sub;
        await storage.checkAndCreateGamePRs(userId, req.params.id, {
          points: updated.points ?? 0,
          rebounds: updated.rebounds ?? 0,
          assists: updated.assists ?? 0,
          steals: updated.steals ?? 0,
          blocks: updated.blocks ?? 0,
          fgMade: updated.fgMade ?? 0,
          threePtMade: updated.threePtMade ?? 0,
          ftMade: updated.ftMade ?? 0
        });
      } catch (e) { console.error("Game PR check error:", e); }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating game:", error);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  // Delete a game
  app.delete("/api/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteGame(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // Get career stats (aggregate across all seasons)
  app.get("/api/stats/career", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const careerStats = await storage.getCareerStats(userId);
      res.json(careerStats);
    } catch (error) {
      console.error("Error fetching career stats:", error);
      res.status(500).json({ message: "Failed to fetch career stats" });
    }
  });

  // ===== PLAYER PROFILES (PUBLIC) =====

  // Get own player profile
  app.get("/api/player-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getPlayerProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching player profile:", error);
      res.status(500).json({ message: "Failed to fetch player profile" });
    }
  });

  // Upsert player profile
  app.put("/api/player-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      const profile = await storage.upsertPlayerProfile(data);
      res.json(profile);
    } catch (error) {
      console.error("Error updating player profile:", error);
      res.status(500).json({ message: "Failed to update player profile" });
    }
  });

  // Get public player profile by slug (no auth required)
  app.get("/api/player/:slug", async (req, res) => {
    try {
      const profile = await storage.getPlayerProfileBySlug(req.params.slug);
      if (!profile || !profile.isPublic) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      // Get career profile data
      const career = await storage.getCareerProfile(profile.userId);
      const [user] = await db.select({
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, profile.userId));
      
      // Gather public data based on visibility settings
      const publicData: any = {
        profile,
        user: user ? { firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl } : null,
        career: career ? {
          positions: career.positions,
          teamName: career.teamName,
          schoolName: career.schoolName,
          gradeLevel: career.gradeLevel,
          jerseyNumber: career.jerseyNumber,
          aspiration: career.aspiration,
          cardPhotoUrl: career.cardPhotoUrl,
        } : null,
      };

      if (profile.showStats) {
        const publicSeasons = await storage.getPublicUserSeasons(profile.userId);
        const publicSeasonIds = new Set(publicSeasons.map(s => s.id));
        const fullStats = await storage.getCareerStats(profile.userId);
        const filteredBreakdown = fullStats.seasonBreakdown.filter(s => publicSeasonIds.has(s.seasonId));
        
        let totalGames = 0, totalPoints = 0, totalRebounds = 0, totalAssists = 0, totalSteals = 0, totalBlocks = 0, wins = 0, losses = 0;
        for (const s of filteredBreakdown) {
          totalGames += s.gamesPlayed;
          totalPoints += s.totalPoints;
          totalRebounds += s.totalRebounds;
          totalAssists += s.totalAssists;
          totalSteals += s.totalSteals;
          totalBlocks += s.totalBlocks;
          wins += s.wins;
          losses += s.losses;
        }
        
        publicData.careerStats = {
          totalGames,
          avgPoints: totalGames ? Math.round((totalPoints / totalGames) * 10) / 10 : 0,
          avgRebounds: totalGames ? Math.round((totalRebounds / totalGames) * 10) / 10 : 0,
          avgAssists: totalGames ? Math.round((totalAssists / totalGames) * 10) / 10 : 0,
          avgSteals: totalGames ? Math.round((totalSteals / totalGames) * 10) / 10 : 0,
          avgBlocks: totalGames ? Math.round((totalBlocks / totalGames) * 10) / 10 : 0,
          wins,
          losses,
          seasonBreakdown: filteredBreakdown,
        };
      }
      if (profile.showAchievements) {
        publicData.awards = await storage.getUserTeamAwards(profile.userId);
        publicData.personalRecords = await storage.getUserPersonalRecords(profile.userId);
      }
      if (profile.showVideos) {
        const allVideos = await storage.getUserVideos(profile.userId);
        publicData.videos = allVideos.filter(v => v.isPublic);
      }

      res.json(publicData);
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // ===== SHARE TEMPLATES =====
  
  // Generate share card data for social media
  app.get("/api/share/game-stats/:gameId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { gameId } = req.params;
      const platform = (req.query.platform as string) || "instagram";
      
      // Get game data
      const gameData = await db.select().from(games).where(eq(games.id, gameId));
      
      if (!gameData.length || gameData[0].userId !== userId) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      const game = gameData[0];
      const career = await storage.getCareerProfile(userId);
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      const playerProfile = await storage.getPlayerProfile(userId);
      
      const shareData = {
        platform,
        type: "game-stats",
        playerName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Player",
        playerPhoto: career?.cardPhotoUrl || null,
        teamName: career?.teamName || "",
        jerseyNumber: career?.jerseyNumber,
        positions: career?.positions,
        schoolName: career?.schoolName,
        opponent: game.opponent,
        result: game.result,
        teamScore: game.teamScore,
        opponentScore: game.opponentScore,
        gameDate: game.gameDate,
        stats: {
          points: game.points,
          rebounds: game.rebounds,
          assists: game.assists,
          steals: game.steals,
          blocks: game.blocks,
          fgMade: game.fgMade,
          fgAttempted: game.fgAttempted,
          threePtMade: game.threePtMade,
          threePtAttempted: game.threePtAttempted,
          ftMade: game.ftMade,
          ftAttempted: game.ftAttempted,
        },
        profileSlug: playerProfile?.slug || null,
        dimensions: getPlatformDimensions(platform),
      };
      
      res.json(shareData);
    } catch (error) {
      console.error("Error generating share data:", error);
      res.status(500).json({ message: "Failed to generate share data" });
    }
  });

  // ===== TRAINER/COACH =====

  // Get coach's teams
  app.get("/api/coach/teams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getCoachTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching coach teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Create team
  app.post("/api/coach/teams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamCode = generateTeamCode();
      const team = await storage.createTeam({ ...req.body, coachId: userId, teamCode });
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // Update team
  app.put("/api/coach/teams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.id);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await storage.updateTeam(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // Delete team
  app.delete("/api/coach/teams/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.id);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Get team members
  app.get("/api/coach/teams/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.id);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const members = await storage.getTeamMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Remove team member
  app.delete("/api/coach/teams/:teamId/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const coachId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.teamId);
      if (!team || team.coachId !== coachId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.removeTeamMember(req.params.teamId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Join team by code
  app.post("/api/teams/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamCode } = req.body;
      const team = await storage.getTeamByCode(teamCode);
      if (!team) {
        return res.status(404).json({ message: "Team not found. Check the code and try again." });
      }
      // Check if already a member
      const existingTeams = await storage.getUserTeams(userId);
      if (existingTeams.some(t => t.teamId === team.id)) {
        return res.status(400).json({ message: "You're already a member of this team." });
      }
      const member = await storage.addTeamMember({ teamId: team.id, userId, role: "player" });
      res.status(201).json({ member, team });
    } catch (error) {
      console.error("Error joining team:", error);
      res.status(500).json({ message: "Failed to join team" });
    }
  });

  // Get user's teams (as a player)
  app.get("/api/my-teams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getUserTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Get assigned drills
  app.get("/api/assigned-drills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getUserAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assigned drills:", error);
      res.status(500).json({ message: "Failed to fetch assigned drills" });
    }
  });

  // Assign drill to team
  app.post("/api/coach/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { drillId, teamId, assignedTo, dueDate, notes } = req.body;
      
      if (teamId) {
        const team = await storage.getTeamById(teamId);
        if (!team || team.coachId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }
      
      const assignment = await storage.createDrillAssignment({
        drillId,
        assignedBy: userId,
        teamId: teamId || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "assigned"
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning drill:", error);
      res.status(500).json({ message: "Failed to assign drill" });
    }
  });

  // Get team assignments
  app.get("/api/coach/teams/:id/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.id);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const assignments = await storage.getTeamAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching team assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Delete assignment
  app.delete("/api/coach/assignments/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteDrillAssignment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Update assignment status (player marks as completed)
  app.put("/api/assignments/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateDrillAssignmentStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  // ===== TEAM & LEAGUE FINDER =====

  // Get team clubs with optional filters
  app.get("/api/team-clubs", async (req, res) => {
    try {
      const { type, state, city, ageGroup } = req.query;
      const clubs = await storage.getTeamClubs({
        organizationType: type as string | undefined,
        state: state as string | undefined,
        city: city as string | undefined,
        ageGroup: ageGroup as string | undefined,
      });
      res.json(clubs);
    } catch (error) {
      console.error("Error fetching team clubs:", error);
      res.status(500).json({ message: "Failed to fetch team clubs" });
    }
  });

  // Get single team club
  app.get("/api/team-clubs/:id", async (req, res) => {
    try {
      const club = await storage.getTeamClubById(req.params.id);
      if (!club) return res.status(404).json({ message: "Team not found" });
      res.json(club);
    } catch (error) {
      console.error("Error fetching team club:", error);
      res.status(500).json({ message: "Failed to fetch team club" });
    }
  });

  // Create team club (authenticated)
  app.post("/api/team-clubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTeamClubSchema.parse({ ...req.body, createdByUserId: userId });
      const club = await storage.createTeamClub(data);
      res.status(201).json(club);
    } catch (error: any) {
      console.error("Error creating team club:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: error.errors });
      res.status(500).json({ message: "Failed to create team club" });
    }
  });

  // Delete team club (owner only)
  app.delete("/api/team-clubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const club = await storage.getTeamClubById(req.params.id);
      if (!club) return res.status(404).json({ message: "Team not found" });
      if (club.createdByUserId !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteTeamClub(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team club:", error);
      res.status(500).json({ message: "Failed to delete team club" });
    }
  });

  // Get leagues with optional filters
  app.get("/api/leagues", async (req, res) => {
    try {
      const { type, state, city, ageGroup, season } = req.query;
      const result = await storage.getLeagues({
        leagueType: type as string | undefined,
        state: state as string | undefined,
        city: city as string | undefined,
        ageGroup: ageGroup as string | undefined,
        season: season as string | undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ message: "Failed to fetch leagues" });
    }
  });

  // Get single league
  app.get("/api/leagues/:id", async (req, res) => {
    try {
      const league = await storage.getLeagueById(req.params.id);
      if (!league) return res.status(404).json({ message: "League not found" });
      res.json(league);
    } catch (error) {
      console.error("Error fetching league:", error);
      res.status(500).json({ message: "Failed to fetch league" });
    }
  });

  // Create league (authenticated)
  app.post("/api/leagues", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertLeagueSchema.parse({ ...req.body, createdByUserId: userId });
      const league = await storage.createLeague(data);
      res.status(201).json(league);
    } catch (error: any) {
      console.error("Error creating league:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: error.errors });
      res.status(500).json({ message: "Failed to create league" });
    }
  });

  // Delete league (owner only)
  app.delete("/api/leagues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const league = await storage.getLeagueById(req.params.id);
      if (!league) return res.status(404).json({ message: "League not found" });
      if (league.createdByUserId !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteLeague(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting league:", error);
      res.status(500).json({ message: "Failed to delete league" });
    }
  });

  return httpServer;
}

function generateTeamCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getPlatformDimensions(platform: string): { width: number; height: number } {
  switch (platform) {
    case "twitter": return { width: 1200, height: 675 };
    case "instagram": return { width: 1080, height: 1080 };
    case "facebook": return { width: 1200, height: 630 };
    case "youtube": return { width: 1280, height: 720 };
    case "tiktok": return { width: 1080, height: 1920 };
    default: return { width: 1080, height: 1080 };
  }
}
