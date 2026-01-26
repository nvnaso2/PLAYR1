import { useState, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
  Video, 
  Upload, 
  Play,
  Lock,
  Globe,
  MoreVertical,
  Trash2,
  Eye,
  FileVideo,
  X
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, UserVideo } from "@shared/schema";

const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  videoUrl: z.string().optional(),
  description: z.string().optional(),
  drillId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type VideoFormData = z.infer<typeof videoFormSchema>;

export default function VideosPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file using user-accessible endpoint
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // Step 1: Request presigned URL from user endpoint
      const response = await fetch("/api/user/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "video/mp4",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await response.json();
      setUploadProgress(30);

      // Step 2: Upload file to presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploadProgress(100);
      setUploadedVideoUrl(objectPath);
      toast({
        title: "Video Uploaded",
        description: "Your video file has been uploaded successfully.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      });
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const { data: videos, isLoading } = useQuery<UserVideo[]>({
    queryKey: ['/api/videos'],
  });

  const { data: drills } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: "",
      videoUrl: "",
      description: "",
      drillId: "__none__",
      isPublic: false,
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a video file (MP4, WebM, QuickTime, or AVI).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Video files must be under 100MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title from filename if empty
    const currentTitle = form.getValues("title");
    if (!currentTitle) {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      form.setValue("title", fileName);
    }

    // Upload the file
    await uploadFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadedVideoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createVideoMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      const payload = {
        ...data,
        videoUrl: uploadedVideoUrl || data.videoUrl || "",
        drillId: data.drillId === "__none__" ? null : (data.drillId || null),
      };
      return await apiRequest("POST", "/api/videos", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video Added",
        description: "Your training video has been saved.",
      });
      setIsDialogOpen(false);
      form.reset();
      clearSelectedFile();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video Deleted",
        description: "Your video has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VideoFormData) => {
    if (!uploadedVideoUrl && !data.videoUrl) {
      toast({
        title: "No Video",
        description: "Please upload a video file or enter a video URL.",
        variant: "destructive",
      });
      return;
    }
    createVideoMutation.mutate(data);
  };

  const getDrillTitle = (drillId?: string | null) => {
    if (!drillId) return null;
    const drill = drills?.find(d => d.id === drillId);
    return drill?.title;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Filmroom</h1>
          <p className="text-muted-foreground">
            Upload and manage your training videos
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-upload-video">
              <Upload className="w-4 h-4" />
              Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Upload Training Video</DialogTitle>
              <DialogDescription>
                Add a video URL to track your progress
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Crossover Practice - Week 3"
                          {...field}
                          data-testid="input-video-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload Section */}
                <FormItem>
                  <FormLabel>Upload Video</FormLabel>
                  <div className="space-y-3">
                    {!selectedFile ? (
                      <div 
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover-elevate"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          data-testid="input-video-file"
                        />
                        <FileVideo className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload a video file
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          MP4, WebM, QuickTime, AVI (max 100MB)
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center gap-3">
                          <FileVideo className="w-8 h-8 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                          {isUploading ? (
                            <div className="w-20">
                              <Progress value={uploadProgress} className="h-2" />
                            </div>
                          ) : uploadedVideoUrl ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Uploaded
                            </Badge>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={clearSelectedFile}
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Upload from your device, or paste a URL below
                  </FormDescription>
                </FormItem>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://youtube.com/... or https://vimeo.com/..."
                          {...field}
                          disabled={!!uploadedVideoUrl}
                          data-testid="input-video-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Paste a link from YouTube, Vimeo, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="drillId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Drill (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-drill">
                            <SelectValue placeholder="Select a drill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notes about this session..."
                          className="resize-none"
                          {...field}
                          data-testid="input-video-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Make Public</FormLabel>
                        <FormDescription>
                          Allow other users to view this video
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-public"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      clearSelectedFile();
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createVideoMutation.isPending || isUploading}
                    data-testid="button-submit-video"
                  >
                    {isUploading ? "Uploading..." : createVideoMutation.isPending ? "Saving..." : "Add Video"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-video" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos && videos.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card 
              key={video.id} 
              className="group overflow-hidden hover-elevate"
              data-testid={`card-video-${video.id}`}
            >
              <div className="relative aspect-video bg-muted">
                {video.thumbnailUrl ? (
                  <img 
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Video className="w-12 h-12 text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <a 
                    href={video.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-play-${video.id}`}
                  >
                    <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
                  </a>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant={video.isPublic ? "default" : "secondary"} className="text-xs">
                    {video.isPublic ? (
                      <><Globe className="w-3 h-3 mr-1" /> Public</>
                    ) : (
                      <><Lock className="w-3 h-3 mr-1" /> Private</>
                    )}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" data-testid={`text-video-title-${video.id}`}>
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {video.createdAt 
                        ? format(new Date(video.createdAt), 'MMM d, yyyy')
                        : 'Unknown date'
                      }
                    </p>
                    {video.drillId && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {getDrillTitle(video.drillId)}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteVideoMutation.mutate(video.id)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`button-delete-${video.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {video.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Videos Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Upload your training videos to track your progress and review your form.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-first-upload">
              <Upload className="w-4 h-4" />
              Upload Your First Video
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
