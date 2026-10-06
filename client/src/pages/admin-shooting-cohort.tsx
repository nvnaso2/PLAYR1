import { useState } from "react";
import AdminShootingCohort from "@/components/admin-shooting-cohort";
import { AdminCustomWorkoutRequests } from "@/components/admin-custom-workout-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShootingCohortAdminNotificationCounts } from "@/lib/shooting-cohort-api";

function NotificationBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} outstanding ${label}`}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold leading-none text-black shadow-[0_0_12px_hsl(var(--primary)/0.65)] motion-safe:animate-pulse"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AdminShootingCohortPage() {
  const [view, setView] = useState("cohort");
  const { data: notifications } = useShootingCohortAdminNotificationCounts();

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-7xl space-y-6 bg-[#0b0b0a] p-4 sm:p-6 lg:p-8" data-testid="admin-shooting-cohort-page">
      <Tabs value={view} onValueChange={setView} className="space-y-5">
        <TabsList aria-label="Shooting Cohort admin views" className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-[#141311] p-1 sm:max-w-3xl sm:grid-cols-4">
          <TabsTrigger
            value="cohort"
            className="rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-black"
          >
            Cohort
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-black"
          >
            <span>Applications</span>
            <NotificationBadge count={notifications?.applications ?? 0} label="applications" />
          </TabsTrigger>
          <TabsTrigger
            value="film-review"
            className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-black"
          >
            <span>Film Review</span>
            <NotificationBadge count={notifications?.filmReview ?? 0} label="film reviews" />
          </TabsTrigger>
          <TabsTrigger
            value="custom-requests"
            className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-primary data-[state=active]:font-bold data-[state=active]:text-black"
          >
            <span>Custom Requests</span>
            <NotificationBadge count={notifications?.customRequests ?? 0} label="custom requests" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cohort" className="mt-0 focus-visible:outline-none">
          {view === "cohort" && <AdminShootingCohort view="cohort" />}
        </TabsContent>
        <TabsContent value="applications" className="mt-0 focus-visible:outline-none">
          {view === "applications" && <AdminShootingCohort view="applications" />}
        </TabsContent>
        <TabsContent value="film-review" className="mt-0 focus-visible:outline-none">
          {view === "film-review" && <AdminShootingCohort view="film-review" />}
        </TabsContent>
        <TabsContent value="custom-requests" className="mt-0">
          {view === "custom-requests" && <AdminCustomWorkoutRequests />}
        </TabsContent>
      </Tabs>
    </main>
  );
}
