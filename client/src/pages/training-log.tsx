import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Clock, 
  Target, 
  Calendar,
  ClipboardList,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, TrainingLog } from "@shared/schema";

const logFormSchema = z.object({
  drillId: z.string().min(1, "Please select a drill"),
  duration: z.number().min(1, "Duration must be at least 1 minute").max(180),
  reps: z.number().min(0).optional(),
  sets: z.number().min(0).optional(),
  score: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

type LogFormData = z.infer<typeof logFormSchema>;

export default function TrainingLogPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLog[]>({
    queryKey: ['/api/training-logs'],
  });

  const { data: drills } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const form = useForm<LogFormData>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      drillId: "",
      duration: 15,
      reps: undefined,
      sets: undefined,
      score: 7,
      notes: "",
    },
  });

  const createLogMutation = useMutation({
    mutationFn: async (data: LogFormData) => {
      return await apiRequest("POST", "/api/training-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      toast({
        title: "Session Logged",
        description: "Your training session has been recorded.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LogFormData) => {
    createLogMutation.mutate(data);
  };

  const getDrillTitle = (drillId: string) => {
    const drill = drills?.find(d => d.id === drillId);
    return drill?.title || "Unknown Drill";
  };

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Training Log</h1>
          <p className="text-muted-foreground">Track your practice sessions and progress</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-log">
              <Plus className="w-4 h-4" />
              Log Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Training Session</DialogTitle>
              <DialogDescription>
                Record your practice session details
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="drillId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drill</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-drill">
                            <SelectValue placeholder="Select a drill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {drills?.map(drill => (
                            <SelectItem key={drill.id} value={drill.id}>
                              {drill.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reps</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Optional"
                            {...field}
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-reps"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sets</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Optional"
                            {...field}
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-sets"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Self Rating: {field.value}/10</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[field.value || 7]}
                          onValueChange={([val]) => field.onChange(val)}
                          data-testid="slider-score"
                        />
                      </FormControl>
                      <FormDescription>
                        Rate your performance on this session
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What went well? What to improve?"
                          className="resize-none"
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createLogMutation.isPending}
                    data-testid="button-submit-log"
                  >
                    {createLogMutation.isPending ? "Saving..." : "Log Session"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
            .map(([date, dayLogs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
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
              Start logging your practice sessions to track your progress over time.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-first-log">
              <Plus className="w-4 h-4" />
              Log Your First Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
