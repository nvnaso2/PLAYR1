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
import PlayerProfile from "@/pages/player-profile";
import PlayerPublic from "@/pages/player-public";
import Admin from "@/pages/admin";
import CoachTrainer from "@/pages/trainer-page";
import TrainerDashboard from "@/pages/trainer/index";
import TrainerRoster from "@/pages/trainer/roster";
import TrainerPlayers from "@/pages/trainer/players";
import TrainerAssignments from "@/pages/trainer/assignments";
import TrainerLogs from "@/pages/trainer/logs";
import TrainerChat from "@/pages/trainer/chat";
import TrainerVideos from "@/pages/trainer/videos";
import TrainerInvite from "@/pages/trainer/invite";
import Finder from "@/pages/finder";
import TeamProfile from "@/pages/team-profile";
import LeagueProfile from "@/pages/league-profile";
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
  const adminTab = params.get('adminTab');

  if (tab === "players") return <Redirect to="/trainer/players" />;
  if (tab === "roster") return <Redirect to="/trainer/roster" />;
  if (tab === "assign-drills") return <Redirect to="/trainer/assignments" />;
  if (tab === "training-logs") return <Redirect to="/trainer/logs" />;
  if (tab === "chat") return <Redirect to="/trainer/chat" />;
  if (tab === "videos") return <Redirect to="/trainer/videos" />;
  if (tab === "invite") return <Redirect to="/trainer/invite" />;
  if (tab === "admin" && adminTab) return <Redirect to={`/trainer?adminTab=${adminTab}`} />;
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
      <Route path="/finder" component={Finder} />
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
                <Route path="/player-profile" component={PlayerProfile} />
                <Route path="/admin" component={Admin} />
                <Route path="/coach" component={CoachRedirect} />
                <Route path="/trainer" component={TrainerDashboard} />
                <Route path="/trainer/roster" component={TrainerRoster} />
                <Route path="/trainer/players" component={TrainerPlayers} />
                <Route path="/trainer/assignments" component={TrainerAssignments} />
                <Route path="/trainer/logs" component={TrainerLogs} />
                <Route path="/trainer/chat" component={TrainerChat} />
                <Route path="/trainer/videos" component={TrainerVideos} />
                <Route path="/trainer/invite" component={TrainerInvite} />
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
