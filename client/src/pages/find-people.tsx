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
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest, nativeFetch } from "@/lib/queryClient";
import {
  Search,
  UserCheck,
  Clock,
  UserPlus,
  Mail,
  Send,
  Users,
  CheckCircle,
  XCircle,
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
  requesterUserId?: string | null;
  otherUser?: {
    id: string;
  } | null;
  otherUserId?: string;
}

export function FindPeopleTab() {
  const { toast } = useToast();
  const { user } = useAuth();
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
      const res = await nativeFetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
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

  const getConnectionForUser = useCallback((userId: string): Connection | null => {
    if (!connections) return null;
    return connections.find(
      (c: any) => c.playerId === userId || c.trainerId === userId || c.otherUser?.id === userId
    ) || null;
  }, [connections]);

  const getConnectionStatus = useCallback((userId: string): string | null => {
    return getConnectionForUser(userId)?.status || null;
  }, [getConnectionForUser]);

  const isIncomingPending = useCallback((userId: string): boolean => {
    const conn = getConnectionForUser(userId);
    if (!conn || conn.status !== "pending") return false;
    if (conn.requesterUserId) return conn.requesterUserId !== user?.id;
    if (conn.initiatedBy === "player" && conn.trainerId === user?.id) return true;
    if (conn.initiatedBy === "trainer" && conn.playerId === user?.id) return true;
    return false;
  }, [getConnectionForUser, user?.id]);

  const acceptMutation = useMutation({
    mutationFn: (connId: string) =>
      apiRequest("PUT", `/api/connections/${connId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connections/pending"] });
      toast({ title: "Connection accepted!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (connId: string) =>
      apiRequest("PUT", `/api/connections/${connId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connections/pending"] });
      toast({ title: "Connection declined" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to decline", description: error.message, variant: "destructive" });
    },
  });

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
    <div className="space-y-4 max-w-2xl mx-auto" data-testid="page-find-people">
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
          {searchResults.map((result) => {
            const name = result.displayName ||
              [result.firstName, result.lastName].filter(Boolean).join(" ") || "Unknown";
            const initials = (result.firstName?.[0] || "") + (result.lastName?.[0] || "");
            const status = getConnectionStatus(result.userId);
            const location = [result.city, result.state].filter(Boolean).join(", ");
            const conn = getConnectionForUser(result.userId);
            const incoming = isIncomingPending(result.userId);

            return (
              <Card key={result.userId} data-testid={`card-user-${result.userId}`}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={result.profilePhotoUrl || undefined} />
                    <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" data-testid={`text-user-name-${result.userId}`}>{name}</p>
                      {getRoleBadge(result)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {location && <span data-testid={`text-user-location-${result.userId}`}>{location}</span>}
                      {result.positions?.length ? (
                        <span data-testid={`text-user-positions-${result.userId}`}>{result.positions.join(", ")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {status === "accepted" ? (
                      <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-connected-${result.userId}`}>
                        <UserCheck className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : status === "pending" && incoming && conn ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => acceptMutation.mutate(conn.id)}
                          disabled={acceptMutation.isPending}
                          data-testid={`button-accept-${result.userId}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => declineMutation.mutate(conn.id)}
                          disabled={declineMutation.isPending}
                          data-testid={`button-decline-${result.userId}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    ) : status === "pending" ? (
                      <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-pending-${result.userId}`}>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectMutation.mutate(result.userId)}
                        disabled={connectMutation.isPending}
                        data-testid={`button-connect-${result.userId}`}
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

export default function FindPeople() {
  return (
    <div className="p-4 md:p-6">
      <FindPeopleTab />
    </div>
  );
}
