import { useEffect, useRef, useState } from "react";
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
  const paragraphs = message.content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5"><CoachPIcon /></div>
      )}
      <div className={`relative max-w-[88%] sm:max-w-[82%] overflow-hidden ${
        isUser
          ? "rounded-2xl rounded-tr-md bg-gradient-to-br from-orange-400 to-orange-600 px-4 py-3 text-zinc-950 shadow-[0_8px_28px_rgba(249,115,22,0.18)]"
          : "rounded-2xl rounded-tl-md border border-white/[0.07] bg-gradient-to-br from-zinc-900 to-zinc-950 px-4 py-4 text-zinc-100 shadow-[0_14px_40px_rgba(0,0,0,0.26)]"
      }`}>
        {!isUser && (
          <>
            <span className="absolute inset-y-4 left-0 w-px bg-gradient-to-b from-transparent via-orange-400/80 to-transparent" />
            <span className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-orange-500/[0.06] blur-2xl" />
          </>
        )}
        <div className={`relative z-10 text-[15px] leading-7 ${isUser ? "font-medium" : "space-y-3 text-zinc-200"}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            paragraphs.map((paragraph, index) => {
              const lines = paragraph.split("\n");
              const isList = lines.every((line) => /^[-•*]\s+/.test(line.trim()));
              if (isList) {
                return (
                  <ul key={index} className="space-y-2 pl-0">
                    {lines.map((line, lineIndex) => (
                      <li key={lineIndex} className="flex gap-2.5">
                        <span className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                        <span>{line.trim().replace(/^[-•*]\s+/, "")}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              const heading = paragraph.match(/^(#{1,3}\s+|\*\*)(.+?)(\*\*)?$/);
              if (heading && lines.length === 1) {
                return <p key={index} className="font-semibold text-white">{heading[2]}</p>;
              }
              return <p key={index} className="whitespace-pre-wrap">{paragraph}</p>;
            })
          )}
        </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingAssistantTextRef = useRef("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantStreamStartedRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  };

  const stopTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
    pendingAssistantTextRef.current = "";
    assistantStreamStartedRef.current = false;
  };

  const pumpAssistantText = () => {
    if (typingTimerRef.current) return;
    const tick = () => {
      const pending = pendingAssistantTextRef.current;
      if (!pending) {
        typingTimerRef.current = null;
        return;
      }
      const characterCount = Math.max(1, Math.min(4, Math.ceil(pending.length / 45)));
      const visibleText = pending.slice(0, characterCount);
      pendingAssistantTextRef.current = pending.slice(characterCount);
      setMessages((previous) => {
        const last = previous[previous.length - 1];
        if (last?.role !== "assistant") return [...previous, { role: "assistant", content: visibleText }];
        return [...previous.slice(0, -1), { ...last, content: last.content + visibleText }];
      });
      requestAnimationFrame(() => scrollToBottom());
      typingTimerRef.current = setTimeout(tick, 14);
    };
    typingTimerRef.current = setTimeout(tick, 0);
  };

  const waitForAssistantText = () => new Promise<void>((resolve) => {
    const check = () => {
      if (!pendingAssistantTextRef.current && !typingTimerRef.current) {
        resolve();
        return;
      }
      setTimeout(check, 20);
    };
    check();
  });

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

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
        if (!assistantMessageAdded) {
          assistantMessageAdded = true;
          assistantStreamStartedRef.current = true;
          setMessages((previous) => [...previous, { role: "assistant", content: "" }]);
        }
        pendingAssistantTextRef.current += text;
        pumpAssistantText();
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
      await waitForAssistantText();
      return result;
    },
    onSuccess: (data) => {
      setUsage(data.coachP);
      setConversationId(data.conversationId);
      setErrorMessage(null);
      setThinkingStage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/coach-p/conversations"] });
      assistantStreamStartedRef.current = false;
      requestAnimationFrame(() => scrollToBottom("smooth"));
    },
    onError: (error: Error) => {
      stopTyping();
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
    stopTyping();
    setThinkingStage("Reading your question...");
    chatMutation.mutate({ message: content, conversationId });
    requestAnimationFrame(() => scrollToBottom("smooth"));
  };

  const startNewConversation = () => {
    if (chatMutation.isPending) return;
    stopTyping();
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
      requestAnimationFrame(() => scrollToBottom());
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
    <div className="h-dvh overflow-hidden bg-[#080808] text-white">
      <header className="relative z-40 h-16 border-b border-white/[0.06] bg-[#080808]/90 px-4 backdrop-blur-xl sm:px-6 flex items-center justify-between">
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
        {(isUnlimited || currentUsage) && (
          <div className="relative overflow-hidden rounded-full border border-orange-400/20 bg-zinc-950 px-3.5 py-2 shadow-[0_0_28px_rgba(249,115,22,0.12)]">
            <span className="absolute -right-3 -top-4 h-10 w-10 rounded-full bg-orange-500/25 blur-xl" />
            <span className="relative flex items-center gap-2 text-xs font-semibold tracking-wide text-orange-100">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.85)]" />
              </span>
              {isUnlimited ? "Unlimited" : `${currentUsage?.remaining ?? 0} / ${currentUsage?.limit ?? 3} left`}
            </span>
          </div>
        )}
      </header>

      <main className="mx-auto flex h-[calc(100dvh-4rem)] min-h-0 w-full max-w-3xl flex-col px-4 sm:px-6">
        <section
          ref={scrollRef}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth ${
            messages.length === 0 ? "pt-10 sm:pt-14" : "pt-7"
          } pb-6 [scrollbar-color:rgb(63_63_70)_transparent]`}
        >
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
              <div className="space-y-5 pb-2">
                {messages.map((message, index) => (
                  <MessageBubble key={`${message.role}-${index}`} message={message} />
                ))}
                {chatMutation.isPending && !assistantStreamStartedRef.current && (
                  <div className="flex gap-3 items-center text-zinc-400 text-sm" aria-live="polite">
                    <CoachPIcon />
                    <span className="transition-all">{thinkingStage ?? "Building your answer..."}</span>
                    <span className="inline-flex gap-1" aria-hidden="true">
                      <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                      <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-orange-400 animate-pulse [animation-delay:300ms]" />
                    </span>
                  </div>
                )}
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

        <div className="relative z-30 shrink-0 border-t border-white/[0.05] bg-[#080808] pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/95 p-2 shadow-[0_14px_50px_rgba(0,0,0,0.45),0_0_26px_rgba(249,115,22,0.04)] focus-within:border-orange-400/30">
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
                className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
                data-testid="textarea-coach-p"
              />
              <Button
                size="icon"
                onClick={() => sendMessage(draft)}
                disabled={!draft.trim() || !canSend || chatMutation.isPending}
                className="rounded-xl bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:bg-orange-400 shrink-0"
                data-testid="button-send-coach-p"
              >
                {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] tracking-wide text-zinc-700">Shift + Enter for a new line</p>
        </div>
      </main>
    </div>
  );
}