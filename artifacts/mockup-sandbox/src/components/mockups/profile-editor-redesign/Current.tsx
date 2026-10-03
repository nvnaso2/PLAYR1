import "./_group.css";
import { BarChart3, GraduationCap, MapPin, Ruler, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const positions = ["PG", "SG", "SF", "PF", "C"];
const stats = ["PPG", "RPG", "APG", "SPG", "BPG", "GP", "W-L"];

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={`block min-w-0 space-y-1.5 ${wide ? "col-span-2" : ""}`}>
      <span className="text-[11px] text-zinc-400">{label}</span>
      <span className="flex h-8 items-center rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs text-zinc-100">
        {value}
      </span>
    </label>
  );
}

function Section({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <section className="space-y-2 border-t border-zinc-800 pt-2 first:border-0 first:pt-0">
      <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5 text-orange-400" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Current() {
  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-5 text-zinc-100">
      <div className="mx-auto max-w-md space-y-3">
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">
            PLAYR1 · Player profile
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight">Player Profile</h1>
          <p className="mt-1 text-xs text-zinc-500">Your player card and recruiting details.</p>
        </header>

        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 shadow-none">
          <div className="px-3 pb-2 pt-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <UserRound className="h-4 w-4 text-orange-400" />
              Player Profile Information
            </h2>
          </div>
          <div className="space-y-2 px-3 pb-3 pt-0">
          <Section title="Player">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Grade" value="High school junior" />
              <Field label="Jersey #" value="7" />
              <Field label="Team" value="Northside Eagles" />
              <Field label="Goal" value="College" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-zinc-400">Position(s)</p>
              <div className="flex flex-wrap gap-1">
                {positions.map((position) => (
                  <span
                    key={position}
                    className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                      ["PG", "SG"].includes(position)
                        ? "border-orange-400 bg-orange-500/15 text-orange-200"
                        : "border-zinc-700 bg-zinc-950 text-zinc-400"
                    }`}
                  >
                    {position}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          <Section title="About">
            <Field label="Headline" value="Class of 2027 · Two-way point guard" wide />
            <label className="block min-w-0 space-y-1">
              <span className="text-[11px] text-zinc-400">Bio</span>
              <span className="flex min-h-[52px] items-center rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-100">
                A high-motor guard who creates for teammates and competes on defense.
              </span>
            </label>
          </Section>

          <Section title="Card stats" icon={BarChart3}>
            <p className="text-[10px] text-zinc-500">Choose up to 3 to show on the back of your player card.</p>
            <div className="grid grid-cols-4 gap-1.5">
              {stats.map((stat, index) => (
                <span
                  key={stat}
                  className={`rounded-md border px-2 py-1.5 text-center text-[10px] font-bold ${
                    index < 3
                      ? "border-orange-400 bg-orange-500/15 text-orange-200"
                      : "border-zinc-700 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  {stat}
                </span>
              ))}
            </div>
          </Section>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold">
            <MapPin className="h-4 w-4 text-orange-400" />
            Location
          </h2>
          <div className="space-y-2">
            <Field label="Country" value="United States" wide />
            <div className="grid grid-cols-2 gap-2">
              <Field label="City" value="Atlanta" />
              <Field label="State" value="Georgia" />
            </div>
            <Field label="Zip Code" value="30309" wide />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold">
            <Ruler className="h-4 w-4 text-orange-400" />
            Physical Attributes
          </h2>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Height (ft)" value="6′" />
              <Field label="Height (in)" value="2″" />
              <Field label="Weight (lbs)" value="185" />
              <Field label="Wingspan" value="6′7″" />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold">
            <GraduationCap className="h-4 w-4 text-orange-400" />
            Academics
          </h2>
          <div className="space-y-2">
            <Field label="School" value="Northside High School" wide />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Graduation Year" value="2027" />
              <Field label="GPA" value="3.7" />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button className="h-9 rounded-md bg-orange-500 px-4 text-xs font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.22)]">
            Save profile information
          </button>
        </div>
      </div>
    </main>
  );
}