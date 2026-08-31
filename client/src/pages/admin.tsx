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
import { Plus, Pencil, Trash2, Video, Star, StarOff, ShieldAlert, Users, Shield, Settings2, Calculator, Hash, Upload, Loader2, Film, Ruler, Check, FileText, Play, ChevronDown, GraduationCap, MapPin, ListFilter, X, BarChart2, TrendingUp, TrendingDown, Activity, UserCheck, Wrench, Flame, Lightbulb, Zap, Globe, AlertTriangle, Trophy, Target, GitBranch, Clock, ArrowDown, Flag, ToggleLeft, ToggleRight, UserPlus, Copy, RotateCcw, ExternalLink, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
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
  const [activeTab, setActiveTab] = useState("videos");
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
          <TabsTrigger value="videos" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-videos">
            <Film className="w-4 h-4 shrink-0" />
            <span>Videos</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-metrics">
            <Ruler className="w-4 h-4 shrink-0" />
            <span>Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-pdfs">
            <FileText className="w-4 h-4 shrink-0" />
            <span>PDFs</span>
          </TabsTrigger>
          <TabsTrigger value="drills" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-drills">
            <Video className="w-4 h-4 shrink-0" />
            <span>Drills</span>
          </TabsTrigger>
          <TabsTrigger value="workouts" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-workouts">
            <Play className="w-4 h-4 shrink-0" />
            <span>Workouts</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-locations">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Locations</span>
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-tutorials">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Tutorials</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-users">
            <Users className="w-4 h-4 shrink-0" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="picklists" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-picklists">
            <ListFilter className="w-4 h-4 shrink-0" />
            <span>Picklists</span>
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-programs">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Programs</span>
          </TabsTrigger>
          <TabsTrigger value="archetypes" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-archetypes">
            <Fingerprint className="w-4 h-4 shrink-0" />
            <span>Archetypes</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-events">
            <CalendarRange className="w-4 h-4 shrink-0" />
            <span>Events</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-analytics">
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-flags">
            <Flag className="w-4 h-4 shrink-0" />
            <span>Flags</span>
          </TabsTrigger>
          <TabsTrigger value="challenge-videos" className="gap-1 py-2.5 px-2 text-xs sm:text-sm flex items-center justify-center" data-testid="tab-challenge-videos">
            <Flame className="w-4 h-4 shrink-0" />
            <span>Challenge</span>
          </TabsTrigger>
        </TabsList>

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
        <TabsContent value="metrics" className="space-y-6">
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
        </TabsContent>

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
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-6">
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
        </TabsContent>

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
                              <SelectTrigger className="h-8 w-[90px] text-xs" data-testid={`select-plan-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
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
        <TabsContent value="picklists" className="space-y-8">
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
        </TabsContent>
        {/* Analytics Tab */}
        <TabsContent value="programs" className="space-y-6">
          <ProgramListSection mode="admin" />
        </TabsContent>

        <TabsContent value="archetypes" className="space-y-6">
          <AdminArchetypesSection />
        </TabsContent>

        <TabsContent value="events" className="space-y-10">
          <AdminEventsSection />
          <div className="border-t border-border/40 pt-8">
            <AdminStatChallengesSection />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdminAnalyticsTab />
        </TabsContent>

        <TabsContent value="flags" className="space-y-6">
          <FeatureFlagsTab />
        </TabsContent>

        <TabsContent value="challenge-videos" className="space-y-6">
          <ChallengeVideosTab />
        </TabsContent>

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
  return (
    <div className="space-y-4" data-testid="section-analytics">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          <TabsTrigger value="overview" data-testid="tab-analytics-overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart2 className="w-4 h-4 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-analytics-retention" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Flame className="w-4 h-4 mr-1.5" /> Retention
          </TabsTrigger>
          <TabsTrigger value="funnels" data-testid="tab-analytics-funnels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GitBranch className="w-4 h-4 mr-1.5" /> Funnels
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-analytics-users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-1.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-analytics-content" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Trophy className="w-4 h-4 mr-1.5" /> Content
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-analytics-ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Lightbulb className="w-4 h-4 mr-1.5" /> AI Insights
          </TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-analytics-live" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4 mr-1.5" /> Live
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewSubTab /></TabsContent>
        <TabsContent value="retention" className="mt-6"><RetentionSubTab /></TabsContent>
        <TabsContent value="funnels" className="mt-6"><FunnelsSubTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersSubTab /></TabsContent>
        <TabsContent value="content" className="mt-6"><ContentSubTab /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AiInsightsSubTab /></TabsContent>
        <TabsContent value="live" className="mt-6"><LiveActivitySubTab /></TabsContent>
      </Tabs>
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
  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/retention"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/retention");
      return res.json();
    },
  });

  const { data: engagement } = useQuery<any>({
    queryKey: ["/api/admin/analytics/engagement"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/engagement");
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

  return (
    <div className="space-y-8">
      {/* D1/D7/D30 Retention */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Day-N Retention</h2>
        <p className="text-sm text-muted-foreground mb-3">% of new signups who returned to the app within N days of joining.</p>
        <div className="grid grid-cols-3 gap-4">
          <RetentionCard label="Day 1" pct={curves.d1} sample={curves.eligibleD1} icon={Zap} accent="orange" />
          <RetentionCard label="Day 7" pct={curves.d7} sample={curves.eligibleD7} icon={Flame} accent="blue" />
          <RetentionCard label="Day 30" pct={curves.d30} sample={curves.eligibleD30} icon={Target} accent="purple" />
        </div>
      </div>

      {/* Cohort Heatmap */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">Cohort Retention Heatmap</h2>
          <p className="text-xs text-muted-foreground">% of each weekly signup cohort still active in subsequent weeks</p>
        </div>
        <Card>
          <CardContent className="p-4 overflow-x-auto">
            <CohortHeatmap cohorts={cohort.cohorts} maxOffset={cohort.maxOffset} />
          </CardContent>
        </Card>
      </div>

      {/* Power-User Concentration */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Power-User Concentration</h2>
        <p className="text-sm text-muted-foreground mb-3">
          What share of all training activity comes from your top users? A healthy product has activity distributed across many users.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ConcentrationCard label="Top 1%" stat={power.top1} totalUsers={power.totalUsers} totalLogs={power.totalLogs} />
          <ConcentrationCard label="Top 10%" stat={power.top10} totalUsers={power.totalUsers} totalLogs={power.totalLogs} />
          <ConcentrationCard label="Top 25%" stat={power.top25} totalUsers={power.totalUsers} totalLogs={power.totalLogs} />
        </div>
      </div>

      {/* Engagement Score Distribution */}
      {engagement && (
        <>
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">Engagement Score Distribution</h2>
              <p className="text-xs text-muted-foreground">
                Avg score: <span className="font-semibold text-foreground">{engagement.avgScore}</span> across {engagement.activeUserCount} active users
              </p>
            </div>
            <Card>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={engagement.distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Users" radius={[4,4,0,0]}>
                      {engagement.distribution.map((_: any, i: number) => (
                        <Cell key={i} fill={["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"][i] || "#666"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                Score (0–100) = app recency × 35 + app frequency × 35 + app breadth × 15 + training signal × 15
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Two columns: Top engaged + At-risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EngagementUserList
              title="Most Engaged Users"
              icon={Trophy}
              accent="text-green-500"
              users={engagement.topUsers}
              emptyMessage="No engagement data yet"
            />
            <EngagementUserList
              title="At-Risk Users"
              icon={AlertTriangle}
              accent="text-orange-500"
              users={engagement.atRisk}
              emptyMessage="No at-risk users — everyone's engaged!"
              subtitle="Recently active but slipping (score 15–40). Re-engagement candidates."
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Retention helper components ───────────────────────────────────────────

function RetentionCard({ label, pct, sample, icon: Icon, accent }: {
  label: string; pct: number; sample: number; icon: LucideIcon;
  accent: "orange" | "blue" | "purple";
}) {
  const colorMap = {
    orange: "text-orange-500 bg-orange-500/10",
    blue:   "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  };
  return (
    <Card data-testid={`retention-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={`p-2 rounded-lg ${colorMap[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-3xl font-bold">{pct}%</p>
        <p className="text-xs text-muted-foreground mt-1">{sample.toLocaleString()} eligible signups</p>
      </CardContent>
    </Card>
  );
}

function ConcentrationCard({ label, stat, totalUsers, totalLogs }: {
  label: string;
  stat: { userCount: number; logShare: number };
  totalUsers: number;
  totalLogs: number;
}) {
  return (
    <Card data-testid={`concentration-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{label} of users</p>
          <p className="text-xs text-muted-foreground">{stat.userCount.toLocaleString()} of {totalUsers.toLocaleString()}</p>
        </div>
        <p className="text-3xl font-bold">{stat.logShare}%</p>
        <p className="text-xs text-muted-foreground mt-1">of all {totalLogs.toLocaleString()} training logs</p>
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
    if (pct === 0) return "bg-muted/30 text-muted-foreground";
    if (pct < 10)  return "bg-orange-500/10 text-foreground";
    if (pct < 25)  return "bg-orange-500/25 text-foreground";
    if (pct < 50)  return "bg-orange-500/45 text-foreground";
    if (pct < 75)  return "bg-orange-500/65 text-white";
    return "bg-orange-500/85 text-white";
  };

  const fmtCohort = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Sort cohorts newest first for readability
  const orderedCohorts = [...cohorts].sort((a, b) => b.cohortWeek.localeCompare(a.cohortWeek));

  return (
    <div className="min-w-[700px]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left pb-2 pr-4 font-medium">Cohort</th>
            <th className="text-right pb-2 pr-4 font-medium">Size</th>
            {Array.from({ length: maxOffset + 1 }, (_, i) => (
              <th key={i} className="text-center pb-2 px-1 font-medium">W{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedCohorts.map(c => (
            <tr key={c.cohortWeek} data-testid={`cohort-row-${c.cohortWeek}`}>
              <td className="py-1 pr-4 font-medium">Week of {fmtCohort(c.cohortWeek)}</td>
              <td className="py-1 pr-4 text-right text-muted-foreground">{c.cohortSize}</td>
              {Array.from({ length: maxOffset + 1 }, (_, i) => {
                const cell = c.retention.find(r => r.weekOffset === i);
                if (!cell) {
                  return <td key={i} className="py-1 px-0.5"><div className="h-9 rounded bg-transparent" /></td>;
                }
                return (
                  <td key={i} className="py-1 px-0.5">
                    <div className={`h-9 rounded flex flex-col items-center justify-center ${cellColor(cell.pct)}`} title={`${cell.activeUsers} of ${c.cohortSize} active`}>
                      <span className="text-[11px] font-semibold">{cell.pct}%</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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

const FUNNEL_PRESETS = [
  { value: "activation", label: "Activation" },
  { value: "booking",    label: "Booking" },
  { value: "engagement", label: "Engagement Loop" },
];

const WINDOW_OPTIONS = [
  { value: "7",  label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function FunnelsSubTab() {
  const [funnel, setFunnel] = useState<string>("activation");
  const [days, setDays] = useState<string>("30");

  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/admin/analytics/funnels", funnel, days],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/analytics/funnels?funnel=${encodeURIComponent(funnel)}&days=${encodeURIComponent(days)}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Conversion Funnels</h2>
        <p className="text-sm text-muted-foreground">
          See how users move through the most important sequences in your product. Each step requires the previous step to have happened first for the same user.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Funnel</span>
          <Select value={funnel} onValueChange={setFunnel}>
            <SelectTrigger className="w-[200px]" data-testid="select-funnel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUNNEL_PRESETS.map(o => (
                <SelectItem key={o.value} value={o.value} data-testid={`funnel-option-${o.value}`}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Window</span>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[160px]" data-testid="select-funnel-window">
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
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      )}

      {isError && (
        <Card data-testid="funnels-error-state">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
            <p className="font-medium">Couldn't load funnel data</p>
            <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-funnel">Retry</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && (
        <FunnelView data={data} />
      )}
    </div>
  );
}

function FunnelView({ data }: { data: {
  funnel: string;
  label: string;
  description: string;
  windowDays: number;
  totalCandidates: number;
  steps: Array<{ key: string; label: string; users: number; pctFromStart: number; pctFromPrev: number; dropOff: number; medianTimeToNextSec: number | null }>;
} }) {
  const startUsers = data.steps[0]?.users ?? 0;

  if (startUsers === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-2">
          <GitBranch className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="font-medium">No funnel data yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No users have entered the "{data.steps[0]?.label}" step in the last {data.windowDays} days. Funnels populate as users start triggering events — try a longer window or pick a different funnel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">{data.label}</h3>
            <p className="text-xs text-muted-foreground">{data.description}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Last {data.windowDays} days · {data.totalCandidates.toLocaleString()} entered
          </p>
        </div>

        <div className="space-y-1">
          {data.steps.map((step, i) => {
            const widthPct = data.steps[0].users > 0
              ? Math.max(2, (step.users / data.steps[0].users) * 100)
              : 2;
            return (
              <div key={step.key} data-testid={`funnel-step-${step.key}`}>
                {i > 0 && (
                  <div className="flex items-center gap-2 my-2 ml-2 text-xs text-muted-foreground">
                    <ArrowDown className="w-3 h-3" />
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
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div
                    className="bg-primary/15 transition-all"
                    style={{ width: `${widthPct}%` }}
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3 min-w-fit">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          <span className="text-muted-foreground mr-2">{i + 1}.</span>
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
                        <div className="text-2xl font-bold">{step.pctFromStart}%</div>
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
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">End-to-end conversion</span>
          <span className="font-semibold text-lg">
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
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    segments: Segment[];
    totalUsers: number;
    segmentDetails: Record<string, SegmentUser[]>;
  }>({
    queryKey: ["/api/admin/analytics/segments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/segments");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="segments-error-state">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <p className="font-medium">Couldn't load segment data</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Unknown error"}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="btn-retry-segments">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const activeSegment = selected ? data.segments.find(s => s.key === selected) ?? null : null;
  const activeUsers = selected ? data.segmentDetails[selected] ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">User Segmentation</h2>
          <p className="text-sm text-muted-foreground">
            Every user is auto-grouped into one behavioral segment based on signup recency and 28-day app activity. Workout logs are shown separately. Click a segment to see who's in it.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.totalUsers.toLocaleString()} total users
        </p>
      </div>

      {/* Segment cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.segments.map(seg => (
          <button
            key={seg.key}
            type="button"
            onClick={() => setSelected(seg.key === selected ? null : seg.key)}
            className={`text-left rounded-xl border p-4 transition-all hover-elevate active-elevate-2 ${
              selected === seg.key ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
            data-testid={`segment-card-${seg.key}`}
          >
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="font-semibold text-sm truncate">{seg.label}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{seg.pct}%</span>
            </div>
            <p className="text-2xl font-bold mb-1">{seg.count.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{seg.description}</p>
          </button>
        ))}
      </div>

      {/* Selected segment user list */}
      {activeSegment && (
        <Card data-testid={`segment-detail-${activeSegment.key}`}>
          <CardContent className="p-0">
            <div className="p-4 border-b flex items-baseline justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: activeSegment.color }} />
                  {activeSegment.label}
                </h3>
                <p className="text-xs text-muted-foreground">{activeSegment.description}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0 ml-4">
                Showing {Math.min(activeUsers.length, 50)} of {activeSegment.count.toLocaleString()}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                  <TableHead className="text-right">28d App Days</TableHead>
                  <TableHead className="text-right">28d Logs</TableHead>
                  <TableHead className="text-right">Last Active</TableHead>
                  <TableHead className="text-right pr-4">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No users in this segment.</TableCell></TableRow>
                )}
                {activeUsers.map(u => (
                  <TableRow key={u.userId} data-testid={`segment-user-${u.userId}`}>
                    <TableCell className="pl-4">
                      <div className="font-medium text-sm">{u.name || u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{u.role}</Badge></TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{u.signedUpDaysAgo}d ago</TableCell>
                    <TableCell className="text-right font-semibold">{u.appDays28d ?? 0}</TableCell>
                    <TableCell className="text-right">{u.logs28d}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {u.lastActiveDaysAgo == null ? "Never" : `${u.lastActiveDaysAgo}d ago`}
                    </TableCell>
                    <TableCell className="text-right pr-4 text-xs">
                      {u.currentStreak > 0 ? <span className="font-semibold text-orange-500">{u.currentStreak}d</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Content Performance sub-tab ───────────────────────────────────────────

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
