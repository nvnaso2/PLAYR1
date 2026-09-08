import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
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
import { queryClient, apiRequest, nativeFetch, getObjectUrl } from "@/lib/queryClient";
import { 
  Video, 
  Upload, 
  Play,
  Lock,
  Globe,
  Trash2,
  Pencil,
  FileVideo,
  X,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, UserVideo } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";

// Detect if a URL is served through our object storage proxy
function isInternalVideoUrl(url?: string | null): boolean {
  return !!url && url.startsWith("/objects/");
}

// Convert a YouTube/Vimeo watch URL to an embeddable URL
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}?autoplay=1`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}?autoplay=1`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/\//g, "");
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

// Generate a thumbnail JPEG blob from a video File using canvas
async function generateVideoThumbnail(file: File, signal?: AbortSignal): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
      resolve(blob);
    };
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const capture = () => {
      try {
        const MAX = 640;
        const scale = Math.min(MAX / video.videoWidth, MAX / video.videoHeight, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          finish(blob);
        }, "image/jpeg", 0.82);
      } catch {
        finish(null);
      }
    };

    const cancel = () => finish(null);
    signal?.addEventListener("abort", cancel, { once: true });
    video.addEventListener("loadedmetadata", () => {
      if (signal?.aborted) return;
      video.currentTime = video.duration > 1 ? 1 : 0;
    });
    video.addEventListener("seeked", capture);
    video.addEventListener("error", () => finish(null));
  });
}

const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  videoUrl: z.string().optional(),
  description: z.string().optional(),
  drillId: z.string().optional(),
  isPublic: z.boolean().default(true),
});

type VideoFormData = z.infer<typeof videoFormSchema>;

export default function VideosPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<UserVideo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSessionRef = useRef(0);
  const thumbnailAbortRef = useRef<AbortController | null>(null);

  const {
    uploadFile: transferVideo,
    cancelUpload,
    isUploading,
    progress: uploadProgress,
    status: uploadStatus,
  } = useUpload({
    requestUrl: "/api/user/uploads/request-url",
    finalizeVideo: false,
    onSuccess: (response) => {
      setUploadedVideoUrl(response.objectPath);
      setUploadError(null);
      toast({
        title: "Video transfer complete",
        description: "You can save it now. Compatibility processing will continue after saving.",
      });
    },
    onError: (error) => {
      setUploadError(error.message);
      toast({
        title: "Upload failed",
        description: `${error.message} You can retry without choosing the file again.`,
        variant: "destructive",
      });
    },
  });

  const uploadThumbnailBlob = async (blob: Blob, signal: AbortSignal): Promise<string> => {
    const thumbFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
    const resp = await nativeFetch("/api/user/uploads/photo-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ name: thumbFile.name, size: thumbFile.size, contentType: "image/jpeg" }),
    });
    if (!resp.ok) throw new Error("Could not prepare the thumbnail");
    const { uploadURL, objectPath } = await resp.json();
    const putResp = await fetch(uploadURL, {
      method: "PUT",
      body: thumbFile,
      headers: { "Content-Type": "image/jpeg" },
      signal,
    });
    if (!putResp.ok) throw new Error("Could not upload the thumbnail");
    return objectPath;
  };

  const beginUpload = (file: File) => {
    const sessionId = ++uploadSessionRef.current;
    thumbnailAbortRef.current?.abort();
    const thumbnailController = new AbortController();
    thumbnailAbortRef.current = thumbnailController;
    setUploadedVideoUrl(null);
    setUploadedThumbnailUrl(null);
    setUploadError(null);
    setThumbnailError(null);

    // Thumbnail generation is local and runs alongside the real byte transfer.
    const thumbnailPromise = generateVideoThumbnail(file, thumbnailController.signal);
    void transferVideo(file).then(async (response) => {
      if (!response || uploadSessionRef.current !== sessionId) return;
      const thumbnailBlob = await thumbnailPromise;
      if (!thumbnailBlob || uploadSessionRef.current !== sessionId) return;
      try {
        const thumbnailPath = await uploadThumbnailBlob(thumbnailBlob, thumbnailController.signal);
        if (uploadSessionRef.current === sessionId) setUploadedThumbnailUrl(thumbnailPath);
      } catch (error) {
        if (thumbnailController.signal.aborted || uploadSessionRef.current !== sessionId) return;
        setThumbnailError(error instanceof Error ? error.message : "Thumbnail upload failed");
      }
    });
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
      isPublic: true,
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

    // Validate file size (4GB max — matches server limit)
    if (file.size > 4 * 1024 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Video files must be under 4GB.",
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

    beginUpload(file);
  };

  const clearSelectedFile = () => {
    ++uploadSessionRef.current;
    cancelUpload();
    thumbnailAbortRef.current?.abort();
    thumbnailAbortRef.current = null;
    setSelectedFile(null);
    setUploadedVideoUrl(null);
    setUploadedThumbnailUrl(null);
    setUploadError(null);
    setThumbnailError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createVideoMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      const payload = {
        ...data,
        videoUrl: uploadedVideoUrl || data.videoUrl || "",
        thumbnailUrl: uploadedThumbnailUrl || null,
        drillId: data.drillId === "__none__" ? null : (data.drillId || null),
      };
      return await apiRequest("POST", "/api/videos", payload);
    },
    onSuccess: (response) => {
      const transferredPath = uploadedVideoUrl;
      void response.json().then((savedVideo: UserVideo) => {
        if (!transferredPath || !isInternalVideoUrl(transferredPath) || !savedVideo?.id) return;
        void nativeFetch(`/api/videos/${savedVideo.id}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).then((processResponse) => {
          if (!processResponse.ok) throw new Error("Compatibility processing could not be started");
          toast({
            title: "Compatibility processing started",
            description: "Your original upload is ready to play while this finishes in the background.",
          });
        }).catch(() => {
          toast({
            title: "Video saved",
            description: "Compatibility processing could not start. The original upload is still available.",
          });
        });
      });
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

  const updateVideoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VideoFormData> }) => {
      return await apiRequest("PATCH", `/api/videos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({ title: "Video Updated" });
      setEditingVideo(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update video.", variant: "destructive" });
    },
  });

  const [editingVideo, setEditingVideo] = useState<UserVideo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDrillId, setEditDrillId] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);

  const openEdit = (video: UserVideo) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || "");
    setEditDrillId(video.drillId || "__none__");
    setEditIsPublic(video.isPublic ?? false);
  };

  const saveEdit = () => {
    if (!editingVideo) return;
    updateVideoMutation.mutate({
      id: editingVideo.id,
      data: {
        title: editTitle,
        description: editDescription || undefined,
        drillId: editDrillId === "__none__" ? undefined : editDrillId,
        isPublic: editIsPublic,
      },
    });
  };

  const toggleVisibility = (video: UserVideo) => {
    updateVideoMutation.mutate({
      id: video.id,
      data: { isPublic: !video.isPublic },
    });
  };

  const onSubmit = (data: VideoFormData) => {
    if (createVideoMutation.isPending || isUploading) return;
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

  const closeUploadDialog = () => {
    setIsDialogOpen(false);
    form.reset();
    clearSelectedFile();
  };

  return (
    <div className="min-h-full bg-[#090909] p-4 text-zinc-100 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-col items-start justify-between gap-5 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Player library</p>
          <h1 className="font-heading text-3xl uppercase tracking-wide text-white sm:text-4xl" data-testid="text-page-title">My Filmroom</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Review the work. Keep the reps honest.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : closeUploadDialog()}>
          <DialogTrigger asChild>
            <Button className="min-h-11 w-full gap-2 bg-orange-500 px-5 font-heading text-base uppercase tracking-wide text-black hover:bg-orange-400 sm:w-auto" data-testid="button-upload-video">
              <Upload className="h-4 w-4" />
              Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] max-w-lg border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-h-[85vh]">
            <DialogHeader className="pr-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Add to filmroom</p>
              <DialogTitle className="font-heading text-2xl uppercase tracking-wide text-white">Upload Training Video</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Transfer a file or paste a public video link.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[calc(92vh-130px)] space-y-4 overflow-y-auto pr-1 sm:max-h-[calc(85vh-130px)]">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Crossover Practice — Week 3"
                          {...field}
                          className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400"
                          data-testid="input-video-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload Section */}
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Upload Video</FormLabel>
                  <div className="space-y-3">
                    {!selectedFile ? (
                      <div 
                        className="cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60 p-7 text-center transition hover:border-orange-400/70 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
                        role="button"
                        tabIndex={0}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          data-testid="input-video-file"
                        />
                        <FileVideo className="mx-auto mb-2 h-9 w-9 text-orange-400" />
                        <p className="text-sm text-zinc-200">
                          Choose a video file
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          MP4, WebM, QuickTime, AVI (max 4GB)
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                        <div className="flex items-center gap-3">
                          <FileVideo className="h-8 w-8 shrink-0 text-orange-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">{selectedFile.name}</p>
                            <p className="text-xs text-zinc-500">
                              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={clearSelectedFile}
                            className="h-10 w-10 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            aria-label="Remove selected video"
                            title="Remove selected video"
                            data-testid="button-remove-selected-video"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="mt-3 space-y-2">
                          {isUploading && (
                            <>
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-orange-300"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading</span>
                                <span className="font-mono text-zinc-400">{uploadProgress}%</span>
                              </div>
                              <Progress value={uploadProgress} className="h-1.5 bg-zinc-800 [&>div]:bg-orange-500" />
                            </>
                          )}
                          {!isUploading && uploadStatus === "error" && (
                            <div className="flex items-center justify-between gap-3 text-xs text-red-300">
                              <span className="flex min-w-0 items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{uploadError || "Upload failed"}</span></span>
                              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 border-zinc-600 text-zinc-200 hover:bg-zinc-800" onClick={() => beginUpload(selectedFile)}>Retry</Button>
                            </div>
                          )}
                          {!isUploading && uploadedVideoUrl && uploadStatus === "success" && (
                            <p className="flex items-center gap-1.5 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" /> Video ready to save</p>
                          )}
                          {thumbnailError && uploadedVideoUrl && (
                            <p className="text-xs text-amber-300">Video is ready, but its thumbnail could not be generated.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormDescription className="text-zinc-500">
                    Upload from your device, or paste a URL below
                  </FormDescription>
                </FormItem>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-950 px-2 text-zinc-600">Or use a link</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Video URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://youtube.com/... or https://vimeo.com/..."
                          {...field}
                          disabled={!!uploadedVideoUrl}
                          className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400"
                          data-testid="input-video-url"
                        />
                      </FormControl>
                      <FormDescription className="text-zinc-500">
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
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Related Drill (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white focus:ring-orange-400" data-testid="select-drill">
                            <SelectValue placeholder="Select a drill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
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
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notes about this session..."
                          className="resize-none border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400"
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
                    <FormItem className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-semibold uppercase tracking-wide text-zinc-200">Make Public</FormLabel>
                        <FormDescription className="text-zinc-500">
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

                <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-zinc-800 bg-zinc-950 pt-4 sm:flex-row sm:justify-end">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="min-h-11 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={closeUploadDialog}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="min-h-11 bg-orange-500 font-heading text-base uppercase tracking-wide text-black hover:bg-orange-400"
                    disabled={createVideoMutation.isPending || isUploading}
                    data-testid="button-submit-video"
                  >
                    {isUploading ? `Uploading ${uploadProgress}%` : createVideoMutation.isPending ? "Saving..." : "Save Video"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-zinc-800 bg-zinc-900">
              <Skeleton className="aspect-video bg-zinc-800" />
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-5 w-3/4 bg-zinc-800" />
                <Skeleton className="h-4 w-1/2 bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos && videos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card 
              key={video.id} 
              className="group overflow-hidden border-zinc-800 bg-zinc-900 transition hover:border-zinc-600"
              data-testid={`card-video-${video.id}`}
            >
              <div className="relative aspect-video bg-zinc-950">
                {video.thumbnailUrl ? (
                  <img 
                    src={getObjectUrl(video.thumbnailUrl) ?? video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : isInternalVideoUrl(video.videoUrl) ? (
                  // Render first frame of object-storage video as visual thumbnail
                  <video
                    src={getObjectUrl(video.videoUrl) ?? undefined}
                    preload="metadata"
                    muted
                    playsInline
                    className="pointer-events-none h-full w-full object-cover"
                    onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-950">
                    <Video className="h-12 w-12 text-zinc-700" />
                  </div>
                )}
                {/* Play overlay */}
                <div
                  className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-colors group-hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  role="button"
                  tabIndex={0}
                  onClick={() => setPlayingVideo(video)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setPlayingVideo(video); }}
                  data-testid={`button-play-${video.id}`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <Play className="ml-1 h-6 w-6 fill-current text-black" />
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="border-zinc-600 bg-black/60 text-xs text-zinc-200">
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
                    <h3 className="truncate font-heading text-lg uppercase tracking-wide text-white" data-testid={`text-video-title-${video.id}`}>
                      {video.title}
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      {video.createdAt 
                        ? format(new Date(video.createdAt), 'MMM d, yyyy')
                        : 'Unknown date'
                      }
                    </p>
                    {video.drillId && (
                      <Badge variant="outline" className="mt-2 border-orange-500/40 text-xs text-orange-300">
                        {getDrillTitle(video.drillId)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(video)}
                      className={video.isPublic ? "text-orange-400 hover:bg-zinc-800" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"}
                      title={video.isPublic ? "Make Private" : "Make Public"}
                      data-testid={`button-toggle-visibility-${video.id}`}
                    >
                      {video.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(video)}
                      className="text-zinc-500 hover:bg-zinc-800 hover:text-white"
                      data-testid={`button-edit-${video.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVideoMutation.mutate(video.id)}
                      className="text-zinc-500 hover:bg-red-950/40 hover:text-red-300"
                      data-testid={`button-delete-${video.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {video.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                    {video.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-8 text-center sm:p-12">
            <Video className="mx-auto mb-4 h-16 w-16 text-zinc-700" />
            <h3 className="mb-2 font-heading text-2xl uppercase tracking-wide text-white">No Videos Yet</h3>
            <p className="mx-auto mb-4 max-w-md text-zinc-400">
              Upload your training videos to track your progress and review your form.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="min-h-11 gap-2 bg-orange-500 font-heading text-base uppercase tracking-wide text-black hover:bg-orange-400" data-testid="button-first-upload">
              <Upload className="h-4 w-4" />
              Upload Your First Video
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingVideo} onOpenChange={(open) => { if (!open) setEditingVideo(null); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100" data-testid="dialog-edit-video">
          <DialogHeader className="pr-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Filmroom details</p>
            <DialogTitle className="font-heading text-2xl uppercase tracking-wide text-white">Edit Video</DialogTitle>
            <DialogDescription className="text-zinc-400">Update your video details and visibility.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 border-zinc-700 bg-zinc-900 text-white focus-visible:ring-orange-400"
                data-testid="input-edit-title"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 border-zinc-700 bg-zinc-900 text-white focus-visible:ring-orange-400"
                rows={3}
                data-testid="input-edit-description"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Linked Drill</label>
              <Select value={editDrillId} onValueChange={setEditDrillId}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-900 text-white focus:ring-orange-400" data-testid="select-edit-drill">
                  <SelectValue placeholder="No drill linked" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                  <SelectItem value="__none__">No drill linked</SelectItem>
                  {drills?.map((drill) => (
                    <SelectItem key={drill.id} value={drill.id}>{drill.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold uppercase tracking-wide text-zinc-200">Public on Profile</label>
                <p className="text-xs text-zinc-500">Show this video on your public player profile</p>
              </div>
              <Switch
                checked={editIsPublic}
                onCheckedChange={setEditIsPublic}
                data-testid="switch-edit-public"
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="min-h-11 border-zinc-700 text-zinc-200 hover:bg-zinc-800" onClick={() => setEditingVideo(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button className="min-h-11 bg-orange-500 font-heading text-base uppercase tracking-wide text-black hover:bg-orange-400" onClick={saveEdit} disabled={!editTitle.trim() || updateVideoMutation.isPending} data-testid="button-save-edit">
                {updateVideoMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={!!playingVideo} onOpenChange={(open) => { if (!open) setPlayingVideo(null); }}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-zinc-800 bg-zinc-950 p-0 text-zinc-100" data-testid="dialog-video-player">
          <DialogHeader className="border-b border-zinc-800 px-4 pb-3 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Playback</p>
            <DialogTitle className="truncate pr-8 font-heading text-2xl uppercase tracking-wide text-white">{playingVideo?.title}</DialogTitle>
          </DialogHeader>
          {playingVideo && (() => {
            const url = playingVideo.videoUrl;
            if (isInternalVideoUrl(url)) {
              // Uploaded file — serve through backend proxy
              const resolvedUrl = getObjectUrl(url) ?? url;
              return (
                <video
                  key={resolvedUrl}
                  src={resolvedUrl ?? undefined}
                  controls
                  autoPlay
                  className="w-full bg-black"
                  style={{ maxHeight: "60vh" }}
                  data-testid="video-player-element"
                />
              );
            }
            const embedUrl = url ? toEmbedUrl(url) : null;
            if (embedUrl) {
              // YouTube / Vimeo embed
              return (
                <iframe
                  key={embedUrl}
                  src={embedUrl}
                  className="w-full"
                  style={{ height: "50vh" }}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={playingVideo.title}
                  data-testid="video-embed-frame"
                />
              );
            }
            // Unknown external URL — link out
            return (
              <div className="p-6 text-center space-y-3">
                <Video className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">
                  This video can't be embedded. Open it in a new tab to watch.
                </p>
                <a
                  href={url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary underline text-sm"
                  data-testid="link-open-video"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open video
                </a>
              </div>
            );
          })()}
          {playingVideo?.description && (
            <p className="px-4 pb-4 text-sm text-zinc-400">{playingVideo.description}</p>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
