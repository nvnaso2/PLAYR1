import { useState } from "react";
import AdminShootingCohort from "@/components/admin-shooting-cohort";
import { AdminCustomWorkoutRequests } from "@/components/admin-custom-workout-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminShootingCohortPage() {
  const [view, setView] = useState("cohort");

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-7xl space-y-6 bg-[#0b0b0a] p-4 sm:p-6 lg:p-8" data-testid="admin-shooting-cohort-page">
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131210] px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-orange-400/10" />
        <div className="pointer-events-none absolute -right-1 top-0 h-full w-1/3 bg-gradient-to-l from-orange-500/[0.06] to-transparent" />
        <div className="relative">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-orange-300">PLAYR1 / Admin desk</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl font-black uppercase leading-none tracking-wide text-[#f4f0e8] sm:text-4xl">Shooting Cohort</h1>
              <p className="mt-2 max-w-xl text-sm text-stone-400">A small room for players doing the work. Set the pace, review the applications, stay close.</p>
            </div>
            <span className="hidden border-l border-orange-400/30 pl-3 font-mono text-[9px] uppercase leading-5 tracking-[0.14em] text-stone-500 sm:block">Founder-led<br />Player development</span>
          </div>
        </div>
      </header>

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
