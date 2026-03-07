import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  Globe,
  Mail,
  Phone,
  Plus,
  Users,
  Trophy,
  Calendar,
  DollarSign,
  ExternalLink,
  Filter,
  Shield,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react";
import { SiInstagram, SiX } from "react-icons/si";
import type { TeamClub, League, TrainerTeam, TeamMember } from "@shared/schema";
import { TEAM_ORGANIZATION_TYPES, LEAGUE_TYPES, AGE_GROUPS, SEASONS, US_STATES, GENDERS, CIRCUITS } from "@shared/schema";

const LOGO_COLORS = [
  "bg-red-600", "bg-blue-600", "bg-green-600", "bg-purple-600",
  "bg-orange-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
  "bg-cyan-600", "bg-amber-600", "bg-emerald-600", "bg-violet-600",
  "bg-rose-600", "bg-sky-600", "bg-lime-600", "bg-fuchsia-600",
];

function getTeamInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getTeamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function TeamLogo({ name, logoUrl, size = "sm" }: { name: string; logoUrl?: string | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-16 w-16" : "h-10 w-10";
  const textSize = size === "lg" ? "text-lg" : "text-xs";

  if (logoUrl) {
    return <img src={logoUrl} alt={name} className={`${dim} rounded-md object-cover`} />;
  }

  return (
    <div className={`${dim} rounded-md ${getTeamColor(name)} flex items-center justify-center shrink-0`}>
      <span className={`${textSize} font-bold text-white`}>{getTeamInitials(name)}</span>
    </div>
  );
}

export default function FinderPage() {
  const [mainTab, setMainTab] = useState("find");

  return (
    <div className="pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="w-full max-w-md grid grid-cols-2" data-testid="tabs-teams-main">
            <TabsTrigger value="find" data-testid="tab-find-teams">
              <Search className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Find Teams & Leagues</span>
              <span className="sm:hidden">Find</span>
            </TabsTrigger>
            <TabsTrigger value="my-teams" data-testid="tab-my-teams">
              <Shield className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">My Teams</span>
              <span className="sm:hidden">My Teams</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="mt-0">
            <FindTeamsTab />
          </TabsContent>
          <TabsContent value="my-teams" className="mt-4">
            <MyTeamsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FindTeamsTab() {
  const [activeSubTab, setActiveSubTab] = useState("teams");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div>
      <div className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 dark:from-orange-700 dark:via-orange-600 dark:to-amber-600 rounded-lg mt-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50 rounded-lg" />
        <div className="relative px-4 sm:px-6 py-8 sm:py-12 text-center">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 tracking-tight" data-testid="text-page-title">
            Find Your Team
          </h2>
          <p className="text-sm sm:text-base text-white/80 mb-6 max-w-xl mx-auto">
            Search AAU programs, travel teams, competitive clubs, and local leagues across the country
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams, leagues, cities..."
              className="pl-10 pr-10 h-11 text-base bg-background border-0 shadow-lg w-full"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="w-full max-w-xs grid grid-cols-2">
            <TabsTrigger value="teams" data-testid="tab-teams">
              <Shield className="h-4 w-4 mr-1.5" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="leagues" data-testid="tab-leagues">
              <Trophy className="h-4 w-4 mr-1.5" />
              Leagues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-4">
            <TeamFinderTab searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="leagues" className="mt-4">
            <LeagueFinderTab searchQuery={searchQuery} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type MyTeamData = TeamMember & { team: TrainerTeam };

function MyTeamsTab() {
  const { data: myTeams, isLoading } = useQuery<MyTeamData[]>({
    queryKey: ["/api/my-teams"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!myTeams || myTeams.length === 0) {
    return (
      <div className="text-center py-16" data-testid="empty-my-teams">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You haven't joined any teams yet. Use the "Find Teams & Leagues" tab to discover teams, or ask your coach/trainer for a team code to join.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="group-my-teams">
      {myTeams.map(membership => (
        <Card key={membership.id} data-testid={`card-my-team-${membership.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <TeamLogo name={membership.team.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate" data-testid={`text-team-name-${membership.id}`}>
                  {membership.team.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {membership.role && (
                    <Badge variant="secondary" className="text-xs">
                      {membership.role}
                    </Badge>
                  )}
                  {membership.position && (
                    <Badge variant="outline" className="text-xs">
                      {membership.position}
                    </Badge>
                  )}
                  {membership.jerseyNumber && (
                    <Badge variant="outline" className="text-xs">
                      #{membership.jerseyNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {membership.team.ageGroup && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {membership.team.ageGroup}
                    </span>
                  )}
                  {membership.team.sport && (
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {membership.team.sport}
                    </span>
                  )}
                  {membership.team.level && (
                    <span className="flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      {membership.team.level}
                    </span>
                  )}
                  {membership.joinedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(membership.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {membership.team.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {membership.team.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TeamFinderTab({ searchQuery }: { searchQuery: string }) {
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ type: "", state: "", city: "", ageGroup: "", gender: "", circuit: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (filters.type) queryParams.set("type", filters.type);
  if (filters.state) queryParams.set("state", filters.state);
  if (filters.city) queryParams.set("city", filters.city);
  if (filters.ageGroup) queryParams.set("ageGroup", filters.ageGroup);
  if (filters.gender) queryParams.set("gender", filters.gender);
  if (filters.circuit) queryParams.set("circuit", filters.circuit);
  if (searchQuery) queryParams.set("query", searchQuery);
  const qs = queryParams.toString();
  const teamClubsUrl = `/api/team-clubs${qs ? `?${qs}` : ""}`;

  const { data: clubs, isLoading } = useQuery<TeamClub[]>({
    queryKey: [teamClubsUrl],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/team-clubs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/team-clubs") });
      setAddDialogOpen(false);
      toast({ title: "Team Added", description: "Your team listing has been submitted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add team.", variant: "destructive" });
    },
  });

  const activeFilterCount = [filters.type, filters.state, filters.city, filters.ageGroup, filters.gender, filters.circuit].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-team-filters"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ type: "", state: "", city: "", ageGroup: "", gender: "", circuit: "" })}
              data-testid="button-clear-team-filters"
            >
              Clear All
            </Button>
          )}
          {clubs && (
            <span className="text-sm text-muted-foreground" data-testid="text-team-count">
              {clubs.length} team{clubs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-team">
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a Team / Club</DialogTitle>
                <DialogDescription>Submit an AAU, travel, or competitive basketball team listing</DialogDescription>
              </DialogHeader>
              <AddTeamForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Circuit</Label>
                <Select value={filters.circuit} onValueChange={(v) => setFilters(f => ({ ...f, circuit: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-team-circuit">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CIRCUITS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Gender</Label>
                <Select value={filters.gender} onValueChange={(v) => setFilters(f => ({ ...f, gender: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-team-gender">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {GENDERS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-team-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TEAM_ORGANIZATION_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">State</Label>
                <Select value={filters.state} onValueChange={(v) => setFilters(f => ({ ...f, state: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-team-state">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
                <Input
                  placeholder="Search city..."
                  value={filters.city}
                  onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                  data-testid="filter-team-city"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Age Group</Label>
                <Select value={filters.ageGroup} onValueChange={(v) => setFilters(f => ({ ...f, ageGroup: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-team-age">
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    {AGE_GROUPS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-md" />
          ))}
        </div>
      ) : clubs && clubs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <TeamClubCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1" data-testid="text-no-teams">No Teams Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeFilterCount > 0 || searchQuery
                ? "No teams match your search. Try adjusting your filters."
                : "Be the first to add a team or club listing."}
            </p>
            {isAdmin && !searchQuery && (
              <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-team-empty">
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamClubCard({ club }: { club: TeamClub }) {
  return (
    <Link href={`/teams/${club.slug}`} data-testid={`link-team-${club.id}`}>
      <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-team-${club.id}`}>
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start gap-3 mb-3">
            <TeamLogo name={club.name} logoUrl={club.logoUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate" data-testid={`text-team-name-${club.id}`}>{club.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{club.city}, {club.state}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge variant="secondary" className="text-xs">{club.organizationType}</Badge>
            {club.gender && <Badge variant="outline" className="text-xs">{club.gender}</Badge>}
            {club.circuit && <Badge variant="outline" className="text-xs">{club.circuit}</Badge>}
          </div>

          {club.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{club.description}</p>
          )}

          {club.ageGroups && club.ageGroups.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {club.ageGroups.slice(0, 4).map((ag) => (
                <Badge key={ag} variant="outline" className="text-xs">{ag}</Badge>
              ))}
              {club.ageGroups.length > 4 && (
                <Badge variant="outline" className="text-xs">+{club.ageGroups.length - 4}</Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-2 border-t">
            <div className="flex items-center gap-1.5">
              {club.website && <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
              {club.contactEmail && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
              {club.contactPhone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              View Profile <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AddTeamForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({
    name: "",
    organizationType: "",
    city: "",
    state: "",
    ageGroups: [] as string[],
    description: "",
    website: "",
    contactEmail: "",
    contactPhone: "",
    socialInstagram: "",
    socialTwitter: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.organizationType || !form.city || !form.state) return;
    onSubmit({
      ...form,
      ageGroups: form.ageGroups.length > 0 ? form.ageGroups : null,
      website: form.website || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      socialInstagram: form.socialInstagram || null,
      socialTwitter: form.socialTwitter || null,
      description: form.description || null,
    });
  };

  const toggleAgeGroup = (ag: string) => {
    setForm(f => ({
      ...f,
      ageGroups: f.ageGroups.includes(ag)
        ? f.ageGroups.filter(a => a !== ag)
        : [...f.ageGroups, ag],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Team / Club Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Texas Elite Basketball"
          required
          data-testid="input-team-name"
        />
      </div>

      <div>
        <Label>Organization Type *</Label>
        <Select value={form.organizationType} onValueChange={(v) => setForm(f => ({ ...f, organizationType: v }))}>
          <SelectTrigger data-testid="select-team-org-type">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {TEAM_ORGANIZATION_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>City *</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Dallas"
            required
            data-testid="input-team-city"
          />
        </div>
        <div>
          <Label>State *</Label>
          <Select value={form.state} onValueChange={(v) => setForm(f => ({ ...f, state: v }))}>
            <SelectTrigger data-testid="select-team-state">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Age Groups</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {AGE_GROUPS.map((ag) => (
            <Badge
              key={ag}
              variant={form.ageGroups.includes(ag) ? "default" : "outline"}
              className="cursor-pointer toggle-elevate"
              onClick={() => toggleAgeGroup(ag)}
              data-testid={`badge-age-${ag}`}
            >
              {ag}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Tell us about the team..."
          className="resize-none min-h-[80px]"
          data-testid="input-team-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Website</Label>
          <Input
            value={form.website}
            onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://..."
            data-testid="input-team-website"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))}
            placeholder="contact@team.com"
            data-testid="input-team-email"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone</Label>
          <Input
            value={form.contactPhone}
            onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))}
            placeholder="(555) 123-4567"
            data-testid="input-team-phone"
          />
        </div>
        <div>
          <Label>Instagram</Label>
          <Input
            value={form.socialInstagram}
            onChange={(e) => setForm(f => ({ ...f, socialInstagram: e.target.value }))}
            placeholder="@handle"
            data-testid="input-team-instagram"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !form.name || !form.organizationType || !form.city || !form.state} data-testid="button-submit-team">
        {isPending ? "Submitting..." : "Submit Team Listing"}
      </Button>
    </form>
  );
}

// ===== LEAGUE FINDER TAB =====

function LeagueFinderTab({ searchQuery }: { searchQuery: string }) {
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ type: "", state: "", city: "", ageGroup: "", season: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (filters.type) queryParams.set("type", filters.type);
  if (filters.state) queryParams.set("state", filters.state);
  if (filters.city) queryParams.set("city", filters.city);
  if (filters.ageGroup) queryParams.set("ageGroup", filters.ageGroup);
  if (filters.season) queryParams.set("season", filters.season);
  if (searchQuery) queryParams.set("query", searchQuery);
  const qs = queryParams.toString();
  const leaguesUrl = `/api/leagues${qs ? `?${qs}` : ""}`;

  const { data: leaguesList, isLoading } = useQuery<League[]>({
    queryKey: [leaguesUrl],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/leagues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/leagues") });
      setAddDialogOpen(false);
      toast({ title: "League Added", description: "Your league listing has been submitted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add league.", variant: "destructive" });
    },
  });

  const activeFilterCount = [filters.type, filters.state, filters.city, filters.ageGroup, filters.season].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-league-filters"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ type: "", state: "", city: "", ageGroup: "", season: "" })}
              data-testid="button-clear-league-filters"
            >
              Clear All
            </Button>
          )}
          {leaguesList && (
            <span className="text-sm text-muted-foreground" data-testid="text-league-count">
              {leaguesList.length} league{leaguesList.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-league">
                <Plus className="h-4 w-4 mr-1" />
                Add League
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a League</DialogTitle>
                <DialogDescription>Submit a community, recreational, or local basketball league listing</DialogDescription>
              </DialogHeader>
              <AddLeagueForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-league-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LEAGUE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">State</Label>
                <Select value={filters.state} onValueChange={(v) => setFilters(f => ({ ...f, state: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-league-state">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
                <Input
                  placeholder="Search city..."
                  value={filters.city}
                  onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                  data-testid="filter-league-city"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Age Group</Label>
                <Select value={filters.ageGroup} onValueChange={(v) => setFilters(f => ({ ...f, ageGroup: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-league-age">
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    {AGE_GROUPS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Season</Label>
                <Select value={filters.season} onValueChange={(v) => setFilters(f => ({ ...f, season: v === "all" ? "" : v }))}>
                  <SelectTrigger data-testid="filter-league-season">
                    <SelectValue placeholder="All Seasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    {SEASONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-md" />
          ))}
        </div>
      ) : leaguesList && leaguesList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaguesList.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1" data-testid="text-no-leagues">No Leagues Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeFilterCount > 0 || searchQuery
                ? "No leagues match your search. Try adjusting your filters."
                : "Be the first to add a league listing."}
            </p>
            {isAdmin && !searchQuery && (
              <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-league-empty">
                <Plus className="h-4 w-4 mr-1" />
                Add League
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeagueCard({ league }: { league: League }) {
  return (
    <Link href={`/leagues/${league.slug}`} data-testid={`link-league-${league.id}`}>
      <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-league-${league.id}`}>
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate" data-testid={`text-league-name-${league.id}`}>{league.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{league.city}, {league.state}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge variant="secondary" className="text-xs">{league.leagueType}</Badge>
            {league.seasons && league.seasons.length > 0 && league.seasons.slice(0, 2).map(s => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>

          {league.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{league.description}</p>
          )}

          {league.ageGroups && league.ageGroups.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {league.ageGroups.slice(0, 4).map((ag) => (
                <Badge key={ag} variant="outline" className="text-xs">{ag}</Badge>
              ))}
              {league.ageGroups.length > 4 && (
                <Badge variant="outline" className="text-xs">+{league.ageGroups.length - 4}</Badge>
              )}
            </div>
          )}

          {league.costInfo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <DollarSign className="h-3 w-3 shrink-0" />
              <span className="truncate">{league.costInfo}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-2 border-t">
            <div className="flex items-center gap-1.5">
              {league.website && <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
              {league.contactEmail && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
              {league.contactPhone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              View Profile <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AddLeagueForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({
    name: "",
    leagueType: "",
    city: "",
    state: "",
    ageGroups: [] as string[],
    seasons: [] as string[],
    description: "",
    website: "",
    registrationUrl: "",
    contactEmail: "",
    contactPhone: "",
    costInfo: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.leagueType || !form.city || !form.state) return;
    onSubmit({
      ...form,
      ageGroups: form.ageGroups.length > 0 ? form.ageGroups : null,
      seasons: form.seasons.length > 0 ? form.seasons : null,
      website: form.website || null,
      registrationUrl: form.registrationUrl || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      costInfo: form.costInfo || null,
      description: form.description || null,
    });
  };

  const toggleAgeGroup = (ag: string) => {
    setForm(f => ({
      ...f,
      ageGroups: f.ageGroups.includes(ag)
        ? f.ageGroups.filter(a => a !== ag)
        : [...f.ageGroups, ag],
    }));
  };

  const toggleSeason = (s: string) => {
    setForm(f => ({
      ...f,
      seasons: f.seasons.includes(s)
        ? f.seasons.filter(x => x !== s)
        : [...f.seasons, s],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>League Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Downtown Recreation League"
          required
          data-testid="input-league-name"
        />
      </div>

      <div>
        <Label>League Type *</Label>
        <Select value={form.leagueType} onValueChange={(v) => setForm(f => ({ ...f, leagueType: v }))}>
          <SelectTrigger data-testid="select-league-type">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {LEAGUE_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>City *</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Austin"
            required
            data-testid="input-league-city"
          />
        </div>
        <div>
          <Label>State *</Label>
          <Select value={form.state} onValueChange={(v) => setForm(f => ({ ...f, state: v }))}>
            <SelectTrigger data-testid="select-league-state">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Age Groups</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {AGE_GROUPS.map((ag) => (
            <Badge
              key={ag}
              variant={form.ageGroups.includes(ag) ? "default" : "outline"}
              className="cursor-pointer toggle-elevate"
              onClick={() => toggleAgeGroup(ag)}
              data-testid={`badge-league-age-${ag}`}
            >
              {ag}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Seasons</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SEASONS.map((s) => (
            <Badge
              key={s}
              variant={form.seasons.includes(s) ? "default" : "outline"}
              className="cursor-pointer toggle-elevate"
              onClick={() => toggleSeason(s)}
              data-testid={`badge-league-season-${s}`}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Tell us about the league..."
          className="resize-none min-h-[80px]"
          data-testid="input-league-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Website</Label>
          <Input
            value={form.website}
            onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://..."
            data-testid="input-league-website"
          />
        </div>
        <div>
          <Label>Registration URL</Label>
          <Input
            value={form.registrationUrl}
            onChange={(e) => setForm(f => ({ ...f, registrationUrl: e.target.value }))}
            placeholder="https://..."
            data-testid="input-league-registration"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))}
            placeholder="info@league.com"
            data-testid="input-league-email"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={form.contactPhone}
            onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))}
            placeholder="(555) 123-4567"
            data-testid="input-league-phone"
          />
        </div>
      </div>

      <div>
        <Label>Cost Info</Label>
        <Input
          value={form.costInfo}
          onChange={(e) => setForm(f => ({ ...f, costInfo: e.target.value }))}
          placeholder="e.g. $100 per season"
          data-testid="input-league-cost"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !form.name || !form.leagueType || !form.city || !form.state} data-testid="button-submit-league">
        {isPending ? "Submitting..." : "Submit League Listing"}
      </Button>
    </form>
  );
}
