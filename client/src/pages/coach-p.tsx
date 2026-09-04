import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, Bot, Check, Crown, Loader2, Sparkles, Target, Dumbbell, Gamepad2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CoachPUsage = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

type SubscriptionState = {
  plan: "free" | "pro";
  coachP: CoachPUsage;
};

const STARTER_PROMPTS = [
  {
    label: "Find my biggest opportunity",
    prompt: "Look at my PLAYR1 profile and tell me the one skill that would make the biggest difference in my game right now. Explain why, then give me the first two steps to start fixing it.",
    icon: Target,
  },
  {
    label: "Build my next workout",
    prompt: "Build me a realistic 3-day basketball workout plan for this week based on my archetype, bottleneck, current goal, and recent training. Make each session specific with time, sets, reps, and what success looks like.",
    icon: Dumbbell,
  },
  {
    label: "Prepare me for game day",
    prompt: "Based on my PLAYR1 profile, give me a simple game plan for my next game: what to hunt on offense, what to prioritize on defense, and one mental cue I can use when the game gets hard.",
    icon: Gamepad2,
  },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-orange-400" />
        </div>
      )}
      <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${
        isUser
          ? "bg-orange-500 text-black rounded-tr-sm"
          : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm"
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export default function CoachPPage() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [usage, setUsage] = useState<CoachPUsage | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const { data: subscription } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
  });

  const currentUsage = usage ?? subscription?.coachP ?? null;
  const isPro = subscription?.plan === "pro" || currentUsage?.limit === null;
  const canSend = isPro || currentUsage?.remaining == null || currentUsage.remaining > 0;

  const chatMutation = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const response = await apiRequest("POST", "/api/coach-p/chat", { messages: history });
      return response.json() as Promise<{ message: string; coachP: CoachPUsage }>;
    },
    onSuccess: (data) => {
      setMessages((previous) => [...previous, { role: "assistant", content: data.message }]);
      setUsage(data.coachP);
    },
    onError: (error: Error) => {
      if (error.message.includes("COACH_P_LIMIT_REACHED")) {
        setLimitReached(true);
      }
    },
  });

  const sendMessage = (value: string) => {
    const content = value.trim();
    if (!content || chatMutation.isPending || !canSend) return;
    const nextHistory = [...messages, { role: "user" as const, content }];
    setMessages(nextHistory);
    setDraft("");
    setLimitReached(false);
    chatMutation.mutate(nextHistory);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-5 sm:py-8 pb-28">
        <header className="flex items-center justify-between gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/hub")}
            className="text-zinc-500 hover:text-white -ml-2"
            data-testid="button-coach-p-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {isPro ? (
              <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/25"><Crown className="w-3 h-3 mr-1" /> PRO</Badge>
            ) : currentUsage ? (
              <span className="text-xs text-zinc-500">{currentUsage.remaining} of {currentUsage.limit} questions left</span>
            ) : null}
          </div>
        </header>

        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em]">PLAYR1 AI COACH</p>
            <h1 className="text-3xl font-black tracking-tight mt-1">Coach P</h1>
            <p className="text-zinc-500 text-sm mt-1">A coach who knows your game — not a generic chatbot.</p>
          </div>
        </div>

        {messages.length === 0 && (
          <section className="mb-7">
            <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-zinc-950 to-zinc-950 p-5 sm:p-6 mb-4">
              <p className="text-zinc-200 text-base leading-relaxed">
                I’ve got your PLAYR1 profile, assessment, goals, and training history. Ask me something real, and I’ll help you decide what to do next.
              </p>
              <p className="text-zinc-600 text-xs mt-3">Start with one of these, or ask me anything about your development.</p>
            </div>
            <div className="grid gap-3">
              {STARTER_PROMPTS.map(({ label, prompt, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  disabled={chatMutation.isPending || !canSend}
                  className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-950 p-4 flex items-center gap-3 transition-colors hover:border-orange-500/40 hover:bg-zinc-900 disabled:opacity-50"
                  data-testid={`button-coach-p-starter-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-200 flex-1">{label}</span>
                  <ArrowUp className="w-4 h-4 text-zinc-600 rotate-45" />
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.length > 0 && (
          <section className="space-y-5 mb-6">
            {messages.map((message, index) => <MessageBubble key={`${message.role}-${index}`} message={message} />)}
            {chatMutation.isPending && (
              <div className="flex gap-3 items-center text-zinc-500 text-sm">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                </div>
                Coach P is thinking...
              </div>
            )}
          </section>
        )}

        {limitReached && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-5">
            <p className="text-sm font-semibold text-amber-200">You’ve used your 3 Coach P questions this month.</p>
            <p className="text-xs text-amber-200/70 mt-1">Upgrade to PLAYR1 Pro for unlimited coaching conversations.</p>
            <Button size="sm" variant="outline" className="mt-3 border-amber-500/40 text-amber-200 hover:bg-amber-500/10" onClick={() => navigate("/subscription")}>
              View PLAYR1 Pro
            </Button>
          </div>
        )}

        <div className="sticky bottom-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur p-2 shadow-2xl shadow-black">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(draft);
                  }
                }}
                placeholder={canSend ? "Ask Coach P anything..." : "Your free questions are used for this month"}
                disabled={!canSend || chatMutation.isPending}
                className="min-h-[46px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 text-sm"
                data-testid="textarea-coach-p"
              />
              <Button
                size="icon"
                onClick={() => sendMessage(draft)}
                disabled={!draft.trim() || !canSend || chatMutation.isPending}
                className="rounded-xl bg-orange-500 text-black hover:bg-orange-400 shrink-0"
                data-testid="button-send-coach-p"
              >
                {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-2">Coach P uses your PLAYR1 profile to make each answer specific to you.</p>
        </div>
      </div>
    </div>
  );
}