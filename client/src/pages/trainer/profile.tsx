import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, nativeFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareMenu } from "@/components/share-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Save, Eye, EyeOff, DollarSign, MapPin, Clock, Award, Globe, Instagram,
  Twitter, Mail, Phone, X, Star, Pencil, Camera, User, Briefcase,
  Calendar, ExternalLink, CheckCircle, Plus, Trash2, ChevronDown, ChevronUp
} from "lucide-react";
import { US_STATES, TRAINER_SPECIALTIES, TRAINER_SESSION_TYPES, TRAINER_EQUIPMENT } from "@shared/schema";
import type { TrainingLocation } from "@shared/schema";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIME_OPTIONS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"
];

type TimeSlot = { start: string; end: string };
type DayAvailability = { day: string; enabled: boolean; sessions: TimeSlot[] };

function createDefaultAvailability(): DayAvailability[] {
  return DAYS_OF_WEEK.map(day => ({ day, enabled: false, sessions: [{ start: "9:00 AM", end: "5:00 PM" }] }));
}

function parseAvailability(raw: string | null): DayAvailability[] {
  if (!raw) return createDefaultAvailability();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].day) {
      const map = new Map<string, any>();
      for (const d of parsed) {
        if (map.has(d.day)) {
          const existing = map.get(d.day);
          if (d.sessions) {
            existing.sessions.push(...d.sessions);
          } else if (d.start && d.end) {
            existing.sessions.push({ start: d.start, end: d.end });
          }
        } else {
          if (d.sessions && Array.isArray(d.sessions)) {
            map.set(d.day, { day: d.day, enabled: d.enabled !== false, sessions: [...d.sessions] });
          } else if (d.start && d.end) {
            map.set(d.day, { day: d.day, enabled: d.enabled !== false, sessions: [{ start: d.start, end: d.end }] });
          }
        }
      }
      return DAYS_OF_WEEK.map(day => {
        const existing = map.get(day);
        return existing || { day, enabled: false, sessions: [{ start: "9:00 AM", end: "5:00 PM" }] };
      });
    }
  } catch {}
  return createDefaultAvailability();
}

function serializeAvailability(avail: DayAvailability[]): string {
  return JSON.stringify(avail.filter(d => d.enabled).map(d => ({
    day: d.day,
    enabled: true,
    sessions: d.sessions,
  })));
}

function formatAvailabilityDisplay(raw: string | null): DayAvailability[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((d: any) => d.enabled !== false)
        .map((d: any) => {
          if (d.sessions && Array.isArray(d.sessions)) {
            return { day: d.day, enabled: true, sessions: d.sessions };
          }
          if (d.start && d.end) {
            return { day: d.day, enabled: true, sessions: [{ start: d.start, end: d.end }] };
          }
          return null;
        })
        .filter(Boolean) as DayAvailability[];
    }
  } catch {}
  return [];
}

type TrainerProfileData = {
  id?: string;
  userId: string;
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
  contactPhone: string | null;
  socialInstagram: string | null;
  socialTwitter: string | null;
  website: string | null;
  isPublic: boolean | null;
};

export default function TrainerProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [certifications, setCertifications] = useState("");
  const [availability, setAvailability] = useState<DayAvailability[]>(createDefaultAvailability());
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const { data: profile, isLoading } = useQuery<TrainerProfileData | null>({
    queryKey: ["/api/trainer-profile"],
    queryFn: async () => {
      const res = await nativeFetch("/api/trainer-profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      if (data && !loaded) { populateForm(data); setLoaded(true); }
      return data;
    },
  });

  type LinkedLocation = {
    id: string;
    trainerProfileId: string;
    locationId: string;
    availability: string | null;
    location?: TrainingLocation;
  };

  const { data: allLocations } = useQuery<TrainingLocation[]>({
    queryKey: ["/api/training-locations"],
  });

  const { data: linkedLocations, isLoading: linkedLoading } = useQuery<LinkedLocation[]>({
    queryKey: ["/api/trainer-profile/locations"],
  });

  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [newLocCity, setNewLocCity] = useState("");
  const [newLocState, setNewLocState] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState("");
  const [editLocAddress, setEditLocAddress] = useState("");
  const [editLocCity, setEditLocCity] = useState("");
  const [editLocState, setEditLocState] = useState("");

  const linkLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      await apiRequest("POST", "/api/trainer-profile/locations", {
        trainerProfileId: profile?.id,
        locationId,
        availability: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile/locations"] });
      toast({ title: "Location added" });
    },
    onError: () => {
      toast({ title: "Failed to add location", variant: "destructive" });
    },
  });

  const unlinkLocationMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/trainer-profile/locations/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile/locations"] });
      toast({ title: "Location removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove location", variant: "destructive" });
    },
  });

  const updateLocationAvailMutation = useMutation({
    mutationFn: async ({ linkId, availability }: { linkId: string; availability: string }) => {
      await apiRequest("PUT", `/api/trainer-profile/locations/${linkId}`, { availability });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile/locations"] });
      toast({ title: "Location availability updated" });
    },
    onError: () => {
      toast({ title: "Failed to update availability", variant: "destructive" });
    },
  });

  const editLocationMutation = useMutation({
    mutationFn: async (data: { locationId: string; name: string; address: string; city: string; state: string }) => {
      const { locationId, ...body } = data;
      await apiRequest("PUT", `/api/trainer-profile/locations/edit/${locationId}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile/locations"] });
      setEditingLocationId(null);
      toast({ title: "Location updated" });
    },
    onError: () => {
      toast({ title: "Failed to update location", variant: "destructive" });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; city: string; state: string }) => {
      await apiRequest("POST", "/api/trainer-profile/locations/create", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile/locations"] });
      setShowNewLocationForm(false);
      setNewLocName("");
      setNewLocAddress("");
      setNewLocCity("");
      setNewLocState("");
      toast({ title: "Location created and linked" });
    },
    onError: () => {
      toast({ title: "Failed to create location", variant: "destructive" });
    },
  });

  function populateForm(data: TrainerProfileData) {
    setHeadline(data.headline || "");
    setBio(data.bio || "");
    setSpecialties(data.specialties || []);
    setCity(data.city || "");
    setState(data.state || "");
    setHourlyRate(data.hourlyRate ? String(data.hourlyRate) : "");
    setSessionTypes(data.sessionTypes || []);
    setEquipment(data.equipment || []);
    setExperienceYears(data.experienceYears ? String(data.experienceYears) : "");
    setCertifications(data.certifications || "");
    setAvailability(parseAvailability(data.availability));
    setContactEmail(data.contactEmail || "");
    setContactPhone(data.contactPhone || "");
    setSocialInstagram(data.socialInstagram || "");
    setSocialTwitter(data.socialTwitter || "");
    setWebsite(data.website || "");
    setIsPublic(data.isPublic || false);
    setProfilePhotoUrl(data.profilePhotoUrl || null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/trainer-profile", {
        headline: headline || null,
        bio: bio || null,
        specialties: specialties.length > 0 ? specialties : null,
        city: city || null,
        state: state || null,
        hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
        sessionTypes: sessionTypes.length > 0 ? sessionTypes : null,
        equipment: equipment.length > 0 ? equipment : null,
        experienceYears: experienceYears ? parseInt(experienceYears) : null,
        certifications: certifications || null,
        availability: availability.some(d => d.enabled) ? serializeAvailability(availability) : null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        socialInstagram: socialInstagram || null,
        socialTwitter: socialTwitter || null,
        website: website || null,
        isPublic,
        profilePhotoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile"] });
      setLoaded(false);
      toast({ title: "Profile saved" });
      setShowEditor(false);
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (file: File) => {
    const contentType = file.type || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name: file.name, size: file.size, contentType,
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      setProfilePhotoUrl(objectPath);
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleSpecialty = (s: string) => setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleSessionType = (t: string) => setSessionTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleEquipment = (e: string) => setEquipment(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const trainerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Trainer";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");
  const photoSrc = (profile?.profilePhotoUrl || profilePhotoUrl)
    ? `/objects/${(profile?.profilePhotoUrl || profilePhotoUrl)?.replace(/^\/objects\//, "")}`
    : undefined;
  const p = profile;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  const hasProfile = p && (p.headline || p.bio || p.city);
  const availDays = p?.availability ? formatAvailabilityDisplay(p.availability) : [];
  const hasContact = p?.contactEmail || p?.contactPhone || p?.socialInstagram || p?.socialTwitter || p?.website;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-md shrink-0" data-testid="img-profile-photo">
                <AvatarImage src={photoSrc} className="object-cover" />
                <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary font-bold">
                  {initials || <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground" data-testid="text-profile-name">{trainerName}</h1>
                {p?.headline && (
                  <p className="text-sm text-muted-foreground mt-1 leading-snug max-w-md" data-testid="text-profile-headline">
                    {p.headline}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {p?.city && p.state && (
                    <span className="flex items-center gap-1 text-xs text-foreground/70" data-testid="text-profile-location">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {p.city}, {p.state}
                    </span>
                  )}
                  {p?.isPublic ? (
                    <Badge className="text-[10px] px-2 py-0.5 h-5 bg-green-500/15 text-green-400 border border-green-500/30 no-default-hover-elevate" data-testid="badge-profile-public">
                      <Eye className="w-2.5 h-2.5 mr-1" /> Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border text-muted-foreground no-default-hover-elevate" data-testid="badge-profile-hidden">
                      <EyeOff className="w-2.5 h-2.5 mr-1" /> Hidden
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {p?.isPublic && (
                <ShareMenu
                  url={`/t/${p.id}`}
                  title={`${p.firstName || ""} ${p.lastName || ""} - PLAYR1 Trainer`.trim()}
                  description={`Check out my trainer profile on PLAYR1! ${p.headline || ""}`}
                  testId="button-share-trainer-profile"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (p) populateForm(p); setShowEditor(true); }}
                className="border-border"
                data-testid="button-edit-profile"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </div>
          </div>
        </div>

        {!hasProfile && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Complete Your Profile</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                Add your bio, specialties, rates, and contact info so players can find and reach you.
              </p>
              <Button size="sm" onClick={() => setShowEditor(true)} data-testid="button-setup-profile">
                <Pencil className="w-3.5 h-3.5" /> Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {hasProfile && (
          <>
            {(p?.hourlyRate || p?.experienceYears || p?.certifications) && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-6 flex-wrap" data-testid="group-profile-highlights">
                {p.hourlyRate && (
                  <div className="text-center" data-testid="text-profile-rate">
                    <p className="text-2xl font-bold text-primary">${p.hourlyRate}</p>
                    <p className="text-[11px] text-foreground/50 uppercase tracking-wider font-medium mt-0.5">per hour</p>
                  </div>
                )}
                {p.hourlyRate && p.experienceYears && (
                  <Separator orientation="vertical" className="h-12 bg-border" />
                )}
                {p.experienceYears && (
                  <div className="text-center" data-testid="text-profile-experience">
                    <p className="text-2xl font-bold text-foreground">{p.experienceYears}</p>
                    <p className="text-[11px] text-foreground/50 uppercase tracking-wider font-medium mt-0.5">years exp</p>
                  </div>
                )}
                {(p.hourlyRate || p.experienceYears) && p.certifications && (
                  <Separator orientation="vertical" className="h-12 bg-border" />
                )}
                {p.certifications && (
                  <div className="flex items-center gap-2" data-testid="text-profile-certifications">
                    <Award className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground">{p.certifications}</p>
                  </div>
                )}
              </div>
            )}

            {p?.bio && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">About</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap" data-testid="text-profile-bio">{p.bio}</p>
              </div>
            )}

            {(p?.specialties && p.specialties.length > 0) && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">Specialties</h3>
                <div className="flex flex-wrap gap-2" data-testid="group-profile-specialties">
                  {p.specialties.map(s => (
                    <Badge key={s} className="no-default-hover-elevate text-xs font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/15">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(p?.sessionTypes && p.sessionTypes.length > 0) && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">Session Types</h3>
                <div className="flex flex-wrap gap-2" data-testid="group-profile-session-types">
                  {p.sessionTypes.map(s => (
                    <Badge key={s} variant="outline" className="no-default-hover-elevate text-xs font-medium border-border text-foreground/80">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(p?.equipment && p.equipment.length > 0) && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">Equipment</h3>
                <div className="flex flex-wrap gap-2" data-testid="group-profile-equipment">
                  {p.equipment.map(e => (
                    <Badge key={e} variant="outline" className="no-default-hover-elevate text-xs font-medium border-border text-foreground/80">{e}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(availDays.length > 0 || (p?.availability && !p.availability.startsWith("["))) && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">Availability</h3>
                {availDays.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="text-profile-availability">
                    {availDays.map(d => (
                      <div key={d.day} className="rounded-lg border border-border bg-muted/80 px-3 py-2.5">
                        <span className="font-semibold text-xs text-foreground">{d.day.slice(0, 3)}</span>
                        <div className="mt-1 space-y-0.5">
                          {d.sessions.map((s, si) => (
                            <p key={si} className="text-xs text-foreground/60">{s.start} – {s.end}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80" data-testid="text-profile-availability">{p?.availability}</p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">Training Locations</h3>
              {linkedLoading ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : linkedLocations && linkedLocations.length > 0 ? (
                <div className="space-y-3" data-testid="group-profile-locations">
                  {linkedLocations.map(link => {
                    const loc = link.location;
                    const locAvail = link.availability ? formatAvailabilityDisplay(link.availability) : [];
                    return (
                      <div key={link.id} className="rounded-lg border border-border bg-muted/80 px-3 py-2.5" data-testid={`card-location-${link.id}`}>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{loc?.name || "Unknown Location"}</p>
                            {loc?.address && (
                              <p className="text-xs text-foreground/60 mt-0.5">{loc.address}</p>
                            )}
                            {(loc?.city || loc?.state) && (
                              <p className="text-xs text-foreground/50 mt-0.5">
                                {[loc.city, loc.state].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        {locAvail.length > 0 && (
                          <div className="mt-2 pl-6">
                            <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider mb-1">Hours at this location</p>
                            <div className="grid grid-cols-2 gap-1">
                              {locAvail.map(d => (
                                <div key={d.day} className="text-xs">
                                  <span className="font-medium text-foreground/80">{d.day.slice(0, 3)}: </span>
                                  {d.sessions.map((s, si) => (
                                    <span key={si} className="text-foreground/60">
                                      {si > 0 ? ", " : ""}{s.start} – {s.end}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-locations">No training locations added</p>
              )}
            </div>

            {hasContact && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3">Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {p?.contactEmail && (
                    <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors rounded-lg border border-border bg-muted/60 px-3.5 py-3" data-testid="link-profile-email">
                      <Mail className="w-4 h-4 text-primary/70 shrink-0" /> {p.contactEmail}
                    </a>
                  )}
                  {p?.contactPhone && (
                    <a href={`tel:${p.contactPhone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors rounded-lg border border-border bg-muted/60 px-3.5 py-3" data-testid="link-profile-phone">
                      <Phone className="w-4 h-4 text-primary/70 shrink-0" /> {p.contactPhone}
                    </a>
                  )}
                  {p?.socialInstagram && (
                    <div className="flex items-center gap-2.5 text-sm text-foreground rounded-lg border border-border bg-muted/60 px-3.5 py-3" data-testid="text-profile-instagram">
                      <Instagram className="w-4 h-4 text-primary/70 shrink-0" /> {p.socialInstagram}
                    </div>
                  )}
                  {p?.socialTwitter && (
                    <div className="flex items-center gap-2.5 text-sm text-foreground rounded-lg border border-border bg-muted/60 px-3.5 py-3" data-testid="text-profile-twitter">
                      <Twitter className="w-4 h-4 text-primary/70 shrink-0" /> {p.socialTwitter}
                    </div>
                  )}
                  {p?.website && (
                    <a
                      href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors rounded-lg border border-border bg-muted/60 px-3.5 py-3"
                      data-testid="link-profile-website"
                    >
                      <ExternalLink className="w-4 h-4 text-primary/70 shrink-0" /> {p.website}
                    </a>
                  )}
                </div>
              </div>
            )}

            {!p?.isPublic && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2" data-testid="text-profile-hidden-notice">
                <EyeOff className="w-4 h-4 shrink-0" />
                Your profile is hidden. Toggle "Public" in the editor to appear in the trainer directory.
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={showEditor} onOpenChange={setShowEditor}>
        <SheetContent className="overflow-y-auto sm:max-w-lg w-full" data-testid="sheet-profile-editor">
          <SheetHeader>
            <SheetTitle>Edit Profile</SheetTitle>
            <SheetDescription>Update your trainer profile information</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={profilePhotoUrl ? `/objects/${profilePhotoUrl.replace(/^\/objects\//, "")}` : undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-muted text-muted-foreground font-semibold">
                    {initials || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="button-change-photo"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(file); e.target.value = ""; }}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-photo">
                {uploading ? <><Camera className="w-4 h-4 animate-pulse" /> Uploading...</> : <><Camera className="w-4 h-4" /> {profilePhotoUrl ? "Change Photo" : "Add Photo"}</>}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <Label htmlFor="public-toggle" className="text-sm font-medium">
                  {isPublic ? "Public — visible in directory" : "Hidden — not visible"}
                </Label>
              </div>
              <Switch id="public-toggle" checked={isPublic} onCheckedChange={setIsPublic} data-testid="switch-profile-public" />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About</h4>
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input id="headline" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Elite Ball Handling & Shooting Coach" maxLength={100} data-testid="input-headline" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell players about your training philosophy..." rows={4} maxLength={1000} data-testid="input-bio" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input id="experience" type="number" min="0" max="50" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="e.g. 10" data-testid="input-experience-years" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Hourly Rate ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="rate" type="number" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="e.g. 75" className="pl-9" data-testid="input-hourly-rate" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input id="certifications" value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="e.g. NASM CPT, USA Basketball Gold License" data-testid="input-certifications" />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Specialties</h4>
              <div className="flex flex-wrap gap-2" data-testid="group-specialties">
                {TRAINER_SPECIALTIES.map(s => (
                  <Badge key={s} variant={specialties.includes(s) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleSpecialty(s)} data-testid={`badge-specialty-${s.toLowerCase().replace(/\s+/g, '-')}`}>
                    {s}{specialties.includes(s) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Types</h4>
              <div className="flex flex-wrap gap-2" data-testid="group-session-types">
                {TRAINER_SESSION_TYPES.map(t => (
                  <Badge key={t} variant={sessionTypes.includes(t) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleSessionType(t)} data-testid={`badge-session-type-${t.toLowerCase().replace(/[\s()]+/g, '-')}`}>
                    {t}{sessionTypes.includes(t) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipment</h4>
              <div className="flex flex-wrap gap-2" data-testid="group-equipment">
                {TRAINER_EQUIPMENT.map(e => (
                  <Badge key={e} variant={equipment.includes(e) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleEquipment(e)} data-testid={`badge-equipment-${e.toLowerCase().replace(/[\s/]+/g, '-')}`}>
                    {e}{equipment.includes(e) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location & Availability</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Houston" data-testid="input-city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger data-testid="select-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Availability</Label>
                <div className="space-y-2" data-testid="group-availability">
                  {availability.map((day, i) => (
                    <div
                      key={day.day}
                      className={`rounded-lg border p-2.5 transition-colors ${day.enabled ? "border-primary/30 bg-primary/5" : "border-border opacity-60"}`}
                      data-testid={`availability-day-${day.day.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={day.enabled}
                          onCheckedChange={(checked) => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, enabled: !!checked } : d))}
                          data-testid={`checkbox-${day.day.toLowerCase()}`}
                        />
                        <span className="text-sm font-medium w-12 shrink-0">{day.day.slice(0, 3)}</span>
                        {day.enabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 px-1.5 text-xs text-primary"
                            onClick={() => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, sessions: [...d.sessions, { start: "9:00 AM", end: "5:00 PM" }] } : d))}
                            data-testid={`button-add-session-${day.day.toLowerCase()}`}
                          >
                            <Plus className="w-3 h-3 mr-0.5" /> Add
                          </Button>
                        )}
                      </div>
                      {day.enabled && (
                        <div className="mt-2 space-y-1.5 pl-7">
                          {day.sessions.map((session, si) => (
                            <div key={si} className="flex items-center gap-1">
                              <Select value={session.start} onValueChange={(val) => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, sessions: d.sessions.map((s, sIdx) => sIdx === si ? { ...s, start: val } : s) } : d))}>
                                <SelectTrigger className="h-7 text-xs w-[95px]" data-testid={`select-start-${day.day.toLowerCase()}-${si}`}><SelectValue /></SelectTrigger>
                                <SelectContent>{TIME_OPTIONS.map(t => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>))}</SelectContent>
                              </Select>
                              <span className="text-xs text-muted-foreground">to</span>
                              <Select value={session.end} onValueChange={(val) => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, sessions: d.sessions.map((s, sIdx) => sIdx === si ? { ...s, end: val } : s) } : d))}>
                                <SelectTrigger className="h-7 text-xs w-[95px]" data-testid={`select-end-${day.day.toLowerCase()}-${si}`}><SelectValue /></SelectTrigger>
                                <SelectContent>{TIME_OPTIONS.map(t => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>))}</SelectContent>
                              </Select>
                              {day.sessions.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, sessions: d.sessions.filter((_, sIdx) => sIdx !== si) } : d))}
                                  data-testid={`button-remove-session-${day.day.toLowerCase()}-${si}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Training Locations</h4>
              {allLocations && allLocations.length > 0 ? (
                <div className="space-y-2" data-testid="group-editor-locations">
                  {allLocations.map(loc => {
                    const linked = linkedLocations?.find(l => l.locationId === loc.id);
                    const isLinked = !!linked;
                    const isExpanded = expandedLocationId === loc.id;
                    const locAvail = linked?.availability ? parseAvailability(linked.availability) : createDefaultAvailability();

                    return (
                      <div
                        key={loc.id}
                        className={`rounded-lg border p-3 transition-colors ${isLinked ? "border-primary/30 bg-primary/5" : "border-border"}`}
                        data-testid={`editor-location-${loc.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isLinked}
                            disabled={linkLocationMutation.isPending || unlinkLocationMutation.isPending}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                linkLocationMutation.mutate(loc.id);
                              } else if (linked) {
                                unlinkLocationMutation.mutate(linked.id);
                              }
                            }}
                            data-testid={`checkbox-location-${loc.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            {editingLocationId === loc.id ? (
                              <div className="space-y-2" data-testid={`form-edit-location-${loc.id}`}>
                                <Input
                                  placeholder="Location name"
                                  value={editLocName}
                                  onChange={e => setEditLocName(e.target.value)}
                                  data-testid={`input-edit-location-name-${loc.id}`}
                                />
                                <Input
                                  placeholder="Address"
                                  value={editLocAddress}
                                  onChange={e => setEditLocAddress(e.target.value)}
                                  data-testid={`input-edit-location-address-${loc.id}`}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    placeholder="City"
                                    value={editLocCity}
                                    onChange={e => setEditLocCity(e.target.value)}
                                    data-testid={`input-edit-location-city-${loc.id}`}
                                  />
                                  <Select value={editLocState} onValueChange={setEditLocState}>
                                    <SelectTrigger data-testid={`select-edit-location-state-${loc.id}`}>
                                      <SelectValue placeholder="State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {US_STATES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={!editLocName.trim() || editLocationMutation.isPending}
                                    onClick={() => editLocationMutation.mutate({
                                      locationId: loc.id,
                                      name: editLocName.trim(),
                                      address: editLocAddress.trim(),
                                      city: editLocCity.trim(),
                                      state: editLocState,
                                    })}
                                    data-testid={`button-save-edit-location-${loc.id}`}
                                  >
                                    {editLocationMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingLocationId(null)}
                                    data-testid={`button-cancel-edit-location-${loc.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-foreground">{loc.name}</p>
                                {loc.address && (
                                  <p className="text-xs text-muted-foreground">{loc.address}</p>
                                )}
                                {(loc.city || loc.state) && (
                                  <p className="text-xs text-muted-foreground/70">
                                    {[loc.city, loc.state].filter(Boolean).join(", ")}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          {isLinked && editingLocationId !== loc.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingLocationId(loc.id);
                                  setEditLocName(loc.name);
                                  setEditLocAddress(loc.address || "");
                                  setEditLocCity(loc.city || "");
                                  setEditLocState(loc.state || "");
                                }}
                                data-testid={`button-edit-location-${loc.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedLocationId(isExpanded ? null : loc.id)}
                                data-testid={`button-toggle-location-avail-${loc.id}`}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </div>
                          )}
                        </div>

                        {isLinked && isExpanded && (
                          <div className="mt-3 pl-7 space-y-2" data-testid={`group-location-avail-${loc.id}`}>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Availability at this location</p>
                            {locAvail.map((day, i) => (
                              <div
                                key={day.day}
                                className={`rounded-lg border p-2 transition-colors ${day.enabled ? "border-primary/30 bg-primary/5" : "border-border opacity-60"}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={day.enabled}
                                    onCheckedChange={(checked) => {
                                      const updated = locAvail.map((d, idx) => idx === i ? { ...d, enabled: !!checked } : d);
                                      updateLocationAvailMutation.mutate({
                                        linkId: linked!.id,
                                        availability: serializeAvailability(updated),
                                      });
                                    }}
                                    data-testid={`checkbox-loc-day-${loc.id}-${day.day.toLowerCase()}`}
                                  />
                                  <span className="text-xs font-medium w-10 shrink-0">{day.day.slice(0, 3)}</span>
                                  {day.enabled && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto h-6 px-1.5 text-xs text-primary"
                                      onClick={() => {
                                        const updated = locAvail.map((d, idx) => idx === i ? { ...d, sessions: [...d.sessions, { start: "9:00 AM", end: "5:00 PM" }] } : d);
                                        updateLocationAvailMutation.mutate({
                                          linkId: linked!.id,
                                          availability: serializeAvailability(updated),
                                        });
                                      }}
                                      data-testid={`button-loc-add-session-${loc.id}-${day.day.toLowerCase()}`}
                                    >
                                      <Plus className="w-3 h-3 mr-0.5" /> Add
                                    </Button>
                                  )}
                                </div>
                                {day.enabled && (
                                  <div className="mt-1.5 space-y-1 pl-7">
                                    {day.sessions.map((session, si) => (
                                      <div key={si} className="flex items-center gap-1">
                                        <Select
                                          value={session.start}
                                          onValueChange={(val) => {
                                            const updated = locAvail.map((d, idx) => idx === i ? { ...d, sessions: d.sessions.map((s, sIdx) => sIdx === si ? { ...s, start: val } : s) } : d);
                                            updateLocationAvailMutation.mutate({
                                              linkId: linked!.id,
                                              availability: serializeAvailability(updated),
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs w-[95px]" data-testid={`select-loc-start-${loc.id}-${day.day.toLowerCase()}-${si}`}><SelectValue /></SelectTrigger>
                                          <SelectContent>{TIME_OPTIONS.map(t => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <span className="text-xs text-muted-foreground">to</span>
                                        <Select
                                          value={session.end}
                                          onValueChange={(val) => {
                                            const updated = locAvail.map((d, idx) => idx === i ? { ...d, sessions: d.sessions.map((s, sIdx) => sIdx === si ? { ...s, end: val } : s) } : d);
                                            updateLocationAvailMutation.mutate({
                                              linkId: linked!.id,
                                              availability: serializeAvailability(updated),
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs w-[95px]" data-testid={`select-loc-end-${loc.id}-${day.day.toLowerCase()}-${si}`}><SelectValue /></SelectTrigger>
                                          <SelectContent>{TIME_OPTIONS.map(t => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>))}</SelectContent>
                                        </Select>
                                        {day.sessions.length > 1 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground"
                                            onClick={() => {
                                              const updated = locAvail.map((d, idx) => idx === i ? { ...d, sessions: d.sessions.filter((_, sIdx) => sIdx !== si) } : d);
                                              updateLocationAvailMutation.mutate({
                                                linkId: linked!.id,
                                                availability: serializeAvailability(updated),
                                              });
                                            }}
                                            data-testid={`button-loc-remove-session-${loc.id}-${day.day.toLowerCase()}-${si}`}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="text-no-locations-available">No training locations available yet.</p>
              )}
              {!showNewLocationForm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewLocationForm(true)}
                  className="w-full"
                  data-testid="button-add-new-location"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add New Location
                </Button>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3" data-testid="form-new-location">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Location</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Location name (e.g. Central Park Courts)"
                      value={newLocName}
                      onChange={e => setNewLocName(e.target.value)}
                      data-testid="input-new-location-name"
                    />
                    <Input
                      placeholder="Address"
                      value={newLocAddress}
                      onChange={e => setNewLocAddress(e.target.value)}
                      data-testid="input-new-location-address"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="City"
                        value={newLocCity}
                        onChange={e => setNewLocCity(e.target.value)}
                        data-testid="input-new-location-city"
                      />
                      <Select value={newLocState} onValueChange={setNewLocState}>
                        <SelectTrigger data-testid="select-new-location-state">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newLocName.trim() || createLocationMutation.isPending}
                      onClick={() => createLocationMutation.mutate({
                        name: newLocName.trim(),
                        address: newLocAddress.trim(),
                        city: newLocCity.trim(),
                        state: newLocState,
                      })}
                      data-testid="button-save-new-location"
                    >
                      {createLocationMutation.isPending ? "Creating..." : "Create & Link"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewLocationForm(false);
                        setNewLocName("");
                        setNewLocAddress("");
                        setNewLocCity("");
                        setNewLocState("");
                      }}
                      data-testid="button-cancel-new-location"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact & Social</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                  <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="trainer@email.com" data-testid="input-contact-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
                  <Input id="contact-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="(555) 123-4567" data-testid="input-contact-phone" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</Label>
                  <Input id="instagram" value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} placeholder="@handle" data-testid="input-instagram" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="flex items-center gap-1"><Twitter className="w-3 h-3" /> Twitter / X</Label>
                  <Input id="twitter" value={socialTwitter} onChange={e => setSocialTwitter(e.target.value)} placeholder="@handle" data-testid="input-twitter" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
                  <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." data-testid="input-website" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full" data-testid="button-save-profile">
                {saveMutation.isPending ? <><Save className="w-4 h-4 animate-pulse" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save Profile</>}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
