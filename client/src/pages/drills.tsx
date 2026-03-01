import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DrillCard } from "@/components/drill-card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, 
  Grid3X3, 
  List,
  Play,
  HandMetal,
  Target,
  Crosshair,
  Shield,
  Brain,
  Dumbbell,
  Flame,
  Users,
  User,
  Share2,
  Plus
} from "lucide-react";
import type { Drill, DrillCategory, DifficultyLevel } from "@shared/schema";

const categoryInfo: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  "all": { label: "All Drills", icon: <Play className="w-4 h-4" />, color: "#6b7280" },
  "ball-handling": { label: "Ball Handling", icon: <HandMetal className="w-4 h-4" />, color: "#f97316" },
  "shooting": { label: "Shooting", icon: <Target className="w-4 h-4" />, color: "#22c55e" },
  "passing": { label: "Passing", icon: <Crosshair className="w-4 h-4" />, color: "#3b82f6" },
  "finishing": { label: "Finishing", icon: <Flame className="w-4 h-4" />, color: "#ef4444" },
  "defense": { label: "Defense", icon: <Shield className="w-4 h-4" />, color: "#8b5cf6" },
  "film-session": { label: "Film Session", icon: <Brain className="w-4 h-4" />, color: "#ec4899" },
  "workouts": { label: "Workouts", icon: <Dumbbell className="w-4 h-4" />, color: "#14b8a6" },
};

function DrillGrid({ drills, viewMode, searchQuery, isLoading, showShareToggle, onToggleShare }: { 
  drills: Drill[] | undefined; 
  viewMode: "grid" | "list"; 
  searchQuery: string;
  isLoading: boolean;
  showShareToggle?: boolean;
  onToggleShare?: (drillId: string, isShared: boolean) => void;
}) {
  if (isLoading) {
    return (
      <div className={viewMode === "grid" 
        ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
        : "space-y-4"
      }>
        {[...Array(8)].map((_, i) => (
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
    );
  }

  if (!drills || drills.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Drills Found</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {searchQuery 
              ? `No drills match "${searchQuery}". Try a different search term.`
              : "No drills available in this category yet. Check back soon!"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={viewMode === "grid" 
        ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
        : "space-y-4"
      }>
        {drills.map((drill) => (
          <div key={drill.id} className="relative">
            <DrillCard drill={drill} />
            {showShareToggle && onToggleShare && (
              <div 
                className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share with Community</span>
                </div>
                <Switch
                  checked={drill.isShared || false}
                  onCheckedChange={(checked) => onToggleShare(drill.id, checked)}
                  data-testid={`switch-share-drill-${drill.id}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Showing {drills.length} {drills.length === 1 ? 'drill' : 'drills'}
      </div>
    </>
  );
}

export default function Drills() {
  const searchParams = useSearch();
  const urlCategory = new URLSearchParams(searchParams).get('category') || 'all';
  const urlTab = new URLSearchParams(searchParams).get('tab') || 'handlz';
  
  const [activeTab, setActiveTab] = useState(urlTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: drills, isLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const { data: communityDrills, isLoading: communityLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills/community'],
  });

  const shareMutation = useMutation({
    mutationFn: async ({ drillId, isShared }: { drillId: string; isShared: boolean }) => {
      await apiRequest("PUT", `/api/drills/${drillId}/share`, { isShared });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drills/community'] });
    },
    onError: () => {
      toast({ title: "Failed to update sharing", variant: "destructive" });
    },
  });

  const handleToggleShare = (drillId: string, isShared: boolean) => {
    shareMutation.mutate({ drillId, isShared });
    toast({ 
      title: isShared ? "Drill shared with community" : "Drill unshared",
      description: isShared ? "Other players can now see and use this drill." : "This drill is now private.",
    });
  };

  const filterDrills = (drillList: Drill[] | undefined) => {
    if (!drillList) return [];
    return drillList.filter(drill => {
      const matchesSearch = !searchQuery || 
        drill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drill.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || drill.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || drill.difficulty === selectedDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  };

  const adminDrills = useMemo(() => {
    if (!drills) return [];
    return drills.filter(d => !d.userId);
  }, [drills]);

  const myDrills = useMemo(() => {
    if (!drills || !user) return [];
    return drills.filter(d => d.userId === user.id);
  }, [drills, user]);

  const filteredHandlzDrills = useMemo(() => filterDrills(adminDrills), [adminDrills, searchQuery, selectedCategory, selectedDifficulty]);
  const filteredCommunityDrills = useMemo(() => filterDrills(communityDrills), [communityDrills, searchQuery, selectedCategory, selectedDifficulty]);
  const filteredMyDrills = useMemo(() => filterDrills(myDrills), [myDrills, searchQuery, selectedCategory, selectedDifficulty]);

  const categoryStats = useMemo(() => {
    const sourceMap: Record<string, Drill[] | undefined> = {
      'handlz': adminDrills,
      'community': communityDrills,
      'my-drills': myDrills,
    };
    const source = sourceMap[activeTab];
    if (!source) return {};
    return source.reduce((acc, drill) => {
      acc[drill.category] = (acc[drill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [adminDrills, communityDrills, myDrills, activeTab]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-page-title">Drill Library</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse our collection of professional basketball drills
          </p>
        </div>
        {user && (
          <Button onClick={() => setLocation("/log?create=1")} className="gap-2 shrink-0" data-testid="button-create-drill-nav">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create a Drill</span>
            <span className="sm:hidden">Create</span>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full" data-testid="tabs-drill-library">
          <TabsTrigger value="handlz" data-testid="tab-handlz-drills" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Handlz
          </TabsTrigger>
          <TabsTrigger value="community" data-testid="tab-community-drills" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Community
            {communityDrills && communityDrills.length > 0 && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{communityDrills.length}</Badge>
            )}
          </TabsTrigger>
          {user && (
            <TabsTrigger value="my-drills" data-testid="tab-my-drills" className="flex-1 gap-1.5 text-xs sm:text-sm">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Mine
              {myDrills.length > 0 && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs">{myDrills.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-drills"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="flex-1 min-w-0" data-testid="select-difficulty">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1 min-w-0" data-testid="select-category">
                <SelectValue>
                  <span className="truncate">{categoryInfo[selectedCategory]?.label || "All Drills"}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryInfo).map(([key, { label }]) => (
                  <SelectItem key={key} value={key} data-testid={`option-category-${key}`}>
                    <span className="flex items-center gap-2">
                      {label}
                      {key !== 'all' && categoryStats[key] && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          {categoryStats[key]}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex border rounded-md shrink-0">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="handlz" className="mt-0 space-y-4">
            <DrillGrid 
              drills={filteredHandlzDrills} 
              viewMode={viewMode} 
              searchQuery={searchQuery}
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="community" className="mt-0 space-y-4">
            <DrillGrid 
              drills={filteredCommunityDrills} 
              viewMode={viewMode} 
              searchQuery={searchQuery}
              isLoading={communityLoading} 
            />
          </TabsContent>

          {user && (
            <TabsContent value="my-drills" className="mt-0 space-y-4">
              <DrillGrid 
                drills={filteredMyDrills} 
                viewMode={viewMode} 
                searchQuery={searchQuery}
                isLoading={isLoading}
                showShareToggle={true}
                onToggleShare={handleToggleShare}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
