import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShareMenu } from "@/components/share-menu";
import {
  MapPin,
  Clock,
  DollarSign,
  Award,
  Star,
  Mail,
  Globe,
  ArrowLeft,
  Calendar,
  Dumbbell,
} from "lucide-react";
import { SiInstagram, SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";

interface TrainerPublicData {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string[] | null;
  city: string | null;
  state: string | null;
  hourlyRate: number | null;
  sessionTypes: string[] | null;
  experienceYears: number | null;
  certifications: string[] | null;
  availability: string | null;
  profilePhotoUrl: string | null;
  socialInstagram: string | null;
  socialTwitter: string | null;
  website: string | null;
  contactEmail: string | null;
  locations: Array<{
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    availability: string | null;
  }>;
}

export default function TrainerPublic() {
  const [, params] = useRoute("/t/:id");
  const trainerId = params?.id;

  const { data: trainer, isLoading, error } = useQuery<TrainerPublicData>({
    queryKey: ["/api/trainers/directory", trainerId],
    queryFn: () => fetch(`/api/trainers/directory/${trainerId}`).then(r => {
      if (!r.ok) throw new Error("Trainer not found");
      return r.json();
    }),
    enabled: !!trainerId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-not-found">Trainer Not Found</h2>
            <p className="text-muted-foreground mb-6">This profile may be private or no longer available.</p>
            <Button variant="outline" onClick={() => window.history.back()} data-testid="button-go-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() || "Trainer";
  const initials = `${(trainer.firstName || "T")[0]}${(trainer.lastName || "")[0] || ""}`.toUpperCase();
  const location = [trainer.city, trainer.state].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <ShareMenu
            url={`/t/${trainer.id}`}
            title={`${fullName} - PLAYR1 Trainer`}
            description={`Check out ${fullName}'s trainer profile on PLAYR1! ${trainer.headline || ""}`}
            testId="button-share-public-profile"
          />
        </div>

        <Card data-testid="card-trainer-profile">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-5">
              <Avatar className="h-24 w-24 shrink-0 mx-auto sm:mx-0">
                <AvatarImage src={trainer.profilePhotoUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl font-bold" data-testid="text-trainer-name">{fullName}</h1>
                {trainer.headline && (
                  <p className="text-muted-foreground mt-1" data-testid="text-headline">{trainer.headline}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 justify-center sm:justify-start">
                  {location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {location}
                    </span>
                  )}
                  {trainer.experienceYears && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {trainer.experienceYears}+ years
                    </span>
                  )}
                  {trainer.hourlyRate && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${trainer.hourlyRate}/hr
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                  {trainer.contactEmail && (
                    <a href={`mailto:${trainer.contactEmail}`} data-testid="link-email">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Mail className="w-3 h-3" />
                        Email
                      </Badge>
                    </a>
                  )}
                  {trainer.website && (
                    <a href={trainer.website.startsWith("http") ? trainer.website : `https://${trainer.website}`} target="_blank" rel="noopener noreferrer" data-testid="link-website">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Globe className="w-3 h-3" />
                        Website
                      </Badge>
                    </a>
                  )}
                  {trainer.socialInstagram && (
                    <a href={`https://instagram.com/${trainer.socialInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" data-testid="link-instagram">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <SiInstagram className="w-3 h-3" />
                        {trainer.socialInstagram}
                      </Badge>
                    </a>
                  )}
                  {trainer.socialTwitter && (
                    <a href={`https://x.com/${trainer.socialTwitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" data-testid="link-twitter">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <SiX className="w-3 h-3" />
                        {trainer.socialTwitter}
                      </Badge>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {trainer.bio && (
          <Card data-testid="card-bio">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3">About</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{trainer.bio}</p>
            </CardContent>
          </Card>
        )}

        {trainer.specialties && trainer.specialties.length > 0 && (
          <Card data-testid="card-specialties">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Specialties
              </h2>
              <div className="flex flex-wrap gap-2">
                {trainer.specialties.map((s, i) => (
                  <Badge key={i} variant="secondary" data-testid={`badge-specialty-${i}`}>{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {trainer.certifications && trainer.certifications.length > 0 && (
          <Card data-testid="card-certifications">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Certifications
              </h2>
              <div className="flex flex-wrap gap-2">
                {trainer.certifications.map((c, i) => (
                  <Badge key={i} variant="outline" data-testid={`badge-cert-${i}`}>{c}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {trainer.sessionTypes && trainer.sessionTypes.length > 0 && (
          <Card data-testid="card-session-types">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Session Types
              </h2>
              <div className="flex flex-wrap gap-2">
                {trainer.sessionTypes.map((t, i) => (
                  <Badge key={i} variant="secondary" data-testid={`badge-session-type-${i}`}>{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {trainer.locations && trainer.locations.length > 0 && (
          <Card data-testid="card-locations">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Training Locations
              </h2>
              <div className="space-y-3">
                {trainer.locations.map((loc) => (
                  <div key={loc.id} className="p-3 rounded-lg bg-muted/50" data-testid={`card-location-${loc.id}`}>
                    <p className="font-medium text-sm">{loc.name}</p>
                    {(loc.city || loc.state) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{[loc.city, loc.state].filter(Boolean).join(", ")}</p>
                    )}
                    {loc.availability && (
                      <p className="text-xs text-muted-foreground mt-1">{loc.availability}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <div className="text-center pb-8">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold text-primary">PLAYR1</span>
          </p>
        </div>
      </div>
    </div>
  );
}
