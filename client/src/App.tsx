import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

import Landing from "@/pages/landing";
import Drills from "@/pages/drills";
import DrillPage from "@/pages/drill";
import TrainingLog from "@/pages/training-log";
import Dashboard from "@/pages/progress";
import Videos from "@/pages/videos";
import Profile from "@/pages/profile";
import Career from "@/pages/career";
import PlayerPublic from "@/pages/player-public";
import Admin from "@/pages/admin";
import TrainerDashboard from "@/pages/trainer/index";
import TrainerRoster from "@/pages/trainer/roster";
import TrainerDrills from "@/pages/trainer/drills";
import TrainerLogs from "@/pages/trainer/logs";
import TrainerChat from "@/pages/trainer/chat";
import TrainerVideos from "@/pages/trainer/videos";
import TrainerProgress from "@/pages/trainer/progress";
import Finder from "@/pages/finder";
import FindTrainer from "@/pages/find-trainer";
import TeamProfile from "@/pages/team-profile";
import LeagueProfile from "@/pages/league-profile";
import TrainerProfile from "@/pages/trainer/profile";
import TrainerSchedule from "@/pages/trainer/schedule";
import TrainerEvaluations from "@/pages/trainer/evaluations";
import TrainerPlayerDetail from "@/pages/trainer/player-detail";
import MySessions from "@/pages/my-sessions";
import MyEvaluations from "@/pages/my-evaluations";
import MyTrainer from "@/pages/my-trainer";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/use-role";
import { Redirect } from "wouter";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full safe-area-inset">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 safe-area-top">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { activeView, isLoading } = useRole();
  if (isLoading) return <LoadingScreen />;
  if (activeView === "trainer") return <Redirect to="/trainer" />;
  return <Dashboard />;
}

function CoachRedirect() {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const tab = params.get('tab');

  if (tab === "players") return <Redirect to="/trainer/roster" />;
  if (tab === "roster") return <Redirect to="/trainer/roster" />;
  if (tab === "assign-drills") return <Redirect to="/trainer/drills" />;
  if (tab === "training-logs") return <Redirect to="/trainer/logs" />;
  if (tab === "chat") return <Redirect to="/trainer/chat" />;
  if (tab === "videos") return <Redirect to="/trainer/drills?tab=videos" />;
  if (tab === "invite") return <Redirect to="/trainer/roster" />;
  return <Redirect to="/trainer" />;
}

function Router({ previewLanding }: { previewLanding: boolean }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      <Route path="/player/:slug" component={PlayerPublic} />
      <Route path="/finder">{() => <Redirect to="/teams" />}</Route>
      <Route path="/teams/:slug" component={TeamProfile} />
      <Route path="/leagues/:slug" component={LeagueProfile} />
      <Route>
        {() => {
          if (!isAuthenticated || previewLanding) {
            return <Landing />;
          }
          return (
            <AuthenticatedLayout>
              <Switch>
                <Route path="/" component={HomeRedirect} />
                <Route path="/drills" component={Drills} />
                <Route path="/drill/:id" component={DrillPage} />
                <Route path="/log" component={TrainingLog} />
                <Route path="/videos" component={Videos} />
                <Route path="/career" component={Career} />
                <Route path="/profile" component={Profile} />
                <Route path="/admin" component={Admin} />
                <Route path="/coach" component={CoachRedirect} />
                <Route path="/trainer" component={TrainerDashboard} />
                <Route path="/trainer/roster/:playerId" component={TrainerPlayerDetail} />
                <Route path="/trainer/roster" component={TrainerRoster} />
                <Route path="/trainer/drills" component={TrainerDrills} />
                <Route path="/trainer/logs" component={TrainerLogs} />
                <Route path="/trainer/chat" component={TrainerChat} />
                <Route path="/trainer/videos">{() => <Redirect to="/trainer/drills?tab=videos" />}</Route>
                <Route path="/trainer/progress" component={TrainerProgress} />
                <Route path="/trainer/profile" component={TrainerProfile} />
                <Route path="/trainer/schedule" component={TrainerSchedule} />
                <Route path="/trainer/evaluations" component={TrainerEvaluations} />
                <Route path="/teams" component={Finder} />
                <Route path="/my-trainer" component={MyTrainer} />
                <Route path="/find-trainer">{() => <Redirect to="/my-trainer" />}</Route>
                <Route path="/my-sessions">{() => <Redirect to="/my-trainer" />}</Route>
                <Route path="/my-evaluations">{() => <Redirect to="/my-trainer" />}</Route>
                <Route path="/trainer/players">{() => <Redirect to="/trainer/roster" />}</Route>
                <Route path="/trainer/assignments">{() => <Redirect to="/trainer/drills" />}</Route>
                <Route path="/trainer/invite">{() => <Redirect to="/trainer/roster" />}</Route>
                <Route path="/dashboard" component={Dashboard} />
                <Route component={NotFound} />
              </Switch>
            </AuthenticatedLayout>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  const [previewLanding, setPreviewLanding] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="playr1-theme">
        <TooltipProvider>
          <Toaster />
          <Router previewLanding={previewLanding} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewLanding(!previewLanding)}
            className="fixed bottom-4 right-4 z-50 gap-2 bg-background/80 backdrop-blur"
            data-testid="button-preview-toggle"
          >
            {previewLanding ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {previewLanding ? "View App" : "View Landing"}
          </Button>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
