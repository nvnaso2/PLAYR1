import "./_group.css";
import { useState } from "react";
import type { ReactNode } from "react";

const positions = ["PG", "SG", "SF", "PF", "C"];
const stats = ["PPG", "RPG", "APG", "SPG", "BPG", "GP", "W-L"];
const steps = [
  { title: "General player information", short: "Player" },
  { title: "Location", short: "Location" },
  { title: "Physical attributes", short: "Physical" },
  { title: "Academics", short: "Academics" },
  { title: "About", short: "About" },
  { title: "Card stats", short: "Stats" },
];

type Profile = {
  grade: string;
  jersey: string;
  team: string;
  goal: string;
  positions: string[];
  country: string;
  city: string;
  state: string;
  zip: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  wingspan: string;
  school: string;
  graduationYear: string;
  gpa: string;
  headline: string;
  bio: string;
  cardStats: string[];
};

function Field({
  label,
  value,
  onChange,
  wide = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={`block min-w-0 space-y-1.5 ${wide ? "col-span-2" : ""}`}>
      <span className="text-[11px] font-medium text-zinc-400">{label}</span>
      <input
        className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export function Updated() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile>({
    grade: "High school junior",
    jersey: "7",
    team: "Northside Eagles",
    goal: "College",
    positions: ["PG", "SG"],
    country: "United States",
    city: "Atlanta",
    state: "Georgia",
    zip: "30309",
    heightFeet: "6",
    heightInches: "2",
    weight: "185",
    wingspan: "6′7″",
    school: "Northside High School",
    graduationYear: "2027",
    gpa: "3.7",
    headline: "Class of 2027 · Two-way point guard",
    bio: "A high-motor guard who creates for teammates and competes on defense.",
    cardStats: ["PPG", "RPG", "APG"],
  });

  const update = (key: keyof Profile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const togglePosition = (position: string) => {
    setProfile((current) => ({
      ...current,
      positions: current.positions.includes(position)
        ? current.positions.filter((item) => item !== position)
        : [...current.positions, position],
    }));
  };

  const toggleStat = (stat: string) => {
    setProfile((current) => {
      const selected = current.cardStats.includes(stat);
      if (selected) return { ...current, cardStats: current.cardStats.filter((item) => item !== stat) };
      if (current.cardStats.length >= 3) return current;
      return { ...current, cardStats: [...current.cardStats, stat] };
    });
  };

  const finish = () => setSaved(true);

  return (
    <main className="min-h-[100dvh] bg-[#09090b] px-3 py-5 text-zinc-100 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-[430px]">
        {saved !== null ? (
          <div className="animate-in fade-in duration-300">
            <header className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">PLAYR1 · Player profile</p>
              <h1 className="mt-1 text-xl font-black tracking-tight">Your player card</h1>
              <p className="mt-1 text-xs text-zinc-500">
                {saved ? "Profile saved for this preview." : "No changes were saved."}
              </p>
            </header>
            <article className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <div className="relative border-b border-zinc-800 bg-[linear-gradient(120deg,rgba(249,115,22,0.16),transparent_64%)] p-4">
                <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/30 bg-orange-500/10 text-sm font-black text-orange-300">
                  {profile.jersey || "—"}
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">PLAYR1 athlete</p>
                <h2 className="mt-5 max-w-[280px] text-lg font-black leading-tight tracking-tight">
                  {profile.headline || "Player profile"}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">{profile.team || "Team not set"}</p>
              </div>
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {profile.positions.length ? profile.positions.map((position) => (
                    <span key={position} className="rounded-md border border-orange-400/40 bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-200">{position}</span>
                  )) : <span className="text-xs text-zinc-500">No positions selected</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Grade</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-200">{profile.grade || "—"}</p>
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Goal</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-200">{profile.goal || "—"}</p>
                  </div>
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Card stats</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.cardStats.length ? profile.cardStats.map((stat) => (
                      <span key={stat} className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[10px] font-bold text-zinc-200">{stat}</span>
                    )) : <span className="text-xs text-zinc-500">No stats selected</span>}
                  </div>
                </div>
              </div>
            </article>
            <button
              type="button"
              onClick={() => {
                setSaved(null);
                setStep(0);
              }}
              className="mt-3 h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Edit profile
            </button>
          </div>
        ) : (
          <>
            <header className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">PLAYR1 · Player profile</p>
              <h1 className="mt-1 text-xl font-black tracking-tight">Player Profile Information</h1>
              <p className="mt-1 text-xs text-zinc-500">A clear picture of your game, one quick step at a time.</p>
            </header>

            <div className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/65 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Profile setup</span>
                <span className="font-mono text-[10px] text-zinc-400">{String(step + 1).padStart(2, "0")} <span className="text-zinc-600">/ 06</span></span>
              </div>
              <ol className="grid grid-cols-6 gap-1.5" aria-label="Six profile steps">
                {steps.map((item, index) => {
                  const complete = index < step;
                  const active = index === step;
                  return (
                    <li key={item.title} aria-current={active ? "step" : undefined} aria-label={`${index + 1}. ${item.title}`} className="min-w-0">
                      <div className={`mb-1 h-1 rounded-full ${complete || active ? "bg-orange-400" : "bg-zinc-700"}`} />
                      <span className={`block truncate text-[8px] font-semibold leading-tight sm:text-[9px] ${active ? "text-orange-200" : complete ? "text-zinc-300" : "text-zinc-600"}`}>
                        {item.short}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 sm:p-4">
              <div className="mb-4 border-b border-zinc-800 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-400">Step {step + 1} of 6</p>
                <h2 className="mt-1 text-base font-bold tracking-tight text-zinc-100">{steps[step].title}</h2>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <Section title="Player">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Grade" value={profile.grade} onChange={(value) => update("grade", value)} placeholder="High school junior" />
                      <Field label="Jersey #" value={profile.jersey} onChange={(value) => update("jersey", value)} />
                      <Field label="Team" value={profile.team} onChange={(value) => update("team", value)} />
                      <Field label="Goal" value={profile.goal} onChange={(value) => update("goal", value)} />
                    </div>
                  </Section>
                  <Section title="Position(s)">
                    <div className="flex flex-wrap gap-1.5">
                      {positions.map((position) => {
                        const selected = profile.positions.includes(position);
                        return (
                          <button
                            key={position}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => togglePosition(position)}
                            className={`min-w-10 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition ${selected ? "border-orange-400 bg-orange-500/15 text-orange-200" : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500"}`}
                          >
                            {position}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Section title="Location">
                    <Field label="Country" value={profile.country} onChange={(value) => update("country", value)} wide />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="City" value={profile.city} onChange={(value) => update("city", value)} />
                      <Field label="State" value={profile.state} onChange={(value) => update("state", value)} />
                    </div>
                    <Field label="Zip Code" value={profile.zip} onChange={(value) => update("zip", value)} wide />
                  </Section>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Section title="Physical attributes">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Height (ft)" value={profile.heightFeet} onChange={(value) => update("heightFeet", value)} />
                      <Field label="Height (in)" value={profile.heightInches} onChange={(value) => update("heightInches", value)} />
                      <Field label="Weight (lbs)" value={profile.weight} onChange={(value) => update("weight", value)} />
                      <Field label="Wingspan" value={profile.wingspan} onChange={(value) => update("wingspan", value)} />
                    </div>
                  </Section>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <Section title="Academics">
                    <Field label="School" value={profile.school} onChange={(value) => update("school", value)} wide />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Graduation Year" value={profile.graduationYear} onChange={(value) => update("graduationYear", value)} />
                      <Field label="GPA" value={profile.gpa} onChange={(value) => update("gpa", value)} />
                    </div>
                  </Section>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <Section title="About">
                    <Field label="Headline" value={profile.headline} onChange={(value) => update("headline", value)} wide />
                    <label className="block space-y-1.5">
                      <span className="text-[11px] font-medium text-zinc-400">Bio</span>
                      <textarea
                        rows={3}
                        value={profile.bio}
                        onChange={(event) => update("bio", event.target.value)}
                        className="min-h-[76px] w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
                      />
                    </label>
                  </Section>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <Section title="Card stats">
                    <div>
                      <p className="text-[11px] leading-relaxed text-zinc-400">Choose up to 3 stats for the back of your card.</p>
                      <p className="mt-1 text-[10px] text-zinc-600">{profile.cardStats.length} of 3 selected</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {stats.map((stat) => {
                        const selected = profile.cardStats.includes(stat);
                        const atLimit = profile.cardStats.length >= 3;
                        return (
                          <button
                            key={stat}
                            type="button"
                            aria-pressed={selected}
                            disabled={!selected && atLimit}
                            onClick={() => toggleStat(stat)}
                            className={`rounded-md border px-2 py-2 text-center text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "border-orange-400 bg-orange-500/15 text-orange-200" : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500"}`}
                          >
                            {stat}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                </div>
              )}
            </section>

            <div className="mt-3 flex items-center justify-between gap-2">
              {step === 0 ? (
                <button
                  type="button"
                  onClick={() => setSaved(false)}
                  className="h-9 rounded-md px-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-100"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                >
                  Back
                </button>
              )}
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(5, current + 1))}
                  className="h-9 rounded-md bg-orange-500 px-4 text-xs font-bold text-white shadow-[0_5px_18px_rgba(249,115,22,0.18)] transition hover:bg-orange-400 active:translate-y-px"
                >
                  Next <span aria-hidden="true" className="ml-1">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finish}
                  className="h-9 rounded-md bg-orange-500 px-4 text-xs font-bold text-white shadow-[0_5px_18px_rgba(249,115,22,0.18)] transition hover:bg-orange-400 active:translate-y-px"
                >
                  Save &amp; finish
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}