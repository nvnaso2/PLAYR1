import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  Check,
  Clock3,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Info,
  MapPin,
  Plus,
  Search,
  Swords,
  Trophy,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, buildUrl, getAuthHeaders, getObjectUrl, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GROUP_CHALLENGE_GOAL_LABELS, GROUP_CHALLENGE_GOAL_TYPES } from "@shared/schema";

type CommunityTab = "activity" | "challenges" | "players";

type Player = {
  userId: string;
  profileSlug?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  city?: string | null;
  state?: string | null;
  age?: number | null;
  skillLevel?: string | null;
  positions?: string[] | null;
  connectionId?: string | null;
  connectionStatus?: string | null;
  isFollowing?: boolean;
  score?: number;
};

const ACTIVITY_EXPLANATIONS = [
  { type: "completed_workout", label: "Workout completed", description: "A player logged a finished training session.", icon: Dumbbell, color: "from-orange-500 to-amber-300" },
  { type: "completed_personal_challenge", label: "Personal challenge completed", description: "A player finished a challenge they set for themselves.", icon: Check, color: "from-emerald-500 to-lime-300" },
  { type: "started_program", label: "Program started", description: "A player committed to a structured training program.", icon: Activity, color: "from-sky-500 to-cyan-300" },
  { type: "completed_program", label: "Program finished", description: "A player completed an entire training program.", icon: Trophy, color: "from-violet-500 to-fuchsia-300" },
  { type: "three_point_challenge_score", label: "3-point score logged", description: "A player recorded a score in the Community 3-point Challenge.", icon: Swords, color: "from-yellow-500 to-orange-300" },
  { type: "group_challenge_progress", label: "Group challenge progress", description: "A player moved their team closer to a shared target.", icon: UsersRound, color: "from-pink-500 to-rose-300" },
  { type: "project_milestone_completed", label: "Project milestone completed", description: "A player finished a step in their My PLAYR1 Project.", icon: Trophy, color: "from-purple-500 to-indigo-300" },
  { type: "game_logged", label: "Game logged", description: "A player recorded a game and shared their box score.", icon: Dumbbell, color: "from-blue-500 to-sky-300" },
  { type: "game_day", label: "Game day", description: "A player has a game or competition on their calendar today.", icon: Flame, color: "from-red-500 to-orange-300" },
] as const;

function profileHref(player: { userId: string; profileSlug?: string | null }) {
  return `/player/${player.profileSlug || player.userId}`;
}

function activityTypeDetails(type?: string) {
  return ACTIVITY_EXPLANATIONS.find((item) => item.type === type) || ACTIVITY_EXPLANATIONS[0];
}

const tabs: Array<{ id: CommunityTab; label: string; description: string; icon: typeof Activity }> = [
  { id: "activity", label: "Activity", description: "See your circle’s progress", icon: Activity },
  { id: "challenges", label: "Challenges", description: "Compete together", icon: Swords },
  { id: "players", label: "Players", description: "Find your people", icon: UsersRound },
];

const skillLevels = ["beginner", "developing", "intermediate", "advanced", "elite"];
const positions = [
  { value: "PG", label: "Point Guard" },
  { value: "SG", label: "Shooting Guard" },
  { value: "SF", label: "Small Forward" },
  { value: "PF", label: "Power Forward" },
  { value: "C", label: "Center" },
];

function getTabFromLocation(location: string): CommunityTab {
  const query = location.split("?")[1] || "";
  const tab = new URLSearchParams(query).get("tab");
  return tab === "challenges" || tab === "players" ? tab : "activity";
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "P";
}

function playerName(player: Player | { displayName?: string | null; firstName?: string | null; lastName?: string | null }) {
  return player.displayName || `${player.firstName || ""} ${player.lastName || ""}`.trim() || "Player";
}

function relativeDate(value: string | Date | null | undefined) {
  if (!value) return "Recently";
  const date = new Date(value);
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function activityStats(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return [];
  const explicitLabel = metadata.statLabel;
  const explicitValue = metadata.statValue;
  if (explicitLabel != null || explicitValue != null) {
    return [{ label: String(explicitLabel || "Stat"), value: String(explicitValue ?? "—") }];
  }

  const labels: Record<string, string> = {
    score: "Score",
    progress: "Progress",
    previousProgress: "Previous",
    shotsMade: "Made",
    shotsAttempted: "Attempts",
    duration: "Minutes",
  };
  return Object.entries(metadata)
    .filter(([key, value]) => labels[key] && (typeof value === "string" || typeof value === "number"))
    .map(([key, value]) => ({ label: labels[key], value: String(value) }));
}

function ActivityFeedCard({ activity }: { activity: any }) {
  const details = activityTypeDetails(activity.activityType);
  const Icon = details.icon;
  const stats = activityStats(activity.metadata);
  const activityPlayer = {
    userId: activity.user.id,
    profileSlug: activity.user.profileSlug,
    displayName: activity.user.displayName,
    profilePhotoUrl: activity.user.profilePhotoUrl,
  };

  return (
    <Card className="group relative overflow-hidden border-zinc-800/70 bg-zinc-900/35 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60">
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${details.color}`} />
      <CardContent className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_minmax(76px,auto)] items-center gap-2 p-2 pl-3.5 sm:gap-3 sm:px-3 sm:py-2 sm:pl-4">
        <Link href={profileHref(activityPlayer)} aria-label={`View ${activity.user.displayName}'s profile`} className="shrink-0">
          <PlayerAvatar player={activityPlayer} size="h-7 w-7 sm:h-8 sm:w-8" />
        </Link>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${details.color} p-[1px] sm:h-8 sm:w-8`}>
          <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-zinc-950">
            <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link href={profileHref(activityPlayer)} className="break-words text-xs font-semibold hover:text-orange-400 sm:text-sm">
              {activity.user.displayName}
            </Link>
            <span className="shrink-0 text-[10px] text-muted-foreground sm:text-[11px]">{relativeDate(activity.createdAt)}</span>
          </div>
          <p className="mt-0.5 break-words text-xs font-medium leading-4 text-zinc-100 sm:text-sm sm:leading-5">{activity.title}</p>
          {activity.description && <p className="break-words text-[11px] leading-4 text-muted-foreground sm:text-xs">{activity.description}</p>}
        </div>
        <div className="flex max-w-[110px] flex-col items-end gap-1 justify-self-end text-right sm:max-w-[190px]" aria-label="Activity stats">
          {stats.length > 0 ? stats.map((stat) => (
            <div key={`${stat.label}-${stat.value}`} className="max-w-full rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1">
              <span className="block break-words text-[8px] uppercase leading-3 tracking-wide text-zinc-500 sm:text-[9px]">{stat.label}</span>
              <span className="block break-words text-[10px] font-bold leading-3.5 text-white sm:text-xs sm:leading-4">{stat.value}</span>
            </div>
          )) : <span className="text-[10px] text-zinc-600">—</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function locationLabel(player: Player) {
  return [player.city, player.state].filter(Boolean).join(", ");
}

function PlayerAvatar({ player, size = "h-10 w-10" }: { player: Player; size?: string }) {
  const name = playerName(player);
  return (
    <Avatar className={`${size} shrink-0`}>
      <AvatarImage src={getObjectUrl(player.profilePhotoUrl) ?? player.profilePhotoUrl ?? undefined} alt="" />
      <AvatarFallback className="bg-orange-500/10 text-orange-300 text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardContent className="p-5 text-sm text-red-200">{message}</CardContent>
    </Card>
  );
}

function ActivityPanel({ user }: { user: unknown }) {
  const { toast } = useToast();
  const [feedOpen, setFeedOpen] = useState(true);
  const [activityScope, setActivityScope] = useState<"friends" | "following">("friends");
  const [guideOpen, setGuideOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibleActivityCount, setVisibleActivityCount] = useState(10);
  const activityFeedUrl = activityScope === "friends" ? "/api/friends/activity" : "/api/follows/activity";
  const { data: feed = [], isLoading: feedLoading, isError: feedError } = useQuery<any[]>({
    queryKey: [activityFeedUrl],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: friends = [], isLoading: friendsLoading } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
  });
  const { data: following = [] } = useQuery<any[]>({
    queryKey: ["/api/follows"],
    enabled: !!user,
  });
  const { data: requests = [], isLoading: requestsLoading, isError: requestsError } = useQuery<any[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user,
  });
  const { data: activityVisibility = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/community/activity-settings"],
    enabled: !!user,
  });
  const updateVisibility = useMutation({
    mutationFn: (visibility: Record<string, boolean>) => apiRequest("PATCH", "/api/community/activity-settings", { visibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/activity-settings"] });
      toast({ title: "Feed visibility updated" });
    },
    onError: () => toast({ title: "Could not update feed visibility", variant: "destructive" }),
  });
  const respondRequest = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      apiRequest("PATCH", `/api/friends/requests/${id}`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      toast({ title: variables.status === "accepted" ? "Friend request accepted" : "Request declined" });
    },
    onError: () => toast({ title: "Could not update request", variant: "destructive" }),
  });
  const scopeLabel = activityScope === "friends" ? "Friends" : "Following";
  useEffect(() => setVisibleActivityCount(10), [activityScope]);
  const visibleFeed = feed.slice(0, visibleActivityCount);

  return (
    <div className="space-y-5">
      {requestsError && <PanelError message="Friend requests could not be loaded. Try refreshing the page." />}
      {requests.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/[0.04]" data-testid="community-friend-requests">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-orange-400" />
              Friend requests
              <Badge className="bg-orange-500 text-black hover:bg-orange-500">{requests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((request: any) => (
              <div key={request.friendship.id} className="flex items-center gap-3">
                  <Link href={profileHref({ userId: request.requester.id, profileSlug: request.requester.profileSlug })} aria-label={`View ${request.requester.displayName}'s profile`}>
                  <PlayerAvatar player={request.requester} />
                </Link>
                <div className="min-w-0 flex-1">
                   <Link href={profileHref({ userId: request.requester.id, profileSlug: request.requester.profileSlug })} className="font-medium text-sm hover:text-orange-400">
                    {request.requester.displayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">wants to connect</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondRequest.mutate({ id: request.friendship.id, status: "accepted" })}
                    disabled={respondRequest.isPending}
                    data-testid={`button-accept-friend-${request.friendship.id}`}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respondRequest.mutate({ id: request.friendship.id, status: "declined" })}
                    disabled={respondRequest.isPending}
                    aria-label={`Decline request from ${request.requester.displayName}`}
                    data-testid={`button-decline-friend-${request.friendship.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Activity</h2>
            <p className="text-sm text-muted-foreground">Recent basketball moments from the last week.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-white" onClick={() => setGuideOpen((open) => !open)} aria-expanded={guideOpen}>
              <Info className="h-3.5 w-3.5" /> What shows up here?
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-white" onClick={() => setVisibilityOpen((open) => !open)} aria-expanded={visibilityOpen}>
              <UsersRound className="h-3.5 w-3.5" /> Visibility
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-white" onClick={() => setFeedOpen((open) => !open)} aria-expanded={feedOpen}>
              {feedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {feedOpen ? "Hide feed" : "Show feed"}
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/50 p-1" role="tablist" aria-label="Activity feed">
          {(["friends", "following"] as const).map((scope) => (
            <Button
              key={scope}
              variant={activityScope === scope ? "secondary" : "ghost"}
              size="sm"
              className={`flex-1 ${activityScope === scope ? "bg-orange-500/15 text-orange-200 hover:bg-orange-500/20" : "text-muted-foreground"}`}
              onClick={() => setActivityScope(scope)}
              role="tab"
              aria-selected={activityScope === scope}
            >
              {scope === "friends" ? "Friends" : "Following"}
              <span className="ml-1.5 text-[10px] opacity-60">{scope === "friends" ? friends.length : following.length}</span>
            </Button>
          ))}
        </div>

        <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
          <DialogContent className="max-h-[82vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>What shows up here?</DialogTitle>
              <DialogDescription>Real basketball actions from the players in your circle. Each color matches the activity in your feed.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              {ACTIVITY_EXPLANATIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className={`shrink-0 rounded-lg bg-gradient-to-br ${item.color} p-[1px]`}>
                      <div className="rounded-[7px] bg-zinc-950 p-1.5"><Icon className="h-3.5 w-3.5 text-white" /></div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-100">{item.label}</p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-400">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={visibilityOpen} onOpenChange={setVisibilityOpen}>
          <DialogContent className="max-h-[82vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Choose what your circle can see</DialogTitle>
              <DialogDescription>These settings control your activity only. Keep training private while still sharing game days, scores, or Project progress.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              {ACTIVITY_EXPLANATIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`shrink-0 rounded-lg bg-gradient-to-br ${item.color} p-[1px]`}>
                        <div className="rounded-[7px] bg-zinc-950 p-1.5"><Icon className="h-3.5 w-3.5 text-white" /></div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100">{item.label}</p>
                        <p className="mt-1 text-[11px] leading-4 text-zinc-400">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      className="mt-1 shrink-0"
                      checked={activityVisibility[item.type] !== false}
                      onCheckedChange={(checked) => updateVisibility.mutate({ ...activityVisibility, [item.type]: checked })}
                      aria-label={`Show ${item.label.toLowerCase()} in your friends' feeds`}
                      disabled={updateVisibility.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {!feedOpen ? (
          <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-muted-foreground">Your activity feed is hidden for now. Show it whenever you want to catch up.</div>
        ) : feedError ? (
          <PanelError message="Activity could not be loaded. Try refreshing the page." />
        ) : feedLoading || (activityScope === "friends" && friendsLoading) ? (
          <div className="space-y-3" aria-label={`Loading ${scopeLabel.toLowerCase()} activity`} aria-busy="true">
            <Skeleton className="h-56 w-full bg-zinc-900" />
          </div>
        ) : feed.length === 0 ? (
          <Card className="border-dashed border-zinc-700 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 rounded-full bg-orange-500/10 p-3"><Activity className="h-6 w-6 text-orange-400" /></div>
              <h3 className="font-semibold">{(activityScope === "friends" ? friends.length : following.length) ? "No new activity yet" : activityScope === "friends" ? "Build your basketball circle" : "Follow players to fill this feed"}</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {(activityScope === "friends" ? friends.length : following.length)
                  ? `When ${activityScope === "friends" ? "your friends" : "players you follow"} train, hit milestones, or finish challenges, you’ll see it here.`
                  : activityScope === "friends" ? "Find players you know or players working toward a similar game. Their progress will appear here automatically." : "Follow players whose work, games, and progress you want to keep up with."}
              </p>
              <Button className="mt-5" onClick={() => window.dispatchEvent(new CustomEvent("community-tab", { detail: "players" }))}>
                <UsersRound className="mr-2 h-4 w-4" /> Find players
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" data-testid="community-activity-feed">
            {visibleFeed.map((activity: any) => <ActivityFeedCard key={activity.id} activity={activity} />)}
            {visibleActivityCount < feed.length && (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full border-zinc-800 bg-zinc-950/50 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
                onClick={() => setVisibleActivityCount((count) => count + 10)}
                data-testid="button-see-more-activity"
              >
                See more
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, isOwner, onInvite, canJoin, onJoin }: { challenge: any; isOwner: boolean; onInvite: () => void; canJoin?: boolean; onJoin?: () => void }) {
  const goal = Math.max(1, Number(challenge.goalAmount));
  const endsAt = new Date(challenge.endsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));
  const ended = endsAt.getTime() < Date.now();
  const members = [...(challenge.members || [])].sort((a, b) => Number(b.progress) - Number(a.progress));
  const totalProgress = members.reduce((sum, member) => sum + Number(member.progress || 0), 0);
  const totalGoal = goal * Math.max(1, members.length);
  const completion = Math.min(100, Math.round((totalProgress / totalGoal) * 100));

  return (
    <Card className="border-zinc-800/70 bg-zinc-900/30" data-testid={`card-group-challenge-${challenge.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-inner" style={{ backgroundColor: challenge.color || "#f97316" }}>
              {challenge.emoji || <Swords className="h-5 w-5 text-black/70" />}
            </div>
            <div className="min-w-0">
            <CardTitle className="truncate text-base">{challenge.name}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {GROUP_CHALLENGE_GOAL_LABELS[challenge.goalType as keyof typeof GROUP_CHALLENGE_GOAL_LABELS] || challenge.goalType} · {goal.toLocaleString()} per player · {challenge.audience === "public" ? "Anyone can join" : challenge.audience === "followers" ? "Followers can join" : "Friends only"}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canJoin && onJoin && <Button size="sm" className="h-8 bg-orange-500 text-black hover:bg-orange-400" onClick={onJoin}>Join</Button>}
            {isOwner && <Button variant="outline" size="sm" className="h-8 border-orange-500/30 text-orange-300" onClick={onInvite}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite</Button>}
            <Badge variant="outline" className={ended ? "border-zinc-700 text-zinc-500" : "border-orange-500/30 text-orange-300"}>
              <Clock3 className="mr-1 h-3 w-3" /> {ended ? "Complete" : `${daysLeft}d left`}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Group completion</span>
            <span className="font-medium text-orange-300">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label={`${challenge.name} group completion`}>
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${completion}%` }} />
          </div>
        </div>
        <div className="space-y-3">
          {members.map((member: any, index: number) => {
            const progress = Number(member.progress || 0);
            const percent = Math.min(100, Math.round((progress / goal) * 100));
            return (
              <div key={member.id} className="flex items-center gap-3">
                <span className="w-4 text-center text-xs text-muted-foreground">{index + 1}</span>
                <Link href={profileHref({ userId: member.user.id, profileSlug: member.user.profileSlug })} aria-label={`View ${member.user.displayName}'s profile`}>
                  <PlayerAvatar player={member.user} size="h-8 w-8" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <Link href={profileHref({ userId: member.user.id, profileSlug: member.user.profileSlug })} className="truncate font-medium hover:text-orange-400">{member.user.displayName}</Link>
                    <span className="shrink-0 text-muted-foreground">{progress.toLocaleString()} / {goal.toLocaleString()} ({percent}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ChallengesPanel({ user }: { user: unknown }) {
  const { toast } = useToast();
  const myId = (user as any)?.claims?.sub ?? (user as any)?.id;
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteChallengeId, setInviteChallengeId] = useState<string | null>(null);
  const [challengesOpen, setChallengesOpen] = useState(true);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<string>("training_sessions");
  const [goalAmount, setGoalAmount] = useState("5");
  const [durationDays, setDurationDays] = useState("14");
  const [audience, setAudience] = useState<"friends" | "followers" | "public">("friends");
  const [inviteSearch, setInviteSearch] = useState("");
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [manageInviteSearch, setManageInviteSearch] = useState("");
  const [emoji, setEmoji] = useState("🏀");
  const [color, setColor] = useState("#f97316");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [detailChallenge, setDetailChallenge] = useState<any | null>(null);

  const challengesQuery = useQuery<any[]>({
    queryKey: ["/api/group-challenges"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const invitesQuery = useQuery<any[]>({
    queryKey: ["/api/group-challenges/invites"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const discoverQuery = useQuery<any[]>({
    queryKey: ["/api/group-challenges/discover"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const invitePlayersQuery = useQuery<Player[]>({
    queryKey: ["/api/users/search", "challenge-invite", inviteSearch],
    queryFn: async () => {
      const response = await fetch(buildUrl(`/api/users/search?q=${encodeURIComponent(inviteSearch)}`), { credentials: "include", headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Could not search players");
      return response.json();
    },
    enabled: inviteSearch.trim().length >= 2,
  });
  const manageInvitePlayersQuery = useQuery<Player[]>({
    queryKey: ["/api/users/search", "challenge-manage-invite", manageInviteSearch],
    queryFn: async () => {
      const response = await fetch(buildUrl(`/api/users/search?q=${encodeURIComponent(manageInviteSearch)}`), { credentials: "include", headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Could not search players");
      return response.json();
    },
    enabled: manageInviteSearch.trim().length >= 2 && !!inviteChallengeId,
  });

  const createChallenge = useMutation({
    mutationFn: () => apiRequest("POST", "/api/group-challenges", {
      name: name.trim(),
      goalType,
      goalAmount: Number(goalAmount),
      durationDays: Number(durationDays),
      audience,
      inviteIds: selectedInviteIds,
      emoji,
      color,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/invites"] });
      setCreateOpen(false);
      setName("");
      setSelectedInviteIds([]);
      setAudience("friends");
      setEmoji("🏀");
      setColor("#f97316");
      toast({ title: "Challenge created" });
    },
    onError: () => toast({ title: "Could not create challenge", variant: "destructive" }),
  });
  const respondInvite = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      apiRequest("PATCH", `/api/group-challenges/members/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/invites"] });
    },
    onError: () => toast({ title: "Could not update challenge invite", variant: "destructive" }),
  });
  const invitePlayer = useMutation({
    mutationFn: ({ challengeId, playerId }: { challengeId: string; playerId: string }) =>
      apiRequest("POST", `/api/group-challenges/${challengeId}/invite`, { userId: playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/invites"] });
      setInviteChallengeId(null);
      setManageInviteSearch("");
      toast({ title: "Challenge invite sent" });
    },
    onError: () => toast({ title: "Could not send challenge invite", variant: "destructive" }),
  });

  const validForm = name.trim().length > 1 && Number(goalAmount) > 0 && Number(durationDays) > 0;
  const challenges = challengesQuery.data || [];
  const pendingInvites = invitesQuery.data || [];
  const discoverableChallenges = (discoverQuery.data || []).filter((challenge: any) => !challenges.some((current: any) => current.id === challenge.id));
  const joinChallenge = useMutation({
    mutationFn: (challengeId: string) => apiRequest("POST", `/api/group-challenges/${challengeId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/discover"] });
      toast({ title: "Joined challenge" });
    },
    onError: (error: any) => toast({ title: error?.message || "Could not join challenge", variant: "destructive" }),
  });
  useEffect(() => {
    if (!selectedChallengeId || !challenges.some((challenge: any) => challenge.id === selectedChallengeId)) {
      setSelectedChallengeId(challenges[0]?.id ?? null);
    }
  }, [challenges, selectedChallengeId]);
  const selectedChallenge = challenges.find((challenge: any) => challenge.id === selectedChallengeId) || challenges[0];
  const joinedChallenges = challenges.filter((challenge: any) => challenge.id !== selectedChallenge?.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold">Train toward something together</h2>
          <p className="text-sm text-muted-foreground">Shared goals, visible progress, friendly competition.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-white" onClick={() => setChallengesOpen((open) => !open)} aria-expanded={challengesOpen}>
            {challengesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {challengesOpen ? "Hide challenges" : "Show challenges"}
          </Button>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-community-challenge"><Plus className="mr-2 h-4 w-4" /> Create challenge</Button>
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/[0.04]" data-testid="community-challenge-invites">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-300" /> Challenge invites <Badge className="bg-yellow-400 text-black hover:bg-yellow-400">{pendingInvites.length}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite: any) => (
              <div key={invite.id} className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{invite.challenge.name}</p>
                  <p className="text-xs text-muted-foreground">Invited by {invite.challenge.creator.displayName}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondInvite.mutate({ id: invite.id, status: "accepted" })} disabled={respondInvite.isPending}><Check className="mr-1 h-3.5 w-3.5" /> Join</Button>
                  <Button size="sm" variant="ghost" onClick={() => respondInvite.mutate({ id: invite.id, status: "declined" })} disabled={respondInvite.isPending}>Decline</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!challengesOpen ? (
        <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs text-muted-foreground">Active challenges are hidden for now. Show them whenever you want to check progress.</div>
      ) : challengesQuery.isError || invitesQuery.isError ? (
        <PanelError message="Challenges could not be loaded. Try refreshing the page." />
      ) : challengesQuery.isLoading ? (
        <div className="space-y-3" aria-label="Loading challenges" aria-busy="true">{[1, 2].map((item) => <Skeleton key={item} className="h-56 w-full bg-zinc-900" />)}</div>
      ) : challenges.length === 0 ? (
        <Card className="border-dashed border-zinc-700 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 rounded-full bg-yellow-500/10 p-3"><Swords className="h-6 w-6 text-yellow-300" /></div>
            <h3 className="font-semibold">No active challenges</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Create a measurable challenge and invite friends to make your next block of training more social.</p>
            <Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Start a challenge</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="community-challenges-list">
          {selectedChallenge && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">Your focus</p>
                  <p className="text-xs text-muted-foreground">Keep one goal in view. Switch anytime.</p>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">Joined</Badge>
              </div>
              <ChallengeCard challenge={selectedChallenge} isOwner={selectedChallenge.creatorId === myId} onInvite={() => setInviteChallengeId(selectedChallenge.id)} />
            </div>
          )}
          {joinedChallenges.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {joinedChallenges.map((challenge: any) => (
                <button key={challenge.id} type="button" onClick={() => setDetailChallenge(challenge)} className="group flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/45 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-zinc-900/80">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: challenge.color || "#f97316" }}>{challenge.emoji || <Swords className="h-4 w-4 text-black/70" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-100">{challenge.name}</span><span className="mt-0.5 block text-[11px] text-zinc-500">Open details · {challenge.members?.length || 0} players</span></span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!discoverQuery.isLoading && discoverableChallenges.length > 0 && (
        <section className="space-y-3" data-testid="community-public-challenges">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Find your next run</p><h3 className="text-lg font-semibold">Open challenge pool</h3><p className="text-sm text-muted-foreground">Browse public goals and join the one that fits your week.</p></div>
              <Badge variant="outline" className="hidden border-sky-500/30 text-sky-300 sm:inline-flex">{discoverableChallenges.length} open</Badge>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {discoverableChallenges.map((challenge: any) => (
              <button key={challenge.id} type="button" onClick={() => setDetailChallenge(challenge)} className="group rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-500/[0.08] to-zinc-900/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-400/40">
                <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: challenge.color || "#38bdf8" }}>{challenge.emoji || <Swords className="h-5 w-5 text-black/70" />}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{challenge.name}</span><span className="mt-1 block text-xs text-zinc-400">{GROUP_CHALLENGE_GOAL_LABELS[challenge.goalType as keyof typeof GROUP_CHALLENGE_GOAL_LABELS] || challenge.goalType} · {Number(challenge.goalAmount).toLocaleString()} per player</span></span><ChevronDown className="h-4 w-4 -rotate-90 text-sky-300 transition-transform group-hover:translate-x-0.5" /></div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500"><span>{challenge.members?.length || 0} players joined</span><span className="font-semibold text-sky-300">View & join</span></div>
              </button>
            ))}
          </div>
        </section>
      )}

      <Dialog open={!!detailChallenge} onOpenChange={(open) => !open && setDetailChallenge(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-2xl">
          {detailChallenge && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: detailChallenge.color || "#f97316" }}>{detailChallenge.emoji || <Swords className="h-5 w-5 text-black/70" />}</span>{detailChallenge.name}</DialogTitle>
                <DialogDescription>See the full leaderboard and decide if this is your next shared target.</DialogDescription>
              </DialogHeader>
              <ChallengeCard challenge={detailChallenge} isOwner={detailChallenge.creatorId === myId} onInvite={() => { setDetailChallenge(null); setInviteChallengeId(detailChallenge.id); }} canJoin={discoverableChallenges.some((item: any) => item.id === detailChallenge.id)} onJoin={() => { joinChallenge.mutate(detailChallenge.id); setDetailChallenge(null); }} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a challenge</DialogTitle>
            <DialogDescription>Keep it simple and measurable. You can invite friends now or later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Challenge name</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="14-day training streak" data-testid="input-challenge-name" /></label>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <span className="block text-sm font-medium">Challenge identity</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose challenge emoji">
                  {["🏀", "🔥", "🎯", "⚡", "💪", "🏆"].map((option) => <button key={option} type="button" role="radio" aria-checked={emoji === option} onClick={() => setEmoji(option)} className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-all ${emoji === option ? "border-orange-400 bg-orange-500/15 ring-2 ring-orange-400/30" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>{option}</button>)}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm sm:flex-col sm:items-start"><span className="font-medium">Color</span><span className="flex items-center gap-2"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-transparent p-1" aria-label="Choose challenge color" /><span className="font-mono text-xs text-zinc-500">{color}</span></span></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm"><span className="font-medium">Measure</span>
                <Select value={goalType} onValueChange={setGoalType}><SelectTrigger data-testid="select-challenge-goal"><SelectValue /></SelectTrigger><SelectContent>{GROUP_CHALLENGE_GOAL_TYPES.map((type) => <SelectItem key={type} value={type}>{GROUP_CHALLENGE_GOAL_LABELS[type]}</SelectItem>)}</SelectContent></Select>
              </label>
              <label className="block space-y-1.5 text-sm"><span className="font-medium">Target per player</span><Input type="number" min="1" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} data-testid="input-challenge-target" /></label>
            </div>
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Length in days</span><Input type="number" min="1" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} data-testid="input-challenge-duration" /></label>
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Who can join?</span>
              <Select value={audience} onValueChange={(value: "friends" | "followers" | "public") => setAudience(value)}><SelectTrigger data-testid="select-challenge-audience"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="friends">Friends only — invite players</SelectItem>
                <SelectItem value="followers">Followers — anyone following you</SelectItem>
                <SelectItem value="public">Public — anyone can join</SelectItem>
              </SelectContent></Select>
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="challenge-invite-search">Invite friends</label>
              <Input id="challenge-invite-search" value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Search by name" />
              {selectedInviteIds.length > 0 && <p className="text-xs text-orange-300">{selectedInviteIds.length} player{selectedInviteIds.length === 1 ? "" : "s"} selected</p>}
              {invitePlayersQuery.data?.map((player) => {
                const selected = selectedInviteIds.includes(player.userId);
                return (
                  <button key={player.userId} type="button" onClick={() => setSelectedInviteIds((current) => selected ? current.filter((id) => id !== player.userId) : [...current, player.userId])} className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${selected ? "border-orange-500/50 bg-orange-500/10" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <PlayerAvatar player={player} size="h-8 w-8" /><span className="flex-1 truncate text-sm">{playerName(player)}</span>{selected && <Check className="h-4 w-4 text-orange-400" />}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={() => createChallenge.mutate()} disabled={!validForm || createChallenge.isPending} data-testid="button-submit-community-challenge">{createChallenge.isPending ? "Creating…" : "Create challenge"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inviteChallengeId} onOpenChange={(open) => { if (!open) { setInviteChallengeId(null); setManageInviteSearch(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to this challenge</DialogTitle>
            <DialogDescription>Search for another player and add them without leaving the challenge.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={manageInviteSearch} onChange={(event) => setManageInviteSearch(event.target.value)} placeholder="Search player names" autoFocus />
            {manageInvitePlayersQuery.data?.map((player) => (
              <div key={player.userId} className="flex items-center gap-3 rounded-lg border border-zinc-800 p-2">
                <PlayerAvatar player={player} size="h-8 w-8" />
                <span className="min-w-0 flex-1 truncate text-sm">{playerName(player)}</span>
                <Button size="sm" onClick={() => inviteChallengeId && invitePlayer.mutate({ challengeId: inviteChallengeId, playerId: player.userId })} disabled={invitePlayer.isPending}>Invite</Button>
              </div>
            ))}
            {manageInviteSearch.length >= 2 && !manageInvitePlayersQuery.isLoading && !manageInvitePlayersQuery.data?.length && <p className="text-sm text-muted-foreground">No players found.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerCard({ player, onAdd, onAccept, onFollow, onRemoveFriend, adding, following, removingFriend }: { player: Player; onAdd: () => void; onAccept: () => void; onFollow: () => void; onRemoveFriend: () => void; adding: boolean; following: boolean; removingFriend: boolean }) {
  const name = playerName(player);
  const status = player.connectionStatus;
  return (
    <Card className="border-zinc-800/70 bg-zinc-900/30">
      <CardContent className="flex items-center gap-3 p-3">
        <Link href={profileHref(player)} aria-label={`View ${name}'s profile`}><PlayerAvatar player={player} /></Link>
        <div className="min-w-0 flex-1">
          <Link href={profileHref(player)} className="block truncate text-sm font-medium hover:text-orange-400">{name}</Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {player.skillLevel && <span className="capitalize">{player.skillLevel}</span>}
            {player.positions?.[0] && <span>{positions.find((position) => position.value === player.positions?.[0])?.label || player.positions[0]}</span>}
            {locationLabel(player) && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{locationLabel(player)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant={player.isFollowing ? "secondary" : "outline"} className={player.isFollowing ? "text-orange-200" : "border-orange-500/40 text-orange-300 hover:bg-orange-500/10"} onClick={onFollow} disabled={following || status === "friends"} title={status === "friends" ? "Unfriend this player before unfollowing" : undefined} data-testid={`button-follow-player-${player.userId}`}>
            {player.isFollowing ? "Following" : "Follow"}
          </Button>
          {status === "friends" ? <Button size="sm" variant="ghost" className="text-emerald-300 hover:bg-red-500/10 hover:text-red-300" onClick={onRemoveFriend} disabled={removingFriend} data-testid={`button-unfriend-player-${player.userId}`}>Unfriend</Button>
            : status === "outgoing_pending" ? <Badge variant="outline" className="border-zinc-700 text-zinc-400">Pending</Badge>
              : status === "incoming_pending" ? <Button size="sm" onClick={onAccept} disabled={adding} data-testid={`button-accept-player-${player.userId}`}><Check className="mr-1 h-3 w-3" /> Accept</Button>
                : <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10" onClick={onAdd} disabled={adding || !player.isFollowing} title={!player.isFollowing ? "Follow this player before friending them" : undefined} data-testid={`button-add-player-${player.userId}`}><UserPlus className="mr-1 h-3 w-3" /> {player.isFollowing ? "Friend" : "Follow to friend"}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayersPanel({ user }: { user: unknown }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("all");
  const [position, setPosition] = useState("all");
  const [state, setState] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const recommendedQuery = useQuery<Player[]>({ queryKey: ["/api/users/recommended"], enabled: !!user });
  const friendsQuery = useQuery<any[]>({ queryKey: ["/api/friends"], enabled: !!user });
  const requestsQuery = useQuery<any[]>({ queryKey: ["/api/friends/requests"], enabled: !!user });
  const hasSearch = search.trim().length >= 2;
  const searchQuery = useQuery<Player[]>({
    queryKey: ["/api/users/search", search.trim(), skill, position, state.trim()],
    queryFn: async () => {
      const params = new URLSearchParams({ q: search.trim() });
      if (skill !== "all") params.set("skillLevel", skill);
      if (position !== "all") params.set("position", position);
      if (state.trim()) params.set("state", state.trim());
      const response = await fetch(buildUrl(`/api/users/search?${params.toString()}`), { credentials: "include", headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Could not search players");
      return response.json();
    },
    enabled: hasSearch,
  });
  const sendRequest = useMutation({
    mutationFn: (playerId: string) => apiRequest("POST", "/api/friends/request", { addresseeId: playerId }),
    onMutate: (playerId) => setAddingId(playerId),
    onSettled: () => setAddingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({ title: "Friend request sent" });
    },
    onError: () => toast({ title: "Could not send friend request", variant: "destructive" }),
  });
  const acceptRequest = useMutation({
    mutationFn: (requestId: string) => apiRequest("PATCH", `/api/friends/requests/${requestId}`, { status: "accepted" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({ title: "Friend request accepted" });
    },
    onError: () => toast({ title: "Could not accept request", variant: "destructive" }),
  });
  const toggleFollow = useMutation({
    mutationFn: ({ userId, following }: { userId: string; following: boolean }) =>
      apiRequest("PATCH", `/api/follows/${userId}`, { following }),
    onMutate: ({ userId }) => setFollowingId(userId),
    onSettled: () => setFollowingId(null),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({ title: variables.following ? "Now following player" : "Unfollowed player" });
    },
    onError: () => toast({ title: "Could not update follow", variant: "destructive" }),
  });
  const removeFriend = useMutation({
    mutationFn: (friendId: string) => apiRequest("DELETE", `/api/friends/${friendId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({ title: "Friend removed" });
    },
    onError: () => toast({ title: "Could not unfriend player", variant: "destructive" }),
  });

  const incomingByUser = useMemo(() => new Map((requestsQuery.data || []).map((request: any) => [request.requester.id, request])), [requestsQuery.data]);
  const filteredRecommended = useMemo(() => (recommendedQuery.data || []).filter((player) => {
    const skillMatch = skill === "all" || player.skillLevel === skill;
    const positionMatch = position === "all" || player.positions?.includes(position);
    const stateMatch = !state.trim() || player.state?.toLowerCase().includes(state.trim().toLowerCase());
    return skillMatch && positionMatch && stateMatch;
  }), [recommendedQuery.data, position, skill, state]);
  const players = hasSearch ? (searchQuery.data || []) : filteredRecommended;

  return (
    <div className="space-y-5">
      {friendsQuery.data && friendsQuery.data.length > 0 && (
        <Card className="border-orange-500/15 bg-orange-500/[0.035]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Your friends</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Players you have a two-way connection with.</p>
            </div>
            <Badge variant="outline" className="border-orange-500/25 text-orange-300">{friendsQuery.data.length}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {friendsQuery.data.map((item: any) => (
              <div key={item.friendship.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/35 p-2.5 transition-colors hover:border-orange-500/40">
                <Link
                  href={profileHref({ userId: item.friend.id, profileSlug: item.friend.profileSlug })}
                  className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <PlayerAvatar player={item.friend} size="h-8 w-8" />
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-medium">{item.friend.displayName}</span>
                    {item.friend.skillLevel && <span className="block truncate text-[10px] capitalize text-muted-foreground">{item.friend.skillLevel}</span>}
                  </div>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 text-xs text-orange-200"
                  disabled
                  title="Unfriend this player before unfollowing"
                  data-testid={`button-follow-friend-${item.friend.id}`}
                >
                  Following
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs text-muted-foreground hover:text-red-300"
                  onClick={() => removeFriend.mutate(item.friend.id)}
                  disabled={removeFriend.isPending}
                  data-testid={`button-unfriend-${item.friend.id}`}
                >
                  Unfriend
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <div>
        <h2 className="text-lg font-semibold">Find players</h2>
        <p className="text-sm text-muted-foreground">Keep your circle close, then find more players who fit your game.</p>
      </div>
      <Card className="border-orange-500/20 bg-orange-500/[0.04]">
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search player names" aria-label="Search player names" data-testid="input-community-player-search" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={skill} onValueChange={setSkill}><SelectTrigger aria-label="Filter by skill level"><SelectValue placeholder="Skill level" /></SelectTrigger><SelectContent><SelectItem value="all">All skill levels</SelectItem>{skillLevels.map((level) => <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>)}</SelectContent></Select>
            <Select value={position} onValueChange={setPosition}><SelectTrigger aria-label="Filter by position"><SelectValue placeholder="Position" /></SelectTrigger><SelectContent><SelectItem value="all">All positions</SelectItem>{positions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
            <Input value={state} onChange={(event) => setState(event.target.value)} placeholder="State (optional)" aria-label="Filter by state" />
          </div>
        </CardContent>
      </Card>

      {hasSearch && <p className="text-sm text-muted-foreground">{searchQuery.isLoading ? "Searching…" : `${players.length} player${players.length === 1 ? "" : "s"} found`}</p>}
      {!hasSearch && <div><h3 className="font-medium">Similar profiles</h3><p className="mt-1 text-xs text-muted-foreground">Based on your skill level, position, and location.</p></div>}
      {recommendedQuery.isError || searchQuery.isError ? <PanelError message="Players could not be loaded. Try again in a moment." /> : recommendedQuery.isLoading || (hasSearch && searchQuery.isLoading) ? (
        <div className="grid gap-3 md:grid-cols-2" aria-label="Loading players" aria-busy="true">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20 bg-zinc-900" />)}</div>
      ) : players.length === 0 ? (
        <Card className="border-dashed border-zinc-700 bg-transparent"><CardContent className="p-10 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-zinc-500" /><h3 className="font-medium">{hasSearch ? "No players found" : "No player suggestions yet"}</h3><p className="mt-1 text-sm text-muted-foreground">{hasSearch ? "Try another name or remove a filter." : "Complete more of your profile or search for someone by name."}</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2" data-testid="community-player-results">
          {players.map((player) => {
            const incoming = incomingByUser.get(player.userId);
            const normalizedPlayer = incoming ? { ...player, connectionStatus: "incoming_pending" } : player;
             return <PlayerCard key={player.userId} player={normalizedPlayer} adding={addingId === player.userId || acceptRequest.isPending} following={followingId === player.userId || toggleFollow.isPending} removingFriend={removeFriend.isPending} onAdd={() => sendRequest.mutate(player.userId)} onAccept={() => incoming && acceptRequest.mutate(incoming.friendship.id)} onFollow={() => toggleFollow.mutate({ userId: player.userId, following: !player.isFollowing })} onRemoveFriend={() => removeFriend.mutate(player.userId)} />;
          })}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CommunityTab>(getTabFromLocation(location));
  const { data: requests = [] } = useQuery<any[]>({ queryKey: ["/api/friends/requests"], enabled: !!user });
  const { data: challengeInvites = [] } = useQuery<any[]>({ queryKey: ["/api/group-challenges/invites"], enabled: !!user });
  const { data: friends = [] } = useQuery<any[]>({ queryKey: ["/api/friends"], enabled: !!user });
  const { data: activeChallenges = [] } = useQuery<any[]>({ queryKey: ["/api/group-challenges"], enabled: !!user });

  useEffect(() => {
    setActiveTab(getTabFromLocation(location));
  }, [location]);

  useEffect(() => {
    const handleTabEvent = (event: Event) => selectTab((event as CustomEvent<CommunityTab>).detail);
    window.addEventListener("community-tab", handleTabEvent);
    return () => window.removeEventListener("community-tab", handleTabEvent);
  });

  function selectTab(tab: CommunityTab) {
    setActiveTab(tab);
    navigate(`/community?tab=${tab}`);
  }

  const active = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveIcon = active.icon;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-5 sm:px-6" data-testid="community-shell">
      <header className="relative mb-5 overflow-hidden rounded-2xl border border-orange-500/15 bg-gradient-to-br from-orange-500/[0.12] via-zinc-950 to-zinc-950 p-4 shadow-xl shadow-orange-950/10 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[22px] border-orange-400/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                PLAYR1 Community
              </div>
              <h1 className="max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl" data-testid="text-community-title">Your game is better together.</h1>
              <p className="mt-2 max-w-xl text-sm leading-5 text-zinc-300">See the work happening around you, challenge your circle, and find players who are building toward the same next step.</p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 sm:flex">
              <ActiveIcon className="h-6 w-6 text-orange-300" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-lg font-bold text-white">{friends.length}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">in your circle</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-lg font-bold text-white">{activeChallenges.length}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">active challenges</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-lg font-bold text-white">{requests.length + challengeInvites.length}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">things to review</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="mb-7 grid grid-cols-3 gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-1.5 shadow-lg shadow-black/20" aria-label="Community sections" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          const count = tab.id === "activity" ? requests.length : tab.id === "challenges" ? challengeInvites.length : 0;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`community-panel-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              className={`relative flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${selected ? "bg-gradient-to-r from-orange-500 to-amber-400 text-black shadow-lg shadow-orange-950/30" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
              data-testid={`tab-community-${tab.id}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate font-medium">{tab.label}</span>
              {count > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${selected ? "bg-black/15 text-black" : "bg-orange-500 text-black"}`}>{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
        <ActiveIcon className="h-4 w-4 text-orange-400" aria-hidden="true" />
        <span>{active.description}</span>
      </div>

      <section id={`community-panel-${activeTab}`} role="tabpanel" aria-label={active.label}>
        {activeTab === "activity" && <ActivityPanel user={user} />}
        {activeTab === "challenges" && <ChallengesPanel user={user} />}
        {activeTab === "players" && <PlayersPanel user={user} />}
      </section>
    </main>
  );
}