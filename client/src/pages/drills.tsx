import { useState, useMemo, useEffect } from "react";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QueryError } from "@/components/query-error";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DrillCard } from "@/components/drill-card";
import { Playr1Logo } from "@/components/playr1-logo";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { track } from "@/lib/track";
import { countSavedWorkouts, getSavedWorkoutLimit, isAtSavedWorkoutLimit } from "@shared/workout-limits";
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
  ArrowLeft,
  Share2,
  Plus,
  Trash2,
  Check,
  X
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

const drillGridClass = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

function DrillGrid({ drills, viewMode, searchQuery, isLoading, showShareToggle, onToggleShare, onDelete, selectionMode, selectedDrillIds, onSelect }: {
  drills: Drill[] | undefined; 
  viewMode: "grid" | "list"; 
  searchQuery: string;
  isLoading: boolean;
  showShareToggle?: boolean;
  onToggleShare?: (drillId: string, isShared: boolean) => void;
  onDelete?: (drillId: string) => void;
  selectionMode?: boolean;
  selectedDrillIds?: Set<string>;
  onSelect?: (drillId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className={viewMode === "grid" ? drillGridClass : "space-y-2"}>
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-[11/5]" />
            <CardContent className="space-y-2 p-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
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
      <div className={viewMode === "grid" ? drillGridClass : "space-y-2"}>
        {drills.map((drill) => (
          <div key={drill.id} className="relative">
            <DrillCard
              drill={drill}
              viewMode={viewMode}
              selectable={selectionMode}
              selected={selectedDrillIds?.has(drill.id)}
              onSelect={onSelect}
            />
            {(showShareToggle || onDelete) && (
              <div 
                className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/50"
                onClick={(e) => e.stopPropagation()}
              >
                {showShareToggle && onToggleShare ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </div>
                ) : <div />}
                <div className="flex items-center gap-2">
                  {showShareToggle && onToggleShare && (
                    <Switch
                      checked={drill.isShared || false}
                      onCheckedChange={(checked) => onToggleShare(drill.id, checked)}
                      data-testid={`switch-share-drill-${drill.id}`}
                    />
                  )}
                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-delete-drill-${drill.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                            onClick={() => onDelete(drill.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid={`button-confirm-delete-drill-${drill.id}`}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
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
  const launchedFromTrain = new URLSearchParams(searchParams).get("build") === "1";
  
  const [activeTab, setActiveTab] = useState(urlTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectionMode, setSelectionMode] = useState(launchedFromTrain);
  const [selectedDrillIds, setSelectedDrillIds] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { openProOffer } = useProUpgrade();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: savedWorkouts, isLoading: savedWorkoutsLoading } = useQuery<Array<{ id: string; isAssigned?: boolean }>>({
    queryKey: ["/api/workouts/personal"],
  });
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<{ plan?: string }>({
    queryKey: ["/api/billing/subscription"],
  });
  const savedWorkoutLimit = getSavedWorkoutLimit(subscription?.plan);
  const savedWorkoutLimitReached = !savedWorkoutsLoading
    && !subscriptionLoading
    && isAtSavedWorkoutLimit(countSavedWorkouts(savedWorkouts ?? []), savedWorkoutLimit);

  const toggleDrillSelection = (drillId: string) => {
    setSelectedDrillIds((current) => {
      const next = new Set(current);
      if (next.has(drillId)) next.delete(drillId);
      else next.add(drillId);
      return next;
    });
  };

  const closeSelectionMode = () => {
    if (launchedFromTrain) {
      setLocation("/log", { replace: true });
      return;
    }
    setSelectionMode(false);
    setSelectedDrillIds(new Set());
  };

  const startSelectedWorkout = (mode: "complete" | "track") => {
    if (selectedDrillIds.size === 0) return;
    const ids = Array.from(selectedDrillIds).join(",");
    track("drill_library_workout_started", { mode, drillCount: selectedDrillIds.size });
    setLocation(`/log?startDrills=${encodeURIComponent(ids)}&mode=${mode}`);
  };

  const saveSelectedWorkout = () => {
    if (selectedDrillIds.size < 2 || savedWorkoutLimitReached) return;
    const ids = Array.from(selectedDrillIds).join(",");
    track("drill_library_workout_save_started", { drillCount: selectedDrillIds.size });
    setLocation(`/log?startDrills=${encodeURIComponent(ids)}&mode=track&saveTemplate=1`);
  };

  useEffect(() => {
    track("drill_library_view", {
      tab: activeTab,
      category: selectedCategory,
      difficulty: selectedDifficulty,
    });
  }, []);

  useEffect(() => {
    const hasFilter = selectedCategory !== "all" || selectedDifficulty !== "all";
    const hasSearch = searchQuery.trim().length >= 2;
    if (!hasFilter && !hasSearch) return;

    const timer = window.setTimeout(() => {
      track("drill_library_filter", {
        tab: activeTab,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        searchLength: hasSearch ? searchQuery.trim().length : 0,
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeTab, selectedCategory, selectedDifficulty, searchQuery]);

  const { data: drills, isLoading, isError: drillsError, refetch: refetchDrills } = useQuery<Drill[]>({
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

  const deleteDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      await apiRequest("DELETE", `/api/user/drills/${drillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/my-drills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drills/community'] });
      toast({ title: "Drill deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete drill", variant: "destructive" });
    },
  });

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

  if (drillsError) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <QueryError message="Unable to load the drill library. Check your connection and try again." onRetry={refetchDrills} />
      </div>
    );
  }

  return (
    <div className={selectionMode
      ? "mx-auto flex h-full min-h-0 max-w-7xl flex-col gap-4 overflow-hidden p-4 sm:p-6"
      : "mx-auto max-w-7xl space-y-6 p-4 sm:p-6"
    }>
      <div className={selectionMode
        ? "flex shrink-0 items-start justify-between gap-4"
        : "flex items-start justify-between gap-4"
      }>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-page-title">
            {selectionMode ? "Build Your Workout" : "Drill Library"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {selectionMode ? "Browse and tap drills to add them" : "Browse our collection of professional basketball drills"}
          </p>
        </div>
        {user && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant={selectionMode ? "secondary" : "default"}
              onClick={() => selectionMode ? closeSelectionMode() : setSelectionMode(true)}
              className={selectionMode
                ? "h-10 gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 text-zinc-100 shadow-sm hover:border-orange-400/30 hover:bg-zinc-800"
                : "h-10 gap-2 rounded-lg border border-orange-400/40 bg-orange-500 px-3 font-semibold text-black shadow-[0_8px_20px_rgba(249,115,22,0.18)] hover:bg-orange-400"
              }
              data-testid="button-build-workout"
            >
              {selectionMode
                ? launchedFromTrain ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />
                : <Dumbbell className="h-4 w-4" />
              }
              <span className="hidden sm:inline">{selectionMode && launchedFromTrain ? "Back to Train" : selectionMode ? "Cancel Selection" : "Build Workout"}</span>
              <span className="sm:hidden">{selectionMode && launchedFromTrain ? "Back" : selectionMode ? "Cancel" : "Select"}</span>
            </Button>
            {!selectionMode && (
              <Button onClick={() => setLocation("/log?create=1")} variant="outline" className="gap-2" data-testid="button-create-drill-nav">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create a Drill</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={selectionMode ? "workout-builder-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 pr-1" : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Browse
          </span>
          <TabsList
            className={`grid h-auto w-full max-w-[560px] ${user ? "grid-cols-3" : "grid-cols-2"} gap-1 rounded-xl border border-border/60 bg-muted/30 p-1`}
            data-testid="tabs-drill-library"
          >
            <TabsTrigger
              value="handlz"
              data-testid="tab-handlz-drills"
              aria-label="PLAYR1 drills"
              className="h-9 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:gap-2 sm:px-4 sm:text-sm"
            >
              <Playr1Logo className="h-4 w-[58px] object-contain" />
            </TabsTrigger>
            <TabsTrigger
              value="community"
              data-testid="tab-community-drills"
              className="h-9 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:gap-2 sm:px-4 sm:text-sm"
            >
              <Users className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Community
            </TabsTrigger>
            {user && (
              <TabsTrigger
                value="my-drills"
                data-testid="tab-my-drills"
                className="h-9 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:gap-2 sm:px-4 sm:text-sm"
              >
                <User className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                My Drills
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-[400px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-10"
                data-testid="input-search-drills"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="h-9 w-[128px] text-xs" data-testid="select-difficulty">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex shrink-0 rounded-md border">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className="h-9 w-9"
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className="h-9 w-9"
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter drills by category">
            {Object.entries(categoryInfo).map(([key, { label }]) => {
              const count = key === "all"
                ? Object.values(categoryStats).reduce((total, categoryCount) => total + categoryCount, 0)
                : categoryStats[key];
              return (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={selectedCategory === key ? "secondary" : "ghost"}
                  onClick={() => setSelectedCategory(key)}
                  aria-pressed={selectedCategory === key}
                  className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                  data-testid={`button-category-${key}`}
                >
                  {label}
                  {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                </Button>
              );
            })}
          </div>

          <TabsContent value="handlz" className="mt-0 space-y-4">
            <DrillGrid 
              drills={filteredHandlzDrills} 
              viewMode={viewMode} 
              searchQuery={searchQuery}
              isLoading={isLoading}
              selectionMode={selectionMode}
              selectedDrillIds={selectedDrillIds}
              onSelect={toggleDrillSelection}
            />
          </TabsContent>

          <TabsContent value="community" className="mt-0 space-y-4">
            <DrillGrid 
              drills={filteredCommunityDrills} 
              viewMode={viewMode} 
              searchQuery={searchQuery}
              isLoading={communityLoading}
              selectionMode={selectionMode}
              selectedDrillIds={selectedDrillIds}
              onSelect={toggleDrillSelection}
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
                onDelete={(drillId) => deleteDrillMutation.mutate(drillId)}
                selectionMode={selectionMode}
                selectedDrillIds={selectedDrillIds}
                onSelect={toggleDrillSelection}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
      {selectionMode && (
        <div className="z-30 shrink-0 rounded-xl border border-zinc-700 bg-zinc-950/95 p-2.5 shadow-xl backdrop-blur" data-testid="drill-selection-tray">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-black">
                {selectedDrillIds.size}
              </span>
              <p className="font-heading text-xs uppercase tracking-wide text-white sm:text-sm">
                {selectedDrillIds.size} drill{selectedDrillIds.size === 1 ? "" : "s"} selected
              </p>
              <p className="hidden text-xs text-zinc-500 lg:block">Save it or start training now.</p>
            </div>
            <div className="grid w-full grid-cols-3 gap-1.5 sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                disabled={selectedDrillIds.size < 2 || savedWorkoutLimitReached || savedWorkoutsLoading || subscriptionLoading}
                onClick={saveSelectedWorkout}
                className="h-9 min-w-0 gap-1 border-zinc-600 px-2 text-xs sm:px-3"
                data-testid="button-save-selected-workout"
              >
                <Dumbbell className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">{savedWorkoutLimitReached ? "Limit" : "Save"}</span>
                <span className="hidden sm:inline">{savedWorkoutLimitReached ? "Limit Reached" : "Save Workout"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedDrillIds.size === 0}
                onClick={() => startSelectedWorkout("complete")}
                className="h-9 min-w-0 gap-1 border-zinc-600 px-2 text-xs sm:px-3"
                data-testid="button-start-quick-complete"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Quick</span>
                <span className="hidden sm:inline">Quick Complete</span>
              </Button>
              <Button
                size="sm"
                disabled={selectedDrillIds.size === 0}
                onClick={() => startSelectedWorkout("track")}
                className="h-9 min-w-0 gap-1 px-2 text-xs sm:px-3"
                data-testid="button-start-track-stats"
              >
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Track</span>
                <span className="hidden sm:inline">Track Stats</span>
              </Button>
            </div>
          </div>
          {savedWorkoutLimitReached && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs text-zinc-400">Free includes 3 saved workouts. Remove one or upgrade to save another.</p>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-1 text-orange-300 hover:text-orange-200" onClick={() => openProOffer("unlimited saved workouts")}>
                Upgrade to Pro
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
