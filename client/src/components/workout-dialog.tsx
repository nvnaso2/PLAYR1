import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/dialog";
import type { Drill, Workout } from "@shared/schema";

const DRILL_CATEGORIES = [
  "ball-handling",
  "shooting", 
  "passing",
  "finishing",
  "defense",
  "film-session",
  "workouts",
];

const workoutFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
});

type WorkoutFormData = z.infer<typeof workoutFormSchema>;

interface WorkoutWithDrills extends Workout {
  drills: { drillId: string; orderIndex: number }[];
}

interface WorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWorkout: Workout | null;
  drills: Drill[];
}

export function WorkoutDialog({ open, onOpenChange, editingWorkout, drills }: WorkoutDialogProps) {
  const { toast } = useToast();
  const [workoutDrillIds, setWorkoutDrillIds] = useState<string[]>([]);

  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  });

  // Reset form when dialog opens/closes or editing workout changes
  useEffect(() => {
    if (open) {
      if (editingWorkout) {
        form.reset({
          name: editingWorkout.name,
          description: editingWorkout.description || "",
          category: editingWorkout.category || "",
        });
        // Fetch the workout's drills
        fetch(`/api/workouts/${editingWorkout.id}`)
          .then(res => res.json())
          .then((data: WorkoutWithDrills) => {
            setWorkoutDrillIds(data.drills.map(wd => wd.drillId));
          })
          .catch(() => setWorkoutDrillIds([]));
      } else {
        form.reset({
          name: "",
          description: "",
          category: "",
        });
        setWorkoutDrillIds([]);
      }
    }
  }, [open, editingWorkout, form]);

  const handlzDrills = drills.filter(d => !d.userId);

  const toggleWorkoutDrill = (drillId: string) => {
    setWorkoutDrillIds(prev => 
      prev.includes(drillId) 
        ? prev.filter(id => id !== drillId)
        : [...prev, drillId]
    );
  };

  const createWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormData) => {
      return await apiRequest("POST", "/api/workouts/handlz", {
        ...data,
        drillIds: workoutDrillIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/handlz'] });
      toast({ title: "Workout created successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create workout", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkoutFormData }) => {
      return await apiRequest("PUT", `/api/workouts/${id}`, {
        ...data,
        drillIds: workoutDrillIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/handlz'] });
      toast({ title: "Workout updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update workout", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (data: WorkoutFormData) => {
    if (editingWorkout) {
      updateWorkoutMutation.mutate({ id: editingWorkout.id, data });
    } else {
      createWorkoutMutation.mutate(data);
    }
  };

  const isPending = createWorkoutMutation.isPending || updateWorkoutMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingWorkout ? "Edit Workout" : "Create Workout"}</DialogTitle>
          <DialogDescription>
            {editingWorkout ? "Update this workout's details and drills" : "Create a new workout routine by selecting drills"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ball Handling Fundamentals" {...field} data-testid="input-workout-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe this workout routine..." {...field} data-testid="input-workout-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-workout-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DRILL_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Select Drills ({workoutDrillIds.length} selected)</FormLabel>
              <p className="text-sm text-muted-foreground">Choose drills to include in this workout</p>
              <ScrollArea className="h-64 border rounded-md p-3">
                {handlzDrills.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No Handlz drills available. Create drills first.</p>
                ) : (
                  <div className="space-y-2">
                    {handlzDrills.map(drill => (
                      <div 
                        key={drill.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate ${
                          workoutDrillIds.includes(drill.id) ? 'bg-primary/10 border border-primary' : 'border'
                        }`}
                        onClick={() => toggleWorkoutDrill(drill.id)}
                        data-testid={`workout-drill-select-${drill.id}`}
                      >
                        <Checkbox 
                          checked={workoutDrillIds.includes(drill.id)}
                          onCheckedChange={() => toggleWorkoutDrill(drill.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{drill.title}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {drill.category.replace(/-/g, ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {drill.difficulty}
                            </Badge>
                          </div>
                        </div>
                        {workoutDrillIds.includes(drill.id) && (
                          <Badge className="bg-primary text-primary-foreground">
                            #{workoutDrillIds.indexOf(drill.id) + 1}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                data-testid="button-save-workout"
              >
                {isPending ? "Saving..." : (editingWorkout ? "Update Workout" : "Create Workout")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
