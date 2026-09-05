import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, Dumbbell, Flag, Gamepad2, GraduationCap, Loader2, Menu, MessageSquarePlus, Pencil, Pin, PinOff, Target, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  pinned?: boolean;
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

function inlineCoachPText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[0.9em] text-orange-200">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function CoachPResponse({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: Array<
    | { type: "paragraph"; lines: string[] }
    | { type: "bullet" | "numbered"; items: string[] }
    | { type: "heading" | "callout"; text: string }
    | { type: "image"; alt: string; src: string }
  > = [];
  let paragraph: string[] = [];
  let listType: "bullet" | "numbered" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: paragraph });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }
    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/i);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", alt: image[1] || "Coach P visual", src: image[2] });
      return;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/)
      || line.match(/^\*\*(.+)\*\*$/)
      || (line.length <= 70 && (line.endsWith(":") || /^[A-Z][^.!?]{3,58}$/.test(line))
        ? [line, line.replace(/:$/, "")]
        : null);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1] });
      return;
    }
    const callout = line.match(/^(Key takeaway|Next step|Coach(?:'s|’s) cue|Try this):\s*(.+)$/i);
    if (callout) {
      flushParagraph();
      flushList();
      blocks.push({ type: "callout", text: `${callout[1]}: ${callout[2]}` });
      return;
    }
    const bullet = line.match(/^[-•*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const nextType = bullet ? "bullet" : "numbered";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((bullet ?? numbered)![1]);
      return;
    }
    flushList();
    paragraph.push(line);
  });
  flushParagraph();
  flushList();

  return (
    <div className="space-y-6 text-[15px] leading-7 text-zinc-200">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h3 key={index} className="pt-2 text-xl font-semibold leading-tight tracking-[-0.02em] text-white">{inlineCoachPText(block.text)}</h3>;
        }
        if (block.type === "callout") {
          return (
            <div key={index} className="rounded-r-xl border-l-2 border-orange-400 bg-orange-400/[0.07] px-4 py-3 text-sm leading-6 text-orange-50">
              {inlineCoachPText(block.text)}
            </div>
          );
        }
        if (block.type === "image") {
          return (
            <figure key={index} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_12px_36px_rgba(0,0,0,0.24)]">
              <img src={block.src} alt={block.alt} loading="lazy" className="max-h-80 w-full object-cover" />
              {block.alt && <figcaption className="px-4 py-2 text-xs text-zinc-500">{block.alt}</figcaption>}
            </figure>
          );
        }
        if (block.type === "bullet" || block.type === "numbered") {
          return (
            <ol key={index} className="space-y-3.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-3">
                  {block.type === "numbered" ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-400/30 bg-orange-400/10 text-xs font-semibold text-orange-300">{itemIndex + 1}</span>
                  ) : (
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                  )}
                  <span>{inlineCoachPText(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "paragraph") {
          return <p key={index}>{block.lines.map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < block.lines.length - 1 ? " " : ""}</span>)}</p>;
        }
        return null;
      })}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  if (!isUser) {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="mt-0.5"><CoachPIcon /></div>
        <div className="min-w-0 max-w-[94%] flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300/80">
            <span>Coach P</span>
            <span className="h-px w-8 bg-orange-400/30" />
          </div>
          <CoachPResponse content={message.content} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end py-1">
      <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-gradient-to-br from-orange-400 to-orange-600 px-4 py-3 text-[15px] font-medium leading-7 text-zinc-950 shadow-[0_8px_28px_rgba(249,115,22,0.18)]">
        <p className="whitespace-pre-wrap">{message.content}</p>
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
  const [conversationToDelete, setConversationToDelete] = useState<SavedConversation | null>(null);
  const [conversationToRename, setConversationToRename] = useState<SavedConversation | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
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
      const characterCount = Math.max(1, Math.min(2, Math.ceil(pending.length / 80)));
      const visibleText = pending.slice(0, characterCount);
      pendingAssistantTextRef.current = pending.slice(characterCount);
      setMessages((previous) => {
        const last = previous[previous.length - 1];
        if (last?.role !== "assistant") return [...previous, { role: "assistant", content: visibleText }];
        return [...previous.slice(0, -1), { ...last, content: last.content + visibleText }];
      });
      requestAnimationFrame(() => scrollToBottom());
      typingTimerRef.current = setTimeout(tick, 30);
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

  useEffect(() => {
    if (!chatMutation.isPending) return;
    const stages = [
      "Reading your question...",
      "Checking your player profile...",
      "Finding what matters most...",
      "Building your coaching plan...",
    ];
    let index = 0;
    const timer = window.setInterval(() => {
      if (index >= stages.length - 1) {
        window.clearInterval(timer);
        return;
      }
      index += 1;
      setThinkingStage(stages[index]);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [chatMutation.isPending]);

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

  const togglePinConversation = async (conversation: SavedConversation) => {
    if (chatMutation.isPending) return;
    try {
      await apiRequest("PATCH", `/api/coach-p/conversations/${conversation.id}`, { pinned: !conversation.pinned });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-p/conversations"] });
    } catch {
      setErrorMessage("That chat could not be updated.");
    }
  };

  const saveConversationRename = async () => {
    const title = renameDraft.trim();
    if (!conversationToRename || !title || chatMutation.isPending) return;
    try {
      await apiRequest("PATCH", `/api/coach-p/conversations/${conversationToRename.id}`, { title });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-p/conversations"] });
      setConversationToRename(null);
      setRenameDraft("");
    } catch {
      setErrorMessage("That chat could not be renamed.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080808] text-white">
      <AlertDialog
        open={Boolean(conversationToDelete)}
        onOpenChange={(open) => !open && setConversationToDelete(null)}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Coach P chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This permanently removes the conversation and its coaching history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-white">
              Keep chat
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-400"
              onClick={() => {
                if (conversationToDelete) void deleteConversation(conversationToDelete.id);
                setConversationToDelete(null);
              }}
            >
              Delete chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(conversationToRename)}
        onOpenChange={(open) => {
          if (!open) {
            setConversationToRename(null);
            setRenameDraft("");
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Give this Coach P conversation a name you’ll recognize later.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveConversationRename();
            }}
          >
            <Input
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              maxLength={200}
              autoFocus
              placeholder="e.g. Game-day confidence plan"
              className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400/40"
              data-testid="input-coach-p-rename"
            />
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConversationToRename(null)}
                className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameDraft.trim() || chatMutation.isPending}
                className="bg-orange-500 text-black hover:bg-orange-400"
                data-testid="button-coach-p-save-rename"
              >
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
                          <span className="flex min-w-0 items-center gap-2">
                            {conversation.pinned && <Pin className="h-3 w-3 shrink-0 fill-orange-300 text-orange-300" />}
                            <span className="truncate">{conversation.title}</span>
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setConversationToRename(conversation);
                            setRenameDraft(conversation.title);
                          }}
                          disabled={chatMutation.isPending}
                          className="rounded p-1.5 text-zinc-600 opacity-0 transition-opacity hover:text-orange-300 group-hover:opacity-100 disabled:opacity-50"
                          aria-label={`Rename ${conversation.title}`}
                          title="Rename chat"
                          data-testid={`button-coach-p-drawer-rename-${conversation.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void togglePinConversation(conversation)}
                          disabled={chatMutation.isPending}
                          className="rounded p-1.5 text-zinc-600 transition-colors hover:text-orange-300 disabled:opacity-50"
                          aria-label={conversation.pinned ? `Unpin ${conversation.title}` : `Pin ${conversation.title}`}
                          title={conversation.pinned ? "Unpin chat" : "Pin chat"}
                          data-testid={`button-coach-p-drawer-pin-${conversation.id}`}
                        >
                          {conversation.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setConversationToDelete(conversation)}
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

      <main className="mx-auto flex min-h-0 flex-1 w-full max-w-3xl flex-col px-4 sm:px-6">
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
          <div className="relative flex min-h-[58px] items-center gap-2 rounded-full border border-orange-400/20 bg-zinc-950/95 px-3 py-2 shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_30px_rgba(249,115,22,0.08)] transition-colors focus-within:border-orange-400/45 focus-within:shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_34px_rgba(249,115,22,0.16)]">
            <div className="flex min-w-0 flex-1 items-center">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(draft);
                  }
                }}
                placeholder={canSend ? "Ask Coach P anything about your game..." : "Monthly limit reached — type here after upgrading"}
                disabled={chatMutation.isPending}
                className="min-h-[40px] max-h-32 resize-none rounded-none border-0 bg-transparent px-2 py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                data-testid="textarea-coach-p"
              />
            </div>
            <span className="hidden shrink-0 px-2 text-xs font-medium tracking-wide text-zinc-600 sm:inline">Coach P</span>
              <Button
                size="icon"
                onClick={() => sendMessage(draft)}
                disabled={!draft.trim() || !canSend || chatMutation.isPending}
                className="h-10 w-10 shrink-0 rounded-full bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.22)] hover:bg-orange-400"
                data-testid="button-send-coach-p"
              >
                {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </Button>
          </div>
          <p className="mt-2 text-center text-[10px] tracking-wide text-zinc-700">Shift + Enter for a new line</p>
        </div>
      </main>
    </div>
  );
}