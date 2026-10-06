import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  Film,
  LockKeyhole,
  MessageCircle,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AdminShootingCohortFilmReview from "@/components/admin-shooting-cohort-film-review";
import {
  getAssessmentTotals,
  SHOOTING_COHORT_FOCUS_LABELS,
} from "@shared/shooting-cohort";
import {
  useInviteShootingCohortApplicant,
  useRemoveShootingCohortApplication,
  useRemoveShootingCohortMessage,
  useSetShootingCohortApplicationStatus,
  useShootingCohortAdminQuery,
  useShootingCohortMessagesQuery,
  useAdminShootingCohortVideoSubmissionsQuery,
  useSendShootingCohortMessage,
  useUpdateShootingCohortSettings,
} from "@/lib/shooting-cohort-api";
import type {
  ShootingCohortAdminApplication,
  ShootingCohortChatMessage,
  ShootingCohortVideoSubmission,
} from "@/lib/shooting-cohort-api";

type AdminView = "cohort" | "applications" | "film-review" | "conversation";
type ApplicationStatus = "active" | "invited" | "waitlisted" | "needs_review";
type ApplicationFilter = "all" | ApplicationStatus;

const statusLabels: Record<ApplicationStatus, string> = {
  active: "Accepted",
  invited: "Invited",
  waitlisted: "Waitlisted",
  needs_review: "Needs Review",
};

const statusClasses: Record<ApplicationStatus, string> = {
  active: "border-orange-300/25 bg-orange-300/[0.08] text-orange-200",
  invited: "border-sky-300/20 bg-sky-300/[0.06] text-sky-200",
  waitlisted: "border-amber-300/20 bg-amber-300/[0.06] text-amber-100",
  needs_review: "border-rose-300/20 bg-rose-300/[0.06] text-rose-200",
};

const statusActions: { status: ApplicationStatus; label: string }[] = [
  { status: "active", label: "Accept" },
  { status: "invited", label: "Invite" },
  { status: "waitlisted", label: "Waitlist" },
  { status: "needs_review", label: "Needs Review" },
];

const spotLabels: Record<string, string> = {
  leftCorner: "Left corner",
  leftWing: "Left wing",
  top: "Top",
  rightWing: "Right wing",
  rightCorner: "Right corner",
};
const emptyFiveSpotResults = { leftCorner: 0, leftWing: 0, top: 0, rightWing: 0, rightCorner: 0 };

function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, includeTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function AssessmentReview({ application }: { application: ShootingCohortAdminApplication }) {
  if (!application.assessments.length) {
    return <p className="rounded-xl border border-white/[0.06] bg-[#11110f] p-3 text-xs text-stone-500">No shooting tests submitted.</p>;
  }

  const assessments = [...application.assessments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-2">
      {assessments.map((assessment, index) => {
        const totals = getAssessmentTotals({
          freeThrowsMade: assessment.freeThrowsMade,
          threePointResults: assessment.threePointResults ?? emptyFiveSpotResults,
          midRangeResults: assessment.midRangeResults ?? emptyFiveSpotResults,
        });
        return (
          <details key={assessment.id} className="group rounded-xl border border-white/[0.07] bg-[#11110f]">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Target className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-stone-100">
                  {assessment.type === "baseline" ? "Baseline" : `Retest ${assessments.length - index}`} · {formatDate(assessment.createdAt)}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-stone-500">
                  3PT {totals.threePoint.percent}% · Mid {totals.midRange.percent}% · FT {totals.freeThrows.percent}%
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-stone-500 transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t border-white/[0.07] px-3 pb-3 pt-3 sm:grid-cols-3">
              <AdminResult title="Free throws" made={totals.freeThrows.made} attempted={totals.freeThrows.attempted} />
              <div>
              <AdminResult title="Three-pointers" made={totals.threePoint.made} attempted={totals.threePoint.attempted} />
                <div className="mt-2 space-y-1">{Object.entries(assessment.threePointResults ?? emptyFiveSpotResults).map(([key, value]) => <AdminLocation key={key} label={spotLabels[key] ?? key} value={value} attempted={20} />)}</div>
              </div>
              <div>
                <AdminResult title="Mid-range pull-ups" made={totals.midRange.made} attempted={totals.midRange.attempted} />
                <div className="mt-2 space-y-1">{Object.entries(assessment.midRangeResults ?? emptyFiveSpotResults).map(([key, value]) => <AdminLocation key={key} label={spotLabels[key] ?? key} value={value} attempted={8} />)}</div>
              </div>
              {assessment.notes && <p className="whitespace-pre-wrap text-xs leading-5 text-stone-400 sm:col-span-3">{assessment.notes}</p>}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function AdminResult({ title, made, attempted }: { title: string; made: number; attempted: number }) {
  return <p className="flex justify-between gap-2 text-xs text-stone-400"><span>{title}</span><span className="font-mono text-orange-300">{made}/{attempted}</span></p>;
}

function AdminLocation({ label, value, attempted }: { label: string; value: number; attempted: number }) {
  return <p className="flex justify-between gap-2 text-[10px] text-stone-500"><span>{label}</span><span className="font-mono text-stone-300">{value}/{attempted}</span></p>;
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 break-words whitespace-pre-wrap text-xs leading-5 text-stone-200">{value || "—"}</p>
    </div>
  );
}

function ApplicantVideoReview({ applicant }: { applicant: ShootingCohortAdminApplication }) {
  const query = useAdminShootingCohortVideoSubmissionsQuery(applicant.id, applicant.status === "active");
  return (
    <section className="space-y-3 rounded-xl border border-white/[0.07] bg-[#10100e] p-3.5 lg:col-span-2" aria-label={`${applicant.displayName || "Applicant"} cohort video submissions`}>
      <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-orange-200"><Film className="h-3.5 w-3.5" />Founder video review · private</p>
      {applicant.status !== "active"
        ? <p className="text-xs leading-5 text-stone-500">Video review is available while the player has active cohort membership.</p>
        : query.isLoading
          ? <p className="text-xs text-stone-500">Loading private cohort videos…</p>
          : query.isError
            ? <div className="text-xs text-rose-200"><p>Video submissions could not load.</p><Button variant="ghost" onClick={() => query.refetch()} className="mt-1 h-auto px-0 text-rose-200">Retry</Button></div>
            : !query.data?.length
              ? <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-stone-500"><Video className="h-4 w-4" />No cohort clips submitted yet.</div>
              : <div className="grid gap-3 sm:grid-cols-2">
                {query.data.map((video: ShootingCohortVideoSubmission) => (
                  <article key={video.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#151411]">
                    <video controls playsInline preload="metadata" src={video.mediaUrl} className="aspect-video w-full bg-black" aria-label={video.title} />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="break-words text-sm font-semibold text-stone-100">{video.title}</h4>
                        <time className="shrink-0 font-mono text-[9px] text-stone-500">{formatDate(video.createdAt)}</time>
                      </div>
                      {video.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-400">{video.description}</p>}
                    </div>
                  </article>
                ))}
              </div>}
    </section>
  );
}

function ApplicantCard({
  applicant,
  occupiedSeats,
  capacity,
  pending,
  onStatus,
  onRemove,
}: {
  applicant: ShootingCohortAdminApplication;
  occupiedSeats: number;
  capacity: number;
  pending: boolean;
  onStatus: (status: ApplicationStatus) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reservesSeat = applicant.status === "active" || applicant.status === "invited";
  const hasSeatRoom = reservesSeat || occupiedSeats < capacity;
  const focusLabels = applicant.answers.focusAreas.map((focus) => SHOOTING_COHORT_FOCUS_LABELS[focus]);

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#151411] p-4 sm:p-5" data-testid={`shooting-cohort-applicant-${applicant.id}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {applicant.profilePhotoUrl
            ? <img src={applicant.profilePhotoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover" />
            : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-300/15 bg-orange-300/[0.07] font-heading text-lg text-orange-200">{(applicant.displayName || "P").trim().slice(0, 1).toUpperCase()}</span>}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-heading text-lg font-bold text-stone-100">{applicant.displayName || "PLAYR1 player"}</h3>
              <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.09em] ${statusClasses[applicant.status as ApplicationStatus] ?? "border-white/10 text-stone-400"}`}>
                {statusLabels[applicant.status as ApplicationStatus] ?? applicant.status}
              </span>
            </div>
            <p className="mt-1 break-all text-xs text-stone-500">{applicant.email || "No email on file"} <span className="px-1 text-stone-700">/</span> Applied {formatDate(applicant.appliedAt)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {focusLabels.map((focus) => <span key={focus} className="rounded-md border border-orange-300/15 bg-orange-300/[0.04] px-2 py-1 text-[10px] text-orange-100/90">{focus}</span>)}
              <span className="rounded-md border border-white/[0.08] px-2 py-1 font-mono text-[10px] text-stone-400">Confidence {applicant.answers.confidence}/5</span>
            </div>
          </div>
        </div>
        <Button
          size="icon"
          variant="outline"
          aria-label={`Remove ${applicant.displayName || "applicant"}`}
          title="Remove application"
          onClick={onRemove}
          disabled={pending}
          className="h-9 w-9 shrink-0 self-end border-white/10 bg-transparent text-stone-500 hover:border-rose-300/30 hover:bg-rose-300/[0.06] hover:text-rose-200 sm:self-start"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
        {statusActions
          .filter(({ status }) => status !== applicant.status)
          .filter(({ status }) => applicant.status !== "active" || status !== "invited")
          .map(({ status, label }) => {
          const needsSeat = status === "active" || status === "invited";
          const disabledForCapacity = needsSeat && !hasSeatRoom;
          const actionLabel = status === "active" ? "Accept" : status === "invited" ? "Invite" : label;
          return (
            <Button
              key={status}
              size="sm"
              variant={status === "active" || status === "invited" ? "default" : "outline"}
              onClick={() => onStatus(status)}
              disabled={pending || disabledForCapacity}
              title={disabledForCapacity ? "No open seat. Increase capacity or free a reserved seat first." : `${actionLabel} applicant`}
              className={status === "active" || status === "invited"
                ? "h-8 bg-primary px-3 text-[11px] font-bold text-black hover:bg-primary/90"
                : "h-8 border-white/10 bg-transparent px-3 text-[11px] text-stone-300 hover:border-orange-300/30 hover:bg-orange-300/[0.05] hover:text-orange-100"}
            >
              {status === "active" && <Check className="mr-1.5 h-3.5 w-3.5" />}
              {actionLabel}
            </Button>
          );
        })}
        {!hasSeatRoom && <span className="self-center text-[10px] text-stone-600">Capacity reached · reserved seats are protected</span>}
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="mt-3 flex w-full items-center justify-between border-t border-white/[0.07] pt-3 text-left text-xs font-semibold text-stone-400 hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <span className="inline-flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-orange-300" />Private application &amp; assessment review</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="space-y-3 rounded-xl border border-white/[0.07] bg-[#10100e] p-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-200">Application answers · admin only</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <ReviewField label="Practice days" value={applicant.answers.practiceDays.join(", ")} />
              <ReviewField label="Session" value={`${applicant.answers.sessionMinutes} min`} />
              <ReviewField label="Hoop access" value={applicant.answers.hoopAccess} />
              <ReviewField label="Weekly shots" value={applicant.answers.weeklyShots.toLocaleString()} />
              <ReviewField label="Confidence" value={`${applicant.answers.confidence}/5`} />
              <ReviewField label="Focus" value={focusLabels.join(", ")} />
            </div>
            <ReviewField label="Goal" value={applicant.answers.goal} />
            {applicant.answers.currentRoutine && <ReviewField label="Current routine" value={applicant.answers.currentRoutine} />}
          </section>
          <section className="space-y-3 rounded-xl border border-white/[0.07] bg-[#10100e] p-3.5">
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-orange-200"><ShieldCheck className="h-3 w-3" />Admin-only test results</p>
            <AssessmentReview application={applicant} />
          </section>
        </div>
      )}
    </article>
  );
}

function CountTile({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#151411] p-3.5 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-300/[0.08] text-orange-200">{icon}</span>
      <div className="min-w-0">
        <p className="font-heading text-3xl leading-none text-stone-100">{value}</p>
        <p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-stone-500">{label}</p>
      </div>
      <span className="ml-auto hidden text-right text-[9px] leading-4 text-stone-600 sm:block">{note}</span>
    </div>
  );
}

function CohortOverview({
  data,
  capacity,
  goalThreePointPercent,
  goalMidRangePercent,
  goalFreeThrowPercent,
  applicationsOpen,
  setCapacity,
  setGoalThreePointPercent,
  setGoalMidRangePercent,
  setGoalFreeThrowPercent,
  setApplicationsOpen,
  saveSettings,
  saving,
}: {
  data: NonNullable<ReturnType<typeof useShootingCohortAdminQuery>["data"]>;
  capacity: string;
  goalThreePointPercent: string;
  goalMidRangePercent: string;
  goalFreeThrowPercent: string;
  applicationsOpen: boolean;
  setCapacity: (value: string) => void;
  setGoalThreePointPercent: (value: string) => void;
  setGoalMidRangePercent: (value: string) => void;
  setGoalFreeThrowPercent: (value: string) => void;
  setApplicationsOpen: (value: boolean) => void;
  saveSettings: () => void;
  saving: boolean;
}) {
  const active = data.counts.active ?? data.settings.activeCount ?? 0;
  const invited = data.counts.invited ?? data.settings.invitedCount ?? 0;
  const reserved = active + invited;
  const openSeats = Math.max(0, Number(capacity || 0) - reserved);
  return (
    <div className="space-y-5">
      <section aria-label="Cohort statistics" data-testid="cohort-statistics">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold text-stone-100">Cohort Home</h2>
          <p className="font-mono text-[10px] text-stone-500">{reserved} / {capacity || data.settings.capacity} seats committed</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <CountTile icon={<Users className="h-4 w-4" />} label="Accepted" value={data.counts.active} note="In the room" />
          <CountTile icon={<CalendarDays className="h-4 w-4" />} label="Invited" value={data.counts.invited} note="Seat held" />
          <CountTile icon={<Clock3 className="h-4 w-4" />} label="Waitlisted" value={data.counts.waitlisted} note="Oldest first" />
          <CountTile icon={<ClipboardList className="h-4 w-4" />} label="Needs review" value={data.counts.needsReview} note="Manual decision" />
        </div>
      </section>

      <section className="grid gap-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151411] lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]" data-testid="cohort-settings">
        <div className="p-5 sm:p-6">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-200">Program controls</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-stone-100">Set the room size</h2>
          <p className="mt-1 max-w-md text-xs leading-5 text-stone-500">Active players and pending invitations both hold a place in the cohort.</p>
          <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-3">
            <div>
              <label htmlFor="cohort-capacity" className="mb-2 block font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-stone-400">Member capacity · 1–500</label>
              <Input id="cohort-capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="h-11 w-28 border-white/10 bg-[#0d0d0c] px-3 font-mono text-lg text-stone-100 focus-visible:ring-orange-400" />
            </div>
            <div className="pb-1">
              <p className="font-heading text-2xl leading-none text-orange-200">{openSeats}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-stone-500">Open seats</p>
            </div>
          </div>
          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-400">Progress targets · optional</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([
                ["3-point", goalThreePointPercent, setGoalThreePointPercent],
                ["Mid-range", goalMidRangePercent, setGoalMidRangePercent],
                ["Free throw", goalFreeThrowPercent, setGoalFreeThrowPercent],
              ] as const).map(([label, value, setter]) => (
                <label key={label} className="min-w-0">
                  <span className="mb-1 block truncate text-[9px] uppercase tracking-wide text-stone-500">{label}</span>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(event) => setter(event.target.value)}
                      placeholder="—"
                      aria-label={`${label} goal percentage`}
                      className="h-10 border-white/10 bg-[#0d0d0c] pr-7 font-mono text-stone-100 focus-visible:ring-orange-400"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-3 text-xs text-stone-500">%</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 border-t border-white/[0.07] bg-[#11110f] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-stone-500">Application access</p><p className="mt-1 text-sm font-semibold text-stone-100">{applicationsOpen ? "Open to new players" : "Paused for now"}</p></div>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${applicationsOpen ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : "border-white/10 bg-white/[0.03] text-stone-500"}`}>
                {applicationsOpen ? "Accepting" : "Paused"}
              </span>
            </div>
            <button type="button" aria-pressed={applicationsOpen} onClick={() => setApplicationsOpen(!applicationsOpen)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0c0c0b] px-3.5 py-3 text-left transition hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
              <span className="flex items-center gap-3">
                <span className={`relative h-5 w-9 rounded-full transition-colors ${applicationsOpen ? "bg-orange-300/80" : "bg-stone-700"}`}><span className={`absolute top-1 h-3 w-3 rounded-full bg-[#17120d] transition-transform ${applicationsOpen ? "translate-x-5" : "translate-x-1"}`} /></span>
                <span className="text-xs text-stone-300">{applicationsOpen ? "Applications are open" : "Applications are paused"}</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-stone-600">{applicationsOpen ? "On" : "Off"}</span>
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] leading-4 text-stone-600">Changes affect new applications. Existing invitations still hold their reserved seats.</p>
            <Button onClick={saveSettings} disabled={saving} className="h-10 w-full bg-primary font-bold text-black hover:bg-primary/90">
              {saving ? "Saving settings…" : "Save program settings"} <Check className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ApplicationsView({
  applications,
  counts,
  occupiedSeats,
  capacity,
  pending,
  onStatus,
  onRemove,
}: {
  applications: ShootingCohortAdminApplication[];
  counts: { active: number; invited: number; waitlisted: number; needsReview: number };
  occupiedSeats: number;
  capacity: number;
  pending: boolean;
  onStatus: (application: ShootingCohortAdminApplication, status: ApplicationStatus) => void;
  onRemove: (application: ShootingCohortAdminApplication) => void;
}) {
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const filteredApplications = filter === "all" ? applications : applications.filter((application) => application.status === filter);
  const filters: { id: ApplicationFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: applications.length },
    { id: "needs_review", label: "Needs Review", count: counts.needsReview },
    { id: "active", label: "Accepted", count: counts.active },
    { id: "invited", label: "Invited", count: counts.invited },
    { id: "waitlisted", label: "Waitlisted", count: counts.waitlisted },
  ];

  return (
    <section className="space-y-4" data-testid="cohort-application-order">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-200">Applications · oldest first</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-stone-100">Player review</h2>
          <p className="mt-1 text-xs text-stone-500">Private answers and shooting tests are visible to admins only.</p>
        </div>
        <span className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[9px] text-stone-500">{applications.length} total</span>
      </header>
      <nav aria-label="Filter applications by status" className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(({ id, label, count }) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.09em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${filter === id ? "border-orange-300/30 bg-orange-300/[0.08] text-orange-100" : "border-white/[0.07] bg-[#131310] text-stone-500 hover:text-stone-300"}`}>
            {label}<span className={`rounded px-1.5 py-0.5 ${filter === id ? "bg-orange-300/10 text-orange-100" : "bg-white/[0.04] text-stone-600"}`}>{count}</span>
          </button>
        ))}
      </nav>

      {!filteredApplications.length ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#131310] px-5 py-12 text-center">
          <ClipboardList className="mx-auto h-6 w-6 text-orange-200/70" />
          <p className="mt-3 font-heading text-lg font-semibold text-stone-200">{applications.length ? `No ${filter === "all" ? "" : statusLabels[filter as ApplicationStatus].toLowerCase() + " "}applications` : "No applications yet"}</p>
          <p className="mt-1 text-xs text-stone-600">New applications will appear here in the order they arrive.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              occupiedSeats={occupiedSeats}
              capacity={capacity}
              pending={pending}
              onStatus={(status) => onStatus(applicant, status)}
              onRemove={() => onRemove(applicant)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Avatar({ name, imageUrl, isAdmin = false }: { name: string; imageUrl?: string | null; isAdmin?: boolean }) {
  if (imageUrl) return <img src={imageUrl} alt="" className={`h-9 w-9 shrink-0 rounded-full object-cover ${isAdmin ? "border border-orange-200/30" : "border border-white/10"}`} />;
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm ${isAdmin ? "border border-orange-200/25 bg-orange-300/10 text-orange-100" : "border border-white/10 bg-white/[0.04] text-stone-400"}`}>{name.trim().slice(0, 1).toUpperCase() || "P"}</span>;
}

function SharedConversation({
  messages,
  loading,
  error,
  onRetry,
  onSend,
  onRemove,
  sending,
  removing,
  currentUserId,
}: {
  messages: ShootingCohortChatMessage[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSend: (content: string) => Promise<void>;
  onRemove: (message: ShootingCohortChatMessage) => void;
  sending: boolean;
  removing: boolean;
  currentUserId: string;
}) {
  const [messageText, setMessageText] = useState("");
  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );
  const messageListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [orderedMessages.length]);

  const submit = async () => {
    const content = messageText.trim();
    if (!content || sending) return;
    try {
      await onSend(content);
      setMessageText("");
    } catch {
      // Keep the draft available for another attempt; the parent reports the failure.
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121210]" data-testid="cohort-shared-room">
      <header className="relative overflow-hidden border-b border-white/[0.07] px-4 py-4 sm:px-6">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/[0.05] to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-200/15 bg-orange-300/[0.07] text-orange-200"><MessageCircle className="h-5 w-5" /></span>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-200">PLAYR1 · Shared conversation</p>
              <h2 className="mt-0.5 font-heading text-xl font-bold text-stone-100">The shooting room</h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-stone-500"><ShieldCheck className="h-3 w-3 text-orange-200" />Admin moderation</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-[420px] flex-col border-b border-white/[0.07] lg:border-b-0 lg:border-r">
          <div className="border-b border-white/[0.06] px-4 py-2.5 sm:px-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone-600">Notes from players and the PLAYR1 team</p>
          </div>
          <div ref={messageListRef} className="min-h-[320px] max-h-[650px] flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {loading ? (
              <div className="space-y-5" aria-label="Loading shared messages">
                <div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full bg-stone-800" /><Skeleton className="h-20 w-3/4 rounded-2xl bg-stone-800" /></div>
                <div className="ml-auto h-16 w-2/3 rounded-2xl bg-stone-800/80" />
                <div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full bg-stone-800" /><Skeleton className="h-14 w-1/2 rounded-2xl bg-stone-800" /></div>
              </div>
            ) : error ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <MessageCircle className="h-6 w-6 text-stone-600" />
                <p className="mt-3 text-sm font-semibold text-stone-300">The room could not load.</p>
                <p className="mt-1 text-xs text-stone-600">Your messages are still here. Try again.</p>
                <Button variant="ghost" onClick={onRetry} className="mt-2 text-orange-200 hover:bg-orange-200/[0.06] hover:text-orange-100">Retry</Button>
              </div>
            ) : !orderedMessages.length ? (
              <div className="flex min-h-[270px] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-300/[0.06] text-orange-200"><MessageCircle className="h-5 w-5" /></span>
                <p className="mt-3 font-heading text-lg font-semibold text-stone-200">Start the conversation</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-stone-600">Share a cue, a win, or the next thing the group should work on.</p>
              </div>
            ) : orderedMessages.map((message, index) => {
              const isAdminMessage = !!currentUserId && message.senderId === currentUserId;
              const name = isAdminMessage
                ? (message.displayName?.trim() || "PLAYR1 Founder")
                : (message.displayName?.trim() || "PLAYR1 player");
              const previousMessage = orderedMessages[index - 1];
              const startsNewDay = !previousMessage
                || new Date(previousMessage.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              return (
                <div key={message.id}>
                  {startsNewDay && <div className="mb-4 flex items-center gap-3"><span className="h-px flex-1 bg-white/[0.06]" /><time className="font-mono text-[8px] uppercase tracking-[0.14em] text-stone-600">{new Date(message.createdAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</time><span className="h-px flex-1 bg-white/[0.06]" /></div>}
                  <article className={`group flex items-start gap-2.5 ${isAdminMessage ? "justify-end" : ""}`}>
                    {!isAdminMessage && <Avatar name={name} imageUrl={message.profilePhotoUrl} />}
                    <div className={`min-w-0 max-w-[88%] sm:max-w-[78%] ${isAdminMessage ? "items-end" : ""}`}>
                      <div className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${isAdminMessage ? "justify-end" : ""}`}>
                        <span className={`font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${isAdminMessage ? "text-orange-200/80" : "text-stone-400"}`}>{name}</span>
                        <time className="font-mono text-[9px] text-stone-600">{formatDate(message.createdAt, true)}</time>
                      </div>
                      <div className={`relative rounded-2xl px-4 py-3 text-sm leading-6 ${isAdminMessage ? "rounded-tr-md bg-gradient-to-br from-primary to-primary/80 font-medium text-[#1c140d] shadow-[0_8px_24px_hsl(var(--primary)/0.12)]" : "rounded-tl-md border border-white/[0.07] bg-[#1b1a17] text-stone-200"}`}>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                    {isAdminMessage && <Avatar name={name} isAdmin />}
                    <Button size="icon" variant="ghost" aria-label={`Delete message from ${name}`} title="Delete shared message" onClick={() => onRemove(message)} disabled={removing} className={`mt-5 h-8 w-8 shrink-0 text-stone-600 hover:bg-rose-300/[0.06] hover:text-rose-200 ${isAdminMessage ? "order-first sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" : "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col justify-between gap-5 bg-[#10100e] p-4 sm:p-5 lg:min-h-[420px]">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-200">Coach P</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-stone-100">Keep the group moving.</h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">One shared room for cohort members and the PLAYR1 team. Private application answers and test results stay out of this conversation.</p>
          </div>
          <div>
            <label htmlFor="shared-message" className="mb-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-stone-500">Post to the room</label>
            <Textarea
              id="shared-message"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              maxLength={2000}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="Write a note for the cohort…"
              aria-label="Shared shooting cohort message"
              className="min-h-28 max-h-56 resize-y border-white/[0.09] bg-[#0b0b0a] text-sm leading-6 text-stone-200 placeholder:text-stone-700 focus-visible:ring-orange-400"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[9px] leading-4 text-stone-600">Enter to post · Shift + Enter for a new line</span>
              <span className="font-mono text-[9px] text-stone-700">{messageText.length}/2000</span>
            </div>
            <Button onClick={() => void submit()} disabled={!messageText.trim() || sending} className="mt-3 h-10 w-full bg-primary font-bold text-black hover:bg-primary/90">
              {sending ? "Posting…" : "Post to the room"} <Send className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-3 border-t border-white/[0.07] pt-3 text-[9px] leading-4 text-stone-600">Admins can remove shared messages. Player Inbox conversations stay private and separate.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function AdminShootingCohort({ view }: { view: AdminView }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const adminQuery = useShootingCohortAdminQuery();
  const updateSettings = useUpdateShootingCohortSettings();
  const inviteApplicant = useInviteShootingCohortApplicant();
  const setApplicationStatus = useSetShootingCohortApplicationStatus();
  const removeApplication = useRemoveShootingCohortApplication();
  const messagesQuery = useShootingCohortMessagesQuery(view === "conversation");
  const sendMessage = useSendShootingCohortMessage();
  const removeMessage = useRemoveShootingCohortMessage();
  const [capacity, setCapacity] = useState("");
  const [goalThreePointPercent, setGoalThreePointPercent] = useState("");
  const [goalMidRangePercent, setGoalMidRangePercent] = useState("");
  const [goalFreeThrowPercent, setGoalFreeThrowPercent] = useState("");
  const [applicationsOpen, setApplicationsOpen] = useState(true);

  useEffect(() => {
    if (!adminQuery.data) return;
    setCapacity(String(adminQuery.data.settings.capacity));
    setGoalThreePointPercent(adminQuery.data.settings.goalThreePointPercent == null ? "" : String(adminQuery.data.settings.goalThreePointPercent));
    setGoalMidRangePercent(adminQuery.data.settings.goalMidRangePercent == null ? "" : String(adminQuery.data.settings.goalMidRangePercent));
    setGoalFreeThrowPercent(adminQuery.data.settings.goalFreeThrowPercent == null ? "" : String(adminQuery.data.settings.goalFreeThrowPercent));
    setApplicationsOpen(adminQuery.data.settings.applicationsOpen);
  }, [
    adminQuery.data?.settings.capacity,
    adminQuery.data?.settings.goalThreePointPercent,
    adminQuery.data?.settings.goalMidRangePercent,
    adminQuery.data?.settings.goalFreeThrowPercent,
    adminQuery.data?.settings.applicationsOpen,
  ]);

  const applications = useMemo(
    () => [...(adminQuery.data?.applications ?? [])].sort((a, b) => {
      const dateOrder = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      return dateOrder || a.id.localeCompare(b.id);
    }),
    [adminQuery.data?.applications],
  );

  const saveSettings = async () => {
    const number = Number(capacity);
    if (!Number.isInteger(number) || number < 1 || number > 500) {
      toast({ title: "Capacity not saved", description: "Capacity must be a whole number from 1 to 500.", variant: "destructive" });
      return;
    }
    const parseGoal = (value: string) => {
      if (!value.trim()) return null;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : undefined;
    };
    const goals = {
      goalThreePointPercent: parseGoal(goalThreePointPercent),
      goalMidRangePercent: parseGoal(goalMidRangePercent),
      goalFreeThrowPercent: parseGoal(goalFreeThrowPercent),
    };
    if (Object.values(goals).some((value) => value === undefined)) {
      toast({ title: "Targets not saved", description: "Each target must be a whole percentage from 0 to 100, or left blank.", variant: "destructive" });
      return;
    }
    try {
      await updateSettings.mutateAsync({
        capacity: number,
        applicationsOpen,
        goalThreePointPercent: goals.goalThreePointPercent ?? null,
        goalMidRangePercent: goals.goalMidRangePercent ?? null,
        goalFreeThrowPercent: goals.goalFreeThrowPercent ?? null,
      });
      toast({ title: "Cohort settings saved", description: "Capacity, access, and shooting targets are updated." });
    } catch (error) {
      toast({ title: "Settings not saved", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const changeStatus = async (application: ShootingCohortAdminApplication, status: ApplicationStatus) => {
    if (application.status === "active" && status !== "active") {
      const name = application.displayName || "This player";
      if (!window.confirm(`${name} will lose active shooting-cohort access if you change this status. Continue?`)) return;
    }
    try {
      if (application.status === "waitlisted" && status === "invited") {
        await inviteApplicant.mutateAsync(application.id);
        toast({ title: "Invitation sent", description: `${application.displayName || "Player"} has a reserved seat to accept in the portal.` });
        return;
      }
      await setApplicationStatus.mutateAsync({ applicationId: application.id, status });
      toast({ title: "Application updated", description: `${application.displayName || "Player"} is now ${statusLabels[status].toLowerCase()}.` });
    } catch (error) {
      toast({
        title: status === "invited" ? "Invitation not sent" : "Status not changed",
        description: error instanceof Error ? error.message : "Check available capacity and try again.",
        variant: "destructive",
      });
    }
  };

  const remove = async (application: ShootingCohortAdminApplication) => {
    const name = application.displayName || "this player";
    if (!window.confirm(`Remove ${name}'s application from the shooting cohort? This cannot be undone.`)) return;
    try {
      await removeApplication.mutateAsync(application.id);
      toast({ title: "Application removed", description: `${name} no longer has cohort access.` });
    } catch (error) {
      toast({ title: "Could not remove application", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
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

  const send = async (content: string) => {
    try {
      await sendMessage.mutateAsync(content);
      toast({ title: "Message posted", description: "The shooting room has been updated." });
    } catch (error) {
      toast({ title: "Message not sent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
      throw error;
    }
  };

  if (adminQuery.isLoading) {
    return (
      <div className="shooting-cohort-admin space-y-4" aria-label="Loading cohort admin">
        <Skeleton className="h-8 w-52 rounded-lg bg-stone-800" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-20 rounded-xl bg-stone-800" />)}</div>
        <Skeleton className="h-64 rounded-2xl bg-stone-800" />
      </div>
    );
  }

  if (adminQuery.isError || !adminQuery.data) {
    return (
      <section className="shooting-cohort-admin rounded-2xl border border-rose-300/20 bg-rose-300/[0.04] p-6 text-center">
        <p className="font-heading text-lg font-semibold text-rose-200">Cohort management could not load.</p>
        <p className="mt-1 text-xs text-stone-500">The admin data is unavailable right now.</p>
        <Button variant="ghost" onClick={() => void adminQuery.refetch()} className="mt-2 text-rose-200 hover:bg-rose-300/[0.06] hover:text-white">Retry</Button>
      </section>
    );
  }

  const data = adminQuery.data;
  const occupiedSeats = data.counts.active + data.counts.invited;
  const statusPending = inviteApplicant.isPending || setApplicationStatus.isPending || removeApplication.isPending;

  if (view === "cohort") {
    return (
      <div className="shooting-cohort-admin">
        <CohortOverview
          data={data}
          capacity={capacity}
          goalThreePointPercent={goalThreePointPercent}
          goalMidRangePercent={goalMidRangePercent}
          goalFreeThrowPercent={goalFreeThrowPercent}
          applicationsOpen={applicationsOpen}
          setCapacity={setCapacity}
          setGoalThreePointPercent={setGoalThreePointPercent}
          setGoalMidRangePercent={setGoalMidRangePercent}
          setGoalFreeThrowPercent={setGoalFreeThrowPercent}
          setApplicationsOpen={setApplicationsOpen}
          saveSettings={() => void saveSettings()}
          saving={updateSettings.isPending}
        />
      </div>
    );
  }

  if (view === "applications") {
    return (
      <div className="shooting-cohort-admin">
        <ApplicationsView
          applications={applications}
          counts={data.counts}
          occupiedSeats={occupiedSeats}
          capacity={data.settings.capacity}
          pending={statusPending}
          onStatus={(application, status) => void changeStatus(application, status)}
          onRemove={(application) => void remove(application)}
        />
      </div>
    );
  }

  if (view === "film-review") {
    return (
      <div className="shooting-cohort-admin">
        <AdminShootingCohortFilmReview />
      </div>
    );
  }

  return (
    <div className="shooting-cohort-admin">
      <SharedConversation
        messages={messagesQuery.data ?? []}
        loading={messagesQuery.isLoading}
        error={messagesQuery.isError}
        onRetry={() => void messagesQuery.refetch()}
        onSend={send}
        onRemove={(message) => void moderate(message)}
        sending={sendMessage.isPending}
        removing={removeMessage.isPending}
        currentUserId={user?.id == null ? "" : String(user.id)}
      />
    </div>
  );
}
