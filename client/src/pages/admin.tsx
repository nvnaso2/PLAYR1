import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Video, Star, StarOff, ShieldAlert, Users, Shield, Settings2, Calculator, Hash } from "lucide-react";
import type { Drill, DrillCategory, DifficultyLevel, DrillMetric } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, METRIC_TYPES } from "@shared/schema";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
};

const drillFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(DRILL_CATEGORIES),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  duration: z.number().int().positive().optional(),
  equipment: z.string().optional(),
  tips: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

type DrillFormData = z.infer<typeof drillFormSchema>;

function DrillForm({ 
  drill, 
  onSuccess, 
  onCancel 
}: { 
  drill?: Drill; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!drill;

  const form = useForm<DrillFormData>({
    resolver: zodResolver(drillFormSchema),
    defaultValues: {
      title: drill?.title || "",
      description: drill?.description || "",
      category: drill?.category || "ball-handling",
      difficulty: drill?.difficulty || "beginner",
      videoUrl: drill?.videoUrl || "",
      thumbnailUrl: drill?.thumbnailUrl || "",
      duration: drill?.duration || undefined,
      equipment: drill?.equipment?.join(", ") || "",
      tips: drill?.tips?.join("\n") || "",
      isFeatured: drill?.isFeatured || false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DrillFormData) => {
      const payload = {
        ...data,
        videoUrl: data.videoUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        equipment: data.equipment ? data.equipment.split(",").map(s => s.trim()).filter(Boolean) : [],
        tips: data.tips ? data.tips.split("\n").map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest("POST", "/api/drills", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      toast({ title: "Drill created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create drill", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DrillFormData) => {
      const payload = {
        ...data,
        videoUrl: data.videoUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        equipment: data.equipment ? data.equipment.split(",").map(s => s.trim()).filter(Boolean) : [],
        tips: data.tips ? data.tips.split("\n").map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest("PUT", `/api/drills/${drill!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      toast({ title: "Drill updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update drill", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: DrillFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Drill title" {...field} data-testid="input-drill-title" />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Drill description" {...field} data-testid="input-drill-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-drill-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DRILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-drill-difficulty">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((level) => (
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

        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL</FormLabel>
              <FormControl>
                <Input placeholder="https://youtube.com/..." {...field} data-testid="input-drill-video-url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} data-testid="input-drill-thumbnail-url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (seconds)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="300" 
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  data-testid="input-drill-duration"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="equipment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment (comma-separated)</FormLabel>
              <FormControl>
                <Input placeholder="Basketball, Cones, Timer" {...field} data-testid="input-drill-equipment" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tips"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tips (one per line)</FormLabel>
              <FormControl>
                <Textarea placeholder="Keep your eyes up&#10;Stay low" rows={3} {...field} data-testid="input-drill-tips" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isFeatured"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                  data-testid="checkbox-drill-featured"
                />
              </FormControl>
              <FormLabel className="!mt-0">Featured Drill</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-drill">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-drill">
            {isPending ? "Saving..." : isEditing ? "Update Drill" : "Create Drill"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

const userFormSchema = z.object({
  email: z.string().email("Must be a valid email"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

type UserFormData = z.infer<typeof userFormSchema>;

function UserForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      isAdmin: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} data-testid="input-user-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} data-testid="input-user-firstname" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} data-testid="input-user-lastname" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isAdmin"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="w-4 h-4"
                  data-testid="checkbox-user-admin"
                />
              </FormControl>
              <FormLabel className="!mt-0">Grant admin access</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-user">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-user">
            {createMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Drill Metrics Configuration Component
function MetricsConfigDialog({ 
  drill, 
  open, 
  onOpenChange 
}: { 
  drill: Drill; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [newMetricName, setNewMetricName] = useState("");
  const [newMetricLabel, setNewMetricLabel] = useState("");
  const [newMetricType, setNewMetricType] = useState<"number" | "calculated">("number");
  const [newMetricUnit, setNewMetricUnit] = useState("");
  const [newMetricFormula, setNewMetricFormula] = useState("");
  const [editingMetric, setEditingMetric] = useState<DrillMetric | null>(null);

  const { data: metrics, isLoading } = useQuery<DrillMetric[]>({
    queryKey: ['/api/drills', drill.id, 'metrics'],
    queryFn: async () => {
      const res = await fetch(`/api/drills/${drill.id}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; label: string; type: string; unit?: string; formula?: string }) => {
      return await apiRequest("POST", `/api/drills/${drill.id}/metrics`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills', drill.id, 'metrics'] });
      toast({ title: "Metric added successfully" });
      setNewMetricName("");
      setNewMetricLabel("");
      setNewMetricUnit("");
      setNewMetricFormula("");
      setNewMetricType("number");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add metric", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DrillMetric> }) => {
      return await apiRequest("PUT", `/api/drill-metrics/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills', drill.id, 'metrics'] });
      toast({ title: "Metric updated successfully" });
      setEditingMetric(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update metric", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/drill-metrics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills', drill.id, 'metrics'] });
      toast({ title: "Metric deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete metric", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleAddMetric = () => {
    if (!newMetricName || !newMetricLabel) return;
    createMutation.mutate({
      name: newMetricName.toLowerCase().replace(/\s+/g, '_'),
      label: newMetricLabel,
      type: newMetricType,
      unit: newMetricUnit || undefined,
      formula: newMetricType === "calculated" ? newMetricFormula : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configure Metrics: {drill.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Metrics */}
          <div>
            <h3 className="font-medium mb-3">Current Metrics</h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !metrics?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                No metrics configured. Add metrics below to track specific measurements for this drill.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      {metric.type === "calculated" ? (
                        <Calculator className="w-4 h-4 text-primary" />
                      ) : (
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{metric.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {metric.type === "calculated" ? (
                            <span>Formula: {metric.formula}</span>
                          ) : (
                            <span>Type: {metric.type}{metric.unit && ` • Unit: ${metric.unit}`}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-delete-metric-${metric.id}`}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Metric</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{metric.label}"? This will also remove all recorded values for this metric.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(metric.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Metric */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Add New Metric</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Label</label>
                  <Input
                    placeholder="e.g., Shot Attempts"
                    value={newMetricLabel}
                    onChange={(e) => {
                      setNewMetricLabel(e.target.value);
                      setNewMetricName(e.target.value);
                    }}
                    data-testid="input-metric-label"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newMetricType} onValueChange={(v: "number" | "calculated") => setNewMetricType(v)}>
                    <SelectTrigger data-testid="select-metric-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number (user enters value)</SelectItem>
                      <SelectItem value="calculated">Calculated (auto-computed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newMetricType === "number" && (
                <div>
                  <label className="text-sm font-medium">Unit (optional)</label>
                  <Input
                    placeholder="e.g., shots, seconds, %"
                    value={newMetricUnit}
                    onChange={(e) => setNewMetricUnit(e.target.value)}
                    data-testid="input-metric-unit"
                  />
                </div>
              )}

              {newMetricType === "calculated" && (
                <div>
                  <label className="text-sm font-medium">Formula</label>
                  <Input
                    placeholder="e.g., shots_made / shot_attempts * 100"
                    value={newMetricFormula}
                    onChange={(e) => setNewMetricFormula(e.target.value)}
                    data-testid="input-metric-formula"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use metric names (lowercase with underscores) in your formula. Example: shots_made / shot_attempts * 100
                  </p>
                </div>
              )}

              <Button
                onClick={handleAddMetric}
                disabled={!newMetricLabel || createMutation.isPending}
                className="w-full"
                data-testid="button-add-metric"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createMutation.isPending ? "Adding..." : "Add Metric"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [configuringMetricsDrill, setConfiguringMetricsDrill] = useState<Drill | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("drills");

  const { data: drills, isLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return await apiRequest("PUT", `/api/admin/users/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User permissions updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/drills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      toast({ title: "Drill deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete drill", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      return await apiRequest("PUT", `/api/drills/${id}`, { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
    },
  });

  if (adminLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredDrills = drills?.filter(drill => {
    const matchesSearch = !searchQuery || 
      drill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drill.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || drill.category === filterCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const categoryCount = (category: string) => 
    drills?.filter(d => d.category === category).length || 0;

  const adminCount = users?.filter(u => u.isAdmin).length || 0;
  const regularCount = users?.filter(u => !u.isAdmin).length || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage drills, users, and permissions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="drills" className="gap-2" data-testid="tab-drills">
            <Video className="w-4 h-4" />
            Drills
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drills" className="space-y-6">
          <div className="flex items-center justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-drill">
                  <Plus className="w-4 h-4" />
                  Add Drill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Drill</DialogTitle>
                </DialogHeader>
                <DrillForm 
                  onSuccess={() => setIsCreateOpen(false)} 
                  onCancel={() => setIsCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {DRILL_CATEGORIES.map((cat) => (
              <Card 
                key={cat} 
                className={`cursor-pointer transition-all hover-elevate ${filterCategory === cat ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              >
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{categoryCount(cat)}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {cat.replace("-", " ")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Drill Library ({filteredDrills.length})
              </CardTitle>
              <Input 
                placeholder="Search drills..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-drills"
              />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredDrills.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No drills found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrills.map((drill) => (
                        <TableRow key={drill.id}>
                          <TableCell className="font-medium" data-testid={`text-drill-title-${drill.id}`}>
                            {drill.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {drill.category.replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {drill.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleFeaturedMutation.mutate({ 
                                id: drill.id, 
                                isFeatured: !drill.isFeatured 
                              })}
                              data-testid={`button-toggle-featured-${drill.id}`}
                            >
                              {drill.isFeatured ? (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              ) : (
                                <StarOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setConfiguringMetricsDrill(drill)}
                                data-testid={`button-configure-metrics-${drill.id}`}
                                title="Configure Metrics"
                              >
                                <Settings2 className="w-4 h-4" />
                              </Button>

                              <Dialog open={editingDrill?.id === drill.id} onOpenChange={(open) => !open && setEditingDrill(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    onClick={() => setEditingDrill(drill)}
                                    data-testid={`button-edit-drill-${drill.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Edit Drill</DialogTitle>
                                  </DialogHeader>
                                  {editingDrill && (
                                    <DrillForm 
                                      drill={editingDrill}
                                      onSuccess={() => setEditingDrill(null)} 
                                      onCancel={() => setEditingDrill(null)}
                                    />
                                  )}
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    data-testid={`button-delete-drill-${drill.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Drill</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{drill.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(drill.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid={`button-confirm-delete-${drill.id}`}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{adminCount}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{regularCount}</div>
                <div className="text-sm text-muted-foreground">Regular Users</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-user">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <UserForm 
                    onSuccess={() => setIsCreateUserOpen(false)} 
                    onCancel={() => setIsCreateUserOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !users?.length ? (
                <p className="text-center py-8 text-muted-foreground">No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Admin Access</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.firstName || "User"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || "No email"}
                          </TableCell>
                          <TableCell>
                            {user.isAdmin ? (
                              <Badge className="gap-1">
                                <Shield className="w-3 h-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm text-muted-foreground">
                                {user.isAdmin ? "Admin" : "User"}
                              </span>
                              <Switch
                                checked={user.isAdmin}
                                onCheckedChange={(checked) => 
                                  toggleAdminMutation.mutate({ userId: user.id, isAdmin: checked })
                                }
                                disabled={toggleAdminMutation.isPending}
                                data-testid={`switch-admin-${user.id}`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metrics Configuration Dialog */}
      {configuringMetricsDrill && (
        <MetricsConfigDialog
          drill={configuringMetricsDrill}
          open={!!configuringMetricsDrill}
          onOpenChange={(open) => !open && setConfiguringMetricsDrill(null)}
        />
      )}
    </div>
  );
}
