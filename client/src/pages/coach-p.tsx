import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, Dumbbell, Flag, Gamepad2, GraduationCap, Loader2, Menu, MessageSquarePlus, Target, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

type CoachPStreamResult = {
  message: string;
  coachP: CoachPUsage;
  conversationId: string;
};

type SavedConversation = {
  id: string;
  title: string;
  messageCount: number;
  summary: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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

function CoachPIcon({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLarge = size === "lg";
  return (
    <div className={`relative shrink-0 ${isLarge ? "w-14 h-14" : "w-9 h-9"}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-md" />
      <div className={`relative w-full h-full rounded-full bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 border border-orange-200/70 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_5px_18px_rgba(249,115,22,0.35)] ${isLarge ? "rotate-[-4deg]" : ""}`}>
        <GraduationCap className={`${isLarge ? "w-7 h-7" : "w-5 h-5"} text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]`} strokeWidth={2.4} />
      </div>
      <span className={`absolute -right-0.5 -bottom-0.5 rounded-full bg-zinc-950 border border-orange-400/70 text-orange-300 font-black leading-none flex items-center justify-center ${isLarge ? "w-5 h-5 text-[9px]" : "w-4 h-4 text-[8px]"}`}>
        P
      </span>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1"><CoachPIcon /></div>
      )}
      <div className={`relative max-w-[88%] overflow-hidden rounded-2xl px-4 py-3 ${
        isUser
          ? "bg-orange-500 text-black rounded-tr-sm"
          : "bg-gradient-to-br from-white via-zinc-100 to-zinc-300 border border-white/80 text-zinc-900 rounded-tl-sm shadow-[0_10px_30px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]"
      }`}>
        {!isUser && <span className="absolute inset-x-3 top-0 h-px bg-white/90" />}
        <p className="relative z-10 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
  const [thinkingStage, setThinkingStage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<SavedConversation[]>({
    queryKey: ["/api/coach-p/conversations"],
  });

  const { data: subscription } = useQuery<SubscriptionState>({
    queryKey: ["/api/billing/subscription"],
  });

  const currentUsage = usage ?? subscription?.coachP ?? null;
  const isUnlimited = subscription?.plan === "pro" || (subscription?.plan as string | undefined) === "pro-infinity" || currentUsage?.limit === null;
  const canSend = isUnlimited || currentUsage?.remaining == null || currentUsage.remaining > 0;

  const chatMutation = useMutation({
    mutationFn: async (request: { message: string; conversationId: string | null }): Promise<CoachPStreamResult> => {
      const response = await apiRequest("POST", "/api/coach-p/chat", request);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Coach P streaming is unavailable.");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamedMessage = "";
      let result: CoachPStreamResult | null = null;
      let assistantMessageAdded = false;

      const appendAssistantText = (text: string) => {
        streamedMessage += text;
        setMessages((previous) => {
          if (!assistantMessageAdded) {
            assistantMessageAdded = true;
            return [...previous, { role: "assistant", content: text }];
          }
          const last = previous[previous.length - 1];
          if (last?.role !== "assistant") return [...previous, { role: "assistant", content: text }];
          return [...previous.slice(0, -1), { ...last, content: last.content + text }];
        });
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }));
      };

      const handleFrame = (frame: string) => {
        const lines = frame.split("\n");
        const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
        const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data) return;
         const payload = JSON.parse(data) as { stage?: string; text?: string; message?: string; coachP?: CoachPUsage; conversationId?: string };
        if (event === "status" && payload.stage) {
          setThinkingStage(payload.stage);
        } else if (event === "delta" && payload.text) {
          appendAssistantText(payload.text);
        } else if (event === "done" && payload.message && payload.coachP && payload.conversationId) {
          result = { message: payload.message, coachP: payload.coachP, conversationId: payload.conversationId };
          setThinkingStage(null);
        } else if (event === "error") {
          throw new Error(payload.message || "Coach P is unavailable right now.");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        frames.forEach(handleFrame);
        if (done) break;
      }
      if (buffer.trim()) handleFrame(buffer);
      if (!result) throw new Error(streamedMessage ? "Coach P response ended early." : "Coach P returned no coaching response.");
      return result;
    },
    onSuccess: (data) => {
      setUsage(data.coachP);
      setConversationId(data.conversationId);
      setErrorMessage(null);
      setThinkingStage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/coach-p/conversations"] });
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    onError: (error: Error) => {
      setThinkingStage(null);
      setMessages((previous) => previous[previous.length - 1]?.role === "assistant" ? previous.slice(0, -1) : previous);
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
    setThinkingStage("Starting Coach P...");
    chatMutation.mutate({ message: content, conversationId });
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const startNewConversation = () => {
    if (chatMutation.isPending) return;
    setConversationId(null);
    setMessages([]);
    setDraft("");
    setErrorMessage(null);
    setLimitReached(false);
    setThinkingStage(null);
    setHistoryOpen(false);
  };

  const openConversation = async (id: string) => {
    if (chatMutation.isPending || loadingConversation) return;
    setLoadingConversation(true);
    try {
      const response = await apiRequest("GET", `/api/coach-p/conversations/${id}`);
      const data = await response.json() as { conversation: SavedConversation; messages: ChatMessage[] };
      setConversationId(data.conversation.id);
      setMessages(data.messages);
      setDraft("");
      setErrorMessage(null);
      setLimitReached(false);
      setHistoryOpen(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }));
    } catch {
      setErrorMessage("That conversation could not be loaded.");
    } finally {
      setLoadingConversation(false);
    }
  };

  const deleteConversation = async (id: string) => {
    if (chatMutation.isPending) return;
    try {
      await apiRequest("DELETE", `/api/coach-p/conversations/${id}`);
      if (conversationId === id) startNewConversation();
      queryClient.invalidateQueries({ queryKey: ["/api/coach-p/conversations"] });
    } catch {
      setErrorMessage("That conversation could not be deleted.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-16 border-b border-zinc-900 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-white hover:bg-zinc-900"
                aria-label="Open Coach P conversations"
                data-testid="button-coach-p-history"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[320px] max-w-[85vw] border-zinc-800 bg-zinc-950 p-0 text-white"
            >
              <SheetHeader className="border-b border-zinc-800 px-5 py-5 text-left">
                <SheetTitle className="text-white">Coach P</SheetTitle>
                <SheetDescription className="text-zinc-500">
                  Your saved coaching conversations
                </SheetDescription>
              </SheetHeader>
              <div className="p-3">
                <Button
                  className="w-full justify-start bg-orange-500 text-black hover:bg-orange-400"
                  onClick={startNewConversation}
                  disabled={chatMutation.isPending}
                  data-testid="button-coach-p-drawer-new"
                >
                  <MessageSquarePlus className="w-4 h-4 mr-2" />
                  New chat
                </Button>
              </div>
              <div className="px-3 pb-4 overflow-y-auto max-h-[calc(100vh-150px)]">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Recent chats
                </p>
                {conversations.length === 0 ? (
                  <p className="px-2 py-6 text-sm leading-relaxed text-zinc-500">
                    Your Coach P conversations will appear here.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`group flex items-center rounded-lg ${
                          conversationId === conversation.id ? "bg-orange-500/15 text-orange-100" : "hover:bg-zinc-900"
                        }`}
                      >
                        <button
                          onClick={() => openConversation(conversation.id)}
                          disabled={loadingConversation || chatMutation.isPending}
                          className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm text-zinc-300 hover:text-white disabled:opacity-50"
                          title={conversation.title}
                          data-testid={`button-coach-p-drawer-conversation-${conversation.id}`}
                        >
                          {conversation.title}
                        </button>
                        <button
                          onClick={() => deleteConversation(conversation.id)}
                          disabled={chatMutation.isPending}
                          className="mr-1 rounded p-1.5 text-zinc-600 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100 disabled:opacity-50"
                          aria-label={`Delete ${conversation.title}`}
                          data-testid={`button-coach-p-drawer-delete-${conversation.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
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
            <CoachPIcon />
            <span className="font-semibold tracking-tight">Coach P</span>
          </div>
        </div>
        <span className="text-xs text-zinc-500">
          {isUnlimited ? "Unlimited" : currentUsage ? `${currentUsage.remaining} left this month` : ""}
        </span>
      </header>

      <main className="max-w-3xl mx-auto min-h-[calc(100vh-4rem)] px-4 sm:px-6 flex flex-col">
        <section className={`flex-1 ${messages.length === 0 ? "pt-10 sm:pt-14" : "pt-8"}`}>
          <div className="w-full">
            {messages.length === 0 ? (
              <div className="w-full max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-8">
                  <CoachPIcon size="lg" />
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
                  <div className="flex gap-3 items-center text-zinc-500 text-sm" aria-live="polite">
                    <CoachPIcon />
                    <span>{thinkingStage ?? "Coach P is thinking..."}</span>
                    <span className="inline-flex gap-1" aria-hidden="true">
                      <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                      <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse [animation-delay:300ms]" />
                    </span>
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

        <div className="sticky bottom-4 z-30 isolate -mx-1 px-1 py-4 bg-black shadow-[0_-18px_28px_rgba(0,0,0,0.98)]">
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