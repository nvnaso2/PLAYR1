import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users, Swords, Search } from "lucide-react";

export default function CommunityPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: friendRequests } = useQuery<any[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user,
  });
  const { data: challengeInvites } = useQuery<any[]>({
    queryKey: ["/api/group-challenges/invites"],
    enabled: !!user,
  });

  const friendReqCount  = friendRequests?.length ?? 0;
  const challengeCount  = challengeInvites?.length ?? 0;

  const sections = [
    {
      key: "friends",
      label: "Friends",
      description: "Activity feed, friend requests & connections",
      icon: Users,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
      path: "/community/friends",
      badge: friendReqCount,
    },
    {
      key: "challenges",
      label: "Group Challenges",
      description: "Compete with friends on shared goals",
      icon: Swords,
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-400",
      path: "/community/challenges",
      badge: challengeCount,
    },
    {
      key: "find-players",
      label: "Find Players",
      description: "Discover players matched to your skill & location",
      icon: Search,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400",
      path: "/community/find-players",
      badge: 0,
    },
  ];

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-5">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" data-testid="text-community-title">Community</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Connect, compete, and grow together</p>
      </div>

      <div className="space-y-3">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <Card
              key={s.key}
              className="cursor-pointer hover:bg-zinc-900/60 transition-colors border-zinc-800/60 bg-zinc-900/40"
              onClick={() => navigate(s.path)}
              data-testid={`card-community-${s.key}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-white">{s.label}</h3>
                    {s.badge > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5 shrink-0">
                        {s.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
