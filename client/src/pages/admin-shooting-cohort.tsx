import { useState } from "react";
import AdminShootingCohort from "@/components/admin-shooting-cohort";
import { AdminCustomWorkoutRequests } from "@/components/admin-custom-workout-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminShootingCohortPage() {
  const [view, setView] = useState("cohort");

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-7xl space-y-6 bg-[#0b0b0a] p-4 sm:p-6 lg:p-8" data-testid="admin-shooting-cohort-page">
      <Tabs value={view} onValueChange={setView} className="space-y-5">
        <TabsList aria-label="Shooting Cohort admin views" className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-[#141311] p-1 sm:max-w-3xl sm:grid-cols-4">
          <TabsTrigger
            value="cohort"
            className="rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-[#17120d]"
          >
            Cohort
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-[#17120d]"
          >
            Applications
          </TabsTrigger>
          <TabsTrigger
            value="conversation"
            className="rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-[#17120d]"
          >
            Shared Conversation
          </TabsTrigger>
          <TabsTrigger
            value="custom-requests"
            className="rounded-lg py-2.5 text-xs text-stone-500 transition data-[state=active]:bg-orange-400 data-[state=active]:font-bold data-[state=active]:text-[#17120d]"
          >
            Custom Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cohort" className="mt-0 focus-visible:outline-none">
          {view === "cohort" && <AdminShootingCohort view="cohort" />}
        </TabsContent>
        <TabsContent value="applications" className="mt-0 focus-visible:outline-none">
          {view === "applications" && <AdminShootingCohort view="applications" />}
        </TabsContent>
        <TabsContent value="conversation" className="mt-0 focus-visible:outline-none">
          {view === "conversation" && <AdminShootingCohort view="conversation" />}
        </TabsContent>
        <TabsContent value="custom-requests" className="mt-0">
          {view === "custom-requests" && <AdminCustomWorkoutRequests />}
        </TabsContent>
      </Tabs>
    </main>
  );
}
