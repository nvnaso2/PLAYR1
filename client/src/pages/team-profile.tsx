import { useQuery } from "@tanstack/react-query";
import { getObjectUrl } from "@/lib/queryClient";
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
  Shield,
  Users,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { SiInstagram, SiX } from "react-icons/si";
import type { TeamClub } from "@shared/schema";

const LOGO_COLORS = [
  "bg-red-600", "bg-blue-600", "bg-green-600", "bg-purple-600",
  "bg-orange-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
  "bg-cyan-600", "bg-amber-600", "bg-emerald-600", "bg-violet-600",
  "bg-rose-600", "bg-sky-600", "bg-lime-600", "bg-fuchsia-600",
];

function getTeamInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getTeamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

export default function TeamProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: club, isLoading, error } = useQuery<TeamClub>({
    queryKey: [`/api/team-clubs/by-slug/${slug}`],
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

  if (error || !club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Team Not Found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This team profile doesn't exist or may have been removed.
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
          {club.logoUrl ? (
            <img src={getObjectUrl(club.logoUrl) ?? club.logoUrl ?? undefined} alt={club.name} className="h-16 w-16 rounded-md object-cover shrink-0" />
          ) : (
            <div className={`h-16 w-16 rounded-md ${getTeamColor(club.name)} flex items-center justify-center shrink-0`}>
              <span className="text-lg font-bold text-white">{getTeamInitials(club.name)}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-team-name">
                {club.name}
              </h1>
              {club.isVerified && (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" data-testid="badge-org-type">{club.organizationType}</Badge>
              {club.gender && <Badge variant="outline" data-testid="badge-gender">{club.gender}</Badge>}
              {club.circuit && <Badge variant="outline" data-testid="badge-circuit">{club.circuit}</Badge>}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-team-location">{club.city}, {club.state}</span>
              </div>
            </div>
          </div>
        </div>

        {club.description && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">About</h3>
              <p className="text-sm leading-relaxed" data-testid="text-team-description">
                {club.description}
              </p>
            </CardContent>
          </Card>
        )}

        {club.ageGroups && club.ageGroups.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                <Users className="h-4 w-4 inline mr-1.5" />
                Age Groups
              </h3>
              <div className="flex flex-wrap gap-2">
                {club.ageGroups.map((ag) => (
                  <Badge key={ag} variant="outline" data-testid={`badge-age-${ag}`}>
                    {ag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Contact</h3>
            <div className="space-y-3">
              {club.website && (
                <a
                  href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                  data-testid="link-team-website"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline truncate">Website</p>
                    <p className="text-xs text-muted-foreground truncate">{club.website}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </a>
              )}
              {club.contactEmail && (
                <a
                  href={`mailto:${club.contactEmail}`}
                  className="flex items-center gap-3 group"
                  data-testid="link-team-email"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">Email</p>
                    <p className="text-xs text-muted-foreground truncate">{club.contactEmail}</p>
                  </div>
                </a>
              )}
              {club.contactPhone && (
                <a
                  href={`tel:${club.contactPhone}`}
                  className="flex items-center gap-3 group"
                  data-testid="link-team-phone"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">Phone</p>
                    <p className="text-xs text-muted-foreground">{club.contactPhone}</p>
                  </div>
                </a>
              )}
              {club.socialInstagram && (
                <a
                  href={club.socialInstagram.startsWith("http") ? club.socialInstagram : `https://instagram.com/${club.socialInstagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                  data-testid="link-team-instagram"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <SiInstagram className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">Instagram</p>
                    <p className="text-xs text-muted-foreground">{club.socialInstagram}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </a>
              )}
              {club.socialTwitter && (
                <a
                  href={club.socialTwitter.startsWith("http") ? club.socialTwitter : `https://twitter.com/${club.socialTwitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                  data-testid="link-team-twitter"
                >
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <SiX className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">X / Twitter</p>
                    <p className="text-xs text-muted-foreground">{club.socialTwitter}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </a>
              )}
              {!club.website && !club.contactEmail && !club.contactPhone && !club.socialInstagram && !club.socialTwitter && (
                <p className="text-sm text-muted-foreground">No contact information available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
