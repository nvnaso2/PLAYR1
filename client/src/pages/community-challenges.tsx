import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Swords, Plus, X, Check, Clock, RefreshCw, Bell, Search,
} from "lucide-react";
import {
  GROUP_CHALLENGE_GOAL_TYPES,
  GROUP_CHALLENGE_GOAL_LABELS,
  SHOT_LOCATIONS,
  LOCATION_CLASSIFICATIONS,
} from "@shared/schema";

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function shotLocationLabel(loc: string) {
  return loc.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const SHOT_TYPE_OPTIONS = [
  { value: "_all", label: "All shot types" },
  { value: "3-pointer", label: "3-Pointers" },
  { value: "2-pointer", label: "2-Pointers" },
  { value: "free-throw", label: "Free Throws" },
];

const SHOT_LOCATION_OPTIONS = SHOT_LOCATIONS.map(loc => ({
  value: loc,
  label: shotLocationLabel(loc),
  classification: LOCATION_CLASSIFICATIONS[loc],
}));

export default function CommunityChallengePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", goalType: "", goalAmount: "", durationDays: "30",
    shotFilter: "", locationFilter: "", useLocation: false, inviteSearch: "",
  });
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [inviteNames, setInviteNames] = useState<Record<string, string>>({});

  const { data: challenges = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/group-challenges"],
    enabled: !!user,
  });
  const { data: invites = [] } = useQuery<any[]>({
    queryKey: ["/api/group-challenges/invites"],
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/group-challenges", data),
    onSuccess: () => {
      toast({ title: "Challenge created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Failed to create challenge", variant: "destructive" }),
  });

  const respondInvite = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: "accepted" | "declined" }) =>
      apiRequest("PATCH", `/api/group-challenges/members/${memberId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-challenges/invites"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/group-challenges/${id}/sync`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/group-challenges"] }),
  });

  function resetForm() {
    setForm({ name: "", goalType: "", goalAmount: "", durationDays: "30", shotFilter: "", locationFilter: "", useLocation: false, inviteSearch: "" });
    setInviteIds([]); setInviteNames({}); setInviteResults([]);
  }

  async function searchInvites(q: string) {
    setForm(f => ({ ...f, inviteSearch: q }));
    if (q.length < 2) { setInviteResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=8`);
    setInviteResults(await res.json() || []);
  }

  function toggleInvite(u: any) {
    const name = u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim();
    setInviteIds(ids => ids.includes(u.userId) ? ids.filter(id => id !== u.userId) : [...ids, u.userId]);
    setInviteNames(n => ({ ...n, [u.userId]: name }));
  }

  function daysRemaining(endsAt: string) {
    return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000));
  }

  const isShotType = form.goalType === "shots_made" || form.goalType === "shot_attempts";

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/community")} className="text-zinc-400 hover:text-white transition-colors" data-testid="button-back-community">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Group Challenges</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Compete with friends on shared goals</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Invites</p>
            {invites.map((inv: any) => (
              <Card key={inv.id} className="border-orange-500/20 bg-orange-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Bell className="w-5 h-5 text-orange-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{inv.challenge?.name}</p>
                    <p className="text-xs text-zinc-500">
                      from {inv.challenge?.creator?.displayName} · {GROUP_CHALLENGE_GOAL_LABELS[inv.challenge?.goalType as keyof typeof GROUP_CHALLENGE_GOAL_LABELS] ?? inv.challenge?.goalType} · goal: {inv.challenge?.goalAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600"
                      onClick={() => respondInvite.mutate({ memberId: inv.id, status: "accepted" })}
                      data-testid={`button-accept-challenge-${inv.id}`}>Join</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700"
                      onClick={() => respondInvite.mutate({ memberId: inv.id, status: "declined" })}
                      data-testid={`button-decline-challenge-${inv.id}`}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create button */}
        <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-create-group-challenge">
              <Plus className="w-4 h-4 mr-2" />Create Group Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>New Group Challenge</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs text-zinc-400">Challenge Name</Label>
                <Input placeholder="e.g. Summer Shooting Challenge" className="mt-1 bg-zinc-900 border-zinc-800"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  data-testid="input-challenge-name" />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Goal Type</Label>
                <Select value={form.goalType} onValueChange={v => setForm(f => ({ ...f, goalType: v, shotFilter: "", locationFilter: "", useLocation: false }))}>
                  <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800" data-testid="select-goal-type">
                    <SelectValue placeholder="Select a goal type…" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {GROUP_CHALLENGE_GOAL_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{GROUP_CHALLENGE_GOAL_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shot filter */}
              {isShotType && (
                <div className="space-y-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs text-zinc-400 font-medium">Shot Filter (optional)</p>
                  <div className="flex gap-2">
                    <button onClick={() => setForm(f => ({ ...f, useLocation: false, locationFilter: "" }))}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border ${!form.useLocation ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                      By Type
                    </button>
                    <button onClick={() => setForm(f => ({ ...f, useLocation: true, shotFilter: "" }))}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border ${form.useLocation ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                      By Location
                    </button>
                  </div>
                  {!form.useLocation ? (
                    <Select value={form.shotFilter} onValueChange={v => setForm(f => ({ ...f, shotFilter: v }))}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800">
                        <SelectValue placeholder="All shot types" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {SHOT_TYPE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={form.locationFilter} onValueChange={v => setForm(f => ({ ...f, locationFilter: v }))}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800">
                        <SelectValue placeholder="Any location" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 max-h-48">
                        <SelectItem value="_any">Any location</SelectItem>
                        {SHOT_LOCATION_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label} <span className="text-zinc-500 text-[10px]">({o.classification})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">
                    Goal Amount{form.goalType === "workout_minutes" ? " (min)" : form.goalType === "streak_days" ? " (days)" : form.goalType === "training_sessions" ? " (sessions)" : ""}
                  </Label>
                  <Input type="number" className="mt-1 bg-zinc-900 border-zinc-800"
                    placeholder={form.goalType === "workout_minutes" ? "300" : form.goalType === "streak_days" ? "30" : form.goalType === "training_sessions" ? "20" : "500"}
                    value={form.goalAmount} onChange={e => setForm(f => ({ ...f, goalAmount: e.target.value }))}
                    data-testid="input-goal-amount" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Duration (days)</Label>
                  <Input type="number" placeholder="30" className="mt-1 bg-zinc-900 border-zinc-800"
                    value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                    data-testid="input-duration-days" />
                </div>
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Invite Players</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <Input placeholder="Search players…" className="pl-8 bg-zinc-900 border-zinc-800"
                    value={form.inviteSearch} onChange={e => searchInvites(e.target.value)} />
                </div>
                {inviteResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                    {inviteResults.map((u: any) => {
                      const name = u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim();
                      const selected = inviteIds.includes(u.userId);
                      return (
                        <button key={u.userId} onClick={() => toggleInvite(u)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${selected ? "bg-orange-500/10 border border-orange-500/30" : "bg-zinc-900/60 hover:bg-zinc-800/60"}`}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={getObjectUrl(u.profilePhotoUrl) ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-zinc-800">{initials(name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-white flex-1">{name}</span>
                          {selected && <Check className="w-3.5 h-3.5 text-orange-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {inviteIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {inviteIds.map(id => (
                      <Badge key={id} variant="outline" className="text-xs border-orange-500/30 text-orange-400 gap-1">
                        {inviteNames[id]}
                        <button onClick={() => setInviteIds(ids => ids.filter(i => i !== id))}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={!form.name || !form.goalType || !form.goalAmount || createMutation.isPending}
                onClick={() => {
                  const sf = isShotType
                    ? (form.useLocation ? (form.locationFilter === "_any" ? "" : form.locationFilter) : (form.shotFilter === "_all" ? "" : form.shotFilter))
                    : "";
                  createMutation.mutate({ name: form.name, goalType: form.goalType, goalAmount: Number(form.goalAmount), durationDays: Number(form.durationDays), shotFilter: sf || null, inviteIds });
                }}
                data-testid="button-submit-create-challenge">
                {createMutation.isPending ? "Creating…" : "Create Challenge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Challenge list */}
        {isLoading ? (
          [0,1,2].map(i => <Skeleton key={i} className="h-40 rounded-xl bg-zinc-900" />)
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <Swords className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No active challenges</p>
            <p className="text-zinc-600 text-xs mt-1">Create a challenge and invite your friends</p>
          </div>
        ) : (
          challenges.map((c: any) => {
            const days = daysRemaining(c.endsAt);
            const sortedMembers = [...(c.members || [])].sort((a: any, b: any) => b.progress - a.progress);
            const goalLabel = GROUP_CHALLENGE_GOAL_LABELS[c.goalType as keyof typeof GROUP_CHALLENGE_GOAL_LABELS] ?? c.goalType;
            const shotLabel = c.shotFilter ? ` · ${shotLocationLabel(c.shotFilter)}` : "";
            return (
              <Card key={c.id} className="border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-500/20" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{c.name}</h3>
                      <p className="text-xs text-zinc-500">{goalLabel}{shotLabel} · Goal: {c.goalAmount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${days <= 3 ? "border-red-500/40 text-red-400" : "border-zinc-700 text-zinc-400"}`}>
                        <Clock className="w-2.5 h-2.5 mr-1" />{days}d left
                      </Badge>
                      <button onClick={() => syncMutation.mutate(c.id)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        data-testid={`button-sync-challenge-${c.id}`}>
                        <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.variables === c.id && syncMutation.isPending ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {sortedMembers.map((m: any, i: number) => {
                      const pct = c.goalAmount > 0 ? Math.min(100, Math.round((m.progress / c.goalAmount) * 100)) : 0;
                      return (
                        <div key={m.id} className="space-y-1" data-testid={`member-row-${m.userId}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-600 w-4 text-right shrink-0">{i + 1}</span>
                            <Avatar className="w-6 h-6 shrink-0">
                              <AvatarImage src={getObjectUrl(m.user?.profilePhotoUrl) ?? undefined} />
                              <AvatarFallback className="text-[9px] bg-zinc-800">{initials(m.user?.displayName || "P")}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white flex-1 truncate">{m.user?.displayName}</span>
                            <span className="text-sm font-bold text-orange-400">{m.progress.toLocaleString()}</span>
                            <span className="text-[10px] text-zinc-600 shrink-0">/ {c.goalAmount.toLocaleString()}</span>
                          </div>
                          <div className="ml-10">
                            <Progress value={pct} className="h-1 bg-zinc-800" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
