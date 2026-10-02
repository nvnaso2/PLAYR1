import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSummaryCard } from "@/components/profile/profile-summary-card";
import { apiRequest, getObjectUrl, nativeFetch } from "@/lib/queryClient";
import {
  BarChart3, BookMarked, Check, ChevronRight, UserCircle, Crown, MessageCircle, Play, Radar,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ProfileSubscription = {
  plan: "free" | "pro" | "pro-infinity";
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export default function ProfileHubPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: playerProfile, isLoading: playerProfileLoading } = useQuery<any>({
    queryKey: ["/api/player-profile"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: career, isLoading: careerLoading } = useQuery<any>({
    queryKey: ["/api/career"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: careerStats, isLoading: careerStatsLoading } = useQuery<any>({
    queryKey: ["/api/stats/career"],
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
  } = useQuery<ProfileSubscription>({
    queryKey: ["/api/billing/subscription"],
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: (query) =>
      checkoutStatus === "success" && query.state.data?.plan === "free" ? 2500 : false,
  });

  const checkout = useMutation({
    mutationFn: async (interval: "month" | "year") => {
      const response = await apiRequest("POST", "/api/billing/checkout", { interval });
      const result = await response.json() as { url: string };
      if (typeof result.url !== "string" || !result.url) throw new Error("The checkout link could not be created.");
      return result;
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const portal = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal");
      const result = await response.json() as { url: string };
      if (typeof result.url !== "string" || !result.url) throw new Error("The subscription portal could not be opened.");
      return result;
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
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
    profile?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Player";
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
  const isInfinity = subscription?.plan === "pro-infinity";
  const isPro = subscription?.plan === "pro" || isInfinity;
  const currentPlan = isInfinity ? "Pro Infinity" : isPro ? "PLAYR1 Pro" : "Free";
  const currentPlanInterval = subscription?.interval === "month"
    ? "Monthly"
    : subscription?.interval === "year"
      ? "Annual"
      : null;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const unreadCount = supportUnread?.unreadCount ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-6">
      <ProfileSummaryCard
        user={user}
        userProfile={profile}
        playerProfile={playerProfile}
        career={career}
        careerStats={careerStats}
        isLoading={isLoading || playerProfileLoading || careerLoading || careerStatsLoading}
        onEditProfile={() => navigate("/profile")}
        onSettings={() => navigate("/settings")}
      />

      {subscriptionLoading ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
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
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-none"
          data-testid="card-profile-subscription"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                <Crown className="h-5 w-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200/70">PLAYR1 training</p>
                  <h2 className="text-base font-bold text-white">Pro vs. Free</h2>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Current plan</p>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <Badge className={isPro ? "border border-orange-300/20 bg-orange-400/15 text-orange-100 hover:bg-orange-400/15" : "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-800"}>
                    {currentPlan}{isPro && currentPlanInterval ? ` · ${currentPlanInterval}` : ""}
                  </Badge>
                  {!isPro && (
                    <button
                      type="button"
                      onClick={() => checkout.mutate("month")}
                      disabled={checkout.isPending}
                      className="min-h-7 rounded-md bg-orange-500 px-2.5 text-[10px] font-bold text-black transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-wait disabled:opacity-60"
                      data-testid="button-profile-upgrade-month"
                    >
                      {checkout.isPending ? "Opening…" : "Upgrade"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isPro && periodEnd && (
              <p className="mt-2 text-[11px] text-zinc-500">
                {subscription.cancelAtPeriodEnd ? "Access through" : "Next renewal"} {periodEnd}
              </p>
            )}

            {checkoutStatus === "success" && (
              <p role="status" className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                {isPro ? "PLAYR1 Pro is active on your account." : "Payment complete. Updating your plan…"}
              </p>
            )}
            {checkoutStatus === "cancelled" && (
              <p role="status" className="mt-3 rounded-lg border border-zinc-700 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                Checkout was cancelled. Your plan has not changed.
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">In-person training</p>
                <p className="mt-1 text-2xl font-black leading-none text-zinc-100">$50–$100</p>
                <p className="mt-1 text-[10px] text-zinc-500">per hour</p>
              </div>
              <div className="rounded-xl border border-orange-300/20 bg-orange-400/[0.08] p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-orange-200/70">PLAYR1 Pro</p>
                <p className="mt-1 text-2xl font-black leading-none text-white">$9.99</p>
                <p className="mt-1 text-[10px] text-orange-100/60">for a month</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
              A month of structured workouts and courses plus personalized drills for less than one in-person hour of training.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className={`rounded-xl border p-3 ${!isPro ? "border-zinc-500/60 bg-zinc-800/60" : "border-zinc-800 bg-black/20"}`}>
                <div className="mb-2 flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-zinc-200">Free</p>
                  {!isPro && <span className="text-[9px] font-semibold uppercase text-zinc-400">Your plan</span>}
                </div>
                <ul className="space-y-1.5 text-[10px] leading-tight text-zinc-400">
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Daily Drills + Full Drill Library Access (100+ Drills)</li>
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />3 Coach P questions / month</li>
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Workouts + Game Stat Tracking</li>
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Profile + Dashboard Analytics</li>
                </ul>
              </div>
              <div className={`rounded-xl border p-3 ${isPro ? "border-orange-300/45 bg-orange-400/[0.08]" : "border-orange-300/15 bg-black/20"}`}>
                <div className="mb-2 flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-orange-100">Pro</p>
                  {isPro && <span className="text-[9px] font-semibold uppercase text-orange-200/80">Your plan</span>}
                </div>
                <ul className="space-y-1.5 text-[10px] leading-tight text-zinc-300">
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Unlimited Coach P</li>
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Full Programs + Courses Access</li>
                  <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Full Workout Library Access</li>
                </ul>
              </div>
            </div>

            {!isPro ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => checkout.mutate("year")}
                  disabled={checkout.isPending}
                  className="min-h-10 w-full rounded-lg border border-orange-300/25 bg-zinc-950 px-3 text-[11px] font-semibold text-orange-100 transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-wait disabled:opacity-60"
                  data-testid="button-profile-upgrade-year"
                >
                  Choose annual · $99.99/year
                </button>
              </div>
            ) : !isInfinity ? (
              <button
                type="button"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="mt-3 min-h-10 w-full rounded-lg border border-orange-300/25 bg-orange-400/[0.08] px-3 text-xs font-semibold text-orange-100 transition hover:bg-orange-400/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-wait disabled:opacity-60"
              >
                {portal.isPending ? "Opening subscription settings…" : "Manage subscription"}
              </button>
            ) : null}
            {(checkout.isError || portal.isError) && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {checkout.error instanceof Error
                  ? checkout.error.message
                  : portal.error instanceof Error
                    ? portal.error.message
                    : "Billing could not be opened. Please try again."}
              </p>
            )}
            {!isPro && <p className="mt-2 text-center text-[10px] text-zinc-600">Cancel anytime.</p>}
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="profile-career-heading" className="space-y-2">
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
        <Card
          className="cursor-pointer border-zinc-800/60 bg-zinc-900/40 transition hover:border-zinc-700 hover:bg-zinc-900"
          onClick={() => navigate("/profile")}
          data-testid="card-profile-edit"
        >
          <CardContent className="flex items-center gap-4 p-5">
            {isLoading ? (
              <Skeleton className="h-14 w-14 rounded-full" />
            ) : (
              <Avatar className="h-14 w-14 border-2 border-zinc-700">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-orange-500/20 text-lg font-bold text-orange-400">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <h2 className="truncate text-lg font-bold leading-tight">{displayName}</h2>
              )}
              {archetype?.archetypeName && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {archetype.archetypeName}
                </Badge>
              )}
              <p className="mt-1 text-xs text-zinc-500">My Profile · View &amp; customize</p>
            </div>
            <UserCircle className="h-4 w-4 shrink-0 text-zinc-600" />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Profile shortcuts">
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate("/streak-challenges/fifty-in-a-row?returnTo=%2Fprofile-hub")}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            aria-label="3 Point Community Challenge"
            data-testid="card-profile-3-point-community-challenge"
          >
            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-orange-300/70 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 shadow-[0_7px_22px_rgba(249,115,22,0.24)] transition group-hover:scale-[1.03] group-hover:shadow-[0_9px_28px_rgba(249,115,22,0.34)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/90 bg-zinc-950 shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                <Play className="h-5 w-5 fill-white text-white" />
              </span>
            </span>
            <span className="text-[10px] font-bold leading-tight text-zinc-300">3 Point Challenge</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/journal")}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label="Journal"
            data-testid="card-profile-journal"
          >
            <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[18px] border border-[#f2e6cc] bg-gradient-to-br from-[#eee1c4] to-[#c9b894] shadow-[0_5px_18px_rgba(0,0,0,0.28)] transition group-hover:-translate-y-0.5">
              <span className="absolute inset-y-2 left-2 w-px bg-[#9c8765]/60" />
              <BookMarked className="h-8 w-8 text-[#423727]" strokeWidth={1.8} />
              <span className="absolute right-3 top-0 h-4 w-2 rounded-b-sm bg-orange-600" />
            </span>
            <span className="text-[10px] font-bold leading-tight text-zinc-300">Journal</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/lead-magnets")}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label="Game Insights: quick reads and practical next steps for your game"
            data-testid="card-profile-game-insights"
          >
            <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-orange-300/30 bg-[radial-gradient(circle_at_35%_25%,rgba(249,115,22,0.24),rgba(24,24,27,0.96)_72%)] shadow-[0_0_18px_rgba(249,115,22,0.14)] transition group-hover:scale-[1.04] group-hover:border-orange-200/60 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.28)]">
              <Radar className="h-8 w-8 text-orange-200" strokeWidth={1.8} />
              <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.9)]" />
            </span>
            <span className="max-w-[100px] text-[10px] font-bold leading-tight text-zinc-300">Game Insights</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="group relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label={unreadCount > 0 ? `Talk Through Your Game, ${unreadCount} unread messages` : "Talk Through Your Game"}
            data-testid="card-profile-contact"
          >
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
            <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-orange-200/80 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[0_0_16px_rgba(249,115,22,0.42),inset_0_2px_5px_rgba(255,255,255,0.4)] transition group-hover:scale-[1.04] group-hover:shadow-[0_0_22px_rgba(249,115,22,0.58),inset_0_2px_5px_rgba(255,255,255,0.4)]">
              <MessageCircle className="h-8 w-8 text-zinc-950" strokeWidth={2.6} />
            </span>
            <span className="max-w-[100px] text-[10px] font-bold leading-tight text-zinc-300">Talk Through Your Game</span>
          </button>
        </div>
      </section>
    </div>
  );
}
