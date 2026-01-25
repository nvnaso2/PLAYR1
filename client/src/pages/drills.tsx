import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DrillCard } from "@/components/drill-card";
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  Play,
  HandMetal,
  Target,
  Crosshair,
  Shield,
  Brain,
  Dumbbell,
  Flame
} from "lucide-react";
import type { Drill, DrillCategory, DifficultyLevel } from "@shared/schema";

const categoryInfo: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  "all": { label: "All Drills", icon: <Play className="w-4 h-4" />, color: "#6b7280" },
  "ball-handling": { label: "Ball Handling", icon: <HandMetal className="w-4 h-4" />, color: "#f97316" },
  "shooting": { label: "Shooting", icon: <Target className="w-4 h-4" />, color: "#22c55e" },
  "passing": { label: "Passing", icon: <Crosshair className="w-4 h-4" />, color: "#3b82f6" },
  "finishing": { label: "Finishing", icon: <Flame className="w-4 h-4" />, color: "#ef4444" },
  "defense": { label: "Defense", icon: <Shield className="w-4 h-4" />, color: "#8b5cf6" },
  "basketball-iq": { label: "Basketball IQ", icon: <Brain className="w-4 h-4" />, color: "#ec4899" },
  "workouts": { label: "Workouts", icon: <Dumbbell className="w-4 h-4" />, color: "#14b8a6" },
};

export default function Drills() {
  const searchParams = useSearch();
  const urlCategory = new URLSearchParams(searchParams).get('category') || 'all';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: drills, isLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const filteredDrills = useMemo(() => {
    if (!drills) return [];
    
    return drills.filter(drill => {
      const matchesSearch = !searchQuery || 
        drill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drill.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || drill.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || drill.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [drills, searchQuery, selectedCategory, selectedDifficulty]);

  const categoryStats = useMemo(() => {
    if (!drills) return {};
    return drills.reduce((acc, drill) => {
      acc[drill.category] = (acc[drill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [drills]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-testid="text-page-title">Drill Library</h1>
        <p className="text-muted-foreground">
          Browse our collection of professional basketball drills
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-drills"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-40" data-testid="select-difficulty">
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

          <div className="flex border rounded-md">
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
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(categoryInfo).map(([key, { label, icon, color }]) => (
          <Button
            key={key}
            variant={selectedCategory === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(key)}
            className="gap-2"
            data-testid={`button-category-${key}`}
          >
            {icon}
            {label}
            {key !== 'all' && categoryStats[key] && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {categoryStats[key]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
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
      ) : filteredDrills.length > 0 ? (
        <div className={viewMode === "grid" 
          ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
          : "space-y-4"
        }>
          {filteredDrills.map((drill) => (
            <DrillCard key={drill.id} drill={drill} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Drills Found</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {searchQuery 
                ? `No drills match "${searchQuery}". Try a different search term.`
                : "No drills available in this category yet. Check back soon!"}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")} data-testid="button-clear-search">
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {filteredDrills.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredDrills.length} {filteredDrills.length === 1 ? 'drill' : 'drills'}
        </div>
      )}
    </div>
  );
}
