import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getObjectUrl } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  X,
  CalendarDays,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Hourglass,
} from "lucide-react";
import type { TrainingSession } from "@shared/schema";

type EnrichedSession = TrainingSession & {
  trainerName: string;
  trainerPhotoUrl: string | null;
  locationName: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Calendar }> = {
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  requested: { label: "Awaiting Confirmation", variant: "secondary", icon: Hourglass },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function MySessionsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelSessionId, setCancelSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery<EnrichedSession[]>({
    queryKey: ["/api/training-sessions/player/enriched"],
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/player/enriched"] });
      toast({ title: "Session cancelled" });
      setCancelSessionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  const filtered = (sessions || []).filter(
    (s) => statusFilter === "all" || s.status === statusFilter
  );

  const upcoming = filtered.filter((s) => s.status === "confirmed");
  const pending = filtered.filter((s) => s.status === "requested");
  const completed = filtered.filter((s) => s.status === "completed");
  const cancelledDeclined = filtered.filter((s) => s.status === "cancelled" || s.status === "declined");

  const sortByDate = (a: EnrichedSession, b: EnrichedSession) =>
    a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime);

  function SessionCard({ session, prominent }: { session: EnrichedSession; prominent?: boolean }) {
    const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.requested;
    const StatusIcon = config.icon;
    const canCancel = session.status === "requested" || session.status === "confirmed";

    return (
      <Card
        data-testid={`card-session-${session.id}`}
        className={prominent ? "" : "opacity-80"}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar>
                <AvatarImage src={getObjectUrl(session.trainerPhotoUrl) || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate" data-testid={`text-trainer-name-${session.id}`}>
                  {session.trainerName}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(session.sessionDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.variant} data-testid={`badge-status-${session.id}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-cancel-session-${session.id}`}
                  onClick={() => setCancelSessionId(session.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
            {session.locationName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {session.locationName}
              </span>
            )}
            {session.sessionType && (
              <Badge variant="outline" className="no-default-active-elevate">
                {session.sessionType}
              </Badge>
            )}
          </div>

          {session.playerNotes && (
            <div className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{session.playerNotes}</span>
            </div>
          )}

          {(session.declineReason || session.trainerNotes) && (
            <div className="mt-2 text-sm text-muted-foreground">
              {session.declineReason && (
                <p className="italic">Reason: {session.declineReason}</p>
              )}
              {session.trainerNotes && (
                <p>Trainer note: {session.trainerNotes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function SectionHeader({ title, count, icon: Icon }: { title: string; count: number; icon: typeof Calendar }) {
    if (count === 0) return null;
    return (
      <div className="flex items-center gap-2 mt-6 mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="secondary" className="no-default-active-elevate">{count}</Badge>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Sessions</h1>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
          <SelectTrigger className="w-[180px]" data-testid="select-trigger-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-all">All</SelectItem>
            <SelectItem value="confirmed" data-testid="select-item-confirmed">Confirmed</SelectItem>
            <SelectItem value="requested" data-testid="select-item-requested">Pending</SelectItem>
            <SelectItem value="completed" data-testid="select-item-completed">Completed</SelectItem>
            <SelectItem value="cancelled" data-testid="select-item-cancelled">Cancelled</SelectItem>
            <SelectItem value="declined" data-testid="select-item-declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-3" data-testid="loading-sessions">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-sessions">
              {statusFilter === "all"
                ? "No sessions yet. Find a trainer to book your first session!"
                : `No ${statusFilter} sessions found.`}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <>
          <SectionHeader title="Upcoming" count={upcoming.length} icon={CheckCircle2} />
          <div className="space-y-3">
            {upcoming.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} prominent />
            ))}
          </div>

          <SectionHeader title="Pending" count={pending.length} icon={Hourglass} />
          <div className="space-y-3">
            {pending.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} prominent />
            ))}
          </div>

          <SectionHeader title="Completed" count={completed.length} icon={CheckCircle2} />
          <div className="space-y-3">
            {completed.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>

          <SectionHeader title="Cancelled / Declined" count={cancelledDeclined.length} icon={XCircle} />
          <div className="space-y-3">
            {cancelledDeclined.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!cancelSessionId} onOpenChange={(open) => !open && setCancelSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-dismiss">Keep Session</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-cancel-dialog-confirm"
              onClick={() => cancelSessionId && cancelMutation.mutate(cancelSessionId)}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
