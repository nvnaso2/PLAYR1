import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  UserCheck,
  Clock,
  UserPlus,
  Mail,
  Send,
  Users,
} from "lucide-react";

interface UserSearchResult {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profilePhotoUrl: string | null;
  city: string | null;
  state: string | null;
  positions: string[] | null;
  staffRole: string | null;
}

interface Connection {
  id: string;
  playerId: string;
  trainerId: string;
  status: string;
  initiatedBy: string;
  otherUser?: {
    id: string;
  } | null;
  otherUserId?: string;
}

export default function FindPeople() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: searching } = useQuery<UserSearchResult[]>({
    queryKey: ["/api/users/search", { q: debouncedQuery }],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const { data: connections } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const connectMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      apiRequest("POST", "/api/connections/request", { targetUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connections/pending"] });
      toast({ title: "Connection request sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send request", description: error.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; message?: string }) =>
      apiRequest("POST", "/api/invite", data),
    onSuccess: () => {
      toast({ title: "Invite sent", description: "An invitation email has been sent." });
      setInviteEmail("");
      setInviteMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
    },
  });

  const getConnectionStatus = useCallback((userId: string): string | null => {
    if (!connections) return null;
    const conn = connections.find(
      (c: any) => c.playerId === userId || c.trainerId === userId || c.otherUser?.id === userId
    );
    return conn?.status || null;
  }, [connections]);

  const showNoResults = !searching && debouncedQuery.length >= 2 && (!searchResults || searchResults.length === 0);

  const getRoleBadge = (result: UserSearchResult) => {
    if (result.staffRole) {
      const label = result.staffRole === "head_coach" ? "Head Coach"
        : result.staffRole === "assistant_coach" ? "Asst. Coach"
        : result.staffRole === "trainer" ? "Trainer"
        : result.staffRole === "skills_coach" ? "Skills Coach"
        : "Trainer";
      return <Badge variant="default" className="no-default-hover-elevate text-xs">{label}</Badge>;
    }
    return <Badge variant="secondary" className="no-default-hover-elevate text-xs">Player</Badge>;
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6" data-testid="page-find-people">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Find People</h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-description">
          Search for players and trainers to connect with.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          className="pl-9"
          autoFocus
          data-testid="input-search-people"
        />
      </div>

      {debouncedQuery.length < 2 && (
        <div className="py-12 text-center text-muted-foreground" data-testid="text-search-prompt">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}

      {searching && (
        <div className="space-y-3" data-testid="loading-search-results">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!searching && searchResults && searchResults.length > 0 && (
        <div className="space-y-2" data-testid="list-search-results">
          {searchResults.map((user) => {
            const name = user.displayName ||
              [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
            const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || "");
            const status = getConnectionStatus(user.userId);
            const location = [user.city, user.state].filter(Boolean).join(", ");

            return (
              <Card key={user.userId} data-testid={`card-user-${user.userId}`}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.profilePhotoUrl || undefined} />
                    <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" data-testid={`text-user-name-${user.userId}`}>{name}</p>
                      {getRoleBadge(user)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {location && <span data-testid={`text-user-location-${user.userId}`}>{location}</span>}
                      {user.positions?.length ? (
                        <span data-testid={`text-user-positions-${user.userId}`}>{user.positions.join(", ")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {status === "accepted" ? (
                      <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-connected-${user.userId}`}>
                        <UserCheck className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : status === "pending" ? (
                      <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-pending-${user.userId}`}>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectMutation.mutate(user.userId)}
                        disabled={connectMutation.isPending}
                        data-testid={`button-connect-${user.userId}`}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showNoResults && (
        <div className="space-y-6" data-testid="section-no-results">
          <div className="py-8 text-center text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium" data-testid="text-no-results">No results found for "{debouncedQuery}"</p>
            <p className="text-xs mt-1">Can't find who you're looking for? Send them an invite!</p>
          </div>

          <Card data-testid="card-invite-section">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium" data-testid="text-invite-heading">Invite via Email</p>
              </div>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter their email address"
                data-testid="input-invite-email"
              />
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message (optional)"
                className="resize-none text-sm"
                rows={3}
                data-testid="input-invite-message"
              />
              <Button
                onClick={() => {
                  if (!inviteEmail.trim()) {
                    toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
                    return;
                  }
                  inviteMutation.mutate({
                    email: inviteEmail.trim(),
                    message: inviteMessage.trim() || undefined,
                  });
                }}
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
                data-testid="button-send-invite"
              >
                <Send className="w-4 h-4 mr-2" />
                {inviteMutation.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
