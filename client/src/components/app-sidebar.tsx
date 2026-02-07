import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  LogOut,
  ChevronUp,
  Dumbbell,
  Crosshair,
  HandMetal,
  Shield,
  Brain,
  Flame,
  Settings,
  Trophy
} from "lucide-react";
import logoLandscape from "@assets/PNG_image_1770494053382.png";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "My Career", url: "/career", icon: Trophy },
  { title: "Drill Library", url: "/drills", icon: Play },
  { title: "Training Log", url: "/log", icon: ClipboardList },
  { title: "My Filmroom", url: "/videos", icon: Video },
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
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();

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

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <Link href="/">
          <div className="flex items-center cursor-pointer overflow-hidden h-12" data-testid="link-sidebar-logo">
            <img 
              src={logoLandscape} 
              alt="PLAYR1" 
              className="w-40 min-w-[10rem] object-contain mix-blend-screen dark:mix-blend-screen"
            />
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
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
                      <Link href="/admin">
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categoryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.includes(item.url.split('?')[1]?.split('=')[1] || '')}
                    data-testid={`link-category-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  className="w-full"
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
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                className="w-56"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer" data-testid="link-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => window.location.href = "/api/logout"}
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
