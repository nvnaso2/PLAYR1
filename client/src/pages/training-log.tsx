import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
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
import { queryClient, apiRequest, nativeFetch } from "@/lib/queryClient";
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
  Square,
  Check,
  Trophy,
  Medal,
  Trash2,
  Globe,
  Upload,
  Video,
  Star,
  Heart,
  Search
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, TrainingLog, DrillMetric, MetricTemplate, Workout, WorkoutDrill, ShotLocationDB, Challenge, UserChallenge } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, insertDrillSchema, insertWorkoutSchema } from "@shared/schema";
import { HalfCourtMap, ShotChartButton, type ShotData } from "@/components/half-court-map";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };

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
  const [drillVideoFile, setDrillVideoFile] = useState<File | null>(null);
  const [drillVideoUploading, setDrillVideoUploading] = useState(false);
  const [drillVideoProgress, setDrillVideoProgress] = useState(0);
  const [activeView, setActiveView] = useState<"library" | "workout" | "history">("library");
  const [showFavoriteDialog, setShowFavoriteDialog] = useState(false);
  const [showCreateWorkoutMode, setShowCreateWorkoutMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
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
  
  // Timer state: tracks which rounds have active timers
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({}); // index -> start timestamp
  const [timerTick, setTimerTick] = useState(0); // Force re-render for timer display
  
  // Timer tick effect - update every second when any timer is active
  useEffect(() => {
    const hasActiveTimers = Object.keys(activeTimers).length > 0;
    if (!hasActiveTimers) return;
    
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [Object.keys(activeTimers).length]);
  
  // Start timer for a round
  const startTimer = (index: number) => {
    setActiveTimers(prev => ({ ...prev, [index]: Date.now() }));
  };
  
  // Stop timer and update duration
  const stopTimer = (index: number) => {
    const startTime = activeTimers[index];
    if (startTime) {
      const elapsedMs = Date.now() - startTime;
      const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
      updateEntry(index, 'duration', elapsedMinutes);
    }
    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };
  
  // Get elapsed time string for a timer
  const getElapsedTime = (index: number): string => {
    const startTime = activeTimers[index];
    if (!startTime) return "0:00";
    const elapsedMs = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
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
    // Only handle the drill param once and when drills are loaded
    if (drillParamHandled.current || !allDrills || allDrills.length === 0) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const drillId = urlParams.get('drill');
    
    if (drillId) {
      const drill = allDrills.find(d => d.id === drillId);
      if (drill) {
        drillParamHandled.current = true;
        // Auto-start a workout with this drill
        (async () => {
          // Fetch metrics for the drill
          try {
            const res = await nativeFetch(`/api/drills/${drillId}/metrics`);
            const drillMetrics: DrillMetricWithTemplate[] = res.ok ? await res.json() : [];
            
            // Create initial metric values
            const metricValues: Record<string, number> = {};
            drillMetrics.forEach(dm => {
              metricValues[dm.metricTemplateId] = 0;
            });
            
            // Auto-detect shot location for well-known drill types
            let autoShotLocation: string | undefined;
            if (drill.trackShots && drill.title.toLowerCase().includes('free throw')) {
              autoShotLocation = 'free-throw';
            }

            // Add drill to workout entries and start workout
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
      }
    }
  }, [allDrills, setLocation]);

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
    },
  });

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
      const response = await apiRequest("POST", "/api/user/drills", {
        ...data,
        ...(videoUrl ? { videoUrl } : {}),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-drills'] });
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
      toast({ title: "Training log updated" });
      setViewEditLogId(null);
      setIsEditMode(false);
    },
    onError: () => {
      toast({ title: "Failed to update log", variant: "destructive" });
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
  const startWorkoutFromDrills = async () => {
    if (selectedDrillIds.size === 0) {
      toast({ title: "Please select at least one drill", variant: "destructive" });
      return;
    }

    const drillIds = Array.from(selectedDrillIds);
    const metricsPromises = drillIds.map(id => fetchDrillMetrics(id));
    const metricsResults = await Promise.all(metricsPromises);

    const entries: WorkoutDrillEntry[] = [];
    drillIds.forEach((id, index) => {
      const drill = allDrills?.find(d => d.id === id);
      if (drill) {
        const drillMetrics = metricsResults[index] || [];
        const metricValues: Record<string, number> = {};
        drillMetrics.forEach(dm => {
          metricValues[dm.metricTemplateId] = 0;
        });
        
        entries.push({
          drillId: id,
          drill,
          duration: Math.round((drill.duration || 300) / 60),
          notes: "",
          metrics: metricValues,
          drillMetrics,
        });
      }
    });

    setWorkoutEntries(entries);
    setWorkoutInProgress(true);
    setActiveView("workout");
  };

  // Quick start a single drill (for dropdown selection)
  const quickStartDrill = async (drillId: string) => {
    const drill = allDrills?.find(d => d.id === drillId);
    if (!drill) {
      toast({ title: "Drill not found", variant: "destructive" });
      return;
    }

    const drillMetrics = await fetchDrillMetrics(drillId);
    const metricValues: Record<string, number> = {};
    drillMetrics.forEach(dm => {
      metricValues[dm.metricTemplateId] = 0;
    });

    const entries: WorkoutDrillEntry[] = [{
      drillId,
      drill,
      duration: Math.round((drill.duration || 300) / 60),
      notes: "",
      metrics: metricValues,
      drillMetrics,
    }];

    setWorkoutEntries(entries);
    setWorkoutInProgress(true);
    setActiveView("workout");
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
    } catch {
      toast({ title: "Failed to load workout", variant: "destructive" });
    }
  };

  // Update workout entry
  const updateEntry = (index: number, field: keyof WorkoutDrillEntry, value: any) => {
    setWorkoutEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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
    
    // Fetch metrics for the drill
    const drillMetrics = await fetchDrillMetrics(drillId);
    
    // Create initial metric values
    const metricValues: Record<string, number> = {};
    drillMetrics.forEach(dm => {
      metricValues[dm.metricTemplateId] = 0;
    });
    
    // Auto-detect shot location for well-known drill types
    let autoShotLocation: string | undefined;
    if (drill.trackShots) {
      const titleLower = drill.title.toLowerCase();
      if (titleLower.includes('free throw')) {
        const ftLocation = shotLocationOptions?.find(loc => loc.classification === 'free-throw');
        autoShotLocation = ftLocation?.slug || 'free-throw';
      }
    }

    const newEntry: WorkoutDrillEntry = {
      drillId,
      drill,
      duration: 0,
      notes: "",
      metrics: metricValues,
      drillMetrics,
      shotLocation: autoShotLocation,
    };
    
    setWorkoutEntries(prev => [...prev, newEntry]);
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

    try {
      const sessionId = crypto.randomUUID();
      
      // Track challenge progress updates to apply
      const challengeUpdates: Record<string, number> = {};
      
      for (const entry of workoutEntries) {
        const isShootingDrill = entry.drill.trackShots;
        
        // Derive shot values from metric templates for heatmap/stats
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
        
        const logResponse = await apiRequest("POST", "/api/training-logs", {
          drillId: entry.drillId,
          duration: entry.duration,
          notes: entry.notes || undefined,
          workoutSessionId: workoutEntries.length > 1 ? sessionId : undefined,
          shotLocation: isShootingDrill ? entry.shotLocation : undefined,
          shotsAttempted: derivedAttempted,
          shotsMade: derivedMade,
        });
        
        if (entry.drillMetrics.length > 0 && Object.keys(entry.metrics).length > 0) {
          const logData = await logResponse.json();
          const metricsToSave = Object.entries(entry.metrics)
            .map(([metricId, value]) => ({
              metricId,
              value: Number(value)
            }));
          
          if (metricsToSave.length > 0) {
            await apiRequest("POST", `/api/training-logs/${logData.id}/metrics`, {
              metrics: metricsToSave
            });
          }
        }
        
        // Update challenge progress for tracked challenges
        if (entry.trackToChallengeIds && entry.trackToChallengeIds.length > 0) {
          for (const userChallengeId of entry.trackToChallengeIds) {
            const userChallenge = activeChallenges?.find(uc => uc.id === userChallengeId);
            if (!userChallenge) continue;
            
            // Calculate metric value based on challenge metric type
            let metricValue = 0;
            const metric = userChallenge.challenge.metric;
            
            if (metric === 'makes') {
              // For shooting challenges, use shots made derived from metric templates
              metricValue = derivedMade || 0;
            } else if (metric === 'time') {
              // Time is tracked in the duration field (minutes)
              metricValue = entry.duration || 0;
            } else if (metric === 'reps') {
              // Find metrics related to reps (look for specific patterns)
              const repMetrics = entry.drillMetrics.filter(dm => {
                const name = dm.template.name.toLowerCase();
                return name.includes('rep') || name.includes('count') || name.includes('total');
              });
              if (repMetrics.length > 0) {
                // Sum all rep-related metrics
                metricValue = repMetrics.reduce((sum, dm) => sum + (entry.metrics[dm.metricTemplateId] || 0), 0);
              } else if (entry.drillMetrics.length === 1) {
                // If only one metric, use it
                metricValue = Object.values(entry.metrics)[0] || 0;
              }
            } else if (metric === 'score') {
              // Find metrics related to score
              const scoreMetrics = entry.drillMetrics.filter(dm => {
                const name = dm.template.name.toLowerCase();
                return name.includes('score') || name.includes('point');
              });
              if (scoreMetrics.length > 0) {
                metricValue = scoreMetrics.reduce((sum, dm) => sum + (entry.metrics[dm.metricTemplateId] || 0), 0);
              } else if (entry.drillMetrics.length === 1) {
                // If only one metric, use it as score
                metricValue = Object.values(entry.metrics)[0] || 0;
              }
            } else if (metric === 'dribbles') {
              // Find dribble-related metrics (expanded patterns)
              const dribbleMetrics = entry.drillMetrics.filter(dm => {
                const name = dm.template.name.toLowerCase();
                return name.includes('dribble') || name.includes('handle') || name.includes('ball control');
              });
              if (dribbleMetrics.length > 0) {
                metricValue = dribbleMetrics.reduce((sum, dm) => sum + (entry.metrics[dm.metricTemplateId] || 0), 0);
              }
            } else if (metric === 'passes') {
              // Find pass-related metrics (expanded patterns)
              const passMetrics = entry.drillMetrics.filter(dm => {
                const name = dm.template.name.toLowerCase();
                return name.includes('pass') || name.includes('assist');
              });
              if (passMetrics.length > 0) {
                metricValue = passMetrics.reduce((sum, dm) => sum + (entry.metrics[dm.metricTemplateId] || 0), 0);
              }
            }
            
            if (metricValue > 0) {
              challengeUpdates[userChallengeId] = (challengeUpdates[userChallengeId] || 0) + metricValue;
            }
          }
        }
      }
      
      // Apply all challenge progress updates
      for (const [userChallengeId, addedValue] of Object.entries(challengeUpdates)) {
        const userChallenge = activeChallenges?.find(uc => uc.id === userChallengeId);
        if (!userChallenge) continue;
        
        const newValue = (userChallenge.currentValue || 0) + addedValue;
        await apiRequest("PUT", `/api/challenges/${userChallengeId}/progress`, {
          currentValue: newValue
        });
        
        // Check if challenge is complete
        if (newValue >= userChallenge.challenge.targetValue) {
          await apiRequest("POST", `/api/challenges/${userChallengeId}/complete`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/weekly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/by-category'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/shots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard-training'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-drills'] });
      
      const challengeCount = Object.keys(challengeUpdates).length;
      toast({ 
        title: "Workout Complete!", 
        description: challengeCount > 0 
          ? `Logged ${workoutEntries.length} drill${workoutEntries.length > 1 ? 's' : ''} and updated ${challengeCount} challenge${challengeCount > 1 ? 's' : ''}`
          : `Logged ${workoutEntries.length} drill${workoutEntries.length > 1 ? 's' : ''}` 
      });
      
      setWorkoutInProgress(false);
      setShowFavoriteDialog(true);
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({ title: "Failed to save workout", variant: "destructive" });
    }
  };

  // Cancel workout
  const cancelWorkout = () => {
    setWorkoutInProgress(false);
    setWorkoutEntries([]);
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
                                onCheckedChange={field.onChange}
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
                                  setSelectedMetricTemplateIds(prev =>
                                    prev.includes(template.id)
                                      ? prev.filter(id => id !== template.id)
                                      : [...prev, template.id]
                                  );
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

      {/* Active Workout View */}
      {activeView === "workout" && workoutInProgress && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Active Workout
                </CardTitle>
                <CardDescription>
                  {workoutEntries.length} drill{workoutEntries.length > 1 ? 's' : ''} in this session
                </CardDescription>
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
                <Button onClick={saveWorkout} className="gap-2" disabled={createLogMutation.isPending} data-testid="button-finish-workout">
                  <Save className="w-4 h-4" />
                  Finish Workout
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Group entries by drill for table display */}
              {(() => {
                const drillGroups = new Map<string, { drill: Drill; entries: Array<{ entry: WorkoutDrillEntry; index: number }> }>();
                workoutEntries.forEach((entry, index) => {
                  if (!drillGroups.has(entry.drillId)) {
                    drillGroups.set(entry.drillId, { drill: entry.drill, entries: [] });
                  }
                  drillGroups.get(entry.drillId)!.entries.push({ entry, index });
                });
                
                return Array.from(drillGroups.entries()).map(([drillId, group]) => {
                  const firstEntry = group.entries[0].entry;
                  const metricColumns = firstEntry.drillMetrics
                    .filter(dm => dm.template.type !== 'calculated')
                    .sort((a, b) => {
                      const isAttemptA = a.template.name.toLowerCase().includes('attempt') || a.template.label.toLowerCase().includes('attempt');
                      const isAttemptB = b.template.name.toLowerCase().includes('attempt') || b.template.label.toLowerCase().includes('attempt');
                      return Number(isAttemptA) - Number(isAttemptB);
                    });
                  const isShootingDrill = group.drill.trackShots;
                  
                  return (
                    <Card key={drillId} className="border-muted" data-testid={`drill-table-${drillId}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{group.drill.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {formatCategory(group.drill.category)} - {group.entries.length} round{group.entries.length > 1 ? 's' : ''}
                            </CardDescription>
                          </div>
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
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto -mx-1 px-1">
                          <table className="w-full text-sm min-w-[500px]">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground w-14 sm:w-20 text-xs sm:text-sm">Round</th>
                                {isShootingDrill && (
                                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm">Location</th>
                                )}
                                {metricColumns.map(dm => (
                                  <th key={dm.metricTemplateId} className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                                    <span className="inline-block max-w-[80px] sm:max-w-none truncate sm:whitespace-normal">{dm.template.label}</span>
                                    {dm.isRequired && <span className="text-destructive ml-1">*</span>}
                                  </th>
                                ))}
                                <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground w-20 sm:w-24 text-xs sm:text-sm">Time</th>
                                <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell">Notes</th>
                                {getMatchingChallenges(group.drill.category || '').length > 0 && (
                                  <th className="text-left p-2 sm:p-3 font-medium text-primary text-xs sm:text-sm whitespace-nowrap">
                                    <span className="flex items-center gap-1">
                                      <Target className="w-3 h-3" />
                                      Challenge
                                    </span>
                                  </th>
                                )}
                                <th className="text-center p-2 sm:p-3 font-medium text-muted-foreground w-10 sm:w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.entries.map(({ entry, index }, roundIdx) => (
                                <tr key={index} className="border-b last:border-0 hover:bg-muted/20" data-testid={`workout-row-${index}`}>
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
                                        <SelectContent>
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
                                    </td>
                                  )}
                                  {metricColumns.map(dm => (
                                    <td key={dm.metricTemplateId} className="p-1 sm:p-2">
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
                                    </td>
                                  ))}
                                  <td className="p-2">
                                    <div className="flex items-center gap-1">
                                      {activeTimers[index] ? (
                                        <>
                                          <span className="font-mono text-sm text-primary font-bold min-w-[45px]" data-testid={`timer-display-${index}`}>
                                            {getElapsedTime(index)}
                                          </span>
                                          <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => stopTimer(index)}
                                            data-testid={`button-stop-timer-${index}`}
                                          >
                                            <Square className="w-3 h-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-xs text-muted-foreground min-w-[35px]">{entry.duration}m</span>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => startTimer(index)}
                                            data-testid={`button-start-timer-${index}`}
                                          >
                                            <Timer className="w-3 h-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
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
                                        <SelectContent>
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
      )}

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
                            
                            const sessionShotData = aggregateShotData(group.logs);
                            
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
                            <Collapsible key={group.sessionId} defaultOpen={true}>
                              <Card className="border-primary/20" data-testid={`card-session-${group.sessionId}`}>
                                <CollapsibleTrigger asChild>
                                  <CardHeader className="pb-2 cursor-pointer hover-elevate p-3 sm:p-4" data-testid={`trigger-session-${group.sessionId}`}>
                                    <div className="space-y-1">
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
                                          {group.logs.reduce((sum, l) => sum + l.duration, 0)} min
                                        </span>
                                        {sessionShotData.length > 0 && (
                                          <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <ShotChartButton shotData={sessionShotData} title="Workout Shot Chart" testId={`button-shot-chart-workout-${group.sessionId}`} />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <CardContent className="space-y-3 pt-0">
                                    {/* Drills within this workout */}
                                    {Object.entries(drillGroups).map(([drillId, drillLogs]) => {
                                      // Calculate drill-level stats
                                      const drillShotData = aggregateShotData(drillLogs);
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
                                                      <span>{drillDuration} min</span>
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
                                                          <span>{log.duration} min</span>
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
                                          {log.duration} min
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
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="shrink-0"
                                      onClick={(e) => { e.stopPropagation(); openEditLog(log); }}
                                      data-testid={`button-edit-log-${log.id}`}
                                    >
                                      <Pencil className="w-4 h-4 text-muted-foreground" />
                                    </Button>
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

              {/* Shot Chart Button - only show if there's shot location data */}
              {(() => {
                const shotData = getShotMapData(viewEditLog);
                if (shotData.length > 0 && !isEditMode) {
                  return (
                    <div className="border-t pt-4">
                      <ShotChartButton shotData={shotData} title={`${getDrillTitle(viewEditLog.drillId)} Shot Chart`} testId={`button-shot-chart-log-${viewEditLog.id}`} />
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
    </div>
  );
}
