import { useState, useCallback, useRef } from "react";
import type { UppyFile } from "@uppy/core";
import { nativeFetch } from "@/lib/queryClient";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
  onProcessingError?: (error: Error) => void;
  requestUrl?: string;
  /**
   * Generic video uploaders keep the historical compatibility pass by default.
   * Filmroom disables it so the video record can be saved before expensive work.
   */
  finalizeVideo?: boolean;
}

export type UploadStatus =
  | "idle"
  | "requesting"
  | "uploading"
  | "processing"
  | "success"
  | "error"
  | "cancelled";

/**
 * Handles presigned uploads with real byte progress.
 *
 * Video compatibility processing is intentionally a separate lifecycle state:
 * transfer success is not held hostage by a server-side download/transcode/
 * re-upload pass.
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [processingError, setProcessingError] = useState<Error | null>(null);
  const runIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const finalizeControllerRef = useRef<AbortController | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const isAbortError = (value: unknown) =>
    value instanceof DOMException && value.name === "AbortError";

  const requestUploadUrl = useCallback(
    async (file: File, signal?: AbortSignal): Promise<UploadResponse> => {
      const response = await nativeFetch(options.requestUrl ?? "/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          name: file.name || "upload",
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      return response.json();
    },
    [options.requestUrl],
  );

  const uploadToPresignedUrl = useCallback(
    (file: File, uploadURL: string, runId: number): Promise<void> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", uploadURL, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && runIdRef.current === runId) {
            // URL negotiation is 0–10%; this is the real byte transfer.
            setProgress(Math.round(10 + (event.loaded / event.total) * 85));
          }
        };

        xhr.onload = () => {
          if (runIdRef.current !== runId) return;
          xhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => {
          if (runIdRef.current === runId) reject(new Error("Network error during upload"));
        };
        xhr.ontimeout = () => {
          if (runIdRef.current === runId) reject(new Error("Upload timed out"));
        };
        xhr.onabort = () => {
          reject(new DOMException("Upload cancelled", "AbortError"));
        };
        xhr.send(file);
      }),
    [],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      // A new selection always supersedes the previous one.
      xhrRef.current?.abort();
      requestControllerRef.current?.abort();
      finalizeControllerRef.current?.abort();
      const runId = ++runIdRef.current;
      const requestController = new AbortController();
      requestControllerRef.current = requestController;

      setIsUploading(true);
      setError(null);
      setProcessingError(null);
      setStatus("requesting");
      setProgress(0);

      try {
        setProgress(10);
        const uploadResponse = await requestUploadUrl(file, requestController.signal);
        if (runIdRef.current !== runId) return null;

        setStatus("uploading");
        await uploadToPresignedUrl(file, uploadResponse.uploadURL, runId);
        if (runIdRef.current !== runId) return null;

        setProgress(100);
        const isVideo = file.type.startsWith("video/") ||
          !!file.name.toLowerCase().match(/\.(mov|mp4|m4v|avi|webm)$/);
        const shouldFinalize = options.finalizeVideo !== false && isVideo;
        setStatus(shouldFinalize ? "processing" : "success");
        // Transfer is complete. Do not make the caller wait for ffmpeg.
        setIsUploading(false);
        options.onSuccess?.(uploadResponse);

        if (shouldFinalize && runIdRef.current === runId) {
          const finalizeController = new AbortController();
          finalizeControllerRef.current = finalizeController;
          void nativeFetch("/api/uploads/finalize-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectPath: uploadResponse.objectPath }),
            signal: finalizeController.signal,
          }).then((response) => {
            if (!response.ok) throw new Error("Video compatibility processing failed");
            if (runIdRef.current === runId) setStatus("success");
          }).catch((processingFailure) => {
            if (runIdRef.current !== runId || isAbortError(processingFailure)) return;
            const normalized = processingFailure instanceof Error
              ? processingFailure
              : new Error("Video compatibility processing failed");
            setProcessingError(normalized);
            // The transferred original remains a valid fallback.
            setStatus("success");
            options.onProcessingError?.(normalized);
          });
        }

        return uploadResponse;
      } catch (uploadFailure) {
        if (runIdRef.current !== runId || isAbortError(uploadFailure)) {
          if (runIdRef.current === runId) {
            setIsUploading(false);
            setStatus("cancelled");
          }
          return null;
        }
        const normalized = uploadFailure instanceof Error ? uploadFailure : new Error("Upload failed");
        setError(normalized);
        setStatus("error");
        setIsUploading(false);
        options.onError?.(normalized);
        return null;
      } finally {
        if (runIdRef.current === runId) {
          requestControllerRef.current = null;
          xhrRef.current = null;
        }
      }
    },
    [requestUploadUrl, uploadToPresignedUrl, options],
  );

  const cancelUpload = useCallback(() => {
    ++runIdRef.current;
    requestControllerRef.current?.abort();
    xhrRef.current?.abort();
    finalizeControllerRef.current?.abort();
    requestControllerRef.current = null;
    xhrRef.current = null;
    finalizeControllerRef.current = null;
    setIsUploading(false);
    setError(null);
    setProcessingError(null);
    setProgress(0);
    setStatus("cancelled");
  }, []);

  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>,
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      const response = await nativeFetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name || "upload",
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) throw new Error("Failed to get upload URL");
      const data = await response.json();
      return {
        method: "PUT",
        url: data.uploadURL,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    [],
  );

  return {
    uploadFile,
    cancelUpload,
    getUploadParameters,
    isUploading,
    error,
    progress,
    status,
    processingError,
  };
}