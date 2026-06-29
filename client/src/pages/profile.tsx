import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import { BaseballCard } from "@/pages/career";
import {
  Eye, EyeOff, Globe, Lock, Save, Loader2, Camera, Share2,
  Ruler, GraduationCap, Video, Star, Zap, Trophy, Medal,
  School, Users, MapPin, Dumbbell, Clock, Target,
  CheckCircle2, StickyNote, Copy, Check, ExternalLink,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiYoutube, SiWhatsapp } from "react-icons/si";

const POSITION_LABELS: Record<string, string> = {
  PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward",
  PF: "Power Forward", C: "Center",
};

const GRADE_LABELS: Record<string, string> = {
  elementary: "Elementary", "6th": "6th Grade", "7th": "7th Grade",
  "8th": "8th Grade", freshman: "HS Freshman", sophomore: "HS Sophomore",
  junior: "HS Junior", senior: "HS Senior", "college-freshman": "College Freshman",
  "college-sophomore": "College Sophomore", "college-junior": "College Junior",
  "college-senior": "College Senior", "post-college": "Post-College",
};

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player";
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/30 border border-orange-500/20 min-w-0">
      <span className="text-xl font-black text-white">{value}</span>
      <span className="text-[11px] text-orange-200/60 font-semibold mt-0.5 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number | null | undefined }) {
  if (value == null) return null;
  const pct = Math.round((Math.min(10, Math.max(0, value)) / 10) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-orange-400 tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-zinc-800/60 bg-zinc-900/60">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}

function VisToggle({ label, description, checked, onCheckedChange, testId }: {
  label: string; description?: string; checked: boolean;
  onCheckedChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {checked ? <Eye className="w-3.5 h-3.5 text-orange-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
        <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
      </div>
    </div>
  );
}

function TrainingLogDetailDialog({ logId, open, onClose }: { logId: string | null; open: boolean; onClose: () => void }) {
  const { data: log, isLoading } = useQuery<any>({
    queryKey: ["/api/training-logs", logId],
    enabled: !!logId && open,
  });
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-orange-500" />Training Session Detail
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3 py-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" /></div>
        ) : log ? (
          <div className="space-y-4 py-1">
            {log.completedAt && (
              <p className="text-xs text-zinc-500">
                {new Date(log.completedAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {log.duration > 0 && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{log.duration}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Minutes</p></div>}
              {log.score != null && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-orange-400">{log.score}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Score</p></div>}
              {log.reps != null && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{log.reps}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Reps</p></div>}
              {log.sets != null && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{log.sets}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Sets</p></div>}
              {log.shotsMade != null && log.shotsAttempted != null && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{log.shotsMade}/{log.shotsAttempted}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Shots</p></div>}
              {log.shotsMade != null && log.shotsAttempted > 0 && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-green-400">{Math.round((log.shotsMade / log.shotsAttempted) * 100)}%</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">FG%</p></div>}
            </div>
            {log.shotLocation && <div className="flex items-center gap-2 text-sm text-zinc-400"><Target className="w-4 h-4 text-zinc-600" /><span>Shot location: <span className="text-white font-semibold">{log.shotLocation}</span></span></div>}
            {log.metrics && log.metrics.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Metrics</p>
                <div className="grid grid-cols-2 gap-2">
                  {log.metrics.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/50">
                      <span className="text-xs text-zinc-400">{m.metricName || "Metric"}</span>
                      <span className="text-sm font-black text-orange-400">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {log.notes && (
              <div className="p-3 rounded-xl bg-zinc-800/50 border-l-2 border-orange-500/40">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><StickyNote className="w-3 h-3" />Notes</p>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{log.notes}</p>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-zinc-500 py-4 text-center">Could not load session details.</p>}
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ open, onClose, profileUrl, displayName }: { open: boolean; onClose: () => void; profileUrl: string; displayName: string }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const shareText = `Check out ${displayName}'s basketball profile on PLAYR1! 🏀`;
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4 text-orange-500" />Share Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* URL preview */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 rounded-xl">
            <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <p className="text-xs text-zinc-400 truncate flex-1">{profileUrl}</p>
          </div>
          {/* Share options */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 border-zinc-700 hover:border-green-500/40 h-11" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + profileUrl)}`} target="_blank" rel="noopener noreferrer">
                <SiWhatsapp className="h-4 w-4 text-green-400" />WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="gap-2 border-zinc-700 hover:border-sky-500/40 h-11" asChild>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noopener noreferrer">
                <SiX className="h-4 w-4" />X / Twitter
              </a>
            </Button>
            <Button variant="outline" className="gap-2 border-zinc-700 hover:border-pink-500/40 h-11" asChild>
              <a href={`https://instagram.com`} target="_blank" rel="noopener noreferrer">
                <SiInstagram className="h-4 w-4 text-pink-400" />Instagram
              </a>
            </Button>
            <Button variant="outline" className="gap-2 border-zinc-700 hover:border-orange-500/40 h-11" asChild>
              <a href={`sms:?body=${encodeURIComponent(shareText + "\n" + profileUrl)}`}>
                <Share2 className="h-4 w-4 text-orange-400" />Text Message
              </a>
            </Button>
          </div>
          <Button
            className="w-full gap-2 h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold"
            onClick={copyLink}
          >
            {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Link</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const VIS_DEFAULTS = {
  isPublic: false, isPrivate: false,
  showStats: true, showAchievements: true, showVideos: true,
  showPersonalRecords: true, showTrainingLog: false, showSkills: true,
  showArchetype: true, showLocation: true, showPhysical: true,
  showAcademic: true, showSocialLinks: true, showEmail: false,
  showHighlightReel: true,
  // card section items
  cardShowPlayerCard: true, cardShowArchetype: true,
  cardShowBio: true, cardShowSocials: true, cardShowHighlightReel: true,
};
type VisState = typeof VIS_DEFAULTS;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"profile" | "visibility">("profile");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vis, setVis] = useState<VisState>(VIS_DEFAULTS);
  const [visLoaded, setVisLoaded] = useState(false);
  const [logDetailId, setLogDetailId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: playerProfile, isLoading } = useQuery<any>({ queryKey: ["/api/player-profile"] });
  const { data: career } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: careerStats } = useQuery<any>({ queryKey: ["/api/stats/career"] });
  const { data: userArchetypes } = useQuery<any[]>({ queryKey: ["/api/archetypes/user"] });
  const { data: awards } = useQuery<any[]>({ queryKey: ["/api/team-awards"] });
  const { data: personalRecords } = useQuery<any[]>({ queryKey: ["/api/personal-records"] });
  const { data: videos } = useQuery<any[]>({ queryKey: ["/api/videos"] });
  const { data: recentLogs } = useQuery<any[]>({ queryKey: ["/api/training-logs/recent"] });

  useEffect(() => {
    if (playerProfile && !visLoaded) {
      setVis({
        isPublic:            playerProfile.isPublic            ?? false,
        isPrivate:           playerProfile.isPrivate           ?? false,
        showStats:           playerProfile.showStats           ?? true,
        showAchievements:    playerProfile.showAchievements    ?? true,
        showVideos:          playerProfile.showVideos          ?? true,
        showPersonalRecords: playerProfile.showPersonalRecords ?? true,
        showTrainingLog:     playerProfile.showTrainingLog     ?? false,
        showSkills:          playerProfile.showSkills          ?? true,
        showArchetype:       playerProfile.showArchetype       ?? true,
        showLocation:        playerProfile.showLocation        ?? true,
        showPhysical:        playerProfile.showPhysical        ?? true,
        showAcademic:        playerProfile.showAcademic        ?? true,
        showSocialLinks:     playerProfile.showSocialLinks     ?? true,
        showEmail:           playerProfile.showEmail           ?? false,
        showHighlightReel:   playerProfile.showHighlightReel   ?? true,
        cardShowPlayerCard:  playerProfile.cardShowPlayerCard  ?? true,
        cardShowArchetype:   playerProfile.cardShowArchetype   ?? true,
        cardShowBio:         playerProfile.cardShowBio         ?? true,
        cardShowSocials:     playerProfile.cardShowSocials     ?? true,
        cardShowHighlightReel: playerProfile.cardShowHighlightReel ?? true,
      });
      setVisLoaded(true);
    }
  }, [playerProfile, visLoaded]);

  const toggle = (key: keyof VisState, value: boolean) => setVis(prev => ({ ...prev, [key]: value }));

  const displayName =
    userProfile?.displayName ||
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName) ||
    user?.email?.split("@")[0] || "Player";

  // Stable slug: use existing one if present, else generate + suffix
  const slug = playerProfile?.slug || makeSlug(displayName) + (user?.id ? "-" + user.id.slice(-4) : "");
  const profileUrl = `${window.location.origin}/player/${slug}`;

  // Photo upload — same as career.tsx
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
    if (file.type && !allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload JPEG, PNG, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", { name: file.name || "photo.jpg", size: file.size, contentType: file.type || "image/jpeg" });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      await apiRequest("PUT", "/api/career", { cardPhotoUrl: objectPath });
      await queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Photo updated!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const saveVisibility = async () => {
    setSaving(true);
    try {
      // Only send the visibility/card fields + stable slug — avoid spreading the full profile object
      await apiRequest("PUT", "/api/player-profile", {
        slug,
        isPublic:            vis.isPublic,
        isPrivate:           vis.isPrivate,
        showStats:           vis.showStats,
        showAchievements:    vis.showAchievements,
        showVideos:          vis.showVideos,
        showPersonalRecords: vis.showPersonalRecords,
        showTrainingLog:     vis.showTrainingLog,
        showSkills:          vis.showSkills,
        showArchetype:       vis.showArchetype,
        showLocation:        vis.showLocation,
        showPhysical:        vis.showPhysical,
        showAcademic:        vis.showAcademic,
        showSocialLinks:     vis.showSocialLinks,
        showEmail:           vis.showEmail,
        showHighlightReel:   vis.showHighlightReel,
        cardShowPlayerCard:  vis.cardShowPlayerCard,
        cardShowArchetype:   vis.cardShowArchetype,
        cardShowBio:         vis.cardShowBio,
        cardShowSocials:     vis.cardShowSocials,
        cardShowHighlightReel: vis.cardShowHighlightReel,
      });
      setVisLoaded(false); // allow re-hydration
      await queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      toast({ title: "Saved!", description: "Visibility settings updated." });
    } catch (e: any) {
      console.error("Save visibility error:", e);
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const photoSrc = career?.cardPhotoUrl
    ? getObjectUrl(career.cardPhotoUrl)
    : userProfile?.profilePhotoUrl
    ? getObjectUrl(userProfile.profilePhotoUrl)
    : user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined;

  const mainUserArchetype = (userArchetypes || []).find((ua: any) => ua.role === "main");
  const archetypeName = mainUserArchetype?.archetype?.name || career?.assessmentArchetype || null;
  const archetypeTagline = mainUserArchetype?.archetype?.tagline || career?.assessmentArchetypeTagline || null;

  const totalGames = careerStats?.totalGames ?? 0;
  const hasGameStats = totalGames > 0;
  const hasSkills   = career && (career.skillBallHandling != null || career.skillShooting != null || career.skillDefense != null || career.skillAthletics != null || career.skillBasketballIQ != null || career.skillPassing != null || career.skillFinishing != null);
  const hasPhysical = playerProfile?.heightFeet > 0 || playerProfile?.weight > 0 || playerProfile?.wingspan;
  const hasAcademic = playerProfile?.gradYear > 0 || playerProfile?.gpa;
  const hasSocials  = playerProfile?.socialTwitter || playerProfile?.socialInstagram || playerProfile?.socialTiktok || playerProfile?.socialYoutube;
  const hasAwards   = awards && awards.length > 0;
  const hasPRs      = personalRecords && personalRecords.length > 0;
  const hasVideos   = videos && (videos as any[]).filter((v: any) => v.isPublic).length > 0;
  const hasLogs     = recentLogs && recentLogs.length > 0;

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-10">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-3xl" /><Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic" className="hidden" onChange={handlePhotoUpload} data-testid="input-profile-photo" />

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight" data-testid="text-page-title">My Profile</h1>
          <p className="text-sm text-muted-foreground">Your player card + full profile</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-orange-500/30 hover:border-orange-500/60 text-orange-400"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: `${displayName} – PLAYR1`, url: profileUrl }).catch(() => {});
            } else {
              setShareOpen(true);
            }
          }}
          data-testid="button-share-profile"
        >
          <Share2 className="w-4 h-4" />Share
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mb-5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
        {(["profile", "visibility"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-sm font-bold rounded-lg transition-all ${tab === t ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "text-zinc-500 hover:text-zinc-200"}`}
            data-testid={`tab-${t}`}
          >
            {t === "profile" ? "My Profile" : "Visibility"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          MY PROFILE TAB
      ═══════════════════════════════════════════ */}
      {tab === "profile" && (
        <div>
          {!vis.isPublic && (
            <div className="mx-4 mb-3 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/90 leading-snug">
                Profile is <strong>private</strong>. Go to Visibility → Profile Access to make it public.
              </p>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              PROFILE CARD  (shareable section)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="mx-4 mb-3 rounded-3xl overflow-hidden border border-orange-500/15">
            {/* Hero */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-zinc-950" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_top_right,rgba(234,88,12,0.35),transparent)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950/80" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />

              <div className="relative px-5 pt-6 pb-6">
                <div className="flex items-end gap-4">
                  {/* Avatar + upload */}
                  <div className="relative shrink-0 group">
                    <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-orange-400 to-orange-600 opacity-80 blur-[4px]" />
                    <Avatar className="relative h-24 w-24 border-2 border-orange-500/30">
                      <AvatarFallback className="text-2xl font-black bg-zinc-900 text-orange-400">{initials}</AvatarFallback>
                      {photoSrc && <AvatarImage src={photoSrc} alt={displayName} className="object-cover" />}
                    </Avatar>
                    <button
                      className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploading}
                      data-testid="button-upload-photo"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                      {career?.jerseyNumber != null && <span className="text-xl font-black text-orange-400">#{career.jerseyNumber}</span>}
                      <h2 className="text-2xl font-black text-white tracking-tight leading-none uppercase" data-testid="text-profile-name">{displayName}</h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {career?.positions?.map((pos: string) => (
                        <Badge key={pos} className="bg-orange-500/25 text-orange-300 border border-orange-500/40 font-semibold text-xs">{POSITION_LABELS[pos] || pos}</Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      {career?.schoolName && <span className="flex items-center gap-1"><School className="h-3 w-3" />{career.schoolName}</span>}
                      {career?.teamName && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{career.teamName}</span>}
                      {career?.gradeLevel && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{GRADE_LABELS[career.gradeLevel] || career.gradeLevel}</span>}
                      {vis.showLocation && userProfile?.city && <span className="flex items-center gap-1 text-orange-400/70"><MapPin className="h-3 w-3" />{userProfile.city}{userProfile.state ? `, ${userProfile.state}` : ""}</span>}
                    </div>
                    <button onClick={() => photoInputRef.current?.click()} disabled={uploading} className="mt-1.5 text-[11px] text-orange-400/50 flex items-center gap-1 hover:text-orange-400 transition-colors sm:hidden">
                      <Camera className="w-3 h-3" />{uploading ? "Uploading…" : "Change photo"}
                    </button>
                  </div>
                </div>

                {/* Game stats strip */}
                {vis.showStats && hasGameStats && (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest mb-2">Career Averages · {totalGames}G · {careerStats.wins}W–{careerStats.losses}L</p>
                    <div className="grid grid-cols-5 gap-2">
                      <StatPill label="PPG" value={Number(careerStats.avgPoints).toFixed(1)} />
                      <StatPill label="RPG" value={Number(careerStats.avgRebounds).toFixed(1)} />
                      <StatPill label="APG" value={Number(careerStats.avgAssists).toFixed(1)} />
                      <StatPill label="SPG" value={Number(careerStats.avgSteals).toFixed(1)} />
                      <StatPill label="BPG" value={Number(careerStats.avgBlocks).toFixed(1)} />
                    </div>
                  </div>
                )}
                {vis.showStats && !hasGameStats && (
                  <div className="mt-4 p-2.5 rounded-xl bg-black/30 border border-orange-500/10 text-center">
                    <p className="text-xs text-zinc-600">No game stats yet — log games in <Link href="/career" className="text-orange-400 underline">My Career</Link></p>
                  </div>
                )}
              </div>
            </div>

            {/* Card items below hero — all in the shareable card */}
            <div className="bg-zinc-950/80 px-4 pb-5 space-y-4 border-t border-zinc-800/40 pt-4">

              {/* Player card (baseball card) */}
              {vis.cardShowPlayerCard && career && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2.5">Player Card</p>
                  <div className="flex justify-center">
                    <BaseballCard
                      profile={career}
                      careerStats={careerStats}
                      onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/career"] })}
                    />
                  </div>
                </div>
              )}

              {/* Archetype */}
              {vis.cardShowArchetype && archetypeName && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-orange-400" /></div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Player Archetype</p>
                    <p className="font-black text-white text-sm">{archetypeName}</p>
                    {archetypeTagline && <p className="text-xs text-zinc-400 mt-0.5">{archetypeTagline}</p>}
                    {mainUserArchetype && <p className="text-[11px] text-orange-400/60 mt-0.5 capitalize">{mainUserArchetype.tier} · {mainUserArchetype.totalXp} XP</p>}
                  </div>
                </div>
              )}
              {vis.cardShowArchetype && !archetypeName && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-dashed border-zinc-800">
                  <Zap className="w-4 h-4 text-zinc-700 shrink-0" />
                  <p className="text-xs text-zinc-600">No archetype — pick one in <Link href="/archetypes" className="text-orange-500 underline">Archetypes</Link></p>
                </div>
              )}

              {/* Bio */}
              {vis.cardShowBio && playerProfile?.bio && (
                <div className="px-1">
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{playerProfile.bio}</p>
                </div>
              )}

              {/* Social links */}
              {vis.cardShowSocials && hasSocials && (
                <div className="flex flex-wrap items-center gap-2">
                  {playerProfile?.socialTwitter && <a href={`https://twitter.com/${playerProfile.socialTwitter.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:border-orange-500/40 transition-colors"><SiX className="h-3 w-3" />X</a>}
                  {playerProfile?.socialInstagram && <a href={`https://instagram.com/${playerProfile.socialInstagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:border-orange-500/40 transition-colors"><SiInstagram className="h-3 w-3 text-pink-400" />Instagram</a>}
                  {playerProfile?.socialTiktok && <a href={`https://tiktok.com/@${playerProfile.socialTiktok.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:border-orange-500/40 transition-colors"><SiTiktok className="h-3 w-3" />TikTok</a>}
                  {playerProfile?.socialYoutube && <a href={`https://youtube.com/${playerProfile.socialYoutube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:border-orange-500/40 transition-colors"><SiYoutube className="h-3 w-3 text-red-400" />YouTube</a>}
                </div>
              )}

              {/* Highlight reel */}
              {vis.showHighlightReel && vis.cardShowHighlightReel && playerProfile?.highlightVideoUrl && (
                <a href={playerProfile.highlightVideoUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent hover:border-orange-500/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0"><Video className="w-5 h-5 text-orange-400" /></div>
                    <div><p className="font-bold text-sm text-white">Highlight Reel</p><p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1"><ExternalLink className="h-3 w-3" />Tap to watch</p></div>
                  </div>
                </a>
              )}

              {/* PLAYR1 footer */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                <p className="text-[10px] text-zinc-700 font-black tracking-widest uppercase">PLAYR1</p>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: `${displayName} – PLAYR1`, url: profileUrl }).catch(() => {});
                    } else {
                      setShareOpen(true);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-orange-400/70 hover:text-orange-400 transition-colors font-semibold"
                  data-testid="button-share-card"
                >
                  <Share2 className="w-3.5 h-3.5" />Share Card
                </button>
              </div>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              DETAILED IN-APP SECTIONS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="px-4 space-y-3">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Full Profile — visible inside the app</p>

            {/* Skill ratings */}
            {vis.showSkills && (
              <SectionCard icon={<Star className="h-4 w-4 text-orange-500" />} title="Skill Ratings">
                {hasSkills ? (
                  <div className="space-y-3">
                    <SkillBar label="Ball Handling" value={career.skillBallHandling} />
                    <SkillBar label="Shooting"      value={career.skillShooting} />
                    <SkillBar label="Passing"       value={career.skillPassing} />
                    <SkillBar label="Finishing"     value={career.skillFinishing} />
                    <SkillBar label="Defense"       value={career.skillDefense} />
                    <SkillBar label="Athleticism"   value={career.skillAthletics} />
                    <SkillBar label="Basketball IQ" value={career.skillBasketballIQ} />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-2">Set skill ratings in <Link href="/career" className="text-orange-500 underline">My Career</Link></p>
                )}
              </SectionCard>
            )}

            {/* Measurements */}
            {vis.showPhysical && (
              <SectionCard icon={<Ruler className="h-4 w-4 text-zinc-400" />} title="Measurements">
                {hasPhysical ? (
                  <div className="grid grid-cols-3 gap-2">
                    {playerProfile?.heightFeet > 0 && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{playerProfile.heightFeet}'{playerProfile.heightInches || 0}"</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Height</p></div>}
                    {playerProfile?.weight > 0 && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{playerProfile.weight}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">lbs</p></div>}
                    {playerProfile?.wingspan && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{playerProfile.wingspan}"</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Wingspan</p></div>}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-2">No measurements — add in <Link href="/career" className="text-orange-500 underline">My Career</Link></p>}
              </SectionCard>
            )}

            {/* Academic */}
            {vis.showAcademic && (
              <SectionCard icon={<GraduationCap className="h-4 w-4 text-zinc-400" />} title="Academic">
                {hasAcademic ? (
                  <div className="grid grid-cols-2 gap-2">
                    {playerProfile?.gradYear > 0 && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{playerProfile.gradYear}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">Class of</p></div>}
                    {playerProfile?.gpa && <div className="text-center p-3 rounded-xl bg-zinc-800/60"><p className="text-lg font-black text-white">{playerProfile.gpa}</p><p className="text-[10px] text-zinc-500 uppercase mt-0.5">GPA</p></div>}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-2">No academic info — add in <Link href="/career" className="text-orange-500 underline">My Career</Link></p>}
              </SectionCard>
            )}

            {/* Awards */}
            {vis.showAchievements && (
              <SectionCard icon={<Trophy className="h-4 w-4 text-amber-500" />} title="Awards & Achievements">
                {hasAwards ? (
                  <div className="space-y-2">
                    {(awards as any[]).map((award: any) => (
                      <div key={award.id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50">
                        <Trophy className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0"><p className="text-sm font-semibold">{award.awardName}</p><p className="text-xs text-zinc-500">{award.teamName}{award.season ? ` · ${award.season}` : ""}</p></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-2">No awards — add in <Link href="/career" className="text-orange-500 underline">My Career</Link></p>}
              </SectionCard>
            )}

            {/* Personal Records */}
            {vis.showPersonalRecords && (
              <SectionCard icon={<Medal className="h-4 w-4 text-orange-500" />} title="Personal Records">
                {hasPRs ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(personalRecords as any[]).slice(0, 8).map((pr: any) => (
                      <div key={pr.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-800/50">
                        <div className="min-w-0"><p className="text-xs font-semibold truncate">{pr.metricName}</p><p className="text-[11px] text-zinc-500 truncate">{pr.drill?.title || "Training"}</p></div>
                        <span className="text-base font-black text-orange-400 shrink-0">{Number(pr.newValue).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-2">No personal records yet — start training!</p>}
              </SectionCard>
            )}

            {/* Training Log */}
            {vis.showTrainingLog && (
              <SectionCard icon={<Dumbbell className="h-4 w-4 text-orange-500" />} title="Recent Training">
                {hasLogs ? (
                  <div className="space-y-2">
                    {(recentLogs as any[]).slice(0, 5).map((log: any) => (
                      <button key={log.id} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 active:scale-[0.98] transition-all" onClick={() => setLogDetailId(log.id)} data-testid={`button-log-${log.id}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{log.drillTitle || log.title || "Training Session"}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                            {log.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{log.duration}m</span>}
                            {log.score != null && <span className="text-orange-400 font-semibold">Score: {log.score}</span>}
                            {log.shotsMade != null && log.shotsAttempted != null && <span>{log.shotsMade}/{log.shotsAttempted} shots</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {log.completedAt && <span className="text-[10px] text-zinc-600">{new Date(log.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                          <CheckCircle2 className="w-4 h-4 text-green-500/40 mt-0.5 ml-auto" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-2">No recent training sessions</p>}
              </SectionCard>
            )}

            {/* Training Videos */}
            {vis.showVideos && (
              <SectionCard icon={<Video className="h-4 w-4 text-zinc-400" />} title="Training Videos">
                {hasVideos ? (
                  <div className="space-y-2">
                    {(videos as any[]).filter((v: any) => v.isPublic).map((video: any) => (
                      <a key={video.id} href={video.videoUrl?.startsWith("/") ? video.videoUrl : `/objects/${video.videoUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0"><Video className="h-4 w-4 text-orange-500" /></div>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{video.title}</p>{video.description && <p className="text-xs text-zinc-500 truncate">{video.description}</p>}</div>
                      </a>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-2">No public videos — upload in <Link href="/my-film-room" className="text-orange-500 underline">My Film Room</Link></p>}
              </SectionCard>
            )}

            <div className="pt-2 text-center"><Separator className="mb-3" /><p className="text-xs text-zinc-700 font-semibold tracking-widest uppercase">PLAYR1</p></div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VISIBILITY TAB
      ═══════════════════════════════════════════ */}
      {tab === "visibility" && (
        <div className="px-4 space-y-4">
          {/* Photo upload */}
          <Card className="border-zinc-800/60 bg-zinc-900/60">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4 text-orange-500" />Profile Photo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-16 w-16 border-2 border-orange-500/30">
                    <AvatarFallback className="text-xl font-black bg-zinc-800 text-orange-400">{initials}</AvatarFallback>
                    {photoSrc && <AvatarImage src={photoSrc} alt={displayName} className="object-cover" />}
                  </Avatar>
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploading} className="gap-2 border-orange-500/30 hover:border-orange-500/60" data-testid="button-change-photo">
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : <><Camera className="w-3.5 h-3.5" />Change Photo</>}
                  </Button>
                  <p className="text-xs text-zinc-500 mt-1.5">JPEG, PNG, WebP · Max 10MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile access */}
          <Card className="border-zinc-800/60 bg-zinc-900/60">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" />Profile Access</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                <div><p className="text-sm font-semibold flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-orange-400" />Make Profile Public</p><p className="text-xs text-zinc-500 mt-0.5">Anyone with the link can view your profile</p></div>
                <Switch checked={vis.isPublic} onCheckedChange={v => toggle("isPublic", v)} data-testid="switch-is-public" />
              </div>
              {vis.isPublic && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                  <div><p className="text-sm font-semibold flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-amber-400" />Connections Only</p><p className="text-xs text-zinc-500 mt-0.5">Only accepted connections can view details</p></div>
                  <Switch checked={vis.isPrivate} onCheckedChange={v => toggle("isPrivate", v)} data-testid="switch-is-private" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Card customization */}
          <Card className="border-zinc-800/60 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4 text-orange-500" />Shareable Card</CardTitle>
              <p className="text-xs text-zinc-500">Choose what appears in the top profile card (the part you share)</p>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-800 pt-0">
              <VisToggle label="Game Stats"    description="Career averages in the hero banner"  checked={vis.showStats}           onCheckedChange={v => toggle("showStats", v)}           testId="switch-show-stats" />
              <VisToggle label="Player Card"   description="The flippable baseball-style card"   checked={vis.cardShowPlayerCard}  onCheckedChange={v => toggle("cardShowPlayerCard", v)}  testId="switch-card-player-card" />
              <VisToggle label="Archetype"     description="Your selected player type & XP tier" checked={vis.cardShowArchetype}   onCheckedChange={v => toggle("cardShowArchetype", v)}   testId="switch-card-archetype" />
              <VisToggle label="Bio"           description="Your personal description"           checked={vis.cardShowBio}         onCheckedChange={v => toggle("cardShowBio", v)}         testId="switch-card-bio" />
              <VisToggle label="Social Links"  description="Twitter, Instagram, TikTok, YouTube" checked={vis.cardShowSocials}     onCheckedChange={v => toggle("cardShowSocials", v)}     testId="switch-card-socials" />
              <VisToggle label="Highlight Reel" description="Link to your highlight video"       checked={vis.cardShowHighlightReel} onCheckedChange={v => toggle("cardShowHighlightReel", v)} testId="switch-card-highlight-reel" />
            </CardContent>
          </Card>

          {/* Highlight reel visibility */}
          <Card className="border-zinc-800/60 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Video className="w-4 h-4 text-orange-500" />Highlight Reel</CardTitle>
              <p className="text-xs text-zinc-500">Control whether your highlight reel is visible at all (on card + full profile)</p>
            </CardHeader>
            <CardContent>
              <VisToggle label="Show Highlight Reel" description="Set your highlight video URL in My Career" checked={vis.showHighlightReel} onCheckedChange={v => toggle("showHighlightReel", v)} testId="switch-show-highlight-reel" />
            </CardContent>
          </Card>

          {/* In-app profile sections */}
          <Card className="border-zinc-800/60 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-orange-500" />Full Profile Sections</CardTitle>
              <p className="text-xs text-zinc-500">The detailed sections visible below the card inside the app</p>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-800 pt-0">
              <VisToggle label="Skill Ratings"     description="Ball handling, shooting, defense, etc."  checked={vis.showSkills}          onCheckedChange={v => toggle("showSkills", v)}          testId="switch-show-skills" />
              <VisToggle label="Measurements"      description="Height, weight, wingspan"               checked={vis.showPhysical}         onCheckedChange={v => toggle("showPhysical", v)}        testId="switch-show-physical" />
              <VisToggle label="Academic Info"      description="GPA and graduation year"                checked={vis.showAcademic}         onCheckedChange={v => toggle("showAcademic", v)}        testId="switch-show-academic" />
              <VisToggle label="Awards & Trophies" description="Team awards and achievements"           checked={vis.showAchievements}     onCheckedChange={v => toggle("showAchievements", v)}    testId="switch-show-achievements" />
              <VisToggle label="Personal Records"  description="Your drill personal bests"             checked={vis.showPersonalRecords}  onCheckedChange={v => toggle("showPersonalRecords", v)} testId="switch-show-prs" />
              <VisToggle label="Training Log"      description="Recent practice sessions"              checked={vis.showTrainingLog}      onCheckedChange={v => toggle("showTrainingLog", v)}     testId="switch-show-training-log" />
              <VisToggle label="Training Videos"   description="Uploaded training content"             checked={vis.showVideos}           onCheckedChange={v => toggle("showVideos", v)}          testId="switch-show-videos" />
              <VisToggle label="Location"          description="City and state in the hero"            checked={vis.showLocation}         onCheckedChange={v => toggle("showLocation", v)}        testId="switch-show-location" />
              <VisToggle label="Email Address"     description="Contact email (off by default)"        checked={vis.showEmail}            onCheckedChange={v => toggle("showEmail", v)}           testId="switch-show-email" />
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black h-12 text-base"
            onClick={saveVisibility}
            disabled={saving}
            data-testid="button-save-visibility"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      )}

      <TrainingLogDetailDialog logId={logDetailId} open={!!logDetailId} onClose={() => setLogDetailId(null)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} profileUrl={profileUrl} displayName={displayName} />
    </div>
  );
}
