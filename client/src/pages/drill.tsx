import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Clock, 
  Target, 
  ChevronLeft, 
  ClipboardList,
  Lightbulb,
  Dumbbell,
  Share2
} from "lucide-react";
import type { Drill } from "@shared/schema";

const difficultyColors = {
  beginner: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  advanced: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  elite: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  "shooting": "Shooting",
  "passing": "Passing",
  "finishing": "Finishing",
  "defense": "Defense",
  "film-session": "Film Session",
  "workouts": "Workouts",
};

export default function DrillPage() {
  const { id } = useParams<{ id: string }>();

  const { data: drill, isLoading, error } = useQuery<Drill>({
    queryKey: ['/api/drills', id],
  });

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !drill) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Drill Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This drill doesn't exist or has been removed.
            </p>
            <Link href="/drills">
              <Button variant="outline" data-testid="button-back-to-drills">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Drills
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/drills">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <Badge variant="outline">{categoryLabels[drill.category] || drill.category}</Badge>
        <Badge className={difficultyColors[drill.difficulty || 'beginner']}>
          {drill.difficulty || 'beginner'}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
            {drill.videoUrl ? (
              <video
                src={drill.videoUrl}
                controls
                className="w-full h-full object-cover"
                poster={drill.thumbnailUrl || undefined}
                data-testid="video-player"
              />
            ) : drill.thumbnailUrl ? (
              <>
                <img 
                  src={drill.thumbnailUrl}
                  alt={drill.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary-foreground fill-current ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <div className="text-center">
                  <Target className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Video coming soon</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-3" data-testid="text-drill-title">{drill.title}</h1>
            <p className="text-muted-foreground" data-testid="text-drill-description">
              {drill.description || "Master this drill to take your skills to the next level."}
            </p>
          </div>

          {drill.tips && drill.tips.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {drill.tips.map((tip, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Drill Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </span>
                <span className="font-medium" data-testid="text-drill-duration">
                  {formatDuration(drill.duration)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Category
                </span>
                <span className="font-medium">
                  {categoryLabels[drill.category] || drill.category}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Difficulty
                </span>
                <Badge className={difficultyColors[drill.difficulty || 'beginner']}>
                  {drill.difficulty || 'beginner'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {drill.equipment && drill.equipment.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Equipment Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {drill.equipment.map((item, index) => (
                    <Badge key={index} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Link href={`/log?drill=${drill.id}`}>
              <Button className="w-full gap-2" data-testid="button-log-session">
                <ClipboardList className="w-4 h-4" />
                Log Training Session
              </Button>
            </Link>
            <Button variant="outline" className="w-full gap-2" data-testid="button-share">
              <Share2 className="w-4 h-4" />
              Share Drill
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
