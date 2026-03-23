import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest, nativeFetch } from "@/lib/queryClient";
import { EmojiPicker } from "@/components/emoji-picker";
import { Users, Plus, Trash2, MessageCircle, Send, ArrowLeft } from "lucide-react";

interface TrainerGroup {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  ageGroup?: string;
  position?: string;
  memberCount?: number;
  createdAt: string;
}

interface PlayerMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  position?: string;
  joinedAt: string;
}

interface TrainerPlayerData {
  id: string;
  trainerId: string;
  firstName: string;
  lastName: string | null;
  position: string | null;
  ageGroup: string | null;
  linkedUserId: string | null;
}

interface ChatContact {
  id: string;
  name: string;
  image?: string;
  teamName: string;
  position?: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerImage?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

interface ChatThread {
  id: string;
  name: string;
  mode: string;
  scopeType: string;
  scopeId: string | null;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderName: string;
  senderImage: string | null;
}

export default function TrainerChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatMode, setChatMode] = useState<"direct" | "group">("direct");

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (selectedContact) {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    }
  }, [selectedContact]);

  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [threadMessageText, setThreadMessageText] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupScopeType, setNewGroupScopeType] = useState<"group" | "position" | "age" | "custom">("group");
  const [newGroupScopeId, setNewGroupScopeId] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<Set<string>>(new Set());
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 10000,
  });

  const { data: contacts } = useQuery<ChatContact[]>({
    queryKey: ["/api/messages/contacts/trainer"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages", selectedContact],
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

  const { data: chatThreads, isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat-threads", "trainer"],
    queryFn: async () => {
      const res = await nativeFetch("/api/chat-threads?mode=trainer");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });

  const { data: threadMessages, isLoading: threadMessagesLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/chat-threads", selectedThread?.id, "messages"],
    queryFn: async () => {
      const res = await nativeFetch(`/api/chat-threads/${selectedThread!.id}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedThread,
    refetchInterval: 5000,
  });

  const { data: groupMembersForScope } = useQuery<PlayerMember[]>({
    queryKey: ["/api/trainer/groups", newGroupScopeId, "members"],
    queryFn: async () => {
      const res = await nativeFetch(`/api/trainer/groups/${newGroupScopeId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: newGroupScopeType === "group" && !!newGroupScopeId,
  });

  const { data: trainerPlayers } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const positions = useMemo(() => {
    if (!contacts) return [];
    return Array.from(new Set(contacts.map(c => c.position).filter(Boolean))) as string[];
  }, [contacts]);

  const ageGroups = useMemo(() => {
    if (!trainerPlayers) return [];
    return Array.from(new Set(trainerPlayers.map(p => p.ageGroup).filter(Boolean))) as string[];
  }, [trainerPlayers]);

  const positionContacts = useMemo(() => {
    if (!contacts || newGroupScopeType !== "position" || !newGroupScopeId) return [];
    return contacts.filter(c => c.position === newGroupScopeId);
  }, [contacts, newGroupScopeType, newGroupScopeId]);

  const ageContacts = useMemo(() => {
    if (!trainerPlayers || newGroupScopeType !== "age" || !newGroupScopeId) return [];
    return trainerPlayers
      .filter(p => p.ageGroup === newGroupScopeId && p.linkedUserId)
      .map(p => ({ id: p.linkedUserId!, name: `${p.firstName} ${p.lastName || ""}`.trim(), position: p.position }));
  }, [trainerPlayers, newGroupScopeType, newGroupScopeId]);

  const groupMemberCandidates = useMemo(() => {
    if (!contacts) return [];
    if (!groupMemberSearch) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(groupMemberSearch.toLowerCase()));
  }, [contacts, groupMemberSearch]);

  const autoPopulateMembers = useMemo(() => {
    if (newGroupScopeType === "group" && groupMembersForScope) return groupMembersForScope.filter(m => m.userId).map(m => m.userId);
    if (newGroupScopeType === "position") return positionContacts.map(c => c.id);
    if (newGroupScopeType === "age") return ageContacts.map(c => c.id);
    return [];
  }, [newGroupScopeType, groupMembersForScope, positionContacts, ageContacts]);

  useEffect(() => {
    if (autoPopulateMembers.length > 0 && newGroupScopeId) {
      setNewGroupMemberIds(new Set(autoPopulateMembers));
    }
  }, [autoPopulateMembers, newGroupScopeId]);

  const handleScopeChange = (scopeType: "group" | "position" | "age" | "custom") => {
    setNewGroupScopeType(scopeType);
    setNewGroupScopeId("");
    setNewGroupMemberIds(new Set());
  };

  const handleScopeIdChange = (scopeId: string) => {
    setNewGroupScopeId(scopeId);
    setNewGroupMemberIds(new Set());
  };

  const toggleGroupMember = (id: string) => {
    setNewGroupMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || newGroupMemberIds.size === 0) return;
    createThreadMutation.mutate({
      name: newGroupName.trim(),
      mode: "trainer",
      scopeType: newGroupScopeType,
      scopeId: newGroupScopeId || undefined,
      memberIds: Array.from(newGroupMemberIds),
    });
  };

  const sendMutation = useMutation({
    mutationFn: (data: { receiverId: string; content: string }) => apiRequest("POST", "/api/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedContact] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setMessageText("");
    },
    onError: (error: Error) => toast({ title: "Failed to send message", description: error.message, variant: "destructive" }),
  });

  const sendThreadMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      apiRequest("POST", `/api/chat-threads/${threadId}/messages`, { content }),
    onSuccess: () => {
      if (selectedThread) queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", selectedThread.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      setThreadMessageText("");
    },
    onError: (error: Error) => toast({ title: "Failed to send message", description: error.message, variant: "destructive" }),
  });

  const createThreadMutation = useMutation({
    mutationFn: (data: { name: string; mode: string; scopeType: string; scopeId?: string; memberIds: string[] }) =>
      apiRequest("POST", "/api/chat-threads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      setCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupScopeType("group");
      setNewGroupScopeId("");
      setNewGroupMemberIds(new Set());
      setGroupMemberSearch("");
      toast({ title: "Group chat created!" });
    },
    onError: (error: Error) => toast({ title: "Failed to create group chat", description: error.message, variant: "destructive" }),
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => apiRequest("DELETE", `/api/chat-threads/${threadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      setDeleteThreadId(null);
      if (selectedThread?.id === deleteThreadId) setSelectedThread(null);
      toast({ title: "Group chat deleted" });
    },
    onError: (error: Error) => toast({ title: "Failed to delete group chat", description: error.message, variant: "destructive" }),
  });

  if (selectedThread) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedThread(null)} data-testid="trainer-button-back-to-threads">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="trainer-text-thread-name">{selectedThread.name}</h2>
            <p className="text-xs text-muted-foreground">{selectedThread.memberCount} member{selectedThread.memberCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="h-64 overflow-y-auto space-y-2 mb-3" data-testid="trainer-thread-messages-container">
              {threadMessagesLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : !threadMessages?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
              ) : (
                threadMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`} data-testid={`trainer-thread-message-${msg.id}`}>
                    <div className={`flex items-end gap-2 max-w-[80%] ${msg.senderId === user?.id ? "flex-row-reverse" : ""}`}>
                      {msg.senderId !== user?.id && (
                        <Avatar className="h-6 w-6 shrink-0">
                          {msg.senderImage && <AvatarImage src={msg.senderImage} />}
                          <AvatarFallback className="text-[10px]">{msg.senderName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-lg px-3 py-2 text-sm ${msg.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {msg.senderId !== user?.id && <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.senderName}</p>}
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <EmojiPicker onEmojiSelect={emoji => setThreadMessageText(prev => prev + emoji)} />
              <Input
                value={threadMessageText}
                onChange={e => setThreadMessageText(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && selectedThread && sendThreadMutation.mutate({ threadId: selectedThread.id, content: threadMessageText.trim() })}
                data-testid="trainer-input-thread-message"
              />
              <Button
                size="icon"
                onClick={() => selectedThread && threadMessageText.trim() && sendThreadMutation.mutate({ threadId: selectedThread.id, content: threadMessageText.trim() })}
                disabled={!threadMessageText.trim() || sendThreadMutation.isPending}
                data-testid="trainer-button-send-thread-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedContact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedContact(null)} data-testid="button-back-to-conversations">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-chat-partner-name">{selectedContactName}</h2>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="h-64 overflow-y-auto space-y-2 mb-3" data-testid="chat-messages-container">
              {messagesLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : !chatMessages?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`} data-testid={`chat-message-${msg.id}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <EmojiPicker onEmojiSelect={emoji => setMessageText(prev => prev + emoji)} />
              <Input
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && selectedContact && sendMutation.mutate({ receiverId: selectedContact, content: messageText.trim() })}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={() => selectedContact && messageText.trim() && sendMutation.mutate({ receiverId: selectedContact, content: messageText.trim() })}
                disabled={!messageText.trim() || sendMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={chatMode} onValueChange={v => setChatMode(v as "direct" | "group")} data-testid="trainer-tabs-chat-mode">
        <TabsList className="grid w-full grid-cols-2" data-testid="trainer-tabs-chat-mode-list">
          <TabsTrigger value="direct" data-testid="trainer-tab-direct-messages">
            <MessageCircle className="w-4 h-4 mr-1" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="group" data-testid="trainer-tab-group-chats">
            <Users className="w-4 h-4 mr-1" />
            Group Chats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4 mt-4">
          {contacts && contacts.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Start a new conversation</p>
                <div className="flex flex-wrap gap-2">
                  {contacts.map(contact => (
                    <Button
                      key={contact.id}
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedContact(contact.id); setSelectedContactName(contact.name); }}
                      data-testid={`button-start-chat-${contact.id}`}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {contact.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {convsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : !conversations?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-conversations">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No conversations yet. Select a player above to start chatting.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <Card
                  key={conv.partnerId}
                  className="hover-elevate cursor-pointer"
                  onClick={() => { setSelectedContact(conv.partnerId); setSelectedContactName(conv.partnerName); }}
                  data-testid={`card-conversation-${conv.partnerId}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          {conv.partnerImage && <AvatarImage src={conv.partnerImage} />}
                          <AvatarFallback className="text-xs">{conv.partnerName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{conv.partnerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="no-default-hover-elevate text-xs">{conv.unreadCount}</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="group" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="trainer-text-group-chats-heading">Group Chats</h2>
            <Button size="sm" onClick={() => setCreateGroupOpen(true)} data-testid="trainer-button-new-group-chat">
              <Plus className="w-4 h-4 mr-1" />
              New Group Chat
            </Button>
          </div>

          {threadsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : !chatThreads?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="trainer-text-no-group-chats">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No group chats yet. Create one to start messaging your players!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {chatThreads.map(thread => (
                <Card
                  key={thread.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedThread(thread)}
                  data-testid={`trainer-card-thread-${thread.id}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`trainer-text-thread-name-${thread.id}`}>{thread.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{thread.lastMessage || "No messages yet"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`trainer-badge-thread-members-${thread.id}`}>
                          <Users className="w-3 h-3 mr-1" />
                          {thread.memberCount}
                        </Badge>
                        {thread.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground">{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={e => { e.stopPropagation(); setDeleteThreadId(thread.id); }}
                          data-testid={`trainer-button-delete-thread-${thread.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="max-w-lg" data-testid="trainer-dialog-create-group-chat">
          <DialogHeader>
            <DialogTitle>New Group Chat</DialogTitle>
            <DialogDescription>Create a group chat with your players.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Training Group Chat" data-testid="trainer-input-group-name" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scope Type</label>
              <Select value={newGroupScopeType} onValueChange={v => handleScopeChange(v as "group" | "position" | "age" | "custom")}>
                <SelectTrigger data-testid="trainer-select-group-scope-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Team / Group</SelectItem>
                  <SelectItem value="position">Position Group</SelectItem>
                  <SelectItem value="age">Age Group</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newGroupScopeType === "group" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Group</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="trainer-select-group-scope-group"><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                  <SelectContent>
                    {groups?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}{g.ageGroup ? ` (${g.ageGroup})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newGroupScopeType === "position" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Position</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="trainer-select-group-scope-position"><SelectValue placeholder="Choose a position..." /></SelectTrigger>
                  <SelectContent>
                    {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newGroupScopeType === "age" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Age Group</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="trainer-select-group-scope-age"><SelectValue placeholder="Choose an age group..." /></SelectTrigger>
                  <SelectContent>
                    {ageGroups.map(ag => <SelectItem key={ag} value={ag}>{ag}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Members ({newGroupMemberIds.size} selected)</label>
              {newGroupScopeType === "custom" && (
                <Input placeholder="Search players..." value={groupMemberSearch} onChange={e => setGroupMemberSearch(e.target.value)} data-testid="trainer-input-group-member-search" />
              )}
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {newGroupScopeType === "custom" ? (
                  groupMemberCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No players found.</p>
                  ) : groupMemberCandidates.map(contact => (
                    <div key={contact.id} className="flex items-center gap-2 p-1.5 rounded-md" data-testid={`trainer-group-member-option-${contact.id}`}>
                      <Checkbox checked={newGroupMemberIds.has(contact.id)} onCheckedChange={() => toggleGroupMember(contact.id)} data-testid={`trainer-checkbox-group-member-${contact.id}`} />
                      <Avatar className="h-6 w-6 shrink-0">
                        {contact.image && <AvatarImage src={contact.image} />}
                        <AvatarFallback className="text-[10px]">{contact.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{contact.name}</p>
                        <p className="text-[10px] text-muted-foreground">{contact.teamName}</p>
                      </div>
                      {contact.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{contact.position}</Badge>}
                    </div>
                  ))
                ) : newGroupScopeType === "group" && groupMembersForScope ? (
                  groupMembersForScope.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No players in this group.</p>
                  ) : groupMembersForScope.map(member => (
                    <div key={member.userId} className="flex items-center gap-2 p-1.5 rounded-md" data-testid={`trainer-group-member-option-${member.userId}`}>
                      <Checkbox checked={newGroupMemberIds.has(member.userId)} onCheckedChange={() => toggleGroupMember(member.userId)} data-testid={`trainer-checkbox-group-member-${member.userId}`} />
                      <Avatar className="h-6 w-6 shrink-0">
                        {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} />}
                        <AvatarFallback className="text-[10px]">{(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{member.firstName} {member.lastName}</p>
                      </div>
                      {member.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{member.position}</Badge>}
                    </div>
                  ))
                ) : newGroupScopeType === "position" ? (
                  positionContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No players found for this position.</p>
                  ) : positionContacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-2 p-1.5 rounded-md" data-testid={`trainer-group-member-option-${contact.id}`}>
                      <Checkbox checked={newGroupMemberIds.has(contact.id)} onCheckedChange={() => toggleGroupMember(contact.id)} data-testid={`trainer-checkbox-group-member-${contact.id}`} />
                      <Avatar className="h-6 w-6 shrink-0">
                        {contact.image && <AvatarImage src={contact.image} />}
                        <AvatarFallback className="text-[10px]">{contact.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{contact.name}</p>
                        <p className="text-[10px] text-muted-foreground">{contact.teamName}</p>
                      </div>
                    </div>
                  ))
                ) : newGroupScopeType === "age" ? (
                  ageContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No linked players found for this age group.</p>
                  ) : ageContacts.map(ac => (
                    <div key={ac.id} className="flex items-center gap-2 p-1.5 rounded-md" data-testid={`trainer-group-member-option-${ac.id}`}>
                      <Checkbox checked={newGroupMemberIds.has(ac.id)} onCheckedChange={() => toggleGroupMember(ac.id)} data-testid={`trainer-checkbox-group-member-${ac.id}`} />
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">{ac.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{ac.name}</p>
                      </div>
                      {ac.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{ac.position}</Badge>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Select a scope to see available members.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || newGroupMemberIds.size === 0 || createThreadMutation.isPending}
                data-testid="trainer-button-create-group-submit"
              >
                {createThreadMutation.isPending ? "Creating..." : "Create Group Chat"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteThreadId} onOpenChange={open => !open && setDeleteThreadId(null)}>
        <AlertDialogContent data-testid="trainer-dialog-delete-thread-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group Chat?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this group chat and all its messages. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="trainer-button-cancel-delete-thread">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteThreadId && deleteThreadMutation.mutate(deleteThreadId)} data-testid="trainer-button-confirm-delete-thread">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
