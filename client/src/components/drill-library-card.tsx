import { Link } from "wouter";
import type { Drill } from "@shared/schema";

function CardFace({ drill }: { drill: Drill }) {
  const shooting = drill.category === "shooting";
  const handling = drill.category === "ball-handling";
  const route = shooting ? "M90 82 68 64 53 37" : handling ? "M27 80 54 70 83 52 119 36" : "M90 84 104 67 121 48 148 27";
  const endX = shooting ? "53" : handling ? "119" : "148";
  const endY = shooting ? "37" : handling ? "36" : "27";

  return (
    <article className="flex h-[220px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-[#f4f3ee] text-zinc-950 shadow-[0_8px_22px_rgba(0,0,0,.22)] transition hover:-translate-y-0.5 hover:border-orange-400">
      <div className="relative flex flex-1 items-center justify-center p-4">
        <span className="absolute left-3 top-3 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{drill.category.replaceAll("-", " ")}</span>
        <svg viewBox="0 0 180 105" className="h-full max-h-32 w-full" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="170" height="95" rx="3" stroke="#171717" strokeWidth="2.5" />
          <path d="M5 51h170M90 5v95M5 29h28v44H5M175 29h-28v44h28" stroke="#77756f" strokeWidth="1.5" />
          <circle cx="90" cy="52" r="17" stroke="#77756f" strokeWidth="1.5" />
          <path d={route} stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={endX} cy={endY} r="4" fill="#f97316" />
        </svg>
      </div>
      <div className="border-t border-zinc-300 px-3 py-2.5">
        <h3 className="line-clamp-2 min-h-9 font-heading text-sm font-black uppercase leading-tight group-hover:text-orange-700">{drill.title}</h3>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{drill.difficulty} <span className="px-1 text-orange-600">·</span> {drill.duration ? `${Math.max(1, Math.round(drill.duration / 60))} min` : "Drill"}</p>
      </div>
    </article>
  );
}

export function DrillLibraryCard({ drill, link = true }: { drill: Drill; link?: boolean }) {
  if (!link) return <div className="group"><CardFace drill={drill} /></div>;
  return <Link href={`/drill/${drill.id}`} className="group block h-full"><CardFace drill={drill} /></Link>;
}
