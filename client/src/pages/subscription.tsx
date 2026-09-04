import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, Crown, MessageSquare } from "lucide-react";

type SubscriptionState = {
  plan: "free" | "pro";
  status: string;
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  coachP: { used: number; limit: number | null; remaining: number | null; monthKey: string };
};

export default function SubscriptionPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
    refetchInterval: new URLSearchParams(location.search).get("checkout") === "success" ? 2500 : false,
  });
  const checkout = useMutation({
    mutationFn: async (interval: "month" | "year") => {
      const response = await apiRequest("POST", "/api/billing/checkout", { interval });
      return response.json();
    },
    onSuccess: ({ url }) => { window.location.href = url; },
  });
  const portal = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/billing/portal")).json(),
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  const isPro = data?.plan === "pro";
  const renewal = data?.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;
  const usagePct = data?.coachP.limit ? (data.coachP.used / data.coachP.limit) * 100 : 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
      <Button variant="ghost" onClick={() => navigate("/profile-hub")}><ArrowLeft className="w-4 h-4 mr-2" />Profile</Button>
      <div>
        <div className="flex items-center gap-2"><Crown className="w-7 h-7 text-amber-400" /><h1 className="text-3xl font-bold">PLAYR1 Pro</h1></div>
        <p className="text-muted-foreground mt-2">Full programs and unlimited access to Coach P.</p>
      </div>

      <Card data-testid="card-current-plan">
        <CardHeader><CardTitle className="flex items-center justify-between">Current plan <Badge>{isPro ? "PRO" : "FREE"}</Badge></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="capitalize">{isLoading ? "Loading…" : data?.status}</span></div>
          {renewal && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{data?.cancelAtPeriodEnd ? "Access ends" : "Renews"}</span><span>{renewal}</span></div>}
          {data?.cancelAtPeriodEnd && <p className="text-sm text-amber-400">Your subscription is cancelled and remains active through the date above.</p>}
          {isPro && <Button variant="outline" onClick={() => portal.mutate()} disabled={portal.isPending}>Manage subscription</Button>}
        </CardContent>
      </Card>

      <Card data-testid="card-coach-p-usage">
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Coach P usage</CardTitle></CardHeader>
        <CardContent>
          {isPro ? <p>Unlimited questions with PLAYR1 Pro.</p> : <>
            <div className="flex justify-between text-sm mb-2"><span>{data?.coachP.used ?? 0} of 3 used this month</span><span>{data?.coachP.remaining ?? 3} remaining</span></div>
            <Progress value={usagePct} />
          </>}
        </CardContent>
      </Card>

      {!isPro && <div className="grid sm:grid-cols-2 gap-4">
        {[
          { interval: "month" as const, price: "$9.99", suffix: "/month", label: "Monthly" },
          { interval: "year" as const, price: "$99.99", suffix: "/year", label: "Annual" },
        ].map((option) => (
          <Card key={option.interval} className={option.interval === "year" ? "border-amber-500/50" : ""}>
            <CardHeader><CardTitle>{option.label}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><span className="text-3xl font-bold">{option.price}</span><span className="text-muted-foreground">{option.suffix}</span></div>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400" />Unlimited Coach P</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400" />All full programs and courses</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400" />No trial—cancel anytime</li>
              </ul>
              <Button className="w-full" onClick={() => checkout.mutate(option.interval)} disabled={checkout.isPending} data-testid={`button-upgrade-${option.interval}`}>
                Choose {option.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>}

      <p className="text-xs text-muted-foreground text-center">Diagnostics, daily drills, workout and game tracking, heatmaps, profiles, and Community stay free.</p>
    </div>
  );
}