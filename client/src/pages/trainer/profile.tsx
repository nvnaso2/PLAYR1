import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Eye, EyeOff, DollarSign, MapPin, Clock, Award, Globe, Instagram, Twitter, Mail, Phone, X, Star } from "lucide-react";
import { US_STATES, TRAINER_SPECIALTIES, TRAINER_SESSION_TYPES } from "@shared/schema";

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
  const [showPreview, setShowPreview] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [certifications, setCertifications] = useState("");
  const [availability, setAvailability] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { isLoading, isError } = useQuery<TrainerProfileData | null>({
    queryKey: ["/api/trainer-profile"],
    queryFn: async () => {
      const res = await fetch("/api/trainer-profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      if (data && !loaded) {
        setHeadline(data.headline || "");
        setBio(data.bio || "");
        setSpecialties(data.specialties || []);
        setCity(data.city || "");
        setState(data.state || "");
        setHourlyRate(data.hourlyRate ? String(data.hourlyRate) : "");
        setSessionTypes(data.sessionTypes || []);
        setExperienceYears(data.experienceYears ? String(data.experienceYears) : "");
        setCertifications(data.certifications || "");
        setAvailability(data.availability || "");
        setContactEmail(data.contactEmail || "");
        setContactPhone(data.contactPhone || "");
        setSocialInstagram(data.socialInstagram || "");
        setSocialTwitter(data.socialTwitter || "");
        setWebsite(data.website || "");
        setIsPublic(data.isPublic || false);
        setLoaded(true);
      }
      return data;
    },
  });

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
        availability: availability || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        socialInstagram: socialInstagram || null,
        socialTwitter: socialTwitter || null,
        website: website || null,
        isPublic,
      };
      await apiRequest("PUT", "/api/trainer-profile", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-profile"] });
      toast({ title: "Profile saved" });
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleSessionType = (t: string) => {
    setSessionTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="py-16 text-center text-muted-foreground" data-testid="text-profile-error">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-base font-medium">Failed to load profile</p>
          <p className="text-sm mt-1">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold" data-testid="text-trainer-profile-heading">My Trainer Profile</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isPublic ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
            <Label htmlFor="public-toggle" className="text-sm">
              {isPublic ? "Public" : "Hidden"}
            </Label>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              data-testid="switch-profile-public"
            />
          </div>
          <Button variant="outline" onClick={() => setShowPreview(true)} data-testid="button-preview-profile">
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-profile">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      {!isPublic && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400" data-testid="text-profile-hidden-notice">
          Your profile is hidden. Turn on "Public" to appear in the Find a Trainer directory.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" />
            About You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground">A short tagline that appears on your card</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell players about your training philosophy, background, and what makes your training unique..."
              rows={5}
              maxLength={1000}
              data-testid="input-bio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specialties</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Types</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location & Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="availability" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Availability
            </Label>
            <Input
              id="availability"
              value={availability}
              onChange={e => setAvailability(e.target.value)}
              placeholder="e.g. Weekdays 4-8pm, Weekends 9am-1pm"
              data-testid="input-availability"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Contact & Social
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email
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
                <Phone className="w-3 h-3" />
                Phone
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-1">
                <Instagram className="w-3 h-3" />
                Instagram
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
                <Twitter className="w-3 h-3" />
                Twitter / X
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
                <Globe className="w-3 h-3" />
                Website
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
        </CardContent>
      </Card>

      <div className="pb-8">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full" data-testid="button-save-profile-bottom">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      <Sheet open={showPreview} onOpenChange={setShowPreview}>
        <SheetContent className="overflow-y-auto sm:max-w-lg" data-testid="sheet-profile-preview">
          <div className="space-y-6 pb-6">
            <SheetHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {(user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") || "T"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="text-left" data-testid="text-preview-name">
                    {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Trainer"}
                  </SheetTitle>
                  {headline && (
                    <p className="text-sm text-muted-foreground mt-0.5">{headline}</p>
                  )}
                  {city && state && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {city}, {state}
                    </p>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              {hourlyRate && (
                <span className="flex items-center gap-1 font-medium">
                  <DollarSign className="w-4 h-4 text-primary" />
                  ${hourlyRate}/hr
                </span>
              )}
              {experienceYears && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {experienceYears} years experience
                </span>
              )}
            </div>

            {specialties.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-1.5">
                  {specialties.map(s => (
                    <Badge key={s} variant="secondary" className="no-default-hover-elevate">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {sessionTypes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Session Types</h4>
                <div className="flex flex-wrap gap-1.5">
                  {sessionTypes.map(s => (
                    <Badge key={s} variant="outline" className="no-default-hover-elevate">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {bio && (
              <div>
                <h4 className="text-sm font-semibold mb-2">About</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bio}</p>
              </div>
            )}

            {availability && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Availability</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {availability}
                </p>
              </div>
            )}

            {certifications && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Certifications</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {certifications}
                </p>
              </div>
            )}

            {(contactEmail || contactPhone || socialInstagram || socialTwitter || website) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Contact</h4>
                <div className="space-y-2 text-sm">
                  {contactEmail && (
                    <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Mail className="w-4 h-4" /> {contactEmail}
                    </a>
                  )}
                  {contactPhone && (
                    <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Phone className="w-4 h-4" /> {contactPhone}
                    </a>
                  )}
                  {socialInstagram && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Instagram className="w-4 h-4" /> {socialInstagram}
                    </p>
                  )}
                  {socialTwitter && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Twitter className="w-4 h-4" /> {socialTwitter}
                    </p>
                  )}
                  {website && (
                    <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Globe className="w-4 h-4" /> {website}
                    </a>
                  )}
                </div>
              </div>
            )}

            {!isPublic && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                This profile is currently hidden. Toggle "Public" to appear in the Find a Trainer directory.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
