import { useEffect, useState } from "react";
import { useProUpgrade } from "@/components/pro-upgrade-dialog";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ArrowUp, BookOpen, Brain, ChevronRight, Dumbbell,
  Edit3, Filter, Loader2, Search,
  Sparkles, Trash2, Trophy, X,
} from "lucide-react";
import type { JournalEntry, TrainingLog } from "@shared/schema";
import { getJournalPrompts, type JournalPrompt } from "@shared/journalPrompts";

type JournalType = "post-workout" | "post-game" | "open";
type SourceKind = "workout" | "game";
type Source = {
  sourceId: string;
  kind: SourceKind;
  date?: string | Date | null;
  duration?: number;
  count?: number;
  opponent?: string | null;
  gameDate?: string | Date | null;
  seasonName?: string | null;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  logs?: Array<TrainingLog & { drillTitle?: string }>;
};
type JournalView = JournalEntry & { feedbackStale?: boolean };
type ChatMessage = { role: "user" | "assistant"; content: string };

const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Off" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Good" },
  { value: 5, label: "Locked in" },
];
const TYPE_LABELS: Record<JournalType, string> = {
  "post-workout": "Practice", "post-game": "Game", open: "Open",
};
const PROMPTS: Record<JournalType, JournalPrompt[]> = {
  "post-workout": getJournalPrompts("post-workout"),
  "post-game": getJournalPrompts("post-game"),
  open: getJournalPrompts("open"),
};

function formatDate(value?: string | Date | null, long = false) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-US", long
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function MoodPicker({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">How are you feeling?</p>
      <div className="grid grid-cols-5 gap-1.5">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            aria-pressed={value === mood.value}
            aria-label={`Mood: ${mood.label}${value === mood.value ? ", selected" : ""}`}
            className={`rounded-lg border p-2 text-center transition-colors ${value === mood.value ? "border-orange-400 bg-orange-500/10" : "border-zinc-800 bg-zinc-950 hover:border-orange-400/50"}`}
            data-testid={`button-mood-${mood.value}`}
          >
            <span aria-hidden="true" className={`mx-auto mb-1 block h-2.5 w-2.5 rounded-full ${value === mood.value ? "bg-orange-400" : "bg-zinc-700"}`} />
            <span className="block text-[10px] text-zinc-400">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcePicker({
  kind, sourceId, sources, onChange,
}: { kind: JournalType; sourceId: string | null; sources: { workouts: Source[]; games: Source[] }; onChange: (kind: SourceKind | null, id: string | null) => void }) {
  const options = kind === "post-game" ? sources.games : kind === "post-workout" ? sources.workouts : [...sources.workouts, ...sources.games];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Link a performance record <span className="font-normal text-muted-foreground">(optional)</span></p>
      <select
        value={sourceId ? `${options.find((option) => option.sourceId === sourceId)?.kind}:${sourceId}` : ""}
        onChange={(event) => {
          const [selectedKind, id] = event.target.value.split(":");
          onChange((selectedKind as SourceKind) || null, id || null);
        }}
        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
        data-testid="select-journal-source"
      >
        <option value="">No linked source</option>
        {options.map((source) => (
          <option key={`${source.kind}:${source.sourceId}`} value={`${source.kind}:${source.sourceId}`}>
            {source.kind === "game"
              ? `${formatDate(source.gameDate)} · vs ${source.opponent || "opponent"}`
              : `${formatDate(source.date)} · ${source.duration || 0} min workout (${source.count || 1} drill${source.count === 1 ? "" : "s"})`}
          </option>
        ))}
      </select>
    </div>
  );
}

function JournalTypePicker({ value, onChange, disabled = false }: { value: JournalType; onChange: (value: JournalType) => void; disabled?: boolean }) {
  const options: Array<{ value: JournalType; label: string; icon: typeof Dumbbell }> = [
    { value: "post-workout", label: "Practice", icon: Dumbbell },
    { value: "post-game", label: "Game", icon: Trophy },
    { value: "open", label: "Open", icon: Brain },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map(({ value: optionValue, label, icon: Icon }) => (
          <button
            key={optionValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
              value === optionValue ? "border-orange-400 bg-orange-500/10" : "border-zinc-800 bg-zinc-950 hover:border-orange-400/50"
            }`}
            data-testid={`button-journal-type-${optionValue}`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${value === optionValue ? "text-orange-300" : "text-zinc-500"}`} />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryEditor({
  entry, type, isPro, onTypeChange, initialSourceKind, initialSourceId, sources, onDone, onSaved,
}: {
  entry?: JournalEntry;
  type: JournalType;
  isPro: boolean;
  onTypeChange?: (type: JournalType) => void;
  initialSourceKind?: SourceKind | null;
  initialSourceId?: string | null;
  sources: { workouts: Source[]; games: Source[] };
  onDone: () => void;
  onSaved?: (entry: JournalView) => void;
}) {
  const { toast } = useToast();
  const { openProOffer } = useProUpgrade();
  const [selectedPromptId, setSelectedPromptId] = useState(() => PROMPTS[type][Math.floor(Math.random() * PROMPTS[type].length)]?.id || "");
  const [freeWrite, setFreeWrite] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries((entry?.responses || []).map((response) => [response.promptId, response.answer])));
  const [thoughts, setThoughts] = useState(entry?.thoughts || "");
  const [savedDraftId, setSavedDraftId] = useState<string | null>(entry?.id || null);
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(entry?.gameId ? "game" : entry?.trainingLogId ? "workout" : initialSourceKind || null);
  const [sourceId, setSourceId] = useState<string | null>(entry?.gameId || entry?.trainingLogId || initialSourceId || null);
  const [analysisPending, setAnalysisPending] = useState(false);
  const activePrompt = !entry && !freeWrite ? PROMPTS[type].find((prompt) => prompt.id === selectedPromptId) : undefined;
  const savedPrompts = entry?.responses || [];
  const hasReflectionContent = Boolean(
    thoughts.trim() || savedPrompts.some((response) => (answers[response.promptId] || "").trim()),
  );
  const changeType = (nextType: JournalType) => {
    if ((nextType === "post-game" && sourceKind !== "game") || (nextType === "post-workout" && sourceKind !== "workout") || nextType === "open") {
      setSourceKind(null);
      setSourceId(null);
    }
    onTypeChange?.(nextType);
  };
  const save = async () => {
    const existingId = entry?.id || savedDraftId;
    const responses = entry
      ? savedPrompts.map((response) => ({ ...response, answer: (answers[response.promptId] || "").trim() })).filter((response) => response.answer)
      : activePrompt && thoughts.trim()
        ? [{ promptId: activePrompt.id, question: activePrompt.question, answer: thoughts.trim() }]
        : [];
    const savedThoughts = !entry && activePrompt ? null : thoughts.trim() || null;
    if (!responses.length && !savedThoughts && !hasReflectionContent) throw new Error("Write a few words before saving.");
    const payload = {
      ...(!existingId ? { type } : {}), mood, responses, thoughts: savedThoughts,
      trainingLogId: sourceKind === "workout" ? sourceId : null,
      gameId: sourceKind === "game" ? sourceId : null,
    };
    const response = await apiRequest(existingId ? "PUT" : "POST", existingId ? `/api/journal/${existingId}` : "/api/journal", payload);
    const saved = await response.json() as JournalView;
    if (!existingId) setSavedDraftId(saved.id);
    return saved;
  };
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: (saved: JournalView) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: entry ? "Reflection updated" : "Reflection saved", description: saved.feedbackStale ? "Old Coach P feedback was cleared because your reflection changed." : undefined });
      onSaved?.(saved);
      onDone();
    },
    onError: (error: Error) => toast({ title: "Could not save reflection", description: error.message, variant: "destructive" }),
  });
  const analyze = async () => {
    if (!isPro) { openProOffer("Journal analysis"); return; }
    setAnalysisPending(true);
    try {
      const saved = await save();
      setSavedDraftId(saved.id);
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      const response = await apiRequest("POST", `/api/journal/${saved.id}/ai-coach`);
      const analyzed = await response.json() as JournalView;
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Coach P’s analysis is ready" });
      onSaved?.(analyzed);
      onDone();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not analyze this reflection.";
      if (/402|pro|required|upgrade/i.test(message)) openProOffer("Journal analysis");
      else toast({ title: "Could not analyze reflection", description: message, variant: "destructive" });
    } finally { setAnalysisPending(false); }
  };
  useEffect(() => {
    const prompts = PROMPTS[type];
    setSelectedPromptId(prompts[Math.floor(Math.random() * prompts.length)]?.id || "");
    setFreeWrite(false);
  }, [type]);
  return (
    <div className="space-y-5">
      {!entry && <div className="flex flex-wrap items-center justify-between gap-3">
        {onTypeChange && <JournalTypePicker value={type} onChange={changeType} disabled={Boolean(savedDraftId && !entry)} />}
        <Button
          type="button"
          variant="outline"
          aria-pressed={freeWrite}
          onClick={() => setFreeWrite((current) => !current)}
          className={`min-h-10 shrink-0 border-[#675745] px-3 text-xs ${freeWrite ? "bg-orange-500 text-zinc-950 hover:bg-orange-400" : "text-[#e8ddcd] hover:bg-[#29251f]"}`}
          data-testid="button-journal-free-write"
        >
          {freeWrite ? "Use a prompt" : "Free write"}
        </Button>
      </div>}
      {entry && <div><h2 className="text-lg font-semibold">Edit reflection</h2><p className="text-sm text-zinc-500">Keep the details that matter.</p></div>}
      {entry && savedPrompts.length > 0 && (
        <section className="space-y-3" aria-label="Saved reflection prompts">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Saved prompt responses</p>
          {savedPrompts.map((prompt) => (
            <div key={prompt.promptId} className="space-y-2 rounded-lg border border-[#51463b] bg-[#29251f] p-3">
              <p className="text-sm font-medium leading-relaxed text-[#e8ddcd]">{prompt.question}</p>
              <Textarea value={answers[prompt.promptId] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [prompt.promptId]: event.target.value }))} placeholder="Your response (optional)" className="min-h-[84px] border-zinc-700 bg-[#1b1a18] text-zinc-100" />
            </div>
          ))}
        </section>
      )}
      <div className="relative overflow-hidden rounded-xl border border-[#76634e] border-l-[3px] border-l-orange-500 bg-[#eee5d6] shadow-[0_14px_40px_rgba(0,0,0,.25)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-7 border-r border-[#c9bba6] bg-[#e3d8c7]" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[27px] top-0 w-px bg-[#d0c1ac]" />
        {activePrompt && <div className="relative px-11 pb-1 pt-5 pr-5 text-[#38332d]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c5b2e]">A prompt to get started</p>
          <p className="text-sm font-medium leading-6">{activePrompt.question}</p>
        </div>}
        <label htmlFor="journal-thoughts" className="sr-only">Your thoughts</label>
        <Textarea id="journal-thoughts" value={thoughts} onChange={(event) => setThoughts(event.target.value)} placeholder={activePrompt ? "Write your response…" : "Start anywhere…"} className="relative min-h-[330px] resize-y rounded-none border-0 bg-transparent py-5 pl-11 pr-5 text-[16px] leading-[32px] text-[#38332d] placeholder:text-[#9a8d7c] shadow-none focus-visible:ring-0 sm:min-h-[390px]" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(118, 99, 78, 0.17) 32px)", backgroundPosition: "0 9px" }} data-testid="textarea-journal-thoughts" />
        <span aria-hidden="true" className="absolute right-0 top-5 h-8 w-3 rounded-l-sm bg-orange-500" />
      </div>
      <p className="text-xs text-zinc-500">Private to you. No perfect answer needed.</p>
      <details open={Boolean((entry && (mood || sourceId)) || initialSourceId)} className="group rounded-xl border border-zinc-800 bg-zinc-950/60">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-sm font-medium marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          Add details <span className="text-xs font-normal text-zinc-500">mood or link a session · optional</span>
        </summary>
        <div className="space-y-4 border-t border-zinc-800 px-3.5 py-4">
          <SourcePicker kind={type} sourceId={sourceId} sources={sources} onChange={(nextKind, id) => { setSourceKind(nextKind); setSourceId(id); }} />
          <MoodPicker value={mood} onChange={setMood} />
        </div>
      </details>
      <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
        {entry && <Button variant="outline" className="min-h-11" onClick={onDone}>Cancel</Button>}
        <Button variant="outline" className="min-h-11 flex-1 border-[#675745] text-[#e8ddcd] hover:bg-[#29251f]" disabled={analysisPending || mutation.isPending || !hasReflectionContent} onClick={analyze} data-testid="button-analyze-journal">
          {analysisPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-orange-400" />}Analyze with Coach P{!isPro && <Badge variant="outline" className="ml-2 border-zinc-700 text-[10px]">Pro</Badge>}
        </Button>
        <Button className="min-h-11 flex-1 bg-orange-500 font-semibold text-zinc-950 hover:bg-orange-400" disabled={mutation.isPending || analysisPending || !hasReflectionContent} onClick={() => mutation.mutate()} data-testid="button-save-journal">
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{entry ? "Save changes" : "Save page"}
        </Button>
      </div>
    </div>
  );
}

function CoachPanel({ entry, isPro }: { entry: JournalEntry; isPro: boolean }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { openProOffer } = useProUpgrade();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    if (!isPro) { openProOffer("Journal coaching"); return; }
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history); setDraft(""); setError(""); setPending(true);
    try {
      const response = await apiRequest("POST", "/api/coach-p/chat", { messages: history, journalEntryId: entry.id });
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming is unavailable.");
      const decoder = new TextDecoder();
      let buffer = ""; let assistant = ""; let assistantAdded = false;
      const append = (textPart: string) => {
        assistant += textPart;
        setMessages((current) => {
          if (!assistantAdded) { assistantAdded = true; return [...current, { role: "assistant", content: textPart }]; }
          const last = current[current.length - 1];
          return last?.role === "assistant" ? [...current.slice(0, -1), { ...last, content: last.content + textPart }] : [...current, { role: "assistant", content: textPart }];
        });
      };
      const frame = (raw: string) => {
        const lines = raw.split("\n");
        const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data) return;
        const payload = JSON.parse(data) as { text?: string; message?: string };
        if (event === "delta" && payload.text) append(payload.text);
        if (event === "error") throw new Error(payload.message || "Coach P is unavailable.");
      };
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const frames = buffer.split("\n\n"); buffer = frames.pop() || ""; frames.forEach(frame);
        if (done) break;
      }
      if (buffer.trim()) frame(buffer);
      if (!assistant) throw new Error("Coach P returned no response.");
    } catch (caught) {
      setMessages((current) => current[current.length - 1]?.role === "assistant" ? current.slice(0, -1) : current);
      setError(caught instanceof Error ? caught.message : "Coach P is unavailable right now.");
      toast({ title: "Coach P unavailable", description: "Your reflection is still saved.", variant: "destructive" });
    } finally { setPending(false); }
  };
  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Coach P on this reflection</h3></div>{!isPro && <Badge variant="outline">Pro</Badge>}</div>
      {!isPro ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">Get personalized, conversational coaching on your reflection with PLAYR1 Pro.</div>
      ) : messages.length === 0 ? (
        <Button variant="outline" className="w-full" onClick={() => send("Read this reflection and tell me the most important thing I should understand or work on next.")}><Sparkles className="w-4 h-4 mr-2" />Start Coach P</Button>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto rounded-lg border p-3">
          {messages.map((message, index) => <div key={index} className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${message.role === "user" ? "ml-8 bg-primary/10" : "mr-4 bg-muted"}`}>{message.content}</div>)}
        </div>
      )}
      {isPro && (messages.length > 0 || pending) && <div className="flex gap-2"><Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); send(draft); } }} placeholder="Ask a follow-up..." disabled={pending} /><Button size="icon" onClick={() => send(draft)} disabled={pending || !draft.trim()}>{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}</Button></div>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function EntryDetail({ entry, isPro, onEdit, onDelete, onClose, onAnalyzed }: { entry: JournalEntry; isPro: boolean; onEdit: () => void; onDelete: () => void; onClose: () => void; onAnalyzed: (entry: JournalView) => void }) {
  const { data: source } = useQuery<any>({
    queryKey: ["/api/journal/source", entry.gameId ? "game" : "workout", entry.gameId || entry.trainingLogId],
    queryFn: async () => {
      const response = await fetch(`/api/journal/source/${entry.gameId ? "game" : "workout"}/${entry.gameId || entry.trainingLogId}`);
      if (!response.ok) throw new Error("Source unavailable");
      return response.json();
    },
    enabled: !!entry.gameId || !!entry.trainingLogId,
  });
  const [followUpAnswer, setFollowUpAnswer] = useState(entry.aiFollowUpAnswer || "");
  const [savedFollowUp, setSavedFollowUp] = useState(entry.aiFollowUpAnswer || "");
  const { toast } = useToast();
  const { openProOffer } = useProUpgrade();
  const [analysisPending, setAnalysisPending] = useState(false);
  const analyze = async () => {
    if (!isPro) { openProOffer("Journal analysis"); return; }
    setAnalysisPending(true);
    try {
      const response = await apiRequest("POST", `/api/journal/${entry.id}/ai-coach`);
      const analyzed = await response.json() as JournalView;
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      onAnalyzed(analyzed);
      toast({ title: "Coach P’s analysis is ready" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not analyze this reflection.";
      if (/402|pro|required|upgrade/i.test(message)) openProOffer("Journal analysis");
      else toast({ title: "Could not analyze reflection", description: message, variant: "destructive" });
    } finally { setAnalysisPending(false); }
  };
  const followUpMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/journal/${entry.id}`, { aiFollowUpAnswer: followUpAnswer.trim() }),
    onSuccess: () => { setSavedFollowUp(followUpAnswer.trim()); queryClient.invalidateQueries({ queryKey: ["/api/journal"] }); toast({ title: "Follow-up saved" }); },
  });
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{TYPE_LABELS[entry.type as JournalType]}</h2><p className="text-sm text-muted-foreground">{formatDate(entry.createdAt, true)}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit"><Edit3 className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete"><Trash2 className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></Button></div></div>
      <Button variant="outline" className="w-full border-[#675745] text-[#e8ddcd] hover:bg-[#29251f]" onClick={analyze} disabled={analysisPending}>{analysisPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-orange-400" />}{entry.aiCoachFeedback ? "Refresh Coach P analysis" : "Analyze with Coach P"}{!isPro && <Badge variant="outline" className="ml-2 border-zinc-700">Pro</Badge>}</Button>
      {entry.mood && <div className="text-sm text-muted-foreground">Mood · {MOODS[entry.mood - 1]?.label}</div>}
      <div className="space-y-4">{(entry.responses || []).map((response) => <div key={response.promptId}><p className="text-sm font-medium text-muted-foreground">{response.question}</p><p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{response.answer}</p></div>)}{entry.thoughts && <div><p className="text-sm font-medium text-muted-foreground">Your thoughts</p><p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{entry.thoughts}</p></div>}</div>
      {source && <Card className="bg-muted/40"><CardContent className="p-4 text-sm"><div className="flex items-center gap-2 font-medium mb-2">{source.kind === "game" ? <Trophy className="w-4 h-4 text-primary" /> : <Dumbbell className="w-4 h-4 text-primary" />}{source.kind === "game" ? `${formatDate(source.gameDate)} · vs ${source.opponent || "opponent"}` : `Workout · ${formatDate(source.date)}`}</div>{source.kind === "game" ? <p className="text-muted-foreground">Stats: {source.points || 0} PTS · {source.rebounds || 0} REB · {source.assists || 0} AST</p> : <p className="text-muted-foreground">{source.duration || 0} minutes · {source.logs?.map((log: any) => log.drillTitle).join(", ")}</p>}</CardContent></Card>}
      {(entry as JournalView).feedbackStale && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">Your reflection changed, so the previous Coach P feedback was cleared. Start a fresh conversation for the updated version.</div>}
      {entry.aiCoachFeedback && <div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold mb-2"><Sparkles className="w-4 h-4 text-primary" />Previous Coach P feedback</div><p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.aiCoachFeedback}</p></div>}
       {entry.aiFollowUpQuestion && <div className="space-y-2"><p className="text-sm font-medium">{entry.aiFollowUpQuestion}</p>{savedFollowUp ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{savedFollowUp}</p> : <><Textarea value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="Your response..." /><Button size="sm" disabled={!followUpAnswer.trim() || followUpMutation.isPending} onClick={() => followUpMutation.mutate()}>Save follow-up</Button></>}</div>}
      <CoachPanel entry={entry} isPro={isPro} />
    </div>
  );
}

export default function JournalPage() {
  const [location, navigate] = useLocation();
  const initialParams = new URLSearchParams(location.split("?")[1] || "");
  const initialType = initialParams.get("type") as JournalType | null;
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [mood, setMood] = useState("");
  const [coached, setCoached] = useState("");
  const [linkedSource, setLinkedSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedType, setSelectedType] = useState<JournalType>(() =>
    initialType && ["post-workout", "post-game", "open"].includes(initialType) ? initialType : "open",
  );
  const [selectedEntry, setSelectedEntry] = useState<JournalView | null>(null);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
   const [showAllEntries, setShowAllEntries] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search), 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const requestedType = params.get("type") as JournalType | null;
    if (requestedType && ["post-workout", "post-game", "open"].includes(requestedType)) {
      setSelectedType(requestedType);
    }
  }, [location]);
  const query = new URLSearchParams();
  if (debouncedSearch) query.set("search", debouncedSearch);
  if (type) query.set("type", type);
  if (mood) query.set("mood", mood);
  if (coached) query.set("coached", coached);
  if (linkedSource) query.set("linkedSource", linkedSource);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const { data: entries = [], isLoading, isError, refetch } = useQuery<JournalView[]>({ queryKey: ["/api/journal", query.toString()], queryFn: async () => {
    const response = await fetch(`/api/journal${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error("Could not load your journal.");
    return response.json();
  } });
  const { data: sources = { workouts: [], games: [] } } = useQuery<{ workouts: Source[]; games: Source[] }>({ queryKey: ["/api/journal/sources"] });
  const { data: subscription } = useQuery<{ plan: "free" | "pro" | "pro-infinity" }>({ queryKey: ["/api/billing/subscription"] });
  const isPro = subscription?.plan === "pro" || subscription?.plan === "pro-infinity";
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/journal/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/journal"] }); setDeletingId(null); setSelectedEntry(null); toast({ title: "Entry deleted" }); },
  });
  const clearFilters = () => { setSearch(""); setType(""); setMood(""); setCoached(""); setLinkedSource(""); setFrom(""); setTo(""); };
  const hasFilters = !!(search || type || mood || coached || linkedSource || from || to);
  const visibleEntries = entries;
  const openNew = (nextType: JournalType = "open") => { setEditing(null); setSelectedType(nextType); setShowAllEntries(false); };
  const resetDraft = () => {
    setDraftRevision((current) => current + 1);
    setSelectedType("open");
    if (location.includes("?")) navigate("/journal");
  };
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialSourceKind = params.get("trainingLogId") ? "workout" : params.get("gameId") ? "game" : null;
  const initialSourceId = params.get("trainingLogId") || params.get("gameId");
  return (
    <div className="dark min-h-[100dvh] bg-black text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-7 sm:pt-8">
        <main className="mx-auto w-full max-w-3xl">
          {!showAllEntries ? (
            <section className="space-y-5" aria-label="Write a journal page">
              <div className="flex justify-end">
                <Button variant="outline" className="shrink-0 border-[#51463b] bg-[#1b1a18] text-[#e9e0d4] hover:border-orange-500/60 hover:bg-[#24211d]" onClick={() => setShowAllEntries(true)} data-testid="button-past-entries"><BookOpen className="mr-2 h-4 w-4 text-orange-400" />Past Entries <span className="ml-1 tabular-nums text-zinc-500">{entries.length}</span></Button>
              </div>
              <EntryEditor
                key={`new-journal-editor-${draftRevision}`}
                type={selectedType}
                isPro={isPro}
                onTypeChange={setSelectedType}
                initialSourceKind={initialSourceKind}
                initialSourceId={initialSourceId}
                sources={sources}
                onDone={resetDraft}
                onSaved={(saved) => { queryClient.invalidateQueries({ queryKey: ["/api/journal"] }); setSelectedEntry(saved); }}
              />
            </section>
          ) : <>
          <section className="min-w-0" aria-labelledby="saved-reflections-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">The archive</p>
                <h2 id="saved-reflections-heading" className="text-xl font-bold">Past entries</h2>
              </div>
              <Button variant="outline" className="border-[#51463b] bg-[#1b1a18] text-[#e9e0d4]" onClick={() => setShowAllEntries(false)}>Back to notebook</Button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search journal entries"
                  placeholder="Search your pages"
                  className="h-10 rounded-lg border-zinc-800 bg-[#181817] pl-9 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:border-orange-500"
                  data-testid="input-journal-search"
                />
              </div>
              <details className="group relative shrink-0">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-800 bg-[#181817] px-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 marker:hidden">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter</span>
                  {(type || mood || coached || linkedSource || from || to) && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                </summary>
                <div className="absolute right-0 z-20 mt-2 grid w-[min(88vw,440px)] grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-[#191918] p-3 shadow-xl">
                <select aria-label="Filter by reflection type" value={type} onChange={(event) => setType(event.target.value)} className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="">All types</option><option value="post-workout">Practice</option><option value="post-game">Game</option><option value="open">Open</option>
                </select>
                <select aria-label="Filter by mood" value={mood} onChange={(event) => setMood(event.target.value)} className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                   <option value="">Any mood</option>{MOODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <select aria-label="Filter by coaching" value={coached} onChange={(event) => setCoached(event.target.value)} className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="">Any coaching</option><option value="true">Coach P feedback</option><option value="false">No Coach P feedback</option>
                </select>
                <select aria-label="Filter by linked source" value={linkedSource} onChange={(event) => setLinkedSource(event.target.value)} className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="">Any source</option><option value="workout">Workout</option><option value="game">Game</option><option value="none">No source</option>
                </select>
                <label className="flex min-w-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2">
                  <span className="text-[9px] font-bold uppercase text-zinc-500">From</span>
                  <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" className="h-8 min-w-0 border-0 bg-transparent px-0 text-[10px] text-zinc-200 shadow-none focus-visible:ring-0" />
                </label>
                <label className="flex min-w-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2">
                  <span className="text-[9px] font-bold uppercase text-zinc-500">To</span>
                  <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" className="h-8 min-w-0 border-0 bg-transparent px-0 text-[10px] text-zinc-200 shadow-none focus-visible:ring-0" />
                </label>
                  {hasFilters && <Button variant="ghost" size="sm" className="col-span-2 h-8 justify-start text-xs text-orange-300 hover:bg-zinc-900 hover:text-orange-200" onClick={clearFilters}>Clear search and filters</Button>}
                </div>
              </details>
            </div>

            <div className="space-y-2">
          {isError ? (
            <Card className="rounded-xl border-zinc-800 bg-[#181817]">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <BookOpen className="h-7 w-7 text-orange-400" />
                <p className="font-semibold">Your journal didn’t load</p>
                <p className="text-sm text-zinc-400">Your saved pages are still yours. Try again in a moment.</p>
                <Button variant="outline" onClick={() => refetch()}>Try again</Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-2" aria-label="Loading journal pages">{[1, 2, 3].map((item) => <div key={item} className="h-[86px] animate-pulse rounded-xl border border-zinc-800/70 bg-[#181817]" />)}</div>
          ) : entries.length === 0 ? (
            <Card className="rounded-xl border-dashed border-zinc-700 bg-[#181817]">
              <CardContent className="flex flex-col items-start gap-2 px-5 py-7 text-left">
                <BookOpen className="mb-1 h-6 w-6 text-orange-400" />
                <p className="font-semibold">{hasFilters ? "No pages match" : "Your first page is waiting."}</p>
                <p className="max-w-sm text-sm text-zinc-400">{hasFilters ? "Try a different search or clear your filters." : "Keep a moment from practice, game day, or anything on your mind."}</p>
                <Button className="mt-2 bg-orange-500 text-zinc-950 hover:bg-orange-400" onClick={hasFilters ? clearFilters : () => openNew()}>{hasFilters ? "Clear filters" : "Write the first page"}</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#171716]">
              {visibleEntries.map((entry) => {
                const response = entry.responses?.[0]?.answer || entry.thoughts;
                const source = entry.gameId ? sources.games.find((item) => item.sourceId === entry.gameId) : entry.trainingLogId ? sources.workouts.find((item) => item.sourceId === entry.trainingLogId) : null;
                const created = entry.createdAt ? new Date(entry.createdAt) : null;
                const dateIsValid = created && !Number.isNaN(created.getTime());
                return (
                  <Card
                    key={entry.id}
                    className="group cursor-pointer rounded-none border-0 border-b border-zinc-800/80 bg-transparent shadow-none transition-colors last:border-b-0 hover:bg-[#201f1d]"
                    onClick={() => setSelectedEntry(entry)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedEntry(entry); } }}
                    role="button"
                    tabIndex={0}
                    data-testid={`card-journal-${entry.id}`}
                  >
                    <CardContent className="flex gap-3.5 px-3 py-4 sm:gap-5 sm:px-4">
                      <div className="w-11 shrink-0 border-r border-zinc-800 pr-3 text-center">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-orange-400">{dateIsValid ? created.toLocaleDateString("en-US", { month: "short" }) : "—"}</span>
                        <span className="mt-0.5 block text-xl font-semibold leading-none tabular-nums text-zinc-300">{dateIsValid ? created.getDate() : "—"}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-zinc-100">{TYPE_LABELS[entry.type as JournalType]}{source?.kind === "game" ? ` · vs ${source.opponent || "opponent"}` : source?.kind === "workout" ? " · Practice" : ""}</span>
                          {entry.aiCoachFeedback && <span className="inline-flex items-center gap-1 text-[10px] text-orange-300"><Sparkles className="h-3 w-3" />Coach P</span>}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500">
                          <span>{dateIsValid ? created.toLocaleDateString("en-US", { weekday: "long", year: "numeric" }) : formatDate(entry.createdAt)}</span>
                          {entry.mood && <span className="before:mr-2 before:text-zinc-700 before:content-['·']">{MOODS[entry.mood - 1]?.label}</span>}
                        </p>
                        {response && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{response}</p>}
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-700 transition-colors group-hover:text-orange-300" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </div>
          </section>
           </>}
        </main>
      </div>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="dark max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader><DialogTitle>Journal reflection</DialogTitle><DialogDescription>Private to you</DialogDescription></DialogHeader>
           {selectedEntry && <EntryDetail entry={selectedEntry} isPro={isPro} onAnalyzed={setSelectedEntry} onClose={() => setSelectedEntry(null)} onDelete={() => setDeletingId(selectedEntry.id)} onEdit={() => { setEditing(selectedEntry); setSelectedEntry(null); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="dark max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader className="sr-only"><DialogTitle>Edit journal entry</DialogTitle></DialogHeader>
           {editing && <EntryEditor entry={editing} type={editing.type as JournalType} isPro={isPro} sources={sources} onDone={() => setEditing(null)} onSaved={setSelectedEntry} />}
        </DialogContent>
      </Dialog>
      {selectedEntry && <div className="sr-only"><button onClick={() => setDeletingId(selectedEntry.id)}>Delete</button></div>}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="dark border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader><AlertDialogTitle>Delete this reflection?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive text-destructive-foreground">{deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}