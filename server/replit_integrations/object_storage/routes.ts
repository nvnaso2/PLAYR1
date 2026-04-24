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
 * Probe a media file with ffmpeg and return its duration in seconds.
 * Returns 0 if duration cannot be determined (file is broken/empty).
 *
 * We use ffmpeg itself (already shipped via ffmpeg-static) instead of ffprobe.
 * Running `ffmpeg -i <file>` writes the file's metadata to stderr; we parse
 * the "Duration: HH:MM:SS.ss" line.
 */
function probeDurationSec(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.size || stat.size < 1024) {
        return resolve(0);
      }
    } catch {
      return resolve(0);
    }
    const cmd = `"${ffmpegBin}" -i "${filePath}" -hide_banner -f null -`;
    exec(cmd, { timeout: 60000 }, (_err, _stdout, stderr) => {
      const out = stderr || "";
      const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return resolve(0);
      const h = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ss = parseFloat(m[3]);
      if (!isFinite(h) || !isFinite(mm) || !isFinite(ss)) return resolve(0);
      resolve(h * 3600 + mm * 60 + ss);
    });
  });
}

/**
 * Convert a video to a browser-compatible MP4 with moov atom at the front.
 *
 * Strategy (two-pass for maximum compatibility, with output validation):
 * 1. Try -c:v copy -c:a aac  — copies the video stream unchanged (fast, no quality loss)
 *    and converts audio to AAC (required for MP4; QuickTime/MOV often uses LPCM which
 *    Chrome rejects inside an MP4 container).
 * 2. If pass 1 fails OR produces a 0-duration / corrupt output (which can happen
 *    silently for certain HEVC .mov, VP9 .webm, or ProRes sources where copy "succeeds"
 *    but writes only headers), fall back to -c:v libx264 -c:a aac — universal H.264/AAC.
 *
 * If both passes produce an invalid file, this function REJECTS so the caller
 * can leave the original upload untouched instead of replacing it with garbage.
 */
async function fixVideoFastStart(inputPath: string): Promise<string> {
  const inputDuration = await probeDurationSec(inputPath);
  // Minimum acceptable output duration. If we know the input duration, require at
  // least 50% of it (ffmpeg occasionally drops a fraction of a second). Otherwise
  // any positive duration is acceptable.
  const minOutputSec = inputDuration > 0 ? Math.max(0.1, inputDuration * 0.5) : 0.1;

  const runPass = (cmd: string, outputPath: string): Promise<{ ok: boolean; stderr: string; duration: number }> =>
    new Promise((resolve) => {
      console.log(`[ffmpeg] ${cmd}`);
      exec(cmd, { timeout: 600000 }, async (err, _stdout, stderr) => {
        if (err) {
          return resolve({ ok: false, stderr: stderr || err.message, duration: 0 });
        }
        const duration = await probeDurationSec(outputPath);
        resolve({ ok: duration >= minOutputSec, stderr: stderr || "", duration });
      });
    });

  // Pass 1: copy video, convert audio to AAC
  const outputPath1 = path.join("/tmp", `playr1_fixed_${randomUUID()}.mp4`);
  const cmd1 = `"${ffmpegBin}" -y -i "${inputPath}" -movflags +faststart -c:v copy -c:a aac -f mp4 "${outputPath1}"`;
  const pass1 = await runPass(cmd1, outputPath1);
  if (pass1.ok) {
    console.log(`[ffmpeg] Pass 1 success: ${outputPath1} (duration=${pass1.duration.toFixed(2)}s, input=${inputDuration.toFixed(2)}s)`);
    return outputPath1;
  }
  console.warn(
    `[ffmpeg] Pass 1 unusable (duration=${pass1.duration.toFixed(2)}s, input=${inputDuration.toFixed(2)}s) — falling back to H.264 transcode. stderr: ${pass1.stderr.slice(0, 300)}`
  );
  try { fs.unlinkSync(outputPath1); } catch {}

  // Pass 2: full transcode to H.264/AAC
  const outputPath2 = path.join("/tmp", `playr1_fixed_${randomUUID()}.mp4`);
  const cmd2 = `"${ffmpegBin}" -y -i "${inputPath}" -movflags +faststart -c:v libx264 -c:a aac -crf 23 -preset fast -pix_fmt yuv420p -f mp4 "${outputPath2}"`;
  const pass2 = await runPass(cmd2, outputPath2);
  if (pass2.ok) {
    console.log(`[ffmpeg] Pass 2 success: ${outputPath2} (duration=${pass2.duration.toFixed(2)}s)`);
    return outputPath2;
  }
  try { fs.unlinkSync(outputPath2); } catch {}
  console.error(`[ffmpeg] Pass 2 failed/unusable. stderr: ${pass2.stderr.slice(0, 500)}`);
  throw new Error(
    `ffmpeg produced unusable output (pass1=${pass1.duration.toFixed(2)}s, pass2=${pass2.duration.toFixed(2)}s, input=${inputDuration.toFixed(2)}s)`
  );
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
      await objectStorageService.serveObject(objectFile, res, req, 3600);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

