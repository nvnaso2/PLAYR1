import "./_group.css";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Film,
  MessageCircle,
  Send,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

const sections = [
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "film-room", label: "Film Room", icon: Film },
  { id: "messaging", label: "Messaging", icon: MessageCircle },
  { id: "baseline", label: "Baseline Assessment", icon: Target },
  { id: "workouts", label: "Workouts", icon: Dumbbell },
  { id: "analytics", label: "Analytics", icon: Activity },
];

const roomMessages = [
  { name: "Maya Brooks", time: "9:05 AM", content: "Finished the first week. Keeping my elbow stacked feels much more natural already." },
  { name: "PLAYR1 team", time: "11:42 AM", content: "Quick reminder: log your baseline before Friday's session so we can compare the next block." },
  { name: "Andre Collins", time: "12:16 PM", content: "The one-dribble pull-ups are starting to feel comfortable from the wing." },
];

export function Current() {
  const [activeSection, setActiveSection] = useState("requests");
  const [draft, setDraft] = useState("");

  return (
    <main className="shooting-cohort-player-current min-h-screen bg-[#100e0b] px-4 pb-10 pt-5 text-[#fff1de] sm:px-7 sm:pt-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-[#382e24] pb-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#d89156]">Founder-led shooting cohort</p>
              <h1 className="mt-2 font-heading text-4xl uppercase leading-tight tracking-wide text-[#fff3e2] sm:text-5xl">
                Build an <span className="text-[#ee9652]">Effortless Shot</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-[#ef8a43] px-4 py-2.5 text-sm font-bold text-[#21150c]">Edit Interest Survey</button>
              <button className="rounded-lg border border-[#68482e] bg-[#17130f] px-4 py-2.5 text-sm font-semibold text-[#f0b17d]">Message Founder</button>
              <button className="flex items-center rounded-lg px-3 py-2.5 text-sm text-[#918577]">Hub <ChevronRight className="ml-1 h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#493a2c] bg-[#17130f] px-4 py-3">
              <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#9d8f7e]">Remaining spots</p><p className="mt-1 text-xs text-[#817567]">of 12 total</p></div>
              <p className="font-heading text-3xl leading-none text-[#f2a365]">3</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#493a2c] bg-[#17130f] px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bf753f]/10 text-[#e79960]"><ShieldCheck className="h-4 w-4" /></span>
              <div><p className="font-heading text-lg uppercase leading-none text-[#f2e2ce]">Founder-led</p><p className="mt-1 text-[11px] text-[#85796a]">Guidance built around your game</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#493a2c] bg-[#17130f] px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#bf753f]/10 text-[#e79960]"><Target className="h-4 w-4" /></span>
              <div><p className="font-heading text-lg uppercase leading-none text-[#f2e2ce]">Measurable results</p><p className="mt-1 text-[11px] text-[#85796a]">Private scores and regular retests</p></div>
            </div>
          </div>
        </header>

        <nav aria-label="Shooting Cohort player sections" className="mt-6 grid grid-cols-3 gap-1 rounded-xl border border-[#46382b] bg-[#17130f] p-1 md:grid-cols-6">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              aria-current={activeSection === id ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-tight transition md:text-xs ${activeSection === id ? "bg-[#ef8a43] font-bold text-[#21150c]" : "text-[#a99b89] hover:bg-white/[0.04] hover:text-white"}`}
            >
              <Icon className="h-4 w-4" /><span>{label}</span>
            </button>
          ))}
        </nav>

        <section className="mt-4 rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5">
          {activeSection === "requests" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Your training</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">Workout requests</h2></div>
                <button className="flex items-center rounded-lg bg-[#ef8a43] px-3.5 py-2.5 text-sm font-bold text-[#21150c]">Request a workout <ArrowRight className="ml-2 h-4 w-4" /></button>
              </div>
              <article className="mt-4 rounded-xl border border-[#3e3329] bg-[#100e0b] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-sm font-semibold text-[#e7dac8]">Shooting off the dribble</h3><span className="rounded-full border border-[#68482e] bg-[#21180f] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#e8a16a]">Workout assigned</span></div>
                <p className="mt-2 text-xs leading-5 text-[#8f8274]">Build a quicker, repeatable pull-up from either wing.</p>
                <p className="mt-2 border-t border-[#342c24] pt-2 text-xs text-[#e8a16a]">Assigned: One-Dribble Pull-Up Series</p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#756b60]">Requested May 21</p>
              </article>
            </>
          )}
          {activeSection === "film-room" && (
            <div className="flex min-h-56 flex-col items-center justify-center text-center"><Film className="h-7 w-7 text-[#d88a50]" /><h2 className="mt-3 font-heading text-2xl uppercase text-[#fff1de]">Cohort Film Room</h2><p className="mt-1 text-sm text-[#8f8274]">Private shooting clips and coach feedback.</p></div>
          )}
          {activeSection === "messaging" && (
            <div className="overflow-hidden rounded-[24px] border border-[#46382b] bg-[#17130f]">
              <div className="flex items-center justify-between gap-3 border-b border-[#382e24] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d77e3d]/30 bg-[#d77e3d]/10 text-[#f0a367]"><MessageCircle className="h-4 w-4" /></span><div><h2 className="font-heading text-xl uppercase leading-none text-[#fff1de]">The shooting room</h2><p className="mt-1 text-[11px] text-[#8f8274]">Shared conversation · member-only</p></div></div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Private group</span>
              </div>
              <div className="h-[310px] space-y-3 overflow-y-auto p-4 sm:h-[360px] sm:p-5">
                {roomMessages.map((message) => <article key={message.name} className="group max-w-[92%] rounded-2xl rounded-tl-sm border border-[#3c332a] bg-[#211c17] px-3.5 py-3 sm:max-w-[78%]"><div className="flex items-center justify-between gap-4"><p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#e9a16a]">{message.name}</p><time className="shrink-0 font-mono text-[9px] text-[#756b60]">{message.time}</time></div><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-[#e2d6c7]">{message.content}</p></article>)}
              </div>
              <div className="border-t border-[#382e24] p-3 sm:p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-[#4b3b2b] bg-[#100e0b] p-2 focus-within:border-[#c9783e]/70">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add to the conversation…" aria-label="Message to shooting cohort" className="min-h-10 max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent p-2 text-sm text-[#f3e6d5] outline-none placeholder:text-[#6c6256]" />
                  <button aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ef8a43] text-[#21150c]"><Send className="h-4 w-4" /></button>
                </div>
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-[#6e6357]">Enter to send · Shift + Enter for a new line</p>
              </div>
            </div>
          )}
          {activeSection === "baseline" && (
            <div><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Shooting check-in</p><h2 className="mt-1 font-heading text-3xl uppercase text-[#fff1de]">Baseline assessment</h2></div><button className="rounded-lg bg-[#ef8a43] px-3 py-2 text-sm font-bold text-[#21150c]">Record a retest</button></div><div className="mt-5 grid grid-cols-3 divide-x divide-[#4b3928] rounded-xl border border-[#503b28] bg-[#100e0b] py-3 text-center"><div><p className="font-heading text-2xl text-[#f4b27c]">20</p><p className="font-mono text-[8px] uppercase text-[#958574]">free throws</p></div><div><p className="font-heading text-2xl text-[#f4b27c]">25</p><p className="font-mono text-[8px] uppercase text-[#958574]">spot-up</p></div><div><p className="font-heading text-2xl text-[#f4b27c]">15</p><p className="font-mono text-[8px] uppercase text-[#958574]">off-dribble</p></div></div><div className="mt-4 flex items-center gap-2 text-xs text-[#958878]"><CalendarDays className="h-3.5 w-3.5" />Next suggested retest Jun 10</div></div>
          )}
          {activeSection === "workouts" && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#3e3329] bg-[#100e0b] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Assigned workout</p><h2 className="mt-2 font-heading text-2xl uppercase text-[#fff1de]">One-Dribble Pull-Up Series</h2><p className="mt-1 text-xs text-[#8f8274]">Build a balanced stop and repeatable release off either hand.</p></div><div className="rounded-xl border border-[#3e3329] bg-[#100e0b] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Assigned drill</p><h2 className="mt-2 font-heading text-2xl uppercase text-[#fff1de]">Five-Spot Form Shooting</h2><p className="mt-1 text-xs text-[#8f8274]">Due Friday · focus on the same follow-through every rep.</p></div></div>}
          {activeSection === "analytics" && <div><div className="flex items-start gap-3"><Activity className="mt-1 h-5 w-5 text-[#df965c]" /><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Your shooting log</p><h2 className="mt-1 font-heading text-3xl uppercase text-[#fff1de]">Progress, kept personal.</h2><p className="mt-2 text-xs text-[#8f8274]">Your scores are visible only to you and PLAYR1 admins. No leaderboard.</p></div></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3"><p className="font-mono text-[8px] uppercase text-[#817567]">Latest makes</p><p className="mt-1 font-heading text-2xl text-[#f4b27c]">42/60</p></div><div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3"><p className="font-mono text-[8px] uppercase text-[#817567]">Since baseline</p><p className="mt-1 font-heading text-2xl text-[#f4b27c]">+6</p></div><div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3"><p className="font-mono text-[8px] uppercase text-[#817567]">Tests logged</p><p className="mt-1 font-heading text-2xl text-[#f4b27c]">2</p></div></div></div>}
        </section>

        <footer className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#756b60]"><Users className="h-3.5 w-3.5" />Player member view <span className="text-[#46382b]">·</span><Check className="h-3 w-3 text-[#d89156]" />Private results</footer>
      </div>
    </main>
  );
}
