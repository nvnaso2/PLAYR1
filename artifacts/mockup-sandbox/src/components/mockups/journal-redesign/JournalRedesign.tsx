import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Dumbbell,
  Edit3,
  Filter,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import "./_group.css";

type ReflectionType = "Practice / workout" | "Game" | "Open reflection";
type Mood = "Locked in" | "Proud" | "Frustrated" | "Still learning" | "Tired";

type Entry = {
  id: string;
  type: ReflectionType;
  date: string;
  time: string;
  source: string;
  mood: Mood;
  answer: string;
  coached: boolean;
  coachNote?: string;
};

const initialEntries: Entry[] = [
  {
    id: "j-104",
    type: "Practice / workout",
    date: "Oct 1, 2026",
    time: "Today · 6:42 PM",
    source: "Workout · Shooting Lab",
    mood: "Proud",
    answer:
      "I stayed balanced on the catch today. When I slowed down and got my feet set, the shot felt easier and more repeatable. I want to bring that same patience into the next run.",
    coached: true,
    coachNote:
      "That’s a useful cue to keep. Next workout, try tracking how often you arrive balanced before the catch—not just whether the shot goes in.",
  },
  {
    id: "j-103",
    type: "Game",
    date: "Sep 29, 2026",
    time: "Mon · 8:18 PM",
    source: "Game · vs. Northside",
    mood: "Still learning",
    answer:
      "I made the right read late in the fourth, but I need to be louder earlier when we’re switching on the screen. I’ll call it sooner next time.",
    coached: false,
  },
  {
    id: "j-102",
    type: "Open reflection",
    date: "Sep 26, 2026",
    time: "Fri · 4:05 PM",
    source: "",
    mood: "Locked in",
    answer:
      "The best part of today was how present I felt. I didn’t rush the next play after a mistake. That’s a version of me I want to keep building.",
    coached: false,
  },
  {
    id: "j-101",
    type: "Practice / workout",
    date: "Sep 23, 2026",
    time: "Tue · 5:31 PM",
    source: "Workout · Handle + finish",
    mood: "Frustrated",
    answer:
      "My left-hand finish kept drifting. I got annoyed and started speeding up. The last few reps were better once I reset and focused on the gather.",
    coached: false,
  },
];

const moods: { label: Mood; face: string; color: string }[] = [
  { label: "Locked in", face: "◎", color: "#1d6c5c" },
  { label: "Proud", face: "✦", color: "#c67b2d" },
  { label: "Still learning", face: "◌", color: "#527893" },
  { label: "Frustrated", face: "↗", color: "#c45b47" },
  { label: "Tired", face: "⌁", color: "#84738d" },
];

const typeMeta: Record<ReflectionType, { icon: typeof Dumbbell; tint: string; short: string }> = {
  "Practice / workout": { icon: Dumbbell, tint: "#e7f0eb", short: "Practice" },
  Game: { icon: Trophy, tint: "#fff0df", short: "Game" },
  "Open reflection": { icon: BookOpen, tint: "#e9edf1", short: "Open" },
};

const inputStyle =
  "w-full rounded-xl border border-[#d8ddd6] bg-[#fffefa] px-3.5 py-3 text-sm text-[#263831] outline-none transition focus:border-[#267364] focus:ring-2 focus:ring-[#267364]/15";

export function JournalRedesign() {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All reflections");
  const [moodFilter, setMoodFilter] = useState("Any mood");
  const [coachFilter, setCoachFilter] = useState("Any coaching");
  const [sourceFilter, setSourceFilter] = useState("Any source");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [entryType, setEntryType] = useState<ReflectionType>("Practice / workout");
  const [entryMood, setEntryMood] = useState<Mood | "">("");
  const [entrySource, setEntrySource] = useState("");
  const [answer, setAnswer] = useState("");
  const [detailAnswer, setDetailAnswer] = useState("");
  const [detailMood, setDetailMood] = useState<Mood>("Proud");

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesSearch =
        !query ||
        `${entry.type} ${entry.answer} ${entry.source} ${entry.coachNote ?? ""}`.toLowerCase().includes(query);
      const matchesType = typeFilter === "All reflections" || entry.type === typeFilter;
      const matchesMood = moodFilter === "Any mood" || entry.mood === moodFilter;
      const matchesCoach =
        coachFilter === "Any coaching" ||
        (coachFilter === "Coach P feedback" ? entry.coached : !entry.coached);
      const linked = Boolean(entry.source);
      const matchesSource =
        sourceFilter === "Any source" ||
        (sourceFilter === "Linked" ? linked : !linked);
      const timestamp = new Date(entry.date).getTime();
      const matchesFrom = !fromDate || timestamp >= new Date(fromDate).getTime();
      const matchesTo = !toDate || timestamp <= new Date(`${toDate}T23:59:59`).getTime();
      return matchesSearch && matchesType && matchesMood && matchesCoach && matchesSource && matchesFrom && matchesTo;
    });
  }, [entries, search, typeFilter, moodFilter, coachFilter, sourceFilter, fromDate, toDate]);

  const openEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setEditing(false);
    setDeleteConfirm(false);
    setDetailAnswer(entry.answer);
    setDetailMood(entry.mood);
  };

  const openComposer = () => {
    setComposerOpen(true);
    setEntryType("Practice / workout");
    setEntryMood("");
    setEntrySource("");
    setAnswer("");
  };

  const saveEntry = () => {
    const text = answer.trim();
    if (!text) return;
    const today = new Date();
    const next: Entry = {
      id: `j-${Date.now()}`,
      type: entryType,
      date: today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: "Just now",
      source: entrySource,
      mood: entryMood || "Still learning",
      answer: text,
      coached: false,
    };
    setEntries((current) => [next, ...current]);
    setComposerOpen(false);
    setSavedNotice("Reflection saved to your journal");
    window.setTimeout(() => setSavedNotice(""), 2800);
  };

  const saveEdit = () => {
    if (!selectedEntry || !detailAnswer.trim()) return;
    const updated = { ...selectedEntry, answer: detailAnswer.trim(), mood: detailMood };
    setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedEntry(updated);
    setEditing(false);
    setSavedNotice("Your changes are saved");
    window.setTimeout(() => setSavedNotice(""), 2800);
  };

  const deleteEntry = () => {
    if (!selectedEntry) return;
    setEntries((current) => current.filter((item) => item.id !== selectedEntry.id));
    setSelectedEntry(null);
    setDeleteConfirm(false);
    setSavedNotice("Reflection deleted");
    window.setTimeout(() => setSavedNotice(""), 2800);
  };

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("All reflections");
    setMoodFilter("Any mood");
    setCoachFilter("Any coaching");
    setSourceFilter("Any source");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="jr-page min-h-[100dvh] bg-[#f5f3e9] text-[#24382f]">
      <style>{`
        .jr-page { font-family: 'Inter', ui-sans-serif, sans-serif; }
        .jr-reveal { animation: jr-rise .48s cubic-bezier(.2,.7,.2,1) both; }
        .jr-delay-1 { animation-delay: 70ms; }
        .jr-delay-2 { animation-delay: 140ms; }
        .jr-delay-3 { animation-delay: 210ms; }
        @keyframes jr-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .jr-scroll::-webkit-scrollbar { width: 6px; }
        .jr-scroll::-webkit-scrollbar-thumb { background: #d4d9d0; border-radius: 8px; }
        @media (prefers-reduced-motion: reduce) { .jr-reveal { animation: none; } }
      `}</style>

      <header className="border-b border-[#dfe3d8] bg-[#f8f7f0]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 md:px-9">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#1c5e51] text-[#f8f3dc] shadow-[0_4px_12px_rgba(28,94,81,.16)]">
              <span className="font-['Bebas_Neue'] text-[21px] tracking-wide">P1</span>
            </div>
            <div className="leading-none">
              <div className="font-['Bebas_Neue'] text-[21px] tracking-[.09em] text-[#1e3930]">PLAYR1</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.18em] text-[#76877c]">Player journal</div>
            </div>
          </div>
          <button
            onClick={openComposer}
            className="inline-flex items-center gap-2 rounded-full bg-[#e87849] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(192,92,53,.18)] transition hover:-translate-y-0.5 hover:bg-[#d96c40] focus:outline-none focus:ring-4 focus:ring-[#e87849]/20"
          >
            <Plus size={17} strokeWidth={2.5} /> <span className="hidden sm:inline">New reflection</span><span className="sm:hidden">Reflect</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-16 pt-7 md:px-9 md:pt-10">
        <section className="jr-reveal relative overflow-hidden rounded-[28px] bg-[#1d5d51] px-6 py-7 text-[#f5f1dc] shadow-[0_16px_36px_rgba(31,70,57,.12)] md:px-10 md:py-9">
          <div className="pointer-events-none absolute -right-10 -top-24 h-[290px] w-[290px] rounded-full border border-[#f5f1dc]/10" />
          <div className="pointer-events-none absolute -right-1 top-[-62px] h-[230px] w-[230px] rounded-full border border-[#f5f1dc]/10" />
          <div className="pointer-events-none absolute bottom-[-86px] right-[22%] h-[190px] w-[190px] rounded-full bg-[#e87849]/90" />
          <div className="relative z-10 max-w-[770px]">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#c5d8c7]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e87849]" /> YOUR SPACE TO RESET
            </div>
            <h1 className="font-['Bebas_Neue'] text-[48px] leading-[.94] tracking-[.035em] sm:text-[60px] md:text-[68px]">
              The work doesn’t end
              <br className="hidden sm:block" /> when the run does.
            </h1>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[470px] text-sm leading-6 text-[#d5e2d7]">
                Take a minute to notice what clicked, what challenged you, and what you’ll carry into the next one.
              </p>
              <button
                onClick={openComposer}
                className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#f5f1dc] px-5 py-3 text-sm font-bold text-[#20584c] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-white/25"
              >
                Start a reflection <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-5 right-8 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-[#d3e3d5]/75 lg:flex">
            <span className="h-px w-7 bg-[#d3e3d5]/40" /> Built one rep at a time
          </div>
        </section>

        <section className="jr-reveal jr-delay-1 mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_310px]">
          <button
            onClick={openComposer}
            className="group flex min-h-[124px] items-center gap-4 rounded-[22px] border border-[#e4d8be] bg-[#fff9eb] px-5 py-5 text-left transition hover:border-[#d8bd91] hover:shadow-[0_8px_20px_rgba(95,75,41,.07)] md:px-7"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4e7ca] text-[#b66a38]">
              <MessageCircle size={21} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#b27042]">A quick check-in</div>
              <div className="mt-1 font-['Playfair_Display'] text-[21px] font-semibold leading-tight text-[#293c32]">What’s one thing you want to remember?</div>
              <div className="mt-1.5 text-xs text-[#778176]">No perfect answer. Just yours.</div>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d5d51] text-white transition group-hover:translate-x-1"><ArrowRight size={16} /></span>
          </button>

          <aside className="relative overflow-hidden rounded-[22px] bg-[#e9ede2] px-5 py-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#3a7665]"><Sparkles size={14} /> Coach P</div>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#30463a]">Want a little more from your reflection?</p>
            <p className="mt-1 text-xs leading-[18px] text-[#718076]">Coach P feedback is part of PLAYR1 Pro. Your journal works great without it.</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#58786c]"><LockKeyhole size={12} /> Pro feature <span className="ml-auto text-[#98a398]">Learn more <ChevronRight size={12} className="inline" /></span></div>
          </aside>
        </section>

        <section className="jr-reveal jr-delay-2 mt-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#8b755d]"><BookOpen size={14} /> Your court-side notes</div>
              <h2 className="mt-1 font-['Playfair_Display'] text-[29px] font-semibold tracking-[-.03em] text-[#293c32]">Past reflections</h2>
            </div>
            <div className="rounded-full bg-[#e6e9de] px-3 py-1.5 text-xs font-semibold text-[#617267]">{visibleEntries.length} {visibleEntries.length === 1 ? "entry" : "entries"}</div>
          </div>

          <div className="rounded-[22px] border border-[#e2e2d7] bg-[#fbfaf4] p-4 shadow-[0_5px_20px_rgba(34,53,44,.035)] md:p-5">
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87948a]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a moment, a cue, or a game..."
                aria-label="Search reflections"
                className="w-full rounded-xl border border-[#dfe2d8] bg-[#fffefa] py-3 pl-10 pr-4 text-sm text-[#263831] outline-none placeholder:text-[#98a198] focus:border-[#267364] focus:ring-2 focus:ring-[#267364]/15"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={["All reflections", "Practice / workout", "Game", "Open reflection"]} />
              <FilterSelect label="Mood" value={moodFilter} onChange={setMoodFilter} options={["Any mood", ...moods.map((item) => item.label)]} />
              <FilterSelect label="Coaching" value={coachFilter} onChange={setCoachFilter} options={["Any coaching", "Coach P feedback", "No Coach P feedback"]} />
              <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={["Any source", "Linked", "Not linked"]} />
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#87948a] sm:flex"><Filter size={13} /> Date range</span>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-[#dfe2d8] bg-[#fffefa] px-3">
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[.08em] text-[#8a968c]">From</span>
                  <input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-xs text-[#55675c] outline-none" />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-[#dfe2d8] bg-[#fffefa] px-3">
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[.08em] text-[#8a968c]">To</span>
                  <input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-xs text-[#55675c] outline-none" />
                </label>
              </div>
              {(search || typeFilter !== "All reflections" || moodFilter !== "Any mood" || coachFilter !== "Any coaching" || sourceFilter !== "Any source" || fromDate || toDate) && (
                <button onClick={resetFilters} className="px-2 py-2 text-xs font-semibold text-[#a75f3a] hover:text-[#824326]">Clear filters</button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleEntries.length ? visibleEntries.map((entry, index) => {
              const meta = typeMeta[entry.type];
              const Icon = meta.icon;
              const moodMeta = moods.find((item) => item.label === entry.mood);
              return (
                <article
                  key={entry.id}
                  onClick={() => openEntry(entry)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openEntry(entry); }}
                  role="button"
                  tabIndex={0}
                  className={`jr-reveal jr-delay-${Math.min(index + 1, 3)} group cursor-pointer rounded-[20px] border border-[#e4e4da] bg-[#fbfaf4] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#b9ccc0] hover:shadow-[0_9px_22px_rgba(35,62,48,.07)] focus:outline-none focus:ring-2 focus:ring-[#267364]/25 md:px-5`}
                >
                  <div className="flex gap-3.5">
                    <div style={{ backgroundColor: meta.tint }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] text-[#315b4e]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-sm font-bold text-[#30443a]">{entry.type}</h3>
                        {entry.coached && <span className="inline-flex items-center gap-1 rounded-full bg-[#e6eee4] px-2 py-1 text-[10px] font-bold text-[#3f735f]"><Sparkles size={11} /> Coach P feedback</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8a9388]">
                        <span className="inline-flex items-center gap-1"><Clock3 size={12} />{entry.time}</span>
                        {entry.source && <span className="inline-flex items-center gap-1"><ArrowDownUp size={11} />{entry.source}</span>}
                      </div>
                      <p className="mt-2.5 max-w-[830px] text-[13px] leading-[1.6] text-[#58685d]">{entry.answer}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between">
                      <span style={{ color: moodMeta?.color }} title={`Mood: ${entry.mood}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0e6] text-base font-semibold">{moodMeta?.face}</span>
                      <ChevronRight size={17} className="text-[#a7b0a4] transition-transform group-hover:translate-x-0.5 group-hover:text-[#397262]" />
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-[22px] border border-dashed border-[#cdd6ca] bg-[#f9f8f1] px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8eee5] text-[#397262]"><Search size={20} /></div>
                <h3 className="mt-4 font-['Playfair_Display'] text-xl font-semibold text-[#30443a]">No reflections in that corner</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-[#7b887c]">Try a different search or loosen your filters to find the moment you’re looking for.</p>
                <button onClick={resetFilters} className="mt-4 rounded-full bg-[#1d5d51] px-4 py-2 text-xs font-bold text-white hover:bg-[#164b41]">Clear all filters</button>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-9 flex flex-col gap-2 border-t border-[#dfe3d8] pt-4 text-[11px] text-[#849085] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Just for you. Your reflections stay yours.</span>
          <span className="inline-flex items-center gap-1.5">A little progress, written down <span className="text-[#d77a4c]">✦</span></span>
        </footer>
      </main>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14231e]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposerOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="composer-title" className="jr-reveal max-h-[94dvh] w-full max-w-[610px] overflow-y-auto rounded-t-[26px] bg-[#f9f8f1] shadow-[0_25px_80px_rgba(12,31,24,.25)] sm:rounded-[26px]">
            <div className="flex items-start justify-between border-b border-[#e2e3d9] px-5 py-5 sm:px-7">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c27348]">A page for your game</div>
                <h2 id="composer-title" className="mt-1 font-['Playfair_Display'] text-[27px] font-semibold text-[#293c32]">Start a reflection</h2>
              </div>
              <button onClick={() => setComposerOpen(false)} aria-label="Close reflection form" className="rounded-full p-2 text-[#77877b] hover:bg-[#e9ece3]"><X size={18} /></button>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              <div>
                <div className="mb-2 text-xs font-bold text-[#43584a]">What are you reflecting on?</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["Practice / workout", "Game", "Open reflection"] as ReflectionType[]).map((type) => {
                    const Icon = typeMeta[type].icon;
                    return <button key={type} onClick={() => { setEntryType(type); setEntrySource(""); }} className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center text-[11px] font-semibold transition ${entryType === type ? "border-[#1d6a5a] bg-[#e7efe8] text-[#245f50] ring-2 ring-[#1d6a5a]/10" : "border-[#e0e3d9] bg-[#fffefa] text-[#718075] hover:border-[#bdcfc1]"}`}><Icon size={17} />{type === "Practice / workout" ? "Practice" : type === "Open reflection" ? "Open" : type}</button>;
                  })}
                </div>
              </div>

              {entryType !== "Open reflection" && (
                <div>
                  <label htmlFor="entry-source" className="mb-2 block text-xs font-bold text-[#43584a]">Link a {entryType === "Game" ? "game" : "workout"} <span className="font-normal text-[#89958a]">· optional</span></label>
                  <div className="relative">
                    <select id="entry-source" value={entrySource} onChange={(event) => setEntrySource(event.target.value)} className={`${inputStyle} appearance-none pr-10`}>
                      <option value="">No link — just my notes</option>
                      {entryType === "Game" ? <><option>Game · vs. Northside</option><option>Game · East Valley tournament</option></> : <><option>Workout · Shooting Lab</option><option>Workout · Handle + finish</option><option>Workout · Team practice</option></>}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#859186]" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#89958a]">Linking adds context; your reflection is saved either way.</p>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-bold text-[#43584a]">How are you feeling about it? <span className="font-normal text-[#89958a]">· optional</span></div>
                <div className="flex flex-wrap gap-2">
                  {moods.map((mood) => <button key={mood.label} onClick={() => setEntryMood(entryMood === mood.label ? "" : mood.label)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition ${entryMood === mood.label ? "border-[#397565] bg-[#e6eee7] text-[#2d6857]" : "border-[#e1e3d9] bg-[#fffefa] text-[#748176] hover:border-[#c3d0c4]"}`}><span style={{ color: mood.color }} className="text-sm">{mood.face}</span>{mood.label}</button>)}
                </div>
              </div>

              <div>
                <label htmlFor="reflection-text" className="mb-2 block text-xs font-bold text-[#43584a]">What’s on your mind?</label>
                <textarea id="reflection-text" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={5} maxLength={1000} placeholder="A moment that stood out, something you learned, or what you want to try next time…" className={`${inputStyle} resize-y leading-6 placeholder:text-[#a3aaa0]`} />
                <div className="mt-1 flex justify-between text-[10px] text-[#939d91]"><span>Write as much or as little as you like.</span><span>{answer.length}/1000</span></div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-[#eef0e8] px-3.5 py-3 text-[11px] leading-[17px] text-[#738075]"><CircleHelp size={14} className="mt-0.5 shrink-0 text-[#7e9482]" /> Coach P feedback is an optional Pro feature. This reflection is yours to keep, with or without coaching.</div>
              <div className="flex flex-col-reverse gap-2 border-t border-[#e3e4da] pt-4 sm:flex-row sm:justify-end">
                <button onClick={() => setComposerOpen(false)} className="rounded-full px-5 py-3 text-sm font-semibold text-[#6f7e72] hover:bg-[#edf0e8]">Maybe later</button>
                <button onClick={saveEntry} disabled={!answer.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d5d51] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#164a40] disabled:cursor-not-allowed disabled:opacity-45"><Check size={16} /> Save reflection</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14231e]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedEntry(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="entry-detail-title" className="jr-reveal max-h-[94dvh] w-full max-w-[650px] overflow-y-auto rounded-t-[26px] bg-[#f9f8f1] shadow-[0_25px_80px_rgba(12,31,24,.25)] sm:rounded-[26px]">
            <div className="flex items-start justify-between border-b border-[#e2e3d9] px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div style={{ backgroundColor: typeMeta[selectedEntry.type].tint }} className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[14px] text-[#315b4e]">{(() => { const Icon = typeMeta[selectedEntry.type].icon; return <Icon size={18} />; })()}</div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9a7a5d]">{selectedEntry.date} <span className="mx-1 text-[#c7c7b8]">/</span> {selectedEntry.time}</div>
                  <h2 id="entry-detail-title" className="mt-1 font-['Playfair_Display'] text-[25px] font-semibold leading-tight text-[#293c32]">{selectedEntry.type}</h2>
                  {selectedEntry.source && <div className="mt-1 text-xs text-[#78867a]">{selectedEntry.source}</div>}
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} aria-label="Close reflection" className="rounded-full p-2 text-[#77877b] hover:bg-[#e9ece3]"><X size={18} /></button>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#849184]">How I felt</div>
                {editing ? <div className="flex flex-wrap gap-2">{moods.map((mood) => <button key={mood.label} onClick={() => setDetailMood(mood.label)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${detailMood === mood.label ? "border-[#397565] bg-[#e6eee7] text-[#2d6857]" : "border-[#e1e3d9] bg-white text-[#748176]"}`}>{mood.face} {mood.label}</button>)}</div> : <span style={{ color: moods.find((item) => item.label === selectedEntry.mood)?.color }} className="inline-flex items-center gap-2 rounded-full bg-[#eeefe6] px-3 py-1.5 text-xs font-semibold"><span className="text-base">{moods.find((item) => item.label === selectedEntry.mood)?.face}</span>{selectedEntry.mood}</span>}
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#849184]">My reflection</div>
                {editing ? <textarea value={detailAnswer} onChange={(event) => setDetailAnswer(event.target.value)} rows={5} className={`${inputStyle} leading-6`} /> : <p className="rounded-2xl border border-[#e6e5da] bg-[#fffefa] px-4 py-4 text-[14px] leading-[1.75] text-[#526258]">{selectedEntry.answer}</p>}
              </div>
              {selectedEntry.coached && selectedEntry.coachNote && (
                <div className="rounded-2xl border border-[#d5e2d5] bg-[#edf3eb] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#38715d]"><Sparkles size={14} /> Coach P feedback <span className="rounded-full bg-[#dce9da] px-2 py-0.5 text-[9px] uppercase tracking-[.1em]">Pro</span></div>
                  <p className="mt-2 text-[13px] leading-6 text-[#5c7164]">{selectedEntry.coachNote}</p>
                </div>
              )}
              {!selectedEntry.coached && <div className="flex items-start gap-2 rounded-xl bg-[#eef0e8] px-3.5 py-3 text-[11px] leading-[17px] text-[#778378]"><LockKeyhole size={13} className="mt-0.5 shrink-0 text-[#728a78]" /> Coach P can add personalized feedback with PLAYR1 Pro. Your reflection stays yours either way.</div>}
              {deleteConfirm ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#e9d0c7] bg-[#fff3ee] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="text-sm font-bold text-[#934d3b]">Delete this reflection?</div><div className="mt-0.5 text-xs text-[#a47d70]">This can’t be undone.</div></div>
                  <div className="flex gap-2"><button onClick={() => setDeleteConfirm(false)} className="rounded-full px-4 py-2 text-xs font-semibold text-[#7b746c] hover:bg-white">Keep it</button><button onClick={deleteEntry} className="rounded-full bg-[#b84d3b] px-4 py-2 text-xs font-bold text-white hover:bg-[#9f3c2e]">Delete entry</button></div>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 border-t border-[#e3e4da] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => setDeleteConfirm(true)} className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-[#a06555] hover:bg-[#f5e8e1]"><Trash2 size={14} /> Delete</button>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button onClick={() => setSelectedEntry(null)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#6f7e72] hover:bg-[#edf0e8]">Close</button>
                    {editing ? <button onClick={saveEdit} disabled={!detailAnswer.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d5d51] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#164a40] disabled:opacity-50"><Check size={15} /> Save changes</button> : <button onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d5d51] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#164a40]"><Edit3 size={14} /> Edit reflection</button>}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {savedNotice && <div role="status" className="jr-reveal fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#193f35] px-5 py-3 text-sm font-semibold text-[#f7f3df] shadow-[0_12px_32px_rgba(18,48,37,.25)]"><Check size={16} className="text-[#a8d0a9]" />{savedNotice}</div>}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-xl border border-[#dfe2d8] bg-[#fffefa] px-3 py-2.5 pr-8 text-xs font-medium text-[#5e6e62] outline-none transition focus:border-[#267364] focus:ring-2 focus:ring-[#267364]/15">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b978d]" />
    </label>
  );
}