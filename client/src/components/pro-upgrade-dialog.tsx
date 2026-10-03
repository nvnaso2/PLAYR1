import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Crown, Loader2 } from "lucide-react";

type SubscriptionState = {
  plan: "free" | "pro" | "pro-infinity";
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type ProUpgradeContextValue = {
  openProOffer: (feature?: string) => void;
};

const ProUpgradeContext = createContext<ProUpgradeContextValue | null>(null);

export function useProUpgrade() {
  const context = useContext(ProUpgradeContext);
  if (!context) throw new Error("useProUpgrade must be used inside ProUpgradeProvider");
  return context;
}

export function ProUpgradeProvider({ children }: { children: ReactNode }) {
  const initialCheckoutStatus = new URLSearchParams(window.location.search).get("checkout");
  const [open, setOpen] = useState(initialCheckoutStatus === "success" || initialCheckoutStatus === "cancelled");
  const [feature, setFeature] = useState<string>();
  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancelled" | null>(
    initialCheckoutStatus === "success" || initialCheckoutStatus === "cancelled" ? initialCheckoutStatus : null,
  );

  useEffect(() => {
    if (!initialCheckoutStatus) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialCheckoutStatus]);

  const { data: subscription, isLoading, isError, refetch } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
    enabled: open,
    staleTime: 0,
    refetchInterval: (query) =>
      checkoutStatus === "success" && query.state.data?.plan === "free" ? 2500 : false,
  });

  const checkout = useMutation({
    mutationFn: async (interval: "month" | "year") => {
      const response = await apiRequest("POST", "/api/billing/checkout", { interval });
      const result = await response.json() as { url?: string };
      if (typeof result.url !== "string" || !result.url) throw new Error("The checkout link could not be created.");
      return { url: result.url };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const portal = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal");
      const result = await response.json() as { url?: string };
      if (typeof result.url !== "string" || !result.url) throw new Error("The subscription portal could not be opened.");
      return { url: result.url };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const contextValue = useMemo<ProUpgradeContextValue>(() => ({
    openProOffer: (nextFeature) => {
      setFeature(nextFeature);
      setCheckoutStatus(null);
      setOpen(true);
      void refetch();
    },
  }), [refetch]);

  const isInfinity = subscription?.plan === "pro-infinity";
  const isPro = subscription?.plan === "pro" || isInfinity;
  const currentPlan = isInfinity ? "Pro Infinity" : isPro ? "PLAYR1 Pro" : "Free";
  const currentInterval = subscription?.interval === "month"
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

  return (
    <ProUpgradeContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-zinc-800 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="h-5 w-5 text-orange-300" />
              {feature ? `Unlock ${feature} with PLAYR1 Pro` : "Choose your PLAYR1 plan"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Compare Free and Pro, then choose the plan that fits your training.
            </DialogDescription>
          </DialogHeader>

          {checkoutStatus === "success" && (
            <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {isPro ? "Your PLAYR1 Pro access is active." : "Checkout completed. We’re confirming your Pro access now."}
            </div>
          )}
          {checkoutStatus === "cancelled" && (
            <div role="status" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
              Checkout was cancelled. Your current plan has not changed.
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading plan details…
            </div>
          ) : isError || !subscription ? (
            <Card className="border-zinc-800 bg-zinc-900/70">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <p className="text-sm text-zinc-400">Your plan details could not be loaded.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-zinc-800 bg-black">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200/70">PLAYR1 training</p>
                    <h2 className="mt-1 text-base font-bold text-white">Pro vs. Free</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Current plan</p>
                    <Badge className={isPro
                      ? "mt-1 border border-orange-300/20 bg-orange-400/15 text-orange-100 hover:bg-orange-400/15"
                      : "mt-1 border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-800"}
                    >
                      {currentPlan}{isPro && currentInterval ? ` · ${currentInterval}` : ""}
                    </Badge>
                  </div>
                </div>

                {isPro && periodEnd && (
                  <p className="text-xs text-zinc-400">
                    {subscription.cancelAtPeriodEnd ? "Access through" : "Next renewal"} {periodEnd}
                  </p>
                )}

                <div className="rounded-xl border border-orange-300/15 bg-gradient-to-br from-orange-500/10 via-zinc-950 to-black p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-200">PLAYR1 Pro</p>
                      <p className="mt-1 text-2xl font-black text-white">$9.99<span className="ml-1 text-sm font-medium text-zinc-400">/ month</span></p>
                    </div>
                    <Crown className="h-6 w-6 text-orange-300" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    Structured workouts and courses plus personalized drills for less than one in-person hour of training.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={`rounded-xl border p-3 ${!isPro ? "border-zinc-500/60 bg-zinc-800/60" : "border-zinc-800 bg-black/20"}`}>
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-zinc-200">Free</p>
                      {!isPro && <span className="text-[9px] font-semibold uppercase text-zinc-400">Your plan</span>}
                    </div>
                    <ul className="space-y-1.5 text-[10px] leading-tight text-zinc-400">
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Daily drills + full drill library</li>
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />3 Coach P questions / month</li>
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Workouts + game stat tracking</li>
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Profile + dashboard analytics</li>
                    </ul>
                  </div>
                  <div className={`rounded-xl border p-3 ${isPro ? "border-orange-300/45 bg-orange-400/[0.08]" : "border-orange-300/15 bg-black/20"}`}>
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-orange-100">Pro</p>
                      {isPro && <span className="text-[9px] font-semibold uppercase text-orange-200/80">Your plan</span>}
                    </div>
                    <ul className="space-y-1.5 text-[10px] leading-tight text-zinc-300">
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Unlimited Coach P</li>
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Full programs + courses access</li>
                      <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Full workout library access</li>
                    </ul>
                  </div>
                </div>

                {!isPro ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      onClick={() => checkout.mutate("month")}
                      disabled={checkout.isPending}
                      className="bg-orange-500 font-bold text-black hover:bg-orange-400"
                    >
                      {checkout.isPending ? "Opening checkout…" : "Upgrade · $9.99/month"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => checkout.mutate("year")}
                      disabled={checkout.isPending}
                      className="border-orange-300/25 text-orange-100 hover:bg-orange-400/10"
                    >
                      Annual · $99.99/year
                    </Button>
                  </div>
                ) : !isInfinity ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                    className="w-full border-orange-300/25 text-orange-100 hover:bg-orange-400/10"
                  >
                    {portal.isPending ? "Opening subscription settings…" : "Manage subscription"}
                  </Button>
                ) : null}

                {(checkout.isError || portal.isError) && (
                  <p role="alert" className="text-xs text-red-300">
                    {checkout.error instanceof Error
                      ? checkout.error.message
                      : portal.error instanceof Error
                        ? portal.error.message
                        : "Billing could not be opened. Please try again."}
                  </p>
                )}
                {!isPro && <p className="text-center text-[10px] text-zinc-600">Cancel anytime.</p>}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </ProUpgradeContext.Provider>
  );
}