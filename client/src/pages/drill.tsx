import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const difficultyColors = {
  beginner: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  advanced: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  elite: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

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
        className="relative aspect-video bg-muted rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2 text-muted-foreground"
        data-testid="video-player-error"
      >
        <Play className="h-10 w-10 opacity-40" />
        <p className="text-sm">Video unavailable or unsupported format</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline text-primary"
        >
          Open video directly
        </a>
      </div>
    );
  }
  return (
    <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        poster={poster}
        data-testid="video-player"
        onError={() => setHasError(true)}
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

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !drill) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Drill Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This drill doesn't exist or has been removed.
            </p>
            <Link href="/drills">
              <Button variant="outline" data-testid="button-back-to-drills">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Drills
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Link href="/drills">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <Badge variant="outline">{categoryLabels[drill.category] || drill.category}</Badge>
        <Badge className={difficultyColors[drill.difficulty || 'beginner']}>
          {drill.difficulty || 'beginner'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Video section */}
          {drill.videoUrl && (() => {
            const url = drill.videoUrl;
            const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
            if (ytMatch) {
              return (
                <div className="relative aspect-video bg-muted rounded-xl overflow-hidden" data-testid="video-player">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              );
            }
            if (vimeoMatch) {
              return (
                <div className="relative aspect-video bg-muted rounded-xl overflow-hidden" data-testid="video-player">
                  <iframe
                    src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              );
            }
            return (
              <VideoPlayer
                src={getObjectUrl(url)}
                poster={getObjectUrl(drill.thumbnailUrl) || undefined}
              />
            );
          })()}

          {/* PDF / document section */}
          {drill.pdfUrl && (
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={getObjectUrl(drill.pdfUrl)}
                alt={`${drill.title} - Training Document`}
                className="w-full h-auto object-contain"
                data-testid="document-image"
              />
            </div>
          )}

          {/* Thumbnail fallback */}
          {!drill.videoUrl && !drill.pdfUrl && drill.thumbnailUrl && (
            <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
              <img
                src={getObjectUrl(drill.thumbnailUrl)}
                alt={drill.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold mb-2" data-testid="text-drill-title">{drill.title}</h1>
            <div className="mb-3">
              <BasketballRating drillId={drill.id} size="md" showCount={true} />
            </div>
            <p className="text-muted-foreground" data-testid="text-drill-description">
              {drill.description || "Master this drill to take your skills to the next level."}
            </p>
          </div>

          {drill.tips && drill.tips.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {drill.tips.map((tip, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Drill Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </span>
                <span className="font-medium" data-testid="text-drill-duration">
                  {formatDuration(drill.duration)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Category
                </span>
                <span className="font-medium">
                  {categoryLabels[drill.category] || drill.category}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Difficulty
                </span>
                <Badge className={difficultyColors[drill.difficulty || 'beginner']}>
                  {drill.difficulty || 'beginner'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {drill.equipment && drill.equipment.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Equipment Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {drill.equipment.map((item, index) => (
                    <Badge key={index} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Link href={`/log?drill=${drill.id}`}>
              <Button className="w-full gap-2" data-testid="button-log-session">
                <ClipboardList className="w-4 h-4" />
                Log Training Session
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShareOpen(true)}
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
              Share Drill
            </Button>
          </div>
        </div>
      </div>

      <ShareDrillDialog drill={drill} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
