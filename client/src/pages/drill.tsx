import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { track } from "@/lib/track";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
  Share2,
  Copy,
  Check,
  Send,
  Search,
  Link2,
  Users,
} from "lucide-react";
import type { Drill } from "@shared/schema";
import { BasketballRating } from "@/components/basketball-rating";
import { apiRequest, getObjectUrl } from "@/lib/queryClient";

const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  "shooting": "Shooting",
  "passing": "Passing",
  "finishing": "Finishing",
  "defense": "Defense",
  "film-session": "Film Session",
  "workouts": "Workouts",
};

// ── Video Player with error handling ─────────────────────────────────────────
function VideoPlayer({ src, poster }: { src: string | null; poster?: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src) return null;
  if (hasError) {
    return (
      <div
        className="relative flex aspect-video flex-col items-center justify-center gap-2 overflow-hidden bg-zinc-950 text-zinc-400"
        data-testid="video-player-error"
      >
        <Play className="h-10 w-10 text-orange-400/70" />
        <p className="text-sm">Video unavailable or unsupported format</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-300 underline underline-offset-4 hover:text-orange-200"
        >
          Open video directly
        </a>
      </div>
    );
  }
  return (
    <div className="relative aspect-video overflow-hidden bg-zinc-950">
      <video
        src={src}
        controls
        playsInline
        className="w-full h-full object-cover"
        poster={poster}
        data-testid="video-player"
        onError={(e) => {
          // Only show error for format/decode failures, not transient network issues
          const code = (e.currentTarget as HTMLVideoElement).error?.code;
          const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
          const MEDIA_ERR_DECODE = 3;
          if (code === MEDIA_ERR_SRC_NOT_SUPPORTED || code === MEDIA_ERR_DECODE) {
            setHasError(true);
          }
        }}
      />
    </div>
  );
}

// ── Share Drill Dialog ────────────────────────────────────────────────────────

type Connection = {
  id: string;
  status: string;
  otherUser: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    profileImageUrl?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
};

function ShareDrillDialog({
  drill,
  open,
  onOpenChange,
}: {
  drill: Drill;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const drillUrl = `${window.location.origin}/drills/${drill.id}`;

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
    enabled: open,
  });

  const accepted = connections.filter(
    (c) => c.status === "accepted" && c.otherUser
  );

  const filtered = search.trim()
    ? accepted.filter((c) => {
        const u = c.otherUser!;
        const full = [u.displayName, u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
        return full.includes(search.toLowerCase());
      })
    : accepted;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("No user selected");
      const message = note.trim()
        ? `${note.trim()}\n\nCheck out this drill on PLAYR1: *${drill.title}*\n${drillUrl}`
        : `Check out this drill on PLAYR1: *${drill.title}*\n${drillUrl}`;
      await apiRequest("POST", "/api/messages", { receiverId: selectedUserId, content: message });
    },
    onSuccess: () => {
      toast({ title: "Drill shared!", description: "Your message was sent." });
      setSelectedUserId(null);
      setNote("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Something went wrong. Try again.", variant: "destructive" });
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(drillUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Drill link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: drill.title,
        text: `Check out this basketball drill: ${drill.title}`,
        url: drillUrl,
      });
    } catch {
      // User cancelled or browser doesn't support — fall back silently
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const getInitials = (u: Connection["otherUser"]) => {
    if (!u) return "?";
    return [u.firstName?.[0], u.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  };

  const getDisplayName = (u: Connection["otherUser"]) => {
    if (!u) return "Unknown";
    return u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-share-drill">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Drill
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="connections">
          <TabsList className="w-full">
            <TabsTrigger value="connections" className="flex-1 gap-2" data-testid="tab-share-connections">
              <Users className="w-4 h-4" />
              Send to Connection
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 gap-2" data-testid="tab-share-link">
              <Link2 className="w-4 h-4" />
              Share Link
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Send to a connection ── */}
          <TabsContent value="connections" className="mt-4 space-y-4">
            {accepted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-connections">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No connections yet.</p>
                <p className="text-xs mt-1">Connect with players and trainers to share drills.</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search connections…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-connections"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1" data-testid="list-connections">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No results</p>
                  ) : (
                    filtered.map((conn) => {
                      const u = conn.otherUser!;
                      const isSelected = selectedUserId === u.id;
                      return (
                        <button
                          key={conn.id}
                          onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                            isSelected
                              ? "bg-primary/15 ring-1 ring-primary"
                              : "hover:bg-accent"
                          }`}
                          data-testid={`button-select-connection-${u.id}`}
                        >
                          <Avatar className="w-9 h-9 flex-shrink-0">
                            <AvatarImage src={getObjectUrl(u.profilePhotoUrl || u.profileImageUrl) || undefined} />
                            <AvatarFallback>{getInitials(u)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium flex-1 truncate">{getDisplayName(u)}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedUserId && (
                  <Textarea
                    placeholder="Add a note (optional)…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="resize-none"
                    data-testid="textarea-share-note"
                  />
                )}

                <Button
                  className="w-full gap-2"
                  disabled={!selectedUserId || sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                  data-testid="button-send-to-connection"
                >
                  <Send className="w-4 h-4" />
                  {sendMutation.isPending ? "Sending…" : "Send Drill"}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── Tab: Share link ── */}
          <TabsContent value="link" className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Share this link with anyone — they can view the drill even without a PLAYR1 account.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border text-sm font-mono break-all" data-testid="text-drill-link">
                {drillUrl}
              </div>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleCopy}
              variant="outline"
              data-testid="button-copy-link"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>

            {canNativeShare && (
              <Button
                className="w-full gap-2"
                onClick={handleNativeShare}
                data-testid="button-native-share"
              >
                <Share2 className="w-4 h-4" />
                Share via…
              </Button>
            )}

            <Separator />

            <p className="text-xs text-muted-foreground text-center">
              You can also paste this link in a text message, email, or social media post.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DrillPage() {
  const { id } = useParams<{ id: string }>();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: drill, isLoading, error } = useQuery<Drill>({
    queryKey: ['/api/drills', id],
  });

  useEffect(() => {
    if (id) track("drill_viewed", { drillId: id });
  }, [id]);

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-5 p-4 text-zinc-100 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Skeleton className="aspect-video rounded-2xl bg-white/[0.06]" />
          <Skeleton className="h-8 w-2/3 bg-white/[0.06]" />
          <Skeleton className="h-4 w-full bg-white/[0.06]" />
          <Skeleton className="h-4 w-4/5 bg-white/[0.06]" />
        </div>
        <Skeleton className="h-64 rounded-2xl bg-white/[0.06]" />
      </div>
    );
  }

  if (error || !drill) {
    return (
      <div className="mx-auto max-w-5xl p-4 text-zinc-100 sm:p-6">
        <Card className="rounded-2xl border-white/[0.08] bg-zinc-950/90">
          <CardContent className="flex flex-col items-center p-8 text-center sm:p-12">
            <Target className="mb-4 h-12 w-12 text-orange-400/70" />
            <h3 className="mb-2 text-lg font-semibold">Drill Not Found</h3>
            <p className="mb-5 max-w-md text-sm text-zinc-400">
              This drill doesn't exist or has been removed.
            </p>
            <Link href="/drills">
              <Button variant="outline" className="gap-1.5 border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]" data-testid="button-back-to-drills">
                <ChevronLeft className="h-4 w-4" />
                Back to Drills
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mediaContent = (() => {
    if (drill.videoUrl) {
      const url = drill.videoUrl;
      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

      if (ytMatch) {
        return (
          <div className="relative aspect-video bg-zinc-950" data-testid="video-player">
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${drill.title} video`}
              className="h-full w-full"
            />
          </div>
        );
      }

      if (vimeoMatch) {
        return (
          <div className="relative aspect-video bg-zinc-950" data-testid="video-player">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`${drill.title} video`}
              className="h-full w-full"
            />
          </div>
        );
      }

      return (
        <VideoPlayer
          src={getObjectUrl(url) || null}
          poster={getObjectUrl(drill.thumbnailUrl) || undefined}
        />
      );
    }

    if (drill.pdfUrl) {
      return (
        <div className="max-h-[72vh] overflow-auto bg-zinc-950 p-2 sm:p-3">
          <img
            src={getObjectUrl(drill.pdfUrl)}
            alt={`${drill.title} - Training Document`}
            className="mx-auto max-h-[68vh] w-full object-contain"
            data-testid="document-image"
          />
        </div>
      );
    }

    if (drill.thumbnailUrl) {
      return (
        <div className="relative aspect-video bg-zinc-950">
          <img
            src={getObjectUrl(drill.thumbnailUrl)}
            alt={drill.title}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.12),transparent_60%)] text-zinc-500">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-orange-300">
          <Play className="h-6 w-6 fill-current" />
        </div>
        <span className="text-xs">No preview available</span>
      </div>
    );
  })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/95 px-2 py-3 sm:px-6 sm:py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drill-detail-title"
        className="relative flex h-[min(90dvh,920px)] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#fbfaf7] text-zinc-950 shadow-2xl"
      >
        <Link href="/drills" aria-label="Close drill details" className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white transition hover:bg-zinc-100" data-testid="button-back">
          <X className="h-4 w-4" />
        </Link>
        <header className="shrink-0 bg-white px-5 pb-4 pt-6 sm:px-8">
          <p className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-orange-600">
            {categoryLabels[drill.category] || drill.category} <span className="px-1 text-zinc-400">·</span> {drill.difficulty || "beginner"}
          </p>
          <h1 id="drill-detail-title" className="mt-1 max-w-[85%] font-heading text-3xl font-black uppercase leading-none sm:text-5xl" data-testid="text-drill-title">
            {drill.title}
          </h1>
          <div className="mt-4 h-1 bg-black" />
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base" data-testid="text-drill-description">
            {drill.description || "Master this drill to take your skills to the next level."}
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          <section className="overflow-hidden rounded-xl bg-white shadow-md" data-testid="drill-media">
            {mediaContent}
          </section>

          <section className="rounded-xl bg-white p-4 shadow-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-700">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-500">Estimated time</p>
                  <p className="font-heading text-2xl font-black uppercase" data-testid="text-drill-duration">{formatDuration(drill.duration)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-500">Player rating</p>
                <BasketballRating drillId={drill.id} size="sm" showCount />
              </div>
            </div>
          </section>

          <Button
            variant="outline"
            className="h-11 w-full gap-2 rounded-xl border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
            onClick={() => setShareOpen(true)}
            data-testid="button-share"
          >
            <Share2 className="h-4 w-4" />
            Share Drill
          </Button>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 bg-zinc-950 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+.75rem)] text-white sm:p-4">
          <div className="min-w-0">
            <p className="font-heading text-sm font-black uppercase">Ready to train</p>
            <p className="text-xs text-zinc-400">Your next reps start here</p>
          </div>
          <Link href={`/log?drill=${drill.id}`}>
            <Button
              className="h-12 shrink-0 gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 font-black text-black shadow-[0_0_20px_rgba(249,115,22,.35)] hover:from-orange-400 hover:to-orange-500 sm:px-5"
              data-testid="button-log-session"
            >
              <ClipboardList className="h-4 w-4" />
              Log Drill
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </footer>
      </section>

      <ShareDrillDialog drill={drill} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
