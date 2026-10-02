import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDownUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Edit3,
  Filter,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
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

const moods: { label: Mood; color: string }[] = [
  { label: "Locked in", color: "#86b8a3" },
  { label: "Proud", color: "#ff9a52" },
  { label: "Still learning", color: "#87a9d0" },
  { label: "Frustrated", color: "#e78372" },
  { label: "Tired", color: "#b0a0bd" },
];

const typeMeta: Record<ReflectionType, { icon: typeof Dumbbell; label: string }> = {
  "Practice / workout": { icon: Dumbbell, label: "Practice" },
  Game: { icon: Trophy, label: "Game" },
  "Open reflection": { icon: BookOpen, label: "Open" },
};

const inputStyle =
  "w-full rounded-xl border border-white/[0.10] bg-[#171819] px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/10";

export function JournalRedesign() {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All reflections");
  const [moodFilter, setMoodFilter] = useState("Any mood");
  const [coachFilter, setCoachFilter] = useState("Any coaching");
  const [sourceFilter, setSourceFilter] = useState("Any source");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
  const [detailCoachInfoOpen, setDetailCoachInfoOpen] = useState(false);

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
        sourceFilter === "Any source" || (sourceFilter === "Linked" ? linked : !linked);
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
    setDetailCoachInfoOpen(false);
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

  const notifySaved = (message: string) => {
    setSavedNotice(message);
    window.setTimeout(() => setSavedNotice(""), 2600);
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
    notifySaved("Saved to your journal");
  };

  const saveEdit = () => {
    if (!selectedEntry || !detailAnswer.trim()) return;
    const updated = { ...selectedEntry, answer: detailAnswer.trim(), mood: detailMood };
    setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedEntry(updated);
    setEditing(false);
    notifySaved("Changes saved");
  };

  const deleteEntry = () => {
    if (!selectedEntry) return;
    setEntries((current) => current.filter((item) => item.id !== selectedEntry.id));
    setSelectedEntry(null);
    setDeleteConfirm(false);
    notifySaved("Reflection deleted");
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

  const hasActiveFilters =
    search ||
    typeFilter !== "All reflections" ||
    moodFilter !== "Any mood" ||
    coachFilter !== "Any coaching" ||
    sourceFilter !== "Any source" ||
    fromDate ||
    toDate;
  const displayedEntries = showAll ? visibleEntries : visibleEntries.slice(0, 3);
  const isPro = false;

  return (
    <div className="jr-page min-h-[100dvh] bg-[#141516] text-zinc-100">
      <style>{`
        .jr-page { font-family: 'Avenir Next', 'Segoe UI', ui-sans-serif, sans-serif; }
        .jr-reveal { animation: jr-rise .32s cubic-bezier(.2,.7,.2,1) both; }
        .jr-delay-1 { animation-delay: 45ms; }
        .jr-delay-2 { animation-delay: 90ms; }
        .jr-delay-3 { animation-delay: 135ms; }
        @keyframes jr-rise { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
        .jr-scroll::-webkit-scrollbar { width: 5px; }
        .jr-scroll::-webkit-scrollbar-thumb { background: #3a3b3c; border-radius: 8px; }
        @media (prefers-reduced-motion: reduce) { .jr-reveal { animation: none; } }
      `}</style>

      <header className="border-b border-white/[0.07] bg-[#171819]">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3 px-4 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <span aria-hidden="true" className="h-5 w-px bg-white/[0.10]" />
            <h1 className="font-['Bebas_Neue'] text-[22px] leading-none tracking-[.05em] text-zinc-100">Journal</h1>
          </div>
          <button
            type="button"
            onClick={openComposer}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-3.5 text-xs font-extrabold text-[#17130f] transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300/70 sm:px-4 sm:text-sm"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>New reflection</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-4 pb-8 pt-5 sm:px-7 sm:pt-7">
        <p className="jr-reveal mb-4 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <MessageCircle size={13} className="text-orange-300" />
          Coach P can review saved entries
          {!isPro && <span className="ml-1 rounded-full border border-orange-300/20 bg-orange-400/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-orange-200">Pro</span>}
        </p>

        <section className="jr-reveal jr-delay-1" aria-labelledby="saved-reflections-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="saved-reflections-heading" className="font-['Bebas_Neue'] text-[25px] leading-none tracking-[.04em] text-zinc-100">Saved reflections</h2>
            <div className="text-[10px] font-semibold text-zinc-500">{visibleEntries.length}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#1b1c1d] p-3 sm:p-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reflections"
                  aria-label="Search reflections"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#151617] py-2.5 pl-9 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/10"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${filtersOpen || hasActiveFilters ? "border-orange-300/30 bg-orange-400/10 text-orange-100" : "border-white/[0.08] bg-[#151617] text-zinc-400 hover:text-zinc-200"}`}
              >
                <Filter size={14} /> <span className="hidden sm:inline">Filter</span><ChevronDown size={13} className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {filtersOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3 sm:grid-cols-4">
                <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={["All reflections", "Practice / workout", "Game", "Open reflection"]} />
                <FilterSelect label="Mood" value={moodFilter} onChange={setMoodFilter} options={["Any mood", ...moods.map((item) => item.label)]} />
                <FilterSelect label="Coaching" value={coachFilter} onChange={setCoachFilter} options={["Any coaching", "Coach P feedback", "No Coach P feedback"]} />
                <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={["Any source", "Linked", "Not linked"]} />
                <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151617] px-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">From</span>
                  <input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[10px] text-zinc-300 outline-none" />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151617] px-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">To</span>
                  <input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[10px] text-zinc-300 outline-none" />
                </label>
                {hasActiveFilters && (
                  <button type="button" onClick={resetFilters} className="text-left text-[11px] font-semibold text-orange-300 hover:text-orange-200 sm:col-span-2">Clear filters</button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {displayedEntries.length ? displayedEntries.map((entry, index) => {
              const meta = typeMeta[entry.type];
              const Icon = meta.icon;
              const moodMeta = moods.find((item) => item.label === entry.mood);
              return (
                <article
                  key={entry.id}
                  onClick={() => openEntry(entry)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openEntry(entry); } }}
                  role="button"
                  tabIndex={0}
                  className={`jr-reveal jr-delay-${Math.min(index + 1, 3)} group cursor-pointer rounded-xl border border-white/[0.075] bg-[#1b1c1d] px-3.5 py-3 text-left transition hover:border-orange-300/25 hover:bg-[#202122] focus:outline-none focus:ring-2 focus:ring-orange-400/35 sm:px-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/10 bg-orange-400/[0.09] text-orange-300">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-xs font-bold text-zinc-100">{entry.type}</h3>
                        {entry.coached && <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-[9px] font-bold text-orange-200"><Sparkles size={10} /> Coach P</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-zinc-500">
                        <span className="inline-flex items-center gap-1"><Clock3 size={11} />{entry.time}</span>
                        {entry.source && <span className="inline-flex items-center gap-1 text-zinc-400"><ArrowDownUp size={10} />{entry.source}</span>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-[1.55] text-zinc-400">{entry.answer}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.045] px-2 py-1 text-[9px] font-semibold text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: moodMeta?.color }} />{entry.mood}
                      </span>
                      <ChevronRight size={16} className="mt-2 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-300" />
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-white/[0.12] bg-[#1a1b1c] px-5 py-9 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Search size={18} /></div>
                <h3 className="mt-3 text-sm font-bold text-zinc-200">No reflections found</h3>
                <p className="mt-1 text-xs text-zinc-500">Try another search or clear your filters.</p>
                <button type="button" onClick={resetFilters} className="mt-3 rounded-lg bg-orange-500 px-3 py-2 text-[11px] font-bold text-zinc-950 hover:bg-orange-400">Clear filters</button>
              </div>
            )}
          </div>
          {visibleEntries.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-2.5 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-orange-300 transition hover:bg-orange-400/[0.07] hover:text-orange-200"
            >
              {showAll ? "Show fewer" : `Show all ${visibleEntries.length} reflections`}
              <ChevronDown size={13} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
            </button>
          )}
        </section>
      </main>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposerOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="composer-title" className="jr-reveal max-h-[94dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[24px] border border-white/[0.09] bg-[#1b1c1d] shadow-[0_25px_80px_rgba(0,0,0,.55)] sm:rounded-[24px]">
            <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[.18em] text-orange-300">Make it yours</div>
                <h2 id="composer-title" className="mt-1 font-['Bebas_Neue'] text-[28px] leading-none tracking-[.04em] text-zinc-50">New reflection</h2>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close reflection form" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"><X size={18} /></button>
            </div>
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <div className="mb-2 text-[11px] font-bold text-zinc-300">What are you reflecting on?</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["Practice / workout", "Game", "Open reflection"] as ReflectionType[]).map((type) => {
                    const Icon = typeMeta[type].icon;
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => { setEntryType(type); setEntrySource(""); }}
                        aria-pressed={entryType === type}
                        className={`flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-[10px] font-semibold transition ${entryType === type ? "border-orange-300/60 bg-orange-400/10 text-orange-100" : "border-white/[0.08] bg-[#171819] text-zinc-500 hover:border-white/20 hover:text-zinc-300"}`}
                      >
                        <Icon size={16} />{typeMeta[type].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {entryType !== "Open reflection" && (
                <div>
                  <label htmlFor="entry-source" className="mb-2 block text-[11px] font-bold text-zinc-300">Link to a {entryType === "Game" ? "game" : "workout"} <span className="font-normal text-zinc-600">· optional</span></label>
                  <div className="relative">
                    <select id="entry-source" value={entrySource} onChange={(event) => setEntrySource(event.target.value)} className={`${inputStyle} appearance-none pr-10`}>
                      <option value="">No link</option>
                      {entryType === "Game" ? <><option>Game · vs. Northside</option><option>Game · East Valley tournament</option></> : <><option>Workout · Shooting Lab</option><option>Workout · Handle + finish</option><option>Workout · Team practice</option></>}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-[11px] font-bold text-zinc-300">Mood <span className="font-normal text-zinc-600">· optional</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {moods.map((mood) => (
                    <button type="button" key={mood.label} onClick={() => setEntryMood(entryMood === mood.label ? "" : mood.label)} aria-pressed={entryMood === mood.label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition ${entryMood === mood.label ? "border-orange-300/45 bg-orange-400/10 text-orange-100" : "border-white/[0.08] bg-[#171819] text-zinc-500 hover:text-zinc-300"}`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mood.color }} />{mood.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="reflection-text" className="mb-2 block text-[11px] font-bold text-zinc-300">What do you want to remember?</label>
                <textarea id="reflection-text" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} maxLength={1000} placeholder="A moment, a lesson, or what you’ll try next time…" className={`${inputStyle} resize-y leading-5`} />
                <div className="mt-1 flex justify-between text-[9px] text-zinc-600"><span>Short or long. It’s yours.</span><span>{answer.length}/1000</span></div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-orange-300/10 bg-orange-400/[0.045] px-3 py-2.5 text-[10px] text-zinc-400">
                <LockKeyhole size={12} className="shrink-0 text-orange-300" /> Save reflections free. Coach P feedback is Pro.
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setComposerOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200">Cancel</button>
                <button type="button" onClick={saveEntry} disabled={!answer.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-extrabold text-zinc-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"><Check size={15} /> Save reflection</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedEntry(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="entry-detail-title" className="jr-reveal max-h-[94dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[24px] border border-white/[0.09] bg-[#1b1c1d] shadow-[0_25px_80px_rgba(0,0,0,.55)] sm:rounded-[24px]">
            <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/10 bg-orange-400/[0.09] text-orange-300">{(() => { const Icon = typeMeta[selectedEntry.type].icon; return <Icon size={16} />; })()}</div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[.14em] text-zinc-500">{selectedEntry.date} <span className="mx-1 text-orange-400">/</span> {selectedEntry.time}</div>
                  <h2 id="entry-detail-title" className="mt-1 font-['Bebas_Neue'] text-[25px] leading-none tracking-[.04em] text-zinc-50">{selectedEntry.type}</h2>
                  {selectedEntry.source && <div className="mt-1 text-[11px] text-zinc-400">{selectedEntry.source}</div>}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedEntry(null)} aria-label="Close reflection" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"><X size={18} /></button>
            </div>
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <div className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-zinc-500">How I felt</div>
                {editing ? (
                  <div className="flex flex-wrap gap-1.5">{moods.map((mood) => <button type="button" key={mood.label} onClick={() => setDetailMood(mood.label)} aria-pressed={detailMood === mood.label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${detailMood === mood.label ? "border-orange-300/45 bg-orange-400/10 text-orange-100" : "border-white/[0.08] bg-[#171819] text-zinc-500"}`}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mood.color }} />{mood.label}</button>)}</div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: moods.find((item) => item.label === selectedEntry.mood)?.color }} />{selectedEntry.mood}</span>
                )}
              </div>
              <div>
                <div className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-zinc-500">My reflection</div>
                {editing ? <textarea value={detailAnswer} onChange={(event) => setDetailAnswer(event.target.value)} rows={5} maxLength={1000} className={`${inputStyle} leading-6`} /> : <p className="rounded-xl border border-white/[0.07] bg-[#171819] px-4 py-3.5 text-[13px] leading-6 text-zinc-300">{selectedEntry.answer}</p>}
              </div>
              {selectedEntry.coached && selectedEntry.coachNote ? (
                <div className="rounded-xl border border-orange-300/15 bg-orange-400/[0.06] p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-orange-200"><Sparkles size={13} /> Coach P feedback <span className="rounded-full bg-orange-400/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-orange-300">Pro</span></div>
                  <p className="mt-2 text-xs leading-5 text-zinc-300">{selectedEntry.coachNote}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-orange-300/15 bg-orange-400/[0.04] p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200"><MessageCircle size={13} className="text-orange-300" /> Want Coach P’s take?</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-[10px] leading-4 text-zinc-500">Personal feedback is part of PLAYR1 Pro.</p>
                    <button type="button" onClick={() => setDetailCoachInfoOpen((current) => !current)} aria-expanded={detailCoachInfoOpen} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-orange-300/20 px-2 py-1.5 text-[9px] font-bold text-orange-200 hover:bg-orange-400/10"><LockKeyhole size={10} /> Pro review</button>
                  </div>
                  {detailCoachInfoOpen && <p className="mt-2 border-t border-white/[0.07] pt-2 text-[10px] leading-4 text-zinc-400">Your reflection is saved either way. Upgrade to PLAYR1 Pro to get personalized Coach P feedback.</p>}
                </div>
              )}
              {deleteConfirm ? (
                <div className="flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="text-xs font-bold text-red-200">Delete this reflection?</div><div className="mt-0.5 text-[10px] text-zinc-500">This can’t be undone.</div></div>
                  <div className="flex gap-2"><button type="button" onClick={() => setDeleteConfirm(false)} className="rounded-lg px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:bg-white/[0.06]">Keep it</button><button type="button" onClick={deleteEntry} className="rounded-lg bg-red-500 px-3 py-2 text-[10px] font-bold text-white hover:bg-red-400">Delete</button></div>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-zinc-500 hover:bg-red-400/[0.08] hover:text-red-300"><Trash2 size={13} /> Delete</button>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button type="button" onClick={() => setSelectedEntry(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200">Close</button>
                    {editing ? <button type="button" onClick={saveEdit} disabled={!detailAnswer.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-extrabold text-zinc-950 hover:bg-orange-400 disabled:opacity-40"><Check size={14} /> Save changes</button> : <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-extrabold text-zinc-950 hover:bg-orange-400"><Edit3 size={13} /> Edit reflection</button>}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {savedNotice && <div role="status" className="jr-reveal fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-orange-300/20 bg-[#242526] px-4 py-2.5 text-xs font-semibold text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,.4)]"><Check size={14} className="text-orange-300" />{savedNotice}</div>}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-white/[0.08] bg-[#151617] px-2.5 py-2.5 pr-8 text-[10px] font-medium text-zinc-300 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/10">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
    </label>
  );
}