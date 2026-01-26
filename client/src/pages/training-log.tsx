import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  FormDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  User
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, TrainingLog, DrillMetric, MetricTemplate } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS } from "@shared/schema";

// Type for drill metric with template info
type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };

type WorkoutDrillEntry = {
  drillId: string;
  drill: Drill;
  duration: number;
  notes: string;
  score: number;
  metrics: Record<string, number>; // metricTemplateId -> value
  drillMetrics: DrillMetricWithTemplate[]; // The configured metrics for this drill
};

const createDrillSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(DRILL_CATEGORIES as readonly [string, ...string[]]),
  difficulty: z.enum(DIFFICULTY_LEVELS as readonly [string, ...string[]]),
});

type CreateDrillFormData = z.infer<typeof createDrillSchema>;

export default function TrainingLogPage() {
  const { toast } = useToast();
  const [selectedDrillIds, setSelectedDrillIds] = useState<Set<string>>(new Set());
  const [workoutInProgress, setWorkoutInProgress] = useState(false);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutDrillEntry[]>([]);
  const [isCreateDrillOpen, setIsCreateDrillOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("start");

  // Fetch drills available to user (admin + their own)
  const { data: drills, isLoading: drillsLoading } = useQuery<Drill[]>({
    queryKey: ['/api/user/drills'],
  });

  // Fetch user's own drills
  const { data: userDrills } = useQuery<Drill[]>({
    queryKey: ['/api/drills/my-drills'],
  });

  // Fetch training logs
  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLog[]>({
    queryKey: ['/api/training-logs'],
  });

  // Group drills by category
  const drillsByCategory = useMemo(() => {
    if (!drills) return {};
    const grouped: Record<string, Drill[]> = {};
    drills.forEach(drill => {
      const cat = drill.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(drill);
    });
    return grouped;
  }, [drills]);

  // Create drill form
  const createDrillForm = useForm<CreateDrillFormData>({
    resolver: zodResolver(createDrillSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "ball-handling",
      difficulty: "beginner",
    },
  });

  // Create drill mutation
  const createDrillMutation = useMutation({
    mutationFn: async (data: CreateDrillFormData) => {
      return await apiRequest("POST", "/api/user/drills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drills/my-drills'] });
      toast({ title: "Drill created successfully" });
      setIsCreateDrillOpen(false);
      createDrillForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create drill", variant: "destructive" });
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
  const startWorkout = async () => {
    if (selectedDrillIds.size === 0) {
      toast({ title: "Please select at least one drill", variant: "destructive" });
      return;
    }

    // Fetch metrics for all selected drills in parallel
    const drillIds = Array.from(selectedDrillIds);
    const metricsPromises = drillIds.map(id => fetchDrillMetrics(id));
    const metricsResults = await Promise.all(metricsPromises);

    const entries: WorkoutDrillEntry[] = [];
    drillIds.forEach((id, index) => {
      const drill = drills?.find(d => d.id === id);
      if (drill) {
        const drillMetrics = metricsResults[index] || [];
        // Initialize metric values (default to 0)
        const metricValues: Record<string, number> = {};
        drillMetrics.forEach(dm => {
          metricValues[dm.metricTemplateId] = 0;
        });
        
        entries.push({
          drillId: id,
          drill,
          duration: Math.round((drill.duration || 300) / 60), // Convert to minutes
          notes: "",
          score: 7,
          metrics: metricValues,
          drillMetrics,
        });
      }
    });

    setWorkoutEntries(entries);
    setWorkoutInProgress(true);
    setActiveTab("workout");
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

  // Validate required metrics for all entries
  const validateRequiredMetrics = (): boolean => {
    for (const entry of workoutEntries) {
      const requiredMetrics = entry.drillMetrics.filter(dm => dm.isRequired);
      for (const metric of requiredMetrics) {
        const value = entry.metrics[metric.metricTemplateId];
        if (value === undefined || value <= 0) {
          toast({ 
            title: "Missing Required Metrics", 
            description: `Please fill in "${metric.template.name}" for ${entry.drill.title}`,
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
    // Validate required metrics first
    if (!validateRequiredMetrics()) {
      return;
    }

    try {
      // Create training logs for each drill and save metrics
      for (const entry of workoutEntries) {
        // Create the training log first
        const logResponse = await apiRequest("POST", "/api/training-logs", {
          drillId: entry.drillId,
          duration: entry.duration,
          notes: entry.notes || undefined,
          score: entry.score,
        });
        
        // If this drill has metrics, save all of them (including 0 values for optional metrics)
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
        title: "Workout Saved", 
        description: `Logged ${workoutEntries.length} drill${workoutEntries.length > 1 ? 's' : ''}` 
      });
      
      // Reset state
      setWorkoutInProgress(false);
      setWorkoutEntries([]);
      setSelectedDrillIds(new Set());
      setActiveTab("history");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({ title: "Failed to save workout", variant: "destructive" });
    }
  };

  // Cancel workout
  const cancelWorkout = () => {
    setWorkoutInProgress(false);
    setWorkoutEntries([]);
    setActiveTab("start");
  };

  // Get drill title helper
  const getDrillTitle = (drillId: string) => {
    const drill = drills?.find(d => d.id === drillId);
    return drill?.title || "Unknown Drill";
  };

  // Group logs by date
  const groupLogsByDate = (logs: TrainingLog[]) => {
    const grouped: Record<string, TrainingLog[]> = {};
    logs.forEach(log => {
      const date = format(new Date(log.completedAt!), 'yyyy-MM-dd');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(log);
    });
    return grouped;
  };

  const groupedLogs = logs ? groupLogsByDate(logs) : {};

  // Format category name
  const formatCategory = (cat: string) => {
    return cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Training Log</h1>
          <p className="text-muted-foreground">Build your workout and track progress</p>
        </div>
        
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="start" disabled={workoutInProgress} data-testid="tab-start">
            <Dumbbell className="w-4 h-4 mr-2" />
            Start Workout
          </TabsTrigger>
          <TabsTrigger value="workout" disabled={!workoutInProgress} data-testid="tab-workout">
            <Play className="w-4 h-4 mr-2" />
            Active Workout
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Calendar className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Start Workout Tab - Multi-select drills */}
        <TabsContent value="start" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Select Drills for Today's Workout
              </CardTitle>
              <CardDescription>
                Choose the drills you want to practice, then start your workout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {drillsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{drill.title}</span>
                                {drill.userId && (
                                  <Badge variant="outline" className="text-xs">
                                    <User className="w-3 h-3 mr-1" />
                                    My Drill
                                  </Badge>
                                )}
                              </div>
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
              )}

              {selectedDrillIds.size > 0 && (
                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedDrillIds.size} drill{selectedDrillIds.size > 1 ? 's' : ''} selected
                  </p>
                  <Button onClick={startWorkout} className="gap-2" data-testid="button-start-workout">
                    <Play className="w-4 h-4" />
                    Start Workout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Workout Tab - Table input */}
        <TabsContent value="workout" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Today's Workout
                  </CardTitle>
                  <CardDescription>
                    Track your performance for each drill
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelWorkout} className="gap-2" data-testid="button-cancel-workout">
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button onClick={saveWorkout} className="gap-2" disabled={createLogMutation.isPending} data-testid="button-save-workout">
                    <Save className="w-4 h-4" />
                    Save Workout
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workoutEntries.map((entry, index) => (
                  <Card key={entry.drillId} className="border-muted" data-testid={`workout-row-${index}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{entry.drill.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {formatCategory(entry.drill.category)}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFromWorkout(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Standard fields */}
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
                      
                      {/* Dynamic drill metrics */}
                      {entry.drillMetrics.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-3">Drill Metrics</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {entry.drillMetrics
                              .filter(dm => dm.template.type !== 'calculated')
                              .map(dm => (
                                <div key={dm.metricTemplateId} className="space-y-1">
                                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                    {dm.template.name}
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
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
                .map(([date, dayLogs]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <Badge variant="secondary" className="ml-2">
                      {dayLogs.length} session{dayLogs.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {dayLogs.map((log) => (
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Training Sessions Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Start a workout to track your practice sessions and progress.
                </p>
                <Button onClick={() => setActiveTab("start")} className="gap-2" data-testid="button-first-log">
                  <Play className="w-4 h-4" />
                  Start Your First Workout
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
