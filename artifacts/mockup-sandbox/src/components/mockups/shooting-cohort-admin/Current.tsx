import "./_group.css";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  MessageCircle,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Users,
} from "lucide-react";

type Assessment = {
  id: string;
  type: "baseline" | "retest";
  createdAt: string;
  distanceFeet: number;
  freeThrowsMade: number;
  spotUpResults: Record<string, number>;
  offDribbleResults: Record<string, number>;
  notes?: string;
};

type Application = {
  id: string;
  displayName: string;
  email: string;
  status: "active" | "waitlisted" | "invited";
  appliedAt: string;
  answers: {
    focusAreas: string[];
    confidence: number;
    practiceDays: string[];
    sessionMinutes: number;
    hoopAccess: string;
    weeklyShots: number;
    goal: string;
    currentRoutine?: string;
  };
  assessments: Assessment[];
};

type CohortMessage = {
  id: string;
  displayName: string;
  createdAt: string;
  content: string;
};

const focusLabels: Record<string, string> = {
  consistency: "Consistency",
  form: "Shot form",
  range: "Extend range",
  offDribble: "Off the dribble",
  confidence: "Confidence",
};

const initialApplications: Application[] = [
  {
    id: "app-101",
    displayName: "Maya Brooks",
    email: "maya.brooks@example.com",
    status: "active",
    appliedAt: "2025-05-12T09:20:00",
    answers: {
      focusAreas: ["form", "consistency"],
      confidence: 3,
      practiceDays: ["Monday", "Wednesday", "Saturday"],
      sessionMinutes: 45,
      hoopAccess: "Indoor court",
      weeklyShots: 420,
      goal: "Build a repeatable release I can trust late in games.",
      currentRoutine: "Form shooting, then spot-ups from five locations.",
    },
    assessments: [{
      id: "test-maya-1",
      type: "baseline",
      createdAt: "2025-05-13T14:10:00",
      distanceFeet: 15,
      freeThrowsMade: 36,
      spotUpResults: { leftCorner: 4, leftWing: 3, top: 4, rightWing: 3, rightCorner: 4 },
      offDribbleResults: { left: 3, center: 4, right: 3 },
      notes: "Good balance. Hold follow-through a beat longer.",
    }],
  },
  {
    id: "app-102",
    displayName: "Andre Collins",
    email: "andre.collins@example.com",
    status: "active",
    appliedAt: "2025-05-14T11:05:00",
    answers: {
      focusAreas: ["range", "offDribble"],
      confidence: 4,
      practiceDays: ["Tuesday", "Thursday", "Sunday"],
      sessionMinutes: 60,
      hoopAccess: "Outdoor and school gym",
      weeklyShots: 650,
      goal: "Get comfortable pulling up beyond the arc in transition.",
      currentRoutine: "A few hundred makes before team practice.",
    },
    assessments: [{
      id: "test-andre-1",
      type: "baseline",
      createdAt: "2025-05-15T08:35:00",
      distanceFeet: 22,
      freeThrowsMade: 41,
      spotUpResults: { leftCorner: 3, leftWing: 3, top: 4, rightWing: 4, rightCorner: 3 },
      offDribbleResults: { left: 4, center: 3, right: 4 },
    }],
  },
  {
    id: "app-103",
    displayName: "Jalen Price",
    email: "jalen.price@example.com",
    status: "invited",
    appliedAt: "2025-05-16T16:40:00",
    answers: {
      focusAreas: ["confidence", "consistency"],
      confidence: 2,
      practiceDays: ["Monday", "Friday"],
      sessionMinutes: 35,
      hoopAccess: "Community gym",
      weeklyShots: 300,
      goal: "Stay calm and keep my mechanics when the gym gets loud.",
    },
    assessments: [{
      id: "test-jalen-1",
      type: "baseline",
      createdAt: "2025-05-17T10:00:00",
      distanceFeet: 15,
      freeThrowsMade: 29,
      spotUpResults: { leftCorner: 3, leftWing: 2, top: 3, rightWing: 2, rightCorner: 3 },
      offDribbleResults: { left: 2, center: 3, right: 2 },
      notes: "Encourage a consistent pre-shot routine.",
    }],
  },
  {
    id: "app-104",
    displayName: "Nia Thompson",
    email: "nia.thompson@example.com",
    status: "waitlisted",
    appliedAt: "2025-05-18T13:15:00",
    answers: {
      focusAreas: ["offDribble", "form"],
      confidence: 3,
      practiceDays: ["Wednesday", "Friday", "Sunday"],
      sessionMinutes: 50,
      hoopAccess: "School court",
      weeklyShots: 510,
      goal: "Create space off one or two dribbles without rushing my shot.",
      currentRoutine: "Mid-range pull-ups and catch-and-shoot reps.",
    },
    assessments: [{
      id: "test-nia-1",
      type: "baseline",
      createdAt: "2025-05-19T12:25:00",
      distanceFeet: 18,
      freeThrowsMade: 34,
      spotUpResults: { leftCorner: 4, leftWing: 3, top: 3, rightWing: 4, rightCorner: 3 },
      offDribbleResults: { left: 3, center: 4, right: 3 },
    }],
  },
  {
    id: "app-105",
    displayName: "Cam Ward",
    email: "cam.ward@example.com",
    status: "waitlisted",
    appliedAt: "2025-05-20T08:50:00",
    answers: {
      focusAreas: ["range", "confidence"],
      confidence: 4,
      practiceDays: ["Tuesday", "Thursday", "Saturday"],
      sessionMinutes: 40,
      hoopAccess: "Driveway hoop",
      weeklyShots: 380,
      goal: "Take the same confident shot whether I miss or make the last one.",
    },
    assessments: [],
  },
];

const initialMessages: CohortMessage[] = [
  {
    id: "chat-1",
    displayName: "Maya Brooks",
    createdAt: "2025-05-21T09:05:00",
    content: "Finished the first week. Keeping my elbow stacked feels much more natural already.",
  },
  {
    id: "chat-2",
    displayName: "PLAYR1 team",
    createdAt: "2025-05-21T11:42:00",
    content: "Quick reminder: log your baseline before Friday's session so we can compare the next block.",
  },
];

const spotLabels: Record<string, string> = {
  leftCorner: "Left corner",
  leftWing: "Left wing",
  top: "Top",
  rightWing: "Right wing",
  rightCorner: "Right corner",
};
const dribbleLabels: Record<string, string> = { left: "Left", center: "Center", right: "Right" };
const statusLabels: Record<Application["status"], string> = {
  active: "Active member",
  invited: "Invitation sent",
  waitlisted: "Waitlisted",
};

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#817567]">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[#d3c5b3]">{value || "—"}</p>
    </div>
  );
}

function AssessmentReview({ application }: { application: Application }) {
  if (!application.assessments.length) {
    return <p className="rounded-xl bg-black/20 p-3 text-xs text-[#85796a]">No shooting tests submitted.</p>;
  }
  const tests = [...application.assessments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return (
    <div className="space-y-2">
      {tests.map((test, index) => {
        const spotMade = Object.values(test.spotUpResults).reduce((sum, score) => sum + score, 0);
        const dribbleMade = Object.values(test.offDribbleResults).reduce((sum, score) => sum + score, 0);
        return (
          <details key={test.id} className="group rounded-xl border border-[#493c2e] bg-[#110f0c]">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d87d3e]/10 text-[#e69a60]"><Target className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[#e7dac8]">{test.type === "baseline" ? "Baseline" : `Retest ${tests.length - index}`} · {new Date(test.createdAt).toLocaleDateString()}</span>
                <span className="mt-0.5 block text-[10px] text-[#827566]">{test.distanceFeet} ft · {test.freeThrowsMade + spotMade + dribbleMade}/90 makes</span>
              </span>
              <ChevronDown className="h-4 w-4 text-[#8c7a66] transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t border-[#382f25] px-3 pb-3 pt-3 sm:grid-cols-3">
              <p className="flex justify-between gap-2 text-xs text-[#b8ab9c]"><span>Free throws</span><span className="font-mono text-[#e89a5c]">{test.freeThrowsMade}/50</span></p>
              <div>
                <p className="flex justify-between gap-2 text-xs text-[#b8ab9c]"><span>Spot-up</span><span className="font-mono text-[#e89a5c]">{spotMade}/25</span></p>
                <div className="mt-2 space-y-1">{Object.entries(test.spotUpResults).map(([key, value]) => <p key={key} className="flex justify-between gap-2 text-[10px] text-[#827566]"><span>{spotLabels[key] ?? key}</span><span className="font-mono text-[#b8ab9c]">{value}/5</span></p>)}</div>
              </div>
              <div>
                <p className="flex justify-between gap-2 text-xs text-[#b8ab9c]"><span>Off the dribble</span><span className="font-mono text-[#e89a5c]">{dribbleMade}/15</span></p>
                <div className="mt-2 space-y-1">{Object.entries(test.offDribbleResults).map(([key, value]) => <p key={key} className="flex justify-between gap-2 text-[10px] text-[#827566]"><span>{dribbleLabels[key] ?? key}</span><span className="font-mono text-[#b8ab9c]">{value}/5</span></p>)}</div>
              </div>
              {test.notes && <p className="whitespace-pre-wrap text-xs leading-5 text-[#a99b89] sm:col-span-3">{test.notes}</p>}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function ApplicantCard({
  applicant,
  canInvite,
  onInvite,
  onRemove,
}: {
  applicant: Application;
  canInvite: boolean;
  onInvite: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const badgeTone = applicant.status === "active"
    ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"
    : applicant.status === "invited"
      ? "border-orange-300/20 bg-orange-300/[0.06] text-orange-200"
      : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100";
  return (
    <article className="rounded-2xl border border-[#44382c] bg-[#191511] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-[#f0e3d2]">{applicant.displayName}</h3>
            <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${badgeTone}`}>{statusLabels[applicant.status]}</span>
          </div>
          <p className="mt-1 truncate text-xs text-[#827566]">{applicant.email} <span className="px-1 text-[#574c3f]">/</span> Applied {new Date(applicant.appliedAt).toLocaleDateString()}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {applicant.answers.focusAreas.map((focus) => <span key={focus} className="rounded-md border border-[#55402e] bg-[#241a12] px-2 py-1 text-[10px] text-[#d7a273]">{focusLabels[focus]}</span>)}
            <span className="rounded-md border border-[#39322a] px-2 py-1 font-mono text-[10px] text-[#a99b89]">Confidence {applicant.answers.confidence}/5</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {applicant.status === "waitlisted" && <button type="button" title={canInvite ? "Reserve an open seat and send the invitation" : "Increase capacity or wait for an open seat"} onClick={onInvite} disabled={!canInvite} className="inline-flex h-9 items-center rounded-md bg-[#ef8a43] px-3 text-sm font-bold text-[#21150c] transition hover:bg-[#ff9e5b] disabled:cursor-not-allowed disabled:opacity-40"><Check className="mr-1.5 h-3.5 w-3.5" />Invite</button>}
          <button type="button" aria-label={`Remove ${applicant.displayName}`} onClick={onRemove} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#56453a] text-[#b79d83] transition hover:border-red-300/40 hover:bg-red-300/5 hover:text-red-200"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-4 flex w-full items-center justify-between border-t border-[#382f25] pt-3 text-left text-xs font-semibold text-[#ba9b7d] hover:text-[#f0b17d]">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />Private application &amp; assessment review</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-3 rounded-xl border border-[#3e342a] bg-[#110f0c] p-3.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d89257]">Application answers · private</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <ReviewField label="Practice days" value={applicant.answers.practiceDays.join(", ")} />
            <ReviewField label="Session" value={`${applicant.answers.sessionMinutes} min`} />
            <ReviewField label="Hoop access" value={applicant.answers.hoopAccess} />
            <ReviewField label="Weekly shots" value={applicant.answers.weeklyShots.toLocaleString()} />
            <ReviewField label="Confidence" value={`${applicant.answers.confidence}/5`} />
            <ReviewField label="Focus" value={applicant.answers.focusAreas.map((focus) => focusLabels[focus]).join(", ")} />
          </div>
          <ReviewField label="Goal" value={applicant.answers.goal} />
          {applicant.answers.currentRoutine && <ReviewField label="Current routine" value={applicant.answers.currentRoutine} />}
        </div>
        <div className="space-y-3 rounded-xl border border-[#3e342a] bg-[#110f0c] p-3.5">
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d89257]"><LockKeyhole className="h-3 w-3" />Admin-only test results</p>
          <AssessmentReview application={applicant} />
        </div>
      </div>}
    </article>
  );
}

function ModerationRow({ message, onRemove }: { message: CohortMessage; onRemove: () => void }) {
  return (
    <article className="flex items-start gap-3 border-b border-[#332c24] py-3 last:border-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5d422d] bg-[#261a11] text-xs font-bold text-[#e9a16a]">{message.displayName.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-xs font-semibold text-[#e4d7c7]">{message.displayName}</p><time className="font-mono text-[9px] text-[#74695d]">{new Date(message.createdAt).toLocaleString()}</time></div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-[#bbae9d]">{message.content}</p>
      </div>
      <button type="button" aria-label={`Delete message from ${message.displayName}`} onClick={onRemove} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8e7c68] hover:bg-red-300/10 hover:text-red-200"><Trash2 className="h-4 w-4" /></button>
    </article>
  );
}

function CountTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#48392b] bg-[#17120e] p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c47842]/10 text-[#e39a61]">{icon}</span>
      <div><p className="font-heading text-2xl leading-none text-[#f5e6d3]">{value}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.13em] text-[#887969]">{label}</p></div>
    </div>
  );
}

export function Current() {
  const [applications, setApplications] = useState(initialApplications);
  const [messages, setMessages] = useState(initialMessages);
  const [capacity, setCapacity] = useState("8");
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [saved, setSaved] = useState(false);
  const sortedApplications = useMemo(
    () => [...applications].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()),
    [applications],
  );
  const activeCount = applications.filter((application) => application.status === "active").length;
  const invitedCount = applications.filter((application) => application.status === "invited").length;
  const waitlistedCount = applications.filter((application) => application.status === "waitlisted").length;
  const availableSeats = Math.max(0, Number(capacity || 0) - activeCount - invitedCount);

  const invite = (id: string) => {
    setApplications((current) => current.map((application) => application.id === id ? { ...application, status: "invited" } : application));
  };
  const removeApplication = (id: string) => {
    const applicant = applications.find((application) => application.id === id);
    if (!applicant || !window.confirm(`Remove ${applicant.displayName} from the shooting cohort?`)) return;
    setApplications((current) => current.filter((application) => application.id !== id));
  };
  const saveSettings = () => {
    const value = Number(capacity);
    if (!Number.isInteger(value) || value < 1 || value > 500) {
      window.alert("Capacity must be a whole number from 1 to 500.");
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const sendMessage = () => {
    const content = messageText.trim();
    if (!content) return;
    setMessages((current) => [...current, {
      id: `chat-${Date.now()}`,
      displayName: "PLAYR1 team",
      createdAt: new Date().toISOString(),
      content,
    }]);
    setMessageText("");
  };

  return (
    <main className="shooting-cohort-admin dark min-h-screen space-y-5 bg-[#090909] p-4 text-[#eee7df] sm:space-y-6 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <header className="space-y-4">
          <div>
            <p className="font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Program controls</p>
            <h1 className="mt-1 font-heading text-3xl uppercase tracking-wide text-white sm:text-4xl">Shooting cohort</h1>
            <p className="mt-1 text-sm leading-5 text-zinc-500">Manage capacity, invitations, private tests, and the shared member room.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#5b4934] bg-white/[0.03] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d5b08d]"><LockKeyhole className="h-3 w-3" />Admin controls</div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Cohort member counts">
          <CountTile icon={<Users className="h-4 w-4" />} label="Active" value={activeCount} />
          <CountTile icon={<CalendarDays className="h-4 w-4" />} label="Invited · seat held" value={invitedCount} />
          <CountTile icon={<CalendarDays className="h-4 w-4" />} label="Waitlist" value={waitlistedCount} />
        </section>

        <section className="rounded-[24px] border border-[#493a2c] bg-[#21180f] p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Program setup</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">Cohort settings</h2></div>
            <span className="rounded-full border border-[#5b4934] bg-black/20 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d5b08d]">{availableSeats} open seats</span>
          </div>
          <div className="mt-4 grid gap-4 rounded-2xl border border-[#493b2c] bg-[#17130f] p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="current-capacity" className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#b9a58e]">Member capacity</label>
                <input id="current-capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="h-10 w-full max-w-40 rounded-md border border-[#493e32] bg-[#100e0b] px-3 font-mono text-white outline-none focus:border-orange-400" />
                <p className="text-[10px] text-[#817567]">{availableSeats} open seats after active and invited reservations</p>
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#b9a58e]">Applications</p>
                <button type="button" aria-pressed={applicationsOpen} onClick={() => setApplicationsOpen((open) => !open)} className={`mt-2 flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-xs font-semibold transition ${applicationsOpen ? "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-200" : "border-[#55483a] bg-[#100e0b] text-[#aa9c8a]"}`}>
                  <span className={`relative h-4 w-7 rounded-full transition ${applicationsOpen ? "bg-emerald-300/70" : "bg-[#50463c]"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#100e0b] transition-transform ${applicationsOpen ? "translate-x-3.5" : "translate-x-0.5"}`} /></span>
                  {applicationsOpen ? "Open to new applications" : "Paused"}
                </button>
                <p className="mt-1.5 text-[10px] text-[#817567]">Manual invitations remain managed below.</p>
              </div>
            </div>
            <button type="button" onClick={saveSettings} className="inline-flex h-10 items-center justify-center rounded-md bg-[#ef8a43] px-4 text-sm font-bold text-[#21150c] transition hover:bg-[#ff9e5b]">{saved ? "Settings saved" : "Save settings"} <Check className="ml-2 h-4 w-4" /></button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Application order</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#f3e5d3]">Players &amp; waitlist</h2></div>
            <p className="text-[10px] text-[#827566]">Oldest application first · invitations reserve an open seat</p>
          </div>
          {!sortedApplications.length
            ? <div className="rounded-2xl border border-dashed border-[#4d4032] bg-[#17130f] px-5 py-10 text-center"><Users className="mx-auto h-6 w-6 text-[#99734f]" /><p className="mt-3 text-sm font-semibold text-[#dfd0bd]">No cohort applications yet</p><p className="mt-1 text-xs text-[#817567]">Applications will appear here in the order they arrive.</p></div>
            : <div className="space-y-3">{sortedApplications.map((applicant) => <ApplicantCard key={applicant.id} applicant={applicant} canInvite={availableSeats > 0} onInvite={() => invite(applicant.id)} onRemove={() => removeApplication(applicant.id)} />)}</div>}
        </section>

        <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#382e24] pb-4">
            <div><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]"><MessageCircle className="h-3.5 w-3.5" />Shared conversation</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#f3e5d3]">Shooting room moderation</h2></div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4d4032] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#a79783]"><ShieldCheck className="h-3 w-3" />Admins &amp; active members</span>
          </div>
          {!messages.length ? <div className="py-8 text-center text-sm text-[#817567]">The shooting room has no messages yet.</div> : <div className="mt-2">{messages.map((message) => <ModerationRow key={message.id} message={message} onRemove={() => {
            if (window.confirm("Delete this shared cohort message?")) setMessages((current) => current.filter((item) => item.id !== message.id));
          }} />)}</div>}
          <div className="mt-3 flex items-end gap-2 border-t border-[#382e24] pt-3">
            <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Post as PLAYR1 admin…" aria-label="Admin shooting cohort message" className="min-h-10 max-h-28 min-w-0 flex-1 resize-y rounded-md border border-[#493e32] bg-[#100e0b] px-3 py-2 text-sm text-[#f3e6d5] placeholder:text-[#675d51] outline-none focus:border-orange-400" />
            <button type="button" onClick={sendMessage} disabled={!messageText.trim()} aria-label="Send message to shooting room" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ef8a43] text-[#21150c] transition hover:bg-[#ff9e5b] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          <p className="mt-3 border-t border-[#382e24] pt-3 text-[10px] leading-5 text-[#776b5e]">Only admins can remove shared messages. Individual assessment results remain private to each player and admins.</p>
        </section>
      </div>
    </main>
  );
}
