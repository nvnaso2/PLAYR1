import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getObjectUrl, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap, Ruler, Trophy, Medal, Video, ExternalLink, Clock,
  School, Users, Dumbbell, BarChart3, ArrowLeft, MapPin,
  Globe, Lock, Zap, Star, UserPlus, UserRoundCheck, UserRoundX,
} from "lucide-react";
import { ShareMenu } from "@/components/share-menu";
import { BaseballCard } from "@/pages/career";
import { SiX, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { PlayerProfile, TeamAward, PersonalRecord, UserVideo } from "@shared/schema";

interface PublicProfileData {
  profile: PlayerProfile;
  user: { firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
  userProfile: { city: string | null; state: string | null; email: string | null } | null;
  archetype: { name: string; tagline: string; colorTheme: string; primaryHex: string } | null;
  career: {
    positions: string[] | null;
    teamName: string | null;
    schoolName: string | null;
    gradeLevel: string | null;
    jerseyNumber: number | null;
    aspiration: string | null;
    cardPhotoUrl: string | null;
    skillBallHandling: number | null;
    skillShooting: number | null;
    skillDefense: number | null;
    skillAthleticism: number | null;
    skillBasketballIQ: number | null;
    assessmentArchetype: string | null;
    assessmentArchetypeTagline: string | null;
  } | null;
  careerStats?: {
    totalGames: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
    wins: number;
    losses: number;
  };
  awards?: TeamAward[];
  personalRecords?: Array<PersonalRecord & { drill: { title: string } }>;
  videos?: UserVideo[];
  recentTraining?: Array<{
    id: string;
    duration: number;
    reps: number | null;
    sets: number | null;
    score: number | null;
    shotLocation: string | null;
    completedAt: string | Date | null;
  }>;
  relationship?: {
    isAuthenticated: boolean;
    isSelf: boolean;
    isFollowing: boolean;
    connectionId: string | null;
    connectionStatus: "friends" | "outgoing_pending" | "incoming_pending" | null;
    followerCount: number;
    followingCount: number;
  };
}

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

function StatPill({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm min-w-0" data-testid={testId}>
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

function PublicPlayerCard({ data }: { data: PublicProfileData }) {
  const { profile, user, userProfile, career, careerStats, archetype } = data;
  const displayName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Player";
  const initials = displayName.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "P";
  const photoSrc = career?.cardPhotoUrl
    ? getObjectUrl(career.cardPhotoUrl)
    : user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined;
  const hasSocials = Boolean(profile.socialTwitter || profile.socialInstagram || profile.socialTiktok || profile.socialYoutube);
  const hasPhysical = Boolean(profile.heightFeet || profile.weight || profile.wingspan);
  const hasAcademic = Boolean(profile.schoolName || profile.gradYear || profile.gpa);
  const hasStats = Boolean(profile.showStats && careerStats && careerStats.totalGames > 0);

  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-orange-500/15 bg-zinc-950">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_top_right,rgba(234,88,12,0.3),transparent)]" />
        <div className="relative flex gap-3 px-4 pt-5 pb-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 shrink-0 border border-orange-500/30">
                <AvatarFallback className="bg-zinc-900 text-lg font-black text-orange-400">{initials}</AvatarFallback>
                {photoSrc && <AvatarImage src={photoSrc} alt={displayName} className="object-cover" />}
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  {career?.jerseyNumber != null && <span className="text-sm font-black text-orange-400">#{career.jerseyNumber}</span>}
                  <h2 className="text-base font-black uppercase leading-tight tracking-tight text-white">{displayName}</h2>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {career?.positions?.map((pos) => <Badge key={pos} className="border border-orange-500/30 bg-orange-500/20 px-1.5 py-0 text-[10px] font-bold text-orange-300">{POSITION_LABELS[pos] || pos}</Badge>)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500">
                  {career?.schoolName && <span>{career.schoolName}</span>}
                  {career?.gradeLevel && <span>{GRADE_LABELS[career.gradeLevel] || career.gradeLevel}</span>}
                </div>
              </div>
            </div>

            {profile.cardShowBio !== false && (profile.headline || profile.bio) && (
              <div className="space-y-1">
                {profile.headline && <p className="text-[11px] font-semibold leading-snug text-orange-300/70">{profile.headline}</p>}
                {profile.bio && <p className="line-clamp-3 text-[11px] leading-relaxed text-zinc-400">{profile.bio}</p>}
              </div>
            )}

            {profile.cardShowArchetype !== false && profile.showArchetype && career?.assessmentArchetype && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${archetype?.primaryHex || "#f97316"}2f` }}><Zap className="h-3 w-3" style={{ color: archetype?.primaryHex || "#f97316" }} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-tight text-white">{archetype?.name || career.assessmentArchetype}</p>
                  {(archetype?.tagline || career.assessmentArchetypeTagline) && <p className="mt-0.5 line-clamp-2 text-[11px]" style={{ color: archetype?.primaryHex || "#fb923c" }}>{archetype?.tagline || career.assessmentArchetypeTagline}</p>}
                </div>
              </div>
            )}

            {(userProfile?.city || userProfile?.state) && profile.showLocation && (
              <p className="flex items-center gap-1 text-[11px] text-orange-400/60"><MapPin className="h-3 w-3 shrink-0" />{[userProfile.city, userProfile.state].filter(Boolean).join(", ")}</p>
            )}
            {profile.showEmail && userProfile?.email && (
              <p className="flex items-center gap-1 text-[11px] text-zinc-500"><span aria-hidden="true">✉</span>{userProfile.email}</p>
            )}
          </div>

          {profile.cardShowPlayerCard !== false && career && (
            <div className="hidden shrink-0 sm:block" style={{ width: 150, height: 178, overflow: "hidden", position: "relative" }}>
              <div style={{ transform: "scale(0.46875)", transformOrigin: "top left", width: 320, height: 380 }}>
                <BaseballCard profile={career as any} careerStats={careerStats as any} userName={displayName} />
              </div>
            </div>
          )}
        </div>
      </div>

      {hasStats && (
        <div className="border-t border-orange-500/10 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-orange-400/50">Career Averages · {careerStats!.totalGames}G · {careerStats!.wins}W–{careerStats!.losses}L</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              ["PPG", careerStats!.avgPoints],
              ["RPG", careerStats!.avgRebounds],
              ["APG", careerStats!.avgAssists],
              ["SPG", careerStats!.avgSteals],
              ["BPG", careerStats!.avgBlocks],
            ].map(([label, value]) => <StatPill key={label} label={label as string} value={Number(value).toFixed(1)} testId={`public-card-${String(label).toLowerCase()}`} />)}
          </div>
        </div>
      )}

      {((profile.cardShowSocials !== false && profile.showSocialLinks && hasSocials) || (profile.cardShowHighlightReel !== false && profile.showHighlightReel && profile.highlightVideoUrl)) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-orange-500/10 px-4 py-3">
          {profile.cardShowSocials !== false && profile.showSocialLinks && hasSocials && (
            <div className="flex items-center gap-1.5">
              {profile.socialTwitter && <a href={profile.socialTwitter.startsWith("http") ? profile.socialTwitter : `https://twitter.com/${profile.socialTwitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"><SiX className="h-3 w-3 text-zinc-300" /></a>}
              {profile.socialInstagram && <a href={profile.socialInstagram.startsWith("http") ? profile.socialInstagram : `https://instagram.com/${profile.socialInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"><SiInstagram className="h-3 w-3 text-pink-400" /></a>}
              {profile.socialTiktok && <a href={profile.socialTiktok.startsWith("http") ? profile.socialTiktok : `https://tiktok.com/@${profile.socialTiktok.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"><SiTiktok className="h-3 w-3 text-zinc-300" /></a>}
              {profile.socialYoutube && <a href={profile.socialYoutube.startsWith("http") ? profile.socialYoutube : `https://youtube.com/${profile.socialYoutube}`} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800"><SiYoutube className="h-3 w-3 text-red-400" /></a>}
            </div>
          )}
          {profile.cardShowHighlightReel !== false && profile.showHighlightReel && profile.highlightVideoUrl && <a href={profile.highlightVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-300"><Video className="h-3 w-3" />Highlights</a>}
        </div>
      )}

      {profile.cardShowMeasurements && hasPhysical && (
        <div className="border-t border-orange-500/10 px-4 py-2.5"><p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Measurements</p><p className="text-xs text-zinc-400">{profile.heightFeet && `${profile.heightFeet}'${profile.heightInches || 0}"`}{profile.weight ? ` · ${profile.weight} lbs` : ""}{profile.wingspan ? ` · ${profile.wingspan}" wingspan` : ""}</p></div>
      )}
      {profile.cardShowAcademic && hasAcademic && (
        <div className="border-t border-orange-500/10 px-4 py-2.5"><p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Academic</p><p className="text-xs text-zinc-400">{profile.schoolName}{profile.gradYear ? ` · Class of ${profile.gradYear}` : ""}{profile.gpa ? ` · ${profile.gpa} GPA` : ""}</p></div>
      )}
      <div className="flex items-center justify-between border-t border-zinc-800/50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">PLAYR1</p>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Player card</span>
      </div>
    </div>
  );
}

export default function PlayerPublicPage() {
  const [, params] = useRoute("/player/:slug");
  const [location, navigate] = useLocation();
  const slug = params?.slug || "";
  const requestedReturnTo = new URLSearchParams(location.split("?")[1] || "").get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") ? requestedReturnTo : "/community";
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate(returnTo);
    }
  };
  const { data, isLoading, error } = useQuery<PublicProfileData>({
    queryKey: ["/api/player", slug],
    enabled: !!slug,
  });
  const targetUserId = data?.profile.userId;
  const invalidateRelationshipViews = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/player", slug] });
    queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
    queryClient.invalidateQueries({ queryKey: ["/api/followers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
    queryClient.invalidateQueries({ queryKey: ["/api/follows/activity"] });
  };
  const followMutation = useMutation({
    mutationFn: (following: boolean) => {
      if (!targetUserId) throw new Error("Player not found");
      return apiRequest("PATCH", `/api/follows/${targetUserId}`, { following });
    },
    onSuccess: invalidateRelationshipViews,
  });
  const friendMutation = useMutation({
    mutationFn: () => {
      if (!targetUserId) throw new Error("Player not found");
      return apiRequest("POST", "/api/friends/request", { addresseeId: targetUserId });
    },
    onSuccess: invalidateRelationshipViews,
  });
  const unfriendMutation = useMutation({
    mutationFn: () => {
      if (!targetUserId) throw new Error("Player not found");
      return apiRequest("DELETE", `/api/friends/${targetUserId}`);
    },
    onSuccess: invalidateRelationshipViews,
  });
  const acceptFriendMutation = useMutation({
    mutationFn: (connectionId: string) => apiRequest("PATCH", `/api/friends/requests/${connectionId}`, { status: "accepted" }),
    onSuccess: invalidateRelationshipViews,
  });
  const relationshipBusy = followMutation.isPending || friendMutation.isPending || unfriendMutation.isPending || acceptFriendMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-72 w-full animate-pulse bg-gradient-to-br from-orange-950/60 via-zinc-900 to-background" />
        <div className="max-w-2xl mx-auto px-4 -mt-16 space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold" data-testid="text-profile-not-found">Profile Not Found</h2>
          <p className="text-muted-foreground text-sm">
            This player profile doesn't exist or isn't public yet.
          </p>
          <Button variant="outline" onClick={goBack} data-testid="button-go-back" className="gap-2">
            <ArrowLeft className="h-4 w-4" />Back to Community
          </Button>
        </div>
      </div>
    );
  }

  const { profile, user, career, careerStats, awards, personalRecords, videos, recentTraining } = data;
  const playerName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Player";
  const playerInitials = user
    ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase()
    : "P";

  const photoSrc = career?.cardPhotoUrl
    ? getObjectUrl(career.cardPhotoUrl)
    : user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined;

  const hasPhysical = profile.heightFeet || profile.weight || profile.wingspan;
  const hasAcademic = profile.schoolName || profile.gradYear || profile.gpa;
  const hasSocials = profile.socialTwitter || profile.socialInstagram || profile.socialTiktok || profile.socialYoutube;
  const hasSkills = career && (career.skillBallHandling || career.skillShooting || career.skillDefense || career.skillAthleticism || career.skillBasketballIQ);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />Community
          </Button>
          <ShareMenu
            url={`/player/${slug}`}
            title={`${playerName} - PLAYR1`}
            description={`Check out ${playerName}'s basketball profile on PLAYR1!`}
            testId="button-share-profile"
          />
        </div>
      </div>

      <div className="px-4 pt-5">
        {data.relationship && !data.relationship.isSelf && (
          <div className="mx-auto mb-3 w-fit max-w-full rounded-2xl border border-zinc-800 bg-zinc-950/90 p-2.5 shadow-lg shadow-black/20" data-testid="player-relationship-actions">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span><strong className="text-white">{data.relationship.followerCount}</strong> followers</span>
                <span><strong className="text-white">{data.relationship.followingCount}</strong> following</span>
              </div>
              {data.relationship.isAuthenticated && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={data.relationship.isFollowing ? "secondary" : "default"}
                    className={data.relationship.isFollowing ? "border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20" : ""}
                    disabled={relationshipBusy || data.relationship.connectionStatus === "friends"}
                    onClick={() => followMutation.mutate(!data.relationship!.isFollowing)}
                    data-testid="button-profile-follow"
                  >
                    {data.relationship.isFollowing ? "Following" : "Follow"}
                  </Button>
                  {data.relationship.connectionStatus === "friends" ? (
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10" disabled={relationshipBusy} onClick={() => unfriendMutation.mutate()} data-testid="button-profile-unfriend">
                      <UserRoundX className="mr-1.5 h-3.5 w-3.5" /> Unfriend
                    </Button>
                  ) : data.relationship.connectionStatus === "incoming_pending" ? (
                    <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10" disabled={relationshipBusy || !data.relationship.connectionId} onClick={() => data.relationship?.connectionId && acceptFriendMutation.mutate(data.relationship.connectionId)} data-testid="button-profile-accept-friend">
                      <UserRoundCheck className="mr-1.5 h-3.5 w-3.5" /> Accept friend
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-200 hover:border-orange-500/50 hover:text-orange-200" disabled={relationshipBusy || !data.relationship.isFollowing || data.relationship.connectionStatus === "outgoing_pending"} onClick={() => friendMutation.mutate()} data-testid="button-profile-friend">
                      {data.relationship.connectionStatus === "outgoing_pending" ? <><Clock className="mr-1.5 h-3.5 w-3.5" /> Request sent</> : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Friend</>}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {data.relationship.connectionStatus === "friends" && (
              <p className="mt-1 px-1 text-[10px] text-zinc-600">Unfriend first if you want to unfollow this player.</p>
            )}
          </div>
        )}
        <PublicPlayerCard data={data} />
      </div>

      {/* ═══════════════════════════════════════════════
          SPORTS CARD HERO — holographic athlete vibe
      ════════════════════════════════════════════════ */}
      <div className="relative hidden overflow-hidden">
        {/* Holographic gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-purple-900/20 to-cyan-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.15),transparent_60%)]" />
        {/* Subtle grid lines — holographic texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-10">
          <div className="flex items-end gap-5">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-orange-400 via-purple-500 to-cyan-400 opacity-60 blur-sm" />
              <Avatar className="relative h-28 w-28 border-2 border-white/20">
                <AvatarImage src={photoSrc} alt={playerName} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-zinc-900 text-orange-400">
                  {playerInitials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name + metadata */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                {career?.jerseyNumber != null && (
                  <span className="text-2xl font-black text-orange-400" data-testid="text-jersey-number">
                    #{career.jerseyNumber}
                  </span>
                )}
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none" data-testid="text-player-name">
                  {playerName}
                </h1>
              </div>

              {profile.headline && (
                <p className="text-sm text-white/70 mb-2" data-testid="text-headline">{profile.headline}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {career?.positions?.map(pos => (
                  <Badge key={pos} className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs" data-testid={`badge-position-${pos}`}>
                    {POSITION_LABELS[pos] || pos}
                  </Badge>
                ))}
                {profile.isPrivate && (
                  <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                    <Lock className="w-2.5 h-2.5 mr-1" />Friends Only
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/60">
                {career?.schoolName && (
                  <span className="flex items-center gap-1" data-testid="text-school">
                    <School className="h-3 w-3" />{career.schoolName}
                  </span>
                )}
                {career?.teamName && (
                  <span className="flex items-center gap-1" data-testid="text-team">
                    <Users className="h-3 w-3" />{career.teamName}
                  </span>
                )}
                {career?.gradeLevel && (
                  <span className="flex items-center gap-1" data-testid="text-grade">
                    <GraduationCap className="h-3 w-3" />{GRADE_LABELS[career.gradeLevel] || career.gradeLevel}
                  </span>
                )}
                {profile.showLocation && (profile as any).city && (
                  <span className="flex items-center gap-1" data-testid="text-location">
                    <MapPin className="h-3 w-3" />{(profile as any).city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Career stats strip — key numbers front and center */}
          {careerStats && careerStats.totalGames > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Career Averages</span>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/40">{careerStats.totalGames} games</span>
              </div>
              <div className="grid grid-cols-5 gap-2" data-testid="section-career-stats">
                <StatPill label="PPG" value={careerStats.avgPoints.toFixed(1)} testId="stat-ppg" />
                <StatPill label="RPG" value={careerStats.avgRebounds.toFixed(1)} testId="stat-rpg" />
                <StatPill label="APG" value={careerStats.avgAssists.toFixed(1)} testId="stat-apg" />
                <StatPill label="SPG" value={careerStats.avgSteals.toFixed(1)} testId="stat-spg" />
                <StatPill label="BPG" value={careerStats.avgBlocks.toFixed(1)} testId="stat-bpg" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          INSTAGRAM-STYLE SECTIONS — info feed below card
      ════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">

        {/* Archetype badge — punchy single row */}
        {profile.showArchetype && profile.cardShowArchetype === false && career?.assessmentArchetype && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border bg-gradient-to-r from-purple-500/10 to-orange-500/10 border-purple-500/20" data-testid="section-archetype">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Player Archetype</p>
              <p className="font-bold text-foreground" data-testid="text-archetype">{career.assessmentArchetype}</p>
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && profile.cardShowBio === false && (
          <Card className="rounded-2xl border-border/50" data-testid="section-bio">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-bio">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Social links — Instagram-style row */}
        {profile.showSocialLinks && profile.cardShowSocials === false && hasSocials && (
          <div className="flex items-center justify-center gap-3 py-2" data-testid="section-socials">
            {profile.socialTwitter && (
              <a
                href={profile.socialTwitter.startsWith("http") ? profile.socialTwitter : `https://twitter.com/${profile.socialTwitter.replace("@","")}`}
                target="_blank" rel="noopener noreferrer" data-testid="link-twitter"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                <SiX className="h-3.5 w-3.5" />X
              </a>
            )}
            {profile.socialInstagram && (
              <a
                href={profile.socialInstagram.startsWith("http") ? profile.socialInstagram : `https://instagram.com/${profile.socialInstagram.replace("@","")}`}
                target="_blank" rel="noopener noreferrer" data-testid="link-instagram"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                <SiInstagram className="h-3.5 w-3.5" />Instagram
              </a>
            )}
            {profile.socialTiktok && (
              <a
                href={profile.socialTiktok.startsWith("http") ? profile.socialTiktok : `https://tiktok.com/@${profile.socialTiktok.replace("@","")}`}
                target="_blank" rel="noopener noreferrer" data-testid="link-tiktok"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                <SiTiktok className="h-3.5 w-3.5" />TikTok
              </a>
            )}
            {profile.socialYoutube && (
              <a
                href={profile.socialYoutube.startsWith("http") ? profile.socialYoutube : `https://youtube.com/${profile.socialYoutube}`}
                target="_blank" rel="noopener noreferrer" data-testid="link-youtube"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                <SiYoutube className="h-3.5 w-3.5" />YouTube
              </a>
            )}
          </div>
        )}

        {/* Skills — only if showSkills */}
        {profile.showSkills && hasSkills && (
          <Card className="rounded-2xl border-border/50" data-testid="section-skills">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-500" />Skill Ratings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <SkillBar label="Ball Handling" value={career?.skillBallHandling ?? null} />
              <SkillBar label="Shooting" value={career?.skillShooting ?? null} />
              <SkillBar label="Defense" value={career?.skillDefense ?? null} />
              <SkillBar label="Athleticism" value={career?.skillAthleticism ?? null} />
              <SkillBar label="Basketball IQ" value={career?.skillBasketballIQ ?? null} />
            </CardContent>
          </Card>
        )}

        {/* Highlight video — big tap target */}
        {profile.showHighlightReel && profile.highlightVideoUrl && (
          <a
            href={profile.highlightVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid="link-highlight-video"
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

        {/* Physical attributes */}
        {profile.showPhysical && hasPhysical && (
          <Card className="rounded-2xl border-border/50" data-testid="section-physical">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4" />Measurements
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-3">
                {profile.heightFeet && (
                  <div className="text-center p-3 rounded-xl bg-muted/50" data-testid="text-height">
                    <p className="text-lg font-bold">{profile.heightFeet}'{profile.heightInches || 0}"</p>
                    <p className="text-xs text-muted-foreground">Height</p>
                  </div>
                )}
                {profile.weight && profile.weight > 0 && (
                  <div className="text-center p-3 rounded-xl bg-muted/50" data-testid="text-weight">
                    <p className="text-lg font-bold">{profile.weight}</p>
                    <p className="text-xs text-muted-foreground">Weight (lbs)</p>
                  </div>
                )}
                {profile.wingspan && (
                  <div className="text-center p-3 rounded-xl bg-muted/50" data-testid="text-wingspan">
                    <p className="text-lg font-bold">{profile.wingspan}</p>
                    <p className="text-xs text-muted-foreground">Wingspan</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic */}
        {profile.showAcademic && hasAcademic && (
          <Card className="rounded-2xl border-border/50" data-testid="section-academic">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />Academic
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {profile.schoolName && (
                  <div className="text-center p-3 rounded-xl bg-muted/50 col-span-2" data-testid="text-school-name">
                    <p className="text-lg font-bold">{profile.schoolName}</p>
                    <p className="text-xs text-muted-foreground">School</p>
                  </div>
                )}
                {profile.gradYear && profile.gradYear > 0 && (
                  <div className="text-center p-3 rounded-xl bg-muted/50" data-testid="text-grad-year">
                    <p className="text-lg font-bold">{profile.gradYear}</p>
                    <p className="text-xs text-muted-foreground">Class of</p>
                  </div>
                )}
                {profile.gpa && (
                  <div className="text-center p-3 rounded-xl bg-muted/50" data-testid="text-gpa">
                    <p className="text-lg font-bold">{profile.gpa}</p>
                    <p className="text-xs text-muted-foreground">GPA</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Awards */}
        {profile.showAchievements && awards && awards.length > 0 && (
          <Card className="rounded-2xl border-border/50" data-testid="section-awards">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />Awards & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {awards.map(award => (
                <div key={award.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40" data-testid={`award-${award.id}`}>
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
        {profile.showPersonalRecords && personalRecords && personalRecords.length > 0 && (
          <Card className="rounded-2xl border-border/50" data-testid="section-personal-records">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Medal className="h-4 w-4 text-orange-500" />Personal Records
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {personalRecords.slice(0, 8).map(pr => (
                  <div key={pr.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/40" data-testid={`pr-${pr.id}`}>
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

        {profile.showTrainingLog && recentTraining && recentTraining.length > 0 && (
          <Card className="rounded-2xl border-border/50" data-testid="section-recent-training">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-sky-500" />Recent Training
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {recentTraining.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3" data-testid={`training-${log.id}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15"><Dumbbell className="h-4 w-4 text-sky-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{log.shotLocation ? `${log.shotLocation} session` : "Training session"}</p>
                    <p className="text-xs text-muted-foreground">{log.completedAt ? new Date(log.completedAt).toLocaleDateString() : "Recently"} · {log.duration} min{log.reps ? ` · ${log.reps} reps` : ""}</p>
                  </div>
                  {log.score != null && <span className="text-sm font-bold text-sky-400">{log.score}/10</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Training Videos */}
        {profile.showVideos && videos && videos.length > 0 && (
          <Card className="rounded-2xl border-border/50" data-testid="section-videos">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Video className="h-4 w-4" />Training Videos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {videos.map(video => (
                <a
                  key={video.id}
                  href={video.videoUrl.startsWith("/") ? video.videoUrl : `/objects/${video.videoUrl}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                  data-testid={`video-${video.id}`}
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

        <div className="pt-4 pb-2 text-center">
          <Separator />
          <p className="pt-3 text-xs text-muted-foreground">Powered by PLAYR1</p>
        </div>
      </div>
    </div>
  );
}
