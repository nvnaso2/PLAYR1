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
import { UserPlus, Users, Search, MapPin } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?";
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
            data-testid={`button-add-player-${user.userId}`}>
            <UserPlus className="w-3 h-3 mr-1" />Add
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommunityFindPlayersPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const myId = (user as any)?.claims?.sub ?? (user as any)?.id;
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: recommended = [], isLoading: recLoading } = useQuery<any[]>({
    queryKey: ["/api/users/recommended"],
    enabled: !!user,
  });
  const { data: friends = [] } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
  });

  const sendRequest = useMutation({
    mutationFn: (addresseeId: string) => apiRequest("POST", "/api/friends/request", { addresseeId }),
    onSuccess: () => {
      toast({ title: "Friend request sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      setAddingId(null);
    },
    onError: () => { toast({ title: "Failed", variant: "destructive" }); setAddingId(null); },
  });

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=15`);
      setSearchResults((await res.json() || []).filter((u: any) => u.userId !== myId));
    } catch { /* ignore */ }
    setSearching(false);
  }

  function handleAdd(id: string) { setAddingId(id); sendRequest.mutate(id); }

  const friendIds = new Set(friends.map((f: any) => f.friend.id));
  const showSearch = searchQ.length >= 2;

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/community")} className="text-zinc-400 hover:text-white transition-colors" data-testid="button-back-community">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Find Players</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Discover players matched to your profile</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input placeholder="Search players by name…" className="pl-9 bg-zinc-900/60 border-zinc-800"
            value={searchQ} onChange={e => handleSearch(e.target.value)} data-testid="input-find-players-search" />
        </div>

        {showSearch ? (
          <div className="space-y-2">
            {searching ? [0,1,2].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />) :
              searchResults.length === 0 ? <p className="text-xs text-zinc-500 text-center py-4">No players found</p> :
              searchResults.map(u => (
                <PlayerCard key={u.userId} user={u} onAdd={handleAdd} adding={addingId === u.userId} alreadyFriend={friendIds.has(u.userId)} />
              ))
            }
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Players Like You</p>
              <p className="text-xs text-zinc-600 mt-0.5">Matched by skill level, position & location</p>
            </div>
            {recLoading ? (
              [0,1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-zinc-900" />)
            ) : recommended.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No recommendations yet</p>
                <p className="text-zinc-600 text-xs mt-1">Complete your profile to get matched with similar players</p>
              </div>
            ) : (
              recommended.map(u => (
                <PlayerCard key={u.userId} user={u} onAdd={handleAdd} adding={addingId === u.userId} alreadyFriend={friendIds.has(u.userId)} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
