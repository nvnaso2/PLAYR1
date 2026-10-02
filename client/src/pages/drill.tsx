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
  ClipboardList,
  Lightbulb,
  Dumbbell,
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
    <div className="mx-auto max-w-6xl px-4 py-4 text-zinc-100 sm:px-6 sm:py-6">
      <header className="mb-5">
        <Link href="/drills">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-lg border border-white/10 bg-zinc-950/40 px-3 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4" />
            Drill Library
          </Button>
        </Link>
      </header>

      <main className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-[0_12px_36px_rgba(0,0,0,0.32)] lg:col-start-1 lg:row-start-1"
          data-testid="drill-media"
        >
          {mediaContent}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-4 sm:p-5 lg:col-start-1 lg:row-start-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-medium text-orange-300 hover:bg-orange-500/10">
              {categoryLabels[drill.category] || drill.category}
            </Badge>
            <Badge className="border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium capitalize text-zinc-300 hover:bg-white/[0.04]">
              {drill.difficulty || "beginner"}
            </Badge>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl" data-testid="text-drill-title">
              {drill.title}
            </h1>
            <div className="w-fit shrink-0 rounded-xl border border-white/[0.08] bg-black/30 px-2.5 py-2">
              <BasketballRating drillId={drill.id} size="sm" showCount={true} />
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-zinc-400 sm:text-[15px]" data-testid="text-drill-description">
            {drill.description || "Master this drill to take your skills to the next level."}
          </p>
        </section>

        <aside className="space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-orange-500/[0.08] via-zinc-950 to-zinc-950 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.24)] sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-300">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Ready to train</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-200">Your next reps start here</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Estimated time</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-white" data-testid="text-drill-duration">
                {formatDuration(drill.duration)}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Link href={`/log?drill=${drill.id}`}>
                <Button
                  className="h-11 w-full gap-2 rounded-xl border border-orange-300/30 bg-orange-500 font-semibold text-zinc-950 shadow-[0_8px_20px_rgba(249,115,22,0.16)] hover:bg-orange-400"
                  data-testid="button-log-session"
                >
                  <ClipboardList className="h-4 w-4" />
                  Log Training Session
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                onClick={() => setShareOpen(true)}
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
                Share Drill
              </Button>
            </div>
          </section>

          {drill.equipment && drill.equipment.length > 0 && (
            <section className="rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Dumbbell className="h-4 w-4 text-orange-300" />
                Equipment
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {drill.equipment.map((item, index) => (
                  <Badge key={index} className="border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-normal text-zinc-300 hover:bg-white/[0.04]">
                    {item}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </aside>

        {drill.tips && drill.tips.length > 0 && (
          <section className="rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-4 sm:p-5 lg:col-start-1 lg:row-start-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Lightbulb className="h-4 w-4 text-orange-300" />
              Pro Tips
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {drill.tips.map((tip, index) => (
                <li key={index} className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/25 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-semibold text-orange-300">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-5 text-zinc-300">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <ShareDrillDialog drill={drill} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
