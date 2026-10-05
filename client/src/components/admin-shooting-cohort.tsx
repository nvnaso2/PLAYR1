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
  if (!application.assessments.length) return <p className="rounded-xl bg-black/20 p-3 text-xs text-[#85796a]">No shooting tests submitted.</p>;
  return <div className="space-y-2">{[...application.assessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((assessment, index) => {
    const totals = getAssessmentTotals({
      freeThrowsMade: assessment.freeThrowsMade,
      spotUp: assessment.spotUpResults,
      offDribble: assessment.offDribbleResults,
    });
    return <details key={assessment.id} className="group rounded-xl border border-[#493c2e] bg-[#110f0c]">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d87d3e]/10 text-[#e69a60]"><Target className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#e7dac8]">{assessment.type === "baseline" ? "Baseline" : `Retest ${application.assessments.length - index}`} · {new Date(assessment.createdAt).toLocaleDateString()}</span><span className="mt-0.5 block text-[10px] text-[#827566]">{assessment.distanceFeet} ft · {totals.total.made}/{totals.total.attempted} makes</span></span><ChevronDown className="h-4 w-4 text-[#8c7a66] transition group-open:rotate-180" /></summary>
      <div className="grid gap-3 border-t border-[#382f25] px-3 pb-3 pt-3 sm:grid-cols-3">
        <AdminResult title="Free throws" made={totals.freeThrows.made} attempted={totals.freeThrows.attempted} />
        <div><AdminResult title="Spot-up" made={totals.spotUp.made} attempted={totals.spotUp.attempted} /><div className="mt-2 space-y-1">{Object.entries(assessment.spotUpResults).map(([key, value]) => <AdminLocation key={key} label={spotLabels[key] ?? key} value={value} />)}</div></div>
        <div><AdminResult title="Off the dribble" made={totals.offDribble.made} attempted={totals.offDribble.attempted} /><div className="mt-2 space-y-1">{Object.entries(assessment.offDribbleResults).map(([key, value]) => <AdminLocation key={key} label={dribbleLabels[key] ?? key} value={value} />)}</div></div>
        {assessment.notes && <p className="whitespace-pre-wrap text-xs leading-5 text-[#a99b89] sm:col-span-3">{assessment.notes}</p>}
      </div>
    </details>;
  })}</div>;
}

function AdminResult({ title, made, attempted }: { title: string; made: number; attempted: number }) {
  return <p className="flex justify-between gap-2 text-xs text-[#b8ab9c]"><span>{title}</span><span className="font-mono text-[#e89a5c]">{made}/{attempted}</span></p>;
}

function AdminLocation({ label, value }: { label: string; value: number }) {
  return <p className="flex justify-between gap-2 text-[10px] text-[#827566]"><span>{label}</span><span className="font-mono text-[#b8ab9c]">{value}/5</span></p>;
}

function ApplicantCard({ applicant, onInvite, onRemove, pending, canInvite }: {
  applicant: ShootingCohortAdminApplication;
  onInvite: () => void;
  onRemove: () => void;
  pending: boolean;
  canInvite: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return <article className="rounded-2xl border border-[#44382c] bg-[#191511] p-4 sm:p-5" data-testid={`shooting-cohort-applicant-${applicant.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-[#f0e3d2]">{applicant.displayName || "PLAYR1 player"}</h3><span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${applicant.status === "active" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : applicant.status === "invited" ? "border-orange-300/20 bg-orange-300/[0.06] text-orange-200" : applicant.status === "waitlisted" ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-100" : "border-zinc-700 text-zinc-400"}`}>{statusLabels[applicant.status] ?? applicant.status}</span></div>
        <p className="mt-1 truncate text-xs text-[#827566]">{applicant.email || "No email on file"} <span className="px-1 text-[#574c3f]">/</span> Applied {new Date(applicant.appliedAt).toLocaleDateString()}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{applicant.answers.focusAreas.map((focus) => <span key={focus} className="rounded-md border border-[#55402e] bg-[#241a12] px-2 py-1 text-[10px] text-[#d7a273]">{SHOOTING_COHORT_FOCUS_LABELS[focus]}</span>)}<span className="rounded-md border border-[#39322a] px-2 py-1 font-mono text-[10px] text-[#a99b89]">Confidence {applicant.answers.confidence}/5</span></div>
      </div>
      <div className="flex shrink-0 gap-2">
        {applicant.status === "waitlisted" && <Button size="sm" title={canInvite ? "Reserve an open seat and send the invitation" : "Increase capacity or wait for an open seat"} onClick={onInvite} disabled={pending || !canInvite} className="bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]"><Check className="mr-1.5 h-3.5 w-3.5" />Invite</Button>}
        {["active", "waitlisted", "invited"].includes(applicant.status) && <Button size="icon" variant="outline" aria-label={`Remove ${applicant.displayName || "applicant"}`} onClick={onRemove} disabled={pending} className="h-9 w-9 border-[#56453a] text-[#b79d83] hover:border-red-300/40 hover:bg-red-300/5 hover:text-red-200"><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-4 flex w-full items-center justify-between border-t border-[#382f25] pt-3 text-left text-xs font-semibold text-[#ba9b7d] hover:text-[#f0b17d]"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />Private application &amp; assessment review</span>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
    {expanded && <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-3 rounded-xl border border-[#3e342a] bg-[#110f0c] p-3.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d89257]">Application answers · private</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><ReviewField label="Practice days" value={applicant.answers.practiceDays.join(", ")} /><ReviewField label="Session" value={`${applicant.answers.sessionMinutes} min`} /><ReviewField label="Hoop access" value={applicant.answers.hoopAccess} /><ReviewField label="Weekly shots" value={applicant.answers.weeklyShots.toLocaleString()} /><ReviewField label="Confidence" value={`${applicant.answers.confidence}/5`} /><ReviewField label="Focus" value={applicant.answers.focusAreas.map((focus) => SHOOTING_COHORT_FOCUS_LABELS[focus]).join(", ")} /></div>
        <ReviewField label="Goal" value={applicant.answers.goal} />
        {applicant.answers.currentRoutine && <ReviewField label="Current routine" value={applicant.answers.currentRoutine} />}
      </div>
      <div className="space-y-3 rounded-xl border border-[#3e342a] bg-[#110f0c] p-3.5"><p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d89257]"><LockKeyhole className="h-3 w-3" />Admin-only test results</p><AssessmentReview application={applicant} /></div>
    </div>}
  </article>;
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#817567]">{label}</p><p className="mt-1 break-words whitespace-pre-wrap text-xs leading-5 text-[#d3c5b3]">{value || "—"}</p></div>;
}

function ModerationRow({ message, onRemove, pending }: { message: ShootingCohortChatMessage; onRemove: () => void; pending: boolean }) {
  return <article className="flex items-start gap-3 border-b border-[#332c24] py-3 last:border-0">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5d422d] bg-[#261a11] text-xs font-bold text-[#e9a16a]">{message.displayName.slice(0, 1).toUpperCase()}</span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-xs font-semibold text-[#e4d7c7]">{message.displayName}</p><time className="font-mono text-[9px] text-[#74695d]">{new Date(message.createdAt).toLocaleString()}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-[#bbae9d]">{message.content}</p></div>
    <Button size="icon" variant="ghost" aria-label={`Delete message from ${message.displayName}`} onClick={onRemove} disabled={pending} className="h-8 w-8 shrink-0 text-[#8e7c68] hover:bg-red-300/10 hover:text-red-200"><Trash2 className="h-4 w-4" /></Button>
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
  if (adminQuery.isLoading) return <div className="shooting-cohort-admin space-y-3"><Skeleton className="h-28 rounded-2xl bg-[#29231c]" /><Skeleton className="h-20 rounded-2xl bg-[#29231c]" /><Skeleton className="h-52 rounded-2xl bg-[#29231c]" /></div>;
  if (adminQuery.isError || !adminQuery.data) return <section className="shooting-cohort-admin rounded-2xl border border-red-300/20 bg-red-300/[0.04] p-6 text-center"><p className="text-sm text-red-200">Shooting cohort management could not load.</p><Button variant="ghost" onClick={() => adminQuery.refetch()} className="mt-2 text-red-200 hover:text-white">Retry</Button></section>;
  return <div className="shooting-cohort-admin space-y-5">
    {hasDevelopmentSampleData && <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/80"><span className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200">Development preview</span>Sample applicants, scores, and chat activity are synthetic and only appear in development.</div>}
    <section className="rounded-[24px] border border-[#493a2c] bg-[#21180f] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Program controls</p><h2 className="mt-1 font-heading text-3xl uppercase text-[#fff1de]">Shooting cohort</h2><p className="mt-1 max-w-xl text-sm leading-5 text-[#9d8f7e]">Manage capacity, invitations, private tests, and the shared member room.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#5b4934] bg-black/20 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d5b08d]"><LockKeyhole className="h-3 w-3" />Admin controls</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><CountTile icon={<Users className="h-4 w-4" />} label="Active" value={adminQuery.data.counts.active} /><CountTile icon={<CalendarDays className="h-4 w-4" />} label="Invited · seat held" value={adminQuery.data.counts.invited} /><CountTile icon={<ClockShield />} label="Waitlist" value={adminQuery.data.counts.waitlisted} /></div>
      <div className="mt-4 grid gap-4 rounded-2xl border border-[#493b2c] bg-[#17130f] p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="cohort-capacity" className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#b9a58e]">Member capacity</label><Input id="cohort-capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="h-10 max-w-40 border-[#493e32] bg-[#100e0b] font-mono text-white" /><p className="text-[10px] text-[#817567]">{availableSeats} open seats after active and invited reservations</p></div>
          <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#b9a58e]">Applications</p><button type="button" aria-pressed={applicationsOpen} onClick={() => setApplicationsOpen((open) => !open)} className={`mt-2 flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-xs font-semibold transition ${applicationsOpen ? "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-200" : "border-[#55483a] bg-[#100e0b] text-[#aa9c8a]"}`}><span className={`relative h-4 w-7 rounded-full transition ${applicationsOpen ? "bg-emerald-300/70" : "bg-[#50463c]"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#100e0b] transition-transform ${applicationsOpen ? "translate-x-3.5" : "translate-x-0.5"}`} /></span>{applicationsOpen ? "Open to new applications" : "Paused"}</button><p className="mt-1.5 text-[10px] text-[#817567]">Manual invitations remain managed below.</p></div>
        </div>
        <Button onClick={() => void saveSettings()} disabled={updateSettings.isPending} className="bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]">{updateSettings.isPending ? "Saving…" : "Save settings"} <Check className="ml-2 h-4 w-4" /></Button>
      </div>
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Application order</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#f3e5d3]">Players &amp; waitlist</h2></div><p className="text-[10px] text-[#827566]">Oldest application first · invitations reserve an open seat</p></div>
      {!applications.length ? <div className="rounded-2xl border border-dashed border-[#4d4032] bg-[#17130f] px-5 py-10 text-center"><Users className="mx-auto h-6 w-6 text-[#99734f]" /><p className="mt-3 text-sm font-semibold text-[#dfd0bd]">No cohort applications yet</p><p className="mt-1 text-xs text-[#817567]">Applications will appear here in the order they arrive.</p></div>
        : <div className="space-y-3">{applications.map((applicant) => <ApplicantCard key={applicant.id} applicant={applicant} canInvite={availableSeats > 0} pending={inviteApplicant.isPending || removeApplication.isPending} onInvite={() => void invite(applicant)} onRemove={() => void remove(applicant)} />)}</div>}
    </section>

    <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#382e24] pb-4"><div><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]"><MessageCircle className="h-3.5 w-3.5" />Shared conversation</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#f3e5d3]">Shooting room moderation</h2></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#4d4032] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#a79783]"><ShieldCheck className="h-3 w-3" />Admins &amp; active members</span></div>
      {messagesQuery.isLoading ? <div className="space-y-3 pt-4"><Skeleton className="h-14 rounded-xl bg-[#29231c]" /><Skeleton className="h-14 rounded-xl bg-[#29231c]" /></div>
        : messagesQuery.isError ? <div className="py-8 text-center text-sm text-[#a99b89]">Shared chat could not load. <Button variant="ghost" onClick={() => messagesQuery.refetch()} className="text-[#e79a5c]">Retry</Button></div>
          : !(messagesQuery.data?.length) ? <div className="py-8 text-center text-sm text-[#817567]">The shooting room has no messages yet.</div>
            : <div className="mt-2">{messagesQuery.data.map((message) => <ModerationRow key={message.id} message={message} pending={removeMessage.isPending} onRemove={() => void moderate(message)} />)}</div>}
      <div className="mt-3 flex items-end gap-2 border-t border-[#382e24] pt-3">
        <Textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Post as PLAYR1 admin…" aria-label="Admin shooting cohort message" className="min-h-10 max-h-28 resize-none border-[#493e32] bg-[#100e0b] text-sm text-[#f3e6d5] placeholder:text-[#675d51]" />
        <Button size="icon" onClick={() => void send()} disabled={!messageText.trim() || sendMessage.isPending} aria-label="Send message to shooting room" className="h-10 w-10 shrink-0 bg-[#ef8a43] text-[#21150c] hover:bg-[#ff9e5b]"><Send className="h-4 w-4" /></Button>
      </div>
      <p className="mt-3 border-t border-[#382e24] pt-3 text-[10px] leading-5 text-[#776b5e]">Only admins can remove shared messages. Individual assessment results remain private to each player and admins.</p>
    </section>
  </div>;
}

function CountTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="flex items-center gap-3 rounded-xl border border-[#48392b] bg-[#17120e] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c47842]/10 text-[#e39a61]">{icon}</span><div><p className="font-heading text-2xl leading-none text-[#f5e6d3]">{value}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.13em] text-[#887969]">{label}</p></div></div>;
}

function ClockShield() {
  return <CalendarDays className="h-4 w-4" />;
}