import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import path from "path";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, getAppBaseUrl, type AuthenticatedRequest } from "./auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { insertTrainingLogSchema, insertUserVideoSchema, insertUserProfileSchema, insertDrillSchema, insertDrillMetricSchema, insertVideoLibrarySchema, insertPdfLibrarySchema, insertMetricTemplateSchema, insertCareerProfileSchema, insertChallengeSchema, insertTeamAwardSchema, insertSeasonSchema, insertGameSchema, insertPlayerProfileSchema, insertTrainerTeamSchema, insertDrillAssignmentSchema, insertTeamClubSchema, insertLeagueSchema, games, seasons, userProfiles, teamClubs, leagues, trainerProfiles, trainerVideos, insertTrainerVideoSchema, trainerPlayerAssignments, insertTrainingLocationSchema, insertTrainerProfileLocationSchema, trainingSessions, trainerPlayers, messages, careerProfiles, playerTrainerConnections, drills, trainingLogs, feedbackComments } from "@shared/schema";
import { users } from "@shared/models/auth";
import { db } from "./db";
import { eq, and, or, isNull, ilike, sql, inArray, gte } from "drizzle-orm";
import { z } from "zod";
import { zipToCoords, cityStateToCoords, haversineDistance } from "./geo";
import {
  sendWelcomeEmail,
  sendSessionRequestedEmail,
  sendSessionConfirmedEmail,
  sendSessionCancelledEmail,
  sendSessionRescheduledEmail,
  sendSessionDeclinedEmail,
  sendInviteEmail,
  sendParentInviteEmail,
} from "./email";
import { sendPushNotification, getVapidPublicKey } from "./push";

async function getEmailForUser(userId: string): Promise<string | null> {
  const [profile] = await db.select({ email: userProfiles.email }).from(userProfiles).where(eq(userProfiles.userId, userId));
  if (profile?.email) return profile.email;
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  return user?.email || null;
}

async function resolveTrainerPlayerId(prefixedId: string): Promise<string> {
  if (prefixedId.startsWith("tp_")) {
    const tpId = prefixedId.replace("tp_", "");
    const tp = await storage.getTrainerPlayerById(tpId);
    if (tp?.linkedUserId) return tp.linkedUserId;
    if (tp?.email) {
      const [matchedUser] = await db.select().from(users).where(eq(users.email, tp.email));
      if (matchedUser) {
        await db.update(trainerPlayers).set({ linkedUserId: matchedUser.id }).where(eq(trainerPlayers.id, tp.id));
        await db.update(messages).set({ receiverId: matchedUser.id }).where(eq(messages.receiverId, prefixedId));
        await db.update(messages).set({ senderId: matchedUser.id }).where(eq(messages.senderId, prefixedId));
        return matchedUser.id;
      }
    }
  } else if (prefixedId.startsWith("cp_")) {
    const cpId = prefixedId.replace("cp_", "");
    const cp = await storage.getCoachPlayerById(cpId);
    if (cp?.linkedUserId) return cp.linkedUserId;
  }
  return prefixedId;
}

async function getDisplayNameForUser(userId: string): Promise<string> {
  const [profile] = await db.select({ displayName: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.userId, userId));
  if (profile?.displayName) return profile.displayName;
  const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId));
  if (user?.firstName) return `${user.firstName}${user.lastName ? " " + user.lastName : ""}`;
  return "Player";
}

async function getSessionEmailData(session: any) {
  const trainerName = await getDisplayNameForUser(session.trainerId);
  const playerName = await getDisplayNameForUser(session.playerId);
  let locationName: string | undefined;
  if (session.locationId) {
    const loc = await storage.getTrainingLocationById(session.locationId);
    if (loc) locationName = loc.name;
  }
  return {
    trainerName,
    playerName,
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    locationName,
    sessionType: session.sessionType || undefined,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  registerAuthRoutes(app);

  // Setup object storage for file uploads
  registerObjectStorageRoutes(app);

  // Temporary: download capacitor config
  app.get("/download/capacitor.config.ts", (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="capacitor.config.ts"');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile('capacitor.config.ts', { root: process.cwd() });
  });

  // Temporary: download iOS app bundle
  app.get("/api/download/ios-bundle", (req, res) => {
    const distPublic = path.join(process.cwd(), 'dist', 'public');
    res.setHeader('Content-Disposition', 'attachment; filename="ios-bundle.tar.gz"');
    res.setHeader('Content-Type', 'application/gzip');
    const tar = spawn('tar', ['-czf', '-', '-C', distPublic, '--exclude=*.tar.gz', '--exclude=capacitor.config.ts', '.']);
    tar.stdout.pipe(res);
    tar.stderr.on('data', (d: Buffer) => console.error('tar error:', d.toString()));
    tar.on('error', (err: Error) => { console.error('tar spawn error:', err); res.status(500).end(); });
  });

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
  app.get("/api/drills/my-drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  app.get("/api/drills/counts-by-category", async (req, res) => {
    try {
      const counts = await db
        .select({
          category: drills.category,
          count: sql<number>`count(*)::int`,
        })
        .from(drills)
        .groupBy(drills.category);
      const result: Record<string, number> = {};
      for (const row of counts) {
        result[row.category] = row.count;
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching drill counts by category:", error);
      res.status(500).json({ message: "Failed to fetch drill counts" });
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
  app.put("/api/drills/:id/share", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/drills/:id/rating", async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/drills/:id/rating", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  const isAdmin = async (req: AuthenticatedRequest, res: any, next: any) => {
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
  app.get("/api/admin/check", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/drills", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/drills/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/drills/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user admin status (admin only)
  app.put("/api/admin/users/:id/admin", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const adminStatusSchema = z.object({ isAdmin: z.boolean() });
      const parsed = adminStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "isAdmin must be a boolean", errors: parsed.error.flatten() });
      }
      const { isAdmin: newAdminStatus } = parsed.data;
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

  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const selfId = req.user.claims.sub;
      if (req.params.id === selfId) return res.status(400).json({ message: "Cannot delete your own account" });
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { staffRole } = req.body;
      await storage.setUserStaffRole(req.params.id, staffRole || null);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/video-library", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const videos = await storage.getVideoLibrary();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching video library:", error);
      res.status(500).json({ message: "Failed to fetch video library" });
    }
  });

  // Get single video from library (admin only)
  app.get("/api/video-library/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/video-library", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/video-library/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/video-library/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/pdf-library", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const pdfs = await storage.getPdfLibrary();
      res.json(pdfs);
    } catch (error) {
      console.error("Error fetching PDF library:", error);
      res.status(500).json({ message: "Failed to fetch PDF library" });
    }
  });

  // Get single PDF (admin only)
  app.get("/api/pdf-library/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/pdf-library", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/pdf-library/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/pdf-library/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deletePdfLibraryItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PDF:", error);
      res.status(500).json({ message: "Failed to delete PDF" });
    }
  });

  // ===== TUTORIAL VIDEOS =====

  app.get("/api/tutorial-videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const videos = await storage.getTutorialVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching tutorial videos:", error);
      res.status(500).json({ message: "Failed to fetch tutorial videos" });
    }
  });

  app.get("/api/tutorial-videos/:key", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const video = await storage.getTutorialVideoByKey(req.params.key);
      if (!video) {
        return res.status(404).json({ message: "Tutorial video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching tutorial video:", error);
      res.status(500).json({ message: "Failed to fetch tutorial video" });
    }
  });

  app.put("/api/tutorial-videos/:key", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const tutorialVideoSchema = z.object({ title: z.string().min(1), url: z.string().url(), description: z.string().optional() });
      const parsed = tutorialVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid tutorial video data", errors: parsed.error.flatten() });
      }
      const data = { ...parsed.data, key: req.params.key };
      const video = await storage.upsertTutorialVideo(data);
      res.json(video);
    } catch (error) {
      console.error("Error saving tutorial video:", error);
      res.status(500).json({ message: "Failed to save tutorial video" });
    }
  });

  app.delete("/api/tutorial-videos/:key", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteTutorialVideo(req.params.key);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tutorial video:", error);
      res.status(500).json({ message: "Failed to delete tutorial video" });
    }
  });

  // ===== METRIC TEMPLATES =====

  // Get all metric templates (accessible to all authenticated users for drill configuration)
  app.get("/api/metric-templates", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await storage.getMetricTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching metric templates:", error);
      res.status(500).json({ message: "Failed to fetch metric templates" });
    }
  });

  // Get single metric template (admin only)
  app.get("/api/metric-templates/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/metric-templates", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/metric-templates/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/metric-templates/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteMetricTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting metric template:", error);
      res.status(500).json({ message: "Failed to delete metric template" });
    }
  });

  // ===== SHOT LOCATIONS =====
  app.get("/api/shot-locations", async (req, res) => {
    try {
      const locs = await storage.getShotLocations();
      res.json(locs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shot locations" });
    }
  });

  app.post("/api/shot-locations", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const loc = await storage.createShotLocation(req.body);
      res.status(201).json(loc);
    } catch (error) {
      res.status(500).json({ message: "Failed to create shot location" });
    }
  });

  app.put("/api/shot-locations/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const loc = await storage.updateShotLocation(req.params.id, req.body);
      if (!loc) return res.status(404).json({ message: "Not found" });
      res.json(loc);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shot location" });
    }
  });

  app.delete("/api/shot-locations/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteShotLocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shot location" });
    }
  });

  // ===== SHOT TYPES =====
  app.get("/api/shot-types", async (req, res) => {
    try {
      const types = await storage.getShotTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shot types" });
    }
  });

  app.post("/api/shot-types", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const st = await storage.createShotType(req.body);
      res.status(201).json(st);
    } catch (error) {
      res.status(500).json({ message: "Failed to create shot type" });
    }
  });

  app.put("/api/shot-types/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const st = await storage.updateShotType(req.params.id, req.body);
      if (!st) return res.status(404).json({ message: "Not found" });
      res.json(st);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shot type" });
    }
  });

  app.delete("/api/shot-types/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteShotType(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shot type" });
    }
  });

  // Set drill metrics (link metric templates to a drill)
  // Allowed for admins OR the drill owner
  app.post("/api/drills/:id/metrics", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
      
      const drillMetricsSchema = z.object({ metricTemplateIds: z.array(z.string()) });
      const parsed = drillMetricsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "metricTemplateIds must be an array of strings", errors: parsed.error.flatten() });
      }
      const { metricTemplateIds } = parsed.data;
      const metrics = await storage.setDrillMetrics(req.params.id, metricTemplateIds);
      res.json(metrics);
    } catch (error) {
      console.error("Error setting drill metrics:", error);
      res.status(500).json({ message: "Failed to set drill metrics" });
    }
  });

  // Get drill metrics with templates
  app.get("/api/drills/:id/metrics", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/user/drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/user/my-drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/user/drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/user/drills/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/user/drills/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/workouts/personal", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/workouts/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/workouts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const createWorkoutSchema = z.object({
        name: z.string().min(1),
        drillIds: z.array(z.string()).min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        estimatedDuration: z.number().optional(),
        isFavorite: z.boolean().optional(),
      });
      const parsed = createWorkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid workout data", errors: parsed.error.flatten() });
      }
      const { name, description, category, estimatedDuration, drillIds, isFavorite } = parsed.data;
      
      const workout = await storage.createWorkout(
        { name, description, category, estimatedDuration, userId, isFavorite: isFavorite || false } as any,
        drillIds
      );
      res.status(201).json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  // Create Handlz workout (admin only)
  app.post("/api/workouts/handlz", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/workouts/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
      
      const updateWorkoutSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        estimatedDuration: z.number().optional(),
        drillIds: z.array(z.string()).optional(),
      });
      const parsed = updateWorkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid workout data", errors: parsed.error.flatten() });
      }
      const { name, description, category, estimatedDuration, drillIds } = parsed.data;
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
  app.delete("/api/workouts/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  // Assign all drills in a workout to a team/group
  app.post("/api/workouts/:id/assign", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, dueDate, notes } = req.body;
      if (!teamId) {
        return res.status(400).json({ message: "teamId is required" });
      }
      const group = await storage.getTeamById(teamId);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const workoutData = await storage.getWorkoutWithDrills(req.params.id);
      if (!workoutData) {
        return res.status(404).json({ message: "Workout not found" });
      }
      const assignments = [];
      for (const wd of workoutData.drills) {
        const assignment = await storage.createDrillAssignment({
          drillId: wd.drillId,
          assignedBy: userId,
          teamId,
          assignedTo: null,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || `Part of workout: ${workoutData.workout.name}`,
          status: "assigned",
        });
        assignments.push(assignment);
      }
      res.status(201).json({ workoutId: req.params.id, assignmentCount: assignments.length, assignments });
    } catch (error) {
      console.error("Error assigning workout:", error);
      res.status(500).json({ message: "Failed to assign workout" });
    }
  });

  // Favorite drills
  app.get("/api/user/favorite-drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const favDrillIds = await storage.getUserFavoriteDrills(userId);
      res.json(favDrillIds);
    } catch (error) {
      res.status(500).json({ message: "Failed to get favorite drills" });
    }
  });

  app.post("/api/user/favorite-drills/:drillId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.addFavoriteDrill(userId, req.params.drillId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite drill" });
    }
  });

  app.delete("/api/user/favorite-drills/:drillId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFavoriteDrill(userId, req.params.drillId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite drill" });
    }
  });

  // Toggle workout favorite
  app.put("/api/workouts/:id/favorite", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const workout = await storage.getWorkoutById(req.params.id);
      if (!workout) return res.status(404).json({ message: "Workout not found" });
      if (workout.userId !== userId) return res.status(403).json({ message: "Not authorized" });
      const updated = await storage.toggleWorkoutFavorite(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Trainer overview stats
  app.get("/api/trainer/overview", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const players = await storage.getTrainerPlayers(userId);
      const groups = await storage.getCoachTeams(userId, "trainer");
      const coachTeams = await storage.getCoachTeams(userId, "coach");
      const allTeams = [...groups, ...coachTeams];

      let totalAssignments = 0;
      let activeAssignments = 0;
      let recentLogs: any[] = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Count direct (non-team) assignments
      const directAssignments = await storage.getTrainerDirectAssignments(userId);
      totalAssignments += directAssignments.length;
      activeAssignments += directAssignments.filter(a => a.status === "assigned").length;

      for (const team of allTeams) {
        const assignments = await storage.getTeamAssignments(team.id);
        totalAssignments += assignments.length;
        activeAssignments += assignments.filter(a => a.status === "assigned").length;

        const members = await storage.getTeamMembers(team.id);
        for (const member of members) {
          const logs = await storage.getTrainingLogs(member.userId);
          const recent = logs.filter(l => l.completedAt && new Date(l.completedAt) >= sevenDaysAgo);
          recentLogs.push(...recent.map(l => ({
            ...l,
            playerName: member.user ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
            teamName: team.name,
          })));
        }
      }

      recentLogs.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

      const unreadCount = await storage.getUnreadCount(userId);

      res.json({
        totalPlayers: players.length,
        totalTeams: allTeams.length,
        totalAssignments,
        activeAssignments,
        recentLogsCount: recentLogs.length,
        unreadMessages: unreadCount,
        recentActivity: recentLogs.slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching trainer overview:", error);
      res.status(500).json({ message: "Failed to fetch overview" });
    }
  });

  // Player progress analytics for trainer
  app.get("/api/trainer/players/:playerId/progress", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (!player.linkedUserId) {
        return res.json({
          totalSessions: 0,
          totalMinutes: 0,
          averageScore: 0,
          personalRecordsCount: 0,
          weeklyActivity: [],
          categoryBreakdown: [],
          recentLogs: [],
          assignmentCompletion: { total: 0, completed: 0, rate: 0 },
        });
      }

      const logs = await storage.getTrainingLogs(player.linkedUserId);
      const totalSessions = logs.length;
      const totalMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
      const scoredLogs = logs.filter(l => l.score !== null && l.score !== undefined);
      const averageScore = scoredLogs.length > 0
        ? Math.round((scoredLogs.reduce((sum, l) => sum + (l.score || 0), 0) / scoredLogs.length) * 10) / 10
        : 0;

      const allDrills = await storage.getAllDrills();
      const drillMap = new Map(allDrills.map(d => [d.id, d]));

      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const weeklyActivity: { week: string; sessions: number; minutes: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekLogs = logs.filter(l => {
          const d = new Date(l.completedAt || l.createdAt || 0);
          return d >= weekStart && d < weekEnd;
        });
        weeklyActivity.push({
          week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessions: weekLogs.length,
          minutes: weekLogs.reduce((s, l) => s + (l.duration || 0), 0),
        });
      }

      const categoryMap: Record<string, number> = {};
      for (const log of logs) {
        const drill = drillMap.get(log.drillId);
        if (drill) {
          categoryMap[drill.category] = (categoryMap[drill.category] || 0) + 1;
        }
      }
      const categoryBreakdown = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

      const recentLogs = logs
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 10)
        .map(l => ({
          ...l,
          drillTitle: drillMap.get(l.drillId)?.title || 'Unknown Drill',
          drillCategory: drillMap.get(l.drillId)?.category || 'unknown',
        }));

      const groups = await storage.getCoachTeams(userId, "trainer");
      const coachTeams = await storage.getCoachTeams(userId, "coach");
      let totalAssigned = 0;
      let completedAssigned = 0;
      for (const team of [...groups, ...coachTeams]) {
        const assignments = await storage.getTeamAssignments(team.id);
        const playerAssignments = assignments.filter(a => a.assignedTo === player.linkedUserId || (!a.assignedTo && a.teamId));
        totalAssigned += playerAssignments.length;
        completedAssigned += playerAssignments.filter(a => a.status === "completed").length;
      }

      res.json({
        totalSessions,
        totalMinutes,
        averageScore,
        personalRecordsCount: 0,
        weeklyActivity,
        categoryBreakdown,
        recentLogs,
        assignmentCompletion: {
          total: totalAssigned,
          completed: completedAssigned,
          rate: totalAssigned > 0 ? Math.round((completedAssigned / totalAssigned) * 100) : 0,
        },
      });
    } catch (error) {
      console.error("Error fetching player progress:", error);
      res.status(500).json({ message: "Failed to fetch player progress" });
    }
  });

  // ===== TRAINING LOGS =====

  // Get user's training logs with metrics
  app.get("/api/training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/training-logs/recent", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTrainingLogSchema.parse({ ...req.body, userId });
      if (data.shotsMade !== undefined && data.shotsAttempted !== undefined &&
          data.shotsMade !== null && data.shotsAttempted !== null &&
          data.shotsMade > data.shotsAttempted) {
        return res.status(400).json({ message: "Shots made cannot exceed shots attempted" });
      }
      const log = await storage.createTrainingLog(data);
      
      const prMetrics: { metricName: string; value: number }[] = [];
      if (log.score && log.score > 0) prMetrics.push({ metricName: "Score", value: log.score });
      if (log.shotsMade && log.shotsMade > 0) prMetrics.push({ metricName: "Shots Made", value: log.shotsMade });
      if (log.duration && log.duration > 0) prMetrics.push({ metricName: "Duration (min)", value: log.duration });
      if (log.reps && log.reps > 0) prMetrics.push({ metricName: "Reps", value: log.reps });
      if (log.shotsAttempted && log.shotsMade && log.shotsAttempted > 0 && log.shotsMade <= log.shotsAttempted) {
        const pct = Math.round((log.shotsMade / log.shotsAttempted) * 100);
        if (pct > 0) prMetrics.push({ metricName: "Shooting %", value: pct });
      }
      if (prMetrics.length > 0) {
        try { await storage.checkAndCreateDrillPRs(userId, log.drillId, log.id, prMetrics); } catch (e) { console.error("PR check error:", e); }
      }

      if (log.drillId) {
        try {
          const toComplete = await storage.getActiveAssignmentsForDrillAndUser(userId, log.drillId);
          for (const a of toComplete) {
            await storage.updateDrillAssignmentStatus(a.id, "completed", log.id);
          }
          if (toComplete.length > 0) {
            console.log(`[AutoComplete] Marked ${toComplete.length} assignment(s) complete for user ${userId}, drill ${log.drillId}`);
          }
        } catch (e) { console.error("Auto-complete assignment error:", e); }
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

  // Bulk save training logs (used by finish-workout for speed)
  app.post("/api/training-logs/bulk", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: "entries must be a non-empty array" });
      }
      // Fetch shared data once — avoids N DB round-trips for N entries in the workout
      const [metricTemplates, allActiveAssignments] = await Promise.all([
        storage.getMetricTemplates(),
        storage.getAllActiveAssignmentsForUser(userId).catch(() => [] as any[]),
      ]);
      // Build a drillId→assignments map for O(1) lookups per entry
      const assignmentsByDrill = new Map<string, any[]>();
      for (const a of allActiveAssignments) {
        if (!assignmentsByDrill.has(a.drillId)) assignmentsByDrill.set(a.drillId, []);
        assignmentsByDrill.get(a.drillId)!.push(a);
      }

      const logs = await Promise.all(entries.map(async (entry: any) => {
        const data = insertTrainingLogSchema.parse({ ...entry, userId });
        if (data.shotsMade !== undefined && data.shotsAttempted !== undefined &&
            data.shotsMade !== null && data.shotsAttempted !== null &&
            data.shotsMade > data.shotsAttempted) {
          data.shotsMade = data.shotsAttempted;
        }
        const log = await storage.createTrainingLog(data);
        const prMetrics: { metricName: string; value: number }[] = [];
        if (log.score && log.score > 0) prMetrics.push({ metricName: "Score", value: log.score });
        if (log.shotsMade && log.shotsMade > 0) prMetrics.push({ metricName: "Shots Made", value: log.shotsMade });
        if (log.duration && log.duration > 0) prMetrics.push({ metricName: "Duration (min)", value: log.duration });
        if (log.shotsAttempted && log.shotsMade && log.shotsAttempted > 0 && log.shotsMade <= log.shotsAttempted) {
          const pct = Math.round((log.shotsMade / log.shotsAttempted) * 100);
          if (pct > 0) prMetrics.push({ metricName: "Shooting %", value: pct });
        }
        if (Array.isArray(entry.metrics) && entry.metrics.length > 0) {
          const saved = await storage.saveTrainingLogMetrics(log.id, entry.metrics);
          for (const m of saved) {
            if (m.value !== null && Number(m.value) > 0) {
              const template = metricTemplates.find(t => t.id === m.metricId);
              prMetrics.push({ metricName: template?.name || m.metricId, value: Number(m.value) });
            }
          }
        }
        if (prMetrics.length > 0) {
          try { await storage.checkAndCreateDrillPRs(userId, log.drillId, log.id, prMetrics); } catch (e) { /* non-fatal */ }
        }
        if (log.drillId) {
          try {
            const toComplete = assignmentsByDrill.get(log.drillId) || [];
            for (const a of toComplete) await storage.updateDrillAssignmentStatus(a.id, "completed", log.id);
          } catch (e) { /* non-fatal */ }
        }
        return log;
      }));

      // Auto-complete daily challenge if any logged drill matches today's challenge
      let streakResult: any = null;
      try {
        const { clientDate } = req.body;
        const todayStr = (typeof clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
          ? clientDate
          : new Date().toISOString().split("T")[0];
        const challengeData = await storage.getDailyChallenge(todayStr);
        if (challengeData) {
          const alreadyDone = await storage.getTodayCompletion(userId, todayStr);
          if (!alreadyDone) {
            const matchingLog = logs.find(l => l.drillId === challengeData.drill.id);
            if (matchingLog) {
              streakResult = await storage.completeDailyChallenge(userId, challengeData.drill.id, todayStr, matchingLog.id);
            }
          }
        }
      } catch (e) { /* non-fatal */ }

      res.status(201).json({ logs, streakResult });
    } catch (error) {
      console.error("Error bulk saving training logs:", error);
      res.status(500).json({ message: "Failed to save workout" });
    }
  });

  // Get single training log with metrics
  app.get("/api/training-logs/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const log = await storage.getTrainingLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Training log not found" });
      }
      if (log.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const rawMetrics = await storage.getTrainingLogMetrics(req.params.id);
      const templates = await storage.getMetricTemplates();
      const templateMap = new Map(templates.map(t => [t.id, t.name]));
      const metrics = rawMetrics.map(m => ({ ...m, metricName: templateMap.get(m.metricId) || null }));
      res.json({ ...log, metrics });
    } catch (error) {
      console.error("Error fetching training log:", error);
      res.status(500).json({ message: "Failed to fetch training log" });
    }
  });

  // Update training log
  app.put("/api/training-logs/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
      if (shotsMade !== undefined && shotsAttempted !== undefined &&
          shotsMade !== null && shotsAttempted !== null &&
          shotsMade > shotsAttempted) {
        return res.status(400).json({ message: "Shots made cannot exceed shots attempted" });
      }
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
      if (s.shotsAttempted && s.shotsMade && s.shotsAttempted > 0 && s.shotsMade <= s.shotsAttempted) {
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

  app.delete("/api/training-logs/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const log = await storage.getTrainingLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Training log not found" });
      }
      if (log.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteTrainingLog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting training log:", error);
      res.status(500).json({ message: "Failed to delete training log" });
    }
  });

  // ===== USER PROFILE =====

  // Get user profile
  app.get("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const body = { ...req.body };
      if (body.zipCode) {
        const coords = zipToCoords(body.zipCode);
        if (coords) {
          body.latitude = coords.latitude;
          body.longitude = coords.longitude;
        }
      }
      const data = insertUserProfileSchema.parse({ ...body, userId });
      const profile = await storage.upsertUserProfile(data);

      if (data.profilePhotoUrl !== undefined) {
        await db.update(users)
          .set({ profileImageUrl: data.profilePhotoUrl })
          .where(eq(users.id, userId));
        await db.update(careerProfiles)
          .set({ cardPhotoUrl: data.profilePhotoUrl })
          .where(eq(careerProfiles.userId, userId));
      }

      const trainerProfile = await storage.getTrainerProfile(userId);
      if (trainerProfile) {
        const trainerSync: any = {};
        if (data.profilePhotoUrl !== undefined) trainerSync.profilePhotoUrl = data.profilePhotoUrl;
        if (data.city !== undefined) trainerSync.city = data.city;
        if (data.state !== undefined) trainerSync.state = data.state;
        if (Object.keys(trainerSync).length > 0) {
          await db.update(trainerProfiles)
            .set(trainerSync)
            .where(eq(trainerProfiles.userId, userId))
            .execute();
        }
      }

      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/user/location", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      if (!profile) return res.json({ latitude: null, longitude: null, zipCode: null });
      res.json({
        latitude: profile.latitude,
        longitude: profile.longitude,
        zipCode: profile.zipCode,
        city: profile.city,
        state: profile.state,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get location" });
    }
  });

  // ===== USER VIDEOS =====

  // Get user's videos
  app.get("/api/videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.patch("/api/videos/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, isPublic, drillId } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (drillId !== undefined) updateData.drillId = drillId || null;
      const updated = await storage.updateUserVideo(req.params.id, userId, updateData);
      if (!updated) return res.status(404).json({ message: "Video not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  app.delete("/api/videos/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/progress", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/stats/overview", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/stats/weekly", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/stats/by-category", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  app.get("/api/stats/dashboard-training", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  app.get("/api/stats/trends", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const period = (req.query.period as string) || "weekly";
      const stats = await storage.getProgressTrends(userId, period);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching progress trends:", error);
      res.status(500).json({ message: "Failed to fetch progress trends" });
    }
  });

  // ===== BENCHMARKS =====

  // Get benchmarks
  app.get("/api/benchmarks", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/drill-metrics/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/drill-metrics/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/training-logs/:id/metrics", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const metrics = await storage.getTrainingLogMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching training log metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Save metrics for a training log
  app.post("/api/training-logs/:id/metrics", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/career", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/career", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if profile already exists
      const existing = await storage.getCareerProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Career profile already exists" });
      }
      
      const data = insertCareerProfileSchema.parse({ ...req.body, userId });
      const profile = await storage.createCareerProfile(data);

      if (data.cardPhotoUrl) {
        await db.insert(userProfiles)
          .values({ userId, profilePhotoUrl: data.cardPhotoUrl } as any)
          .onConflictDoUpdate({ target: userProfiles.userId, set: { profilePhotoUrl: data.cardPhotoUrl } })
          .execute();
        await db.update(users)
          .set({ profileImageUrl: data.cardPhotoUrl })
          .where(eq(users.id, userId));
      }

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
  app.put("/api/career", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
        'staffRole',
        'alsoPlayer',
        'primaryReason',
        'onboardingTeams',
        'onboardingCompleted',
        'isMinor',
        'parentEmail',
        'trainerSpecialties',
        'trainerAlsoCoaches',
        'trainerTeamName'
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

      if (data.cardPhotoUrl !== undefined) {
        await db.insert(userProfiles)
          .values({ userId, profilePhotoUrl: data.cardPhotoUrl } as any)
          .onConflictDoUpdate({ target: userProfiles.userId, set: { profilePhotoUrl: data.cardPhotoUrl } })
          .execute();
        await db.update(users)
          .set({ profileImageUrl: data.cardPhotoUrl })
          .where(eq(users.id, userId));
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

  // Update user name (used during onboarding)
  app.put("/api/user/name", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;
      const [updated] = await db.update(users)
        .set({ firstName: firstName || null, lastName: lastName || null, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating user name:", error);
      res.status(500).json({ message: "Failed to update name" });
    }
  });

  // Complete onboarding
  app.post("/api/career/complete-onboarding", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingProfile = await storage.getCareerProfile(userId);

      const updateData: Record<string, any> = { onboardingCompleted: true };

      const willBeMinor = updateData.isMinor ?? existingProfile?.isMinor;
      if (willBeMinor && !existingProfile?.parentInviteCode) {
        const crypto = await import("crypto");
        updateData.parentInviteCode = crypto.randomBytes(6).toString("hex");
      }

      const profile = await storage.updateCareerProfile(userId, updateData);
      if (!profile) {
        return res.status(404).json({ message: "Career profile not found" });
      }

      if (profile.staffRole === "trainer" || profile.staffRole === "coach" || profile.staffRole === "both") {
        const existingTrainerProfile = await storage.getTrainerProfile(userId);
        if (!existingTrainerProfile) {
          const userProfile = await storage.getUserProfile(userId);
          await storage.upsertTrainerProfile({
            userId,
            profilePhotoUrl: userProfile?.profilePhotoUrl || null,
            city: userProfile?.city || null,
            state: userProfile?.state || null,
          } as any);
        }
      }

      const email = await getEmailForUser(userId);
      if (email) {
        const displayName = await getDisplayNameForUser(userId);
        sendWelcomeEmail(email, displayName).catch(() => {});
      }

      res.json(profile);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // ===== ACHIEVEMENTS =====

  // Get all available achievements
  app.get("/api/achievements", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Get user's unlocked achievements
  app.get("/api/achievements/unlocked", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/achievements/check", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/career/add-xp", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/challenges", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const challenges = await storage.getChallenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // Get user's challenges (with progress)
  app.get("/api/challenges/my-challenges", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/challenges", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/challenges/:id/start", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/challenges/:id/progress", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentValue } = req.body;
      const updated = await storage.updateChallengeProgress(req.params.id, currentValue);
      if (!updated) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      if (updated.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Failed to update challenge progress" });
    }
  });

  // Complete a challenge
  app.post("/api/challenges/:id/complete", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const completed = await storage.completeChallenge(req.params.id);
      if (!completed) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      if (completed.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(completed);
    } catch (error) {
      console.error("Error completing challenge:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });

  // Delete a challenge (only owner can delete)
  app.delete("/api/challenges/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/personal-records", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/personal-records/backfill", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
        if (log.shotsAttempted && log.shotsMade && log.shotsAttempted > 0 && log.shotsMade <= log.shotsAttempted) {
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
  app.get("/api/team-awards", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/team-awards", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/team-awards/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/team-awards/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/stats/shots", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/seasons", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/seasons/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/seasons", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/seasons/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [season] = await db.select().from(seasons).where(eq(seasons.id, req.params.id)).limit(1);
      if (!season) return res.status(404).json({ message: "Season not found" });
      if (season.userId !== userId) return res.status(403).json({ message: "Not authorized" });
      const updated = await storage.updateSeason(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating season:", error);
      res.status(500).json({ message: "Failed to update season" });
    }
  });

  // Delete a season
  app.delete("/api/seasons/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [season] = await db.select().from(seasons).where(eq(seasons.id, req.params.id)).limit(1);
      if (!season) return res.status(404).json({ message: "Season not found" });
      if (season.userId !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteSeason(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting season:", error);
      res.status(500).json({ message: "Failed to delete season" });
    }
  });

  // Get games for a season
  app.get("/api/seasons/:seasonId/games", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const seasonGames = await storage.getSeasonGames(req.params.seasonId);
      res.json(seasonGames);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  // Create a game
  app.post("/api/seasons/:seasonId/games", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  // Bulk import games from CSV
  app.post("/api/seasons/:seasonId/games/bulk", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const seasonId = req.params.seasonId;
      const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId)).limit(1);
      if (!season || season.userId !== userId) {
        return res.status(403).json({ message: "Season not found or access denied" });
      }

      const rawGames: unknown[] = Array.isArray(req.body.games) ? req.body.games : [];
      if (rawGames.length === 0) return res.status(400).json({ message: "No games provided" });
      if (rawGames.length > 200) return res.status(400).json({ message: "Maximum 200 games per import" });

      let imported = 0;
      let skipped = 0;

      for (const raw of rawGames) {
        try {
          const gameData = insertGameSchema.parse({
            ...(raw as object),
            seasonId,
            userId,
            gameDate: (raw as any).gameDate ? new Date((raw as any).gameDate) : new Date(),
          });
          const game = await storage.createGame(gameData);
          try {
            await storage.checkAndCreateGamePRs(userId, game.id, {
              points: game.points ?? 0,
              rebounds: game.rebounds ?? 0,
              assists: game.assists ?? 0,
              steals: game.steals ?? 0,
              blocks: game.blocks ?? 0,
              fgMade: game.fgMade ?? 0,
              threePtMade: game.threePtMade ?? 0,
              ftMade: game.ftMade ?? 0,
            });
          } catch {}
          imported++;
        } catch {
          skipped++;
        }
      }

      res.status(201).json({ imported, skipped });
    } catch (error) {
      console.error("Bulk game import error:", error);
      res.status(500).json({ message: "Failed to import games" });
    }
  });

  // Update a game
  app.put("/api/games/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(games).where(eq(games.id, req.params.id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Game not found" });
      if (existing.userId !== userId) return res.status(403).json({ message: "Not authorized" });
      const gameData = {
        ...req.body,
        gameDate: req.body.gameDate ? new Date(req.body.gameDate + 'T12:00:00Z') : undefined
      };
      const updated = await storage.updateGame(req.params.id, gameData);
      if (!updated) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      try {
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
  app.delete("/api/games/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(games).where(eq(games.id, req.params.id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Game not found" });
      if (existing.userId !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteGame(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // Get career stats (aggregate across all seasons)
  app.get("/api/stats/career", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/player-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.put("/api/player-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  // Player trainer favorites (must be before /api/player/:slug wildcard)
  app.get("/api/player/trainer-favorites", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const favorites = await storage.getPlayerTrainerFavorites(playerId);
      res.json(favorites);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/player/trainer-favorites/:trainerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const { trainerId } = req.params;
      const fav = await storage.addPlayerTrainerFavorite(playerId, trainerId);
      res.status(201).json(fav);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/player/trainer-favorites/:trainerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const { trainerId } = req.params;
      await storage.removePlayerTrainerFavorite(playerId, trainerId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/player/my-trainer/:trainerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const { trainerId } = req.params;
      const fav = await storage.setMyTrainer(playerId, trainerId);
      res.json(fav);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/player/my-trainer/:trainerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const { trainerId } = req.params;
      const fav = await storage.unsetMyTrainer(playerId, trainerId);
      res.json(fav || { success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get public player profile by slug (no auth required)
  app.get("/api/player/:slug", async (req, res) => {
    try {
      const profile = await storage.getPlayerProfileBySlug(req.params.slug);
      if (!profile || !profile.isPublic) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const [career, [user], awards, personalRecords, allVideos, statsData] = await Promise.all([
        storage.getCareerProfile(profile.userId),
        db.select({
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }).from(users).where(eq(users.id, profile.userId)),
        profile.showAchievements ? storage.getUserTeamAwards(profile.userId) : null,
        profile.showPersonalRecords === true ? storage.getUserPersonalRecords(profile.userId) : null,
        profile.showVideos ? storage.getUserVideos(profile.userId) : null,
        profile.showStats ? Promise.all([
          storage.getPublicUserSeasons(profile.userId),
          storage.getCareerStats(profile.userId),
        ]) : null,
      ]);

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

      if (statsData) {
        const [publicSeasons, fullStats] = statsData;
        const publicSeasonIds = new Set(publicSeasons.map(s => s.id));
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
      if (awards) {
        publicData.awards = awards;
      }
      if (personalRecords) {
        publicData.personalRecords = personalRecords;
      }
      if (allVideos) {
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
  app.get("/api/share/game-stats/:gameId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  // Share: workout session summary
  app.get("/api/share/workout-session/:sessionId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { sessionId } = req.params;

      const sessionLogs = await db.select({
        id: trainingLogs.id,
        drillId: trainingLogs.drillId,
        duration: trainingLogs.duration,
        reps: trainingLogs.reps,
        sets: trainingLogs.sets,
        score: trainingLogs.score,
        shotLocation: trainingLogs.shotLocation,
        shotsAttempted: trainingLogs.shotsAttempted,
        shotsMade: trainingLogs.shotsMade,
        completedAt: trainingLogs.completedAt,
        drillTitle: drills.title,
        drillCategory: drills.category,
      }).from(trainingLogs)
        .leftJoin(drills, eq(drills.id, trainingLogs.drillId))
        .where(and(
          eq(trainingLogs.userId, userId),
          eq(trainingLogs.workoutSessionId, sessionId)
        ))
        .orderBy(trainingLogs.completedAt);

      if (!sessionLogs.length) return res.status(404).json({ message: "Session not found" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const profile = await storage.getUserProfile(userId);
      const career = await storage.getCareerProfile(userId);

      // Aggregate shot data by location
      const shotMap: Record<string, { made: number; attempted: number }> = {};
      for (const l of sessionLogs) {
        if (l.shotLocation && (l.shotsAttempted || 0) > 0) {
          if (!shotMap[l.shotLocation]) shotMap[l.shotLocation] = { made: 0, attempted: 0 };
          shotMap[l.shotLocation].made += l.shotsMade || 0;
          shotMap[l.shotLocation].attempted += l.shotsAttempted || 0;
        }
      }

      // Category breakdown
      const catMap: Record<string, number> = {};
      for (const l of sessionLogs) {
        const cat = l.drillCategory || 'general';
        catMap[cat] = (catMap[cat] || 0) + 1;
      }

      const totalShots = sessionLogs.reduce((s, l) => s + (l.shotsAttempted || 0), 0);
      const totalMade = sessionLogs.reduce((s, l) => s + (l.shotsMade || 0), 0);

      res.json({
        sessionId,
        date: sessionLogs[0].completedAt,
        playerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Player',
        displayName: profile?.displayName || null,
        teamName: career?.teamName || null,
        jerseyNumber: career?.jerseyNumber || null,
        totalDuration: sessionLogs.reduce((s, l) => s + l.duration, 0),
        drillCount: sessionLogs.length,
        totalShotsAttempted: totalShots,
        totalShotsMade: totalMade,
        shootingPct: totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : null,
        drills: sessionLogs.map(l => ({
          title: l.drillTitle || 'Drill',
          category: l.drillCategory || 'general',
          duration: l.duration,
          reps: l.reps,
          sets: l.sets,
          score: l.score,
          shotsAttempted: l.shotsAttempted,
          shotsMade: l.shotsMade,
        })),
        shotData: Object.entries(shotMap).map(([location, d]) => ({ location, ...d })),
        categoryBreakdown: Object.entries(catMap).map(([category, count]) => ({ category, count })),
      });
    } catch (err) {
      console.error("Error generating workout share data:", err);
      res.status(500).json({ message: "Failed to generate share data" });
    }
  });

  // Share: training period summary (day / week / month / year)
  app.get("/api/share/training-summary", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const period = (req.query.period as string) || 'week';

      let since: Date;
      const now = new Date();
      if (period === 'day') { since = new Date(now); since.setHours(0, 0, 0, 0); }
      else if (period === 'month') { since = new Date(now.getFullYear(), now.getMonth(), 1); }
      else if (period === 'year') { since = new Date(now.getFullYear(), 0, 1); }
      else { since = new Date(now); since.setDate(now.getDate() - 6); since.setHours(0, 0, 0, 0); } // week default

      const periodLogs = await db.select({
        id: trainingLogs.id,
        drillId: trainingLogs.drillId,
        duration: trainingLogs.duration,
        reps: trainingLogs.reps,
        shotLocation: trainingLogs.shotLocation,
        shotsAttempted: trainingLogs.shotsAttempted,
        shotsMade: trainingLogs.shotsMade,
        completedAt: trainingLogs.completedAt,
        workoutSessionId: trainingLogs.workoutSessionId,
        drillCategory: drills.category,
        drillTitle: drills.title,
      }).from(trainingLogs)
        .leftJoin(drills, eq(drills.id, trainingLogs.drillId))
        .where(and(eq(trainingLogs.userId, userId), gte(trainingLogs.completedAt, since)))
        .orderBy(trainingLogs.completedAt);

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const profile = await storage.getUserProfile(userId);
      const career = await storage.getCareerProfile(userId);

      const totalSessions = new Set(periodLogs.map(l => l.workoutSessionId || l.id)).size;
      const totalDuration = periodLogs.reduce((s, l) => s + l.duration, 0);
      const totalShots = periodLogs.reduce((s, l) => s + (l.shotsAttempted || 0), 0);
      const totalMade = periodLogs.reduce((s, l) => s + (l.shotsMade || 0), 0);

      // Category breakdown
      const catMap: Record<string, number> = {};
      for (const l of periodLogs) {
        const cat = l.drillCategory || 'general';
        catMap[cat] = (catMap[cat] || 0) + l.duration;
      }

      // Shot data
      const shotMap: Record<string, { made: number; attempted: number }> = {};
      for (const l of periodLogs) {
        if (l.shotLocation && (l.shotsAttempted || 0) > 0) {
          if (!shotMap[l.shotLocation]) shotMap[l.shotLocation] = { made: 0, attempted: 0 };
          shotMap[l.shotLocation].made += l.shotsMade || 0;
          shotMap[l.shotLocation].attempted += l.shotsAttempted || 0;
        }
      }

      // Daily activity for sparkline (group by date)
      const dayMap: Record<string, number> = {};
      for (const l of periodLogs) {
        const day = l.completedAt ? new Date(l.completedAt).toISOString().split('T')[0] : 'unknown';
        dayMap[day] = (dayMap[day] || 0) + l.duration;
      }

      // Top drills
      const drillMap: Record<string, number> = {};
      for (const l of periodLogs) { drillMap[l.drillTitle || 'Unknown'] = (drillMap[l.drillTitle || 'Unknown'] || 0) + 1; }
      const topDrills = Object.entries(drillMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));

      // Categorise shots by type using zone slug patterns
      const threePtSlugs = new Set(["top-of-key","wing-left","wing-right","corner-left","corner-right","top-of-key-3-point"]);
      const layupSlugs   = new Set(["left-hand-layup","right-hand-layup"]);
      const ftSlugs      = new Set(["free-throw"]);
      let shots3ptM = 0, shots3ptA = 0, shotsLayupM = 0, shotsLayupA = 0;
      let shotsFtM = 0, shotsFtA = 0, shots2ptM = 0, shots2ptA = 0;
      for (const [loc, d] of Object.entries(shotMap)) {
        if (threePtSlugs.has(loc))      { shots3ptM += d.made; shots3ptA += d.attempted; }
        else if (layupSlugs.has(loc))   { shotsLayupM += d.made; shotsLayupA += d.attempted; }
        else if (ftSlugs.has(loc))      { shotsFtM += d.made; shotsFtA += d.attempted; }
        else                            { shots2ptM += d.made; shots2ptA += d.attempted; }
      }

      // Best training day
      const bestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0] || null;

      res.json({
        period,
        since: since.toISOString(),
        playerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Player',
        displayName: profile?.displayName || null,
        teamName: career?.teamName || null,
        jerseyNumber: career?.jerseyNumber || null,
        totalSessions,
        totalDrills: periodLogs.length,
        totalDuration,
        totalShotsAttempted: totalShots,
        totalShotsMade: totalMade,
        shootingPct: totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : null,
        shotTypeBreakdown: {
          threePoint: { made: shots3ptM, attempted: shots3ptA },
          midRange:   { made: shots2ptM, attempted: shots2ptA },
          layup:      { made: shotsLayupM, attempted: shotsLayupA },
          freeThrow:  { made: shotsFtM, attempted: shotsFtA },
        },
        categoryBreakdown: Object.entries(catMap).map(([category, minutes]) => ({ category, minutes })).sort((a, b) => b.minutes - a.minutes),
        shotData: Object.entries(shotMap).map(([location, d]) => ({ location, ...d })),
        dailyActivity: Object.entries(dayMap).map(([date, minutes]) => ({ date, minutes })).sort((a, b) => a.date.localeCompare(b.date)),
        topDrills,
        bestDay: bestDay ? { date: bestDay[0], minutes: bestDay[1] } : null,
      });
    } catch (err) {
      console.error("Error generating training summary share data:", err);
      res.status(500).json({ message: "Failed to generate share data" });
    }
  });

  // Share: season stats averages
  app.get("/api/share/season-stats/:seasonId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { seasonId } = req.params;

      const [season] = await db.select().from(seasons).where(and(eq(seasons.id, seasonId), eq(seasons.userId, userId)));
      if (!season) return res.status(404).json({ message: "Season not found" });

      const seasonGames = await db.select().from(games).where(and(eq(games.seasonId, seasonId), eq(games.userId, userId)));

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const career = await storage.getCareerProfile(userId);
      const profile = await storage.getUserProfile(userId);

      const gp = seasonGames.length;
      const wins = seasonGames.filter(g => g.result === 'W').length;

      const avg = (fn: (g: typeof seasonGames[0]) => number) =>
        gp > 0 ? +(seasonGames.reduce((s, g) => s + fn(g), 0) / gp).toFixed(1) : 0;

      const totalFgA = seasonGames.reduce((s, g) => s + (g.fgAttempted || 0), 0);
      const totalFgM = seasonGames.reduce((s, g) => s + (g.fgMade || 0), 0);
      const total3PA = seasonGames.reduce((s, g) => s + (g.threePtAttempted || 0), 0);
      const total3PM = seasonGames.reduce((s, g) => s + (g.threePtMade || 0), 0);
      const totalFTA = seasonGames.reduce((s, g) => s + (g.ftAttempted || 0), 0);
      const totalFTM = seasonGames.reduce((s, g) => s + (g.ftMade || 0), 0);

      const totalPts = seasonGames.reduce((s, g) => s + (g.points || 0), 0);
      const totalReb = seasonGames.reduce((s, g) => s + (g.rebounds || 0), 0);
      const totalAst = seasonGames.reduce((s, g) => s + (g.assists || 0), 0);
      const totalStl = seasonGames.reduce((s, g) => s + (g.steals || 0), 0);
      const totalBlk = seasonGames.reduce((s, g) => s + (g.blocks || 0), 0);
      const topGame  = seasonGames.slice().sort((a, b) => (b.points || 0) - (a.points || 0))[0] || null;

      res.json({
        seasonId,
        seasonName: season.name,
        seasonYear: season.year,
        teamName: season.teamName || career?.teamName || null,
        playerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Player',
        displayName: profile?.displayName || null,
        jerseyNumber: career?.jerseyNumber || null,
        gamesPlayed: gp,
        wins, losses: gp - wins,
        record: `${wins}-${gp - wins}`,
        // Per game
        ppg: avg(g => g.points || 0),
        rpg: avg(g => g.rebounds || 0),
        apg: avg(g => g.assists || 0),
        spg: avg(g => g.steals || 0),
        bpg: avg(g => g.blocks || 0),
        // Shooting
        fgPct: totalFgA > 0 ? Math.round((totalFgM / totalFgA) * 100) : 0,
        threePct: total3PA > 0 ? Math.round((total3PM / total3PA) * 100) : 0,
        ftPct: totalFTA > 0 ? Math.round((totalFTM / totalFTA) * 100) : 0,
        totalFgM, totalFgA, total3PM, total3PA, totalFtM: totalFTM, totalFtA: totalFTA,
        // Season totals
        totalPts, totalReb, totalAst, totalStl, totalBlk,
        // Best game
        topGame: topGame ? {
          points: topGame.points || 0, rebounds: topGame.rebounds || 0, assists: topGame.assists || 0,
          steals: topGame.steals || 0, blocks: topGame.blocks || 0,
          date: topGame.gameDate, opponent: topGame.opponent, result: topGame.result,
        } : null,
      });
    } catch (err) {
      console.error("Error generating season stats share data:", err);
      res.status(500).json({ message: "Failed to generate share data" });
    }
  });

  // ===== COACH MODE =====

  // Get coach's teams
  app.get("/api/coach/teams", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getCoachTeams(userId, "coach");
      res.json(teams);
    } catch (error) {
      console.error("Error fetching coach teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Create coach team
  app.post("/api/coach/teams", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamCode = generateTeamCode();
      const { playerIds, ...teamData } = req.body;
      const team = await storage.createTeam({ ...teamData, coachId: userId, teamCode, teamType: "coach" });

      const assignedPlayers: string[] = [];
      const uniquePlayerIds = playerIds && Array.isArray(playerIds) ? [...new Set(playerIds as string[])] : [];
      if (uniquePlayerIds.length > 0) {
        for (const playerId of uniquePlayerIds) {
          try {
            const player = await storage.getTrainerPlayerById(playerId);
            if (player && player.trainerId === userId) {
              await storage.assignPlayerToTeam({
                playerId,
                teamId: team.id,
                position: player.position || null,
                jerseyNumber: player.jerseyNumber || null,
              });
              assignedPlayers.push(`${player.firstName} ${player.lastName || ""}`.trim());
            }
          } catch (assignErr) {
            console.error(`Failed to assign player ${playerId} to new team:`, assignErr);
          }
        }
      }

      res.status(201).json({ ...team, assignedPlayers });
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // Update team
  app.put("/api/coach/teams/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/coach/teams/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/coach/teams/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.id);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const members = await storage.getTeamMembers(req.params.id);

      // Auto-sync: create trainer_player entries for team members who don't have one
      let teamPlayerIds = new Set((await storage.getTrainerPlayersByTeam(req.params.id)).map(tp => tp.id));
      for (const member of members) {
        if (member.userId !== userId) {
          const trainerPlayer = await storage.findOrCreateTrainerPlayerForUser(userId, member.userId);
          if (!teamPlayerIds.has(trainerPlayer.id)) {
            await storage.assignPlayerToTeam({
              playerId: trainerPlayer.id,
              teamId: req.params.id,
              position: member.position || null,
              jerseyNumber: member.jerseyNumber || null,
            });
            teamPlayerIds.add(trainerPlayer.id);
          }
        }
      }

      const coachPlayers = await storage.getCoachPlayersByTeam(req.params.id);
      const linkedUserIds = new Set(members.map(m => m.userId));
      const coachPlayerMembers = coachPlayers
        .filter(cp => !cp.linkedUserId || !linkedUserIds.has(cp.linkedUserId))
        .map(cp => ({
          userId: cp.linkedUserId || `cp_${cp.id}`,
          teamId: req.params.id,
          role: "player",
          position: cp.teamPosition || cp.position || null,
          jerseyNumber: cp.teamJersey || cp.jerseyNumber || null,
          joinedAt: cp.createdAt,
          firstName: cp.firstName,
          lastName: cp.lastName || "",
          email: cp.email || "",
          profileImageUrl: null,
          isCoachPlayer: true,
          coachPlayerId: cp.id,
          assignmentId: cp.assignmentId,
        }));

      const trainerPlayerAssignments = await storage.getTrainerPlayersByTeam(req.params.id);
      const existingIds = new Set([...linkedUserIds, ...coachPlayerMembers.map(cp => cp.userId)]);
      const trainerPlayerMembers = trainerPlayerAssignments
        .filter(tp => !existingIds.has(`tp_${tp.id}`))
        .map(tp => ({
          id: tp.id,
          userId: tp.linkedUserId || `tp_${tp.id}`,
          teamId: req.params.id,
          role: "player",
          position: tp.teamPosition || tp.position || null,
          jerseyNumber: tp.teamJersey || tp.jerseyNumber || null,
          joinedAt: tp.assignedAt || tp.createdAt,
          firstName: tp.firstName,
          lastName: tp.lastName || "",
          email: tp.email || "",
          profileImageUrl: null,
          isCoachPlayer: false,
          assignmentId: tp.assignmentId,
        }));

      res.json([...members.map(m => ({ ...m, isCoachPlayer: false })), ...coachPlayerMembers, ...trainerPlayerMembers]);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Remove team member
  app.delete("/api/coach/teams/:teamId/members/:userId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/teams/join", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

      // Auto-create trainer_player entry so user appears in Players tab
      const trainerPlayer = await storage.findOrCreateTrainerPlayerForUser(team.coachId, userId);
      const teamPlayers = await storage.getTrainerPlayersByTeam(team.id);
      const alreadyAssigned = teamPlayers.find(tp => tp.id === trainerPlayer.id);
      if (!alreadyAssigned) {
        await storage.assignPlayerToTeam({
          playerId: trainerPlayer.id,
          teamId: team.id,
          position: null,
          jerseyNumber: null,
        });
      }

      res.status(201).json({ member, team });
    } catch (error) {
      console.error("Error joining team:", error);
      res.status(500).json({ message: "Failed to join team" });
    }
  });

  // Get user's teams (as a player)
  app.get("/api/my-teams", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/assigned-drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.post("/api/coach/assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/coach/teams/:id/assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/coach/assignments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignment = await storage.getDrillAssignmentById(req.params.id);
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.assignedBy !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDrillAssignment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Update assignment status (player marks as completed)
  app.put("/api/assignments/:id/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignment = await storage.getDrillAssignmentById(req.params.id);
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      // assignedTo may be a trainerPlayers roster ID; check if the current user is the linked user
      let isAuthorized = assignment.assignedTo === userId || assignment.assignedBy === userId;
      if (!isAuthorized && assignment.assignedTo) {
        const [rosterEntry] = await db.select({ id: trainerPlayers.id })
          .from(trainerPlayers)
          .where(and(eq(trainerPlayers.id, assignment.assignedTo), eq(trainerPlayers.linkedUserId, userId)));
        if (rosterEntry) isAuthorized = true;
      }
      if (!isAuthorized) return res.status(403).json({ message: "Not authorized" });
      const { status } = req.body;
      const updated = await storage.updateDrillAssignmentStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  // Update team member (position, jersey number)
  app.put("/api/coach/teams/:teamId/members/:userId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.teamId);
      if (!team || team.coachId !== ownerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { position, jerseyNumber } = req.body;
      const updated = await storage.updateTeamMember(req.params.teamId, req.params.userId, { position, jerseyNumber });
      res.json(updated);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Get player training logs for assigned drills (coach/trainer view)
  app.get("/api/coach/teams/:id/training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.id);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const members = await storage.getTeamMembers(req.params.id);
      const memberIds = members.map(m => m.userId);
      const logs = [];
      for (const memberId of memberIds) {
        const memberLogs = await storage.getTrainingLogs(memberId);
        const [user] = members.filter(m => m.userId === memberId);
        for (const log of memberLogs) {
          logs.push({
            ...log,
            playerName: user ? `${user.user.firstName || ''} ${user.user.lastName || ''}`.trim() : 'Unknown',
            playerId: memberId,
          });
        }
      }
      logs.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      res.json(logs);
    } catch (error) {
      console.error("Error fetching team training logs:", error);
      res.status(500).json({ message: "Failed to fetch training logs" });
    }
  });

  app.get("/api/coach/all-training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getCoachTeams(userId, "coach");
      const allPlayers = await storage.getCoachPlayers(userId);
      const enrichedLogs: any[] = [];

      for (const team of teams) {
        const members = await storage.getTeamMembers(team.id);
        const teamPlayers = await storage.getCoachPlayersByTeam(team.id);

        for (const member of members) {
          const memberLogs = await storage.getTrainingLogs(member.userId);
          const matchedPlayer = teamPlayers.find(p => p.linkedUserId === member.userId)
            || allPlayers.find(p => p.linkedUserId === member.userId);

          for (const log of memberLogs) {
            enrichedLogs.push({
              ...log,
              playerName: member.user ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
              playerId: member.userId,
              teamId: team.id,
              teamName: team.name,
              seasonYear: team.seasonYear,
              position: matchedPlayer?.position || member.position || null,
              ageGroup: matchedPlayer?.ageGroup || team.ageGroup || null,
            });
          }
        }
      }

      enrichedLogs.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching all coach training logs:", error);
      res.status(500).json({ message: "Failed to fetch training logs" });
    }
  });

  // ===== TRAINER MODE =====

  // Get trainer's groups
  app.get("/api/trainer/groups", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getCoachTeams(userId, "trainer");
      res.json(teams);
    } catch (error) {
      console.error("Error fetching trainer groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  // Create trainer group
  app.post("/api/trainer/groups", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamCode = generateTeamCode();
      const group = await storage.createTeam({ ...req.body, coachId: userId, teamCode, teamType: "trainer" });
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating trainer group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Update trainer group
  app.put("/api/trainer/groups/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.id);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await storage.updateTeam(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating trainer group:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  // Delete trainer group
  app.delete("/api/trainer/groups/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.id);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trainer group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Get trainer group members
  app.get("/api/trainer/groups/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.id);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const allPlayers = await storage.getTrainerPlayers(userId);
      const members = allPlayers
        .filter(p => p.groups?.some((g: any) => g.groupId === req.params.id))
        .map(p => {
          const groupAssignment = p.groups?.find((g: any) => g.groupId === req.params.id);
          return {
            id: p.id,
            userId: `tp_${p.id}`,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            profileImageUrl: null,
            position: groupAssignment?.position || p.position,
            jerseyNumber: groupAssignment?.jerseyNumber || p.jerseyNumber,
            joinedAt: groupAssignment?.assignedAt,
          };
        });
      res.json(members);
    } catch (error) {
      console.error("Error fetching trainer group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  // Remove member from trainer group
  app.delete("/api/trainer/groups/:groupId/members/:userId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.groupId);
      if (!group || group.coachId !== ownerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const playerId = req.params.userId.replace(/^tp_/, "");
      const assignments = await storage.getTrainerPlayerAssignments(playerId);
      const assignment = assignments.find(a => a.groupId === req.params.groupId);
      if (assignment) {
        await storage.removeTrainerPlayerFromGroup(assignment.id);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing trainer group member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Update trainer group member
  app.put("/api/trainer/groups/:groupId/members/:userId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.groupId);
      if (!group || group.coachId !== ownerId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { position, jerseyNumber } = req.body;
      const playerId = req.params.userId.replace(/^tp_/, "");
      await db.update(trainerPlayerAssignments)
        .set({ position, jerseyNumber })
        .where(and(
          eq(trainerPlayerAssignments.trainerPlayerId, playerId),
          eq(trainerPlayerAssignments.groupId, req.params.groupId)
        ));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating trainer group member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Trainer assign drill
  app.post("/api/trainer/assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { drillId, teamId, assignedTo, dueDate, notes } = req.body;
      if (!drillId) {
        return res.status(400).json({ message: "drillId is required" });
      }
      if (!teamId && !assignedTo) {
        return res.status(400).json({ message: "Either teamId or assignedTo is required" });
      }
      if (teamId) {
        const group = await storage.getTeamById(teamId);
        if (!group || group.coachId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }
      if (assignedTo) {
        const rosterPlayers = await storage.getTrainerPlayers(userId);
        const validIds = new Set<string>();
        for (const p of rosterPlayers) {
          validIds.add(p.id);
          if (p.linkedUserId) validIds.add(p.linkedUserId);
        }
        if (!validIds.has(assignedTo)) {
          return res.status(403).json({ message: "Player is not in your roster" });
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
      if (assignedTo) {
        const drill = await storage.getDrillById(drillId);
        const trainerName = await getDisplayNameForUser(userId);
        let pushTarget = assignedTo;
        const [tp] = await db.select({ linkedUserId: trainerPlayers.linkedUserId }).from(trainerPlayers).where(eq(trainerPlayers.id, assignedTo));
        if (tp?.linkedUserId) pushTarget = tp.linkedUserId;
        sendPushNotification(pushTarget, { title: "New Drill Assigned", body: `${trainerName} assigned you: ${drill?.name || "a new drill"}`, url: "/my-trainer" }).catch(() => {});
      }
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning drill (trainer):", error);
      res.status(500).json({ message: "Failed to assign drill" });
    }
  });

  // Get trainer group assignments
  app.get("/api/trainer/groups/:id/assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.id);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const assignments = await storage.getTeamAssignments(req.params.id);
      res.json(assignments.map(a => ({
        id: a.id,
        drillId: a.drillId,
        drillTitle: a.drill.title,
        teamId: a.teamId,
        assignedBy: a.assignedBy,
        dueDate: a.dueDate,
        notes: a.notes,
        status: a.status,
        createdAt: a.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching trainer group assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Delete trainer assignment
  app.delete("/api/trainer/assignments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignment = await storage.getDrillAssignmentById(req.params.id);
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.assignedBy !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDrillAssignment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trainer assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // ===== PLAYER DETAIL DATA =====
  app.get("/api/trainer/players/:playerId/assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const assignments = await storage.getPlayerDrillAssignments(req.params.playerId, userId);
      res.json(assignments.map(a => ({
        id: a.id,
        drillId: a.drillId,
        drillTitle: a.drill.title,
        drillCategory: a.drill.category,
        teamId: a.teamId,
        teamName: a.teamName,
        assignedTo: a.assignedTo,
        dueDate: a.dueDate,
        notes: a.notes,
        status: a.status,
        trainingLogId: a.trainingLogId || null,
        createdAt: a.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching player assignments:", error);
      res.status(500).json({ message: "Failed to fetch player assignments" });
    }
  });

  // Get all direct player assignments for the trainer (assignedTo is set, no team)
  app.get("/api/trainer/direct-assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getTrainerDirectAssignments(userId);
      res.json(assignments.map(a => ({
        id: a.id,
        drillId: a.drillId,
        drillTitle: a.drill.title,
        drillCategory: a.drill.category,
        assignedTo: a.assignedTo,
        playerRosterId: a.playerRosterId,
        playerName: a.playerName,
        dueDate: a.dueDate,
        notes: a.notes,
        status: a.status,
        createdAt: a.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching trainer direct assignments:", error);
      res.status(500).json({ message: "Failed to fetch direct assignments" });
    }
  });

  app.get("/api/trainer/players/:playerId/videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const videos = await storage.getPlayerSharedVideos(req.params.playerId, userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching player videos:", error);
      res.status(500).json({ message: "Failed to fetch player videos" });
    }
  });

  app.get("/api/trainer/players/:playerId/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const msgs = await storage.getPlayerMessages(req.params.playerId, userId);
      res.json(msgs);
    } catch (error) {
      console.error("Error fetching player messages:", error);
      res.status(500).json({ message: "Failed to fetch player messages" });
    }
  });

  app.get("/api/trainer/players/:playerId/training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const targetUserId = player.linkedUserId || req.params.playerId;
      const logs = await storage.getTrainingLogs(targetUserId);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching player training logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trainer/players/:playerId/training-logs/:logId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const log = await storage.getTrainingLog(req.params.logId);
      if (!log) return res.status(404).json({ message: "Training log not found" });
      const targetUserId = player.linkedUserId || req.params.playerId;
      if (log.userId !== targetUserId) return res.status(403).json({ message: "Log does not belong to this player" });
      const rawMetrics = await storage.getTrainingLogMetrics(req.params.logId);
      const templates = await storage.getMetricTemplates();
      const templateMap = new Map(templates.map(t => [t.id, t.name]));
      const metrics = rawMetrics.map(m => ({ ...m, metricName: templateMap.get(m.metricId) || null }));
      res.json({ ...log, metrics });
    } catch (error: any) {
      console.error("Error fetching player training log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trainer/players/:playerId/sessions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const targetUserId = player.linkedUserId || req.params.playerId;
      const sessions = await storage.getTrainingSessionsForTrainer(userId, {});
      const playerSessions = sessions.filter(s => s.playerId === targetUserId);
      res.json(playerSessions);
    } catch (error: any) {
      console.error("Error fetching player sessions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trainer/players/:playerId/evaluations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.playerId);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const evaluations = await storage.getPlayerEvaluations(req.params.playerId, userId);
      res.json(evaluations);
    } catch (error: any) {
      console.error("Error fetching player evaluations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== TRAINER CUSTOM DRILLS =====
  app.get("/api/trainer/drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const allDrills = await storage.getDrillsForUser(userId);
      const trainerDrills = allDrills.filter(d => d.userId === userId);
      res.json(trainerDrills);
    } catch (error) {
      console.error("Error fetching trainer drills:", error);
      res.status(500).json({ message: "Failed to fetch drills" });
    }
  });

  app.post("/api/trainer/drills", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, category, difficulty, duration, equipment, tips, trackShots } = req.body;
      if (!title || !category) {
        return res.status(400).json({ message: "Title and category are required" });
      }
      const drill = await storage.createDrill({
        title,
        description: description || null,
        category,
        difficulty: difficulty || "beginner",
        duration: duration ? parseInt(duration) : null,
        equipment: equipment || [],
        tips: tips || [],
        trackShots: trackShots || false,
        userId,
        isFeatured: false,
        isShared: false,
        videoUrl: null,
        thumbnailUrl: null,
        pdfUrl: null,
        videoLibraryId: null,
        pdfLibraryId: null,
      });
      res.status(201).json(drill);
    } catch (error) {
      console.error("Error creating trainer drill:", error);
      res.status(500).json({ message: "Failed to create drill" });
    }
  });

  app.put("/api/trainer/drills/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      if (!drill || drill.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { title, description, category, difficulty, duration, equipment, tips, trackShots, videoUrl } = req.body;
      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description || null;
      if (category !== undefined) updateData.category = category;
      if (difficulty !== undefined) updateData.difficulty = difficulty || "beginner";
      if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
      if (equipment !== undefined) updateData.equipment = equipment || [];
      if (tips !== undefined) updateData.tips = tips || [];
      if (trackShots !== undefined) updateData.trackShots = trackShots || false;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl || null;
      const updated = await storage.updateDrill(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating trainer drill:", error);
      res.status(500).json({ message: "Failed to update drill" });
    }
  });

  app.delete("/api/trainer/drills/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const drill = await storage.getDrillById(req.params.id);
      if (!drill || drill.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteDrill(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trainer drill:", error);
      res.status(500).json({ message: "Failed to delete drill" });
    }
  });

  // ===== TRAINER VIDEOS (instructional content) =====

  app.get("/api/trainer/videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const videos = await db.select().from(trainerVideos).where(eq(trainerVideos.trainerId, userId));
      videos.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      res.json(videos);
    } catch (error) {
      console.error("Error fetching trainer videos:", error);
      res.status(500).json({ message: "Failed to fetch trainer videos" });
    }
  });

  app.post("/api/trainer/videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTrainerVideoSchema.parse({ ...req.body, trainerId: userId });
      const [video] = await db.insert(trainerVideos).values(data).returning();
      res.status(201).json(video);
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid video data", errors: error.errors });
      }
      console.error("Error creating trainer video:", error);
      res.status(500).json({ message: "Failed to create trainer video" });
    }
  });

  app.put("/api/trainer/videos/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(trainerVideos).where(eq(trainerVideos.id, req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Video not found" });
      }
      if (existing.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { title, description, category, difficulty, videoUrl, thumbnailUrl, tags } = req.body;
      if (!title || !videoUrl) {
        return res.status(400).json({ message: "Title and video URL are required" });
      }
      const [updated] = await db.update(trainerVideos)
        .set({ title, description: description || null, category: category || null, difficulty: difficulty || null, videoUrl, thumbnailUrl: thumbnailUrl || null, tags: tags || null })
        .where(eq(trainerVideos.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating trainer video:", error);
      res.status(500).json({ message: "Failed to update trainer video" });
    }
  });

  app.delete("/api/trainer/videos/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(trainerVideos).where(eq(trainerVideos.id, req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Video not found" });
      }
      if (existing.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await db.delete(trainerVideos).where(eq(trainerVideos.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trainer video:", error);
      res.status(500).json({ message: "Failed to delete trainer video" });
    }
  });

  // Get trainer group training logs
  app.get("/api/trainer/groups/:id/training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.id);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const members = await storage.getTeamMembers(req.params.id);
      const memberIds = members.map(m => m.userId);
      const logs = [];
      for (const memberId of memberIds) {
        const memberLogs = await storage.getTrainingLogs(memberId);
        const [user] = members.filter(m => m.userId === memberId);
        for (const log of memberLogs) {
          logs.push({
            ...log,
            playerName: user ? `${user.user.firstName || ''} ${user.user.lastName || ''}`.trim() : 'Unknown',
            playerId: memberId,
          });
        }
      }
      logs.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      res.json(logs);
    } catch (error) {
      console.error("Error fetching trainer group training logs:", error);
      res.status(500).json({ message: "Failed to fetch training logs" });
    }
  });

  app.get("/api/trainer/all-training-logs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getCoachTeams(userId, "trainer");
      const allPlayers = await storage.getTrainerPlayers(userId);
      const enrichedLogs: any[] = [];

      for (const group of groups) {
        const members = await storage.getTeamMembers(group.id);
        const groupPlayers = await storage.getTrainerPlayersByGroup(group.id);

        for (const member of members) {
          const memberLogs = await storage.getTrainingLogs(member.userId);
          const matchedPlayer = groupPlayers.find(p => p.linkedUserId === member.userId)
            || allPlayers.find(p => p.linkedUserId === member.userId);

          for (const log of memberLogs) {
            enrichedLogs.push({
              ...log,
              playerName: member.user ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
              playerId: member.userId,
              groupId: group.id,
              groupName: group.name,
              position: matchedPlayer?.position || member.position || null,
              ageGroup: matchedPlayer?.ageGroup || group.ageGroup || null,
            });
          }
        }
      }

      enrichedLogs.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching all trainer training logs:", error);
      res.status(500).json({ message: "Failed to fetch training logs" });
    }
  });

  // ===== MESSAGING =====

  // Get unread count (must be before :partnerId route)
  app.get("/api/messages/unread/count", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Get conversations list (must be before :partnerId route)
  app.get("/api/messages/conversations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get contactable players (must be before :partnerId route)
  app.get("/api/messages/contacts/:mode", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const mode = req.params.mode;
      const teamType = mode === "coach" ? "coach" : "trainer";
      const { search, teamId, position } = req.query;
      const teams = await storage.getCoachTeams(userId, teamType);
      const filteredTeams = teamId ? teams.filter(t => t.id === teamId) : teams;
      const contactsMap = new Map<string, { id: string; name: string; image?: string; teamName: string; teamId: string; position?: string; jerseyNumber?: string; isAppUser: boolean }>();
      for (const team of filteredTeams) {
        const members = await storage.getTeamMembers(team.id);
        for (const member of members) {
          if (member.userId !== userId) {
            if (position && member.position !== position) continue;
            const name = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email || 'Unknown';
            if (search && !name.toLowerCase().includes((search as string).toLowerCase())) continue;
            if (!contactsMap.has(member.userId)) {
              contactsMap.set(member.userId, {
                id: member.userId,
                name,
                image: member.user.profileImageUrl || undefined,
                teamName: team.name,
                teamId: team.id,
                position: member.position || undefined,
                jerseyNumber: member.jerseyNumber || undefined,
                isAppUser: true,
              });
            }
          }
        }
        const coachPlayers = await storage.getCoachPlayersByTeam(team.id);
        for (const cp of coachPlayers) {
          const cpName = `${cp.firstName} ${cp.lastName || ''}`.trim();
          if (position && cp.position !== position && cp.teamPosition !== position) continue;
          if (search && !cpName.toLowerCase().includes((search as string).toLowerCase())) continue;
          const cpKey = cp.linkedUserId || `cp_${cp.id}`;
          if (!contactsMap.has(cpKey)) {
            contactsMap.set(cpKey, {
              id: cp.linkedUserId || `cp_${cp.id}`,
              name: cpName,
              image: undefined,
              teamName: team.name,
              teamId: team.id,
              position: cp.teamPosition || cp.position || undefined,
              jerseyNumber: cp.teamJersey || cp.jerseyNumber || undefined,
              isAppUser: !!cp.linkedUserId,
            });
          }
        }
      }
      if (mode === "trainer") {
        const trainerPlayersList = await storage.getTrainerPlayers(userId);
        for (const tp of trainerPlayersList) {
          const tpName = `${tp.firstName} ${tp.lastName || ''}`.trim();
          if (position && tp.position !== position) continue;
          if (search && !tpName.toLowerCase().includes((search as string).toLowerCase())) continue;

          const resolvedId = await resolveTrainerPlayerId(tp.linkedUserId ? tp.linkedUserId : `tp_${tp.id}`);
          const isAppUser = !resolvedId.startsWith("tp_");

          const tpKey = resolvedId;
          if (!contactsMap.has(tpKey)) {
            const tpAssignments = await storage.getTrainerPlayerAssignments(tp.id);
            const groupName = tpAssignments.length > 0 ? tpAssignments[0].groupName : "Unassigned";
            contactsMap.set(tpKey, {
              id: resolvedId,
              name: tpName,
              image: undefined,
              teamName: groupName,
              teamId: tpAssignments.length > 0 ? tpAssignments[0].groupId : "",
              position: tp.position || undefined,
              jerseyNumber: tp.jerseyNumber || undefined,
              isAppUser,
            });
          }
        }

        // Also include accepted connections that aren't already in the roster
        const allConnections = await storage.getConnectionsForUser(userId);
        const acceptedConnections = allConnections.filter(c => c.status === "accepted");
        for (const conn of acceptedConnections) {
          const otherUserId = conn.playerId === userId ? conn.trainerId : conn.playerId;
          if (contactsMap.has(otherUserId)) continue;
          if (search) {
            const otherUser = await storage.getUser(otherUserId);
            const otherProfile = await storage.getUserProfile(otherUserId);
            const name = otherProfile?.displayName || [otherUser?.firstName, otherUser?.lastName].filter(Boolean).join(" ") || otherUser?.email || "Unknown";
            if (!name.toLowerCase().includes((search as string).toLowerCase())) continue;
            contactsMap.set(otherUserId, {
              id: otherUserId,
              name,
              image: otherProfile?.profilePhotoUrl || otherUser?.profileImageUrl || undefined,
              teamName: "Connection",
              teamId: "",
              isAppUser: true,
            });
          } else {
            const otherUser = await storage.getUser(otherUserId);
            const otherProfile = await storage.getUserProfile(otherUserId);
            const name = otherProfile?.displayName || [otherUser?.firstName, otherUser?.lastName].filter(Boolean).join(" ") || otherUser?.email || "Unknown";
            contactsMap.set(otherUserId, {
              id: otherUserId,
              name,
              image: otherProfile?.profilePhotoUrl || otherUser?.profileImageUrl || undefined,
              teamName: "Connection",
              teamId: "",
              isAppUser: true,
            });
          }
        }
      }

      res.json(Array.from(contactsMap.values()));
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/messages/player-contacts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const contactsMap = new Map<string, { id: string; name: string; image?: string }>();

      const currentUser = await storage.getUser(userId);

      const allTrainerPlayers = await db.select().from(trainerPlayers)
        .where(
          currentUser?.email
            ? or(
                eq(trainerPlayers.linkedUserId, userId),
                eq(trainerPlayers.email, currentUser.email)
              )
            : eq(trainerPlayers.linkedUserId, userId)
        );
      for (const tp of allTrainerPlayers) {
        if (!contactsMap.has(tp.trainerId)) {
          const trainerUser = await storage.getUser(tp.trainerId);
          if (trainerUser) {
            const name = `${trainerUser.firstName || ''} ${trainerUser.lastName || ''}`.trim() || 'Trainer';
            contactsMap.set(tp.trainerId, {
              id: tp.trainerId,
              name,
              image: trainerUser.profileImageUrl || undefined,
            });
          }
        }
      }

      const sessions = await storage.getTrainingSessionsForPlayer(userId);
      for (const session of sessions) {
        if (!contactsMap.has(session.trainerId)) {
          const trainerUser = await storage.getUser(session.trainerId);
          if (trainerUser) {
            const name = `${trainerUser.firstName || ''} ${trainerUser.lastName || ''}`.trim() || 'Trainer';
            contactsMap.set(session.trainerId, {
              id: session.trainerId,
              name,
              image: trainerUser.profileImageUrl || undefined,
            });
          }
        }
      }
      const evaluations = await storage.getSharedEvaluationsForPlayer(userId);
      for (const ev of evaluations) {
        if (!contactsMap.has(ev.trainerId)) {
          const trainerUser = await storage.getUser(ev.trainerId);
          if (trainerUser) {
            const name = `${trainerUser.firstName || ''} ${trainerUser.lastName || ''}`.trim() || 'Trainer';
            contactsMap.set(ev.trainerId, {
              id: ev.trainerId,
              name,
              image: trainerUser.profileImageUrl || undefined,
            });
          }
        }
      }
      res.json(Array.from(contactsMap.values()));
    } catch (error) {
      console.error("Error fetching player contacts:", error);
      res.status(500).json({ message: "Failed to fetch player contacts" });
    }
  });

  // Send a message
  app.post("/api/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      let { receiverId, content, teamId } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ message: "receiverId and content are required" });
      }

      receiverId = await resolveTrainerPlayerId(receiverId);

      const connected = await storage.areConnected(userId, receiverId) || await storage.areConnected(receiverId, userId);
      if (!connected) {
        const hasRosterLink = await db.select({ id: trainerPlayers.id }).from(trainerPlayers)
          .where(and(
            eq(trainerPlayers.trainerId, userId),
            eq(trainerPlayers.linkedUserId, receiverId)
          )).limit(1);
        const hasReverseRosterLink = await db.select({ id: trainerPlayers.id }).from(trainerPlayers)
          .where(and(
            eq(trainerPlayers.trainerId, receiverId),
            eq(trainerPlayers.linkedUserId, userId)
          )).limit(1);
        if (hasRosterLink.length === 0 && hasReverseRosterLink.length === 0) {
          return res.status(403).json({ message: "You must be connected to message this user" });
        }
      }

      const message = await storage.sendMessage({
        senderId: userId,
        receiverId,
        content,
        teamId: teamId || null,
      });
      const senderName = await getDisplayNameForUser(userId);
      sendPushNotification(receiverId, { title: "New Message", body: `${senderName}: ${content.substring(0, 100)}`, url: "/chat" }).catch(() => {});
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.put("/api/messages/:senderId/read", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const senderId = await resolveTrainerPlayerId(req.params.senderId);
      await storage.markMessagesRead(userId, senderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages read:", error);
      res.status(500).json({ message: "Failed to mark messages read" });
    }
  });

  // Get messages with a specific user (must be LAST among /api/messages/* routes)
  app.get("/api/messages/:partnerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const partnerId = await resolveTrainerPlayerId(req.params.partnerId);
      const msgs = await storage.getMessages(userId, partnerId);
      await storage.markMessagesRead(userId, partnerId);
      res.json(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // ===== CHAT THREADS =====

  app.get("/api/chat-threads", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const mode = (req.query.mode as string) || "coach";
      const threads = await storage.getChatThreads(userId, mode);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching chat threads:", error);
      res.status(500).json({ message: "Failed to fetch chat threads" });
    }
  });

  app.post("/api/chat-threads", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const threadSchema = z.object({
        name: z.string().min(1),
        mode: z.string().min(1),
        scopeType: z.string().min(1),
        scopeId: z.string().nullable().optional(),
        memberIds: z.array(z.string()).optional(),
      });
      const parsed = threadSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { name, mode, scopeType, scopeId, memberIds } = parsed.data;
      const thread = await storage.createChatThread({
        name,
        mode,
        scopeType,
        scopeId: scopeId || null,
        ownerId: userId,
      });
      await storage.addChatThreadMember({ threadId: thread.id, userId });
      if (memberIds && Array.isArray(memberIds)) {
        for (const memberId of memberIds) {
          if (memberId !== userId) {
            await storage.addChatThreadMember({ threadId: thread.id, userId: memberId });
          }
        }
      }
      res.status(201).json(thread);
    } catch (error) {
      console.error("Error creating chat thread:", error);
      res.status(500).json({ message: "Failed to create chat thread" });
    }
  });

  app.get("/api/chat-threads/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getChatThreadMembers(req.params.id);
      const thread = await storage.getChatThreadById(req.params.id);
      if (!members.some(m => m.userId === userId) && thread?.ownerId !== userId) {
        return res.status(403).json({ message: "Not a member of this thread" });
      }
      const messages = await storage.getChatThreadMessages(req.params.id);
      const enriched = [];
      for (const msg of messages) {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, msg.senderId));
        enriched.push({
          ...msg,
          senderName: profile?.displayName || "Unknown",
          senderImage: profile?.profileImageUrl || null,
        });
      }
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      res.status(500).json({ message: "Failed to fetch thread messages" });
    }
  });

  app.post("/api/chat-threads/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getChatThreadMembers(req.params.id);
      if (!members.some(m => m.userId === userId)) {
        return res.status(403).json({ message: "Not a member of this thread" });
      }
      const messageSchema = z.object({ content: z.string().min(1) });
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { content } = parsed.data;
      const message = await storage.createChatThreadMessage({
        threadId: req.params.id,
        senderId: userId,
        content,
      });

      const senderName = await getDisplayNameForUser(userId);
      for (const m of members) {
        if (m.userId !== userId) {
          sendPushNotification(m.userId, { title: "New Message", body: `${senderName}: ${content.substring(0, 100)}`, url: "/chat" }).catch(() => {});
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending thread message:", error);
      res.status(500).json({ message: "Failed to send thread message" });
    }
  });

  app.get("/api/chat-threads/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getChatThreadMembers(req.params.id);
      const thread = await storage.getChatThreadById(req.params.id);
      if (!members.some(m => m.userId === userId) && thread?.ownerId !== userId) {
        return res.status(403).json({ message: "Not a member of this thread" });
      }
      const enriched = [];
      for (const m of members) {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, m.userId));
        enriched.push({
          ...m,
          displayName: profile?.displayName || "Unknown",
          profileImageUrl: profile?.profileImageUrl || null,
        });
      }
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching thread members:", error);
      res.status(500).json({ message: "Failed to fetch thread members" });
    }
  });

  app.post("/api/chat-threads/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const thread = await storage.getChatThreadById(req.params.id);
      if (!thread || thread.ownerId !== userId) {
        return res.status(403).json({ message: "Only the thread owner can add members" });
      }
      const memberSchema = z.object({ userId: z.string().min(1), role: z.string().optional() });
      const parsed = memberSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { userId: newUserId, role } = parsed.data;
      const member = await storage.addChatThreadMember({
        threadId: req.params.id,
        userId: newUserId,
        role: role || "member",
      });
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding thread member:", error);
      res.status(500).json({ message: "Failed to add thread member" });
    }
  });

  app.delete("/api/chat-threads/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const thread = await storage.getChatThreadById(req.params.id);
      if (!thread || thread.ownerId !== userId) {
        return res.status(403).json({ message: "Only the thread owner can delete" });
      }
      await storage.deleteChatThread(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat thread:", error);
      res.status(500).json({ message: "Failed to delete chat thread" });
    }
  });

  // ===== PLAYER INVITATIONS =====

  // Get invitations for a team
  app.get("/api/invitations/my", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitations = await storage.getInvitationsByTrainer(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get("/api/invitations/:teamId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.teamId);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized to view team invitations" });
      }
      const invitations = await storage.getTeamInvitations(req.params.teamId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Create invitation (invite player by email)
  app.post("/api/invitations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, email, playerName } = req.body;
      if (!email) {
        return res.status(400).json({ message: "email is required" });
      }
      if (teamId) {
        const team = await storage.getTeamById(teamId);
        if (!team || team.coachId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }
      const invitation = await storage.createInvitation({
        teamId: teamId || null,
        invitedBy: userId,
        email,
        playerName: playerName || null,
      });
      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Delete invitation
  app.delete("/api/invitations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitation = await storage.getInvitationById(req.params.id);
      if (!invitation) return res.status(404).json({ message: "Invitation not found" });
      if (invitation.invitedBy !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteInvitation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  // ===== INVITE (send invite email to join PLAYR1) =====

  const inviteSchema = z.object({
    email: z.string().email("Must be a valid email"),
    message: z.string().optional(),
  });

  app.post("/api/invite", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = inviteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, message } = parsed.data;
      const fromName = await getDisplayNameForUser(userId);
      const sent = await sendInviteEmail(email, fromName, message);
      await storage.createInvitation({
        teamId: null,
        invitedBy: userId,
        email,
        playerName: null,
      });
      res.json({ success: true, emailSent: sent });
    } catch (error) {
      console.error("Error sending invite:", error);
      res.status(500).json({ message: "Failed to send invite" });
    }
  });

  // ===== SHARED VIDEOS (player shares links with coach/trainer) =====

  app.get("/api/shared-videos/:teamId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      const isCoach = team.coachId === userId;
      const members = await storage.getTeamMembers(req.params.teamId);
      const isMember = members.some(m => m.userId === userId);
      if (!isCoach && !isMember) {
        return res.status(403).json({ message: "Not authorized to view shared videos" });
      }
      const assignmentId = req.query.assignmentId as string | undefined;
      const videos = await storage.getSharedVideos(req.params.teamId, assignmentId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching shared videos:", error);
      res.status(500).json({ message: "Failed to fetch shared videos" });
    }
  });

  app.post("/api/shared-videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { teamId, title, videoUrl, description, assignmentId } = req.body;
      if (!teamId || !title || !videoUrl) {
        return res.status(400).json({ message: "teamId, title, and videoUrl are required" });
      }
      const members = await storage.getTeamMembers(teamId);
      const isMember = members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ message: "You must be a member of this team/group to share videos" });
      }
      const video = await storage.createSharedVideo({ userId, teamId, title, videoUrl, description, assignmentId: assignmentId || undefined });
      res.json(video);
    } catch (error) {
      console.error("Error sharing video:", error);
      res.status(500).json({ message: "Failed to share video" });
    }
  });

  app.delete("/api/shared-videos/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteSharedVideo(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Video not found or not authorized" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shared video:", error);
      res.status(500).json({ message: "Failed to delete shared video" });
    }
  });

  app.get("/api/my-shared-videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getUserTeams(userId);
      const allVideos: any[] = [];
      for (const team of teams) {
        const videos = await storage.getSharedVideos(team.teamId);
        const myVideos = videos.filter(v => v.userId === userId);
        allVideos.push(...myVideos.map(v => ({ ...v, teamName: team.team.name })));
      }
      res.json(allVideos);
    } catch (error) {
      console.error("Error fetching my shared videos:", error);
      res.status(500).json({ message: "Failed to fetch shared videos" });
    }
  });

  // ===== AGGREGATED SHARED VIDEOS =====

  app.get("/api/coach/all-videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const teams = await storage.getCoachTeams(userId, "coach");
      const allVideos: any[] = [];
      for (const team of teams) {
        const videos = await storage.getSharedVideos(team.id);
        const members = await storage.getTeamMembers(team.id);
        for (const video of videos) {
          const member = members.find(m => m.userId === video.userId);
          const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, video.userId));
          allVideos.push({
            ...video,
            teamId: team.id,
            teamName: team.name,
            position: member?.position || null,
            ageGroup: team.ageGroup || null,
            playerAge: profile?.age || null,
          });
        }
      }
      allVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(allVideos);
    } catch (error) {
      console.error("Error fetching all coach videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get("/api/trainer/all-videos", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getCoachTeams(userId, "trainer");
      const allVideos: any[] = [];
      for (const group of groups) {
        const videos = await storage.getSharedVideos(group.id);
        const members = await storage.getTeamMembers(group.id);
        for (const video of videos) {
          const member = members.find(m => m.userId === video.userId);
          const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, video.userId));
          allVideos.push({
            ...video,
            groupId: group.id,
            groupName: group.name,
            position: member?.position || null,
            ageGroup: group.ageGroup || null,
            playerAge: profile?.age || null,
          });
        }
      }
      allVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(allVideos);
    } catch (error) {
      console.error("Error fetching all trainer videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // ===== COACH PLAYERS (independent player management) =====

  app.get("/api/coach-players", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const players = await storage.getCoachPlayers(userId);
      const playersWithTeams = [];
      for (const player of players) {
        const assignments = await storage.getCoachPlayerAssignments(player.id);
        playersWithTeams.push({ ...player, teams: assignments });
      }
      res.json(playersWithTeams);
    } catch (error) {
      console.error("Error fetching coach players:", error);
      res.status(500).json({ message: "Failed to fetch coach players" });
    }
  });

  app.post("/api/coach-players", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, email, phone, position, jerseyNumber, ageGroup, notes } = req.body;
      if (!firstName) {
        return res.status(400).json({ message: "First name is required" });
      }
      const player = await storage.createCoachPlayer({
        coachId: userId,
        firstName,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        position: position || null,
        jerseyNumber: jerseyNumber || null,
        ageGroup: ageGroup || null,
        notes: notes || null,
      });
      res.status(201).json(player);
    } catch (error) {
      console.error("Error creating coach player:", error);
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.put("/api/coach-players/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getCoachPlayerById(req.params.id);
      if (!player || player.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await storage.updateCoachPlayer(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating coach player:", error);
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  app.delete("/api/coach-players/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getCoachPlayerById(req.params.id);
      if (!player || player.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteCoachPlayer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting coach player:", error);
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  app.post("/api/coach-players/:id/assign", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getCoachPlayerById(req.params.id);
      if (!player || player.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { teamId, position, jerseyNumber } = req.body;
      if (!teamId) {
        return res.status(400).json({ message: "teamId is required" });
      }
      const team = await storage.getTeamById(teamId);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized to assign to this team" });
      }
      const assignment = await storage.assignCoachPlayerToTeam({
        coachPlayerId: req.params.id,
        teamId,
        position: position || player.position || null,
        jerseyNumber: jerseyNumber || player.jerseyNumber || null,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning player to team:", error);
      res.status(500).json({ message: "Failed to assign player" });
    }
  });

  app.delete("/api/coach-player-assignments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.removeCoachPlayerFromTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  app.get("/api/coach-players/by-team/:teamId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamById(req.params.teamId);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const players = await storage.getCoachPlayersByTeam(req.params.teamId);
      res.json(players);
    } catch (error) {
      console.error("Error fetching team players:", error);
      res.status(500).json({ message: "Failed to fetch team players" });
    }
  });

  // Bulk assign players to team
  app.post("/api/coach-players/bulk-assign", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerIds, teamId } = req.body;
      if (!playerIds?.length || !teamId) {
        return res.status(400).json({ message: "playerIds and teamId are required" });
      }
      const team = await storage.getTeamById(teamId);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const results = [];
      for (const playerId of playerIds) {
        const player = await storage.getCoachPlayerById(playerId);
        if (player && player.coachId === userId) {
          const assignment = await storage.assignCoachPlayerToTeam({
            coachPlayerId: playerId,
            teamId,
            position: player.position || null,
            jerseyNumber: player.jerseyNumber || null,
          });
          results.push(assignment);
        }
      }
      res.status(201).json(results);
    } catch (error) {
      console.error("Error bulk assigning players:", error);
      res.status(500).json({ message: "Failed to bulk assign players" });
    }
  });

  // ===== TRAINER PLAYER MANAGEMENT =====

  app.get("/api/trainer-players", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;

      // Auto-sync: ensure all coachPlayers also exist as trainerPlayers
      const coachPlayersList = await storage.getCoachPlayers(userId);
      const existingTrainerPlayers = await storage.getTrainerPlayers(userId);
      const existingEmails = new Set(existingTrainerPlayers.filter(tp => tp.email).map(tp => tp.email!.toLowerCase()));
      const existingLinkedUserIds = new Set(existingTrainerPlayers.filter(tp => tp.linkedUserId).map(tp => tp.linkedUserId));
      for (const cp of coachPlayersList) {
        const emailMatch = cp.email && existingEmails.has(cp.email.toLowerCase());
        const linkedMatch = cp.linkedUserId && existingLinkedUserIds.has(cp.linkedUserId);
        if (!emailMatch && !linkedMatch) {
          const newTp = await storage.createTrainerPlayer({
            trainerId: userId,
            firstName: cp.firstName,
            lastName: cp.lastName || null,
            email: cp.email || null,
            phone: cp.phone || null,
            position: cp.position || null,
            jerseyNumber: cp.jerseyNumber || null,
            ageGroup: cp.ageGroup || null,
            teamType: cp.teamType || null,
            notes: cp.notes || null,
            linkedUserId: cp.linkedUserId || null,
          });
          // Sync team assignments from coach player
          const cpAssignments = await storage.getCoachPlayerAssignments(cp.id);
          for (const cpa of cpAssignments) {
            await storage.assignPlayerToTeam({
              playerId: newTp.id,
              teamId: cpa.teamId,
              position: cpa.position || null,
              jerseyNumber: cpa.jerseyNumber || null,
            });
          }
        }
      }

      const players = await storage.getTrainerPlayers(userId);
      const playersWithAssignments = [];
      for (const player of players) {
        const groupAssignments = await storage.getTrainerPlayerAssignments(player.id);
        const teamAssignments = await storage.getPlayerTeamAssignments(player.id);
        playersWithAssignments.push({ ...player, groups: groupAssignments, teams: teamAssignments });
      }
      res.json(playersWithAssignments);
    } catch (error) {
      console.error("Error fetching trainer players:", error);
      res.status(500).json({ message: "Failed to fetch trainer players" });
    }
  });

  app.post("/api/trainer-players", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      let { firstName, lastName, email, phone, position, jerseyNumber, ageGroup, teamType, gradYear, notes, teamIds, linkedUserId } = req.body;

      // If linking a real PLAYR1 user, auto-fill their profile data
      if (linkedUserId) {
        // Prevent duplicate — check if this user is already in the trainer's roster
        const existing = await storage.getTrainerPlayers(userId);
        if (existing.some(p => p.linkedUserId === linkedUserId)) {
          return res.status(400).json({ message: "This player is already in your roster" });
        }
        const linkedUser = await storage.getUser(linkedUserId);
        const linkedProfile = await storage.getUserProfile(linkedUserId);
        if (!linkedUser) return res.status(404).json({ message: "User not found" });
        firstName = firstName || linkedUser.firstName || linkedProfile?.displayName || "Unknown";
        lastName = lastName || linkedUser.lastName || null;
        email = email || linkedUser.email || null;
      }

      if (!firstName) {
        return res.status(400).json({ message: "First name is required" });
      }
      const player = await storage.createTrainerPlayer({
        trainerId: userId,
        firstName,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        position: position || null,
        jerseyNumber: jerseyNumber || null,
        ageGroup: ageGroup || null,
        teamType: teamType || null,
        gradYear: gradYear && gradYear !== "none" ? parseInt(gradYear, 10) : null,
        notes: notes || null,
        linkedUserId: linkedUserId || null,
      });

      const autoAssignedTeams: string[] = [];
      const uniqueTeamIds = teamIds && Array.isArray(teamIds) ? [...new Set(teamIds as string[])] : [];
      if (uniqueTeamIds.length > 0) {
        for (const teamId of uniqueTeamIds) {
          try {
            const team = await storage.getTeamById(teamId);
            if (team && team.coachId === userId) {
              await storage.assignPlayerToTeam({
                playerId: player.id,
                teamId,
                position: position || null,
                jerseyNumber: jerseyNumber || null,
              });
              autoAssignedTeams.push(team.name);
            }
          } catch (assignErr) {
            console.error(`Failed to auto-assign player to team ${teamId}:`, assignErr);
          }
        }
      }

      const autoAssignedGroups: string[] = [];
      if (position) {
        const positionGroupMap: Record<string, string[]> = {
          "PG": ["PG", "Guard"],
          "SG": ["SG", "Guard", "Wing"],
          "SF": ["SF", "Wing", "Forward"],
          "PF": ["PF", "Forward", "Big"],
          "C": ["C", "Big"],
        };
        const groupNames = positionGroupMap[position] || [];
        if (groupNames.length > 0) {
          const existingGroups = await storage.getCoachTeams(userId, "trainer");
          for (const groupName of groupNames) {
            let group = existingGroups.find(g => g.name === groupName);
            if (!group) {
              const teamCode = generateTeamCode();
              group = await storage.createTeam({
                name: groupName,
                coachId: userId,
                teamCode,
                teamType: "trainer",
                description: `Auto-created ${groupName} position group`,
              });
              existingGroups.push(group);
            }
            try {
              await storage.assignTrainerPlayerToGroup({
                trainerPlayerId: player.id,
                groupId: group.id,
                position: position,
                jerseyNumber: jerseyNumber || null,
              });
              autoAssignedGroups.push(groupName);
            } catch (assignErr) {
              console.error(`Failed to auto-assign player to ${groupName}:`, assignErr);
            }
          }
        }
      }

      res.status(201).json({ ...player, autoAssignedGroups, autoAssignedTeams });
    } catch (error) {
      console.error("Error creating trainer player:", error);
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.put("/api/trainer-players/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.id);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const newPosition = req.body.position || null;
      const oldPosition = player.position;
      const updateData = { ...req.body };
      if (updateData.gradYear !== undefined) {
        updateData.gradYear = updateData.gradYear && updateData.gradYear !== "none" ? parseInt(updateData.gradYear, 10) : null;
      }
      const updated = await storage.updateTrainerPlayer(req.params.id, updateData);

      const autoAssignedGroups: string[] = [];
      if (newPosition && newPosition !== oldPosition) {
        const positionGroupMap: Record<string, string[]> = {
          "PG": ["PG", "Guard"],
          "SG": ["SG", "Guard", "Wing"],
          "SF": ["SF", "Wing", "Forward"],
          "PF": ["PF", "Forward", "Big"],
          "C": ["C", "Big"],
        };
        const groupNames = positionGroupMap[newPosition] || [];
        if (groupNames.length > 0) {
          const existingGroups = await storage.getCoachTeams(userId, "trainer");
          const existingAssignments = await storage.getTrainerPlayerAssignments(req.params.id);
          const assignedGroupIds = new Set(existingAssignments.map(a => a.groupId));

          for (const groupName of groupNames) {
            let group = existingGroups.find(g => g.name === groupName);
            if (!group) {
              const teamCode = generateTeamCode();
              group = await storage.createTeam({
                name: groupName,
                coachId: userId,
                teamCode,
                teamType: "trainer",
                description: `Auto-created ${groupName} position group`,
              });
              existingGroups.push(group);
            }
            if (!assignedGroupIds.has(group.id)) {
              try {
                await storage.assignTrainerPlayerToGroup({
                  trainerPlayerId: req.params.id,
                  groupId: group.id,
                  position: newPosition,
                  jerseyNumber: req.body.jerseyNumber || null,
                });
                autoAssignedGroups.push(groupName);
              } catch (assignErr) {
                console.error(`Failed to auto-assign player to ${groupName}:`, assignErr);
              }
            }
          }
        }
      }

      res.json({ ...updated, autoAssignedGroups });
    } catch (error) {
      console.error("Error updating trainer player:", error);
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  app.delete("/api/trainer-players/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.id);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteTrainerPlayer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trainer player:", error);
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  app.post("/api/trainer-players/:id/assign", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.id);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { groupId, position, jerseyNumber } = req.body;
      if (!groupId) {
        return res.status(400).json({ message: "groupId is required" });
      }
      const group = await storage.getTeamById(groupId);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized to assign to this group" });
      }
      const assignment = await storage.assignTrainerPlayerToGroup({
        trainerPlayerId: req.params.id,
        groupId,
        position: position || player.position || null,
        jerseyNumber: jerseyNumber || player.jerseyNumber || null,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning trainer player to group:", error);
      res.status(500).json({ message: "Failed to assign player" });
    }
  });

  app.delete("/api/trainer-player-assignments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignment = await storage.getTrainerPlayerAssignmentById(req.params.id);
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      const group = await storage.getTeamById(assignment.groupId);
      if (!group || group.coachId !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.removeTrainerPlayerFromGroup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing trainer assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  app.get("/api/trainer-players/by-group/:groupId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getTeamById(req.params.groupId);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const players = await storage.getTrainerPlayersByGroup(req.params.groupId);
      res.json(players);
    } catch (error) {
      console.error("Error fetching group players:", error);
      res.status(500).json({ message: "Failed to fetch group players" });
    }
  });

  app.post("/api/trainer-players/bulk-assign", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerIds, groupId } = req.body;
      if (!playerIds?.length || !groupId) {
        return res.status(400).json({ message: "playerIds and groupId are required" });
      }
      const group = await storage.getTeamById(groupId);
      if (!group || group.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const results = [];
      for (const playerId of playerIds) {
        const player = await storage.getTrainerPlayerById(playerId);
        if (player && player.trainerId === userId) {
          const assignment = await storage.assignTrainerPlayerToGroup({
            trainerPlayerId: playerId,
            groupId,
            position: player.position || null,
            jerseyNumber: player.jerseyNumber || null,
          });
          results.push(assignment);
        }
      }
      res.status(201).json(results);
    } catch (error) {
      console.error("Error bulk assigning trainer players:", error);
      res.status(500).json({ message: "Failed to bulk assign players" });
    }
  });

  // ===== PLAYER-TEAM ASSIGNMENTS (Unified) =====

  app.post("/api/trainer-players/:id/assign-team", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const player = await storage.getTrainerPlayerById(req.params.id);
      if (!player || player.trainerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { teamId, position, jerseyNumber } = req.body;
      if (!teamId) {
        return res.status(400).json({ message: "teamId is required" });
      }
      const team = await storage.getTeamById(teamId);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized for this team" });
      }
      const assignment = await storage.assignPlayerToTeam({
        playerId: player.id,
        teamId,
        position: position || null,
        jerseyNumber: jerseyNumber || null,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning player to team:", error);
      res.status(500).json({ message: "Failed to assign player to team" });
    }
  });

  app.delete("/api/player-team-assignments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignment = await storage.getPlayerTeamAssignmentById(req.params.id);
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      if (assignment.playerId !== userId) {
        const group = await storage.getTeamById(assignment.teamId);
        if (!group || group.coachId !== userId) return res.status(403).json({ message: "Not authorized" });
      }
      await storage.removePlayerFromTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing player-team assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  app.post("/api/trainer-players/bulk-assign-team", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerIds, teamId } = req.body;
      if (!playerIds?.length || !teamId) {
        return res.status(400).json({ message: "playerIds and teamId are required" });
      }
      const team = await storage.getTeamById(teamId);
      if (!team || team.coachId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      for (const playerId of playerIds) {
        const player = await storage.getTrainerPlayerById(playerId);
        if (player && player.trainerId === userId) {
          await storage.assignPlayerToTeam({
            playerId,
            teamId,
            position: player.position || null,
            jerseyNumber: player.jerseyNumber || null,
          });
        }
      }
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error bulk assigning players to team:", error);
      res.status(500).json({ message: "Failed to bulk assign players to team" });
    }
  });

  // ===== TEAM & LEAGUE FINDER =====

  // Get team clubs with optional filters
  app.get("/api/team-clubs", async (req, res) => {
    try {
      const { type, state, city, ageGroup, gender, circuit, query, lat, lng, radius } = req.query;
      let clubs = await storage.getTeamClubs({
        organizationType: type as string | undefined,
        state: (!lat || !lng) ? state as string | undefined : undefined,
        city: (!lat || !lng) ? city as string | undefined : undefined,
        ageGroup: ageGroup as string | undefined,
        gender: gender as string | undefined,
        circuit: circuit as string | undefined,
        query: query as string | undefined,
      });
      if (lat && lng && radius) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const maxDist = parseFloat(radius as string);
        if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(maxDist)) {
          clubs = clubs.filter(c => {
            if (c.latitude == null || c.longitude == null) return true;
            return haversineDistance(userLat, userLng, c.latitude, c.longitude) <= maxDist;
          });
        }
      }
      res.json(clubs);
    } catch (error) {
      console.error("Error fetching team clubs:", error);
      res.status(500).json({ message: "Failed to fetch team clubs" });
    }
  });

  // Get single team club by slug
  app.get("/api/team-clubs/by-slug/:slug", async (req, res) => {
    try {
      const club = await storage.getTeamClubBySlug(req.params.slug);
      if (!club) return res.status(404).json({ message: "Team not found" });
      res.json(club);
    } catch (error) {
      console.error("Error fetching team club:", error);
      res.status(500).json({ message: "Failed to fetch team club" });
    }
  });

  // Get single team club by ID
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
  app.post("/api/team-clubs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const slug = req.body.slug || generateSlug(req.body.name);
      let latitude = req.body.latitude ?? null;
      let longitude = req.body.longitude ?? null;
      if ((latitude == null || longitude == null) && req.body.city && req.body.state) {
        const coords = cityStateToCoords(req.body.city, req.body.state);
        if (coords) { latitude = coords.latitude; longitude = coords.longitude; }
      }
      const data = insertTeamClubSchema.parse({ ...req.body, slug, createdByUserId: userId, latitude, longitude });
      const club = await storage.createTeamClub(data);
      res.status(201).json(club);
    } catch (error: any) {
      console.error("Error creating team club:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: error.errors });
      res.status(500).json({ message: "Failed to create team club" });
    }
  });

  // Delete team club (owner only)
  app.delete("/api/team-clubs/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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
      const { type, state, city, ageGroup, season, query, lat, lng, radius } = req.query;
      let result = await storage.getLeagues({
        leagueType: type as string | undefined,
        state: (!lat || !lng) ? state as string | undefined : undefined,
        city: (!lat || !lng) ? city as string | undefined : undefined,
        ageGroup: ageGroup as string | undefined,
        season: season as string | undefined,
        query: query as string | undefined,
      });
      if (lat && lng && radius) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const maxDist = parseFloat(radius as string);
        if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(maxDist)) {
          result = result.filter(l => {
            if (l.latitude == null || l.longitude == null) return true;
            return haversineDistance(userLat, userLng, l.latitude, l.longitude) <= maxDist;
          });
        }
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ message: "Failed to fetch leagues" });
    }
  });

  // Get single league by slug
  app.get("/api/leagues/by-slug/:slug", async (req, res) => {
    try {
      const league = await storage.getLeagueBySlug(req.params.slug);
      if (!league) return res.status(404).json({ message: "League not found" });
      res.json(league);
    } catch (error) {
      console.error("Error fetching league:", error);
      res.status(500).json({ message: "Failed to fetch league" });
    }
  });

  // Get single league by ID
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
  app.post("/api/leagues", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const slug = req.body.slug || generateSlug(req.body.name);
      let latitude = req.body.latitude ?? null;
      let longitude = req.body.longitude ?? null;
      if ((latitude == null || longitude == null) && req.body.city && req.body.state) {
        const coords = cityStateToCoords(req.body.city, req.body.state);
        if (coords) { latitude = coords.latitude; longitude = coords.longitude; }
      }
      const data = insertLeagueSchema.parse({ ...req.body, slug, createdByUserId: userId, latitude, longitude });
      const league = await storage.createLeague(data);
      res.status(201).json(league);
    } catch (error: any) {
      console.error("Error creating league:", error);
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: error.errors });
      res.status(500).json({ message: "Failed to create league" });
    }
  });

  // Delete league (owner only)
  app.delete("/api/leagues/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
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

  // Trainer Profile (own profile)
  app.get("/api/trainer-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (profile && (!profile.profilePhotoUrl || !profile.city || !profile.state)) {
        const userProfile = await storage.getUserProfile(userId);
        if (userProfile) {
          const backfill: any = {};
          if (!profile.profilePhotoUrl && userProfile.profilePhotoUrl) {
            (profile as any).profilePhotoUrl = userProfile.profilePhotoUrl;
            backfill.profilePhotoUrl = userProfile.profilePhotoUrl;
          }
          if (!profile.city && userProfile.city) {
            (profile as any).city = userProfile.city;
            backfill.city = userProfile.city;
          }
          if (!profile.state && userProfile.state) {
            (profile as any).state = userProfile.state;
            backfill.state = userProfile.state;
          }
          if (Object.keys(backfill).length > 0) {
            await db.update(trainerProfiles)
              .set(backfill)
              .where(eq(trainerProfiles.userId, userId))
              .execute();
          }
        }
      }
      res.json(profile || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/trainer-profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { headline, bio, specialties, city, state, hourlyRate, sessionTypes, equipment,
              experienceYears, certifications, availability, contactEmail,
              contactPhone, socialInstagram, socialTwitter, website, isPublic, profilePhotoUrl } = req.body;
      const data: any = {
        userId,
        headline: headline || null,
        bio: bio || null,
        specialties: Array.isArray(specialties) ? specialties : null,
        city: city || null,
        state: state || null,
        hourlyRate: hourlyRate != null ? Number(hourlyRate) : null,
        sessionTypes: Array.isArray(sessionTypes) ? sessionTypes : null,
        equipment: Array.isArray(equipment) ? equipment : null,
        experienceYears: experienceYears != null ? Number(experienceYears) : null,
        certifications: certifications || null,
        availability: availability || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        socialInstagram: socialInstagram || null,
        socialTwitter: socialTwitter || null,
        website: website || null,
        isPublic: !!isPublic,
        profilePhotoUrl: profilePhotoUrl || null,
      };
      if (isNaN(data.hourlyRate as number)) data.hourlyRate = null;
      if (isNaN(data.experienceYears as number)) data.experienceYears = null;
      const profile = await storage.upsertTrainerProfile(data);

      const sharedUpdates: any = { updatedAt: new Date() };
      if (data.profilePhotoUrl !== undefined) sharedUpdates.profilePhotoUrl = data.profilePhotoUrl;
      if (data.city !== undefined) sharedUpdates.city = data.city;
      if (data.state !== undefined) sharedUpdates.state = data.state;
      if (Object.keys(sharedUpdates).length > 1) {
        await db.insert(userProfiles)
          .values({ userId, ...sharedUpdates } as any)
          .onConflictDoUpdate({ target: userProfiles.userId, set: sharedUpdates })
          .execute();
      }

      if (data.profilePhotoUrl !== undefined) {
        await db.update(users)
          .set({ profileImageUrl: data.profilePhotoUrl })
          .where(eq(users.id, userId));
      }

      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== TRAINING LOCATIONS (Admin CRUD + authenticated read) =====
  app.get("/api/training-locations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const locations = await storage.getTrainingLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/training-locations", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertTrainingLocationSchema.parse(req.body);
      const location = await storage.createTrainingLocation(data);
      res.status(201).json(location);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/training-locations/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertTrainingLocationSchema.partial().parse(req.body);
      const location = await storage.updateTrainingLocation(req.params.id, data);
      if (!location) return res.status(404).json({ message: "Location not found" });
      res.json(location);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/training-locations/:id", isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteTrainingLocation(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== TRAINER PROFILE LOCATIONS =====
  app.post("/api/trainer-profile/locations/create", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (!profile) return res.status(400).json({ message: "Create a trainer profile first" });
      const data = insertTrainingLocationSchema.parse(req.body);
      const location = await storage.createTrainingLocation(data);
      const link = await storage.createTrainerProfileLocation({
        trainerProfileId: profile.id,
        locationId: location.id,
        availability: null,
      });
      res.status(201).json({ location, link });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/trainer-profile/locations/edit/:locationId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (!profile) return res.status(403).json({ message: "Forbidden" });
      const profileLocs = await storage.getTrainerProfileLocations(profile.id);
      const isLinked = profileLocs.some(pl => pl.locationId === req.params.locationId);
      if (!isLinked) return res.status(403).json({ message: "You can only edit locations linked to your profile" });
      const data = insertTrainingLocationSchema.partial().parse(req.body);
      const location = await storage.updateTrainingLocation(req.params.locationId, data);
      if (!location) return res.status(404).json({ message: "Location not found" });
      res.json(location);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trainer-profile/locations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (!profile) return res.json([]);
      const locations = await storage.getTrainerProfileLocations(profile.id);
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trainer-profile/locations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (!profile) return res.status(400).json({ message: "Create a trainer profile first" });
      const { locationId, availability } = req.body;
      if (!locationId) return res.status(400).json({ message: "locationId is required" });
      const locationExists = await storage.getTrainingLocationById(locationId);
      if (!locationExists) return res.status(400).json({ message: "Location not found" });
      const link = await storage.createTrainerProfileLocation({
        trainerProfileId: profile.id,
        locationId,
        availability: availability || null,
      });
      res.status(201).json(link);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/trainer-profile/locations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (!profile) return res.status(403).json({ message: "Forbidden" });
      const existing = await storage.getTrainerProfileLocationById(req.params.id);
      if (!existing || existing.trainerProfileId !== profile.id) return res.status(404).json({ message: "Not found" });
      const { availability } = req.body;
      const updated = await storage.updateTrainerProfileLocation(req.params.id, { availability });
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/trainer-profile/locations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTrainerProfile(userId);
      if (!profile) return res.status(403).json({ message: "Forbidden" });
      const existing = await storage.getTrainerProfileLocationById(req.params.id);
      if (!existing || existing.trainerProfileId !== profile.id) return res.status(404).json({ message: "Not found" });
      await storage.deleteTrainerProfileLocation(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== TRAINING SESSIONS / SCHEDULING =====

  app.post("/api/training-sessions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const sessionSchema = z.object({
        trainerProfileId: z.string().min(1),
        locationId: z.string().nullish(),
        sessionDate: z.string().min(1),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        playerNotes: z.string().nullish(),
        sessionType: z.string().nullish(),
      });
      const parsed = sessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { trainerProfileId, locationId, sessionDate, startTime, endTime, playerNotes, sessionType } = parsed.data;
      if (startTime >= endTime) {
        return res.status(400).json({ message: "startTime must be before endTime" });
      }

      function timeToMinutes(t: string): number {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      }
      const startMin = timeToMinutes(startTime);
      const endMin = timeToMinutes(endTime);
      if (startMin % 15 !== 0 || endMin % 15 !== 0) {
        return res.status(400).json({ message: "Session times must be in 15-minute increments" });
      }

      if (locationId) {
        const loc = await storage.getTrainingLocationById(locationId);
        if (!loc) return res.status(400).json({ message: "Invalid location" });
      }
      const trainerProfile = await storage.getTrainerProfileById(trainerProfileId);
      if (!trainerProfile) return res.status(404).json({ message: "Trainer profile not found" });

      const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const requestedDay = DAYS[new Date(sessionDate + "T12:00:00").getDay()];

      let availabilityRaw: string | null = null;
      if (locationId) {
        const profileLocs = await storage.getTrainerProfileLocations(trainerProfile.id);
        const matched = profileLocs.find(pl => pl.locationId === locationId);
        if (matched?.availability) availabilityRaw = matched.availability;
        else availabilityRaw = trainerProfile.availability;
      } else {
        availabilityRaw = trainerProfile.availability;
      }

      if (availabilityRaw) {
        try {
          const avail = JSON.parse(availabilityRaw);
          if (Array.isArray(avail) && avail.length > 0) {
            const dayEntry = avail.find((a: any) => a.day === requestedDay && a.enabled !== false);
            if (!dayEntry) {
              return res.status(400).json({ message: `Trainer is not available on ${requestedDay}` });
            }

            const sessions = Array.isArray(dayEntry.sessions) ? dayEntry.sessions : (dayEntry.start && dayEntry.end ? [{ start: dayEntry.start, end: dayEntry.end }] : []);
            function parseSlotTime(t: string): number {
              const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
              if (!match) return -1;
              let h = parseInt(match[1]);
              const m = parseInt(match[2]);
              const ampm = match[3]?.toUpperCase();
              if (ampm === "PM" && h < 12) h += 12;
              if (ampm === "AM" && h === 12) h = 0;
              return h * 60 + m;
            }

            if (sessions.length > 0) {
              const fitsWindow = sessions.some((s: any) => {
                const wStart = parseSlotTime(s.start);
                const wEnd = parseSlotTime(s.end);
                return startMin >= wStart && endMin <= wEnd;
              });
              if (!fitsWindow) {
                return res.status(400).json({ message: "Requested time is outside trainer's available hours" });
              }
            }
          }
        } catch {}
      }

      const session = await storage.createTrainingSession({
        trainerId: trainerProfile.userId,
        playerId,
        trainerProfileId,
        locationId: locationId || null,
        sessionDate,
        startTime,
        endTime,
        status: "requested",
        playerNotes: playerNotes || null,
        trainerNotes: null,
        declineReason: null,
        sessionType: sessionType || null,
        createdBy: playerId,
      });

      const trainerEmail = await getEmailForUser(trainerProfile.userId);
      if (trainerEmail) {
        const emailData = await getSessionEmailData(session);
        sendSessionRequestedEmail(trainerEmail, { ...emailData, requesterRole: "player" }).catch(() => {});
      }
      const reqName = await getDisplayNameForUser(playerId);
      sendPushNotification(trainerProfile.userId, { title: "Session Request", body: `${reqName} requested a training session`, url: "/trainer/schedule" }).catch(() => {});

      res.status(201).json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/training-sessions/group", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const trainerProfile = await storage.getTrainerProfile(trainerId);
      if (!trainerProfile) return res.status(403).json({ message: "Trainer profile required" });

      const groupSessionSchema = z.object({
        playerIds: z.array(z.string().min(1)).min(1, "At least one player is required"),
        locationId: z.string().optional(),
        sessionDate: z.string().min(1),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        trainerNotes: z.string().optional(),
        sessionType: z.string().optional(),
      });
      const parsed = groupSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { playerIds, locationId, sessionDate, startTime, endTime, trainerNotes, sessionType } = parsed.data;
      if (startTime >= endTime) {
        return res.status(400).json({ message: "startTime must be before endTime" });
      }
      function timeToMinutes(t: string): number {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      }
      const startMin = timeToMinutes(startTime);
      const endMin = timeToMinutes(endTime);
      if (startMin % 15 !== 0 || endMin % 15 !== 0) {
        return res.status(400).json({ message: "Session times must be in 15-minute increments" });
      }
      if (locationId) {
        const loc = await storage.getTrainingLocationById(locationId);
        if (!loc) return res.status(400).json({ message: "Invalid location" });
      }

      const rosterPlayers = await storage.getTrainerPlayers(trainerId);
      const linkedUserIds = new Set(rosterPlayers.filter(p => p.linkedUserId).map(p => p.linkedUserId));
      const invalidIds = playerIds.filter((pid: string) => !linkedUserIds.has(pid));
      if (invalidIds.length > 0) {
        return res.status(403).json({ message: "One or more players are not in your roster" });
      }

      const groupSessionId = playerIds.length > 1 ? crypto.randomUUID() : null;

      const sessions = [];
      for (const playerId of playerIds) {
        const session = await storage.createTrainingSession({
          trainerId,
          playerId,
          trainerProfileId: trainerProfile.id,
          locationId: locationId || null,
          sessionDate,
          startTime,
          endTime,
          status: "requested",
          playerNotes: null,
          trainerNotes: trainerNotes || null,
          declineReason: null,
          sessionType: sessionType || null,
          groupSessionId,
          createdBy: trainerId,
        });
        sessions.push(session);

        const playerEmail = await getEmailForUser(playerId);
        if (playerEmail) {
          const emailData = await getSessionEmailData(session);
          sendSessionRequestedEmail(playerEmail, { ...emailData, requesterRole: "trainer" }).catch(() => {});
        }
        const tName = await getDisplayNameForUser(trainerId);
        sendPushNotification(playerId, { title: "Session Request", body: `${tName} wants to schedule a training session`, url: "/my-trainer" }).catch(() => {});
      }
      res.status(201).json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training-sessions/player", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.from) filters.from = req.query.from as string;
      if (req.query.to) filters.to = req.query.to as string;
      const sessions = await storage.getTrainingSessionsForPlayer(playerId, filters);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training-sessions/trainer", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.from) filters.from = req.query.from as string;
      if (req.query.to) filters.to = req.query.to as string;
      const sessions = await storage.getTrainingSessionsForTrainer(trainerId, filters);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training-sessions/trainer/enriched", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.from) filters.from = req.query.from as string;
      if (req.query.to) filters.to = req.query.to as string;
      const sessions = await storage.getTrainingSessionsForTrainer(trainerId, filters);
      const playerIds = [...new Set(sessions.map(s => s.playerId))];
      const playerNames: Record<string, string> = {};
      if (playerIds.length > 0) {
        const usersData = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, playerIds));
        for (const u of usersData) {
          playerNames[u.id] = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
        }
      }
      const locationIds = [...new Set(sessions.filter(s => s.locationId).map(s => s.locationId!))];
      const locationNames: Record<string, string> = {};
      if (locationIds.length > 0) {
        const locs = await storage.getTrainingLocationsByIds(locationIds);
        for (const loc of locs) locationNames[loc.id] = loc.name;
      }
      const groupInfo: Record<string, { count: number; playerNames: string[] }> = {};
      for (const s of sessions) {
        if (s.groupSessionId) {
          if (!groupInfo[s.groupSessionId]) groupInfo[s.groupSessionId] = { count: 0, playerNames: [] };
          groupInfo[s.groupSessionId].count++;
          groupInfo[s.groupSessionId].playerNames.push(playerNames[s.playerId] || 'Unknown');
        }
      }
      const enriched = sessions.map(s => ({
        ...s,
        playerName: playerNames[s.playerId] || 'Unknown',
        locationName: s.locationId ? (locationNames[s.locationId] || null) : null,
        groupPlayerCount: s.groupSessionId ? (groupInfo[s.groupSessionId]?.count || 1) : 1,
        groupPlayerNames: s.groupSessionId ? (groupInfo[s.groupSessionId]?.playerNames || []) : [],
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training-sessions/player/enriched", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.from) filters.from = req.query.from as string;
      if (req.query.to) filters.to = req.query.to as string;
      const playerSessions = await storage.getTrainingSessionsForPlayer(userId, filters);
      const trainerSessions = await storage.getTrainingSessionsForTrainer(userId, filters);
      const sessionMap = new Map<string, typeof playerSessions[0]>();
      for (const s of playerSessions) sessionMap.set(s.id, s);
      for (const s of trainerSessions) sessionMap.set(s.id, s);
      const sessions = [...sessionMap.values()].sort((a, b) =>
        b.sessionDate.localeCompare(a.sessionDate) || b.startTime.localeCompare(a.startTime)
      );
      const trainerProfileIds = [...new Set(sessions.map(s => s.trainerProfileId))];
      const trainerInfo: Record<string, { name: string; profilePhotoUrl: string | null }> = {};
      if (trainerProfileIds.length > 0) {
        const tps = await storage.getTrainerProfilesByIds(trainerProfileIds);
        for (const tp of tps) trainerInfo[tp.id] = { name: `${tp.firstName || ''} ${tp.lastName || ''}`.trim() || 'Trainer', profilePhotoUrl: tp.profilePhotoUrl };
      }
      const locationIds = [...new Set(sessions.filter(s => s.locationId).map(s => s.locationId!))];
      const locationNames: Record<string, string> = {};
      if (locationIds.length > 0) {
        const locs = await storage.getTrainingLocationsByIds(locationIds);
        for (const loc of locs) locationNames[loc.id] = loc.name;
      }
      const groupCounts: Record<string, number> = {};
      for (const s of sessions) {
        if (s.groupSessionId) {
          groupCounts[s.groupSessionId] = (groupCounts[s.groupSessionId] || 0) + 1;
        }
      }
      const enriched = sessions.map(s => ({
        ...s,
        trainerName: trainerInfo[s.trainerProfileId]?.name || 'Trainer',
        trainerPhotoUrl: trainerInfo[s.trainerProfileId]?.profilePhotoUrl || null,
        locationName: s.locationId ? (locationNames[s.locationId] || null) : null,
        groupPlayerCount: s.groupSessionId ? (groupCounts[s.groupSessionId] || 1) : 1,
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training-sessions/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== userId && session.playerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/training-sessions/:id/confirm", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== userId && session.playerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (session.status !== "requested") return res.status(400).json({ message: "Session is not in requested status" });
      const { trainerNotes } = req.body || {};
      const updateData: any = { status: "confirmed" };
      if (trainerNotes) updateData.trainerNotes = trainerNotes;
      const updated = await storage.updateTrainingSession(req.params.id, updateData);

      const otherUserId = userId === session.trainerId ? session.playerId : session.trainerId;
      const otherEmail = await getEmailForUser(otherUserId);
      if (otherEmail) {
        const emailData = await getSessionEmailData(updated);
        const confirmedBy = await getDisplayNameForUser(userId);
        sendSessionConfirmedEmail(otherEmail, { ...emailData, confirmedBy }).catch(() => {});
      }
      const confirmerName = await getDisplayNameForUser(userId);
      sendPushNotification(otherUserId, { title: "Session Confirmed", body: `Your session with ${confirmerName} has been confirmed`, url: userId === session.trainerId ? "/my-trainer" : "/trainer/schedule" }).catch(() => {});

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/training-sessions/:id/decline", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== trainerId) return res.status(403).json({ message: "Forbidden" });
      if (session.status !== "requested") return res.status(400).json({ message: "Session is not in requested status" });
      const { declineReason } = req.body || {};
      const updated = await storage.updateTrainingSession(req.params.id, {
        status: "declined",
        declineReason: declineReason || null,
      });

      const playerEmail = await getEmailForUser(session.playerId);
      if (playerEmail) {
        const emailData = await getSessionEmailData(updated);
        sendSessionDeclinedEmail(playerEmail, { ...emailData, declineReason: declineReason || undefined }).catch(() => {});
      }
      const declinerName = await getDisplayNameForUser(trainerId);
      sendPushNotification(session.playerId, { title: "Session Declined", body: `${declinerName} declined your session request`, url: "/my-trainer" }).catch(() => {});

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/training-sessions/:id/cancel", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== userId && session.playerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ message: "Cannot cancel this session" });
      }
      const updated = await storage.updateTrainingSession(req.params.id, { status: "cancelled" });

      const otherUserId = userId === session.trainerId ? session.playerId : session.trainerId;
      const otherEmail = await getEmailForUser(otherUserId);
      if (otherEmail) {
        const emailData = await getSessionEmailData(updated);
        const cancelledBy = await getDisplayNameForUser(userId);
        sendSessionCancelledEmail(otherEmail, { ...emailData, cancelledBy }).catch(() => {});
      }
      const cancellerName = await getDisplayNameForUser(userId);
      sendPushNotification(otherUserId, { title: "Session Cancelled", body: `${cancellerName} cancelled the training session`, url: userId === session.trainerId ? "/my-trainer" : "/trainer/schedule" }).catch(() => {});

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/training-sessions/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== userId && session.playerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (session.status === "completed") {
        return res.status(400).json({ message: "Cannot delete a completed session" });
      }
      await storage.deleteTrainingSession(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/training-sessions/:id/reschedule", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== userId && session.playerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (session.status === "completed" || session.status === "cancelled" || session.status === "declined") {
        return res.status(400).json({ message: "Cannot reschedule this session" });
      }
      const rescheduleSchema = z.object({
        sessionDate: z.string().optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        locationId: z.string().optional(),
        sessionType: z.string().optional(),
      });
      const parsed = rescheduleSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { sessionDate, startTime, endTime, locationId, sessionType } = parsed.data;
      if (!sessionDate && !startTime && !endTime && locationId === undefined && !sessionType) {
        return res.status(400).json({ message: "At least one field to update is required" });
      }
      const newDate = sessionDate || session.sessionDate;
      const newStart = startTime || session.startTime;
      const newEnd = endTime || session.endTime;
      if (newStart >= newEnd) {
        return res.status(400).json({ message: "startTime must be before endTime" });
      }
      function timeToMinutes(t: string): number {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      }
      const startMin = timeToMinutes(newStart);
      const endMin = timeToMinutes(newEnd);
      if (startMin % 15 !== 0 || endMin % 15 !== 0) {
        return res.status(400).json({ message: "Session times must be in 15-minute increments" });
      }
      const newLocationId = locationId !== undefined ? locationId : session.locationId;
      if (newLocationId) {
        const loc = await storage.getTrainingLocationById(newLocationId);
        if (!loc) return res.status(400).json({ message: "Invalid location" });
      }
      const newStatus = "requested";
      const updateData: any = {
        sessionDate: newDate,
        startTime: newStart,
        endTime: newEnd,
        locationId: newLocationId || null,
        status: newStatus,
      };
      if (sessionType) updateData.sessionType = sessionType;
      const updated = await storage.updateTrainingSession(req.params.id, updateData);

      const otherUserId = userId === session.trainerId ? session.playerId : session.trainerId;
      const otherEmail = await getEmailForUser(otherUserId);
      if (otherEmail) {
        const emailData = await getSessionEmailData(updated);
        const rescheduledBy = await getDisplayNameForUser(userId);
        sendSessionRescheduledEmail(otherEmail, {
          ...emailData,
          rescheduledBy,
          oldDate: session.sessionDate,
          oldStartTime: session.startTime,
          oldEndTime: session.endTime,
        }).catch(() => {});
      }
      const reschName = await getDisplayNameForUser(userId);
      sendPushNotification(otherUserId, { title: "Session Rescheduled", body: `${reschName} wants to reschedule your session`, url: userId === session.trainerId ? "/my-trainer" : "/trainer/schedule" }).catch(() => {});

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/training-sessions/:id/complete", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const session = await storage.getTrainingSessionById(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.trainerId !== trainerId) return res.status(403).json({ message: "Forbidden" });
      if (session.status !== "confirmed") return res.status(400).json({ message: "Session must be confirmed to complete" });
      const { trainerNotes } = req.body || {};
      const updated = await storage.updateTrainingSession(req.params.id, {
        status: "completed",
        trainerNotes: trainerNotes || session.trainerNotes,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public Trainer Directory (for players to find trainers)
  app.get("/api/trainers/directory", async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      const filters: any = {};
      if (!lat || !lng) {
        if (req.query.state) filters.state = req.query.state as string;
        if (req.query.city) filters.city = req.query.city as string;
      }
      if (req.query.specialty) filters.specialty = req.query.specialty as string;
      if (req.query.query) filters.query = req.query.query as string;
      const trainers = await storage.getPublicTrainerProfiles(filters);
      let sanitized = trainers.map(t => ({
        id: t.id,
        userId: t.userId,
        firstName: t.firstName,
        lastName: t.lastName,
        headline: t.headline,
        bio: t.bio,
        specialties: t.specialties,
        city: t.city,
        state: t.state,
        hourlyRate: t.hourlyRate,
        sessionTypes: t.sessionTypes,
        experienceYears: t.experienceYears,
        certifications: t.certifications,
        availability: t.availability,
        profilePhotoUrl: t.profilePhotoUrl,
        socialInstagram: t.socialInstagram,
        socialTwitter: t.socialTwitter,
        website: t.website,
        contactEmail: t.contactEmail,
        latitude: t.latitude,
        longitude: t.longitude,
      }));
      if (lat && lng && radius) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const maxDist = parseFloat(radius as string);
        if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(maxDist)) {
          sanitized = sanitized
            .filter(t => t.latitude != null && t.longitude != null)
            .filter(t => haversineDistance(userLat, userLng, t.latitude!, t.longitude!) <= maxDist);
        }
      }
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trainers/directory/:id", async (req, res) => {
    try {
      const trainer = await storage.getTrainerProfileById(req.params.id);
      if (!trainer) return res.status(404).json({ message: "Trainer not found" });

      const profileLocations = await storage.getTrainerProfileLocations(trainer.id);
      const locations = profileLocations.map(pl => ({
        id: pl.location.id,
        name: pl.location.name,
        address: pl.location.address,
        city: pl.location.city,
        state: pl.location.state,
        availability: pl.availability,
      }));

      const sanitized = {
        id: trainer.id,
        userId: trainer.userId,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        headline: trainer.headline,
        bio: trainer.bio,
        specialties: trainer.specialties,
        city: trainer.city,
        state: trainer.state,
        hourlyRate: trainer.hourlyRate,
        sessionTypes: trainer.sessionTypes,
        experienceYears: trainer.experienceYears,
        certifications: trainer.certifications,
        availability: trainer.availability,
        profilePhotoUrl: trainer.profilePhotoUrl,
        socialInstagram: trainer.socialInstagram,
        socialTwitter: trainer.socialTwitter,
        website: trainer.website,
        contactEmail: trainer.contactEmail,
        locations,
      };
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PLAYER EVALUATIONS =====

  app.get("/api/evaluation-attributes", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const attributes = await storage.getEvaluationAttributes(userId);
      res.json(attributes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/evaluation-attributes", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, category, scaleType, wordOptions } = req.body;
      if (!name || !scaleType) {
        return res.status(400).json({ message: "name and scaleType are required" });
      }
      if (!["1-10", "1-5", "word"].includes(scaleType)) {
        return res.status(400).json({ message: "scaleType must be '1-10', '1-5', or 'word'" });
      }
      if (scaleType === "word") {
        let parsedWordOptions: unknown;
        try { parsedWordOptions = JSON.parse(wordOptions || "[]"); } catch { return res.status(400).json({ message: "wordOptions must be valid JSON" }); }
        if (!Array.isArray(parsedWordOptions) || parsedWordOptions.length < 2) {
          return res.status(400).json({ message: "Word scale requires at least 2 word options" });
        }
      }
      const attr = await storage.createEvaluationAttribute({
        name,
        category: category || null,
        scaleType,
        wordOptions: wordOptions || null,
        isDefault: false,
        createdBy: userId,
      });
      res.status(201).json(attr);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/evaluation-attributes/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const attr = await storage.getEvaluationAttributeById(req.params.id);
      if (!attr) return res.status(404).json({ message: "Attribute not found" });
      if (attr.isDefault) {
        const { scaleType, wordOptions } = req.body;
        const updated = await storage.updateEvaluationAttribute(req.params.id, {
          ...(scaleType && { scaleType }),
          ...(wordOptions !== undefined && { wordOptions }),
        });
        return res.json(updated);
      }
      if (attr.createdBy !== userId) return res.status(403).json({ message: "Not authorized" });

      const { name, category, scaleType, wordOptions } = req.body;
      const updated = await storage.updateEvaluationAttribute(req.params.id, {
        ...(name && { name }),
        ...(category !== undefined && { category }),
        ...(scaleType && { scaleType }),
        ...(wordOptions !== undefined && { wordOptions }),
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/evaluation-attributes/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const attr = await storage.getEvaluationAttributeById(req.params.id);
      if (!attr) return res.status(404).json({ message: "Attribute not found" });
      if (attr.isDefault) return res.status(403).json({ message: "Cannot delete default attributes" });
      if (attr.createdBy !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteEvaluationAttribute(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/player-evaluations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const evalSchema = z.object({
        playerId: z.string().min(1),
        notes: z.string().optional(),
        evaluationDate: z.string().min(1),
        ratings: z.array(z.object({
          attributeId: z.string().min(1),
          numericValue: z.number().nullable().optional(),
          wordValue: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        })).min(1, "At least one rating is required"),
      });
      const parsed = evalSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      let { playerId, notes, evaluationDate, ratings } = parsed.data;

      const rosterEntry = await storage.getTrainerPlayerById(playerId);
      const resolvedPlayerId = (rosterEntry?.linkedUserId) || playerId;

      const existingCount = await storage.getPlayerEvaluationCount(trainerId, resolvedPlayerId);
      const evaluationType = existingCount === 0 ? "initial" : "progress";

      const ratingsData = ratings.map((r) => ({
        evaluationId: "",
        attributeId: r.attributeId,
        numericValue: r.numericValue ?? null,
        wordValue: r.wordValue ?? null,
        notes: r.notes ?? null,
      }));

      const evaluation = await storage.createPlayerEvaluation({
        trainerId,
        playerId: resolvedPlayerId,
        evaluationType,
        notes: notes || null,
        evaluationDate,
      }, ratingsData);

      res.status(201).json(evaluation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/player-evaluations/detail/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.getPlayerEvaluationById(req.params.id);
      if (!result) return res.status(404).json({ message: "Evaluation not found" });
      const eval_ = result.evaluation;
      if (eval_.trainerId !== userId && eval_.playerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this evaluation" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/player-evaluations/:playerId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const evaluations = await storage.getPlayerEvaluations(req.params.playerId, trainerId);
      res.json(evaluations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/player-evaluations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const result = await storage.getPlayerEvaluationById(req.params.id);
      if (!result) return res.status(404).json({ message: "Evaluation not found" });
      if (result.evaluation.trainerId !== trainerId) return res.status(403).json({ message: "Not authorized" });
      await storage.deletePlayerEvaluation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/player-evaluations/:id/share", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trainerId = req.user.claims.sub;
      const result = await storage.getPlayerEvaluationById(req.params.id);
      if (!result) return res.status(404).json({ message: "Evaluation not found" });
      if (result.evaluation.trainerId !== trainerId) return res.status(403).json({ message: "Not authorized" });
      const shared = req.body.shared !== false;
      const updated = await storage.toggleEvaluationSharing(req.params.id, shared);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/my-evaluations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const evaluations = await storage.getSharedEvaluationsForPlayer(playerId);
      const enriched = await Promise.all(evaluations.map(async (ev) => {
        const [trainer] = await db.select({
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.id, ev.trainerId));
        return { ...ev, trainerName: trainer ? `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() : "Unknown" };
      }));
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/my-evaluations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.user.claims.sub;
      const result = await storage.getPlayerEvaluationById(req.params.id);
      if (!result) return res.status(404).json({ message: "Evaluation not found" });
      const evalPlayerId = result.evaluation.playerId;
      let isOwner = evalPlayerId === playerId;
      if (!isOwner) {
        const rosterEntry = await storage.getTrainerPlayerById(evalPlayerId);
        isOwner = !!rosterEntry && rosterEntry.linkedUserId === playerId;
      }
      if (!isOwner || !result.evaluation.sharedWithPlayer) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const [trainer] = await db.select({
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(eq(users.id, result.evaluation.trainerId));
      res.json({
        ...result,
        trainerName: trainer ? `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() : "Unknown",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== GOOGLE CALENDAR INTEGRATION =====

  const gcal = await import("./google-calendar");

  app.get("/api/google-calendar/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const connected = await gcal.isConnected(userId);
      res.json({ connected });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/google-calendar/connect", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const url = gcal.getAuthUrl(userId);
      res.redirect(url);
    } catch (error: any) {
      res.status(500).send("Failed to connect to Google Calendar: " + error.message);
    }
  });

  app.get("/api/auth/google/callback", async (req: AuthenticatedRequest, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.status(400).send("Missing code or state parameter");
      }
      const userId = gcal.verifyState(state as string);
      if (!userId) {
        return res.status(403).send("Invalid or tampered state parameter");
      }
      await gcal.handleCallback(code as string, userId);
      res.send(`
        <html><body>
          <script>
            window.opener?.postMessage({ type: "google-calendar-connected" }, "*");
            window.close();
          </script>
          <p>Google Calendar connected! You can close this window.</p>
        </body></html>
      `);
    } catch (error: any) {
      console.error("Google Calendar callback error:", error);
      const detail = error.response?.data?.error_description || error.message;
      res.status(500).send(`Error connecting Google Calendar: ${detail}`);
    }
  });

  app.post("/api/google-calendar/disconnect", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      await gcal.disconnect(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/google-calendar/add-session/:sessionId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;

      const session = await storage.getTrainingSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.trainerId !== userId && session.playerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [trainerUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, session.trainerId));
      const [playerUser] = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, session.playerId));

      let locationName: string | undefined;
      if (session.locationId) {
        const loc = await storage.getTrainingLocationById(session.locationId);
        if (loc) locationName = loc.name;
      }

      const timezone = req.body?.timezone || "America/New_York";
      const result = await gcal.createCalendarEvent(userId, {
        id: session.id,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        trainerName: trainerUser ? `${trainerUser.firstName || ""} ${trainerUser.lastName || ""}`.trim() : undefined,
        playerName: playerUser ? `${playerUser.firstName || ""} ${playerUser.lastName || ""}`.trim() : undefined,
        locationName,
        sessionType: session.sessionType || undefined,
        notes: session.playerNotes || session.trainerNotes || undefined,
      }, timezone);

      if (!result) {
        return res.status(400).json({ message: "Google Calendar not connected. Please connect first." });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== UNIVERSAL USER SEARCH =====

  app.get("/api/users/search", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const q = (req.query.q as string || "").trim();
      if (q.length < 2) {
        return res.json([]);
      }
      const searchPattern = `%${q}%`;
      const results = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          displayName: userProfiles.displayName,
          profilePhotoUrl: userProfiles.profilePhotoUrl,
          city: userProfiles.city,
          state: userProfiles.state,
          positions: careerProfiles.positions,
          staffRole: careerProfiles.staffRole,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(careerProfiles, eq(careerProfiles.userId, users.id))
        .where(
          or(
            ilike(users.firstName, searchPattern),
            ilike(users.lastName, searchPattern),
            ilike(users.email, searchPattern),
            ilike(userProfiles.displayName, searchPattern),
            sql`CONCAT(${users.firstName}, ' ', ${users.lastName}) ILIKE ${searchPattern}`
          )
        )
        .limit(20);

      const filtered = results
        .filter(r => r.userId !== userId)
        .map(r => ({
          userId: r.userId,
          firstName: r.firstName,
          lastName: r.lastName,
          displayName: r.displayName,
          profilePhotoUrl: r.profilePhotoUrl || r.profileImageUrl,
          city: r.city,
          state: r.state,
          positions: r.positions,
          staffRole: r.staffRole,
        }));

      res.json(filtered);
    } catch (error: any) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get("/api/players/search", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const q = (req.query.q as string || "").trim();
      if (q.length < 2) {
        return res.json([]);
      }
      const searchPattern = `%${q}%`;
      const results = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          displayName: userProfiles.displayName,
          profilePhotoUrl: userProfiles.profilePhotoUrl,
          city: userProfiles.city,
          state: userProfiles.state,
          positions: careerProfiles.positions,
          staffRole: careerProfiles.staffRole,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(careerProfiles, eq(careerProfiles.userId, users.id))
        .where(
          and(
            or(
              ilike(users.firstName, searchPattern),
              ilike(users.lastName, searchPattern),
              ilike(users.email, searchPattern),
              ilike(userProfiles.displayName, searchPattern),
              sql`CONCAT(${users.firstName}, ' ', ${users.lastName}) ILIKE ${searchPattern}`
            ),
            or(
              isNull(careerProfiles.staffRole),
              sql`${careerProfiles.alsoPlayer} = true`
            )
          )
        )
        .limit(20);

      const filtered = results
        .filter(r => r.userId !== userId)
        .map(r => ({
          userId: r.userId,
          firstName: r.firstName,
          lastName: r.lastName,
          displayName: r.displayName,
          profilePhotoUrl: r.profilePhotoUrl || r.profileImageUrl,
          city: r.city,
          state: r.state,
          positions: r.positions,
        }));

      res.json(filtered);
    } catch (error: any) {
      console.error("Error searching players:", error);
      res.status(500).json({ message: "Failed to search players" });
    }
  });

  // ===== PLAYER-TRAINER CONNECTIONS =====

  app.post("/api/connections/request", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const connectionSchema = z.object({ targetUserId: z.string().min(1), role: z.enum(["player", "trainer"]).optional() });
      const parsed = connectionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      const { targetUserId, role } = parsed.data;
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot connect with yourself" });
      }

      let initiatedBy: "player" | "trainer" = "player";
      if (role === "player" || role === "trainer") {
        initiatedBy = role;
      } else {
        const [career] = await db.select({ staffRole: careerProfiles.staffRole }).from(careerProfiles).where(eq(careerProfiles.userId, userId));
        if (career?.staffRole === "trainer" || career?.staffRole === "coach" || career?.staffRole === "both") {
          initiatedBy = "trainer";
        }
      }

      const playerId = userId < targetUserId ? userId : targetUserId;
      const trainerId = userId < targetUserId ? targetUserId : userId;

      const existing = await storage.getConnection(playerId, trainerId);
      if (existing) {
        if (existing.status === "declined") {
          await db.update(playerTrainerConnections)
            .set({ status: "pending", requesterUserId: userId, initiatedBy, updatedAt: new Date() })
            .where(eq(playerTrainerConnections.id, existing.id));
          const [updated] = await db.select().from(playerTrainerConnections)
            .where(eq(playerTrainerConnections.id, existing.id));
          return res.json(updated);
        }
        return res.status(400).json({ message: "Connection already exists", connection: existing });
      }

      const conn = await storage.createConnection({ playerId, trainerId, initiatedBy, requesterUserId: userId, status: "pending" });
      const connName = await getDisplayNameForUser(userId);
      sendPushNotification(targetUserId, { title: "Connection Request", body: `${connName} wants to connect with you`, url: "/connect" }).catch(() => {});
      res.status(201).json(conn);
    } catch (error) {
      console.error("Error creating connection:", error);
      res.status(500).json({ message: "Failed to create connection request" });
    }
  });

  app.get("/api/connections", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await storage.getConnectionsForUser(userId);

      const enriched = await Promise.all(connections.map(async (conn) => {
        const otherUserId = conn.playerId === userId ? conn.trainerId : conn.playerId;
        const otherUser = await storage.getUser(otherUserId);
        const otherProfile = await storage.getUserProfile(otherUserId);
        return {
          ...conn,
          otherUser: otherUser ? {
            id: otherUser.id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            profileImageUrl: otherUser.profileImageUrl,
            displayName: otherProfile?.displayName,
            profilePhotoUrl: otherProfile?.profilePhotoUrl,
          } : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get("/api/connections/pending", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const pending = await storage.getPendingConnectionsForUser(userId);

      const incoming = pending.filter(c => {
        if (c.requesterUserId) {
          return c.requesterUserId !== userId && (c.playerId === userId || c.trainerId === userId);
        }
        if (c.initiatedBy === "player" && c.trainerId === userId) return true;
        if (c.initiatedBy === "trainer" && c.playerId === userId) return true;
        return false;
      });

      const enriched = await Promise.all(incoming.map(async (conn) => {
        const otherUserId = conn.playerId === userId ? conn.trainerId : conn.playerId;
        const otherUser = await storage.getUser(otherUserId);
        const otherProfile = await storage.getUserProfile(otherUserId);
        return {
          ...conn,
          otherUser: otherUser ? {
            id: otherUser.id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            profileImageUrl: otherUser.profileImageUrl,
            displayName: otherProfile?.displayName,
            profilePhotoUrl: otherProfile?.profilePhotoUrl,
          } : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending connections:", error);
      res.status(500).json({ message: "Failed to fetch pending connections" });
    }
  });

  app.get("/api/connections/status/:otherUserId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const otherUserId = req.params.otherUserId;

      const connAsPlayer = await storage.getConnection(userId, otherUserId);
      const connAsTrainer = await storage.getConnection(otherUserId, userId);
      const conn = connAsPlayer || connAsTrainer;

      res.json({ status: conn?.status || "none", connection: conn || null });
    } catch (error) {
      console.error("Error checking connection status:", error);
      res.status(500).json({ message: "Failed to check connection status" });
    }
  });

  app.put("/api/connections/:id/accept", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(playerTrainerConnections)
        .where(eq(playerTrainerConnections.id, req.params.id));
      if (!existing) return res.status(404).json({ message: "Connection not found" });
      if (existing.status !== "pending") return res.status(400).json({ message: "Connection is not pending" });

      const isRecipient = existing.requesterUserId
        ? existing.requesterUserId !== userId && (existing.playerId === userId || existing.trainerId === userId)
        : (existing.initiatedBy === "player" && existing.trainerId === userId)
          || (existing.initiatedBy === "trainer" && existing.playerId === userId);
      if (!isRecipient) return res.status(403).json({ message: "Not authorized to accept this connection" });

      const conn = await storage.updateConnectionStatus(req.params.id, "accepted");
      const acceptorName = await getDisplayNameForUser(userId);
      const requesterId = existing.requesterUserId || (existing.initiatedBy === "player" ? existing.playerId : existing.trainerId);
      sendPushNotification(requesterId, { title: "Connection Accepted", body: `${acceptorName} accepted your connection request`, url: "/connect" }).catch(() => {});
      res.json(conn);
    } catch (error) {
      console.error("Error accepting connection:", error);
      res.status(500).json({ message: "Failed to accept connection" });
    }
  });

  app.put("/api/connections/:id/decline", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(playerTrainerConnections)
        .where(eq(playerTrainerConnections.id, req.params.id));
      if (!existing) return res.status(404).json({ message: "Connection not found" });
      if (existing.status !== "pending") return res.status(400).json({ message: "Connection is not pending" });

      const isRecipient = existing.requesterUserId
        ? existing.requesterUserId !== userId && (existing.playerId === userId || existing.trainerId === userId)
        : (existing.initiatedBy === "player" && existing.trainerId === userId)
          || (existing.initiatedBy === "trainer" && existing.playerId === userId);
      if (!isRecipient) return res.status(403).json({ message: "Not authorized to decline this connection" });

      const conn = await storage.updateConnectionStatus(req.params.id, "declined");
      res.json(conn);
    } catch (error) {
      console.error("Error declining connection:", error);
      res.status(500).json({ message: "Failed to decline connection" });
    }
  });

  // ===== PARENT / GUARDIAN =====

  // Public: validate an invite code and return the player's display name (so the invite page can show context)
  app.get("/api/parent-invite/validate/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const [career] = await db.select().from(careerProfiles).where(eq(careerProfiles.parentInviteCode, code));
      if (!career) {
        return res.status(404).json({ message: "Invalid invite link" });
      }
      const [profile] = await db.select({ displayName: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.userId, career.userId));
      const [userRow] = await db.select({ firstName: users.firstName }).from(users).where(eq(users.id, career.userId));
      const playerName = profile?.displayName || userRow?.firstName || "your player";
      res.json({ valid: true, playerName });
    } catch (error) {
      console.error("Error validating parent invite:", error);
      res.status(500).json({ message: "Failed to validate invite" });
    }
  });

  // Authenticated: player sends a parent invite email
  app.post("/api/parent/send-invite", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { parentEmail } = req.body;
      if (!parentEmail?.trim()) {
        return res.status(400).json({ message: "Parent email is required" });
      }

      // Get or generate invite code
      let career = await storage.getCareerProfile(userId);
      if (!career) {
        return res.status(404).json({ message: "Career profile not found" });
      }

      if (!career.isMinor) {
        return res.status(400).json({ message: "Parent visibility is only available for minor players" });
      }

      let inviteCode = career.parentInviteCode;
      if (!inviteCode) {
        const crypto = await import("crypto");
        inviteCode = crypto.randomBytes(6).toString("hex");
        career = await storage.updateCareerProfile(userId, { parentInviteCode: inviteCode, parentEmail: parentEmail.trim() });
      } else {
        career = await storage.updateCareerProfile(userId, { parentEmail: parentEmail.trim() });
      }

      // Get player's name
      const [profile] = await db.select({ displayName: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.userId, userId));
      const [userRow] = await db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId));
      const playerName = profile?.displayName || userRow?.firstName || "A player";

      const appBaseUrl = getAppBaseUrl();
      await sendParentInviteEmail(parentEmail.trim(), playerName, inviteCode!, appBaseUrl);

      res.json({ message: "Invite sent", inviteCode });
    } catch (error) {
      console.error("Error sending parent invite:", error);
      res.status(500).json({ message: "Failed to send invite" });
    }
  });

  app.post("/api/parent/link", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const parentUserId = req.user.claims.sub;
      const { inviteCode } = req.body;
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }

      const [career] = await db.select().from(careerProfiles)
        .where(eq(careerProfiles.parentInviteCode, inviteCode));
      if (!career) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      if (!career.isMinor) {
        return res.status(400).json({ message: "This player is not marked as a minor" });
      }

      const existing = await storage.getParentForPlayer(career.userId);
      if (existing) {
        return res.status(400).json({ message: "This player already has a linked parent" });
      }

      if (career.userId === parentUserId) {
        return res.status(400).json({ message: "Cannot link to your own account" });
      }

      const link = await storage.createParentLink(parentUserId, career.userId);
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking parent:", error);
      res.status(500).json({ message: "Failed to link parent account" });
    }
  });

  app.get("/api/parent/children", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const parentUserId = req.user.claims.sub;
      const links = await storage.getParentLinks(parentUserId);

      const children = await Promise.all(links.map(async (link) => {
        const childUser = await storage.getUser(link.playerUserId);
        const childProfile = await storage.getUserProfile(link.playerUserId);
        const childCareer = await storage.getCareerProfile(link.playerUserId);
        return {
          ...link,
          child: childUser ? {
            id: childUser.id,
            firstName: childUser.firstName,
            lastName: childUser.lastName,
            profileImageUrl: childUser.profileImageUrl,
            displayName: childProfile?.displayName,
            profilePhotoUrl: childProfile?.profilePhotoUrl,
            skillLevel: childProfile?.skillLevel,
            city: childProfile?.city,
            state: childProfile?.state,
          } : null,
          career: childCareer ? {
            positions: childCareer.positions,
            teamName: childCareer.teamName,
            schoolName: childCareer.schoolName,
            level: childCareer.level,
            xp: childCareer.xp,
          } : null,
        };
      }));

      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch linked children" });
    }
  });

  app.get("/api/parent/child/:childId/activity", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const parentUserId = req.user.claims.sub;
      const childId = req.params.childId;

      const link = await storage.getParentForPlayer(childId);
      if (!link || link.parentUserId !== parentUserId) {
        return res.status(403).json({ message: "Not authorized to view this player" });
      }

      const sessions = await storage.getTrainingSessionsForPlayer(childId);
      const stats = await storage.getUserStats(childId);
      const connections = await storage.getConnectionsForUser(childId);

      const enrichedConnections = await Promise.all(connections.map(async (conn) => {
        const trainerId = conn.trainerId;
        const trainerUser = await storage.getUser(trainerId);
        return {
          ...conn,
          trainerName: trainerUser ? `${trainerUser.firstName || ''} ${trainerUser.lastName || ''}`.trim() : 'Trainer',
        };
      }));

      res.json({
        sessions: sessions.slice(0, 20),
        stats,
        connections: enrichedConnections,
      });
    } catch (error) {
      console.error("Error fetching child activity:", error);
      res.status(500).json({ message: "Failed to fetch child activity" });
    }
  });

  app.get("/api/parent/child/:childId/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const parentUserId = req.user.claims.sub;
      const childId = req.params.childId;

      const link = await storage.getParentForPlayer(childId);
      if (!link || link.parentUserId !== parentUserId) {
        return res.status(403).json({ message: "Not authorized to view this player's messages" });
      }

      const conversations = await storage.getConversations(childId);

      const enrichedConversations = await Promise.all(conversations.map(async (conv: any) => {
        const partnerId = conv.partnerId || conv.senderId || conv.receiverId;
        const partnerUser = await storage.getUser(partnerId);
        const msgs = await storage.getMessages(childId, partnerId);
        return {
          partnerId,
          partnerName: partnerUser ? `${partnerUser.firstName || ''} ${partnerUser.lastName || ''}`.trim() : 'Unknown',
          messages: msgs,
        };
      }));

      res.json(enrichedConversations);
    } catch (error) {
      console.error("Error fetching child messages:", error);
      res.status(500).json({ message: "Failed to fetch child messages" });
    }
  });

  app.get("/api/parent/child/:childId/connections", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const parentUserId = req.user.claims.sub;
      const childId = req.params.childId;

      const link = await storage.getParentForPlayer(childId);
      if (!link || link.parentUserId !== parentUserId) {
        return res.status(403).json({ message: "Not authorized to view this player's connections" });
      }

      const connections = await storage.getConnectionsForUser(childId);
      const enriched = await Promise.all(connections.map(async (conn) => {
        const trainerId = conn.trainerId;
        const trainerUser = await storage.getUser(trainerId);
        const trainerProfile = await storage.getUserProfile(trainerId);
        return {
          ...conn,
          trainer: trainerUser ? {
            id: trainerUser.id,
            firstName: trainerUser.firstName,
            lastName: trainerUser.lastName,
            displayName: trainerProfile?.displayName,
            profilePhotoUrl: trainerProfile?.profilePhotoUrl,
          } : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching child connections:", error);
      res.status(500).json({ message: "Failed to fetch child connections" });
    }
  });

  app.get("/api/push/vapid-key", (req, res) => {
    const key = getVapidPublicKey();
    if (!key) return res.status(404).json({ message: "Push not configured" });
    res.json({ publicKey: key });
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription" });
      }
      const sub = await storage.savePushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true, subscription: sub });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ message: "Endpoint required" });
      await storage.deletePushSubscriptionForUser(userId, endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  app.post("/api/push/native-token", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token, platform } = req.body;
      if (!token || !platform) return res.status(400).json({ message: "token and platform are required" });
      const saved = await storage.saveNativePushToken(userId, token, platform);
      res.status(201).json(saved);
    } catch (error) {
      console.error("Error saving native push token:", error);
      res.status(500).json({ message: "Failed to save native push token" });
    }
  });

  app.delete("/api/push/native-token", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "token is required" });
      await storage.deleteNativePushToken(userId, token);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing native push token:", error);
      res.status(500).json({ message: "Failed to remove native push token" });
    }
  });

  // ─── Feedback Forum ──────────────────────────────────────────────────────

  app.get("/api/feedback", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { category, sort } = req.query as { category?: string; sort?: string };
      const userId = req.user!.claims.sub;
      const posts = await storage.getFeedbackPosts({ category, sort });
      const votedSet = await storage.getUserFeedbackVotes(userId);
      const result = posts.map(p => ({ ...p, hasVoted: votedSet.has(p.id) }));
      res.json(result);
    } catch (err) {
      console.error("Error getting feedback:", err);
      res.status(500).json({ message: "Failed to get feedback" });
    }
  });

  app.post("/api/feedback", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { title, content, category } = req.body;
      if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: "Title and content are required" });
      const post = await storage.createFeedbackPost({ userId, title: title.trim(), content: content.trim(), category: category || "general", status: "open" });
      res.json(post);
    } catch (err) {
      console.error("Error creating feedback:", err);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.post("/api/feedback/:id/vote", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const result = await storage.toggleFeedbackVote(userId, req.params.id);
      res.json(result);
    } catch (err) {
      console.error("Error voting on feedback:", err);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  app.patch("/api/feedback/:id/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminCheck = await storage.isUserAdmin(userId);
      if (!adminCheck) return res.status(403).json({ message: "Admins only" });
      const { status } = req.body;
      const post = await storage.updateFeedbackStatus(req.params.id, status);
      res.json(post);
    } catch (err) {
      console.error("Error updating feedback status:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/feedback/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminCheck = await storage.isUserAdmin(userId);
      if (!adminCheck) return res.status(403).json({ message: "Admins only" });
      await storage.deleteFeedbackPost(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting feedback:", err);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // ─── Feedback Comments ────────────────────────────────────────────────────

  app.get("/api/feedback/:id/comments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const comments = await db.select().from(feedbackComments)
        .where(eq(feedbackComments.postId, req.params.id))
        .orderBy(feedbackComments.createdAt);
      res.json(comments);
    } catch (err) {
      console.error("Error fetching comments:", err);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/feedback/:id/comments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const [userRow] = await db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users).where(eq(users.id, userId));
      const authorName = `${userRow?.firstName || ""} ${userRow?.lastName || ""}`.trim() || userRow?.email || "User";
      const [comment] = await db.insert(feedbackComments).values({
        postId: req.params.id, userId, content: content.trim(), authorName,
      }).returning();
      res.json(comment);
    } catch (err) {
      console.error("Error posting comment:", err);
      res.status(500).json({ message: "Failed to post comment" });
    }
  });

  app.delete("/api/feedback/:postId/comments/:commentId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminCheck = await storage.isUserAdmin(userId);
      const [comment] = await db.select().from(feedbackComments).where(eq(feedbackComments.id, req.params.commentId));
      if (!comment) return res.status(404).json({ message: "Not found" });
      if (comment.userId !== userId && !adminCheck) return res.status(403).json({ message: "Forbidden" });
      await db.delete(feedbackComments).where(eq(feedbackComments.id, req.params.commentId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ─── Analytics Events ─────────────────────────────────────────────────────

  app.post("/api/analytics/track", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { event, page, metadata } = req.body;
      if (!event) return res.status(400).json({ message: "Event required" });
      await storage.trackAnalyticsEvent(userId, event, page, metadata);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  app.get("/api/admin/analytics", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const adminCheck = await storage.isUserAdmin(userId);
      if (!adminCheck) return res.status(403).json({ message: "Admins only" });
      const data = await storage.getAdminAnalytics();
      res.json(data);
    } catch (err) {
      console.error("Error getting analytics:", err);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // ─── Daily Streak Challenge ──────────────────────────────────────────────

  function todayUTC(): string {
    return new Date().toISOString().split("T")[0];
  }

  // GET /api/daily-challenge — today's challenge + user's streak + completion status
  app.get("/api/daily-challenge", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      // Use client-provided local date if valid (YYYY-MM-DD), otherwise fall back to UTC
      const clientDate = typeof req.query.clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.clientDate)
        ? req.query.clientDate
        : todayUTC();
      const [challengeData, completion, streak] = await Promise.all([
        storage.getDailyChallenge(clientDate),
        storage.getTodayCompletion(userId, clientDate),
        storage.getUserStreak(userId),
      ]);
      res.json({ challenge: challengeData, completedToday: !!completion, completion, streak, date: clientDate });
    } catch (err) {
      console.error("Error getting daily challenge:", err);
      res.status(500).json({ message: "Failed to get daily challenge" });
    }
  });

  // GET /api/daily-challenge/history — past challenge history
  app.get("/api/daily-challenge/history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 90);
      const history = await storage.getDailyChallengeHistory(limit, userId);
      res.json(history);
    } catch (err) {
      console.error("Error getting challenge history:", err);
      res.status(500).json({ message: "Failed to get challenge history" });
    }
  });

  // POST /api/daily-challenge/complete — mark today's challenge done (linked to a log)
  app.post("/api/daily-challenge/complete", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { drillId, trainingLogId, clientDate } = req.body;
      const date = (typeof clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
        ? clientDate
        : todayUTC();
      if (!drillId) return res.status(400).json({ message: "drillId required" });
      const result = await storage.completeDailyChallenge(userId, drillId, date, trainingLogId);
      res.json(result);
    } catch (err) {
      console.error("Error completing daily challenge:", err);
      res.status(500).json({ message: "Failed to complete daily challenge" });
    }
  });

  // GET /api/streak/leaderboard — top 10 players by current streak
  app.get("/api/streak/leaderboard", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const board = await storage.getStreakLeaderboard();
      res.json(board);
    } catch (err) {
      console.error("Error getting leaderboard:", err);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // GET /api/streak/me — current user's streak stats
  app.get("/api/streak/me", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const streak = await storage.getUserStreak(userId);
      res.json({ currentStreak: streak.currentStreak ?? 0, longestStreak: streak.longestStreak ?? 0 });
    } catch (err) {
      console.error("Error getting user streak:", err);
      res.status(500).json({ message: "Failed to get streak" });
    }
  });

  // Admin: set daily challenge override for a date
  app.post("/api/admin/daily-challenge", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      if (!await storage.isUserAdmin(userId)) return res.status(403).json({ message: "Admins only" });
      const { date, drillId } = req.body;
      if (!date || !drillId) return res.status(400).json({ message: "date and drillId required" });
      const challenge = await storage.setAdminDailyChallenge(date, drillId);
      res.json(challenge);
    } catch (err) {
      console.error("Error setting admin daily challenge:", err);
      res.status(500).json({ message: "Failed to set daily challenge" });
    }
  });

  // Admin: list daily challenges for a range
  app.get("/api/admin/daily-challenges", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      if (!await storage.isUserAdmin(userId)) return res.status(403).json({ message: "Admins only" });
      const from = (req.query.from as string) || todayUTC();
      const to = (req.query.to as string) || todayUTC();
      const challenges = await storage.getAdminDailyChallenges(from, to);
      res.json(challenges);
    } catch (err) {
      console.error("Error getting admin daily challenges:", err);
      res.status(500).json({ message: "Failed to get challenges" });
    }
  });

  return httpServer;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80) + "-" + Math.random().toString(36).substring(2, 6);
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
