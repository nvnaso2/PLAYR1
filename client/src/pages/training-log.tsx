import { useState, useMemo, useEffect, useRef, startTransition } from "react";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, nativeFetch } from "@/lib/queryClient";
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
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, TrainingLog, DrillMetric, MetricTemplate, Workout, WorkoutDrill, ShotLocationDB, Challenge, UserChallenge } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, insertDrillSchema, insertWorkoutSchema } from "@shared/schema";
import { HalfCourtMap, ShotChartButton, type ShotData } from "@/components/half-court-map";
import { FreeShotMode, LiveShotCounter } from "@/components/free-shoot-mode";
import { RecordShootingMode } from "@/components/record-shooting-mode";
import { WorkoutShareDialog } from "@/components/workout-share-dialog";
import { DrillTimer } from "@/components/drill-timer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { countSavedWorkouts, getSavedWorkoutLimit, isAtSavedWorkoutLimit } from "@shared/workout-limits";

type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };

type WorkoutWithDrills = {
  workout: Workout;
  drills: Array<WorkoutDrill & { drill: Drill }>;
};

type WorkoutDrillEntry = {
  drillId: string;
  drill: Drill;
  duration: number;
  plannedSets?: number | null;
  plannedReps?: number | null;
  coachingNotes?: string | null;
  notes: string;
  metrics: Record<string, number>;
  drillMetrics: DrillMetricWithTemplate[];
  shotLocation?: string;
  shotsAttempted?: number;
  shotsMade?: number;
  trackToChallengeIds?: string[]; // IDs of challenges to update progress for
};

type WorkoutMode = "complete" | "track";

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
  const { openProOffer } = useProUpgrade();
  const { toast } = useToast();
  const searchParams = useSearch();
  const [selectedDrillIds, setSelectedDrillIds] = useState<Set<string>>(new Set());
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutDrillEntry[]>([]);
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>("track");
  const [activeWorkoutTemplateId, setActiveWorkoutTemplateId] = useState<string | null>(null);
  const [activeWorkoutName, setActiveWorkoutName] = useState("Training session");
  const [quickCompletedDrillIds, setQuickCompletedDrillIds] = useState<Set<string>>(new Set());
  const [isCreateDrillOpen, setIsCreateDrillOpen] = useState(() => {
    return new URLSearchParams(searchParams).get('create') === '1';
  });
  const [isSaveWorkoutOpen, setIsSaveWorkoutOpen] = useState(false);
  const [savedWorkoutsExpanded, setSavedWorkoutsExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem("playr1-training-log-saved-workouts-expanded");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const persistSavedWorkoutsExpanded = (expanded: boolean) => {
    setSavedWorkoutsExpanded(expanded);
    try {
      window.localStorage.setItem("playr1-training-log-saved-workouts-expanded", String(expanded));
    } catch {
      // Keep the control usable when browser storage is unavailable.
    }
  };
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
  const [postJournalPrompt, setPostJournalPrompt] = useState<{ type: "post-workout"; trainingLogId: string } | null>(null);
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCreateWorkoutMode, setShowCreateWorkoutMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [drillInfoOpen, setDrillInfoOpen] = useState<Drill | null>(null);
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
  // Manual duration override — user can type in actual minutes if timer was inaccurate
  const [manualDurationMinutes, setManualDurationMinutes] = useState<string>("");
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
        if (draft.workoutMode === "complete" || draft.workoutMode === "track") {
          setWorkoutMode(draft.workoutMode);
        }
        if (Array.isArray(draft.quickCompletedDrillIds)) {
          setQuickCompletedDrillIds(new Set(draft.quickCompletedDrillIds));
        }
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
          workoutMode,
          quickCompletedDrillIds: Array.from(quickCompletedDrillIds),
          activeView,
        }));
      } catch {
        // Ignore storage errors (e.g. quota exceeded)
      }
    }
  }, [workoutInProgress, workoutEntries, workoutStartTime, drillStartTimes, workoutMode, quickCompletedDrillIds, activeView]);

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
  const [showRecordShootingMode, setShowRecordShootingMode] = useState(false);
  const [recordingEntryIndex, setRecordingEntryIndex] = useState<number | null>(null);

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

  const quickWorkoutEntries = useMemo(
    () => Array.from(new Map(workoutEntries.map((entry) => [entry.drillId, entry])).values()),
    [workoutEntries]
  );

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

        setWorkoutMode("track");
        setQuickCompletedDrillIds(new Set());
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

  const {
    data: personalWorkouts,
    isLoading: personalWorkoutsLoading,
    isError: personalWorkoutsError,
    refetch: refetchPersonalWorkouts,
  } = useQuery<Array<Workout & { isAssigned?: boolean }>>({
    queryKey: ['/api/workouts/personal'],
  });
  const savedWorkoutCount = countSavedWorkouts(personalWorkouts ?? []);
  const assignedWorkoutCount = personalWorkouts?.filter((workout) => workout.isAssigned).length ?? 0;
  const { data: workoutSubscription, isLoading: workoutSubscriptionLoading } = useQuery<{ plan?: string }>({
    queryKey: ['/api/billing/subscription'],
  });
  const savedWorkoutLimit = getSavedWorkoutLimit(workoutSubscription?.plan);
  const savedWorkoutLimitReached = !personalWorkoutsLoading
    && !workoutSubscriptionLoading
    && isAtSavedWorkoutLimit(savedWorkoutCount, savedWorkoutLimit);

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
    // Map drill categories to challenge categories
    const categoryMap: Record<string, string> = {
      'shooting': 'shooting',
      'ball-handling': 'ball-handling',
      'passing': 'passing',
      'finishing': 'shooting', // Finishing drills can track to shooting challenges
      'workouts': 'workout',
      'defense': 'workout',
      'film-session': 'workout',
    };
    const challengeCategory = categoryMap[drillCategory] || drillCategory;
    return activeChallenges.filter(uc => 
      !uc.isCompleted && uc.challenge.category === challengeCategory
    );
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
    onError: (error: Error) => {
      if (error.message.includes("WORKOUT_LIMIT_REACHED")) {
        queryClient.invalidateQueries({ queryKey: ['/api/workouts/personal'] });
        toast({
          title: "Free workout limit reached",
          description: "Remove a saved workout or upgrade to Pro for unlimited saves.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Failed to save workout", description: error.message, variant: "destructive" });
    },
  });

  const deleteSavedWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      await apiRequest("DELETE", `/api/workouts/${workoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/personal'] });
      toast({ title: "Workout removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove workout", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/shot-heatmap-baselines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-drills'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/shot-heatmap-baselines'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/shot-heatmap-baselines'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stats/shot-heatmap-baselines'] });
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

  // Extract shot data for half-court map from a training log
  const getShotMapData = (log: TrainingLogWithMetrics | null): ShotData[] => {
    if (!log) return [];
    
    // First, try new per-round shot location fields from training log
    if (log.shotLocation && log.shotsAttempted) {
      return [{
        location: log.shotLocation,
        made: log.shotsMade || 0,
        attempted: log.shotsAttempted || 0
      }];
    }
    
    // Legacy logs without shot location data cannot display meaningful shot charts
    // since we don't know where the shots were taken
    return [];
  };

  // Aggregate shot data from multiple logs (for workout sessions)
  const aggregateShotData = (logs: TrainingLogWithMetricsResponse[]): ShotData[] => {
    const locationData: Record<string, { made: number; attempted: number }> = {};
    
    logs.forEach(log => {
      // Only aggregate logs that have proper shot location data
      if (log.shotLocation && log.shotsAttempted) {
        if (!locationData[log.shotLocation]) {
          locationData[log.shotLocation] = { made: 0, attempted: 0 };
        }
        locationData[log.shotLocation].made += log.shotsMade || 0;
        locationData[log.shotLocation].attempted += log.shotsAttempted || 0;
      }
      // Legacy logs without shot location are excluded from shot chart aggregation
    });
    
    return Object.entries(locationData).map(([location, data]) => ({
      location,
      made: data.made,
      attempted: data.attempted
    }));
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
  const startWorkoutFromDrills = async (mode: WorkoutMode = "track") => {
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
    setActiveWorkoutTemplateId(null);
    setActiveWorkoutName("Open training session");
    setWorkoutMode(mode);
    setQuickCompletedDrillIds(new Set());
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
    setActiveWorkoutTemplateId(null);
    setActiveWorkoutName(drill.title);
    setWorkoutMode("track");
    setQuickCompletedDrillIds(new Set());
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
      track("workout_started", { workoutId, drillCount: drillIds.length });
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
          plannedSets: wd.defaultSets,
          plannedReps: wd.defaultReps,
          coachingNotes: wd.coachingNotes,
          notes: "",
          metrics: metricValues,
          drillMetrics,
        });
      });

      setWorkoutMode("track");
      setActiveWorkoutTemplateId(workoutId);
      setActiveWorkoutName(data.workout.name);
      setQuickCompletedDrillIds(new Set());
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

  // Coach P and saved workout cards launch through the same saved-template path.
  const [lastTemplateStartKey, setLastTemplateStartKey] = useState<string | null>(null);
  useEffect(() => {
    const workoutId = new URLSearchParams(searchParams).get("workoutId");
    if (!workoutId || workoutId === lastTemplateStartKey) return;
    setLastTemplateStartKey(workoutId);
    void startWorkoutFromTemplate(workoutId).then(() => {
      try { window.history.replaceState({}, "", "/log"); } catch {}
    });
  }, [searchParams, lastTemplateStartKey]);

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
    const saveTemplate = params.get("saveTemplate") === "1";
    const mode: WorkoutMode = params.get("mode") === "complete" ? "complete" : "track";
    const dedupKey = [list, programItemId, enrollmentId, mode, saveTemplate ? "save" : ""].filter(Boolean).join("|");
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
      setWorkoutMode(mode);
      setActiveWorkoutName(entries.length === 1 ? entries[0].drill.title : "Training session");
      setQuickCompletedDrillIds(new Set());
      setWorkoutEntries(entries);
      setWorkoutInProgress(true);
      setActiveView("workout");
      if (saveTemplate && entries.length >= 2) {
        setIsSaveWorkoutOpen(true);
      }
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
    const quickEntries = Array.from(
      new Map(workoutEntries.map((entry) => [entry.drillId, entry])).values()
    );
    const entriesToSave = workoutMode === "complete"
      ? quickEntries.filter((entry) => quickCompletedDrillIds.has(entry.drillId))
      : workoutEntries;

    if (workoutMode === "complete" && entriesToSave.length === 0) {
      toast({
        title: "Check off at least one drill",
        description: "Only checked drills will be saved to your history.",
        variant: "destructive",
      });
      return;
    }
    if (workoutMode === "track" && !validateRequiredMetrics()) return;
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
      const manualOverride = manualDurationMinutes ? parseInt(manualDurationMinutes, 10) : NaN;
      const totalSessionMinutes = !isNaN(manualOverride) && manualOverride > 0
        ? manualOverride
        : workoutStartTime
          ? Math.max(0, Math.round(totalElapsedMs / 60000))
          : workoutEntries.reduce((s, e) => s + (e.duration || 0), 0);

      // Build bulk payload synchronously (no awaits)
      const bulkEntries = entriesToSave.map((entry, entryIdx) => {
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
        if (workoutMode === "track" && entry.trackToChallengeIds && entry.trackToChallengeIds.length > 0) {
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

        const metrics = workoutMode === "track"
          ? Object.entries(entry.metrics).map(([metricId, value]) => ({ metricId, value: Number(value) }))
          : [];
        return {
          drillId: entry.drillId,
          // Put the entire timer-measured session total on the first entry; others
          // get 0. SUM(duration) across the session = real total time, no inflation.
          duration: entryIdx === 0 ? totalSessionMinutes : 0,
          notes: entry.notes || undefined,
          // Give single-drill sessions the same durable share/history identity
          // as multi-drill sessions.
          workoutSessionId: sessionId,
          shotLocation: workoutMode === "track" && isShootingDrill ? entry.shotLocation : undefined,
          shotsAttempted: workoutMode === "track" ? (derivedAttempted ?? entry.shotsAttempted) : undefined,
          shotsMade: workoutMode === "track" ? (derivedMade ?? entry.shotsMade) : undefined,
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
        apiRequest("POST", "/api/training-logs/bulk", { entries: bulkEntries, clientDate, workoutId: activeWorkoutTemplateId || undefined }),
        ...challengeRequests,
      ]);

      // Immediately invalidate only what the user sees next
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/custom-workout-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hub/recommendation'] });

      // Compute summary before state is cleared
      const challengeCount = Object.keys(challengeUpdates).length;
      const drillCount = entriesToSave.length;
      const elapsedLabel = workoutStartTime ? ` · ${formatMs(Date.now() - workoutStartTime)}` : "";

      // Transition UI state — clear heavy workout entries immediately to free memory,
      // then show the completion dialog. Use startTransition so React treats this as
      // a low-priority update and keeps the UI responsive.
      localStorage.removeItem(WORKOUT_DRAFT_KEY);
      startTransition(() => {
        setWorkoutEntries([]);
        setWorkoutInProgress(false);
        setActiveWorkoutTemplateId(null);
        setActiveWorkoutName("Training session");
        setWorkoutStartTime(null);
        setDrillStartTimes({});
        setManualDurationMinutes("");
        setQuickCompletedDrillIds(new Set());
        setWorkoutMode("track");
        setShareSessionId(bulkRes?.ok ? sessionId : null);
        setShowFavoriteDialog(true);
      });

      // Show streak celebration if daily challenge was auto-completed
      const bulkData = bulkRes?.ok ? await bulkRes.json().catch(() => null) : null;
      const streakResult = bulkData?.streakResult;
      const firstLogId = Array.isArray(bulkData?.logs) && bulkData.logs[0]?.id ? bulkData.logs[0].id : undefined;
      if (bulkRes?.ok && firstLogId) {
        setPostJournalPrompt({ type: "post-workout", trainingLogId: firstLogId });
      }
      if (bulkRes?.ok) {
        track("training_session_completed", {
          mode: workoutMode,
          drillCount,
          durationMinutes: totalSessionMinutes,
          workoutId: activeWorkoutTemplateId || undefined,
          programItem: Boolean(programCompletion),
        });
      }

      // Auto-complete the originating program item if this workout was launched
      // from a program/today deep link. Only fire when the bulk save itself
      // succeeded so we never mark a program item complete after a failed save.
      if (programCompletion && bulkRes?.ok) {
        try {
          await apiRequest(
            "POST",
            `/api/programs/enrollments/${programCompletion.enrollmentId}/items/${programCompletion.programItemId}/complete`,
            firstLogId ? { trainingLogId: firstLogId } : {},
          );
          queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/programs/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/hub/recommendation"] });
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
        const activityOnly = streakResult.activityOnly === true;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/daily-challenge'] }); // matches all daily-challenge keys regardless of clientDate
          queryClient.invalidateQueries({ queryKey: ['/api/streak/me'] });
          toast({
            title: milestone
              ? `🏆 ${newStreak}-Day Milestone!`
              : activityOnly
                ? `🔥 Training Streak Updated!`
                : `🔥 Daily Challenge Complete!`,
            description: milestone
              ? `You hit a ${newStreak}-day streak — keep it going!`
              : `${newStreak}-day streak! Keep it up.`,
          });
        }, 600);
      }

      toast({
        title: workoutMode === "complete" ? "Workout Checked Off!" : "Workout Complete!",
        description: challengeCount > 0
          ? `Logged ${drillCount} drill${drillCount > 1 ? 's' : ''} and updated ${challengeCount} challenge${challengeCount > 1 ? 's' : ''}${elapsedLabel}`
          : workoutMode === "complete"
            ? `Saved ${drillCount} completed drill${drillCount > 1 ? 's' : ''} to your history${elapsedLabel}`
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
        queryClient.invalidateQueries({ queryKey: ['/api/stats/shot-heatmap-baselines'] });
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
    setManualDurationMinutes("");
    setQuickCompletedDrillIds(new Set());
    setWorkoutMode("track");
    setActiveWorkoutTemplateId(null);
    setActiveWorkoutName("Training session");
    setPendingProgramCompletion(null);
    setActiveView("library");
  };

  // Get drill title helper
  const getDrillTitle = (drillId: string) => {
    const drill = allDrills?.find(d => d.id === drillId);
    return drill?.title || "Unknown Drill";
  };

  const getDrillCategory = (drillId: string) => {
    return allDrills?.find(d => d.id === drillId)?.category || "training";
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

  const historySummary = useMemo(() => {
    if (!logs || logs.length === 0) {
      return { sessions: 0, minutes: 0, makes: 0, attempts: 0 };
    }

    const sessionIds = new Set<string>();
    let standaloneSessions = 0;
    let minutes = 0;
    let makes = 0;
    let attempts = 0;

    logs.forEach((log) => {
      if (log.workoutSessionId) sessionIds.add(log.workoutSessionId);
      else standaloneSessions += 1;
      minutes += log.duration || 0;
      makes += log.shotsMade || 0;
      attempts += log.shotsAttempted || 0;
    });

    return {
      sessions: sessionIds.size + standaloneSessions,
      minutes,
      makes,
      attempts,
    };
  }, [logs]);

  const sessionDrillCount = new Set(workoutEntries.map((entry) => entry.drillId)).size;
  const completedDrillCount = quickCompletedDrillIds.size;

  // Render drill selection list
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading tracking-wide uppercase" data-testid="text-page-title">Training Log</h1>
          <p className="text-sm text-muted-foreground">Build workouts, track progress, get better</p>
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
              {/* Main action layout: 2×2 on mobile, 4-across on desktop. */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <button
                  type="button"
                  className="group flex min-h-[132px] cursor-pointer flex-col gap-3 rounded-xl border border-orange-400/70 bg-gradient-to-br from-orange-500 to-orange-700 p-4 text-left text-white shadow-lg shadow-orange-950/30 transition hover:from-orange-400 hover:to-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                  onClick={() => setLocation("/drills?build=1")}
                  data-testid="action-start-workout"
                  aria-label="Start a workout"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white via-zinc-300 to-white p-[2px]">
                    <span className="flex h-full w-full items-center justify-center rounded-[6px] bg-black">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                  </span>
                  <span>
                    <span className="block font-heading text-sm uppercase tracking-wide leading-tight">Start Workout</span>
                    <span className="mt-0.5 block text-[11px] text-orange-50/80">Select drills and go</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="group flex min-h-[132px] cursor-pointer flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                  onClick={() => setIsCreateDrillOpen(true)}
                  data-testid="action-create-drill"
                  aria-label="Create a drill"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm uppercase tracking-wide leading-tight">Create a Drill</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">Add a custom drill</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="group flex min-h-[132px] cursor-pointer flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                  onClick={() => setLocation("/drills?build=1")}
                  data-testid="action-create-workout"
                  aria-label="Create a workout"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                    <Layers className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm uppercase tracking-wide leading-tight">Create a Workout</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">Combine 2+ drills</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="group flex min-h-[132px] cursor-pointer flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                  onClick={() => setShowChallengeDialog(true)}
                  data-testid="action-create-challenge"
                  aria-label="Create a challenge"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                    <Trophy className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm uppercase tracking-wide leading-tight">Create a Challenge</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">Set goals & track</span>
                  </span>
                </button>
              </div>

              <button
                type="button"
                className="group flex min-h-[68px] w-full cursor-pointer items-center gap-3.5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]"
                onClick={() => setShowFreeShotMode(true)}
                data-testid="action-free-shoot"
                aria-label="Start free shoot"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Target className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm uppercase tracking-wide leading-tight">Free Shoot</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">Tap zones to log shots live</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-orange-400" />
              </button>

              <section data-testid="section-saved-workouts">
                <Collapsible open={savedWorkoutsExpanded} onOpenChange={persistSavedWorkoutsExpanded}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-h-9 items-center gap-2 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
                        aria-label={`${savedWorkoutsExpanded ? "Collapse" : "Expand"} saved workouts`}
                        data-testid="button-toggle-saved-workouts"
                      >
                        <Bookmark className="h-4 w-4 text-primary" />
                        <span>Saved Workouts</span>
                        <Badge variant="secondary" className="normal-case tracking-normal">
                          {savedWorkoutCount}
                        </Badge>
                        <ChevronDown className={`h-4 w-4 transition-transform ${savedWorkoutsExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <span className="text-xs text-muted-foreground" data-testid="text-saved-workout-limit">
                      {savedWorkoutLimit === null
                        ? `Unlimited saves${assignedWorkoutCount ? ` · ${assignedWorkoutCount} assigned` : ""}`
                        : `${savedWorkoutCount}/${savedWorkoutLimit} saved${assignedWorkoutCount ? ` · ${assignedWorkoutCount} assigned` : ""}`}
                    </span>
                  </div>

                  {savedWorkoutLimitReached && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Free includes 3 saved workouts. Remove one or upgrade for unlimited saves.
                      </p>
                      <Button type="button" size="sm" variant="outline" onClick={() => openProOffer("unlimited saved workouts")}>
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}

                  <CollapsibleContent className="pt-2">
                    {personalWorkoutsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 rounded-lg" />
                        <Skeleton className="h-12 rounded-lg" />
                      </div>
                    ) : personalWorkoutsError ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                        <p className="text-sm text-muted-foreground">Saved workouts couldn’t be loaded.</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => void refetchPersonalWorkouts()}>
                          Try again
                        </Button>
                      </div>
                    ) : personalWorkouts?.length ? (
                      <div className="space-y-2">
                        {personalWorkouts.map((workout) => (
                          <Card
                            key={`saved-workout-${workout.id}`}
                            className="border-zinc-800 bg-zinc-950/60 transition-colors hover:border-zinc-700"
                            data-testid={`saved-workout-${workout.id}`}
                          >
                            <CardContent className="flex min-h-12 items-center gap-2.5 p-2">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-300">
                                <Dumbbell className="h-4 w-4" />
                              </span>
                              <h4 className="min-w-0 flex-1 truncate text-sm font-medium">{workout.name}</h4>
                              {workout.isAssigned ? (
                                <Badge variant="outline" className="shrink-0 text-[9px]">Assigned</Badge>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                      aria-label={`Remove ${workout.name}`}
                                      data-testid={`button-delete-saved-workout-${workout.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove saved workout?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        “{workout.name}” will be removed from Saved Workouts. This won’t delete any training history.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep workout</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteSavedWorkoutMutation.mutate(workout.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 shrink-0 px-3"
                                onClick={() => void startWorkoutFromTemplate(workout.id)}
                                data-testid={`button-start-saved-workout-${workout.id}`}
                              >
                                <Play className="mr-1 h-3 w-3 fill-current" />
                                Start
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card/40 p-4">
                        <div>
                          <p className="text-sm font-medium">No saved workouts yet</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Workouts you save with Coach P or build from drills will appear here.
                          </p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setLocation("/drills?build=1")}>
                          Build a workout
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </section>

              {/* Favorite Drills Section */}
              {(() => {
                const favDrills = (allDrills || []).filter(d => favoriteDrillIds?.includes(d.id));
                if (!favDrills.length) return null;
                return (
                  <section className="space-y-3" data-testid="section-favorite-drills">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      <Heart className="h-4 w-4 fill-current text-primary" />
                      Favorite Drills
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {favDrills.map(drill => (
                        <Card
                          key={`fav-drill-${drill.id}`}
                          className="cursor-pointer hover-elevate group"
                          onClick={() => quickStartDrill(drill.id)}
                          data-testid={`fav-drill-${drill.id}`}
                        >
                          <CardContent className="flex items-center gap-3 p-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                              <Target className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-sm font-medium">{drill.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatCategory(drill.category)} · {drill.difficulty}
                              </p>
                            </div>
                            <Play className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
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
                          <Trophy className="w-4 h-4 text-primary" />
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

              {/* Training destinations — separate from actions and challenge tracking. */}
              <section className="space-y-3" data-testid="section-training-destinations">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  Explore Training
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Link
                    href="/drills"
                    className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    data-testid="action-drill-library"
                    aria-label="Open Drill Library"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-base uppercase tracking-wide leading-none">Drill Library</span>
                      <span className="mt-1 block text-[11px] text-zinc-500">Browse every drill</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-orange-400" />
                  </Link>
                  <Link
                    href="/courses"
                    className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    data-testid="action-courses"
                    aria-label="Open Courses"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                      <Layers className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-base uppercase tracking-wide leading-none">Courses</span>
                      <span className="mt-1 block text-[11px] text-zinc-500">Follow a structured plan</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-orange-400" />
                  </Link>
                </div>
              </section>

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
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <span className="text-sm text-muted-foreground">{selectedDrillIds.size} drill{selectedDrillIds.size !== 1 ? 's' : ''} selected</span>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            setIsStartWorkoutDialogOpen(false);
                            setDrillSearchQuery("");
                            startWorkoutFromDrills("complete");
                          }}
                          data-testid="button-start-quick-complete"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Quick Complete
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setIsStartWorkoutDialogOpen(false);
                            setDrillSearchQuery("");
                            startWorkoutFromDrills("track");
                          }}
                          data-testid="button-start-track-stats"
                        >
                          <Target className="w-3.5 h-3.5" />
                          Track Stats
                        </Button>
                      </div>
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
                  {savedWorkoutLimitReached && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Free accounts can save up to 3 workouts.</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => openProOffer("unlimited saved workouts")}>
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSaveWorkoutOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saveWorkoutMutation.isPending || savedWorkoutLimitReached} data-testid="button-confirm-create-workout">
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
            {postJournalPrompt && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2 text-left">
                <p className="text-sm font-medium">Want to capture what you learned?</p>
                <p className="text-xs text-muted-foreground">Start a post-workout Journal entry while the session is fresh.</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    setPostJournalPrompt(null);
                    setShowFavoriteDialog(false);
                    setLocation(`/journal?type=post-workout&trainingLogId=${postJournalPrompt.trainingLogId}`);
                  }} data-testid="button-reflect-after-workout">Reflect now</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPostJournalPrompt(null)} data-testid="button-dismiss-workout-reflection">Later</Button>
                </div>
              </div>
            )}
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
              {savedWorkoutLimitReached && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[0.06] p-3">
                  <p className="text-xs text-muted-foreground">Free accounts can save up to 3 workouts.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => openProOffer("unlimited saved workouts")}>
                    Upgrade to Pro
                  </Button>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsSaveWorkoutOpen(false);
                  setWorkoutEntries([]);
                  setSelectedDrillIds(new Set());
                  setActiveView("library");
                }}>Skip</Button>
                <Button type="submit" disabled={saveWorkoutMutation.isPending || savedWorkoutLimitReached} data-testid="button-confirm-fav-workout">
                  {saveWorkoutMutation.isPending ? "Saving..." : "Save Favorite Workout"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Active Workout View — full screen takeover */}
      {activeView === "workout" && workoutInProgress && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#050505] [background-image:radial-gradient(circle_at_85%_0%,hsl(var(--primary)/0.12),transparent_32%)]" data-testid="workout-fullscreen">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <Card className="overflow-hidden border-white/10 bg-zinc-950/90 shadow-2xl shadow-orange-950/20">
          <CardHeader className="border-b border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Play className="h-4 w-4 fill-current" /></span>
                    {activeWorkoutName}
                  </CardTitle>
                  <CardDescription className="mt-2 text-zinc-400">
                    {sessionDrillCount} drill{sessionDrillCount !== 1 ? 's' : ''} · {workoutMode === "complete" ? `${completedDrillCount} completed` : "Track your work as you go"}
                  </CardDescription>
                </div>
                <div className="flex rounded-xl border border-white/10 bg-black/30 p-1" aria-label="Workout logging mode">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                     className={workoutMode === "complete" ? "bg-white text-black hover:bg-zinc-200 hover:text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"}
                    onClick={() => setWorkoutMode("complete")}
                    aria-pressed={workoutMode === "complete"}
                    data-testid="button-mode-quick-complete"
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Quick Complete
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                     className={workoutMode === "track" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-zinc-400 hover:bg-white/5 hover:text-white"}
                    onClick={() => setWorkoutMode("track")}
                    aria-pressed={workoutMode === "track"}
                    data-testid="button-mode-track-stats"
                  >
                    <Target className="mr-1.5 h-4 w-4" />
                    Track Stats
                  </Button>
                </div>
                {/* Single workout elapsed timer — auto-starts when workout begins */}
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2" data-testid="workout-elapsed-timer">
                  <Timer className="h-4 w-4 text-primary" />
                  <span className="font-mono text-lg font-bold tabular-nums text-primary">{workoutElapsed}</span>
                </div>
                {/* Manual override — lets user correct the time if timer was started late */}
                <div className="flex items-center gap-1.5" title="Override session duration if timer was inaccurate">
                  <input
                    type="number"
                    min="1"
                    max="600"
                    placeholder="Override min"
                    value={manualDurationMinutes}
                    onChange={e => setManualDurationMinutes(e.target.value)}
                    className="h-8 w-24 rounded-lg border border-white/10 bg-black/30 px-2 text-sm tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-primary/60 placeholder:text-zinc-600"
                    data-testid="input-manual-duration"
                  />
                  <span className="text-xs text-zinc-500">min</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={cancelWorkout} className="gap-2 border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white" data-testid="button-cancel-workout">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                {workoutEntries.length >= 2 && savedWorkoutLimitReached && (
                  <Button
                    variant="outline"
                    onClick={() => openProOffer("PLAYR1 Pro training features")}
                    className="gap-2"
                    data-testid="button-upgrade-save-workout"
                  >
                    <Bookmark className="w-4 h-4" />
                    Upgrade to save
                  </Button>
                )}
                {workoutEntries.length >= 2 && !savedWorkoutLimitReached && (
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
                            <Button type="submit" disabled={saveWorkoutMutation.isPending || savedWorkoutLimitReached} data-testid="button-confirm-save-workout">
                              {saveWorkoutMutation.isPending ? "Saving..." : "Save Workout"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
                <Button
                  onClick={saveWorkout}
                  className="gap-2"
                  disabled={isSavingWorkout || (workoutMode === "complete" && quickCompletedDrillIds.size === 0)}
                  data-testid="button-finish-workout"
                >
                  {isSavingWorkout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSavingWorkout
                    ? "Saving..."
                    : workoutMode === "complete"
                      ? `Save ${quickCompletedDrillIds.size} Completed`
                      : "Finish Workout"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-7">
            {workoutMode === "complete" ? (
              <div className="space-y-4" data-testid="quick-complete-checklist">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-black">
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </div>
                    <div>
                       <h3 className="font-heading text-base uppercase tracking-wide text-white">Check off what you finish</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No numbers are required. Checked drills will be saved to History and count toward your training activity.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {quickWorkoutEntries.map((entry) => {
                    const completed = quickCompletedDrillIds.has(entry.drillId);
                    return (
                      <button
                        key={entry.drillId}
                        type="button"
                        onClick={() => {
                          setQuickCompletedDrillIds((current) => {
                            const next = new Set(current);
                            if (next.has(entry.drillId)) next.delete(entry.drillId);
                            else next.add(entry.drillId);
                            return next;
                          });
                        }}
                        className={`flex min-h-20 w-full items-center gap-4 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          completed
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"
                        }`}
                        aria-pressed={completed}
                        data-testid={`quick-complete-drill-${entry.drillId}`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                          completed
                            ? "border-emerald-400 bg-emerald-500 text-black"
                            : "border-zinc-500 bg-black text-transparent"
                        }`}>
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block font-heading text-sm uppercase tracking-wide ${completed ? "text-emerald-300" : "text-white"}`}>
                            {entry.drill.title}
                          </span>
                          <span className="mt-1 block text-xs capitalize text-zinc-400">
                            {formatCategory(entry.drill.category)} · {entry.drill.difficulty}
                          </span>
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {completed ? "Done" : "Tap to finish"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
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
                    .filter(dm => (dm.template.type as string) !== 'calculated' && ((dm.template.type as string) !== 'timer' || dm.isRequired))
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
                  const estMinutes = firstEntry.duration || (group.drill.duration ? Math.round(group.drill.duration / 60) : null);
                  const challengeOptions = getMatchingChallenges(group.drill.category || '');
                  const attemptsMetric = metricColumns.find((metric) =>
                    `${metric.template.name} ${metric.template.label}`.toLowerCase().includes('attempt')
                  );
                  const makesMetric = metricColumns.find((metric) => {
                    const label = `${metric.template.name} ${metric.template.label}`.toLowerCase();
                    return label.includes('made') || label.includes('make');
                  });
                  const totalAttempts = attemptsMetric
                    ? group.entries.reduce((total, { entry }) => total + (entry.metrics[attemptsMetric.metricTemplateId] || 0), 0)
                    : 0;
                  const totalMakes = makesMetric
                    ? group.entries.reduce((total, { entry }) => total + (entry.metrics[makesMetric.metricTemplateId] || 0), 0)
                    : 0;
                  const shootingAccuracy = totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 100) : null;
                  
                  return (
                    <Card key={drillId} className="overflow-hidden border-white/10 bg-zinc-950/70" data-testid={`drill-table-${drillId}`}>
                      <CardHeader className="space-y-4 border-b border-white/[0.06] pb-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                                Drill {String(drillIdx + 1).padStart(2, '0')}
                              </span>
                              <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-300">
                                {formatCategory(group.drill.category)}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                {group.entries.length} round{group.entries.length !== 1 ? 's' : ''}
                                {estMinutes ? ` · ~${estMinutes} min` : ''}
                                {firstEntry.plannedSets ? ` · ${firstEntry.plannedSets} sets` : ''}
                                {firstEntry.plannedReps ? ` · ${firstEntry.plannedReps} reps` : ''}
                              </span>
                            </div>
                            <CardTitle className="text-xl leading-tight text-white">{group.drill.title}</CardTitle>
                            {firstEntry.coachingNotes && (
                              <p className="max-w-3xl text-sm leading-5 text-zinc-400">{firstEntry.coachingNotes}</p>
                            )}
                            {showTimestamps && (
                              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                Started {relativeTime(drillStartedMs!)}
                                {drillEndedMs ? ` · Ended ${relativeTime(drillEndedMs)}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                              onClick={() => setDrillInfoOpen(group.drill)}
                              data-testid={`button-drill-info-${drillId}`}
                              title="View drill details"
                              aria-label={`View details for ${group.drill.title}`}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addRound(group.entries[group.entries.length - 1].index)}
                              className="h-10 gap-1.5 border-primary/30 bg-primary/10 px-3 text-primary hover:bg-primary/15"
                              data-testid={`button-add-round-${drillId}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add round
                            </Button>
                          </div>
                        </div>

                        {shootingAccuracy !== null && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3">
                            <div>
                              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Shooting accuracy</p>
                              <p className="mt-1 text-xs text-zinc-400">{totalMakes} makes from {totalAttempts} attempts</p>
                            </div>
                            <p className="font-heading text-3xl leading-none text-primary">{shootingAccuracy}%</p>
                          </div>
                        )}

                        {challengeOptions.length > 0 && group.entries.length > 1 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="text-xs text-zinc-400">Set a challenge for every round</span>
                            <Select onValueChange={(value) => applyChallengeToAllRounds(drillId, value)}>
                              <SelectTrigger className="h-9 w-full border-white/10 bg-black/30 text-xs sm:w-52" data-testid={`select-challenge-all-${drillId}`}>
                                <SelectValue placeholder="Apply to all rounds…" />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4}>
                                <SelectItem value="none">Clear all rounds</SelectItem>
                                {challengeOptions.map((challenge) => (
                                  <SelectItem key={challenge.id} value={challenge.id}>{challenge.challenge.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 p-3 sm:p-4">
                        {group.entries.map(({ entry, index }, roundIdx) => {
                          const roundAttempts = attemptsMetric ? entry.metrics[attemptsMetric.metricTemplateId] || 0 : 0;
                          const roundMakes = makesMetric ? entry.metrics[makesMetric.metricTemplateId] || 0 : 0;
                          const roundAccuracy = roundAttempts > 0 ? Math.round((roundMakes / roundAttempts) * 100) : null;

                          return (
                            <section
                              key={index}
                              className="space-y-4 rounded-2xl border border-white/[0.08] bg-black/25 p-3.5 sm:p-4"
                              data-testid={`workout-row-${index}`}
                              aria-label={`Round ${roundIdx + 1} of ${group.drill.title}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-200">
                                    Round {String(roundIdx + 1).padStart(2, '0')}
                                  </span>
                                  {roundAccuracy !== null && (
                                    <span className="text-xs text-zinc-500">{roundMakes}/{roundAttempts} · {roundAccuracy}%</span>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                                  onClick={() => removeFromWorkout(index)}
                                  data-testid={`button-remove-${index}`}
                                  aria-label={`Remove round ${roundIdx + 1} of ${group.drill.title}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              {isShootingDrill && (
                                <div className="max-w-sm space-y-1.5">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500" htmlFor={`select-location-${index}`}>
                                    Shot location
                                  </label>
                                  <Select
                                    value={entry.shotLocation || ''}
                                    onValueChange={(value) => updateEntry(index, 'shotLocation', value)}
                                  >
                                    <SelectTrigger id={`select-location-${index}`} className="h-10 w-full border-white/10 bg-black/30 text-sm" data-testid={`select-location-${index}`}>
                                      <SelectValue placeholder="Choose location" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4} className="max-h-[50vh] overflow-y-auto">
                                      {(shotLocationOptions || []).map((location) => (
                                        <SelectItem key={location.slug} value={location.slug}>
                                          <span className="flex items-center gap-2">
                                            {location.label}
                                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                              {location.classification === 'free-throw' ? 'FT' :
                                                location.classification === '2-pointer' ? '2PT' : '3PT'}
                                            </Badge>
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {metricColumns.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {metricColumns.map((metric) => (
                                    <div key={metric.metricTemplateId} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                                          {(metric.template.type as string) === 'timer' && <Timer className="h-3.5 w-3.5 shrink-0 text-primary" />}
                                          <span className="truncate">{metric.template.label}</span>
                                          {metric.isRequired && <span className="text-destructive">*</span>}
                                        </span>
                                        {metric.isRequired && <span className="shrink-0 text-[9px] text-zinc-600">Required</span>}
                                      </div>
                                      {(metric.template.type as string) === 'timer' ? (
                                        <div className="mt-2">
                                          <DrillTimer
                                            value={entry.metrics[metric.metricTemplateId] || 0}
                                            onChange={(seconds) => updateMetricValue(index, metric.metricTemplateId, seconds)}
                                            data-testid={`timer-metric-${index}-${metric.metricTemplateId}`}
                                          />
                                        </div>
                                      ) : (
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          aria-label={`${metric.template.label} for round ${roundIdx + 1}`}
                                          value={entry.metrics[metric.metricTemplateId] || ''}
                                          onChange={(event) => updateMetricValue(index, metric.metricTemplateId, parseFloat(event.target.value) || 0)}
                                          className="mt-2 h-12 border-white/10 bg-black/35 text-center font-mono text-xl font-bold tabular-nums text-white placeholder:text-zinc-700 focus-visible:ring-primary"
                                          placeholder="0"
                                          data-testid={`input-metric-${index}-${metric.metricTemplateId}`}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">
                                  No performance metrics are configured for this drill yet.
                                </p>
                              )}

                            </section>
                          );
                        })}
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
            )}
          </CardContent>
        </Card>
          </div>
        </div>
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
              {drillInfoOpen.videoUrl && (
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                  {/youtube\.com|youtu\.be/.test(drillInfoOpen.videoUrl) ? (
                    <iframe
                      src={drillInfoOpen.videoUrl
                        .replace("watch?v=", "embed/")
                        .replace("youtu.be/", "youtube.com/embed/")}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`${drillInfoOpen.title} video`}
                      data-testid="iframe-drill-video"
                    />
                  ) : (
                    <video
                      src={drillInfoOpen.videoUrl}
                      controls
                      className="w-full h-full"
                      data-testid="video-drill"
                    />
                  )}
                </div>
              )}
              {drillInfoOpen.description && (
                <div className="text-sm whitespace-pre-line text-muted-foreground" data-testid="text-drill-description">
                  {drillInfoOpen.description}
                </div>
              )}
              <DialogFooter>
                <Link href={`/drill/${drillInfoOpen.id}`}>
                  <Button variant="outline" data-testid="button-open-full-drill">
                    Open full drill page
                  </Button>
                </Link>
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
        <div className="space-y-5 sm:space-y-6" data-testid="training-history">
          <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">The work adds up</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black uppercase tracking-wide text-white">
                <Calendar className="h-5 w-5 text-orange-400" />
                Training History
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Review every rep, session, and shot from your training floor.</p>
            </div>
            <Button variant="outline" onClick={() => setActiveView("library")} className="h-10 w-full gap-2 border-zinc-700 bg-zinc-950/70 text-white hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300 sm:w-auto" data-testid="button-back-to-library">
              <Plus className="w-4 h-4" />
              New Workout
            </Button>
          </div>

          {!logsLoading && logs && logs.length > 0 && (
            <section className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Training history summary">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 sm:p-3.5">
                <p className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">Sessions</p>
                <p className="mt-1 text-xl font-black tabular-nums text-white">{historySummary.sessions}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">{Object.keys(groupedLogs).length} training day{Object.keys(groupedLogs).length === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 sm:p-3.5">
                <p className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">Time trained</p>
                <p className="mt-1 text-xl font-black tabular-nums text-white">{formatDuration(historySummary.minutes)}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">{logs.length} drill logs</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 sm:p-3.5">
                <p className="font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">Shooting</p>
                <p className="mt-1 text-xl font-black tabular-nums text-orange-400">{historySummary.attempts ? `${Math.round((historySummary.makes / historySummary.attempts) * 100)}%` : "—"}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">{historySummary.attempts ? `${historySummary.makes}/${historySummary.attempts} makes` : "No shot data yet"}</p>
              </div>
            </section>
          )}

          {logsLoading ? (
            <div className="space-y-5" data-testid="training-history-loading">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="border-zinc-800 bg-zinc-950/70 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-11 w-11 rounded-lg bg-zinc-800" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/3 bg-zinc-800" />
                        <Skeleton className="h-3 w-1/2 bg-zinc-800" />
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
                    <div key={date} className="relative">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-px flex-1 bg-zinc-800" />
                        <Calendar className="h-3.5 w-3.5 text-orange-400" />
                        <h3 className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <Badge variant="secondary" className="border border-orange-500/20 bg-orange-500/10 text-[10px] font-bold uppercase tracking-wide text-orange-300">
                          {totalLogs} drill{totalLogs > 1 ? 's' : ''}
                        </Badge>
                        <div className="h-px flex-1 bg-zinc-800" />
                      </div>
                      <div className="space-y-3">
                        {logGroups.map((group, groupIndex) => (
                          group.sessionId && group.logs.length > 1 ? (() => {
                            // Calculate session totals for shooting stats
                            let sessionTotalAttempts = 0;
                            let sessionTotalMade = 0;
                            group.logs.forEach(log => {
                              const stats = getMetricStats(log, log.drillId ?? "");
                              if (stats) {
                                sessionTotalAttempts += stats.attempts;
                                sessionTotalMade += stats.made;
                              }
                            });
                            const sessionPercentage = sessionTotalAttempts > 0 
                              ? Math.round((sessionTotalMade / sessionTotalAttempts) * 100) 
                              : null;
                            
                            const sessionShotData = aggregateShotData(group.logs);
                            
                            // Group logs by drillId to create Drills > Rounds hierarchy
                            const drillGroups: Record<string, TrainingLogWithMetricsResponse[]> = {};
                            group.logs.forEach(log => {
                              const drillId = log.drillId ?? "unknown";
                              if (!drillGroups[drillId]) {
                                drillGroups[drillId] = [];
                              }
                              drillGroups[drillId].push(log);
                            });
                            
                            const uniqueDrillCount = Object.keys(drillGroups).length;
                            const totalRounds = group.logs.length;
                            
                            return (
                            <Collapsible key={group.sessionId} defaultOpen={false}>
                              <Card className="border-orange-500/25 bg-zinc-950/85 shadow-none" data-testid={`card-session-${group.sessionId}`}>
                                <CardHeader className="pb-2 p-3 sm:p-4">
                                  <div className="flex items-start gap-2">
                                    <CollapsibleTrigger asChild>
                                      <div className="flex-1 cursor-pointer space-y-1 min-w-0" data-testid={`trigger-session-${group.sessionId}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <ChevronRight className="w-4 h-4 shrink-0 text-zinc-500 transition-transform [[data-state=open]_&]:rotate-90" />
                                          <Layers className="w-4 h-4 shrink-0 text-orange-400" />
                                          <span className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-white">Workout Session</span>
                                          <Badge variant="secondary" className="border border-orange-500/20 bg-orange-500/10 text-[10px] text-orange-300">
                                            {uniqueDrillCount} drill{uniqueDrillCount > 1 ? 's' : ''}, {totalRounds} round{totalRounds > 1 ? 's' : ''}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 pl-6 text-xs text-zinc-500">
                                          {sessionPercentage !== null && (
                                            <>
                                              <span className="text-sm font-bold tabular-nums text-white">{sessionTotalMade}/{sessionTotalAttempts} shots</span>
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
                                          {sessionShotData.length > 0 && (
                                            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                              <ShotChartButton shotData={sessionShotData} title="Workout Shot Chart" testId={`button-shot-chart-workout-${group.sessionId}`} />
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>
                                    {group.sessionId && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                         className="h-8 w-8 shrink-0 text-zinc-500 hover:bg-orange-500/10 hover:text-orange-300"
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
                                       className="h-8 w-8 shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
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
                                      const drillShotData = aggregateShotData(drillLogs);
                                      let drillTotalAttempts = 0;
                                      let drillTotalMade = 0;
                                      drillLogs.forEach(log => {
                                        const stats = getMetricStats(log, log.drillId ?? "");
                                        if (stats) {
                                          drillTotalAttempts += stats.attempts;
                                          drillTotalMade += stats.made;
                                        }
                                      });
                                      const drillPercentage = drillTotalAttempts > 0 ? Math.round((drillTotalMade / drillTotalAttempts) * 100) : null;
                                      const drillDuration = drillLogs.reduce((sum, l) => sum + l.duration, 0);
                                      
                                      return (
                                        <Collapsible key={drillId} defaultOpen={drillLogs.length === 1}>
                                          <div className="overflow-hidden rounded-md border border-zinc-800/80 bg-zinc-900/70">
                                            <CollapsibleTrigger asChild>
                                              <div 
                                                  className="cursor-pointer p-2.5 hover:bg-orange-500/5 sm:p-3"
                                                data-testid={`trigger-drill-${drillId}`}
                                              >
                                                <div className="flex items-start gap-2">
                                                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform [[data-state=open]_&]:rotate-90" />
                                                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                                                  <div className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-white">{getDrillTitle(drillId)}</span>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                                                      <Badge variant="outline" className="border-zinc-700 px-1.5 py-0 text-[9px] uppercase tracking-wide text-zinc-400">{formatCategory(getDrillCategory(drillId))}</Badge>
                                                      <span>·</span>
                                                      <span>{drillLogs.length} round{drillLogs.length > 1 ? 's' : ''}</span>
                                                      <span>·</span>
                                                      <span>{formatDuration(drillDuration)}</span>
                                                      {drillPercentage !== null && (
                                                        <>
                                                          <span>·</span>
                                                          <span className="font-medium tabular-nums text-white">{drillTotalMade}/{drillTotalAttempts}</span>
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
                                                      {drillShotData.length > 0 && (
                                                        <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                          <ShotChartButton shotData={drillShotData} title={`${getDrillTitle(drillId)} Shot Chart`} testId={`button-shot-chart-drill-${drillId}`} />
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="border-t border-zinc-800/80 px-3 pb-3 sm:px-4">
                                                <div className="py-2 font-heading text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Rounds</div>
                                                <div className="space-y-2">
                                                  {drillLogs.map((log, roundIndex) => {
                                                    const roundStats = getMetricStats(log, log.drillId ?? "");
                                                    return (
                                                      <div 
                                                        key={log.id}
                                                        className="flex cursor-pointer items-center gap-1.5 rounded bg-black/20 p-1.5 hover:bg-orange-500/5 sm:p-2"
                                                        data-testid={`round-item-${log.id}`}
                                                        onClick={() => openViewLog(log.id)}
                                                      >
                                                        <Badge variant="outline" className="shrink-0 border-zinc-700 px-1.5 text-[10px] text-zinc-400">
                                                          R{roundIndex + 1}
                                                        </Badge>
                                                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                                                          {roundStats?.location && (
                                                            <span className="truncate max-w-[80px] sm:max-w-[100px]">
                                                              {getLocationLabel(roundStats.location)}
                                                            </span>
                                                          )}
                                                          {roundStats && (
                                                            <>
                                                              <span className="font-medium tabular-nums text-white">{roundStats.made}/{roundStats.attempts}</span>
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
                                                          className="h-6 w-6 shrink-0 text-zinc-500 hover:bg-orange-500/10 hover:text-orange-300"
                                                          onClick={(e) => { e.stopPropagation(); openEditLog(log); }}
                                                          data-testid={`button-edit-round-${log.id}`}
                                                        >
                                                          <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon"
                                                          className="h-6 w-6 shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                                                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this round?')) deleteLogMutation.mutate(log.id); }}
                                                          data-testid={`button-delete-round-${log.id}`}
                                                        >
                                                          <Trash2 className="w-3 h-3 text-zinc-500" />
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
                              const stats = getMetricStats(log, log.drillId ?? "");
                              return (
                              <Card 
                                key={log.id} 
                                className="cursor-pointer border-zinc-800 bg-zinc-950/80 shadow-none hover:border-orange-500/35"
                                data-testid={`card-log-${log.id}`}
                                onClick={() => openViewLog(log.id)}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 sm:h-10 sm:w-10">
                                      <Target className="h-4 w-4 text-orange-400 sm:h-5 sm:w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                        <Badge variant="outline" className="border-zinc-700 px-1.5 py-0 text-[9px] uppercase tracking-wide text-zinc-400">{formatCategory(getDrillCategory(log.drillId ?? ""))}</Badge>
                                        {typeof log.score === "number" && <span className="text-[10px] font-bold uppercase tracking-wide text-orange-300">Score {log.score}/10</span>}
                                      </div>
                                      <h4 className="truncate text-sm font-semibold text-white" data-testid={`text-log-drill-${log.id}`}>
                                        {getDrillTitle(log.drillId ?? "")}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 sm:gap-2">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatDuration(log.duration)}
                                        </span>
                                        {stats && (
                                          <>
                                            <span className="font-medium tabular-nums text-white">{stats.made}/{stats.attempts} shots</span>
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShareSessionId(group.sessionId || log.id);
                                          setShowShareDialog(true);
                                        }}
                                        title="Share workout story"
                                        data-testid={`button-share-log-${log.id}`}
                                      >
                                        <Share2 className="h-4 w-4 text-zinc-500 hover:text-orange-300" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); openEditLog(log); }}
                                        data-testid={`button-edit-log-${log.id}`}
                                      >
                                        <Pencil className="h-4 w-4 text-zinc-500" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this training log?')) deleteLogMutation.mutate(log.id); }}
                                        data-testid={`button-delete-log-${log.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-zinc-500" />
                                      </Button>
                                    </div>
                                  </div>
                                  {log.notes && (
                                    <p className="mt-3 line-clamp-2 border-t border-zinc-800 pt-3 text-sm text-zinc-500">
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
            <Card className="border-zinc-800 bg-zinc-950/70 shadow-none">
              <CardContent className="p-8 text-center sm:p-12">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                  <ClipboardList className="h-7 w-7 text-orange-400" />
                </div>
                <h3 className="mb-2 text-lg font-black uppercase tracking-wide text-white">No Training Sessions Yet</h3>
                <p className="mx-auto mb-4 max-w-md text-sm text-zinc-500">
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
              {viewEditLog && getDrillTitle(viewEditLog.drillId ?? "")}
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

              {/* Shot Chart Button - only show if there's shot location data */}
              {(() => {
                const shotData = getShotMapData(viewEditLog);
                if (shotData.length > 0 && !isEditMode) {
                  return (
                    <div className="border-t pt-4">
                      <ShotChartButton shotData={shotData} title={`${getDrillTitle(viewEditLog.drillId ?? "")} Shot Chart`} testId={`button-shot-chart-log-${viewEditLog.id}`} />
                    </div>
                  );
                }
                return null;
              })()}

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

      {/* Record Shooting Mode — full-screen overlay */}
      {showRecordShootingMode && (
        <RecordShootingMode
          onClose={() => setShowRecordShootingMode(false)}
        />
      )}

      {/* Live Shot Counter — for recording shots on a specific drill entry */}
      {recordingEntryIndex !== null && workoutEntries[recordingEntryIndex] && (
        <LiveShotCounter
          location={workoutEntries[recordingEntryIndex].shotLocation || "free-throw"}
          locationLabel={
            workoutEntries[recordingEntryIndex].shotLocation
              ? getLocationLabel(workoutEntries[recordingEntryIndex].shotLocation!)
              : "Select Location First"
          }
          initialMade={workoutEntries[recordingEntryIndex].shotsMade || 0}
          initialAttempted={workoutEntries[recordingEntryIndex].shotsAttempted || 0}
          onDone={(made, attempted) => {
            const idx = recordingEntryIndex;
            // Update entry fields directly
            updateEntry(idx, "shotsMade", made);
            updateEntry(idx, "shotsAttempted", attempted);
            // Also update metric inputs if drill has matching metrics
            const entry = workoutEntries[idx];
            entry.drillMetrics.forEach(dm => {
              const n = dm.template.name.toLowerCase();
              const l = dm.template.label.toLowerCase();
              if (n.includes("attempt") || l.includes("attempt")) {
                updateMetricValue(idx, dm.metricTemplateId, attempted);
              } else if ((n.includes("made") || l.includes("made")) && !n.includes("attempt")) {
                updateMetricValue(idx, dm.metricTemplateId, made);
              }
            });
            setRecordingEntryIndex(null);
          }}
          onClose={() => setRecordingEntryIndex(null)}
        />
      )}
    </div>
  );
}
