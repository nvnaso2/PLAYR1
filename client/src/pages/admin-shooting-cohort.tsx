import AdminShootingCohort from "@/components/admin-shooting-cohort";
import { AdminCustomWorkoutRequests } from "@/components/admin-custom-workout-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminShootingCohortPage() {
  return (
    <main className="mx-auto min-h-full w-full max-w-7xl space-y-5 bg-[#090909] p-4 sm:p-6" data-testid="admin-shooting-cohort-page">
      <header>
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Admin · Player development</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">Shooting Cohort</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage applications, capacity, and training requests.</p>
      </header>

      <Tabs defaultValue="cohort" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-xl border border-white/10 bg-zinc-900/70 p-1">
          <TabsTrigger
            value="cohort"
            className="rounded-lg py-2 data-[state=active]:bg-orange-500 data-[state=active]:font-bold data-[state=active]:text-black"
          >
            Cohort
          </TabsTrigger>
          <TabsTrigger
            value="custom-requests"
            className="rounded-lg py-2 data-[state=active]:bg-orange-500 data-[state=active]:font-bold data-[state=active]:text-black"
          >
            Custom Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cohort" className="mt-0">
          <AdminShootingCohort />
        </TabsContent>
        <TabsContent value="custom-requests" className="mt-0">
          <AdminCustomWorkoutRequests />
        </TabsContent>
      </Tabs>
    </main>
  );
}
