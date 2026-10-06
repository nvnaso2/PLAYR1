import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProUpgradeProvider } from "@/components/pro-upgrade-dialog";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Playr1Logo } from "@/components/playr1-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/hooks/use-admin";
import { useRole, RoleProvider } from "@/hooks/use-role";
import { pageLoaders, preloadCommonPages } from "@/lib/pageLoaders";
import { usePageViewTracking } from "@/lib/track";

// Critical path — load immediately
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import WelcomePage from "@/pages/welcome";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Support from "@/pages/support";
import ParentInvite from "@/pages/parent-invite";
import NotFound from "@/pages/not-found";
import MicroQuizPage from "@/pages/micro-quiz";

// Heavy pages — lazy load on first visit so the initial bundle is smaller.
// Sidebar preloads chunks on hover/touch (see pageLoaders.ts) to avoid
// the blank skeleton on first tab visit.
const Drills = lazy(pageLoaders.drills);
const DrillPage = lazy(pageLoaders.drill);
const AppOnboardingPage = lazy(() => import("@/pages/app-onboarding"));
const TrainingLog = lazy(pageLoaders.trainingLog);
const Dashboard = lazy(pageLoaders.dashboard);
const Videos = lazy(pageLoaders.videos);
const Profile = lazy(pageLoaders.profile);
const TrophyRoom = lazy(() => import("@/pages/trophy-room"));
const MySeason = lazy(pageLoaders.mySeason);
const Development = lazy(pageLoaders.development);
const PlayerPublic = lazy(pageLoaders.playerPublic);
const PlayerCardPublic = lazy(pageLoaders.playerCardPublic);
const PlayerProfile = lazy(() => import("@/pages/player-profile"));
const TrainerPublic = lazy(pageLoaders.trainerPublic);
const Admin = lazy(pageLoaders.admin);
const AdminBrandPrinciples = lazy(pageLoaders.adminBrandPrinciples);
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
const FeedbackPage = lazy(pageLoaders.feedback);
const Programs = lazy(pageLoaders.programs);
const Courses = lazy(pageLoaders.courses);
const ProgramDetail = lazy(pageLoaders.programDetail);
const ProgramToday = lazy(pageLoaders.programToday);
const CourseLeadMagnet = lazy(pageLoaders.courseLeadMagnet);
const LeadMagnets = lazy(pageLoaders.leadMagnets);
const ProgramEditor = lazy(pageLoaders.programEditor);
const Events = lazy(pageLoaders.events);
const EventDetail = lazy(pageLoaders.eventDetail);
const EventEditor = lazy(pageLoaders.eventEditor);
const TrainerPrograms = lazy(pageLoaders.trainerPrograms);
const Journal = lazy(pageLoaders.journal);
const CoachP = lazy(pageLoaders.coachP);
const WelcomeWorkout = lazy(() => import("@/pages/welcome-workout"));
const CustomWorkouts = lazy(pageLoaders.customWorkouts);
const GameDay = lazy(pageLoaders.gameDay);
const Archetypes = lazy(pageLoaders.archetypes);
const MyArchetype = lazy(pageLoaders.myArchetype);
const MyGoal = lazy(pageLoaders.myGoal);
const Hub = lazy(pageLoaders.hub);
const HubStatCustomize = lazy(() => import("@/pages/hub-stat-customize"));
const Journey = lazy(pageLoaders.journey);
const OnboardingPreview = lazy(() => import("@/pages/onboarding-preview"));
const CommunityPage = lazy(() => import("@/pages/community"));
const ProfileHubPage = lazy(() => import("@/pages/profile-hub"));

const SubscriptionPage = lazy(() => import("@/pages/subscription"));
const StreaksPage = lazy(() => import("@/pages/streaks"));
const StatChallengePage = lazy(() => import("@/pages/stat-challenge"));
const StreakChallengePage = lazy(pageLoaders.streakChallenge);
const SettingsPage = lazy(pageLoaders.settings);
const SupportMessages = lazy(pageLoaders.supportMessages);
const AdminSupportMessages = lazy(() => pageLoaders.adminSupportMessages().then((module) => ({ default: module.AdminSupportMessagesPage })));
const AdminShootingCohortPage = lazy(pageLoaders.adminShootingCohort);
const AdminCommunity3PointersPage = lazy(pageLoaders.adminCommunity3Pointers);
const ShootingCohort = lazy(() => import("@/pages/shooting-cohort"));
const NotificationLab = lazy(pageLoaders.notificationLab);

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
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-12 bg-black px-6">
      <Playr1Logo className="w-[min(82vw,360px)] object-contain" />
      <div className="w-full max-w-xs space-y-8">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#24150f]"
          role="progressbar"
          aria-label="Loading PLAYR1"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="playr1-progress-fill relative h-full rounded-full"
            style={{ width: `${progress}%`, transition: "width 80ms linear" }}
          />
        </div>
        {showButton && (
          <Button
            onClick={onComplete}
            className="h-14 w-full rounded-full border border-orange-300 bg-orange-500 text-[12px] font-bold tracking-[0.04em] text-black shadow-[0_8px_28px_rgba(249,115,22,0.28)] transition-colors hover:bg-orange-400 hover:text-black focus-visible:ring-2 focus-visible:ring-[#ffd0b5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            size="lg"
            data-testid="button-get-started"
          >
            Start Your PLAYR1 Journey
          </Button>
        )}
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  usePageViewTracking();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-0 flex-1 overflow-hidden">
          {/* Header */}
          <header className="shrink-0 flex items-center gap-2 border-b border-zinc-800/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 px-4 h-14">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-1" />
            <div className="flex-1 flex items-center justify-center">
              <Playr1Logo className="h-8 w-auto" />
            </div>
            <ThemeToggle />
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 min-w-0 overflow-y-auto min-h-0">
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </main>

          {/* Bottom tab bar */}
          <BottomTabBar />
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

function PlayerSetupGate({ children }: { children: React.ReactNode }) {
  const role = useRole();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { data: setup, isLoading: setupLoading } = useQuery<{ completed: boolean }>({
    queryKey: ["/api/player-setup"],
    retry: false,
  });
  const { data: parentChildren, isLoading: parentLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/children"],
  });
  const { data: careerProfile, isLoading: careerLoading } = useQuery<any>({
    queryKey: ["/api/career"],
    retry: false,
  });

  if (role.isLoading || adminLoading || setupLoading || parentLoading || careerLoading) return <LoadingScreen />;
  const isParentOnlyAccount =
    (parentChildren?.length || 0) > 0 && (!careerProfile || !careerProfile.onboardingCompleted);
  if (isAdmin || !role.isPlayer || role.activeView === "trainer" || isParentOnlyAccount || setup?.completed) {
    return <>{children}</>;
  }
  return <Redirect to="/app-setup" />;
}

function SetupAwareLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerSetupGate>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </PlayerSetupGate>
  );
}

function PlayerSetupRoute() {
  const role = useRole();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { data: setup, isLoading: setupLoading } = useQuery<{ completed: boolean }>({
    queryKey: ["/api/player-setup"],
    retry: false,
  });
  const { data: parentChildren, isLoading: parentLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/children"],
  });
  const { data: careerProfile, isLoading: careerLoading } = useQuery<any>({
    queryKey: ["/api/career"],
    retry: false,
  });

  if (role.isLoading || adminLoading || setupLoading || parentLoading || careerLoading) return <LoadingScreen />;
  if (isAdmin) return <Redirect to="/admin" />;
  const isParentOnlyAccount =
    (parentChildren?.length || 0) > 0 && (!careerProfile || !careerProfile.onboardingCompleted);
  if (isParentOnlyAccount) return <Redirect to="/parent" />;
  if (!role.isPlayer || role.activeView === "trainer") return <Redirect to="/trainer" />;
  if (setup?.completed) return <Redirect to="/" />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppOnboardingPage />
    </Suspense>
  );
}

function HomeRedirect() {
  const { activeView, isLoading: roleLoading } = useRole();
  const { data: careerProfile, isLoading: careerLoading } = useQuery<any>({
    queryKey: ['/api/career'],
    retry: false,
  });
  const { data: parentChildren, isLoading: parentLoading } = useQuery<any[]>({
    queryKey: ['/api/parent/children'],
  });
  if (roleLoading || careerLoading || parentLoading) return <LoadingScreen />;

  const isParentOnlyAccount = (parentChildren?.length || 0) > 0 && (!careerProfile || !careerProfile.onboardingCompleted);
  if (isParentOnlyAccount) return <Redirect to="/parent" />;
  if (activeView === "trainer") return <Redirect to="/hub" />;
  return <Redirect to="/hub" />;
}

function AdminRoute({ children }: { children?: React.ReactNode } = {}) {
  const { data, isLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });
  if (isLoading) return <LoadingScreen />;
  if (!data?.isAdmin) return <Redirect to="/" />;
  if (children) return <>{children}</>;
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
  const [location] = useLocation();
  const [splashDone, setSplashDone] = useState(false);
  const currentPath = typeof window === "undefined" ? location : window.location.pathname;
  const isQuizDeepLink = currentPath === "/quiz" || currentPath.startsWith("/quiz/");
  const isLeadMagnetDeepLink = currentPath === "/lead-magnets" || currentPath.startsWith("/lead-magnets/");
  const isPublicPlayerCardDeepLink = /^\/player\/[^/]+\/card\/?$/.test(currentPath);

  if (isLeadMagnetDeepLink) {
    return isAuthenticated
      ? <SetupAwareLayout><LeadMagnets /></SetupAwareLayout>
      : <Suspense fallback={<LoadingScreen />}><LeadMagnets /></Suspense>;
  }

  if (!splashDone && !isQuizDeepLink && !isPublicPlayerCardDeepLink) {
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
      <Route path="/player/:slug/card">{() => <Suspense fallback={<LoadingScreen />}><PlayerCardPublic /></Suspense>}</Route>
      <Route path="/player/:slug">{() => <Suspense fallback={<LoadingScreen />}><PlayerPublic /></Suspense>}</Route>
      <Route path="/t/:id">{() => <Suspense fallback={<LoadingScreen />}><TrainerPublic /></Suspense>}</Route>
      <Route path="/teams/:slug">{() => <Suspense fallback={<LoadingScreen />}><TeamProfile /></Suspense>}</Route>
      <Route path="/leagues/:slug">{() => <Suspense fallback={<LoadingScreen />}><LeagueProfile /></Suspense>}</Route>
      <Route path="/auth">{() => {
        if (isAuthenticated) return <Redirect to="/" />;
        if (new URLSearchParams(window.location.search).get("mode") === "register") {
          return <Redirect to="/app-setup" />;
        }
        return <AuthPage />;
      }}</Route>
      <Route path="/app-setup">{() => isAuthenticated
        ? <PlayerSetupRoute />
        : <Suspense fallback={<LoadingScreen />}><AppOnboardingPage signupMode /></Suspense>}</Route>
      <Route path="/quiz/:quizId" component={MicroQuizPage} />
      <Route path="/quiz" component={MicroQuizPage} />
      <Route path="/assessment">{() => isAuthenticated
        ? <WelcomePage authenticatedMode />
        : <Redirect to="/auth?returnTo=/assessment" />}</Route>
      <Route path="/welcome">{() => <Redirect to={isAuthenticated ? "/" : "/app-setup"} />}</Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/support" component={Support} />
      <Route path="/finder">{() => <Redirect to="/teams" />}</Route>
      <Route path="/parent-invite/:code" component={ParentInvite} />
      <Route path="/events">{() => isAuthenticated
        ? <SetupAwareLayout><Events /></SetupAwareLayout>
        : <Suspense fallback={<LoadingScreen />}><Events /></Suspense>}</Route>
      <Route path="/events/:slug">{() => isAuthenticated
        ? <SetupAwareLayout><EventDetail /></SetupAwareLayout>
        : <Suspense fallback={<LoadingScreen />}><EventDetail /></Suspense>}</Route>
      <Route path="/compete/challenges/:slug">{() => isAuthenticated
        ? <SetupAwareLayout><StatChallengePage /></SetupAwareLayout>
        : <Suspense fallback={<LoadingScreen />}><StatChallengePage /></Suspense>}</Route>
      <Route path="/streak-challenges/:slug">{() => isAuthenticated
        ? <SetupAwareLayout><StreakChallengePage /></SetupAwareLayout>
        : <Suspense fallback={<LoadingScreen />}><StreakChallengePage /></Suspense>}</Route>
      <Route>
        {() => {
          if (!isAuthenticated) {
            return <Redirect to="/app-setup" />;
          }
          return (
            <SetupAwareLayout>
              <Switch>
                <Route path="/" component={HomeRedirect} />
                <Route path="/drills" component={Drills} />
                <Route path="/drill/:id" component={DrillPage} />
                <Route path="/programs">{() => <Redirect to="/courses" />}</Route>
                <Route path="/courses" component={Courses} />
                <Route path="/programs/:id/edit" component={ProgramEditor} />
                <Route path="/programs/:slug/today" component={ProgramToday} />
                <Route path="/programs/:slug" component={ProgramDetail} />
                <Route path="/courses/:slug/lead-magnet" component={CourseLeadMagnet} />
                <Route path="/courses/:slug/today" component={ProgramToday} />
                <Route path="/courses/:slug" component={ProgramDetail} />
                <Route path="/admin/events/:id/edit" component={EventEditor} />
                <Route path="/log" component={TrainingLog} />
                <Route path="/videos" component={Videos} />
                <Route path="/career">{() => <Redirect to="/profile-hub" />}</Route>
                <Route path="/my-season" component={MySeason} />
                <Route path="/development" component={Development} />
                <Route path="/profile/edit" component={PlayerProfile} />
                <Route path="/profile" component={Profile} />
                <Route path="/welcome-workout" component={WelcomeWorkout} />
                <Route path="/trophy-room" component={TrophyRoom} />
                <Route path="/subscription" component={SubscriptionPage} />
                <Route path="/settings">{() => <Suspense fallback={<LoadingScreen />}><SettingsPage /></Suspense>}</Route>
                <Route path="/admin/onboarding-preview">{() => <AdminRoute><OnboardingPreview /></AdminRoute>}</Route>
                <Route path="/admin/brand-principles">{() => <AdminRoute><AdminBrandPrinciples /></AdminRoute>}</Route>
                <Route path="/admin/support-messages">{() => <AdminRoute><AdminSupportMessages /></AdminRoute>}</Route>
                <Route path="/admin/shooting-cohort">{() => <AdminRoute><AdminShootingCohortPage /></AdminRoute>}</Route>
                <Route path="/admin/community-3-pointers">{() => <AdminRoute><AdminCommunity3PointersPage /></AdminRoute>}</Route>
                <Route path="/shooting-cohort" component={ShootingCohort} />
                <Route path="/admin/notification-lab">{() => <AdminRoute><Suspense fallback={<LoadingScreen />}><NotificationLab /></Suspense></AdminRoute>}</Route>
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
                <Route path="/connect">{() => <Redirect to="/community?tab=players" />}</Route>
                <Route path="/challenge-history" component={ChallengeHistory} />
                <Route path="/journal" component={Journal} />
                <Route path="/coach-p" component={CoachP} />
                <Route path="/custom-workouts" component={CustomWorkouts} />
                <Route path="/game-day" component={GameDay} />
                <Route path="/hub" component={Hub} />
                <Route path="/progress/customize" component={HubStatCustomize} />
                <Route path="/journey" component={Journey} />
                <Route path="/community" component={CommunityPage} />
                <Route path="/community/friends">{() => <Redirect to="/community?tab=activity" />}</Route>
                <Route path="/community/challenges">{() => <Redirect to="/community?tab=challenges" />}</Route>
                <Route path="/community/find-players">{() => <Redirect to="/community?tab=players" />}</Route>
                <Route path="/profile-hub" component={ProfileHubPage} />
                <Route path="/streaks" component={StreaksPage} />
                <Route path="/archetypes" component={Archetypes} />
                <Route path="/my-archetype"><Redirect to="/archetypes?tab=identity" /></Route>
                <Route path="/my-goal" component={MyGoal} />
                <Route path="/feedback" component={FeedbackPage} />
                <Route path="/contact" component={SupportMessages} />
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
            </SetupAwareLayout>
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
          <ProUpgradeProvider>
            <RoleProvider>
              <Router />
            </RoleProvider>
          </ProUpgradeProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
