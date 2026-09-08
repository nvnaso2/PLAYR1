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
  "bug": "bg-red-950/40 text-red-300 border-red-500/30",
  "feature-request": "bg-orange-950/40 text-orange-300 border-orange-500/30",
  "suggestion": "bg-zinc-800 text-zinc-300 border-zinc-600",
  "general": "bg-zinc-900 text-zinc-400 border-zinc-700",
};

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  btnClass: string;
  ringClass: string;
  desc: string;
}> = {
  "open": {
    label: "Open",
    icon: Circle,
    badgeClass: "bg-zinc-100 text-zinc-950 border-white",
    btnClass: "border-white bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.32)] hover:bg-white/20",
    ringClass: "ring-sky-200/80",
    desc: "Submitted and awaiting review",
  },
  "in-review": {
    label: "In Review",
    icon: Clock,
    badgeClass: "bg-yellow-950/40 text-yellow-300 border-yellow-500/40",
    btnClass: "border-yellow-500/60 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20",
    ringClass: "ring-yellow-400/80",
    desc: "We're actively looking into this",
  },
  "planned": {
    label: "Planned",
    icon: BookOpen,
    badgeClass: "bg-blue-950/40 text-blue-300 border-blue-500/40",
    btnClass: "border-blue-500/60 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20",
    ringClass: "ring-blue-400/80",
    desc: "This is on our roadmap — it's coming!",
  },
  "done": {
    label: "Done ✓",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-950/40 text-emerald-300 border-emerald-500/40",
    btnClass: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    ringClass: "ring-emerald-400/80",
    desc: "Shipped! This is now live in the app",
  },
  "closed": {
    label: "Closed",
    icon: XCircle,
    badgeClass: "bg-rose-950/40 text-rose-300 border-rose-500/40",
    btnClass: "border-rose-500/60 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    ringClass: "ring-rose-400/80",
    desc: "Won't be implemented at this time",
  },
};

// ─── Status Badge for regular users ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["open"];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.badgeClass}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Admin Status Picker ──────────────────────────────────────────────────────
function AdminStatusPicker({ postId, current, onUpdate }: { postId: string; current: string; onUpdate: (val: string) => void }) {
  return (
    <div className="-ml-1 mt-2 flex min-w-0 items-center gap-1 overflow-visible border-t border-zinc-800 pt-2">
      <span className="mr-0.5 shrink-0 self-center text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Set status:</span>
      {FEEDBACK_STATUSES.map(s => {
        const cfg = STATUS_CONFIG[s];
        const Icon = cfg.icon;
        const isActive = s === current;
        return (
          <button
            key={s}
            onClick={() => onUpdate(s)}
             className={`flex min-h-6 shrink-0 items-center gap-0.5 rounded-full border px-1 py-0.5 text-[9px] font-medium leading-none transition-all ${isActive ? `${cfg.btnClass} ring-1 ${cfg.ringClass}` : "border-zinc-700 bg-zinc-900 text-zinc-600 hover:border-zinc-500 hover:text-zinc-300"}`}
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
    <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full rounded bg-zinc-800" />)}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 group" data-testid={`comment-${c.id}`}>
              <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                <AvatarFallback className="bg-orange-500/10 text-xs text-orange-300">
                  {(c.authorName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{c.authorName}</span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(c.createdAt!).toLocaleDateString()}
                  </span>
                  {(isAdmin || c.userId === user?.id) && (
                    <button
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="ml-auto h-8 w-8 rounded-md text-zinc-500 opacity-0 transition-all hover:bg-zinc-800 hover:text-red-300 group-hover:opacity-100 focus-visible:opacity-100"
                      data-testid={`button-delete-comment-${c.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-zinc-400">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-zinc-500">No comments yet. Be first to chime in!</p>
      )}

      {/* Add comment */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="min-h-11 resize-none border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-400"
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
          className="h-11 w-11 shrink-0 bg-orange-500 text-black hover:bg-orange-400"
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
    <div className="min-h-full bg-[#090909] px-4 py-6 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-7">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-5 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Player voice</p>
          <h1 className="font-heading text-3xl uppercase tracking-wide text-white sm:text-4xl" data-testid="text-feedback-title">Feedback &amp; Ideas</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Share bugs, suggest features, or vote on what matters to you. We track every submission and keep you updated.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-11 w-full gap-2 rounded-full bg-orange-500 px-5 font-heading text-base uppercase tracking-wide text-black hover:bg-orange-400 sm:w-auto" data-testid="button-new-feedback">
              <Plus className="h-4 w-4" />
              Submit Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
            <DialogHeader className="pr-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Make your voice heard</p>
              <DialogTitle className="font-heading text-2xl uppercase tracking-wide text-white">Submit Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Category</label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as FeedbackCategory)}>
                  <SelectTrigger className="rounded-full border-zinc-700 bg-zinc-900 text-white focus:ring-orange-400" data-testid="select-feedback-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                    {FEEDBACK_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Title</label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Short, descriptive title"
                  maxLength={200}
                   className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400"
                   data-testid="input-feedback-title"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Description</label>
                <Textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Describe the issue or idea in detail..."
                  rows={4}
                   className="resize-none border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400"
                   data-testid="input-feedback-content"
                />
              </div>
              <Button className="min-h-11 w-full rounded-full bg-orange-500 font-heading text-base uppercase tracking-wide text-black hover:bg-orange-400" onClick={() => {
                if (!newTitle.trim() || !newContent.trim()) {
                  toast({ title: "Please fill in title and description", variant: "destructive" });
                  return;
                }
                createMutation.mutate({ title: newTitle, content: newContent, category: newCategory });
              }} disabled={createMutation.isPending} data-testid="button-submit-feedback">
                 {createMutation.isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status legend for non-admins */}
      {!isAdmin && (
      <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">How we track your feedback</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {FEEDBACK_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.badgeClass}`}>
                      <Icon className="w-2.5 h-2.5" />{cfg.label}
                    </span>
                    <span className="text-[11px] text-zinc-500">{cfg.desc}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="min-h-11 w-full rounded-full border-zinc-700 bg-zinc-900 text-zinc-200 focus:ring-orange-400 sm:w-48" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
            <SelectItem value="all">All Categories</SelectItem>
            {FEEDBACK_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex min-h-11 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 p-0.5 text-sm">
          {(["top", "new"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
               className={`min-w-24 rounded-full px-3 py-1.5 font-heading uppercase tracking-wide transition-colors ${sortBy === s ? "bg-orange-500 text-black" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"}`}
              data-testid={`button-sort-${s}`}
            >
              {s === "top" ? "Top Voted" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg bg-zinc-900" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="py-16 text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <p className="font-heading text-xl uppercase tracking-wide text-white">No feedback yet</p>
            <p className="mt-1 text-sm text-zinc-500">Be the first to submit an idea and help shape the next rep.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {posts.map(post => {
            const CatIcon = CATEGORY_ICONS[post.category] || Megaphone;
            const isExpanded = expandedComments.has(post.id);
            return (
              <Card key={post.id} className="group border-zinc-800 bg-zinc-900 transition hover:border-zinc-600" data-testid={`card-feedback-${post.id}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-2">
                    {/* Vote column */}
                    <div className="flex min-w-9 flex-col items-center gap-1">
                      <button
                        onClick={() => voteMutation.mutate(post.id)}
                        disabled={voteMutation.isPending}
                        className={`flex min-h-11 min-w-10 flex-col items-center justify-center gap-0.5 rounded-full border px-1.5 py-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${post.hasVoted ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-zinc-700 text-zinc-500 hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-orange-300"}`}
                        data-testid={`button-vote-${post.id}`}
                      >
                         <ChevronUp className="h-4 w-4" />
                         <span className="text-xs font-semibold">{post.voteCount}</span>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <h3 className="font-heading text-lg uppercase leading-snug tracking-wide text-white" data-testid={`text-post-title-${post.id}`}>
                          {post.title}
                        </h3>
                        {isAdmin && (
                          <button
                            onClick={() => deleteMutation.mutate(post.id)}
                            className="h-9 w-9 shrink-0 rounded-full text-zinc-500 opacity-0 transition-all hover:bg-zinc-800 hover:text-red-300 focus-visible:opacity-100 group-hover:opacity-100"
                            data-testid={`button-delete-${post.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                       <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-zinc-300">
                        {post.content}
                      </p>

                      {/* Meta row */}
                       <div className="flex flex-wrap items-center gap-2">
                         <Badge variant="outline" className={`px-2 py-0.5 text-xs uppercase tracking-wide ${CATEGORY_COLORS[post.category]}`}>
                          <CatIcon className="w-3 h-3 mr-1" />
                          {CATEGORY_LABELS[post.category]}
                        </Badge>

                        {/* Status — prominent for all */}
                        {!isAdmin && <StatusBadge status={post.status} />}

                           <span className="ml-auto shrink-0 text-xs text-zinc-500">
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
                         className="mt-2 flex min-h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
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
    </div>
  );
}
