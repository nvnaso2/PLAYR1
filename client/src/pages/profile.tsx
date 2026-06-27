import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import {
  Eye, EyeOff, Globe, Lock, ExternalLink, Save, Loader2,
  Ruler, GraduationCap, Video, Trophy, Medal, Star, Zap,
  BarChart3, School, Users, MapPin,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

const POSITION_LABELS: Record<string, string> = {
  PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward",
  PF: "Power Forward", C: "Center",
};

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
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
    <div className="flex items-center justify-between py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {checked
          ? <Eye className="w-3.5 h-3.5 text-primary" />
          : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
        <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"preview" | "visibility">("preview");
  const [saving, setSaving] = useState(false);

  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: playerProfile, isLoading } = useQuery<any>({ queryKey: ["/api/player-profile"] });
  const { data: careerProfile } = useQuery<any>({ queryKey: ["/api/career"] });

  // Local visibility state — mirrors playerProfile fields
  const [vis, setVis] = useState<Record<string, boolean> | null>(null);

  // Sync vis from server once loaded
  if (playerProfile && vis === null) {
    setVis({
      isPublic: playerProfile.isPublic ?? false,
      isPrivate: playerProfile.isPrivate ?? false,
      showStats: playerProfile.showStats ?? true,
      showAchievements: playerProfile.showAchievements ?? true,
      showVideos: playerProfile.showVideos ?? true,
      showPersonalRecords: playerProfile.showPersonalRecords ?? true,
      showTrainingLog: playerProfile.showTrainingLog ?? false,
      showSkills: playerProfile.showSkills ?? true,
      showArchetype: playerProfile.showArchetype ?? true,
      showLocation: playerProfile.showLocation ?? true,
      showPhysical: playerProfile.showPhysical ?? true,
      showAcademic: playerProfile.showAcademic ?? true,
      showSocialLinks: playerProfile.showSocialLinks ?? true,
      showEmail: playerProfile.showEmail ?? false,
    });
  }

  const saveVisibility = async () => {
    if (!vis) return;
    setSaving(true);
    try {
      const displayName = userProfile?.displayName || user?.firstName || "player";
      const slug = generateSlug(displayName);
      await apiRequest("PUT", "/api/player-profile", { ...playerProfile, ...vis, slug });
      queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      toast({ title: "Visibility saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: string, value: boolean) => {
    setVis(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const displayName = userProfile?.displayName || (user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.email || "Player");

  const publicSlug = generateSlug(displayName);

  const photoSrc = careerProfile?.cardPhotoUrl
    ? getObjectUrl(careerProfile.cardPhotoUrl)
    : userProfile?.profilePhotoUrl
    ? getObjectUrl(userProfile.profilePhotoUrl)
    : user?.profileImageUrl
    ? getObjectUrl(user.profileImageUrl)
    : undefined;

  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const isPublic = vis?.isPublic ?? false;

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const tabs = [
    { id: "preview" as const, label: "Preview" },
    { id: "visibility" as const, label: "Visibility" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">My Profile</h1>
          <p className="text-sm text-muted-foreground">Preview and customize your public profile</p>
        </div>
        {isPublic && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
            <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-view-public-profile">
              <ExternalLink className="w-3.5 h-3.5" />
              View Live
            </a>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PREVIEW TAB ── */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          {/* Sports card hero preview */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-purple-900/20 to-cyan-900/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.2),transparent_60%)]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative p-5">
              {/* not-public banner */}
              {!isPublic && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">
                    Your profile is private. Enable "Public Profile" in Visibility to let others find you.
                  </p>
                </div>
              )}

              <div className="flex items-end gap-4">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-orange-400 via-purple-500 to-cyan-400 opacity-60 blur-sm" />
                  <Avatar className="relative h-24 w-24 border-2 border-white/20">
                    <AvatarFallback className="text-2xl font-bold bg-zinc-900 text-orange-400">{initials}</AvatarFallback>
                    {photoSrc && <img src={photoSrc} alt={displayName} className="absolute inset-0 w-full h-full object-cover rounded-full" />}
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    {careerProfile?.jerseyNumber != null && (
                      <span className="text-xl font-black text-orange-400">#{careerProfile.jerseyNumber}</span>
                    )}
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none" data-testid="text-profile-preview-name">
                      {displayName}
                    </h2>
                  </div>

                  {playerProfile?.headline && (
                    <p className="text-sm text-white/70 mb-2">{playerProfile.headline}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {careerProfile?.positions?.map((pos: string) => (
                      <Badge key={pos} className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                        {POSITION_LABELS[pos] || pos}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/60">
                    {careerProfile?.schoolName && (
                      <span className="flex items-center gap-1"><School className="h-3 w-3" />{careerProfile.schoolName}</span>
                    )}
                    {careerProfile?.teamName && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{careerProfile.teamName}</span>
                    )}
                    {vis?.showLocation && userProfile?.city && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{userProfile.city}, {userProfile.state}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Archetype */}
          {vis?.showArchetype && careerProfile?.assessmentArchetype && (
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
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{playerProfile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Social links */}
          {vis?.showSocialLinks && (playerProfile?.socialTwitter || playerProfile?.socialInstagram || playerProfile?.socialTiktok || playerProfile?.socialYoutube) && (
            <div className="flex flex-wrap items-center gap-2">
              {playerProfile?.socialTwitter && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                  <SiX className="h-3 w-3" />X
                </span>
              )}
              {playerProfile?.socialInstagram && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                  <SiInstagram className="h-3 w-3" />Instagram
                </span>
              )}
              {playerProfile?.socialTiktok && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                  <SiTiktok className="h-3 w-3" />TikTok
                </span>
              )}
              {playerProfile?.socialYoutube && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                  <SiYoutube className="h-3 w-3" />YouTube
                </span>
              )}
            </div>
          )}

          {/* Skills */}
          {vis?.showSkills && (careerProfile?.skillBallHandling || careerProfile?.skillShooting || careerProfile?.skillDefense) && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-orange-500" />Skill Ratings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <SkillBar label="Ball Handling" value={careerProfile.skillBallHandling} />
                <SkillBar label="Shooting" value={careerProfile.skillShooting} />
                <SkillBar label="Defense" value={careerProfile.skillDefense} />
                <SkillBar label="Athleticism" value={careerProfile.skillAthleticism} />
                <SkillBar label="IQ" value={careerProfile.skillIQ} />
              </CardContent>
            </Card>
          )}

          {/* Physical */}
          {vis?.showPhysical && (playerProfile?.heightFeet || playerProfile?.weight || playerProfile?.wingspan) && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Ruler className="h-4 w-4" />Measurements
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-3">
                  {playerProfile.heightFeet && (
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <p className="text-lg font-bold">{playerProfile.heightFeet}'{playerProfile.heightInches || 0}"</p>
                      <p className="text-xs text-muted-foreground">Height</p>
                    </div>
                  )}
                  {playerProfile.weight > 0 && (
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <p className="text-lg font-bold">{playerProfile.weight}</p>
                      <p className="text-xs text-muted-foreground">Weight (lbs)</p>
                    </div>
                  )}
                  {playerProfile.wingspan && (
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <p className="text-lg font-bold">{playerProfile.wingspan}</p>
                      <p className="text-xs text-muted-foreground">Wingspan</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Academic */}
          {vis?.showAcademic && (playerProfile?.gradYear || playerProfile?.gpa) && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />Academic
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {playerProfile.gradYear > 0 && (
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <p className="text-lg font-bold">{playerProfile.gradYear}</p>
                      <p className="text-xs text-muted-foreground">Class of</p>
                    </div>
                  )}
                  {playerProfile.gpa && (
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <p className="text-lg font-bold">{playerProfile.gpa}</p>
                      <p className="text-xs text-muted-foreground">GPA</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Highlight reel */}
          {playerProfile?.highlightVideoUrl && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Highlight Reel</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{playerProfile.highlightVideoUrl}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
            </div>
          )}

          {/* Empty state */}
          {!playerProfile?.bio && !playerProfile?.headline && !careerProfile?.positions?.length && (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-6 text-center space-y-2">
                <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="font-medium text-sm">Your profile is empty</p>
                <p className="text-xs text-muted-foreground">
                  Fill out your info in{" "}
                  <Link href="/career" className="text-primary underline">My Career</Link>{" "}
                  to populate your public profile.
                </p>
              </CardContent>
            </Card>
          )}

          {isPublic && (
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-view-full-profile">
                <ExternalLink className="w-4 h-4" />
                View Full Public Profile
              </a>
            </Button>
          )}
        </div>
      )}

      {/* ── VISIBILITY TAB ── */}
      {activeTab === "visibility" && (
        <div className="space-y-4">
          {/* Public / private toggle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />Profile Access
              </CardTitle>
              <CardDescription>Control who can see your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-primary" />Make Profile Public
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Anyone with the link can see your profile</p>
                </div>
                <Switch
                  checked={vis?.isPublic ?? false}
                  onCheckedChange={v => toggle("isPublic", v)}
                  data-testid="switch-is-public"
                />
              </div>

              {vis?.isPublic && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />Friends Only Mode
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Only accepted connections can view</p>
                    </div>
                    <Switch
                      checked={vis?.isPrivate ?? false}
                      onCheckedChange={v => toggle("isPrivate", v)}
                      data-testid="switch-is-private"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground flex-1">
                      Your URL: <span className="font-mono text-foreground">/player/{publicSlug}</span>
                    </p>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" asChild>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />Section Visibility
              </CardTitle>
              <CardDescription>Choose what appears on your public profile</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {[
                { key: "showStats", label: "Game Stats", desc: "Points, rebounds, assists averages" },
                { key: "showSkills", label: "Skill Ratings", desc: "Ball handling, shooting, defense scores" },
                { key: "showArchetype", label: "Player Archetype", desc: "Your AI-assessed player type" },
                { key: "showAchievements", label: "Awards & Trophies", desc: "Team awards you've earned" },
                { key: "showPersonalRecords", label: "Personal Records", desc: "Your drill personal bests" },
                { key: "showVideos", label: "Training Videos", desc: "Uploaded training content" },
                { key: "showTrainingLog", label: "Training Log", desc: "Recent practice sessions" },
                { key: "showPhysical", label: "Physical Info", desc: "Height, weight, wingspan" },
                { key: "showAcademic", label: "Academic Info", desc: "GPA and graduation year" },
                { key: "showLocation", label: "Location", desc: "City and state" },
                { key: "showSocialLinks", label: "Social Links", desc: "Twitter, Instagram, TikTok, YouTube" },
                { key: "showEmail", label: "Email Address", desc: "Your contact email (off by default)" },
              ].map(({ key, label, desc }) => (
                <VisibilityToggle
                  key={key}
                  label={label}
                  description={desc}
                  checked={vis?.[key] ?? false}
                  onCheckedChange={v => toggle(key, v)}
                  testId={`switch-${key}`}
                />
              ))}
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2"
            onClick={saveVisibility}
            disabled={saving}
            data-testid="button-save-visibility"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Visibility Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
