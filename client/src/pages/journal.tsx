import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Trophy,
  Brain,
  Sparkles,
  Trash2,
  Loader2,
  Lock,
  MessageSquareQuote,
} from "lucide-react";
import type { JournalEntry } from "@shared/schema";

type JournalType = "post-workout" | "post-game" | "open";

const MOOD_LABELS = ["", "Frustrated", "Below Average", "Average", "Good", "On Fire"];
const MOOD_EMOJIS = ["", "😤", "😕", "😐", "😊", "🔥"];

const PROMPTS: Record<JournalType, Array<{ id: string; question: string }>> = {
  "post-workout": [
    { id: "pw1", question: "What's one thing that clicked today that would have been hard for you 3 months ago?" },
    { id: "pw2", question: "What shot or move kept breaking down — and what's the real reason?" },
    { id: "pw3", question: "Rate your focus 1–10. What was pulling you out of it?" },
    { id: "pw4", question: "If you had 15 more minutes, what would you work on and why?" },
    { id: "pw5", question: "What are you still avoiding in your game right now?" },
  ],
  "post-game": [
    { id: "pg1", question: "What moment from today do you keep replaying in your head?" },
    { id: "pg2", question: "When did you stop trusting yourself — what triggered it?" },
    { id: "pg3", question: "Who challenged you most today? What did they expose?" },
    { id: "pg4", question: "Rate your competitiveness 1–10. What would a 10 have looked like?" },
    { id: "pg5", question: "What's the gap between how you played and how you know you can play?" },
  ],
  "open": [
    { id: "op1", question: "What's on your mind about your game right now?" },
    { id: "op2", question: "What would your future self thank you for working on this week?" },
    { id: "op3", question: "What's one belief about your game you want to challenge?" },
  ],
};

function selectPrompts(type: JournalType): Array<{ id: string; question: string }> {
  const pool = PROMPTS[type];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, type === "open" ? 3 : 4);
}

function MoodSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">How are you feeling?</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((m) => (
          <button
            key={m}
            data-testid={`button-mood-${m}`}
            onClick={() => onChange(m)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
              value === m
                ? "border-primary bg-primary/10 scale-105"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="text-2xl">{MOOD_EMOJIS[m]}</span>
            <span className="text-xs text-muted-foreground font-medium">{MOOD_LABELS[m]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeSelect({ onSelect }: { onSelect: (type: JournalType) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">New Journal Entry</h2>
        <p className="text-sm text-muted-foreground">What are you reflecting on?</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {[
          { type: "post-workout" as JournalType, icon: Dumbbell, label: "After a Workout", desc: "Reflect on a training session" },
          { type: "post-game" as JournalType, icon: Trophy, label: "After a Game", desc: "Process competition and performance" },
          { type: "open" as JournalType, icon: Brain, label: "Open Reflection", desc: "Whatever's on your mind" },
        ].map(({ type, icon: Icon, label, desc }) => (
          <button
            key={type}
            data-testid={`button-journal-type-${type}`}
            onClick={() => onSelect(type)}
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryFlow({
  type,
  onBack,
  onComplete,
  isPro,
}: {
  type: JournalType;
  onBack: () => void;
  onComplete: () => void;
  isPro: boolean;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"prompts" | "ai-coach">("prompts");
  const [prompts] = useState(() => selectPrompts(type));
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [createdEntryId, setCreatedEntryId] = useState<string | null>(null);
  const [aiEntry, setAiEntry] = useState<JournalEntry | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const responses = prompts.map((p) => ({
        promptId: p.id,
        question: p.question,
        answer: answers[p.id] || "",
      }));
      const res = await apiRequest("POST", "/api/journal", { type, responses });
      return res.json();
    },
    onSuccess: async (data: JournalEntry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      setCreatedEntryId(data.id);
      if (isPro) {
        setStep("ai-coach");
        aiCoachMutation.mutate(data.id);
      } else {
        toast({ title: "Reflection saved", description: "Keep showing up." });
        onComplete();
      }
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const aiCoachMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await apiRequest("POST", `/api/journal/${entryId}/ai-coach`, {});
      return res.json();
    },
    onSuccess: (data: JournalEntry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      setAiEntry(data);
    },
    onError: () => toast({ title: "AI Coach unavailable", description: "Your reflection was saved.", variant: "destructive" }),
  });

  const followUpMutation = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const res = await apiRequest("PUT", `/api/journal/${id}`, { aiFollowUpAnswer: answer });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Reflection complete", description: "Your coach has heard you." });
      onComplete();
    },
  });

  const [followUpAnswer, setFollowUpAnswer] = useState("");

  const currentQ = prompts[currentPrompt];
  const allAnswered = prompts.every((p) => (answers[p.id] || "").trim().length > 0);

  if (step === "prompts") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => currentPrompt === 0 ? onBack() : setCurrentPrompt((p) => p - 1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground font-medium">
            {currentPrompt + 1} / {prompts.length}
          </span>
          <div className="w-5 h-5" />
        </div>

        <div className="flex gap-1 mb-2">
          {prompts.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentPrompt ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="min-h-[120px]">
          <p className="text-base font-medium leading-relaxed mb-4">{currentQ.question}</p>
          <Textarea
            value={answers[currentQ.id] || ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
            placeholder="Be honest with yourself..."
            className="min-h-[140px] resize-none"
            data-testid={`textarea-journal-answer-${currentPrompt}`}
          />
        </div>

        <div className="flex gap-3">
          {currentPrompt < prompts.length - 1 ? (
            <Button
              className="flex-1"
              onClick={() => setCurrentPrompt((p) => p + 1)}
              disabled={!(answers[currentQ.id] || "").trim()}
              data-testid="button-journal-next"
            >
              Next
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={() => createMutation.mutate()}
              disabled={!allAnswered || createMutation.isPending}
              data-testid="button-journal-submit"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
              ) : (
                isPro ? "Save & Get Coaching" : "Save Reflection"
              )}
            </Button>
          )}
        </div>

        {!isPro && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">AI Coach</strong> — personalized feedback after each reflection — is a Pro feature.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (step === "ai-coach") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Coach Feedback</h2>
            <p className="text-sm text-muted-foreground">Based on your reflection</p>
          </div>
        </div>

        {aiCoachMutation.isPending && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Your coach is reviewing your session...</p>
          </div>
        )}

        {aiEntry && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiEntry.aiCoachFeedback}</p>
            </div>

            {aiEntry.aiFollowUpQuestion && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">{aiEntry.aiFollowUpQuestion}</p>
                </div>
                <Textarea
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="Take your time with this one..."
                  className="min-h-[100px] resize-none"
                  data-testid="textarea-followup-answer"
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onComplete}
                    data-testid="button-skip-followup"
                  >
                    Skip
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!followUpAnswer.trim() || followUpMutation.isPending}
                    onClick={() => followUpMutation.mutate({ id: aiEntry.id, answer: followUpAnswer })}
                    data-testid="button-submit-followup"
                  >
                    {followUpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                  </Button>
                </div>
              </div>
            )}

            {!aiEntry.aiFollowUpQuestion && (
              <Button className="w-full" onClick={onComplete} data-testid="button-done">
                Done
              </Button>
            )}
          </div>
        )}

        {aiCoachMutation.isError && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Your reflection was saved but AI feedback is unavailable right now.</p>
            <Button className="w-full" onClick={onComplete}>Continue</Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function EntryCard({
  entry,
  onClick,
  onDelete,
}: {
  entry: JournalEntry;
  onClick: () => void;
  onDelete: () => void;
}) {
  const typeIcons: Record<string, React.ElementType> = {
    "post-workout": Dumbbell,
    "post-game": Trophy,
    "open": Brain,
  };
  const typeLabels: Record<string, string> = {
    "post-workout": "After Workout",
    "post-game": "After Game",
    "open": "Open Reflection",
  };
  const Icon = typeIcons[entry.type] || Brain;
  const responses = (entry.responses || []) as Array<{ question: string; answer: string }>;
  const preview = responses[0]?.answer;
  const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "";

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-all group"
      onClick={onClick}
      data-testid={`card-journal-${entry.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{typeLabels[entry.type]}</span>
                {entry.aiCoachFeedback && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Sparkles className="w-3 h-3" /> Coached
                  </Badge>
                )}
                {entry.mood && (
                  <span className="text-base leading-none">{MOOD_EMOJIS[entry.mood]}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
              {preview && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{preview}</p>
              )}
            </div>
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            data-testid={`button-delete-journal-${entry.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function EntryDetail({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const { toast } = useToast();
  const [followUpAnswer, setFollowUpAnswer] = useState(entry.aiFollowUpAnswer || "");
  const responses = (entry.responses || []) as Array<{ question: string; answer: string }>;

  const followUpMutation = useMutation({
    mutationFn: async (answer: string) => {
      return await apiRequest("PUT", `/api/journal/${entry.id}`, { aiFollowUpAnswer: answer });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Follow-up saved" });
    },
  });

  const typeLabels: Record<string, string> = {
    "post-workout": "After Workout",
    "post-game": "After Game",
    "open": "Open Reflection",
  };
  const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }) : "";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{typeLabels[entry.type]}</h2>
          <p className="text-sm text-muted-foreground">{date}</p>
        </div>
        {entry.mood && (
          <div className="flex items-center gap-1.5">
            <span className="text-2xl">{MOOD_EMOJIS[entry.mood]}</span>
            <span className="text-sm text-muted-foreground">{MOOD_LABELS[entry.mood]}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {responses.map((r, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{r.question}</p>
            <p className="text-sm leading-relaxed">{r.answer}</p>
          </div>
        ))}
      </div>

      {entry.aiCoachFeedback && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Coach Feedback</h3>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.aiCoachFeedback}</p>
            </div>
          </div>
        </>
      )}

      {entry.aiFollowUpQuestion && (
        <>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MessageSquareQuote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{entry.aiFollowUpQuestion}</p>
            </div>
            {entry.aiFollowUpAnswer ? (
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{entry.aiFollowUpAnswer}</p>
            ) : (
              <div className="space-y-2 pl-6">
                <Textarea
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="Your response..."
                  className="min-h-[80px] resize-none"
                />
                <Button
                  size="sm"
                  disabled={!followUpAnswer.trim() || followUpMutation.isPending}
                  onClick={() => followUpMutation.mutate({ id: createdEntryId!, answer: followUpAnswer })}
                >
                  {followUpMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function JournalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<JournalType | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/profile"],
  });

  const isPro = profile?.subscriptionPlan === "pro";

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/journal/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Entry deleted" });
      setDeletingId(null);
    },
  });

  const handleNewEntry = () => {
    setSelectedType(null);
    setNewEntryOpen(true);
  };

  const handleComplete = () => {
    setNewEntryOpen(false);
    setSelectedType(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reflect on your game. Grow as a player.
          </p>
        </div>
        <Button onClick={handleNewEntry} data-testid="button-new-journal-entry">
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Pro banner for free users */}
      {!isPro && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Upgrade to Pro for AI Coach feedback</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                After each reflection, your AI coach analyzes your answers alongside your training data and gives personalized coaching. You're currently on the free tier.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">No entries yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start reflecting after your next workout or game.
              </p>
            </div>
            <Button onClick={handleNewEntry} data-testid="button-start-journal">
              <Plus className="w-4 h-4 mr-2" />
              Write First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={() => setViewingEntry(entry)}
              onDelete={() => setDeletingId(entry.id)}
            />
          ))}
        </div>
      )}

      {/* New Entry Dialog */}
      <Dialog open={newEntryOpen} onOpenChange={(o) => { setNewEntryOpen(o); if (!o) setSelectedType(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>
          {!selectedType ? (
            <TypeSelect onSelect={(t) => setSelectedType(t)} />
          ) : (
            <EntryFlow
              type={selectedType}
              onBack={() => setSelectedType(null)}
              onComplete={handleComplete}
              isPro={isPro}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Entry Dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={(o) => { if (!o) setViewingEntry(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Journal Entry</DialogTitle>
          </DialogHeader>
          {viewingEntry && (
            <EntryDetail entry={viewingEntry} onClose={() => setViewingEntry(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This reflection will be permanently deleted. You can't undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-journal"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
