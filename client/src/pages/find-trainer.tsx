import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, MapPin, DollarSign, Clock, Award, Star, Mail, Phone, Globe, Instagram, Twitter, X, ChevronRight } from "lucide-react";
import { US_STATES, TRAINER_SPECIALTIES } from "@shared/schema";

type DirectoryTrainer = {
  id: string;
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
  certifications: string | null;
  availability: string | null;
  profilePhotoUrl: string | null;
  contactEmail: string | null;
  socialInstagram: string | null;
  socialTwitter: string | null;
  website: string | null;
};

export default function FindTrainerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState<DirectoryTrainer | null>(null);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("query", searchQuery);
  if (stateFilter && stateFilter !== "all") queryParams.set("state", stateFilter);
  if (specialtyFilter && specialtyFilter !== "all") queryParams.set("specialty", specialtyFilter);

  const { data: trainers, isLoading, isError, refetch } = useQuery<DirectoryTrainer[]>({
    queryKey: ["/api/trainers/directory", searchQuery, stateFilter, specialtyFilter],
    queryFn: async () => {
      const res = await fetch(`/api/trainers/directory?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load trainers");
      return res.json();
    },
  });

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-find-trainer-heading">Find a Trainer</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse trainers near you to level up your game</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, city, or keyword..."
              className="pl-9"
              data-testid="input-search-trainers"
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[120px]" data-testid="select-filter-state">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {US_STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-specialty">
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {TRAINER_SPECIALTIES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || stateFilter !== "all" || specialtyFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(""); setStateFilter("all"); setSpecialtyFilter("all"); }}
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-muted-foreground" data-testid="text-trainers-error">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium">Failed to load trainers</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()} data-testid="button-retry-trainers">
              Try Again
            </Button>
          </div>
        ) : !trainers?.length ? (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium">No trainers found</p>
            <p className="text-sm mt-1">
              {searchQuery || stateFilter !== "all" || specialtyFilter !== "all"
                ? "Try adjusting your filters."
                : "Trainers will appear here once they publish their profiles."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainers.map(trainer => (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                onClick={() => setSelectedTrainer(trainer)}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selectedTrainer} onOpenChange={open => !open && setSelectedTrainer(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedTrainer && <TrainerDetail trainer={selectedTrainer} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TrainerCard({ trainer, onClick }: { trainer: DirectoryTrainer; onClick: () => void }) {
  const name = [trainer.firstName, trainer.lastName].filter(Boolean).join(" ") || "Trainer";
  const initials = (trainer.firstName?.[0] || "") + (trainer.lastName?.[0] || "");

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
      data-testid={`card-trainer-${trainer.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarImage src={trainer.profilePhotoUrl || undefined} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials || "T"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate" data-testid={`text-trainer-name-${trainer.id}`}>{name}</h3>
                {trainer.headline && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1" data-testid={`text-trainer-headline-${trainer.id}`}>
                    {trainer.headline}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
              {trainer.city && trainer.state && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {trainer.city}, {trainer.state}
                </span>
              )}
              {trainer.hourlyRate && (
                <span className="flex items-center gap-0.5 font-medium text-foreground">
                  <DollarSign className="w-3 h-3" />
                  {trainer.hourlyRate}/hr
                </span>
              )}
              {trainer.experienceYears && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3" />
                  {trainer.experienceYears}yr exp
                </span>
              )}
            </div>

            {trainer.specialties && trainer.specialties.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {trainer.specialties.slice(0, 3).map(s => (
                  <Badge key={s} variant="secondary" className="text-[10px] no-default-hover-elevate">{s}</Badge>
                ))}
                {trainer.specialties.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{trainer.specialties.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainerDetail({ trainer }: { trainer: DirectoryTrainer }) {
  const name = [trainer.firstName, trainer.lastName].filter(Boolean).join(" ") || "Trainer";
  const initials = (trainer.firstName?.[0] || "") + (trainer.lastName?.[0] || "");

  return (
    <div className="space-y-6 pb-6">
      <SheetHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={trainer.profilePhotoUrl || undefined} />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials || "T"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="text-left" data-testid="text-trainer-detail-name">{name}</SheetTitle>
            {trainer.headline && (
              <p className="text-sm text-muted-foreground mt-0.5">{trainer.headline}</p>
            )}
            {trainer.city && trainer.state && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {trainer.city}, {trainer.state}
              </p>
            )}
          </div>
        </div>
      </SheetHeader>

      <div className="grid grid-cols-3 gap-3 text-center">
        {trainer.hourlyRate && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-center gap-0.5 text-lg font-bold text-primary">
              <DollarSign className="w-4 h-4" />
              {trainer.hourlyRate}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">per hour</p>
          </div>
        )}
        {trainer.experienceYears && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-lg font-bold">{trainer.experienceYears}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">years exp</p>
          </div>
        )}
        {trainer.sessionTypes && trainer.sessionTypes.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-lg font-bold">{trainer.sessionTypes.length}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">session types</p>
          </div>
        )}
      </div>

      {trainer.bio && (
        <div>
          <h3 className="text-sm font-semibold mb-2">About</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="text-trainer-bio">{trainer.bio}</p>
        </div>
      )}

      {trainer.specialties && trainer.specialties.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Specialties</h3>
          <div className="flex flex-wrap gap-1.5">
            {trainer.specialties.map(s => (
              <Badge key={s} variant="default" className="text-xs no-default-hover-elevate">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {trainer.sessionTypes && trainer.sessionTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Session Types</h3>
          <div className="flex flex-wrap gap-1.5">
            {trainer.sessionTypes.map(t => (
              <Badge key={t} variant="secondary" className="text-xs no-default-hover-elevate">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {trainer.certifications && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Award className="w-3 h-3" />
            Certifications
          </h3>
          <p className="text-sm text-muted-foreground">{trainer.certifications}</p>
        </div>
      )}

      {trainer.availability && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Availability
          </h3>
          <p className="text-sm text-muted-foreground">{trainer.availability}</p>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        <h3 className="text-sm font-semibold">Get in Touch</h3>
        <div className="space-y-2">
          {trainer.contactEmail && (
            <a
              href={`mailto:${trainer.contactEmail}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="link-trainer-email"
            >
              <Mail className="w-4 h-4" />
              {trainer.contactEmail}
            </a>
          )}
          {trainer.website && (
            <a
              href={trainer.website.startsWith("http") ? trainer.website : `https://${trainer.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="link-trainer-website"
            >
              <Globe className="w-4 h-4" />
              {trainer.website}
            </a>
          )}
          {trainer.socialInstagram && (
            <a
              href={`https://instagram.com/${trainer.socialInstagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="link-trainer-instagram"
            >
              <Instagram className="w-4 h-4" />
              {trainer.socialInstagram}
            </a>
          )}
          {trainer.socialTwitter && (
            <a
              href={`https://twitter.com/${trainer.socialTwitter.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="link-trainer-twitter"
            >
              <Twitter className="w-4 h-4" />
              {trainer.socialTwitter}
            </a>
          )}
          {!trainer.contactEmail && !trainer.website && !trainer.socialInstagram && !trainer.socialTwitter && (
            <p className="text-sm text-muted-foreground">No contact information provided yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
