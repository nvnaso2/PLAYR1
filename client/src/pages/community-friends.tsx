import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, Users, Activity, Search, Check, X,
  Bell, Zap, Star, Flame, Calendar, RefreshCw, MapPin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
    completed_challenge:   { icon: Check,    color: "text-green-400" },
    new_personal_record:   { icon: Star,     color: "text-yellow-300" },
    started_program:       { icon: Calendar, color: "text-blue-400" },
    completed_program_day: { icon: Check,    color: "text-green-400" },
    streak_milestone:      { icon: Flame,    color: "text-orange-500" },
    level_up:              { icon: Zap,      color: "text-purple-400" },
    badge_earned:          { icon: Star,     color: "text-amber-400" },
    finished_challenge:    { icon: Check,    color: "text-orange-400" },
  };
  return map[type] ?? { icon: Activity, color: "text-zinc-400" };
}

function PlayerCard({ user, onAdd, adding, alreadyFriend }: {
  user: any; onAdd: (id: string) => void; adding: boolean; alreadyFriend: boolean;
}) {
  const name = user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Player";
  return (
    <Card className="border-zinc-800/50 bg-zinc-900/30">
      <CardContent className="p-3 flex items-center gap-3">
        <Link href={`/player/${user.userId}`}>
          <Avatar className="w-9 h-9 cursor-pointer shrink-0">
            <AvatarImage src={getObjectUrl(user.profilePhotoUrl) ?? user.profilePhotoUrl ?? undefined} />
            <AvatarFallback className="bg-zinc-800 text-xs">{initials(name)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/player/${user.userId}`}>
            <p className="text-sm font-medium text-white hover:text-orange-400 transition-colors cursor-pointer truncate">{name}</p>
          </Link>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {user.skillLevel && <span className="text-[10px] text-zinc-500 capitalize">{user.skillLevel}</span>}
            {(user.city || user.state) && (
              <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />{[user.city, user.state].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
        {alreadyFriend ? (
          <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400 shrink-0">Friends</Badge>
        ) : (
          <Button size="sm" variant="outline"
            className="text-xs h-7 border-orange-500/40 text-orange-400 hover:bg-orange-500/10 shrink-0"
            onClick={() => onAdd(user.userId)} disabled={adding}
            data-testid={`button-add-friend-${user.userId}`}>
            <UserPlus className="w-3 h-3 mr-1" />Add
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunityFriendsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const myId = (user as any)?.claims?.sub ?? (user as any)?.id;
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [subTab, setSubTab] = useState<"activity" | "friends" | "requests">("activity");
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: friends = [], isLoading: friendsLoading } = useQuery<any[]>({ queryKey: ["/api/friends"], enabled: !!user });
  const { data: requests = [], isLoading: requestsLoading } = useQuery<any[]>({ queryKey: ["/api/friends/requests"], enabled: !!user });
  const { data: activityFeed = [], isLoading: feedLoading, refetch: refetchFeed } = useQuery<any[]>({ queryKey: ["/api/friends/activity"], enabled: !!user });
  const { data: recommended = [], isLoading: recLoading } = useQuery<any[]>({ queryKey: ["/api/users/recommended"], enabled: !!user && friends.length === 0 });

  const sendRequest = useMutation({
    mutationFn: (addresseeId: string) => apiRequest("POST", "/api/friends/request", { addresseeId }),
    onSuccess: () => {
      toast({ title: "Friend request sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      setAddingId(null);
    },
    onError: () => { toast({ title: "Failed to send request", variant: "destructive" }); setAddingId(null); },
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
      setSearchResults((await res.json() || []).filter((u: any) => u.userId !== myId));
    } catch { /* ignore */ }
    setSearching(false);
  }

  function handleAdd(id: string) { setAddingId(id); sendRequest.mutate(id); }

  const friendIds = new Set(friends.map((f: any) => f.friend.id));

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/community")} className="text-zinc-400 hover:text-white transition-colors" data-testid="button-back-community">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Friends</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Activity, connections & requests</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-zinc-900/60 rounded-lg p-1">
          {([
            { key: "activity", label: "Activity",  count: activityFeed.length },
            { key: "friends",  label: "Friends",   count: friends.length },
            { key: "requests", label: "Requests",  count: requests.length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                subTab === t.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
              data-testid={`tab-friends-${t.key}`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${subTab === t.key ? "bg-orange-500/20 text-orange-400" : "bg-zinc-700 text-zinc-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Activity */}
        {subTab === "activity" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">What your friends are working on</p>
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
                <p className="text-zinc-600 text-xs mt-1">Add friends to see their basketball progress here</p>
              </div>
            ) : (
              activityFeed.map((item: any) => {
                const { icon: Icon, color } = activityIcon(item.activityType);
                return (
                  <Card key={item.id} className="border-zinc-800/60 bg-zinc-900/40">
                    <CardContent className="p-4 flex items-start gap-3">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={getObjectUrl(item.user?.profilePhotoUrl) ?? undefined} />
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Search players to add…" className="pl-9 bg-zinc-900/60 border-zinc-800"
                value={searchQ} onChange={e => handleSearch(e.target.value)} data-testid="input-friend-search" />
            </div>
            {searchQ.length >= 2 ? (
              <div className="space-y-2">
                {searching ? <Skeleton className="h-12 bg-zinc-900 rounded-xl" /> :
                  searchResults.length === 0 ? <p className="text-xs text-zinc-500 text-center py-3">No players found</p> :
                  searchResults.map(u => (
                    <PlayerCard key={u.userId} user={u} onAdd={handleAdd} adding={addingId === u.userId} alreadyFriend={friendIds.has(u.userId)} />
                  ))
                }
              </div>
            ) : friendsLoading ? (
              [0,1,2].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />)
            ) : friends.length > 0 ? (
              <div className="space-y-2">
                {friends.map((item: any) => (
                  <Card key={item.friendship.id} className="border-zinc-800/50 bg-zinc-900/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Link href={`/player/${item.friend.id}`}>
                        <Avatar className="w-9 h-9 cursor-pointer shrink-0">
                          <AvatarImage src={getObjectUrl(item.friend.profilePhotoUrl) ?? undefined} />
                          <AvatarFallback className="bg-zinc-800 text-xs">{initials(item.friend.displayName)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/player/${item.friend.id}`}>
                          <p className="text-sm font-medium text-white hover:text-orange-400 transition-colors cursor-pointer truncate">{item.friend.displayName}</p>
                        </Link>
                        {item.friend.skillLevel && <p className="text-[11px] text-zinc-500 capitalize">{item.friend.skillLevel}</p>}
                      </div>
                      <button onClick={() => removeFriend.mutate(item.friend.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                        data-testid={`button-remove-friend-${item.friend.id}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center pt-2 pb-1">
                  <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm font-medium">No friends yet</p>
                  <p className="text-zinc-600 text-xs mt-1">Players with similar profiles</p>
                </div>
                {recLoading ? [0,1,2].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />) :
                  recommended.length === 0 ? <p className="text-xs text-zinc-600 text-center pb-4">Search above to find players</p> :
                  recommended.slice(0, 8).map(u => (
                    <PlayerCard key={u.userId} user={u} onAdd={handleAdd} adding={addingId === u.userId} alreadyFriend={false} />
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* Requests */}
        {subTab === "requests" && (
          <div className="space-y-3">
            {requestsLoading ? [0,1].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />) :
              requests.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No pending requests</p>
                </div>
              ) : requests.map((item: any) => (
                <Card key={item.friendship.id} className="border-zinc-800/60 bg-zinc-900/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={getObjectUrl(item.requester?.profilePhotoUrl) ?? undefined} />
                      <AvatarFallback className="bg-zinc-800 text-xs">{initials(item.requester?.displayName || "P")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{item.requester?.displayName}</p>
                      <p className="text-xs text-zinc-500">wants to be your friend</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
                        onClick={() => respondRequest.mutate({ id: item.friendship.id, status: "accepted" })}
                        data-testid={`button-accept-friend-${item.friendship.id}`}>
                        <Check className="w-3 h-3 mr-1" />Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700"
                        onClick={() => respondRequest.mutate({ id: item.friendship.id, status: "declined" })}
                        data-testid={`button-decline-friend-${item.friendship.id}`}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
