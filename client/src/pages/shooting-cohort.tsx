import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Activity, ArrowRight, ArrowUp, BadgeCheck, CalendarDays, Check, ChevronRight, CircleHelp,
  ClipboardList, Clock3, Dumbbell, Film, Loader2, LockKeyhole, MessageCircle, Send,
  ShieldCheck, Target, Trophy, Users, X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmojiPicker } from "@/components/emoji-picker";
import { ShootingCohortVideos } from "@/components/shooting-cohort-videos";
import { ShootingCohortPrivateChat } from "@/components/shooting-cohort-private-chat";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getObjectUrl } from "@/lib/queryClient";
import {
  getAssessmentTotals,
  SHOOTING_COHORT_FOCUS_AREAS,
  SHOOTING_COHORT_FOCUS_LABELS,
  type ShootingCohortApplicationAnswers,
  type ShootingCohortAssessmentInput,
} from "@shared/shooting-cohort";
import {
  useRespondToShootingCohortInvitation,
  useSendShootingCohortMessage,
  useShootingCohortAssessmentsQuery,
  useShootingCohortMessagesQuery,
  useShootingCohortQuery,
  useSubmitShootingCohortApplication,
  useSubmitShootingCohortAssessment,
  useUpdateShootingCohortApplication,
  type ShootingCohortAssessmentRecord,
} from "@/lib/shooting-cohort-api";

const practiceDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const spotLocations = [
  ["leftCorner", "Left corner"], ["leftWing", "Left wing"], ["top", "Top"],
  ["rightWing", "Right wing"], ["rightCorner", "Right corner"],
] as const;
const dribbleLocations = [["left", "Left"], ["center", "Center"], ["right", "Right"]] as const;

type ApplicationDraft = {
  practiceDays: ShootingCohortApplicationAnswers["practiceDays"];
  sessionMinutes: string;
  hoopAccess: ShootingCohortApplicationAnswers["hoopAccess"] | "";
  weeklyShots: string;
  focusAreas: ShootingCohortApplicationAnswers["focusAreas"];
  confidence: number | null;
  goal: string;
  currentRoutine: string;
};

const initialAnswers: ApplicationDraft = {
  practiceDays: [],
  sessionMinutes: "",
  hoopAccess: "",
  weeklyShots: "",
  focusAreas: [],
  confidence: null,
  goal: "",
  currentRoutine: "",
};

function toApplicationDraft(answers?: ShootingCohortApplicationAnswers): ApplicationDraft {
  if (!answers) return initialAnswers;
  return {
    practiceDays: [...answers.practiceDays],
    sessionMinutes: String(answers.sessionMinutes),
    hoopAccess: answers.hoopAccess,
    weeklyShots: String(answers.weeklyShots),
    focusAreas: [...answers.focusAreas],
    confidence: answers.confidence,
    goal: answers.goal,
    currentRoutine: answers.currentRoutine ?? "",
  };
}

const statusCopy: Record<string, { label: string; detail: string; tone: string }> = {
  needs_review: { label: "Under review", detail: "A PLAYR1 admin is reviewing your application. Your portal will update when its status changes.", tone: "border-orange-300/25 bg-orange-300/[0.08] text-orange-100" },
  waitlisted: { label: "On the waitlist", detail: "The Founder invites players in application order when a place opens. Your portal will update if you’re invited.", tone: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100" },
  invited: { label: "Your seat is held", detail: "An invitation is waiting for you. Accept to join, or decline to release your place.", tone: "border-orange-300/25 bg-orange-300/[0.08] text-orange-100" },
  withdrawn: { label: "Application withdrawn", detail: "This application is no longer active.", tone: "border-zinc-700 bg-zinc-900 text-zinc-300" },
  declined: { label: "Invitation declined", detail: "Your invitation was declined and the reserved seat released.", tone: "border-zinc-700 bg-zinc-900 text-zinc-300" },
  removed: { label: "Membership ended", detail: "This application is no longer active.", tone: "border-zinc-700 bg-zinc-900 text-zinc-300" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AssessmentCard({ assessment, index }: { assessment: ShootingCohortAssessmentRecord; index: number }) {
  const totals = getAssessmentTotals({
    freeThrowsMade: assessment.freeThrowsMade,
    spotUp: assessment.spotUpResults,
    offDribble: assessment.offDribbleResults,
  });
  return (
    <article className="rounded-2xl border border-[#41372d] bg-[#181511] p-4 sm:p-5" data-testid={`cohort-assessment-${assessment.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4a47a]">{assessment.type === "baseline" ? "Baseline" : `Retest ${index}`}</p>
          <p className="mt-1 text-sm text-[#9d9387]">{formatDate(assessment.createdAt)} <span className="px-1 text-[#5d554c]">/</span> {assessment.distanceFeet} ft</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl leading-none text-[#fff1de]">{totals.total.made}<span className="text-lg text-[#877b6e">/{totals.total.attempted}</span></p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#8f8274]">total makes</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-[#342c24] pt-4 sm:grid-cols-3">
        <ResultGroup title="Free throws" made={totals.freeThrows.made} attempted={totals.freeThrows.attempted} />
        <div>
          <ResultGroup title="Spot-up" made={totals.spotUp.made} attempted={totals.spotUp.attempted} />
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
            {spotLocations.map(([key, label]) => <ResultLine key={key} label={label} value={`${assessment.spotUpResults[key]}/5`} />)}
          </div>
        </div>
        <div>
          <ResultGroup title="Off the dribble" made={totals.offDribble.made} attempted={totals.offDribble.attempted} />
          <div className="mt-2 space-y-1">
            {dribbleLocations.map(([key, label]) => <ResultLine key={key} label={label} value={`${assessment.offDribbleResults[key]}/5`} />)}
          </div>
        </div>
      </div>
      {assessment.notes && <p className="mt-4 border-t border-[#342c24] pt-3 text-sm leading-6 text-[#b8ab9c]">{assessment.notes}</p>}
    </article>
  );
}

function ResultGroup({ title, made, attempted }: { title: string; made: number; attempted: number }) {
  return <div className="flex items-baseline justify-between gap-2"><span className="text-xs text-[#c9bba9]">{title}</span><span className="font-mono text-xs font-bold text-[#f0a05c]">{made}<span className="text-[#75695c]">/{attempted}</span></span></div>;
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2 text-[10px] text-[#877b6e]"><span>{label}</span><span className="font-mono text-[#b8ab9c]">{value}</span></div>;
}

function AssessmentForm({ type, pending, onCancel, onSubmit }: {
  type: "baseline" | "retest";
  pending: boolean;
  onCancel: () => void;
  onSubmit: (value: ShootingCohortAssessmentInput) => void;
}) {
  const [distanceFeet, setDistanceFeet] = useState("");
  const [freeThrowsMade, setFreeThrowsMade] = useState("");
  const [spotUp, setSpotUp] = useState<Record<string, string>>({});
  const [offDribble, setOffDribble] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const allEntered = freeThrowsMade !== "" &&
    spotLocations.every(([key]) => spotUp[key] !== undefined && spotUp[key] !== "") &&
    dribbleLocations.every(([key]) => offDribble[key] !== undefined && offDribble[key] !== "");
  const valid = allEntered &&
    Number.isInteger(Number(freeThrowsMade)) && Number(freeThrowsMade) >= 0 && Number(freeThrowsMade) <= 20 &&
    spotLocations.every(([key]) => Number.isInteger(Number(spotUp[key])) && Number(spotUp[key]) >= 0 && Number(spotUp[key]) <= 5) &&
    dribbleLocations.every(([key]) => Number.isInteger(Number(offDribble[key])) && Number(offDribble[key]) >= 0 && Number(offDribble[key]) <= 5) &&
    Number.isInteger(Number(distanceFeet)) && Number(distanceFeet) >= 3 && Number(distanceFeet) <= 40;
  const save = () => {
    if (!valid) return;
    onSubmit({
      type,
      distanceFeet: Number(distanceFeet),
      freeThrowsMade: Number(freeThrowsMade),
      spotUp: Object.fromEntries(spotLocations.map(([key]) => [key, Number(spotUp[key])])) as ShootingCohortAssessmentInput["spotUp"],
      offDribble: Object.fromEntries(dribbleLocations.map(([key]) => [key, Number(offDribble[key])])) as ShootingCohortAssessmentInput["offDribble"],
      notes: notes.trim(),
    });
  };
  const CountField = ({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (next: string) => void }) => (
    <label className="flex items-center justify-between gap-3 border-b border-[#342c24] py-2 last:border-0">
      <span className="text-sm text-[#c9bba9]">{label} <span className="font-mono text-[10px] text-[#74695d]">/{max}</span></span>
      <Input aria-label={`${label} makes`} type="number" min="0" max={max} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-[78px] border-[#493e32] bg-[#100e0b] text-center font-mono text-[#fff1de]" />
    </label>
  );
  return (
    <section className="rounded-[22px] border border-[#df7e39]/40 bg-[#211810] p-4 sm:p-6" aria-label={`${type} assessment form`}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e89a5a]">Shooting check-in</p><h3 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">{type === "baseline" ? "Set your baseline" : "Log a retest"}</h3></div>
        <button type="button" onClick={onCancel} aria-label="Close assessment form" className="rounded-full p-2 text-[#9c8d7b] transition hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a99b89]">Use five attempts at each marked spot, then 20 free throws. Results are visible only to you and PLAYR1 admins.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#3e3329] bg-[#17120e] p-4">
          <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d2c2ae]">Distance used</Label>
          <div className="mt-2 flex items-center gap-2"><Input aria-label="Distance in feet" type="number" min="3" max="40" value={distanceFeet} onChange={(event) => setDistanceFeet(event.target.value)} className="h-10 max-w-28 border-[#493e32] bg-[#100e0b] font-mono text-white" /><span className="text-xs text-[#837668]">feet</span></div>
          <div className="mt-5"><CountField label="Free throws" value={freeThrowsMade} max={20} onChange={setFreeThrowsMade} /></div>
        </div>
        <div className="rounded-xl border border-[#3e3329] bg-[#17120e] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d2c2ae]">Spot-up · 5 attempts each</p>
          <div className="mt-2">{spotLocations.map(([key, label]) => <CountField key={key} label={label} value={spotUp[key] ?? ""} max={5} onChange={(next) => setSpotUp((current) => ({ ...current, [key]: next }))} />)}</div>
        </div>
        <div className="rounded-xl border border-[#3e3329] bg-[#17120e] p-4 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d2c2ae]">Off the dribble · 5 attempts each</p>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-3">{dribbleLocations.map(([key, label]) => <CountField key={key} label={label} value={offDribble[key] ?? ""} max={5} onChange={(next) => setOffDribble((current) => ({ ...current, [key]: next }))} />)}</div>
        </div>
        <div className="space-y-2 sm:col-span-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d2c2ae]">Notes <span className="font-normal normal-case tracking-normal text-[#837668]">optional</span></Label><Textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What felt different today?" className="min-h-20 border-[#493e32] bg-[#100e0b] text-[#f3e6d5] placeholder:text-[#675d51]" /></div>
      </div>
      {!allEntered && <p className="mt-3 text-xs text-[#d4a47a]">Enter makes for every section to save all 60 attempts.</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={onCancel} className="text-[#a99b89] hover:text-white">Cancel</Button><Button onClick={save} disabled={!valid || pending} className="bg-[#ef8a43] font-bold text-[#1b120a] hover:bg-[#ff9e5b]">{pending ? "Saving assessment…" : "Save results"} <Check className="ml-2 h-4 w-4" /></Button></div>
    </section>
  );
}

function ApplicationForm({ onSubmit, pending, isOpen, initialAnswers, editing = false, onCancel }: {
  onSubmit: (answers: ShootingCohortApplicationAnswers) => void;
  pending: boolean;
  isOpen: boolean;
  initialAnswers?: ShootingCohortApplicationAnswers;
  editing?: boolean;
  onCancel?: () => void;
}) {
  const [answers, setAnswers] = useState<ApplicationDraft>(() => toApplicationDraft(initialAnswers));
  const toggleDay = (day: typeof practiceDays[number]) => setAnswers((current) => ({
    ...current,
    practiceDays: current.practiceDays.includes(day) ? current.practiceDays.filter((item) => item !== day) : [...current.practiceDays, day],
  }));
  const toggleFocus = (focus: typeof SHOOTING_COHORT_FOCUS_AREAS[number]) => setAnswers((current) => ({
    ...current,
    focusAreas: current.focusAreas.includes(focus)
      ? current.focusAreas.filter((item) => item !== focus)
      : current.focusAreas.length < 2 ? [...current.focusAreas, focus] : current.focusAreas,
  }));
  const canSubmit = answers.practiceDays.length > 0 &&
    answers.focusAreas.length > 0 &&
    answers.goal.trim().length >= 8 &&
    answers.sessionMinutes !== "" &&
    answers.hoopAccess !== "" &&
    answers.confidence !== null &&
    answers.weeklyShots !== "" &&
    Number.isInteger(Number(answers.weeklyShots)) &&
    Number(answers.weeklyShots) >= 0 &&
    Number(answers.weeklyShots) <= 10000;
  return (
    <section className="overflow-hidden rounded-[26px] border border-[#493a2c] bg-[#17130f]">
      <div className="border-b border-[#382e24] px-5 py-5 sm:px-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#df965c]">{editing ? "Your cohort profile" : "Player interest survey · 3 minutes"}</p>
        <h2 className="mt-2 font-heading text-3xl uppercase leading-none text-[#fff1de]">{editing ? "Update how you train." : "Tell us how you train."}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a99b89]">{editing ? "Keep your practice details, goals, and focus areas current. Saving changes will not alter your cohort status." : "This helps the founder coach your shot, not sort players by a number. Every player can apply."}</p>
      </div>
      <div className="grid gap-x-7 gap-y-6 p-5 sm:grid-cols-2 sm:p-7">
        <fieldset className="space-y-3 sm:col-span-2">
          <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">When do you usually practice?</legend>
          <div className="flex flex-wrap gap-2">{practiceDays.map((day) => <button key={day} type="button" aria-pressed={answers.practiceDays.includes(day)} onClick={() => toggleDay(day)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${answers.practiceDays.includes(day) ? "border-[#ef8a43] bg-[#ef8a43] text-[#21150c]" : "border-[#473b30] bg-[#100e0b] text-[#b8ab9c] hover:border-[#ad7449]"}`}>{day.slice(0, 3)}</button>)}</div>
        </fieldset>
        <div className="space-y-2"><Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">Typical session length</Label><select value={answers.sessionMinutes} onChange={(event) => setAnswers({ ...answers, sessionMinutes: event.target.value })} className="h-11 w-full rounded-md border border-[#493e32] bg-[#100e0b] px-3 text-sm text-[#f3e6d5] focus:outline-none focus:ring-2 focus:ring-[#ef8a43]"><option value="" disabled>Choose a length</option>{[20, 30, 45, 60, 75, 90, 120].map((minute) => <option key={minute} value={minute}>{minute} minutes</option>)}</select></div>
        <div className="space-y-2"><Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">Hoop access</Label><select value={answers.hoopAccess} onChange={(event) => setAnswers({ ...answers, hoopAccess: event.target.value as ApplicationDraft["hoopAccess"] })} className="h-11 w-full rounded-md border border-[#493e32] bg-[#100e0b] px-3 text-sm text-[#f3e6d5] focus:outline-none focus:ring-2 focus:ring-[#ef8a43]"><option value="" disabled>Choose access</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="both">Both</option><option value="limited">Limited / shared access</option></select></div>
        <div className="space-y-2"><Label htmlFor="weekly-shots" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">Approx. shots per week</Label><Input id="weekly-shots" type="number" min="0" max="10000" value={answers.weeklyShots} onChange={(event) => setAnswers({ ...answers, weeklyShots: event.target.value })} className="h-11 border-[#493e32] bg-[#100e0b] text-[#f3e6d5]" /></div>
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">What do you want to work on? <span className="normal-case tracking-normal text-[#817567]">choose 1 or 2</span></legend>
          <div className="grid gap-2">{SHOOTING_COHORT_FOCUS_AREAS.map((focus) => <button key={focus} type="button" aria-pressed={answers.focusAreas.includes(focus)} onClick={() => toggleFocus(focus)} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition ${answers.focusAreas.includes(focus) ? "border-[#b86c35]/70 bg-[#b86c35]/10 text-[#f4b27c]" : "border-[#3c332a] bg-[#100e0b] text-[#b8ab9c] hover:border-[#70533d]"}`}>{SHOOTING_COHORT_FOCUS_LABELS[focus]}{answers.focusAreas.includes(focus) && <Check className="h-3.5 w-3.5" />}</button>)}</div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">How confident are you in your shot today?</legend>
          <div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Confidence ${value} out of 5`} aria-pressed={answers.confidence === value} onClick={() => setAnswers({ ...answers, confidence: value })} className={`flex h-11 flex-1 items-center justify-center rounded-lg border font-mono text-sm transition ${answers.confidence === value ? "border-[#ef8a43] bg-[#ef8a43] font-bold text-[#21150c]" : "border-[#473b30] bg-[#100e0b] text-[#b8ab9c] hover:border-[#ad7449]"}`}>{value}</button>)}</div>
          <p className="text-[10px] text-[#817567]">1 · still finding it <span className="float-right">5 · ready to let it fly</span></p>
        </fieldset>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="cohort-goal" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">What’s one shooting goal you care about?</Label><Textarea id="cohort-goal" maxLength={1000} value={answers.goal} onChange={(event) => setAnswers({ ...answers, goal: event.target.value })} placeholder="Be specific about what you want to change in your game." className="min-h-24 border-[#493e32] bg-[#100e0b] text-[#f3e6d5] placeholder:text-[#675d51]" /><p className="text-right font-mono text-[10px] text-[#74695d]">{answers.goal.length}/1000</p></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="routine" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d2c2ae]">What does your current routine look like? <span className="normal-case tracking-normal text-[#817567]">optional</span></Label><Textarea id="routine" maxLength={1000} value={answers.currentRoutine ?? ""} onChange={(event) => setAnswers({ ...answers, currentRoutine: event.target.value })} placeholder="Any details about drills, feedback, or what you have tried." className="min-h-20 border-[#493e32] bg-[#100e0b] text-[#f3e6d5] placeholder:text-[#675d51]" /></div>
        <div className="flex flex-col gap-3 border-t border-[#382e24] pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-5 text-[#8f8274]">{editing ? "Only the answers on this survey will change." : "Initial applications become active until capacity is full; remaining players join the waitlist in application order. No age or guardian check is required."}</p>
          <div className="flex flex-wrap justify-end gap-2">
          {onCancel && <Button variant="ghost" onClick={onCancel} className="text-[#a99b89] hover:text-white">Cancel</Button>}
          <Button onClick={() => {
            if (!canSubmit || answers.confidence === null || answers.hoopAccess === "") return;
            onSubmit({
              ...answers,
              sessionMinutes: Number(answers.sessionMinutes),
              hoopAccess: answers.hoopAccess,
              weeklyShots: Number(answers.weeklyShots),
              confidence: answers.confidence,
            });
          }} disabled={!canSubmit || (!editing && !isOpen) || pending} className="shrink-0 bg-[#ef8a43] px-5 font-bold text-[#21150c] hover:bg-[#ff9e5b]">{pending ? (editing ? "Saving changes…" : "Sending application…") : (editing ? "Save survey" : "Apply to the cohort")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberChat({
  isAdmin = false,
  activeChannel = "group",
  onChannelChange,
}: {
  isAdmin?: boolean;
  activeChannel?: "group" | "founder";
  onChannelChange?: (channel: "group" | "founder") => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const query = useShootingCohortMessagesQuery(isAdmin || activeChannel === "group");
  const sendMessage = useSendShootingCohortMessage();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const messages = query.data ?? [];
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  const send = async () => {
    const content = text.trim();
    if (!content || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync(content);
      setText("");
    } catch (error) {
      toast({ title: "Message not sent", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  };

  if (!isAdmin) {
    const latestGroupMessage = messages[messages.length - 1];
    return (
      <section className="rounded-3xl border border-zinc-800/90 bg-zinc-950/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-6" aria-label="Shooting Cohort messages">
        <header className="mb-5 border-b border-white/[0.06] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300/80">Stay close to the work</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Conversations</h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">The group room is shared with active cohort members. Your direct thread stays private between you and the Founder.</p>
            </div>
          </div>
        </header>

        <div className="grid overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-zinc-800 p-3 md:border-b-0 md:border-r" aria-label="Choose a conversation">
            <p className="px-3 pb-2 pt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Your conversations</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-1">
              <button
                type="button"
                aria-pressed={activeChannel === "group"}
                onClick={() => onChannelChange?.("group")}
                className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${activeChannel === "group" ? "border-orange-400/20 bg-orange-500/[0.07]" : "border-transparent hover:bg-white/[0.035]"}`}
                data-testid="shooting-cohort-group-channel"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activeChannel === "group" ? "bg-orange-500/15 text-orange-200" : "bg-zinc-800 text-zinc-400"}`}><Users className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-zinc-100">The shooting room</span>{activeChannel === "group" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />}</span>
                  <span className="mt-1 block text-[10px] text-zinc-500">Shared · active members</span>
                  <span className="mt-1.5 block truncate text-[10px] text-zinc-600">{latestGroupMessage ? `${latestGroupMessage.displayName}: ${latestGroupMessage.content}` : "Start a conversation with the cohort"}</span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={activeChannel === "founder"}
                onClick={() => onChannelChange?.("founder")}
                className={`mt-0 flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${activeChannel === "founder" ? "border-orange-400/20 bg-orange-500/[0.07]" : "border-transparent hover:bg-white/[0.035]"}`}
                data-testid="shooting-cohort-founder-channel"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-300/30 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 text-zinc-950 shadow-[0_4px_14px_rgba(249,115,22,0.2)]"><MessageCircle className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-zinc-100">Founder</span><LockKeyhole className="h-3 w-3 shrink-0 text-orange-300/70" /></span>
                  <span className="mt-1 block text-[10px] text-zinc-500">Direct · private 1:1</span>
                  <span className="mt-1.5 block truncate text-[10px] text-zinc-600">A private conversation with the Founder</span>
                </span>
              </button>
            </div>
            <div className="mx-2 mt-4 border-t border-zinc-800 pt-3"><p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.11em] text-zinc-600"><LockKeyhole className="h-3 w-3" />Member-only conversations</p></div>
          </aside>

          <div className="flex min-h-[480px] min-w-0 flex-col bg-zinc-950/35">
            {activeChannel === "founder" ? (
              <div className="flex min-h-[480px] flex-1 flex-col p-4 sm:p-5">
                <ShootingCohortPrivateChat />
              </div>
            ) : (
              <>
                <div className="flex min-h-[66px] items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-300/30 bg-orange-500/10 text-orange-300"><Users className="h-[17px] w-[17px]" /></span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-100">The shooting room</p><p className="mt-0.5 truncate text-[10px] text-zinc-500">Shared cohort conversation · active members only</p></div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/[0.05] px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-orange-200"><LockKeyhole className="h-3 w-3" />Member-only</span>
                </div>

                <div className="min-h-[260px] flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" data-testid="shooting-cohort-messages">
                  {query.isLoading ? (
                    <div className="space-y-4" aria-label="Loading cohort conversation">
                      <Skeleton className="h-14 w-3/4 rounded-2xl bg-zinc-900" />
                      <Skeleton className="ml-auto h-16 w-2/3 rounded-2xl bg-zinc-900" />
                      <Skeleton className="h-12 w-1/2 rounded-2xl bg-zinc-900" />
                    </div>
                  ) : query.isError ? (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                      <MessageCircle className="mb-3 h-7 w-7 text-orange-400/70" />
                      <p className="text-sm text-zinc-300">The group chat could not load.</p>
                      <Button variant="ghost" onClick={() => query.refetch()} className="mt-2 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200">Try again</Button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-400/20 bg-orange-500/[0.08] text-orange-300"><MessageCircle className="h-5 w-5" /></span>
                      <p className="mt-3 text-sm font-semibold text-zinc-200">Set the tone for the room.</p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">Share a win, a question, or something you’re working through.</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => {
                        const isMine = message.senderId === user?.id;
                        const displayName = message.displayName || "Cohort member";
                        return isMine ? (
                          <div key={message.id} className="group flex justify-end py-1" data-testid={`shooting-cohort-message-${message.id}`} title={new Date(message.createdAt).toLocaleString()}>
                            <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-gradient-to-br from-orange-400 to-orange-600 px-3.5 py-2.5 text-sm font-medium leading-[1.55] text-zinc-950 shadow-[0_8px_28px_rgba(249,115,22,0.18)]">
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <p className="mt-0.5 max-h-0 overflow-hidden text-[9px] font-normal leading-normal text-orange-950/60 opacity-0 transition-all group-hover:max-h-4 group-hover:opacity-100 group-focus-within:max-h-4 group-focus-within:opacity-100">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div key={message.id} className="group flex items-start gap-2.5 py-1" data-testid={`shooting-cohort-message-${message.id}`} title={new Date(message.createdAt).toLocaleString()}>
                            <Avatar className="mt-0.5 h-9 w-9 shrink-0 border border-orange-300/20">
                              {message.profilePhotoUrl && <AvatarImage src={getObjectUrl(message.profilePhotoUrl)} alt="" />}
                              <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-orange-200">{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 max-w-[88%] flex-1">
                              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/80">
                                <span className="truncate">{displayName}</span><span className="h-px w-8 bg-orange-400/30" />
                                <time className="shrink-0 font-normal tracking-normal text-zinc-600">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                              </div>
                              <p className="whitespace-pre-wrap break-words text-sm leading-[1.55] text-zinc-200">{message.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={endRef} />
                    </>
                  )}
                </div>

                <div className="border-t border-zinc-800/80 p-3 sm:p-4">
                  <div className="relative flex min-h-[58px] items-center gap-2 rounded-full border border-orange-400/20 bg-zinc-950/95 px-3 py-2 shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_30px_rgba(249,115,22,0.08)] transition-colors focus-within:border-orange-400/45 focus-within:shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_34px_rgba(249,115,22,0.16)]">
                    <EmojiPicker onEmojiSelect={(emoji) => setText((current) => current + emoji)} />
                    <Textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      maxLength={2000}
                      placeholder="Add to the group conversation…"
                      className="min-h-[40px] max-h-32 resize-none rounded-none border-0 bg-transparent px-2 py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                      disabled={sendMessage.isPending}
                      aria-label="Message to shooting cohort"
                      data-testid="shooting-cohort-message-input"
                    />
                    <Button
                      onClick={() => void send()}
                      disabled={!text.trim() || sendMessage.isPending}
                      size="icon"
                      aria-label="Send group message"
                      className="h-10 w-10 shrink-0 rounded-full bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.22)] hover:bg-orange-400"
                      data-testid="shooting-cohort-message-send"
                    >
                      {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="mt-2 text-center text-[10px] tracking-wide text-zinc-700">Enter to send · Shift + Enter for a new line</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#46382b] bg-[#17130f]">
      <div className="flex items-center justify-between gap-3 border-b border-[#382e24] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d77e3d]/30 bg-[#d77e3d]/10 text-[#f0a367]"><MessageCircle className="h-4 w-4" /></span><div><h2 className="font-heading text-xl uppercase leading-none text-[#fff1de]">The shooting room</h2><p className="mt-1 text-[11px] text-[#8f8274]">Shared conversation · member-only</p></div></div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Private group</span>
      </div>
      <div className="h-[310px] space-y-3 overflow-y-auto p-4 sm:h-[360px] sm:p-5">
        {query.isLoading ? <div className="space-y-3" aria-label="Loading cohort conversation"><Skeleton className="h-14 w-3/4 rounded-2xl bg-[#2a241e]" /><Skeleton className="ml-auto h-16 w-2/3 rounded-2xl bg-[#2a241e]" /><Skeleton className="h-12 w-1/2 rounded-2xl bg-[#2a241e]" /></div>
          : query.isError ? <div className="flex h-full flex-col items-center justify-center text-center"><MessageCircle className="mb-3 h-6 w-6 text-[#d78b52]" /><p className="text-sm text-[#ded0bd]">The room could not load.</p><Button variant="ghost" onClick={() => query.refetch()} className="mt-2 text-[#e79a5c]">Try again</Button></div>
            : messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4e3e2e] bg-[#211a13] text-[#d88a50]"><MessageCircle className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-[#e8dccb]">Set the tone for the room.</p><p className="mt-1 text-xs text-[#887c6e]">Share a win, a question, or something you’re working through.</p></div>
              : messages.map((message) => <article key={message.id} className="group max-w-[92%] rounded-2xl rounded-tl-sm border border-[#3c332a] bg-[#211c17] px-3.5 py-3 sm:max-w-[78%]"><div className="flex items-center justify-between gap-4"><p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#e9a16a]">{message.displayName}{isAdmin && <span className="ml-2 font-normal text-[#85796b]">· {message.senderId.slice(0, 6)}</span>}</p><time className="shrink-0 font-mono text-[9px] text-[#756b60]">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-[#e2d6c7]">{message.content}</p></article>)}
        <div ref={endRef} />
      </div>
      <div className="border-t border-[#382e24] p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-2xl border border-[#4b3b2b] bg-[#100e0b] p-2 focus-within:border-[#c9783e]/70">
          <Textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} maxLength={2000} placeholder="Add to the conversation…" className="min-h-10 max-h-28 resize-none border-0 bg-transparent text-sm text-[#f3e6d5] placeholder:text-[#6c6256] focus-visible:ring-0" aria-label="Message to shooting cohort" />
          <Button onClick={() => void send()} disabled={!text.trim() || sendMessage.isPending} size="icon" aria-label="Send message" className="h-9 w-9 shrink-0 rounded-xl bg-[#ef8a43] text-[#21150c] hover:bg-[#ff9e5b]"><Send className="h-4 w-4" /></Button>
        </div>
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-[#6e6357]">Enter to send · Shift + Enter for a new line</p>
      </div>
    </section>
  );
}

function AssessmentTrend({ assessments }: { assessments: ShootingCohortAssessmentRecord[] }) {
  const ordered = [...assessments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const points = ordered.map((assessment) => ({
    timestamp: new Date(assessment.createdAt).getTime(),
    makes: getAssessmentTotals({
      freeThrowsMade: assessment.freeThrowsMade,
      spotUp: assessment.spotUpResults,
      offDribble: assessment.offDribbleResults,
    }).total.made,
  }));
  const baseline = points[0];
  const latest = points[points.length - 1];
  const delta = baseline && latest ? latest.makes - baseline.makes : 0;

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#817567]">Latest makes</p>
          <p className="mt-1 font-heading text-2xl text-[#f4b27c]">{latest ? `${latest.makes}/60` : "—"}</p>
        </div>
        <div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#817567]">Since baseline</p>
          <p className="mt-1 font-heading text-2xl text-[#f4b27c]">{points.length > 1 ? `${delta > 0 ? "+" : ""}${delta}` : "—"}</p>
        </div>
        <div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#817567]">Tests logged</p>
          <p className="mt-1 font-heading text-2xl text-[#f4b27c]">{points.length}</p>
        </div>
      </div>
      {points.length > 1 ? (
        <div className="rounded-xl border border-[#3a3329] bg-[#100e0b] p-3" role="img" aria-label="Trend of total shooting makes across cohort assessments">
          <p className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#9d8f7e]"><Activity className="h-3.5 w-3.5 text-[#df965c]" />Total makes across your shooting checks</p>
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 2, left: -12 }}>
                <CartesianGrid stroke="#382e24" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  tick={{ fill: "#8f8274", fontSize: 10 }}
                  axisLine={{ stroke: "#493a2c" }}
                  tickLine={false}
                />
                <YAxis type="number" domain={[0, 60]} allowDecimals={false} tick={{ fill: "#8f8274", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  labelFormatter={(value) => new Date(Number(value)).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  formatter={(value) => [`${value} / 60`, "Makes"]}
                  contentStyle={{ background: "#17130f", border: "1px solid #493a2c", borderRadius: 12, color: "#fff1de", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="makes" name="Total makes" stroke="#ef8a43" strokeWidth={2.5} dot={{ r: 3, fill: "#ef8a43", stroke: "#100e0b", strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#514333] bg-[#100e0b] px-4 py-4">
          <Activity className="h-4 w-4 shrink-0 text-[#a77b56]" />
          <p className="text-xs leading-5 text-[#9d8f7e]">{points.length ? "Your baseline is saved. Log a retest to see how your makes change over time." : "Save your baseline to start a private shooting-progress trend."}</p>
        </div>
      )}
    </div>
  );
}

type CohortWorkoutRequest = {
  id: string;
  status: string;
  improvementFocus: string;
  desiredOutcome: string;
  availableTime: number;
  createdAt: string;
  workout?: { workout?: { name: string; description?: string | null } } | null;
};

type CohortDirectWorkoutAssignment = {
  id: string;
  status: string;
  createdAt: string;
  workout?: { workout?: { name: string; description?: string | null; estimatedDuration?: number | null } } | null;
};

type AssignedCohortDrill = {
  id: string;
  status: string;
  dueDate?: string | null;
  notes?: string | null;
  drill?: { title: string; description?: string | null };
};

function useCohortWorkoutRequestsQuery() {
  return useQuery<{
    eligible: boolean;
    requests: CohortWorkoutRequest[];
    assignments?: CohortDirectWorkoutAssignment[];
  }>({
    queryKey: ["/api/custom-workout-requests"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

function useAssignedCohortDrillsQuery() {
  return useQuery<AssignedCohortDrill[]>({
    queryKey: ["/api/assigned-drills"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

function CohortRequestsSection() {
  const [, navigate] = useLocation();
  const workoutsQuery = useCohortWorkoutRequestsQuery();
  const requests = workoutsQuery.data?.requests ?? [];

  return (
    <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5" aria-label="Cohort workout requests">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bf753f]/25 bg-[#bf753f]/10 text-[#e79960]"><ClipboardList className="h-4 w-4" /></span>
          <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Your training</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">Workout requests</h2></div>
        </div>
        <Button onClick={() => navigate("/custom-workouts")} className="bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]">Request a workout <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>

      {workoutsQuery.isLoading
        ? <p className="mt-4 rounded-xl border border-[#3e3329] bg-[#100e0b] p-4 text-xs text-[#887c6e]">Loading your workout requests…</p>
        : workoutsQuery.isError
          ? <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[0.05] p-4 text-xs text-red-200"><p>Workout requests could not load.</p><Button variant="ghost" onClick={() => workoutsQuery.refetch()} className="mt-1 h-auto px-0 text-red-200">Retry</Button></div>
          : requests.length === 0
            ? <p className="mt-4 rounded-xl border border-dashed border-[#514333] bg-[#100e0b] p-5 text-center text-xs leading-5 text-[#817567]">No requests yet. Tell the founder what you want to work on and get a custom session built for you.</p>
            : <div className="mt-4 space-y-2">
              {requests.map((request) => (
                <article key={request.id} className="rounded-xl border border-[#3e3329] bg-[#100e0b] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm text-[#e7dac8]">{request.improvementFocus}</h3>
                    <span className="rounded-full border border-[#68482e] bg-[#21180f] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#e8a16a]">{request.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#8f8274]">{request.desiredOutcome}</p>
                  {request.workout?.workout?.name && <p className="mt-2 border-t border-[#342c24] pt-2 text-xs text-[#e8a16a]">Workout assigned: {request.workout.workout.name}</p>}
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#756b60]">Requested {new Date(request.createdAt).toLocaleDateString()}</p>
                </article>
              ))}
            </div>}
    </section>
  );
}

function CohortWorkoutsSection() {
  const workoutsQuery = useCohortWorkoutRequestsQuery();
  const drillsQuery = useAssignedCohortDrillsQuery();
  const assignedWorkouts = [
    ...(workoutsQuery.data?.requests ?? [])
      .filter((request) => request.workout?.workout)
      .map((request) => ({
        id: `request-${request.id}`,
        name: request.workout?.workout?.name || request.improvementFocus,
        detail: request.workout?.workout?.description || request.desiredOutcome,
        status: request.status,
        createdAt: request.createdAt,
      })),
    ...(workoutsQuery.data?.assignments ?? []).map((assignment) => ({
      id: `direct-${assignment.id}`,
      name: assignment.workout?.workout?.name || "Assigned workout",
      detail: assignment.workout?.workout?.description || "Built for your training plan.",
      status: assignment.status,
      createdAt: assignment.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5" aria-label="Assigned workouts">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bf753f]/25 bg-[#bf753f]/10 text-[#e79960]"><Dumbbell className="h-4 w-4" /></span>
          <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Your training</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">Assigned workouts</h2></div>
        </div>
        {workoutsQuery.isLoading
          ? <p className="text-xs text-[#887c6e]">Loading your workouts…</p>
          : workoutsQuery.isError
            ? <div className="text-xs text-red-200"><p>Assigned workouts could not load.</p><Button variant="ghost" onClick={() => workoutsQuery.refetch()} className="mt-1 h-auto px-0 text-red-200">Retry</Button></div>
            : assignedWorkouts.length === 0
              ? <p className="rounded-xl border border-dashed border-[#514333] bg-[#100e0b] p-4 text-xs leading-5 text-[#817567]">Workouts assigned by the founder will appear here.</p>
              : <div className="space-y-2">
                {assignedWorkouts.map((workout) => (
                  <article key={workout.id} className="rounded-xl border border-[#3e3329] bg-[#100e0b] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 font-semibold text-sm text-[#e7dac8]">{workout.name}</h3>
                      <span className="shrink-0 rounded-full border border-[#68482e] bg-[#21180f] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#e8a16a]">{workout.status.replace(/_/g, " ")}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#8f8274]">{workout.detail}</p>
                  </article>
                ))}
              </div>}
      </section>

      <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5" aria-label="Assigned drills">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bf753f]/25 bg-[#bf753f]/10 text-[#e79960]"><Target className="h-4 w-4" /></span>
          <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Your training</p><h2 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">Assigned drills</h2></div>
        </div>
        {drillsQuery.isLoading
          ? <p className="text-xs text-[#887c6e]">Loading assigned drills…</p>
          : drillsQuery.isError
            ? <div className="text-xs text-red-200"><p>Assigned drills could not load.</p><Button variant="ghost" onClick={() => drillsQuery.refetch()} className="mt-1 h-auto px-0 text-red-200">Retry</Button></div>
            : !drillsQuery.data?.length
              ? <p className="rounded-xl border border-dashed border-[#514333] bg-[#100e0b] p-4 text-xs leading-5 text-[#817567]">Drills assigned by the founder will appear here.</p>
              : <div className="space-y-2">
                {drillsQuery.data.map((assignment) => (
                  <article key={assignment.id} className="rounded-xl border border-[#3e3329] bg-[#100e0b] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 font-semibold text-sm text-[#e7dac8]">{assignment.drill?.title || "Assigned drill"}</h3>
                      <span className="shrink-0 rounded-full border border-[#68482e] bg-[#21180f] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#e8a16a]">{assignment.status.replace(/_/g, " ")}</span>
                    </div>
                    {assignment.dueDate && <p className="mt-1 text-[10px] text-[#817567]">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>}
                    {assignment.notes && <p className="mt-1 text-xs leading-5 text-[#8f8274]">{assignment.notes}</p>}
                    {assignment.drill?.description && <p className="mt-1 text-xs leading-5 text-[#8f8274]">{assignment.drill.description}</p>}
                  </article>
                ))}
              </div>}
      </section>
    </div>
  );
}

export default function ShootingCohortPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const playerQuery = useShootingCohortQuery();
  const assessmentQuery = useShootingCohortAssessmentsQuery();
  const submitApplication = useSubmitShootingCohortApplication();
  const updateApplication = useUpdateShootingCohortApplication();
  const respondInvitation = useRespondToShootingCohortInvitation();
  const submitAssessment = useSubmitShootingCohortAssessment();
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showInterestSurvey, setShowInterestSurvey] = useState(false);
  const [reapply, setReapply] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");
  const [messageChannel, setMessageChannel] = useState<"group" | "founder">("group");
  const application = playerQuery.data?.application;
  const closedApplicationStatus = ["withdrawn", "declined", "removed"].includes(application?.status ?? "");
  const canStartApplication = !application || closedApplicationStatus;
  const ownAssessments = assessmentQuery.data ?? playerQuery.data?.assessments ?? [];
  const orderedAssessments = useMemo(() => [...ownAssessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [ownAssessments]);
  const latestAssessment = orderedAssessments[0];
  const isMember = application?.status === "active";
  const isEditingSurvey = Boolean(application && !closedApplicationStatus);
  const openFounderMessages = () => {
    if (!isMember) {
      navigate("/contact?from=shooting-cohort");
      return;
    }
    setActiveTab("messaging");
    setMessageChannel("founder");
  };
  const nextRetest = latestAssessment ? new Date(new Date(latestAssessment.createdAt).getTime() + 28 * 24 * 60 * 60 * 1000) : null;
  const retestDue = nextRetest ? nextRetest <= new Date() : false;
  const invitationBusy = respondInvitation.isPending;
  const settings = playerQuery.data?.settings;
  const remainingSpots = Math.max(0, (settings?.capacity ?? 0) - (settings?.activeCount ?? 0) - (settings?.invitedCount ?? 0));
  const toggleInterestSurvey = () => {
    const nextOpen = !showInterestSurvey;
    setShowInterestSurvey(nextOpen);
    if (closedApplicationStatus) setReapply(nextOpen);
  };
  const closeInterestSurvey = () => {
    setShowInterestSurvey(false);
    if (closedApplicationStatus) setReapply(false);
  };
  const apply = async (answers: ShootingCohortApplicationAnswers) => {
    const editing = Boolean(application && !closedApplicationStatus);
    try {
      if (editing) await updateApplication.mutateAsync(answers);
      else await submitApplication.mutateAsync(answers);
      setShowInterestSurvey(false);
      setReapply(false);
      toast(editing
        ? { title: "Survey updated", description: "Your answers are saved without changing your cohort status." }
        : { title: "Application received", description: "Your place is now reflected in your cohort status." });
    } catch (error) {
      toast({ title: editing ? "Survey not updated" : "Application not sent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  const respond = async (response: "accept" | "decline") => {
    try {
      await respondInvitation.mutateAsync(response);
      toast({ title: response === "accept" ? "Welcome to the cohort" : "Invitation declined", description: response === "accept" ? "Your seat is active. Start with your baseline." : "The reserved seat has been released." });
    } catch (error) {
      toast({ title: "Could not update invitation", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  const saveAssessment = async (assessment: ShootingCohortAssessmentInput) => {
    try {
      await submitAssessment.mutateAsync(assessment);
      setShowAssessmentForm(false);
      toast({ title: assessment.type === "baseline" ? "Baseline saved" : "Retest saved", description: "Your private shooting history has been updated." });
    } catch (error) {
      toast({ title: "Assessment not saved", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };
  if (playerQuery.isLoading) return <main className="shooting-cohort-page min-h-full bg-[#100e0b] px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl space-y-5"><Skeleton className="h-8 w-32 bg-[#29231c]" /><Skeleton className="h-44 rounded-[28px] bg-[#29231c]" /><Skeleton className="h-72 rounded-[28px] bg-[#29231c]" /></div></main>;
  if (playerQuery.isError || !playerQuery.data) return <main className="shooting-cohort-page min-h-full bg-[#100e0b] px-4 py-12 sm:px-8"><section className="mx-auto max-w-xl rounded-3xl border border-[#493a2c] bg-[#17130f] p-8 text-center"><CircleHelp className="mx-auto h-8 w-8 text-[#e09457]" /><h1 className="mt-4 font-heading text-3xl uppercase text-[#fff1de]">Couldn’t load your cohort</h1><p className="mt-2 text-sm text-[#a99b89]">Your application and member access are still safe. Try loading them again.</p><Button onClick={() => playerQuery.refetch()} className="mt-5 bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]">Retry</Button></section></main>;
  const status = application ? statusCopy[application.status] : null;
  const retestLabel = latestAssessment?.type === "baseline" ? "Record a retest" : "Record another retest";
  return (
    <main className="shooting-cohort-page min-h-full bg-[#080808] px-4 pb-12 pt-5 text-zinc-100 sm:px-7 sm:pt-8">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-zinc-800 pb-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading text-3xl uppercase leading-tight tracking-wide text-white sm:text-4xl">Build an <span className="text-orange-400">Effortless Shot</span></h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {(canStartApplication || isEditingSurvey) && <Button onClick={toggleInterestSurvey} disabled={canStartApplication && !settings?.applicationsOpen && !showInterestSurvey} aria-expanded={showInterestSurvey} aria-controls="shooting-cohort-interest-survey" className="bg-orange-500 font-bold text-black hover:bg-orange-400 disabled:opacity-50">{showInterestSurvey ? "Close survey" : isEditingSurvey ? "Edit Interest Survey" : "Interest Survey"}</Button>}
              <Button variant="outline" onClick={openFounderMessages} className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-white"><MessageCircle className="mr-2 h-4 w-4" />Message Founder</Button>
              <Button variant="ghost" onClick={() => navigate("/hub")} className="text-zinc-500 hover:bg-white/[0.04] hover:text-white">Hub <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </div>
          {canStartApplication && !settings?.applicationsOpen && <p className="mt-3 text-xs text-[#9d8f7e]">Applications are paused right now.</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#493a2c] bg-[#17130f] px-4 py-3">
              <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#9d8f7e]">Remaining spots</p><p className="mt-1 text-xs text-[#817567]">of {settings?.capacity ?? 0} total</p></div>
              <p className="font-heading text-3xl leading-none text-[#f2a365]">{remainingSpots}</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#493a2c] bg-[#17130f] px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#bf753f]/10 text-[#e79960]"><BadgeCheck className="h-4 w-4" /></span>
              <div><p className="font-heading text-lg uppercase leading-none text-[#f2e2ce]">Founder-led</p><p className="mt-1 text-[11px] text-[#85796a]">Guidance built around your game</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#493a2c] bg-[#17130f] px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#bf753f]/10 text-[#e79960]"><Target className="h-4 w-4" /></span>
              <div><p className="font-heading text-lg uppercase leading-none text-[#f2e2ce]">Measurable results</p><p className="mt-1 text-[11px] text-[#85796a]">Private scores and regular retests</p></div>
            </div>
          </div>
        </section>

        {application && !closedApplicationStatus && !isMember && (
          <section className={`mt-5 flex flex-col gap-4 rounded-[22px] border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${status?.tone ?? "border-zinc-700 bg-zinc-900"}`}>
            <div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/20"><ShieldCheck className="h-4 w-4" /></span><div><p className="font-heading text-2xl uppercase leading-none">{status?.label}</p><p className="mt-1.5 max-w-xl text-sm leading-5 opacity-80">{status?.detail}</p>{application.appliedAt && <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] opacity-60">Applied {formatDate(application.appliedAt)} · status updates in your portal</p>}</div></div>
            {application.status === "invited" && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void respond("decline")} disabled={invitationBusy} className="border-current/30 bg-black/10 text-current hover:bg-black/20">Decline</Button><Button onClick={() => void respond("accept")} disabled={invitationBusy} className="bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]">{invitationBusy ? "Updating…" : "Accept invitation"} <Check className="ml-2 h-4 w-4" /></Button></div>}
          </section>
        )}

        {showInterestSurvey && (!closedApplicationStatus || reapply) && (
          <div id="shooting-cohort-interest-survey" className="mt-5">
            {canStartApplication && !settings?.applicationsOpen && <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#5b4934] bg-[#211a13] p-4"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#e9a05e]" /><div><p className="text-sm font-semibold text-[#f0e1ce]">Applications are paused</p><p className="mt-1 text-xs leading-5 text-[#9d8f7e]">The survey stays here; you can submit when applications reopen.</p></div></div>}
            <ApplicationForm
              initialAnswers={isEditingSurvey ? application?.answers : undefined}
              editing={isEditingSurvey}
              onCancel={closeInterestSurvey}
              onSubmit={(answers) => void apply(answers)}
              pending={isEditingSurvey ? updateApplication.isPending : submitApplication.isPending}
              isOpen={isEditingSurvey || Boolean(settings?.applicationsOpen)}
            />
          </div>
        )}

        {isMember && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList aria-label="Shooting Cohort player sections" className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1 md:grid-cols-6">
              <TabsTrigger value="requests" className="flex h-auto min-h-12 flex-col gap-1 whitespace-normal rounded-lg px-1 py-2 text-[10px] leading-tight text-[#a99b89] data-[state=active]:bg-[#ef8a43] data-[state=active]:font-bold data-[state=active]:text-[#21150c] md:text-xs"><ClipboardList className="h-4 w-4" /><span>Requests</span></TabsTrigger>
              <TabsTrigger value="film-room" className="flex h-auto min-h-12 flex-col gap-1 whitespace-normal rounded-lg px-1 py-2 text-[10px] leading-tight text-[#a99b89] data-[state=active]:bg-[#ef8a43] data-[state=active]:font-bold data-[state=active]:text-[#21150c] md:text-xs"><Film className="h-4 w-4" /><span>Film Room</span></TabsTrigger>
              <TabsTrigger value="messaging" className="flex h-auto min-h-12 flex-col gap-1 whitespace-normal rounded-lg px-1 py-2 text-[10px] leading-tight text-[#a99b89] data-[state=active]:bg-[#ef8a43] data-[state=active]:font-bold data-[state=active]:text-[#21150c] md:text-xs"><MessageCircle className="h-4 w-4" /><span>Messaging</span></TabsTrigger>
              <TabsTrigger value="baseline" className="flex h-auto min-h-12 flex-col gap-1 whitespace-normal rounded-lg px-1 py-2 text-[10px] leading-tight text-[#a99b89] data-[state=active]:bg-[#ef8a43] data-[state=active]:font-bold data-[state=active]:text-[#21150c] md:text-xs"><Target className="h-4 w-4" /><span>Baseline Assessment</span></TabsTrigger>
              <TabsTrigger value="workouts" className="flex h-auto min-h-12 flex-col gap-1 whitespace-normal rounded-lg px-1 py-2 text-[10px] leading-tight text-[#a99b89] data-[state=active]:bg-[#ef8a43] data-[state=active]:font-bold data-[state=active]:text-[#21150c] md:text-xs"><Dumbbell className="h-4 w-4" /><span>Workouts</span></TabsTrigger>
              <TabsTrigger value="analytics" className="flex h-auto min-h-12 flex-col gap-1 whitespace-normal rounded-lg px-1 py-2 text-[10px] leading-tight text-[#a99b89] data-[state=active]:bg-[#ef8a43] data-[state=active]:font-bold data-[state=active]:text-[#21150c] md:text-xs"><Activity className="h-4 w-4" /><span>Analytics</span></TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4 focus-visible:outline-none"><CohortRequestsSection /></TabsContent>
            <TabsContent value="film-room" className="mt-4 focus-visible:outline-none"><ShootingCohortVideos /></TabsContent>
            <TabsContent value="messaging" className="mt-4 focus-visible:outline-none"><MemberChat activeChannel={messageChannel} onChannelChange={setMessageChannel} /></TabsContent>
            <TabsContent value="baseline" forceMount className="mt-4 focus-visible:outline-none">
              <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5" aria-label="Baseline shooting assessment">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Shooting check-in</p><h2 className="mt-1 font-heading text-3xl uppercase leading-none text-[#fff1de]">Baseline assessment</h2><p className="mt-2 max-w-xl text-xs leading-5 text-[#8f8274]">Record a consistent 60-shot snapshot. Your results remain private to you and PLAYR1 admins.</p></div>
                  <Button onClick={() => setShowAssessmentForm(true)} className="bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]"><Target className="mr-2 h-4 w-4" />{orderedAssessments.length ? retestLabel : "Set baseline"}</Button>
                </div>
                <div className="mt-5 grid grid-cols-3 divide-x divide-[#4b3928] rounded-xl border border-[#503b28] bg-[#100e0b] py-3 text-center">
                  <div><p className="font-heading text-2xl text-[#f4b27c]">20</p><p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#958574]">free throws</p></div>
                  <div><p className="font-heading text-2xl text-[#f4b27c]">25</p><p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#958574]">spot-up</p></div>
                  <div><p className="font-heading text-2xl text-[#f4b27c]">15</p><p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#958574]">off-dribble</p></div>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#9d8f7e]">Record your makes at five spots and three dribble locations. Revisit the same test every four weeks.</p>
                {latestAssessment && <div className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${retestDue ? "border-[#df965c]/30 bg-[#df965c]/[0.08] text-[#f1bd8c]" : "border-[#3a3329] bg-[#100e0b] text-[#958878]"}`}><CalendarDays className="h-3.5 w-3.5 shrink-0" />{retestDue ? "A four-week retest is due. Put your progress on paper." : `Next suggested retest ${nextRetest?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}. Retest every four weeks.`}</div>}
                {showAssessmentForm && <div className="mt-4"><AssessmentForm type={orderedAssessments.length ? "retest" : "baseline"} pending={submitAssessment.isPending} onCancel={() => setShowAssessmentForm(false)} onSubmit={(assessment) => void saveAssessment(assessment)} /></div>}
              </section>
            </TabsContent>
            <TabsContent value="workouts" className="mt-4 focus-visible:outline-none"><CohortWorkoutsSection /></TabsContent>
            <TabsContent value="analytics" className="mt-4 focus-visible:outline-none">
              <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5" aria-label="Private shooting analytics">
                <div className="mb-4"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#df965c]">Your shooting log</p><h2 className="mt-1 font-heading text-3xl uppercase leading-none text-[#fff1de]">Progress, kept personal.</h2><p className="mt-2 max-w-xl text-xs leading-5 text-[#8f8274]">Your scores are visible only to you and PLAYR1 admins. No leaderboard, no public scores.</p></div>
                <AssessmentTrend assessments={orderedAssessments} />
                {assessmentQuery.isLoading && <div className="mt-4 space-y-3"><Skeleton className="h-36 rounded-2xl bg-[#29231c]" /><Skeleton className="h-36 rounded-2xl bg-[#29231c]" /></div>}
                {assessmentQuery.isError && <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[0.05] p-4 text-sm text-red-200"><p>Private test history could not load.</p><Button variant="ghost" onClick={() => assessmentQuery.refetch()} className="mt-1 px-0 text-red-200 hover:text-white">Retry</Button></div>}
                {!assessmentQuery.isLoading && !assessmentQuery.isError && orderedAssessments.length === 0 && <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-[#514333] bg-[#100e0b] px-5 py-8 text-center"><Trophy className="h-6 w-6 text-[#8e6847]" /><p className="mt-3 text-sm font-semibold text-[#dfd0bd]">Your first mark is still ahead.</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#817567]">Open Baseline Assessment to record your first result.</p></div>}
                <div className="mt-4 space-y-3">{orderedAssessments.map((assessment, index) => <AssessmentCard key={assessment.id} assessment={assessment} index={orderedAssessments.length - index - 1} />)}</div>
              </section>
            </TabsContent>
          </Tabs>
        )}
        {application?.status === "waitlisted" && <section className="mt-5 rounded-2xl border border-[#4a3d2e] bg-[#17130f] p-5"><p className="font-heading text-2xl uppercase text-[#f1e3d2]">Your application is in order.</p><p className="mt-1 max-w-2xl text-sm leading-6 text-[#9d8f7e]">There are {playerQuery.data.waitlistCount} {playerQuery.data.waitlistCount === 1 ? "player" : "players"} on the waitlist. Invitations are sent as seats open; accept or decline here when yours arrives.</p></section>}
      </div>
    </main>
  );
}