import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronUp, LockKeyhole, MessageCircle, Send, ShieldCheck, Target, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getAssessmentTotals,
  SHOOTING_COHORT_FOCUS_LABELS,
} from "@shared/shooting-cohort";
import {
  useInviteShootingCohortApplicant,
  useRemoveShootingCohortApplication,
  useRemoveShootingCohortMessage,
  useShootingCohortAdminQuery,
  useShootingCohortMessagesQuery,
  useSendShootingCohortMessage,
  useUpdateShootingCohortSettings,
} from "@/lib/shooting-cohort-api";
import type { ShootingCohortAdminApplication, ShootingCohortChatMessage } from "@/lib/shooting-cohort-api";

const statusLabels: Record<string, string> = {
  active: "Active member",
  waitlisted: "Waitlisted",
  invited: "Invitation sent",
  withdrawn: "Withdrawn",
  declined: "Declined",
  removed: "Removed",
};
const spotLabels: Record<string, string> = { leftCorner: "Left corner", leftWing: "Left wing", top: "Top", rightWing: "Right wing", rightCorner: "Right corner" };
const dribbleLabels: Record<string, string> = { left: "Left", center: "Center", right: "Right" };

function AssessmentReview({ application }: { application: ShootingCohortAdminApplication }) {
  if (!application.assessments.length) return <p className="rounded-xl bg-zinc-900/70 p-3 text-xs text-zinc-500">No shooting tests submitted.</p>;
  return <div className="space-y-2">{[...application.assessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((assessment, index) => {
    const totals = getAssessmentTotals({
      freeThrowsMade: assessment.freeThrowsMade,
      spotUp: assessment.spotUpResults,
      offDribble: assessment.offDribbleResults,
    });
    return <details key={assessment.id} className="group rounded-xl border border-zinc-800 bg-zinc-950/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-300"><Target className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-zinc-100">{assessment.type === "baseline" ? "Baseline" : `Retest ${application.assessments.length - index}`} · {new Date(assessment.createdAt).toLocaleDateString()}</span><span className="mt-0.5 block text-[10px] text-zinc-500">{assessment.distanceFeet} ft · {totals.total.made}/{totals.total.attempted} makes</span></span><ChevronDown className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" /></summary>
      <div className="grid gap-3 border-t border-zinc-800 px-3 pb-3 pt-3 sm:grid-cols-3">
        <AdminResult title="Free throws" made={totals.freeThrows.made} attempted={totals.freeThrows.attempted} />
        <div><AdminResult title="Spot-up" made={totals.spotUp.made} attempted={totals.spotUp.attempted} /><div className="mt-2 space-y-1">{Object.entries(assessment.spotUpResults).map(([key, value]) => <AdminLocation key={key} label={spotLabels[key] ?? key} value={value} />)}</div></div>
        <div><AdminResult title="Off the dribble" made={totals.offDribble.made} attempted={totals.offDribble.attempted} /><div className="mt-2 space-y-1">{Object.entries(assessment.offDribbleResults).map(([key, value]) => <AdminLocation key={key} label={dribbleLabels[key] ?? key} value={value} />)}</div></div>
        {assessment.notes && <p className="whitespace-pre-wrap text-xs leading-5 text-zinc-400 sm:col-span-3">{assessment.notes}</p>}
      </div>
    </details>;
  })}</div>;
}

function AdminResult({ title, made, attempted }: { title: string; made: number; attempted: number }) {
  return <p className="flex justify-between gap-2 text-xs text-zinc-400"><span>{title}</span><span className="font-mono text-orange-300">{made}/{attempted}</span></p>;
}

function AdminLocation({ label, value }: { label: string; value: number }) {
  return <p className="flex justify-between gap-2 text-[10px] text-zinc-500"><span>{label}</span><span className="font-mono text-zinc-300">{value}/5</span></p>;
}

function ApplicantCard({ applicant, onInvite, onRemove, pending, canInvite }: {
  applicant: ShootingCohortAdminApplication;
  onInvite: () => void;
  onRemove: () => void;
  pending: boolean;
  canInvite: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5" data-testid={`shooting-cohort-applicant-${applicant.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-white">{applicant.displayName || "PLAYR1 player"}</h3><span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${applicant.status === "active" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : applicant.status === "invited" ? "border-orange-300/20 bg-orange-300/[0.06] text-orange-200" : applicant.status === "waitlisted" ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-100" : "border-zinc-700 text-zinc-400"}`}>{statusLabels[applicant.status] ?? applicant.status}</span></div>
        <p className="mt-1 truncate text-xs text-zinc-500">{applicant.email || "No email on file"} <span className="px-1 text-zinc-700">/</span> Applied {new Date(applicant.appliedAt).toLocaleDateString()}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{applicant.answers.focusAreas.map((focus) => <span key={focus} className="rounded-md border border-orange-500/20 bg-orange-500/5 px-2 py-1 text-[10px] text-orange-200">{SHOOTING_COHORT_FOCUS_LABELS[focus]}</span>)}<span className="rounded-md border border-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-400">Confidence {applicant.answers.confidence}/5</span></div>
      </div>
      <div className="flex shrink-0 gap-2">
        {applicant.status === "waitlisted" && <Button size="sm" title={canInvite ? "Reserve an open seat and send the invitation" : "Increase capacity or wait for an open seat"} onClick={onInvite} disabled={pending || !canInvite} className="bg-orange-500 font-bold text-black hover:bg-orange-400"><Check className="mr-1.5 h-3.5 w-3.5" />Invite</Button>}
        {["active", "waitlisted", "invited"].includes(applicant.status) && <Button size="icon" variant="outline" aria-label={`Remove ${applicant.displayName || "applicant"}`} onClick={onRemove} disabled={pending} className="h-9 w-9 border-zinc-700 text-zinc-400 hover:border-red-400/40 hover:bg-red-400/5 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-4 flex w-full items-center justify-between border-t border-zinc-800 pt-3 text-left text-xs font-semibold text-zinc-400 hover:text-orange-300"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />Private application &amp; assessment review</span>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
    {expanded && <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-300">Application answers · private</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><ReviewField label="Practice days" value={applicant.answers.practiceDays.join(", ")} /><ReviewField label="Session" value={`${applicant.answers.sessionMinutes} min`} /><ReviewField label="Hoop access" value={applicant.answers.hoopAccess} /><ReviewField label="Weekly shots" value={applicant.answers.weeklyShots.toLocaleString()} /><ReviewField label="Confidence" value={`${applicant.answers.confidence}/5`} /><ReviewField label="Focus" value={applicant.answers.focusAreas.map((focus) => SHOOTING_COHORT_FOCUS_LABELS[focus]).join(", ")} /></div>
        <ReviewField label="Goal" value={applicant.answers.goal} />
        {applicant.answers.currentRoutine && <ReviewField label="Current routine" value={applicant.answers.currentRoutine} />}
      </div>
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5"><p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-orange-300"><LockKeyhole className="h-3 w-3" />Admin-only test results</p><AssessmentReview application={applicant} /></div>
    </div>}
  </article>;
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-500">{label}</p><p className="mt-1 break-words whitespace-pre-wrap text-xs leading-5 text-zinc-200">{value || "—"}</p></div>;
}

function ModerationRow({ message, onRemove, pending }: { message: ShootingCohortChatMessage; onRemove: () => void; pending: boolean }) {
  const displayName = typeof message.displayName === "string" && message.displayName.trim()
    ? message.displayName.trim()
    : "PLAYR1 team";
  return <article className="flex items-start gap-3 border-b border-zinc-800 py-3 last:border-0">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-orange-300">{displayName.slice(0, 1).toUpperCase()}</span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-xs font-semibold text-zinc-200">{displayName}</p><time className="font-mono text-[9px] text-zinc-500">{new Date(message.createdAt).toLocaleString()}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-zinc-300">{message.content}</p></div>
    <Button size="icon" variant="ghost" aria-label={`Delete message from ${displayName}`} onClick={onRemove} disabled={pending} className="h-8 w-8 shrink-0 text-zinc-500 hover:bg-red-300/10 hover:text-red-200"><Trash2 className="h-4 w-4" /></Button>
  </article>;
}

export default function AdminShootingCohort() {
  const { toast } = useToast();
  const adminQuery = useShootingCohortAdminQuery();
  const updateSettings = useUpdateShootingCohortSettings();
  const inviteApplicant = useInviteShootingCohortApplicant();
  const removeApplication = useRemoveShootingCohortApplication();
  const messagesQuery = useShootingCohortMessagesQuery(true);
  const sendMessage = useSendShootingCohortMessage();
  const removeMessage = useRemoveShootingCohortMessage();
  const [capacity, setCapacity] = useState("");
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [messageText, setMessageText] = useState("");
  useEffect(() => {
    if (adminQuery.data) {
      setCapacity(String(adminQuery.data.settings.capacity));
      setApplicationsOpen(adminQuery.data.settings.applicationsOpen);
    }
  }, [adminQuery.data?.settings.capacity, adminQuery.data?.settings.applicationsOpen]);
  const applications = useMemo(() => [...(adminQuery.data?.applications ?? [])].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()), [adminQuery.data?.applications]);
  const hasDevelopmentSampleData = applications.some((application) => application.userId.startsWith("playr1-demo-"));
  const seatCount = adminQuery.data?.counts.active ?? adminQuery.data?.settings.activeCount ?? 0;
  const reserved = adminQuery.data?.counts.invited ?? adminQuery.data?.settings.invitedCount ?? 0;
  const availableSeats = Math.max(0, Number(capacity || 0) - seatCount - reserved);
  const saveSettings = async () => {
    const number = Number(capacity);
    if (!Number.isInteger(number) || number < 1 || number > 500) {
      toast({ title: "Capacity not saved", description: "Capacity must be a whole number from 1 to 500.", variant: "destructive" });
      return;
    }
    try {
      await updateSettings.mutateAsync({ capacity: number, applicationsOpen });
      toast({ title: "Cohort settings saved", description: "Capacity and application access are updated." });
    } catch (error) {
      toast({ title: "Settings not saved", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  const invite = async (application: ShootingCohortAdminApplication) => {
    try {
      await inviteApplicant.mutateAsync(application.id);
      toast({ title: "Invitation sent", description: `${application.displayName || "Player"} has a reserved seat to accept in the portal.` });
    } catch (error) {
      toast({ title: "Invitation not sent", description: error instanceof Error ? error.message : "Check available capacity and try again.", variant: "destructive" });
    }
  };
  const remove = async (application: ShootingCohortAdminApplication) => {
    const name = application.displayName || "this player";
    if (!window.confirm(`Remove ${name} from the shooting cohort?`)) return;
    try {
      await removeApplication.mutateAsync(application.id);
      toast({ title: "Cohort record removed", description: `${name} no longer has active cohort access.` });
    } catch (error) {
      toast({ title: "Could not remove player", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  const moderate = async (message: ShootingCohortChatMessage) => {
    if (!window.confirm("Delete this shared cohort message?")) return;
    try {
      await removeMessage.mutateAsync(message.id);
      toast({ title: "Message deleted", description: "The shared message was removed." });
    } catch (error) {
      toast({ title: "Message not deleted", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  const send = async () => {
    const content = messageText.trim();
    if (!content || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync(content);
      setMessageText("");
      toast({ title: "Message posted", description: "The shooting room has been updated." });
    } catch (error) {
      toast({ title: "Message not sent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  if (adminQuery.isLoading) return <div className="shooting-cohort-admin space-y-3"><Skeleton className="h-28 rounded-xl bg-zinc-800" /><Skeleton className="h-20 rounded-xl bg-zinc-800" /><Skeleton className="h-52 rounded-xl bg-zinc-800" /></div>;
  if (adminQuery.isError || !adminQuery.data) return <section className="shooting-cohort-admin rounded-xl border border-red-500/25 bg-red-500/5 p-6 text-center"><p className="text-sm text-red-300">Shooting cohort management could not load.</p><Button variant="ghost" onClick={() => adminQuery.refetch()} className="mt-2 text-red-300 hover:text-white">Retry</Button></section>;
  return (
    <div className="shooting-cohort-admin space-y-5">
      {hasDevelopmentSampleData && <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/80"><span className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200">Development preview</span>Sample applicants, scores, and chat activity are synthetic and only appear in development.</div>}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Cohort statistics" data-testid="cohort-statistics">
        <CountTile icon={<Users className="h-4 w-4" />} label="Active members" value={adminQuery.data.counts.active} sub="In the room" />
        <CountTile icon={<CalendarDays className="h-4 w-4" />} label="Invited · seat held" value={adminQuery.data.counts.invited} sub="Awaiting acceptance" />
        <CountTile icon={<ClockShield />} label="Waitlist" value={adminQuery.data.counts.waitlisted} sub="Oldest application first" />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(265px,0.72fr)_minmax(0,1.75fr)]">
        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-lg shadow-black/20" data-testid="cohort-settings">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-4">
              <div>
                <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Program controls</p>
                <h2 className="mt-1 text-xl font-bold text-white">Cohort setup</h2>
              </div>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${applicationsOpen ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : "border-zinc-700 bg-zinc-950 text-zinc-400"}`}>
                {applicationsOpen ? "Accepting" : "Paused"}
              </span>
            </div>
            <div className="space-y-5 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="cohort-capacity" className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-400">Member capacity</label>
                  <span className="font-mono text-[9px] text-zinc-600">1–500</span>
                </div>
                <div className="flex items-center gap-3">
                  <Input id="cohort-capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="h-11 w-24 border-zinc-800 bg-zinc-950 px-3 font-mono text-lg text-white" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300"><span className="font-semibold text-orange-300">{availableSeats}</span> open seats</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-zinc-500">After active and invited reservations</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-400">Applications</p>
                  <span className={`font-mono text-[8px] uppercase tracking-[0.12em] ${applicationsOpen ? "text-emerald-300" : "text-zinc-500"}`}>{applicationsOpen ? "Accepting" : "Paused"}</span>
                </div>
                <button type="button" aria-pressed={applicationsOpen} onClick={() => setApplicationsOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-left transition hover:border-zinc-700">
                  <span className="flex items-center gap-2.5">
                    <span className={`relative h-5 w-9 rounded-full transition-colors ${applicationsOpen ? "bg-emerald-400/70" : "bg-zinc-700"}`}>
                      <span className={`absolute top-1 h-3 w-3 rounded-full bg-zinc-950 transition-transform ${applicationsOpen ? "translate-x-5" : "translate-x-1"}`} />
                    </span>
                    <span className="text-xs text-zinc-300">{applicationsOpen ? "Open to new applications" : "Applications paused"}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-zinc-600" />
                </button>
                <p className="mt-2 text-[10px] leading-4 text-zinc-500">Manual invitations remain available below.</p>
              </div>

              <Button onClick={() => void saveSettings()} disabled={updateSettings.isPending} className="h-10 w-full bg-orange-500 font-bold text-black hover:bg-orange-400">
                {updateSettings.isPending ? "Saving…" : "Save settings"} <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400"><ShieldCheck className="h-3.5 w-3.5 text-orange-300" />Private by default</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Application answers and shooting-test results are visible to admins only. The member conversation is shared with active players.</p>
          </section>
        </aside>

        <section className="min-w-0" data-testid="cohort-application-order">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Applications · oldest first</p>
              <h2 className="mt-1 text-xl font-bold text-white">Players &amp; waitlist</h2>
            </div>
            <span className="rounded-full border border-zinc-800 px-2.5 py-1 font-mono text-[9px] text-zinc-500">{applications.length} applications</span>
          </div>
          {!applications.length
            ? <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-5 py-10 text-center"><Users className="mx-auto h-6 w-6 text-orange-400/70" /><p className="mt-3 text-sm font-semibold text-zinc-200">No cohort applications yet</p><p className="mt-1 text-xs text-zinc-500">Applications will appear here in the order they arrive.</p></div>
            : <div className="space-y-3">{applications.map((applicant) => <ApplicantCard key={applicant.id} applicant={applicant} canInvite={availableSeats > 0} pending={inviteApplicant.isPending || removeApplication.isPending} onInvite={() => void invite(applicant)} onRemove={() => void remove(applicant)} />)}</div>}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60" data-testid="cohort-shared-room">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-5">
          <div>
            <p className="flex items-center gap-2 font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400"><MessageCircle className="h-3.5 w-3.5" />Shared conversation</p>
            <h2 className="mt-1 text-xl font-bold text-white">Shooting room</h2>
            <p className="mt-1 text-[10px] text-zinc-500">Moderation · visible to admins and active members</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-400"><ShieldCheck className="h-3 w-3 text-orange-300" />Admin moderation</span>
        </header>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="px-4 sm:px-5">
            {messagesQuery.isLoading
              ? <div className="space-y-3 py-4"><Skeleton className="h-14 rounded-xl bg-zinc-800" /><Skeleton className="h-14 rounded-xl bg-zinc-800" /></div>
              : messagesQuery.isError
                ? <div className="py-8 text-center text-sm text-zinc-400">Shared chat could not load. <Button variant="ghost" onClick={() => messagesQuery.refetch()} className="text-orange-300">Retry</Button></div>
                : !(messagesQuery.data?.length)
                  ? <div className="py-10 text-center text-sm text-zinc-500">The shooting room has no messages yet.</div>
                  : <div className="mt-1">{messagesQuery.data.map((message) => <ModerationRow key={message.id} message={message} pending={removeMessage.isPending} onRemove={() => void moderate(message)} />)}</div>}
          </div>
          <div className="border-t border-zinc-800 bg-zinc-950/70 p-4 lg:border-l lg:border-t-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500">Post as PLAYR1 admin</p>
            <Textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Share a note with the room…" aria-label="Admin shooting cohort message" className="mt-2 min-h-24 max-h-48 resize-y border-zinc-800 bg-zinc-950 text-xs leading-5 text-zinc-200 placeholder:text-zinc-600" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[9px] text-zinc-500">Enter to post · Shift + Enter for a line</span>
              <Button size="icon" onClick={() => void send()} disabled={!messageText.trim() || sendMessage.isPending} aria-label="Send message to shooting room" className="h-9 w-9 shrink-0 bg-orange-500 text-black hover:bg-orange-400"><Send className="h-4 w-4" /></Button>
            </div>
            <p className="mt-4 border-t border-zinc-800 pt-3 text-[9px] leading-4 text-zinc-500">Only admins can remove shared messages. Individual assessment results remain private to each player and admins.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CountTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 sm:p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">{icon}</span><div className="min-w-0"><p className="font-heading text-3xl leading-none text-white">{value}</p><p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-500">{label}</p></div><span className="ml-auto hidden text-right text-[9px] leading-4 text-zinc-500 sm:block">{sub}</span></div>;
}

function ClockShield() {
  return <CalendarDays className="h-4 w-4" />;
}