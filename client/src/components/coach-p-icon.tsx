import { GraduationCap } from "lucide-react";

export function CoachPIcon({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLarge = size === "lg";
  return (
    <div className={`relative shrink-0 ${isLarge ? "h-14 w-14" : "h-9 w-9"}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-md" />
      <div className={`relative flex h-full w-full items-center justify-center rounded-full border border-orange-200/70 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_5px_18px_rgba(249,115,22,0.35)] ${isLarge ? "rotate-[-4deg]" : ""}`}>
        <GraduationCap className={`${isLarge ? "h-7 w-7" : "h-5 w-5"} text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]`} strokeWidth={2.4} />
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-orange-400/70 bg-zinc-950 font-black leading-none text-orange-300 ${isLarge ? "h-5 w-5 text-[9px]" : "h-4 w-4 text-[8px]"}`}>
        P
      </span>
    </div>
  );
}
