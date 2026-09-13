import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowUp, ClipboardList, Flame, Inbox, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmojiPicker } from "@/components/emoji-picker";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getObjectUrl, nativeFetch, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCustomWorkoutRequests } from "@/components/admin-custom-workout-requests";
import { AdminCommunity3Pointers } from "@/components/admin-community-3-pointers";

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

type SupportConversation = {
  playerId: string;
  playerName: string;
  playerImage?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type AdminInboxResponse = {
  available: boolean;
  recipient: SupportRecipient | null;
  conversations: SupportConversation[];
};

type AdminThreadResponse = {
  available: boolean;
  recipient: SupportRecipient | null;
  player: { id: string; displayName: string; image?: string };
  messages: SupportMessage[];
};

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SupportIcon({ large = false }: { large?: boolean }) {
  return (
    <div className={`relative shrink-0 ${large ? "h-14 w-14" : "h-9 w-9"}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-orange-500/25 blur-md" />
      <div className="relative flex h-full w-full items-center justify-center rounded-full border border-orange-200/70 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 text-zinc-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_5px_18px_rgba(249,115,22,0.35)]">
        <MessageCircle className={large ? "h-7 w-7" : "h-4 w-4"} />
      </div>
    </div>
  );
}

function MessageBubble({ message, currentUserId, mine, assistantLabel = "Your basketball coach" }: { message: SupportMessage; currentUserId?: string; mine?: boolean; assistantLabel?: string }) {
  const isMine = mine ?? message.senderId === currentUserId;
  if (!isMine) {
    return (
      <div className="group flex items-start gap-2.5 py-1.5" data-testid={`support-message-${message.id}`} tabIndex={0} title={formatMessageTime(message.createdAt)}>
        <div className="mt-0.5"><SupportIcon /></div>
        <div className="min-w-0 max-w-[94%] flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/80">
            <span>{assistantLabel}</span>
            <span className="h-px w-8 bg-orange-400/30" />
          </div>
          <div className="text-sm leading-[1.55] text-zinc-200">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <p className="mt-1 max-h-0 overflow-hidden text-[9px] tracking-normal text-zinc-600 opacity-0 transition-all duration-200 group-hover:max-h-4 group-hover:opacity-100 group-focus-within:max-h-4 group-focus-within:opacity-100">
              {formatMessageTime(message.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="group flex justify-end py-1" data-testid={`support-message-${message.id}`} tabIndex={0} title={formatMessageTime(message.createdAt)}>
      <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-gradient-to-br from-orange-400 to-orange-600 px-3.5 py-2.5 text-sm font-medium leading-[1.55] text-zinc-950 shadow-[0_8px_28px_rgba(249,115,22,0.18)]">
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className="mt-0.5 max-h-0 overflow-hidden text-[9px] font-normal leading-normal text-orange-950/60 opacity-0 transition-all duration-200 group-hover:max-h-4 group-hover:opacity-100 group-focus-within:max-h-4 group-focus-within:opacity-100">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function MessageComposer({
  value,
  onChange,
  onSend,
  isPending,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isPending: boolean;
  placeholder: string;
  testId: string;
}) {
  return (
    <div className="relative flex min-h-[58px] items-center gap-2 rounded-full border border-orange-400/20 bg-zinc-950/95 px-3 py-2 shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_30px_rgba(249,115,22,0.08)] transition-colors focus-within:border-orange-400/45 focus-within:shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_34px_rgba(249,115,22,0.16)]">
      <EmojiPicker onEmojiSelect={(emoji) => onChange(value + emoji)} />
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        className="min-h-[40px] max-h-32 resize-none rounded-none border-0 bg-transparent px-2 py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
        disabled={isPending}
        data-testid={testId}
      />
      <Button
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.22)] hover:bg-orange-400"
        onClick={onSend}
        disabled={!value.trim() || isPending}
        aria-label="Send message"
        data-testid={`${testId}-send`}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function SupportMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");

  const recipientQuery = useQuery<{ available: boolean; recipient: SupportRecipient | null }>({
    queryKey: ["/api/support/recipient"],
  });
  const supportQuery = useQuery<PlayerSupportResponse>({
    queryKey: ["/api/support/messages"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/support/messages", { content });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/support/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unread"] });
    },
    onError: (error: Error) => {
      toast({ title: "Message not sent", description: error.message, variant: "destructive" });
    },
  });

  const messages = supportQuery.data?.messages ?? [];
  const recipient = supportQuery.data?.recipient ?? recipientQuery.data?.recipient;
  const isUnavailable = recipientQuery.isError || recipientQuery.data?.available === false || supportQuery.data?.available === false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col bg-[#080808] px-4 pb-8 pt-5 sm:px-6 sm:pt-7">
      <div className="mb-5 flex items-center gap-3">
        <SupportIcon large />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80">DIRECT MESSAGE TO THE FOUNDER</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Talk through your game</h1>
        </div>
      </div>
      <p className="mb-5 max-w-xl text-sm leading-6 text-zinc-500">
          Yo, it’s Nick, founder of The PLAYR1 Project. I’m here to talk about anything: your game, confidence, goals, the game of basketball, or just whatever you’re working through. Shoot me a message. I respond to every message.
      </p>

      <section className="flex min-h-[min(650px,calc(100vh-12rem))] flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          {recipientQuery.isLoading || supportQuery.isLoading ? (
            <div className="space-y-4" data-testid="support-messages-loading">
              <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-full" /><Skeleton className="h-5 w-40" /></div>
              <Skeleton className="h-36 w-3/4 rounded-2xl" />
              <Skeleton className="ml-auto h-24 w-3/4 rounded-2xl" />
            </div>
          ) : isUnavailable ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center" data-testid="support-messages-unavailable">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Support is unavailable right now</h2>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">There isn’t a support account configured yet. Please check back soon.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3 border-b border-zinc-800/80 pb-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-orange-300/80">{recipient?.displayName || "Your basketball coach"}</h2>
                  <p className="text-xs text-zinc-600">Personal conversation about your game</p>
                </div>
                <Badge variant="outline" className="ml-auto hidden border-emerald-500/30 text-emerald-300 sm:flex">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Private
                </Badge>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" data-testid="support-messages-container">
                {supportQuery.isError ? (
                  <div className="py-16 text-center text-sm text-red-300" data-testid="support-messages-error">
                    We couldn’t load this conversation. Refresh to try again.
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center text-center" data-testid="support-messages-empty">
                    <MessageCircle className="mb-3 h-9 w-9 text-orange-400/70" />
                    <p className="font-semibold text-zinc-200">Start the conversation</p>
                    <p className="mt-1 max-w-xs text-sm text-zinc-500">Send me a message. I’ll get back to you personally.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => <MessageBubble key={message.id} message={message} currentUserId={user?.id} assistantLabel={recipient?.displayName} />)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <MessageComposer
                value={messageText}
                onChange={setMessageText}
                onSend={() => messageText.trim() && sendMutation.mutate(messageText.trim())}
                isPending={sendMutation.isPending}
                placeholder="Tell me what’s on your mind..."
                testId="support-message-input"
              />
              <p className="mt-2 text-center text-[10px] tracking-wide text-zinc-700">Shift + Enter for a new line</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export function AdminSupportMessagesPage() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("player-help");
  const [messageText, setMessageText] = useState("");
  const [, navigate] = useLocation();

  const inboxQuery = useQuery<AdminInboxResponse>({
    queryKey: ["/api/admin/support-messages"],
    queryFn: async () => {
      const response = await nativeFetch("/api/admin/support-messages", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load player conversations");
      return response.json();
    },
    staleTime: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const threadQuery = useQuery<AdminThreadResponse>({
    queryKey: ["/api/admin/support-messages", selectedPlayerId],
    queryFn: async () => {
      const response = await nativeFetch(`/api/admin/support-messages/${selectedPlayerId}`);
      if (!response.ok) throw new Error("Failed to load support conversation");
      return response.json();
    },
    enabled: !!selectedPlayerId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/admin/support-messages/${selectedPlayerId}`, { content });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-messages", selectedPlayerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-messages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Reply not sent", description: error.message, variant: "destructive" });
    },
  });

  const selectedConversation = inboxQuery.data?.conversations.find((conversation) => conversation.playerId === selectedPlayerId);
  const threadMessages = threadQuery.data?.messages ?? [];
  const customRequestsQuery = useQuery<Array<{ status: string }>>({
    queryKey: ["/api/admin/custom-workout-requests"],
    refetchInterval: 5000,
  });
  const communitySubmissionsQuery = useQuery<Array<{ id: string }>>({
    queryKey: ["/api/admin/streak-challenges/creator-submissions", "fifty-in-a-row"],
    queryFn: async () => {
      const response = await nativeFetch("/api/admin/streak-challenges/creator-submissions?slug=fifty-in-a-row");
      if (!response.ok) throw new Error("Failed to load community submissions");
      return response.json();
    },
    refetchInterval: 5000,
  });
  const supportUnreadCount = inboxQuery.data?.conversations.reduce((total, conversation) => total + conversation.unreadCount, 0) || 0;
  const customRequestCount = customRequestsQuery.data?.filter((request) => request.status === "submitted" || request.status === "in_progress").length || 0;
  const communityCount = communitySubmissionsQuery.data?.length || 0;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  if (selectedPlayerId) {
    const playerName = threadQuery.data?.player?.displayName ?? selectedConversation?.playerName ?? "Player";
    return (
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col bg-[#080808] p-4 pb-8 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedPlayerId(null); setMessageText(""); }} aria-label="Back to inbox" data-testid="admin-support-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80">PLAYER INBOX</p>
            <h1 className="text-xl font-semibold tracking-tight text-white">{playerName || "Player conversation"}</h1>
          </div>
        </div>
        <section className="flex min-h-[min(650px,calc(100vh-11rem))] flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            {threadQuery.isLoading ? (
              <div className="space-y-4" data-testid="admin-support-thread-loading"><Skeleton className="h-20 w-2/3 rounded-2xl" /><Skeleton className="ml-auto h-20 w-2/3 rounded-2xl" /></div>
            ) : threadQuery.isError ? (
              <div className="py-16 text-center text-sm text-red-300" data-testid="admin-support-thread-error">We couldn’t load this conversation. Go back and try again.</div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3 border-b border-zinc-800/80 pb-4">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300/80">{playerName}</p><p className="text-xs text-zinc-600">Player support thread</p></div>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" data-testid="admin-support-messages-container">
                  {threadMessages.length === 0 ? (
                    <div className="flex h-full min-h-64 items-center justify-center text-sm text-zinc-500">No messages in this thread.</div>
                  ) : (
                    <>{threadMessages.map((message) => <MessageBubble key={message.id} message={message} mine={message.receiverId === selectedPlayerId} assistantLabel={threadQuery.data?.recipient?.displayName} />)}<div ref={messagesEndRef} /></>
                  )}
                </div>
                <MessageComposer
                  value={messageText}
                  onChange={setMessageText}
                  onSend={() => messageText.trim() && sendMutation.mutate(messageText.trim())}
                  isPending={sendMutation.isPending}
                  placeholder="Write back personally..."
                  testId="admin-support-message-input"
                />
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl p-4 pb-8 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300/80">ADMIN INBOX</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Player activity</h1>
          <p className="mt-2 text-sm text-zinc-500">Player Inbox, community submissions, and custom workout requests in one place.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")} data-testid="admin-support-dashboard-link">Admin dashboard</Button>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setSelectedPlayerId(null); }} className="w-full">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-orange-500/15 bg-gradient-to-r from-zinc-950 via-zinc-900 to-orange-950/30 p-2">
          <TabsTrigger value="player-help" className="gap-2 rounded-xl px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm"><MessageCircle className="h-4 w-4" />Player Inbox{supportUnreadCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">{supportUnreadCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="community" className="gap-2 rounded-xl px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm"><Flame className="h-4 w-4" />Community 3 Pointers{communityCount > 0 && <Badge className="h-5 min-w-5 rounded-full bg-orange-500 px-1.5 text-[10px] text-black">{communityCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="custom" className="gap-2 rounded-xl px-3 py-2 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm"><ClipboardList className="h-4 w-4" />Custom Requests{customRequestCount > 0 && <Badge className="h-5 min-w-5 rounded-full bg-orange-500 px-1.5 text-[10px] text-black">{customRequestCount}</Badge>}</TabsTrigger>
        </TabsList>
        <TabsContent value="community" className="mt-0"><AdminCommunity3Pointers /></TabsContent>
        <TabsContent value="custom" className="mt-0"><AdminCustomWorkoutRequests /></TabsContent>
        <TabsContent value="player-help" className="mt-0">
        {inboxQuery.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}</div>
      ) : inboxQuery.data?.available === false ? (
        <div className="border-t border-white/[0.05] py-16 text-center text-sm text-zinc-500" data-testid="admin-support-unavailable">No support account is configured.</div>
      ) : inboxQuery.isError ? (
        <div className="border-t border-red-500/20 py-16 text-center text-sm text-red-300" data-testid="admin-support-error">We couldn’t load the support inbox.</div>
      ) : !inboxQuery.data?.conversations.length ? (
        <div className="flex flex-col items-center border-t border-white/[0.05] py-16 text-center" data-testid="admin-support-empty"><Inbox className="mb-3 h-10 w-10 text-orange-400/70" /><p className="font-semibold text-zinc-200">No player messages yet</p><p className="mt-1 text-sm text-zinc-500">New private conversations will appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {inboxQuery.data.conversations.map((conversation) => (
            <button
              key={conversation.playerId}
              type="button"
              onClick={() => setSelectedPlayerId(conversation.playerId)}
              className={`group flex min-h-20 w-full items-center gap-3 border-b p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${conversation.unreadCount > 0 ? "border-orange-500/20 bg-orange-500/[0.05]" : "border-white/[0.06] hover:bg-orange-500/[0.04]"}`}
              data-testid={`admin-support-conversation-${conversation.playerId}`}
            >
              <span className="relative shrink-0">
                <Avatar className={`h-11 w-11 ${conversation.unreadCount > 0 ? "ring-2 ring-red-500/80 ring-offset-2 ring-offset-[#080808]" : ""}`}>
                  <AvatarImage src={getObjectUrl(conversation.playerImage)} />
                  <AvatarFallback>{conversation.playerName.slice(0, 1)}</AvatarFallback>
                </Avatar>
                {conversation.unreadCount > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#080808] bg-red-500" aria-label="New message" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate font-semibold ${conversation.unreadCount > 0 ? "text-white" : "text-zinc-200"}`}>{conversation.playerName}</span>
                  {conversation.unreadCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]" aria-label={`${conversation.unreadCount} new messages`}>{conversation.unreadCount}</Badge>}
                </span>
                <span className={`mt-1 block truncate text-[13px] ${conversation.unreadCount > 0 ? "font-medium text-zinc-200" : "text-zinc-400"}`}>{conversation.lastMessage}</span>
              </span>
              <span className="shrink-0 text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" title={formatMessageTime(conversation.lastMessageAt)}>{formatMessageTime(conversation.lastMessageAt)}</span>
            </button>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}