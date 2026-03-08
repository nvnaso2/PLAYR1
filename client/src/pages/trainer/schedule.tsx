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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  Clock,
  Check,
  X,
  MapPin,
  User,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Trash2,
  Hourglass,
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
  groupSessionId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  playerName: string;
  locationName: string | null;
  groupPlayerCount: number;
  groupPlayerNames: string[];
}

interface TrainerPlayer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  linkedUserId: string | null;
  email: string | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "requested", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "declined", label: "Declined" },
];

type SortField = "date" | "time" | "location" | "day";
type SortDir = "asc" | "desc";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function getDayOfWeek(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return DAY_NAMES[d.getDay()];
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function TrainerSchedulePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const gcal = useGoogleCalendar();
  const [activeTab, setActiveTab] = useState("requests");
  const [statusFilter, setStatusFilter] = useState("all");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineSessionId, setDeclineSessionId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<EnrichedSession | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleLocation, setRescheduleLocation] = useState("");
  const [rescheduleType, setRescheduleType] = useState("");

  const [scheduleView, setScheduleView] = useState<"calendar" | "list">("calendar");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createType, setCreateType] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery<EnrichedSession[]>({
    queryKey: ["/api/training-sessions/trainer/enriched"],
  });

  const { data: trainerPlayers } = useQuery<TrainerPlayer[]>({
    queryKey: ["/api/trainer-players"],
  });

  const invalidateSessions = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
    queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/player/enriched"] });
  };

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/confirm`),
    onSuccess: () => {
      invalidateSessions();
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
      invalidateSessions();
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
      invalidateSessions();
      toast({ title: "Session marked as completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/cancel`),
    onSuccess: () => {
      invalidateSessions();
      toast({ title: "Session cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/training-sessions/${id}`),
    onSuccess: () => {
      invalidateSessions();
      toast({ title: "Session deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const { data: rawLinkedLocations } = useQuery<{ id: string; locationId: string; availability: string | null }[]>({
    queryKey: ["/api/trainer-profile/locations"],
  });
  const { data: allLocations } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/training-locations"],
  });
  const locations = rawLinkedLocations && allLocations
    ? rawLinkedLocations.map(ll => allLocations.find(al => al.id === ll.locationId)).filter(Boolean) as { id: string; name: string }[]
    : allLocations;

  const createSessionMutation = useMutation({
    mutationFn: (data: { playerIds: string[]; sessionDate: string; startTime: string; endTime: string; locationId?: string; sessionType?: string; trainerNotes?: string }) =>
      apiRequest("POST", "/api/training-sessions/group", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      setCreateDialogOpen(false);
      setCreateDate(undefined);
      setCreateStart("");
      setCreateEnd("");
      setCreateLocation("");
      setCreateType("");
      setCreateNotes("");
      setSelectedPlayerIds([]);
      setPlayerSearch("");
      toast({ title: "Session created and sent to players" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create session", description: error.message, variant: "destructive" });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; sessionDate: string; startTime: string; endTime: string; locationId: string; sessionType: string }) =>
      apiRequest("PUT", `/api/training-sessions/${id}/reschedule`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      setRescheduleDialogOpen(false);
      setRescheduleSession(null);
      toast({ title: "Session rescheduled. Awaiting player confirmation." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reschedule", description: error.message, variant: "destructive" });
    },
  });

  const timeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m <= 45; m += 15) {
        const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${displayHour}:${m.toString().padStart(2, "0")} ${ampm}`;
        opts.push({ value, label });
      }
    }
    return opts;
  }, []);

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

  const scheduleSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => s.status === "confirmed" || s.status === "completed");
  }, [sessions]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, EnrichedSession[]> = {};
    for (const s of scheduleSessions) {
      if (!map[s.sessionDate]) map[s.sessionDate] = [];
      map[s.sessionDate].push(s);
    }
    return map;
  }, [scheduleSessions]);

  const sortedListSessions = useMemo(() => {
    const sorted = [...scheduleSessions];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.sessionDate.localeCompare(b.sessionDate);
          break;
        case "time":
          cmp = a.startTime.localeCompare(b.startTime);
          break;
        case "location":
          cmp = (a.locationName || "").localeCompare(b.locationName || "");
          break;
        case "day":
          cmp = new Date(a.sessionDate + "T00:00:00").getDay() - new Date(b.sessionDate + "T00:00:00").getDay();
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [scheduleSessions, sortField, sortDir]);

  const calDays = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);
  const calMonthLabel = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedDateSessions = useMemo(() => {
    if (!selectedCalDate) return [];
    return sessionsByDate[selectedCalDate] || [];
  }, [selectedCalDate, sessionsByDate]);

  function handleDeclineClick(sessionId: string) {
    setDeclineSessionId(sessionId);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  }

  function handleDeclineSubmit() {
    if (!declineSessionId) return;
    declineMutation.mutate({ id: declineSessionId, reason: declineReason || undefined });
  }

  function handleRescheduleClick(session: EnrichedSession) {
    setRescheduleSession(session);
    setRescheduleDate(session.sessionDate);
    setRescheduleStart(session.startTime);
    setRescheduleEnd(session.endTime);
    setRescheduleLocation(session.locationId || "");
    setRescheduleType(session.sessionType || "1-on-1");
    setRescheduleDialogOpen(true);
  }

  function handleRescheduleSave() {
    if (!rescheduleSession) return;
    rescheduleMutation.mutate({
      id: rescheduleSession.id,
      sessionDate: rescheduleDate,
      startTime: rescheduleStart,
      endTime: rescheduleEnd,
      locationId: rescheduleLocation,
      sessionType: rescheduleType,
    });
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedCalDate(null);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedCalDate(null);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
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
    <div className="p-4 space-y-4 max-w-4xl mx-auto" data-testid="page-trainer-schedule">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-schedule-title">Schedule</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          data-testid="button-create-session"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Session
        </Button>
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

          {activeTab === "schedule" && (
            <div className="flex items-center gap-1 ml-auto">
              <Button
                size="sm"
                variant={scheduleView === "calendar" ? "default" : "outline"}
                onClick={() => setScheduleView("calendar")}
                data-testid="button-calendar-view"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Calendar
              </Button>
              <Button
                size="sm"
                variant={scheduleView === "list" ? "default" : "outline"}
                onClick={() => setScheduleView("list")}
                data-testid="button-list-view"
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
            </div>
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
                        {session.createdBy === user?.id ? (
                          <>
                            <Badge variant="secondary" className="no-default-hover-elevate">
                              <Hourglass className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRescheduleClick(session)}
                              data-testid={`button-reschedule-${session.id}`}
                            >
                              <CalendarDays className="w-3.5 h-3.5 mr-1" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(session.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${session.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          </>
                        ) : (
                          <>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRescheduleClick(session)}
                              data-testid={`button-reschedule-${session.id}`}
                            >
                              <CalendarDays className="w-3.5 h-3.5 mr-1" />
                              Reschedule
                            </Button>
                          </>
                        )}
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
                      <div className="flex items-center gap-2 shrink-0">
                        {session.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => gcal.isConnected ? gcal.addSession(session.id) : gcal.connect()}
                            disabled={gcal.isAddingSession}
                            data-testid={`button-recent-gcal-${session.id}`}
                          >
                            <CalendarPlus className="w-3 h-3 mr-1" />
                            {gcal.isConnected ? "Add to Calendar" : "Connect Calendar"}
                          </Button>
                        )}
                        <Badge variant={statusBadgeVariant(session.status)} className="no-default-hover-elevate shrink-0">
                          {session.status}
                        </Badge>
                      </div>
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
          {scheduleView === "calendar" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={prevMonth} data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-sm font-semibold" data-testid="text-calendar-month">{calMonthLabel}</h2>
                <Button variant="outline" size="sm" onClick={nextMonth} data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden" data-testid="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {calDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-background min-h-[60px]" />;
                  }
                  const dateStr = `${calYear}-${(calMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                  const daySessions = sessionsByDate[dateStr] || [];
                  const isToday = dateStr === now.toISOString().split("T")[0];
                  const isSelected = dateStr === selectedCalDate;
                  const hasConfirmed = daySessions.some(s => s.status === "confirmed");

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedCalDate(isSelected ? null : dateStr)}
                      className={`bg-background min-h-[60px] p-1 text-left transition-colors hover:bg-muted/50 relative ${
                        isSelected ? "ring-2 ring-primary ring-inset" : ""
                      }`}
                      data-testid={`cal-day-${dateStr}`}
                    >
                      <span className={`text-xs font-medium block ${
                        isToday ? "text-primary font-bold" : ""
                      }`}>
                        {day}
                      </span>
                      {daySessions.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {daySessions.slice(0, 2).map(s => (
                            <div
                              key={s.id}
                              className={`text-[9px] leading-tight truncate rounded px-0.5 ${
                                s.status === "confirmed"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {formatTime(s.startTime)}
                            </div>
                          ))}
                          {daySessions.length > 2 && (
                            <div className="text-[9px] text-muted-foreground">+{daySessions.length - 2} more</div>
                          )}
                        </div>
                      )}
                      {hasConfirmed && (
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedCalDate && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {formatDate(selectedCalDate)}
                    <Badge variant="outline" className="no-default-hover-elevate text-xs">
                      {selectedDateSessions.length} session{selectedDateSessions.length !== 1 ? "s" : ""}
                    </Badge>
                  </h3>
                  {selectedDateSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No sessions on this date</p>
                  ) : (
                    selectedDateSessions
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onComplete={() => completeMutation.mutate(session.id)}
                          onCancel={() => cancelMutation.mutate(session.id)}
                          onReschedule={() => handleRescheduleClick(session)}
                          completePending={completeMutation.isPending}
                          cancelPending={cancelMutation.isPending}
                          gcal={gcal}
                        />
                      ))
                  )}
                </div>
              )}

              {!selectedCalDate && scheduleSessions.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No scheduled sessions yet</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap border-b pb-2">
                <span className="text-xs text-muted-foreground mr-1">Sort by:</span>
                {(["date", "day", "time", "location"] as SortField[]).map(field => (
                  <Button
                    key={field}
                    size="sm"
                    variant={sortField === field ? "default" : "outline"}
                    onClick={() => toggleSort(field)}
                    className="h-7 text-xs gap-1"
                    data-testid={`button-sort-${field}`}
                  >
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                    {sortField === field && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </Button>
                ))}
              </div>

              {sortedListSessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <List className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No scheduled sessions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedListSessions.map(session => (
                    <Card key={session.id} data-testid={`card-list-${session.id}`}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-4 flex-wrap min-w-0">
                            <div className="text-center shrink-0 w-14">
                              <div className="text-xs text-muted-foreground">{getDayOfWeek(session.sessionDate).slice(0, 3)}</div>
                              <div className="text-sm font-semibold">{formatDateShort(session.sessionDate)}</div>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{session.playerName}</span>
                                {session.sessionType && (
                                  <Badge variant="outline" className="no-default-hover-elevate text-xs">
                                    {session.sessionType}
                                  </Badge>
                                )}
                                <Badge variant={statusBadgeVariant(session.status)} className="no-default-hover-elevate text-xs">
                                  {session.status}
                                </Badge>
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
                          </div>
                          {(session.status === "confirmed" || session.status === "requested") && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {session.status === "confirmed" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => gcal.isConnected ? gcal.addSession(session.id) : gcal.connect()}
                                    disabled={gcal.isAddingSession}
                                    data-testid={`button-list-gcal-${session.id}`}
                                  >
                                    <CalendarPlus className="w-3 h-3 mr-1" />
                                    {gcal.isConnected ? "Calendar" : "Connect"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => completeMutation.mutate(session.id)}
                                    disabled={completeMutation.isPending}
                                    data-testid={`button-list-complete-${session.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Complete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => cancelMutation.mutate(session.id)}
                                    disabled={cancelMutation.isPending}
                                    data-testid={`button-list-cancel-${session.id}`}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleRescheduleClick(session)}
                                data-testid={`button-reschedule-${session.id}`}
                              >
                                <CalendarDays className="w-3 h-3 mr-1" />
                                Reschedule
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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

      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) { setSelectedPlayerIds([]); setPlayerSearch(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-session">
          <DialogHeader>
            <DialogTitle>Create Training Session</DialogTitle>
            <DialogDescription>Send a session request to one or more players.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Players</Label>
              <Input
                placeholder="Search players..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                data-testid="input-player-search"
              />
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1" data-testid="group-player-list">
                {(trainerPlayers || [])
                  .filter(p => {
                    if (!p.linkedUserId) return false;
                    const name = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
                    return !playerSearch || name.includes(playerSearch.toLowerCase()) || (p.email || '').toLowerCase().includes(playerSearch.toLowerCase());
                  })
                  .map(p => {
                    const isSelected = selectedPlayerIds.includes(p.linkedUserId!);
                    const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown';
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-primary/10' : ''}`}
                        data-testid={`label-player-${p.id}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlayerIds(prev => [...prev, p.linkedUserId!]);
                            } else {
                              setSelectedPlayerIds(prev => prev.filter(id => id !== p.linkedUserId));
                            }
                          }}
                          data-testid={`checkbox-player-${p.id}`}
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{name}</span>
                        </div>
                      </label>
                    );
                  })}
                {(trainerPlayers || []).filter(p => p.linkedUserId).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No linked players in your roster yet.</p>
                )}
              </div>
              {selectedPlayerIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <Users className="h-3 w-3 inline mr-1" />
                  {selectedPlayerIds.length} player{selectedPlayerIds.length > 1 ? 's' : ''} selected
                  {selectedPlayerIds.length > 1 && ' (group session)'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              <CalendarComponent
                mode="single"
                selected={createDate}
                onSelect={setCreateDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
                data-testid="calendar-create-date"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Time</Label>
                <Select value={createStart} onValueChange={setCreateStart}>
                  <SelectTrigger data-testid="select-create-start">
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">End Time</Label>
                <Select value={createEnd} onValueChange={setCreateEnd}>
                  <SelectTrigger data-testid="select-create-end">
                    <SelectValue placeholder="End" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Location</Label>
              <Select value={createLocation} onValueChange={setCreateLocation}>
                <SelectTrigger data-testid="select-create-location">
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(locations || []).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Session Type</Label>
              <Select value={createType} onValueChange={setCreateType}>
                <SelectTrigger data-testid="select-create-type">
                  <SelectValue placeholder="Session type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-on-1">1-on-1</SelectItem>
                  <SelectItem value="Small Group">Small Group</SelectItem>
                  <SelectItem value="Team Training">Team Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                placeholder="Add notes for the players..."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                className="h-20"
                data-testid="input-create-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              disabled={selectedPlayerIds.length === 0 || !createDate || !createStart || !createEnd || createSessionMutation.isPending}
              onClick={() => {
                if (!createDate || !createStart || !createEnd) return;
                const y = createDate.getFullYear();
                const m = String(createDate.getMonth() + 1).padStart(2, '0');
                const d = String(createDate.getDate()).padStart(2, '0');
                createSessionMutation.mutate({
                  playerIds: selectedPlayerIds,
                  sessionDate: `${y}-${m}-${d}`,
                  startTime: createStart,
                  endTime: createEnd,
                  locationId: createLocation || undefined,
                  sessionType: createType || undefined,
                  trainerNotes: createNotes || undefined,
                });
              }}
              data-testid="button-submit-create"
            >
              {createSessionMutation.isPending ? "Creating..." : `Send to ${selectedPlayerIds.length} Player${selectedPlayerIds.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent data-testid="dialog-reschedule">
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
            <DialogDescription>Update the session details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="input-reschedule-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Select value={rescheduleStart} onValueChange={setRescheduleStart}>
                <SelectTrigger data-testid="select-reschedule-start">
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Time</label>
              <Select value={rescheduleEnd} onValueChange={setRescheduleEnd}>
                <SelectTrigger data-testid="select-reschedule-end">
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={rescheduleLocation} onValueChange={setRescheduleLocation}>
                <SelectTrigger data-testid="select-reschedule-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations || []).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Type</label>
              <Select value={rescheduleType} onValueChange={setRescheduleType}>
                <SelectTrigger data-testid="select-reschedule-type">
                  <SelectValue placeholder="Session type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-on-1">1-on-1</SelectItem>
                  <SelectItem value="Small Group">Small Group</SelectItem>
                  <SelectItem value="Team Training">Team Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(false)}
              data-testid="button-cancel-reschedule"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRescheduleSave}
              disabled={rescheduleMutation.isPending}
              data-testid="button-save-reschedule"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionCard({
  session,
  onComplete,
  onCancel,
  onReschedule,
  completePending,
  cancelPending,
  gcal,
}: {
  session: EnrichedSession;
  onComplete: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  completePending: boolean;
  cancelPending: boolean;
  gcal: ReturnType<typeof useGoogleCalendar>;
}) {
  return (
    <Card data-testid={`card-schedule-${session.id}`}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" data-testid={`text-schedule-player-${session.id}`}>
                {session.playerName}
              </span>
              {session.groupPlayerCount > 1 && (
                <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-group-${session.id}`}>
                  <Users className="w-3 h-3 mr-1" />
                  Group ({session.groupPlayerCount})
                </Badge>
              )}
              {session.sessionType && (
                <Badge variant="outline" className="no-default-hover-elevate text-xs">
                  {session.sessionType}
                </Badge>
              )}
              <Badge variant={statusBadgeVariant(session.status)} className="no-default-hover-elevate text-xs">
                {session.status}
              </Badge>
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
          {(session.status === "confirmed" || session.status === "requested") && (
            <div className="flex items-center gap-2 flex-wrap">
              {session.status === "confirmed" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => gcal.isConnected ? gcal.addSession(session.id) : gcal.connect()}
                    disabled={gcal.isAddingSession}
                    data-testid={`button-gcal-${session.id}`}
                  >
                    <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                    {gcal.isConnected ? "Add to Calendar" : "Connect Calendar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onComplete}
                    disabled={completePending}
                    data-testid={`button-complete-${session.id}`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    disabled={cancelPending}
                    data-testid={`button-cancel-${session.id}`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onReschedule}
                data-testid={`button-reschedule-${session.id}`}
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1" />
                Reschedule
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
