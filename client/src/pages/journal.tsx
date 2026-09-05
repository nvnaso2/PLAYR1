import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft, ArrowUp, BookOpen, Brain, CalendarDays, ChevronRight, Dumbbell, Edit3,
  Gamepad2, Loader2, Plus, Search, Sparkles, Trash2, Trophy, X,
} from "lucide-react";
import type { Game, JournalEntry, TrainingLog } from "@shared/schema";
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
  { value: 1, label: "Frustrated", emoji: "😤" },
  { value: 2, label: "Below average", emoji: "😕" },
  { value: 3, label: "Average", emoji: "😐" },
  { value: 4, label: "Good", emoji: "😊" },
  { value: 5, label: "On fire", emoji: "🔥" },
];
const TYPE_LABELS: Record<JournalType, string> = {
  "post-workout": "After practice / workout", "post-game": "After game", open: "Open reflection",
};
const PROMPTS: Record<JournalType, JournalPrompt[]> = {
  "post-workout": getJournalPrompts("post-workout"),
  "post-game": getJournalPrompts("post-game"),
  open: getJournalPrompts("open"),
};

function chooseRandomPromptIds(type: JournalType, count: number) {
  return [...PROMPTS[type]].sort(() => Math.random() - 0.5).slice(0, count).map((prompt) => prompt.id);
}

function formatDate(value?: string | Date | null, long = false) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-US", long
    ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function sourceLabel(entry: JournalEntry) {
  if (entry.gameId) return "Linked game";
  if (entry.trainingLogId) return "Linked workout";
  return "No source linked";
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
            className={`rounded-lg border p-2 text-center transition-colors ${value === mood.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            data-testid={`button-mood-${mood.value}`}
          >
            <span className="block text-xl">{mood.emoji}</span>
            <span className="block text-[10px] text-muted-foreground">{mood.label}</span>
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
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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

function JournalTypePicker({ value, onChange }: { value: JournalType; onChange: (value: JournalType) => void }) {
  const options: Array<{ value: JournalType; label: string; icon: typeof Dumbbell }> = [
    { value: "post-workout", label: "Practice", icon: Dumbbell },
    { value: "post-game", label: "Game", icon: Trophy },
    { value: "open", label: "Open", icon: Brain },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Reflecting on</p>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map(({ value: optionValue, label, icon: Icon }) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
              value === optionValue ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            }`}
            data-testid={`button-journal-type-${optionValue}`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${value === optionValue ? "text-primary" : "text-muted-foreground"}`} />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryEditor({
  entry, type, initialSourceKind, initialSourceId, sources, onDone, onBack,
}: {
  entry?: JournalEntry;
  type: JournalType;
  initialSourceKind?: SourceKind | null;
  initialSourceId?: string | null;
  sources: { workouts: Source[]; games: Source[] };
  onDone: () => void;
  onBack?: () => void;
}) {
  const { toast } = useToast();
  const [promptCount, setPromptCount] = useState(() => entry ? Math.min(3, entry.responses?.length || 0) : 1);
  const [selectionMode, setSelectionMode] = useState<"automatic" | "manual">("automatic");
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>(() =>
    entry?.responses?.map((response) => response.promptId) || chooseRandomPromptIds(type, 1),
  );
  const prompts = useMemo(() => {
    if (entry) return entry.responses?.map((response) => ({ id: response.promptId, question: response.question })) || [];
    return selectedPromptIds
      .map((id) => PROMPTS[type].find((prompt) => prompt.id === id))
      .filter((prompt): prompt is JournalPrompt => Boolean(prompt));
  }, [entry, selectedPromptIds, type]);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries((entry?.responses || []).map((response) => [response.promptId, response.answer])));
  const [thoughts, setThoughts] = useState(entry?.thoughts || "");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(entry?.gameId ? "game" : entry?.trainingLogId ? "workout" : initialSourceKind || null);
  const [sourceId, setSourceId] = useState<string | null>(entry?.gameId || entry?.trainingLogId || initialSourceId || null);
  const { data: voteData } = useQuery<{ promptIds: string[] }>({
    queryKey: ["/api/journal/prompt-votes"],
    enabled: !entry,
  });
  const votedPromptIds = voteData?.promptIds || [];
  const voteMutation = useMutation({
    mutationFn: async (prompt: { id: string; question: string; category?: JournalType }) => {
      const voted = votedPromptIds.includes(prompt.id);
      return apiRequest(voted ? "DELETE" : "POST", voted ? `/api/journal/prompt-votes/${prompt.id}` : "/api/journal/prompt-votes", voted ? undefined : { promptId: prompt.id, category: prompt.category || type });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/journal/prompt-votes"] }),
  });

  useEffect(() => {
    if (entry || selectionMode !== "automatic") return;
    setSelectedPromptIds(chooseRandomPromptIds(type, promptCount));
  }, [entry, promptCount, selectionMode, type]);

  const setCount = (count: number) => {
    setPromptCount(count);
    if (selectionMode === "manual") {
      setSelectedPromptIds((current) => {
        const next = current.slice(0, count);
        while (next.length < count) {
          const nextPrompt = PROMPTS[type].find((prompt) => !next.includes(prompt.id));
          if (!nextPrompt) break;
          next.push(nextPrompt.id);
        }
        return next;
      });
    }
  };

  const selectPrompt = (index: number, promptId: string) => {
    setSelectedPromptIds((current) => current.map((id, currentIndex) => currentIndex === index ? promptId : id));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const responses = prompts.map((prompt) => ({ promptId: prompt.id, question: prompt.question, answer: (answers[prompt.id] || "").trim() }));
      if (responses.some((response) => !response.answer)) throw new Error("Answer each selected reflection question before saving.");
      if (!responses.length && !thoughts.trim()) throw new Error("Add something to Your Thoughts before saving.");
       const payload = {
         ...(entry ? {} : { type }), mood, responses, thoughts: thoughts.trim() || null,
        trainingLogId: sourceKind === "workout" ? sourceId : null,
        gameId: sourceKind === "game" ? sourceId : null,
      };
      const response = await apiRequest(entry ? "PUT" : "POST", entry ? `/api/journal/${entry.id}` : "/api/journal", payload);
      return response.json();
    },
    onSuccess: (saved: JournalView) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: entry ? "Reflection updated" : "Reflection saved", description: saved.feedbackStale ? "Old Coach P feedback was cleared because your reflection changed." : undefined });
      onDone();
    },
    onError: (error: Error) => toast({ title: "Could not save reflection", description: error.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {onBack && <Button size="icon" variant="ghost" onClick={onBack}><ChevronRight className="w-4 h-4 rotate-180" /></Button>}
        <div><h2 className="text-lg font-semibold">{entry ? "Edit reflection" : `New ${TYPE_LABELS[type].toLowerCase()}`}</h2><p className="text-sm text-muted-foreground">Be honest. This is for your development.</p></div>
      </div>
      <SourcePicker kind={type} sourceId={sourceId} sources={sources} onChange={(nextKind, id) => { setSourceKind(nextKind); setSourceId(id); }} />
      <MoodPicker value={mood} onChange={setMood} />
      {!entry && <div className="rounded-lg border border-border/70 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">Reflection questions</p><p className="text-xs text-muted-foreground">Choose how much structure you want.</p></div>
          <div className="flex rounded-md border p-0.5">
            {[0, 1, 2, 3].map((count) => <button key={count} type="button" onClick={() => setCount(count)} className={`min-w-7 rounded px-1.5 py-1 text-xs ${promptCount === count ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} data-testid={`button-journal-prompt-count-${count}`}>{count}</button>)}
          </div>
        </div>
        {promptCount > 0 && <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-md border p-0.5">
            <button type="button" onClick={() => setSelectionMode("automatic")} className={`rounded px-2 py-1 text-xs ${selectionMode === "automatic" ? "bg-muted font-medium" : "text-muted-foreground"}`}>Auto pick</button>
            <button type="button" onClick={() => setSelectionMode("manual")} className={`rounded px-2 py-1 text-xs ${selectionMode === "manual" ? "bg-muted font-medium" : "text-muted-foreground"}`}>Choose</button>
          </div>
          {selectionMode === "automatic" && <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedPromptIds(chooseRandomPromptIds(type, promptCount))}><Sparkles className="mr-1.5 h-3.5 w-3.5" />Shuffle</Button>}
        </div>}
        {promptCount === 0 && <p className="text-xs text-muted-foreground">No prompts selected. Use Your Thoughts below as a free write.</p>}
        {promptCount > 0 && prompts.map((prompt, index) => (
          <div key={`${prompt.id}-${index}`} className="space-y-2 rounded-md bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-2">
              {selectionMode === "manual" ? <select value={prompt.id} onChange={(event) => selectPrompt(index, event.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"><option value={prompt.id}>{prompt.question}</option>{PROMPTS[type].filter((candidate) => candidate.id === prompt.id || !selectedPromptIds.includes(candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.question}</option>)}</select> : <p className="flex-1 text-sm font-medium leading-relaxed">{prompt.question}</p>}
              <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 shrink-0 ${votedPromptIds.includes(prompt.id) ? "text-primary" : "text-muted-foreground"}`} onClick={() => voteMutation.mutate(prompt)} aria-label={votedPromptIds.includes(prompt.id) ? "Remove question upvote" : "Upvote question"}><ArrowUp className="h-3.5 w-3.5" /></Button>
            </div>
            <Textarea value={answers[prompt.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [prompt.id]: event.target.value }))} placeholder="Write what is actually true..." className="min-h-[90px] resize-none" data-testid={`textarea-journal-${prompt.id}`} />
          </div>
        ))}
      </div>}
      <div className="space-y-2">
        <p className="text-sm font-medium">Your thoughts <span className="text-xs font-normal text-muted-foreground">(optional with prompts)</span></p>
        <Textarea value={thoughts} onChange={(event) => setThoughts(event.target.value)} placeholder="Write anything else you were feeling or thinking..." className="min-h-[120px] resize-none" data-testid="textarea-journal-thoughts" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button className="flex-1" disabled={mutation.isPending} onClick={() => mutation.mutate()} data-testid="button-save-journal">
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{entry ? "Save changes" : "Save reflection"}
        </Button>
      </div>
    </div>
  );
}

function CoachPanel({ entry, isPro }: { entry: JournalEntry; isPro: boolean }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    if (!isPro) { navigate("/subscription"); return; }
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

function EntryDetail({ entry, isPro, onEdit, onDelete, onClose }: { entry: JournalEntry; isPro: boolean; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
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
  const { toast } = useToast();
  const followUpMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/journal/${entry.id}`, { aiFollowUpAnswer: followUpAnswer.trim() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/journal"] }); toast({ title: "Follow-up saved" }); },
  });
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{TYPE_LABELS[entry.type as JournalType]}</h2><p className="text-sm text-muted-foreground">{formatDate(entry.createdAt, true)}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit"><Edit3 className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete"><Trash2 className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></Button></div></div>
      {entry.mood && <div className="text-sm text-muted-foreground">{MOODS[entry.mood - 1].emoji} {MOODS[entry.mood - 1].label}</div>}
      <div className="space-y-4">{(entry.responses || []).map((response) => <div key={response.promptId}><p className="text-sm font-medium text-muted-foreground">{response.question}</p><p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{response.answer}</p></div>)}{entry.thoughts && <div><p className="text-sm font-medium text-muted-foreground">Your thoughts</p><p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{entry.thoughts}</p></div>}</div>
      {source && <Card className="bg-muted/40"><CardContent className="p-4 text-sm"><div className="flex items-center gap-2 font-medium mb-2">{source.kind === "game" ? <Trophy className="w-4 h-4 text-primary" /> : <Dumbbell className="w-4 h-4 text-primary" />}{source.kind === "game" ? `${formatDate(source.gameDate)} · vs ${source.opponent || "opponent"}` : `Workout · ${formatDate(source.date)}`}</div>{source.kind === "game" ? <p className="text-muted-foreground">Stats: {source.points || 0} PTS · {source.rebounds || 0} REB · {source.assists || 0} AST</p> : <p className="text-muted-foreground">{source.duration || 0} minutes · {source.logs?.map((log: any) => log.drillTitle).join(", ")}</p>}</CardContent></Card>}
      {(entry as JournalView).feedbackStale && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">Your reflection changed, so the previous Coach P feedback was cleared. Start a fresh conversation for the updated version.</div>}
      {entry.aiCoachFeedback && <div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold mb-2"><Sparkles className="w-4 h-4 text-primary" />Previous Coach P feedback</div><p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.aiCoachFeedback}</p></div>}
      {entry.aiFollowUpQuestion && <div className="space-y-2"><p className="text-sm font-medium">{entry.aiFollowUpQuestion}</p>{entry.aiFollowUpAnswer ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.aiFollowUpAnswer}</p> : <><Textarea value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="Your response..." /><Button size="sm" disabled={!followUpAnswer.trim() || followUpMutation.isPending} onClick={() => followUpMutation.mutate()}>Save follow-up</Button></>}</div>}
      <CoachPanel entry={entry} isPro={isPro} />
    </div>
  );
}

export default function JournalPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [mood, setMood] = useState("");
  const [coached, setCoached] = useState("");
  const [linkedSource, setLinkedSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<JournalType>("open");
  const [selectedEntry, setSelectedEntry] = useState<JournalView | null>(null);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search), 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const requestedType = params.get("type") as JournalType | null;
    if (requestedType && ["post-workout", "post-game", "open"].includes(requestedType)) {
      setSelectedType(requestedType); setNewOpen(true);
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
  const { data: entries = [], isLoading } = useQuery<JournalView[]>({ queryKey: ["/api/journal", query.toString()], queryFn: async () => (await fetch(`/api/journal${query.toString() ? `?${query}` : ""}`)).json() });
  const { data: sources = { workouts: [], games: [] } } = useQuery<{ workouts: Source[]; games: Source[] }>({ queryKey: ["/api/journal/sources"] });
  const { data: subscription } = useQuery<{ plan: "free" | "pro" | "pro-infinity" }>({ queryKey: ["/api/billing/subscription"] });
  const isPro = subscription?.plan === "pro" || subscription?.plan === "pro-infinity";
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/journal/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/journal"] }); setDeletingId(null); setSelectedEntry(null); toast({ title: "Entry deleted" }); },
  });
  const clearFilters = () => { setSearch(""); setType(""); setMood(""); setCoached(""); setLinkedSource(""); setFrom(""); setTo(""); };
  const hasFilters = !!(search || type || mood || coached || linkedSource || from || to);
  const openNew = () => { setEditing(null); setSelectedType("open"); setNewOpen(true); };
  const closeEditor = () => { setNewOpen(false); setEditing(null); if (location.includes("?")) navigate("/journal"); };
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialSourceKind = params.get("trainingLogId") ? "workout" : params.get("gameId") ? "game" : null;
  const initialSourceId = params.get("trainingLogId") || params.get("gameId");
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-2"><Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate("/profile-hub")} aria-label="Back to Profile" data-testid="button-back-to-profile"><ArrowLeft className="w-4 h-4" /></Button><div><h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" />Journal</h1><p className="text-sm text-muted-foreground mt-1">Reflect on your game. Grow as a player.</p></div></div><Button onClick={openNew} data-testid="button-new-journal-entry"><Plus className="w-4 h-4 mr-2" />New entry</Button></div>
       <Card><CardContent className="p-4 space-y-3"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reflections and Coach P feedback..." className="pl-9" data-testid="input-journal-search" /></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><select value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="">All types</option><option value="post-workout">After practice / workout</option><option value="post-game">After game</option><option value="open">Open</option></select><select value={mood} onChange={(event) => setMood(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="">Any mood</option>{MOODS.map((item) => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}</select><select value={coached} onChange={(event) => setCoached(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="">Any coaching</option><option value="true">Coached</option><option value="false">Not coached</option></select><select value={linkedSource} onChange={(event) => setLinkedSource(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="">Any source</option><option value="workout">Workout</option><option value="game">Game</option><option value="none">No source</option></select></div><div className="grid grid-cols-2 gap-2"><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" /><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" /></div>{hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}</CardContent></Card>
       {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div> : entries.length === 0 ? <Card className="border-dashed"><CardContent className="flex flex-col items-center text-center gap-3 py-12"><BookOpen className="w-10 h-10 text-muted-foreground" /><p className="font-medium">{hasFilters ? "No reflections match those filters" : "No entries yet"}</p><p className="text-sm text-muted-foreground">{hasFilters ? "Try a different search or clear the filters." : "Start reflecting after your next workout or game."}</p><Button onClick={hasFilters ? clearFilters : openNew}>{hasFilters ? "Clear filters" : "Write first entry"}</Button></CardContent></Card> : <div className="space-y-3">{entries.map((entry) => { const response = entry.responses?.[0]?.answer || entry.thoughts; const source = entry.gameId ? sources.games.find((item) => item.sourceId === entry.gameId) : entry.trainingLogId ? sources.workouts.find((item) => item.sourceId === entry.trainingLogId) : null; return <Card key={entry.id} className="group cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedEntry(entry)} data-testid={`card-journal-${entry.id}`}><CardContent className="p-4 flex gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{entry.type === "post-workout" ? <Dumbbell className="w-4 h-4 text-primary" /> : entry.type === "post-game" ? <Trophy className="w-4 h-4 text-primary" /> : <Brain className="w-4 h-4 text-primary" />}</div><div className="min-w-0 flex-1"><div className="flex gap-2 flex-wrap items-center"><span className="text-sm font-medium">{TYPE_LABELS[entry.type as JournalType]}</span>{entry.aiCoachFeedback && <Badge variant="secondary" className="text-xs gap-1"><Sparkles className="w-3 h-3" /> Coached</Badge>}<Badge variant="outline" className="text-xs">{sourceLabel(entry)}</Badge>{entry.mood && <span>{MOODS[entry.mood - 1].emoji}</span>}</div><p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(entry.createdAt)}{source?.kind === "game" ? ` · vs ${source.opponent || "opponent"}` : source?.kind === "workout" ? ` · ${source.duration || 0} min` : ""}</p>{response && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{response}</p>}</div><ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" /></CardContent></Card>; })}</div>}
        <Dialog open={newOpen} onOpenChange={(open) => { if (!open) closeEditor(); else setNewOpen(true); }}><DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New reflection</DialogTitle><DialogDescription>Choose a small amount of structure, or just write.</DialogDescription></DialogHeader><div className="space-y-4"><JournalTypePicker value={selectedType} onChange={setSelectedType} /><Separator />{(() => { const compatibleSource = (selectedType === "post-game" && initialSourceKind === "game") || (selectedType === "post-workout" && initialSourceKind === "workout"); return <EntryEditor key={`${selectedType}-${compatibleSource ? initialSourceKind : "none"}-${compatibleSource ? initialSourceId : "none"}`} type={selectedType} initialSourceKind={compatibleSource ? initialSourceKind : null} initialSourceId={compatibleSource ? initialSourceId : null} sources={sources} onDone={closeEditor} onBack={() => setNewOpen(false)} />; })()}</div></DialogContent></Dialog>
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}><DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Journal reflection</DialogTitle><DialogDescription>Private to you</DialogDescription></DialogHeader>{selectedEntry && <EntryDetail entry={selectedEntry} isPro={isPro} onClose={() => setSelectedEntry(null)} onDelete={() => setDeletingId(selectedEntry.id)} onEdit={() => { setEditing(selectedEntry); setSelectedEntry(null); }} />}</DialogContent></Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader className="sr-only"><DialogTitle>Edit journal entry</DialogTitle></DialogHeader>{editing && <EntryEditor entry={editing} type={editing.type as JournalType} sources={sources} onDone={() => setEditing(null)} />}</DialogContent></Dialog>
      {selectedEntry && <div className="sr-only"><button onClick={() => setDeletingId(selectedEntry.id)}>Delete</button></div>}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this reflection?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive text-destructive-foreground">{deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}