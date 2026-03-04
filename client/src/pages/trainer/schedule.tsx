import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Calendar,
  Clock,
  Check,
  X,
  MapPin,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

interface EnrichedSession {
  id: string;
  trainerId: string;
  playerId: string;
  trainerProfileId: string;
  locationId: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  playerNotes: string | null;
  trainerNotes: string | null;
  declineReason: string | null;
  sessionType: string | null;
  createdAt: string;
  updatedAt: string;
  playerName: string;
  locationName: string | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "requested", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "declined", label: "Declined" },
];

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "requested": return "default";
    case "confirmed": return "secondary";
    case "completed": return "outline";
    case "cancelled": return "destructive";
    case "declined": return "destructive";
    default: return "outline";
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function TrainerSchedulePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("requests");
  const [statusFilter, setStatusFilter] = useState("all");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineSessionId, setDeclineSessionId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data: sessions, isLoading } = useQuery<EnrichedSession[]>({
    queryKey: ["/api/training-sessions/trainer/enriched"],
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      toast({ title: "Session confirmed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to confirm", description: error.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiRequest("PUT", `/api/training-sessions/${id}/decline`, { declineReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      setDeclineDialogOpen(false);
      setDeclineSessionId(null);
      setDeclineReason("");
      toast({ title: "Session declined" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to decline", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      toast({ title: "Session marked as completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      toast({ title: "Session cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (statusFilter === "all") return sessions;
    return sessions.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter]);

  const pendingRequests = useMemo(() => {
    return filteredSessions.filter((s) => s.status === "requested");
  }, [filteredSessions]);

  const otherSessions = useMemo(() => {
    return filteredSessions.filter((s) => s.status !== "requested");
  }, [filteredSessions]);

  const confirmedSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => s.status === "confirmed")
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));
  }, [sessions]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, EnrichedSession[]> = {};
    for (const s of confirmedSessions) {
      if (!groups[s.sessionDate]) groups[s.sessionDate] = [];
      groups[s.sessionDate].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [confirmedSessions]);

  function handleDeclineClick(sessionId: string) {
    setDeclineSessionId(sessionId);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  }

  function handleDeclineSubmit() {
    if (!declineSessionId) return;
    declineMutation.mutate({ id: declineSessionId, reason: declineReason || undefined });
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto" data-testid="page-trainer-schedule">
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarDays className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-schedule-title">Schedule</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList data-testid="tabs-schedule">
            <TabsTrigger value="requests" data-testid="tab-requests">Requests</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
          </TabsList>

          {activeTab === "requests" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-status-filter">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-status-${opt.value}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="requests" className="mt-4 space-y-4">
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Pending Requests ({pendingRequests.length})
              </h2>
              {pendingRequests.map((session) => (
                <Card key={session.id} data-testid={`card-request-${session.id}`}>
                  <CardContent className="py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium" data-testid={`text-player-name-${session.id}`}>
                              {session.playerName}
                            </span>
                            {session.sessionType && (
                              <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`badge-type-${session.id}`}>
                                {session.sessionType}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span data-testid={`text-date-${session.id}`}>{formatDate(session.sessionDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span data-testid={`text-time-${session.id}`}>
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                            </span>
                          </div>
                          {session.locationName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span data-testid={`text-location-${session.id}`}>{session.locationName}</span>
                            </div>
                          )}
                          {session.playerNotes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span data-testid={`text-notes-${session.id}`}>{session.playerNotes}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant={statusBadgeVariant(session.status)} className="no-default-hover-elevate shrink-0">
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => confirmMutation.mutate(session.id)}
                          disabled={confirmMutation.isPending}
                          data-testid={`button-confirm-${session.id}`}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineClick(session.id)}
                          disabled={declineMutation.isPending}
                          data-testid={`button-decline-${session.id}`}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {otherSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {statusFilter === "all" ? "Recent Sessions" : `${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || ""} Sessions`}
                {" "}({otherSessions.length})
              </h2>
              {otherSessions.map((session) => (
                <Card key={session.id} data-testid={`card-session-${session.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" data-testid={`text-session-player-${session.id}`}>
                            {session.playerName}
                          </span>
                          {session.sessionType && (
                            <Badge variant="outline" className="no-default-hover-elevate text-xs">
                              {session.sessionType}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{formatDate(session.sessionDate)}</span>
                          <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                          {session.locationName && <span>{session.locationName}</span>}
                        </div>
                        {session.declineReason && (
                          <p className="text-xs text-muted-foreground italic mt-1">Reason: {session.declineReason}</p>
                        )}
                      </div>
                      <Badge variant={statusBadgeVariant(session.status)} className="no-default-hover-elevate shrink-0">
                        {session.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No sessions found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          {groupedByDate.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No upcoming confirmed sessions</p>
            </div>
          ) : (
            groupedByDate.map(([date, dateSessions]) => (
              <div key={date} className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2" data-testid={`text-schedule-date-${date}`}>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {formatDate(date)}
                </h3>
                {dateSessions.map((session) => (
                  <Card key={session.id} data-testid={`card-schedule-${session.id}`}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium" data-testid={`text-schedule-player-${session.id}`}>
                              {session.playerName}
                            </span>
                            {session.sessionType && (
                              <Badge variant="outline" className="no-default-hover-elevate text-xs">
                                {session.sessionType}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                            </span>
                            {session.locationName && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {session.locationName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeMutation.mutate(session.id)}
                            disabled={completeMutation.isPending}
                            data-testid={`button-complete-${session.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelMutation.mutate(session.id)}
                            disabled={cancelMutation.isPending}
                            data-testid={`button-cancel-${session.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent data-testid="dialog-decline">
          <DialogHeader>
            <DialogTitle>Decline Session</DialogTitle>
            <DialogDescription>Optionally provide a reason for declining this session request.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            data-testid="input-decline-reason"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeclineDialogOpen(false)}
              data-testid="button-decline-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineSubmit}
              disabled={declineMutation.isPending}
              data-testid="button-decline-submit"
            >
              Decline Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
