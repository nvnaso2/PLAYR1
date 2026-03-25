import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
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
  Play, 
  Target, 
  ClipboardList, 
  BarChart3, 
  Video, 
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
} from "lucide-react";
import playr1Logo from "@assets/Playr1_App_Logo_1774460124826.png";

const playerNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "My Career", url: "/career", icon: Trophy },
  { title: "Training Log", url: "/log", icon: ClipboardList },
  { title: "My Trainer", url: "/my-trainer", icon: UserPlus },
  { title: "Drill Library", url: "/drills", icon: Play },
  { title: "My Film Room", url: "/videos", icon: Video },
  { title: "Teams & Leagues", url: "/teams", icon: Shield },
];

const trainerNavItems = [
  { title: "Home", url: "/trainer", icon: BarChart3 },
  { title: "Player Management", url: "/trainer/roster", icon: Users },
  { title: "Drills & Workouts", url: "/trainer/drills", icon: Dumbbell },
  { title: "Chat", url: "/trainer/chat", icon: MessageCircle },
  { title: "Schedule", url: "/trainer/schedule", icon: CalendarDays },
  { title: "Evaluations", url: "/trainer/evaluations", icon: ClipboardCheck },
  { title: "Trainer Profile", url: "/trainer/profile", icon: UserCircle },
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

  const isTrainerView = activeView === "trainer";
  const navItems = isTrainerView ? trainerNavItems : playerNavItems;

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

  const isActiveLink = (url: string) => {
    if (url === "/dashboard" && location === "/") return true;
    if (url === "/trainer" && location === "/trainer") return true;
    if (url !== "/trainer" && url !== "/dashboard" && url !== "/" && location.startsWith(url)) return true;
    return location === url;
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pb-2 safe-area-top" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <Link href={isTrainerView ? "/trainer" : "/dashboard"} onClick={closeSidebar}>
          <div className="flex items-center cursor-pointer h-24" data-testid="link-sidebar-logo">
            <img src={playr1Logo} alt="PLAYR1" className="h-24 object-contain mix-blend-screen" />
          </div>
        </Link>
        {canToggle && (
          <div className="flex items-center gap-1 mt-2">
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
                    >
                      <Link href="/admin" onClick={closeSidebar}>
                        <Settings className="w-4 h-4" />
                        <span>Admin Dashboard</span>
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
                    <AvatarImage src={user?.profileImageUrl || undefined} />
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
                  <Link href="/profile" className="cursor-pointer" data-testid="link-profile" onClick={closeSidebar}>
                    <User className="mr-2 h-4 w-4" />
                    PLAYR1 Profile
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
