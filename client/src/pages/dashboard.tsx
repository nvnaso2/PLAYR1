import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import { CategoryCard } from "@/components/category-card";
import { DrillCard } from "@/components/drill-card";
import { Link } from "wouter";
import { 
  Play, 
  Clock, 
  Target, 
  TrendingUp, 
  ChevronRight,
  HandMetal,
  Crosshair,
  Shield,
  Brain,
  Dumbbell,
  Flame,
  Zap
} from "lucide-react";
import type { Drill, TrainingLog, UserProfile } from "@shared/schema";
import bannerImage from "@assets/Top_1769377436234.png";

type DrillWithPersonalBest = Drill & { personalBest: number | null; totalSessions: number };

const categories = [
  { 
    category: "ball-handling" as const, 
    title: "Ball Handling", 
    description: "Develop elite handles with crossovers, hesitations, and combo moves.",
    icon: <HandMetal className="w-6 h-6" />,
    color: "#f97316",
    drillCount: 45
  },
  { 
    category: "shooting" as const, 
    title: "Shooting", 
    description: "Perfect your form, catch-and-shoot, and off-the-dribble shots.",
    icon: <Target className="w-6 h-6" />,
    color: "#22c55e",
    drillCount: 52
  },
  { 
    category: "passing" as const, 
    title: "Passing", 
    description: "Master chest passes, bounce passes, and no-look assists.",
    icon: <Crosshair className="w-6 h-6" />,
    color: "#3b82f6",
    drillCount: 28
  },
  { 
    category: "finishing" as const, 
    title: "Finishing", 
    description: "Learn layups, floaters, and finishing through contact.",
    icon: <Flame className="w-6 h-6" />,
    color: "#ef4444",
    drillCount: 36
  },
  { 
    category: "defense" as const, 
    title: "Defense", 
    description: "Improve footwork, positioning, and on-ball defense.",
    icon: <Shield className="w-6 h-6" />,
    color: "#8b5cf6",
    drillCount: 31
  },
  { 
    category: "coaches-room" as const, 
    title: "Coaches Room", 
    description: "Understand reads, spacing, and game situations.",
    icon: <Brain className="w-6 h-6" />,
    color: "#ec4899",
    drillCount: 24
  },
  { 
    category: "workouts" as const, 
    title: "Workouts", 
    description: "Full training sessions and conditioning programs.",
    icon: <Dumbbell className="w-6 h-6" />,
    color: "#14b8a6",
    drillCount: 18
  }
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['/api/profile'],
  });

  const { data: recentLogs } = useQuery<TrainingLog[]>({
    queryKey: ['/api/training-logs/recent'],
  });

  const { data: featuredDrills, isLoading: drillsLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills/featured'],
  });

  const { data: myDrills, isLoading: myDrillsLoading } = useQuery<DrillWithPersonalBest[]>({
    queryKey: ['/api/drills/my-drills'],
  });

  const { data: stats } = useQuery<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }>({
    queryKey: ['/api/stats/overview'],
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getFirstName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split('@')[0];
    return "Player";
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden">
        <img 
          src={bannerImage}
          alt="Handlz Training"
          className="w-full h-48 sm:h-56 object-cover"
          data-testid="img-dashboard-banner"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6 sm:p-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" data-testid="text-greeting">
              {getGreeting()}, {getFirstName()}
            </h1>
            <p className="text-white/80 max-w-md">
              Ready to put in the work? Your training journey continues here.
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="/drills">
                <Button className="gap-2" data-testid="button-start-training">
                  <Play className="w-4 h-4" />
                  Start Training
                </Button>
              </Link>
              <Link href="/log">
                <Button variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" data-testid="button-log-session">
                  <Clock className="w-4 h-4" />
                  Log Session
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sessions"
          value={stats?.totalSessions || 0}
          change={12}
          icon={<Target className="w-5 h-5 text-primary" />}
          testId="stats-sessions"
        />
        <StatsCard
          title="Minutes Trained"
          value={stats?.totalMinutes || 0}
          change={8}
          icon={<Clock className="w-5 h-5 text-primary" />}
          testId="stats-minutes"
        />
        <StatsCard
          title="Avg Score"
          value={stats?.avgScore ? `${stats.avgScore}/10` : "N/A"}
          change={5}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          testId="stats-score"
        />
        <StatsCard
          title="Day Streak"
          value={stats?.streak || 0}
          icon={<Zap className="w-5 h-5 text-primary" />}
          testId="stats-streak"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">My Drills</h2>
            <p className="text-sm text-muted-foreground">Your recent drills with personal bests</p>
          </div>
          <Link href="/progress">
            <Button variant="ghost" className="gap-1" data-testid="link-view-progress">
              View Progress
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        {myDrillsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-video" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : myDrills && myDrills.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {myDrills.slice(0, 4).map((drill) => (
              <DrillCard 
                key={drill.id} 
                drill={drill} 
                personalBest={drill.personalBest}
                totalSessions={drill.totalSessions}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Start Training to Track Progress</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Log your first training session to see your drills and personal bests here.
              </p>
              <Link href="/drills">
                <Button variant="outline" data-testid="button-browse-drills-empty">
                  Browse Drills
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Featured Drills</h2>
            <p className="text-sm text-muted-foreground">Hand-picked drills to level up your game</p>
          </div>
          <Link href="/drills">
            <Button variant="ghost" className="gap-1" data-testid="link-view-all-drills">
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        {drillsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-video" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : featuredDrills && featuredDrills.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredDrills.slice(0, 4).map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Play className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Featured Drills Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Check back soon for hand-picked training content.
              </p>
              <Link href="/drills">
                <Button variant="outline" data-testid="button-browse-drills">
                  Browse All Drills
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Training Categories</h2>
            <p className="text-sm text-muted-foreground">Choose a skill to focus on today</p>
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.category} {...cat} />
          ))}
        </div>
      </section>

      {recentLogs && recentLogs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Your latest training sessions</p>
            </div>
            <Link href="/log">
              <Button variant="ghost" className="gap-1" data-testid="link-view-all-logs">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 hover-elevate">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Training Session</p>
                        <p className="text-sm text-muted-foreground">
                          {log.duration} min • {log.reps || 0} reps
                        </p>
                      </div>
                    </div>
                    {log.score && (
                      <Badge variant="secondary">{log.score}/10</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
