import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  Ruler,
  Trophy,
  Medal,
  Video,
  ExternalLink,
  School,
  Users,
  Dumbbell,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { ShareMenu } from "@/components/share-menu";
import { SiX, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { PlayerProfile, TeamAward, PersonalRecord, UserVideo } from "@shared/schema";

interface PublicProfileData {
  profile: PlayerProfile;
  user: { firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
  career: {
    positions: string[] | null;
    teamName: string | null;
    schoolName: string | null;
    gradeLevel: string | null;
    jerseyNumber: number | null;
    aspiration: string | null;
    cardPhotoUrl: string | null;
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
}

const POSITION_LABELS: Record<string, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
};

const GRADE_LABELS: Record<string, string> = {
  elementary: "Elementary School",
  "6th": "6th Grade",
  "7th": "7th Grade",
  "8th": "8th Grade",
  freshman: "HS Freshman",
  sophomore: "HS Sophomore",
  junior: "HS Junior",
  senior: "HS Senior",
  "college-freshman": "College Freshman",
  "college-sophomore": "College Sophomore",
  "college-junior": "College Junior",
  "college-senior": "College Senior",
  "post-college": "Post-College",
};

export default function PlayerPublicPage() {
  const [match, params] = useRoute("/player/:slug");
  const slug = params?.slug || "";
  const { data, isLoading, error } = useQuery<PublicProfileData>({
    queryKey: ["/api/player", slug],
    enabled: !!slug,
  });


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-4xl mb-2">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold" data-testid="text-profile-not-found">Profile Not Found</h2>
            <p className="text-muted-foreground">
              This player profile doesn't exist or isn't public.
            </p>
            <Button variant="outline" onClick={() => window.history.back()} data-testid="button-go-back">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, user, career, careerStats, awards, personalRecords, videos } = data;
  const playerName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Player";
  const playerInitials = user
    ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase()
    : "P";

  const photoSrc = career?.cardPhotoUrl
    ? career.cardPhotoUrl.startsWith("/") ? career.cardPhotoUrl : `/objects/${career.cardPhotoUrl}`
    : user?.profileImageUrl || undefined;

  const hasPhysicalAttrs = profile.heightFeet || profile.weight || profile.wingspan || profile.gradYear || profile.gpa;
  const hasSocials = profile.socialTwitter || profile.socialInstagram || profile.socialTiktok || profile.socialYoutube;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-background to-background" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <ShareMenu
              url={`/player/${slug}`}
              title={`${playerName} - PLAYR1 Player Profile`}
              description={`Check out ${playerName}'s basketball profile on PLAYR1!`}
              testId="button-share-profile"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-orange-500/30">
              <AvatarImage src={photoSrc} alt={playerName} />
              <AvatarFallback className="text-2xl bg-orange-500/10 text-foreground">
                {playerInitials}
              </AvatarFallback>
            </Avatar>

            <div className="text-center sm:text-left flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {career?.jerseyNumber != null && (
                  <span className="text-3xl font-bold text-orange-500" data-testid="text-jersey-number">
                    #{career.jerseyNumber}
                  </span>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-player-name">
                  {playerName}
                </h1>
              </div>

              {profile.headline && (
                <p className="text-muted-foreground" data-testid="text-headline">
                  {profile.headline}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {career?.positions?.map((pos) => (
                  <Badge key={pos} variant="secondary" data-testid={`badge-position-${pos}`}>
                    {POSITION_LABELS[pos] || pos}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                {career?.schoolName && (
                  <span className="flex items-center gap-1">
                    <School className="h-3.5 w-3.5" />
                    <span data-testid="text-school">{career.schoolName}</span>
                  </span>
                )}
                {career?.teamName && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span data-testid="text-team">{career.teamName}</span>
                  </span>
                )}
                {career?.gradeLevel && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span data-testid="text-grade">{GRADE_LABELS[career.gradeLevel] || career.gradeLevel}</span>
                  </span>
                )}
              </div>

              {hasSocials && (
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  {profile.socialTwitter && (
                    <a
                      href={profile.socialTwitter.startsWith("http") ? profile.socialTwitter : `https://twitter.com/${profile.socialTwitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-twitter"
                    >
                      <Button variant="ghost" size="icon">
                        <SiX className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {profile.socialInstagram && (
                    <a
                      href={profile.socialInstagram.startsWith("http") ? profile.socialInstagram : `https://instagram.com/${profile.socialInstagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-instagram"
                    >
                      <Button variant="ghost" size="icon">
                        <SiInstagram className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {profile.socialTiktok && (
                    <a
                      href={profile.socialTiktok.startsWith("http") ? profile.socialTiktok : `https://tiktok.com/@${profile.socialTiktok.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-tiktok"
                    >
                      <Button variant="ghost" size="icon">
                        <SiTiktok className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {profile.socialYoutube && (
                    <a
                      href={profile.socialYoutube.startsWith("http") ? profile.socialYoutube : `https://youtube.com/${profile.socialYoutube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-youtube"
                    >
                      <Button variant="ghost" size="icon">
                        <SiYoutube className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        {profile.bio && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-bio">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {hasPhysicalAttrs && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {profile.heightFeet && (
              <Card>
                <CardContent className="p-4 text-center">
                  <Ruler className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold" data-testid="text-height">
                    {profile.heightFeet}'{profile.heightInches || 0}"
                  </div>
                  <div className="text-xs text-muted-foreground">Height</div>
                </CardContent>
              </Card>
            )}
            {profile.weight && profile.weight > 0 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold" data-testid="text-weight">
                    {profile.weight} lbs
                  </div>
                  <div className="text-xs text-muted-foreground">Weight</div>
                </CardContent>
              </Card>
            )}
            {profile.wingspan && (
              <Card>
                <CardContent className="p-4 text-center">
                  <Ruler className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold" data-testid="text-wingspan">
                    {profile.wingspan}
                  </div>
                  <div className="text-xs text-muted-foreground">Wingspan</div>
                </CardContent>
              </Card>
            )}
            {profile.gradYear && profile.gradYear > 0 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <GraduationCap className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold" data-testid="text-grad-year">
                    {profile.gradYear}
                  </div>
                  <div className="text-xs text-muted-foreground">Grad Year</div>
                </CardContent>
              </Card>
            )}
            {profile.gpa && (
              <Card>
                <CardContent className="p-4 text-center">
                  <GraduationCap className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold" data-testid="text-gpa">
                    {profile.gpa}
                  </div>
                  <div className="text-xs text-muted-foreground">GPA</div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {careerStats && careerStats.totalGames > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Career Averages
                <Badge variant="secondary" className="ml-auto">
                  {careerStats.totalGames} games
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <StatCard label="PPG" value={careerStats.avgPoints.toFixed(1)} testId="stat-ppg" />
                <StatCard label="RPG" value={careerStats.avgRebounds.toFixed(1)} testId="stat-rpg" />
                <StatCard label="APG" value={careerStats.avgAssists.toFixed(1)} testId="stat-apg" />
                <StatCard label="SPG" value={careerStats.avgSteals.toFixed(1)} testId="stat-spg" />
                <StatCard label="BPG" value={careerStats.avgBlocks.toFixed(1)} testId="stat-bpg" />
              </div>
              {careerStats.wins + careerStats.losses > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Wins" value={String(careerStats.wins)} testId="stat-wins" />
                    <StatCard label="Losses" value={String(careerStats.losses)} testId="stat-losses" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {awards && awards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {awards.map((award) => (
                  <div
                    key={award.id}
                    className="flex items-start gap-3 p-3 rounded-md bg-muted/30"
                    data-testid={`award-${award.id}`}
                  >
                    <Trophy className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">{award.awardName}</div>
                      <div className="text-sm text-muted-foreground">
                        {award.teamName}
                        {award.season && ` - ${award.season}`}
                      </div>
                      {award.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {award.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {personalRecords && personalRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5" />
                Personal Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {personalRecords.slice(0, 8).map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30"
                    data-testid={`pr-${pr.id}`}
                  >
                    <div>
                      <div className="text-sm font-medium">{pr.metricName}</div>
                      <div className="text-xs text-muted-foreground">
                        {pr.drill?.title || "Training"}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-orange-500">
                      {Number(pr.newValue).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {profile.highlightVideoUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Highlight Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={profile.highlightVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-testid="link-highlight-video"
              >
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Watch Highlight Video
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {videos && videos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Training Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map((video) => (
                  <a
                    key={video.id}
                    href={video.videoUrl.startsWith("/") ? video.videoUrl : `/objects/${video.videoUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    data-testid={`video-${video.id}`}
                  >
                    <Card className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                            <Video className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{video.title}</div>
                            {video.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {video.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4">
          Powered by PLAYR1
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="text-center p-3 rounded-md bg-muted/30" data-testid={testId}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
