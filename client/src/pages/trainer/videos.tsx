import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, nativeFetch, getObjectUrl } from "@/lib/queryClient";
import {
  Video,
  Upload,
  Play,
  Edit2,
  Trash2,
  ExternalLink,
  Link2,
  Eye,
  X,
  Filter,
} from "lucide-react";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS } from "@shared/schema";

interface TrainerVideoData {
  id: string;
  trainerId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  difficulty: string | null;
  tags: string[] | null;
  createdAt: string;
}

interface TrainerDrill {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  duration: number | null;
  equipment: string[] | null;
  tips: string[] | null;
  trackShots: boolean | null;
  videoUrl: string | null;
  userId: string;
  createdAt: string;
}

interface TrainerGroup {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  ageGroup?: string;
  position?: string;
  level?: string;
  playerClass?: string;
  memberCount?: number;
  createdAt: string;
}

interface AggregatedVideo {
  id: string;
  userId: string;
  playerName: string;
  title: string;
  videoUrl: string;
  description: string | null;
  assignmentId: string | null;
  createdAt: string;
  groupId: string;
  groupName: string;
  position: string | null;
  ageGroup: string | null;
  playerAge: string | null;
}

const formatCategory = (cat: string) =>
  cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function MyVideosSection() {
  const { toast } = useToast();
  const [createVideoOpen, setCreateVideoOpen] = useState(false);
  const [editVideoId, setEditVideoId] = useState<string | null>(null);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoCategory, setVideoCategory] = useState("");
  const [videoDifficulty, setVideoDifficulty] = useState("beginner");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);
  const [assignVideoToDrillId, setAssignVideoToDrillId] = useState<string | null>(null);
  const [assignDrillTargetId, setAssignDrillTargetId] = useState("");

  const { data: trainerContentVideos, isLoading: contentVideosLoading } =
    useQuery<TrainerVideoData[]>({
      queryKey: ["/api/trainer/videos"],
    });

  const { data: trainerDrills, isLoading: drillsLoading } = useQuery<TrainerDrill[]>({
    queryKey: ["/api/trainer/drills"],
  });

  const createVideoMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      videoUrl: string;
      thumbnailUrl?: string;
      category?: string;
      difficulty?: string;
    }) => apiRequest("POST", "/api/trainer/videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/videos"] });
      setCreateVideoOpen(false);
      resetVideoForm();
      toast({ title: "Video uploaded!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload video", description: error.message, variant: "destructive" });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title: string;
        description?: string;
        videoUrl: string;
        thumbnailUrl?: string;
        category?: string;
        difficulty?: string;
      };
    }) => apiRequest("PUT", `/api/trainer/videos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/videos"] });
      setEditVideoId(null);
      resetVideoForm();
      toast({ title: "Video updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update video", description: error.message, variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/videos"] });
      setDeleteVideoId(null);
      toast({ title: "Video deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete video", description: error.message, variant: "destructive" });
    },
  });

  const assignVideoToDrillMutation = useMutation({
    mutationFn: ({ drillId, videoUrl }: { drillId: string; videoUrl: string }) =>
      apiRequest("PUT", `/api/trainer/drills/${drillId}`, { videoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      setAssignVideoToDrillId(null);
      setAssignDrillTargetId("");
      toast({ title: "Video assigned to drill" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign video", description: error.message, variant: "destructive" });
    },
  });

  const resetVideoForm = () => {
    setVideoTitle("");
    setVideoDescription("");
    setVideoCategory("");
    setVideoDifficulty("beginner");
    setVideoUrl("");
    setVideoThumbnailUrl("");
  };

  const openEditVideo = (video: TrainerVideoData) => {
    setEditVideoId(video.id);
    setVideoTitle(video.title);
    setVideoDescription(video.description || "");
    setVideoCategory(video.category || "");
    setVideoDifficulty(video.difficulty || "beginner");
    setVideoUrl(video.videoUrl);
    setVideoThumbnailUrl(video.thumbnailUrl || "");
    setCreateVideoOpen(true);
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setVideoUploadProgress(10);
    try {
      const metaRes = await nativeFetch("/api/user/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "video/mp4" }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await metaRes.json();
      setVideoUploadProgress(30);
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");
      setVideoUploadProgress(100);
      setVideoUrl(objectPath);
      toast({ title: "Video file uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(0);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const metaRes = await nativeFetch("/api/user/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload thumbnail");
      setVideoThumbnailUrl(objectPath);
      toast({ title: "Thumbnail uploaded!" });
    } catch (err: any) {
      toast({ title: "Thumbnail upload failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Upload instructional videos for your drills and workouts.
        </p>
        <Button
          onClick={() => {
            resetVideoForm();
            setEditVideoId(null);
            setCreateVideoOpen(true);
          }}
          data-testid="button-upload-video"
        >
          <Upload className="w-4 h-4" />
          Upload Video
        </Button>
      </div>

      {contentVideosLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : !trainerContentVideos?.length ? (
        <Card>
          <CardContent
            className="py-12 text-center text-muted-foreground"
            data-testid="text-no-trainer-videos"
          >
            <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No videos yet. Upload your first instructional video.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {trainerContentVideos.map((video) => (
            <Card key={video.id} data-testid={`card-trainer-video-${video.id}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {video.thumbnailUrl && (
                    <div
                      className="w-16 h-12 rounded-md overflow-hidden bg-muted shrink-0 cursor-pointer"
                      onClick={() => setPlayVideoUrl(video.videoUrl)}
                      data-testid={`thumbnail-trainer-video-${video.id}`}
                    >
                      <img
                        src={getObjectUrl(video.thumbnailUrl) ?? undefined}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {!video.thumbnailUrl && (
                    <div
                      className="w-16 h-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center cursor-pointer"
                      onClick={() => setPlayVideoUrl(video.videoUrl)}
                      data-testid={`thumbnail-trainer-video-${video.id}`}
                    >
                      <Video className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-medium truncate"
                        data-testid={`text-trainer-video-title-${video.id}`}
                      >
                        {video.title}
                      </h3>
                      {video.category && (
                        <Badge
                          variant="secondary"
                          className="no-default-hover-elevate text-xs"
                        >
                          {formatCategory(video.category)}
                        </Badge>
                      )}
                      {video.difficulty && (
                        <Badge
                          variant="outline"
                          className="no-default-hover-elevate text-xs capitalize"
                        >
                          {video.difficulty}
                        </Badge>
                      )}
                    </div>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                      {trainerDrills
                        ?.filter((d) => d.videoUrl === video.videoUrl)
                        .map((d) => (
                          <Badge
                            key={d.id}
                            variant="secondary"
                            className="no-default-hover-elevate text-xs gap-1"
                            data-testid={`badge-video-linked-drill-${d.id}`}
                          >
                            <Link2 className="w-3 h-3" />
                            {d.title}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPlayVideoUrl(video.videoUrl)}
                      title="Play"
                      data-testid={`button-play-trainer-video-${video.id}`}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAssignVideoToDrillId(video.id);
                        setAssignDrillTargetId("");
                      }}
                      title="Assign to Drill"
                      data-testid={`button-assign-video-${video.id}`}
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditVideo(video)}
                      title="Edit"
                      data-testid={`button-edit-trainer-video-${video.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteVideoId(video.id)}
                      title="Delete"
                      data-testid={`button-delete-trainer-video-${video.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createVideoOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateVideoOpen(false);
            setEditVideoId(null);
            resetVideoForm();
          }
        }}
      >
        <DialogContent className="max-h-[85vh] flex flex-col" data-testid="dialog-trainer-video">
          <DialogHeader>
            <DialogTitle>{editVideoId ? "Edit Video" : "Upload Video"}</DialogTitle>
            <DialogDescription>
              {editVideoId
                ? "Update video details."
                : "Upload an instructional video for your players."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Crossover Drill Breakdown"
                data-testid="input-trainer-video-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="What does this video cover?"
                className="resize-none"
                data-testid="input-trainer-video-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={videoCategory} onValueChange={setVideoCategory}>
                  <SelectTrigger data-testid="select-trainer-video-category">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {formatCategory(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={videoDifficulty} onValueChange={setVideoDifficulty}>
                  <SelectTrigger data-testid="select-trainer-video-difficulty">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Video File</label>
              {videoUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-primary/30 bg-primary/5">
                  <Video className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">Video uploaded</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVideoUrl("")}
                    data-testid="button-remove-video-file"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <label className="flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {videoUploading
                        ? `Uploading... ${videoUploadProgress}%`
                        : "Click to upload video"}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoFileUpload}
                      disabled={videoUploading}
                      data-testid="input-trainer-video-file"
                    />
                  </label>
                  {videoUploading && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail (optional)</label>
              {videoThumbnailUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-primary/30 bg-primary/5">
                  <Eye className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">Thumbnail uploaded</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVideoThumbnailUrl("")}
                    data-testid="button-remove-thumbnail"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload thumbnail</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                    data-testid="input-trainer-video-thumbnail"
                  />
                </label>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  const data = {
                    title: videoTitle,
                    description: videoDescription || undefined,
                    videoUrl,
                    thumbnailUrl: videoThumbnailUrl || undefined,
                    category: videoCategory || undefined,
                    difficulty: videoDifficulty || undefined,
                  };
                  if (editVideoId) {
                    updateVideoMutation.mutate({ id: editVideoId, data });
                  } else {
                    createVideoMutation.mutate(data);
                  }
                }}
                disabled={
                  !videoTitle.trim() ||
                  !videoUrl ||
                  createVideoMutation.isPending ||
                  updateVideoMutation.isPending
                }
                data-testid="button-submit-trainer-video"
              >
                {createVideoMutation.isPending || updateVideoMutation.isPending
                  ? "Saving..."
                  : editVideoId
                    ? "Update"
                    : "Upload"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteVideoId}
        onOpenChange={(open) => {
          if (!open) setDeleteVideoId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-video">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideoId && deleteVideoMutation.mutate(deleteVideoId)}
              data-testid="button-confirm-delete-video"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!playVideoUrl}
        onOpenChange={(open) => {
          if (!open) setPlayVideoUrl(null);
        }}
      >
        <DialogContent className="max-w-2xl" data-testid="dialog-play-trainer-video">
          <DialogHeader>
            <DialogTitle>Video Player</DialogTitle>
            <DialogDescription>Playing instructional video</DialogDescription>
          </DialogHeader>
          {playVideoUrl && (
            <video
              src={playVideoUrl}
              controls
              autoPlay
              className="w-full rounded-md max-h-[60vh]"
              data-testid="video-trainer-player"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assignVideoToDrillId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignVideoToDrillId(null);
            setAssignDrillTargetId("");
          }
        }}
      >
        <DialogContent data-testid="dialog-assign-video-to-drill">
          <DialogHeader>
            <DialogTitle>Assign Video to Drill</DialogTitle>
            <DialogDescription>
              Link this video to one of your custom drills so players can watch it when practicing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {drillsLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : !trainerDrills?.length ? (
              <p
                className="text-sm text-muted-foreground text-center py-4"
                data-testid="text-no-drills-to-assign"
              >
                No custom drills yet. Create a drill first.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Drill</label>
                  <Select value={assignDrillTargetId} onValueChange={setAssignDrillTargetId}>
                    <SelectTrigger data-testid="select-assign-drill-target">
                      <SelectValue placeholder="Choose a drill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trainerDrills.map((drill) => (
                        <SelectItem key={drill.id} value={drill.id}>
                          <span className="flex items-center gap-2">
                            {drill.title}
                            {drill.videoUrl && (
                              <span className="text-xs text-muted-foreground">(has video)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {assignDrillTargetId &&
                  trainerDrills.find((d) => d.id === assignDrillTargetId)?.videoUrl && (
                    <p
                      className="text-sm text-amber-500 dark:text-amber-400"
                      data-testid="text-drill-has-video-warning"
                    >
                      This drill already has a video assigned. Assigning this video will replace the
                      existing one.
                    </p>
                  )}
                <DialogFooter>
                  <Button
                    onClick={() => {
                      const video = trainerContentVideos?.find(
                        (v) => v.id === assignVideoToDrillId
                      );
                      if (video && assignDrillTargetId) {
                        assignVideoToDrillMutation.mutate({
                          drillId: assignDrillTargetId,
                          videoUrl: video.videoUrl,
                        });
                      }
                    }}
                    disabled={!assignDrillTargetId || assignVideoToDrillMutation.isPending}
                    data-testid="button-confirm-assign-video"
                  >
                    {assignVideoToDrillMutation.isPending ? "Assigning..." : "Assign Video"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PlayerVideosSection() {
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);
  const [playVideoTitle, setPlayVideoTitle] = useState<string>("");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: allVideos, isLoading: videosLoading } = useQuery<AggregatedVideo[]>({
    queryKey: ["/api/trainer/all-videos"],
  });

  const uniquePlayers = useMemo(() => {
    if (!allVideos) return [];
    const names = new Set(allVideos.map((v) => v.playerName).filter(Boolean));
    return Array.from(names).sort();
  }, [allVideos]);

  const uniquePositions = useMemo(() => {
    if (!allVideos) return [];
    const positions = new Set(
      allVideos.map((v) => v.position).filter((p): p is string => !!p)
    );
    return Array.from(positions).sort();
  }, [allVideos]);

  const uniqueAges = useMemo(() => {
    if (!allVideos) return [];
    const ages = new Set(
      allVideos.map((v) => v.playerAge).filter((a): a is string => !!a)
    );
    return Array.from(ages).sort();
  }, [allVideos]);

  const filteredVideos = useMemo(() => {
    if (!allVideos) return [];
    const now = new Date();
    return allVideos.filter((video) => {
      if (groupFilter !== "all" && video.groupId !== groupFilter) return false;
      if (playerFilter !== "all" && video.playerName !== playerFilter) return false;
      if (positionFilter !== "all" && video.position !== positionFilter) return false;
      if (ageFilter !== "all" && video.playerAge !== ageFilter) return false;
      if (dateFilter !== "all") {
        const created = new Date(video.createdAt);
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "7" && diffDays > 7) return false;
        if (dateFilter === "30" && diffDays > 30) return false;
        if (dateFilter === "90" && diffDays > 90) return false;
      }
      return true;
    });
  }, [allVideos, groupFilter, playerFilter, positionFilter, ageFilter, dateFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-video-group-filter">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={playerFilter} onValueChange={setPlayerFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-video-player-filter">
            <SelectValue placeholder="All Players" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            {uniquePlayers.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-position-filter">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {uniquePositions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-age-filter">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {uniqueAges.map((age) => (
              <SelectItem key={age} value={age}>
                {age}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-date-filter">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {videosLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : !filteredVideos.length ? (
        <Card>
          <CardContent
            className="py-8 text-center text-muted-foreground"
            data-testid="text-no-player-videos"
          >
            <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No shared videos found. Adjust your filters or wait for players to share videos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((video) => (
            <Card key={video.id} data-testid={`card-shared-video-${video.id}`}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-sm font-medium"
                        data-testid={`text-video-title-${video.id}`}
                      >
                        {video.title}
                      </p>
                      <Badge
                        variant="outline"
                        className="no-default-hover-elevate no-default-active-elevate text-xs"
                        data-testid={`badge-video-player-${video.id}`}
                      >
                        {video.playerName}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="no-default-hover-elevate no-default-active-elevate text-xs"
                        data-testid={`badge-video-group-${video.id}`}
                      >
                        {video.groupName}
                      </Badge>
                      {video.position && (
                        <Badge
                          variant="secondary"
                          className="no-default-hover-elevate no-default-active-elevate text-xs"
                          data-testid={`badge-video-position-${video.id}`}
                        >
                          {video.position}
                        </Badge>
                      )}
                    </div>
                    {video.description && (
                      <p
                        className="text-xs text-muted-foreground mt-1 line-clamp-2"
                        data-testid={`text-video-desc-${video.id}`}
                      >
                        {video.description}
                      </p>
                    )}
                    <p
                      className="text-[10px] text-muted-foreground mt-1"
                      data-testid={`text-video-date-${video.id}`}
                    >
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => {
                      setPlayVideoUrl(video.videoUrl);
                      setPlayVideoTitle(video.title);
                    }}
                    data-testid={`button-watch-video-${video.id}`}
                  >
                    <Play className="w-3 h-3" />
                    Watch
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!playVideoUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPlayVideoUrl(null);
            setPlayVideoTitle("");
          }
        }}
      >
        <DialogContent className="max-w-2xl" data-testid="dialog-play-player-video">
          <DialogHeader>
            <DialogTitle>{playVideoTitle || "Video Player"}</DialogTitle>
            <DialogDescription>Player submitted video</DialogDescription>
          </DialogHeader>
          {playVideoUrl && (
            <video
              src={playVideoUrl}
              controls
              autoPlay
              className="w-full rounded-md max-h-[60vh]"
              data-testid="video-player-submission"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TrainerVideos() {
  const [activeTab, setActiveTab] = useState("my-videos");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h1 className="text-xl font-bold" data-testid="text-videos-heading">
        Videos
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-videos">
        <TabsList data-testid="tabs-videos-list">
          <TabsTrigger value="my-videos" data-testid="tab-my-videos">
            <Upload className="w-4 h-4 mr-1.5" />
            My Videos
          </TabsTrigger>
          <TabsTrigger value="player-videos" data-testid="tab-player-videos">
            <Video className="w-4 h-4 mr-1.5" />
            Player Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-videos" className="mt-4">
          <MyVideosSection />
        </TabsContent>

        <TabsContent value="player-videos" className="mt-4">
          <PlayerVideosSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
