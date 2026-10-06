import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";

import { preloadRoute, preloadCommonPages } from "@/lib/pageLoaders";
import { useShootingCohortAdminNotificationCounts } from "@/lib/shooting-cohort-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Target, 
  ClipboardList, 
  User,
  UserCircle,
  LogOut,
  ChevronUp,
  Dumbbell,
  Crosshair,
  HandMetal,
  Shield,
  Brain,
  Flame,
  Settings,
  Trophy,
  Users,
  FileText,
  MessageCircle,
  Mail,
  UserPlus,
  ArrowLeftRight,
  CalendarDays,
  ClipboardCheck,
  Eye,
  Megaphone,
  Zap,
  Fingerprint,
  Star,
} from "lucide-react";
import { Playr1Logo } from "@/components/playr1-logo";
import { getObjectUrl, nativeFetch } from "@/lib/queryClient";

const playerNavItems = [
  { title: "Feedback", url: "/feedback", icon: Megaphone },
];

const trainerNavItems = [
  { title: "Feedback", url: "/feedback", icon: Megaphone },
];

const categoryItems = [
  { title: "Ball Handling", url: "/drills?category=ball-handling", icon: HandMetal },
  { title: "Shooting", url: "/drills?category=shooting", icon: Target },
  { title: "Passing", url: "/drills?category=passing", icon: Crosshair },
  { title: "Finishing", url: "/drills?category=finishing", icon: Flame },
  { title: "Defense", url: "/drills?category=defense", icon: Shield },
  { title: "Film Session", url: "/drills?category=film-session", icon: Brain },
  { title: "Workouts", url: "/drills?category=workouts", icon: Dumbbell },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const { activeView, setActiveView, hasStaffRole, canToggle } = useRole();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const { data: careerData } = useQuery<any>({
    queryKey: ["/api/career"],
    retry: false,
    enabled: !!user,
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/profile"],
    retry: false,
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const getInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user.firstName) return user.firstName[0];
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    return user.email || "User";
  };

  // Trainer mode remains implemented but is intentionally hidden from the
  // player-facing product until that experience is reintroduced.
  const isTrainerView = false;
  const navItems = isTrainerView ? trainerNavItems : playerNavItems;

  // Warm up the most common page chunks in the background after the sidebar
  // mounts, so the first tap on a tab feels instant.
  useEffect(() => {
    preloadCommonPages(isTrainerView);
  }, [isTrainerView]);

  const { data: pendingConnections } = useQuery<any[]>({
    queryKey: ["/api/connections/pending"],
    enabled: isTrainerView && !!user,
  });
  const pendingCount = pendingConnections?.length || 0;

  const { data: parentChildren } = useQuery<any[]>({
    queryKey: ["/api/parent/children"],
    enabled: !!user,
  });
  const hasLinkedChildren = (parentChildren?.length || 0) > 0;
  const isParentOnly = hasLinkedChildren && (!careerData || !careerData.onboardingCompleted);
  const { data: shootingCohortNotifications } = useShootingCohortAdminNotificationCounts(!!user && isAdmin);
  const shootingCohortNotificationTotal = (shootingCohortNotifications?.applications ?? 0)
    + (shootingCohortNotifications?.filmReview ?? 0)
    + (shootingCohortNotifications?.customRequests ?? 0);
  const { data: playerHelpUnread } = useQuery<{ available: boolean; unreadCount: number }>({
    queryKey: ["/api/admin/support-messages/unread", user?.id],
    queryFn: async () => {
      const response = await nativeFetch("/api/admin/support-messages/unread", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load player help notifications");
      return response.json();
    },
    enabled: !!user && isAdmin,
    staleTime: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const isActiveLink = (url: string) => {
    if (url === "/dashboard" && location === "/") return true;
    if (url === "/trainer" && location === "/trainer") return true;
    if (url !== "/trainer" && url !== "/dashboard" && url !== "/" && location.startsWith(url)) return true;
    return location === url;
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pb-3 safe-area-top" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <Link href={isParentOnly ? "/parent" : isTrainerView ? "/trainer" : "/dashboard"} onClick={closeSidebar}>
          <div className="w-full relative overflow-hidden cursor-pointer" style={{ height: '34px' }} data-testid="link-sidebar-logo">
            <Playr1Logo
              className="absolute w-full"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </Link>
        {isParentOnly && (
          <div className="mt-1 px-1">
            <p className="text-xs text-muted-foreground font-medium">Parent View</p>
          </div>
        )}
        {false && !isParentOnly && canToggle && (
          <div className="flex items-center gap-1 mt-1">
            <Button
              size="sm"
              variant={!isTrainerView ? "default" : "ghost"}
              className="flex-1 text-xs h-8"
              onClick={() => { setActiveView("player"); setLocation("/dashboard"); closeSidebar(); }}
              data-testid="button-view-player"
            >
              <UserCircle className="w-3 h-3 mr-1" />
              Player
            </Button>
            <Button
              size="sm"
              variant={isTrainerView ? "default" : "ghost"}
              className="flex-1 text-xs h-8"
              onClick={() => { setActiveView("trainer"); setLocation("/trainer"); closeSidebar(); }}
              data-testid="button-view-trainer"
            >
              <Shield className="w-3 h-3 mr-1" />
              Trainer
            </Button>
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        {isParentOnly ? (
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/parent" || location.startsWith("/parent")}
                    data-testid="link-nav-parent-dashboard"
                    onMouseEnter={() => preloadRoute("/parent")}
                    onTouchStart={() => preloadRoute("/parent")}
                    onFocus={() => preloadRoute("/parent")}
                  >
                    <Link href="/parent" onClick={closeSidebar}>
                      <Eye className="w-4 h-4" />
                      <span>My Child's Progress</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>{isTrainerView ? "Trainer" : "Menu"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActiveLink(item.url)}
                        data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                        onMouseEnter={() => preloadRoute(item.url)}
                        onTouchStart={() => preloadRoute(item.url)}
                        onFocus={() => preloadRoute(item.url)}
                      >
                        <Link href={item.url} onClick={closeSidebar}>
                          <item.icon className="w-4 h-4" />
                          <span className="flex-1">{item.title}</span>
                          {item.title === "Player Management" && pendingCount > 0 && (
                            <Badge variant="destructive" className="no-default-hover-elevate text-[10px] ml-auto" data-testid="badge-sidebar-pending-connections">
                              {pendingCount}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>Admin</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location === "/admin"}
                          data-testid="link-nav-admin"
                          onMouseEnter={() => preloadRoute("/admin")}
                          onTouchStart={() => preloadRoute("/admin")}
                          onFocus={() => preloadRoute("/admin")}
                        >
                          <Link href="/admin" onClick={closeSidebar}>
                            <Settings className="w-4 h-4" />
                            <span>Admin Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActiveLink("/community")}
                          data-testid="link-nav-admin-community"
                          onMouseEnter={() => preloadRoute("/community")}
                          onTouchStart={() => preloadRoute("/community")}
                          onFocus={() => preloadRoute("/community")}
                        >
                          <Link href="/community" onClick={closeSidebar}>
                            <Users className="w-4 h-4" />
                            <span>Community</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location === "/admin/community-3-pointers"}
                          data-testid="link-nav-admin-community-3-pointers"
                          onMouseEnter={() => preloadRoute("/admin/community-3-pointers")}
                          onTouchStart={() => preloadRoute("/admin/community-3-pointers")}
                          onFocus={() => preloadRoute("/admin/community-3-pointers")}
                        >
                          <Link href="/admin/community-3-pointers" onClick={closeSidebar}>
                            <Flame className="w-4 h-4" />
                            <span>Community 3 Pointers</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location === "/admin/shooting-cohort"}
                          data-testid="link-nav-admin-shooting-cohort"
                          onMouseEnter={() => preloadRoute("/admin/shooting-cohort")}
                          onTouchStart={() => preloadRoute("/admin/shooting-cohort")}
                          onFocus={() => preloadRoute("/admin/shooting-cohort")}
                        >
                          <Link href="/admin/shooting-cohort" onClick={closeSidebar}>
                            <Target className="w-4 h-4" />
                            <span className="flex-1">Shooting Cohort</span>
                            {shootingCohortNotificationTotal > 0 && (
                              <span
                                aria-label={`${shootingCohortNotificationTotal} outstanding shooting cohort notifications`}
                                className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold leading-none text-black shadow-[0_0_12px_hsl(var(--primary)/0.65)] motion-safe:animate-pulse"
                                data-testid="badge-sidebar-shooting-cohort-notifications"
                              >
                                {shootingCohortNotificationTotal > 99 ? "99+" : shootingCohortNotificationTotal}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location === "/admin/support-messages" || location.startsWith("/admin/support-messages/")}
                          data-testid="link-nav-admin-support-messages"
                          onMouseEnter={() => preloadRoute("/admin/support-messages")}
                          onTouchStart={() => preloadRoute("/admin/support-messages")}
                          onFocus={() => preloadRoute("/admin/support-messages")}
                        >
                          <Link href="/admin/support-messages" onClick={closeSidebar}>
                            <MessageCircle className="w-4 h-4" />
                            <span className="flex-1">Player Inbox</span>
                            {(playerHelpUnread?.unreadCount || 0) > 0 && (
                              <Badge variant="destructive" className="no-default-hover-elevate ml-auto text-[10px]" data-testid="badge-sidebar-player-help-unread">
                                {playerHelpUnread?.unreadCount}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location === "/admin/onboarding-preview"}
                          data-testid="link-nav-onboarding-preview"
                          onMouseEnter={() => preloadRoute("/admin/onboarding-preview")}
                          onTouchStart={() => preloadRoute("/admin/onboarding-preview")}
                        >
                          <Link href="/admin/onboarding-preview" onClick={closeSidebar}>
                            <Eye className="w-4 h-4" />
                            <span>Onboarding Preview</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location === "/admin/brand-principles"}
                          data-testid="link-nav-brand-principles"
                          onMouseEnter={() => preloadRoute("/admin/brand-principles")}
                          onTouchStart={() => preloadRoute("/admin/brand-principles")}
                        >
                          <Link href="/admin/brand-principles" onClick={closeSidebar}>
                            <Brain className="w-4 h-4" />
                            <span>Brand Principles</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {hasLinkedChildren && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>Parent</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location === "/parent" || location.startsWith("/parent")}
                          data-testid="link-nav-parent-dashboard"
                          onMouseEnter={() => preloadRoute("/parent")}
                          onTouchStart={() => preloadRoute("/parent")}
                          onFocus={() => preloadRoute("/parent")}
                        >
                          <Link href="/parent" onClick={closeSidebar}>
                            <Eye className="w-4 h-4" />
                            <span>Parent Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </>
        )}

      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{getDisplayName()}</span>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                className="w-56"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile-hub" className="cursor-pointer" data-testid="link-profile" onClick={closeSidebar}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer" data-testid="link-settings" onClick={closeSidebar}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
