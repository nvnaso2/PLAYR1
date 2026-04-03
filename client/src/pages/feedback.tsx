import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronUp, Plus, Trash2, MessageSquare, Lightbulb, Bug, Megaphone,
  CheckCircle2, Clock, Circle, BookOpen, XCircle, Send, ChevronDown, ChevronRight
} from "lucide-react";
import type { FeedbackPost, FeedbackCategory, FeedbackComment } from "@shared/schema";
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from "@shared/schema";

type FeedbackPostWithMeta = FeedbackPost & { authorName: string; hasVoted: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  "bug": "Bug Report",
  "feature-request": "Feature Request",
  "suggestion": "Suggestion",
  "general": "General",
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "bug": Bug,
  "feature-request": Lightbulb,
  "suggestion": MessageSquare,
  "general": Megaphone,
};

const CATEGORY_COLORS: Record<string, string> = {
  "bug": "bg-red-500/10 text-red-400 border-red-500/20",
  "feature-request": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "suggestion": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "general": "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  btnClass: string;
  desc: string;
}> = {
  "open": {
    label: "Open",
    icon: Circle,
    badgeClass: "bg-muted text-muted-foreground border-border",
    btnClass: "border-border text-muted-foreground hover:bg-muted",
    desc: "Submitted and awaiting review",
  },
  "in-review": {
    label: "In Review",
    icon: Clock,
    badgeClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    btnClass: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
    desc: "We're actively looking into this",
  },
  "planned": {
    label: "Planned",
    icon: BookOpen,
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    btnClass: "border-blue-500/50 bg-blue-500/10 text-blue-400",
    desc: "This is on our roadmap — it's coming!",
  },
  "done": {
    label: "Done ✓",
    icon: CheckCircle2,
    badgeClass: "bg-green-500/15 text-green-400 border-green-500/30",
    btnClass: "border-green-500/50 bg-green-500/10 text-green-400",
    desc: "Shipped! This is now live in the app",
  },
  "closed": {
    label: "Closed",
    icon: XCircle,
    badgeClass: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    btnClass: "border-gray-500/30 text-gray-500",
    desc: "Won't be implemented at this time",
  },
};

// ─── Status Badge for regular users ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["open"];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
      <span className="text-[11px] text-muted-foreground">{cfg.desc}</span>
    </div>
  );
}

// ─── Admin Status Picker ──────────────────────────────────────────────────────
function AdminStatusPicker({ postId, current, onUpdate }: { postId: string; current: string; onUpdate: (val: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
      <span className="text-xs text-muted-foreground self-center mr-1">Set status:</span>
      {FEEDBACK_STATUSES.map(s => {
        const cfg = STATUS_CONFIG[s];
        const Icon = cfg.icon;
        const isActive = s === current;
        return (
          <button
            key={s}
            onClick={() => onUpdate(s)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? cfg.btnClass + " ring-1 ring-offset-1 ring-current" : "border-border text-muted-foreground hover:bg-muted"}`}
            data-testid={`button-status-${s}-${postId}`}
          >
            <Icon className="w-3 h-3" />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Comment Thread ───────────────────────────────────────────────────────────
function CommentThread({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useQuery<FeedbackComment[]>({
    queryKey: ["/api/feedback", postId, "comments"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/feedback/${postId}/comments`);
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/feedback/${postId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback", postId, "comments"] });
      setNewComment("");
    },
    onError: () => toast({ title: "Failed to post comment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("DELETE", `/api/feedback/${postId}/comments/${commentId}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feedback", postId, "comments"] }),
    onError: () => toast({ title: "Failed to delete comment", variant: "destructive" }),
  });

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 group" data-testid={`comment-${c.id}`}>
              <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(c.authorName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold">{c.authorName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.createdAt!).toLocaleDateString()}
                  </span>
                  {(isAdmin || c.userId === user?.id) && (
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-xs"
                      data-testid={`button-delete-comment-${c.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be first to chime in!</p>
      )}

      {/* Add comment */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="text-sm resize-none"
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newComment.trim()) {
              addMutation.mutate(newComment);
            }
          }}
          data-testid={`input-comment-${postId}`}
        />
        <Button
          size="sm"
          onClick={() => newComment.trim() && addMutation.mutate(newComment)}
          disabled={addMutation.isPending || !newComment.trim()}
          className="shrink-0 h-9"
          data-testid={`button-submit-comment-${postId}`}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("top");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<FeedbackCategory>("general");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const { data: posts = [], isLoading } = useQuery<FeedbackPostWithMeta[]>({
    queryKey: ["/api/feedback", categoryFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (sortBy) params.set("sort", sortBy);
      const res = await apiRequest("GET", `/api/feedback?${params.toString()}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string }) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({ title: "Feedback submitted!", description: "Thanks for helping us improve." });
      setDialogOpen(false);
      setNewTitle(""); setNewContent(""); setNewCategory("general");
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const voteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest("POST", `/api/feedback/${postId}/vote`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feedback"] }),
    onError: () => toast({ title: "Failed to vote", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/feedback/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feedback"] }),
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/feedback/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleComments = (id: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-feedback-title">Feedback &amp; Ideas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share bugs, suggest features, or vote on what matters to you. We track every submission and keep you updated.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-feedback">
              <Plus className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as FeedbackCategory)}>
                  <SelectTrigger data-testid="select-feedback-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Short, descriptive title"
                  maxLength={200}
                  data-testid="input-feedback-title"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Describe the issue or idea in detail..."
                  rows={4}
                  data-testid="input-feedback-content"
                />
              </div>
              <Button className="w-full" onClick={() => {
                if (!newTitle.trim() || !newContent.trim()) {
                  toast({ title: "Please fill in title and description", variant: "destructive" });
                  return;
                }
                createMutation.mutate({ title: newTitle, content: newContent, category: newCategory });
              }} disabled={createMutation.isPending} data-testid="button-submit-feedback">
                {createMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status legend for non-admins */}
      {!isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-primary mb-2">HOW WE TRACK YOUR FEEDBACK</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {FEEDBACK_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${cfg.badgeClass}`}>
                      <Icon className="w-2.5 h-2.5" />{cfg.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{cfg.desc}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {FEEDBACK_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border divide-x overflow-hidden text-sm">
          {(["top", "new"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 capitalize transition-colors ${sortBy === s ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              data-testid={`button-sort-${s}`}
            >
              {s === "top" ? "Top Voted" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No feedback yet. Be the first to submit!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const CatIcon = CATEGORY_ICONS[post.category] || Megaphone;
            const isExpanded = expandedComments.has(post.id);
            const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG["open"];
            const StatusIcon = cfg.icon;
            return (
              <Card key={post.id} className="group" data-testid={`card-feedback-${post.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Vote column */}
                    <div className="flex flex-col items-center gap-1 min-w-[48px]">
                      <button
                        onClick={() => voteMutation.mutate(post.id)}
                        disabled={voteMutation.isPending}
                        className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 border transition-all ${post.hasVoted ? "bg-primary/10 border-primary text-primary" : "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"}`}
                        data-testid={`button-vote-${post.id}`}
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="text-xs font-semibold">{post.voteCount}</span>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold leading-snug" data-testid={`text-post-title-${post.id}`}>
                          {post.title}
                        </h3>
                        {isAdmin && (
                          <button
                            onClick={() => deleteMutation.mutate(post.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                            data-testid={`button-delete-${post.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2.5">
                        {post.content}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${CATEGORY_COLORS[post.category]}`}>
                          <CatIcon className="w-3 h-3 mr-1" />
                          {CATEGORY_LABELS[post.category]}
                        </Badge>

                        {/* Status — prominent for all */}
                        {!isAdmin && <StatusBadge status={post.status} />}

                        <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                          {post.authorName} · {new Date(post.createdAt!).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Admin status picker */}
                      {isAdmin && (
                        <AdminStatusPicker
                          postId={post.id}
                          current={post.status}
                          onUpdate={val => statusMutation.mutate({ id: post.id, status: val })}
                        />
                      )}

                      {/* Comment toggle */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="mt-2.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-toggle-comments-${post.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Comments</span>
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>

                      {isExpanded && <CommentThread postId={post.id} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
