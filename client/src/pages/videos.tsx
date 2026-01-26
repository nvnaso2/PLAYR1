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
import { Switch } from "@/components/ui/switch";
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
  Eye
} from "lucide-react";
import { format } from "date-fns";
import type { Drill, UserVideo } from "@shared/schema";

const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  videoUrl: z.string().url("Please enter a valid URL"),
  description: z.string().optional(),
  drillId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type VideoFormData = z.infer<typeof videoFormSchema>;

export default function VideosPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      drillId: "",
      isPublic: false,
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      const payload = {
        ...data,
        drillId: data.drillId || null,
      };
      return await apiRequest("POST", "/api/videos", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video Added",
        description: "Your training video has been uploaded.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload video. Please try again.",
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Training Video</DialogTitle>
              <DialogDescription>
                Add a video URL to track your progress
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://..."
                          {...field}
                          data-testid="input-video-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Paste a link to your video (YouTube, Vimeo, etc.)
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-drill">
                            <SelectValue placeholder="Select a drill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
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
                    disabled={createVideoMutation.isPending}
                    data-testid="button-submit-video"
                  >
                    {createVideoMutation.isPending ? "Uploading..." : "Add Video"}
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
