import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getObjectUrl, nativeFetch } from "@/lib/queryClient";
import {
  BarChart3, BotMessageSquare, Zap, BookOpen, CalendarDays,
  ChevronRight, UserCircle, Settings, Crown, MessageCircle, Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const sections = [
  {
    title: "PLAYR1 Pro",
    description: "Plan, Coach P usage and subscription controls",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    path: "/subscription",
    testId: "card-profile-subscription",
  },
  {
    title: "My Season",
    description: "Your current mode, next game, and next action",
    icon: CalendarDays,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    path: "/my-season",
    testId: "card-profile-my-season",
  },
  {
    title: "My Career",
    description: "Stats, trophies, training history and milestones",
    icon: BarChart3,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    path: "/career",
    testId: "card-profile-career",
  },
  {
    title: "My PLAYR1 Project",
    description: "Discover and follow the basketball project that fits your story",
    icon: BotMessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    path: "/my-goal",
    testId: "card-profile-goal",
  },
  {
    title: "Journal & Reflections",
    description: "Reflect on your training, games and player growth",
    icon: BookOpen,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    path: "/journal",
    testId: "card-profile-journal",
  },
  {
    title: "Game Day",
    description: "Pre-game prep, mental reps and game-day routines",
    icon: Zap,
    color: "text-green-400",
    bg: "bg-green-500/10",
    path: "/game-day",
    testId: "card-profile-gameday",
  },
  {
    title: "3 Point Community Challenge",
    description: "Log your best 3-point streak and see the community leaderboard",
    icon: Trophy,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    path: "/streak-challenges/fifty-in-a-row?returnTo=%2Fprofile-hub",
    testId: "card-profile-3-point-community-challenge",
  },
  {
    title: "Settings",
    description: "Privacy, family controls, notifications and account",
    icon: Settings,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    path: "/settings",
    testId: "card-profile-settings",
  },
  {
    title: "Talk Through Your Game",
    description: "Personal basketball help, directly with Nick, the founder of The PLAYR1 Project",
    icon: MessageCircle,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    path: "/contact",
    testId: "card-profile-contact",
  },
];

export default function ProfileHubPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: archetype } = useQuery<any>({
    queryKey: ["/api/archetypes/user"],
    enabled: !!user,
  });

  const { data: supportUnread } = useQuery<{ available: boolean; unreadCount: number }>({
    queryKey: ["/api/support/unread", user?.id],
    queryFn: async () => {
      const response = await nativeFetch("/api/support/unread", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load message notifications");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Player";
  const avatarSrc = profile?.profilePhotoUrl
    ? getObjectUrl(profile.profilePhotoUrl)
    : profile?.profileImageUrl
    ? getObjectUrl(profile.profileImageUrl)
    : undefined;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-6">
      {/* My Profile card — tap to view/customize public profile */}
      <Card
        className="cursor-pointer hover-elevate border-zinc-800/60 bg-zinc-900/40"
        onClick={() => navigate("/profile")}
        data-testid="card-profile-edit"
      >
        <CardContent className="p-5 flex items-center gap-4">
          {isLoading ? (
            <Skeleton className="w-14 h-14 rounded-full" />
          ) : (
            <Avatar className="w-14 h-14 border-2 border-zinc-700">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <h2 className="font-bold text-lg leading-tight truncate">{displayName}</h2>
            )}
            {archetype?.archetypeName && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {archetype.archetypeName}
              </Badge>
            )}
            <p className="text-xs text-zinc-500 mt-1">My Profile · View &amp; customize</p>
          </div>
          <UserCircle className="w-4 h-4 text-zinc-600 shrink-0" />
        </CardContent>
      </Card>

      {/* Section nav */}
      <div>
        <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider mb-3">Development</p>
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isContactSection = section.path === "/contact";
            const unreadCount = isContactSection ? supportUnread?.unreadCount || 0 : 0;
            return (
              <Card
                key={section.path}
                className={`cursor-pointer hover-elevate border-zinc-800/60 bg-zinc-900/40 ${unreadCount > 0 ? "border-red-500/40 bg-red-500/[0.06]" : ""}`}
                onClick={() => navigate(section.path)}
                data-testid={section.testId}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`relative w-12 h-12 rounded-xl ${section.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${section.color}`} />
                    {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-zinc-950 bg-red-500" aria-label="New message" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{section.title}</h3>
                      {unreadCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]" aria-label={`${unreadCount} new messages`}>{unreadCount}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
