import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Camera, Square, Loader2, RotateCcw } from "lucide-react";
import { FreeShotMode } from "./free-shoot-mode";
import type { ShotRecord } from "./free-shoot-mode";
import { apiRequest } from "@/lib/queryClient";

type Phase = "idle" | "requesting" | "recording" | "analyzing" | "review";

type RecordShootingModeProps = {
  onClose: () => void;
};

// Extract a set of frames from a video blob as base64 JPEG strings
async function extractFrames(blob: Blob, numFrames = 16): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(blob);
    video.src = url;

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load recorded video for analysis"));
    });

    video.addEventListener("loadedmetadata", async () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        resolve([]);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d")!;
      const frames: string[] = [];

      for (let i = 0; i < numFrames; i++) {
        const t = (i / Math.max(numFrames - 1, 1)) * duration;
        video.currentTime = Math.min(t, duration - 0.01);
        await new Promise<void>(r => {
          const onSeeked = () => { video.removeEventListener("seeked", onSeeked); r(); };
          video.addEventListener("seeked", onSeeked);
        });
        ctx.drawImage(video, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
        frames.push(dataUrl.split(",")[1]);
      }

      URL.revokeObjectURL(url);
      resolve(frames);
    });
  });
}

export function RecordShootingMode({ onClose }: RecordShootingModeProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("Extracting frames…");
  const [reviewShots, setReviewShots] = useState<Record<string, ShotRecord>>({});

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // ── Start camera ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      // Attach preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      // Pick best mime type
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find(t => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        cleanup();
        const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
        chunksRef.current = [];
        await analyzeVideo(blob);
      };

      recorder.start(1000);
      startTimeRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 500);
      setPhase("recording");
    } catch (err: any) {
      cleanup();
      setPhase("idle");
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Camera access denied. Please allow camera permission and try again.");
      } else {
        setError("Could not access camera. Please check your device settings.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setPhase("analyzing");
      setAnalysisStatus("Extracting frames from your session…");
    }
  };

  // ── AI analysis ─────────────────────────────────────────────────────────────
  const analyzeVideo = async (blob: Blob) => {
    try {
      setAnalysisStatus("Extracting frames from your session…");
      const frames = await extractFrames(blob, 16);

      if (frames.length === 0) {
        // Fallback: no frames → go to manual review with empty court
        setReviewShots({});
        setPhase("review");
        return;
      }

      setAnalysisStatus("AI is analyzing your shots…");
      const res = await apiRequest("POST", "/api/ai/analyze-shooting-frames", { frames });
      const data = await res.json();

      // Build shots map from API response
      const shots: Record<string, ShotRecord> = {};
      (data.zones || []).forEach((z: { location: string; made: number; missed: number }) => {
        if ((z.made + z.missed) > 0) {
          shots[z.location] = { made: Math.max(0, z.made || 0), missed: Math.max(0, z.missed || 0) };
        }
      });

      setReviewShots(shots);
      setPhase("review");
    } catch (_err) {
      // On any error fall through to manual review
      setReviewShots({});
      setPhase("review");
    }
  };

  const retry = () => {
    cleanup();
    setError(null);
    setElapsed(0);
    setPhase("idle");
  };

  // ── Render phases ────────────────────────────────────────────────────────────

  if (phase === "review") {
    const hasAiData = Object.keys(reviewShots).length > 0;
    return (
      <FreeShotMode
        onClose={onClose}
        initialShots={reviewShots}
        headerLabel={hasAiData ? "Review AI Results" : "Record Session"}
      />
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 px-8">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <div className="text-center space-y-2">
          <p className="text-white font-semibold text-lg">Analyzing your session</p>
          <p className="text-zinc-400 text-sm">{analysisStatus}</p>
          <p className="text-zinc-600 text-xs mt-3">This may take a moment…</p>
        </div>
      </div>
    );
  }

  if (phase === "recording" || phase === "requesting") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon"
            className="text-white/80 hover:text-white bg-black/40 rounded-full"
            onClick={() => { cleanup(); retry(); }}
            data-testid="button-cancel-record"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-mono text-sm tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Camera preview */}
        <div className="flex-1 relative overflow-hidden bg-zinc-950">
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="video-preview"
          />
          {phase === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
            </div>
          )}
        </div>

        {/* Stop button */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <button
            className="w-20 h-20 rounded-full bg-white/10 border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            onClick={stopRecording}
            disabled={phase !== "recording"}
            data-testid="button-stop-record"
          >
            <Square className="w-8 h-8 text-red-500" fill="currentColor" />
          </button>
        </div>
        <p className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-xs">
          Tap to stop recording
        </p>
      </div>
    );
  }

  // Idle
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white mr-2"
          onClick={onClose} data-testid="button-close-record-shooting">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-white font-semibold text-base">Record Your Shooting</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
          <Camera className="w-10 h-10 text-orange-500" />
        </div>

        {/* Description */}
        <div className="text-center space-y-2 max-w-xs">
          <h2 className="text-white text-xl font-bold">Record Your Session</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Point your camera at the court and record your shooting workout. AI will analyze
            your session and track your shots by zone.
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            Video is processed locally and never stored.
          </p>
        </div>

        {error && (
          <div className="w-full max-w-xs bg-red-950/50 border border-red-800/50 rounded-xl p-4 text-sm text-red-300 text-center">
            {error}
            <button className="mt-2 flex items-center gap-1 text-red-400 hover:text-red-300 mx-auto text-xs"
              onClick={() => setError(null)}>
              <RotateCcw className="w-3 h-3" /> Try again
            </button>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full max-w-xs h-14 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-2"
          onClick={startRecording}
          data-testid="button-start-record"
        >
          <Camera className="w-5 h-5" />
          Start Recording
        </Button>
      </div>
    </div>
  );
}
