import { useState, useMemo, useEffect, useRef, useCallback, startTransition } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, nativeFetch, getObjectUrl } from "@/lib/queryClient";
import { track } from "@/lib/track";
import { 
  Plus, 
  Clock, 
  Target, 
  Calendar,
  ClipboardList,
  Play,
  Save,
  X,
  Dumbbell,
  User,
  Bookmark,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Copy,
  Eye,
  Pencil,
  MoreVertical,
  Timer,
  Check,
  Trophy,
  Medal,
  Trash2,
  Globe,
  Upload,
  Video,
  Star,
  Heart,
  Search,
  Loader2,
  Share2,
  Info,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, TrainingLog, DrillMetric, MetricTemplate, Workout, WorkoutDrill, ShotLocationDB, Challenge, UserChallenge } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, insertDrillSchema, insertWorkoutSchema } from "@shared/schema";
import { FreeShotMode } from "@/components/free-shoot-mode";
import { WorkoutShareDialog } from "@/components/workout-share-dialog";
import { DrillTimer } from "@/components/drill-timer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };

// ─── Camera Record Modal ──────────────────────────────────────────────────
function CameraRecordModal({
  drillTitle,
  onClose,
  onFile,
}: {
  drillTitle: string;
  onClose: () => void;
  onFile: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: true })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; }
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.name === "NotAllowedError" ? "Camera permission denied. Please allow camera access and try again." : `Camera error: ${err.message}`);
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `drill-${Date.now()}.${ext}`, { type: blob.type });
      onFile(file);
      onClose();
    };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, [onFile, onClose]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Dialog open onOpenChange={() => { if (!recording) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="w-4 h-4 text-red-500" />
            Record — {drillTitle}
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="px-4 pb-6 text-center space-y-2">
            <p className="text-sm text-red-400">{error}</p>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video object-cover"
            />
            {recording && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-xs font-mono">{fmt(seconds)}</span>
              </div>
            )}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              {!recording ? (
                <Button
                  onClick={startRecording}
                  disabled={!ready}
                  className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600 border-4 border-white shadow-lg"
                  data-testid="btn-start-recording"
                >
                  <Camera className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 border-4 border-red-500 shadow-lg"
                  data-testid="btn-stop-recording"
                >
                  <span className="w-5 h-5 rounded-sm bg-red-500 block" />
                </Button>
              )}
              {!recording && (
                <Button variant="outline" size="sm" onClick={onClose} className="self-center" data-testid="btn-cancel-recording">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type WorkoutWithDrills = {
  workout: Workout;
  drills: Array<WorkoutDrill & { drill: Drill }>;
};

type WorkoutDrillEntry = {
  drillId: string;
  drill: Drill;
  duration: number;
  notes: string;
  metrics: Record<string, number>;
  drillMetrics: DrillMetricWithTemplate[];
  shotLocation?: string;
  shotsAttempted?: number;
  shotsMade?: number;
  trackToChallengeIds?: string[]; // IDs of challenges to update progress for
};

// Use insert schemas from shared/schema.ts with UI-specific extensions
const createDrillFormSchema = insertDrillSchema.pick({
  title: true,
  description: true,
  category: true,
  difficulty: true,
  trackShots: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  trackShots: z.boolean().default(false),
  tips: z.string().optional(),
  equipment: z.string().optional(),
  isShared: z.boolean().default(false),
});

type CreateDrillFormData = z.infer<typeof createDrillFormSchema>;

const saveWorkoutFormSchema = insertWorkoutSchema.pick({
  name: true,
  description: true,
  category: true,
}).extend({
  name: z.string().min(1, "Workout name is required"),
});

type SaveWorkoutFormData = z.infer<typeof saveWorkoutFormSchema>;

export default function TrainingLogPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const [selectedDrillIds, setSelectedDrillIds] = useState<Set<string>>(new Set());
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutDrillEntry[]>([]);
  const [isCreateDrillOpen, setIsCreateDrillOpen] = useState(() => {
    return new URLSearchParams(searchParams).get('create') === '1';
  });
  const [isSaveWorkoutOpen, setIsSaveWorkoutOpen] = useState(false);
  const [isAddDrillToWorkoutOpen, setIsAddDrillToWorkoutOpen] = useState(false);
  const [isStartWorkoutDialogOpen, setIsStartWorkoutDialogOpen] = useState(false);
  const [drillSearchQuery, setDrillSearchQuery] = useState("");
  const [selectedMetricTemplateIds, setSelectedMetricTemplateIds] = useState<string[]>([]);
  const [presetRounds, setPresetRounds] = useState<Array<{ shotLocation?: string; metricValues: Record<string, number> }>>([]);
  const [drillVideoFile, setDrillVideoFile] = useState<File | null>(null);
  const [drillVideoUploading, setDrillVideoUploading] = useState(false);
  const [drillVideoProgress, setDrillVideoProgress] = useState(0);
  const [activeView, setActiveView] = useState<"library" | "workout" | "history">("library");
  const [showFavoriteDialog, setShowFavoriteDialog] = useState(false);
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCreateWorkoutMode, setShowCreateWorkoutMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [drillInfoOpen, setDrillInfoOpen] = useState<Drill | null>(null);
  const [drillRecordings, setDrillRecordings] = useState<Record<string, string>>({});
  const [drillRecordingUploading, setDrillRecordingUploading] = useState<string | null>(null);
  const [cameraRecordTarget, setCameraRecordTarget] = useState<{ drillId: string; drillTitle: string } | null>(null);
  const recordInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const [newChallenge, setNewChallenge] = useState({
    name: "",
    description: "",
    category: "shooting" as "shooting" | "ball-handling" | "passing" | "workout",
    metric: "makes" as "makes" | "dribbles" | "passes" | "reps" | "time" | "score",
    goalType: "total" as "total" | "consecutive" | "timed",
    targetValue: 100,
    timeLimit: undefined as number | undefined
  });
  
  const [challengesSectionOpen, setChallengesSectionOpen] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  
  // Single workout-level timer state
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [, setWorkoutTimerTick] = useState(0);
  // drillId → timestamp (ms) when that drill was first added to the session
  const [drillStartTimes, setDrillStartTimes] = useState<Record<string, number>>({});

  // ── localStorage draft persistence ──────────────────────────────────────────
  const WORKOUT_DRAFT_KEY = "playr1_workout_draft";

  // Restore draft on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WORKOUT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.workoutEntries && draft.workoutEntries.length > 0) {
        setWorkoutEntries(draft.workoutEntries);
        setWorkoutInProgress(true);
        if (draft.workoutStartTime) setWorkoutStartTime(draft.workoutStartTime);
        if (draft.drillStartTimes) setDrillStartTimes(draft.drillStartTimes);
        if (draft.activeView === "workout") setActiveView("workout");
      }
    } catch {
      // Ignore corrupt drafts
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft whenever workout state changes
  useEffect(() => {
    if (workoutInProgress && workoutEntries.length > 0) {
      try {
        localStorage.setItem(WORKOUT_DRAFT_KEY, JSON.stringify({
          workoutEntries,
          workoutStartTime,
          drillStartTimes,
          activeView,
        }));
      } catch {
        // Ignore storage errors (e.g. quota exceeded)
      }
    }
  }, [workoutInProgress, workoutEntries, workoutStartTime, drillStartTimes, activeView]);

  // Auto-start the timer the moment a workout begins — no manual button needed
  useEffect(() => {
    if (workoutInProgress && !workoutStartTime) {
      setWorkoutStartTime(Date.now());
    }
  }, [workoutInProgress]);

  // Tick effect — rerenders the header clock every second while timer runs
  useEffect(() => {
    if (!workoutStartTime) return;
    const interval = setInterval(() => setWorkoutTimerTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  // Format a millisecond duration into M:SS or H:MM:SS
  const formatMs = (ms: number): string => {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format a stored minutes value for display — handles 0 from very short sessions
  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes <= 0) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Current workout elapsed display (re-renders via workoutTimerTick)
  const workoutElapsed = workoutStartTime ? formatMs(Date.now() - workoutStartTime) : "0:00";

  // Converts an absolute timestamp to "X:XX into workout"
  const relativeTime = (timestamp: number): string => {
    if (!workoutStartTime) return "";
    return formatMs(timestamp - workoutStartTime);
  };

  // Stamp a drill's start time (only sets once — preserves original)
  const stampDrillStart = (drillId: string) => {
    setDrillStartTimes(prev => prev[drillId] ? prev : { ...prev, [drillId]: Date.now() });
  };
  
  // Free Shoot / Live Record state
  const [showFreeShotMode, setShowFreeShotMode] = useState(false);
  // View/Edit log state
  const [viewEditLogId, setViewEditLogId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLogDuration, setEditLogDuration] = useState(0);
  const [editLogNotes, setEditLogNotes] = useState("");
  const [editLogMetrics, setEditLogMetrics] = useState<Record<string, number>>({});
  const [editLogShotLocation, setEditLogShotLocation] = useState<string | null>(null);
  const [editLogShotsAttempted, setEditLogShotsAttempted] = useState<number | null>(null);
  const [editLogShotsMade, setEditLogShotsMade] = useState<number | null>(null);

  // Fetch Handlz drills (admin drills with userId = null) - server filters correctly
  const { data: handlzDrills, isLoading: handlzDrillsLoading, isError: drillsLoadError, refetch: refetchDrills } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
    select: (drills) => drills.filter(d => d.userId === null),
  });

  // Fetch user's personal drills using the dedicated endpoint
  const { data: personalDrills, isLoading: personalDrillsLoading } = useQuery<Drill[]>({
    queryKey: ['/api/user/my-drills'],
  });

  // Fetch community drills (shared by other users)
  const { data: communityDrills, isLoading: communityDrillsLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills/community'],
  });

  // Fetch shot locations from Admin Picklists (DB-managed)
  const { data: shotLocationOptions } = useQuery<ShotLocationDB[]>({
    queryKey: ['/api/shot-locations'],
    select: (locs) => locs.filter(l => l.active).sort((a, b) => a.sortOrder - b.sortOrder),
  });
  
  // Combined drills for lookup
  const allDrills = useMemo(() => {
    const combined: Drill[] = [];
    if (handlzDrills) combined.push(...handlzDrills);
    if (personalDrills) combined.push(...personalDrills);
    if (communityDrills) combined.push(...communityDrills);
    return combined;
  }, [handlzDrills, personalDrills, communityDrills]);

  // Handle drill query parameter - auto-start workout with specified drill
  const [location, setLocation] = useLocation();
  const drillParamHandled = useRef(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'workout' || tabParam === 'history' || tabParam === 'library') {
      setActiveView(tabParam);
    }
  }, []);

  useEffect(() => {
    // Only handle the drill param once, and wait until drill queries have finished loading
    const isDrillsLoading = handlzDrillsLoading || personalDrillsLoading || communityDrillsLoading;
    if (drillParamHandled.current || isDrillsLoading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const drillId = urlParams.get('drill');
    if (!drillId) return;

    drillParamHandled.current = true;

    (async () => {
      try {
        // Try library first; fall back to direct API fetch (e.g. AI-generated daily challenge drills)
        let drill: Drill | undefined = allDrills?.find(d => d.id === drillId);
        if (!drill) {
          const res = await nativeFetch(`/api/drills/${drillId}`);
          if (res.ok) drill = await res.json();
        }
        if (!drill) return;

        // Fetch metrics for the drill
        const metricsRes = await nativeFetch(`/api/drills/${drillId}/metrics`);
        const drillMetrics: DrillMetricWithTemplate[] = metricsRes.ok ? await metricsRes.json() : [];

        const metricValues: Record<string, number> = {};
        drillMetrics.forEach(dm => { metricValues[dm.metricTemplateId] = 0; });

        let autoShotLocation: string | undefined;
        if (drill.trackShots && drill.title.toLowerCase().includes('free throw')) {
          autoShotLocation = 'free-throw';
        }

        setWorkoutEntries([{
          drillId: drill.id,
          drill,
          duration: 0,
          notes: '',
          metrics: metricValues,
          drillMetrics,
          shotLocation: autoShotLocation,
        }]);
        setWorkoutInProgress(true);
        setActiveView("workout");

        // Clear the URL parameter
        setLocation('/log', { replace: true });
      } catch (error) {
        console.error('Failed to start drill workout:', error);
      }
    })();
  }, [handlzDrillsLoading, personalDrillsLoading, communityDrillsLoading, allDrills, setLocation]);

  // Fetch workouts
  const { data: handlzWorkouts, isLoading: handlzWorkoutsLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts/handlz'],
  });

  const { data: personalWorkouts, isLoading: personalWorkoutsLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts/personal'],
  });

  // Fetch training logs
  type TrainingLogWithMetricsResponse = TrainingLog & { metrics: Array<{ metricId: string; value: string | null }> };
  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLogWithMetricsResponse[]>({
    queryKey: ['/api/training-logs'],
  });

  // Fetch metric templates for displaying stats
  const { data: metricTemplates } = useQuery<MetricTemplate[]>({
    queryKey: ['/api/metric-templates'],
  });

  // Fetch user's active challenges for tracking
  const { data: activeChallenges } = useQuery<Array<UserChallenge & { challenge: Challenge }>>({
    queryKey: ['/api/challenges/my-challenges'],
  });

  // Fetch user's active leaderboard challenge participations for shot highlighting
  const { data: activeLCChallenges } = useQuery<Array<{ id: string; title: string; metric: string; shotLocation: string | null; accentColor: string | null }>>({
    queryKey: ['/api/leaderboard-challenges/my-active'],
  });

  const { data: allChallenges } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges']
  });

  const { data: favoriteDrillIds } = useQuery<string[]>({
    queryKey: ['/api/user/favorite-drills'],
  });

  // Group drills by category
  const groupByCategory = (drills: Drill[]) => {
    const grouped: Record<string, Drill[]> = {};
    drills.forEach(drill => {
      const cat = drill.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(drill);
    });
    return grouped;
  };

  
  const drillsLoading = handlzDrillsLoading || personalDrillsLoading || communityDrillsLoading;

  // Get active challenges that match a drill's category
  const getMatchingChallenges = (drillCategory: string) => {
    if (!activeChallenges) return [];
    const categoryMap: Record<string, string> = {
      'shooting': 'shooting',
      'ball-handling': 'ball-handling',
      'passing': 'passing',
      'finishing': 'shooting',
      'workouts': 'workout',
      'defense': 'workout',
      'film-session': 'workout',
    };
    const challengeCategory = categoryMap[drillCategory] || drillCategory;
    return activeChallenges.filter(uc =>
      !uc.isCompleted && uc.challenge.category === challengeCategory
    );
  };

  // Get active leaderboard challenges matching a shot location
  const getMatchingLCChallenges = (shotLocation: string) => {
    if (!activeLCChallenges?.length) return [];
    return activeLCChallenges.filter(c =>
      c.metric === 'shots_made' &&
      (c.shotLocation === null || c.shotLocation === shotLocation)
    );
  };

  // Upload a drill recording to Film Room
  const uploadDrillRecording = async (drillId: string, drillTitle: string, file: File) => {
    setDrillRecordingUploading(drillId);
    try {
      // Generate thumbnail from video
      const thumbnailBlob = await new Promise<Blob | null>((resolve) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);
        video.src = url; video.muted = true; video.playsInline = true; video.preload = "metadata";
        const capture = () => {
          try {
            const MAX = 640;
            const scale = Math.min(MAX / video.videoWidth, MAX / video.videoHeight, 1);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, "image/jpeg", 0.82);
          } catch { URL.revokeObjectURL(url); resolve(null); }
        };
        video.addEventListener("loadedmetadata", () => { video.currentTime = video.duration > 1 ? 1 : 0; });
        video.addEventListener("seeked", capture);
        video.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(null); });
      });

      // Request presigned URL (strip codec suffix so "video/webm;codecs=vp9,opus" → "video/webm")
      const baseContentType = (file.type || "video/mp4").split(";")[0].trim();
      const urlRes = await nativeFetch("/api/user/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: baseContentType }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // Upload video
      const uploadRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": baseContentType } });
      if (!uploadRes.ok) throw new Error("Upload failed");

      // Finalize (non-fatal)
      try { await nativeFetch("/api/uploads/finalize-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectPath }) }); } catch {}

      // Upload thumbnail
      let thumbPath: string | null = null;
      if (thumbnailBlob) {
        try {
          const thumbFile = new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" });
          const tr = await nativeFetch("/api/user/uploads/photo-url", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "thumbnail.jpg", size: thumbFile.size, contentType: "image/jpeg" }),
          });
          if (tr.ok) {
            const { uploadURL: tURL, objectPath: tPath } = await tr.json();
            await fetch(tURL, { method: "PUT", body: thumbFile, headers: { "Content-Type": "image/jpeg" } });
            thumbPath = tPath;
          }
        } catch {}
      }

      // Save to Film Room
      await apiRequest("POST", "/api/videos", {
        title: `${drillTitle} — Training Recording`,
        videoUrl: objectPath,
        thumbnailUrl: thumbPath,
        drillId,
        isPublic: false,
        description: "Recorded during a training session",
      });
      setDrillRecordings(prev => ({ ...prev, [drillId]: objectPath }));
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({ title: "Recording saved to Film Room", description: "View it any time in your Film Room." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Recording Failed", description: msg, variant: "destructive" });
    } finally {
      setDrillRecordingUploading(null);
    }
  };

  // Create drill form
  const createDrillForm = useForm<CreateDrillFormData>({
    resolver: zodResolver(createDrillFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "ball-handling",
      difficulty: "beginner",
      trackShots: false,
      tips: "",
      equipment: "",
      isShared: false,
    },
  });
  const createDrillTrackShots = createDrillForm.watch("trackShots");

  // Save workout form
  const saveWorkoutForm = useForm<SaveWorkoutFormData>({
    resolver: zodResolver(saveWorkoutFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  });

  // Create drill mutation
  const createDrillMutation = useMutation({
    mutationFn: async (data: CreateDrillFormData) => {
      let videoUrl: string | null = null;
      if (drillVideoFile) {
        setDrillVideoUploading(true);
        setDrillVideoProgress(10);
        const metaRes = await nativeFetch("/api/user/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: drillVideoFile.name, size: drillVideoFile.size, contentType: drillVideoFile.type || "video/mp4" }),
        });
        if (!metaRes.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = await metaRes.json();
        setDrillVideoProgress(30);
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          body: drillVideoFile,
          headers: { "Content-Type": drillVideoFile.type || "video/mp4" },
        });
        if (!uploadRes.ok) throw new Error("Video upload failed");
        setDrillVideoProgress(100);
        setDrillVideoUploading(false);
        videoUrl = objectPath;
      }
      const tipsArray = data.tips
        ? data.tips.split("\n").map(t => t.trim()).filter(Boolean)
        : [];
      const equipmentArray = data.equipment
        ? data.equipment.split(",").map(e => e.trim()).filter(Boolean)
        : [];
      const response = await apiRequest("POST", "/api/user/drills", {
        ...data,
        tips: tipsArray,
        equipment: equipmentArray,
        ...(videoUrl ? { videoUrl } : {}),
        ...(presetRounds.length > 0 ? { presetRounds } : {}),
      });
      const newDrill = await response.json();
      if (selectedMetricTemplateIds.length > 0) {
        await apiRequest("POST", `/api/drills/${newDrill.id}/metrics`, { 
          metricTemplateIds: selectedMetricTemplateIds 
        });
      }
      return newDrill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/my-drills'] });
      toast({ title: "Drill created successfully" });
      setIsCreateDrillOpen(false);
      createDrillForm.reset();
      setSelectedMetricTemplateIds([]);
      setPresetRounds([]);
      setDrillVideoFile(null);
      setDrillVideoUploading(false);
      setDrillVideoProgress(0);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create drill", description: error.message, variant: "destructive" });
      setDrillVideoUploading(false);
      setDrillVideoProgress(0);
    },
  });

  // Save workout mutation
  const saveWorkoutMutation = useMutation({
    mutationFn: async (data: SaveWorkoutFormData & { drillIds?: string[]; asFavorite?: boolean }) => {
      const drillIds = data.drillIds || workoutEntries.map(e => e.drillId);
      const totalDuration = workoutEntries.length > 0 ? workoutEntries.reduce((sum, e) => sum + e.duration, 0) : 0;
      return await apiRequest("POST", "/api/workouts", {
        name: data.name,
        description: data.description,
        category: data.category === "none" ? null : (data.category || null),
        estimatedDuration: totalDuration,
        drillIds,
        isFavorite: data.asFavorite || false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/personal'] });
      toast({ title: "Workout saved successfully" });
      setIsSaveWorkoutOpen(false);
      setShowCreateWorkoutMode(false);
      saveWorkoutForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to save workout", variant: "destructive" });
    },
  });

  const favoriteDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      return await apiRequest("POST", `/api/user/favorite-drills/${drillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/favorite-drills'] });
    },
  });

  const unfavoriteDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      return await apiRequest("DELETE", `/api/user/favorite-drills/${drillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/favorite-drills'] });
    },
  });

  const favoriteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      return await apiRequest("PUT", `/api/workouts/${workoutId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/personal'] });
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: typeof newChallenge) => {
      const res = await apiRequest("POST", '/api/challenges', data);
      const challenge = await res.json();
      await apiRequest("POST", `/api/challenges/${challenge.id}/start`);
      return challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
      setShowChallengeDialog(false);
      setNewChallenge({
        name: "",
        description: "",
        category: "shooting",
        metric: "makes",
        goalType: "total",
        targetValue: 100,
        timeLimit: undefined
      });
      toast({
        title: "Challenge Started!",
        description: "Your challenge is now active and ready to track!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create challenge. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return await apiRequest("POST", `/api/challenges/${challengeId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
      toast({
        title: "Challenge Started",
        description: "Good luck with your challenge!",
      });
    }
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return await apiRequest("DELETE", `/api/challenges/${challengeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
      toast({ title: "Challenge deleted" });
    }
  });

  // Create training log mutation
  const createLogMutation = useMutation({
    mutationFn: async (data: { drillId: string; duration: number; notes?: string; score?: number }) => {
      return await apiRequest("POST", "/api/training-logs", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard-challenges'] });
      track("drill_log_completed", { drillId: variables?.drillId, duration: variables?.duration });
    },
  });

  // Fetch single training log with metrics for view/edit
  type TrainingLogWithMetrics = TrainingLog & { metrics: Array<{ metricId: string; value: string | null }> };
  const { data: viewEditLog, isLoading: viewEditLogLoading } = useQuery<TrainingLogWithMetrics>({
    queryKey: ['/api/training-logs', viewEditLogId],
    enabled: !!viewEditLogId,
  });

  // Update training log mutation
  const updateLogMutation = useMutation({
    mutationFn: async (data: { 
      id: string; 
      duration: number; 
      notes: string; 
      metrics: Array<{ metricId: string; value: number }>;
      shotLocation?: string | null;
      shotsAttempted?: number | null;
      shotsMade?: number | null;
    }) => {
      return await apiRequest("PUT", `/api/training-logs/${data.id}`, {
        duration: data.duration,
        notes: data.notes,
        metrics: data.metrics,
        shotLocation: data.shotLocation,
        shotsAttempted: data.shotsAttempted,
        shotsMade: data.shotsMade,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs', viewEditLogId] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard-challenges'] });
      toast({ title: "Training log updated" });
      setViewEditLogId(null);
      setIsEditMode(false);
    },
    onError: () => {
      toast({ title: "Failed to update log", variant: "destructive" });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/training-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      toast({ title: "Training log deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete log", variant: "destructive" });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (logIds: string[]) => {
      await Promise.all(logIds.map(id => apiRequest("DELETE", `/api/training-logs/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      toast({ title: "Workout session deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete session", variant: "destructive" });
    },
  });

  // Open log for viewing
  const openViewLog = (logId: string) => {
    setViewEditLogId(logId);
    setIsEditMode(false);
  };

  // Open log for editing
  const openEditLog = (log: TrainingLog) => {
    setViewEditLogId(log.id);
    setIsEditMode(true);
    setEditLogDuration(log.duration);
    setEditLogNotes(log.notes || "");
    setEditLogMetrics({});
    setEditLogShotLocation(log.shotLocation || null);
    setEditLogShotsAttempted(log.shotsAttempted || null);
    setEditLogShotsMade(log.shotsMade || null);
  };

  // Close view/edit dialog
  const closeViewEdit = () => {
    setViewEditLogId(null);
    setIsEditMode(false);
    setEditLogMetrics({});
    setEditLogShotLocation(null);
    setEditLogShotsAttempted(null);
    setEditLogShotsMade(null);
  };

  // Save edited log
  const saveEditedLog = async () => {
    if (!viewEditLogId) return;
    const metricsArray = Object.entries(editLogMetrics).map(([metricId, value]) => ({
      metricId,
      value,
    }));
    updateLogMutation.mutate({
      id: viewEditLogId,
      duration: editLogDuration,
      notes: editLogNotes,
      metrics: metricsArray,
      shotLocation: editLogShotLocation,
      shotsAttempted: editLogShotsAttempted,
      shotsMade: editLogShotsMade,
    });
  };

  // Look up the DB label for a shot location slug; fall back to slug-to-text
  const getLocationLabel = (slug: string): string => {
    const loc = shotLocationOptions?.find(l => l.slug === slug);
    if (loc) return loc.label;
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get formatted metrics stats for display on history cards
  const getMetricStats = (log: TrainingLogWithMetricsResponse, drillId: string) => {
    // First, check for new per-log shot fields (preferred)
    if (log.shotsAttempted && log.shotsAttempted > 0) {
      const percentage = Math.round(((log.shotsMade || 0) / log.shotsAttempted) * 100);
      return {
        attempts: log.shotsAttempted,
        made: log.shotsMade || 0,
        percentage,
        location: log.shotLocation
      };
    }
    
    // Fallback to legacy metric-based calculation for backward compatibility
    if (!log.metrics || log.metrics.length === 0) return null;
    
    const drill = allDrills?.find(d => d.id === drillId);
    if (!drill) return null;
    
    // Find metric templates for this drill
    const templateIds = log.metrics.map(m => m.metricId);
    const templates = (metricTemplates || []).filter(t => templateIds.includes(t.id));
    
    let totalAttempts = 0;
    let totalMade = 0;
    
    log.metrics.forEach(m => {
      const template = templates.find(t => t.id === m.metricId);
      if (template && m.value !== null && m.value !== "") {
        const numValue = parseFloat(m.value);
        if (!isNaN(numValue)) {
          // Track shooting stats
          const labelLower = template.label.toLowerCase();
          const nameLower = template.name.toLowerCase();
          if (labelLower.includes('attempt') || nameLower.includes('attempt')) {
            totalAttempts += numValue;
          }
          if ((labelLower.includes('made') || nameLower.includes('made')) && 
              !labelLower.includes('attempt') && !nameLower.includes('attempt')) {
            totalMade += numValue;
          }
        }
      }
    });
    
    // Calculate shooting percentage if we have attempts and made
    if (totalAttempts > 0) {
      const percentage = Math.round((totalMade / totalAttempts) * 100);
      return {
        attempts: totalAttempts,
        made: totalMade,
        percentage,
        location: undefined
      };
    }
    
    return null;
  };

  // Toggle drill selection
  const toggleDrillSelection = (drillId: string) => {
    setSelectedDrillIds(prev => {
      const next = new Set(prev);
      if (next.has(drillId)) {
        next.delete(drillId);
      } else {
        next.add(drillId);
      }
      return next;
    });
  };

  // Fetch drill metrics for a drill
  const fetchDrillMetrics = async (drillId: string): Promise<DrillMetricWithTemplate[]> => {
    try {
      const response = await nativeFetch(`/api/drills/${drillId}/metrics`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  };

  // Start workout with selected drills
  const startWorkoutFromDrills = async () => {
    if (selectedDrillIds.size === 0) {
      toast({ title: "Please select at least one drill", variant: "destructive" });
      return;
    }

    const drillIds = Array.from(selectedDrillIds);
    const entriesArrays = await Promise.all(
      drillIds.map(id => {
        const drill = allDrills?.find(d => d.id === id);
        return drill ? buildDrillEntries(id, drill) : Promise.resolve([]);
      })
    );

    const entries = entriesArrays.flat();
    setWorkoutEntries(entries);
    setWorkoutInProgress(true);
    setActiveView("workout");
  };

  // Preset round builder helpers (used in Create Drill dialog)
  const addPresetRound = () => {
    const metricValues: Record<string, number> = {};
    selectedMetricTemplateIds.forEach(id => { metricValues[id] = 0; });
    setPresetRounds(prev => [...prev, { metricValues }]);
  };
  const removePresetRound = (idx: number) => setPresetRounds(prev => prev.filter((_, i) => i !== idx));
  const updatePresetRoundLocation = (idx: number, slug: string) =>
    setPresetRounds(prev => prev.map((r, i) => i === idx ? { ...r, shotLocation: (slug && slug !== '__any__') ? slug : undefined } : r));
  const updatePresetRoundMetric = (idx: number, templateId: string, val: number) =>
    setPresetRounds(prev => prev.map((r, i) => i === idx ? { ...r, metricValues: { ...r.metricValues, [templateId]: val } } : r));

  // Build entries for a single drill, respecting its presets
  const buildDrillEntries = async (drillId: string, drill: Drill): Promise<WorkoutDrillEntry[]> => {
    const drillMetrics = await fetchDrillMetrics(drillId);
    const rounds = (drill as any).presetRounds as Array<{ shotLocation?: string; metricValues: Record<string, number> }> | undefined;

    // If the drill has preset rounds, use them directly
    if (rounds && rounds.length > 0) {
      return rounds.map(round => {
        const metricValues: Record<string, number> = {};
        drillMetrics.forEach(dm => {
          metricValues[dm.metricTemplateId] = round.metricValues?.[dm.metricTemplateId] ?? 0;
        });
        return {
          drillId,
          drill,
          duration: Math.round((drill.duration || 300) / 60),
          notes: "",
          metrics: metricValues,
          drillMetrics,
          ...(round.shotLocation ? { shotLocation: round.shotLocation } : {}),
        };
      });
    }

    // No presets — fall back to a single round with auto-detect for free throws
    const metricValues: Record<string, number> = {};
    drillMetrics.forEach(dm => { metricValues[dm.metricTemplateId] = 0; });

    let autoShotLocation: string | undefined;
    if (drill.trackShots) {
      const titleLower = drill.title.toLowerCase();
      if (titleLower.includes('free throw')) {
        const ftLocation = shotLocationOptions?.find(loc => loc.classification === 'free-throw');
        autoShotLocation = ftLocation?.slug || 'free-throw';
      }
    }

    return [{
      drillId,
      drill,
      duration: Math.round((drill.duration || 300) / 60),
      notes: "",
      metrics: metricValues,
      drillMetrics,
      ...(autoShotLocation ? { shotLocation: autoShotLocation } : {}),
    }];
  };

  // Quick start a single drill (for dropdown selection)
  const quickStartDrill = async (drillId: string) => {
    const drill = allDrills?.find(d => d.id === drillId);
    if (!drill) {
      toast({ title: "Drill not found", variant: "destructive" });
      return;
    }

    const entries = await buildDrillEntries(drillId, drill);
    setWorkoutEntries(entries);
    setWorkoutInProgress(true);
    setActiveView("workout");
    // Stamp each drill's start time at workout launch
    const now = Date.now();
    setDrillStartTimes(entries.reduce((acc, e) => ({ ...acc, [e.drillId]: acc[e.drillId] ?? now }), {} as Record<string, number>));
  };

  // Start workout from saved workout template
  const startWorkoutFromTemplate = async (workoutId: string) => {
    try {
      const response = await nativeFetch(`/api/workouts/${workoutId}`);
      if (!response.ok) throw new Error("Failed to fetch workout");
      const data: WorkoutWithDrills = await response.json();

      const drillIds = data.drills.map(wd => wd.drillId);
      const metricsPromises = drillIds.map(id => fetchDrillMetrics(id));
      const metricsResults = await Promise.all(metricsPromises);

      const entries: WorkoutDrillEntry[] = [];
      data.drills.forEach((wd, index) => {
        const drillMetrics = metricsResults[index] || [];
        const metricValues: Record<string, number> = {};
        drillMetrics.forEach(dm => {
          metricValues[dm.metricTemplateId] = 0;
        });
        
        entries.push({
          drillId: wd.drillId,
          drill: wd.drill,
          duration: wd.defaultDuration || Math.round((wd.drill.duration || 300) / 60),
          notes: "",
          metrics: metricValues,
          drillMetrics,
        });
      });

      setWorkoutEntries(entries);
      setWorkoutInProgress(true);
      setActiveView("workout");
      // Stamp each drill's start time at workout launch
      const now = Date.now();
      setDrillStartTimes(entries.reduce((acc, e) => ({ ...acc, [e.drillId]: acc[e.drillId] ?? now }), {} as Record<string, number>));
    } catch {
      toast({ title: "Failed to load workout", variant: "destructive" });
    }
  };

  // Auto-start a workout when navigated with ?startDrills=id1,id2,...
  // (used by Programs "Start workout" deep-link). Idempotent per query value
  // so revisiting with a fresh list re-launches. When `programItemId` and
  // `enrollmentId` are also present we remember them so the program item can
  // be auto-completed once the workout is saved.
  const [lastAutoStartKey, setLastAutoStartKey] = useState<string | null>(null);
  const [pendingProgramCompletion, setPendingProgramCompletion] = useState<{ enrollmentId: string; programItemId: string } | null>(null);
  useEffect(() => {
    if (!allDrills || allDrills.length === 0) return;
    const params = new URLSearchParams(searchParams);
    const list = params.get("startDrills");
    if (!list) return;
    const programItemId = params.get("programItemId");
    const enrollmentId = params.get("enrollmentId");
    const dedupKey = [list, programItemId, enrollmentId].filter(Boolean).join("|");
    if (dedupKey === lastAutoStartKey) return;
    const ids = list.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      setLastAutoStartKey(dedupKey);
      setPendingProgramCompletion(null);
      return;
    }
    setLastAutoStartKey(dedupKey);
    if (programItemId && enrollmentId) {
      setPendingProgramCompletion({ enrollmentId, programItemId });
    } else {
      setPendingProgramCompletion(null);
    }
    (async () => {
      const entriesArrays = await Promise.all(
        ids.map(async (id) => {
          let drill: Drill | undefined = allDrills.find((d) => d.id === id);
          if (!drill) {
            try {
              const res = await nativeFetch(`/api/drills/${id}`);
              if (res.ok) drill = await res.json();
            } catch {}
          }
          return drill ? buildDrillEntries(id, drill) : Promise.resolve([]);
        })
      );
      const entries = entriesArrays.flat();
      if (entries.length === 0) {
        setPendingProgramCompletion(null);
        toast({ title: "Couldn't find those drills", variant: "destructive" });
        return;
      }
      setWorkoutEntries(entries);
      setWorkoutInProgress(true);
      setActiveView("workout");
      const now = Date.now();
      setDrillStartTimes(
        entries.reduce(
          (acc, e) => ({ ...acc, [e.drillId]: acc[e.drillId] ?? now }),
          {} as Record<string, number>
        )
      );
      // Clean the query param so refresh doesn't relaunch
      try { window.history.replaceState({}, "", "/log"); } catch {}
    })();
  }, [allDrills, searchParams, lastAutoStartKey]);

  // Update workout entry
  const updateEntry = (index: number, field: keyof WorkoutDrillEntry, value: any) => {
    setWorkoutEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Apply a challenge to all rounds of a specific drill
  const applyChallengeToAllRounds = (drillId: string, challengeId: string) => {
    setWorkoutEntries(prev => prev.map(e =>
      e.drillId === drillId
        ? { ...e, trackToChallengeIds: challengeId === 'none' ? [] : [challengeId] }
        : e
    ));
  };

  // Apply a challenge to ALL entries in the workout whose category matches
  const applyChallengeToDrillCategory = (category: string, challengeId: string) => {
    setWorkoutEntries(prev => prev.map(e =>
      e.drill.category === category
        ? { ...e, trackToChallengeIds: challengeId === 'none' ? [] : [challengeId] }
        : e
    ));
  };

  // Update metric value for a workout entry
  const updateMetricValue = (entryIndex: number, metricTemplateId: string, value: number) => {
    setWorkoutEntries(prev => {
      const next = [...prev];
      const entry = next[entryIndex];
      next[entryIndex] = { ...entry, metrics: { ...entry.metrics, [metricTemplateId]: value } };
      return next;
    });
  };

  // Remove drill from workout
  const removeFromWorkout = (index: number) => {
    setWorkoutEntries(prev => prev.filter((_, i) => i !== index));
    if (workoutEntries.length <= 1) {
      cancelWorkout();
    }
  };

  // Add another round of the same drill
  const addRound = (index: number) => {
    const entry = workoutEntries[index];
    const newEntry: WorkoutDrillEntry = {
      drillId: entry.drillId,
      drill: entry.drill,
      duration: entry.duration,
      notes: "",
      metrics: Object.fromEntries(
        Object.keys(entry.metrics).map(key => [key, 0])
      ),
      drillMetrics: entry.drillMetrics,
    };
    setWorkoutEntries(prev => [
      ...prev.slice(0, index + 1),
      newEntry,
      ...prev.slice(index + 1)
    ]);
    toast({ title: "Round added", description: `Added another round of ${entry.drill.title}` });
  };

  // Add a new drill to the active workout
  const addDrillToWorkout = async (drillId: string) => {
    const drill = allDrills?.find(d => d.id === drillId);
    if (!drill) {
      toast({ title: "Drill not found", variant: "destructive" });
      return;
    }

    const newEntries = await buildDrillEntries(drillId, drill);
    setWorkoutEntries(prev => [...prev, ...newEntries]);
    stampDrillStart(drillId);
    setIsAddDrillToWorkoutOpen(false);
    toast({ title: "Drill added", description: `${drill.title} added to workout` });
  };

  // Helper to get round number for a drill entry
  const getRoundNumber = (index: number): number => {
    const entry = workoutEntries[index];
    let roundNum = 1;
    for (let i = 0; i < index; i++) {
      if (workoutEntries[i].drillId === entry.drillId) {
        roundNum++;
      }
    }
    return roundNum;
  };

  // Helper to get total rounds for a drill
  const getTotalRounds = (drillId: string): number => {
    return workoutEntries.filter(e => e.drillId === drillId).length;
  };

  // Validate required metrics for all entries
  const validateRequiredMetrics = (): boolean => {
    for (const entry of workoutEntries) {
      const requiredMetrics = entry.drillMetrics.filter(dm => dm.isRequired);
      for (const metric of requiredMetrics) {
        const value = entry.metrics[metric.metricTemplateId];
        if (value === undefined || value <= 0) {
          toast({ 
            title: "Missing Required Metrics", 
            description: `Please fill in "${metric.template.label}" for ${entry.drill.title}`,
            variant: "destructive"
          });
          return false;
        }
      }
    }
    return true;
  };

  // Save workout
  const saveWorkout = async () => {
    if (!validateRequiredMetrics()) return;
    if (isSavingWorkout) return;
    setIsSavingWorkout(true);

    try {
      const sessionId = crypto.randomUUID();
      const challengeUpdates: Record<string, number> = {};

      // Total session duration is whatever the workout timer measured. We do NOT
      // try to allocate it across individual drills/rounds — that produced very
      // confusing inflation (each round of the same drill got the full slice and
      // SUM(duration) ended up 2-3× the real session). Instead we put the entire
      // session total on the first entry and zero on the rest, so SUM still equals
      // the real total. If the timer never started, fall back to the estimated
      // total so old behavior is preserved for ad-hoc logs.
      const saveNow = Date.now();
      const totalElapsedMs = workoutStartTime ? (saveNow - workoutStartTime) : 0;
      const totalSessionMinutes = workoutStartTime
        ? Math.max(0, Math.round(totalElapsedMs / 60000))
        : workoutEntries.reduce((s, e) => s + (e.duration || 0), 0);

      // Build bulk payload synchronously (no awaits)
      const bulkEntries = workoutEntries.map((entry, entryIdx) => {
        const isShootingDrill = entry.drill.trackShots;
        let derivedAttempted: number | undefined;
        let derivedMade: number | undefined;
        if (entry.drillMetrics.length > 0) {
          const attemptMetric = entry.drillMetrics.find(dm => {
            const n = dm.template.name.toLowerCase();
            const l = dm.template.label.toLowerCase();
            return n.includes('attempt') || l.includes('attempt');
          });
          const madeMetric = entry.drillMetrics.find(dm => {
            const n = dm.template.name.toLowerCase();
            const l = dm.template.label.toLowerCase();
            return (n.includes('made') || l.includes('made')) && !n.includes('attempt') && !l.includes('attempt');
          });
          if (attemptMetric) derivedAttempted = entry.metrics[attemptMetric.metricTemplateId] || 0;
          if (madeMetric) derivedMade = entry.metrics[madeMetric.metricTemplateId] || 0;
        }

        // Accumulate challenge updates
        if (entry.trackToChallengeIds && entry.trackToChallengeIds.length > 0) {
          for (const userChallengeId of entry.trackToChallengeIds) {
            const userChallenge = activeChallenges?.find(uc => uc.id === userChallengeId);
            if (!userChallenge) continue;
            const metric = userChallenge.challenge.metric;
            let metricValue = 0;
            if (metric === 'makes') metricValue = derivedMade || 0;
            else if (metric === 'time') metricValue = entry.duration || 0;
            else if (metric === 'reps') {
              const repMetrics = entry.drillMetrics.filter(dm => {
                const n = dm.template.name.toLowerCase();
                return n.includes('rep') || n.includes('count') || n.includes('total');
              });
              metricValue = repMetrics.length > 0
                ? repMetrics.reduce((s, dm) => s + (entry.metrics[dm.metricTemplateId] || 0), 0)
                : entry.drillMetrics.length === 1 ? Object.values(entry.metrics)[0] || 0 : 0;
            } else if (metric === 'score') {
              const scoreMetrics = entry.drillMetrics.filter(dm => {
                const n = dm.template.name.toLowerCase();
                return n.includes('score') || n.includes('point');
              });
              metricValue = scoreMetrics.length > 0
                ? scoreMetrics.reduce((s, dm) => s + (entry.metrics[dm.metricTemplateId] || 0), 0)
                : entry.drillMetrics.length === 1 ? Object.values(entry.metrics)[0] || 0 : 0;
            } else if (metric === 'dribbles') {
              const dribbleMetrics = entry.drillMetrics.filter(dm => {
                const n = dm.template.name.toLowerCase();
                return n.includes('dribble') || n.includes('handle') || n.includes('ball control');
              });
              metricValue = dribbleMetrics.reduce((s, dm) => s + (entry.metrics[dm.metricTemplateId] || 0), 0);
            } else if (metric === 'passes') {
              const passMetrics = entry.drillMetrics.filter(dm => {
                const n = dm.template.name.toLowerCase();
                return n.includes('pass') || n.includes('assist');
              });
              metricValue = passMetrics.reduce((s, dm) => s + (entry.metrics[dm.metricTemplateId] || 0), 0);
            }
            if (metricValue > 0) challengeUpdates[userChallengeId] = (challengeUpdates[userChallengeId] || 0) + metricValue;
          }
        }

        const metrics = Object.entries(entry.metrics).map(([metricId, value]) => ({ metricId, value: Number(value) }));
        return {
          drillId: entry.drillId,
          // Put the entire timer-measured session total on the first entry; others
          // get 0. SUM(duration) across the session = real total time, no inflation.
          duration: entryIdx === 0 ? totalSessionMinutes : 0,
          notes: entry.notes || undefined,
          workoutSessionId: workoutEntries.length > 1 ? sessionId : undefined,
          shotLocation: isShootingDrill ? entry.shotLocation : undefined,
          shotsAttempted: derivedAttempted ?? entry.shotsAttempted,
          shotsMade: derivedMade ?? entry.shotsMade,
          metrics,
        };
      });

      // Snapshot pending program completion before we clear state below
      const programCompletion = pendingProgramCompletion;

      // Single bulk request + challenge updates all in parallel
      const challengeRequests = Object.entries(challengeUpdates).map(async ([userChallengeId, addedValue]) => {
        const userChallenge = activeChallenges?.find(uc => uc.id === userChallengeId);
        if (!userChallenge) return;
        const newValue = (userChallenge.currentValue || 0) + addedValue;
        await apiRequest("PUT", `/api/challenges/${userChallengeId}/progress`, { currentValue: newValue });
        if (newValue >= userChallenge.challenge.targetValue) {
          await apiRequest("POST", `/api/challenges/${userChallengeId}/complete`);
        }
      });

      const clientDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone
      const [bulkRes] = await Promise.all([
        apiRequest("POST", "/api/training-logs/bulk", { entries: bulkEntries, clientDate }),
        ...challengeRequests,
      ]);

      // Immediately invalidate only what the user sees next
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard-challenges'] });

      // Compute summary before state is cleared
      const challengeCount = Object.keys(challengeUpdates).length;
      const drillCount = workoutEntries.length;
      const elapsedLabel = workoutStartTime ? ` · ${formatMs(Date.now() - workoutStartTime)}` : "";

      // Transition UI state — clear heavy workout entries immediately to free memory,
      // then show the completion dialog. Use startTransition so React treats this as
      // a low-priority update and keeps the UI responsive.
      localStorage.removeItem(WORKOUT_DRAFT_KEY);
      startTransition(() => {
        setWorkoutEntries([]);
        setWorkoutInProgress(false);
        setWorkoutStartTime(null);
        setDrillStartTimes({});
        setShareSessionId(workoutEntries.length > 1 ? sessionId : null);
        setShowFavoriteDialog(true);
      });

      // Show streak celebration if daily challenge was auto-completed
      const bulkData = bulkRes?.ok ? await bulkRes.json().catch(() => null) : null;
      const streakResult = bulkData?.streakResult;

      // Auto-complete the originating program item if this workout was launched
      // from a program/today deep link. Only fire when the bulk save itself
      // succeeded so we never mark a program item complete after a failed save.
      if (programCompletion && bulkRes?.ok) {
        const firstLogId = Array.isArray(bulkData?.logs) && bulkData.logs[0]?.id ? bulkData.logs[0].id : undefined;
        try {
          await apiRequest(
            "POST",
            `/api/programs/enrollments/${programCompletion.enrollmentId}/items/${programCompletion.programItemId}/complete`,
            firstLogId ? { trainingLogId: firstLogId } : {},
          );
          queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/programs/me"] });
          toast({ title: "Program day updated", description: "Workout marked complete in your program." });
        } catch (e) {
          // Non-fatal — surface gently so the user can still mark it manually
          toast({
            title: "Saved your workout",
            description: "We couldn't auto-mark the program item — open the program and tap complete.",
          });
        } finally {
          setPendingProgramCompletion(null);
        }
      }
      if (streakResult?.streak) {
        const newStreak = streakResult.streak.currentStreak;
        const milestone = streakResult.milestoneReached;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/daily-challenge'] }); // matches all daily-challenge keys regardless of clientDate
          toast({
            title: milestone
              ? `🏆 ${newStreak}-Day Milestone!`
              : `🔥 Daily Challenge Complete!`,
            description: milestone
              ? `You hit a ${newStreak}-day streak — keep it going!`
              : `${newStreak}-day streak! Keep it up.`,
          });
        }, 600);
      }

      toast({
        title: "Workout Complete!",
        description: challengeCount > 0
          ? `Logged ${drillCount} drill${drillCount > 1 ? 's' : ''} and updated ${challengeCount} challenge${challengeCount > 1 ? 's' : ''}${elapsedLabel}`
          : `Logged ${drillCount} drill${drillCount > 1 ? 's' : ''}${elapsedLabel}`,
      });

      // Defer non-critical stat/challenge invalidations so they don't race with the UI transition
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
        queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
      }, 800);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/stats/by-category'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/shots'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard-training'] });
      }, 1600);
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({ title: "Failed to save workout", variant: "destructive" });
    } finally {
      setIsSavingWorkout(false);
    }
  };

  // Cancel workout
  const cancelWorkout = () => {
    localStorage.removeItem(WORKOUT_DRAFT_KEY);
    setWorkoutInProgress(false);
    setWorkoutEntries([]);
    setWorkoutStartTime(null);
    setDrillStartTimes({});
    setPendingProgramCompletion(null);
    setActiveView("library");
  };

  // Get drill title helper
  const getDrillTitle = (drillId: string) => {
    const drill = allDrills?.find(d => d.id === drillId);
    return drill?.title || "Unknown Drill";
  };

  // Group logs by date and then by workout session
  type LogGroup = {
    sessionId: string | null;
    logs: TrainingLogWithMetricsResponse[];
  };
  
  const groupLogsByDateAndSession = (logs: TrainingLogWithMetricsResponse[]) => {
    // First group by date
    const byDate: Record<string, TrainingLogWithMetricsResponse[]> = {};
    logs.forEach(log => {
      const date = format(new Date(log.completedAt!), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(log);
    });
    
    // Then within each date, group by workout session
    const result: Record<string, LogGroup[]> = {};
    Object.entries(byDate).forEach(([date, dayLogs]) => {
      const sessions: Record<string, TrainingLogWithMetricsResponse[]> = {};
      const singles: TrainingLogWithMetricsResponse[] = [];
      
      dayLogs.forEach(log => {
        if (log.workoutSessionId) {
          if (!sessions[log.workoutSessionId]) {
            sessions[log.workoutSessionId] = [];
          }
          sessions[log.workoutSessionId].push(log);
        } else {
          singles.push(log);
        }
      });
      
      result[date] = [];
      // Add grouped sessions first
      Object.entries(sessions).forEach(([sessionId, sessionLogs]) => {
        result[date].push({ sessionId, logs: sessionLogs });
      });
      // Add singles as individual entries
      singles.forEach(log => {
        result[date].push({ sessionId: null, logs: [log] });
      });
    });
    
    return result;
  };

  const groupedLogs = logs ? groupLogsByDateAndSession(logs) : {};

  // Format category name
  const formatCategory = (cat: string) => {
    return cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Render drill selection list
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Training Log</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Build workouts, track progress, get better</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={activeView === "history" ? "default" : "outline"} 
            onClick={() => setActiveView(activeView === "history" ? "library" : "history")}
            className="gap-2"
            data-testid="button-view-history"
          >
            <Calendar className="w-4 h-4" />
            History
          </Button>
          <Dialog open={isCreateDrillOpen} onOpenChange={setIsCreateDrillOpen}>
            <DialogContent className="max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Create Your Own Drill</DialogTitle>
                <DialogDescription>
                  Add a custom drill to your training library
                </DialogDescription>
              </DialogHeader>
              <Form {...createDrillForm}>
                <form onSubmit={createDrillForm.handleSubmit(d => createDrillMutation.mutate(d))} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                    <div className="space-y-4 pb-4">
                      <FormField
                        control={createDrillForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drill Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., My Custom Crossover" {...field} data-testid="input-drill-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createDrillForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the drill..." {...field} value={field.value ?? ''} data-testid="input-drill-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Equipment */}
                      <FormField
                        control={createDrillForm.control}
                        name="equipment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipment Needed (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. Basketball, Cones, Chair"
                                value={field.value ?? ''}
                                data-testid="input-drill-equipment"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Separate multiple items with commas.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={createDrillForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-drill-category">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DRILL_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                      {formatCategory(cat)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createDrillForm.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-drill-difficulty">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DIFFICULTY_LEVELS.map(level => (
                                    <SelectItem key={level} value={level}>
                                      {level.charAt(0).toUpperCase() + level.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Track Shots Checkbox */}
                      <FormField
                        control={createDrillForm.control}
                        name="trackShots"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (!checked) setPresetRounds(prev => prev.map(r => ({ ...r, shotLocation: undefined })));
                                }}
                                data-testid="checkbox-track-shots"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Track Shot Locations</FormLabel>
                            <span className="text-xs text-muted-foreground">(shows shot chart when logging)</span>
                          </FormItem>
                        )}
                      />

                      {/* Metrics Multi-Select */}
                      <div className="space-y-2">
                        <FormLabel>Tracking Metrics</FormLabel>
                        <p className="text-xs text-muted-foreground mb-2">
                          Select which metrics to track when logging this drill
                        </p>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                          {metricTemplates && metricTemplates.length > 0 ? (
                            metricTemplates.map(template => (
                              <Badge
                                key={template.id}
                                variant={selectedMetricTemplateIds.includes(template.id) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedMetricTemplateIds(prev => {
                                    const isSelected = prev.includes(template.id);
                                    if (isSelected) {
                                      setPresetRounds(rounds => rounds.map(r => {
                                        const next = { ...r.metricValues };
                                        delete next[template.id];
                                        return { ...r, metricValues: next };
                                      }));
                                    }
                                    return isSelected
                                      ? prev.filter(id => id !== template.id)
                                      : [...prev, template.id];
                                  });
                                }}
                                data-testid={`metric-badge-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {selectedMetricTemplateIds.includes(template.id) && (
                                  <Check className="w-3 h-3 mr-1" />
                                )}
                                {template.label || template.name}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No metric templates available</p>
                          )}
                        </div>
                      </div>

                      {/* Preset Rounds Builder */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <FormLabel>Preset Rounds <span className="font-normal text-muted-foreground text-xs">(optional)</span></FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">Pre-configure rounds that auto-load when this drill is started.</p>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={addPresetRound} data-testid="button-add-preset-round">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Round
                          </Button>
                        </div>

                        {presetRounds.length > 0 && (
                          <div className="overflow-x-auto border rounded-md">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">#</th>
                                  {createDrillTrackShots && <th className="p-2 text-left text-xs font-medium text-muted-foreground">Location</th>}
                                  {selectedMetricTemplateIds.map(id => {
                                    const t = metricTemplates?.find(t => t.id === id);
                                    return t ? <th key={id} className="p-2 text-center text-xs font-medium text-muted-foreground">{t.label || t.name}</th> : null;
                                  })}
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {presetRounds.map((round, roundIdx) => (
                                  <tr key={roundIdx} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="p-2">
                                      <Badge variant="secondary" className="text-xs">{roundIdx + 1}</Badge>
                                    </td>
                                    {createDrillTrackShots && (
                                      <td className="p-1">
                                        <Select value={round.shotLocation || '__any__'} onValueChange={v => updatePresetRoundLocation(roundIdx, v)}>
                                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-preset-round-loc-${roundIdx}`}>
                                            <SelectValue placeholder="Location" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__any__">Any</SelectItem>
                                            {(shotLocationOptions ?? []).map(loc => (
                                              <SelectItem key={loc.slug} value={loc.slug}>{loc.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                    )}
                                    {selectedMetricTemplateIds.map(templateId => (
                                      <td key={templateId} className="p-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          placeholder="0"
                                          value={round.metricValues[templateId] ?? ''}
                                          onChange={e => updatePresetRoundMetric(roundIdx, templateId, e.target.value === '' ? 0 : Number(e.target.value))}
                                          className="w-16 h-8 text-sm text-center"
                                          data-testid={`input-preset-round-${roundIdx}-metric-${templateId}`}
                                        />
                                      </td>
                                    ))}
                                    <td className="p-1">
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removePresetRound(roundIdx)} data-testid={`button-remove-preset-round-${roundIdx}`}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Tips */}
                      <FormField
                        control={createDrillForm.control}
                        name="tips"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pro Tips (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter one tip per line, e.g.&#10;Keep your elbow in&#10;Follow through on every shot"
                                rows={3}
                                data-testid="input-drill-tips"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Each line becomes a separate tip shown on the drill detail page.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Share to Community */}
                      <FormField
                        control={createDrillForm.control}
                        name="isShared"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3 rounded-md border p-3 bg-muted/20">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-share-community"
                              />
                            </FormControl>
                            <div className="space-y-0.5">
                              <FormLabel className="!mt-0">Share with Community</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Make this drill visible to all players in the drill library.
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormLabel>Drill Video (Optional)</FormLabel>
                        <p className="text-xs text-muted-foreground mb-2">
                          Upload a video demonstrating this drill
                        </p>
                        {drillVideoFile ? (
                          <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                            <Video className="w-5 h-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{drillVideoFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(drillVideoFile.size / (1024 * 1024)).toFixed(1)} MB
                              </p>
                              {drillVideoUploading && (
                                <Progress value={drillVideoProgress} className="h-1.5 mt-1" />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-7 w-7"
                              onClick={() => {
                                setDrillVideoFile(null);
                              }}
                              disabled={drillVideoUploading}
                              data-testid="button-remove-drill-video"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/40 transition-colors">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to upload video</span>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setDrillVideoFile(file);
                                e.target.value = "";
                              }}
                              data-testid="input-drill-video"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t mt-4 flex-shrink-0">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateDrillOpen(false);
                      setSelectedMetricTemplateIds([]);
                      setPresetRounds([]);
                      setDrillVideoFile(null);
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createDrillMutation.isPending || drillVideoUploading} data-testid="button-save-drill">
                      {drillVideoUploading ? "Uploading..." : createDrillMutation.isPending ? "Creating..." : "Create Drill"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === "library" && !workoutInProgress && (
        <div className="space-y-6">
          {!showCreateWorkoutMode ? (
            <>
              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="cursor-pointer hover-elevate" onClick={() => { setDrillSearchQuery(""); setIsStartWorkoutDialogOpen(true); }} data-testid="action-start-workout">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <Play className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Start Workout</h3>
                      <p className="text-xs text-muted-foreground">Select drills and go</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover-elevate" onClick={() => setIsCreateDrillOpen(true)} data-testid="action-create-drill">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Create a Drill</h3>
                      <p className="text-xs text-muted-foreground">Add a custom drill</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover-elevate" onClick={() => { setShowCreateWorkoutMode(true); setSelectedDrillIds(new Set()); }} data-testid="action-create-workout">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Create a Workout</h3>
                      <p className="text-xs text-muted-foreground">Combine 2+ drills</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover-elevate" onClick={() => setShowChallengeDialog(true)} data-testid="action-create-challenge">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Create a Challenge</h3>
                      <p className="text-xs text-muted-foreground">Set goals & track</p>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer hover-elevate"
                  onClick={() => setShowFreeShotMode(true)}
                  data-testid="action-free-shoot"
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Free Shoot</h3>
                      <p className="text-xs text-muted-foreground">Tap zones to log shots live</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Favorite Workouts Section */}
              {(() => {
                const favWorkouts = (personalWorkouts || []).filter(w => w.isFavorite);
                const favDrills = (allDrills || []).filter(d => favoriteDrillIds?.includes(d.id));
                const hasFavorites = favWorkouts.length > 0 || favDrills.length > 0;
                
                if (!hasFavorites) return null;
                
                return (
                  <div className="space-y-3" data-testid="section-favorite-workouts">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Heart className="w-4 h-4 text-primary" fill="currentColor" />
                      Favorite Workouts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {favWorkouts.map(workout => (
                        <Card 
                          key={`fav-workout-${workout.id}`} 
                          className="cursor-pointer hover-elevate group"
                          onClick={() => startWorkoutFromTemplate(workout.id)}
                          data-testid={`fav-workout-${workout.id}`}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{workout.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {workout.category ? formatCategory(workout.category) : "Workout"}
                                {workout.estimatedDuration ? ` · ${workout.estimatedDuration} min` : ""}
                              </p>
                            </div>
                            <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardContent>
                        </Card>
                      ))}
                      {favDrills.map(drill => (
                        <Card 
                          key={`fav-drill-${drill.id}`} 
                          className="cursor-pointer hover-elevate group"
                          onClick={() => quickStartDrill(drill.id)}
                          data-testid={`fav-drill-${drill.id}`}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                              <Target className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{drill.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatCategory(drill.category)} · {drill.difficulty}
                              </p>
                            </div>
                            <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* My Challenges Section */}
              {(() => {
                const inProgressChallenges = activeChallenges?.filter(uc => !uc.isCompleted) || [];
                const startedChallengeIds = new Set(activeChallenges?.map(uc => uc.challengeId) || []);
                const availableChallenges = allChallenges?.filter(c => !startedChallengeIds.has(c.id)) || [];
                const hasChallenges = inProgressChallenges.length > 0 || availableChallenges.length > 0;

                if (!hasChallenges) return null;

                return (
                  <Collapsible open={challengesSectionOpen} onOpenChange={setChallengesSectionOpen}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer select-none" data-testid="section-challenges">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          My Challenges
                          {inProgressChallenges.length > 0 && (
                            <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">{inProgressChallenges.length} Active</Badge>
                          )}
                        </h3>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${challengesSectionOpen ? 'rotate-90' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-3">
                      {inProgressChallenges.map(uc => {
                        const progressPercent = Math.min(100, Math.round(((uc.currentValue || 0) / (uc.challenge.targetValue || 1)) * 100));
                        return (
                          <Card key={uc.id} data-testid={`challenge-item-${uc.id}`}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{uc.challenge.name}</p>
                                    <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">Active</Badge>
                                  </div>
                                  {uc.challenge.description && (
                                    <p className="text-xs text-muted-foreground">{uc.challenge.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{uc.challenge.category}</Badge>
                                  <Button size="icon" variant="ghost" onClick={() => deleteChallengeMutation.mutate(uc.challengeId)}>
                                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{uc.currentValue || 0} / {uc.challenge.targetValue} {uc.challenge.metric}</span>
                                  <span>{progressPercent}%</span>
                                </div>
                                <Progress value={progressPercent} />
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="Update progress"
                                  className="h-8 text-xs w-32"
                                  data-testid={`input-challenge-progress-${uc.id}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = parseInt((e.target as HTMLInputElement).value);
                                      if (!isNaN(val) && val >= 0) {
                                        apiRequest("PUT", `/api/challenges/${uc.id}/progress`, { currentValue: val })
                                          .then(() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
                                            (e.target as HTMLInputElement).value = '';
                                            toast({ title: "Progress updated" });
                                          });
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  data-testid={`button-update-challenge-${uc.id}`}
                                  onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    const val = parseInt(input.value);
                                    if (!isNaN(val) && val >= 0) {
                                      apiRequest("PUT", `/api/challenges/${uc.id}/progress`, { currentValue: val })
                                        .then(() => {
                                          queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
                                          input.value = '';
                                          toast({ title: "Progress updated" });
                                        });
                                    }
                                  }}
                                >
                                  Set
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {availableChallenges.map(challenge => (
                        <Card key={challenge.id} data-testid={`available-challenge-${challenge.id}`}>
                          <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">{challenge.name}</p>
                              {challenge.description && (
                                <p className="text-xs text-muted-foreground">{challenge.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{challenge.category}</Badge>
                                <span className="text-xs text-muted-foreground">{challenge.targetValue} {challenge.metric}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => startChallengeMutation.mutate(challenge.id)}
                              disabled={startChallengeMutation.isPending}
                              data-testid={`button-start-challenge-${challenge.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}

              {/* Create Challenge Dialog */}
              <Dialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a New Challenge</DialogTitle>
                    <DialogDescription>Set a goal and track your progress</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Challenge Name</Label>
                      <Input
                        placeholder="e.g., 100 Three-Pointers"
                        value={newChallenge.name}
                        onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                        data-testid="input-challenge-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe your challenge..."
                        value={newChallenge.description}
                        onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                        data-testid="input-challenge-description"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={newChallenge.category} onValueChange={(v) => setNewChallenge({ ...newChallenge, category: v as typeof newChallenge.category })}>
                          <SelectTrigger data-testid="select-challenge-category"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shooting">Shooting</SelectItem>
                            <SelectItem value="ball-handling">Ball Handling</SelectItem>
                            <SelectItem value="passing">Passing</SelectItem>
                            <SelectItem value="workout">Workout</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Metric</Label>
                        <Select value={newChallenge.metric} onValueChange={(v) => setNewChallenge({ ...newChallenge, metric: v as typeof newChallenge.metric })}>
                          <SelectTrigger data-testid="select-challenge-metric"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="makes">Makes</SelectItem>
                            <SelectItem value="dribbles">Dribbles</SelectItem>
                            <SelectItem value="passes">Passes</SelectItem>
                            <SelectItem value="reps">Reps</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                            <SelectItem value="score">Score</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Goal Type</Label>
                        <Select value={newChallenge.goalType} onValueChange={(v) => setNewChallenge({ ...newChallenge, goalType: v as typeof newChallenge.goalType })}>
                          <SelectTrigger data-testid="select-challenge-goal-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="total">Total</SelectItem>
                            <SelectItem value="consecutive">Consecutive</SelectItem>
                            <SelectItem value="timed">Timed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Value</Label>
                        <Input
                          type="number"
                          value={newChallenge.targetValue}
                          onChange={(e) => setNewChallenge({ ...newChallenge, targetValue: parseInt(e.target.value) || 0 })}
                          data-testid="input-challenge-target"
                        />
                      </div>
                    </div>
                    {newChallenge.goalType === "timed" && (
                      <div className="space-y-2">
                        <Label>Time Limit (minutes)</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 30"
                          value={newChallenge.timeLimit ?? ""}
                          onChange={(e) => setNewChallenge({ ...newChallenge, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                          data-testid="input-challenge-time-limit"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createChallengeMutation.mutate(newChallenge)}
                      disabled={!newChallenge.name || createChallengeMutation.isPending}
                      data-testid="button-submit-challenge"
                    >
                      {createChallengeMutation.isPending ? "Creating..." : "Create & Start"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Start Workout Dialog */}
              <Dialog open={isStartWorkoutDialogOpen} onOpenChange={(open) => { setIsStartWorkoutDialogOpen(open); if (!open) setDrillSearchQuery(""); }}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Start Workout</DialogTitle>
                    <DialogDescription>Select drills to add to your workout</DialogDescription>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drills..."
                      value={drillSearchQuery}
                      onChange={(e) => setDrillSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-start-workout-search"
                    />
                  </div>
                  {selectedDrillIds.size > 0 && (
                    <div className="flex items-center justify-between py-2 px-1">
                      <span className="text-sm text-muted-foreground">{selectedDrillIds.size} drill{selectedDrillIds.size !== 1 ? 's' : ''} selected</span>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setIsStartWorkoutDialogOpen(false);
                          setDrillSearchQuery("");
                          startWorkoutFromDrills();
                        }}
                        data-testid="button-start-selected-drills"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Workout
                      </Button>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {drillsLoadError ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground mb-3">Unable to load drills.</p>
                        <button onClick={() => refetchDrills()} className="text-xs text-primary underline">Try again</button>
                      </div>
                    ) : drillsLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                      </div>
                    ) : (() => {
                      const searchLower = drillSearchQuery.toLowerCase().trim();
                      const filtered = searchLower
                        ? (allDrills || []).filter(d =>
                            d.title.toLowerCase().includes(searchLower) ||
                            d.category.toLowerCase().includes(searchLower) ||
                            d.difficulty.toLowerCase().includes(searchLower) ||
                            (d.description && d.description.toLowerCase().includes(searchLower))
                          )
                        : (allDrills || []);

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {searchLower ? "No drills match your search" : "No drills available"}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map(drill => {
                        const isSelected = selectedDrillIds.has(drill.id);
                        return (
                          <div
                            key={drill.id}
                            className={`flex items-center justify-between p-3 rounded-md border cursor-pointer hover-elevate ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => toggleDrillSelection(drill.id)}
                            data-testid={`start-drill-option-${drill.id}`}
                          >
                            <div>
                              <h4 className="font-medium text-sm uppercase">{drill.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatCategory(drill.category)} - {drill.difficulty}
                              </p>
                            </div>
                            {isSelected ? (
                              <Check className="w-5 h-5 text-primary shrink-0" />
                            ) : (
                              <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            /* Create Workout Mode */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" />
                      Create a Workout
                    </CardTitle>
                    <CardDescription>Select at least 2 drills to combine into a workout</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowCreateWorkoutMode(false); setSelectedDrillIds(new Set()); }} data-testid="button-cancel-create-workout">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={selectedDrillIds.size < 2}
                      onClick={() => { setIsSaveWorkoutOpen(true); }}
                      data-testid="button-save-new-workout"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save ({selectedDrillIds.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {drillsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (() => {
                  const allDrillsByCategory = groupByCategory(allDrills || []);
                  const toggleCategory = (category: string) => {
                    setExpandedCategories(prev => {
                      const next = new Set(prev);
                      if (next.has(category)) next.delete(category);
                      else next.add(category);
                      return next;
                    });
                  };
                  return (
                    <div className="space-y-2">
                      {Object.entries(allDrillsByCategory).map(([category, categoryDrills]) => {
                        const isCollapsed = !expandedCategories.has(category);
                        const selectedCount = categoryDrills.filter(d => selectedDrillIds.has(d.id)).length;
                        return (
                          <div key={category} className="border rounded-md">
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className="flex items-center justify-between gap-2 w-full p-3 text-left hover-elevate rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                                <span className="font-semibold text-sm uppercase tracking-wide">{formatCategory(category)}</span>
                                <Badge variant="outline" className="text-xs">{categoryDrills.length}</Badge>
                              </div>
                              {selectedCount > 0 && <Badge variant="default" className="text-xs">{selectedCount} selected</Badge>}
                            </button>
                            {!isCollapsed && (
                              <div className="grid gap-2 px-3 pb-3">
                                {categoryDrills.map(drill => (
                                  <div
                                    key={drill.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${selectedDrillIds.has(drill.id) ? 'border-primary bg-primary/5' : ''}`}
                                    onClick={() => toggleDrillSelection(drill.id)}
                                  >
                                    <Checkbox checked={selectedDrillIds.has(drill.id)} onCheckedChange={() => toggleDrillSelection(drill.id)} className="mt-1" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <span className="font-medium">{drill.title}</span>
                                        <Badge variant="secondary" className="shrink-0">{drill.difficulty}</Badge>
                                      </div>
                                      {drill.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{drill.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Save Workout Dialog (for Create Workout mode) */}
          <Dialog open={isSaveWorkoutOpen && showCreateWorkoutMode} onOpenChange={(open) => { if (!open) setIsSaveWorkoutOpen(false); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Workout</DialogTitle>
                <DialogDescription>Give your workout a name and save it</DialogDescription>
              </DialogHeader>
              <Form {...saveWorkoutForm}>
                <form onSubmit={saveWorkoutForm.handleSubmit(d => saveWorkoutMutation.mutate({ ...d, drillIds: Array.from(selectedDrillIds), asFavorite: true }))} className="space-y-4">
                  <FormField control={saveWorkoutForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Name</FormLabel>
                      <FormControl><Input placeholder="e.g., Morning Ball Handling" {...field} data-testid="input-create-workout-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={saveWorkoutForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Describe this workout..." {...field} value={field.value ?? ''} data-testid="input-create-workout-desc" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={saveWorkoutForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl><SelectTrigger data-testid="select-create-workout-category"><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {DRILL_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{formatCategory(cat)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSaveWorkoutOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saveWorkoutMutation.isPending} data-testid="button-confirm-create-workout">
                      {saveWorkoutMutation.isPending ? "Saving..." : "Save Workout"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Save as Favorite Dialog (after completing workout) */}
      <Dialog open={showFavoriteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowFavoriteDialog(false);
          setWorkoutEntries([]);
          setSelectedDrillIds(new Set());
          setActiveView("library");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Save as Favorite?
            </DialogTitle>
            <DialogDescription>
              {workoutEntries.length === 1
                ? "Would you like to save this drill as a favorite for quick access?"
                : "Would you like to save this workout as a favorite for quick access?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {workoutEntries.map(entry => (
              <div key={entry.drillId} className="flex items-center gap-2 p-2 rounded border">
                <Dumbbell className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{entry.drill.title}</span>
                <Badge variant="outline" className="text-xs ml-auto">{formatCategory(entry.drill.category)}</Badge>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setShowFavoriteDialog(false);
              setWorkoutEntries([]);
              setSelectedDrillIds(new Set());
              setActiveView("library");
            }} data-testid="button-skip-favorite">
              Skip
            </Button>
            {shareSessionId && (
              <Button variant="outline" onClick={() => {
                setShowFavoriteDialog(false);
                setShowShareDialog(true);
              }} className="gap-2" data-testid="button-share-workout">
                <Share2 className="w-4 h-4" />
                Share Workout
              </Button>
            )}
            {workoutEntries.length === 1 ? (
              <Button onClick={() => {
                favoriteDrillMutation.mutate(workoutEntries[0].drillId);
                toast({ title: "Drill saved as favorite!" });
                setShowFavoriteDialog(false);
                setWorkoutEntries([]);
                setSelectedDrillIds(new Set());
                setActiveView("library");
              }} className="gap-2" data-testid="button-save-favorite">
                <Star className="w-4 h-4" />
                Save as Favorite Drill
              </Button>
            ) : (
              <Button onClick={() => {
                setShowFavoriteDialog(false);
                setIsSaveWorkoutOpen(true);
              }} className="gap-2" data-testid="button-save-favorite">
                <Star className="w-4 h-4" />
                Save as Favorite Workout
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Workout Dialog */}
      <WorkoutShareDialog
        open={showShareDialog}
        onOpenChange={(open) => {
          setShowShareDialog(open);
          if (!open) setShareSessionId(null);
        }}
        workoutSessionId={shareSessionId}
        defaultTab={shareSessionId ? "workout" : "week"}
      />

      {/* Save Workout Dialog (after completing multi-drill workout) */}
      <Dialog open={isSaveWorkoutOpen && !showCreateWorkoutMode && !workoutInProgress} onOpenChange={(open) => {
        if (!open) {
          setIsSaveWorkoutOpen(false);
          setWorkoutEntries([]);
          setSelectedDrillIds(new Set());
          setActiveView("library");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Favorite Workout</DialogTitle>
            <DialogDescription>Name this workout to save it as a favorite</DialogDescription>
          </DialogHeader>
          <Form {...saveWorkoutForm}>
            <form onSubmit={saveWorkoutForm.handleSubmit(d => {
              const drillIds = workoutEntries.map(e => e.drillId);
              saveWorkoutMutation.mutate({ ...d, drillIds, asFavorite: true });
              setWorkoutEntries([]);
              setSelectedDrillIds(new Set());
              setActiveView("library");
            })} className="space-y-4">
              <FormField control={saveWorkoutForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Morning Ball Handling" {...field} data-testid="input-fav-workout-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={saveWorkoutForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Describe this workout..." {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsSaveWorkoutOpen(false);
                  setWorkoutEntries([]);
                  setSelectedDrillIds(new Set());
                  setActiveView("library");
                }}>Skip</Button>
                <Button type="submit" disabled={saveWorkoutMutation.isPending} data-testid="button-confirm-fav-workout">
                  {saveWorkoutMutation.isPending ? "Saving..." : "Save Favorite Workout"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Active Workout View — full screen takeover */}
      {activeView === "workout" && workoutInProgress && (
        <div className="fixed inset-0 z-40 bg-background overflow-y-auto" data-testid="workout-fullscreen">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Active Workout
                  </CardTitle>
                  <CardDescription>
                    {workoutEntries.length} drill{workoutEntries.length > 1 ? 's' : ''} in this session
                  </CardDescription>
                </div>
                {/* Single workout elapsed timer — auto-starts when workout begins */}
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5" data-testid="workout-elapsed-timer">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="font-mono text-lg font-bold text-primary tabular-nums">{workoutElapsed}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={cancelWorkout} className="gap-2" data-testid="button-cancel-workout">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                {workoutEntries.length >= 2 && (
                  <Dialog open={isSaveWorkoutOpen} onOpenChange={setIsSaveWorkoutOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2" data-testid="button-save-as-workout">
                        <Bookmark className="w-4 h-4" />
                        Save as Workout
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Workout Template</DialogTitle>
                        <DialogDescription>
                          Save this combination of drills for quick access later
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...saveWorkoutForm}>
                        <form onSubmit={saveWorkoutForm.handleSubmit(d => saveWorkoutMutation.mutate(d))} className="space-y-4">
                          <FormField
                            control={saveWorkoutForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Workout Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Morning Ball Handling" {...field} data-testid="input-workout-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={saveWorkoutForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Describe this workout..." {...field} value={field.value ?? ''} data-testid="input-workout-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={saveWorkoutForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-workout-category">
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {DRILL_CATEGORIES.map(cat => (
                                      <SelectItem key={cat} value={cat}>
                                        {formatCategory(cat)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSaveWorkoutOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={saveWorkoutMutation.isPending} data-testid="button-confirm-save-workout">
                              {saveWorkoutMutation.isPending ? "Saving..." : "Save Workout"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
                <Button onClick={saveWorkout} className="gap-2" disabled={isSavingWorkout} data-testid="button-finish-workout">
                  {isSavingWorkout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSavingWorkout ? "Saving..." : "Finish Workout"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Global challenge quick-apply — visible when the user has active challenges */}
              {activeChallenges && activeChallenges.filter(uc => !uc.isCompleted).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground shrink-0">Apply challenge to all drills:</span>
                  <Select
                    onValueChange={(challengeId) => {
                      if (challengeId === 'none') {
                        // Clear challenge from all entries
                        setWorkoutEntries(prev => prev.map(e => ({ ...e, trackToChallengeIds: [] })));
                      } else {
                        // Only apply to entries whose drill category matches this challenge
                        setWorkoutEntries(prev => prev.map(e => {
                          const matches = getMatchingChallenges(e.drill.category || '').some(uc => uc.id === challengeId);
                          return matches ? { ...e, trackToChallengeIds: [challengeId] } : e;
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-[160px] max-w-xs border-primary/30" data-testid="select-global-challenge">
                      <SelectValue placeholder="Pick a challenge…" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Clear all</span>
                      </SelectItem>
                      {activeChallenges.filter(uc => !uc.isCompleted).map(uc => (
                        <SelectItem key={uc.id} value={uc.id}>
                          <span className="flex items-center gap-2">
                            <span>{uc.challenge.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {uc.currentValue || 0}/{uc.challenge.targetValue}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Group entries by drill for table display */}
              {(() => {
                const drillGroups = new Map<string, { drill: Drill; entries: Array<{ entry: WorkoutDrillEntry; index: number }> }>();
                workoutEntries.forEach((entry, index) => {
                  if (!drillGroups.has(entry.drillId)) {
                    drillGroups.set(entry.drillId, { drill: entry.drill, entries: [] });
                  }
                  drillGroups.get(entry.drillId)!.entries.push({ entry, index });
                });
                
                const drillIds = Array.from(drillGroups.keys());
                return Array.from(drillGroups.entries()).map(([drillId, group], drillIdx) => {
                  const firstEntry = group.entries[0].entry;
                  const metricColumns = firstEntry.drillMetrics
                    .filter(dm => dm.template.type !== 'calculated')
                    .sort((a, b) => {
                      const isAttemptA = a.template.name.toLowerCase().includes('attempt') || a.template.label.toLowerCase().includes('attempt');
                      const isAttemptB = b.template.name.toLowerCase().includes('attempt') || b.template.label.toLowerCase().includes('attempt');
                      return Number(isAttemptA) - Number(isAttemptB);
                    });
                  const isShootingDrill = group.drill.trackShots;

                  // Compute "started at / ended at" relative to workout timer.
                  // Only show these when drills were added at meaningfully different times
                  // (i.e. mid-workout adds > 60 s apart from each other).  When all drills
                  // were pre-selected they share the same stamp, so we skip the display.
                  const allStamps = Object.values(drillStartTimes).filter((v): v is number => !!v);
                  const earliestStamp = allStamps.length ? Math.min(...allStamps) : null;
                  const drillStartedMs = drillStartTimes[drillId];
                  const nextDrillId = drillIds[drillIdx + 1];
                  const drillEndedMs = nextDrillId ? drillStartTimes[nextDrillId] : null;
                  // Only meaningful if this drill was added > 60 s after the first drill
                  const showTimestamps = workoutStartTime && drillStartedMs && earliestStamp != null
                    && (drillStartedMs - earliestStamp) > 60000;
                  const estMinutes = group.drill.duration ? Math.round(group.drill.duration / 60) : null;
                  
                  return (
                    <Card key={drillId} className="border-muted" data-testid={`drill-table-${drillId}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{group.drill.title}</CardTitle>
                            <div className="flex items-center gap-3 flex-wrap mt-0.5">
                              <CardDescription className="text-xs">
                                {formatCategory(group.drill.category)} · {group.entries.length} round{group.entries.length > 1 ? 's' : ''}
                                {estMinutes ? ` · ~${estMinutes}m est.` : ''}
                              </CardDescription>
                              {/* "Started at / Ended at" timestamps — only for mid-workout adds */}
                              {showTimestamps && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>
                                    Started {relativeTime(drillStartedMs!)}
                                    {drillEndedMs
                                      ? ` · Ended ${relativeTime(drillEndedMs)}`
                                      : ''}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDrillInfoOpen(group.drill)}
                              data-testid={`button-drill-info-${drillId}`}
                              title="View drill details"
                              aria-label={`View details for ${group.drill.title}`}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${drillRecordings[drillId] ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-500' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500'}`}
                              onClick={() => setCameraRecordTarget({ drillId, drillTitle: group.drill.title })}
                              disabled={drillRecordingUploading === drillId}
                              title={drillRecordings[drillId] ? 'Recording saved to Film Room' : 'Record this drill'}
                              data-testid={`button-record-${drillId}`}
                            >
                              {drillRecordingUploading === drillId
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : drillRecordings[drillId]
                                ? <CheckCircle2 className="w-4 h-4" />
                                : <Camera className="w-4 h-4" />}
                            </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => addRound(group.entries[group.entries.length - 1].index)}
                            className="gap-1"
                            data-testid={`button-add-round-${drillId}`}
                          >
                            <Plus className="w-3 h-3" />
                            Add Round
                          </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto -mx-1 px-1">
                          <table className="w-full text-sm min-w-[400px]">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground w-14 sm:w-20 text-xs sm:text-sm">Round</th>
                                {isShootingDrill && (
                                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm">Location</th>
                                )}
                                {metricColumns.map(dm => (
                                  <th key={dm.metricTemplateId} className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 max-w-[80px] sm:max-w-none truncate sm:whitespace-normal">
                                      {dm.template.type === 'timer' && <Timer className="w-3 h-3 text-primary shrink-0" />}
                                      {dm.template.label}
                                    </span>
                                    {dm.isRequired && <span className="text-destructive ml-1">*</span>}
                                  </th>
                                ))}
                                <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell">Notes</th>
                                {getMatchingChallenges(group.drill.category || '').length > 0 && (
                                  <th className="text-left p-2 sm:p-3 font-medium text-primary text-xs sm:text-sm whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <span className="flex items-center gap-1">
                                        <Target className="w-3 h-3" />
                                        Challenge
                                      </span>
                                      {group.entries.length > 1 && (
                                        <Select
                                          onValueChange={(val) => applyChallengeToAllRounds(drillId, val)}
                                        >
                                          <SelectTrigger className="h-6 text-[10px] w-28 border-primary/40 text-primary" data-testid={`select-challenge-all-${drillId}`}>
                                            <SelectValue placeholder="Apply all…" />
                                          </SelectTrigger>
                                          <SelectContent position="popper" sideOffset={4}>
                                            <SelectItem value="none">
                                              <span className="text-muted-foreground text-xs">Clear all</span>
                                            </SelectItem>
                                            {getMatchingChallenges(group.drill.category || '').map(uc => (
                                              <SelectItem key={uc.id} value={uc.id}>
                                                <span className="text-xs">{uc.challenge.name}</span>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>
                                  </th>
                                )}
                                <th className="text-center p-2 sm:p-3 font-medium text-muted-foreground w-10 sm:w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.entries.map(({ entry, index }, roundIdx) => (
                                <tr key={index} className={`border-b last:border-0 hover:bg-muted/20 ${isShootingDrill && entry.shotLocation && getMatchingLCChallenges(entry.shotLocation).length > 0 ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`} data-testid={`workout-row-${index}`}>
                                  <td className="p-2 sm:p-3">
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                      {roundIdx + 1}
                                    </Badge>
                                  </td>
                                  {isShootingDrill && (
                                    <td className="p-1 sm:p-2">
                                      <Select
                                        value={entry.shotLocation || ''}
                                        onValueChange={(value) => updateEntry(index, 'shotLocation', value)}
                                      >
                                        <SelectTrigger className="w-32 sm:w-40 h-8 text-xs" data-testid={`select-location-${index}`}>
                                          <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4} className="max-h-[50vh] overflow-y-auto">
                                          {(shotLocationOptions || []).map(loc => (
                                            <SelectItem key={loc.slug} value={loc.slug}>
                                              <span className="flex items-center gap-2">
                                                {loc.label}
                                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                  {loc.classification === 'free-throw' ? 'FT' :
                                                   loc.classification === '2-pointer' ? '2PT' : '3PT'}
                                                </Badge>
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {entry.shotLocation && getMatchingLCChallenges(entry.shotLocation).map(c => (
                                        <div key={c.id} className="flex items-center gap-1 mt-1" data-testid={`badge-lc-${c.id}-${index}`}>
                                          <Trophy className="w-3 h-3 text-primary shrink-0" />
                                          <span className="text-[10px] text-primary font-medium truncate max-w-[120px]">{c.title}</span>
                                        </div>
                                      ))}
                                    </td>
                                  )}
                                  {metricColumns.map(dm => (
                                    <td key={dm.metricTemplateId} className="p-1 sm:p-2">
                                      {dm.template.type === 'timer' ? (
                                        <DrillTimer
                                          value={entry.metrics[dm.metricTemplateId] || 0}
                                          onChange={(seconds) => updateMetricValue(index, dm.metricTemplateId, seconds)}
                                          data-testid={`timer-metric-${index}-${dm.metricTemplateId}`}
                                        />
                                      ) : (
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={entry.metrics[dm.metricTemplateId] || ''}
                                          onChange={(e) => updateMetricValue(index, dm.metricTemplateId, parseFloat(e.target.value) || 0)}
                                          className="w-14 sm:w-20 h-8 text-sm"
                                          placeholder="0"
                                          data-testid={`input-metric-${index}-${dm.metricTemplateId}`}
                                        />
                                      )}
                                    </td>
                                  ))}
                                  <td className="p-2 hidden sm:table-cell">
                                    <Input
                                      placeholder="Notes..."
                                      value={entry.notes}
                                      onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                                      className="h-8 text-sm min-w-[100px]"
                                      data-testid={`input-notes-${index}`}
                                    />
                                  </td>
                                  {getMatchingChallenges(group.drill.category || '').length > 0 && (
                                    <td className="p-1 sm:p-2">
                                      <Select
                                        value={entry.trackToChallengeIds?.[0] || ''}
                                        onValueChange={(value) => {
                                          if (value === 'none') {
                                            updateEntry(index, 'trackToChallengeIds', []);
                                          } else {
                                            updateEntry(index, 'trackToChallengeIds', [value]);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-28 sm:w-36 h-8 text-xs" data-testid={`select-challenge-${index}`}>
                                          <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4}>
                                          <SelectItem value="none">
                                            <span className="text-muted-foreground">None</span>
                                          </SelectItem>
                                          {getMatchingChallenges(group.drill.category || '').map(uc => (
                                            <SelectItem key={uc.id} value={uc.id}>
                                              <span className="flex items-center gap-1">
                                                <Target className="w-3 h-3 text-primary" />
                                                <span className="truncate max-w-[80px]">{uc.challenge.name}</span>
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                                                  {uc.currentValue || 0}/{uc.challenge.targetValue}
                                                </Badge>
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                  )}
                                  <td className="p-1 sm:p-2 text-center">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => removeFromWorkout(index)}
                                      data-testid={`button-remove-${index}`}
                                    >
                                      <X className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
              
              {/* Add Drill Button */}
              <Button 
                variant="outline" 
                className="w-full gap-2 border-dashed"
                onClick={() => setIsAddDrillToWorkoutOpen(true)}
                data-testid="button-add-drill-to-workout"
              >
                <Plus className="w-4 h-4" />
                Add Drill to Workout
              </Button>
              
              {/* Add Drill Dialog */}
              <Dialog open={isAddDrillToWorkoutOpen} onOpenChange={(open) => { setIsAddDrillToWorkoutOpen(open); if (!open) setDrillSearchQuery(""); }}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Add Drill to Workout</DialogTitle>
                    <DialogDescription>Select a drill to add to your active workout</DialogDescription>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drills..."
                      value={drillSearchQuery}
                      onChange={(e) => setDrillSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-add-drill-search"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {(() => {
                      const searchLower = drillSearchQuery.toLowerCase().trim();
                      const filtered = searchLower
                        ? (allDrills || []).filter(d =>
                            d.title.toLowerCase().includes(searchLower) ||
                            d.category.toLowerCase().includes(searchLower) ||
                            d.difficulty.toLowerCase().includes(searchLower) ||
                            (d.description && d.description.toLowerCase().includes(searchLower))
                          )
                        : (allDrills || []);

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {searchLower ? "No drills match your search" : "No drills available"}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map(drill => (
                        <div
                          key={drill.id}
                          className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
                          onClick={() => { addDrillToWorkout(drill.id); setDrillSearchQuery(""); }}
                          data-testid={`add-drill-option-${drill.id}`}
                        >
                          <div>
                            <h4 className="font-medium text-sm uppercase">{drill.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {formatCategory(drill.category)} - {drill.difficulty}
                            </p>
                          </div>
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ));
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
      )}

      {/* Camera record modal */}
      {cameraRecordTarget && (
        <CameraRecordModal
          drillTitle={cameraRecordTarget.drillTitle}
          onClose={() => setCameraRecordTarget(null)}
          onFile={async (file) => {
            const { drillId, drillTitle } = cameraRecordTarget;
            setCameraRecordTarget(null);
            await uploadDrillRecording(drillId, drillTitle, file);
          }}
        />
      )}

      {/* Drill info dialog (opened from active workout drill rows) */}
      <Dialog open={!!drillInfoOpen} onOpenChange={(o) => !o && setDrillInfoOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-drill-info">
          {drillInfoOpen && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  {drillInfoOpen.title}
                </DialogTitle>
                <DialogDescription className="capitalize">
                  {drillInfoOpen.category
                    ? `${formatCategory(drillInfoOpen.category)}${drillInfoOpen.duration ? ` · ~${Math.round(drillInfoOpen.duration / 60)} min` : ""}`
                    : "Drill details"}
                </DialogDescription>
              </DialogHeader>
              {drillInfoOpen.videoUrl && (() => {
                const rawUrl = drillInfoOpen.videoUrl;
                const ytMatch = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                const vimeoMatch = rawUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
                if (ytMatch) {
                  return (
                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden" data-testid="iframe-drill-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}?playsinline=1&rel=0`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title={`${drillInfoOpen.title} video`}
                      />
                    </div>
                  );
                }
                if (vimeoMatch) {
                  return (
                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden" data-testid="iframe-drill-video">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}?playsinline=1`}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={`${drillInfoOpen.title} video`}
                      />
                    </div>
                  );
                }
                const resolvedSrc = getObjectUrl(rawUrl) ?? rawUrl;
                return (
                  <div className="aspect-video w-full bg-black rounded-xl overflow-hidden" data-testid="video-drill-wrapper">
                    <video
                      key={resolvedSrc}
                      src={resolvedSrc}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full"
                      data-testid="video-drill"
                      onError={(e) => {
                        const code = (e.currentTarget as HTMLVideoElement).error?.code;
                        if (code === 4 || code === 3) {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }
                      }}
                    />
                    <div
                      className="hidden w-full h-full flex-col items-center justify-center gap-2 text-white/60 text-sm p-4 text-center"
                      aria-hidden="true"
                    >
                      <Play className="w-10 h-10 opacity-40" />
                      <span>Video unavailable on this device</span>
                      <a
                        href={resolvedSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline text-xs"
                      >
                        Open video directly
                      </a>
                    </div>
                  </div>
                );
              })()}
              {drillInfoOpen.description && (
                <div className="text-sm whitespace-pre-line text-muted-foreground" data-testid="text-drill-description">
                  {drillInfoOpen.description}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize" data-testid="badge-drill-difficulty">{drillInfoOpen.difficulty}</Badge>
                {drillInfoOpen.category && <Badge variant="outline" className="capitalize">{formatCategory(drillInfoOpen.category)}</Badge>}
                {drillInfoOpen.duration && <Badge variant="outline">~{Math.round(drillInfoOpen.duration / 60)} min</Badge>}
                {drillInfoOpen.trackShots && <Badge variant="outline" className="text-primary border-primary/40">Shot Tracking</Badge>}
              </div>
              {drillInfoOpen.equipment && drillInfoOpen.equipment.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {drillInfoOpen.equipment.map((eq, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{eq}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {drillInfoOpen.tips && drillInfoOpen.tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tips</p>
                  <ul className="space-y-2">
                    {drillInfoOpen.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setDrillInfoOpen(null)} data-testid="button-close-drill-info">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* History View */}
      {activeView === "history" && !workoutInProgress && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Training History
            </h2>
            <Button variant="outline" onClick={() => setActiveView("library")} className="gap-2" data-testid="button-back-to-library">
              <Plus className="w-4 h-4" />
              New Workout
            </Button>
          </div>

          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedLogs)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, logGroups]) => {
                  const totalLogs = logGroups.reduce((sum, g) => sum + g.logs.length, 0);
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <Badge variant="secondary" className="ml-2">
                          {totalLogs} drill{totalLogs > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {logGroups.map((group, groupIndex) => (
                          group.sessionId && group.logs.length > 1 ? (() => {
                            // Calculate session totals for shooting stats
                            let sessionTotalAttempts = 0;
                            let sessionTotalMade = 0;
                            group.logs.forEach(log => {
                              const stats = getMetricStats(log, log.drillId);
                              if (stats) {
                                sessionTotalAttempts += stats.attempts;
                                sessionTotalMade += stats.made;
                              }
                            });
                            const sessionPercentage = sessionTotalAttempts > 0 
                              ? Math.round((sessionTotalMade / sessionTotalAttempts) * 100) 
                              : null;
                            
                            // Group logs by drillId to create Drills > Rounds hierarchy
                            const drillGroups: Record<string, TrainingLogWithMetricsResponse[]> = {};
                            group.logs.forEach(log => {
                              if (!drillGroups[log.drillId]) {
                                drillGroups[log.drillId] = [];
                              }
                              drillGroups[log.drillId].push(log);
                            });
                            
                            const uniqueDrillCount = Object.keys(drillGroups).length;
                            const totalRounds = group.logs.length;
                            
                            return (
                            <Collapsible key={group.sessionId} defaultOpen={false}>
                              <Card className="border-primary/20" data-testid={`card-session-${group.sessionId}`}>
                                <CardHeader className="pb-2 p-3 sm:p-4">
                                  <div className="flex items-start gap-2">
                                    <CollapsibleTrigger asChild>
                                      <div className="flex-1 cursor-pointer space-y-1 min-w-0" data-testid={`trigger-session-${group.sessionId}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]_&]:rotate-90" />
                                          <Layers className="w-4 h-4 text-primary shrink-0" />
                                          <span className="text-sm font-medium">Workout Session</span>
                                          <Badge variant="secondary" className="text-xs">
                                            {uniqueDrillCount} drill{uniqueDrillCount > 1 ? 's' : ''}, {totalRounds} round{totalRounds > 1 ? 's' : ''}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap pl-6 text-xs text-muted-foreground">
                                          {sessionPercentage !== null && (
                                            <>
                                              <span className="text-sm font-medium text-foreground">{sessionTotalMade}/{sessionTotalAttempts} shots</span>
                                              <Badge 
                                                variant="secondary"
                                                className={`text-xs ${sessionPercentage >= 70 ? "bg-green-500/20 text-green-400" : 
                                                          sessionPercentage >= 50 ? "bg-orange-500/20 text-orange-400" : 
                                                          "bg-red-500/20 text-red-400"}`}
                                              >
                                                {sessionPercentage}%
                                              </Badge>
                                              <span>·</span>
                                            </>
                                          )}
                                          <span>
                                            {formatDuration(group.logs.reduce((sum, l) => sum + l.duration, 0))}
                                          </span>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    {group.sessionId && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShareSessionId(group.sessionId);
                                          setShowShareDialog(true);
                                        }}
                                        title="Share workout"
                                        data-testid={`button-share-session-${group.sessionId}`}
                                      >
                                        <Share2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this entire workout session and all its rounds?')) {
                                          deleteSessionMutation.mutate(group.logs.map(l => l.id));
                                        }
                                      }}
                                      disabled={deleteSessionMutation.isPending}
                                      data-testid={`button-delete-session-${group.sessionId}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CollapsibleContent>
                                  <CardContent className="space-y-3 pt-0">
                                    {/* Drills within this workout */}
                                    {Object.entries(drillGroups).map(([drillId, drillLogs]) => {
                                      // Calculate drill-level stats
                                      let drillTotalAttempts = 0;
                                      let drillTotalMade = 0;
                                      drillLogs.forEach(log => {
                                        const stats = getMetricStats(log, log.drillId);
                                        if (stats) {
                                          drillTotalAttempts += stats.attempts;
                                          drillTotalMade += stats.made;
                                        }
                                      });
                                      const drillPercentage = drillTotalAttempts > 0 ? Math.round((drillTotalMade / drillTotalAttempts) * 100) : null;
                                      const drillDuration = drillLogs.reduce((sum, l) => sum + l.duration, 0);
                                      
                                      return (
                                        <Collapsible key={drillId} defaultOpen={drillLogs.length === 1}>
                                          <div className="rounded-md bg-muted/30 overflow-hidden">
                                            <CollapsibleTrigger asChild>
                                              <div 
                                                className="p-2.5 sm:p-3 hover-elevate cursor-pointer" 
                                                data-testid={`trigger-drill-${drillId}`}
                                              >
                                                <div className="flex items-start gap-2">
                                                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]_&]:rotate-90 mt-0.5" />
                                                  <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                  <div className="min-w-0 flex-1">
                                                    <span className="font-medium text-sm">{getDrillTitle(drillId)}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground mt-0.5">
                                                      <span>{drillLogs.length} round{drillLogs.length > 1 ? 's' : ''}</span>
                                                      <span>·</span>
                                                      <span>{formatDuration(drillDuration)}</span>
                                                      {drillPercentage !== null && (
                                                        <>
                                                          <span>·</span>
                                                          <span className="text-foreground font-medium">{drillTotalMade}/{drillTotalAttempts}</span>
                                                          <Badge 
                                                            variant="secondary"
                                                            className={`text-xs ${drillPercentage >= 70 ? "bg-green-500/20 text-green-400" : 
                                                                      drillPercentage >= 50 ? "bg-orange-500/20 text-orange-400" : 
                                                                      "bg-red-500/20 text-red-400"}`}
                                                          >
                                                            {drillPercentage}%
                                                          </Badge>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="px-4 pb-3 border-t border-border/50">
                                                <div className="text-xs font-medium text-muted-foreground py-2">Rounds</div>
                                                <div className="space-y-2">
                                                  {drillLogs.map((log, roundIndex) => {
                                                    const roundStats = getMetricStats(log, log.drillId);
                                                    return (
                                                      <div 
                                                        key={log.id}
                                                        className="flex items-center gap-1.5 p-1.5 sm:p-2 rounded bg-background/50 hover-elevate cursor-pointer"
                                                        data-testid={`round-item-${log.id}`}
                                                        onClick={() => openViewLog(log.id)}
                                                      >
                                                        <Badge variant="outline" className="text-xs px-1.5 shrink-0">
                                                          R{roundIndex + 1}
                                                        </Badge>
                                                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 text-xs text-muted-foreground">
                                                          {roundStats?.location && (
                                                            <span className="truncate max-w-[80px] sm:max-w-[100px]">
                                                              {getLocationLabel(roundStats.location)}
                                                            </span>
                                                          )}
                                                          {roundStats && (
                                                            <>
                                                              <span className="text-foreground font-medium">{roundStats.made}/{roundStats.attempts}</span>
                                                              <Badge 
                                                                variant="secondary"
                                                                className={`text-xs ${roundStats.percentage >= 70 ? "bg-green-500/20 text-green-400" : 
                                                                          roundStats.percentage >= 50 ? "bg-orange-500/20 text-orange-400" : 
                                                                          "bg-red-500/20 text-red-400"}`}
                                                              >
                                                                {roundStats.percentage}%
                                                              </Badge>
                                                            </>
                                                          )}
                                                          <span>{formatDuration(log.duration)}</span>
                                                        </div>
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon"
                                                          className="h-6 w-6 shrink-0"
                                                          onClick={(e) => { e.stopPropagation(); openEditLog(log); }}
                                                          data-testid={`button-edit-round-${log.id}`}
                                                        >
                                                          <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon"
                                                          className="h-6 w-6 shrink-0"
                                                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this round?')) deleteLogMutation.mutate(log.id); }}
                                                          data-testid={`button-delete-round-${log.id}`}
                                                        >
                                                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                                                        </Button>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </CollapsibleContent>
                                          </div>
                                        </Collapsible>
                                      );
                                    })}
                                  </CardContent>
                                </CollapsibleContent>
                              </Card>
                            </Collapsible>
                          );
                          })() : (
                            group.logs.map((log) => {
                              const stats = getMetricStats(log, log.drillId);
                              return (
                              <Card 
                                key={log.id} 
                                className="hover-elevate cursor-pointer" 
                                data-testid={`card-log-${log.id}`}
                                onClick={() => openViewLog(log.id)}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-medium text-sm truncate" data-testid={`text-log-drill-${log.id}`}>
                                        {getDrillTitle(log.drillId)}
                                      </h4>
                                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatDuration(log.duration)}
                                        </span>
                                        {stats && (
                                          <>
                                            <span className="text-foreground font-medium">{stats.made}/{stats.attempts} shots</span>
                                            <Badge 
                                              variant="secondary"
                                              className={`text-xs ${stats.percentage >= 70 ? "bg-green-500/20 text-green-400" : 
                                                        stats.percentage >= 50 ? "bg-orange-500/20 text-orange-400" : 
                                                        "bg-red-500/20 text-red-400"}`}
                                              data-testid={`badge-percentage-${log.id}`}
                                            >
                                              {stats.percentage}%
                                            </Badge>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); openEditLog(log); }}
                                        data-testid={`button-edit-log-${log.id}`}
                                      >
                                        <Pencil className="w-4 h-4 text-muted-foreground" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this training log?')) deleteLogMutation.mutate(log.id); }}
                                        data-testid={`button-delete-log-${log.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                                      </Button>
                                    </div>
                                  </div>
                                  {log.notes && (
                                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3 line-clamp-2">
                                      {log.notes}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            );})
                          )
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Training Sessions Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Start a workout to track your practice sessions and progress.
                </p>
                <Button onClick={() => setActiveView("library")} className="gap-2" data-testid="button-first-log">
                  <Play className="w-4 h-4" />
                  Start Your First Workout
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* View/Edit Log Dialog */}
      <Dialog open={!!viewEditLogId} onOpenChange={(open) => { if (!open) closeViewEdit(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditMode ? <Pencil className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              {isEditMode ? "Edit Training Log" : "Training Log Details"}
            </DialogTitle>
            <DialogDescription>
              {viewEditLog && getDrillTitle(viewEditLog.drillId)}
            </DialogDescription>
          </DialogHeader>
          
          {viewEditLogLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : viewEditLog ? (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (min)</label>
                  {isEditMode ? (
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editLogDuration || ''}
                      onChange={(e) => setEditLogDuration(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      data-testid="input-edit-duration"
                    />
                  ) : (
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {viewEditLog.duration} min
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                {isEditMode ? (
                  <Textarea
                    value={editLogNotes}
                    onChange={(e) => setEditLogNotes(e.target.value)}
                    placeholder="Add notes..."
                    data-testid="input-edit-notes"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30 min-h-[60px]">
                    {viewEditLog.notes || "No notes"}
                  </p>
                )}
              </div>

              {/* Shot Location Editing for Shooting Drills */}
              {(() => {
                const drill = allDrills.find(d => d.id === viewEditLog.drillId);
                const isShootingDrill = drill?.trackShots || drill?.category === "shooting";
                if (isShootingDrill && isEditMode) {
                  return (
                    <div className="space-y-3 border-t pt-4">
                      <label className="text-sm font-medium">Shot Tracking</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Location</label>
                          <Select 
                            value={editLogShotLocation || ""} 
                            onValueChange={(val) => setEditLogShotLocation(val)}
                          >
                            <SelectTrigger data-testid="select-edit-shot-location">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {(shotLocationOptions || []).map(loc => (
                                <SelectItem key={loc.slug} value={loc.slug}>
                                  <div className="flex items-center gap-2">
                                    {loc.label}
                                    <Badge variant="outline" className="text-xs px-1.5">
                                      {loc.classification === "free-throw" ? "FT" :
                                       loc.classification === "2-pointer" ? "2PT" : "3PT"}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Made</label>
                          <Input
                            type="number"
                            value={editLogShotsMade ?? ""}
                            onChange={(e) => setEditLogShotsMade(parseInt(e.target.value) || null)}
                            placeholder="0"
                            data-testid="input-edit-shots-made"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Attempts</label>
                          <Input
                            type="number"
                            value={editLogShotsAttempted || ""}
                            onChange={(e) => setEditLogShotsAttempted(parseInt(e.target.value) || null)}
                            placeholder="0"
                            data-testid="input-edit-shots-attempted"
                          />
                        </div>
                      </div>
                      {editLogShotsAttempted && editLogShotsAttempted > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Shooting: {Math.round(((editLogShotsMade || 0) / editLogShotsAttempted) * 100)}%
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {viewEditLog.metrics && viewEditLog.metrics.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <label className="text-sm font-medium">Recorded Metrics</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewEditLog.metrics.map((metric) => {
                      const template = metricTemplates?.find(t => t.id === metric.metricId);
                      return (
                        <div key={metric.metricId} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                          <span className="text-sm text-muted-foreground">{template?.label || template?.name || 'Metric'}</span>
                          <span className="font-medium">{metric.value ? Math.round(parseFloat(metric.value)) : 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              <div className="text-xs text-muted-foreground border-t pt-4">
                Completed: {viewEditLog.completedAt ? format(new Date(viewEditLog.completedAt), 'PPpp') : 'Unknown'}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEditedLog} disabled={updateLogMutation.isPending} data-testid="button-save-edit">
                  {updateLogMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeViewEdit}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (viewEditLogId && confirm('Delete this training log?')) {
                      deleteLogMutation.mutate(viewEditLogId, {
                        onSuccess: () => closeViewEdit(),
                      });
                    }
                  }}
                  disabled={deleteLogMutation.isPending}
                  data-testid="button-delete-log-dialog"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button onClick={() => {
                  if (viewEditLog) {
                    setIsEditMode(true);
                    setEditLogDuration(viewEditLog.duration);
                    setEditLogNotes(viewEditLog.notes || "");
                    setEditLogShotLocation(viewEditLog.shotLocation || null);
                    setEditLogShotsAttempted(viewEditLog.shotsAttempted || null);
                    setEditLogShotsMade(viewEditLog.shotsMade || null);
                    // Pre-populate existing metric values so they aren't cleared on save
                    const existingMetrics: Record<string, number> = {};
                    (viewEditLog.metrics || []).forEach(m => {
                      if (m.value !== null && m.value !== undefined) {
                        existingMetrics[m.metricId] = Number(m.value);
                      }
                    });
                    setEditLogMetrics(existingMetrics);
                  }
                }} className="gap-2" data-testid="button-start-edit">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Free Shoot Mode — full-screen overlay */}
      {showFreeShotMode && (
        <FreeShotMode
          onClose={() => setShowFreeShotMode(false)}
        />
      )}

    </div>
  );
}
