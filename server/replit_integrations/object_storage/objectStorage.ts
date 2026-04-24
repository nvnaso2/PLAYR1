import { Storage, File } from "@google-cloud/storage";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  /**
   * Serve an object to the client.
   *
   * For videos and large files (>8 MB), redirect the browser to a short-lived
   * GCS signed URL so the file is streamed directly from Google's edge instead
   * of through this Express server. This is critical in production because
   * Replit Autoscale Deployments cannot reliably forward large streaming
   * responses (the proxy buffers/caps long-running streams, which causes
   * `<video>` elements to render a blank 0:00 player even when the underlying
   * file is a perfectly valid H.264 MP4 with faststart applied).
   *
   * For small images/PDFs, stream through Express as before to avoid the
   * extra redirect round-trip.
   */
  async serveObject(file: File, res: Response, req: Request, cacheTtlSec: number = 3600) {
    const [metadata] = await file.getMetadata();
    const rawContentType = (metadata.contentType as string) || "application/octet-stream";
    const fileSize = parseInt(metadata.size as string, 10) || 0;
    const isVideo = rawContentType.startsWith("video/");
    const isLarge = fileSize > 8 * 1024 * 1024; // 8 MB

    if (isVideo || isLarge) {
      const bucketName = file.bucket.name;
      const objectName = file.name;
      const signed = await signObjectURL({
        bucketName,
        objectName,
        method: "GET",
        ttlSec: 3600,
      });
      // Cache the redirect briefly (much less than the signed URL TTL) so the
      // browser doesn't keep re-using an about-to-expire signed URL.
      res.set("Cache-Control", "private, max-age=300");
      return res.redirect(302, signed);
    }

    return this.downloadObject(file, res, cacheTtlSec, req);
  }

  // Downloads an object to the response, with Range request support for video streaming.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600, req?: Request) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      const rawContentType = (metadata.contentType as string) || "application/octet-stream";
      // Remap QuickTime/MOV to video/mp4 so all browsers can attempt playback.
      // iPhone MOV files use H.264, which every browser can decode — only the
      // MIME type declaration was preventing Chrome/Firefox from playing them.
      const contentType = rawContentType === "video/quicktime" ? "video/mp4" : rawContentType;
      const fileSize = parseInt(metadata.size as string, 10);

      const rangeHeader = req?.headers?.range;
      if (rangeHeader) {
        // Parse the Range header (e.g. "bytes=0-1023")
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206).set({
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        });

        const stream = file.createReadStream({ start, end });
        stream.on("error", (err) => {
          console.error("Range stream error:", err);
          if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
        });
        stream.pipe(res);
      } else {
        res.set({
          "Content-Type": contentType,
          "Content-Length": fileSize,
          "Accept-Ranges": "bytes",
          "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        });

        const stream = file.createReadStream();
        stream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
        });
        stream.pipe(res);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Downloads an object to a local temp file. Caller is responsible for deleting it.
  async downloadToTempFile(objectPath: string): Promise<{ tempPath: string; contentType: string }> {
    const objectFile = await this.getObjectEntityFile(objectPath);
    const [metadata] = await objectFile.getMetadata();
    const contentType = (metadata.contentType as string) || "application/octet-stream";
    const ext = contentType === "video/quicktime" ? ".mov" : ".mp4";
    const tempPath = path.join("/tmp", `playr1_${randomUUID()}${ext}`);

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempPath);
      const readStream = objectFile.createReadStream();
      readStream.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
      readStream.pipe(writeStream);
    });

    return { tempPath, contentType };
  }

  // Replaces an existing object with a new file from local disk.
  async replaceObjectFromFile(objectPath: string, srcPath: string, contentType: string): Promise<void> {
    const objectFile = await this.getObjectEntityFile(objectPath);
    await objectFile.save(fs.createReadStream(srcPath), {
      contentType,
      metadata: { contentType },
      resumable: false,
    });
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL — 12 hours to accommodate large video uploads on slow connections
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 43200,
    });
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    let entityId = parts.slice(1).join("/"); // everything after "objects/"
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }

    // Handle legacy broken records: before the normalizeObjectEntityPath fix,
    // paths were stored with the full bucket+private-dir prefix baked in
    // (e.g. "repl-default-bucket-xxx/.private/uploads/uuid"). Strip it so the
    // lookup resolves correctly for both old and new records.
    if (entityId.startsWith(entityDir)) {
      entityId = entityId.slice(entityDir.length);
    }

    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname; // always starts with "/"
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    // rawObjectPath has a leading "/" but PRIVATE_OBJECT_DIR env var does not,
    // so we must add one before comparing.
    const normalizedEntityDir = objectEntityDir.startsWith("/")
      ? objectEntityDir
      : `/${objectEntityDir}`;
  
    if (!rawObjectPath.startsWith(normalizedEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID (the part after the bucket+private dir prefix)
    const entityId = rawObjectPath.slice(normalizedEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

