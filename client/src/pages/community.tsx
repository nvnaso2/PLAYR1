import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getObjectUrl } from "@/lib/queryClient";
import { UserPlus, Shield, ChevronRight, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const sections = [
  {
    title: "My Trainer",
    description: "Connect with your trainer, view sessions & evaluations",
    icon: UserPlus,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    path: "/my-trainer",
    testId: "card-community-my-trainer",
  },
  {
    title: "Teams & Leagues",
    description: "Join teams, find leagues and compete with others",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    path: "/teams",
    testId: "card-community-teams",
  },
];

export default function CommunityPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: connections } = useQuery<any[]>({
    queryKey: ["/api/connections/pending"],
    enabled: !!user,
  });
  const pendingCount = connections?.length ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-community-title">Community</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect with trainers, teams, and players</p>
      </div>

      {/* Section cards */}
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{section.title}</h3>
                    {section.title === "My Trainer" && pendingCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                        {pendingCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Find people quick link */}
      <Card
        className="cursor-pointer border-zinc-800/40 bg-zinc-900/20"
        onClick={() => navigate("/connect")}
        data-testid="card-community-find-people"
      >
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-zinc-500" />
          <span className="text-sm text-zinc-400 flex-1">Find players &amp; trainers near you</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </CardContent>
      </Card>
    </div>
  );
}
