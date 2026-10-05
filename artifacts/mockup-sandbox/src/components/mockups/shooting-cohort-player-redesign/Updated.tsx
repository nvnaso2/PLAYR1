import "./_group.css";
import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CirclePlay,
  ClipboardList,
  Clock3,
  Dumbbell,
  Film,
  LockKeyhole,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";

type Area = "requests" | "film-room" | "messaging" | "baseline" | "workouts" | "analytics";
type Conversation = "group" | "coach";
type ChatMessage = { id: number; from: string; time: string; body: string; kind: "coach" | "member" | "you" };

const areas: { id: Area; label: string; icon: typeof ClipboardList; short: string }[] = [
  { id: "requests", label: "Requests", icon: ClipboardList, short: "01" },
  { id: "film-room", label: "Film Room", icon: Film, short: "02" },
  { id: "messaging", label: "Messaging", icon: MessageCircle, short: "03" },
  { id: "baseline", label: "Baseline assessment", icon: Target, short: "04" },
  { id: "workouts", label: "Workouts", icon: Dumbbell, short: "05" },
  { id: "analytics", label: "Analytics", icon: Activity, short: "06" },
];

const openingMessages: Record<Conversation, ChatMessage[]> = {
  group: [
    { id: 1, from: "Coach P", time: "9:18 AM", body: "This week, stay patient through the dip. Upload one clip when your footwork feels repeatable — not just when a shot goes in.", kind: "coach" },
    { id: 2, from: "Maya Brooks", time: "9:42 AM", body: "The pause before my second step is helping a lot. Got a clean set from the right wing this morning.", kind: "member" },
    { id: 3, from: "Andre Collins", time: "10:06 AM", body: "Same here. Keeping my eyes on the rim through the gather was the cue I needed.", kind: "member" },
    { id: 4, from: "Coach P", time: "10:12 AM", body: "Good work. Keep the cue simple and give your body enough reps to trust it. We'll build from there.", kind: "coach" },
  ],
  coach: [
    { id: 5, from: "Coach P", time: "Yesterday · 4:36 PM", body: "I watched your right-wing clips. Your base is much quieter on the last three reps. Let’s keep that same pace when you add the dribble back in.", kind: "coach" },
    { id: 6, from: "You", time: "Yesterday · 5:02 PM", body: "That makes sense. I was rushing the gather when I tried to speed up. Should I stay at three dribbles for now?", kind: "you" },
    { id: 7, from: "Coach P", time: "Yesterday · 5:17 PM", body: "Yes — three controlled dribbles, then one balanced stop. When that feels automatic, add pace. Send me another set after Friday’s workout.", kind: "coach" },
  ],
};

function CoachMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-full border border-[#ffd2ad] bg-[linear-gradient(145deg,#ffb16e,#ef743b_58%,#bd4b2c)] font-bold text-[#392115] shadow-[inset_0_1px_2px_rgba(255,255,255,.55),0_4px_12px_rgba(197,83,43,.16)] ${small ? "h-8 w-8 text-[9px]" : "h-10 w-10 text-[10px]"}`} aria-label="Coach P">CP</span>
  );
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dcd6c8] pb-5">
    <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.17em] text-[#bf6039]">{eyebrow}</p><h2 className="mt-1 font-['Bebas_Neue'] text-4xl uppercase leading-none tracking-[.025em] text-[#183b32] sm:text-[44px]">{title}</h2><p className="mt-2 max-w-xl text-[13px] leading-5 text-[#77766b]">{detail}</p></div>
    {action}
  </div>;
}

function PrimaryButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#df7142] px-4 py-2 text-[12px] font-bold text-[#fff9f0] shadow-[0_5px_14px_rgba(190,86,48,.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#ca6035] disabled:cursor-not-allowed disabled:opacity-45">{children}</button>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.kind === "coach") return <div className="flex items-start gap-2.5 py-1.5">
    <CoachMark small />
    <div className="max-w-[88%] min-w-0 sm:max-w-[74%]">
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#b65430]"><span>Coach P</span><span className="h-px w-7 bg-[#db8056]/45" /></div>
      <div className="rounded-[18px] rounded-tl-[5px] border border-[#e8dfd0] bg-[#faf8f2] px-4 py-3 text-[13px] leading-[1.6] text-[#35463d] shadow-[0_3px_12px_rgba(63,66,48,.035)]">{message.body}<p className="mt-1.5 font-mono text-[9px] tracking-wide text-[#a39c8e]">{message.time}</p></div>
    </div>
  </div>;
  if (message.kind === "you") return <div className="flex justify-end py-1.5"><div className="max-w-[88%] rounded-[18px] rounded-tr-[5px] bg-[linear-gradient(135deg,#f6a167,#e17845)] px-4 py-3 text-[13px] leading-[1.6] text-[#3a2419] shadow-[0_6px_18px_rgba(208,105,58,.13)] sm:max-w-[72%]">{message.body}<p className="mt-1.5 text-right font-mono text-[9px] tracking-wide text-[#71442f]/65">{message.time}</p></div></div>;
  const initials = message.from.split(" ").map((part) => part[0]).join("");
  return <div className="flex items-start gap-2.5 py-1.5"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9e1d6] bg-[#e7ede5] text-[9px] font-bold text-[#47604e]">{initials}</span><div className="max-w-[88%] sm:max-w-[74%]"><div className="mb-1 flex items-center gap-2"><span className="text-[10px] font-semibold text-[#55705d]">{message.from}</span><time className="font-mono text-[9px] text-[#a39c8e]">{message.time}</time></div><p className="rounded-[18px] rounded-tl-[5px] border border-[#e2e4d9] bg-[#f0f1e9] px-4 py-3 text-[13px] leading-[1.6] text-[#35463d]">{message.body}</p></div></div>;
}

export function Updated() {
  const [activeArea, setActiveArea] = useState<Area>("messaging");
  const [conversation, setConversation] = useState<Conversation>("group");
  const [messages, setMessages] = useState<Record<Conversation, ChatMessage[]>>(openingMessages);
  const [draft, setDraft] = useState("");
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyAnswer, setSurveyAnswer] = useState("Build a more repeatable pull-up from either wing.");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requests, setRequests] = useState([{ title: "Shooting off the dribble", note: "Build a quicker, repeatable pull-up from either wing.", status: "Assigned · One-Dribble Pull-Up Series", date: "MAY 21" }]);
  const [showRetestForm, setShowRetestForm] = useState(false);
  const [scores, setScores] = useState([20, 25, 15]);
  const [retestInputs, setRetestInputs] = useState(["", "", ""]);
  const [completed, setCompleted] = useState([true, false]);
  const [openClip, setOpenClip] = useState<number | null>(null);

  const sendMessage = () => {
    const body = draft.trim();
    if (!body) return;
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((current) => ({ ...current, [conversation]: [...current[conversation], { id: Date.now(), from: "You", time: now, body, kind: "you" }] }));
    setDraft("");
  };
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  };
  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = requestText.trim();
    if (!title) return;
    setRequests((current) => [{ title, note: "Your request has been added for Coach P to review.", status: "Submitted · awaiting coach review", date: "JUST NOW" }, ...current]);
    setRequestText("");
    setShowRequestForm(false);
  };
  const saveRetest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextScores = retestInputs.map((value, index) => value.trim() ? Number(value) : scores[index]);
    setScores(nextScores);
    setShowRetestForm(false);
    setRetestInputs(["", "", ""]);
  };
  const saveSurvey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowSurvey(false);
  };
  const openFounderThread = () => {
    setActiveArea("messaging");
    setConversation("coach");
    document.getElementById("cohort-area-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goToCohortAreas = () => document.getElementById("cohort-area-nav")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return <main className="shooting-cohort-player-updated relative min-h-[100dvh] overflow-hidden bg-[#eeece3] px-4 pb-10 pt-4 text-[#24382f] sm:px-7 sm:pt-7">
    <style>{`
      .shooting-cohort-player-updated {
        color-scheme: dark;
        background: #100e0b !important;
        color: #f4eadb !important;
      }
      .shooting-cohort-player-updated [class*="bg-[#"] {
        background-color: #171411 !important;
      }
      .shooting-cohort-player-updated [class*="bg-[#df7142]"],
      .shooting-cohort-player-updated [class*="bg-[#e47745]"],
      .shooting-cohort-player-updated [class*="bg-[#d97948]"],
      .shooting-cohort-player-updated [class*="bg-[#cd6237]"],
      .shooting-cohort-player-updated [class*="bg-[#ca6035]"] {
        background-color: #ef854b !important;
      }
      .shooting-cohort-player-updated [class*="bg-[#21463a]"] {
        background-color: #e77b43 !important;
        color: #28170f !important;
      }
      .shooting-cohort-player-updated [class*="bg-[#1d4136]"] {
        background-color: #ef854b !important;
        color: #28170f !important;
      }
      .shooting-cohort-player-updated [class*="ring-[#"] {
        --tw-ring-color: rgb(239 133 75 / 34%) !important;
      }
      .shooting-cohort-player-updated [class*="border-[#"] {
        border-color: #42372b !important;
      }
      .shooting-cohort-player-updated [class*="border-[#ffd2ad]"] {
        border-color: #ffd2ad !important;
      }
      .shooting-cohort-player-updated [class*="text-[#1"],
      .shooting-cohort-player-updated [class*="text-[#2"],
      .shooting-cohort-player-updated [class*="text-[#3"],
      .shooting-cohort-player-updated [class*="text-[#4"],
      .shooting-cohort-player-updated [class*="text-[#5"],
      .shooting-cohort-player-updated [class*="text-[#6"] {
        color: #eee3d2 !important;
      }
      .shooting-cohort-player-updated [class*="text-[#7"],
      .shooting-cohort-player-updated [class*="text-[#8"],
      .shooting-cohort-player-updated [class*="text-[#9"],
      .shooting-cohort-player-updated [class*="text-[#a"] {
        color: #aaa08f !important;
      }
      .shooting-cohort-player-updated [class*="text-[#a95e3a]"],
      .shooting-cohort-player-updated [class*="text-[#a9633e]"],
      .shooting-cohort-player-updated [class*="text-[#b"] {
        color: #e8945c !important;
      }
      .shooting-cohort-player-updated [class*="text-[#b1a493]"] {
        color: #aaa08f !important;
      }
      .shooting-cohort-player-updated [class*="bg-[#ef"],
      .shooting-cohort-player-updated [class*="bg-[#d8"],
      .shooting-cohort-player-updated [class*="bg-[#e4"],
      .shooting-cohort-player-updated [class*="bg-[#ed"] {
        background-color: #241c16 !important;
      }
      .shooting-cohort-player-updated [class*="bg-[#ef854b]"],
      .shooting-cohort-player-updated [class*="bg-[#e47745]"],
      .shooting-cohort-player-updated [class*="bg-[#d97948]"] {
        background-color: #ef854b !important;
      }
      .shooting-cohort-player-updated [class*="shadow-"] {
        --tw-shadow-color: rgb(0 0 0 / 28%);
      }
    `}</style>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.22]" style={{ backgroundImage: "radial-gradient(#a9a18e .65px, transparent .65px)", backgroundSize: "8px 8px" }} />
    <div className="relative mx-auto max-w-[1240px]">
      <header className="overflow-hidden rounded-[28px] border border-[#dcd6c8] bg-[#f7f5ed] px-5 py-6 shadow-[0_16px_55px_rgba(62,67,48,.055)] sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-[#bf6039]">Founder-led shooting cohort <span className="px-1 text-[#c7b9a6]">/</span> Week 02</p><h1 className="mt-2 font-['Bebas_Neue'] text-[46px] uppercase leading-[.9] tracking-[.025em] text-[#1d3e34] sm:text-[62px]">Build an <span className="text-[#dd7041]">Effortless Shot</span></h1></div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowSurvey((open) => !open)} aria-expanded={showSurvey} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#df7142] px-4 py-2 text-[11px] font-bold text-[#fff9f0] transition hover:-translate-y-0.5 hover:bg-[#ca6035]">{showSurvey ? <X className="h-3.5 w-3.5"/> : <ClipboardList className="h-3.5 w-3.5"/>}{showSurvey ? "Close survey" : "Edit interest survey"}</button>
            <button type="button" onClick={openFounderThread} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#68482e] bg-[#17130f] px-4 py-2 text-[11px] font-semibold text-[#f0b17d] transition hover:bg-[#352416]"><MessageCircle className="h-3.5 w-3.5"/>Message Founder</button>
            <button type="button" onClick={goToCohortAreas} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium text-[#a99b89] transition hover:bg-white/[.05] hover:text-[#fff1de]">Hub <ArrowRight className="h-3.5 w-3.5"/></button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-0 border-t border-[#42372b] pt-4 sm:grid-cols-[.72fr_1fr_1.15fr]">
          <div className="flex items-center justify-between gap-3 border-b border-[#42372b] py-3 sm:border-b-0 sm:border-r sm:pr-5"><div><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#a99b89]">Remaining spots</p><p className="mt-1 text-[10px] text-[#877d6d]">of 12 total</p></div><p className="font-['Bebas_Neue'] text-[34px] leading-none text-[#f2a365]">3</p></div>
          <div className="flex items-center gap-3 border-b border-[#42372b] py-3 sm:border-b-0 sm:border-r sm:px-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#bf753f]/10 text-[#e79960]"><ShieldCheck className="h-4 w-4"/></span><div><p className="font-['Bebas_Neue'] text-[18px] uppercase leading-none text-[#f2e2ce]">Founder-led</p><p className="mt-1 text-[10px] text-[#a99b89]">Guidance built around your game</p></div></div>
          <div className="flex items-center gap-3 py-3 sm:pl-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#bf753f]/10 text-[#e79960]"><Target className="h-4 w-4"/></span><div><p className="font-['Bebas_Neue'] text-[18px] uppercase leading-none text-[#f2e2ce]">Measurable results</p><p className="mt-1 text-[10px] text-[#a99b89]">Private scores and regular retests</p></div></div>
        </div>
      </header>

      {showSurvey && <form onSubmit={saveSurvey} className="mt-3 flex flex-col gap-3 rounded-[18px] border border-[#68482e] bg-[#21180f] p-4 sm:flex-row sm:items-end sm:p-5"><label className="flex-1 text-[11px] font-semibold text-[#f0e1ce]">What are you hoping to work on in the cohort?<textarea rows={2} value={surveyAnswer} onChange={(event) => setSurveyAnswer(event.target.value)} className="mt-2 block w-full resize-y rounded-xl border border-[#4b3b2b] bg-[#100e0b] px-3 py-2.5 text-[12px] leading-5 text-[#f3e6d5] outline-none focus:border-[#c9783e]/70"/></label><button type="submit" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#df7142] px-4 py-2 text-[11px] font-bold text-[#fff9f0] hover:bg-[#ca6035]">Save response <Check className="h-3.5 w-3.5"/></button></form>}

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#d3dfd3] bg-[#e9f0e7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d8e5d8] text-[#42664f]"><LockKeyhole className="h-3.5 w-3.5"/></span><div><p className="text-[12px] font-bold text-[#335140]">Your active-member space</p><p className="mt-0.5 text-[11px] leading-4 text-[#69806b]">All six cohort areas are for active members. Personal assessment scores are visible only to you and PLAYR1 admins.</p></div></div>
        <span className="inline-flex shrink-0 items-center gap-1.5 pl-10 font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-[#718773] sm:pl-0"><ShieldCheck className="h-3.5 w-3.5"/>Private by design</span>
      </div>

      <nav id="cohort-area-nav" aria-label="Shooting Cohort player areas" className="mt-4 grid scroll-mt-5 grid-cols-3 gap-1.5 rounded-[20px] border border-[#d9d3c6] bg-[#e6e3d9] p-1.5 md:grid-cols-6">
        {areas.map(({ id, label, icon: Icon, short }) => <button key={id} type="button" onClick={() => setActiveArea(id)} aria-current={activeArea === id ? "page" : undefined} className={`group flex min-h-[58px] items-center gap-2 rounded-[14px] px-2.5 py-2 text-left transition duration-200 sm:gap-3 sm:px-3 ${activeArea === id ? "bg-[#21463a] text-[#f8f4e9] shadow-[0_5px_13px_rgba(31,65,53,.15)]" : "text-[#737569] hover:bg-[#f4f2e9] hover:text-[#355546]"}`}><span className={`hidden font-mono text-[9px] sm:inline ${activeArea === id ? "text-[#e3a77e]" : "text-[#ada798]"}`}>{short}</span><Icon className={`h-[17px] w-[17px] shrink-0 ${activeArea === id ? "text-[#ef9a66]" : "text-[#878677] group-hover:text-[#c9653c]"}`} /><span className={`text-[10px] font-semibold leading-[1.15] sm:text-[11px] ${id === "baseline" ? "max-w-[86px]" : ""}`}>{label}</span></button>)}
      </nav>

      <section id="cohort-area-content" className="mt-4 scroll-mt-5 rounded-[25px] border border-[#d9d3c6] bg-[#f7f5ed] p-4 shadow-[0_18px_48px_rgba(62,67,48,.045)] sm:p-6 lg:p-7">
        {activeArea === "messaging" && <div>
          <SectionHeading eyebrow="Stay close to the work" title="Conversations" detail="The group room is shared with active cohort members. Your direct thread stays between you and Coach P." />
          <div className="mt-5 grid overflow-hidden rounded-[20px] border border-[#dfdacd] bg-[#f2f0e8] md:grid-cols-[255px_1fr]">
            <aside className="border-b border-[#dfdacd] p-3 md:border-b-0 md:border-r">
              <p className="px-3 pb-2 pt-1 font-mono text-[9px] font-semibold uppercase tracking-[.15em] text-[#9a9586]">Your conversations</p>
              <button type="button" onClick={() => setConversation("group")} className={`flex w-full items-start gap-3 rounded-[15px] p-3 text-left transition ${conversation === "group" ? "bg-[#e4e9df] ring-1 ring-[#d4dfd2]" : "hover:bg-[#eae8df]"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dce8d9] text-[#52705a]"><Users className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#344b3e]">The shooting room</span><span className="mt-1 block text-[10px] text-[#848579]">Shared · 8 cohort members</span><span className="mt-1.5 block truncate text-[10px] text-[#71786d]">Coach P: Keep the cue simple…</span></span><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#d97948]"/></button>
              <button type="button" onClick={() => setConversation("coach")} className={`mt-1 flex w-full items-start gap-3 rounded-[15px] p-3 text-left transition ${conversation === "coach" ? "bg-[#f0e5db] ring-1 ring-[#ead5c4]" : "hover:bg-[#eae8df]"}`}><CoachMark small/><span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#344b3e]">Coach P</span><span className="mt-1 block text-[10px] text-[#848579]">Direct · Founder / admin</span><span className="mt-1.5 block truncate text-[10px] text-[#71786d]">Send me another set after Friday…</span></span><LockKeyhole className="mt-1 h-3 w-3 shrink-0 text-[#bd734e]"/></button>
              <div className="mx-2 mt-4 border-t border-[#ded9cc] pt-3"><p className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[.11em] text-[#949183]"><LockKeyhole className="h-3 w-3"/>Member-only conversations</p></div>
            </aside>
            <div className="flex min-h-[490px] flex-col bg-[#faf9f4]">
              <div className="flex min-h-[65px] items-center justify-between gap-3 border-b border-[#e6e1d6] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">{conversation === "coach" ? <CoachMark/> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dce8d9] text-[#52705a]"><Users className="h-[17px] w-[17px]"/></span>}<div className="min-w-0"><p className="truncate text-[13px] font-bold text-[#2e483a]">{conversation === "group" ? "The shooting room" : "Coach P"}</p><p className="mt-0.5 text-[10px] text-[#8b897c]">{conversation === "group" ? "Shared cohort conversation · active members only" : "Private direct thread · Founder / admin"}</p></div></div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[.1em] ${conversation === "group" ? "border-[#d2dfd1] bg-[#eff4ed] text-[#59755d]" : "border-[#eddbca] bg-[#faf0e7] text-[#a9633e]"}`}><LockKeyhole className="h-3 w-3"/>{conversation === "group" ? "Member-only" : "Private"}</span>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="mb-4 flex justify-center"><span className="rounded-full border border-[#e6e1d5] bg-[#f5f3eb] px-3 py-1 font-mono text-[8px] uppercase tracking-[.12em] text-[#aaa391]">{conversation === "group" ? "Today · May 28" : "Private thread · May 27"}</span></div>
                {messages[conversation].map((message) => <MessageBubble key={message.id} message={message}/>)}
              </div>
              <div className="border-t border-[#e7e2d7] bg-[#f7f5ed] px-3 py-3 sm:px-4">
                <div className="flex items-end gap-2 rounded-full border border-[#dfd8ca] bg-[#fffdf8] px-3 py-2 shadow-[0_8px_22px_rgba(66,67,49,.045)] transition focus-within:border-[#d7855b] focus-within:shadow-[0_8px_24px_rgba(192,103,60,.1)]"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} aria-label={`Message ${conversation === "group" ? "the shooting room" : "Coach P"}`} placeholder={conversation === "group" ? "Add to the group conversation…" : "Tell Coach P what’s on your mind…"} className="max-h-24 min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[13px] text-[#35473d] outline-none placeholder:text-[#aaa596]"/><span className="hidden shrink-0 pb-3 text-[9px] font-semibold text-[#aaa08e] sm:inline">Coach P</span><button type="button" onClick={sendMessage} disabled={!draft.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e47745] text-[#fff7ec] shadow-[0_4px_12px_rgba(207,101,54,.22)] transition hover:-translate-y-0.5 hover:bg-[#cd6237] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4"/></button></div>
                <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[.1em] text-[#aaa392]">Enter to send <span className="px-1">·</span> Shift + Enter for a new line</p>
              </div>
            </div>
          </div>
        </div>}

        {activeArea === "requests" && <div>
          <SectionHeading eyebrow="Your training" title="Workout requests" detail="Ask for a focus that fits your game. Coach P will shape the next piece of work around it." action={<PrimaryButton onClick={() => setShowRequestForm((open) => !open)}>{showRequestForm ? <X className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}{showRequestForm ? "Close" : "Request a workout"}</PrimaryButton>} />
          {showRequestForm && <form onSubmit={submitRequest} className="mt-5 flex flex-col gap-3 rounded-[17px] border border-[#e6d7c6] bg-[#fbf1e7] p-4 sm:flex-row sm:items-end"><label className="flex-1 text-[11px] font-semibold text-[#665c4e]">What would you like to work on?<input autoFocus value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder="e.g. Finishing after a hard closeout" className="mt-2 block h-11 w-full rounded-xl border border-[#e2d1bf] bg-[#fffaf3] px-3 text-[13px] font-normal text-[#35473d] outline-none placeholder:text-[#b1a493] focus:border-[#dc895d]"/></label><button type="submit" disabled={!requestText.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#df7142] px-4 py-2 text-[12px] font-bold text-[#fff9f0] shadow-[0_5px_14px_rgba(190,86,48,.16)] transition hover:-translate-y-0.5 hover:bg-[#ca6035] disabled:cursor-not-allowed disabled:opacity-45\"><ArrowRight className="h-4 w-4"/>Send request</button></form>}
          <div className="mt-5 space-y-3">{requests.map((request, index) => <article key={`${request.title}-${index}`} className="rounded-[17px] border border-[#e5dfd2] bg-[#fcfbf6] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.13em] text-[#a19b8b]">{index === 0 ? "Current request" : "New request"} <span className="px-1">/</span> {request.date}</p><h3 className="mt-2 text-[15px] font-bold text-[#304a3c]">{request.title}</h3></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#d5e0d2] bg-[#f0f5ed] px-2.5 py-1.5 text-[9px] font-semibold text-[#5b755f]"><CheckCircle2 className="h-3.5 w-3.5"/>{request.status.split(" · ")[0]}</span></div><p className="mt-2 text-[12px] leading-5 text-[#77796e]">{request.note}</p><div className="mt-4 flex items-center gap-2 border-t border-[#ebe6da] pt-3 text-[11px] text-[#b55f39]"><Dumbbell className="h-3.5 w-3.5"/><span>{request.status}</span></div></article>)}</div>
          <p className="mt-4 flex items-center gap-2 text-[10px] text-[#939082]"><LockKeyhole className="h-3 w-3"/>Your requests are part of your private member space.</p>
        </div>}

        {activeArea === "film-room" && <div>
          <SectionHeading eyebrow="Film room · member-only" title="See the rep." detail="Your shooting clips and coach feedback, together in one place. Only active cohort members can access this room." />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">{[
            { title: "Right wing · catch into shot", date: "MAY 27", length: "0:18", note: "Nice lift into the catch. Let your hips settle a beat earlier and keep the release tall." },
            { title: "One-dribble pull-up · left hand", date: "MAY 24", length: "0:22", note: "Good control on the stop. On the next set, keep the ball closer to your hip through the gather." },
          ].map((clip, index) => <article key={clip.title} className="overflow-hidden rounded-[18px] border border-[#ddd8cb] bg-[#fcfbf6]"><div className="relative flex h-[175px] items-center justify-center overflow-hidden bg-[#203d34] sm:h-[205px]"><div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(90deg,transparent 49.5%,#d8cdb2 49.5%,#d8cdb2 50%,transparent 50%),linear-gradient(0deg,transparent 65%,#d8cdb2 65%,#d8cdb2 65.6%,transparent 65.6%)" }}/><div className="absolute -bottom-[84px] left-[calc(50%-116px)] h-[220px] w-[232px] rounded-t-full border border-[#d8cdb2]/70"/><div className="absolute bottom-5 right-[18%] h-3 w-3 rounded-full border border-[#f3a26d] bg-[#ed874f] shadow-[0_0_0_8px_rgba(235,135,79,.12)]"/><button type="button" onClick={() => setOpenClip(openClip === index ? null : index)} aria-label={`${openClip === index ? "Close" : "View"} clip feedback for ${clip.title}`} className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-white/15 text-[#fff7e9] backdrop-blur-sm transition hover:scale-105 hover:bg-white/25"><CirclePlay className="h-6 w-6"/></button><span className="absolute bottom-3 right-3 rounded-md bg-[#14271f]/75 px-2 py-1 font-mono text-[9px] text-white">{clip.length}</span><span className="absolute left-4 top-4 rounded-full border border-white/20 bg-[#172c24]/60 px-2 py-1 font-mono text-[8px] uppercase tracking-[.12em] text-[#dfddce]">Coach P reviewed</span></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.13em] text-[#a39b8b]">{clip.date} <span className="px-1">/</span> Jordan Blake</p><h3 className="mt-1.5 text-[13px] font-bold text-[#334b3e]">{clip.title}</h3></div><Film className="mt-1 h-4 w-4 shrink-0 text-[#c26b43]"/></div><p className="mt-2 text-[11px] leading-[1.6] text-[#73766b]">{clip.note}</p>{openClip === index && <div className="mt-3 rounded-xl border border-[#d9e1d5] bg-[#eef2e9] px-3 py-2.5 text-[11px] leading-5 text-[#536a57]"><span className="font-semibold">Coach P’s note: </span>{clip.note} Keep the cue simple across the next set.</div>}</div></article>)}</div>
        </div>}

        {activeArea === "baseline" && <div>
          <SectionHeading eyebrow="Your private shooting check-in" title="Baseline assessment" detail="A consistent 60-shot snapshot makes the small improvements easier to see. Only you and PLAYR1 admins can view your scores." action={<PrimaryButton onClick={() => setShowRetestForm((open) => !open)}><Target className="h-4 w-4"/>{showRetestForm ? "Close retest" : "Record a retest"}</PrimaryButton>} />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_310px]">
            <div className="rounded-[18px] border border-[#dfdacd] bg-[#fcfbf6] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#a29b8b]">Baseline · May 13</p><p className="mt-1 text-[12px] text-[#758072]">First recorded assessment</p></div><span className="flex items-center gap-1.5 rounded-full bg-[#f0f4ec] px-2.5 py-1.5 text-[9px] font-semibold text-[#5a755e]"><LockKeyhole className="h-3 w-3"/>Private to you</span></div><div className="mt-5 grid grid-cols-3 divide-x divide-[#e5dfd1] rounded-[14px] border border-[#ebe5d8] bg-[#f5f3eb] py-4 text-center">{[{label:"Free throws",value:scores[0],total:20},{label:"Spot-up",value:scores[1],total:25},{label:"Off-dribble",value:scores[2],total:15}].map((score) => <div key={score.label}><p className="font-['Bebas_Neue'] text-[34px] leading-none text-[#234638]">{score.value}<span className="text-[17px] text-[#a19b8c">/{score.total}</span></p><p className="mt-2 font-mono text-[8px] uppercase tracking-[.1em] text-[#888779]">{score.label}</p></div>)}</div><p className="mt-3 text-[10px] leading-4 text-[#929081]">20 free throws <span className="px-1">·</span> 25 spot-up shots <span className="px-1">·</span> 15 off-dribble shots</p>
            {showRetestForm && <form onSubmit={saveRetest} className="mt-4 rounded-[15px] border border-[#ead9c9] bg-[#fbf2e9] p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.13em] text-[#ba6941]">Next check-in</p><p className="mt-1 text-[12px] font-semibold text-[#4c5243]">Add your makes from the same 60-shot test.</p></div><button type="button" aria-label="Close retest form" onClick={() => setShowRetestForm(false)} className="rounded-full p-1 text-[#9c8b7c] hover:bg-[#f1e3d6]"><X className="h-4 w-4"/></button></div><div className="mt-3 grid grid-cols-3 gap-2">{["Free throws / 20","Spot-up / 25","Off-dribble / 15"].map((label, index) => <label key={label} className="text-[9px] font-semibold text-[#817568]">{label}<input inputMode="numeric" type="number" min="0" max={[20,25,15][index]} value={retestInputs[index]} onChange={(event) => setRetestInputs((current) => current.map((value, i) => i === index ? event.target.value : value))} placeholder={String(scores[index])} className="mt-1.5 h-10 w-full rounded-lg border border-[#e5d6c7] bg-[#fffaf3] px-2 text-[13px] text-[#334b3e] outline-none focus:border-[#d98558]"/></label>)}</div><button type="submit" className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-[#df7142] px-4 text-[11px] font-bold text-white hover:bg-[#ca6035]">Save private retest <Check className="h-3.5 w-3.5"/></button></form>}
            </div>
            <aside className="flex flex-col justify-between rounded-[18px] border border-[#d7dfd3] bg-[#eaf0e6] p-4 sm:p-5"><div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dce7d9] text-[#53705a]"><CalendarDays className="h-4 w-4"/></span><p className="mt-4 font-mono text-[9px] font-semibold uppercase tracking-[.14em] text-[#82907d]">Suggested retest</p><p className="mt-1 font-['Bebas_Neue'] text-3xl uppercase leading-none text-[#294c3c]">Jun 10</p><p className="mt-2 text-[11px] leading-5 text-[#6e806d]">Repeat the same setup in four weeks. Steady reps make a fair comparison.</p></div><div className="mt-5 border-t border-[#d6e0d2] pt-3 text-[10px] leading-4 text-[#738271]">Your results are never shown in the shared shooting room.</div></aside>
          </div>
        </div>}

        {activeArea === "workouts" && <div>
          <SectionHeading eyebrow="Your current plan" title="Workouts" detail="Two focused assignments for this block. Take your time with the details; consistency comes before pace." />
          <div className="mt-5 space-y-3">{[
            {title:"One-Dribble Pull-Up Series",kind:"Assigned workout",desc:"Build a balanced stop and repeatable release off either hand.",meta:"3 sets · 6 shots each side",due:"DUE FRI",focus:"Keep the gather quiet. Hold your finish for a beat after every rep."},
            {title:"Five-Spot Form Shooting",kind:"Assigned drill",desc:"Rehearse the same follow-through from five comfortable spots.",meta:"5 spots · 5 makes each",due:"FOUNDATION",focus:"Start close to the basket; step back only while the release stays smooth."},
          ].map((item,index) => <article key={item.title} className="grid gap-4 rounded-[18px] border border-[#e2dccf] bg-[#fcfbf6] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9px] font-semibold uppercase tracking-[.13em] text-[#bd6940]">{item.kind}</span><span className="text-[#d1c9b8]">/</span><span className="font-mono text-[8px] uppercase tracking-[.1em] text-[#969182]">{item.due}</span></div><h3 className="mt-2 font-['Bebas_Neue'] text-[28px] uppercase leading-none text-[#244438]">{item.title}</h3><p className="mt-2 text-[12px] text-[#77796d]">{item.desc}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#8e8b7c]"><span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-[#bd6940]"/>{item.meta}</span><span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-[#81917a]"/>{item.focus}</span></div></div><button type="button" onClick={() => setCompleted((current) => current.map((value,i) => i === index ? !value : value))} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[11px] font-bold transition ${completed[index] ? "border-[#cddbc9] bg-[#eaf1e6] text-[#55735b] hover:bg-[#e0ebdc]" : "border-[#e5d6c7] bg-[#fbf1e8] text-[#a95e3a] hover:bg-[#f8e9db]"}`}>{completed[index] ? <><CheckCircle2 className="h-4 w-4"/>Completed</> : <>Mark complete <Check className="h-4 w-4"/></>}</button></article>)}</div>
          <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-[#e2ddcf] bg-[#f2f0e8] px-4 py-3 text-[10px] text-[#8b897c]"><Clock3 className="h-3.5 w-3.5 text-[#c27950]"/>Coach P adjusts your next assignments around the feedback you share.</div>
        </div>}

        {activeArea === "analytics" && <div>
          <SectionHeading eyebrow="Your shooting log" title="Progress, kept personal." detail="A private view of your own reps. Your scores are visible only to you and PLAYR1 admins — never to other players." />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_.8fr]">
            <section className="rounded-[18px] border border-[#e1dccf] bg-[#fcfbf6] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[9px] font-semibold uppercase tracking-[.14em] text-[#a19a8a]">Assessment trend</p><p className="mt-1 text-[12px] text-[#73796e]">Baseline compared with your latest check-in</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#d5e0d2] bg-[#eef3ea] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[.08em] text-[#5c755f]"><LockKeyhole className="h-3 w-3"/>Just for you</span></div><div className="mt-4 h-[220px] rounded-[14px] border border-[#ece7db] bg-[#f5f3eb] px-3 py-3 sm:px-5"><div className="flex h-full"><div className="flex flex-col justify-between pb-5 pr-2 font-mono text-[8px] text-[#aaa494]"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div><div className="relative flex-1"><div className="absolute inset-x-0 top-0 border-t border-dashed border-[#dfd9cc]"/><div className="absolute inset-x-0 top-1/4 border-t border-dashed border-[#dfd9cc]"/><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#dfd9cc]"/><div className="absolute inset-x-0 top-3/4 border-t border-dashed border-[#dfd9cc]"/><svg viewBox="0 0 600 160" preserveAspectRatio="none" className="absolute inset-0 h-[calc(100%-24px)] w-full overflow-visible" aria-label="Private progress trend"><path d="M28 102 C120 98 162 88 220 84 S326 71 390 62 S490 53 572 43" fill="none" stroke="#df7949" strokeWidth="3" strokeLinecap="round"/><path d="M28 102 C120 98 162 88 220 84 S326 71 390 62 S490 53 572 43 L572 160 L28 160 Z" fill="url(#chartFill)" opacity=".22"/><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6814d"/><stop offset="1" stopColor="#e6814d" stopOpacity="0"/></linearGradient></defs><circle cx="28" cy="102" r="5" fill="#fcfbf6" stroke="#dc7244" strokeWidth="3"/><circle cx="220" cy="84" r="5" fill="#fcfbf6" stroke="#dc7244" strokeWidth="3"/><circle cx="390" cy="62" r="5" fill="#fcfbf6" stroke="#dc7244" strokeWidth="3"/><circle cx="572" cy="43" r="5" fill="#fcfbf6" stroke="#dc7244" strokeWidth="3"/></svg><div className="absolute inset-x-0 bottom-0 flex justify-between pt-2 font-mono text-[8px] uppercase tracking-[.08em] text-[#999385]"><span>May 13</span><span>May 20</span><span>May 27</span><span>Jun 10</span></div></div></div></div><div className="mt-3 flex items-center gap-2 text-[10px] text-[#8a897b]"><span className="h-2 w-2 rounded-full bg-[#df7949]"/>Assessment consistency, across your own check-ins</div></section>
            <aside className="rounded-[18px] border border-[#d6dfd2] bg-[#eaf0e6] p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="font-mono text-[9px] font-semibold uppercase tracking-[.14em] text-[#80907c]">Latest session</p><p className="mt-1 text-[11px] text-[#73806f]">May 27 · 60-shot test</p></div><Activity className="h-4 w-4 text-[#5c785f]"/></div><div className="mt-5 flex items-end gap-2"><p className="font-['Bebas_Neue'] text-[53px] leading-[.8] text-[#254a3a]">42</p><p className="pb-0.5 text-[12px] text-[#71826e]">of 60 makes</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#d6e0d2]"><div className="h-full w-[70%] rounded-full bg-[#789477]"/></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#d6e0d2] pt-3"><div><p className="font-mono text-[8px] uppercase tracking-[.1em] text-[#85907d]">Since baseline</p><p className="mt-1 flex items-center gap-1 text-[17px] font-bold text-[#43684d]"><ArrowUpRight className="h-4 w-4"/>+6 makes</p></div><div><p className="font-mono text-[8px] uppercase tracking-[.1em] text-[#85907d]">Tests logged</p><p className="mt-1 text-[17px] font-bold text-[#3c5944]">2 sessions</p></div></div><div className="mt-4 rounded-xl border border-[#d8e0d3] bg-[#f0f4ec] px-3 py-2.5 text-[10px] leading-4 text-[#6e806c]">Keep the setup consistent. A fair comparison starts with the same shot and the same pace.</div></aside>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e4dfd3] pt-3 text-[9px] font-mono uppercase tracking-[.1em] text-[#969183]"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3 w-3"/>Private player results</span><span>Visible to you + PLAYR1 admins only</span></div>
        </div>}
      </section>
      <footer className="mt-4 flex flex-col gap-2 px-1 pb-2 text-[9px] text-[#999586] sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2 font-mono uppercase tracking-[.1em]"><ShieldCheck className="h-3.5 w-3.5 text-[#83927e]"/>Active members only <span className="text-[#c6bfae]">/</span> Private player space</span><span>Questions about your plan? Message Coach P in your private thread.</span></footer>
    </div>
  </main>;
}
