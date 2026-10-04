import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  ChartNoAxesCombined,
  Medal,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import type { PersonalRecord, TeamAward } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AutomaticRecord = {
  title: string;
  value: number;
  unit: string;
  detail: string;
  achievedAt: string | null;
};

type AutomaticRecordGroups = {
  gameRecords: AutomaticRecord[];
  seasonRecords: AutomaticRecord[];
};

type TrophyFinish = "gold" | "silver" | "bronze" | "orange" | "ice";

const TROPHY_FINISHES: Record<TrophyFinish, {
  label: string;
  dark: string;
  glow: string;
  stops: [string, string, string];
}> = {
  gold: { label: "Gold", dark: "#241b08", glow: "rgba(245, 190, 65, 0.19)", stops: ["#fff1a8", "#e6a72e", "#8d5112"] },
  silver: { label: "Silver", dark: "#1b2025", glow: "rgba(203, 213, 225, 0.16)", stops: ["#ffffff", "#aab7c5", "#586474"] },
  bronze: { label: "Bronze", dark: "#24150f", glow: "rgba(199, 112, 65, 0.18)", stops: ["#ffd0a3", "#b96537", "#67341f"] },
  orange: { label: "PLAYR1 Orange", dark: "#25130c", glow: "rgba(249, 115, 22, 0.2)", stops: ["#ffe2bd", "#f97316", "#8e2d0b"] },
  ice: { label: "Ice Blue", dark: "#101d27", glow: "rgba(125, 211, 252, 0.18)", stops: ["#e2f7ff", "#63bce9", "#275879"] },
};

const AWARD_TYPES = [
  { value: "team", label: "Team honor" },
  { value: "academic", label: "Academic" },
  { value: "championship", label: "Championship" },
  { value: "personal", label: "Personal" },
];

const DEFAULT_RECORDS = [
  { key: "threes-in-a-row", title: "Most 3-Pointers Made in a Row", metricName: "Consecutive 3-Pointers", unit: "makes" },
  { key: "free-throws-in-a-row", title: "Most Free Throws Made in a Row", metricName: "Consecutive Free Throws", unit: "makes" },
] as const;

type AwardForm = {
  awardName: string;
  teamName: string;
  awardType: string;
  season: string;
  description: string;
  awardedAt: string;
  icon: string;
};

type RecordEditor =
  | { kind: "default"; key: string; title: string; value: string }
  | { kind: "custom"; id?: string; title: string; value: string };

const emptyAwardForm = (): AwardForm => ({
  awardName: "",
  teamName: "",
  awardType: "team",
  season: "",
  description: "",
  awardedAt: new Date().toISOString().slice(0, 10),
  icon: "gold",
});

function formatValue(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function TrophyIllustration({ finish, className = "" }: { finish: string | null | undefined; className?: string }) {
  const generatedId = useId().replace(/:/g, "");
  const palette = TROPHY_FINISHES[(finish as TrophyFinish) in TROPHY_FINISHES ? finish as TrophyFinish : "gold"];
  const gradientId = `trophy-metal-${generatedId}`;
  const highlightId = `trophy-highlight-${generatedId}`;

  return (
    <svg viewBox="0 0 132 150" role="img" aria-label={`${palette.label} trophy`} className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.stops[0]} />
          <stop offset="0.48" stopColor={palette.stops[1]} />
          <stop offset="1" stopColor={palette.stops[2]} />
        </linearGradient>
        <linearGradient id={highlightId} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.74" />
          <stop offset="0.48" stopColor="white" stopOpacity="0.05" />
          <stop offset="1" stopColor="black" stopOpacity="0.34" />
        </linearGradient>
      </defs>
      <path d="M37 18h58v25c0 25-11 42-29 48-18-6-29-23-29-48V18Z" fill={`url(#${gradientId})`} stroke="white" strokeOpacity=".48" strokeWidth="1.5" />
      <path d="M37 27H17v13c0 18 11 29 29 31m49-44h20v13c0 18-11 29-29 31" fill="none" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round" />
      <path d="M37 18h58v25c0 25-11 42-29 48-18-6-29-23-29-48V18Z" fill={`url(#${highlightId})`} opacity=".62" />
      <path d="M66 31v42m-14-21h28" stroke="white" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      <circle cx="66" cy="52" r="4" fill="white" fillOpacity=".82" />
      <path d="M57 91v17H43v11h46v-11H75V91" fill={`url(#${gradientId})`} stroke="white" strokeOpacity=".34" strokeWidth="1.2" />
      <path d="M35 119h62v10H35z" fill={`url(#${gradientId})`} stroke="white" strokeOpacity=".45" strokeWidth="1.4" />
      <path d="m24 18 3-7 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm79 17 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="white" fillOpacity=".8" />
    </svg>
  );
}

function RecordCard({
  title,
  value,
  unit,
  detail,
  achievedAt,
  kind,
}: {
  title: string;
  value: number;
  unit: string;
  detail: string;
  achievedAt: string | null;
  kind: "game" | "season";
}) {
  const date = formatDate(achievedAt);
  return (
    <article className="rounded-xl border border-orange-400/20 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.09),transparent_64%),#15130f] p-3.5" data-testid={`automatic-record-${kind}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-400/25 bg-orange-400/[0.08] text-orange-200">
          {kind === "game" ? <Medal className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
        </div>
        <Badge variant="outline" className="border-orange-400/20 bg-orange-400/[0.04] text-[9px] uppercase tracking-wider text-orange-100/70">
          {kind === "game" ? "Game" : "Season"}
        </Badge>
      </div>
      <p className="mt-3 font-display text-3xl font-black tabular-nums tracking-tight text-orange-100">
        {formatValue(value)} <span className="text-xs font-bold text-orange-300">{unit}</span>
      </p>
      <p className="mt-1 text-xs font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 truncate text-[10px] text-zinc-500">{detail}</p>
      {date && <p className="mt-2 text-[9px] uppercase tracking-wider text-zinc-600">{date}</p>}
    </article>
  );
}

export default function TrophyRoomPage() {
  const { toast } = useToast();
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<TeamAward | null>(null);
  const [awardForm, setAwardForm] = useState<AwardForm>(emptyAwardForm);
  const [recordEditor, setRecordEditor] = useState<RecordEditor | null>(null);

  const { data: awards = [], isLoading: awardsLoading, isError: awardsError } = useQuery<TeamAward[]>({
    queryKey: ["/api/team-awards"],
  });
  const { data: personalRecords = [], isLoading: recordsLoading, isError: recordsError } = useQuery<PersonalRecord[]>({
    queryKey: ["/api/personal-records"],
  });
  const { data: automaticRecords, isLoading: automaticRecordsLoading, isError: automaticRecordsError } = useQuery<AutomaticRecordGroups>({
    queryKey: ["/api/trophy-room/automatic-records"],
  });

  const saveAwardMutation = useMutation({
    mutationFn: async (form: AwardForm) => {
      const payload = {
        awardName: form.awardName.trim(),
        teamName: form.teamName.trim(),
        awardType: form.awardType,
        season: form.season.trim() || null,
        description: form.description.trim() || null,
        awardedAt: form.awardedAt ? new Date(`${form.awardedAt}T12:00:00.000Z`).toISOString() : null,
        icon: form.icon,
      };
      return editingAward
        ? apiRequest("PUT", `/api/team-awards/${editingAward.id}`, payload)
        : apiRequest("POST", "/api/team-awards", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-awards"] });
      setAwardDialogOpen(false);
      setEditingAward(null);
      setAwardForm(emptyAwardForm());
      toast({ title: editingAward ? "Award updated" : "Award added", description: "Your trophy is saved in the Trophy Room." });
    },
    onError: () => toast({ title: "Couldn't save award", variant: "destructive" }),
  });

  const deleteAwardMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/team-awards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-awards"] });
      toast({ title: "Award removed" });
    },
    onError: () => toast({ title: "Couldn't remove award", variant: "destructive" }),
  });

  const saveRecordMutation = useMutation({
    mutationFn: (editor: RecordEditor) => {
      const value = Number(editor.value);
      if (editor.kind === "default") {
        return apiRequest("PUT", `/api/trophy-room/default-records/${editor.key}`, { value });
      }
      const payload = { name: editor.title.trim(), value };
      return editor.id
        ? apiRequest("PUT", `/api/trophy-room/custom-records/${editor.id}`, payload)
        : apiRequest("POST", "/api/trophy-room/custom-records", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-records"] });
      setRecordEditor(null);
      toast({ title: "Record saved" });
    },
    onError: () => toast({ title: "Couldn't save record", variant: "destructive" }),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trophy-room/custom-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-records"] });
      toast({ title: "Custom record removed" });
    },
    onError: () => toast({ title: "Couldn't remove record", variant: "destructive" }),
  });

  const openNewAward = () => {
    setEditingAward(null);
    setAwardForm(emptyAwardForm());
    setAwardDialogOpen(true);
  };

  const openEditAward = (award: TeamAward) => {
    setEditingAward(award);
    setAwardForm({
      awardName: award.awardName,
      teamName: award.teamName || "",
      awardType: award.awardType || "team",
      season: award.season || "",
      description: award.description || "",
      awardedAt: award.awardedAt ? new Date(award.awardedAt).toISOString().slice(0, 10) : "",
      icon: award.icon || "gold",
    });
    setAwardDialogOpen(true);
  };

  const openDefaultRecord = (key: string, title: string) => {
    const defaultRecord = DEFAULT_RECORDS.find((record) => record.key === key);
    const existing = defaultRecord
      ? personalRecords.find((record) => record.metricName === defaultRecord.metricName && record.source !== "trophy_custom")
      : undefined;
    setRecordEditor({ kind: "default", key, title, value: existing ? String(Number(existing.newValue)) : "" });
  };

  const customRecords = personalRecords.filter((record) => record.source === "trophy_custom");
  const defaultMetricNames = new Set<string>(DEFAULT_RECORDS.map((record) => record.metricName));
  const defaultRecordMap = personalRecords
    .filter((record) => defaultMetricNames.has(record.metricName) && record.source !== "trophy_custom")
    .reduce((bestByMetric, record) => {
      const current = bestByMetric.get(record.metricName);
      if (!current || Number(record.newValue) > Number(current.newValue)) {
        bestByMetric.set(record.metricName, record);
      }
      return bestByMetric;
    }, new Map<string, PersonalRecord>());
  const savedPersonalRecords = [...personalRecords
    .filter((record) =>
      record.source !== "trophy_default" &&
      record.source !== "trophy_custom" &&
      !defaultMetricNames.has(record.metricName),
    )
    .reduce((bestByMetric, record) => {
      const current = bestByMetric.get(record.metricName);
      if (!current || Number(record.newValue) > Number(current.newValue)) {
        bestByMetric.set(record.metricName, record);
      }
      return bestByMetric;
    }, new Map<string, PersonalRecord>())
    .values()]
    .sort((a, b) => a.metricName.localeCompare(b.metricName));

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-7 px-4 pb-24 pt-5 text-zinc-100 sm:px-6 sm:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild type="button" size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:text-white" aria-label="Back to Profile">
            <Link href="/profile"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Your Milestones</p>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl" data-testid="text-trophy-room-title">Trophy Room</h1>
          </div>
        </div>
        <Button type="button" onClick={openNewAward} className="bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400" data-testid="button-create-trophy-award">
          <Plus className="mr-1.5 h-4 w-4" /> Add Award
        </Button>
      </header>

      <section aria-labelledby="trophy-awards-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Made to keep</p>
            <h2 id="trophy-awards-heading" className="mt-1 text-lg font-black">Awards</h2>
          </div>
          <span className="text-[10px] font-semibold text-zinc-600">{awards.length} {awards.length === 1 ? "trophy" : "trophies"}</span>
        </div>
        {awardsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-44 rounded-xl bg-zinc-900" />
            <Skeleton className="h-44 rounded-xl bg-zinc-900" />
          </div>
        ) : awardsError ? (
          <p className="rounded-xl border border-red-400/15 bg-red-400/[0.04] p-4 text-sm text-red-200">Awards couldn’t load. Refresh to try again.</p>
        ) : awards.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {awards.map((award) => {
              const finish = (award.icon || "gold") as TrophyFinish;
              const palette = TROPHY_FINISHES[finish] || TROPHY_FINISHES.gold;
              const date = formatDate(award.awardedAt);
              const awardType = AWARD_TYPES.find((item) => item.value === award.awardType)?.label || award.awardType || "Award";
              return (
                <article
                  key={award.id}
                  className="relative overflow-hidden rounded-2xl border bg-[#151311] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                  style={{ borderColor: `${palette.stops[1]}55`, background: `radial-gradient(ellipse at 15% 45%, ${palette.glow}, transparent 62%), linear-gradient(135deg, ${palette.dark}, #141414 70%)` }}
                  data-testid={`trophy-award-${award.id}`}
                >
                  <div className="absolute inset-x-4 bottom-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <div className="absolute right-3 top-3 flex gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={() => openEditAward(award)} aria-label={`Edit ${award.awardName}`} data-testid={`button-edit-trophy-${award.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-zinc-500 hover:text-red-300"
                      onClick={() => {
                        if (window.confirm(`Remove “${award.awardName}” from your Trophy Room?`)) deleteAwardMutation.mutate(award.id);
                      }}
                      aria-label={`Delete ${award.awardName}`}
                      data-testid={`button-delete-trophy-${award.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 pr-14">
                    <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20" style={{ boxShadow: `inset 0 0 26px ${palette.glow}` }}>
                      <TrophyIllustration finish={finish} className="h-28 w-24 drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]" />
                    </div>
                    <div className="min-w-0">
                      <Badge variant="outline" className="border-white/15 bg-black/15 text-[9px] uppercase tracking-wider text-zinc-300">{awardType}</Badge>
                      <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug text-zinc-50">{award.awardName}</h3>
                      <p className="mt-1 truncate text-xs text-zinc-400">{award.teamName || "Personal honor"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {award.season && <Badge variant="outline" className="border-white/10 bg-black/10 text-[9px] text-zinc-500">{award.season}</Badge>}
                        {date && <span className="text-[9px] text-zinc-500">{date}</span>}
                      </div>
                      {award.description && <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{award.description}</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-[8px] font-bold uppercase tracking-[0.24em]" style={{ color: palette.stops[0] }}>
                    {palette.label} · PLAYR1 Award
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-white/10 bg-[#121212] p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.05] text-amber-200">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Your awards deserve a place here.</p>
                <p className="mt-1 text-xs text-zinc-500">Add honors like Team MVP, Academic Award, or a championship.</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={openNewAward} className="border-amber-300/20 text-amber-100 hover:bg-amber-300/10" data-testid="button-add-first-award">
              <Plus className="mr-1.5 h-4 w-4" /> Add your first award
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="trophy-records-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300/70">Numbers worth chasing</p>
            <h2 id="trophy-records-heading" className="mt-1 text-lg font-black">Records</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setRecordEditor({ kind: "custom", title: "", value: "" })} className="h-8 border-white/10 text-xs text-zinc-300 hover:text-white" data-testid="button-create-custom-record">
            <Plus className="mr-1 h-3.5 w-3.5" /> Create Custom Record
          </Button>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-orange-400/15 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.07),transparent_60%),#12100e] p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
              <ChartNoAxesCombined className="h-4 w-4 text-orange-300" />
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-orange-100/85">Game &amp; Season Bests</h3>
              <span className="text-[9px] text-zinc-600">Calculated from your game logs</span>
            </div>
            {automaticRecordsLoading ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32 rounded-xl bg-zinc-900" />
                <Skeleton className="h-32 rounded-xl bg-zinc-900" />
                <Skeleton className="h-32 rounded-xl bg-zinc-900" />
              </div>
            ) : automaticRecordsError ? (
              <p className="rounded-xl border border-red-400/15 bg-red-400/[0.04] p-4 text-sm text-red-200">Game and season records couldn’t load. Refresh to try again.</p>
            ) : automaticRecords && [...automaticRecords.gameRecords, ...automaticRecords.seasonRecords].length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {automaticRecords.gameRecords.map((record) => (
                  <RecordCard key={`game-${record.title}`} {...record} kind="game" />
                ))}
                {automaticRecords.seasonRecords.map((record) => (
                  <RecordCard key={`season-${record.title}`} {...record} kind="season" />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-orange-300/15 bg-black/15 p-4 text-xs text-zinc-500">
                Log games in Stats to build automatic game and season records.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-amber-300/10 bg-[radial-gradient(ellipse_at_top_left,rgba(245,190,65,0.06),transparent_62%),#12110e] p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-300" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-amber-100/80">Personal Records</h3>
                <p className="mt-0.5 text-[10px] text-zinc-600">Personal bests, training milestones, and records you set yourself.</p>
              </div>
            </div>
            {recordsLoading && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 rounded-xl bg-zinc-900" />
                <Skeleton className="h-28 rounded-xl bg-zinc-900" />
                <Skeleton className="h-28 rounded-xl bg-zinc-900" />
              </div>
            )}
            {recordsError && (
              <p className="mb-3 rounded-xl border border-red-400/15 bg-red-400/[0.04] p-3 text-xs text-red-200">Saved personal records couldn’t load. You can still set a new personal best or create a record.</p>
            )}
            {!recordsLoading && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_RECORDS.map((record) => {
                  const saved = defaultRecordMap.get(record.metricName);
                  return (
                    <article key={record.key} className="rounded-xl border border-amber-300/15 bg-[radial-gradient(ellipse_at_top_left,rgba(245,190,65,0.08),transparent_68%),#17150f] p-3.5" data-testid={`default-record-${record.key}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-xs font-semibold leading-relaxed text-zinc-100">{record.title}</p>
                        <Badge variant="outline" className="shrink-0 border-amber-300/15 bg-amber-300/[0.04] text-[8px] uppercase tracking-wider text-amber-100/60">Best</Badge>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="font-display text-2xl font-black tabular-nums tracking-tight text-amber-100">
                          {saved ? formatValue(saved.newValue) : <span className="text-sm font-semibold text-zinc-600">Not set</span>}
                          {saved && <span className="ml-1 text-[10px] font-bold text-amber-300">{record.unit}</span>}
                        </p>
                        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 border-amber-300/20 px-2.5 text-[10px] text-amber-100 hover:bg-amber-300/10" onClick={() => openDefaultRecord(record.key, record.title)} data-testid={`button-update-default-record-${record.key}`}>
                          {saved ? "Update" : "Set record"}
                        </Button>
                      </div>
                    </article>
                  );
                })}

                {savedPersonalRecords.map((record) => {
                  const sourceLabel = record.source === "game" ? "Game" : record.source === "season" ? "Season" : "Training";
                  const date = formatDate(record.achievedAt);
                  return (
                    <article key={record.id} className="rounded-xl border border-amber-300/15 bg-[radial-gradient(ellipse_at_top_left,rgba(245,190,65,0.08),transparent_68%),#17150f] p-3.5" data-testid={`saved-personal-record-${record.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold text-zinc-100">{record.metricName}</p>
                        <Badge variant="outline" className="shrink-0 border-amber-300/15 bg-amber-300/[0.04] text-[8px] uppercase tracking-wider text-amber-100/60">{sourceLabel}</Badge>
                      </div>
                      <p className="mt-2 font-display text-2xl font-black tabular-nums tracking-tight text-amber-100">{formatValue(record.newValue)}</p>
                      {date && <p className="mt-1 text-[9px] uppercase tracking-wider text-zinc-600">{date}</p>}
                    </article>
                  );
                })}

                {customRecords.map((record) => (
                  <article key={record.id} className="rounded-xl border border-amber-300/15 bg-[radial-gradient(ellipse_at_top_left,rgba(245,190,65,0.08),transparent_68%),#17150f] p-3.5" data-testid={`custom-record-${record.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-100">{record.metricName}</p>
                        <Badge variant="outline" className="mt-1.5 border-amber-300/15 bg-amber-300/[0.04] text-[8px] uppercase tracking-wider text-amber-100/60">Custom record</Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-amber-100" onClick={() => setRecordEditor({ kind: "custom", id: record.id, title: record.metricName, value: String(Number(record.newValue)) })} aria-label={`Edit ${record.metricName}`} data-testid={`button-edit-custom-record-${record.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-300" onClick={() => {
                          if (window.confirm(`Delete the custom record “${record.metricName}”?`)) deleteRecordMutation.mutate(record.id);
                        }} aria-label={`Delete ${record.metricName}`} data-testid={`button-delete-custom-record-${record.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 font-display text-2xl font-black tabular-nums tracking-tight text-amber-100">{formatValue(record.newValue)}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={awardDialogOpen} onOpenChange={(open) => {
        setAwardDialogOpen(open);
        if (!open) {
          setEditingAward(null);
          setAwardForm(emptyAwardForm());
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-[#151515] text-zinc-100">
          <DialogHeader>
            <DialogTitle>{editingAward ? "Edit Award" : "Create an Award"}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Add an honor and choose the finish for its Trophy Room display.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (awardForm.awardName.trim().length < 2) {
              toast({ title: "Add an award name", variant: "destructive" });
              return;
            }
            saveAwardMutation.mutate(awardForm);
          }}>
            <div className="space-y-1.5">
              <Label htmlFor="trophy-award-name">Award name</Label>
              <Input id="trophy-award-name" value={awardForm.awardName} onChange={(event) => setAwardForm((form) => ({ ...form, awardName: event.target.value }))} placeholder="Team MVP, Academic Award, Championship..." maxLength={120} required data-testid="input-trophy-award-name" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="trophy-award-type">Award type</Label>
                <select id="trophy-award-type" value={awardForm.awardType} onChange={(event) => setAwardForm((form) => ({ ...form, awardType: event.target.value }))} className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-zinc-200" data-testid="select-trophy-award-type">
                  {AWARD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trophy-award-issuer">Awarded by (optional)</Label>
                <Input id="trophy-award-issuer" value={awardForm.teamName} onChange={(event) => setAwardForm((form) => ({ ...form, teamName: event.target.value }))} placeholder="Team, school, or organization" maxLength={100} data-testid="input-trophy-award-issuer" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="trophy-award-season">Season (optional)</Label>
                <Input id="trophy-award-season" value={awardForm.season} onChange={(event) => setAwardForm((form) => ({ ...form, season: event.target.value }))} placeholder="2025–26" maxLength={40} data-testid="input-trophy-award-season" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trophy-award-date">Date (optional)</Label>
                <Input id="trophy-award-date" type="date" value={awardForm.awardedAt} onChange={(event) => setAwardForm((form) => ({ ...form, awardedAt: event.target.value }))} data-testid="input-trophy-award-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trophy finish</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TROPHY_FINISHES) as [TrophyFinish, typeof TROPHY_FINISHES[TrophyFinish]][]).map(([finish, palette]) => (
                  <button type="button" key={finish} onClick={() => setAwardForm((form) => ({ ...form, icon: finish }))} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${awardForm.icon === finish ? "border-orange-300/50 bg-orange-300/10 text-orange-100" : "border-white/10 text-zinc-500 hover:text-zinc-200"}`} aria-pressed={awardForm.icon === finish} data-testid={`button-trophy-finish-${finish}`}>
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: palette.stops[1] }} />
                    {palette.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <TrophyIllustration finish={awardForm.icon} className="h-16 w-14" />
                <p className="text-[10px] leading-relaxed text-zinc-500">
                  {Object.prototype.hasOwnProperty.call(TROPHY_FINISHES, awardForm.icon)
                    ? "This metallic finish styles your award card. You can edit it any time."
                    : "Your existing award icon value will be kept unless you choose a new finish."}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trophy-award-description">What made it special? (optional)</Label>
              <Textarea id="trophy-award-description" value={awardForm.description} onChange={(event) => setAwardForm((form) => ({ ...form, description: event.target.value }))} placeholder="Add a short note about the moment." maxLength={500} rows={3} data-testid="input-trophy-award-description" />
            </div>
            <Button type="submit" disabled={saveAwardMutation.isPending} className="w-full bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400" data-testid="button-save-trophy-award">
              {saveAwardMutation.isPending ? "Saving..." : editingAward ? "Save Changes" : "Add to Trophy Room"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recordEditor} onOpenChange={(open) => !open && setRecordEditor(null)}>
        <DialogContent className="max-w-md border-white/10 bg-[#151515] text-zinc-100">
          <DialogHeader>
            <DialogTitle>{recordEditor?.kind === "default" ? "Update Personal Best" : recordEditor?.id ? "Edit Custom Record" : "Create Custom Record"}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {recordEditor?.kind === "default" ? "Enter your current best streak. You can update it when you beat it." : "Name a record that matters to you and enter your best result."}
            </DialogDescription>
          </DialogHeader>
          {recordEditor && (
            <form className="space-y-4" onSubmit={(event) => {
              event.preventDefault();
              if (!recordEditor.value || Number(recordEditor.value) <= 0 || (recordEditor.kind === "custom" && recordEditor.title.trim().length < 2)) {
                toast({ title: "Enter a record name and a value above zero", variant: "destructive" });
                return;
              }
              saveRecordMutation.mutate(recordEditor);
            }}>
              <div className="space-y-1.5">
                <Label htmlFor="record-name">{recordEditor.kind === "default" ? "Record" : "Record name"}</Label>
                <Input
                  id="record-name"
                  value={recordEditor.title}
                  readOnly={recordEditor.kind === "default"}
                  onChange={(event) => setRecordEditor((current) => current?.kind === "custom" ? { ...current, title: event.target.value } : current)}
                  placeholder="e.g. Consecutive layups made"
                  maxLength={80}
                  data-testid="input-trophy-record-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="record-value">Best result</Label>
                <Input
                  id="record-value"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="any"
                  value={recordEditor.value}
                  onChange={(event) => setRecordEditor((current) => current ? { ...current, value: event.target.value } : current)}
                  placeholder="Enter your best"
                  required
                  data-testid="input-trophy-record-value"
                />
              </div>
              <Button type="submit" disabled={saveRecordMutation.isPending} className="w-full bg-orange-500 font-bold text-zinc-950 hover:bg-orange-400" data-testid="button-save-trophy-record">
                {saveRecordMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}