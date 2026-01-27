import { useState, useMemo } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Copy
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, TrainingLog, DrillMetric, MetricTemplate, Workout, WorkoutDrill } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, insertDrillSchema, insertWorkoutSchema } from "@shared/schema";

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
  score: number;
  metrics: Record<string, number>;
  drillMetrics: DrillMetricWithTemplate[];
};

// Use insert schemas from shared/schema.ts with UI-specific extensions
const createDrillFormSchema = insertDrillSchema.pick({
  title: true,
  description: true,
  category: true,
  difficulty: true,
}).extend({
  title: z.string().min(1, "Title is required"),
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
  const [selectedDrillIds, setSelectedDrillIds] = useState<Set<string>>(new Set());
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutDrillEntry[]>([]);
  const [isCreateDrillOpen, setIsCreateDrillOpen] = useState(false);
  const [isSaveWorkoutOpen, setIsSaveWorkoutOpen] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState("personal-drills");
  const [activeView, setActiveView] = useState<"library" | "workout" | "history">("library");

  // Fetch Handlz drills (admin drills with userId = null) - server filters correctly
  const { data: handlzDrills, isLoading: handlzDrillsLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
    select: (drills) => drills.filter(d => d.userId === null),
  });

  // Fetch user's personal drills using the dedicated endpoint
  const { data: personalDrills, isLoading: personalDrillsLoading } = useQuery<Drill[]>({
    queryKey: ['/api/user/my-drills'],
  });
  
  // Combined drills for lookup
  const allDrills = useMemo(() => {
    const combined: Drill[] = [];
    if (handlzDrills) combined.push(...handlzDrills);
    if (personalDrills) combined.push(...personalDrills);
    return combined;
  }, [handlzDrills, personalDrills]);

  // Fetch workouts
  const { data: handlzWorkouts, isLoading: handlzWorkoutsLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts/handlz'],
  });

  const { data: personalWorkouts, isLoading: personalWorkoutsLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts/personal'],
  });

  // Fetch training logs
  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLog[]>({
    queryKey: ['/api/training-logs'],
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

  const personalDrillsByCategory = useMemo(() => groupByCategory(personalDrills || []), [personalDrills]);
  const handlzDrillsByCategory = useMemo(() => groupByCategory(handlzDrills || []), [handlzDrills]);
  
  const drillsLoading = handlzDrillsLoading || personalDrillsLoading;

  // Create drill form
  const createDrillForm = useForm<CreateDrillFormData>({
    resolver: zodResolver(createDrillFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "ball-handling",
      difficulty: "beginner",
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
      return await apiRequest("POST", "/api/user/drills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/my-drills'] });
      toast({ title: "Drill created successfully" });
      setIsCreateDrillOpen(false);
      createDrillForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create drill", variant: "destructive" });
    },
  });

  // Save workout mutation
  const saveWorkoutMutation = useMutation({
    mutationFn: async (data: SaveWorkoutFormData) => {
      const drillIds = workoutEntries.map(e => e.drillId);
      const totalDuration = workoutEntries.reduce((sum, e) => sum + e.duration, 0);
      return await apiRequest("POST", "/api/workouts", {
        name: data.name,
        description: data.description,
        category: data.category || null,
        estimatedDuration: totalDuration,
        drillIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/personal'] });
      toast({ title: "Workout saved successfully" });
      setIsSaveWorkoutOpen(false);
      saveWorkoutForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to save workout", variant: "destructive" });
    },
  });

  // Create training log mutation
  const createLogMutation = useMutation({
    mutationFn: async (data: { drillId: string; duration: number; notes?: string; score?: number }) => {
      return await apiRequest("POST", "/api/training-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
    },
  });

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
      const response = await fetch(`/api/drills/${drillId}/metrics`);
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
          score: 7,
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
      score: 7,
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
      const response = await fetch(`/api/workouts/${workoutId}`);
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
          score: 7,
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
      next[entryIndex] = {
        ...next[entryIndex],
        metrics: {
          ...next[entryIndex].metrics,
          [metricTemplateId]: value
        }
      };
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
      score: 7,
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
      
      for (const entry of workoutEntries) {
        const logResponse = await apiRequest("POST", "/api/training-logs", {
          drillId: entry.drillId,
          duration: entry.duration,
          notes: entry.notes || undefined,
          score: entry.score,
          workoutSessionId: workoutEntries.length > 1 ? sessionId : undefined,
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
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      
      toast({ 
        title: "Workout Complete!", 
        description: `Logged ${workoutEntries.length} drill${workoutEntries.length > 1 ? 's' : ''}` 
      });
      
      setWorkoutInProgress(false);
      setWorkoutEntries([]);
      setSelectedDrillIds(new Set());
      setActiveView("history");
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
    logs: TrainingLog[];
  };
  
  const groupLogsByDateAndSession = (logs: TrainingLog[]) => {
    // First group by date
    const byDate: Record<string, TrainingLog[]> = {};
    logs.forEach(log => {
      const date = format(new Date(log.completedAt!), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(log);
    });
    
    // Then within each date, group by workout session
    const result: Record<string, LogGroup[]> = {};
    Object.entries(byDate).forEach(([date, dayLogs]) => {
      const sessions: Record<string, TrainingLog[]> = {};
      const singles: TrainingLog[] = [];
      
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
  const renderDrillList = (drillsByCategory: Record<string, Drill[]>, isPersonal: boolean) => {
    if (Object.keys(drillsByCategory).length === 0) {
      return (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-2">
            {isPersonal ? "No Personal Drills Yet" : "No Handlz Drills Available"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {isPersonal ? "Create your own custom drills to get started" : "Check back soon for new training content"}
          </p>
          {isPersonal && (
            <Button onClick={() => setIsCreateDrillOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Drill
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(drillsByCategory).map(([category, categoryDrills]) => (
          <div key={category}>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              {formatCategory(category)}
            </h3>
            <div className="grid gap-2">
              {categoryDrills.map(drill => (
                <div 
                  key={drill.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${
                    selectedDrillIds.has(drill.id) ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => toggleDrillSelection(drill.id)}
                  data-testid={`drill-select-${drill.id}`}
                >
                  <Checkbox 
                    checked={selectedDrillIds.has(drill.id)}
                    onCheckedChange={() => toggleDrillSelection(drill.id)}
                    data-testid={`checkbox-drill-${drill.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{drill.title}</span>
                    {drill.description && (
                      <p className="text-sm text-muted-foreground truncate">{drill.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary">{drill.difficulty}</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render workout list
  const renderWorkoutList = (workouts: Workout[] | undefined, isLoading: boolean, isPersonal: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }

    if (!workouts || workouts.length === 0) {
      return (
        <div className="text-center py-12">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-2">
            {isPersonal ? "No Saved Workouts" : "No Handlz Workouts Available"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {isPersonal 
              ? "Start a workout with 2+ drills and save it for quick access" 
              : "Check back soon for curated workout routines"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {workouts.map(workout => (
          <Card 
            key={workout.id} 
            className="cursor-pointer hover-elevate"
            onClick={() => startWorkoutFromTemplate(workout.id)}
            data-testid={`workout-card-${workout.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{workout.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {workout.estimatedDuration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {workout.estimatedDuration} min
                        </span>
                      )}
                      {workout.category && (
                        <Badge variant="outline" className="text-xs">
                          {formatCategory(workout.category)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Training Log</h1>
          <p className="text-muted-foreground">Build workouts, track progress, get better</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={activeView === "history" ? "default" : "outline"} 
            onClick={() => setActiveView("history")}
            className="gap-2"
            data-testid="button-view-history"
          >
            <Calendar className="w-4 h-4" />
            History
          </Button>
          <Dialog open={isCreateDrillOpen} onOpenChange={setIsCreateDrillOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-create-drill">
                <Plus className="w-4 h-4" />
                Create Drill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Your Own Drill</DialogTitle>
                <DialogDescription>
                  Add a custom drill to your training library
                </DialogDescription>
              </DialogHeader>
              <Form {...createDrillForm}>
                <form onSubmit={createDrillForm.handleSubmit(d => createDrillMutation.mutate(d))} className="space-y-4">
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
                          <Textarea placeholder="Describe the drill..." {...field} data-testid="input-drill-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDrillOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createDrillMutation.isPending} data-testid="button-save-drill">
                      {createDrillMutation.isPending ? "Creating..." : "Create Drill"}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Start a Workout
            </CardTitle>
            <CardDescription>
              Select drills to practice, or pick a saved workout routine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLibraryTab} onValueChange={setActiveLibraryTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="personal-drills" className="text-xs sm:text-sm" data-testid="tab-personal-drills">
                  <User className="w-4 h-4 mr-1 hidden sm:inline" />
                  My Drills
                </TabsTrigger>
                <TabsTrigger value="personal-workouts" className="text-xs sm:text-sm" data-testid="tab-personal-workouts">
                  <Bookmark className="w-4 h-4 mr-1 hidden sm:inline" />
                  My Workouts
                </TabsTrigger>
                <TabsTrigger value="handlz-drills" className="text-xs sm:text-sm" data-testid="tab-handlz-drills">
                  <Sparkles className="w-4 h-4 mr-1 hidden sm:inline" />
                  Handlz Drills
                </TabsTrigger>
                <TabsTrigger value="handlz-workouts" className="text-xs sm:text-sm" data-testid="tab-handlz-workouts">
                  <Layers className="w-4 h-4 mr-1 hidden sm:inline" />
                  Handlz Workouts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal-drills">
                {/* Quick Start Drill Dropdown */}
                <div className="flex justify-end mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2" data-testid="button-quick-start-personal-drill">
                        <Play className="w-4 h-4" />
                        Start Drill
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Select a Drill</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-64">
                        {personalDrills && personalDrills.length > 0 ? (
                          personalDrills.map(drill => (
                            <DropdownMenuItem 
                              key={drill.id} 
                              onClick={() => quickStartDrill(drill.id)}
                              data-testid={`quick-start-drill-${drill.id}`}
                            >
                              <div className="flex flex-col">
                                <span>{drill.title}</span>
                                <span className="text-xs text-muted-foreground">{formatCategory(drill.category)}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No drills available</DropdownMenuItem>
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {drillsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  renderDrillList(personalDrillsByCategory, true)
                )}
              </TabsContent>

              <TabsContent value="personal-workouts">
                {/* Quick Start Workout Dropdown */}
                <div className="flex justify-end mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2" data-testid="button-quick-start-personal-workout">
                        <Play className="w-4 h-4" />
                        Start Workout
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Select a Workout</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-64">
                        {personalWorkouts && personalWorkouts.length > 0 ? (
                          personalWorkouts.map(workout => (
                            <DropdownMenuItem 
                              key={workout.id} 
                              onClick={() => startWorkoutFromTemplate(workout.id)}
                              data-testid={`quick-start-workout-${workout.id}`}
                            >
                              <div className="flex flex-col">
                                <span>{workout.name}</span>
                                {workout.description && (
                                  <span className="text-xs text-muted-foreground truncate">{workout.description}</span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No workouts saved yet</DropdownMenuItem>
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {renderWorkoutList(personalWorkouts, personalWorkoutsLoading, true)}
              </TabsContent>

              <TabsContent value="handlz-drills">
                {/* Quick Start Drill Dropdown */}
                <div className="flex justify-end mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2" data-testid="button-quick-start-handlz-drill">
                        <Play className="w-4 h-4" />
                        Start Drill
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Select a Drill</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-64">
                        {handlzDrills && handlzDrills.length > 0 ? (
                          handlzDrills.map(drill => (
                            <DropdownMenuItem 
                              key={drill.id} 
                              onClick={() => quickStartDrill(drill.id)}
                              data-testid={`quick-start-handlz-drill-${drill.id}`}
                            >
                              <div className="flex flex-col">
                                <span>{drill.title}</span>
                                <span className="text-xs text-muted-foreground">{formatCategory(drill.category)}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No drills available</DropdownMenuItem>
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {drillsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  renderDrillList(handlzDrillsByCategory, false)
                )}
              </TabsContent>

              <TabsContent value="handlz-workouts">
                {/* Quick Start Workout Dropdown */}
                <div className="flex justify-end mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2" data-testid="button-quick-start-handlz-workout">
                        <Play className="w-4 h-4" />
                        Start Workout
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Select a Workout</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-64">
                        {handlzWorkouts && handlzWorkouts.length > 0 ? (
                          handlzWorkouts.map(workout => (
                            <DropdownMenuItem 
                              key={workout.id} 
                              onClick={() => startWorkoutFromTemplate(workout.id)}
                              data-testid={`quick-start-handlz-workout-${workout.id}`}
                            >
                              <div className="flex flex-col">
                                <span>{workout.name}</span>
                                {workout.description && (
                                  <span className="text-xs text-muted-foreground truncate">{workout.description}</span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No workouts available</DropdownMenuItem>
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {renderWorkoutList(handlzWorkouts, handlzWorkoutsLoading, false)}
              </TabsContent>
            </Tabs>
          </CardContent>

          {selectedDrillIds.size > 0 && (
            <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedDrillIds.size} drill{selectedDrillIds.size > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedDrillIds(new Set())} data-testid="button-clear-selection">
                  Clear
                </Button>
                <Button onClick={startWorkoutFromDrills} className="gap-2" data-testid="button-start-workout">
                  <Play className="w-4 h-4" />
                  Start Workout
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

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
                                  <Textarea placeholder="Describe this workout..." {...field} data-testid="input-workout-description" />
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
            <div className="space-y-4">
              {workoutEntries.map((entry, index) => {
                const totalRounds = getTotalRounds(entry.drillId);
                const roundNum = getRoundNumber(index);
                return (
                <Card key={`${entry.drillId}-${index}`} className="border-muted" data-testid={`workout-row-${index}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{entry.drill.title}</CardTitle>
                            {totalRounds > 1 && (
                              <Badge variant="outline" className="text-xs">
                                Round {roundNum}/{totalRounds}
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            {formatCategory(entry.drill.category)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => addRound(index)}
                          title="Add another round"
                          data-testid={`button-add-round-${index}`}
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFromWorkout(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Duration (min)</label>
                        <Input
                          type="number"
                          min={1}
                          max={180}
                          value={entry.duration}
                          onChange={(e) => updateEntry(index, 'duration', parseInt(e.target.value) || 1)}
                          data-testid={`input-duration-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Score (1-10)</label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={entry.score}
                          onChange={(e) => updateEntry(index, 'score', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          data-testid={`input-score-${index}`}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Notes</label>
                        <Input
                          placeholder="Optional notes..."
                          value={entry.notes}
                          onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                          data-testid={`input-notes-${index}`}
                        />
                      </div>
                    </div>
                    
                    {entry.drillMetrics.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Drill Metrics</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {entry.drillMetrics
                            .filter(dm => dm.template.type !== 'calculated')
                            .map(dm => (
                              <div key={dm.metricTemplateId} className="space-y-1">
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                  {dm.template.label}
                                  {dm.isRequired && <span className="text-destructive">*</span>}
                                </label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={entry.metrics[dm.metricTemplateId] || 0}
                                  onChange={(e) => updateMetricValue(index, dm.metricTemplateId, parseFloat(e.target.value) || 0)}
                                  placeholder={dm.template.unit || ''}
                                  data-testid={`input-metric-${index}-${dm.metricTemplateId}`}
                                />
                                {dm.template.unit && (
                                  <span className="text-xs text-muted-foreground">{dm.template.unit}</span>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
              })}
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
                          group.sessionId && group.logs.length > 1 ? (
                            <Card key={group.sessionId} className="border-primary/20" data-testid={`card-session-${group.sessionId}`}>
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium">Workout Session</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {group.logs.length} drills
                                  </Badge>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {group.logs.reduce((sum, l) => sum + l.duration, 0)} min total
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {group.logs.map((log) => (
                                  <div key={log.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30" data-testid={`log-item-${log.id}`}>
                                    <div className="flex items-center gap-3">
                                      <Target className="w-4 h-4 text-primary" />
                                      <span className="font-medium text-sm">{getDrillTitle(log.drillId)}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span>{log.duration} min</span>
                                      {log.score && (
                                        <Badge variant="secondary" className="text-xs">
                                          {log.score}/10
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          ) : (
                            group.logs.map((log) => (
                              <Card key={log.id} className="hover-elevate" data-testid={`card-log-${log.id}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Target className="w-6 h-6 text-primary" />
                                      </div>
                                      <div>
                                        <h4 className="font-medium" data-testid={`text-log-drill-${log.id}`}>
                                          {getDrillTitle(log.drillId)}
                                        </h4>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {log.duration} min
                                          </span>
                                          {log.reps && (
                                            <span>{log.reps} reps</span>
                                          )}
                                          {log.sets && (
                                            <span>{log.sets} sets</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {log.score && (
                                        <Badge variant="secondary" className="text-sm">
                                          {log.score}/10
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {log.notes && (
                                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                                      {log.notes}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            ))
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
    </div>
  );
}
