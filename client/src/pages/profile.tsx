import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import {
  Eye, EyeOff, Globe, Lock, ExternalLink, Save, Loader2,
  Ruler, GraduationCap, Video, Star, Zap,
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
        <span className="text-zinc-400">{label}</span>
        <span className="font-bold tabular-nums text-orange-400">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
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
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {checked
          ? <Eye className="w-3.5 h-3.5 text-orange-400" />
          : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          data-testid={testId}
        />
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

  // Sync vis from server — only once after playerProfile loads
  useEffect(() => {
    if (playerProfile && !visLoaded) {
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
      setVisLoaded(true);
    }
  }, [playerProfile, visLoaded]);

  const toggle = (key: keyof VisState, value: boolean) => {
    setVis(prev => ({ ...prev, [key]: value }));
  };

  const saveVisibility = async () => {
    setSaving(true);
    try {
      // Merge visibility flags into the existing profile (so we don't overwrite other fields)
      const payload = { ...(playerProfile ?? {}), ...vis };
      await apiRequest("PUT", "/api/player-profile", payload);
      await queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      toast({ title: "Visibility saved", description: "Your profile settings have been updated." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayName = userProfile?.displayName
    || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName)
    || user?.email
    || "Player";

  const publicSlug = generateSlug(displayName);

  const photoSrc = careerProfile?.cardPhotoUrl
    ? getObjectUrl(careerProfile.cardPhotoUrl)
    : userProfile?.profilePhotoUrl
    ? getObjectUrl(userProfile.profilePhotoUrl)
    : user?.profileImageUrl
    ? getObjectUrl(user.profileImageUrl)
    : undefined;

  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const isPublic = vis.isPublic;

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight" data-testid="text-page-title">My Profile</h1>
          <p className="text-sm text-zinc-500">Preview and customize your public profile</p>
        </div>
        {isPublic && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 border-zinc-700" asChild>
            <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-view-public-profile">
              <ExternalLink className="w-3.5 h-3.5" />
              View Live
            </a>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
        {(["preview", "visibility"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
              activeTab === tab
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── PREVIEW TAB ── */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          {/* Sports card hero — PLAYR1 branded */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80">
            {/* Background layers */}
            <div className="absolute inset-0 bg-zinc-950" />
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/25 via-purple-900/15 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_top_right,rgba(251,146,60,0.18),transparent)]" />
            {/* subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative p-5 pb-6">
              {/* Private banner */}
              {!isPublic && (
                <div className="mb-5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300/90 leading-snug">
                    Your profile is <strong>private</strong>. Enable "Public Profile" in Visibility so others can find you.
                  </p>
                </div>
              )}

              <div className="flex items-end gap-4">
                {/* Avatar with glow ring */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-orange-400 via-purple-500 to-cyan-400 opacity-70 blur-[3px]" />
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center">
                    {photoSrc
                      ? <img src={photoSrc} alt={displayName} className="w-full h-full object-cover" />
                      : <span className="text-2xl font-black text-orange-400">{initials}</span>}
                  </div>
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
                    <p className="text-sm text-zinc-400 mb-2 leading-snug">{playerProfile.headline}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {careerProfile?.positions?.map((pos: string) => (
                      <Badge key={pos} className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-semibold">
                        {POSITION_LABELS[pos] || pos}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    {careerProfile?.schoolName && (
                      <span className="flex items-center gap-1"><School className="h-3 w-3" />{careerProfile.schoolName}</span>
                    )}
                    {careerProfile?.teamName && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{careerProfile.teamName}</span>
                    )}
                    {vis.showLocation && userProfile?.city && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{userProfile.city}{userProfile.state ? `, ${userProfile.state}` : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Archetype chip */}
          {vis.showArchetype && careerProfile?.assessmentArchetype && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/10 to-orange-500/10">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Player Archetype</p>
                <p className="font-bold text-white">{careerProfile.assessmentArchetype}</p>
              </div>
            </div>
          )}

          {/* Bio */}
          {playerProfile?.bio && (
            <div className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-sm text-zinc-400 leading-relaxed">{playerProfile.bio}</p>
            </div>
          )}

          {/* Social links */}
          {vis.showSocialLinks && (playerProfile?.socialTwitter || playerProfile?.socialInstagram || playerProfile?.socialTiktok || playerProfile?.socialYoutube) && (
            <div className="flex flex-wrap items-center gap-2">
              {playerProfile?.socialTwitter && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  <SiX className="h-3 w-3" />X / Twitter
                </span>
              )}
              {playerProfile?.socialInstagram && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  <SiInstagram className="h-3 w-3 text-pink-400" />Instagram
                </span>
              )}
              {playerProfile?.socialTiktok && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  <SiTiktok className="h-3 w-3" />TikTok
                </span>
              )}
              {playerProfile?.socialYoutube && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
                  <SiYoutube className="h-3 w-3 text-red-400" />YouTube
                </span>
              )}
            </div>
          )}

          {/* Skill ratings */}
          {vis.showSkills && (careerProfile?.skillBallHandling || careerProfile?.skillShooting || careerProfile?.skillDefense) && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-bold text-white">Skill Ratings</span>
              </div>
              <SkillBar label="Ball Handling" value={careerProfile.skillBallHandling} />
              <SkillBar label="Shooting" value={careerProfile.skillShooting} />
              <SkillBar label="Defense" value={careerProfile.skillDefense} />
              <SkillBar label="Athleticism" value={careerProfile.skillAthleticism} />
              <SkillBar label="IQ" value={careerProfile.skillIQ} />
            </div>
          )}

          {/* Physical measurements */}
          {vis.showPhysical && (playerProfile?.heightFeet || playerProfile?.weight > 0 || playerProfile?.wingspan) && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Ruler className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-bold text-white">Measurements</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {playerProfile.heightFeet > 0 && (
                  <div className="text-center p-3 rounded-xl bg-zinc-800/60">
                    <p className="text-lg font-black text-white">{playerProfile.heightFeet}'{playerProfile.heightInches || 0}"</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mt-0.5">Height</p>
                  </div>
                )}
                {playerProfile.weight > 0 && (
                  <div className="text-center p-3 rounded-xl bg-zinc-800/60">
                    <p className="text-lg font-black text-white">{playerProfile.weight}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mt-0.5">lbs</p>
                  </div>
                )}
                {playerProfile.wingspan && (
                  <div className="text-center p-3 rounded-xl bg-zinc-800/60">
                    <p className="text-lg font-black text-white">{playerProfile.wingspan}"</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mt-0.5">Wingspan</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Academic */}
          {vis.showAcademic && (playerProfile?.gradYear > 0 || playerProfile?.gpa) && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-bold text-white">Academic</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {playerProfile.gradYear > 0 && (
                  <div className="text-center p-3 rounded-xl bg-zinc-800/60">
                    <p className="text-lg font-black text-white">{playerProfile.gradYear}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mt-0.5">Class of</p>
                  </div>
                )}
                {playerProfile.gpa && (
                  <div className="text-center p-3 rounded-xl bg-zinc-800/60">
                    <p className="text-lg font-black text-white">{playerProfile.gpa}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mt-0.5">GPA</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Highlight reel */}
          {playerProfile?.highlightVideoUrl && (
            <a
              href={playerProfile.highlightVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-red-500/5 hover:border-orange-500/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white">Highlight Reel</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{playerProfile.highlightVideoUrl}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-600 shrink-0" />
            </a>
          )}

          {/* Empty state */}
          {!playerProfile?.bio && !playerProfile?.headline && !careerProfile?.positions?.length && (
            <div className="py-10 text-center space-y-2 rounded-2xl border border-dashed border-zinc-800">
              <BarChart3 className="w-8 h-8 text-zinc-700 mx-auto" />
              <p className="font-semibold text-sm text-zinc-400">Your profile is empty</p>
              <p className="text-xs text-zinc-600 px-6">
                Fill out your info in{" "}
                <Link href="/career" className="text-orange-500 underline">My Career</Link>{" "}
                to populate your public profile.
              </p>
            </div>
          )}

          {isPublic && (
            <Button variant="outline" className="w-full gap-2 border-zinc-700 text-zinc-300 hover:text-white" asChild>
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
          {/* Public / private access */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-white">Profile Access</span>
            </div>

            {/* Make public */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-orange-400" />Make Profile Public
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Anyone with the link can see your profile</p>
              </div>
              <Switch
                checked={vis.isPublic}
                onCheckedChange={v => toggle("isPublic", v)}
                data-testid="switch-is-public"
              />
            </div>

            {/* Friends only — shown when public */}
            {vis.isPublic && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60">
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />Connections Only
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Only accepted connections can view details</p>
                </div>
                <Switch
                  checked={vis.isPrivate}
                  onCheckedChange={v => toggle("isPrivate", v)}
                  data-testid="switch-is-private"
                />
              </div>
            )}

            {/* Public URL */}
            {vis.isPublic && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <p className="text-xs text-zinc-400 flex-1">
                  <span className="font-mono text-orange-300">/player/{publicSlug}</span>
                </p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-orange-400 hover:text-orange-300" asChild>
                  <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />View
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Per-section toggles */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-white">Section Visibility</span>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Choose what appears on your public profile</p>
            <div className="divide-y divide-zinc-800">
              {[
                { key: "showStats" as const,           label: "Game Stats",        desc: "Points, rebounds, assists averages" },
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
                { key: "showEmail" as const,            label: "Email Address",     desc: "Your contact email (off by default)" },
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
            </div>
          </div>

          <Button
            className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold"
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
