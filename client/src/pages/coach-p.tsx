import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, Bot, Crosshair, Dumbbell, Flag, Gamepad2, Loader2, Sparkles, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
    prompt: "Build me a realistic 3-day basketball workout plan for this week based on my archetype, bottleneck, current goal, recent training, available drills, and active programs. Make each session specific with time, sets, reps, and what success looks like.",
    icon: Dumbbell,
  },
  {
    label: "Prepare me for game day",
    prompt: "Based on my PLAYR1 profile, training history, game statistics, and assessment, give me a simple game plan for my next game: what to hunt on offense, what to prioritize on defense, and one mental cue I can use when the game gets hard.",
    icon: Gamepad2,
  },
  {
    label: "Build my PLAYR1 goal",
    prompt: "Use the primary basketball goal I shared in my onboarding assessment and the Coach P Says guidance for my archetype to help me build a clear PLAYR1 goal. Make that Coach P Says guidance a central part of the goal: explain how the goal fits my player identity, addresses my growth edge, and can be measured. Start by telling me what you understood, then ask me the single best question to make it specific and achievable. Do not jump straight to a workout plan yet.",
    icon: Flag,
  },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-orange-400" />
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: subscription } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
  });

  const currentUsage = usage ?? subscription?.coachP ?? null;
  const isUnlimited = subscription?.plan === "pro" || currentUsage?.limit === null;
  const canSend = isUnlimited || currentUsage?.remaining == null || currentUsage.remaining > 0;

  const chatMutation = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const response = await apiRequest("POST", "/api/coach-p/chat", { messages: history });
      return response.json() as Promise<{ message: string; coachP: CoachPUsage }>;
    },
    onSuccess: (data) => {
      setMessages((previous) => [...previous, { role: "assistant", content: data.message }]);
      setUsage(data.coachP);
      setErrorMessage(null);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    onError: (error: Error) => {
      if (error.message.includes("COACH_P_LIMIT_REACHED")) {
        setLimitReached(true);
        setErrorMessage("You’ve used your 3 Coach P questions this month.");
      } else {
        setErrorMessage("Coach P couldn’t answer that right now. Try sending it again.");
      }
    },
  });

  const sendMessage = (value: string) => {
    const content = value.trim();
    if (!content || chatMutation.isPending || !canSend) return;
    const nextHistory = [...messages, { role: "user" as const, content }];
    setMessages(nextHistory);
    setDraft("");
    setErrorMessage(null);
    setLimitReached(false);
    chatMutation.mutate(nextHistory);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-16 border-b border-zinc-900 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hub")}
            className="text-zinc-500 hover:text-white"
            data-testid="button-coach-p-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="font-semibold tracking-tight">Coach P</span>
          </div>
        </div>
        <span className="text-xs text-zinc-500">
          {isUnlimited ? "Unlimited" : currentUsage ? `${currentUsage.remaining} left this month` : ""}
        </span>
      </header>

      <main className="max-w-3xl mx-auto min-h-[calc(100vh-4rem)] px-4 sm:px-6 flex flex-col">
        <section className={`flex-1 ${messages.length === 0 ? "flex items-center" : "pt-8"}`}>
          <div className="w-full">
            {messages.length === 0 ? (
              <div className="w-full max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-8">
                  <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-orange-400" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight">What are you working on?</h1>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_PROMPTS.map(({ label, prompt, icon: Icon }, index) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(prompt)}
                      disabled={chatMutation.isPending || !canSend}
                      className={`min-h-[58px] rounded-xl border bg-zinc-950 px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-zinc-900 disabled:opacity-50 ${
                        index === 3 ? "border-orange-500/35 hover:border-orange-500/60" : "border-zinc-800 hover:border-zinc-700"
                      }`}
                      data-testid={`button-coach-p-starter-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${index === 3 ? "text-orange-400" : "text-zinc-500"}`} />
                      <span className="text-sm text-zinc-200">{label}</span>
                      <ArrowUp className="w-3.5 h-3.5 text-zinc-600 rotate-45 ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message, index) => (
                  <MessageBubble key={`${message.role}-${index}`} message={message} />
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3 items-center text-zinc-500 text-sm">
                    <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                    </div>
                    Coach P is thinking...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </section>

        {errorMessage && (
          <div className="flex items-center justify-between gap-3 text-xs text-red-300 py-3">
            <span>{errorMessage}</span>
            {limitReached && (
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-200" onClick={() => navigate("/subscription")}>
                View options
              </Button>
            )}
          </div>
        )}

        <div className="sticky bottom-4 py-4 bg-black">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
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
                placeholder={canSend ? "Message Coach P..." : "Your monthly questions are used"}
                disabled={!canSend || chatMutation.isPending}
                className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 text-sm"
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
          <p className="text-center text-[10px] text-zinc-700 mt-2">Shift + Enter for a new line</p>
        </div>
      </main>
    </div>
  );
}