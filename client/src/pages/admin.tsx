import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest, getObjectUrl, nativeFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
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
  DialogFooter,
  DialogHeader,
  DialogDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Video, Star, StarOff, ShieldAlert, Users, Shield, Settings2, Calculator, Hash, Upload, Loader2, Film, Ruler, Check, FileText, Play, ChevronDown, ChevronLeft, GraduationCap, MapPin, ListFilter, Search, Info, X, BarChart2, TrendingUp, TrendingDown, Activity, UserCheck, Wrench, Flame, Lightbulb, Zap, Globe, AlertTriangle, Trophy, Target, GitBranch, Clock, LogIn, ArrowDown, Flag, ToggleLeft, ToggleRight, UserPlus, Copy, RotateCcw, ExternalLink, MessageCircle, Dumbbell, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import type { Drill, DrillCategory, DifficultyLevel, DrillMetric, VideoLibrary, PdfLibrary, MetricTemplate, Workout, WorkoutDrill, TrainingLocation, ShotLocationDB, ShotTypeDB } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, METRIC_TYPES, US_STATES } from "@shared/schema";
import { Layers, GripVertical, Calendar, CalendarRange, Fingerprint } from "lucide-react";
import { AdminEventsSection } from "@/components/admin-events-section";
import { AdminStatChallengesSection } from "@/components/admin-stat-challenges-section";
import { AdminArchetypesSection } from "@/components/admin-archetypes-section";
import { ProgramListSection } from "@/components/program-list-section";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpload } from "@/hooks/use-upload";
import { LiveWorldMap } from "@/components/admin/LiveWorldMap";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  staffRole?: string | null;
  subscriptionPlan?: string | null;
};

const drillFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(DRILL_CATEGORIES),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  videoLibraryId: z.string().optional(),
  pdfLibraryId: z.string().optional(),
  videoUrl: z.string().optional().refine((val) => !val || val.startsWith("/objects/") || val.startsWith("http"), "Must be a valid URL or uploaded file"),
  thumbnailUrl: z.string().optional().refine((val) => !val || val.startsWith("/objects/") || val.startsWith("http"), "Must be a valid URL or uploaded file"),
  pdfUrl: z.string().optional().refine((val) => !val || val.startsWith("/objects/") || val.startsWith("http"), "Must be a valid URL or uploaded file"),
  duration: z.number().int().positive().optional(),
  equipment: z.string().optional(),
  tips: z.string().optional(),
  isFeatured: z.boolean().default(false),
  trackShots: z.boolean().default(false),
});

type DrillFormData = z.infer<typeof drillFormSchema>;

type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };

type WorkoutWithDrills = {
  workout: Workout;
  drills: Array<WorkoutDrill & { drill: Drill }>;
};

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
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);
  const [presetRounds, setPresetRounds] = useState<Array<{ shotLocation?: string; metricValues: Record<string, number> }>>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch all metric templates
  const { data: metricTemplates } = useQuery<MetricTemplate[]>({
    queryKey: ['/api/metric-templates'],
  });

  // Fetch current drill metrics if editing
  const { data: drillMetrics } = useQuery<DrillMetricWithTemplate[]>({
    queryKey: ['/api/drills', drill?.id, 'metrics'],
    queryFn: async () => {
      const res = await nativeFetch(`/api/drills/${drill!.id}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    enabled: !!drill?.id,
  });

  // Fetch active shot locations for preset round builder
  const { data: shotLocationOptions } = useQuery<ShotLocationDB[]>({
    queryKey: ['/api/shot-locations'],
  });

  // Initialize selected metrics when drill metrics load
  useEffect(() => {
    if (drillMetrics && selectedMetricIds.length === 0) {
      setSelectedMetricIds(drillMetrics.map(m => m.metricTemplateId));
    }
  }, [drillMetrics]);

  // Initialize preset rounds when editing a drill
  useEffect(() => {
    const rounds = (drill as any)?.presetRounds as Array<{ shotLocation?: string; metricValues: Record<string, number> }> | undefined;
    if (rounds && rounds.length > 0 && presetRounds.length === 0) {
      setPresetRounds(rounds);
    }
  }, [drill]);

  const { uploadFile: uploadVideoFile, isUploading: isUploadingVideo, progress: videoUploadProgress } = useUpload({
    onSuccess: async (response) => {
      form.setValue("videoUrl", response.objectPath);
      if (drill?.id) {
        try {
          await apiRequest("PUT", `/api/drills/${drill.id}`, { videoUrl: response.objectPath });
          queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
          toast({ title: "Video uploaded and saved to drill" });
        } catch {
          toast({ title: "Video uploaded — click Save to apply", variant: "destructive" });
        }
      } else {
        toast({ title: "Video uploaded successfully" });
      }
    },
    onError: (error) => {
      toast({ title: "Failed to upload video", description: error.message, variant: "destructive" });
    },
  });

  const { uploadFile: uploadThumbnailFile, isUploading: isUploadingThumbnail } = useUpload({
    onSuccess: async (response) => {
      form.setValue("thumbnailUrl", response.objectPath);
      if (drill?.id) {
        try {
          await apiRequest("PUT", `/api/drills/${drill.id}`, { thumbnailUrl: response.objectPath });
          queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
          toast({ title: "Thumbnail uploaded and saved to drill" });
        } catch {
          toast({ title: "Thumbnail uploaded — click Save to apply", variant: "destructive" });
        }
      } else {
        toast({ title: "Thumbnail uploaded successfully" });
      }
    },
    onError: (error) => {
      toast({ title: "Failed to upload thumbnail", description: error.message, variant: "destructive" });
    },
  });

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({ title: "Please select a video file", variant: "destructive" });
        return;
      }
      await uploadVideoFile(file);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Please select an image file", variant: "destructive" });
        return;
      }
      await uploadThumbnailFile(file);
    }
  };

  // Fetch video library for video selector
  const { data: videoLibraryList } = useQuery<VideoLibrary[]>({
    queryKey: ['/api/video-library'],
  });

  // Fetch PDF library for PDF selector
  const { data: pdfLibraryList } = useQuery<PdfLibrary[]>({
    queryKey: ['/api/pdf-library'],
  });

  const form = useForm<DrillFormData>({
    resolver: zodResolver(drillFormSchema),
    defaultValues: {
      title: drill?.title || "",
      description: drill?.description || "",
      category: drill?.category || "ball-handling",
      difficulty: drill?.difficulty || "beginner",
      videoLibraryId: drill?.videoLibraryId || "",
      pdfLibraryId: drill?.pdfLibraryId || "",
      videoUrl: drill?.videoUrl || "",
      thumbnailUrl: drill?.thumbnailUrl || "",
      pdfUrl: drill?.pdfUrl || "",
      duration: drill?.duration || undefined,
      equipment: drill?.equipment?.join(", ") || "",
      tips: drill?.tips?.join("\n") || "",
      isFeatured: drill?.isFeatured || false,
      trackShots: drill?.trackShots || false,
    },
  });

  // Handle video library selection - auto-populate video details
  const handleVideoLibrarySelect = (videoId: string) => {
    form.setValue("videoLibraryId", videoId);
    if (videoId && videoLibraryList) {
      const selectedVideo = videoLibraryList.find(v => v.id === videoId);
      if (selectedVideo) {
        form.setValue("videoUrl", selectedVideo.videoUrl);
        if (selectedVideo.thumbnailUrl) {
          form.setValue("thumbnailUrl", selectedVideo.thumbnailUrl);
        }
        if (selectedVideo.duration) {
          form.setValue("duration", selectedVideo.duration);
        }
      }
    }
  };

  // Handle PDF library selection - auto-populate PDF URL
  const handlePdfLibrarySelect = (pdfId: string) => {
    form.setValue("pdfLibraryId", pdfId);
    if (pdfId && pdfLibraryList) {
      const selectedPdf = pdfLibraryList.find(p => p.id === pdfId);
      if (selectedPdf) {
        form.setValue("pdfUrl", selectedPdf.pdfUrl);
      }
    } else {
      form.setValue("pdfUrl", "");
    }
  };

  const drillTrackShots = form.watch("trackShots");

  const handleToggleMetric = (templateId: string) => {
    setSelectedMetricIds(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const addPresetRound = () => {
    const metricValues: Record<string, number> = {};
    selectedMetricIds.forEach(id => { metricValues[id] = 0; });
    setPresetRounds(prev => [...prev, { metricValues }]);
  };
  const removePresetRound = (idx: number) => setPresetRounds(prev => prev.filter((_, i) => i !== idx));
  const updatePresetRoundLoc = (idx: number, slug: string) =>
    setPresetRounds(prev => prev.map((r, i) => i === idx ? { ...r, shotLocation: (slug && slug !== '__any__') ? slug : undefined } : r));
  const updatePresetRoundMetric = (idx: number, templateId: string, val: number) =>
    setPresetRounds(prev => prev.map((r, i) => i === idx ? { ...r, metricValues: { ...r.metricValues, [templateId]: val } } : r));

  const createMutation = useMutation({
    mutationFn: async (data: DrillFormData) => {
      const payload = {
        ...data,
        videoUrl: data.videoUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        pdfUrl: data.pdfUrl || null,
        equipment: data.equipment ? data.equipment.split(",").map(s => s.trim()).filter(Boolean) : [],
        tips: data.tips ? data.tips.split("\n").map(s => s.trim()).filter(Boolean) : [],
        ...(presetRounds.length > 0 ? { presetRounds } : {}),
      };
      const response = await apiRequest("POST", "/api/drills", payload);
      const newDrill = await response.json();
      // Save metrics for the new drill
      if (selectedMetricIds.length > 0) {
        await apiRequest("POST", `/api/drills/${newDrill.id}/metrics`, { metricTemplateIds: selectedMetricIds });
      }
      return newDrill;
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
        pdfUrl: data.pdfUrl || null,
        equipment: data.equipment ? data.equipment.split(",").map(s => s.trim()).filter(Boolean) : [],
        tips: data.tips ? data.tips.split("\n").map(s => s.trim()).filter(Boolean) : [],
        presetRounds: presetRounds.length > 0 ? presetRounds : null,
      };
      await apiRequest("PUT", `/api/drills/${drill!.id}`, payload);
      // Update metrics for the drill
      await apiRequest("POST", `/api/drills/${drill!.id}/metrics`, { metricTemplateIds: selectedMetricIds });
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drills', drill?.id, 'metrics'] });
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
    // Convert null values to empty strings for optional URL fields
    const cleanedData = {
      ...data,
      videoUrl: data.videoUrl || "",
      thumbnailUrl: data.thumbnailUrl || "",
      pdfUrl: data.pdfUrl || "",
      videoLibraryId: data.videoLibraryId || "",
      pdfLibraryId: data.pdfLibraryId || "",
    };
    if (isEditing) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
                <Select onValueChange={field.onChange} value={field.value}>
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
          name="videoLibraryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Video from Library</FormLabel>
              <Select 
                onValueChange={(value) => handleVideoLibrarySelect(value === "none" ? "" : value)} 
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-drill-video-library">
                    <SelectValue placeholder="Choose a video from the library" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None (manual entry)</SelectItem>
                  {videoLibraryList?.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title} {video.category && `(${video.category.replace("-", " ")})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select a video from your library or enter a URL manually below
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="https://youtube.com/... or upload a file" {...field} data-testid="input-drill-video-url" />
                </FormControl>
                <div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    disabled={isUploadingVideo}
                    data-testid="input-drill-video-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingVideo}
                    onClick={() => videoInputRef.current?.click()}
                    data-testid="button-drill-video-upload"
                  >
                    {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Video upload progress bar */}
        {isUploadingVideo && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading video…</span>
              <span>{videoUploadProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${videoUploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Video preview after upload */}
        {(() => {
          const watchedUrl = form.watch("videoUrl");
          if (!watchedUrl || !watchedUrl.startsWith("/objects/")) return null;
          return (
            <div className="rounded-xl overflow-hidden border border-border">
              <video
                src={getObjectUrl(watchedUrl)}
                controls
                playsInline
                className="w-full max-h-48 bg-black"
                data-testid="video-preview-admin"
              />
            </div>
          );
        })()}

        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="https://... or upload a file" {...field} data-testid="input-drill-thumbnail-url" />
                </FormControl>
                <div>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    disabled={isUploadingThumbnail}
                    data-testid="input-drill-thumbnail-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingThumbnail}
                    onClick={() => thumbnailInputRef.current?.click()}
                    data-testid="button-drill-thumbnail-upload"
                  >
                    {isUploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PDF Library Selector */}
        <FormField
          control={form.control}
          name="pdfLibraryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select PDF from Library</FormLabel>
              <Select 
                onValueChange={(value) => handlePdfLibrarySelect(value === "none" ? "" : value)} 
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-drill-pdf-library">
                    <SelectValue placeholder="Choose a PDF from the library" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {pdfLibraryList?.map((pdf) => (
                    <SelectItem key={pdf.id} value={pdf.id}>
                      {pdf.title} {pdf.category && `(${pdf.category.replace(/-/g, " ")})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Optionally attach a PDF document to this drill
              </FormDescription>
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

        <div className="flex flex-wrap gap-6">
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

          <FormField
            control={form.control}
            name="trackShots"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4"
                    data-testid="checkbox-drill-track-shots"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Track Shot Locations</FormLabel>
                <span className="text-xs text-muted-foreground">(shows shot chart in logging)</span>
              </FormItem>
            )}
          />
        </div>

        {/* Metrics Configuration Section - Dropdown Multi-Select */}
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Tracking Metrics
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
                data-testid="dropdown-metrics"
              >
                {selectedMetricIds.length === 0 ? (
                  <span className="text-muted-foreground">Select metrics to track...</span>
                ) : (
                  <span>{selectedMetricIds.length} metric{selectedMetricIds.length !== 1 ? 's' : ''} selected</span>
                )}
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              {!metricTemplates?.length ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No metric templates available. Create them in the Metrics tab.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto p-1">
                  {metricTemplates.map((template) => {
                    const isSelected = selectedMetricIds.includes(template.id);
                    return (
                      <div 
                        key={template.id} 
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover-elevate ${isSelected ? 'bg-primary/10' : ''}`}
                        onClick={() => handleToggleMetric(template.id)}
                        data-testid={`checkbox-metric-${template.id}`}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {template.type === "calculated" ? (
                              <Calculator className="w-3 h-3 text-primary flex-shrink-0" />
                            ) : (
                              <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">{template.label}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {template.type}{template.unit && ` (${template.unit})`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <FormDescription>
            Select which metrics users will track when logging this drill
          </FormDescription>
        </FormItem>

        {/* Preset Rounds Builder */}
        <FormItem>
          <div className="flex items-center justify-between mb-2">
            <div>
              <FormLabel className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Preset Rounds <span className="font-normal text-muted-foreground text-xs ml-1">(optional)</span>
              </FormLabel>
              <FormDescription>Pre-configure rounds that auto-load when this drill is started by a player.</FormDescription>
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
                    {drillTrackShots && <th className="p-2 text-left text-xs font-medium text-muted-foreground">Location</th>}
                    {selectedMetricIds.map(id => {
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
                      {drillTrackShots && (
                        <td className="p-1">
                          <Select value={round.shotLocation || '__any__'} onValueChange={v => updatePresetRoundLoc(roundIdx, v)}>
                            <SelectTrigger className="w-36 h-8 text-xs" data-testid={`select-preset-round-loc-${roundIdx}`}>
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
                      {selectedMetricIds.map(templateId => (
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
        </FormItem>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

// Video Library Form Component
const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  videoUrl: z.string().min(1, "Video URL is required"),
  thumbnailUrl: z.string().optional(),
  duration: z.number().int().positive().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  tags: z.string().optional(),
  linkedDrillId: z.string().optional(),
});

type VideoFormData = z.infer<typeof videoFormSchema>;

function VideoLibraryForm({ 
  video, 
  onSuccess, 
  onCancel 
}: { 
  video?: VideoLibrary; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!video;
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Fetch drills to allow linking
  const { data: drillsList } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  // Find the drill currently linked to this video
  const currentLinkedDrill = video?.id 
    ? drillsList?.find(d => d.videoLibraryId === video.id) 
    : undefined;
  
  const { uploadFile: uploadVideoFile, isUploading: isUploadingVideo, progress: videoUploadProgress } = useUpload({
    onSuccess: (response) => {
      form.setValue("videoUrl", response.objectPath);
      toast({ title: "Video uploaded successfully — click Save to apply" });
    },
    onError: (error) => {
      toast({ title: "Failed to upload video", description: error.message, variant: "destructive" });
    },
  });

  const { uploadFile: uploadThumbnailFile, isUploading: isUploadingThumbnail } = useUpload({
    onSuccess: (response) => {
      form.setValue("thumbnailUrl", response.objectPath);
      toast({ title: "Thumbnail uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to upload thumbnail", description: error.message, variant: "destructive" });
    },
  });

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({ title: "Please select a video file", variant: "destructive" });
        return;
      }
      await uploadVideoFile(file);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Please select an image file", variant: "destructive" });
        return;
      }
      await uploadThumbnailFile(file);
    }
  };

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: video?.title || "",
      description: video?.description || "",
      videoUrl: video?.videoUrl || "",
      thumbnailUrl: video?.thumbnailUrl || "",
      duration: video?.duration || undefined,
      category: video?.category || "",
      difficulty: video?.difficulty || "",
      tags: video?.tags?.join(", ") || "",
      linkedDrillId: currentLinkedDrill?.id || "",
    },
  });

  // Update default value when currentLinkedDrill is loaded
  useEffect(() => {
    if (currentLinkedDrill?.id) {
      form.setValue("linkedDrillId", currentLinkedDrill.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLinkedDrill?.id]);

  // Mutation to link a drill to this video
  const linkDrillMutation = useMutation({
    mutationFn: async ({ drillId, videoId, videoUrl, thumbnailUrl, duration }: { 
      drillId: string; 
      videoId: string;
      videoUrl: string;
      thumbnailUrl?: string | null;
      duration?: number | null;
    }) => {
      // Update the drill to point to this video and copy its URLs
      return await apiRequest("PUT", `/api/drills/${drillId}`, { 
        videoLibraryId: videoId,
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
    },
  });

  // Mutation to unlink a drill from this video
  const unlinkDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      return await apiRequest("PUT", `/api/drills/${drillId}`, { 
        videoLibraryId: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest("POST", "/api/video-library", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-library'] });
      toast({ title: "Video added successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add video", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest("PUT", `/api/video-library/${video!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-library'] });
      toast({ title: "Video updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update video", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: VideoFormData) => {
    const { linkedDrillId, ...videoData } = data;
    
    if (isEditing) {
      updateMutation.mutate(videoData, {
        onSuccess: async () => {
          // Handle drill linking changes
          const previousDrillId = currentLinkedDrill?.id;
          
          // If drill was changed, unlink the previous drill
          if (previousDrillId && previousDrillId !== linkedDrillId) {
            await unlinkDrillMutation.mutateAsync(previousDrillId);
          }
          
          // Link the new drill if selected
          if (linkedDrillId && linkedDrillId !== "none" && linkedDrillId !== previousDrillId && video?.id) {
            await linkDrillMutation.mutateAsync({ 
              drillId: linkedDrillId, 
              videoId: video.id,
              videoUrl: data.videoUrl,
              thumbnailUrl: data.thumbnailUrl,
              duration: data.duration,
            });
          }
        }
      });
    } else {
      createMutation.mutate(videoData);
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
                <Input placeholder="Video title" {...field} data-testid="input-video-title" />
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
                <Textarea placeholder="Video description" {...field} data-testid="input-video-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Upload a video file" {...field} readOnly data-testid="input-video-url" />
                </FormControl>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,application/pdf,image/*,.pdf"
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={isUploadingVideo}
                  data-testid="input-video-file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isUploadingVideo}
                  onClick={() => videoInputRef.current?.click()}
                  data-testid="button-video-upload"
                >
                  {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Video upload progress bar */}
        {isUploadingVideo && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading video…</span>
              <span>{videoUploadProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${videoUploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Video preview after upload */}
        {(() => {
          const watchedUrl = form.watch("videoUrl");
          if (!watchedUrl || !watchedUrl.startsWith("/objects/")) return null;
          return (
            <div className="rounded-xl overflow-hidden border border-border">
              <video
                src={getObjectUrl(watchedUrl)}
                controls
                playsInline
                className="w-full max-h-48 bg-black"
                data-testid="video-preview-library"
              />
            </div>
          );
        })()}

        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Upload a thumbnail" {...field} readOnly data-testid="input-video-thumbnail" />
                </FormControl>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                  disabled={isUploadingThumbnail}
                  data-testid="input-thumbnail-file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isUploadingThumbnail}
                  onClick={() => thumbnailInputRef.current?.click()}
                  data-testid="button-thumbnail-upload"
                >
                  {isUploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (seconds)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="120" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    value={field.value || ""}
                    data-testid="input-video-duration"
                  />
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
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-video-category">
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
                <FormLabel>Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-video-difficulty">
                      <SelectValue placeholder="Select level" />
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
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (comma separated)</FormLabel>
              <FormControl>
                <Input placeholder="dribbling, beginner, handles" {...field} data-testid="input-video-tags" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <FormField
            control={form.control}
            name="linkedDrillId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link to Drill</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-video-linked-drill">
                      <SelectValue placeholder="Select a drill to link" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {drillsList?.map((drill) => (
                      <SelectItem key={drill.id} value={drill.id}>
                        {drill.title} ({drill.category.replace("-", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Connect this video to an existing drill
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-video">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-video">
            {isPending ? "Saving..." : isEditing ? "Update Video" : "Add Video"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// PDF Library Form Component
const pdfFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  pdfUrl: z.string().min(1, "PDF URL is required"),
  thumbnailUrl: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  tags: z.string().optional(),
  linkedDrillId: z.string().optional(),
});

type PdfFormData = z.infer<typeof pdfFormSchema>;

function PdfLibraryForm({ 
  pdf, 
  onSuccess, 
  onCancel 
}: { 
  pdf?: PdfLibrary; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!pdf;
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const { data: drillsList } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const currentLinkedDrill = pdf?.drillId 
    ? drillsList?.find(d => d.id === pdf.drillId) 
    : undefined;
  
  const { uploadFile: uploadPdfFile, isUploading: isUploadingPdf } = useUpload({
    onSuccess: (response) => {
      form.setValue("pdfUrl", response.objectPath);
      toast({ title: "PDF uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to upload PDF", description: error.message, variant: "destructive" });
    },
  });

  const { uploadFile: uploadThumbnailFile, isUploading: isUploadingThumbnail } = useUpload({
    onSuccess: (response) => {
      form.setValue("thumbnailUrl", response.objectPath);
      toast({ title: "Thumbnail uploaded successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to upload thumbnail", description: error.message, variant: "destructive" });
    },
  });

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept PDFs and images (training documents may be saved as images)
      const isPdf = file.type === "application/pdf" || 
                    file.name.toLowerCase().endsWith(".pdf");
      const isImage = file.type.startsWith("image/");
      if (!isPdf && !isImage) {
        toast({ title: "Please select a PDF or image file", variant: "destructive" });
        return;
      }
      await uploadPdfFile(file);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Please select an image file", variant: "destructive" });
        return;
      }
      await uploadThumbnailFile(file);
    }
  };

  const form = useForm<PdfFormData>({
    resolver: zodResolver(pdfFormSchema),
    defaultValues: {
      title: pdf?.title || "",
      description: pdf?.description || "",
      pdfUrl: pdf?.pdfUrl || "",
      thumbnailUrl: pdf?.thumbnailUrl || "",
      category: pdf?.category || "",
      difficulty: pdf?.difficulty || "",
      tags: pdf?.tags?.join(", ") || "",
      linkedDrillId: pdf?.drillId || "",
    },
  });

  const linkDrillMutation = useMutation({
    mutationFn: async ({ drillId, pdfId, pdfUrl }: { drillId: string; pdfId: string; pdfUrl: string }) => {
      return await apiRequest("PUT", `/api/drills/${drillId}`, { 
        pdfLibraryId: pdfId,
        pdfUrl: pdfUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
    },
  });

  const unlinkDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      return await apiRequest("PUT", `/api/drills/${drillId}`, { 
        pdfLibraryId: null,
        pdfUrl: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PdfFormData) => {
      const { linkedDrillId, ...pdfData } = data;
      const payload = {
        ...pdfData,
        tags: data.tags ? data.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        drillId: linkedDrillId && linkedDrillId !== "none" ? linkedDrillId : null,
      };
      return await apiRequest("POST", "/api/pdf-library", payload);
    },
    onSuccess: (newPdf: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pdf-library'] });
      const linkedDrillId = form.getValues("linkedDrillId");
      if (linkedDrillId && linkedDrillId !== "none" && newPdf?.id) {
        linkDrillMutation.mutate({ 
          drillId: linkedDrillId, 
          pdfId: newPdf.id,
          pdfUrl: form.getValues("pdfUrl"),
        });
      }
      toast({ title: "PDF added successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add PDF", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PdfFormData) => {
      const { linkedDrillId, ...pdfData } = data;
      const payload = {
        ...pdfData,
        tags: data.tags ? data.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        drillId: linkedDrillId && linkedDrillId !== "none" ? linkedDrillId : null,
      };
      return await apiRequest("PUT", `/api/pdf-library/${pdf!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pdf-library'] });
      toast({ title: "PDF updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update PDF", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: PdfFormData) => {
    const { linkedDrillId, ...pdfData } = data;
    
    if (isEditing) {
      updateMutation.mutate(data, {
        onSuccess: async () => {
          const previousDrillId = currentLinkedDrill?.id;
          
          if (previousDrillId && previousDrillId !== linkedDrillId) {
            await unlinkDrillMutation.mutateAsync(previousDrillId);
          }
          
          if (linkedDrillId && linkedDrillId !== "none" && linkedDrillId !== previousDrillId && pdf?.id) {
            await linkDrillMutation.mutateAsync({ 
              drillId: linkedDrillId, 
              pdfId: pdf.id,
              pdfUrl: data.pdfUrl,
            });
          }
        }
      });
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
                <Input placeholder="PDF title" {...field} data-testid="input-pdf-title" />
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
                <Textarea placeholder="PDF description" {...field} data-testid="input-pdf-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pdfUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document File</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Upload a PDF or image file" {...field} readOnly data-testid="input-pdf-url" />
                </FormControl>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="*/*"
                  onChange={handlePdfUpload}
                  className="hidden"
                  disabled={isUploadingPdf}
                  data-testid="input-pdf-file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isUploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                  data-testid="button-pdf-upload"
                >
                  {isUploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail (Optional)</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Upload a thumbnail" {...field} readOnly data-testid="input-pdf-thumbnail" />
                </FormControl>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                  disabled={isUploadingThumbnail}
                  data-testid="input-pdf-thumbnail-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isUploadingThumbnail}
                  onClick={() => thumbnailInputRef.current?.click()}
                  data-testid="button-pdf-thumbnail-upload"
                >
                  {isUploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                  <FormControl>
                    <SelectTrigger data-testid="select-pdf-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {DRILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
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
                <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                  <FormControl>
                    <SelectTrigger data-testid="select-pdf-difficulty">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No difficulty</SelectItem>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</SelectItem>
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
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="tag1, tag2, tag3" {...field} data-testid="input-pdf-tags" />
              </FormControl>
              <FormDescription>Comma-separated tags</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkedDrillId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Drill (Optional)</FormLabel>
              <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                <FormControl>
                  <SelectTrigger data-testid="select-pdf-drill-link">
                    <SelectValue placeholder="Select a drill to link" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No drill linked</SelectItem>
                  {drillsList?.map((drill) => (
                    <SelectItem key={drill.id} value={drill.id}>{drill.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Optionally link this PDF to a specific drill</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-pdf">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-pdf">
            {isPending ? "Saving..." : isEditing ? "Update PDF" : "Add PDF"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Metric Template Form Component
const metricFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(["number", "percentage", "time", "calculated"]),
  unit: z.string().optional(),
  formula: z.string().optional(),
  formulaInputs: z.string().optional(),
  category: z.string().min(1, "Category is required"),
});

type MetricFormData = z.infer<typeof metricFormSchema>;

function MetricTemplateForm({ 
  template, 
  onSuccess, 
  onCancel 
}: { 
  template?: MetricTemplate; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!template;
  
  const form = useForm<MetricFormData>({
    resolver: zodResolver(metricFormSchema),
    defaultValues: {
      name: template?.name || "",
      label: template?.label || "",
      type: (template?.type as "number" | "percentage" | "time" | "calculated") || "number",
      unit: template?.unit || "",
      formula: template?.formula || "",
      formulaInputs: template?.formulaInputs?.join(", ") || "",
      category: template?.category || "",
    },
  });

  const watchType = form.watch("type");

  const createMutation = useMutation({
    mutationFn: async (data: MetricFormData) => {
      const payload = {
        ...data,
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
        formulaInputs: data.formulaInputs ? data.formulaInputs.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest("POST", "/api/metric-templates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metric-templates'] });
      toast({ title: "Metric template created" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create metric", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MetricFormData) => {
      const payload = {
        ...data,
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
        formulaInputs: data.formulaInputs ? data.formulaInputs.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      return await apiRequest("PUT", `/api/metric-templates/${template!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metric-templates'] });
      toast({ title: "Metric template updated" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update metric", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: MetricFormData) => {
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
        {/* Category - First/Top field, Required */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-metric-category">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Shot Attempts" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      if (!isEditing) {
                        form.setValue("name", e.target.value);
                      }
                    }}
                    data-testid="input-metric-label" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-metric-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="calculated">Calculated</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {watchType !== "calculated" && (
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., shots, seconds, %" {...field} data-testid="input-metric-unit" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchType === "calculated" && (
          <>
            <FormField
              control={form.control}
              name="formula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formula</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., shots_made / shot_attempts * 100" {...field} data-testid="input-metric-formula" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Use metric names (lowercase with underscores) in your formula
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="formulaInputs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formula Inputs (comma separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="shots_made, shot_attempts" {...field} data-testid="input-metric-formula-inputs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-metric">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-metric">
            {isPending ? "Saving..." : isEditing ? "Update Metric" : "Create Metric"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

const TUTORIAL_KEYS = [
  { key: "log-training", label: "Log Training", description: "Tutorial for logging training sessions (shown during onboarding)" },
  { key: "create-drill", label: "Create a Drill", description: "Tutorial for creating custom drills (shown during onboarding)" },
] as const;

function TutorialVideosManager() {
  const { toast } = useToast();
  const { data: tutorials, isLoading } = useQuery<Array<{ id: string; key: string; title: string; description: string | null; videoUrl: string; thumbnailUrl: string | null }>>({
    queryKey: ["/api/tutorial-videos"],
  });

  const { uploadFile, isUploading } = useUpload({
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ key, title, description, videoUrl }: { key: string; title: string; description: string; videoUrl: string }) => {
      const res = await apiRequest("PUT", `/api/tutorial-videos/${key}`, { title, description, videoUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-videos"] });
      toast({ title: "Tutorial video saved" });
    },
    onError: () => toast({ title: "Failed to save tutorial video", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiRequest("DELETE", `/api/tutorial-videos/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-videos"] });
      toast({ title: "Tutorial video removed" });
    },
    onError: () => toast({ title: "Failed to remove tutorial video", variant: "destructive" }),
  });

  const handleUpload = async (key: string, label: string, description: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingKey(key);
      const result = await uploadFile(file);
      if (result) {
        await saveMutation.mutateAsync({
          key,
          title: label,
          description,
          videoUrl: result.objectPath,
        });
      }
      setUploadingKey(null);
    };
    input.click();
  };

  const getTutorial = (key: string) => tutorials?.find(t => t.key === key);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Tutorial Videos</h2>
        <p className="text-sm text-muted-foreground">Upload tutorial videos shown to new users during onboarding</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {TUTORIAL_KEYS.map(({ key, label, description }) => {
            const tutorial = getTutorial(key);
            const isThisUploading = uploadingKey === key && isUploading;
            return (
              <Card key={key} className="overflow-hidden">
                {tutorial ? (
                  <div className="aspect-video bg-black relative group">
                    <video
                      src={getObjectUrl(tutorial.videoUrl)}
                      className="w-full h-full object-contain"
                      controls
                      data-testid={`tutorial-video-${key}`}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No video uploaded</p>
                    </div>
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold" data-testid={`tutorial-title-${key}`}>{label}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={tutorial ? "outline" : "default"}
                      onClick={() => handleUpload(key, label, description)}
                      disabled={isThisUploading}
                      data-testid={`button-upload-tutorial-${key}`}
                    >
                      {isThisUploading ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading...</>
                      ) : tutorial ? (
                        <><Upload className="w-4 h-4 mr-1" /> Replace Video</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-1" /> Upload Video</>
                      )}
                    </Button>
                    {tutorial && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(key)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-tutorial-${key}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const locationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

function LocationForm({
  location,
  onSubmit,
  onCancel,
  isPending,
}: {
  location?: TrainingLocation;
  onSubmit: (data: LocationFormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name || "",
      address: location?.address || "",
      description: location?.description || "",
      city: location?.city || "",
      state: location?.state || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Location name" {...field} data-testid="input-location-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Street address" {...field} data-testid="input-location-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} data-testid="input-location-city" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-location-state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Description of the location" {...field} data-testid="input-location-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-location">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-location">
            {isPending ? "Saving..." : location ? "Update Location" : "Add Location"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateVideoOpen, setIsCreateVideoOpen] = useState(false);
  const [isCreatePdfOpen, setIsCreatePdfOpen] = useState(false);
  const [isCreateMetricOpen, setIsCreateMetricOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoLibrary | null>(null);
  const [editingPdf, setEditingPdf] = useState<PdfLibrary | null>(null);
  const [editingMetric, setEditingMetric] = useState<MetricTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [drillSourceFilter, setDrillSourceFilter] = useState<"playr1" | "community" | "all">("playr1");
  const [activeTab, setActiveTab] = useState("training");
  const [trainingTab, setTrainingTab] = useState<"drills" | "workouts" | "programs" | "archetypes">("drills");
  const [configurationTab, setConfigurationTab] = useState<"metrics" | "picklists">("metrics");
  const [repairingVideos, setRepairingVideos] = useState(false);
  const [repairResults, setRepairResults] = useState<{ fixed: number; skipped: number } | null>(null);
  
  // Workout state
  const [isCreateWorkoutOpen, setIsCreateWorkoutOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [isCreateLocationOpen, setIsCreateLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<TrainingLocation | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const [workoutCategory, setWorkoutCategory] = useState("");
  const [workoutDrillIds, setWorkoutDrillIds] = useState<string[]>([]);

  const { data: drills, isLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin,
  });

  const { data: videoLibrary, isLoading: videosLoading } = useQuery<VideoLibrary[]>({
    queryKey: ['/api/video-library'],
    enabled: isAdmin,
  });

  const { data: pdfLibrary, isLoading: pdfsLoading } = useQuery<PdfLibrary[]>({
    queryKey: ['/api/pdf-library'],
    enabled: isAdmin,
  });

  const { data: metricTemplates, isLoading: metricsLoading } = useQuery<MetricTemplate[]>({
    queryKey: ['/api/metric-templates'],
    enabled: isAdmin,
  });

  // Fetch Handlz workouts (admin-created workouts with userId = null)
  const { data: handlzWorkouts, isLoading: workoutsLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts/handlz'],
    enabled: isAdmin,
  });

  const { data: trainingLocationsList, isLoading: locationsLoading } = useQuery<TrainingLocation[]>({
    queryKey: ['/api/training-locations'],
    enabled: isAdmin,
  });

  const { data: shotLocationsList, isLoading: shotLocationsLoading } = useQuery<ShotLocationDB[]>({
    queryKey: ['/api/shot-locations'],
    enabled: isAdmin,
  });

  const { data: shotTypesList, isLoading: shotTypesLoading } = useQuery<ShotTypeDB[]>({
    queryKey: ['/api/shot-types'],
    enabled: isAdmin,
  });

  const [editingShotLocation, setEditingShotLocation] = useState<ShotLocationDB | null>(null);
  const [shotLocationForm, setShotLocationForm] = useState({ slug: "", label: "", classification: "2-pointer", sortOrder: 0, active: true });
  const [shotLocationDialogOpen, setShotLocationDialogOpen] = useState(false);

  const [editingShotType, setEditingShotType] = useState<ShotTypeDB | null>(null);
  const [shotTypeForm, setShotTypeForm] = useState({ name: "", label: "", sortOrder: 0, active: true });
  const [shotTypeDialogOpen, setShotTypeDialogOpen] = useState(false);

  const createShotLocationMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/shot-locations", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shot-locations"] }); setShotLocationDialogOpen(false); setShotLocationForm({ slug: "", label: "", classification: "2-pointer", sortOrder: 0, active: true }); toast({ title: "Shot location created" }); },
    onError: () => toast({ title: "Failed to create shot location", variant: "destructive" }),
  });

  const updateShotLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PUT", `/api/shot-locations/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shot-locations"] }); setShotLocationDialogOpen(false); setEditingShotLocation(null); toast({ title: "Shot location updated" }); },
    onError: () => toast({ title: "Failed to update shot location", variant: "destructive" }),
  });

  const deleteShotLocationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shot-locations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shot-locations"] }); toast({ title: "Shot location deleted" }); },
    onError: () => toast({ title: "Failed to delete shot location", variant: "destructive" }),
  });

  const createShotTypeMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/shot-types", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shot-types"] }); setShotTypeDialogOpen(false); setShotTypeForm({ name: "", label: "", sortOrder: 0, active: true }); toast({ title: "Shot type created" }); },
    onError: () => toast({ title: "Failed to create shot type", variant: "destructive" }),
  });

  const updateShotTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PUT", `/api/shot-types/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shot-types"] }); setShotTypeDialogOpen(false); setEditingShotType(null); toast({ title: "Shot type updated" }); },
    onError: () => toast({ title: "Failed to update shot type", variant: "destructive" }),
  });

  const deleteShotTypeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shot-types/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shot-types"] }); toast({ title: "Shot type deleted" }); },
    onError: () => toast({ title: "Failed to delete shot type", variant: "destructive" }),
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; description?: string; city?: string; state?: string }) => {
      return await apiRequest("POST", "/api/training-locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-locations'] });
      toast({ title: "Location created successfully" });
      setIsCreateLocationOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create location", description: error.message, variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; address: string; description: string; city: string; state: string }> }) => {
      return await apiRequest("PUT", `/api/training-locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-locations'] });
      toast({ title: "Location updated successfully" });
      setEditingLocation(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update location", description: error.message, variant: "destructive" });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/training-locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-locations'] });
      toast({ title: "Location deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete location", description: error.message, variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/video-library/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-library'] });
      toast({ title: "Video deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete video", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/pdf-library/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pdf-library'] });
      toast({ title: "PDF deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete PDF", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/metric-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metric-templates'] });
      toast({ title: "Metric template deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete metric", 
        description: error.message,
        variant: "destructive" 
      });
    },
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
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, staffRole }: { userId: string; staffRole: string | null }) => {
      return await apiRequest("PUT", `/api/admin/users/${userId}/role`, { staffRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User role updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const setSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, subscriptionPlan }: { userId: string; subscriptionPlan: string }) => {
      return await apiRequest("PUT", `/api/admin/users/${userId}/subscription`, { subscriptionPlan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Subscription plan updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update plan", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
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

  // Open workout dialog - reset all form state
  const openWorkoutDialog = async (workout?: Workout) => {
    if (workout) {
      setEditingWorkout(workout);
      setWorkoutName(workout.name);
      setWorkoutDescription(workout.description || "");
      setWorkoutCategory(workout.category || "");
      // Fetch drill IDs for this workout
      try {
        const res = await nativeFetch(`/api/workouts/${workout.id}`);
        const data = await res.json();
        setWorkoutDrillIds(data.drills?.map((wd: any) => wd.drillId) || []);
      } catch {
        setWorkoutDrillIds([]);
      }
    } else {
      setEditingWorkout(null);
      setWorkoutName("");
      setWorkoutDescription("");
      setWorkoutCategory("");
      setWorkoutDrillIds([]);
    }
    setIsCreateWorkoutOpen(true);
  };

  const closeWorkoutDialog = () => {
    setIsCreateWorkoutOpen(false);
    setEditingWorkout(null);
    setWorkoutName("");
    setWorkoutDescription("");
    setWorkoutCategory("");
    setWorkoutDrillIds([]);
  };

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
        name: workoutName,
        description: workoutDescription || undefined,
        category: workoutCategory || undefined,
        drillIds: workoutDrillIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/handlz'] });
      toast({ title: "Workout created successfully" });
      closeWorkoutDialog();
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
        name: workoutName,
        description: workoutDescription || undefined,
        category: workoutCategory || undefined,
        drillIds: workoutDrillIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/handlz'] });
      toast({ title: "Workout updated successfully" });
      closeWorkoutDialog();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update workout", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSaveWorkout = () => {
    if (!workoutName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingWorkout) {
      updateWorkoutMutation.mutate();
    } else {
      createWorkoutMutation.mutate();
    }
  };

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/workouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/handlz'] });
      toast({ title: "Workout deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete workout", 
        description: error.message,
        variant: "destructive" 
      });
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
    const matchesSource =
      drillSourceFilter === "all" ? true :
      drillSourceFilter === "playr1" ? drill.userId === null :
      /* community */ drill.userId !== null && (drill as any).isShared === true;
    return matchesSearch && matchesCategory && matchesSource;
  }) || [];

  const handleRepairAllVideos = async () => {
    const videoDrills = drills?.filter(d => d.videoUrl?.startsWith("/objects/")) || [];
    if (videoDrills.length === 0) {
      toast({ title: "No videos to repair" });
      return;
    }
    setRepairingVideos(true);
    setRepairResults(null);
    let fixed = 0, failed = 0;
    for (const drill of videoDrills) {
      try {
        const res = await nativeFetch("/api/admin/reprocess-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath: drill.videoUrl }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error(`[repair] ${drill.title} failed:`, err);
          failed++;
        } else {
          const data = await res.json();
          console.log(`[repair] ${drill.title}:`, data);
          fixed++;
        }
      } catch (e) {
        console.error(`[repair] ${drill.title} threw:`, e);
        failed++;
      }
    }
    setRepairingVideos(false);
    setRepairResults({ fixed, skipped: failed });
    toast({
      title: `Video repair complete`,
      description: failed > 0
        ? `${fixed} videos fixed, ${failed} failed (check console)`
        : `${fixed} videos successfully optimized for playback`,
    });
  };

  const categoryCount = (category: string) => 
    drills?.filter(d => d.category === category).length || 0;

  const adminCount = users?.filter(u => u.isAdmin).length || 0;
  const regularCount = users?.filter(u => !u.isAdmin).length || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage drills, users, and permissions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-1">
          <TabsTrigger value="training" className="gap-2 px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm" data-testid="tab-training">
            <Dumbbell className="h-4 w-4 shrink-0" />
            <span>Training Content</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="gap-2 px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm" data-testid="tab-configuration">
            <Settings2 className="h-4 w-4 shrink-0" />
            <span>Metrics & Picklists</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm" data-testid="tab-users">
            <Users className="h-4 w-4 shrink-0" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm" data-testid="tab-analytics">
            <BarChart2 className="h-4 w-4 shrink-0" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="community-3-pointers" className="gap-2 px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm" data-testid="tab-community-3-pointers">
            <Flame className="h-4 w-4 shrink-0" />
            <span>Community 3 Pointers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="mt-0">
          <Tabs defaultValue="drills" value={trainingTab} onValueChange={(value) => setTrainingTab(value as typeof trainingTab)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-1">
              <TabsTrigger value="drills" className="gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black"><Video className="h-3.5 w-3.5" />Drills</TabsTrigger>
              <TabsTrigger value="workouts" className="gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black"><Play className="h-3.5 w-3.5" />Workouts</TabsTrigger>
              <TabsTrigger value="programs" className="gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black"><Calendar className="h-3.5 w-3.5" />Programs</TabsTrigger>
              <TabsTrigger value="archetypes" className="gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black"><Fingerprint className="h-3.5 w-3.5" />Archetypes</TabsTrigger>
            </TabsList>
          </Tabs>
        </TabsContent>

        <TabsContent value="configuration" className="mt-0">
          <Tabs defaultValue="metrics" value={configurationTab} onValueChange={(value) => setConfigurationTab(value as typeof configurationTab)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-1">
              <TabsTrigger value="metrics" className="gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black"><Ruler className="h-3.5 w-3.5" />Metrics</TabsTrigger>
              <TabsTrigger value="picklists" className="gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black"><ListFilter className="h-3.5 w-3.5" />Picklists</TabsTrigger>
            </TabsList>
          </Tabs>
        </TabsContent>

        {/* Video Library Tab */}
        <TabsContent value="videos" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Video Library</h2>
              <p className="text-sm text-muted-foreground">Upload and manage training videos to use in drills</p>
            </div>
            <Dialog open={isCreateVideoOpen} onOpenChange={setIsCreateVideoOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-video">
                  <Plus className="w-4 h-4" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Video to Library</DialogTitle>
                </DialogHeader>
                <VideoLibraryForm 
                  onSuccess={() => setIsCreateVideoOpen(false)} 
                  onCancel={() => setIsCreateVideoOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {videosLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : !videoLibrary?.length ? (
                <div className="text-center py-12">
                  <Film className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No videos uploaded yet.</p>
                  <p className="text-sm text-muted-foreground">Click "Add Video" to upload your first training video.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {videoLibrary.map((video) => (
                    <Card key={video.id} className="overflow-hidden group">
                      <div className="aspect-video bg-muted relative">
                        {video.thumbnailUrl ? (
                          <img 
                            src={getObjectUrl(video.thumbnailUrl)} 
                            alt={video.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : video.videoUrl ? (
                          <video 
                            src={getObjectUrl(video.videoUrl)}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {/* Play button overlay */}
                        {video.videoUrl && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button 
                                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer"
                                data-testid={`button-play-video-${video.id}`}
                              >
                                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
                                </div>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                              <div className="aspect-video bg-black">
                                <video 
                                  src={getObjectUrl(video.videoUrl)}
                                  controls
                                  autoPlay
                                  className="w-full h-full"
                                  data-testid={`video-player-${video.id}`}
                                />
                              </div>
                              <div className="p-4">
                                <h3 className="font-semibold">{video.title}</h3>
                                {video.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {video.duration && (
                          <Badge className="absolute bottom-2 right-2 pointer-events-none">
                            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium truncate" data-testid={`text-video-title-${video.id}`}>{video.title}</h3>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {video.category && (
                            <Badge variant="secondary" className="capitalize">
                              {video.category.replace("-", " ")}
                            </Badge>
                          )}
                          {video.difficulty && (
                            <Badge variant="outline" className="capitalize">
                              {video.difficulty}
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-end gap-1 mt-3">
                          <Dialog open={editingVideo?.id === video.id} onOpenChange={(open) => !open && setEditingVideo(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setEditingVideo(video)}
                                data-testid={`button-edit-video-${video.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Video</DialogTitle>
                              </DialogHeader>
                              {editingVideo && (
                                <VideoLibraryForm 
                                  video={editingVideo}
                                  onSuccess={() => setEditingVideo(null)} 
                                  onCancel={() => setEditingVideo(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                data-testid={`button-delete-video-${video.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Video</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{video.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteVideoMutation.mutate(video.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-video-${video.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metric Templates Tab */}
        {activeTab === "configuration" && configurationTab === "metrics" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Metric Templates</h2>
              <p className="text-sm text-muted-foreground">Create reusable metrics to track progress across drills</p>
            </div>
            <Dialog open={isCreateMetricOpen} onOpenChange={setIsCreateMetricOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-metric-template">
                  <Plus className="w-4 h-4" />
                  Add Metric
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Metric Template</DialogTitle>
                </DialogHeader>
                <MetricTemplateForm 
                  onSuccess={() => setIsCreateMetricOpen(false)} 
                  onCancel={() => setIsCreateMetricOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {metricsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !metricTemplates?.length ? (
                <div className="text-center py-12">
                  <Ruler className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No metric templates created yet.</p>
                  <p className="text-sm text-muted-foreground">Create metrics to track shot attempts, completion rates, and more.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Unit/Formula</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium" data-testid={`text-metric-label-${template.id}`}>
                          <div className="flex items-center gap-2">
                            {template.type === "calculated" ? (
                              <Calculator className="w-4 h-4 text-primary" />
                            ) : (
                              <Hash className="w-4 h-4 text-muted-foreground" />
                            )}
                            {template.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {template.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.type === "calculated" ? template.formula : template.unit || "—"}
                        </TableCell>
                        <TableCell>
                          {template.category ? (
                            <Badge variant="secondary" className="capitalize">
                              {template.category.replace("-", " ")}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Dialog open={editingMetric?.id === template.id} onOpenChange={(open) => !open && setEditingMetric(null)}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => setEditingMetric(template)}
                                  data-testid={`button-edit-metric-${template.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Edit Metric Template</DialogTitle>
                                </DialogHeader>
                                {editingMetric && (
                                  <MetricTemplateForm 
                                    template={editingMetric}
                                    onSuccess={() => setEditingMetric(null)} 
                                    onCancel={() => setEditingMetric(null)}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  data-testid={`button-delete-metric-${template.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Metric Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{template.label}"? This may affect drills using this metric.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMetricMutation.mutate(template.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-metric-${template.id}`}
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
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* PDF Library Tab */}
        <TabsContent value="pdfs" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">PDF Library</h2>
              <p className="text-sm text-muted-foreground">Upload and manage training PDFs to use in drills</p>
            </div>
            <Dialog open={isCreatePdfOpen} onOpenChange={setIsCreatePdfOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-pdf">
                  <Plus className="w-4 h-4" />
                  Add PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add PDF to Library</DialogTitle>
                </DialogHeader>
                <PdfLibraryForm
                  onSuccess={() => setIsCreatePdfOpen(false)}
                  onCancel={() => setIsCreatePdfOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {pdfsLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !pdfLibrary?.length ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No PDFs yet</h3>
                  <p className="text-muted-foreground mb-4">Upload training PDFs to use in your drills</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Linked Drill</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pdfLibrary.map((pdf) => {
                      const linkedDrill = drills?.find(d => d.id === pdf.drillId);
                      return (
                        <TableRow key={pdf.id} data-testid={`pdf-row-${pdf.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-medium">{pdf.title}</div>
                                {pdf.description && (
                                  <div className="text-sm text-muted-foreground truncate max-w-xs">{pdf.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pdf.category ? (
                              <Badge variant="outline">{pdf.category.replace(/-/g, ' ')}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {pdf.difficulty ? (
                              <Badge variant="secondary">{pdf.difficulty}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {linkedDrill ? (
                              <Badge variant="outline" className="text-primary">{linkedDrill.title}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <a href={pdf.pdfUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" data-testid={`button-view-pdf-${pdf.id}`}>
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </a>
                              <Dialog open={editingPdf?.id === pdf.id} onOpenChange={(open) => !open && setEditingPdf(null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setEditingPdf(pdf)} data-testid={`button-edit-pdf-${pdf.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Edit PDF</DialogTitle>
                                  </DialogHeader>
                                  {editingPdf && (
                                    <PdfLibraryForm
                                      pdf={editingPdf}
                                      onSuccess={() => setEditingPdf(null)}
                                      onCancel={() => setEditingPdf(null)}
                                    />
                                  )}
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-delete-pdf-${pdf.id}`}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete PDF?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{pdf.title}" from your library.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePdfMutation.mutate(pdf.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {activeTab === "training" && trainingTab === "drills" && (
        <div className="space-y-6">
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
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Select value={drillSourceFilter} onValueChange={(v) => setDrillSourceFilter(v as any)}>
                  <SelectTrigger className="w-[140px]" data-testid="select-admin-drill-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playr1">PLAYR1 Only</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="all">All Sources</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRepairAllVideos}
                  disabled={repairingVideos}
                  data-testid="button-repair-videos"
                  title="Fix existing videos that won't play in Chrome"
                >
                  {repairingVideos ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
                  {repairingVideos ? "Repairing…" : "Repair Videos"}
                </Button>
                <Input 
                  placeholder="Search drills..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-search-drills"
                />
              </div>
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
        </div>
        )}

        {/* Workouts Tab */}
        {activeTab === "training" && trainingTab === "workouts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">PLAYR1 Workouts</h2>
              <p className="text-sm text-muted-foreground">Create workout routines by combining drills</p>
            </div>
            <Dialog open={isCreateWorkoutOpen} onOpenChange={(open) => { if (!open) closeWorkoutDialog(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-workout" onClick={() => openWorkoutDialog()}>
                  <Plus className="w-4 h-4" />
                  Create Workout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingWorkout ? "Edit Workout" : "Create Workout"}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {editingWorkout ? "Update this workout's details and drills" : "Create a new workout routine by selecting drills"}
                  </p>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="workout-name">Workout Name</Label>
                    <Input 
                      id="workout-name"
                      placeholder="e.g., Ball Handling Fundamentals" 
                      value={workoutName}
                      onChange={(e) => setWorkoutName(e.target.value)}
                      data-testid="input-workout-name" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workout-description">Description (Optional)</Label>
                    <Textarea 
                      id="workout-description"
                      placeholder="Describe this workout routine..." 
                      value={workoutDescription}
                      onChange={(e) => setWorkoutDescription(e.target.value)}
                      data-testid="input-workout-description" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workout-category">Category (Optional)</Label>
                    <Select value={workoutCategory} onValueChange={setWorkoutCategory}>
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
                      {drills?.filter(d => !d.userId).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No PLAYR1 drills available. Create drills first.</p>
                      ) : (
                        <div className="space-y-2">
                          {drills?.filter(d => !d.userId).map(drill => (
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
                    <Button type="button" variant="outline" onClick={closeWorkoutDialog}>
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleSaveWorkout}
                      disabled={createWorkoutMutation.isPending || updateWorkoutMutation.isPending}
                      data-testid="button-save-workout"
                    >
                      {createWorkoutMutation.isPending || updateWorkoutMutation.isPending ? "Saving..." : (editingWorkout ? "Update Workout" : "Create Workout")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Workout Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workoutsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !handlzWorkouts || handlzWorkouts.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-semibold mb-2">No Workouts Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create your first PLAYR1 workout by combining drills
                  </p>
                  <Button onClick={() => openWorkoutDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Workout
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {handlzWorkouts.map(workout => (
                        <TableRow key={workout.id} data-testid={`workout-row-${workout.id}`}>
                          <TableCell className="font-medium">{workout.name}</TableCell>
                          <TableCell>
                            {workout.category ? (
                              <Badge variant="secondary">
                                {workout.category.replace(/-/g, ' ')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {workout.description || <span className="text-muted-foreground">No description</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => openWorkoutDialog(workout)}
                                data-testid={`button-edit-workout-${workout.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    data-testid={`button-delete-workout-${workout.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Workout</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{workout.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteWorkoutMutation.mutate(workout.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid={`button-confirm-delete-workout-${workout.id}`}
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
        </div>
        )}

        <TabsContent value="locations" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-locations-title">Training Locations</h2>
              <p className="text-sm text-muted-foreground">Manage training locations that trainers can link to their profiles</p>
            </div>
            <Dialog open={isCreateLocationOpen || !!editingLocation} onOpenChange={(open) => {
              if (!open) {
                setIsCreateLocationOpen(false);
                setEditingLocation(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateLocationOpen(true)} data-testid="button-add-location">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
                </DialogHeader>
                <LocationForm
                  key={editingLocation?.id || "new"}
                  location={editingLocation || undefined}
                  onSubmit={(data) => {
                    if (editingLocation) {
                      updateLocationMutation.mutate({ id: editingLocation.id, data });
                    } else {
                      createLocationMutation.mutate(data);
                    }
                  }}
                  onCancel={() => {
                    setIsCreateLocationOpen(false);
                    setEditingLocation(null);
                  }}
                  isPending={createLocationMutation.isPending || updateLocationMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {locationsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : !trainingLocationsList?.length ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-locations">No training locations yet. Add your first location.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trainingLocationsList.map((location) => (
                <Card key={location.id} data-testid={`card-location-${location.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate" data-testid={`text-location-name-${location.id}`}>{location.name}</CardTitle>
                      {(location.city || location.state) && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-location-city-state-${location.id}`}>
                          {[location.city, location.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingLocation(location)}
                        data-testid={`button-edit-location-${location.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-delete-location-${location.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Location</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{location.name}"? This will also remove it from any trainer profiles that have it linked.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete-location">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteLocationMutation.mutate(location.id)}
                              data-testid="button-confirm-delete-location"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {location.address && (
                      <p className="text-sm" data-testid={`text-location-address-${location.id}`}>{location.address}</p>
                    )}
                    {location.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-location-description-${location.id}`}>{location.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tutorials" className="space-y-6">
          <TutorialVideosManager />
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
                        <TableHead>App Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Admin Access</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.firstName || "User"}
                            {user.isAdmin && (
                              <Badge className="ml-2 gap-1 text-xs" variant="outline">
                                <Shield className="w-3 h-3" /> Admin
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.email || "No email"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={(user as any).staffRole || "player"}
                              onValueChange={(val) => setRoleMutation.mutate({ userId: user.id, staffRole: val === "player" ? null : val })}
                              disabled={setRoleMutation.isPending}
                            >
                              <SelectTrigger className="h-8 w-[120px] text-xs" data-testid={`select-role-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="player">Player</SelectItem>
                                <SelectItem value="trainer">Trainer</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.subscriptionPlan || "free"}
                              onValueChange={(val) => setSubscriptionMutation.mutate({ userId: user.id, subscriptionPlan: val })}
                              disabled={setSubscriptionMutation.isPending}
                            >
                                 <SelectTrigger className="h-8 w-[118px] text-xs" data-testid={`select-plan-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                 <SelectItem value="pro-infinity">Pro Infinity</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Delete user ${user.firstName || user.email}? This cannot be undone.`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

        {/* Picklists Tab */}
        {activeTab === "configuration" && configurationTab === "picklists" && (
        <div className="space-y-8">
          {/* Shot Locations */}
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-xl font-semibold" data-testid="text-shot-locations-title">Shot Locations</h2>
                <p className="text-sm text-muted-foreground">Court zones selectable when logging a training session</p>
              </div>
              <Dialog open={shotLocationDialogOpen || !!editingShotLocation} onOpenChange={(open) => { if (!open) { setShotLocationDialogOpen(false); setEditingShotLocation(null); setShotLocationForm({ slug: "", label: "", classification: "2-pointer", sortOrder: 0, active: true }); } }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setShotLocationDialogOpen(true)} data-testid="button-add-shot-location">
                    <Plus className="w-4 h-4 mr-2" />Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingShotLocation ? "Edit Shot Location" : "Add Shot Location"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Slug (internal key)</label>
                      <Input value={shotLocationForm.slug} onChange={e => setShotLocationForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. corner-left" data-testid="input-shot-location-slug" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Display Label</label>
                      <Input value={shotLocationForm.label} onChange={e => setShotLocationForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Corner Left" data-testid="input-shot-location-label" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Classification</label>
                      <Select value={shotLocationForm.classification} onValueChange={v => setShotLocationForm(f => ({ ...f, classification: v }))}>
                        <SelectTrigger data-testid="select-shot-location-classification"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2-pointer">2-Pointer</SelectItem>
                          <SelectItem value="3-pointer">3-Pointer</SelectItem>
                          <SelectItem value="free-throw">Free Throw</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Sort Order</label>
                      <Input type="number" value={shotLocationForm.sortOrder} onChange={e => setShotLocationForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} data-testid="input-shot-location-sort-order" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={shotLocationForm.active} onCheckedChange={v => setShotLocationForm(f => ({ ...f, active: v }))} data-testid="switch-shot-location-active" />
                      <label className="text-sm">Active</label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShotLocationDialogOpen(false); setEditingShotLocation(null); }}>Cancel</Button>
                    <Button
                      onClick={() => editingShotLocation ? updateShotLocationMutation.mutate({ id: editingShotLocation.id, data: shotLocationForm }) : createShotLocationMutation.mutate(shotLocationForm)}
                      disabled={!shotLocationForm.slug || !shotLocationForm.label || createShotLocationMutation.isPending || updateShotLocationMutation.isPending}
                      data-testid="button-save-shot-location"
                    >
                      {editingShotLocation ? "Save Changes" : "Add Location"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {shotLocationsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shotLocationsList || []).map(loc => (
                      <TableRow key={loc.id} data-testid={`row-shot-location-${loc.id}`}>
                        <TableCell className="font-medium">{loc.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{loc.slug}</TableCell>
                        <TableCell><Badge variant="outline" className="no-default-hover-elevate capitalize">{loc.classification}</Badge></TableCell>
                        <TableCell>{loc.sortOrder}</TableCell>
                        <TableCell>{loc.active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground" />}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingShotLocation(loc); setShotLocationForm({ slug: loc.slug, label: loc.label, classification: loc.classification, sortOrder: loc.sortOrder, active: loc.active }); }} data-testid={`button-edit-shot-location-${loc.id}`}><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteShotLocationMutation.mutate(loc.id)} data-testid={`button-delete-shot-location-${loc.id}`}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          {/* Shot Types */}
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-xl font-semibold" data-testid="text-shot-types-title">Shot Types</h2>
                <p className="text-sm text-muted-foreground">Shot style options selectable when logging a training session</p>
              </div>
              <Dialog open={shotTypeDialogOpen || !!editingShotType} onOpenChange={(open) => { if (!open) { setShotTypeDialogOpen(false); setEditingShotType(null); setShotTypeForm({ name: "", label: "", sortOrder: 0, active: true }); } }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setShotTypeDialogOpen(true)} data-testid="button-add-shot-type">
                    <Plus className="w-4 h-4 mr-2" />Add Shot Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingShotType ? "Edit Shot Type" : "Add Shot Type"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Name (internal key)</label>
                      <Input value={shotTypeForm.name} onChange={e => setShotTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. floater" data-testid="input-shot-type-name" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Display Label</label>
                      <Input value={shotTypeForm.label} onChange={e => setShotTypeForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Floater" data-testid="input-shot-type-label" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Sort Order</label>
                      <Input type="number" value={shotTypeForm.sortOrder} onChange={e => setShotTypeForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} data-testid="input-shot-type-sort-order" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={shotTypeForm.active} onCheckedChange={v => setShotTypeForm(f => ({ ...f, active: v }))} data-testid="switch-shot-type-active" />
                      <label className="text-sm">Active</label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShotTypeDialogOpen(false); setEditingShotType(null); }}>Cancel</Button>
                    <Button
                      onClick={() => editingShotType ? updateShotTypeMutation.mutate({ id: editingShotType.id, data: shotTypeForm }) : createShotTypeMutation.mutate(shotTypeForm)}
                      disabled={!shotTypeForm.name || !shotTypeForm.label || createShotTypeMutation.isPending || updateShotTypeMutation.isPending}
                      data-testid="button-save-shot-type"
                    >
                      {editingShotType ? "Save Changes" : "Add Shot Type"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {shotTypesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shotTypesList || []).map(st => (
                      <TableRow key={st.id} data-testid={`row-shot-type-${st.id}`}>
                        <TableCell className="font-medium">{st.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{st.name}</TableCell>
                        <TableCell>{st.sortOrder}</TableCell>
                        <TableCell>{st.active ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground" />}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingShotType(st); setShotTypeForm({ name: st.name, label: st.label, sortOrder: st.sortOrder, active: st.active }); }} data-testid={`button-edit-shot-type-${st.id}`}><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteShotTypeMutation.mutate(st.id)} data-testid={`button-delete-shot-type-${st.id}`}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>
        )}
        {/* Analytics Tab */}
        {activeTab === "training" && trainingTab === "programs" && (
        <div className="space-y-6">
          <ProgramListSection mode="admin" />
        </div>
        )}

        {activeTab === "training" && trainingTab === "archetypes" && (
        <div className="space-y-6">
          <AdminArchetypesSection />
        </div>
        )}

        <TabsContent value="events" className="space-y-10">
          <AdminEventsSection />
          <div className="border-t border-border/40 pt-8">
            <AdminStatChallengesSection />
          </div>
        </TabsContent>

        {activeTab === "analytics" && (
        <div className="space-y-6">
          <AdminAnalyticsTab />
        </div>
        )}

        <TabsContent value="flags" className="space-y-6">
          <FeatureFlagsTab />
        </TabsContent>

        {activeTab === "community-3-pointers" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Community 3 Pointers</h2>
            <p className="text-sm text-muted-foreground">Review player submissions and community challenge activity.</p>
          </div>
          <ChallengeVideosTab />
        </div>
        )}

      </Tabs>

    </div>
  );
}

// ─── Feature Flags Tab Component ──────────────────────────────────────────────

type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  betaUserIds: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

function FeatureFlagsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: flags = [], isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/admin/feature-flags"],
  });

  const { data: allUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createForm = useForm<{ key: string; name: string; description: string }>({
    defaultValues: { key: "", name: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { key: string; name: string; description: string }) =>
      await apiRequest("POST", "/api/admin/feature-flags", {
        ...data,
        isEnabled: false,
        betaUserIds: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
      toast({ title: "Feature flag created" });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (e: any) => toast({ title: "Failed to create flag", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) =>
      await apiRequest("PUT", `/api/admin/feature-flags/${key}`, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    },
    onError: (e: any) => toast({ title: "Failed to update flag", description: e.message, variant: "destructive" }),
  });

  const updateBetaMutation = useMutation({
    mutationFn: async ({ key, betaUserIds }: { key: string; betaUserIds: string[] }) =>
      await apiRequest("PUT", `/api/admin/feature-flags/${key}`, { betaUserIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
      toast({ title: "Beta users updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => await apiRequest("DELETE", `/api/admin/feature-flags/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
      toast({ title: "Flag deleted" });
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const addBetaUser = (flag: FeatureFlag, uid: string) => {
    if (!uid || flag.betaUserIds.includes(uid)) return;
    updateBetaMutation.mutate({ key: flag.key, betaUserIds: [...flag.betaUserIds, uid] });
  };

  const removeBetaUser = (flag: FeatureFlag, uid: string) => {
    updateBetaMutation.mutate({ key: flag.key, betaUserIds: flag.betaUserIds.filter((id) => id !== uid) });
  };

  const getUserLabel = (uid: string) => {
    const u = allUsers.find((u) => u.id === uid);
    if (!u) return uid.slice(0, 12) + "...";
    return u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email || uid.slice(0, 12);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Feature Flags</h2>
          <p className="text-sm text-muted-foreground">
            Control which features are visible to users. Enable globally or grant access to specific beta testers.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-flag">
              <Plus className="w-4 h-4 mr-2" />
              New Flag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="flag-key">Key</Label>
                <Input
                  id="flag-key"
                  placeholder="e.g. reflection-journal"
                  {...createForm.register("key", { required: true, pattern: /^[a-z0-9-]+$/ })}
                  data-testid="input-flag-key"
                />
                <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-name">Name</Label>
                <Input
                  id="flag-name"
                  placeholder="e.g. Reflection Journal"
                  {...createForm.register("name", { required: true })}
                  data-testid="input-flag-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-desc">Description</Label>
                <Textarea
                  id="flag-desc"
                  placeholder="What does this feature do?"
                  {...createForm.register("description")}
                  className="resize-none min-h-[80px]"
                  data-testid="input-flag-description"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-flag">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Flag"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : flags.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Flag className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No feature flags yet</p>
              <p className="text-sm text-muted-foreground">Create your first flag to control feature visibility.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <Card key={flag.key} data-testid={`card-flag-${flag.key}`}>
              <CardContent className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{flag.name}</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                        {flag.key}
                      </code>
                      {flag.isEnabled ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                          Global ON
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Global OFF
                        </Badge>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {flag.isEnabled ? "On" : "Off"}
                      </span>
                      <Switch
                        checked={flag.isEnabled}
                        onCheckedChange={(checked) => toggleMutation.mutate({ key: flag.key, isEnabled: checked })}
                        data-testid={`switch-flag-${flag.key}`}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-flag-${flag.key}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete flag "{flag.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the flag. Features gated behind it will be hidden for all users.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(flag.key)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Beta users */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Beta Access
                    </p>
                    <span className="text-xs text-muted-foreground">
                      ({flag.betaUserIds.length} {flag.betaUserIds.length === 1 ? "user" : "users"})
                    </span>
                  </div>

                  {flag.betaUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {flag.betaUserIds.map((uid) => (
                        <div
                          key={uid}
                          className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-xs"
                        >
                          <span>{getUserLabel(uid)}</span>
                          <button
                            onClick={() => removeBetaUser(flag, uid)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`button-remove-beta-${flag.key}-${uid}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add beta user */}
                  <div className="flex gap-2">
                    {user && !flag.betaUserIds.includes(user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 shrink-0"
                        onClick={() => addBetaUser(flag, user.id)}
                        disabled={updateBetaMutation.isPending}
                        data-testid={`button-add-me-${flag.key}`}
                      >
                        + Add Me
                      </Button>
                    )}
                    <Select
                      value=""
                      onValueChange={(v) => addBetaUser(flag, v)}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs" data-testid={`select-beta-user-${flag.key}`}>
                        <SelectValue placeholder="Add another user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers
                          .filter((u) => !flag.betaUserIds.includes(u.id))
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName && u.lastName
                                ? `${u.firstName} ${u.lastName}`
                                : u.email || u.id}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Analytics Tab Component ───────────────────────────────────────────

const CHART_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444"];

// ─── Challenge Videos Tab ─────────────────────────────────────────────────────

type CreatorSubmission = {
  id: string;
  userId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  score: number;
  attemptDate: string;
  videoUrl: string;
  isNewRecord: boolean;
  createdAt: string;
};

function ChallengeVideosTab() {
  const CHALLENGE_SLUG = "fifty-in-a-row";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");

  const { data: submissions = [], isLoading } = useQuery<CreatorSubmission[]>({
    queryKey: ["/api/admin/streak-challenges/creator-submissions", CHALLENGE_SLUG],
    queryFn: async () => {
      const res = await fetch(`/api/admin/streak-challenges/creator-submissions?slug=${CHALLENGE_SLUG}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filtered = dateFilter
    ? submissions.filter((s) => s.attemptDate === dateFilter)
    : submissions;

  const isInternal = (url: string) => url.startsWith("/objects/");

  return (
    <div className="space-y-6" data-testid="section-challenge-videos">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Community 3 Point Challenge — Creator Submissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Videos players opted to submit for your content. Filter by date to find clips for a specific session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 text-sm w-44"
            data-testid="input-date-filter"
          />
          {dateFilter && (
            <Button size="sm" variant="ghost" onClick={() => setDateFilter("")} className="h-9 px-2 text-muted-foreground">
              <X className="w-4 h-4" />
            </Button>
          )}
          <Badge variant="outline" className="text-xs">{filtered.length} clip{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center">
          <Film className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {dateFilter ? `No submissions on ${dateFilter}` : "No creator submissions yet. Players can opt in when logging attempts."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl border border-border/60 bg-card overflow-hidden"
              data-testid={`card-submission-${sub.id}`}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={sub.profilePhotoUrl ?? undefined} />
                  <AvatarFallback className="text-xs">{sub.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{sub.displayName}</p>
                    {sub.isNewRecord && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/15 text-yellow-500 border-yellow-500/30">
                        <Star className="w-2.5 h-2.5 mr-0.5" />PR
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{sub.attemptDate}</span>
                    <span className="text-xs font-bold text-orange-400">{sub.score} makes</span>
                    <span className="text-[10px] text-muted-foreground">
                      submitted {new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isInternal(sub.videoUrl) ? (
                    <Button
                      size="sm" variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                      data-testid={`button-play-submission-${sub.id}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {expandedId === sub.id ? "Hide" : "Play"}
                    </Button>
                  ) : (
                    <a
                      href={sub.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-400/20 rounded-md px-2 py-1.5"
                      data-testid={`link-submission-${sub.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />Open link
                    </a>
                  )}
                </div>
              </div>

              {/* Inline video player */}
              {expandedId === sub.id && isInternal(sub.videoUrl) && (
                <div className="px-4 pb-4">
                  <video
                    src={sub.videoUrl}
                    controls
                    autoPlay
                    className="w-full rounded-lg max-h-80 bg-black"
                    playsInline
                    data-testid={`video-submission-${sub.id}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminAnalyticsTab() {
  const analyticsTabs = [
    { value: "overview", label: "Overview", icon: BarChart2 },
    { value: "business", label: "Business", icon: TrendingUp },
    { value: "activity", label: "Activity", icon: Activity },
    { value: "users", label: "Users", icon: Users },
    { value: "funnels", label: "Funnels", icon: GitBranch },
    { value: "training", label: "Training", icon: Dumbbell },
    { value: "community", label: "Community", icon: Users },
    { value: "coach-p", label: "Coach P", icon: Calculator },
    { value: "live", label: "Live", icon: Zap },
  ] as const;

  return (
    <div className="space-y-6" data-testid="section-analytics">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-orange-500/15 bg-gradient-to-r from-zinc-950 via-zinc-900 to-orange-950/30 p-2 shadow-[0_12px_40px_rgba(249,115,22,0.08)]">
          {analyticsTabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              data-testid={`tab-analytics-${value}`}
              className="gap-1.5 rounded-xl px-3 py-2 text-xs transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-300 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 sm:text-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewSubTab /></TabsContent>
        <TabsContent value="business" className="mt-6"><BusinessAnalyticsSubTab /></TabsContent>
        <TabsContent value="activity" className="mt-6"><ActivityAnalyticsSubTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersSubTab /></TabsContent>
        <TabsContent value="funnels" className="mt-6"><FunnelsSubTab /></TabsContent>
        <TabsContent value="training" className="mt-6"><TrainingAnalyticsSubTab /></TabsContent>
        <TabsContent value="community" className="mt-6"><CommunityAnalyticsSubTab /></TabsContent>
        <TabsContent value="coach-p" className="mt-6"><CoachPAndJournalAnalyticsSubTab /></TabsContent>
        <TabsContent value="live" className="mt-6"><LiveActivitySubTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyticsSectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return null;
}

const SIMULATED_BUSINESS_ANALYTICS = {
  prices: [
    { id: "sim-pro-monthly", productName: "PLAYR1 Pro", amount: 9.99, currency: "usd", interval: "month", lookupKey: "simulated_playr1_pro_monthly" },
    { id: "sim-pro-annual", productName: "PLAYR1 Pro", amount: 99.99, currency: "usd", interval: "year", lookupKey: "simulated_playr1_pro_annual" },
  ],
  users: { total: 1480, paid: 312, free: 1124, infinity: 44 },
  revenue: {
    currentMrr: 2914.68,
    trailing12Months: 30780.42,
    thisMonth: 3720.42,
    thisYear: 24920.42,
    averageRevenuePerPaidUser: 9.86,
    paidThisMonth: 312,
    paidThisYear: 365,
    subscriptionsThisMonth: 321,
    subscriptionsThisYear: 2584,
     monthly: [
       { month: "2025-10", revenue: 1200, invoices: 128, paidUsers: 108, signups: 72, activeUsers: 520, activeSubscriptions: 108, churnedSubscriptions: 8 },
       { month: "2025-11", revenue: 1460, invoices: 139, paidUsers: 126, signups: 84, activeUsers: 560, activeSubscriptions: 126, churnedSubscriptions: 7 },
       { month: "2025-12", revenue: 1680, invoices: 153, paidUsers: 144, signups: 96, activeUsers: 600, activeSubscriptions: 144, churnedSubscriptions: 10 },
       { month: "2026-01", revenue: 1880, invoices: 169, paidUsers: 161, signups: 108, activeUsers: 650, activeSubscriptions: 161, churnedSubscriptions: 9 },
       { month: "2026-02", revenue: 2140, invoices: 187, paidUsers: 179, signups: 116, activeUsers: 700, activeSubscriptions: 179, churnedSubscriptions: 14 },
       { month: "2026-03", revenue: 2320, invoices: 201, paidUsers: 194, signups: 123, activeUsers: 760, activeSubscriptions: 194, churnedSubscriptions: 11 },
       { month: "2026-04", revenue: 2525, invoices: 218, paidUsers: 211, signups: 131, activeUsers: 820, activeSubscriptions: 211, churnedSubscriptions: 15 },
       { month: "2026-05", revenue: 2740, invoices: 237, paidUsers: 230, signups: 138, activeUsers: 880, activeSubscriptions: 230, churnedSubscriptions: 13 },
       { month: "2026-06", revenue: 2965, invoices: 255, paidUsers: 248, signups: 146, activeUsers: 940, activeSubscriptions: 248, churnedSubscriptions: 16 },
       { month: "2026-07", revenue: 3180, invoices: 276, paidUsers: 267, signups: 151, activeUsers: 1000, activeSubscriptions: 267, churnedSubscriptions: 14 },
       { month: "2026-08", revenue: 3450, invoices: 298, paidUsers: 289, signups: 158, activeUsers: 1080, activeSubscriptions: 289, churnedSubscriptions: 13 },
       { month: "2026-09", revenue: 3720.42, invoices: 321, paidUsers: 312, signups: 164, activeUsers: 1160, activeSubscriptions: 312, churnedSubscriptions: 12 },
    ],
  },
  ltv: { averagePaidMonths: 9.1, estimatedLtv: 89.73, subscriptionCount: 388, dataAvailable: true },
  churn: {
    churned30d: 12,
    churnRate30d: 3.8,
    monthly: [
      { month: "2025-10", churnedUsers: 8 },
      { month: "2025-11", churnedUsers: 7 },
      { month: "2025-12", churnedUsers: 10 },
      { month: "2026-01", churnedUsers: 9 },
      { month: "2026-02", churnedUsers: 14 },
      { month: "2026-03", churnedUsers: 11 },
      { month: "2026-04", churnedUsers: 15 },
      { month: "2026-05", churnedUsers: 13 },
      { month: "2026-06", churnedUsers: 16 },
      { month: "2026-07", churnedUsers: 14 },
      { month: "2026-08", churnedUsers: 13 },
      { month: "2026-09", churnedUsers: 12 },
    ],
  },
  expenses: {
     tracked12Months: 5894,
    categories: [
       { key: "ai", label: "AI / Coach P calls", amount: 2674, status: "simulated", note: "Simulated token-cost estimates" },
       { key: "stripe", label: "Stripe processing", amount: 1600, status: "simulated", note: "Simulated 2.9% + $0.30 per paid invoice" },
      { key: "replit", label: "Replit hosting", amount: 1280, status: "simulated", note: "Illustrative workspace hosting estimate" },
      { key: "storage", label: "Object storage / database", amount: 340, status: "simulated", note: "Illustrative storage and database estimate" },
    ],
    monthly: [
       { month: "2025-10", aiCalls: 154, stripeFees: 73, replitCost: 80, storageCost: 18, totalExpenses: 325 },
       { month: "2025-11", aiCalls: 168, stripeFees: 84, replitCost: 85, storageCost: 20, totalExpenses: 357 },
       { month: "2025-12", aiCalls: 181, stripeFees: 95, replitCost: 90, storageCost: 22, totalExpenses: 388 },
       { month: "2026-01", aiCalls: 196, stripeFees: 106, replitCost: 95, storageCost: 24, totalExpenses: 421 },
       { month: "2026-02", aiCalls: 207, stripeFees: 116, replitCost: 100, storageCost: 26, totalExpenses: 449 },
       { month: "2026-03", aiCalls: 220, stripeFees: 124, replitCost: 105, storageCost: 28, totalExpenses: 477 },
       { month: "2026-04", aiCalls: 232, stripeFees: 136, replitCost: 110, storageCost: 30, totalExpenses: 508 },
       { month: "2026-05", aiCalls: 245, stripeFees: 148, replitCost: 115, storageCost: 32, totalExpenses: 540 },
       { month: "2026-06", aiCalls: 258, stripeFees: 160, replitCost: 120, storageCost: 34, totalExpenses: 572 },
       { month: "2026-07", aiCalls: 268, stripeFees: 172, replitCost: 125, storageCost: 36, totalExpenses: 601 },
       { month: "2026-08", aiCalls: 257, stripeFees: 188, replitCost: 130, storageCost: 36, totalExpenses: 611 },
       { month: "2026-09", aiCalls: 288, stripeFees: 198, replitCost: 125, storageCost: 34, totalExpenses: 645 },
    ],
  },
};

function BusinessAnalyticsSubTab() {
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/business"],
  });
  const [showSimulated, setShowSimulated] = useState(false);
  const [kpiIndexes, setKpiIndexes] = useState({ revenue: 0, users: 0, ltv: 0, churn: 0 });
  const [performanceView, setPerformanceView] = useState<"money" | "users">("money");
  const [expenseView, setExpenseView] = useState<"monthly" | "yearly">("yearly");

  const money = (value: number | null | undefined) =>
    value == null ? "—" : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const percent = (value: number | null | undefined) =>
    value == null ? "—" : `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}</div>
        <div className="grid gap-5 lg:grid-cols-2">{[1, 2].map((item) => <Skeleton key={item} className="h-80 rounded-2xl" />)}</div>
      </div>
    );
  }

  if ((isError || !data) && !showSimulated) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="font-semibold">Business analytics could not load</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            <Button size="sm" onClick={() => setShowSimulated(true)}>Preview simulated data</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const viewData = showSimulated ? SIMULATED_BUSINESS_ANALYTICS : data;
  const revenue = viewData.revenue || {};
  const users = viewData.users || {};
  const ltv = viewData.ltv || {};
  const churn = viewData.churn || {};
  const expenses = viewData.expenses || {};
  const monthly = revenue.monthly || [];
  const expenseCategories = (expenses.categories || []).filter((item: any) => item.amount != null);
  const revenueMix = [
    { name: "Paid users", value: Number(users.paid || 0), color: "#f97316" },
    { name: "Free users", value: Number(users.free || 0), color: "#38bdf8" },
    ...(Number(users.infinity || 0) > 0 ? [{ name: "Infinity access", value: Number(users.infinity), color: "#a855f7" }] : []),
  ].filter((item) => item.value > 0);
  const expenseMix = expenseCategories.map((item: any, index: number) => ({
    name: item.label,
    value: Number(item.amount || 0),
    color: ["#f97316", "#ef4444", "#a855f7", "#38bdf8"][index % 4],
  }));
  const priceCards = (viewData.prices || []).map((price: any) => ({
    ...price,
    label: price.interval === "year" ? "Annual Pro" : "Monthly Pro",
  }));
  const monthlyPrice = priceCards.find((price: any) => price.interval === "month");
  const annualPrice = priceCards.find((price: any) => price.interval === "year");
  const activePrice = monthlyPrice || annualPrice || priceCards[0];
  const monthlyEquivalentPrice = monthlyPrice ? Number(monthlyPrice.amount) : annualPrice ? Number(annualPrice.amount) / 12 : 0;
  const annualMonthlyEquivalent = annualPrice ? Number(annualPrice.amount) / 12 : monthlyEquivalentPrice;
  const annualSavingsPercent = monthlyPrice && annualPrice
    ? Math.max(0, (1 - Number(annualPrice.amount) / (Number(monthlyPrice.amount) * 12)) * 100)
    : 0;
  const estimatedStripeFeePerUser = monthlyEquivalentPrice * 0.029 + 0.3;
  const estimatedAnnualStripeFeePerUser = annualPrice ? (Number(annualPrice.amount) * 0.029 + 0.3) / 12 : estimatedStripeFeePerUser;
  const estimatedAiCostPerUser = Number(expenseCategories.find((item: any) => item.key === "ai")?.amount || 0) / Math.max(Number(users.paid || 0), 1) / 12;
  const estimatedContribution = monthlyEquivalentPrice - estimatedStripeFeePerUser - estimatedAiCostPerUser;
  const estimatedAnnualContribution = annualMonthlyEquivalent - estimatedAnnualStripeFeePerUser - estimatedAiCostPerUser;
  const chartData = monthly.map((row: any) => ({
    ...row,
    label: row.month.slice(5),
  }));
  const expenseData = (expenses.monthly || []).map((row: any) => ({
    ...row,
    aiCost: Number(row.aiCost ?? row.aiCalls ?? 0),
    stripeFees: Number(row.stripeFees || 0),
    replitCost: row.replitCost == null ? null : Number(row.replitCost),
    storageCost: row.storageCost == null ? null : Number(row.storageCost),
    totalExpenses: Number(row.totalExpenses ?? ((row.aiCalls || 0) + (row.stripeFees || 0))),
  }));
  const expenseByMonth = new Map<string, any>(expenseData.map((row: any) => [row.month, row] as [string, any]));
  const currentMonth = chartData[chartData.length - 1];
  const previousMonth = chartData[chartData.length - 2];
  const currentYear = new Date().getFullYear().toString();
  const yearRows = chartData.filter((row: any) => row.month.startsWith(currentYear));
  const fallbackYearRows = yearRows.length > 0 ? yearRows : chartData;
  const currentExpense = expenseByMonth.get(currentMonth?.month) as any;
  const previousExpense = expenseByMonth.get(previousMonth?.month) as any;
  const expensesThisMonth = currentExpense?.totalExpenses ?? 0;
  const expensesThisYear = fallbackYearRows.reduce((sum: number, row: any) => sum + (expenseByMonth.get(row.month)?.totalExpenses ?? 0), 0);
  const revenueThisMonth = Number(revenue.thisMonth ?? currentMonth?.revenue ?? 0);
  const revenueThisYear = Number(revenue.thisYear ?? fallbackYearRows.reduce((sum: number, row: any) => sum + Number(row.revenue || 0), 0));
  const profitThisMonth = revenueThisMonth - expensesThisMonth;
  const profitThisYear = revenueThisYear - expensesThisYear;
  const paidUsersThisMonth = Number(revenue.paidThisMonth ?? currentMonth?.paidUsers ?? users.paid ?? 0);
  const paidUsersThisYear = Number(revenue.paidThisYear ?? fallbackYearRows.reduce((sum: number, row: any) => sum + Number(row.paidUsers || 0), 0));
  const subscriptionsThisYear = Number(revenue.subscriptionsThisYear ?? fallbackYearRows.reduce((sum: number, row: any) => sum + Number(row.invoices || 0), 0));
  const paidPercent = Number(users.total || 0) > 0 ? (Number(users.paid || 0) / Number(users.total)) * 100 : 0;
  const previousTotalAccounts = Math.max(0, Number(users.total || 0) - Number(currentMonth?.signups || 0));
  const previousPaidPercent = previousTotalAccounts > 0 ? (Number(previousMonth?.paidUsers || 0) / previousTotalAccounts) * 100 : 0;
  const churnThisMonth = Number(currentMonth?.churnedSubscriptions ?? churn.churned30d ?? 0);
  const churnThisYear = fallbackYearRows.reduce((sum: number, row: any) => sum + Number(row.churnedSubscriptions || 0), 0);
  const churnRate = Number(churn.churnRate30d ?? (currentMonth?.activeSubscriptions ? (churnThisMonth / currentMonth.activeSubscriptions) * 100 : 0));
  const previousChurnRate = previousMonth?.activeSubscriptions ? (Number(previousMonth.churnedSubscriptions || 0) / Number(previousMonth.activeSubscriptions)) * 100 : null;
  const trendFor = (current: number | null | undefined, previous: number | null | undefined, inverse = false) => {
    if (current == null || previous == null || previous === 0 || !Number.isFinite(current) || !Number.isFinite(previous)) return null;
    const raw = ((current - previous) / Math.abs(previous)) * 100;
    return { value: Math.abs(raw), positive: inverse ? raw <= 0 : raw >= 0 };
  };
  const revenueMetrics = [
    { label: "Current MRR", value: money(revenue.currentMrr), sub: "active monthly recurring revenue", trend: trendFor(Number(revenue.currentMrr || 0), Number(previousMonth?.revenue || 0)), icon: TrendingUp },
    { label: "Revenue this month", value: money(revenueThisMonth), sub: "paid invoices this month", trend: trendFor(revenueThisMonth, Number(previousMonth?.revenue || 0)), icon: TrendingUp },
    { label: "Revenue this year", value: money(revenueThisYear), sub: "year-to-date paid revenue", trend: trendFor(revenueThisYear, Number(previousMonth?.revenue || 0)), icon: TrendingUp },
    { label: "Profit this month", value: money(profitThisMonth), sub: "revenue less tracked expenses", trend: trendFor(profitThisMonth, Number(previousMonth?.revenue || 0) - Number(previousExpense?.totalExpenses || 0)), icon: TrendingUp },
    { label: "Profit this year", value: money(profitThisYear), sub: "year-to-date revenue less expenses", trend: trendFor(profitThisYear, Number(previousMonth?.revenue || 0) - Number(previousExpense?.totalExpenses || 0)), icon: TrendingUp },
  ];
  const userMetrics = [
    { label: "Paid users", value: Number(users.paid || 0).toLocaleString(), sub: "active paid accounts", trend: trendFor(Number(users.paid || 0), Number(previousMonth?.paidUsers || 0)), icon: Star },
    { label: "Total accounts", value: Number(users.total || 0).toLocaleString(), sub: "all player accounts", trend: trendFor(Number(users.total || 0), previousTotalAccounts), icon: Users },
    { label: "Paid user share", value: percent(paidPercent), sub: "paid users as % of accounts", trend: trendFor(paidPercent, previousPaidPercent), icon: Star },
  ];
  const ltvMetrics = [
    { label: "LTV", value: ltv.dataAvailable ? money(ltv.estimatedLtv) : "—", sub: "estimated lifetime value", trend: trendFor(Number(ltv.estimatedLtv || 0), previousMonth?.paidUsers ? (Number(previousMonth.revenue || 0) / Number(previousMonth.paidUsers)) * Number(ltv.averagePaidMonths || 0) : null), icon: Trophy },
    { label: "Avg paid months", value: ltv.dataAvailable ? Number(ltv.averagePaidMonths).toFixed(1) : "—", sub: "average paid lifetime", trend: null, icon: Clock },
    { label: "Paid this month", value: paidUsersThisMonth.toLocaleString(), sub: "individual users with a payment", trend: trendFor(paidUsersThisMonth, Number(previousMonth?.paidUsers || 0)), icon: UserCheck },
    { label: "Paid this year", value: paidUsersThisYear.toLocaleString(), sub: "individual users with a payment YTD", trend: trendFor(paidUsersThisYear, Number(previousMonth?.paidUsers || 0)), icon: UserCheck },
    { label: "Subscriptions this year", value: subscriptionsThisYear.toLocaleString(), sub: "paid subscription invoices YTD", trend: trendFor(subscriptionsThisYear, Number(previousMonth?.invoices || 0)), icon: Calendar },
  ];
  const churnMetrics = [
    { label: "Churn rate", value: percent(churnRate), sub: "subscriptions churned recently", trend: trendFor(churnRate, previousChurnRate, true), icon: TrendingDown },
    { label: "Churned this month", value: churnThisMonth.toLocaleString(), sub: "canceled subscriptions", trend: trendFor(churnThisMonth, Number(previousMonth?.churnedSubscriptions || 0), true), icon: TrendingDown },
    { label: "Churned this year", value: churnThisYear.toLocaleString(), sub: "canceled subscriptions YTD", trend: trendFor(churnThisYear, Number(previousMonth?.churnedSubscriptions || 0), true), icon: TrendingDown },
  ];
  const performanceData = chartData.map((row: any) => {
    const expense = expenseByMonth.get(row.month);
    const totalExpenses = Number(expense?.totalExpenses ?? row.totalExpenses ?? 0);
    return { ...row, totalExpenses, profit: Number(row.revenue || 0) - totalExpenses };
  });
  const monthlyExpenseChartData = expenseData.map((row: any) => ({ ...row, label: row.month.slice(5) }));
  const hasMonthlyPlatformEstimates = expenseData.some((row: any) => row.replitCost != null || row.storageCost != null);
  const monthlyExpenseSeries = [
    { key: "aiCost", label: "AI / Coach P", color: "#a855f7" },
    { key: "stripeFees", label: "Stripe", color: "#ef4444" },
    ...(hasMonthlyPlatformEstimates ? [
      { key: "replitCost", label: "Replit hosting", color: "#38bdf8" },
      { key: "storageCost", label: "Storage / database", color: "#f97316" },
    ] : []),
  ];
  const hasPerformanceData = performanceData.length > 0;
  const hasRevenue = chartData.length > 0;
  const hasExpenses = expenseMix.length > 0;
  const selectedRevenueMetric = revenueMetrics[kpiIndexes.revenue];
  const selectedUserMetric = userMetrics[kpiIndexes.users];
  const selectedLtvMetric = ltvMetrics[kpiIndexes.ltv];
  const selectedChurnMetric = churnMetrics[kpiIndexes.churn];

  return (
    <div className="space-y-6" data-testid="section-business-analytics">
      <div className="flex justify-end">
        <AnalyticsSectionIntro
          eyebrow="Business"
          title="Revenue, retention, and the cost of growth"
          description="Subscription economics in one place. Every metric is sourced from synced Stripe records, application usage, or clearly labeled estimates."
        />
        <Button
          size="sm"
          variant={showSimulated ? "default" : "outline"}
          className={showSimulated ? "shrink-0 bg-orange-500 text-white hover:bg-orange-400" : "shrink-0"}
          onClick={() => setShowSimulated((current) => !current)}
        >
          {showSimulated ? "Use live data" : "Preview simulated data"}
        </Button>
      </div>

      {showSimulated && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm">
          <div>
            <span className="font-semibold text-purple-200">Simulated preview active.</span>{" "}
            <span className="text-purple-200/70">These values live only in this browser view and do not change Stripe or your database.</span>
          </div>
          <Badge className="shrink-0 border-purple-300/30 bg-purple-400/20 text-purple-100">DEMO DATA</Badge>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BusinessKpi
          {...selectedRevenueMetric}
          accent="orange"
          cycleHint={`${kpiIndexes.revenue + 1}/${revenueMetrics.length} · click to cycle`}
          onClick={() => setKpiIndexes((current) => ({ ...current, revenue: (current.revenue + 1) % revenueMetrics.length }))}
        />
        <BusinessKpi
          {...selectedUserMetric}
          accent="purple"
          cycleHint={`${kpiIndexes.users + 1}/${userMetrics.length} · click to cycle`}
          onClick={() => setKpiIndexes((current) => ({ ...current, users: (current.users + 1) % userMetrics.length }))}
        />
        <BusinessKpi
          {...selectedLtvMetric}
          accent="blue"
          cycleHint={`${kpiIndexes.ltv + 1}/${ltvMetrics.length} · click to cycle`}
          onClick={() => setKpiIndexes((current) => ({ ...current, ltv: (current.ltv + 1) % ltvMetrics.length }))}
        />
        <BusinessKpi
          {...selectedChurnMetric}
          accent="red"
          cycleHint={`${kpiIndexes.churn + 1}/${churnMetrics.length} · click to cycle`}
          onClick={() => setKpiIndexes((current) => ({ ...current, churn: (current.churn + 1) % churnMetrics.length }))}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Revenue, expense, and profit</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Switch between financial performance and user growth signals</p>
              </div>
              <div className="flex rounded-lg border border-zinc-800/80 p-0.5">
                {[
                  ["money", "Money"],
                  ["users", "Users"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={performanceView === value ? "secondary" : "ghost"}
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setPerformanceView(value as "money" | "users")}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {!hasPerformanceData ? <BusinessEmptyState label="No business trend data yet" /> : (
              <ResponsiveContainer width="100%" height={280}>
                {performanceView === "money" ? (
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => money(Number(value))} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.14} strokeWidth={2.5} />
                    <Area type="monotone" dataKey="totalExpenses" name="Expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} strokeWidth={2.5} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#facc15" fill="#facc15" fillOpacity={0.18} strokeWidth={2.5} />
                  </AreaChart>
                ) : (
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => value.toLocaleString()} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} users`} />
                    <Line type="monotone" dataKey="activeUsers" name="Total active users" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: "#38bdf8" }} />
                    <Line type="monotone" dataKey="signups" name="New signups" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: "#a855f7" }} />
                    <Line type="monotone" dataKey="churnedSubscriptions" name="Churned subscriptions" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <CardTitle className="text-base">Free vs paid</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Account mix from application subscription state</p>
          </CardHeader>
          <CardContent className="p-4">
            {revenueMix.length === 0 ? <BusinessEmptyState label="No account mix yet" /> : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={4} stroke="none">
                      {revenueMix.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {revenueMix.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                      <span className="font-semibold">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-1">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">PLAYR1 Pro pricing</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Active prices currently synced from Stripe</p>
              </div>
              {activePrice && <Badge variant="outline" className="border-orange-500/30 text-orange-300">{money(activePrice.amount)} / {activePrice.interval}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {priceCards.length === 0 ? <BusinessEmptyState label="No active Stripe prices configured" /> : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {priceCards.map((price: any) => (
                     <div key={price.id} className={`rounded-xl border p-4 ${price.interval === "year" ? "border-emerald-400/30 bg-emerald-500/10" : "border-orange-500/20 bg-orange-500/5"}`}>
                       <div className="flex items-center justify-between gap-2">
                         <p className={`text-xs font-bold uppercase tracking-[0.16em] ${price.interval === "year" ? "text-emerald-300" : "text-orange-400"}`}>{price.label}</p>
                         {price.interval === "year" && annualSavingsPercent > 0 && <Badge className="border-emerald-300/30 bg-emerald-400/15 text-[10px] text-emerald-200">Save {annualSavingsPercent.toFixed(0)}%</Badge>}
                       </div>
                      <p className="mt-2 text-2xl font-bold">{money(price.amount)}<span className="text-sm font-normal text-muted-foreground"> / {price.interval}</span></p>
                       {price.interval === "year" && <p className="mt-1 text-xs text-emerald-200/80">{money(annualMonthlyEquivalent)} per month equivalent</p>}
                      <p className="mt-2 truncate text-[11px] text-muted-foreground">{price.lookupKey || price.id}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-800/70 pt-4">
                   <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Unit economics · monthly equivalent</p>
                   <div className="grid gap-3 sm:grid-cols-2">
                     <div className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-3">
                       <p className="text-xs font-semibold text-orange-300">Monthly Pro</p>
                       <div className="mt-3 grid grid-cols-2 gap-2">
                         <div><p className="text-[11px] text-muted-foreground">Gross price</p><p className="mt-1 font-semibold">{money(monthlyEquivalentPrice)}</p></div>
                         <div><p className="text-[11px] text-muted-foreground">Stripe fee</p><p className="mt-1 font-semibold">{money(estimatedStripeFeePerUser)}</p></div>
                         <div><p className="text-[11px] text-muted-foreground">AI cost / user</p><p className="mt-1 font-semibold">{money(estimatedAiCostPerUser)}</p></div>
                         <div><p className="text-[11px] text-muted-foreground">Contribution</p><p className="mt-1 font-semibold text-orange-200">{money(estimatedContribution)}</p></div>
                       </div>
                     </div>
                     <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                       <p className="text-xs font-semibold text-emerald-300">Annual Pro · monthly equivalent</p>
                       <div className="mt-3 grid grid-cols-2 gap-2">
                         <div><p className="text-[11px] text-muted-foreground">Gross price</p><p className="mt-1 font-semibold">{money(annualMonthlyEquivalent)}</p></div>
                         <div><p className="text-[11px] text-muted-foreground">Stripe fee</p><p className="mt-1 font-semibold">{money(estimatedAnnualStripeFeePerUser)}</p></div>
                         <div><p className="text-[11px] text-muted-foreground">AI cost / user</p><p className="mt-1 font-semibold">{money(estimatedAiCostPerUser)}</p></div>
                         <div><p className="text-[11px] text-muted-foreground">Contribution</p><p className="mt-1 font-semibold text-emerald-200">{money(estimatedAnnualContribution)}</p></div>
                       </div>
                     </div>
                  </div>
                   <p className="mt-2 text-[11px] text-muted-foreground">Annual economics spread the one-time yearly Stripe charge across 12 months. Contribution is before Replit infrastructure costs and uses the current tracked/estimated AI cost run rate.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <CardTitle className="text-base">LTV & paid tenure</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Estimated from paid invoices and synced subscription history</p>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-500/10 p-4"><p className="text-xs text-blue-300">Average paid months</p><p className="mt-1 text-2xl font-bold">{ltv.dataAvailable ? Number(ltv.averagePaidMonths).toFixed(1) : "—"}</p></div>
              <div className="rounded-xl bg-purple-500/10 p-4"><p className="text-xs text-purple-300">Revenue / paid user</p><p className="mt-1 text-2xl font-bold">{ltv.dataAvailable ? money(revenue.averageRevenuePerPaidUser) : "—"}</p></div>
            </div>
            <div className="rounded-xl border border-zinc-800/70 p-4">
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Estimated LTV</span><span className="text-xl font-bold text-orange-300">{ltv.dataAvailable ? money(ltv.estimatedLtv) : "—"}</span></div>
              <p className="mt-2 text-xs text-muted-foreground">{ltv.dataAvailable ? "Average revenue per paid user multiplied by average paid tenure." : "LTV appears after Stripe subscription history and paid invoice data are available."}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{expenseView === "monthly" ? "Monthly expenses" : "Yearly expense mix"}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{expenseView === "monthly" ? "Tracked expenses by month" : "Tracked and estimated operating costs over the last 12 months"}</p>
              </div>
              <div className="flex rounded-lg border border-zinc-800/80 p-0.5">
                <Button size="sm" variant={expenseView === "monthly" ? "secondary" : "ghost"} className="h-7 px-2 text-[11px]" onClick={() => setExpenseView("monthly")}>Monthly</Button>
                <Button size="sm" variant={expenseView === "yearly" ? "secondary" : "ghost"} className="h-7 px-2 text-[11px]" onClick={() => setExpenseView("yearly")}>Yearly</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {!hasExpenses ? <BusinessEmptyState label="No tracked expense data yet" /> : expenseView === "monthly" ? (
              monthlyExpenseChartData.length === 0 ? <BusinessEmptyState label="No monthly expense data yet" /> : (
                 <>
                   <ResponsiveContainer width="100%" height={245}>
                     <BarChart data={monthlyExpenseChartData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                       <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                       <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 11 }} />
                       <Tooltip formatter={(value: any) => money(Number(value))} />
                       {monthlyExpenseSeries.map((series, index) => (
                         <Bar
                           key={series.key}
                           dataKey={series.key}
                           name={series.label}
                           stackId="expenses"
                           fill={series.color}
                           radius={index === monthlyExpenseSeries.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                         />
                       ))}
                     </BarChart>
                   </ResponsiveContainer>
                   <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                     {monthlyExpenseSeries.map((series) => (
                       <span key={series.key} className="flex items-center gap-1.5">
                         <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                         {series.label}
                       </span>
                     ))}
                   </div>
                 </>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expenseMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4} stroke="none">
                      {expenseMix.map((item: { name: string; value: number; color: string }) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {expenseCategories.map((item: any, index: number) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: expenseMix[index].color }} />{item.label}</span><span className="font-semibold">{money(item.amount)}</span></div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 border-t border-zinc-800/70 pt-3 text-xs text-muted-foreground">Tracked / estimated total: <span className="font-semibold text-foreground">{money(expenses.tracked12Months)}</span></div>
          </CardContent>
        </Card>

      </div>

      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
            <div>
              <p className="text-sm font-semibold">Expense coverage</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {showSimulated
                  ? "All values in this preview are illustrative, including infrastructure costs. They are not written to the database."
                  : "Coach P costs are tracked from token usage. Stripe fees are estimated. Replit hosting, object storage, and database usage require a billing/usage source that is not available through the app database yet."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessKpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
  trendLabel = "MoM",
  cycleHint,
  onClick,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  accent: "orange" | "purple" | "blue" | "red";
  trend?: { value: number; positive: boolean } | null;
  trendLabel?: string;
  cycleHint?: string;
  onClick?: () => void;
}) {
  const styles = {
    orange: {
      card: "border-orange-400/45 bg-orange-500/10 shadow-[0_0_34px_-12px_rgba(249,115,22,0.95)] hover:border-orange-300/70 hover:bg-orange-500/15 hover:shadow-[0_0_42px_-10px_rgba(249,115,22,1)]",
      icon: "bg-orange-500/20 text-orange-200",
    },
    purple: {
      card: "border-purple-400/45 bg-purple-500/10 shadow-[0_0_34px_-12px_rgba(168,85,247,0.95)] hover:border-purple-300/70 hover:bg-purple-500/15 hover:shadow-[0_0_42px_-10px_rgba(168,85,247,1)]",
      icon: "bg-purple-500/20 text-purple-200",
    },
    blue: {
      card: "border-sky-400/45 bg-sky-500/10 shadow-[0_0_34px_-12px_rgba(56,189,248,0.95)] hover:border-sky-300/70 hover:bg-sky-500/15 hover:shadow-[0_0_42px_-10px_rgba(56,189,248,1)]",
      icon: "bg-sky-500/20 text-sky-200",
    },
    red: {
      card: "border-red-400/45 bg-red-500/10 shadow-[0_0_34px_-12px_rgba(239,68,68,0.95)] hover:border-red-300/70 hover:bg-red-500/15 hover:shadow-[0_0_42px_-10px_rgba(239,68,68,1)]",
      icon: "bg-red-500/20 text-red-200",
    },
  };
  const card = (
    <Card className={`transition ${styles[accent].card} ${onClick ? "hover:-translate-y-0.5" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <div className={`rounded-lg p-2 ${styles[accent].icon}`}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {trend ? (
            <span className={trend.positive ? "flex items-center gap-1 font-semibold text-emerald-400" : "flex items-center gap-1 font-semibold text-red-400"}>
              {trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trend.value.toFixed(1)}% {trendLabel}
            </span>
          ) : <span className="text-muted-foreground">No prior trend</span>}
          <span className="text-muted-foreground">{sub}</span>
        </div>
        {cycleHint && <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">{cycleHint}</p>}
      </CardContent>
    </Card>
  );
  return onClick ? <button type="button" className="block w-full text-left" onClick={onClick}>{card}</button> : card;
}

function BusinessEmptyState({ label }: { label: string }) {
  return <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-muted-foreground">{label}</div>;
}

function ActivityAnalyticsSubTab() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/activity", selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/analytics/activity?period=${encodeURIComponent(selectedPeriod)}`);
      return response.json();
    },
  });
  const periods = data?.periods ?? [];
  const selected = periods.find((period: any) => period.key === selectedPeriod) ?? periods[2];
  const number = (value: number | null | undefined) => Number(value || 0).toLocaleString();
  const minutes = (value: number | null | undefined) => `${Number(value || 0).toLocaleString()} min`;
  const tierStyles: Record<string, { label: string; text: string; bar: string }> = {
    low: { label: "Low", text: "text-zinc-300", bar: "bg-zinc-500" },
    medium: { label: "Medium", text: "text-amber-300", bar: "bg-amber-400" },
    high: { label: "High", text: "text-emerald-300", bar: "bg-emerald-400" },
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !selected) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="font-semibold">Activity analytics could not load</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const cohortRows = ["low", "medium", "high"].map((key) => ({
    key,
    ...tierStyles[key],
    ...(selected.cohorts?.[key] ?? {}),
  }));
  const previous = selected.previousWindow;
  const topArea = data?.areas?.[0];
  const highShare = Number(selected.cohorts?.high?.userShare || 0);
  const mediumShare = Number(selected.cohorts?.medium?.userShare || 0);
  const perUser = (value: number) => selected.activeUsers > 0 ? value / selected.activeUsers : 0;
  const scoreTrend = previous && previous.averageScore > 0
    ? { value: Math.abs(previous.scoreDelta / previous.averageScore) * 100, positive: previous.scoreDelta >= 0 }
    : null;
  const scoreChart = periods.map((period: any) => ({
    label: period.key === "lifetime" ? "All time" : period.label.replace("Past ", ""),
    score: Number(period.averageScore || 0),
    activeUsers: Number(period.activeUsers || 0),
  }));
  const mixChart = [{
    name: "Users",
    low: Number(selected.cohorts?.low?.users || 0),
    medium: Number(selected.cohorts?.medium?.users || 0),
    high: Number(selected.cohorts?.high?.users || 0),
  }];
  const gradeStyles: Record<string, { card: string; text: string; badge: string; glow: string }> = {
    A: { card: "border-emerald-400/50 bg-emerald-500/12", text: "text-emerald-300", badge: "bg-emerald-400 text-emerald-950", glow: "shadow-[0_0_50px_-18px_rgba(52,211,153,1)]" },
    B: { card: "border-sky-400/50 bg-sky-500/12", text: "text-sky-300", badge: "bg-sky-400 text-sky-950", glow: "shadow-[0_0_50px_-18px_rgba(56,189,248,1)]" },
    C: { card: "border-amber-400/50 bg-amber-500/12", text: "text-amber-300", badge: "bg-amber-300 text-amber-950", glow: "shadow-[0_0_50px_-18px_rgba(251,191,36,1)]" },
    D: { card: "border-orange-400/50 bg-orange-500/12", text: "text-orange-300", badge: "bg-orange-400 text-orange-950", glow: "shadow-[0_0_50px_-18px_rgba(249,115,22,1)]" },
    F: { card: "border-red-400/50 bg-red-500/12", text: "text-red-300", badge: "bg-red-400 text-red-950", glow: "shadow-[0_0_50px_-18px_rgba(239,68,68,1)]" },
  };
  const selectedGrade = gradeStyles[selected.grade] ?? gradeStyles.C;
  const story = selected.health === "Healthy"
    ? `This is a healthy ${selected.label.toLowerCase()}: ${number(selected.activeUsers)} players created ${number(selected.totalActions)} meaningful actions across ${number(selected.totalOpens)} opens.`
    : selected.health === "Building momentum"
      ? `Momentum is building over ${selected.label.toLowerCase()}. Players are returning, but the product has room to turn more light usage into deeper sessions.`
      : `${selected.label} needs attention. Activity is concentrated in lighter users, so the next opportunity is bringing players back and helping them reach a meaningful action.`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {periods.map((period: any) => (
          <button
            key={period.key}
            type="button"
            onClick={() => setSelectedPeriod(period.key)}
            className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${gradeStyles[period.grade]?.card ?? gradeStyles.C.card} ${gradeStyles[period.grade]?.glow ?? ""} ${selectedPeriod === period.key ? "ring-2 ring-white/70 ring-offset-2 ring-offset-background" : "opacity-75 hover:opacity-100"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">{period.label.replace("Past ", "")}</span>
              <span className={`rounded-md px-2 py-0.5 text-xs font-black ${gradeStyles[period.grade]?.badge ?? gradeStyles.C.badge}`}>{period.grade ?? "—"}</span>
            </div>
            <p className={`mt-4 text-3xl font-black ${gradeStyles[period.grade]?.text ?? gradeStyles.C.text}`}>{Number(period.averageScore || 0).toFixed(0)}</p>
            <p className="mt-1 text-xs text-zinc-300/70">{Number(period.activeUsers || 0).toLocaleString()} active players</p>
          </button>
        ))}
      </div>

      <Card className={`overflow-hidden border ${selectedGrade.card} ${selectedGrade.glow}`}>
        <CardContent className="relative p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${selectedGrade.badge}`}>Activity health</span>
                <span className="text-sm text-zinc-300">{selected.label}</span>
              </div>
              <div className="mt-4 flex items-end gap-4">
                <span className={`text-7xl font-black leading-none ${selectedGrade.text}`}>{selected.grade}</span>
                <div className="pb-1">
                  <p className="text-2xl font-bold">{selected.health}</p>
                  <p className="text-sm text-zinc-300/80">{story}</p>
                </div>
              </div>
              {previous && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${previous.scoreDelta >= 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200"}`}>
                    {previous.scoreDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {Math.abs(previous.scoreDelta).toFixed(1)} pts vs previous window
                  </span>
                  <span className="text-zinc-300/70">{number(previous.activeUsers)} active players in the prior matching window</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-5">
              <div className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-8 border-white/15 bg-zinc-950/35 ${selectedGrade.text}`}>
                <span className="text-4xl font-black">{Number(selected.averageScore || 0).toFixed(0)}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300">out of 100</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BusinessKpi label="Active players" value={number(selected.activeUsers)} sub={`${number(perUser(selected.totalOpens))} opens per player`} icon={Users} accent="orange" trend={previous ? { value: Math.abs(previous.activeUsersDelta / Math.max(previous.activeUsers, 1)) * 100, positive: previous.activeUsersDelta >= 0 } : null} trendLabel="vs prior" />
        <BusinessKpi label="Meaningful actions" value={number(selected.totalActions)} sub={`${perUser(selected.totalActions).toFixed(1)} actions per player`} icon={Zap} accent="purple" trend={previous ? { value: Math.abs(previous.actionsDelta / Math.max(previous.totalActions - previous.actionsDelta, 1)) * 100, positive: previous.actionsDelta >= 0 } : null} trendLabel="vs prior" />
        <BusinessKpi label="Estimated usage" value={minutes(selected.estimatedMinutes)} sub={`${perUser(selected.estimatedMinutes).toFixed(1)} minutes per player`} icon={Clock} accent="blue" trend={previous ? { value: Math.abs((selected.estimatedMinutes - previous.estimatedMinutes) / Math.max(previous.estimatedMinutes, 1)) * 100, positive: selected.estimatedMinutes >= previous.estimatedMinutes } : null} trendLabel="vs prior" />
        <BusinessKpi label="Deep-use players" value={`${highShare.toFixed(1)}%`} sub={`${mediumShare.toFixed(1)}% are building momentum`} icon={Trophy} accent="red" trend={scoreTrend} trendLabel="score vs prior" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-3">
            <CardTitle className="text-base">Is activity improving?</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Average activity health across each time window.</p>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={scoreChart} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: any, name: string) => [name === "score" ? `${Number(value).toFixed(0)} / 100` : number(Number(value)), name === "score" ? "Health score" : "Active players"]} />
                <Bar dataKey="score" name="Health score" radius={[7, 7, 0, 0]}>
                  {scoreChart.map((period: any) => <Cell key={period.label} fill={gradeStyles[periods.find((item: any) => item.label.replace("Past ", "") === period.label)?.grade]?.text === "text-emerald-300" ? "#34d399" : "#f97316"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-3">
            <CardTitle className="text-base">Who is carrying the activity?</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">The mix behind the {selected.grade} grade.</p>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={mixChart} layout="vertical" stackOffset="expand" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(value: any) => number(Number(value))} />
                <Bar dataKey="low" stackId="mix" fill="#71717a" name="Low" />
                <Bar dataKey="medium" stackId="mix" fill="#fbbf24" name="Medium" />
                <Bar dataKey="high" stackId="mix" fill="#34d399" name="High" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {cohortRows.map((cohort) => <div key={cohort.key}><span className={`mx-auto mb-1 block h-2 w-2 rounded-full ${cohort.bar}`} /><p className="font-semibold">{number(cohort.users)}</p><p className="text-muted-foreground">{cohort.label}</p></div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
        <CardHeader className="border-b border-zinc-800/70 pb-4">
          <CardTitle className="text-base">What is driving the score?</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{topArea ? `${topArea.area} is the busiest area with ${number(topArea.events)} events and ${number(topArea.uniqueUsers)} unique players.` : "Area data will appear as players use the product."}</p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-zinc-900/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Area</th>
                <th className="px-3 py-3 text-right font-medium">Events</th>
                <th className="px-3 py-3 text-right font-medium">Share</th>
                <th className="px-3 py-3 text-right font-medium">Unique users</th>
                <th className="px-3 py-3 text-right font-medium">Page views</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
                <th className="px-3 py-3 text-right font-medium">Event types</th>
                <th className="px-5 py-3 text-right font-medium">Screens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {(data.areas ?? []).map((area: any) => (
                <tr key={area.area}>
                  <td className="px-5 py-3 font-medium">{area.area}</td>
                  <td className="px-3 py-3 text-right">{number(area.events)}</td>
                  <td className="px-3 py-3 text-right text-orange-300">{Number(area.eventShare || 0).toFixed(1)}%</td>
                  <td className="px-3 py-3 text-right">{number(area.uniqueUsers)}</td>
                  <td className="px-3 py-3 text-right">{number(area.pageViews)}</td>
                  <td className="px-3 py-3 text-right">{number(area.actions)}</td>
                  <td className="px-3 py-3 text-right">{number(area.eventTypes)}</td>
                  <td className="px-5 py-3 text-right">{number(area.pages)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <CardTitle className="text-base">Most-used actions and events</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Every tracked event, including page views and meaningful actions.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-800/70">
              {(data.topEvents ?? []).slice(0, 15).map((event: any, index: number) => (
                <div key={event.event} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{event.event}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{number(event.uniqueUsers)} users</span>
                  <span className="shrink-0 text-sm font-semibold text-orange-300">{number(event.events)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <CardTitle className="text-base">Most-used screens</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Page views and unique users for each tracked route.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-800/70">
              {(data.topPages ?? []).slice(0, 15).map((page: any, index: number) => (
                <div key={page.page} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{page.page}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{number(page.uniqueUsers)} users</span>
                  <span className="shrink-0 text-sm font-semibold text-sky-300">{number(page.views)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="flex flex-col gap-3 p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">How the grade is calculated</p>
            <p className="mt-1 text-xs text-muted-foreground">40% opens · 30% estimated usage minutes · 30% meaningful actions. {data.durationMethod}</p>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground"><span className="font-semibold text-zinc-200">A:</span> 80+ · <span className="font-semibold text-sky-200">B:</span> 65+ · <span className="font-semibold text-amber-200">C:</span> 50+</div>
        </CardContent>
      </Card>

    </div>
  );
}

function AreasAnalyticsSubTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/analytics"] });
  const topPages = data?.topPages ?? [];
  const viewedDrills = data?.viewedDrills ?? [];
  const viewedPrograms = data?.viewedPrograms ?? [];
  return (
    <div className="space-y-6">
      <AnalyticsSectionIntro
        eyebrow="Areas of the app"
        title="Which screens and actions earn attention"
        description="Use page views, unique users, and meaningful actions to understand what players actually use—not just what they open."
      />
      {isLoading ? <Skeleton className="h-80 w-full rounded-xl" /> : (
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            { title: "Most visited screens", rows: topPages, name: (row: any) => row.page, value: (row: any) => `${row.count.toLocaleString()} views` },
            { title: "Most viewed drills", rows: viewedDrills, name: (row: any) => row.title, value: (row: any) => `${row.views.toLocaleString()} views` },
            { title: "Most viewed programs", rows: viewedPrograms, name: (row: any) => row.name, value: (row: any) => `${row.views.toLocaleString()} views` },
          ].map((section) => (
            <Card key={section.title} className="border-zinc-800/80 bg-zinc-950/50">
              <CardHeader className="pb-3"><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
              <CardContent className="p-0">
                {section.rows.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No usage data yet.</p> : (
                  <div className="divide-y divide-zinc-800/70">
                    {section.rows.slice(0, 8).map((row: any, index: number) => (
                      <div key={row.id ?? row.page ?? index} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{section.name(row)}</span>
                        <span className="shrink-0 text-xs font-medium text-orange-400">{section.value(row)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="p-5">
          <p className="text-sm font-medium">Next measurement layer</p>
          <p className="mt-1 text-sm text-muted-foreground">Pair views with actions—starting a workout, saving a drill, joining a program, and completing a session—so popular does not get confused with useful.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CommunityAnalyticsSubTab() {
  const { data, isLoading, isError } = useQuery<any>({ queryKey: ["/api/admin/analytics/community"] });
  const formatNumber = (value: unknown) => Number(value || 0).toLocaleString();
  const formatAverage = (value: unknown) => Number(value || 0).toFixed(1);
  const formatPercent = (value: unknown) => `${Number(value || 0).toFixed(1)}%`;
  const periods = data?.periods ?? [];
  const maxGoalPlayers = Math.max(...(data?.goalTypes ?? []).map((row: any) => Number(row.players || 0)), 1);

  return (
    <div className="space-y-6" data-testid="section-community-analytics">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Community pulse</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Connection, accountability, and discovery</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">See how players connect, follow, and show up for shared challenges across the app.</p>
        </div>
        <Badge variant="outline" className="border-orange-300/25 bg-orange-400/10 text-orange-200">Live relationship + challenge data</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <Card><CardContent className="py-12 text-center text-sm text-destructive">Couldn’t load Community analytics.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <TrainingMetricCard label="Total users" value={formatNumber(data.totals.totalUsers)} sub="accounts across PLAYR1" icon={Users} accent="orange" />
            <TrainingMetricCard label="Friendships" value={formatNumber(data.totals.totalFriendships)} sub="accepted two-way connections" icon={UserCheck} accent="blue" />
            <TrainingMetricCard label="Follows" value={formatNumber(data.totals.totalFollows)} sub="directional relationships" icon={UserPlus} accent="purple" />
            <TrainingMetricCard label="Active challenges" value={formatNumber(data.challenges.active)} sub={`${formatNumber(data.challenges.all)} total challenges`} icon={Flame} accent="green" />
            <TrainingMetricCard label="Public challenges" value={formatNumber(data.challenges.public)} sub="open for discovery" icon={Globe} accent="orange" />
            <TrainingMetricCard label="Completion rate" value={formatPercent(data.challenges.completionRate)} sub={`${formatNumber(data.challenges.completions)} players finished`} icon={Trophy} accent="blue" />
            <TrainingMetricCard label="Feedback posts" value={formatNumber(data.feedback?.total)} sub="player-submitted ideas and issues" icon={MessageCircle} accent="purple" />
          </div>

          <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
            <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
              <CardTitle className="text-base tracking-tight">Relationship growth</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">New accepted friendships and follows created inside each reporting window.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-5">Window</TableHead><TableHead>Friendships</TableHead><TableHead>Follows</TableHead><TableHead>Friending users</TableHead><TableHead className="pr-5">Following users</TableHead></TableRow></TableHeader>
                <TableBody>
                  {periods.map((period: any) => (
                    <TableRow key={period.key} className={period.key === "lifetime" ? "bg-orange-400/[0.04]" : undefined}>
                      <TableCell className={`pl-5 font-medium ${period.key === "lifetime" ? "text-orange-200" : ""}`}>{period.label}</TableCell>
                      <TableCell>{formatNumber(period.friendships)}</TableCell>
                      <TableCell>{formatNumber(period.follows)}</TableCell>
                      <TableCell className="text-zinc-400">{formatNumber(period.activeFriendingUsers)}</TableCell>
                      <TableCell className="pr-5 text-zinc-400">{formatNumber(period.activeFollowingUsers)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
              <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
                <CardTitle className="text-base tracking-tight">Network per user</CardTitle>
                <p className="mt-1 text-xs text-zinc-500">Current relationship averages across the full user base.</p>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                {[
                  ["Friends per user", data.perUser.friends, data.perUser.maxFriends, "text-orange-200"],
                  ["Follows per user", data.perUser.follows, data.perUser.maxFollows, "text-sky-200"],
                  ["Followers per user", data.perUser.followers, data.perUser.maxFollowers, "text-violet-200"],
                ].map(([label, average, max, color]) => (
                  <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{label}</p>
                    <p className={`mt-3 text-3xl font-black tracking-tight ${color}`}>{formatAverage(average)}</p>
                    <p className="mt-1 text-xs text-zinc-500">max player: {formatNumber(max)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
              <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
                <CardTitle className="text-base tracking-tight">Challenge pulse</CardTitle>
                <p className="mt-1 text-xs text-zinc-500">Participation and completion across group challenges.</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 p-4">
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3"><p className="text-xs text-zinc-500">Players joined</p><p className="mt-2 text-2xl font-black text-emerald-200">{formatNumber(data.challenges.players)}</p></div>
                <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] p-3"><p className="text-xs text-zinc-500">Avg players / challenge</p><p className="mt-2 text-2xl font-black text-sky-200">{formatAverage(data.challenges.averagePlayers)}</p></div>
                <div className="rounded-2xl border border-orange-300/15 bg-orange-400/[0.06] p-3"><p className="text-xs text-zinc-500">Active avg players</p><p className="mt-2 text-2xl font-black text-orange-200">{formatAverage(data.challenges.activeAveragePlayers)}</p></div>
                <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] p-3"><p className="text-xs text-zinc-500">Active completion</p><p className="mt-2 text-2xl font-black text-violet-200">{formatPercent(data.challenges.activeCompletionRate)}</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
              <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4"><CardTitle className="text-base tracking-tight">Challenge goals</CardTitle><p className="mt-1 text-xs text-zinc-500">Which types of work players choose to do together.</p></CardHeader>
              <CardContent className="space-y-4 p-5">
                {(data.goalTypes ?? []).map((row: any) => (
                  <div key={row.goalType}>
                    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{row.label}</span><span className="text-xs text-zinc-500">{formatNumber(row.players)} players · {formatPercent(row.completionRate)}</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${Math.max(4, (Number(row.players || 0) / maxGoalPlayers) * 100)}%` }} /></div>
                    <p className="mt-1 text-[11px] text-zinc-600">{formatNumber(row.challenges)} challenges · {formatAverage(row.avgPlayers)} average players</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
              <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4"><CardTitle className="text-base tracking-tight">Challenge audience</CardTitle><p className="mt-1 text-xs text-zinc-500">Where shared challenges start and how they perform.</p></CardHeader>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                {(data.audiences ?? []).map((row: any) => (
                  <div key={row.audience} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <p className="text-xs font-semibold text-zinc-300">{row.label}</p>
                    <p className="mt-3 text-2xl font-black text-orange-200">{formatNumber(row.challenges)}</p>
                    <p className="text-[11px] text-zinc-500">challenges</p>
                    <div className="mt-4 flex items-end justify-between gap-2 text-xs"><span className="text-zinc-500">{formatNumber(row.players)} players</span><span className="font-semibold text-emerald-300">{formatPercent(row.completionRate)}</span></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
            <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
              <CardTitle className="text-base tracking-tight">Feedback post status</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">How player feedback is distributed across the product review pipeline.</p>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
              {(data.feedback?.byStatus ?? []).map((row: any) => {
                const statusStyles: Record<string, string> = {
                  open: "border-sky-300/20 bg-sky-400/[0.07] text-sky-200",
                  "in-review": "border-orange-300/20 bg-orange-400/[0.07] text-orange-200",
                  planned: "border-violet-300/20 bg-violet-400/[0.07] text-violet-200",
                  done: "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-200",
                  closed: "border-zinc-300/15 bg-zinc-400/[0.06] text-zinc-300",
                };
                return (
                  <div key={row.status} className={`rounded-2xl border p-4 ${statusStyles[row.status] || statusStyles.open}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-75">{row.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight">{formatNumber(row.count)}</p>
                    <p className="mt-1 text-[11px] opacity-60">feedback posts</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-orange-300/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.10),rgba(24,24,27,0.35))]">
            <CardContent className="flex gap-3 p-5">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,0.8)]" />
              <div><p className="text-sm font-semibold">How to read this dashboard</p><p className="mt-1 text-xs leading-5 text-zinc-400">Friendships count accepted two-way connections. Follows remain directional. Challenge completion is completed accepted participants divided by accepted participants, using each challenge’s goal amount.</p></div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CoachPAndJournalAnalyticsSubTab() {
  return (
    <div className="space-y-8">
      <CoachPAnalyticsSubTab />
      <div className="border-t border-zinc-800/80 pt-8">
        <JournalPromptAnalyticsSubTab />
      </div>
    </div>
  );
}

function JournalPromptAnalyticsSubTab() {
  const { data: prompts, isLoading, isError } = useQuery<Array<{ id: string; category: string; question: string; votes: number }>>({
    queryKey: ["/api/admin/journal/prompt-analytics"],
  });
  const categoryLabel: Record<string, string> = {
    "post-workout": "Practice / workout",
    "post-game": "Game",
    open: "Open",
  };
  const totalVotes = prompts?.reduce((sum, prompt) => sum + prompt.votes, 0) || 0;
  return (
    <div className="space-y-6" data-testid="section-journal-prompt-analytics">
      <div>
        <h2 className="text-lg font-semibold">Journal prompt preferences</h2>
        <p className="text-sm text-muted-foreground">See which reflection questions players choose to upvote.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total upvotes</p><p className="mt-1 text-2xl font-semibold">{totalVotes}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Questions with votes</p><p className="mt-1 text-2xl font-semibold">{prompts?.filter((prompt) => prompt.votes > 0).length || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Most preferred</p><p className="mt-1 line-clamp-2 text-sm font-medium">{prompts?.find((prompt) => prompt.votes > 0)?.question || "No votes yet"}</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="pt-5">
          {isLoading ? <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div> : isError ? <p className="py-8 text-center text-sm text-destructive">Couldn’t load Journal prompt analytics.</p> : (
            <div className="space-y-2">
              {prompts?.map((prompt, index) => (
                <div key={prompt.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <span className="w-6 shrink-0 text-sm text-muted-foreground">#{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm">{prompt.question}</p><p className="mt-1 text-xs text-muted-foreground">{categoryLabel[prompt.category] || prompt.category}</p></div>
                  <Badge variant={prompt.votes > 0 ? "default" : "outline"}>{prompt.votes} {prompt.votes === 1 ? "upvote" : "upvotes"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCoachPCost(value: number) {
  if (!value) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatCoachPTokens(value: number) {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K` : value.toLocaleString();
}

function CoachPAnalyticsSubTab() {
  const [days, setDays] = useState("30");
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/coach-p", days],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/analytics/coach-p?days=${days}`);
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn’t load Coach P analytics</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const summary = data.summary;
  const daily = data.daily ?? [];
  const maxDailyCost = Math.max(0.0001, ...daily.map((row: any) => Number(row.estimatedCostUsd || 0)));

  return (
    <div className="space-y-6" data-testid="section-coach-p-analytics">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Coach P Usage & Cost</h2>
          <p className="text-sm text-muted-foreground">
            Provider-cost estimates from recorded token usage. Conversation text is not shown here.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]" data-testid="select-coach-p-analytics-window"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <AccentStatCard label="Estimated cost" value={formatCoachPCost(summary.estimatedCostUsd)} sub={`${data.windowDays}-day window`} icon={Calculator} accent="orange" testId="stat-coach-p-cost" />
        <AccentStatCard label="Requests" value={summary.requests.toLocaleString()} sub={`${summary.chatRequests} chats · ${summary.summaryRequests} summaries`} icon={Activity} accent="blue" testId="stat-coach-p-requests" />
        <AccentStatCard label="Total tokens" value={formatCoachPTokens(summary.totalTokens)} sub={`${formatCoachPTokens(summary.promptTokens)} input · ${formatCoachPTokens(summary.completionTokens)} output`} icon={Hash} accent="purple" testId="stat-coach-p-tokens" />
        <AccentStatCard label="Avg response" value={`${Math.round(summary.avgTotalMs).toLocaleString()} ms`} sub={`${Math.round(summary.avgModelMs).toLocaleString()} ms model time`} icon={Clock} accent="green" testId="stat-coach-p-latency" />
        <AccentStatCard label="Errors" value={summary.errorRequests.toLocaleString()} sub={`${summary.completedRequests} completed`} icon={AlertTriangle} accent="orange" testId="stat-coach-p-errors" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daily cost and token usage</CardTitle></CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No Coach P usage recorded in this window yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily.map((row: any) => ({
                day: new Date(row.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                cost: Number(row.estimatedCostUsd || 0),
                tokens: Number(row.totalTokens || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="cost" tickFormatter={(value) => `$${Number(value).toFixed(2)}`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="tokens" orientation="right" tickFormatter={(value) => formatCoachPTokens(Number(value))} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any, name: string) => name === "Estimated cost" ? formatCoachPCost(Number(value)) : formatCoachPTokens(Number(value))} />
                <Line yAxisId="cost" type="monotone" dataKey="cost" name="Estimated cost" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line yAxisId="tokens" type="monotone" dataKey="tokens" name="Tokens" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {daily.length > 0 && (
            <div className="mt-4 space-y-2">
              {daily.slice(-10).reverse().map((row: any) => (
                <div key={row.day} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-muted-foreground">{new Date(row.day).toLocaleDateString()}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(2, (Number(row.estimatedCostUsd || 0) / maxDailyCost) * 100)}%` }} />
                  </div>
                  <span className="w-16 text-right font-medium">{formatCoachPCost(Number(row.estimatedCostUsd || 0))}</span>
                  <span className="w-16 text-right text-muted-foreground">{formatCoachPTokens(Number(row.totalTokens || 0))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">By model</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Requests</TableHead><TableHead>Tokens</TableHead><TableHead>Cached input</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.byModel ?? []).map((row: any) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-medium">{row.model}</TableCell>
                    <TableCell>{row.requests.toLocaleString()}</TableCell>
                    <TableCell>{formatCoachPTokens(row.totalTokens)}</TableCell>
                    <TableCell>{formatCoachPTokens(row.cachedPromptTokens || 0)}</TableCell>
                    <TableCell className="text-right">{formatCoachPCost(row.estimatedCostUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By coaching context</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Context</TableHead><TableHead>Requests</TableHead><TableHead>Avg ms</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.byMode ?? []).map((row: any) => (
                  <TableRow key={row.mode}>
                    <TableCell className="font-medium capitalize">{row.mode}</TableCell>
                    <TableCell>{row.requests.toLocaleString()}</TableCell>
                    <TableCell>{Math.round(row.avgTotalMs).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCoachPCost(row.estimatedCostUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Highest Coach P usage by player</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Player</TableHead><TableHead>Email</TableHead><TableHead>Requests</TableHead><TableHead>Tokens</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data.topUsers ?? []).map((row: any) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.email || "—"}</TableCell>
                  <TableCell>{row.requests.toLocaleString()}</TableCell>
                  <TableCell>{formatCoachPTokens(row.totalTokens)}</TableCell>
                  <TableCell className="text-right">{formatCoachPCost(row.estimatedCostUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Overview Sub-Tab (existing widgets + Top Movers) ──────────────────────

function OverviewSubTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics");
      return res.json();
    },
  });

  const { data: movers } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/movers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/movers");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const {
    totals, usersByWeek, logsByWeek, popularDrills, usersByRole, topActiveUsers,
    recentSignups, sessionsByStatus, categoryBreakdown, activityByWeek = [],
    viewedDrills = [], viewedPrograms = [], topPages = [],
  } = data;

  const weekLabel = (w: string) => {
    const d = new Date(w);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">App Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={totals.users} icon={Users} />
          <StatCard label="Active (7 days)" value={totals.activeUsers7d} sub="unique users with app activity" icon={Activity} />
          <StatCard label="Active (30 days)" value={totals.activeUsers30d} sub="unique users with app activity" icon={TrendingUp} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Training Behavior</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Training Logs" value={totals.trainingLogs} sub="completed workout entries" icon={BarChart2} />
          <StatCard label="Sessions Booked" value={totals.sessions} icon={UserCheck} />
          <StatCard label="Connections" value={totals.connections} icon={Users} />
          <StatCard label="Feedback Posts" value={totals.feedbackPosts} icon={Activity} />
        </div>
      </div>

      {/* Top Movers — Week-over-Week change */}
      <TopMoversWidget movers={movers || []} />

      {/* App Activity Chart */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">App Activity (Last 12 Weeks)</h2>
          <p className="text-xs text-muted-foreground">Authenticated events and unique active users</p>
        </div>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={activityByWeek.map((r: any) => ({ week: weekLabel(r.week), events: r.events, activeUsers: r.activeUsers }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Line type="monotone" dataKey="events" name="App Events" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <div>
        <h2 className="text-lg font-semibold mb-3">User Signups (Last 12 Weeks)</h2>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={usersByWeek.map((r: any) => ({ week: weekLabel(r.week), count: r.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="count" name="New Users" fill="#f97316" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Training Log Activity Chart */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Training Logs (Last 12 Weeks)</h2>
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={logsByWeek.map((r: any) => ({ week: weekLabel(r.week), count: r.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" name="Logs" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* App content usage */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">What Users Are Exploring</h2>
          <p className="text-xs text-muted-foreground">Views and unique users in the last 28 days</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b font-medium">Popular Screens</div>
              <Table>
                <TableBody>
                  {topPages.slice(0, 6).map((p: any) => (
                    <TableRow key={p.page}>
                      <TableCell className="pl-4 text-sm truncate max-w-[220px]">{p.page}</TableCell>
                      <TableCell className="text-right pr-4">{p.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {topPages.length === 0 && <TableRow><TableCell className="text-center py-6 text-muted-foreground">No activity yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b font-medium">Most Viewed Drills</div>
              <Table>
                <TableBody>
                  {viewedDrills.slice(0, 6).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="pl-4 text-sm">{d.title}</TableCell>
                      <TableCell className="text-right pr-4">{d.views.toLocaleString()} <span className="text-xs text-muted-foreground">views</span></TableCell>
                    </TableRow>
                  ))}
                  {viewedDrills.length === 0 && <TableRow><TableCell className="text-center py-6 text-muted-foreground">No drill views yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b font-medium">Most Viewed Programs</div>
              <Table>
                <TableBody>
                  {viewedPrograms.slice(0, 6).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4 text-sm">{p.name}</TableCell>
                      <TableCell className="text-right pr-4">{p.views.toLocaleString()} <span className="text-xs text-muted-foreground">views</span></TableCell>
                    </TableRow>
                  ))}
                  {viewedPrograms.length === 0 && <TableRow><TableCell className="text-center py-6 text-muted-foreground">No program views yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two columns: role breakdown + drill categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Users by Role</h2>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} label={({ role, count }) => `${role} (${count})`}>
                    {usersByRole.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Top Drill Categories</h2>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryBreakdown.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="count" name="Logs" fill="#3b82f6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Session Status */}
      {sessionsByStatus.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Session Status Breakdown</h2>
          <div className="flex gap-3 flex-wrap">
            {sessionsByStatus.map((s: any, i: number) => (
              <Card key={s.status} className="flex-1 min-w-[120px]">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{s.count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{s.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Popular Drills */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Top 10 Most Practiced Drills (Training)</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">#</TableHead>
                  <TableHead>Drill</TableHead>
                  <TableHead className="text-right pr-4">Log Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popularDrills.map((d: any, i: number) => (
                  <TableRow key={d.title} data-testid={`row-drill-${i}`}>
                    <TableCell className="pl-4 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-right pr-4">{d.count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {popularDrills.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Top Active Users */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Most Active Users by Training Logs</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right pr-4">Training Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topActiveUsers.map((u: any, i: number) => (
                  <TableRow key={u.email} data-testid={`row-user-${i}`}>
                    <TableCell className="pl-4 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-right pr-4">{u.logs.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {topActiveUsers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Signups</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right pr-4">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.map((u: any, i: number) => (
                  <TableRow key={u.email + i} data-testid={`row-signup-${i}`}>
                    <TableCell className="pl-4 font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4 text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Top Movers Widget (week-over-week change) ─────────────────────────────

function TopMoversWidget({ movers }: { movers: any[] }) {
  if (!movers || movers.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold">Top Movers</h2>
        <p className="text-xs text-muted-foreground">Week-over-week change · sorted by impact</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {movers.slice(0, 8).map((m: any) => {
          const isUp = m.deltaPct > 0;
          const isFlat = m.deltaPct === 0;
          const color = isFlat ? "text-muted-foreground" : isUp ? "text-green-500" : "text-red-500";
          const Icon = isFlat ? Activity : isUp ? TrendingUp : TrendingDown;
          return (
            <Card key={m.metric} data-testid={`mover-${m.metric.replace(/\s+/g, "-").toLowerCase()}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">{m.metric}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold">{m.thisWeek.toLocaleString()}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-sm font-semibold ${color}`}>
                    {isUp && "+"}{m.deltaPct}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs {m.lastWeek.toLocaleString()} last wk
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Retention Sub-Tab ─────────────────────────────────────────────────────

function RetentionSubTab() {
  const [retentionMetric, setRetentionMetric] = useState<"rate" | "users">("rate");
  const [powerMetric, setPowerMetric] = useState<"timeShare" | "actionShare" | "raw">("timeShare");
  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/retention"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/retention");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="retention-error-state">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn't load retention data</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-retention">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const { cohort, curves, power } = data;
  const totalUsers = Number(curves.totalUsers || curves.eligibleD30 || 0);

  return (
    <div className="space-y-6">
      {/* D1/D7/D30 Retention */}
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Retention pulse</p>
            <h2 className="mt-1 text-lg font-semibold">Day-N Retention</h2>
            <p className="mt-1 text-sm text-muted-foreground">% of all registered users who returned within N days of their own signup. Click a card to switch between rate and users.</p>
          </div>
          <Badge variant="outline" className="border-sky-400/25 text-sky-200">{retentionMetric === "rate" ? "Showing percentage" : "Showing users"}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <RetentionCard label="Day 1" pct={curves.d1} retained={curves.retainedD1} matured={curves.eligibleD1} totalUsers={totalUsers} icon={Zap} accent="orange" metric={retentionMetric} onToggle={() => setRetentionMetric((current) => current === "rate" ? "users" : "rate")} />
          <RetentionCard label="Day 7" pct={curves.d7} retained={curves.retainedD7} matured={curves.eligibleD7} totalUsers={totalUsers} icon={Flame} accent="blue" metric={retentionMetric} onToggle={() => setRetentionMetric((current) => current === "rate" ? "users" : "rate")} />
          <RetentionCard label="Day 30" pct={curves.d30} retained={curves.retainedD30} matured={curves.eligibleD30} totalUsers={totalUsers} icon={Target} accent="purple" metric={retentionMetric} onToggle={() => setRetentionMetric((current) => current === "rate" ? "users" : "rate")} />
        </div>
      </div>

      {/* Cohort Heatmap */}
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Weekly cohorts</p>
            <h2 className="mt-1 text-lg font-semibold">Cohort activity over time</h2>
            <p className="mt-1 text-sm text-muted-foreground">Each row is a signup week. Each cell shows how many of that cohort were active in the weeks that followed.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Low</span><span className="h-2.5 w-7 rounded-full bg-red-500/70" /><span className="h-2.5 w-7 rounded-full bg-yellow-400/80" /><span className="h-2.5 w-7 rounded-full bg-emerald-400/80" /><span>High</span>
          </div>
        </div>
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardContent className="overflow-x-auto p-4">
            <CohortHeatmap cohorts={cohort.cohorts} maxOffset={cohort.maxOffset} />
          </CardContent>
        </Card>
      </div>

      {/* Power-User Concentration */}
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">Usage concentration</p>
            <h2 className="mt-1 text-lg font-semibold">Power-user concentration</h2>
            <p className="mt-1 text-sm text-muted-foreground">How much of total app time and meaningful activity comes from the most active players.</p>
          </div>
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950/70 p-1">
            {[
              ["timeShare", "% of time"],
              ["actionShare", "% of actions"],
              ["raw", "Raw totals"],
            ].map(([value, label]) => (
              <Button key={value} type="button" size="sm" variant="ghost" onClick={() => setPowerMetric(value as typeof powerMetric)} className={`h-8 px-3 text-xs ${powerMetric === value ? "bg-purple-500/20 text-purple-200 hover:bg-purple-500/25" : "text-muted-foreground"}`}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ConcentrationCard label="Top 1%" stat={power.top1} totalUsers={power.totalUsers} metric={powerMetric} accent="rose" />
          <ConcentrationCard label="Top 10%" stat={power.top10} totalUsers={power.totalUsers} metric={powerMetric} accent="amber" />
          <ConcentrationCard label="Top 25%" stat={power.top25} totalUsers={power.totalUsers} metric={powerMetric} accent="sky" />
          <ConcentrationCard label="Top 50%" stat={power.top50} totalUsers={power.totalUsers} metric={powerMetric} accent="emerald" />
          <ConcentrationCard label="Bottom 25%" stat={power.bottom25} totalUsers={power.totalUsers} metric={powerMetric} accent="slate" />
          <ConcentrationCard label="Bottom 50%" stat={power.bottom50} totalUsers={power.totalUsers} metric={powerMetric} accent="indigo" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Ranked by estimated time in app. Time uses authenticated event spans with a 30-minute inactivity cutoff.</p>
      </div>
    </div>
  );
}

function EngagementAnalyticsSection({ engagement }: { engagement: any }) {
  return (
    <div className="space-y-5 border-t border-zinc-800/70 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Engagement intelligence</p>
          <h2 className="mt-1 text-lg font-semibold">Most engaged and at-risk players</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use these lists to celebrate momentum and prioritize re-engagement.</p>
        </div>
        <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
          Avg score {engagement.avgScore} · {engagement.activeUserCount.toLocaleString()} active
        </Badge>
      </div>

      <Card className="border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-zinc-950/70 to-blue-500/10">
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engagement.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="count" name="Users" radius={[6, 6, 0, 0]}>
                {engagement.distribution.map((_: any, i: number) => (
                  <Cell key={i} fill={["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"][i] || "#666"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            Score (0–100) combines recency, activity frequency, app breadth, and training signals.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EngagementUserList
          title="Most Engaged Users"
          icon={Trophy}
          accent="text-emerald-400"
          users={engagement.topUsers}
          emptyMessage="No engagement data yet"
        />
        <EngagementUserList
          title="At-Risk Users"
          icon={AlertTriangle}
          accent="text-orange-400"
          users={engagement.atRisk}
          emptyMessage="No at-risk users — everyone's engaged!"
          subtitle="Recently active but slipping (score 15–40). Re-engagement candidates."
        />
      </div>
    </div>
  );
}

// ─── Retention helper components ───────────────────────────────────────────

function RetentionCard({ label, pct, retained, matured, totalUsers, icon: Icon, accent, metric, onToggle }: {
  label: string; pct: number; retained?: number; matured?: number; totalUsers?: number; icon: LucideIcon;
  accent: "orange" | "blue" | "purple";
  metric: "rate" | "users";
  onToggle: () => void;
}) {
  const retainedUsers = Number(retained || 0);
  const maturedUsers = Number(matured || 0);
  const allUsers = Number(totalUsers || 0);
  const rate = Number(pct || 0);
  const colorMap = {
    orange: "text-orange-500 bg-orange-500/10",
    blue:   "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  };
  return (
    <button type="button" onClick={onToggle} className="text-left" data-testid={`retention-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Card className="h-full border-zinc-800/80 bg-zinc-950/50 transition hover:-translate-y-0.5 hover:border-sky-400/40">
        <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={`p-2 rounded-lg ${colorMap[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-3xl font-black">{metric === "rate" ? `${rate}%` : retainedUsers.toLocaleString()}</p>
        <p className="mt-1 text-xs text-muted-foreground">{metric === "rate" ? `${retainedUsers.toLocaleString()} of ${allUsers.toLocaleString()} total users` : `${rate}% of ${allUsers.toLocaleString()} total users`}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/75">{maturedUsers.toLocaleString()} users have reached {label}</p>
        <p className="mt-3 text-[11px] font-medium text-sky-300/80">Click to show {metric === "rate" ? "users" : "percentage"}</p>
        </CardContent>
      </Card>
    </button>
  );
}

function ConcentrationCard({ label, stat, totalUsers, metric, accent }: {
  label: string;
  stat?: { userCount?: number; timeShare?: number; actionShare?: number; timeMinutes?: number; actions?: number };
  totalUsers?: number;
  metric: "timeShare" | "actionShare" | "raw";
  accent: "rose" | "amber" | "sky" | "emerald" | "slate" | "indigo";
}) {
  const safeStat = stat ?? {};
  const userCount = Number(safeStat.userCount || 0);
  const totalUserCount = Number(totalUsers || 0);
  const timeShare = Number(safeStat.timeShare || 0);
  const actionShare = Number(safeStat.actionShare || 0);
  const timeMinutes = Number(safeStat.timeMinutes || 0);
  const actions = Number(safeStat.actions || 0);
  const accentStyles = {
    rose: "from-rose-500/20 via-zinc-950/60 to-rose-950/10 text-rose-200",
    amber: "from-amber-400/20 via-zinc-950/60 to-amber-950/10 text-amber-200",
    sky: "from-sky-400/20 via-zinc-950/60 to-sky-950/10 text-sky-200",
    emerald: "from-emerald-400/20 via-zinc-950/60 to-emerald-950/10 text-emerald-200",
    slate: "from-slate-400/20 via-zinc-950/60 to-slate-950/10 text-slate-200",
    indigo: "from-indigo-400/20 via-zinc-950/60 to-indigo-950/10 text-indigo-200",
  };
  const value = metric === "timeShare" ? `${timeShare}%` : metric === "actionShare" ? `${actionShare}%` : `${timeMinutes.toLocaleString()}m`;
  const detail = metric === "timeShare" ? `${timeMinutes.toLocaleString()} minutes` : metric === "actionShare" ? `${actions.toLocaleString()} actions` : `${actions.toLocaleString()} actions`;
  return (
    <Card className={`overflow-hidden border-zinc-800/80 bg-gradient-to-br ${accentStyles[accent]}`} data-testid={`concentration-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm font-semibold">{label} of users</p>
          <Badge variant="outline" className="border-white/15 bg-black/10 text-[10px]">{userCount.toLocaleString()} / {totalUserCount.toLocaleString()}</Badge>
        </div>
        <p className="text-3xl font-black">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function CohortHeatmap({ cohorts, maxOffset }: {
  cohorts: Array<{ cohortWeek: string; cohortSize: number; retention: Array<{ weekOffset: number; activeUsers: number; pct: number }> }>;
  maxOffset: number;
}) {
  if (!cohorts || cohorts.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Not enough cohort data yet.</p>;
  }

  const cellColor = (pct: number) => {
    if (pct === 0) return "bg-zinc-900/60 text-muted-foreground";
    if (pct < 10)  return "bg-red-500/75 text-white";
    if (pct < 25)  return "bg-red-400/55 text-white";
    if (pct < 50)  return "bg-yellow-400/70 text-zinc-950";
    if (pct < 75)  return "bg-lime-400/75 text-zinc-950";
    return "bg-emerald-400/85 text-emerald-950";
  };

  const fmtCohort = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Sort cohorts newest first for readability
  const orderedCohorts = [...cohorts].sort((a, b) => b.cohortWeek.localeCompare(a.cohortWeek));
  const [showAll, setShowAll] = useState(false);
  const visibleCohorts = showAll ? orderedCohorts : orderedCohorts.slice(0, 5);

  return (
    <div>
      <div className="min-w-[700px]">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-3 pr-4 text-left font-medium">Signup cohort</th>
              <th className="pb-3 pr-4 text-right font-medium">Users</th>
              {Array.from({ length: maxOffset + 1 }, (_, i) => (
                <th key={i} className="px-1 pb-3 text-center font-medium">Week {i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleCohorts.map(c => (
              <tr key={c.cohortWeek} data-testid={`cohort-row-${c.cohortWeek}`}>
                <td className="border-t border-zinc-800/60 py-2 pr-4 font-medium">Week of {fmtCohort(c.cohortWeek)}</td>
                <td className="border-t border-zinc-800/60 py-2 pr-4 text-right text-muted-foreground">{c.cohortSize}</td>
                {Array.from({ length: maxOffset + 1 }, (_, i) => {
                  const cell = c.retention.find(r => r.weekOffset === i);
                  if (!cell) {
                    return <td key={i} className="border-t border-zinc-800/60 px-0.5 py-2"><div className="h-10 rounded-lg bg-transparent" /></td>;
                  }
                  return (
                    <td key={i} className="border-t border-zinc-800/60 px-0.5 py-2">
                      <div className={`h-10 rounded-lg flex flex-col items-center justify-center shadow-sm ${cellColor(cell.pct)}`} title={`${cell.activeUsers} of ${c.cohortSize} active`}>
                        <span className="text-[11px] font-semibold">{cell.pct}%</span>
                        <span className="text-[9px] opacity-80">{cell.activeUsers} active</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orderedCohorts.length > 5 && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((current) => !current)} data-testid="toggle-cohort-history">
            {showAll ? "Show past 5 weeks" : `View all ${orderedCohorts.length} weeks`}
          </Button>
        </div>
      )}
    </div>
  );
}

function EngagementUserList({ title, icon: Icon, accent, users, emptyMessage, subtitle }: {
  title: string;
  icon: LucideIcon;
  accent: string;
  users: Array<{ userId: string; name: string; email: string; role: string; score: number; appDays28d: number; appEvents28d: number; logs28d: number; currentStreak: number; daysSinceLast: number | null }>;
  emptyMessage: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} />
          {title}
        </h3>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">User</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">28d App Days</TableHead>
                <TableHead className="text-right pr-4">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">{emptyMessage}</TableCell></TableRow>
              )}
              {users.map(u => (
                <TableRow key={u.userId} data-testid={`engagement-user-${u.userId}`}>
                  <TableCell className="pl-4">
                    <div className="font-medium text-sm">{u.name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{u.score}</TableCell>
                  <TableCell className="text-right text-sm">
                    {u.appDays28d ?? 0}
                    <span className="block text-[10px] text-muted-foreground">{u.appEvents28d ?? 0} events</span>
                  </TableCell>
                  <TableCell className="text-right pr-4 text-xs text-muted-foreground">
                    {u.daysSinceLast == null ? "—" : `${Math.round(u.daysSinceLast)}d ago`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Funnels sub-tab ───────────────────────────────────────────────────────

const WINDOW_OPTIONS = [
  { value: "7",  label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
  { value: "lifetime", label: "Lifetime" },
];

function FunnelsSubTab() {
  const [days, setDays] = useState<string>("30");

  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/funnels", "activation", days],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/funnels?funnel=activation&days=${encodeURIComponent(days)}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-6" data-testid="section-activation-funnel">
      <AnalyticsSectionIntro
        eyebrow="Activation"
        title="Turn first opens into first actions"
        description="See how many players first open PLAYR1, complete the onboarding quiz, and take a meaningful action during that first session."
      />

      <RetentionSubTab />

      <div className="border-t border-zinc-800/70 pt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">Activation path</p>
            <h2 className="mt-1 text-lg font-semibold">First-session conversion</h2>
            <p className="mt-1 text-sm text-muted-foreground">The first step uses the first authenticated app open as the download proxy for this browser-based app.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Window</span>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[160px] border-zinc-800 bg-zinc-950/60" data-testid="select-funnel-window">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} data-testid={`window-option-${o.value}`}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}

        {isError && (
          <Card data-testid="funnels-error-state">
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
              <p className="font-medium">Couldn't load activation data</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-funnel">Retry</Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && data && (
          <FunnelView data={data} />
        )}
      </div>
    </div>
  );
}

function FunnelView({ data }: { data: {
  funnel: string;
  label: string;
  description: string;
  windowDays: number | null;
  totalCandidates: number;
  steps: Array<{ key: string; label: string; users: number; pctFromStart: number; pctFromPrev: number; dropOff: number; medianTimeToNextSec: number | null }>;
} }) {
  const startUsers = data.steps[0]?.users ?? 0;
  const windowLabel = data.windowDays == null ? "Lifetime" : `Last ${data.windowDays} days`;

  if (startUsers === 0) {
    return (
      <Card className="border-zinc-800/80 bg-zinc-950/50">
        <CardContent className="space-y-2 p-12 text-center">
          <GitBranch className="mx-auto h-8 w-8 text-purple-300" />
          <p className="font-medium">No funnel data yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No users have entered the "{data.steps[0]?.label}" step in the {windowLabel.toLowerCase()}. Activation data will appear as players open the app and begin onboarding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
      <CardContent className="space-y-2 p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{data.label}</h3>
            <p className="text-xs text-muted-foreground">{data.description}</p>
          </div>
          <Badge variant="outline" className="border-purple-400/25 bg-purple-500/10 text-purple-200">
            {windowLabel} · {data.totalCandidates.toLocaleString()} first opens
          </Badge>
        </div>

        <div className="space-y-1">
          {data.steps.map((step, i) => {
            const colors = [
              { fill: "bg-sky-400/75", icon: "bg-sky-400/15 text-sky-200" },
              { fill: "bg-purple-400/75", icon: "bg-purple-400/15 text-purple-200" },
              { fill: "bg-emerald-400/75", icon: "bg-emerald-400/15 text-emerald-200" },
            ][i] ?? { fill: "bg-zinc-400/75", icon: "bg-zinc-400/15 text-zinc-200" };
            const widthPct = data.steps[0].users > 0
              ? Math.max(2, (step.users / data.steps[0].users) * 100)
              : 2;
            return (
              <div key={step.key} data-testid={`funnel-step-${step.key}`}>
                {i > 0 && (
                  <div className="flex items-center gap-2 my-2 ml-2 text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3 text-purple-300" />
                    <span>
                      {step.dropOff.toLocaleString()} dropped off
                      {step.medianTimeToNextSec != null && (
                        <>
                          <span className="mx-1.5">·</span>
                          <Clock className="inline w-3 h-3 mr-1" />
                          median {humanizeSeconds(step.medianTimeToNextSec)} from previous step
                        </>
                      )}
                    </span>
                  </div>
                )}
                <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40">
                  <div
                    className={`${colors.fill} transition-all`}
                    style={{ width: `${widthPct}%` }}
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3 min-w-fit">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          <span className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${colors.icon}`}>{i + 1}</span>
                          {step.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {step.users.toLocaleString()} {step.users === 1 ? "user" : "users"}
                          {i > 0 && (
                            <>
                              <span className="mx-1.5">·</span>
                              {step.pctFromPrev}% from prev
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black">{step.pctFromStart}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">of start</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall summary */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800/70 pt-4 text-sm">
          <span className="text-muted-foreground">End-to-end conversion</span>
          <span className="text-lg font-black text-emerald-300">
            {data.steps[data.steps.length - 1]?.pctFromStart ?? 0}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function humanizeSeconds(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${Math.round((sec / 3600) * 10) / 10}h`;
  return `${Math.round((sec / 86400) * 10) / 10}d`;
}

// ─── Users (Segmentation) sub-tab ──────────────────────────────────────────

type Segment = { key: string; label: string; description: string; color: string; count: number; pct: number };
type SegmentUser = {
  userId: string; name: string; email: string; role: string;
  signedUpDaysAgo: number; appDays28d: number; appEvents28d: number; logs28d: number; lastActiveDaysAgo: number | null; currentStreak: number;
};

function UsersSubTab() {
  const [view, setView] = useState<"all" | "engaged" | "risk" | "recent">("all");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data: engagement, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/engagement"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/engagement");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (isError || !engagement) {
    return (
      <Card data-testid="users-error-state">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn't load user analytics</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-users">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const users = engagement.users ?? [];
  const atRiskIds = new Set((engagement.atRisk ?? []).map((user: any) => user.userId));
  const recentSignups = [...users].filter((user: any) => user.signedUpDaysAgo != null && user.signedUpDaysAgo <= 30).sort((a: any, b: any) => (a.signedUpDaysAgo ?? 999) - (b.signedUpDaysAgo ?? 999));
  const mostEngaged = [...users].sort((a: any, b: any) => b.score - a.score);
  const viewUsers = view === "engaged"
    ? mostEngaged
    : view === "risk"
      ? users.filter((user: any) => atRiskIds.has(user.userId))
      : view === "recent"
        ? recentSignups
        : users;
  const filteredUsers = viewUsers.filter((user: any) => {
    const query = search.trim().toLowerCase();
    return !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
  });
  const scoreColor = (score: number) => score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-300" : "text-red-400";
  const gradeFor = (score: number) => score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
  const viewLabels = {
    all: { label: "Every player", description: "Ranked by current engagement score" },
    engaged: { label: "Most engaged", description: "Players creating the strongest activity loops" },
    risk: { label: "At risk", description: "Previously active players who have started slipping" },
    recent: { label: "Recently signed up", description: "Players who joined in the last 30 days" },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BusinessKpi label="Total players" value={users.length.toLocaleString()} sub="every account in the system" icon={Users} accent="blue" />
        <BusinessKpi label="Active players" value={Number(engagement.activeUserCount || 0).toLocaleString()} sub="activity in the last 28 days" icon={Activity} accent="orange" />
        <BusinessKpi label="Avg engagement" value={`${Number(engagement.avgScore || 0).toFixed(1)}`} sub="score across active players" icon={TrendingUp} accent="purple" />
        <BusinessKpi label="Recent signups" value={recentSignups.length.toLocaleString()} sub="joined in the last 30 days" icon={UserPlus} accent="red" />
      </div>

      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full border-purple-400/40 text-purple-200 hover:bg-purple-500/15" aria-label="How engagement rating works" title="How engagement rating works">
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl border-purple-500/25 bg-zinc-950">
            <DialogHeader>
              <DialogTitle>How engagement rating works</DialogTitle>
              <p className="text-sm text-muted-foreground">Every player receives a 0–100 score from their activity in the last 28 days.</p>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Recency & consistency", weight: "70%", detail: "35% recency + 35% active days. Returning often matters most.", color: "bg-orange-400", text: "text-orange-300" },
                { label: "Breadth of use", weight: "15%", detail: "Distinct screens and event types show whether a player explores the product.", color: "bg-sky-400", text: "text-sky-300" },
                { label: "Training contribution", weight: "15%", detail: "Workout logs, drill categories, and current streak add depth without dominating.", color: "bg-purple-400", text: "text-purple-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <span className={`text-xl font-black ${item.text}`}>{item.weight}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${item.color}`} style={{ width: item.weight }} /></div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-800/70 pt-3 text-xs text-muted-foreground">
              <span><strong className="text-emerald-300">A</strong> 80–100 · strongest activity loop</span>
              <span><strong className="text-sky-300">B</strong> 65–79 · healthy activity</span>
              <span><strong className="text-amber-300">C</strong> 50–64 · building momentum</span>
              <span><strong className="text-orange-300">D/F</strong> below 50 · needs attention</span>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">{viewLabels[view].label}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{viewLabels[view].description} · click a player for their activity profile</p>
              </div>
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players..." className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 text-sm outline-none ring-orange-400/40 placeholder:text-muted-foreground focus:ring-2" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["all", "engaged", "risk", "recent"] as const).map((key) => (
                <Button key={key} type="button" size="sm" variant={view === key ? "default" : "outline"} className={view === key ? "bg-orange-500 text-white hover:bg-orange-400" : ""} onClick={() => setView(key)}>
                  {key === "all" ? "All players" : key === "engaged" ? "Most engaged" : key === "risk" ? "At risk" : "Recent signups"}
                  <span className="ml-1.5 opacity-70">{key === "all" ? users.length : key === "engaged" ? mostEngaged.slice(0, 20).length : key === "risk" ? engagement.atRisk.length : recentSignups.length}</span>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[650px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">No players match this view.</div>
              ) : filteredUsers.map((user: any, index: number) => (
                <button key={user.userId} type="button" onClick={() => setSelectedUserId(user.userId)} className="flex w-full items-center gap-3 border-b border-zinc-800/70 px-4 py-3 text-left transition hover:bg-zinc-900/70" data-testid={`user-analytics-row-${user.userId}`}>
                  <span className="w-7 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
                  <Avatar className="h-9 w-9 border border-zinc-700">
                    <AvatarFallback className="bg-orange-500/15 text-xs text-orange-200">{(user.name || user.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.name || user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-semibold">{user.appDays28d ?? 0} active days</p>
                    <p className="text-[11px] text-muted-foreground">{user.daysSinceLast == null ? "Never active" : user.daysSinceLast < 1 ? "Active today" : `${Math.round(user.daysSinceLast)}d since active`}</p>
                  </div>
                  <div className="w-14 text-center">
                    <p className={`text-xl font-black ${scoreColor(Number(user.score || 0))}`}>{Number(user.score || 0).toFixed(0)}</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Grade {gradeFor(Number(user.score || 0))}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-gradient-to-b from-orange-500/10 via-zinc-950/70 to-purple-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-orange-300" />Recent signups</CardTitle>
            <p className="text-xs text-muted-foreground">Players who joined in the last 30 days.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSignups.slice(0, 8).map((user: any) => (
              <button key={user.userId} type="button" onClick={() => setSelectedUserId(user.userId)} className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-2.5 text-left transition hover:border-orange-400/40 hover:bg-orange-500/5">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-sky-500/15 text-[10px] text-sky-200">{(user.name || user.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.name || user.email}</p><p className="text-[11px] text-muted-foreground">{user.signedUpDaysAgo === 0 ? "Today" : `${user.signedUpDaysAgo}d ago`}</p></div>
                <span className={`text-sm font-bold ${scoreColor(Number(user.score || 0))}`}>{Number(user.score || 0).toFixed(0)}</span>
              </button>
            ))}
            {recentSignups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No recent signups.</p>}
            <Button type="button" variant="ghost" className="mt-2 w-full text-xs text-orange-300 hover:text-orange-200" onClick={() => setView("recent")}>View all recent signups</Button>
          </CardContent>
        </Card>
      </div>
       <Dialog open={Boolean(selectedUserId)} onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}>
         <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto border-zinc-800 bg-zinc-950 p-0">
           {selectedUserId && (
             <div className="p-5 sm:p-7">
               <DialogHeader className="sr-only">
                 <DialogTitle>Player activity profile</DialogTitle>
                 <DialogDescription>Detailed engagement, usage, training, and activity history for the selected player.</DialogDescription>
               </DialogHeader>
               <UserActivityProfile userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
             </div>
           )}
         </DialogContent>
       </Dialog>
    </div>
  );
}

function UserActivityProfile({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/admin/analytics/users", userId, "activity"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/users/${userId}/activity`);
      return res.json();
    },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-32 rounded-xl" /><Skeleton className="h-48 rounded-2xl" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-80 rounded-2xl" /></div>;
  if (isError || !data) return <Card><CardContent className="p-10 text-center"><p className="font-semibold">Couldn’t load this activity profile.</p><Button className="mt-4" variant="outline" onClick={onBack}>Back to users</Button></CardContent></Card>;

  const scoreColor = data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-300" : "text-red-400";
  const gradeColor = data.grade === "A" ? "bg-emerald-400 text-emerald-950" : data.grade === "B" ? "bg-sky-400 text-sky-950" : data.grade === "C" ? "bg-amber-300 text-amber-950" : "bg-red-400 text-red-950";
  const fmtDate = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
  const initials = (data.user.name || data.user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Button type="button" variant="ghost" className="-ml-3 text-muted-foreground hover:text-foreground" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" />Back to all players</Button>
      <Card className="overflow-hidden border-orange-500/25 bg-gradient-to-br from-orange-500/12 via-zinc-950/80 to-purple-500/10">
        <CardContent className="relative p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 border-2 border-orange-400/40"><AvatarFallback className="bg-orange-500/20 text-xl text-orange-100">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold">{data.user.name}</h2><Badge variant="outline" className="capitalize">{data.user.role}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{data.user.email}</p><p className="mt-2 text-xs text-muted-foreground">Joined {fmtDate(data.user.createdAt)} · Last active {data.daysSinceLast == null ? "never" : data.daysSinceLast < 1 ? "today" : `${Math.round(data.daysSinceLast)} days ago`}</p></div>
            <div className="flex items-center gap-4"><div className={`flex h-20 w-20 flex-col items-center justify-center rounded-full border-8 border-white/10 bg-zinc-950/40 ${scoreColor}`}><span className="text-2xl font-black">{Number(data.score).toFixed(0)}</span><span className="text-[9px] uppercase tracking-widest text-muted-foreground">score</span></div><span className={`rounded-lg px-3 py-1 text-lg font-black ${gradeColor}`}>{data.grade}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BusinessKpi label="Total events" value={data.summary.totalEvents.toLocaleString()} sub={`${data.recent.events.toLocaleString()} in the last 28d`} icon={Activity} accent="orange" />
        <BusinessKpi label="Meaningful actions" value={data.summary.actions.toLocaleString()} sub={`${data.recent.actions.toLocaleString()} in the last 28d`} icon={Zap} accent="purple" />
        <BusinessKpi label="Estimated usage" value={`${data.summary.estimatedMinutes.toLocaleString()} min`} sub={`${data.summary.sessions.toLocaleString()} sessions`} icon={Clock} accent="blue" />
        <BusinessKpi label="Active days" value={data.recent.activeDays.toLocaleString()} sub="of the last 28 days" icon={Calendar} accent="red" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-3"><CardTitle className="text-base">Activity over the last 30 days</CardTitle><p className="mt-1 text-xs text-muted-foreground">Daily events and meaningful actions reveal consistency, not just one busy session.</p></CardHeader>
          <CardContent className="p-4"><ResponsiveContainer width="100%" height={280}><AreaChart data={data.daily}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(value) => value.slice(5)} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Area type="monotone" dataKey="events" stroke="#f97316" fill="#f97316" fillOpacity={0.18} strokeWidth={2} /><Area type="monotone" dataKey="actions" stroke="#a855f7" fill="#a855f7" fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent>
        </Card>
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50">
          <CardHeader className="border-b border-zinc-800/70 pb-3"><CardTitle className="text-base">Usage mix</CardTitle><p className="mt-1 text-xs text-muted-foreground">How this player spends their activity.</p></CardHeader>
          <CardContent className="space-y-4 p-4">
            {[["Page views", data.summary.pageViews, "#38bdf8"], ["Actions", data.summary.actions, "#a855f7"], ["App opens", data.summary.appOpens, "#f97316"]].map(([label, value, color]) => <div key={String(label)}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{Number(value).toLocaleString()}</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (Number(value) / Math.max(data.summary.totalEvents, 1)) * 100)}%`, background: color as string }} /></div></div>)}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/70 pt-4 text-center"><div><p className="text-xl font-bold">{data.summary.uniquePages}</p><p className="text-[11px] text-muted-foreground">unique screens</p></div><div><p className="text-xl font-bold">{data.summary.uniqueEventTypes}</p><p className="text-[11px] text-muted-foreground">event types</p></div></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50"><CardHeader className="border-b border-zinc-800/70 pb-3"><CardTitle className="text-base">Areas of the app</CardTitle><p className="mt-1 text-xs text-muted-foreground">The product areas this player is actually exploring.</p></CardHeader><CardContent className="p-4"><ResponsiveContainer width="100%" height={270}><BarChart data={data.areas.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="area" width={100} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="events" fill="#f97316" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card className="overflow-hidden border-zinc-800/80 bg-zinc-950/50"><CardHeader className="border-b border-zinc-800/70 pb-3"><CardTitle className="text-base">What they do most</CardTitle><p className="mt-1 text-xs text-muted-foreground">Top events and screens in the last 28 days.</p></CardHeader><CardContent className="grid gap-5 p-4 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</p><div className="space-y-2">{data.topEvents.map((item: any, index: number) => <div key={item.event} className="flex items-center gap-2 text-xs"><span className="w-4 text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate font-mono">{item.event}</span><span className="font-semibold text-orange-300">{item.count}</span></div>)}</div></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Screens</p><div className="space-y-2">{data.topPages.map((item: any, index: number) => <div key={item.page} className="flex items-center gap-2 text-xs"><span className="w-4 text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate">{item.page}</span><span className="font-semibold text-sky-300">{item.views}</span></div>)}</div></div></CardContent></Card>
      </div>

      <Card className="border-orange-500/20 bg-orange-500/5"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold">Training contribution</p><p className="mt-1 text-xs text-muted-foreground">Workout behavior is a secondary signal in the engagement score.</p></div><div className="flex gap-6 text-right"><div><p className="text-xl font-bold">{data.training.logs28d}</p><p className="text-[11px] text-muted-foreground">logs in 28d</p></div><div><p className="text-xl font-bold">{data.training.drills28d}</p><p className="text-[11px] text-muted-foreground">drills in 28d</p></div><div><p className="text-xl font-bold">{data.training.logsAllTime}</p><p className="text-[11px] text-muted-foreground">all-time logs</p></div></div></CardContent></Card>
    </div>
  );
}

// ─── Training analytics sub-tab ────────────────────────────────────────────

function TrainingAnalyticsSubTab() {
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/content"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/content");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="font-semibold">Training analytics could not load</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const totals = data.totals ?? {};
  const funnel = data.funnel ?? {};
  const sessions = data.sessionSummary ?? {};
  const programs = data.programSummary ?? {};
  const number = (value: unknown) => Number(value || 0).toLocaleString();
  const percent = (value: unknown) => `${Number(value || 0).toFixed(1)}%`;
  const completionRate = Number(funnel.drillViews28d || 0) > 0
    ? (Number(funnel.drillCompletions28d || 0) / Number(funnel.drillViews28d)) * 100
    : 0;

  return (
    <div className="space-y-7" data-testid="section-training-analytics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TrainingMetricCard label="Drill library" value={number(totals.drills)} sub={`${number(totals.drillCompletions)} finished all time`} icon={Target} accent="orange" testId="stat-training-drills" />
        <TrainingMetricCard label="Workout library" value={number(totals.workouts)} sub={`${number(sessions.sessionsAllTime)} sessions finished`} icon={Dumbbell} accent="blue" testId="stat-training-workouts" />
        <TrainingMetricCard label="Programs" value={number(totals.programs)} sub={`${number(totals.completedPrograms)} completed`} icon={GraduationCap} accent="purple" testId="stat-training-programs" />
        <TrainingMetricCard label="Training minutes" value={number(totals.totalMinutes)} sub="logged all time" icon={Clock} accent="green" testId="stat-training-minutes" />
        <TrainingMetricCard label="Active enrollments" value={number(totals.activeEnrollments)} sub={`${percent(programs.completionRate)} program completion rate`} icon={Activity} accent="orange" testId="stat-training-enrollments" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-white/10 bg-zinc-950/70 shadow-[0_18px_50px_-35px_rgba(249,115,22,0.7)]">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base tracking-tight">Training funnel</CardTitle>
                <p className="mt-1 text-xs text-zinc-500">Last {data.windowDays || 28} days · interest becoming work.</p>
              </div>
              <span className="rounded-lg bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-200">Pulse</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {[
              { label: "Drill views", value: funnel.drillViews28d, color: "bg-sky-400", detail: `${number(funnel.drillViewers28d)} unique players` },
              { label: "Drill completions", value: funnel.drillCompletions28d, color: "bg-orange-400", detail: `${percent(completionRate)} view-to-completion` },
              { label: "Workout starts", value: funnel.workoutStarts28d, color: "bg-purple-400", detail: "library workout launches" },
              { label: "Program views", value: funnel.programViews28d, color: "bg-emerald-400", detail: `${number(funnel.enrollmentEvents28d)} enrollment events` },
            ].map((item) => {
              const max = Math.max(1, Number(funnel.drillViews28d || 0), Number(funnel.workoutStarts28d || 0), Number(funnel.programViews28d || 0));
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-bold">{number(item.value)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className={`h-2 rounded-full ${item.color} shadow-[0_0_14px_currentColor]`} style={{ width: `${Math.max(2, (Number(item.value || 0) / max) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
            <CardTitle className="text-base tracking-tight">How sessions are logged</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">Tracked sessions capture metrics; quick complete sessions keep the habit moving.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-400/15 to-sky-400/[0.03] p-4">
                <p className="text-xs text-sky-200">Tracked sessions</p>
                <p className="mt-2 text-3xl font-bold">{number(sessions.tracked28d)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">last {data.windowDays || 28} days</p>
              </div>
              <div className="rounded-2xl border border-orange-300/20 bg-gradient-to-br from-orange-400/15 to-orange-400/[0.03] p-4">
                <p className="text-xs text-orange-200">Quick complete</p>
                <p className="mt-2 text-3xl font-bold">{number(sessions.quickComplete28d)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">last {data.windowDays || 28} days</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/70 pt-4 text-sm">
              <div><p className="text-muted-foreground">Avg drills / session</p><p className="mt-1 font-semibold">{Number(sessions.avgDrills28d || 0).toFixed(1)}</p></div>
              <div><p className="text-muted-foreground">Avg minutes / session</p><p className="mt-1 font-semibold">{Number(sessions.avgMinutes28d || 0).toFixed(1)}</p></div>
              <div><p className="text-muted-foreground">Minutes in window</p><p className="mt-1 font-semibold">{number(sessions.minutes28d)}</p></div>
              <div><p className="text-muted-foreground">Sessions all time</p><p className="mt-1 font-semibold">{number(sessions.sessionsAllTime)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
            <CardTitle className="text-base tracking-tight">Most popular drills</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">Views versus completed logs, with all-time completion volume.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Drill</TableHead><TableHead className="text-right">Views</TableHead><TableHead className="text-right">Finished</TableHead><TableHead className="text-right pr-4">Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.topDrills ?? []).slice(0, 10).map((drill: any) => (
                  <TableRow key={drill.id}>
                    <TableCell className="max-w-[220px] pl-4"><p className="truncate text-sm font-medium">{drill.title}</p><p className="text-[11px] capitalize text-muted-foreground">{drill.category} · {drill.difficulty}</p></TableCell>
                    <TableCell className="text-right text-sm">{number(drill.views28d)}</TableCell>
                    <TableCell className="text-right font-semibold">{number(drill.logs28d)}<span className="block text-[10px] font-normal text-muted-foreground">{number(drill.logsAllTime)} all time</span></TableCell>
                    <TableCell className="pr-4 text-right text-xs text-orange-300">{percent(drill.completionRate28d)}</TableCell>
                  </TableRow>
                ))}
                {(data.topDrills ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No drill activity yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
            <CardTitle className="text-base tracking-tight">Programs: discovery to completion</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">The programs players view, join, progress through, and finish.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Program</TableHead><TableHead className="text-right">Views</TableHead><TableHead className="text-right">Joins</TableHead><TableHead className="text-right pr-4">Done</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.topPrograms ?? []).slice(0, 10).map((program: any) => (
                  <TableRow key={program.id}>
                    <TableCell className="max-w-[220px] pl-4"><p className="truncate text-sm font-medium">{program.title}</p><p className="text-[11px] text-muted-foreground">{program.lengthDays} days · {program.difficulty}</p></TableCell>
                    <TableCell className="text-right text-sm">{number(program.views28d)}</TableCell>
                    <TableCell className="text-right font-semibold">{number(program.enrollments28d)}<span className="block text-[10px] font-normal text-muted-foreground">{percent(program.viewToEnrollmentRate)} conversion</span></TableCell>
                    <TableCell className="pr-4 text-right font-semibold">{number(program.completions)}<span className="block text-[10px] font-normal text-muted-foreground">{number(program.itemCompletions)} items</span></TableCell>
                  </TableRow>
                ))}
                {(data.topPrograms ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No program activity yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden border-white/10 bg-zinc-950/70 lg:col-span-2">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4">
            <CardTitle className="text-base tracking-tight">Most-used workout templates</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">Template starts and completed sessions are tracked from the point workout telemetry was added.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Workout</TableHead><TableHead className="text-right">Drills</TableHead><TableHead className="text-right">Starts</TableHead><TableHead className="text-right">Finished</TableHead><TableHead className="text-right pr-4">Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.workoutLibrary ?? []).slice(0, 10).map((workout: any) => (
                  <TableRow key={workout.id}>
                    <TableCell className="pl-4"><p className="text-sm font-medium">{workout.name}</p><p className="text-[11px] capitalize text-muted-foreground">{workout.category}</p></TableCell>
                    <TableCell className="text-right">{number(workout.drillCount)}</TableCell>
                    <TableCell className="text-right">{number(workout.starts28d)}</TableCell>
                    <TableCell className="text-right font-semibold">{number(workout.completions28d)}</TableCell>
                    <TableCell className="pr-4 text-right text-xs text-orange-300">{percent(workout.completionRate28d)}</TableCell>
                  </TableRow>
                ))}
                {(data.workoutLibrary ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No saved workout templates yet. Session-level totals are shown above.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4"><CardTitle className="text-base tracking-tight">Program status</CardTitle><p className="mt-1 text-xs text-zinc-500">All enrollments, not just the current window.</p></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-5">
            {[
              ["Active", programs.active, "text-sky-300"],
              ["Completed", programs.completed, "text-emerald-300"],
              ["Abandoned", programs.abandoned, "text-red-300"],
              ["Completion rate", percent(programs.completionRate), "text-orange-300"],
            ].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="text-xs text-zinc-500">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{typeof value === "string" ? value : number(value)}</p></div>)}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-zinc-950/70">
          <CardHeader className="border-b border-white/[0.07] bg-white/[0.02] pb-4"><CardTitle className="text-base tracking-tight">Logged performance stats</CardTitle><p className="mt-1 text-xs text-zinc-500">Which metrics players actually record during tracked sessions.</p></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Metric</TableHead><TableHead className="text-right">Entries</TableHead><TableHead className="text-right">Players</TableHead><TableHead className="text-right pr-4">Average</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.metrics ?? []).map((metric: any) => <TableRow key={metric.metric}><TableCell className="pl-4 text-sm font-medium">{metric.metric}</TableCell><TableCell className="text-right">{number(metric.entries)}</TableCell><TableCell className="text-right">{number(metric.users)}</TableCell><TableCell className="pr-4 text-right font-semibold">{Number(metric.average || 0).toFixed(1)}</TableCell></TableRow>)}
                {(data.metrics ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No tracked metric data yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-orange-300/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.10),rgba(24,24,27,0.35))]">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,0.8)]" />
            <div>
              <p className="text-sm font-semibold">Measurement notes</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">Drill views come from the analytics event stream. Drill completions come from saved training logs. Workout sessions are grouped by session ID, with single-drill logs counted as one session. Older sessions without metric rows are classified as quick-complete-style logs; new saves also record the selected session mode directly.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingMetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  testId,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: "orange" | "blue" | "purple" | "green";
  testId?: string;
}) {
  const styles = {
    orange: {
      card: "border-orange-300/25 from-orange-400/15 to-orange-400/[0.02] hover:border-orange-200/50",
      icon: "bg-orange-400/15 text-orange-200",
      value: "text-orange-100",
    },
    blue: {
      card: "border-sky-300/25 from-sky-400/15 to-sky-400/[0.02] hover:border-sky-200/50",
      icon: "bg-sky-400/15 text-sky-200",
      value: "text-sky-100",
    },
    purple: {
      card: "border-violet-300/25 from-violet-400/15 to-violet-400/[0.02] hover:border-violet-200/50",
      icon: "bg-violet-400/15 text-violet-200",
      value: "text-violet-100",
    },
    green: {
      card: "border-emerald-300/25 from-emerald-400/15 to-emerald-400/[0.02] hover:border-emerald-200/50",
      icon: "bg-emerald-400/15 text-emerald-200",
      value: "text-emerald-100",
    },
  };

  return (
    <Card data-testid={testId} className={`group overflow-hidden bg-gradient-to-br transition-all duration-200 hover:-translate-y-0.5 ${styles[accent].card}`}>
      <CardContent className="relative p-4">
        <div className="pointer-events-none absolute -right-7 -top-8 h-20 w-20 rounded-full bg-white/[0.04] blur-2xl transition-transform duration-300 group-hover:scale-150" />
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
          <span className={`rounded-xl p-2 ${styles[accent].icon}`}><Icon className="h-4 w-4" /></span>
        </div>
        <p className={`relative mt-5 text-3xl font-black tracking-[-0.04em] ${styles[accent].value}`}>{value}</p>
        <p className="relative mt-1 text-[11px] leading-4 text-zinc-500">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Legacy content-performance type retained for older admin components ────

type ContentData = {
  topDrills: Array<{ id: string; title: string; category: string; difficulty: string; logs28d: number; uniqueUsers28d: number; logsAllTime: number }>;
  underperformers: Array<{ id: string; title: string; category: string; difficulty: string; logs28d: number; ageDays: number }>;
  categoryStats: Array<{ category: string; drillCount: number; logs28d: number; avgLogsPerDrill: number; uniqueUsers28d: number }>;
  dailyChallenge: {
    completionsLast7d: number; completionsLast28d: number; avgPerDay7d: number;
    activeStreakUsers: number; avgCurrentStreak: number; longestCurrentStreak: number; uniqueUsers28d: number;
  };
};

function ContentSubTab() {
  const { data, isLoading, isError, error, refetch } = useQuery<ContentData>({
    queryKey: ["/api/admin/analytics/content"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/content");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="content-error-state">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn't load content performance</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-content">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const dc = data.dailyChallenge;

  return (
    <div className="space-y-8">
      {/* Daily Streak Challenge ROI */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Daily Streak Challenge</h2>
        <p className="text-sm text-muted-foreground mb-3">
          The shared daily drill that drives habitual engagement. Higher streaks = stickier users.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AccentStatCard label="Completions (7d)" value={dc.completionsLast7d.toLocaleString()} sub={`~${dc.avgPerDay7d}/day avg`} icon={Flame} accent="orange" testId="stat-dc-7d" />
          <AccentStatCard label="Completions (28d)" value={dc.completionsLast28d.toLocaleString()} sub={`${dc.uniqueUsers28d.toLocaleString()} unique users`} icon={Activity} accent="blue" testId="stat-dc-28d" />
          <AccentStatCard label="Active Streaks" value={dc.activeStreakUsers.toLocaleString()} sub={`avg ${dc.avgCurrentStreak} days`} icon={Zap} accent="purple" testId="stat-dc-active" />
          <AccentStatCard label="Longest Streak" value={`${dc.longestCurrentStreak}d`} sub="current best" icon={Trophy} accent="green" testId="stat-dc-longest" />
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Category Performance (28d)</h2>
        <p className="text-sm text-muted-foreground mb-3">Where your users are spending their training time, by drill category.</p>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Category</TableHead>
                  <TableHead className="text-right">Drills</TableHead>
                  <TableHead className="text-right">Logs (28d)</TableHead>
                  <TableHead className="text-right">Unique Users</TableHead>
                  <TableHead className="text-right pr-4">Avg Logs / Drill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.categoryStats.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No drill categories yet.</TableCell></TableRow>
                )}
                {data.categoryStats.map(c => (
                  <TableRow key={c.category} data-testid={`category-row-${c.category}`}>
                    <TableCell className="pl-4 font-medium capitalize">{c.category}</TableCell>
                    <TableCell className="text-right text-sm">{c.drillCount}</TableCell>
                    <TableCell className="text-right font-semibold">{c.logs28d.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{c.uniqueUsers28d.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-4 text-sm">{c.avgLogsPerDrill}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Top + Underperforming drills side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-green-500" />
            Top Drills (28d)
          </h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Drill</TableHead>
                    <TableHead className="text-right">Logs</TableHead>
                    <TableHead className="text-right pr-4">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topDrills.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No drill activity yet.</TableCell></TableRow>
                  )}
                  {data.topDrills.map(d => (
                    <TableRow key={d.id} data-testid={`top-drill-${d.id}`}>
                      <TableCell className="pl-4">
                        <div className="font-medium text-sm">{d.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{d.category} · {d.difficulty}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{d.logs28d}</TableCell>
                      <TableCell className="text-right pr-4 text-sm">{d.uniqueUsers28d}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Content Gaps
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Drills 14+ days old with no logs in the last 28 days. Candidates to feature, refresh, or retire.
          </p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Drill</TableHead>
                    <TableHead className="text-right pr-4">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.underperformers.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-sm">No idle drills — all of your library has recent activity.</TableCell></TableRow>
                  )}
                  {data.underperformers.map(d => (
                    <TableRow key={d.id} data-testid={`under-drill-${d.id}`}>
                      <TableCell className="pl-4">
                        <div className="font-medium text-sm">{d.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{d.category} · {d.difficulty}</div>
                      </TableCell>
                      <TableCell className="text-right pr-4 text-xs text-muted-foreground">{d.ageDays}d</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccentStatCard({ label, value, sub, icon: Icon, accent, testId }: {
  label: string; value: string; sub: string; icon: LucideIcon;
  accent: "orange" | "blue" | "purple" | "green"; testId?: string;
}) {
  const colorMap = {
    orange: "text-orange-500 bg-orange-500/10",
    blue:   "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    green:  "text-green-500 bg-green-500/10",
  };
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className={`p-1.5 rounded-md ${colorMap[accent]}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Live Activity sub-tab ─────────────────────────────────────────────────

type LiveData = {
  activeNow: number; active15min: number; active60min: number;
  eventsLast15min: number; eventsLast60min: number;
  eventsByMinute: Array<{ minute: string; count: number }>;
  topActiveUsers: Array<{ userId: string; name: string; email: string; eventCount: number }>;
  recentEvents: Array<{ id: string; userId: string | null; userName: string; event: string; props: any; createdAt: string; ageSec: number }>;
  activeLocations: Array<{ country: string | null; city: string | null; lat: number; lng: number; userCount: number; eventCount: number }>;
};

function formatAge(sec: number): string {
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function LiveActivitySubTab() {
  const [paused, setPaused] = useState(false);

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery<LiveData>({
    queryKey: ["/api/admin/analytics/live"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/live");
      return res.json();
    },
    refetchInterval: paused ? false : 10000,
    refetchOnWindowFocus: !paused,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="live-error-state">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn't load live activity</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-live">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const maxMinuteCount = Math.max(1, ...data.eventsByMinute.map(m => m.count));
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <div className="space-y-6">
      {/* Header with live indicator + pause toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className={`relative inline-flex h-2.5 w-2.5 ${paused ? "" : ""}`}>
              {!paused && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${paused ? "bg-muted-foreground" : "bg-green-500"}`} />
            </span>
            {paused ? "Live Activity (paused)" : "Live Activity"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Refreshes every 10 seconds. Last updated {lastUpdated}.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPaused(p => !p)}
          data-testid="btn-toggle-live-pause"
        >
          {paused ? "Resume" : "Pause"}
        </Button>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AccentStatCard label="Active right now" value={data.activeNow.toLocaleString()} sub="users active in last 5 min" icon={Zap} accent="green" testId="stat-live-active-now" />
        <AccentStatCard label="Active (15 min)" value={data.active15min.toLocaleString()} sub={`${data.eventsLast15min} events fired`} icon={Activity} accent="blue" testId="stat-live-15min" />
        <AccentStatCard label="Active (60 min)" value={data.active60min.toLocaleString()} sub={`${data.eventsLast60min} events fired`} icon={Users} accent="purple" testId="stat-live-60min" />
        <AccentStatCard label="Avg events/min" value={(data.eventsLast60min / 60).toFixed(1)} sub="rolling 60-min average" icon={TrendingUp} accent="orange" testId="stat-live-rate" />
      </div>

      {/* World map of active users */}
      <LiveWorldMap locations={data.activeLocations || []} />

      {/* Per-minute sparkline */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold">Events per minute (last 60 minutes)</h3>
            <p className="text-xs text-muted-foreground">peak: {maxMinuteCount}</p>
          </div>
          <div className="flex items-end gap-px h-24" data-testid="chart-events-per-minute">
            {data.eventsByMinute.map((m, i) => {
              const h = Math.max(2, Math.round((m.count / maxMinuteCount) * 96));
              return (
                <div
                  key={`${m.minute}-${i}`}
                  className={`flex-1 rounded-sm ${m.count === 0 ? "bg-muted/30" : "bg-primary"}`}
                  style={{ height: `${h}px` }}
                  title={`${m.minute} — ${m.count} event${m.count === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{data.eventsByMinute[0]?.minute ?? ""}</span>
            <span>now</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent event feed + top users side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-base font-semibold mb-3">Recent activity feed</h3>
          <Card>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right pr-4">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentEvents.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No activity yet.</TableCell></TableRow>
                  )}
                  {data.recentEvents.map(ev => (
                    <TableRow key={ev.id} data-testid={`live-event-${ev.id}`}>
                      <TableCell className="pl-4">
                        <Badge variant="outline" className="text-xs font-mono">{ev.event}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{ev.userName}</div>
                      </TableCell>
                      <TableCell className="text-right pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatAge(ev.ageSec)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Most active users (60 min)</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">User</TableHead>
                    <TableHead className="text-right pr-4">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topActiveUsers.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-sm">No active users.</TableCell></TableRow>
                  )}
                  {data.topActiveUsers.map(u => (
                    <TableRow key={u.userId} data-testid={`live-top-user-${u.userId}`}>
                      <TableCell className="pl-4">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</div>
                      </TableCell>
                      <TableCell className="text-right pr-4 font-semibold">{u.eventCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── AI Insights sub-tab ───────────────────────────────────────────────────

type Insight = {
  id: string; kind: string; title: string; body: string; severity: string;
  metadata: any; isDismissed: boolean; createdAt: string;
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: LucideIcon; iconColor: string }> = {
  positive: { bg: "bg-green-500/5",  border: "border-green-500/30",  icon: TrendingUp,    iconColor: "text-green-500" },
  warn:     { bg: "bg-orange-500/5", border: "border-orange-500/30", icon: AlertTriangle, iconColor: "text-orange-500" },
  critical: { bg: "bg-red-500/5",    border: "border-red-500/30",    icon: AlertTriangle, iconColor: "text-red-500" },
  info:     { bg: "bg-blue-500/5",   border: "border-blue-500/30",   icon: Lightbulb,     iconColor: "text-blue-500" },
};

function AiInsightsSubTab() {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery<{ insights: Insight[] }>({
    queryKey: ["/api/admin/analytics/insights"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/insights");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (force: boolean = false) => {
      const res = await apiRequest("POST", "/api/admin/analytics/insights/generate", { force });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Weekly summary generated", description: "Fresh AI insight added to the feed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/insights"] });
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      if (msg.includes("already generated")) {
        toast({
          title: "Already generated this week",
          description: "A weekly summary exists from the last 7 days. Use \"Force regenerate\" to spend tokens on a new one.",
        });
      } else {
        toast({ title: "Could not generate summary", description: msg || "Unknown error", variant: "destructive" });
      }
    },
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/analytics/insights/detect-anomalies");
      return res.json();
    },
    onSuccess: (result: { inserted: number; checked: number }) => {
      toast({
        title: result.inserted > 0 ? `Found ${result.inserted} new anomal${result.inserted === 1 ? "y" : "ies"}` : "No new anomalies",
        description: `Scanned ${result.checked} metrics. ${result.inserted === 0 ? "Things look stable." : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/insights"] });
    },
    onError: (e: any) => toast({ title: "Could not detect anomalies", description: e?.message || "Unknown error", variant: "destructive" }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/analytics/insights/${id}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/insights"] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="insights-error-state">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn't load AI insights</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-insights">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const insights = data.insights;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Auto-generated weekly executive summaries plus rule-based anomaly alerts (≥30% week-over-week swings).
            Insights stay until you dismiss them.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending}
            data-testid="btn-detect-anomalies"
          >
            {detectMutation.isPending ? "Scanning…" : "Scan for anomalies"}
          </Button>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate(false)}
            disabled={generateMutation.isPending}
            data-testid="btn-generate-summary"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {generateMutation.isPending ? "Generating…" : "Generate weekly summary"}
          </Button>
        </div>
      </div>

      {insights.length === 0 ? (
        <Card data-testid="insights-empty-state">
          <CardContent className="p-12 text-center space-y-3">
            <Lightbulb className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="font-medium">No active insights</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Click <strong>Scan for anomalies</strong> for instant rule-based alerts, or <strong>Generate weekly summary</strong>
              {" "}to have AI write a 5-bullet executive recap from your latest metrics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map(ins => {
            const style = SEVERITY_STYLES[ins.severity] ?? SEVERITY_STYLES.info;
            const Icon = style.icon;
            const created = new Date(ins.createdAt);
            return (
              <Card key={ins.id} className={`${style.bg} ${style.border} border`} data-testid={`insight-card-${ins.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md bg-background ${style.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{ins.title}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase">{ins.kind.replace("_", " ")}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{created.toLocaleString()}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">{ins.body}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => dismissMutation.mutate(ins.id)}
                      disabled={dismissMutation.isPending}
                      data-testid={`btn-dismiss-insight-${ins.id}`}
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Coming-Soon placeholder for future analytics phases ───────────────────

function ComingSoonCard({ title, description, icon: Icon }: {
  title: string; description: string; icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </CardContent>
    </Card>
  );
}
