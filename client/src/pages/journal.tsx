import { useEffect, useMemo, useState } from "react";
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
  ArrowLeft, ArrowUp, BookOpen, Brain, CalendarDays, ChevronRight, Dumbbell,
  Edit3, Filter, Loader2, Plus, Search,
  Sparkles, Trash2, Trophy, X,
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
  "post-workout": "Practice", "post-game": "Game", open: "Open",
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
            className={`rounded-lg border p-2 text-center transition-colors ${value === mood.value ? "border-orange-400 bg-orange-500/10" : "border-zinc-800 bg-zinc-950 hover:border-orange-400/50"}`}
            data-testid={`button-mood-${mood.value}`}
          >
            <span className="block text-xl">{mood.emoji}</span>
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
      {!entry && <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-semibold">Start with one question</p><p className="text-xs text-muted-foreground">Answer it, or write freely below.</p></div>
          {promptCount > 0 && selectionMode === "automatic" && <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={() => setSelectedPromptIds(chooseRandomPromptIds(type, promptCount))}><Sparkles className="mr-1.5 h-3.5 w-3.5" />Try another</Button>}
        </div>
        {promptCount > 0 && prompts.map((prompt, index) => (
          <div key={`${prompt.id}-${index}`} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-start justify-between gap-2">
              {selectionMode === "manual" ? <select value={prompt.id} onChange={(event) => selectPrompt(index, event.target.value)} aria-label={`Reflection question ${index + 1}`} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"><option value={prompt.id}>{prompt.question}</option>{PROMPTS[type].filter((candidate) => candidate.id === prompt.id || !selectedPromptIds.includes(candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.question}</option>)}</select> : <p className="flex-1 text-sm font-semibold leading-relaxed">{prompt.question}</p>}
              <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 shrink-0 ${votedPromptIds.includes(prompt.id) ? "text-primary" : "text-muted-foreground"}`} onClick={() => voteMutation.mutate(prompt)} aria-label={votedPromptIds.includes(prompt.id) ? "Remove question upvote" : "Upvote question"}><ArrowUp className="h-3.5 w-3.5" /></Button>
            </div>
            <Textarea value={answers[prompt.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [prompt.id]: event.target.value }))} placeholder="Write what is actually true..." className="min-h-[88px] resize-y border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" data-testid={`textarea-journal-${prompt.id}`} />
          </div>
        ))}
        {promptCount === 0 && <p className="rounded-xl bg-zinc-900 p-3 text-xs text-zinc-400">Question prompts are off. Use Your thoughts below as a free write.</p>}
        <details className="group rounded-xl border border-zinc-800 bg-zinc-950">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-sm font-medium marker:hidden">
            Customize questions <span className="text-xs font-normal text-zinc-400">{promptCount === 0 ? "Free write" : `${promptCount} ${promptCount === 1 ? "question" : "questions"}`} · optional</span>
          </summary>
          <div className="space-y-3 border-t border-zinc-800 px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-medium">How many questions?</p><p className="text-xs text-zinc-400">Choose none, one, or up to three.</p></div>
              <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                {[0, 1, 2, 3].map((count) => <button key={count} type="button" onClick={() => setCount(count)} className={`min-w-8 rounded-md px-2 py-1.5 text-xs transition-colors ${promptCount === count ? "bg-orange-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-100"}`} data-testid={`button-journal-prompt-count-${count}`}>{count}</button>)}
              </div>
            </div>
            {promptCount > 0 && <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                <button type="button" onClick={() => setSelectionMode("automatic")} className={`rounded-md px-2.5 py-1.5 text-xs ${selectionMode === "automatic" ? "bg-zinc-800 font-medium text-zinc-100" : "text-zinc-400"}`}>Pick for me</button>
                <button type="button" onClick={() => setSelectionMode("manual")} className={`rounded-md px-2.5 py-1.5 text-xs ${selectionMode === "manual" ? "bg-zinc-800 font-medium text-zinc-100" : "text-zinc-400"}`}>I’ll choose</button>
              </div>
              {selectionMode === "automatic" && <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedPromptIds(chooseRandomPromptIds(type, promptCount))}><Sparkles className="mr-1.5 h-3.5 w-3.5" />Shuffle</Button>}
            </div>}
          </div>
        </details>
      </div>}
      <div className="space-y-2">
        <p className="text-sm font-medium">Your thoughts <span className="text-xs font-normal text-zinc-400">(optional with prompts)</span></p>
        <Textarea value={thoughts} onChange={(event) => setThoughts(event.target.value)} placeholder="Write anything else you were feeling or thinking..." className="min-h-[120px] resize-none border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500" data-testid="textarea-journal-thoughts" />
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
  const [showAllEntries, setShowAllEntries] = useState(false);
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
  useEffect(() => { setShowAllEntries(false); }, [debouncedSearch, type, mood, coached, linkedSource, from, to]);
  const visibleEntries = showAllEntries ? entries : entries.slice(0, 3);
  const openNew = (nextType: JournalType = "open") => { setEditing(null); setSelectedType(nextType); setNewOpen(true); };
  const closeEditor = () => { setNewOpen(false); setEditing(null); if (location.includes("?")) navigate("/journal"); };
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialSourceKind = params.get("trainingLogId") ? "workout" : params.get("gameId") ? "game" : null;
  const initialSourceId = params.get("trainingLogId") || params.get("gameId");
  return (
    <div className="dark flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100 sm:h-auto sm:min-h-full sm:overflow-visible">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-4 p-4 sm:h-auto sm:min-h-full sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 text-zinc-400 hover:bg-zinc-900 hover:text-white" onClick={() => navigate("/hub")} aria-label="Back to Hub" data-testid="button-back-to-hub">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="truncate text-xl font-bold text-zinc-100">Journal</h1>
          </div>
          <Button
            onClick={() => openNew()}
            className="h-10 shrink-0 bg-orange-500 px-3 text-sm font-bold text-zinc-950 hover:bg-orange-400 sm:px-4"
            data-testid="button-new-journal-entry"
          >
            <Plus className="mr-1.5 h-4 w-4" />New reflection
          </Button>
        </header>

        <div className="flex items-center gap-2.5 rounded-xl border border-orange-500/25 bg-gradient-to-r from-orange-500/10 to-zinc-900/60 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="min-w-0 flex-1 text-xs text-zinc-300">
            {isPro ? "Open a reflection to review it with Coach P." : "Coach P can review your reflections with Pro."}
          </p>
          <Badge className="border border-orange-300/20 bg-orange-400/10 text-[10px] text-orange-200 hover:bg-orange-400/10">{isPro ? "Ready" : "Pro"}</Badge>
        </div>

        <section className="flex min-h-0 flex-1 flex-col gap-3" aria-labelledby="saved-reflections-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="saved-reflections-heading" className="text-lg font-bold">Saved reflections</h2>
            <span className="text-xs text-zinc-500">{entries.length} saved</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reflections"
                className="h-10 rounded-xl border-zinc-800 bg-zinc-900 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500"
                data-testid="input-journal-search"
              />
            </div>
            <details className="group relative shrink-0">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs font-semibold text-zinc-300 transition hover:border-orange-400/50 marker:hidden">
                <Filter className="h-3.5 w-3.5 text-orange-300" />
                <span className="hidden sm:inline">Filters</span>
                {(type || mood || coached || linkedSource || from || to) && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                <ChevronRight className="h-3.5 w-3.5 rotate-90 text-zinc-500 transition group-open:-rotate-90" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 grid w-[min(88vw,560px)] grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-xl">
                <select aria-label="Filter by reflection type" value={type} onChange={(event) => setType(event.target.value)} className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="">All types</option><option value="post-workout">Practice</option><option value="post-game">Game</option><option value="open">Open</option>
                </select>
                <select aria-label="Filter by mood" value={mood} onChange={(event) => setMood(event.target.value)} className="h-9 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="">Any mood</option>{MOODS.map((item) => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
          ) : entries.length === 0 ? (
            <Card className="rounded-xl border-dashed border-zinc-700 bg-zinc-900/50">
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <BookOpen className="h-8 w-8 text-orange-400" />
                <p className="font-semibold">{hasFilters ? "No reflections found" : "No reflections yet"}</p>
                <p className="max-w-sm text-sm text-zinc-400">{hasFilters ? "Try another search or clear your filters." : "Save a moment from practice, a game, or your day."}</p>
                <Button className="mt-1 bg-orange-500 text-zinc-950 hover:bg-orange-400" onClick={hasFilters ? clearFilters : () => openNew()}>{hasFilters ? "Clear filters" : "Start a reflection"}</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleEntries.map((entry) => {
                const response = entry.responses?.[0]?.answer || entry.thoughts;
                const source = entry.gameId ? sources.games.find((item) => item.sourceId === entry.gameId) : entry.trainingLogId ? sources.workouts.find((item) => item.sourceId === entry.trainingLogId) : null;
                const Icon = entry.type === "post-workout" ? Dumbbell : entry.type === "post-game" ? Trophy : Brain;
                return (
                  <Card
                    key={entry.id}
                    className="group cursor-pointer rounded-xl border-zinc-800 bg-zinc-900/50 transition hover:border-orange-500/40 hover:bg-zinc-900"
                    onClick={() => setSelectedEntry(entry)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedEntry(entry); }}
                    role="button"
                    tabIndex={0}
                    data-testid={`card-journal-${entry.id}`}
                  >
                    <CardContent className="flex gap-3 p-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-400/15 bg-orange-500/10 text-orange-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-zinc-100">{TYPE_LABELS[entry.type as JournalType]}</span>
                          {entry.aiCoachFeedback && <Badge className="h-5 gap-1 border border-orange-400/20 bg-orange-500/10 px-2 text-[10px] text-orange-200 hover:bg-orange-500/10"><Sparkles className="h-3 w-3" />Reviewed</Badge>}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-400">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3 text-orange-300/80" />{formatDate(entry.createdAt)}</span>
                          {source?.kind === "game" ? <span>vs {source.opponent || "opponent"}</span> : source?.kind === "workout" ? <span>{source.duration || 0} min workout</span> : null}
                          {entry.mood && <span>{MOODS[entry.mood - 1]?.emoji} {MOODS[entry.mood - 1]?.label}</span>}
                        </p>
                        {response && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{response}</p>}
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
                    </CardContent>
                  </Card>
                );
              })}
              {entries.length > 3 && (
                <Button variant="ghost" className="h-9 w-full text-xs font-semibold text-orange-300 hover:bg-orange-500/10 hover:text-orange-200" onClick={() => setShowAllEntries((current) => !current)}>
                  {showAllEntries ? "Show fewer" : `Show all ${entries.length} reflections`}
                </Button>
              )}
            </div>
          )}
          </div>
        </section>
      </div>

      <Dialog open={newOpen} onOpenChange={(open) => { if (!open) closeEditor(); else setNewOpen(true); }}>
        <DialogContent className="dark max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader><DialogTitle>New reflection</DialogTitle><DialogDescription>Pick the moment, then capture one thing you want to remember.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <JournalTypePicker value={selectedType} onChange={setSelectedType} />
            <Separator />
            {(() => {
              const compatibleSource = (selectedType === "post-game" && initialSourceKind === "game") || (selectedType === "post-workout" && initialSourceKind === "workout");
              return <EntryEditor key={`${selectedType}-${compatibleSource ? initialSourceKind : "none"}-${compatibleSource ? initialSourceId : "none"}`} type={selectedType} initialSourceKind={compatibleSource ? initialSourceKind : null} initialSourceId={compatibleSource ? initialSourceId : null} sources={sources} onDone={closeEditor} onBack={() => setNewOpen(false)} />;
            })()}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="dark max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader><DialogTitle>Journal reflection</DialogTitle><DialogDescription>Private to you</DialogDescription></DialogHeader>
          {selectedEntry && <EntryDetail entry={selectedEntry} isPro={isPro} onClose={() => setSelectedEntry(null)} onDelete={() => setDeletingId(selectedEntry.id)} onEdit={() => { setEditing(selectedEntry); setSelectedEntry(null); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="dark max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader className="sr-only"><DialogTitle>Edit journal entry</DialogTitle></DialogHeader>
          {editing && <EntryEditor entry={editing} type={editing.type as JournalType} sources={sources} onDone={() => setEditing(null)} />}
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