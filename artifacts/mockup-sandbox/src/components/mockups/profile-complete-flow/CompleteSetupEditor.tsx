import { ArrowLeft, Save } from "lucide-react";
import "./_group.css";

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <span className="flex min-h-10 items-center rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
        {value}
      </span>
    </label>
  );
}

const skillRanks = [
  ["Best", "Shooting"],
  ["2nd Best", "Ball Handling"],
  ["Worst", "Defense"],
  ["Improve most", "Finishing"],
];

const positions = ["PG", "SG", "SF", "PF", "C"];

export function CompleteSetupEditor() {
  return (
    <main className="profile-complete-flow min-h-screen bg-[#090909] px-4 py-5 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <button
            type="button"
            className="-ml-2 mb-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white"
            data-testid="button-back-edit-profile"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-black tracking-tight text-white">Edit Profile</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Update your five-step setup, player pathway, and recruiting profile
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/70">
          <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-white">Player setup answers</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Edit the answers from your five-step setup, including ranked skills and the player pathway used on your Hub.
            </p>
          </div>

          <div className="space-y-6 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value="Jordan" />
              <Field label="Last name" value="Reyes" />
              <Field label="Where are you in basketball?" value="Varsity" />
              <Field label="Main goal" value="Play at the next level" />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-zinc-200">Rank your skills</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {skillRanks.map(([rank, skill]) => (
                  <Field key={rank} label={rank} value={skill} />
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-zinc-200">Positions</legend>
              <div className="flex flex-wrap gap-2">
                {positions.map((position) => (
                  <span
                    key={position}
                    className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                      ["PG", "SG"].includes(position)
                        ? "border-orange-400 bg-orange-500/15 text-orange-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {position}
                  </span>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Training days per week" value="4 days per week" />
              <Field label="Current team role" value="Starter / 6th Man" />
              <Field label="Basketball pathway" value="Play at the next level" />
              <Field label="Years playing basketball" value="7" />
              <Field label="Years playing competitively" value="4" />
              <Field label="Team name" value="Northside Eagles" />
            </div>

            <div className="flex justify-end border-t border-zinc-800 pt-4">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-md bg-orange-500 px-4 text-sm font-bold text-zinc-950 hover:bg-orange-400"
              >
                <Save className="mr-2 h-4 w-4" />
                Save setup answers
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Player Profile Information</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Your additional player, academics, location, and physical details remain editable below.
          </p>
        </section>
      </div>
    </main>
  );
}