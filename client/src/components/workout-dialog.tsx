import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [workoutDrillIds, setWorkoutDrillIds] = useState<string[]>([]);

  const handlzDrills = drills.filter(d => !d.userId);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setCategory("");
      setWorkoutDrillIds([]);
    }
  }, [open]);

  // Initialize form when editing workout changes (only when opening to edit)
  useEffect(() => {
    if (open && editingWorkout) {
      setName(editingWorkout.name);
      setDescription(editingWorkout.description || "");
      setCategory(editingWorkout.category || "");
      // Fetch drill IDs for this workout
      fetch(`/api/workouts/${editingWorkout.id}`)
        .then(res => res.json())
        .then((data: WorkoutWithDrills) => {
          setWorkoutDrillIds(data.drills.map(wd => wd.drillId));
        })
        .catch(() => setWorkoutDrillIds([]));
    }
  }, [open, editingWorkout?.id]);

  const toggleWorkoutDrill = (drillId: string) => {
    setWorkoutDrillIds(prev => 
      prev.includes(drillId) 
        ? prev.filter(id => id !== drillId)
        : [...prev, drillId]
    );
  };

  const createWorkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/workouts/handlz", {
        name,
        description: description || undefined,
        category: category || undefined,
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
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/workouts/${editingWorkout!.id}`, {
        name,
        description: description || undefined,
        category: category || undefined,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingWorkout) {
      updateWorkoutMutation.mutate();
    } else {
      createWorkoutMutation.mutate();
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout Name</Label>
            <Input 
              id="workout-name"
              placeholder="e.g., Ball Handling Fundamentals" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-workout-name" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="workout-description">Description (Optional)</Label>
            <Textarea 
              id="workout-description"
              placeholder="Describe this workout routine..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-workout-description" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="workout-category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="workout-category" data-testid="select-workout-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {DRILL_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Select Drills ({workoutDrillIds.length} selected)</Label>
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
      </DialogContent>
    </Dialog>
  );
}
