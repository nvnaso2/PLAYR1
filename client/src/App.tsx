import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Playr1Logo } from "@/components/playr1-logo";
import { Wifi, BatteryMedium, Signal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/use-role";
import { pageLoaders, preloadCommonPages } from "@/lib/pageLoaders";
import { usePageViewTracking } from "@/lib/track";

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

// Heavy pages — lazy load on first visit so the initial bundle is smaller.
// Sidebar preloads chunks on hover/touch (see pageLoaders.ts) to avoid
// the blank skeleton on first tab visit.
const Drills = lazy(pageLoaders.drills);
const DrillPage = lazy(pageLoaders.drill);
const TrainingLog = lazy(pageLoaders.trainingLog);
const Dashboard = lazy(pageLoaders.dashboard);
const Videos = lazy(pageLoaders.videos);
const Profile = lazy(pageLoaders.profile);
const Career = lazy(pageLoaders.career);
const PlayerPublic = lazy(pageLoaders.playerPublic);
const TrainerPublic = lazy(pageLoaders.trainerPublic);
const Admin = lazy(pageLoaders.admin);
const TrainerDashboard = lazy(pageLoaders.trainerDashboard);
const TrainerRoster = lazy(pageLoaders.trainerRoster);
const TrainerDrills = lazy(pageLoaders.trainerDrills);
const TrainerLogs = lazy(pageLoaders.trainerLogs);
const TrainerChat = lazy(pageLoaders.trainerChat);
const TrainerProgress = lazy(pageLoaders.trainerProgress);
const ChallengeHistory = lazy(pageLoaders.challengeHistory);
const Finder = lazy(pageLoaders.finder);
const TeamProfile = lazy(pageLoaders.teamProfile);
const LeagueProfile = lazy(pageLoaders.leagueProfile);
const TrainerProfile = lazy(pageLoaders.trainerProfile);
const TrainerSchedule = lazy(pageLoaders.trainerSchedule);
const TrainerEvaluations = lazy(pageLoaders.trainerEvaluations);
const TrainerPlayerDetail = lazy(pageLoaders.trainerPlayerDetail);
const MyTrainer = lazy(pageLoaders.myTrainer);
const ParentDashboard = lazy(pageLoaders.parentDashboard);
const FindPeople = lazy(pageLoaders.findPeople);
const FeedbackPage = lazy(pageLoaders.feedback);
const Programs = lazy(pageLoaders.programs);
const ProgramDetail = lazy(pageLoaders.programDetail);
const ProgramToday = lazy(pageLoaders.programToday);
const ProgramEditor = lazy(pageLoaders.programEditor);
const Events = lazy(pageLoaders.events);
const EventDetail = lazy(pageLoaders.eventDetail);
const EventEditor = lazy(pageLoaders.eventEditor);
const TrainerPrograms = lazy(pageLoaders.trainerPrograms);
const Journal = lazy(pageLoaders.journal);
const GameDay = lazy(pageLoaders.gameDay);
const Archetypes = lazy(pageLoaders.archetypes);
const MyArchetype = lazy(pageLoaders.myArchetype);
const MyGoal = lazy(pageLoaders.myGoal);
const Hub = lazy(pageLoaders.hub);
const Journey = lazy(pageLoaders.journey);

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
  const DURATION = 800;

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
      onComplete();
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

function useClockTime() {
  const fmt = () => {
    const d = new Date();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const t = setInterval(() => setTime(fmt()), 15_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  const time = useClockTime();
  usePageViewTracking();

  return (
    /* ── Outer backdrop: dark on desktop, transparent on native ── */
    <div
      className="flex h-screen w-full items-center justify-center overflow-hidden"
      style={isNative ? {} : {
        background: "radial-gradient(ellipse at 50% 40%, #1c1c1e 0%, #080808 100%)",
      }}
    >
      {/* Ambient orange glow — desktop only */}
      {!isNative && (
        <div
          className="hidden md:block absolute pointer-events-none"
          style={{ width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)" }}
        />
      )}

      {/* ── Device shell wrapper (positions side buttons outside screen) ── */}
      <div className={`relative flex-shrink-0 ${isNative ? "h-screen w-full" : ""}`}
        style={isNative ? {} : undefined}
      >
        {/* Volume up */}
        <div className="hidden md:block absolute bg-zinc-600 rounded-l-[3px]"
          style={{ left: -5, top: "17%", width: 4, height: "4.5%" }} />
        {/* Volume down */}
        <div className="hidden md:block absolute bg-zinc-600 rounded-l-[3px]"
          style={{ left: -5, top: "24%", width: 4, height: "7%" }} />
        {/* Mute/silent switch */}
        <div className="hidden md:block absolute bg-zinc-600 rounded-l-[3px]"
          style={{ left: -5, top: "13%", width: 4, height: "2.5%" }} />
        {/* Power button */}
        <div className="hidden md:block absolute bg-zinc-600 rounded-r-[3px]"
          style={{ right: -5, top: "26%", width: 4, height: "9%" }} />

        {/* ── Phone screen ── */}
        <div
          className={`iphone-frame-shell relative flex flex-col bg-background overflow-hidden ${isNative ? "h-screen w-full !rounded-none !border-0 !shadow-none" : ""}`}
        >
          {/* Dynamic island */}
          {!isNative && (
            <div
              className="hidden md:block absolute z-50 pointer-events-none"
              style={{
                top: 10, left: "50%", transform: "translateX(-50%)",
                width: 126, height: 37, background: "#000", borderRadius: 20,
              }}
            />
          )}

          {/* iOS status bar (desktop phone frame only) */}
          {!isNative && (
            <div
              className="hidden md:flex items-center justify-between shrink-0 px-8"
              style={{ paddingTop: 54, paddingBottom: 2 }}
            >
              <span className="text-white text-[13px] font-semibold tracking-tight">{time}</span>
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3 text-white" />
                <Wifi className="w-3.5 h-3.5 text-white" />
                <BatteryMedium className="w-5 h-4 text-white" />
              </div>
            </div>
          )}

          {/* App header */}
          <header
            className={`relative flex items-center border-b border-zinc-800/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 overflow-hidden ${
              isNative ? "px-4 py-2 safe-area-top" : "px-4 py-3"
            }`}
          >
            <div className="flex-1 flex items-center justify-center">
              <Playr1Logo className="h-8 w-auto" />
            </div>
            <div className="absolute right-4">
              <ThemeToggle />
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </main>

          {/* Bottom tab bar — stays pinned inside the frame */}
          <BottomTabBar />

          {/* iOS home indicator */}
          {!isNative && (
            <div className="hidden md:flex justify-center items-center shrink-0 bg-background" style={{ paddingBottom: 6, paddingTop: 4 }}>
              <div style={{ width: 134, height: 5, background: "rgba(255,255,255,0.18)", borderRadius: 3 }} />
            </div>
          )}
        </div>
      </div>
    </div>
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
  return <Redirect to="/hub" />;
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
      <Route path="/player/:slug">{() => <Suspense fallback={<LoadingScreen />}><PlayerPublic /></Suspense>}</Route>
      <Route path="/t/:id">{() => <Suspense fallback={<LoadingScreen />}><TrainerPublic /></Suspense>}</Route>
      <Route path="/teams/:slug">{() => <Suspense fallback={<LoadingScreen />}><TeamProfile /></Suspense>}</Route>
      <Route path="/leagues/:slug">{() => <Suspense fallback={<LoadingScreen />}><LeagueProfile /></Suspense>}</Route>
      <Route path="/auth">{() => isAuthenticated ? <Redirect to="/" /> : <AuthPage />}</Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/support" component={Support} />
      <Route path="/finder">{() => <Redirect to="/teams" />}</Route>
      <Route path="/parent-invite/:code" component={ParentInvite} />
      <Route path="/events">{() => isAuthenticated
        ? <AuthenticatedLayout><Events /></AuthenticatedLayout>
        : <Suspense fallback={<LoadingScreen />}><Events /></Suspense>}</Route>
      <Route path="/events/:slug">{() => isAuthenticated
        ? <AuthenticatedLayout><EventDetail /></AuthenticatedLayout>
        : <Suspense fallback={<LoadingScreen />}><EventDetail /></Suspense>}</Route>
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
                <Route path="/programs" component={Programs} />
                <Route path="/programs/:id/edit" component={ProgramEditor} />
                <Route path="/programs/:slug/today" component={ProgramToday} />
                <Route path="/programs/:slug" component={ProgramDetail} />
                <Route path="/admin/events/:id/edit" component={EventEditor} />
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
                <Route path="/trainer/programs">{() => <TrainerGuard><TrainerPrograms /></TrainerGuard>}</Route>
                <Route path="/teams" component={Finder} />
                <Route path="/connect" component={FindPeople} />
                <Route path="/challenge-history" component={ChallengeHistory} />
                <Route path="/journal" component={Journal} />
                <Route path="/game-day" component={GameDay} />
                <Route path="/hub" component={Hub} />
                <Route path="/journey" component={Journey} />
                <Route path="/archetypes" component={Archetypes} />
                <Route path="/my-archetype" component={MyArchetype} />
                <Route path="/my-goal" component={MyGoal} />
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
