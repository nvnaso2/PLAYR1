import "./_group.css";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
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
  label: string;
  date: string;
  distance: number;
  freeThrows: number;
  spots: Record<string, number>;
  dribble: Record<string, number>;
  notes?: string;
};

type Applicant = {
  id: string;
  name: string;
  email: string;
  status: "active" | "invited" | "waitlisted";
  appliedAt: string;
  focus: string[];
  confidence: number;
  practiceDays: string[];
  minutes: number;
  hoop: string;
  weeklyShots: number;
  goal: string;
  routine?: string;
  assessments: Assessment[];
};

type RoomMessage = { id: string; name: string; time: string; text: string };

const initialApplicants: Applicant[] = [
  {
    id: "player-01",
    name: "Maya Brooks",
    email: "maya.brooks@example.com",
    status: "active",
    appliedAt: "2025-05-12T09:20:00",
    focus: ["Shot form", "Consistency"],
    confidence: 3,
    practiceDays: ["Monday", "Wednesday", "Saturday"],
    minutes: 45,
    hoop: "Indoor court",
    weeklyShots: 420,
    goal: "Build a repeatable release I can trust late in games.",
    routine: "Form shooting, then spot-ups from five locations.",
    assessments: [{
      id: "maya-baseline",
      label: "Baseline",
      date: "May 13, 2025",
      distance: 15,
      freeThrows: 36,
      spots: { "Left corner": 4, "Left wing": 3, Top: 4, "Right wing": 3, "Right corner": 4 },
      dribble: { Left: 3, Center: 4, Right: 3 },
      notes: "Good balance. Hold the follow-through a beat longer.",
    }],
  },
  {
    id: "player-02",
    name: "Andre Collins",
    email: "andre.collins@example.com",
    status: "active",
    appliedAt: "2025-05-14T11:05:00",
    focus: ["Extend range", "Off the dribble"],
    confidence: 4,
    practiceDays: ["Tuesday", "Thursday", "Sunday"],
    minutes: 60,
    hoop: "Outdoor and school gym",
    weeklyShots: 650,
    goal: "Get comfortable pulling up beyond the arc in transition.",
    routine: "A few hundred makes before team practice.",
    assessments: [{
      id: "andre-baseline",
      label: "Baseline",
      date: "May 15, 2025",
      distance: 22,
      freeThrows: 41,
      spots: { "Left corner": 3, "Left wing": 3, Top: 4, "Right wing": 4, "Right corner": 3 },
      dribble: { Left: 4, Center: 3, Right: 4 },
    }],
  },
  {
    id: "player-03",
    name: "Jalen Price",
    email: "jalen.price@example.com",
    status: "invited",
    appliedAt: "2025-05-16T16:40:00",
    focus: ["Confidence", "Consistency"],
    confidence: 2,
    practiceDays: ["Monday", "Friday"],
    minutes: 35,
    hoop: "Community gym",
    weeklyShots: 300,
    goal: "Stay calm and keep my mechanics when the gym gets loud.",
    assessments: [{
      id: "jalen-baseline",
      label: "Baseline",
      date: "May 17, 2025",
      distance: 15,
      freeThrows: 29,
      spots: { "Left corner": 3, "Left wing": 2, Top: 3, "Right wing": 2, "Right corner": 3 },
      dribble: { Left: 2, Center: 3, Right: 2 },
      notes: "Encourage a consistent pre-shot routine.",
    }],
  },
  {
    id: "player-04",
    name: "Nia Thompson",
    email: "nia.thompson@example.com",
    status: "waitlisted",
    appliedAt: "2025-05-18T13:15:00",
    focus: ["Off the dribble", "Shot form"],
    confidence: 3,
    practiceDays: ["Wednesday", "Friday", "Sunday"],
    minutes: 50,
    hoop: "School court",
    weeklyShots: 510,
    goal: "Create space off one or two dribbles without rushing my shot.",
    routine: "Mid-range pull-ups and catch-and-shoot reps.",
    assessments: [{
      id: "nia-baseline",
      label: "Baseline",
      date: "May 19, 2025",
      distance: 18,
      freeThrows: 34,
      spots: { "Left corner": 4, "Left wing": 3, Top: 3, "Right wing": 4, "Right corner": 3 },
      dribble: { Left: 3, Center: 4, Right: 3 },
    }],
  },
  {
    id: "player-05",
    name: "Cam Ward",
    email: "cam.ward@example.com",
    status: "waitlisted",
    appliedAt: "2025-05-20T08:50:00",
    focus: ["Extend range", "Confidence"],
    confidence: 4,
    practiceDays: ["Tuesday", "Thursday", "Saturday"],
    minutes: 40,
    hoop: "Driveway hoop",
    weeklyShots: 380,
    goal: "Take the same confident shot whether I miss or make the last one.",
    assessments: [],
  },
];

const initialRoom: RoomMessage[] = [
  { id: "msg-1", name: "Maya Brooks", time: "Today, 9:05 AM", text: "Finished the first week. Keeping my elbow stacked feels much more natural already." },
  { id: "msg-2", name: "PLAYR1 team", time: "Today, 11:42 AM", text: "Quick reminder: log your baseline before Friday's session so we can compare the next block." },
];

const statusStyles: Record<Applicant["status"], string> = {
  active: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200",
  invited: "border-orange-300/25 bg-orange-300/[0.08] text-orange-200",
  waitlisted: "border-amber-300/20 bg-amber-300/[0.06] text-amber-100",
};
const statusLabels: Record<Applicant["status"], string> = {
  active: "Active member",
  invited: "Invitation sent",
  waitlisted: "Waitlisted",
};

function ResultLine({ label, value, total }: { label: string; value: number; total: number }) {
  return <div className="flex items-center justify-between gap-3 text-[11px]"><span className="text-[#8d8982]">{label}</span><span className="font-mono text-[#e7a16e]">{value}<span className="text-[#71695f]">/{total}</span></span></div>;
}

function ReviewDetails({ applicant }: { applicant: Applicant }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/[0.07] pt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-[#caa17f] transition hover:text-orange-200">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-orange-400" />Private application &amp; test review</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-xl border border-white/[0.07] bg-[#10100f] p-3.5">
            <p className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-orange-300"><LockKeyhole className="h-3 w-3" />Application answers · private</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              <ReviewAnswer label="Practice days" value={applicant.practiceDays.join(", ")} />
              <ReviewAnswer label="Session" value={`${applicant.minutes} min`} />
              <ReviewAnswer label="Hoop access" value={applicant.hoop} />
              <ReviewAnswer label="Weekly shots" value={applicant.weeklyShots.toLocaleString()} />
              <ReviewAnswer label="Confidence" value={`${applicant.confidence}/5`} />
              <ReviewAnswer label="Focus" value={applicant.focus.join(", ")} />
            </div>
            <div className="mt-3"><ReviewAnswer label="Goal" value={applicant.goal} /></div>
            {applicant.routine && <div className="mt-3"><ReviewAnswer label="Current routine" value={applicant.routine} /></div>}
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#10100f] p-3.5">
            <p className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-orange-300"><Target className="h-3 w-3" />Admin-only shooting tests</p>
            {!applicant.assessments.length
              ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-zinc-500">No shooting tests submitted.</p>
              : <div className="space-y-2">{applicant.assessments.map((test) => {
                const spotTotal = Object.values(test.spots).reduce((sum, score) => sum + score, 0);
                const dribbleTotal = Object.values(test.dribble).reduce((sum, score) => sum + score, 0);
                return <details key={test.id} className="group rounded-lg border border-white/[0.07] bg-[#151514]">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300"><Target className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#eee4d8]">{test.label} · {test.date}</span><span className="mt-0.5 block text-[10px] text-zinc-500">{test.distance} ft · {test.freeThrows + spotTotal + dribbleTotal}/90 makes</span></span>
                    <ChevronDown className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-3 border-t border-white/[0.07] p-3 sm:grid-cols-3">
                    <div><p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-zinc-500">Free throws</p><ResultLine label="Made" value={test.freeThrows} total={50} /></div>
                    <div><p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-zinc-500">Spot-up · /5</p><div className="space-y-1">{Object.entries(test.spots).map(([label, value]) => <ResultLine key={label} label={label} value={value} total={5} />)}</div></div>
                    <div><p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-zinc-500">Off dribble · /5</p><div className="space-y-1">{Object.entries(test.dribble).map(([label, value]) => <ResultLine key={label} label={label} value={value} total={5} />)}</div></div>
                    {test.notes && <p className="text-xs leading-5 text-[#a99b89] sm:col-span-3">{test.notes}</p>}
                  </div>
                </details>;
              })}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewAnswer({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">{label}</p><p className="mt-1 break-words text-[11px] leading-4 text-[#c9c1b7]">{value || "—"}</p></div>;
}

function ApplicantRow({
  applicant,
  canInvite,
  onInvite,
  onRemove,
}: {
  applicant: Applicant;
  canInvite: boolean;
  onInvite: () => void;
  onRemove: () => void;
}) {
  const applied = new Date(applicant.appliedAt);
  const assessmentCount = applicant.assessments.length;
  return (
    <article className="group rounded-2xl border border-white/[0.075] bg-[#151514] p-4 transition-colors hover:border-[#704b31]/60 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5b422f] bg-[#2b1d13] text-sm font-bold text-[#e9a16a]">{applicant.name.split(" ").map((part) => part[0]).join("")}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-[#f0e9df]">{applicant.name}</h3>
            <span className={`rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] ${statusStyles[applicant.status]}`}>{statusLabels[applicant.status]}</span>
          </div>
          <p className="mt-1 break-all text-[11px] text-[#77736d] sm:break-normal">{applicant.email}<span className="px-1.5 text-[#514a42]">·</span>Applied {applied.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{applicant.focus.map((focus) => <span key={focus} className="rounded-md border border-[#62442d]/70 bg-[#271b12] px-2 py-1 text-[9px] text-[#daa579]">{focus}</span>)}<span className="rounded-md border border-white/[0.08] px-2 py-1 font-mono text-[9px] text-zinc-400">Confidence {applicant.confidence}/5</span></div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {applicant.status === "waitlisted" && <button type="button" onClick={onInvite} disabled={!canInvite} title={canInvite ? "Reserve an open seat and send the invitation" : "Increase capacity or wait for an open seat"} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-xs font-bold text-[#21150c] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-3.5 w-3.5" />Invite</button>}
          <button type="button" aria-label={`Remove ${applicant.name}`} onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition hover:border-red-300/30 hover:bg-red-300/[0.06] hover:text-red-200"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500"><ClipboardList className="h-3.5 w-3.5 text-[#aa815e]" />{assessmentCount ? `${assessmentCount} private shooting test${assessmentCount > 1 ? "s" : ""} on file` : "No shooting tests submitted"}</div>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">Applied {applied.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <div className="mt-3"><ReviewDetails applicant={applicant} /></div>
    </article>
  );
}

function Metric({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#131312] p-3.5 sm:p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <div className="min-w-0"><p className="font-heading text-3xl leading-none text-[#f1e9df]">{value}</p><p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-500">{label}</p></div>
      <span className="ml-auto hidden text-right text-[9px] leading-4 text-zinc-600 sm:block">{sub}</span>
    </div>
  );
}

export function DashboardAligned() {
  const [applications, setApplications] = useState(initialApplicants);
  const [room, setRoom] = useState(initialRoom);
  const [capacity, setCapacity] = useState("8");
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [saved, setSaved] = useState(false);
  const sorted = useMemo(() => [...applications].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()), [applications]);
  const active = applications.filter((applicant) => applicant.status === "active").length;
  const invited = applications.filter((applicant) => applicant.status === "invited").length;
  const waitlisted = applications.filter((applicant) => applicant.status === "waitlisted").length;
  const seats = Math.max(0, Number(capacity || 0) - active - invited);

  const inviteApplicant = (id: string) => {
    setApplications((current) => current.map((applicant) => applicant.id === id ? { ...applicant, status: "invited" } : applicant));
  };
  const removeApplicant = (id: string) => {
    const applicant = applications.find((entry) => entry.id === id);
    if (!applicant || !window.confirm(`Remove ${applicant.name} from the shooting cohort?`)) return;
    setApplications((current) => current.filter((entry) => entry.id !== id));
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
  const postMessage = () => {
    const text = messageText.trim();
    if (!text) return;
    setRoom((current) => [...current, { id: `room-${Date.now()}`, name: "PLAYR1 team", time: "Just now", text }]);
    setMessageText("");
  };
  const deleteMessage = (id: string, name: string) => {
    if (!window.confirm(`Delete this shared cohort message from ${name}?`)) return;
    setRoom((current) => current.filter((message) => message.id !== id));
  };

  return (
    <main className="shooting-cohort-admin dark min-h-screen bg-[#090909] px-4 py-5 text-[#f2eee8] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600"><span>PLAYR1</span><span className="text-zinc-800">/</span><span>Admin</span><span className="text-zinc-800">/</span><span className="text-[#d99967]">Programs</span></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-400"><LockKeyhole className="h-3 w-3 text-[#d68a52]" />Founder view</span>
        </div>

        <header className="mb-6 flex flex-col justify-between gap-5 sm:mb-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-400">Player development · program 01</p>
            <h1 className="font-heading text-4xl uppercase leading-none tracking-wide text-[#faf4ec] sm:text-5xl">Shooting cohort</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">Applications, seats, player tests and the shared room—kept in rhythm.</p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-xl border border-[#68472f]/60 bg-[#21170f] px-3.5 py-2.5">
            <span className={`h-2 w-2 rounded-full ${applicationsOpen ? "bg-emerald-400" : "bg-zinc-500"}`} />
            <span className="text-xs font-medium text-[#d8c3ad]">{applicationsOpen ? "Applications open" : "Applications paused"}</span>
            <ArrowUpRight className="ml-2 h-3.5 w-3.5 text-[#d58b54]" />
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Cohort counts">
          <Metric label="Active members" value={active} sub="In the room" tone="bg-emerald-300/[0.08] text-emerald-300" icon={<Users className="h-4 w-4" />} />
          <Metric label="Invited · seat held" value={invited} sub="Awaiting acceptance" tone="bg-orange-300/[0.09] text-orange-300" icon={<Check className="h-4 w-4" />} />
          <Metric label="Waitlist" value={waitlisted} sub="Oldest application first" tone="bg-amber-200/[0.08] text-amber-200" icon={<Clock3 className="h-4 w-4" />} />
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(265px,0.72fr)_minmax(0,1.75fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4">
                <div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-orange-300">Program controls</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#f2e9dc]">Cohort setup</h2></div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/[0.09] text-orange-300"><Users className="h-4 w-4" /></div>
              </div>
              <div className="space-y-5 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="aligned-capacity" className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-400">Member capacity</label><span className="font-mono text-[9px] text-zinc-600">1–500</span></div>
                  <div className="flex items-center gap-3">
                    <input id="aligned-capacity" type="number" min="1" max="500" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="h-11 w-24 rounded-lg border border-white/10 bg-[#0c0c0b] px-3 font-mono text-lg text-[#f3ede5] outline-none transition focus:border-orange-400/60" />
                    <div className="min-w-0"><p className="text-xs text-zinc-300"><span className="font-semibold text-orange-300">{seats}</span> open seats</p><p className="mt-0.5 text-[10px] leading-4 text-zinc-600">After active and invited</p></div>
                  </div>
                </div>
                <div className="border-t border-white/[0.07] pt-4">
                  <div className="mb-2 flex items-center justify-between"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-zinc-400">Applications</p><span className={`font-mono text-[8px] uppercase tracking-[0.12em] ${applicationsOpen ? "text-emerald-300" : "text-zinc-500"}`}>{applicationsOpen ? "Accepting" : "Paused"}</span></div>
                  <button type="button" aria-pressed={applicationsOpen} onClick={() => setApplicationsOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0d0d0c] px-3 py-3 text-left transition hover:border-white/[0.14]">
                    <span className="flex items-center gap-2.5"><span className={`relative h-5 w-9 rounded-full transition-colors ${applicationsOpen ? "bg-emerald-400/70" : "bg-zinc-700"}`}><span className={`absolute top-1 h-3 w-3 rounded-full bg-[#111] transition-transform ${applicationsOpen ? "translate-x-5" : "translate-x-1"}`} /></span><span className="text-xs text-zinc-300">{applicationsOpen ? "Open to new applications" : "Applications paused"}</span></span>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-zinc-600" />
                  </button>
                  <p className="mt-2 text-[10px] leading-4 text-zinc-600">Manual invitations remain available below.</p>
                </div>
                <button type="button" onClick={saveSettings} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-xs font-bold text-[#21150c] transition hover:bg-orange-400">{saved ? "Settings saved" : "Save settings"}<Check className="h-4 w-4" /></button>
              </div>
            </section>
            <section className="rounded-2xl border border-white/[0.07] bg-[#111110] p-4">
              <p className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-500"><ShieldCheck className="h-3.5 w-3.5 text-[#cc8e60]" />Private by default</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">Application answers and shot-test results are visible to admins only. Member conversation stays shared with active players.</p>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.17em] text-orange-300">Applications · oldest first</p><h2 className="mt-1 font-heading text-2xl uppercase leading-none text-[#f3ede5]">Players &amp; waitlist</h2></div>
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[9px] text-zinc-500">{sorted.length} applications</span>
            </div>
            <div className="space-y-3">
              {sorted.map((applicant, index) => (
                <div key={applicant.id} className="relative">
                  <span className="absolute -left-[17px] top-7 hidden h-2 w-2 rounded-full border border-[#9a6239] bg-[#151514] lg:block" />
                  {index < sorted.length - 1 && <span className="absolute -left-[13px] top-9 bottom-[-13px] hidden w-px bg-gradient-to-b from-[#50341f] to-transparent lg:block" />}
                  <ApplicantRow applicant={applicant} canInvite={seats > 0} onInvite={() => inviteApplicant(applicant.id)} onRemove={() => removeApplicant(applicant.id)} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131312]">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#62442d]/60 bg-[#2a1c12] text-orange-300"><MessageCircle className="h-4 w-4" /></span>
              <div><p className="font-mono text-[8px] uppercase tracking-[0.17em] text-orange-300">Shared conversation</p><h2 className="mt-1 font-heading text-2xl uppercase leading-none text-[#f3ede5]">Shooting room</h2><p className="mt-1 text-[10px] text-zinc-600">Moderation · visible to admins &amp; active members</p></div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-zinc-500"><ShieldCheck className="h-3 w-3 text-[#c68b5d]" />Admin moderation</span>
          </header>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="px-4 sm:px-5">
              {!room.length ? <div className="py-10 text-center"><MessageCircle className="mx-auto h-6 w-6 text-zinc-700" /><p className="mt-2 text-xs text-zinc-500">The shooting room has no messages yet.</p></div> : room.map((message) => (
                <article key={message.id} className="flex items-start gap-3 border-b border-white/[0.06] py-4 last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#63472f] bg-[#281b12] text-[10px] font-bold text-[#e4a06c]">{message.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-xs font-semibold text-[#e7dfd4]">{message.name}</span><time className="font-mono text-[8px] text-zinc-600">{message.time}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-400">{message.text}</p></div>
                  <button type="button" aria-label={`Delete message from ${message.name}`} onClick={() => deleteMessage(message.id, message.name)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-red-400/[0.08] hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /></button>
                </article>
              ))}
            </div>
            <div className="border-t border-white/[0.07] bg-[#10100f] p-4 lg:border-l lg:border-t-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-500">Post as PLAYR1 admin</p>
              <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); postMessage(); } }} placeholder="Share a note with the room…" aria-label="Admin shooting cohort message" className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-[#0b0b0a] p-3 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-orange-400/50" />
              <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[9px] text-zinc-600">Enter to post · Shift + Enter for a line</span><button type="button" onClick={postMessage} disabled={!messageText.trim()} aria-label="Send message to shooting room" className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-[#21150c] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
              <p className="mt-4 border-t border-white/[0.07] pt-3 text-[9px] leading-4 text-zinc-600">Only admins can remove shared messages. Individual assessment results remain private to each player and admins.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
