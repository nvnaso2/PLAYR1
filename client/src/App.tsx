import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Playr1Logo } from "@/components/playr1-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/use-role";

// Critical path — load immediately
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Support from "@/pages/support";
import ParentInvite from "@/pages/parent-invite";
import NotFound from "@/pages/not-found";

// Heavy pages — lazy load on first visit so the initial bundle is smaller
const Drills = lazy(() => import("@/pages/drills"));
const DrillPage = lazy(() => import("@/pages/drill"));
const TrainingLog = lazy(() => import("@/pages/training-log"));
const Dashboard = lazy(() => import("@/pages/progress"));
const Videos = lazy(() => import("@/pages/videos"));
const Profile = lazy(() => import("@/pages/profile"));
const Career = lazy(() => import("@/pages/career"));
const PlayerPublic = lazy(() => import("@/pages/player-public"));
const TrainerPublic = lazy(() => import("@/pages/trainer-public"));
const Admin = lazy(() => import("@/pages/admin"));
const TrainerDashboard = lazy(() => import("@/pages/trainer/index"));
const TrainerRoster = lazy(() => import("@/pages/trainer/roster"));
const TrainerDrills = lazy(() => import("@/pages/trainer/drills"));
const TrainerLogs = lazy(() => import("@/pages/trainer/logs"));
const TrainerChat = lazy(() => import("@/pages/trainer/chat"));
const TrainerProgress = lazy(() => import("@/pages/trainer/progress"));
const Finder = lazy(() => import("@/pages/finder"));
const TeamProfile = lazy(() => import("@/pages/team-profile"));
const LeagueProfile = lazy(() => import("@/pages/league-profile"));
const TrainerProfile = lazy(() => import("@/pages/trainer/profile"));
const TrainerSchedule = lazy(() => import("@/pages/trainer/schedule"));
const TrainerEvaluations = lazy(() => import("@/pages/trainer/evaluations"));
const TrainerPlayerDetail = lazy(() => import("@/pages/trainer/player-detail"));
const MyTrainer = lazy(() => import("@/pages/my-trainer"));
const ParentDashboard = lazy(() => import("@/pages/parent-dashboard"));
const FindPeople = lazy(() => import("@/pages/find-people"));
const FeedbackPage = lazy(() => import("@/pages/feedback"));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="space-y-3 w-full max-w-sm">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full mt-4" />
      </div>
    </div>
  );
}

function SplashScreen({ isAuthLoading, isAuthenticated, onComplete }: {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [barFull, setBarFull] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 2000;

  useEffect(() => {
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      const p = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(p);
      if (p < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setBarFull(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (barFull && !isAuthLoading && isAuthenticated) {
      const t = setTimeout(onComplete, 250);
      return () => clearTimeout(t);
    }
  }, [barFull, isAuthLoading, isAuthenticated, onComplete]);

  const showButton = barFull && !isAuthLoading && !isAuthenticated;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 bg-background px-8">
      <Playr1Logo className="w-[360px] object-contain" />
      <div className="w-full max-w-xs space-y-8">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%`, transition: "width 80ms linear" }}
          />
        </div>
        {showButton && (
          <Button onClick={onComplete} className="w-full" size="lg" data-testid="button-get-started">
            Get Started
          </Button>
        )}
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full safe-area-inset">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <header className={`relative flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 safe-area-top overflow-hidden ${isNative ? 'px-3 py-1' : 'p-3'}`}>
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="absolute inset-x-0 bottom-0 top-[env(safe-area-inset-top)] flex items-center justify-center pointer-events-none">
              <Playr1Logo className={isNative ? 'h-8 w-auto' : 'h-32 w-auto'} />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
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
  const { activeView, isLoading: roleLoading } = useRole();
  const { data: careerProfile, isLoading: careerLoading, isError } = useQuery<any>({
    queryKey: ['/api/career'],
    retry: false,
  });
  const { data: parentChildren, isLoading: parentLoading } = useQuery<any[]>({
    queryKey: ['/api/parent/children'],
  });
  if (roleLoading || careerLoading || parentLoading) return <LoadingScreen />;

  const isParentOnlyAccount = (parentChildren?.length || 0) > 0 && (!careerProfile || !careerProfile.onboardingCompleted);
  if (isParentOnlyAccount) return <Redirect to="/parent" />;

  if (!isError && (!careerProfile || !careerProfile.onboardingCompleted)) {
    return <Redirect to="/career" />;
  }
  if (activeView === "trainer") return <Redirect to="/trainer" />;
  return <Dashboard />;
}

function AdminRoute() {
  const { data, isLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });
  if (isLoading) return <LoadingScreen />;
  if (!data?.isAdmin) return <Redirect to="/" />;
  return <Admin />;
}

function TrainerGuard({ children }: { children: React.ReactNode }) {
  const { hasStaffRole, isLoading } = useRole();
  if (isLoading) return <LoadingScreen />;
  if (!hasStaffRole) return <Redirect to="/" />;
  return <>{children}</>;
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

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <SplashScreen
        isAuthLoading={isLoading}
        isAuthenticated={isAuthenticated ?? false}
        onComplete={() => setSplashDone(true)}
      />
    );
  }

  return (
    <Switch>
      <Route path="/player/:slug" component={PlayerPublic} />
      <Route path="/t/:id" component={TrainerPublic} />
      <Route path="/teams/:slug" component={TeamProfile} />
      <Route path="/leagues/:slug" component={LeagueProfile} />
      <Route path="/auth">{() => isAuthenticated ? <Redirect to="/" /> : <AuthPage />}</Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/support" component={Support} />
      <Route path="/finder">{() => <Redirect to="/teams" />}</Route>
      <Route path="/parent-invite/:code" component={ParentInvite} />
      <Route>
        {() => {
          if (!isAuthenticated) {
            const isNative = !!(window as any).Capacitor?.isNative || Capacitor.isNativePlatform();
            if (isNative) {
              return <Redirect to="/auth" />;
            }
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
                <Route path="/admin">{() => <AdminRoute />}</Route>
                <Route path="/coach" component={CoachRedirect} />
                <Route path="/trainer">{() => <TrainerGuard><TrainerDashboard /></TrainerGuard>}</Route>
                <Route path="/trainer/roster/:playerId">{() => <TrainerGuard><TrainerPlayerDetail /></TrainerGuard>}</Route>
                <Route path="/trainer/roster">{() => <TrainerGuard><TrainerRoster /></TrainerGuard>}</Route>
                <Route path="/trainer/drills">{() => <TrainerGuard><TrainerDrills /></TrainerGuard>}</Route>
                <Route path="/trainer/logs">{() => <TrainerGuard><TrainerLogs /></TrainerGuard>}</Route>
                <Route path="/trainer/chat">{() => <TrainerGuard><TrainerChat /></TrainerGuard>}</Route>
                <Route path="/trainer/videos">{() => <Redirect to="/trainer/drills?tab=videos" />}</Route>
                <Route path="/trainer/progress">{() => <TrainerGuard><TrainerProgress /></TrainerGuard>}</Route>
                <Route path="/trainer/profile">{() => <TrainerGuard><TrainerProfile /></TrainerGuard>}</Route>
                <Route path="/trainer/schedule">{() => <TrainerGuard><TrainerSchedule /></TrainerGuard>}</Route>
                <Route path="/trainer/evaluations">{() => <TrainerGuard><TrainerEvaluations /></TrainerGuard>}</Route>
                <Route path="/teams" component={Finder} />
                <Route path="/connect" component={FindPeople} />
                <Route path="/feedback" component={FeedbackPage} />
                <Route path="/my-trainer" component={MyTrainer} />
                <Route path="/parent" component={ParentDashboard} />
                <Route path="/find-trainer">{() => <Redirect to="/my-trainer" />}</Route>
                <Route path="/my-sessions">{() => <Redirect to="/my-trainer" />}</Route>
                <Route path="/my-evaluations">{() => <Redirect to="/my-trainer" />}</Route>
                <Route path="/trainer/players">{() => <Redirect to="/trainer/roster" />}</Route>
                <Route path="/trainer/assignments">{() => <Redirect to="/trainer/drills" />}</Route>
                <Route path="/trainer/invite">{() => <Redirect to="/trainer/roster" />}</Route>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/progress" component={Dashboard} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="playr1-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
