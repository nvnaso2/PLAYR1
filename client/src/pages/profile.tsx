import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import {
  Eye, EyeOff, Globe, Lock, ExternalLink, Save, Loader2,
  Ruler, GraduationCap, Video, Star, Zap, Trophy, Medal,
  BarChart3, School, Users, MapPin,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

const POSITION_LABELS: Record<string, string> = {
  PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward",
  PF: "Power Forward", C: "Center",
};

const GRADE_LABELS: Record<string, string> = {
  elementary: "Elementary School", "6th": "6th Grade", "7th": "7th Grade",
  "8th": "8th Grade", freshman: "HS Freshman", sophomore: "HS Sophomore",
  junior: "HS Junior", senior: "HS Senior", "college-freshman": "College Freshman",
  "college-sophomore": "College Sophomore", "college-junior": "College Junior",
  "college-senior": "College Senior", "post-college": "Post-College",
};

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 min-w-0">
      <span className="text-xl font-bold text-white">{value}</span>
      <span className="text-[11px] text-white/60 font-medium mt-0.5">{label}</span>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  const pct = Math.min(100, Math.round((value / 100) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function VisibilityToggle({
  label, description, checked, onCheckedChange, testId,
}: {
  label: string; description?: string; checked: boolean;
  onCheckedChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {checked
          ? <Eye className="w-3.5 h-3.5 text-orange-400" />
          : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
        <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
      </div>
    </div>
  );
}

const VIS_DEFAULTS = {
  isPublic: false,
  isPrivate: false,
  showStats: true,
  showAchievements: true,
  showVideos: true,
  showPersonalRecords: true,
  showTrainingLog: false,
  showSkills: true,
  showArchetype: true,
  showLocation: true,
  showPhysical: true,
  showAcademic: true,
  showSocialLinks: true,
  showEmail: false,
};

type VisState = typeof VIS_DEFAULTS;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"preview" | "visibility">("preview");
  const [saving, setSaving] = useState(false);
  const [vis, setVis] = useState<VisState>(VIS_DEFAULTS);
  const [visLoaded, setVisLoaded] = useState(false);

  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: playerProfile, isLoading } = useQuery<any>({ queryKey: ["/api/player-profile"] });
  const { data: careerProfile } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: statsOverview } = useQuery<any>({ queryKey: ["/api/stats/overview"] });
  const { data: awards } = useQuery<any[]>({ queryKey: ["/api/team-awards"] });
  const { data: personalRecords } = useQuery<any[]>({ queryKey: ["/api/personal-records"] });
  const { data: videos } = useQuery<any[]>({ queryKey: ["/api/videos"] });

  // Sync vis from server exactly once after playerProfile loads
  useEffect(() => {
    if (playerProfile && !visLoaded) {
      setVis({
        isPublic:          playerProfile.isPublic          ?? false,
        isPrivate:         playerProfile.isPrivate         ?? false,
        showStats:         playerProfile.showStats         ?? true,
        showAchievements:  playerProfile.showAchievements  ?? true,
        showVideos:        playerProfile.showVideos        ?? true,
        showPersonalRecords: playerProfile.showPersonalRecords ?? true,
        showTrainingLog:   playerProfile.showTrainingLog   ?? false,
        showSkills:        playerProfile.showSkills        ?? true,
        showArchetype:     playerProfile.showArchetype     ?? true,
        showLocation:      playerProfile.showLocation      ?? true,
        showPhysical:      playerProfile.showPhysical      ?? true,
        showAcademic:      playerProfile.showAcademic      ?? true,
        showSocialLinks:   playerProfile.showSocialLinks   ?? true,
        showEmail:         playerProfile.showEmail         ?? false,
      });
      setVisLoaded(true);
    }
  }, [playerProfile, visLoaded]);

  const toggle = (key: keyof VisState, value: boolean) =>
    setVis(prev => ({ ...prev, [key]: value }));

  const saveVisibility = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/player-profile", { ...(playerProfile ?? {}), ...vis });
      await queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      toast({ title: "Visibility saved", description: "Your profile settings have been updated." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Derived display values
  const displayName =
    userProfile?.displayName ||
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName) ||
    user?.email || "Player";

  const publicSlug = generateSlug(displayName);

  const playerInitials = displayName
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const photoSrc = careerProfile?.cardPhotoUrl
    ? getObjectUrl(careerProfile.cardPhotoUrl)
    : userProfile?.profilePhotoUrl
    ? getObjectUrl(userProfile.profilePhotoUrl)
    : user?.profileImageUrl
    ? getObjectUrl(user.profileImageUrl)
    : undefined;

  const hasPhysical = playerProfile?.heightFeet || playerProfile?.weight > 0 || playerProfile?.wingspan;
  const hasAcademic = playerProfile?.gradYear > 0 || playerProfile?.gpa;
  const hasSocials   = playerProfile?.socialTwitter || playerProfile?.socialInstagram || playerProfile?.socialTiktok || playerProfile?.socialYoutube;
  const hasSkills    = careerProfile && (careerProfile.skillBallHandling || careerProfile.skillShooting || careerProfile.skillDefense || careerProfile.skillAthleticism || careerProfile.skillIQ);

  const careerStats = statsOverview;
  const hasStats = careerStats && careerStats.totalGames > 0;

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight" data-testid="text-page-title">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">What others see when they visit your profile</p>
        </div>
        {vis.isPublic && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
            <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-view-public-profile">
              <ExternalLink className="w-3.5 h-3.5" />
              View Live
            </a>
          </Button>
        )}
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 mx-4 mb-5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
        {(["preview", "visibility"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
              activeTab === tab
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          PREVIEW TAB — renders the full profile
          exactly as it appears to visitors
      ════════════════════════════════════════ */}
      {activeTab === "preview" && (
        <div>
          {/* Private warning banner */}
          {!vis.isPublic && (
            <div className="mx-4 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300/90 leading-snug">
                <strong>Profile is private.</strong> Enable "Public Profile" in the Visibility tab so others can find and view you.
              </p>
            </div>
          )}

          {/* ── SPORTS CARD HERO (identical to player-public.tsx) ── */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-purple-900/20 to-cyan-900/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.2),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.15),transparent_60%)]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative px-4 pt-8 pb-10">
              <div className="flex items-end gap-5">
                {/* Avatar with holographic glow */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-orange-400 via-purple-500 to-cyan-400 opacity-60 blur-sm" />
                  <Avatar className="relative h-28 w-28 border-2 border-white/20">
                    <AvatarFallback className="text-3xl font-bold bg-zinc-900 text-orange-400">
                      {playerInitials}
                    </AvatarFallback>
                    {photoSrc && (
                      <AvatarImage src={photoSrc} alt={displayName} className="object-cover" />
                    )}
                  </Avatar>
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    {careerProfile?.jerseyNumber != null && (
                      <span className="text-2xl font-black text-orange-400">#{careerProfile.jerseyNumber}</span>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none" data-testid="text-profile-preview-name">
                      {displayName}
                    </h2>
                  </div>

                  {playerProfile?.headline && (
                    <p className="text-sm text-white/70 mb-2">{playerProfile.headline}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {careerProfile?.positions?.map((pos: string) => (
                      <Badge key={pos} className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs">
                        {POSITION_LABELS[pos] || pos}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                    {careerProfile?.schoolName && (
                      <span className="flex items-center gap-1"><School className="h-3 w-3" />{careerProfile.schoolName}</span>
                    )}
                    {careerProfile?.teamName && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{careerProfile.teamName}</span>
                    )}
                    {careerProfile?.gradeLevel && (
                      <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{GRADE_LABELS[careerProfile.gradeLevel] || careerProfile.gradeLevel}</span>
                    )}
                    {vis.showLocation && userProfile?.city && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{userProfile.city}{userProfile.state ? `, ${userProfile.state}` : ""}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Career stats strip */}
              {vis.showStats && hasStats && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Career Averages</span>
                    <span className="text-xs text-white/30">·</span>
                    <span className="text-xs text-white/40">{careerStats.totalGames} games</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <StatPill label="PPG" value={Number(careerStats.avgPoints ?? 0).toFixed(1)} />
                    <StatPill label="RPG" value={Number(careerStats.avgRebounds ?? 0).toFixed(1)} />
                    <StatPill label="APG" value={Number(careerStats.avgAssists ?? 0).toFixed(1)} />
                    <StatPill label="SPG" value={Number(careerStats.avgSteals ?? 0).toFixed(1)} />
                    <StatPill label="BPG" value={Number(careerStats.avgBlocks ?? 0).toFixed(1)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTIONS below hero ── */}
          <div className="px-4 space-y-4 mt-4">

            {/* Archetype */}
            {vis.showArchetype && careerProfile?.assessmentArchetype && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border bg-gradient-to-r from-purple-500/10 to-orange-500/10 border-purple-500/20">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Player Archetype</p>
                  <p className="font-bold">{careerProfile.assessmentArchetype}</p>
                </div>
              </div>
            )}

            {/* Bio */}
            {playerProfile?.bio && (
              <Card className="rounded-2xl border-border/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {playerProfile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Social links */}
            {vis.showSocialLinks && hasSocials && (
              <div className="flex items-center justify-center gap-3 py-2">
                {playerProfile?.socialTwitter && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted text-sm font-medium">
                    <SiX className="h-3.5 w-3.5" />X
                  </span>
                )}
                {playerProfile?.socialInstagram && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted text-sm font-medium">
                    <SiInstagram className="h-3.5 w-3.5" />Instagram
                  </span>
                )}
                {playerProfile?.socialTiktok && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted text-sm font-medium">
                    <SiTiktok className="h-3.5 w-3.5" />TikTok
                  </span>
                )}
                {playerProfile?.socialYoutube && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted text-sm font-medium">
                    <SiYoutube className="h-3.5 w-3.5" />YouTube
                  </span>
                )}
              </div>
            )}

            {/* Skills */}
            {vis.showSkills && hasSkills && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-orange-500" />Skill Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <SkillBar label="Ball Handling" value={careerProfile?.skillBallHandling ?? null} />
                  <SkillBar label="Shooting" value={careerProfile?.skillShooting ?? null} />
                  <SkillBar label="Defense" value={careerProfile?.skillDefense ?? null} />
                  <SkillBar label="Athleticism" value={careerProfile?.skillAthleticism ?? null} />
                  <SkillBar label="IQ" value={careerProfile?.skillIQ ?? null} />
                </CardContent>
              </Card>
            )}

            {/* Highlight reel */}
            {playerProfile?.highlightVideoUrl && (
              <a
                href={playerProfile.highlightVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Watch Highlight Reel</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tap to open video</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </a>
            )}

            {/* Physical */}
            {vis.showPhysical && hasPhysical && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Ruler className="h-4 w-4" />Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-3 gap-3">
                    {playerProfile?.heightFeet > 0 && (
                      <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-lg font-bold">{playerProfile.heightFeet}'{playerProfile.heightInches || 0}"</p>
                        <p className="text-xs text-muted-foreground">Height</p>
                      </div>
                    )}
                    {playerProfile?.weight > 0 && (
                      <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-lg font-bold">{playerProfile.weight}</p>
                        <p className="text-xs text-muted-foreground">Weight (lbs)</p>
                      </div>
                    )}
                    {playerProfile?.wingspan && (
                      <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-lg font-bold">{playerProfile.wingspan}"</p>
                        <p className="text-xs text-muted-foreground">Wingspan</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Academic */}
            {vis.showAcademic && hasAcademic && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />Academic
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {playerProfile?.gradYear > 0 && (
                      <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-lg font-bold">{playerProfile.gradYear}</p>
                        <p className="text-xs text-muted-foreground">Class of</p>
                      </div>
                    )}
                    {playerProfile?.gpa && (
                      <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-lg font-bold">{playerProfile.gpa}</p>
                        <p className="text-xs text-muted-foreground">GPA</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Awards */}
            {vis.showAchievements && awards && awards.length > 0 && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />Awards & Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {awards.map((award: any) => (
                    <div key={award.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                      <Trophy className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{award.awardName}</p>
                        <p className="text-xs text-muted-foreground">{award.teamName}{award.season ? ` · ${award.season}` : ""}</p>
                        {award.description && <p className="text-xs text-muted-foreground mt-0.5">{award.description}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Personal Records */}
            {vis.showPersonalRecords && personalRecords && personalRecords.length > 0 && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Medal className="h-4 w-4 text-orange-500" />Personal Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {personalRecords.slice(0, 8).map((pr: any) => (
                      <div key={pr.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{pr.metricName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{pr.drill?.title || "Training"}</p>
                        </div>
                        <span className="text-base font-bold text-orange-500 shrink-0">{Number(pr.newValue).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Training Videos */}
            {vis.showVideos && videos && videos.length > 0 && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Video className="h-4 w-4" />Training Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {videos.filter((v: any) => v.isPublic).map((video: any) => (
                    <a
                      key={video.id}
                      href={video.videoUrl?.startsWith("/") ? video.videoUrl : `/objects/${video.videoUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                        <Video className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        {video.description && <p className="text-xs text-muted-foreground truncate">{video.description}</p>}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty state when no meaningful info */}
            {!playerProfile?.bio && !playerProfile?.headline && !careerProfile?.positions?.length &&
              !hasSkills && !hasPhysical && !hasAcademic && !hasSocials && (
              <div className="py-12 text-center space-y-3 rounded-2xl border border-dashed border-border">
                <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="font-semibold text-sm">Your profile is empty</p>
                <p className="text-xs text-muted-foreground px-8">
                  Fill out your info in{" "}
                  <Link href="/career" className="text-orange-500 underline">My Career</Link>{" "}
                  to populate your public profile.
                </p>
              </div>
            )}

            {/* Footer — same as public page */}
            <div className="pt-4 pb-2 text-center space-y-3">
              <Separator />
              <p className="text-xs text-muted-foreground">Powered by PLAYR1</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          VISIBILITY TAB
      ════════════════════════════════════════ */}
      {activeTab === "visibility" && (
        <div className="px-4 space-y-4">
          {/* Profile access */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-orange-500" />Profile Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-orange-400" />Make Profile Public
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Anyone with the link can see your profile</p>
                </div>
                <Switch
                  checked={vis.isPublic}
                  onCheckedChange={v => toggle("isPublic", v)}
                  data-testid="switch-is-public"
                />
              </div>

              {vis.isPublic && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />Connections Only
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Only accepted connections can view details</p>
                    </div>
                    <Switch
                      checked={vis.isPrivate}
                      onCheckedChange={v => toggle("isPrivate", v)}
                      data-testid="switch-is-private"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <p className="text-xs text-zinc-400 flex-1 font-mono">/player/{publicSlug}</p>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-orange-400 hover:text-orange-300" asChild>
                      <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />View
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Per-section toggles */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-500" />Section Visibility
              </CardTitle>
              <p className="text-xs text-muted-foreground">Toggle sections on/off — changes reflect live in Preview</p>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 pt-0">
              {[
                { key: "showStats" as const,           label: "Game Stats",        desc: "Career averages: points, rebounds, assists" },
                { key: "showSkills" as const,           label: "Skill Ratings",     desc: "Ball handling, shooting, defense scores" },
                { key: "showArchetype" as const,        label: "Player Archetype",  desc: "Your AI-assessed player type" },
                { key: "showAchievements" as const,     label: "Awards & Trophies", desc: "Team awards you've earned" },
                { key: "showPersonalRecords" as const,  label: "Personal Records",  desc: "Your drill personal bests" },
                { key: "showVideos" as const,           label: "Training Videos",   desc: "Uploaded training content" },
                { key: "showTrainingLog" as const,      label: "Training Log",      desc: "Recent practice sessions" },
                { key: "showPhysical" as const,         label: "Measurements",      desc: "Height, weight, wingspan" },
                { key: "showAcademic" as const,         label: "Academic Info",     desc: "GPA and graduation year" },
                { key: "showLocation" as const,         label: "Location",          desc: "City and state" },
                { key: "showSocialLinks" as const,      label: "Social Links",      desc: "Twitter, Instagram, TikTok, YouTube" },
                { key: "showEmail" as const,            label: "Email Address",     desc: "Contact email (off by default)" },
              ].map(({ key, label, desc }) => (
                <VisibilityToggle
                  key={key}
                  label={label}
                  description={desc}
                  checked={vis[key]}
                  onCheckedChange={v => toggle(key, v)}
                  testId={`switch-${key}`}
                />
              ))}
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
            onClick={saveVisibility}
            disabled={saving}
            data-testid="button-save-visibility"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Visibility Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
