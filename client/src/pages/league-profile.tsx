import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Globe,
  Mail,
  Phone,
  ArrowLeft,
  Trophy,
  Users,
  Calendar,
  DollarSign,
  ExternalLink,
  CheckCircle,
  ClipboardList,
} from "lucide-react";
import type { League } from "@shared/schema";

export default function LeagueProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: league, isLoading, error } = useQuery<League>({
    queryKey: [`/api/leagues/by-slug/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">League Not Found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This league profile doesn't exist or may have been removed.
            </p>
            <Link href="/finder">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pb-24 safe-area-top">
      <Link href="/finder">
        <Button variant="ghost" size="sm" data-testid="link-back-finder">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Directory
        </Button>
      </Link>

      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-league-name">
                {league.name}
              </h1>
              {league.isVerified && (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" data-testid="badge-league-type">{league.leagueType}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-league-location">{league.city}, {league.state}</span>
              </div>
            </div>
          </div>
        </div>

        {league.description && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">About</h3>
              <p className="text-sm leading-relaxed" data-testid="text-league-description">
                {league.description}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {league.ageGroups && league.ageGroups.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  <Users className="h-4 w-4 inline mr-1.5" />
                  Age Groups
                </h3>
                <div className="flex flex-wrap gap-2">
                  {league.ageGroups.map((ag) => (
                    <Badge key={ag} variant="outline" data-testid={`badge-league-age-${ag}`}>{ag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {league.seasons && league.seasons.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4 inline mr-1.5" />
                  Seasons
                </h3>
                <div className="flex flex-wrap gap-2">
                  {league.seasons.map((s) => (
                    <Badge key={s} variant="outline" data-testid={`badge-league-season-${s}`}>{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {league.costInfo && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Cost</h3>
                <p className="text-sm" data-testid="text-league-cost">{league.costInfo}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Contact & Links</h3>
            <div className="space-y-3">
              {league.website && (
                <a
                  href={league.website.startsWith("http") ? league.website : `https://${league.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                  data-testid="link-league-website"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline truncate">Website</p>
                    <p className="text-xs text-muted-foreground truncate">{league.website}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </a>
              )}
              {league.registrationUrl && (
                <a
                  href={league.registrationUrl.startsWith("http") ? league.registrationUrl : `https://${league.registrationUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                  data-testid="link-league-registration"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">Registration</p>
                    <p className="text-xs text-muted-foreground truncate">{league.registrationUrl}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </a>
              )}
              {league.contactEmail && (
                <a
                  href={`mailto:${league.contactEmail}`}
                  className="flex items-center gap-3 group"
                  data-testid="link-league-email"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">Email</p>
                    <p className="text-xs text-muted-foreground truncate">{league.contactEmail}</p>
                  </div>
                </a>
              )}
              {league.contactPhone && (
                <a
                  href={`tel:${league.contactPhone}`}
                  className="flex items-center gap-3 group"
                  data-testid="link-league-phone"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">Phone</p>
                    <p className="text-xs text-muted-foreground">{league.contactPhone}</p>
                  </div>
                </a>
              )}
              {!league.website && !league.registrationUrl && !league.contactEmail && !league.contactPhone && (
                <p className="text-sm text-muted-foreground">No contact information available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
