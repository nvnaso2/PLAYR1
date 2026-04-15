import type { Express, Request, Response, NextFunction } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { isAuthenticated } from "../../auth";
import { storage } from "../../storage";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
// ffmpeg-static ships a pre-built ffmpeg binary that works in any environment,
// including the production deployment container which has no system ffmpeg.
import ffmpegStaticPath from "ffmpeg-static";
const ffmpegBin = ffmpegStaticPath as string;

/**
 * Run ffmpeg -movflags faststart on a video file.
 * This moves the moov atom to the beginning so browsers can play it
 * without downloading the entire file first.
 * Uses -c copy so no re-encoding — very fast.
 */
function fixVideoFastStart(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join("/tmp", `playr1_fixed_${randomUUID()}.mp4`);
    const cmd = `"${ffmpegBin}" -y -i "${inputPath}" -movflags +faststart -c copy -f mp4 "${outputPath}"`;
    console.log(`[ffmpeg] Running: ${cmd}`);
    exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`[ffmpeg] stderr: ${stderr}`);
        reject(new Error(`ffmpeg failed: ${stderr || err.message}`));
      } else {
        console.log(`[ffmpeg] Success: ${outputPath}`);
        resolve(outputPath);
      }
    });
  });
}

/**
 * Always returns true — we always run ffmpeg faststart on every video.
 * The -movflags faststart -c copy command is idempotent and very fast (no re-encoding).
 * Checking the brand is unreliable: files may show "isom" but still have moov at end.
 */
async function videoNeedsFix(_filePath: string): Promise<boolean> {
  return true;
}

// Allowed content types for uploads
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
const ALLOWED_PDF_TYPES = ["application/pdf"];
const ALLOWED_CONTENT_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];

// Max file sizes in bytes (4GB for videos, 50MB for PDFs, 10MB for images)
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024;
const MAX_PDF_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Admin check middleware for upload routes
 */
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  if (!user?.claims?.sub) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const admin = await storage.isUserAdmin(user.claims.sub);
  if (!admin) {
    return res.status(403).json({ error: "Admin access required for uploads" });
  }
  next();
};

/**
 * Register object storage routes for file uploads.
 *
 * Security:
 * - Uploads require authentication and admin privileges
 * - Content types are validated against allowlist
 * - File sizes are validated before issuing presigned URLs
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   * Requires authentication and admin privileges.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   */
  app.post("/api/uploads/request-url", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      // Validate required fields
      if (!name || !contentType) {
        return res.status(400).json({
          error: "Missing required fields: name and contentType are required",
        });
      }

      // Validate content type
      if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
        return res.status(400).json({
          error: `Invalid content type. Allowed types: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
        });
      }

      // Validate file size
      const maxSize = ALLOWED_VIDEO_TYPES.includes(contentType) 
        ? MAX_VIDEO_SIZE 
        : ALLOWED_PDF_TYPES.includes(contentType) 
          ? MAX_PDF_SIZE 
          : MAX_IMAGE_SIZE;
      if (size && size > maxSize) {
        const maxGB = maxSize / (1024 * 1024 * 1024);
        const label = maxGB >= 1 ? `${maxGB}GB` : `${maxSize / (1024 * 1024)}MB`;
        return res.status(400).json({
          error: `File too large. Maximum size: ${label}`,
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Request a presigned URL for user video upload.
   * Requires authentication (any logged-in user).
   * Only allows video uploads for user's filmroom.
   */
  app.post("/api/user/uploads/request-url", isAuthenticated, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      // Validate required fields
      if (!name || !contentType) {
        return res.status(400).json({
          error: "Missing required fields: name and contentType are required",
        });
      }

      // Only allow video uploads for user filmroom
      if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
        return res.status(400).json({
          error: `Invalid content type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(", ")}`,
        });
      }

      // Validate file size
      if (size && size > MAX_VIDEO_SIZE) {
        const maxGB = MAX_VIDEO_SIZE / (1024 * 1024 * 1024);
        const label = maxGB >= 1 ? `${maxGB}GB` : `${MAX_VIDEO_SIZE / (1024 * 1024)}MB`;
        return res.status(400).json({
          error: `File too large. Maximum size: ${label}`,
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating user upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.post("/api/user/uploads/photo-url", isAuthenticated, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name || !contentType) {
        return res.status(400).json({
          error: "Missing required fields: name and contentType are required",
        });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return res.status(400).json({
          error: `Invalid content type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        });
      }

      if (size && size > MAX_IMAGE_SIZE) {
        const maxMB = MAX_IMAGE_SIZE / (1024 * 1024);
        return res.status(400).json({
          error: `File too large. Maximum size: ${maxMB}MB`,
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating photo upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Finalize a video after GCS direct upload.
   * Runs ffmpeg -movflags faststart to move moov atom to front so all browsers can play it.
   * Called by the client after a presigned URL upload completes.
   */
  app.post("/api/uploads/finalize-video", isAuthenticated, async (req, res) => {
    const { objectPath } = req.body;
    if (!objectPath || !objectPath.startsWith("/objects/")) {
      return res.status(400).json({ error: "Invalid objectPath" });
    }

    let tempInput: string | null = null;
    let tempOutput: string | null = null;

    try {
      console.log(`[finalize-video] Downloading ${objectPath}...`);
      const { tempPath } = await objectStorageService.downloadToTempFile(objectPath);
      tempInput = tempPath;

      const needsFix = await videoNeedsFix(tempInput);
      if (!needsFix) {
        console.log(`[finalize-video] ${objectPath} already has moov at start — skipping`);
        return res.json({ objectPath, fixed: false });
      }

      console.log(`[finalize-video] Running ffmpeg faststart on ${objectPath}...`);
      tempOutput = await fixVideoFastStart(tempInput);

      console.log(`[finalize-video] Re-uploading fixed video to ${objectPath}...`);
      await objectStorageService.replaceObjectFromFile(objectPath, tempOutput, "video/mp4");

      console.log(`[finalize-video] Done: ${objectPath}`);
      res.json({ objectPath, fixed: true });
    } catch (error) {
      console.error("[finalize-video] Error:", error);
      res.status(500).json({ error: "Failed to process video" });
    } finally {
      if (tempInput) try { fs.unlinkSync(tempInput); } catch {}
      if (tempOutput) try { fs.unlinkSync(tempOutput); } catch {}
    }
  });

  /**
   * Admin: reprocess an existing video with ffmpeg faststart.
   * Use this to fix already-uploaded videos that have moov at end.
   */
  app.post("/api/admin/reprocess-video", isAuthenticated, isAdmin, async (req, res) => {
    // Allow up to 10 minutes per video (download + ffmpeg + re-upload for large files)
    req.socket.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);

    const { objectPath } = req.body;
    if (!objectPath || !objectPath.startsWith("/objects/")) {
      return res.status(400).json({ error: "Invalid objectPath" });
    }

    let tempInput: string | null = null;
    let tempOutput: string | null = null;

    try {
      console.log(`[reprocess-video] Downloading ${objectPath}...`);
      const { tempPath } = await objectStorageService.downloadToTempFile(objectPath);
      tempInput = tempPath;

      const needsFix = await videoNeedsFix(tempInput);
      if (!needsFix) {
        return res.json({ objectPath, fixed: false, message: "Video already optimized" });
      }

      console.log(`[reprocess-video] Running ffmpeg faststart...`);
      tempOutput = await fixVideoFastStart(tempInput);

      console.log(`[reprocess-video] Re-uploading...`);
      await objectStorageService.replaceObjectFromFile(objectPath, tempOutput, "video/mp4");

      res.json({ objectPath, fixed: true, message: "Video optimized for streaming" });
    } catch (error) {
      console.error("[reprocess-video] Error:", error);
      res.status(500).json({ error: "Failed to reprocess video" });
    } finally {
      if (tempInput) try { fs.unlinkSync(tempInput); } catch {}
      if (tempOutput) try { fs.unlinkSync(tempOutput); } catch {}
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/{*objectPath}
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/{*objectPath}", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res, 3600, req);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

