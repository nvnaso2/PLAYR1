import { useState, useRef } from "react";
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
import { Plus, Pencil, Trash2, Video, Star, StarOff, ShieldAlert, Users, Shield, Settings2, Calculator, Hash, Upload, Loader2, Film, Ruler, Check } from "lucide-react";
import type { Drill, DrillCategory, DifficultyLevel, DrillMetric, VideoLibrary, MetricTemplate } from "@shared/schema";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS, METRIC_TYPES } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";
import { Checkbox } from "@/components/ui/checkbox";

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
  videoLibraryId: z.string().optional(),
  videoUrl: z.string().optional().refine((val) => !val || val.startsWith("/objects/") || val.startsWith("http"), "Must be a valid URL or uploaded file"),
  thumbnailUrl: z.string().optional().refine((val) => !val || val.startsWith("/objects/") || val.startsWith("http"), "Must be a valid URL or uploaded file"),
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
  
  const { uploadFile: uploadVideoFile, isUploading: isUploadingVideo } = useUpload({
    onSuccess: (response) => {
      form.setValue("videoUrl", response.objectPath);
      toast({ title: "Video uploaded successfully" });
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

  // Fetch video library for video selector
  const { data: videoLibraryList } = useQuery<VideoLibrary[]>({
    queryKey: ['/api/video-library'],
  });

  const form = useForm<DrillFormData>({
    resolver: zodResolver(drillFormSchema),
    defaultValues: {
      title: drill?.title || "",
      description: drill?.description || "",
      category: drill?.category || "ball-handling",
      difficulty: drill?.difficulty || "beginner",
      videoLibraryId: drill?.videoLibraryId || "",
      videoUrl: drill?.videoUrl || "",
      thumbnailUrl: drill?.thumbnailUrl || "",
      duration: drill?.duration || undefined,
      equipment: drill?.equipment?.join(", ") || "",
      tips: drill?.tips?.join("\n") || "",
      isFeatured: drill?.isFeatured || false,
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
          name="videoLibraryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Video from Library</FormLabel>
              <Select 
                onValueChange={(value) => handleVideoLibrarySelect(value)} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-drill-video-library">
                    <SelectValue placeholder="Choose a video from the library" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None (manual entry)</SelectItem>
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
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploadingVideo}
                    data-testid="input-drill-video-upload"
                  />
                  <Button type="button" variant="outline" disabled={isUploadingVideo} data-testid="button-drill-video-upload">
                    {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
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
              <FormLabel>Thumbnail</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="https://... or upload a file" {...field} data-testid="input-drill-thumbnail-url" />
                </FormControl>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploadingThumbnail}
                    data-testid="input-drill-thumbnail-upload"
                  />
                  <Button type="button" variant="outline" disabled={isUploadingThumbnail} data-testid="button-drill-thumbnail-upload">
                    {isUploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
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
  
  const { uploadFile: uploadVideoFile, isUploading: isUploadingVideo } = useUpload({
    onSuccess: (response) => {
      form.setValue("videoUrl", response.objectPath);
      toast({ title: "Video uploaded successfully" });
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

  const onSubmit = (data: VideoFormData) => {
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
                  accept="video/*"
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

        <div className="grid grid-cols-2 gap-4">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

// Metric Template Form Component
const metricFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(["number", "percentage", "time", "calculated"]),
  unit: z.string().optional(),
  formula: z.string().optional(),
  formulaInputs: z.string().optional(),
  category: z.string().optional(),
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
        <div className="grid grid-cols-2 gap-4">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-metric-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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

// Drill Metrics Configuration Component (now uses metric templates)
type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };

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
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const { data: drillMetrics, isLoading: metricsLoading } = useQuery<DrillMetricWithTemplate[]>({
    queryKey: ['/api/drills', drill.id, 'metrics'],
    queryFn: async () => {
      const res = await fetch(`/api/drills/${drill.id}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    enabled: open,
  });

  const { data: allTemplates, isLoading: templatesLoading } = useQuery<MetricTemplate[]>({
    queryKey: ['/api/metric-templates'],
    enabled: open,
  });

  // Update selected templates when drill metrics load
  useState(() => {
    if (drillMetrics) {
      setSelectedTemplates(drillMetrics.map(m => m.metricTemplateId));
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      return await apiRequest("POST", `/api/drills/${drill.id}/metrics`, { metricTemplateIds: templateIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills', drill.id, 'metrics'] });
      toast({ title: "Metrics updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update metrics", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSave = () => {
    saveMutation.mutate(selectedTemplates);
  };

  const isLoading = metricsLoading || templatesLoading;
  const currentTemplateIds = drillMetrics?.map(m => m.metricTemplateId) || [];

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
          <p className="text-sm text-muted-foreground">
            Select which metric templates to use for tracking progress on this drill.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !allTemplates?.length ? (
            <div className="text-center py-8 border rounded-md">
              <Ruler className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No metric templates available.</p>
              <p className="text-sm text-muted-foreground">Create templates in the Metrics tab first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allTemplates.map((template) => {
                const isSelected = selectedTemplates.includes(template.id) || 
                  (selectedTemplates.length === 0 && currentTemplateIds.includes(template.id));
                return (
                  <div 
                    key={template.id} 
                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover-elevate ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    onClick={() => handleToggleTemplate(template.id)}
                    data-testid={`template-select-${template.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => handleToggleTemplate(template.id)}
                      />
                      {template.type === "calculated" ? (
                        <Calculator className="w-4 h-4 text-primary" />
                      ) : (
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{template.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.type === "calculated" ? (
                            <span>Formula: {template.formula}</span>
                          ) : (
                            <span>Type: {template.type}{template.unit && ` • Unit: ${template.unit}`}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {template.category && (
                      <Badge variant="secondary" className="capitalize text-xs">
                        {template.category.replace("-", " ")}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              data-testid="button-save-drill-metrics"
            >
              {saveMutation.isPending ? "Saving..." : "Save Metrics"}
            </Button>
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
  const [isCreateVideoOpen, setIsCreateVideoOpen] = useState(false);
  const [isCreateMetricOpen, setIsCreateMetricOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoLibrary | null>(null);
  const [editingMetric, setEditingMetric] = useState<MetricTemplate | null>(null);
  const [configuringMetricsDrill, setConfiguringMetricsDrill] = useState<Drill | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("videos");

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

  const { data: metricTemplates, isLoading: metricsLoading } = useQuery<MetricTemplate[]>({
    queryKey: ['/api/metric-templates'],
    enabled: isAdmin,
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="videos" className="gap-2" data-testid="tab-videos">
            <Film className="w-4 h-4" />
            Video Library
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2" data-testid="tab-metrics">
            <Ruler className="w-4 h-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="drills" className="gap-2" data-testid="tab-drills">
            <Video className="w-4 h-4" />
            Drills
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
            <Users className="w-4 h-4" />
            Users
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
                    <Card key={video.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {video.thumbnailUrl ? (
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {video.duration && (
                          <Badge className="absolute bottom-2 right-2">
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
