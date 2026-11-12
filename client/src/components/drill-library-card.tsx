import type { Drill } from "@shared/schema";
import { DrillCard } from "@/components/drill-card";

export function DrillLibraryCard({ drill, link = true }: { drill: Drill; link?: boolean }) {
  return <DrillCard drill={drill} viewMode="grid" hubFeatured link={link} />;
}
