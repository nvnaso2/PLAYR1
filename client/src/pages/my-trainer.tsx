import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareMenu } from "@/components/share-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, MapPin, DollarSign, Clock, Award, Star, Mail, Phone, Globe, Instagram, Twitter,
  X, ChevronRight, CalendarDays, CheckCircle, Briefcase, UserPlus, ClipboardCheck, MessageCircle,
  User, Calendar as CalendarIcon, MessageSquare, CheckCircle2, XCircle, Hourglass, ChevronLeft, Send, ArrowLeft, Heart,
  Target, Play, FileText, CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { US_STATES, TRAINER_SPECIALTIES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import type { TrainingSession, EvaluationAttribute, PlayerEvaluation, PlayerEvaluationRating, PlayerTrainerFavorite, Drill, DrillAssignment } from "@shared/schema";

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
  equipment: string[] | null;
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

type EnrichedSession = TrainingSession & {
  trainerName: string;
  trainerPhotoUrl: string | null;
  locationName: string | null;
  groupPlayerCount?: number;
};

interface EnrichedEvaluation extends PlayerEvaluation {
  trainerName: string;
}

interface EvalRatingWithAttr extends PlayerEvaluationRating {
  attribute: EvaluationAttribute;
}

interface EvalDetail {
  evaluation: PlayerEvaluation;
  ratings: EvalRatingWithAttr[];
  trainerName: string;
}

type ChatConversation = {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type ChatContact = {
  id: string;
  name: string;
  image?: string;
};

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
  return Array.from(new Set(slots)).sort();
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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TIME_OPTIONS = generateTimeOptions();

const EVAL_CATEGORIES = ["Offense", "Defense", "Intangibles", "Other"];

function getCategoryColor(cat: string | null) {
  switch (cat) {
    case "Offense": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "Defense": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "Intangibles": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getWordNumericEquivalent(wordValue: string, wordOptions: string[]): number {
  const idx = wordOptions.indexOf(wordValue);
  if (idx === -1) return 0;
  return idx + 1;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CalendarIcon }> = {
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  requested: { label: "Awaiting Confirmation", variant: "secondary", icon: Hourglass },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
};

function FindTrainerTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState<DirectoryTrainer | null>(null);
  const { toast } = useToast();

  const { data: favorites } = useQuery<PlayerTrainerFavorite[]>({
    queryKey: ["/api/player/trainer-favorites"],
  });

  const favMap = useMemo(() => {
    const m = new Map<string, PlayerTrainerFavorite>();
    (favorites || []).forEach(f => m.set(f.trainerId, f));
    return m;
  }, [favorites]);

  const toggleFavorite = useMutation({
    mutationFn: async (trainerId: string) => {
      const isFav = favMap.has(trainerId);
      if (isFav) {
        await apiRequest("DELETE", `/api/player/trainer-favorites/${trainerId}`);
      } else {
        await apiRequest("POST", `/api/player/trainer-favorites/${trainerId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player/trainer-favorites"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update favorite", description: error.message, variant: "destructive" });
    },
  });

  const toggleMyTrainer = useMutation({
    mutationFn: async (trainerId: string) => {
      const fav = favMap.get(trainerId);
      const isMyTrainer = fav?.isMyTrainer;
      if (isMyTrainer) {
        await apiRequest("DELETE", `/api/player/my-trainer/${trainerId}`);
      } else {
        await apiRequest("POST", `/api/player/my-trainer/${trainerId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player/trainer-favorites"] });
      toast({ title: "Updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

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
    <div className="space-y-4">
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
          {trainers.map(trainer => {
            const fav = favMap.get(trainer.userId);
            return (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                onClick={() => setSelectedTrainer(trainer)}
                isFavorited={!!fav}
                isMyTrainer={!!fav?.isMyTrainer}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  toggleFavorite.mutate(trainer.userId);
                }}
              />
            );
          })}
        </div>
      )}

      <Sheet open={!!selectedTrainer} onOpenChange={open => !open && setSelectedTrainer(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedTrainer && (
            <TrainerDetail
              trainer={selectedTrainer}
              favorite={favMap.get(selectedTrainer.userId)}
              onToggleFavorite={() => toggleFavorite.mutate(selectedTrainer.userId)}
              onToggleMyTrainer={() => toggleMyTrainer.mutate(selectedTrainer.userId)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TrainerCard({ trainer, onClick, isFavorited, isMyTrainer, onToggleFavorite }: {
  trainer: DirectoryTrainer;
  onClick: () => void;
  isFavorited: boolean;
  isMyTrainer: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
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
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm truncate" data-testid={`text-trainer-name-${trainer.id}`}>{name}</h3>
                  {isMyTrainer && (
                    <Badge variant="default" className="text-[9px] no-default-hover-elevate px-1.5 py-0" data-testid={`badge-my-trainer-${trainer.id}`}>My Trainer</Badge>
                  )}
                </div>
                {trainer.headline && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1" data-testid={`text-trainer-headline-${trainer.id}`}>
                    {trainer.headline}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-7 w-7"
                onClick={onToggleFavorite}
                data-testid={`button-favorite-${trainer.id}`}
              >
                <Heart className={cn("w-4 h-4", isFavorited ? "text-red-500" : "text-muted-foreground")} fill={isFavorited ? "currentColor" : "none"} />
              </Button>
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

function TrainerDetail({ trainer: listTrainer, favorite, onToggleFavorite, onToggleMyTrainer }: {
  trainer: DirectoryTrainer;
  favorite?: PlayerTrainerFavorite;
  onToggleFavorite: () => void;
  onToggleMyTrainer: () => void;
}) {
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
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

  const availableDayNames = useMemo(() => {
    return activeAvailability.map(a => a.day);
  }, [activeAvailability]);

  const hasAvailabilityData = activeAvailability.length > 0;

  const sessionDate = useMemo(() => {
    if (!selectedDate) return "";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return null;
    return DAYS_OF_WEEK[selectedDate.getDay()];
  }, [selectedDate]);

  const dayAvail = useMemo(() => {
    if (!selectedDayOfWeek) return undefined;
    return activeAvailability.find(a => a.day === selectedDayOfWeek);
  }, [selectedDayOfWeek, activeAvailability]);

  const availableTimeSlots = useMemo(() => {
    return getAvailableTimeSlotsForDay(dayAvail);
  }, [dayAvail]);

  const disabledCalendarDays = useCallback((date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (!hasAvailabilityData) return false;
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return !availableDayNames.includes(dayName);
  }, [hasAvailabilityData, availableDayNames]);

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
    setSelectedDate(undefined);
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

  const locationRequired = hasLocations && !selectedLocationId;
  const dateHasAvailability = !hasAvailabilityData || !!dayAvail;
  const canSubmit = selectedDate && sessionDate && startTime && endTime && startTime < endTime && !locationRequired && dateHasAvailability;

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

      <div className="flex gap-2">
        <Button
          variant={favorite ? "default" : "outline"}
          className="flex-1"
          onClick={onToggleFavorite}
          data-testid="button-detail-favorite"
        >
          <Heart className="w-4 h-4 mr-2" fill={favorite ? "currentColor" : "none"} />
          {favorite ? "Favorited" : "Favorite"}
        </Button>
        <Button
          variant={favorite?.isMyTrainer ? "default" : "outline"}
          className="flex-1"
          onClick={onToggleMyTrainer}
          data-testid="button-detail-my-trainer"
        >
          <Star className="w-4 h-4 mr-2" fill={favorite?.isMyTrainer ? "currentColor" : "none"} />
          {favorite?.isMyTrainer ? "My Trainer ✓" : "Set as My Trainer"}
        </Button>
        <ShareMenu
          url={`/t/${trainer.id}`}
          title={`${name} - PLAYR1 Trainer`}
          description={`Check out ${name} on PLAYR1! ${trainer.headline || ""}`}
          size="default"
          testId="button-share-trainer"
        />
      </div>

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

      {trainer.equipment && trainer.equipment.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            Equipment
          </h3>
          <div className="flex flex-wrap gap-1.5" data-testid="group-trainer-equipment">
            {trainer.equipment.map(e => (
              <Badge key={e} variant="secondary" className="text-xs no-default-hover-elevate">{e}</Badge>
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
                <Select value={selectedLocationId} onValueChange={(v) => { setSelectedLocationId(v); setSelectedDate(undefined); setStartTime(""); setEndTime(""); }}>
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

            <div className="space-y-2">
              <Label>Select a Date</Label>
              {hasAvailabilityData && availableDayNames.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Available on: {availableDayNames.map(d => d.slice(0, 3)).join(", ")}
                </p>
              )}
              <div className={cn("rounded-lg border border-border flex justify-center", locationRequired && "opacity-50 pointer-events-none")}>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { setSelectedDate(date); setStartTime(""); setEndTime(""); }}
                  disabled={disabledCalendarDays}
                  fromDate={new Date()}
                  data-testid="calendar-session-date"
                />
              </div>
              {selectedDate && dayAvail && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {selectedDayOfWeek}, {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                  </p>
                  {dayAvail.sessions.length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-available-windows">
                      Available: {dayAvail.sessions.map(s => `${s.start} – ${s.end}`).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedDate && dateHasAvailability && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select
                    value={startTime}
                    onValueChange={(v) => { setStartTime(v); setEndTime(""); }}
                    disabled={!!locationRequired}
                  >
                    <SelectTrigger data-testid="select-start-time">
                      <SelectValue placeholder="Start" />
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
                  <Select value={endTime} onValueChange={setEndTime} disabled={!!locationRequired || !startTime}>
                    <SelectTrigger data-testid="select-end-time">
                      <SelectValue placeholder="End" />
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
            )}

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

function MySessionsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const gcal = useGoogleCalendar();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelSessionId, setCancelSessionId] = useState<string | null>(null);
  const [rescheduleSession, setRescheduleSession] = useState<EnrichedSession | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleLocation, setRescheduleLocation] = useState("");

  const { data: sessions, isLoading } = useQuery<EnrichedSession[]>({
    queryKey: ["/api/training-sessions/player/enriched"],
  });

  const { data: locations } = useQuery<TrainerLocation[]>({
    queryKey: ["/api/training-locations"],
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/player/enriched"] });
      toast({ title: "Session cancelled" });
      setCancelSessionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/training-sessions/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/player/enriched"] });
      toast({ title: "Session confirmed!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to confirm", description: error.message, variant: "destructive" });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: (data: { id: string; sessionDate: string; startTime: string; endTime: string; locationId: string }) =>
      apiRequest("PUT", `/api/training-sessions/${data.id}/reschedule`, {
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        locationId: data.locationId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions/player/enriched"] });
      toast({ title: "Session rescheduled. Awaiting confirmation." });
      setRescheduleSession(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reschedule", description: error.message, variant: "destructive" });
    },
  });

  function openReschedule(session: EnrichedSession) {
    setRescheduleSession(session);
    setRescheduleDate(session.sessionDate);
    setRescheduleStart(session.startTime);
    setRescheduleEnd(session.endTime);
    setRescheduleLocation(session.locationId || "");
  }

  const filtered = (sessions || []).filter(
    (s) => statusFilter === "all" || s.status === statusFilter
  );

  const upcoming = filtered.filter((s) => s.status === "confirmed");
  const pending = filtered.filter((s) => s.status === "requested");
  const completed = filtered.filter((s) => s.status === "completed");
  const cancelledDeclined = filtered.filter((s) => s.status === "cancelled" || s.status === "declined");

  const sortByDate = (a: EnrichedSession, b: EnrichedSession) =>
    a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime);

  function SessionCard({ session, prominent }: { session: EnrichedSession; prominent?: boolean }) {
    const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.requested;
    const StatusIcon = config.icon;
    const canCancel = session.status === "requested" || session.status === "confirmed";

    return (
      <Card
        data-testid={`card-session-${session.id}`}
        className={prominent ? "" : "opacity-80"}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar>
                <AvatarImage src={session.trainerPhotoUrl || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate" data-testid={`text-trainer-name-${session.id}`}>
                  {session.trainerName}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {formatDate(session.sessionDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.variant} data-testid={`badge-status-${session.id}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {session.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`button-gcal-${session.id}`}
                  onClick={() => gcal.isConnected ? gcal.addSession(session.id) : gcal.connect()}
                  disabled={gcal.isAddingSession}
                >
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  {gcal.isConnected ? "Add to Calendar" : "Connect Calendar"}
                </Button>
              )}
              {session.status === "requested" && session.createdBy !== user?.id && (
                <Button
                  size="sm"
                  variant="default"
                  data-testid={`button-confirm-session-${session.id}`}
                  onClick={() => confirmMutation.mutate(session.id)}
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {confirmMutation.isPending ? "Confirming..." : "Confirm"}
                </Button>
              )}
              {session.status === "requested" && session.createdBy === user?.id && (
                <Badge variant="secondary" data-testid={`badge-waiting-${session.id}`}>
                  <Hourglass className="h-3 w-3 mr-1" />
                  Waiting for Confirmation
                </Badge>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`button-reschedule-${session.id}`}
                  onClick={() => openReschedule(session)}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Reschedule
                </Button>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-cancel-session-${session.id}`}
                  onClick={() => setCancelSessionId(session.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
            {session.locationName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {session.locationName}
              </span>
            )}
            {session.sessionType && (
              <Badge variant="outline" className="no-default-active-elevate">
                {session.sessionType}
              </Badge>
            )}
            {(session.groupPlayerCount || 1) > 1 && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-group-${session.id}`}>
                <User className="h-3 w-3 mr-1" />
                Group Session ({session.groupPlayerCount})
              </Badge>
            )}
          </div>

          {session.playerNotes && (
            <div className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{session.playerNotes}</span>
            </div>
          )}

          {(session.declineReason || session.trainerNotes) && (
            <div className="mt-2 text-sm text-muted-foreground">
              {session.declineReason && (
                <p className="italic">Reason: {session.declineReason}</p>
              )}
              {session.trainerNotes && (
                <p>Trainer note: {session.trainerNotes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function SectionHeader({ title, count, icon: Icon }: { title: string; count: number; icon: typeof CalendarIcon }) {
    if (count === 0) return null;
    return (
      <div className="flex items-center gap-2 mt-6 mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="secondary" className="no-default-active-elevate">{count}</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
          <SelectTrigger className="w-[180px]" data-testid="select-trigger-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-all">All</SelectItem>
            <SelectItem value="confirmed" data-testid="select-item-confirmed">Confirmed</SelectItem>
            <SelectItem value="requested" data-testid="select-item-requested">Pending</SelectItem>
            <SelectItem value="completed" data-testid="select-item-completed">Completed</SelectItem>
            <SelectItem value="cancelled" data-testid="select-item-cancelled">Cancelled</SelectItem>
            <SelectItem value="declined" data-testid="select-item-declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-3" data-testid="loading-sessions">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-sessions">
              {statusFilter === "all"
                ? "No sessions yet. Find a trainer to book your first session!"
                : `No ${statusFilter} sessions found.`}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <>
          <SectionHeader title="Upcoming" count={upcoming.length} icon={CheckCircle2} />
          <div className="space-y-3">
            {upcoming.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} prominent />
            ))}
          </div>

          <SectionHeader title="Pending" count={pending.length} icon={Hourglass} />
          <div className="space-y-3">
            {pending.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} prominent />
            ))}
          </div>

          <SectionHeader title="Completed" count={completed.length} icon={CheckCircle2} />
          <div className="space-y-3">
            {completed.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>

          <SectionHeader title="Cancelled / Declined" count={cancelledDeclined.length} icon={XCircle} />
          <div className="space-y-3">
            {cancelledDeclined.sort(sortByDate).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!cancelSessionId} onOpenChange={(open) => !open && setCancelSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-dismiss">Keep Session</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-cancel-dialog-confirm"
              onClick={() => cancelSessionId && cancelMutation.mutate(cancelSessionId)}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rescheduleSession} onOpenChange={(open) => !open && setRescheduleSession(null)}>
        <DialogContent data-testid="dialog-reschedule">
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                data-testid="input-reschedule-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={rescheduleStart} onValueChange={setRescheduleStart}>
                <SelectTrigger data-testid="select-reschedule-start">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const opts: { value: string; label: string }[] = [];
                    for (let h = 6; h <= 22; h++) {
                      for (let m = 0; m <= 45; m += 15) {
                        if (h === 22 && m > 0) break;
                        const val = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                        const ampm = h >= 12 ? "PM" : "AM";
                        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        const label = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
                        opts.push({ value: val, label });
                      }
                    }
                    return opts.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={rescheduleEnd} onValueChange={setRescheduleEnd}>
                <SelectTrigger data-testid="select-reschedule-end">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const opts: { value: string; label: string }[] = [];
                    for (let h = 6; h <= 22; h++) {
                      for (let m = 0; m <= 45; m += 15) {
                        if (h === 22 && m > 0) break;
                        const val = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                        const ampm = h >= 12 ? "PM" : "AM";
                        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        const label = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
                        opts.push({ value: val, label });
                      }
                    }
                    return opts.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={rescheduleLocation} onValueChange={setRescheduleLocation}>
                <SelectTrigger data-testid="select-reschedule-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations || []).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleSession(null)}>
              Cancel
            </Button>
            <Button
              data-testid="button-save-reschedule"
              disabled={!rescheduleDate || !rescheduleStart || !rescheduleEnd || rescheduleMutation.isPending}
              onClick={() => {
                if (rescheduleSession) {
                  rescheduleMutation.mutate({
                    id: rescheduleSession.id,
                    sessionDate: rescheduleDate,
                    startTime: rescheduleStart,
                    endTime: rescheduleEnd,
                    locationId: rescheduleLocation,
                  });
                }
              }}
            >
              {rescheduleMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyEvaluationsTab() {
  const [viewingEvalId, setViewingEvalId] = useState<string | null>(null);

  const { data: evaluations, isLoading } = useQuery<EnrichedEvaluation[]>({
    queryKey: ["/api/my-evaluations"],
    staleTime: 0,
  });

  const { data: evalDetail } = useQuery<EvalDetail>({
    queryKey: ["/api/my-evaluations", viewingEvalId],
    enabled: !!viewingEvalId,
    queryFn: () => fetch(`/api/my-evaluations/${viewingEvalId}`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!evaluations || evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No evaluations yet</p>
            <p className="text-sm mt-1">When a trainer shares an evaluation with you, it will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {evaluations.map(ev => (
            <Card
              key={ev.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setViewingEvalId(ev.id)}
              data-testid={`card-my-eval-${ev.id}`}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatDateShort(ev.evaluationDate)}</span>
                  </div>
                  <Badge variant={ev.evaluationType === "initial" ? "default" : "secondary"}>
                    {ev.evaluationType === "initial" ? "Initial" : "Progress"}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>{ev.trainerName}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!viewingEvalId} onOpenChange={(open) => { if (!open) setViewingEvalId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="text-eval-detail-title">Evaluation Details</SheetTitle>
            <SheetDescription asChild>
              <div>
                {evalDetail && (
                  <span>
                    {formatDateShort(evalDetail.evaluation.evaluationDate)} &middot;{" "}
                    by {evalDetail.trainerName} &middot;{" "}
                    <Badge variant={evalDetail.evaluation.evaluationType === "initial" ? "default" : "secondary"} className="text-xs">
                      {evalDetail.evaluation.evaluationType === "initial" ? "Initial" : "Progress"}
                    </Badge>
                  </span>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          {evalDetail && (
            <div className="space-y-4 mt-4">
              {evalDetail.evaluation.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Trainer Notes</p>
                  <p className="text-sm">{evalDetail.evaluation.notes}</p>
                </div>
              )}

              {EVAL_CATEGORIES.map(cat => {
                const catRatings = evalDetail.ratings.filter(r => (r.attribute.category || "Other") === cat);
                if (catRatings.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <Badge variant="outline" className={getCategoryColor(cat)}>{cat}</Badge>
                    {catRatings.map(r => {
                      const maxVal = r.attribute.scaleType === "1-10" ? 10 : 5;
                      const currentVal = r.attribute.scaleType === "word"
                        ? (r.wordValue && r.attribute.wordOptions ? getWordNumericEquivalent(r.wordValue, JSON.parse(r.attribute.wordOptions)) : 0)
                        : (r.numericValue || 0);
                      const pct = (currentVal / maxVal) * 100;

                      return (
                        <div key={r.id} className="rounded-lg border p-3" data-testid={`rating-${r.id}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium">{r.attribute.name}</span>
                            <span className="text-sm font-bold text-primary">
                              {r.attribute.scaleType === "word" ? r.wordValue : `${r.numericValue}/${maxVal}`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {r.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic" data-testid={`text-rating-notes-${r.id}`}>
                              {r.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChatTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery<ChatConversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 10000,
  });

  const { data: contacts } = useQuery<ChatContact[]>({
    queryKey: ["/api/messages/player-contacts"],
  });

  const { data: messages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages", selectedPartnerId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${selectedPartnerId}`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!selectedPartnerId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/messages", {
        receiverId: selectedPartnerId,
        content: messageInput.trim(),
      });
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedPartnerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openConversation(partnerId: string, partnerName: string) {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerName(partnerName);
  }

  if (selectedPartnerId) {
    return (
      <div className="flex flex-col h-[500px]">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSelectedPartnerId(null); setSelectedPartnerName(""); setMessageInput(""); }}
            data-testid="button-back-to-conversations"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold" data-testid="text-chat-partner-name">{selectedPartnerName}</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 px-1" data-testid="chat-messages-container">
          {!messages || messages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-md px-3 py-2",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-center gap-2 pt-3 border-t mt-3">
          <Input
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            data-testid="input-chat-message"
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && messageInput.trim()) {
                e.preventDefault();
                sendMutation.mutate();
              }
            }}
          />
          <Button
            size="icon"
            onClick={() => messageInput.trim() && sendMutation.mutate()}
            disabled={!messageInput.trim() || sendMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {conversations && conversations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Conversations</h3>
          {conversations.map(conv => (
            <Card
              key={conv.partnerId}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => openConversation(conv.partnerId, conv.partnerName)}
              data-testid={`card-conversation-${conv.partnerId}`}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {conv.partnerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{conv.partnerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="text-[10px] no-default-hover-elevate">{conv.unreadCount}</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!conversations || conversations.length === 0) && (
        <div className="py-8 text-center text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No conversations yet</p>
          <p className="text-sm mt-1">Start a conversation with one of your trainers below</p>
        </div>
      )}

      {contacts && contacts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Start New Conversation</h3>
          <div className="flex flex-wrap gap-2">
            {contacts.map(contact => (
              <Button
                key={contact.id}
                variant="outline"
                size="sm"
                onClick={() => openConversation(contact.id, contact.name)}
                data-testid={`button-start-chat-${contact.id}`}
              >
                <Avatar className="h-5 w-5 mr-1.5">
                  {contact.image && <AvatarImage src={contact.image} />}
                  <AvatarFallback className="text-[8px]">
                    {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {contact.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type AssignmentWithDrill = DrillAssignment & { drill: Drill; team?: { id: string; name: string } };

function MyDrillsTab() {
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<AssignmentWithDrill[]>({
    queryKey: ["/api/assigned-drills"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/assignments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assigned-drills"] });
      toast({ title: "Assignment updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const pending = (assignments || []).filter(a => a.status !== "completed");
  const completed = (assignments || []).filter(a => a.status === "completed");

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold mb-1" data-testid="text-no-drills">No Assigned Drills</h3>
          <p className="text-sm text-muted-foreground">
            When your trainer assigns drills, they'll appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderAssignment = (a: AssignmentWithDrill) => {
    const isCompleted = a.status === "completed";
    const dueDate = a.dueDate ? new Date(a.dueDate) : null;
    const isOverdue = dueDate && !isCompleted && dueDate < new Date();

    return (
      <Card key={a.id} className={cn(isCompleted && "opacity-60")} data-testid={`card-assignment-${a.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "mt-0.5 rounded-full p-2 shrink-0",
              isCompleted ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
            )}>
              {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm truncate" data-testid={`text-drill-title-${a.id}`}>
                  {a.drill.title}
                </h4>
                {isCompleted && (
                  <Badge variant="secondary" className="no-default-hover-elevate text-[10px]" data-testid={`badge-completed-${a.id}`}>
                    Completed
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="no-default-hover-elevate text-[10px]" data-testid={`badge-overdue-${a.id}`}>
                    Overdue
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {a.drill.category && (
                  <span className="capitalize">{a.drill.category.replace(/-/g, " ")}</span>
                )}
                {a.drill.difficulty && (
                  <Badge variant="outline" className="no-default-hover-elevate text-[10px] capitalize">
                    {a.drill.difficulty}
                  </Badge>
                )}
                {a.drill.duration && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {Math.ceil(a.drill.duration / 60)} min
                  </span>
                )}
              </div>

              {a.team && (
                <p className="text-xs text-muted-foreground mt-1">
                  Team: {a.team.name}
                </p>
              )}

              {a.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 italic bg-muted/50 rounded px-2 py-1" data-testid={`text-notes-${a.id}`}>
                  "{a.notes}"
                </p>
              )}

              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                {dueDate && (
                  <span className={cn("flex items-center gap-0.5", isOverdue && "text-destructive")}>
                    <CalendarDays className="w-3 h-3" />
                    Due {dueDate.toLocaleDateString()}
                  </span>
                )}
                {a.createdAt && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    Assigned {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3">
                {!isCompleted && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => updateStatus.mutate({ id: a.id, status: "completed" })}
                      disabled={updateStatus.isPending}
                      data-testid={`button-complete-${a.id}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Mark Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      data-testid={`button-practice-${a.id}`}
                    >
                      <a href={`/drill/${a.drill.id}`}>
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Practice
                      </a>
                    </Button>
                  </>
                )}
                {isCompleted && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: a.id, status: "assigned" })}
                    disabled={updateStatus.isPending}
                    data-testid={`button-reopen-${a.id}`}
                  >
                    Re-open
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 mt-4">
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground" data-testid="text-pending-header">
            Assigned ({pending.length})
          </h3>
          {pending.map(renderAssignment)}
        </div>
      )}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground" data-testid="text-completed-header">
            Completed ({completed.length})
          </h3>
          {completed.map(renderAssignment)}
        </div>
      )}
    </div>
  );
}

export default function MyTrainerPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-my-trainer-title">
          <UserPlus className="w-6 h-6" />
          My Trainer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Find trainers, manage sessions, view evaluations, and chat</p>
      </div>

      <Tabs defaultValue="find-trainer" data-testid="tabs-my-trainer">
        <TabsList className="w-full" data-testid="tabs-list-my-trainer">
          <TabsTrigger value="find-trainer" className="flex-1 gap-1.5" data-testid="tab-find-trainer">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Find a Trainer</span>
          </TabsTrigger>
          <TabsTrigger value="my-drills" className="flex-1 gap-1.5" data-testid="tab-my-drills">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">My Drills</span>
          </TabsTrigger>
          <TabsTrigger value="my-sessions" className="flex-1 gap-1.5" data-testid="tab-my-sessions">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">My Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="my-evaluations" className="flex-1 gap-1.5" data-testid="tab-my-evaluations">
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">My Evaluations</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 gap-1.5" data-testid="tab-chat">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="find-trainer">
          <FindTrainerTab />
        </TabsContent>
        <TabsContent value="my-drills">
          <MyDrillsTab />
        </TabsContent>
        <TabsContent value="my-sessions">
          <MySessionsTab />
        </TabsContent>
        <TabsContent value="my-evaluations">
          <MyEvaluationsTab />
        </TabsContent>
        <TabsContent value="chat">
          <ChatTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
