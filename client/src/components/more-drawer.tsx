import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
import { getObjectUrl } from "@/lib/queryClient";
import { preloadRoute } from "@/lib/pageLoaders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Play, Video, LogOut, Megaphone, Settings, ChevronRight,
  BarChart3, Users, Dumbbell, MessageCircle, CalendarDays,
  ClipboardCheck, UserCircle, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreDrawerProps {
  open: boolean;
  onClose: () => void;
}

const playerMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Drill Library", url: "/drills", icon: Play },
  { title: "My Film Room", url: "/videos", icon: Video },
  { title: "Feedback", url: "/feedback", icon: Megaphone },
];

const trainerMenuItems = [
  { title: "Dashboard", url: "/trainer", icon: BarChart3 },
  { title: "Player Management", url: "/trainer/roster", icon: Users },
  { title: "Drills & Workouts", url: "/trainer/drills", icon: Dumbbell },
  { title: "Chat", url: "/trainer/chat", icon: MessageCircle },
  { title: "Schedule", url: "/trainer/schedule", icon: CalendarDays },
  { title: "Evaluations", url: "/trainer/evaluations", icon: ClipboardCheck },
  { title: "Trainer Profile", url: "/trainer/profile", icon: UserCircle },
  { title: "Feedback", url: "/feedback", icon: Megaphone },
];

export function MoreDrawer({ open, onClose }: MoreDrawerProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const { activeView, setActiveView, canToggle } = useRole();

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: pendingConnections } = useQuery<any[]>({
    queryKey: ["/api/connections/pending"],
    enabled: activeView === "trainer" && !!user,
  });
  const pendingCount = pendingConnections?.length ?? 0;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
    if (user?.firstName) return user.firstName[0];
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
  const avatarSrc =
    profile?.profileImageUrl || user?.profileImageUrl
      ? getObjectUrl(profile?.profileImageUrl || user?.profileImageUrl!)
      : undefined;

  const isTrainer = activeView === "trainer";
  const menuItems = isTrainer ? trainerMenuItems : playerMenuItems;

  const isActive = (url: string) => {
    if (url === "/trainer" && location === "/trainer") return true;
    if (url !== "/trainer" && url !== "/" && location.startsWith(url)) return true;
    return location === url;
  };

  const go = (url: string) => {
    navigate(url);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[80%] p-0 rounded-t-[28px] bg-zinc-950 border-zinc-800 flex flex-col"
        data-testid="more-drawer"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Profile header */}
        <div className="px-5 py-3 shrink-0">
          <button
            data-testid="button-more-profile"
            onClick={() => go("/profile")}
            className="flex items-center gap-3 w-full"
          >
            <Avatar className="h-12 w-12 border-2 border-zinc-700">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 font-bold text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold text-base">{displayName}</p>
              <p className="text-zinc-500 text-xs">View profile</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        </div>

        {/* View toggle (trainer mode) */}
        {canToggle && (
          <div className="px-5 pb-3 shrink-0">
            <div className="flex rounded-xl bg-zinc-900 p-1 gap-1">
              <button
                onClick={() => { setActiveView("player"); go("/hub"); }}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                  !isTrainer ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-zinc-200"
                )}
                data-testid="button-switch-player"
              >
                Player
              </button>
              <button
                onClick={() => { setActiveView("trainer"); go("/trainer"); }}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                  isTrainer ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-zinc-200"
                )}
                data-testid="button-switch-trainer"
              >
                Trainer
              </button>
            </div>
          </div>
        )}

        <div className="h-px bg-zinc-800 shrink-0 mx-5" />

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-3">
            {isTrainer ? "Trainer" : "Menu"}
          </p>
          {menuItems.map((item) => {
            const active = isActive(item.url);
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                data-testid={`link-more-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                onClick={() => go(item.url)}
                onMouseEnter={() => preloadRoute(item.url)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors text-left",
                  active
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active ? "text-orange-400" : "text-zinc-500"
                  )}
                />
                <span className="text-sm font-medium flex-1">{item.title}</span>
                {item.title === "Player Management" && pendingCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                    {pendingCount}
                  </Badge>
                )}
                {active && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </button>
            );
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="h-px bg-zinc-800 my-3" />
              <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-3">
                Admin
              </p>
              <button
                data-testid="link-more-admin"
                onClick={() => go("/admin")}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">Admin Dashboard</span>
              </button>
            </>
          )}
        </div>

        <div className="h-px bg-zinc-800 shrink-0 mx-5" />

        {/* Logout */}
        <div className="px-5 py-4 shrink-0">
          <button
            data-testid="button-more-logout"
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
