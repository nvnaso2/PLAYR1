import { X, ChevronRight } from "lucide-react";
import { volumeWorkoutArt, volumeWorkoutCardArt, volumeWorkoutDrills } from "@/lib/day-three-workout-art";

export function VolumeWorkoutPreview({ onClose, onLogWorkout }: { onClose: () => void; onLogWorkout: () => void }) {
  return (
    <section role="dialog" aria-modal="true" aria-labelledby="volume-workout-title" className="relative overflow-hidden rounded-2xl bg-[#fbfaf7] text-zinc-950 shadow-2xl">
      <button type="button" aria-label="Close workout preview" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full border bg-white p-2"><X className="h-4 w-4" /></button>
      <header className="bg-white px-5 pb-4 pt-6 sm:px-8">
        <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Volume Workout</p>
        <h2 id="volume-workout-title" className="font-heading text-5xl font-black uppercase">Workout <span className="text-orange-600">#1</span></h2>
        <div className="mt-3 h-1 bg-black" />
        <p className="mt-3 text-center font-heading text-lg font-black uppercase">My recommended 200 shot workout for anyone who wants to become an elite shooter</p>
      </header>
      <div className="max-h-[55dvh] space-y-3 overflow-y-auto p-4 sm:p-6">
        {volumeWorkoutDrills.map((drill, index) => (
          <article key={drill.title} className="grid grid-cols-[112px_1fr] gap-3 rounded-xl bg-white p-3 shadow-md sm:grid-cols-[165px_1fr] sm:gap-5 sm:p-4">
            <img src={index === 5 ? volumeWorkoutCardArt : volumeWorkoutArt[index]} alt="" className="w-full self-center object-contain" />
            <div className="self-center">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-orange-600">{index === 5 ? "Streak Challenge" : `Drill #${index + 1}`}</p>
              <h3 className="font-heading text-xl font-black uppercase">{drill.title}</h3>
              <p className="mt-1 text-xs leading-snug text-zinc-700 sm:text-sm">{drill.description}</p>
              <p className="mt-2 font-heading font-black uppercase">Total — {drill.total}</p>
            </div>
          </article>
        ))}
      </div>
      <footer className="flex items-center justify-between gap-4 bg-zinc-950 p-4 text-white">
        <p className="font-heading font-black uppercase">200 shots · 6 drills</p>
        <button type="button" onClick={onLogWorkout} className="flex min-h-12 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 font-black text-black shadow-[0_0_20px_rgba(249,115,22,.45)]">Log Workout <ChevronRight className="h-4 w-4" /></button>
      </footer>
    </section>
  );
}
