import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  X,
  Filter,
} from "lucide-react";
import { SiInstagram, SiX } from "react-icons/si";
import type { TeamClub, League } from "@shared/schema";
import { TEAM_ORGANIZATION_TYPES, LEAGUE_TYPES, AGE_GROUPS, SEASONS, US_STATES } from "@shared/schema";

export default function FinderPage() {
  const [activeTab, setActiveTab] = useState("teams");

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">
          Find Teams & Leagues
        </h1>
        <p className="text-sm text-muted-foreground">
          Discover AAU, travel, and competitive teams or find local leagues near you
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="teams" data-testid="tab-teams">
            <Users className="h-4 w-4 mr-1.5" />
            Team Finder
          </TabsTrigger>
          <TabsTrigger value="leagues" data-testid="tab-leagues">
            <Trophy className="h-4 w-4 mr-1.5" />
            League Finder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-4">
          <TeamFinderTab />
        </TabsContent>
        <TabsContent value="leagues" className="mt-4">
          <LeagueFinderTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamFinderTab() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ type: "", state: "", city: "", ageGroup: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (filters.type) queryParams.set("type", filters.type);
  if (filters.state) queryParams.set("state", filters.state);
  if (filters.city) queryParams.set("city", filters.city);
  if (filters.ageGroup) queryParams.set("ageGroup", filters.ageGroup);
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

  const activeFilterCount = [filters.type, filters.state, filters.city, filters.ageGroup].filter(Boolean).length;

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
              onClick={() => setFilters({ type: "", state: "", city: "", ageGroup: "" })}
              data-testid="button-clear-team-filters"
            >
              Clear All
            </Button>
          )}
        </div>

        {isAuthenticated && (
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : clubs && clubs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clubs.map((club) => (
            <TeamClubCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1" data-testid="text-no-teams">No Teams Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeFilterCount > 0
                ? "No teams match your current filters. Try adjusting your search criteria."
                : "Be the first to add a team or club listing."}
            </p>
            {isAuthenticated && (
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
    <Card className="hover-elevate" data-testid={`card-team-${club.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-team-name-${club.id}`}>{club.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{club.city}, {club.state}</span>
            </div>
          </div>
          <Badge variant="secondary">{club.organizationType}</Badge>
        </div>

        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
        )}

        {club.ageGroups && club.ageGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {club.ageGroups.map((ag) => (
              <Badge key={ag} variant="outline" className="text-xs">{ag}</Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {club.website && (
            <a href={club.website.startsWith("http") ? club.website : `https://${club.website}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" data-testid={`link-team-website-${club.id}`}>
                <Globe className="h-4 w-4" />
              </Button>
            </a>
          )}
          {club.contactEmail && (
            <a href={`mailto:${club.contactEmail}`}>
              <Button variant="ghost" size="icon" data-testid={`link-team-email-${club.id}`}>
                <Mail className="h-4 w-4" />
              </Button>
            </a>
          )}
          {club.contactPhone && (
            <a href={`tel:${club.contactPhone}`}>
              <Button variant="ghost" size="icon" data-testid={`link-team-phone-${club.id}`}>
                <Phone className="h-4 w-4" />
              </Button>
            </a>
          )}
          {club.socialInstagram && (
            <a href={club.socialInstagram.startsWith("http") ? club.socialInstagram : `https://instagram.com/${club.socialInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon">
                <SiInstagram className="h-4 w-4" />
              </Button>
            </a>
          )}
          {club.socialTwitter && (
            <a href={club.socialTwitter.startsWith("http") ? club.socialTwitter : `https://twitter.com/${club.socialTwitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon">
                <SiX className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
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

function LeagueFinderTab() {
  const { isAuthenticated } = useAuth();
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
        </div>

        {isAuthenticated && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : leaguesList && leaguesList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {activeFilterCount > 0
                ? "No leagues match your current filters. Try adjusting your search criteria."
                : "Be the first to add a league listing."}
            </p>
            {isAuthenticated && (
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
    <Card className="hover-elevate" data-testid={`card-league-${league.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-league-name-${league.id}`}>{league.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{league.city}, {league.state}</span>
            </div>
          </div>
          <Badge variant="secondary">{league.leagueType}</Badge>
        </div>

        {league.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{league.description}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {league.ageGroups && league.ageGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {league.ageGroups.map((ag) => (
                <Badge key={ag} variant="outline" className="text-xs">{ag}</Badge>
              ))}
            </div>
          )}
        </div>

        {league.seasons && league.seasons.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{league.seasons.join(", ")}</span>
          </div>
        )}

        {league.costInfo && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span>{league.costInfo}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {league.website && (
            <a href={league.website.startsWith("http") ? league.website : `https://${league.website}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" data-testid={`link-league-website-${league.id}`}>
                <Globe className="h-4 w-4" />
              </Button>
            </a>
          )}
          {league.registrationUrl && (
            <a href={league.registrationUrl.startsWith("http") ? league.registrationUrl : `https://${league.registrationUrl}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" data-testid={`link-league-register-${league.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Register
              </Button>
            </a>
          )}
          {league.contactEmail && (
            <a href={`mailto:${league.contactEmail}`}>
              <Button variant="ghost" size="icon" data-testid={`link-league-email-${league.id}`}>
                <Mail className="h-4 w-4" />
              </Button>
            </a>
          )}
          {league.contactPhone && (
            <a href={`tel:${league.contactPhone}`}>
              <Button variant="ghost" size="icon" data-testid={`link-league-phone-${league.id}`}>
                <Phone className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
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
          placeholder="e.g. North Dallas Youth Basketball League"
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
            placeholder="Dallas"
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
        <Label>Cost / Fee Info</Label>
        <Input
          value={form.costInfo}
          onChange={(e) => setForm(f => ({ ...f, costInfo: e.target.value }))}
          placeholder="e.g. $150 per season, Free for under 8"
          data-testid="input-league-cost"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !form.name || !form.leagueType || !form.city || !form.state} data-testid="button-submit-league">
        {isPending ? "Submitting..." : "Submit League Listing"}
      </Button>
    </form>
  );
}
