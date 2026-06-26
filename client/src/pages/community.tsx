import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  UserPlus, Shield, ChevronRight, Users, Activity,
  Swords, Search, Clock, Trophy, Check, X, Plus,
  UserCheck, Calendar, Zap, Star, Flame,
  RefreshCw, Bell,
} from "lucide-react";
import {
  GROUP_CHALLENGE_GOAL_TYPES,
  GROUP_CHALLENGE_GOAL_LABELS,
} from "@shared/schema";
import { FindPeopleTab } from "@/pages/find-people";
import { formatDistanceToNow } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function timeAgo(date: string | Date) {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return "recently"; }
}

function activityIcon(type: string) {
  const map: Record<string, { icon: any; color: string }> = {
    completed_workout:     { icon: Zap,      color: "text-orange-400" },
    completed_challenge:   { icon: Trophy,   color: "text-yellow-400" },
    new_personal_record:   { icon: Star,     color: "text-yellow-300" },
    started_program:       { icon: Calendar, color: "text-blue-400" },
    completed_program_day: { icon: Check,    color: "text-green-400" },
    streak_milestone:      { icon: Flame,    color: "text-orange-500" },
    level_up:              { icon: Zap,      color: "text-purple-400" },
    badge_earned:          { icon: Star,     color: "text-amber-400" },
    finished_challenge:    { icon: Trophy,   color: "text-orange-400" },
  };
  return map[type] ?? { icon: Activity, color: "text-zinc-400" };
}

// ─── Friends Tab ─────────────────────────────────────────────────────────────
function FriendsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const myId = (user as any)?.claims?.sub ?? (user as any)?.id;
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [subTab, setSubTab] = useState<"activity" | "friends" | "requests">("activity");

  const { data: friends = [], isLoading: friendsLoading } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
  });
  const { data: requests = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user,
  });
  const { data: activityFeed = [], isLoading: feedLoading, refetch: refetchFeed } = useQuery<any[]>({
    queryKey: ["/api/friends/activity"],
    enabled: !!user,
  });

  const sendRequest = useMutation({
    mutationFn: (addresseeId: string) => apiRequest("POST", "/api/friends/request", { addresseeId }),
    onSuccess: () => {
      toast({ title: "Friend request sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: () => toast({ title: "Failed to send request", variant: "destructive" }),
  });

  const respondRequest = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      apiRequest("PATCH", `/api/friends/requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
    },
  });

  const removeFriend = useMutation({
    mutationFn: (friendId: string) => apiRequest("DELETE", `/api/friends/${friendId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/friends"] }),
  });

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setSearchResults((data || []).filter((u: any) => u.userId !== myId));
    } catch { /* ignore */ }
    setSearching(false);
  }

  const friendIds = new Set(friends.map((f: any) => f.friend.id));

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-zinc-900/60 rounded-lg p-1">
        {([
          { key: "activity", label: "Activity", count: activityFeed.length },
          { key: "friends",  label: "Friends",  count: friends.length },
          { key: "requests", label: "Requests", count: requests.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
              subTab === t.key
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            data-testid={`tab-friends-${t.key}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] px-1 rounded-full ${subTab === t.key ? "bg-orange-500/20 text-orange-400" : "bg-zinc-700 text-zinc-500"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Activity feed */}
      {subTab === "activity" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">What your friends are up to</p>
            <button onClick={() => refetchFeed()} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {feedLoading ? (
            [0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-zinc-900" />)
          ) : activityFeed.length === 0 ? (
            <div className="text-center py-10">
              <Activity className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No activity yet</p>
              <p className="text-zinc-600 text-xs mt-1">Add friends to see their basketball activity here</p>
            </div>
          ) : (
            activityFeed.map((item: any) => {
              const { icon: Icon, color } = activityIcon(item.activityType);
              return (
                <Card key={item.id} className="border-zinc-800/60 bg-zinc-900/40">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={getObjectUrl(item.user?.profilePhotoUrl) ?? item.user?.profilePhotoUrl ?? undefined} />
                      <AvatarFallback className="bg-zinc-800 text-xs">{initials(item.user?.displayName || "P")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{item.user?.displayName}</span>
                        <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                      </div>
                      <p className="text-sm text-zinc-300 mt-0.5">{item.title}</p>
                      {item.description && <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>}
                      <p className="text-[11px] text-zinc-600 mt-1">{timeAgo(item.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Friends list */}
      {subTab === "friends" && (
        <div className="space-y-3">
          {/* Search to add */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search players to add…"
              className="pl-9 bg-zinc-900/60 border-zinc-800"
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              data-testid="input-friend-search"
            />
          </div>
          {searchQ.length >= 2 && (
            <div className="space-y-2">
              {searching ? (
                <Skeleton className="h-12 bg-zinc-900 rounded-xl" />
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-3">No players found</p>
              ) : (
                searchResults.map((u: any) => (
                  <Card key={u.userId} className="border-zinc-800/60 bg-zinc-900/40">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={getObjectUrl(u.profilePhotoUrl) ?? u.profilePhotoUrl ?? undefined} />
                        <AvatarFallback className="bg-zinc-800 text-xs">{initials(u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim())}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim()}</p>
                        {u.skillLevel && <p className="text-[11px] text-zinc-500 capitalize">{u.skillLevel}</p>}
                      </div>
                      {friendIds.has(u.userId) ? (
                        <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Friends</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                          onClick={() => sendRequest.mutate(u.userId)}
                          disabled={sendRequest.isPending}
                          data-testid={`button-add-friend-${u.userId}`}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />Add
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Current friends */}
          {friendsLoading ? (
            [0,1,2].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />)
          ) : friends.length === 0 && searchQ.length < 2 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No friends yet</p>
              <p className="text-zinc-600 text-xs mt-1">Search for players above to send a friend request</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((item: any) => (
                <Card key={item.friendship.id} className="border-zinc-800/50 bg-zinc-900/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Link href={`/player/${item.friend.id}`}>
                      <Avatar className="w-9 h-9 cursor-pointer shrink-0">
                        <AvatarImage src={getObjectUrl(item.friend.profilePhotoUrl) ?? item.friend.profilePhotoUrl ?? undefined} />
                        <AvatarFallback className="bg-zinc-800 text-xs">{initials(item.friend.displayName)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/player/${item.friend.id}`}>
                        <p className="text-sm font-medium text-white hover:text-orange-400 transition-colors cursor-pointer truncate">{item.friend.displayName}</p>
                      </Link>
                      {item.friend.skillLevel && <p className="text-[11px] text-zinc-500 capitalize">{item.friend.skillLevel}</p>}
                    </div>
                    <button
                      onClick={() => removeFriend.mutate(item.friend.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                      title="Remove friend"
                      data-testid={`button-remove-friend-${item.friend.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests */}
      {subTab === "requests" && (
        <div className="space-y-3">
          {requestsLoading ? (
            [0,1].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />)
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No pending requests</p>
            </div>
          ) : (
            requests.map((item: any) => (
              <Card key={item.friendship.id} className="border-zinc-800/60 bg-zinc-900/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={getObjectUrl(item.requester?.profilePhotoUrl) ?? item.requester?.profilePhotoUrl ?? undefined} />
                    <AvatarFallback className="bg-zinc-800 text-xs">{initials(item.requester?.displayName || "P")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.requester?.displayName}</p>
                    <p className="text-xs text-zinc-500">wants to be your friend</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
                      onClick={() => respondRequest.mutate({ id: item.friendship.id, status: "accepted" })}
                      data-testid={`button-accept-friend-${item.friendship.id}`}
                    >
                      <Check className="w-3 h-3 mr-1" />Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-zinc-700"
                      onClick={() => respondRequest.mutate({ id: item.friendship.id, status: "declined" })}
                      data-testid={`button-decline-friend-${item.friendship.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Challenges Tab ─────────────────────────────────────────────────────
function GroupChallengesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goalType: "" as string,
    goalAmount: "",
    durationDays: "30",
    inviteSearch: "",
  });
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [inviteNames, setInviteNames] = useState<Record<string, string>>({});

  const { data: challenges = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/group-challenges"],
    enabled: !!user,
  });
  const { data: invites = [] } = useQuery<any[]>({
    queryKey: ["/api/group-challenges/invites"],
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/group-challenges", data),
    onSuccess: () => {
      toast({ title: "Challenge created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      setCreateOpen(false);
      setForm({ name: "", goalType: "", goalAmount: "", durationDays: "30", inviteSearch: "" });
      setInviteIds([]);
      setInviteNames({});
    },
    onError: () => toast({ title: "Failed to create challenge", variant: "destructive" }),
  });

  const respondInvite = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: "accepted" | "declined" }) =>
      apiRequest("PATCH", `/api/group-challenges/members/${memberId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/invites"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/group-challenges/${id}/sync`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] }),
  });

  async function searchInvites(q: string) {
    setForm(f => ({ ...f, inviteSearch: q }));
    if (q.length < 2) { setInviteResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setInviteResults(data || []);
  }

  function toggleInvite(u: any) {
    setInviteIds(ids => ids.includes(u.userId) ? ids.filter(id => id !== u.userId) : [...ids, u.userId]);
    setInviteNames(n => ({ ...n, [u.userId]: u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim() }));
  }

  function daysRemaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  return (
    <div className="space-y-4">
      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Invites</p>
          {invites.map((inv: any) => (
            <Card key={inv.id} className="border-orange-500/20 bg-orange-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Bell className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{inv.challenge?.name}</p>
                  <p className="text-xs text-zinc-500">
                    from {inv.challenge?.creator?.displayName} · {GROUP_CHALLENGE_GOAL_LABELS[inv.challenge?.goalType as keyof typeof GROUP_CHALLENGE_GOAL_LABELS] ?? inv.challenge?.goalType} · {inv.challenge?.goalAmount} goal
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600"
                    onClick={() => respondInvite.mutate({ memberId: inv.id, status: "accepted" })}
                    data-testid={`button-accept-challenge-${inv.id}`}>Join</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700"
                    onClick={() => respondInvite.mutate({ memberId: inv.id, status: "declined" })}
                    data-testid={`button-decline-challenge-${inv.id}`}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create button */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-create-group-challenge">
            <Plus className="w-4 h-4 mr-2" />Create Group Challenge
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>New Group Challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-zinc-400">Challenge Name</Label>
              <Input placeholder="e.g. Summer Shooting Challenge"
                className="mt-1 bg-zinc-900 border-zinc-800"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-challenge-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-400">Goal Type</Label>
                <Select value={form.goalType} onValueChange={v => setForm(f => ({ ...f, goalType: v }))}>
                  <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800" data-testid="select-goal-type">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {GROUP_CHALLENGE_GOAL_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{GROUP_CHALLENGE_GOAL_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Goal Amount</Label>
                <Input type="number" placeholder="500"
                  className="mt-1 bg-zinc-900 border-zinc-800"
                  value={form.goalAmount} onChange={e => setForm(f => ({ ...f, goalAmount: e.target.value }))}
                  data-testid="input-goal-amount" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Duration (days)</Label>
              <Input type="number" placeholder="30"
                className="mt-1 bg-zinc-900 border-zinc-800"
                value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                data-testid="input-duration-days" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Invite Players</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input placeholder="Search players…" className="pl-8 bg-zinc-900 border-zinc-800"
                  value={form.inviteSearch} onChange={e => searchInvites(e.target.value)} />
              </div>
              {inviteResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {inviteResults.map((u: any) => {
                    const name = u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim();
                    const selected = inviteIds.includes(u.userId);
                    return (
                      <button key={u.userId} onClick={() => toggleInvite(u)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${selected ? "bg-orange-500/10 border border-orange-500/30" : "bg-zinc-900/60 hover:bg-zinc-800/60"}`}
                        data-testid={`button-invite-${u.userId}`}>
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarImage src={getObjectUrl(u.profilePhotoUrl) ?? undefined} />
                          <AvatarFallback className="text-[9px] bg-zinc-800">{initials(name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white flex-1">{name}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-orange-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {inviteIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {inviteIds.map(id => (
                    <Badge key={id} variant="outline" className="text-xs border-orange-500/30 text-orange-400 gap-1">
                      {inviteNames[id]}
                      <button onClick={() => setInviteIds(ids => ids.filter(i => i !== id))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={!form.name || !form.goalType || !form.goalAmount || createMutation.isPending}
              onClick={() => createMutation.mutate({ ...form, inviteIds })}
              data-testid="button-submit-create-challenge"
            >
              {createMutation.isPending ? "Creating…" : "Create Challenge"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge list */}
      {isLoading ? (
        [0,1,2].map(i => <Skeleton key={i} className="h-40 rounded-xl bg-zinc-900" />)
      ) : challenges.length === 0 ? (
        <div className="text-center py-10">
          <Swords className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No active challenges</p>
          <p className="text-zinc-600 text-xs mt-1">Create a challenge and invite your friends</p>
        </div>
      ) : (
        challenges.map((c: any) => {
          const days = daysRemaining(c.endsAt);
          const sortedMembers = [...(c.members || [])].sort((a, b) => b.progress - a.progress);
          const goalLabel = GROUP_CHALLENGE_GOAL_LABELS[c.goalType as keyof typeof GROUP_CHALLENGE_GOAL_LABELS] ?? c.goalType;
          return (
            <Card key={c.id} className="border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-500/30" />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white text-base">{c.name}</h3>
                    <p className="text-xs text-zinc-500">{goalLabel} · Goal: {c.goalAmount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${days <= 3 ? "border-red-500/40 text-red-400" : "border-zinc-700 text-zinc-400"}`}>
                      <Clock className="w-2.5 h-2.5 mr-1" />{days}d left
                    </Badge>
                    <button onClick={() => syncMutation.mutate(c.id)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Sync progress" data-testid={`button-sync-challenge-${c.id}`}>
                      <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="space-y-2">
                  {sortedMembers.map((m: any, i: number) => {
                    const pct = c.goalAmount > 0 ? Math.min(100, Math.round((m.progress / c.goalAmount) * 100)) : 0;
                    return (
                      <div key={m.id} className="space-y-1" data-testid={`member-row-${m.userId}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-600 w-4 text-right">{i + 1}</span>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={getObjectUrl(m.user?.profilePhotoUrl) ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-zinc-800">{initials(m.user?.displayName || "P")}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-white flex-1 truncate">{m.user?.displayName}</span>
                          <span className="text-sm font-bold text-orange-400">{m.progress.toLocaleString()}</span>
                          <span className="text-[10px] text-zinc-600">/ {c.goalAmount.toLocaleString()}</span>
                        </div>
                        <div className="ml-10">
                          <Progress value={pct} className="h-1 bg-zinc-800" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ─── Main Community Page ──────────────────────────────────────────────────────
export default function CommunityPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [tab, setTab] = useState("friends");

  const { data: connections } = useQuery<any[]>({
    queryKey: ["/api/connections/pending"],
    enabled: !!user,
  });
  const { data: friendRequests } = useQuery<any[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user,
  });
  const { data: challengeInvites } = useQuery<any[]>({
    queryKey: ["/api/group-challenges/invites"],
    enabled: !!user,
  });

  const pendingCount = connections?.length ?? 0;
  const friendReqCount = friendRequests?.length ?? 0;
  const challengeInviteCount = challengeInvites?.length ?? 0;

  const tabs = [
    { key: "friends",           label: "Friends",        icon: Users,    badge: friendReqCount },
    { key: "group-challenges",  label: "Challenges",     icon: Swords,   badge: challengeInviteCount },
    { key: "find-players",      label: "Find Players",   icon: Search,   badge: 0 },
    { key: "my-trainer",        label: "My Trainer",     icon: UserPlus, badge: pendingCount, path: "/my-trainer" },
    { key: "teams",             label: "Teams",          icon: Shield,   badge: 0,            path: "/teams" },
  ];

  function handleTabClick(t: typeof tabs[0]) {
    if (t.path) {
      navigate(t.path);
    } else {
      setTab(t.key);
    }
  }

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold" data-testid="text-community-title">Community</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Connect, compete, and grow together</p>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-zinc-800/60 px-4 pt-1 pb-0">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide -mx-1">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabClick(t)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  active
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
                data-testid={`tab-community-${t.key}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.badge > 0 && (
                  <span className="ml-0.5 text-[10px] bg-red-500 text-white rounded-full px-1 min-w-[16px] text-center">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {tab === "friends" && <FriendsTab />}
        {tab === "group-challenges" && <GroupChallengesTab />}
        {tab === "find-players" && <FindPeopleTab />}
      </div>
    </div>
  );
}
