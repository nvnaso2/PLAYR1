import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, MapPin, DollarSign, Clock, Award, Star, Mail, Phone, Globe, Instagram, Twitter, X, ChevronRight, CalendarDays, CheckCircle } from "lucide-react";
import { US_STATES, TRAINER_SPECIALTIES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TrainerLocation = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  availability: string | null;
};

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
  locations?: TrainerLocation[];
};

type TimeSlot = { start: string; end: string };
type DayAvailability = { day: string; enabled: boolean; sessions: TimeSlot[] };

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function parseAvailability(raw: string | null): DayAvailability[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d: any) => d.enabled !== false)
      .map((d: any) => ({
        day: d.day,
        enabled: d.enabled !== false,
        sessions: Array.isArray(d.sessions) ? d.sessions : d.start && d.end ? [{ start: d.start, end: d.end }] : [],
      }));
  } catch {
    return [];
  }
}

function parseTimeToMinutes(t: string): number {
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return -1;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function minutesToTime24(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getAvailableTimeSlotsForDay(dayAvail: DayAvailability | undefined): string[] {
  if (!dayAvail || !dayAvail.enabled) return [];
  const slots: string[] = [];
  for (const session of dayAvail.sessions) {
    const startMin = parseTimeToMinutes(session.start);
    const endMin = parseTimeToMinutes(session.end);
    if (startMin < 0 || endMin < 0 || endMin <= startMin) continue;
    for (let t = startMin; t < endMin; t += 15) {
      slots.push(minutesToTime24(t));
    }
  }
  return [...new Set(slots)].sort();
}

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

function generateTimeOptions() {
  const times: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break;
      const hour = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      times.push(`${hour}:${min}`);
    }
  }
  return times;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const TIME_OPTIONS = generateTimeOptions();

function TrainerDetail({ trainer: listTrainer }: { trainer: DirectoryTrainer }) {
  const { data: detailTrainer } = useQuery<DirectoryTrainer>({
    queryKey: ["/api/trainers/directory", listTrainer.id],
    queryFn: async () => {
      const res = await fetch(`/api/trainers/directory/${listTrainer.id}`);
      if (!res.ok) throw new Error("Failed to load trainer details");
      return res.json();
    },
  });
  const trainer = detailTrainer || listTrainer;

  const name = [trainer.firstName, trainer.lastName].filter(Boolean).join(" ") || "Trainer";
  const initials = (trainer.firstName?.[0] || "") + (trainer.lastName?.[0] || "");
  const { toast } = useToast();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [playerNotes, setPlayerNotes] = useState("");

  const locations = trainer.locations || [];
  const hasLocations = locations.length > 0;

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return locations.find(l => l.id === selectedLocationId) || null;
  }, [selectedLocationId, locations]);

  const activeAvailability = useMemo(() => {
    if (selectedLocation?.availability) {
      return parseAvailability(selectedLocation.availability);
    }
    return parseAvailability(trainer.availability);
  }, [selectedLocation, trainer.availability]);

  const availableDays = useMemo(() => {
    return activeAvailability.map(a => a.day);
  }, [activeAvailability]);

  const selectedDayOfWeek = useMemo(() => {
    if (!sessionDate) return null;
    const d = new Date(sessionDate + "T12:00:00");
    return DAYS_OF_WEEK[d.getDay()];
  }, [sessionDate]);

  const dayAvail = useMemo(() => {
    if (!selectedDayOfWeek) return undefined;
    return activeAvailability.find(a => a.day === selectedDayOfWeek);
  }, [selectedDayOfWeek, activeAvailability]);

  const availableTimeSlots = useMemo(() => {
    return getAvailableTimeSlotsForDay(dayAvail);
  }, [dayAvail]);

  const hasAvailabilityData = activeAvailability.length > 0;

  const endTimeOptions = useMemo(() => {
    if (!startTime) return [];
    const startMin = parseTimeToMinutes(startTime);
    if (startMin < 0) return [];

    if (hasAvailabilityData && dayAvail) {
      const windowEnd = dayAvail.sessions.reduce((max, s) => {
        const sStart = parseTimeToMinutes(s.start);
        const sEnd = parseTimeToMinutes(s.end);
        if (startMin >= sStart && startMin < sEnd) return Math.max(max, sEnd);
        return max;
      }, -1);

      if (windowEnd <= startMin) return [];
      const endSlots: string[] = [];
      for (let t = startMin + 15; t <= windowEnd; t += 15) {
        endSlots.push(minutesToTime24(t));
      }
      return endSlots;
    }

    const endSlots: string[] = [];
    for (let t = startMin + 15; t <= 22 * 60; t += 15) {
      endSlots.push(minutesToTime24(t));
    }
    return endSlots;
  }, [startTime, hasAvailabilityData, dayAvail]);

  function resetBookingForm() {
    setSelectedLocationId("");
    setSessionDate("");
    setStartTime("");
    setEndTime("");
    setSessionType("");
    setPlayerNotes("");
  }

  const bookMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/training-sessions", {
        trainerProfileId: trainer.id,
        sessionDate,
        startTime,
        endTime,
        sessionType: sessionType || null,
        locationId: selectedLocationId || null,
        playerNotes: playerNotes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Session Requested", description: "Your booking request has been sent to the trainer." });
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/player/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/trainer/enriched"] });
      setBookingOpen(false);
      resetBookingForm();
    },
    onError: (error: Error) => {
      toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
    },
  });

  const dateIsUnavailable = hasAvailabilityData && sessionDate && !dayAvail;
  const locationRequired = hasLocations && !selectedLocationId;
  const canSubmit = sessionDate && startTime && endTime && startTime < endTime && !dateIsUnavailable && !locationRequired;

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

      <Button
        className="w-full"
        onClick={() => setBookingOpen(true)}
        data-testid="button-book-session"
      >
        <CalendarDays className="w-4 h-4 mr-2" />
        Book Session
      </Button>

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

      {hasLocations && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Training Locations
          </h3>
          <div className="space-y-2">
            {locations.map(loc => {
              const locAvail = parseAvailability(loc.availability);
              const availDays = locAvail.map(a => a.day);
              return (
                <div key={loc.id} className="rounded-lg bg-muted/50 p-3" data-testid={`location-${loc.id}`}>
                  <p className="text-sm font-medium">{loc.name}</p>
                  {loc.address && <p className="text-xs text-muted-foreground">{loc.address}</p>}
                  {loc.city && loc.state && <p className="text-xs text-muted-foreground">{loc.city}, {loc.state}</p>}
                  {availDays.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {availDays.map(d => (
                        <Badge key={d} variant="outline" className="text-[10px] no-default-hover-elevate">{d.slice(0, 3)}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeAvailability.length > 0 && !hasLocations && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Availability
          </h3>
          <div className="space-y-1">
            {activeAvailability.map(a => (
              <div key={a.day} className="flex items-center gap-2 text-sm">
                <span className="font-medium w-12">{a.day.slice(0, 3)}</span>
                <span className="text-muted-foreground">
                  {a.sessions.map(s => `${s.start} - ${s.end}`).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasLocations && activeAvailability.length === 0 && trainer.availability && (
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

      <Dialog open={bookingOpen} onOpenChange={(open) => { setBookingOpen(open); if (!open) resetBookingForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-booking-dialog-title">Book Session with {name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {hasLocations && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={selectedLocationId} onValueChange={(v) => { setSelectedLocationId(v); setSessionDate(""); setStartTime(""); setEndTime(""); }}>
                  <SelectTrigger data-testid="select-booking-location">
                    <SelectValue placeholder="Select a training location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id} data-testid={`option-location-${loc.id}`}>
                        {loc.name}{loc.city ? ` — ${loc.city}, ${loc.state}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasAvailabilityData && availableDays.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Available days</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableDays.map(d => (
                    <Badge
                      key={d}
                      variant={selectedDayOfWeek === d ? "default" : "outline"}
                      className="text-xs no-default-hover-elevate"
                    >
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="session-date">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={e => { setSessionDate(e.target.value); setStartTime(""); setEndTime(""); }}
                min={new Date().toISOString().split("T")[0]}
                disabled={!!locationRequired}
                data-testid="input-session-date"
              />
              {sessionDate && hasAvailabilityData && !dayAvail && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {selectedDayOfWeek} is not available{selectedLocation ? ` at ${selectedLocation.name}` : ''}
                </p>
              )}
              {sessionDate && dayAvail && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {selectedDayOfWeek} is available
                  {dayAvail.sessions.length > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({dayAvail.sessions.map(s => `${s.start}–${s.end}`).join(", ")})
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select
                  value={startTime}
                  onValueChange={(v) => { setStartTime(v); setEndTime(""); }}
                  disabled={!!dateIsUnavailable || !!locationRequired || !sessionDate}
                >
                  <SelectTrigger data-testid="select-start-time">
                    <SelectValue placeholder={dateIsUnavailable ? "Not available" : "Start"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(hasAvailabilityData ? availableTimeSlots : TIME_OPTIONS).map(t => (
                      <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime} disabled={!!dateIsUnavailable || !!locationRequired || !startTime}>
                  <SelectTrigger data-testid="select-end-time">
                    <SelectValue placeholder={dateIsUnavailable ? "Not available" : "End"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(hasAvailabilityData
                      ? endTimeOptions
                      : TIME_OPTIONS.filter(t => !startTime || t > startTime)
                    ).map(t => (
                      <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {trainer.sessionTypes && trainer.sessionTypes.length > 0 && (
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger data-testid="select-session-type">
                    <SelectValue placeholder="Select type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainer.sessionTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="session-notes">Notes (optional)</Label>
              <Textarea
                id="session-notes"
                value={playerNotes}
                onChange={e => setPlayerNotes(e.target.value)}
                placeholder="Any details for the trainer..."
                className="resize-none"
                data-testid="input-session-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setBookingOpen(false); resetBookingForm(); }}
              data-testid="button-cancel-booking"
            >
              Cancel
            </Button>
            <Button
              onClick={() => bookMutation.mutate()}
              disabled={!canSubmit || bookMutation.isPending}
              data-testid="button-submit-booking"
            >
              {bookMutation.isPending ? "Sending..." : "Request Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
