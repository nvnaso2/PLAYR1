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
import { ChevronUp, Plus, Trash2, MessageSquare, Lightbulb, Bug, Megaphone, CheckCircle, Clock, X } from "lucide-react";
import type { FeedbackPost, FeedbackCategory } from "@shared/schema";
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

const STATUS_COLORS: Record<string, string> = {
  "open": "bg-muted text-muted-foreground",
  "in-review": "bg-yellow-500/10 text-yellow-400",
  "planned": "bg-blue-500/10 text-blue-400",
  "done": "bg-green-500/10 text-green-400",
  "closed": "bg-gray-500/10 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  "open": "Open",
  "in-review": "In Review",
  "planned": "Planned",
  "done": "Done",
  "closed": "Closed",
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("top");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<FeedbackCategory>("general");

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
      setNewTitle("");
      setNewContent("");
      setNewCategory("general");
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

  const handleSubmit = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Please fill in title and description", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title: newTitle, content: newContent, category: newCategory });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-feedback-title">Feedback &amp; Ideas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share bugs, suggest features, or vote on what matters to you.
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
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-submit-feedback"
              >
                {createMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            return (
              <Card key={post.id} className="group" data-testid={`card-feedback-${post.id}`}>
                <CardContent className="p-4 flex gap-3">
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
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          data-testid={`button-delete-${post.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2.5">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${CATEGORY_COLORS[post.category]}`}>
                        <CatIcon className="w-3 h-3 mr-1" />
                        {CATEGORY_LABELS[post.category]}
                      </Badge>

                      {isAdmin ? (
                        <Select
                          value={post.status}
                          onValueChange={val => statusMutation.mutate({ id: post.id, status: val })}
                        >
                          <SelectTrigger
                            className={`h-5 text-[11px] px-2 border-0 w-auto gap-1 ${STATUS_COLORS[post.status]}`}
                            data-testid={`select-status-${post.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEEDBACK_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status]}`}>
                          {STATUS_LABELS[post.status]}
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {post.authorName} · {new Date(post.createdAt!).toLocaleDateString()}
                      </span>
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
