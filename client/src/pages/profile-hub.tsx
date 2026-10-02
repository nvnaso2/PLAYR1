import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getObjectUrl, nativeFetch } from "@/lib/queryClient";
import {
  BarChart3, BookOpen, ChevronRight, UserCircle, Settings, Crown, MessageCircle, Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

  const {
    data: subscription,
    isLoading: subscriptionLoading,
    isError: subscriptionError,
    refetch: refetchSubscription,
  } = useQuery<{ plan?: string }>({
    queryKey: ["/api/billing/subscription"],
    enabled: !!user,
    staleTime: 30_000,
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
  const isPro = subscription?.plan === "pro" || subscription?.plan === "pro-infinity";
  const unreadCount = supportUnread?.unreadCount ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Profile</h1>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition hover:border-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label="Settings"
          data-testid="card-profile-settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

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

      {subscriptionLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : subscriptionError || !subscription ? (
        <Card className="rounded-2xl border border-zinc-800 bg-zinc-900/60" data-testid="card-profile-subscription-error">
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <p className="text-sm text-zinc-400">Your plan details could not be loaded.</p>
            <button
              type="button"
              onClick={() => void refetchSubscription()}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="overflow-hidden rounded-2xl border border-orange-400/40 bg-gradient-to-br from-orange-950/80 via-zinc-900 to-zinc-950 shadow-[0_16px_42px_rgba(249,115,22,0.09)]"
          data-testid="card-profile-subscription"
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                <Crown className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200/70">PLAYR1 Pro</p>
                <h2 className="text-lg font-bold text-white">
                  {isPro ? "Your training, unlocked." : "More coaching. More ways to train."}
                </h2>
              </div>
            </div>

            {isPro ? (
              <>
                <p className="mt-3 text-sm text-zinc-300">
                  Unlimited Coach P, full programs, and courses are active on your account.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/subscription")}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-orange-400/35 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  View your plan <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  A private training hour can cost $50–$100. Get a full month of PLAYR1 Pro for <span className="font-bold text-white">$9.99</span>.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Unlimited Coach P", "Full programs & courses", "Custom workout requests"].map((benefit) => (
                    <span key={benefit} className="rounded-full border border-orange-300/15 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-orange-50/90">
                      {benefit}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-zinc-500">Or choose $99.99/year. Cancel anytime.</p>
                <button
                  type="button"
                  onClick={() => navigate("/subscription")}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  Compare Free and Pro <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="profile-career-heading">
        <p id="profile-career-heading" className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">Career</p>
        <Card
          className="cursor-pointer border-zinc-800/60 bg-zinc-900/40 transition hover:border-zinc-700 hover:bg-zinc-900"
          onClick={() => navigate("/career")}
          data-testid="card-profile-career"
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
              <BarChart3 className="h-5 w-5 text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-base">My Career</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Stats, trophies, training history and milestones</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Profile shortcuts">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate("/streak-challenges/fifty-in-a-row?returnTo=%2Fprofile-hub")}
            className="relative aspect-square min-w-0 rounded-2xl border border-orange-400/50 bg-gradient-to-br from-orange-500/25 to-orange-700/10 px-2 py-3 text-center text-orange-100 transition hover:border-orange-300 hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            aria-label="3 Point Community Challenge"
            data-testid="card-profile-3-point-community-challenge"
          >
            <span className="flex h-full flex-col items-center justify-center gap-2">
              <Trophy className="h-5 w-5 shrink-0 text-orange-300" />
              <span className="text-[10px] font-bold leading-tight sm:text-xs">3 Point Community Challenge</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/journal")}
            className="aspect-square min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-2 py-3 text-center text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label="Journal"
            data-testid="card-profile-journal"
          >
            <span className="flex h-full flex-col items-center justify-center gap-2">
              <BookOpen className="h-5 w-5 shrink-0 text-purple-300" />
              <span className="text-xs font-semibold">Journal</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="relative aspect-square min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-2 py-3 text-center text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label={unreadCount > 0 ? `Talk Through Your Game, ${unreadCount} unread messages` : "Talk Through Your Game"}
            data-testid="card-profile-contact"
          >
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
            <span className="flex h-full flex-col items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5 shrink-0 text-orange-300" />
              <span className="text-[10px] font-semibold leading-tight sm:text-xs">Talk Through Your Game</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
