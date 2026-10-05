import { useState } from "react";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Dumbbell,
  ListChecks,
  LockKeyhole,
  Play,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

type CustomRequest = {
  id: string;
  status: "submitted" | "in_progress" | "assigned" | "completed" | "declined";
  improvementFocus: string;
  desiredOutcome: string;
  availableTime: number;
  equipmentConstraints: string;
  additionalNotes?: string | null;
  createdAt: string;
  declineReason?: string | null;
  assignment?: { workoutId: string; notes?: string | null; status: string } | null;
  workout?: { workout?: { name: string; description?: string | null } } | null;
};

type DirectAssignment = {
  id: string;
  workoutId: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  workout?: { workout?: { name: string; description?: string | null; estimatedDuration?: number | null } } | null;
};

type PageView = "menu" | "request" | "workouts";

const statusLabel: Record<CustomRequest["status"], string> = {
  submitted: "Submitted",
  in_progress: "In progress",
  assigned: "Ready to train",
  completed: "Completed",
  declined: "Declined",
};

const statusStyles: Record<CustomRequest["status"], string> = {
  submitted: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  in_progress: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  assigned: "border-orange-400/30 bg-orange-400/15 text-orange-200",
  completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  declined: "border-red-400/25 bg-red-400/10 text-red-200",
};

const statusIcon: Record<CustomRequest["status"], typeof Clock3> = {
  submitted: Send,
  in_progress: Clock3,
  assigned: Play,
  completed: CheckCircle2,
  declined: XCircle,
};

export default function CustomWorkoutsPage() {
  const [, navigate] = useLocation();
  const { openProOffer } = useProUpgrade();
  const { toast } = useToast();
  const [view, setView] = useState<PageView>("menu");
  const [form, setForm] = useState({
    improvementFocus: "",
    desiredOutcome: "",
    availableTime: "45",
    equipmentConstraints: "",
    additionalNotes: "",
  });
  const { data, isLoading } = useQuery<{ eligible: boolean; requests: CustomRequest[]; assignments?: DirectAssignment[] }>({
    queryKey: ["/api/custom-workout-requests"],
    refetchInterval: 30000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const createRequest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/custom-workout-requests", {
        ...form,
        availableTime: Number(form.availableTime),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-workout-requests"] });
      setForm({ improvementFocus: "", desiredOutcome: "", availableTime: "45", equipmentConstraints: "", additionalNotes: "" });
      setView("workouts");
      toast({ title: "Request sent", description: "We’ll turn your focus into one clear training session." });
    },
    onError: (error: Error) => toast({ title: "Could not send request", description: error.message, variant: "destructive" }),
  });

  const requests = data?.requests || [];
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const canSubmit =
    form.improvementFocus.trim().length >= 3 &&
    form.desiredOutcome.trim().length >= 3 &&
    form.equipmentConstraints.trim().length > 0 &&
    Number(form.availableTime) >= 5;
  const hasActive = requests.some((request) => ["submitted", "in_progress", "assigned"].includes(request.status));

  return (
    <div className="min-h-screen bg-[#070707] px-4 pb-16 pt-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 text-orange-300"><Dumbbell className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">PLAYR1 / Training</p><p className="text-sm font-semibold text-zinc-200">Custom workouts</p></div>
          </div>
          <Button variant="ghost" className="text-zinc-400 hover:bg-white/5 hover:text-white" onClick={() => navigate("/hub")}>Back to Hub <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </header>

        <section className="relative overflow-hidden rounded-[28px] border border-orange-400/20 bg-[radial-gradient(circle_at_85%_15%,rgba(249,115,22,0.28),transparent_38%),linear-gradient(135deg,#1c120d_0%,#0d0d0d_55%,#090909_100%)] p-6 shadow-2xl shadow-orange-950/20 sm:p-9">
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-200"><Sparkles className="h-3.5 w-3.5" /> Built around your game</div>
            <h1 className="font-heading text-3xl uppercase tracking-wide text-white sm:text-5xl">Custom work.<br /><span className="text-orange-300">Your next edge.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">Choose whether you want to ask for a new session or jump into workouts already built for you.</p>
          </div>
        </section>

        {isLoading ? (
          <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-6 text-sm text-zinc-400">Loading your custom workouts...</CardContent></Card>
        ) : view === "menu" ? (
          <section className="grid gap-4 sm:grid-cols-2">
            <ChoiceButton icon={<Send className="h-5 w-5" />} eyebrow="Have a focus in mind?" title="Make a request" description="Tell a PLAYR1 coach what you want to improve and get a human-built session." onClick={() => setView("request")} />
            <ChoiceButton icon={<ListChecks className="h-5 w-5" />} eyebrow="Your sessions" title="Workouts from your requests" description="Open requests, assigned sessions, and completed custom workouts in one place." onClick={() => setView("workouts")} />
          </section>
        ) : view === "request" ? (
          <RequestView
            eligible={Boolean(data?.eligible)}
            hasActive={hasActive}
            form={form}
            canSubmit={canSubmit}
            isPending={createRequest.isPending}
            onBack={() => setView("menu")}
            onUpgrade={() => openProOffer("custom coaching")}
            onChange={update}
            onSubmit={() => createRequest.mutate()}
          />
        ) : (
          <WorkoutHistory requests={requests} assignments={data?.assignments || []} onBack={() => setView("menu")} onStart={(workoutId) => navigate(`/log?workoutId=${encodeURIComponent(workoutId)}`)} />
        )}
      </div>
    </div>
  );
}

function ChoiceButton({ icon, eyebrow, title, description, onClick }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group rounded-[26px] border border-white/10 bg-white/[0.035] p-6 text-left shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-orange-400/40 hover:bg-orange-400/[0.06]"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-black shadow-lg shadow-orange-950/30">{icon}</div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">{eyebrow}</p><h2 className="mt-2 text-2xl font-bold text-white">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{description}</p><span className="mt-7 inline-flex items-center text-sm font-bold text-orange-300">Open <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span></button>;
}

function RequestView({ eligible, hasActive, form, canSubmit, isPending, onBack, onUpgrade, onChange, onSubmit }: { eligible: boolean; hasActive: boolean; form: { improvementFocus: string; desiredOutcome: string; availableTime: string; equipmentConstraints: string; additionalNotes: string }; canSubmit: boolean; isPending: boolean; onBack: () => void; onUpgrade: () => void; onChange: (key: keyof typeof form, value: string) => void; onSubmit: () => void }) {
  return <section className="space-y-4"><BackButton onClick={onBack} label="Back to custom workouts" />{!eligible ? <Card className="border-orange-400/25 bg-orange-400/[0.06]"><CardHeader><div className="flex items-start gap-4"><div className="rounded-2xl bg-orange-400/15 p-3 text-orange-300"><LockKeyhole className="h-5 w-5" /></div><div><CardTitle className="text-xl text-white">Custom coaching is a Pro benefit</CardTitle><CardDescription className="mt-1 max-w-xl leading-6 text-zinc-400">Upgrade to send a request and get a human-built session shaped around your game.</CardDescription></div></div></CardHeader><CardContent><Button onClick={onUpgrade} className="bg-orange-500 font-bold text-black hover:bg-orange-400">See Pro options <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card> : <Card className="overflow-hidden border-white/10 bg-white/[0.035] shadow-xl shadow-black/20"><CardHeader className="border-b border-white/10 bg-white/[0.025] px-5 py-5 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Make a request</p><CardTitle className="mt-1 text-2xl text-white">What should we build?</CardTitle><CardDescription className="mt-1 text-zinc-400">{hasActive ? "Your current request is in the queue. You can send another after it is completed or declined." : "Keep it specific. The clearer the ask, the better the session."}</CardDescription></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7"><Field label="What do you want to improve?" value={form.improvementFocus} onChange={(value) => onChange("improvementFocus", value)} placeholder="Attacking closeouts and finishing" /><Field label="What would feel like a win?" value={form.desiredOutcome} onChange={(value) => onChange("desiredOutcome", value)} placeholder="Finish with either hand under pressure" /><div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Time you have</Label><div className="relative"><Input type="number" min={5} max={240} value={form.availableTime} onChange={(e) => onChange("availableTime", e.target.value)} className="h-11 border-white/10 bg-black/30 pr-16 text-white placeholder:text-zinc-600" /><span className="absolute right-3 top-3 text-xs text-zinc-500">minutes</span></div></div><Field label="Equipment or access" value={form.equipmentConstraints} onChange={(value) => onChange("equipmentConstraints", value)} placeholder="One hoop, no partner" /><div className="space-y-2 sm:col-span-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Anything else?</Label><Textarea value={form.additionalNotes} onChange={(e) => onChange("additionalNotes", e.target.value)} placeholder="Add context, limitations, or what has felt difficult." className="min-h-24 resize-none border-white/10 bg-black/30 text-white placeholder:text-zinc-600" /></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 sm:col-span-2"><p className="max-w-md text-xs leading-5 text-zinc-500">A coach will review your request and build one session from the PLAYR1 drill library.</p><Button disabled={!canSubmit || hasActive || isPending} onClick={onSubmit} className="bg-orange-500 px-5 font-bold text-black shadow-lg shadow-orange-950/30 hover:bg-orange-400"><Send className="mr-2 h-4 w-4" />{isPending ? "Sending..." : "Send request"}</Button></div></CardContent></Card>}</section>;
}

function WorkoutHistory({ requests, assignments, onBack, onStart }: { requests: CustomRequest[]; assignments: DirectAssignment[]; onBack: () => void; onStart: (workoutId: string) => void }) {
  const items: CustomRequest[] = [...requests, ...assignments.map((assignment) => ({
    id: `direct-${assignment.id}`,
    status: (assignment.status === "completed" ? "completed" : "assigned") as CustomRequest["status"],
    improvementFocus: "Direct PLAYR1 assignment",
    desiredOutcome: assignment.workout?.workout?.name || "Custom workout",
    availableTime: assignment.workout?.workout?.estimatedDuration || 0,
    equipmentConstraints: "PLAYR1 catalog",
    createdAt: assignment.createdAt,
    assignment,
    workout: assignment.workout,
  }))].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return <section className="space-y-4"><BackButton onClick={onBack} label="Back to custom workouts" /><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Your sessions</p><h2 className="mt-1 text-2xl font-bold text-white">Workouts from your requests</h2></div><span className="text-xs text-zinc-500">{items.length} workout{items.length === 1 ? "" : "s"}</span></div>{items.length === 0 ? <Card className="border-dashed border-white/15 bg-white/[0.02]"><CardContent className="flex flex-col items-center justify-center p-10 text-center"><ListChecks className="mb-3 h-7 w-7 text-zinc-600" /><p className="font-semibold text-zinc-300">No custom workouts yet</p><p className="mt-1 text-sm text-zinc-500">Make a request and your assigned sessions will show up here.</p></CardContent></Card> : <div className="grid gap-3">{items.map((request) => { const Icon = statusIcon[request.status]; return <Card key={request.id} className="border-white/10 bg-white/[0.03] transition-colors hover:border-white/20"><CardContent className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-white">{request.workout?.workout?.name || request.improvementFocus}</p><p className="mt-1 text-xs text-zinc-500">{new Date(request.createdAt).toLocaleDateString()} · {request.availableTime || "—"}{request.availableTime ? " minutes" : ""}</p></div><Badge className={`gap-1.5 border ${statusStyles[request.status]}`}><Icon className="h-3.5 w-3.5" />{statusLabel[request.status]}</Badge></div><p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">{request.workout?.workout?.description || request.desiredOutcome}</p>{request.declineReason && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200">{request.declineReason}</p>}{request.assignment && request.workout?.workout && <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-400/20 bg-orange-400/[0.07] p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Your session</p><p className="mt-1 font-semibold text-white">{request.workout.workout.name}</p></div>{request.status === "assigned" && <Button onClick={() => onStart(request.assignment!.workoutId)} className="bg-orange-500 font-bold text-black hover:bg-orange-400"><Play className="mr-2 h-4 w-4" />Start session</Button>}</div>}</CardContent></Card>; })}</div>}</section>;
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <Button variant="ghost" onClick={onClick} className="px-0 text-zinc-400 hover:bg-transparent hover:text-white"><ChevronLeft className="mr-1 h-4 w-4" />{label}</Button>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 border-white/10 bg-black/30 text-white placeholder:text-zinc-600" /></div>;
}