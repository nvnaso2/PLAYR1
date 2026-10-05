import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUp, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/emoji-picker";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SupportRecipient = {
  displayName: string;
  image?: string;
};

type SupportMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type PlayerSupportResponse = {
  available: boolean;
  recipient: SupportRecipient | null;
  messages: SupportMessage[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FounderIcon() {
  return (
    <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200/70 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 text-zinc-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_5px_18px_rgba(249,115,22,0.25)]" aria-hidden="true">
      <span className="absolute inset-0 -z-10 rounded-full bg-orange-500/25 blur-md" />
      <MessageCircle className="h-4 w-4" />
    </span>
  );
}

function FounderMessage({
  message,
  isMine,
  senderName,
}: {
  message: SupportMessage;
  isMine: boolean;
  senderName: string;
}) {
  if (isMine) {
    return (
      <div className="group flex justify-end py-1" data-testid={`cohort-founder-message-${message.id}`} title={formatTime(message.createdAt)} tabIndex={0}>
        <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-gradient-to-br from-orange-400 to-orange-600 px-3.5 py-2.5 text-sm font-medium leading-[1.55] text-zinc-950 shadow-[0_8px_28px_rgba(249,115,22,0.18)]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <p className="mt-0.5 max-h-0 overflow-hidden text-[9px] font-normal leading-normal text-orange-950/60 opacity-0 transition-all group-hover:max-h-4 group-hover:opacity-100 group-focus-within:max-h-4 group-focus-within:opacity-100">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2.5 py-1" data-testid={`cohort-founder-message-${message.id}`} title={formatTime(message.createdAt)} tabIndex={0}>
      <FounderIcon />
      <div className="min-w-0 max-w-[94%] flex-1">
        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/80">
          <span>{senderName}</span>
          <span className="h-px w-8 bg-orange-400/30" />
        </div>
        <div className="text-sm leading-[1.55] text-zinc-200">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <p className="mt-1 max-h-0 overflow-hidden text-[9px] text-zinc-600 opacity-0 transition-all group-hover:max-h-4 group-hover:opacity-100 group-focus-within:max-h-4 group-focus-within:opacity-100">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ShootingCohortPrivateChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const supportQuery = useQuery<PlayerSupportResponse>({
    queryKey: ["/api/support/messages"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/support/messages", { content });
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/support/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unread"] });
    },
    onError: (error: Error) => {
      toast({ title: "Message not sent", description: error.message, variant: "destructive" });
    },
  });

  const messages = supportQuery.data?.messages ?? [];
  const recipient = supportQuery.data?.recipient;
  const isUnavailable = supportQuery.data?.available === false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const content = draft.trim();
    if (content && !sendMutation.isPending) sendMutation.mutate(content);
  };

  return (
    <section className="flex min-h-[400px] flex-1 flex-col" aria-label="Private conversation with the Founder" data-testid="shooting-cohort-private-chat">
      {supportQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-3 text-sm text-zinc-500" data-testid="shooting-cohort-private-chat-loading">
          <Loader2 className="h-4 w-4 animate-spin text-orange-400" />Loading your private conversation…
        </div>
      ) : isUnavailable ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center" data-testid="shooting-cohort-private-chat-unavailable">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400"><MessageCircle className="h-7 w-7" /></div>
          <h3 className="text-base font-semibold text-white">Founder messages are unavailable</h3>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">The private conversation will be available when the support account is configured.</p>
        </div>
      ) : supportQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center" data-testid="shooting-cohort-private-chat-error">
          <p className="text-sm text-red-300">We couldn’t load this conversation.</p>
          <Button variant="ghost" onClick={() => void supportQuery.refetch()} className="mt-2 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200">Try again</Button>
        </div>
      ) : (
        <>
          <header className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <FounderIcon />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{recipient?.displayName || "Founder"}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/80">Private 1:1 · Founder</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 px-2.5 py-1 text-[10px] font-medium text-emerald-300"><ShieldCheck className="mr-1 h-3 w-3" />Private</span>
          </header>

          <div className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-1 py-2" data-testid="shooting-cohort-private-messages">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                <MessageCircle className="mb-3 h-8 w-8 text-orange-400/70" />
                <p className="font-semibold text-zinc-200">Start your private conversation</p>
                <p className="mt-1 max-w-xs text-sm text-zinc-500">Send the Founder a question or share what you’re working on.</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <FounderMessage
                    key={message.id}
                    message={message}
                    isMine={message.senderId === user?.id}
                    senderName={recipient?.displayName || "Founder"}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="relative mt-3 flex min-h-[58px] items-center gap-2 rounded-full border border-orange-400/20 bg-zinc-950/95 px-3 py-2 shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_30px_rgba(249,115,22,0.08)] transition-colors focus-within:border-orange-400/45 focus-within:shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_34px_rgba(249,115,22,0.16)]">
            <EmojiPicker onEmojiSelect={(emoji) => setDraft((current) => current + emoji)} />
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Message the Founder privately…"
              className="min-h-[40px] max-h-32 resize-none rounded-none border-0 bg-transparent px-2 py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
              disabled={sendMutation.isPending}
              data-testid="shooting-cohort-private-message-input"
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.22)] hover:bg-orange-400"
              onClick={send}
              disabled={!draft.trim() || sendMutation.isPending}
              aria-label="Send private message"
              data-testid="shooting-cohort-private-message-send"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] tracking-wide text-zinc-700">Shift + Enter for a new line</p>
        </>
      )}
    </section>
  );
}
