import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getObjectUrl } from "@/lib/queryClient";
import {
  BarChart3, Fingerprint, Star, BotMessageSquare, Zap,
  ChevronRight, Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const sections = [
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
    title: "Archetypes",
    description: "Explore player archetypes and discover your style",
    icon: Fingerprint,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    path: "/archetypes",
    testId: "card-profile-archetypes",
  },
  {
    title: "My Identity",
    description: "Your current archetype and player identity",
    icon: Star,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    path: "/my-archetype",
    testId: "card-profile-identity",
  },
  {
    title: "My Goal",
    description: "Set and track your personal development goal",
    icon: BotMessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    path: "/my-goal",
    testId: "card-profile-goal",
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

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Player";
  const avatarSrc = profile?.profileImageUrl
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
      {/* Profile card */}
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
            <p className="text-xs text-zinc-500 mt-1">Tap to edit profile</p>
          </div>
          <Settings className="w-4 h-4 text-zinc-600 shrink-0" />
        </CardContent>
      </Card>

      {/* Section nav */}
      <div>
        <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider mb-3">Development</p>
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="cursor-pointer hover-elevate border-zinc-800/60 bg-zinc-900/40"
                onClick={() => navigate(section.path)}
                data-testid={section.testId}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${section.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${section.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{section.title}</h3>
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
