import { useState } from "react";
import { ArrowLeft, ArrowRight, Save, UserRound } from "lucide-react";
import "./_group.css";

const steps = [
  { title: "Player", detail: "Your name, current level, and positions." },
  { title: "Development", detail: "Your skill strengths, goals, and training experience." },
  { title: "Team & Location", detail: "Your team, pathway, and where you play." },
  { title: "Physical & Academics", detail: "Your measurements, school, and graduation details." },
  { title: "About", detail: "Introduce yourself and how you play." },
  { title: "Card Stats", detail: "Choose the career numbers shown on your player card." },
];

const situations = [
  "Elementary School", "Middle School", "Freshman / JV", "Varsity",
  "College Basketball", "Intramural League", "Adult Rec League", "Just Playing For Fun",
];
const skills = [
  "Ball Handling", "Shooting", "Finishing", "Passing",
  "Defense", "Basketball IQ", "Athleticism", "Rebounding",
];
const goals = [
  "Make a team I'm trying out for",
  "Earn more playing time / a bigger role",
  "Play at the next level",
  "Just looking to improve in general",
  "Play for fun",
];
const teamRoles = [
  "Not On A Team / Learning the game",
  "Limited Minutes / Looking to Make a Team",
  "Rotation Player",
  "Starter / 6th Man",
  "Key Player",
  "Team Leader",
];
const positions = ["PG", "SG", "SF", "PF", "C"];
const cardStats = ["PPG", "RPG", "APG", "SPG", "BPG", "GP", "W-L"];

type Draft = {
  firstName: string;
  lastName: string;
  situation: string;
  jersey: string;
  positions: string[];
  skillRankings: Record<string, string>;
  primaryGoal: string;
  trainingDays: string;
  trainingPeriod: string;
  experience: string;
  competitiveExperience: string;
  teamName: string;
  teamRole: string;
  pathway: string;
  city: string;
  state: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  wingspan: string;
  grade: string;
  school: string;
  graduationYear: string;
  gpa: string;
  headline: string;
  bio: string;
  selectedStats: string[];
};

const rankFields = [
  ["best", "Strongest skill"],
  ["secondBest", "Second strongest"],
  ["worst", "Needs the most work"],
  ["improveMost", "Top improvement focus"],
] as const;

function InputField({
  label,
  value,
  onChange,
  type = "text",
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block min-w-0 space-y-1 ${wide ? "col-span-2" : ""}`}>
      <span className="text-[11px] font-medium text-zinc-400">{label}</span>
      <input
        className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="text-[11px] font-medium text-zinc-400">{label}</span>
      <select
        className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function CompleteSetupEditor() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    firstName: "Jordan",
    lastName: "Reyes",
    situation: "Varsity",
    jersey: "7",
    positions: ["PG", "SG"],
    skillRankings: {
      best: "Shooting",
      secondBest: "Ball Handling",
      worst: "Defense",
      improveMost: "Finishing",
    },
    primaryGoal: "Play at the next level",
    trainingDays: "4",
    trainingPeriod: "week",
    experience: "7",
    competitiveExperience: "4",
    teamName: "Northside Eagles",
    teamRole: "Starter / 6th Man",
    pathway: "College",
    city: "Atlanta",
    state: "Georgia",
    heightFeet: "6",
    heightInches: "2",
    weight: "185",
    wingspan: "6′7″",
    grade: "Junior",
    school: "Northside High School",
    graduationYear: "2027",
    gpa: "3.7",
    headline: "Class of 2027 · Two-way point guard",
    bio: "A high-motor guard who creates for teammates and competes on defense.",
    selectedStats: ["PPG", "RPG", "APG"],
  });

  const update = (key: keyof Draft, value: string) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleListItem = (key: "positions" | "selectedStats", item: string, limit: number) => {
    setSaved(false);
    setDraft((current) => {
      const selected = current[key];
      if (selected.includes(item)) {
        return { ...current, [key]: selected.filter((value) => value !== item) };
      }
      if (selected.length >= limit) return current;
      return { ...current, [key]: [...selected, item] };
    });
  };

  return (
    <main className="profile-complete-flow min-h-screen bg-[#090909] px-4 py-5 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4">
          <button
            type="button"
            className="-ml-2 mb-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Edit Profile</h1>
          <p className="mt-1 text-xs text-zinc-500">Update your player details and profile card in one six-step flow.</p>
        </header>

        <section className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-400">Player profile setup</p>
            <span className="text-[10px] font-semibold tabular-nums text-zinc-500">{step + 1} of {steps.length}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((item, index) => (
              <span
                key={item.title}
                aria-current={index === step ? "step" : undefined}
                className={`h-1.5 rounded-full ${index <= step ? "bg-orange-400" : "bg-zinc-800"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">{steps[step].detail}</p>
        </section>

        <section className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 shadow-none">
          <header className="flex items-center gap-2 px-3 pb-2 pt-3">
            <UserRound className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">{steps[step].title}</h2>
          </header>
          <div className="space-y-3 px-3 pb-3">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="First name" value={draft.firstName} onChange={(value) => update("firstName", value)} />
                  <InputField label="Last name" value={draft.lastName} onChange={(value) => update("lastName", value)} />
                  <SelectField label="Where are you in basketball?" value={draft.situation} options={situations} onChange={(value) => update("situation", value)} />
                  <InputField label="Jersey #" value={draft.jersey} onChange={(value) => update("jersey", value)} />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium text-zinc-400">Position(s)</p>
                  <div className="flex flex-wrap gap-1">
                    {positions.map((position) => (
                      <button
                        key={position}
                        type="button"
                        aria-pressed={draft.positions.includes(position)}
                        onClick={() => toggleListItem("positions", position, 5)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                          draft.positions.includes(position)
                            ? "border-orange-400 bg-orange-500/15 text-orange-200"
                            : "border-zinc-700 bg-zinc-950 text-zinc-400"
                        }`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <fieldset className="space-y-2">
                  <legend className="text-[11px] font-medium text-zinc-400">Rank your skills</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {rankFields.map(([key, label]) => (
                      <SelectField
                        key={key}
                        label={label}
                        value={draft.skillRankings[key]}
                        options={skills.filter((skill) =>
                          skill === draft.skillRankings[key] ||
                          !Object.entries(draft.skillRankings).some(([otherKey, otherSkill]) => otherKey !== key && otherSkill === skill)
                        )}
                        onChange={(value) => {
                          setSaved(false);
                          setDraft((current) => ({
                            ...current,
                            skillRankings: { ...current.skillRankings, [key]: value },
                          }));
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-2">
                  <SelectField label="Main goal" value={draft.primaryGoal} options={goals} onChange={(value) => update("primaryGoal", value)} />
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-zinc-400">Training days per</span>
                    <div className="mt-1 flex gap-1">
                      <input
                        type="number"
                        min="0"
                        max={draft.trainingPeriod === "week" ? 7 : 31}
                        value={draft.trainingDays}
                        onChange={(event) => update("trainingDays", event.target.value)}
                        className="h-8 min-w-0 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
                      />
                      <select
                        value={draft.trainingPeriod}
                        onChange={(event) => update("trainingPeriod", event.target.value)}
                        className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
                      >
                        <option value="week">week</option>
                        <option value="month">month</option>
                      </select>
                    </div>
                  </div>
                  <InputField label="Years playing basketball" value={draft.experience} onChange={(value) => update("experience", value)} />
                  <InputField label="Years playing competitively" value={draft.competitiveExperience} onChange={(value) => update("competitiveExperience", value)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Team name" value={draft.teamName} onChange={(value) => update("teamName", value)} />
                  <SelectField label="Current team role" value={draft.teamRole} options={teamRoles} onChange={(value) => update("teamRole", value)} />
                  <SelectField
                    label="Basketball pathway"
                    value={draft.pathway}
                    options={["Recreational", "Feeder team", "AAU", "Middle school", "High school", "College", "Professional", "NBA"]}
                    onChange={(value) => update("pathway", value)}
                  />
                  <InputField label="City" value={draft.city} onChange={(value) => update("city", value)} />
                  <InputField label="State / region" value={draft.state} onChange={(value) => update("state", value)} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <section className="space-y-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Physical attributes</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <InputField label="Height (ft)" value={draft.heightFeet} onChange={(value) => update("heightFeet", value)} />
                    <InputField label="Height (in)" value={draft.heightInches} onChange={(value) => update("heightInches", value)} />
                    <InputField label="Weight (lbs)" value={draft.weight} onChange={(value) => update("weight", value)} />
                    <InputField label="Wingspan" value={draft.wingspan} onChange={(value) => update("wingspan", value)} />
                  </div>
                </section>
                <section className="space-y-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Academics</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <SelectField label="Grade / year" value={draft.grade} options={["Elementary", "6th Grade", "7th Grade", "8th Grade", "Freshman", "Sophomore", "Junior", "Senior", "College", "Post-college"]} onChange={(value) => update("grade", value)} />
                    <InputField label="School" value={draft.school} onChange={(value) => update("school", value)} />
                    <InputField label="Graduation year" value={draft.graduationYear} onChange={(value) => update("graduationYear", value)} />
                    <InputField label="GPA" value={draft.gpa} onChange={(value) => update("gpa", value)} />
                  </div>
                </section>
              </>
            )}

            {step === 4 && (
              <div className="space-y-2">
                <InputField label="Headline" value={draft.headline} onChange={(value) => update("headline", value)} wide />
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-zinc-400">Bio</span>
                  <textarea
                    rows={3}
                    value={draft.bio}
                    onChange={(event) => update("bio", event.target.value)}
                    className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
                  />
                </label>
              </div>
            )}

            {step === 5 && (
              <>
                <p className="text-[10px] text-zinc-500">Choose up to 3 to show on the back of your player card.</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {cardStats.map((stat) => (
                    <button
                      key={stat}
                      type="button"
                      aria-pressed={draft.selectedStats.includes(stat)}
                      onClick={() => toggleListItem("selectedStats", stat, 3)}
                      className={`rounded-md border px-2 py-1.5 text-[10px] font-bold ${
                        draft.selectedStats.includes(stat)
                          ? "border-orange-400 bg-orange-500/15 text-orange-200"
                          : "border-zinc-700 bg-zinc-950 text-zinc-400"
                      }`}
                    >
                      {stat}
                    </button>
                  ))}
                </div>
              </>
            )}

            <footer className="flex items-center justify-between border-t border-zinc-800 pt-3">
              {saved ? <p role="status" className="text-xs text-green-400">Profile saved.</p> : <span />}
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => { setStep((current) => current - 1); setSaved(false); }}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                )}
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => { setStep((current) => current + 1); setSaved(false); }}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-orange-500 px-3 text-xs font-bold text-zinc-950 hover:bg-orange-400"
                  >
                    Continue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSaved(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-orange-500 px-3 text-xs font-bold text-zinc-950 hover:bg-orange-400"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Profile
                  </button>
                )}
              </div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}