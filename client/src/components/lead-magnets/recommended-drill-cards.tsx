import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Dumbbell } from "lucide-react";
import { Link } from "wouter";
import { DrillCard } from "@/components/drill-card";
import type { Drill } from "@shared/schema";

export type RecommendedDrill = {
  title: string;
  description?: string;
};

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function RecommendedDrillCards({ drills }: { drills: RecommendedDrill[] }) {
  const { data: catalogDrills = [] } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
  });

  return (
    <div className="lm-recommended-drills" aria-label="Recommended drills">
      {drills.map((drill) => {
        const normalizedTitle = normalizeTitle(drill.title);
        const catalogMatch = catalogDrills.find((candidate) =>
          normalizeTitle(candidate.title) === normalizedTitle
        ) ?? catalogDrills.find((candidate) => {
          const candidateTitle = normalizeTitle(candidate.title);
          return normalizedTitle.length > 8 && (
            candidateTitle.includes(normalizedTitle) || normalizedTitle.includes(candidateTitle)
          );
        });

        return catalogMatch ? (
          <DrillCard key={drill.title} drill={catalogMatch} viewMode="list" />
        ) : (
          <Link
            key={drill.title}
            href="/drills"
            className="lm-recommended-drill-fallback group flex min-h-[82px] items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/80 p-3 transition hover:border-white/25"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-200">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">{drill.title}</span>
              {drill.description && (
                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-zinc-400">
                  {drill.description}
                </span>
              )}
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.13em] text-zinc-500">
                Open Drill Library
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-white" />
          </Link>
        );
      })}
    </div>
  );
}
