import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Save, Eye, EyeOff, DollarSign, MapPin, Clock, Award, Globe, Instagram,
  Twitter, Mail, Phone, X, Star, Pencil, Camera, Upload, User, Briefcase,
  Calendar, ExternalLink, CheckCircle
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { US_STATES, TRAINER_SPECIALTIES, TRAINER_SESSION_TYPES } from "@shared/schema";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIME_OPTIONS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"
];

type DayAvailability = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
};

function createDefaultAvailability(): DayAvailability[] {
  return DAYS_OF_WEEK.map(day => ({
    day,
    enabled: false,
    start: "9:00 AM",
    end: "5:00 PM",
  }));
}

function parseAvailability(raw: string | null): DayAvailability[] {
  if (!raw) return createDefaultAvailability();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].day) {
      const map = new Map(parsed.map((d: DayAvailability) => [d.day, d]));
      return DAYS_OF_WEEK.map(day => {
        const existing = map.get(day);
        return existing || { day, enabled: false, start: "9:00 AM", end: "5:00 PM" };
      });
    }
  } catch {}
  return createDefaultAvailability();
}

function serializeAvailability(avail: DayAvailability[]): string {
  return JSON.stringify(avail.filter(d => d.enabled));
}

function formatAvailabilityDisplay(raw: string | null): DayAvailability[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((d: DayAvailability) => d.enabled);
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
      const res = await fetch("/api/trainer-profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      if (data && !loaded) {
        populateForm(data);
        setLoaded(true);
      }
      return data;
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
      const body: any = {
        headline: headline || null,
        bio: bio || null,
        specialties: specialties.length > 0 ? specialties : null,
        city: city || null,
        state: state || null,
        hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
        sessionTypes: sessionTypes.length > 0 ? sessionTypes : null,
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
      };
      await apiRequest("PUT", "/api/trainer-profile", body);
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
    if (!file.type.startsWith("image/")) {
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
        name: file.name,
        size: file.size,
        contentType: file.type,
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setProfilePhotoUrl(objectPath);
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleSessionType = (t: string) => {
    setSessionTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const trainerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Trainer";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");
  const photoSrc = (profile?.profilePhotoUrl || profilePhotoUrl)
    ? `/objects/${(profile?.profilePhotoUrl || profilePhotoUrl)?.replace(/^\/objects\//, "")}`
    : undefined;
  const p = profile;

  if (isLoading) {
    return (
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="flex gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasProfile = p && (p.headline || p.bio || p.city);

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background h-40 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(249,115,22,0.15),transparent_70%)]" />
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {p?.isPublic ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 no-default-hover-elevate" data-testid="badge-profile-public">
              <Eye className="w-3 h-3 mr-1" /> Public
            </Badge>
          ) : (
            <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-profile-hidden">
              <EyeOff className="w-3 h-3 mr-1" /> Hidden
            </Badge>
          )}
          <Button
            size="sm"
            onClick={() => { if (p) populateForm(p); setShowEditor(true); }}
            data-testid="button-edit-profile"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 sm:-mt-20 pb-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="relative group">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-lg" data-testid="img-profile-photo">
              <AvatarImage src={photoSrc} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {initials || <User className="w-10 h-10" />}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 pt-2 sm:pt-8">
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-profile-name">{trainerName}</h1>
            {p?.headline && (
              <p className="text-muted-foreground mt-1 text-sm sm:text-base" data-testid="text-profile-headline">
                {p.headline}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-muted-foreground">
              {p?.city && p.state && (
                <span className="flex items-center gap-1" data-testid="text-profile-location">
                  <MapPin className="w-4 h-4" /> {p.city}, {p.state}
                </span>
              )}
              {p?.hourlyRate && (
                <span className="flex items-center gap-1 text-foreground font-medium" data-testid="text-profile-rate">
                  <DollarSign className="w-4 h-4 text-primary" /> ${p.hourlyRate}/hr
                </span>
              )}
              {p?.experienceYears && (
                <span className="flex items-center gap-1" data-testid="text-profile-experience">
                  <Star className="w-4 h-4 text-yellow-500" /> {p.experienceYears} years
                </span>
              )}
            </div>
          </div>
        </div>

        {!hasProfile && (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold text-lg mb-2">Set Up Your Profile</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                Add your bio, specialties, rates, and contact info to help players find and connect with you.
              </p>
              <Button onClick={() => setShowEditor(true)} data-testid="button-setup-profile">
                <Pencil className="w-4 h-4" /> Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {hasProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {p?.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4" /> About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-profile-bio">
                      {p.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {(p?.specialties && p.specialties.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Specialties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2" data-testid="group-profile-specialties">
                      {p.specialties.map(s => (
                        <Badge key={s} variant="secondary" className="no-default-hover-elevate text-sm py-1 px-3">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(p?.sessionTypes && p.sessionTypes.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Session Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2" data-testid="group-profile-session-types">
                      {p.sessionTypes.map(s => (
                        <Badge key={s} variant="outline" className="no-default-hover-elevate text-sm py-1 px-3">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {p?.availability && (() => {
                    const days = formatAvailabilityDisplay(p.availability);
                    return days.length > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Availability</p>
                        <div className="space-y-1.5" data-testid="text-profile-availability">
                          {days.map(d => (
                            <div key={d.day} className="flex items-center justify-between text-sm">
                              <span className="font-medium w-20 shrink-0">{d.day.slice(0, 3)}</span>
                              <span className="text-muted-foreground">{d.start} – {d.end}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Availability</p>
                        <p className="text-sm" data-testid="text-profile-availability">{p.availability}</p>
                      </div>
                    );
                  })()}
                  {p?.certifications && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Certifications</p>
                      <p className="text-sm flex items-center gap-1" data-testid="text-profile-certifications">
                        <Award className="w-4 h-4 text-primary shrink-0" /> {p.certifications}
                      </p>
                    </div>
                  )}
                  {p?.hourlyRate && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rate</p>
                      <p className="text-sm font-semibold" data-testid="text-profile-rate-detail">${p.hourlyRate} / hour</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(p?.contactEmail || p?.contactPhone || p?.socialInstagram || p?.socialTwitter || p?.website) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Contact & Social
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {p.contactEmail && (
                      <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-profile-email">
                        <Mail className="w-4 h-4 shrink-0" /> {p.contactEmail}
                      </a>
                    )}
                    {p.contactPhone && (
                      <a href={`tel:${p.contactPhone}`} className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-profile-phone">
                        <Phone className="w-4 h-4 shrink-0" /> {p.contactPhone}
                      </a>
                    )}
                    {p.socialInstagram && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-profile-instagram">
                        <Instagram className="w-4 h-4 shrink-0" /> {p.socialInstagram}
                      </p>
                    )}
                    {p.socialTwitter && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-profile-twitter">
                        <Twitter className="w-4 h-4 shrink-0" /> {p.socialTwitter}
                      </p>
                    )}
                    {p.website && (
                      <a
                        href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                        data-testid="link-profile-website"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" /> {p.website}
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {!p?.isPublic && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400" data-testid="text-profile-hidden-notice">
                  <EyeOff className="w-4 h-4 inline mr-1" />
                  Your profile is hidden from the directory. Open the editor and toggle "Public" to be discoverable.
                </div>
              )}
            </div>
          </div>
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
                  <AvatarImage src={profilePhotoUrl ? `/objects/${profilePhotoUrl.replace(/^\/objects\//, "")}` : undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
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
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload-photo"
              >
                {uploading ? (
                  <><Upload className="w-4 h-4 animate-pulse" /> Uploading...</>
                ) : (
                  <><Camera className="w-4 h-4" /> {profilePhotoUrl ? "Change Photo" : "Add Photo"}</>
                )}
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
              <Switch
                id="public-toggle"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                data-testid="switch-profile-public"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">About</h4>
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="e.g. Elite Ball Handling & Shooting Coach"
                  maxLength={100}
                  data-testid="input-headline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell players about your training philosophy..."
                  rows={4}
                  maxLength={1000}
                  data-testid="input-bio"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={e => setExperienceYears(e.target.value)}
                    placeholder="e.g. 10"
                    data-testid="input-experience-years"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Hourly Rate ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="rate"
                      type="number"
                      min="0"
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                      placeholder="e.g. 75"
                      className="pl-9"
                      data-testid="input-hourly-rate"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  value={certifications}
                  onChange={e => setCertifications(e.target.value)}
                  placeholder="e.g. NASM CPT, USA Basketball Gold License"
                  data-testid="input-certifications"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Specialties</h4>
              <div className="flex flex-wrap gap-2" data-testid="group-specialties">
                {TRAINER_SPECIALTIES.map(s => (
                  <Badge
                    key={s}
                    variant={specialties.includes(s) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleSpecialty(s)}
                    data-testid={`badge-specialty-${s.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {s}
                    {specialties.includes(s) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Session Types</h4>
              <div className="flex flex-wrap gap-2" data-testid="group-session-types">
                {TRAINER_SESSION_TYPES.map(t => (
                  <Badge
                    key={t}
                    variant={sessionTypes.includes(t) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleSessionType(t)}
                    data-testid={`badge-session-type-${t.toLowerCase().replace(/[\s()]+/g, '-')}`}
                  >
                    {t}
                    {sessionTypes.includes(t) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Location & Availability</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Houston"
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger data-testid="select-state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Availability</Label>
                <div className="space-y-2" data-testid="group-availability">
                  {availability.map((day, i) => (
                    <div
                      key={day.day}
                      className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${day.enabled ? "border-primary/30 bg-primary/5" : "border-border opacity-60"}`}
                      data-testid={`availability-day-${day.day.toLowerCase()}`}
                    >
                      <Checkbox
                        checked={day.enabled}
                        onCheckedChange={(checked) => {
                          setAvailability(prev => prev.map((d, idx) =>
                            idx === i ? { ...d, enabled: !!checked } : d
                          ));
                        }}
                        data-testid={`checkbox-${day.day.toLowerCase()}`}
                      />
                      <span className="text-sm font-medium w-12 shrink-0">{day.day.slice(0, 3)}</span>
                      {day.enabled && (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Select
                            value={day.start}
                            onValueChange={(val) => {
                              setAvailability(prev => prev.map((d, idx) =>
                                idx === i ? { ...d, start: val } : d
                              ));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[100px]" data-testid={`select-start-${day.day.toLowerCase()}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(t => (
                                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground">to</span>
                          <Select
                            value={day.end}
                            onValueChange={(val) => {
                              setAvailability(prev => prev.map((d, idx) =>
                                idx === i ? { ...d, end: val } : d
                              ));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[100px]" data-testid={`select-end-${day.day.toLowerCase()}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(t => (
                                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact & Social</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="trainer@email.com"
                    data-testid="input-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    data-testid="input-contact-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={socialInstagram}
                    onChange={e => setSocialInstagram(e.target.value)}
                    placeholder="@handle"
                    data-testid="input-instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="flex items-center gap-1">
                    <Twitter className="w-3 h-3" /> Twitter / X
                  </Label>
                  <Input
                    id="twitter"
                    value={socialTwitter}
                    onChange={e => setSocialTwitter(e.target.value)}
                    placeholder="@handle"
                    data-testid="input-twitter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Website
                  </Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://..."
                    data-testid="input-website"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full"
                data-testid="button-save-profile"
              >
                {saveMutation.isPending ? (
                  <><Save className="w-4 h-4 animate-pulse" /> Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Save Profile</>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
