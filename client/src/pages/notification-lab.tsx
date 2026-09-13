import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCircle2, ExternalLink, Radio, Search, Send, Shield, Smartphone, Users } from "lucide-react";
import { NOTIFICATION_CATALOG, NOTIFICATION_AUDIENCE_LABELS, type NotificationCatalogItem, type NotificationAudience } from "@shared/notification-catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Filter = "all" | NotificationAudience;
type PreviewMode = "lock" | "banner";

function PhonePreview({ item, mode }: { item: NotificationCatalogItem; mode: PreviewMode }) {
  return (
    <div className="mx-auto w-full max-w-[316px] rounded-[2.8rem] border-[8px] border-zinc-900 bg-zinc-950 p-2 shadow-2xl shadow-black/30">
      <div className="relative min-h-[580px] overflow-hidden rounded-[2.2rem] bg-gradient-to-b from-[#20222b] via-[#11131a] to-[#050506] text-white">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-7 pt-3 text-[10px] font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-3 rounded-sm border border-zinc-300" />
            <span className="h-2 w-3 rounded-sm border border-zinc-300" />
            <span className="h-2 w-4 rounded-sm border border-zinc-300" />
          </div>
        </div>
        <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-x-0 top-24 text-center">
          <p className="text-6xl font-light tracking-tight">9:41</p>
          <p className="mt-1 text-sm text-zinc-400">Tuesday, September 15</p>
        </div>
        <div className={`absolute inset-x-4 ${mode === "banner" ? "top-5" : "top-56"} rounded-2xl border border-white/10 bg-white/90 p-3 text-zinc-900 shadow-xl backdrop-blur-xl`}>
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff671d] text-sm font-black text-white shadow-sm">P1</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-bold">PLAYR1</p>
                <span className="shrink-0 text-[10px] text-zinc-500">now</span>
              </div>
              <p className="mt-0.5 text-[13px] font-bold leading-tight">{item.title}</p>
              <p className="mt-1 text-[12px] leading-snug text-zinc-600">{item.body}</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-6 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          {mode === "banner" ? "Incoming banner" : "Lock screen preview"}
        </div>
      </div>
    </div>
  );
}

function AudienceBadge({ audience }: { audience: NotificationAudience }) {
  return (
    <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
      {audience === "admin" ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
      {NOTIFICATION_AUDIENCE_LABELS[audience]}
    </Badge>
  );
}

export default function NotificationLabPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(NOTIFICATION_CATALOG[0].id);
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<PreviewMode>("lock");
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const visibleItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return NOTIFICATION_CATALOG.filter((item) => {
      const matchesFilter = filter === "all" || item.audience === filter;
      const matchesSearch = !normalized || `${item.label} ${item.title} ${item.body} ${item.category}`.toLowerCase().includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const selected = NOTIFICATION_CATALOG.find((item) => item.id === selectedId) ?? NOTIFICATION_CATALOG[0];

  const sendTest = async (item: NotificationCatalogItem) => {
    setSendingId(item.id);
    try {
      const response = await apiRequest("POST", "/api/notifications/test", { notificationId: item.id });
      const data = await response.json() as { result: string };
      const message = data.result === "sent"
        ? "Sent to your subscribed browser."
        : data.result === "no_subscription"
          ? "No browser subscription found. Enable push in Settings first."
          : data.result === "not_configured"
            ? "Web push is not configured in this environment."
            : data.result;
      setResults((current) => ({ ...current, [item.id]: message }));
      toast({ title: data.result === "sent" ? "Test notification sent" : "Test notification not sent", description: message, variant: data.result === "sent" ? "default" : "destructive" });
    } catch (error: any) {
      const message = error?.message || "Only an admin can send notification tests.";
      setResults((current) => ({ ...current, [item.id]: message }));
      toast({ title: "Test failed", description: message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" className="mb-3 gap-1.5 px-0" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-4 w-4" /> Back to Admin
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notification Lab</h1>
                <p className="text-sm text-muted-foreground">Preview every push notification and send a real test to your device.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span>{NOTIFICATION_CATALOG.length} notification types</span>
          </div>
        </div>

        <Card className="border-orange-500/20 bg-orange-500/[0.04]">
          <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p className="text-muted-foreground">
                To test a real push, open this page in the same browser where you enabled notifications in Settings. The test respects your browser subscription, but deliberately bypasses category preferences so every template can be tested.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setLocation("/settings")}>
              Open Settings <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="order-2 lg:order-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Phone preview</CardTitle>
              <CardDescription>Tap a notification on the right to update this device view.</CardDescription>
              <div className="mt-3 flex rounded-lg bg-muted p-1">
                <Button variant={mode === "lock" ? "secondary" : "ghost"} size="sm" className="h-8 flex-1 text-xs" onClick={() => setMode("lock")}>Lock screen</Button>
                <Button variant={mode === "banner" ? "secondary" : "ghost"} size="sm" className="h-8 flex-1 text-xs" onClick={() => setMode("banner")}>Banner</Button>
              </div>
            </CardHeader>
            <CardContent>
              <PhonePreview item={selected} mode={mode} />
              <div className="mt-4 rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <AudienceBadge audience={selected.audience} />
                  <span className="text-[10px] font-mono text-muted-foreground">{selected.category}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{selected.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selected.trigger}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 lg:order-2">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Notification catalog</CardTitle>
                  <CardDescription>Review the copy, audience, trigger, and real delivery for every type.</CardDescription>
                </div>
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications" className="h-9 pl-9 text-xs" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {(["all", "player", "admin"] as Filter[]).map((value) => (
                  <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} className="h-8 text-xs capitalize" onClick={() => setFilter(value)}>
                    {value === "all" ? "All" : `${value}s`}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleItems.map((item) => {
                const isSelected = item.id === selected.id;
                return (
                  <div key={item.id} className={`rounded-xl border p-3 transition ${isSelected ? "border-orange-500/60 bg-orange-500/[0.05]" : "hover:border-muted-foreground/40"}`}>
                    <button className="w-full text-left" onClick={() => setSelectedId(item.id)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <AudienceBadge audience={item.audience} />
                        <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                        <span className="ml-auto text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                    </button>
                    <Separator className="my-3" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">{item.trigger}</p>
                      <Button size="sm" variant={isSelected ? "default" : "outline"} className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => sendTest(item)} disabled={sendingId !== null}>
                        {results[item.id] === "Sent to your subscribed browser." ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                        {sendingId === item.id ? "Sending…" : "Send test to me"}
                      </Button>
                    </div>
                    {results[item.id] && <p className="mt-2 text-xs text-muted-foreground">{results[item.id]}</p>}
                  </div>
                );
              })}
              {visibleItems.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No notification types match this filter.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}