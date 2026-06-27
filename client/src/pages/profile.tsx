import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import {
  User, MapPin, Save, Camera, Settings, Eye, EyeOff, Globe, Lock,
  Twitter, Instagram, Loader2, ChevronRight, ExternalLink, Ruler,
  GraduationCap, Link2, BarChart3, Trophy, Video, Dumbbell, Star,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { UserProfile } from "@shared/schema";

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  age: z.number().min(5).max(100).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().max(10).optional().or(z.literal("")),
  country: z.string().default("USA"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const playerProfileSchema = z.object({
  headline: z.string().max(120).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  heightFeet: z.number().min(3).max(8).optional(),
  heightInches: z.number().min(0).max(11).optional(),
  weight: z.number().min(50).max(400).optional(),
  wingspan: z.string().optional().or(z.literal("")),
  gradYear: z.number().min(2020).max(2035).optional(),
  gpa: z.string().max(4).optional().or(z.literal("")),
  highlightVideoUrl: z.string().url().optional().or(z.literal("")),
  socialTwitter: z.string().optional().or(z.literal("")),
  socialInstagram: z.string().optional().or(z.literal("")),
  socialTiktok: z.string().optional().or(z.literal("")),
  socialYoutube: z.string().optional().or(z.literal("")),
  isPublic: z.boolean(),
  isPrivate: z.boolean(),
  showStats: z.boolean(),
  showAchievements: z.boolean(),
  showVideos: z.boolean(),
  showPersonalRecords: z.boolean(),
  showTrainingLog: z.boolean(),
  showSkills: z.boolean(),
  showArchetype: z.boolean(),
  showLocation: z.boolean(),
  showPhysical: z.boolean(),
  showAcademic: z.boolean(),
  showSocialLinks: z.boolean(),
  showEmail: z.boolean(),
});

type PlayerProfileFormData = z.infer<typeof playerProfileSchema>;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

function VisibilityToggle({
  label, description, checked, onCheckedChange, testId,
}: {
  label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {checked ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
        <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
      </div>
    </div>
  );
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "public" | "visibility">("info");

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: playerProfile } = useQuery<any>({
    queryKey: ["/api/player-profile"],
  });

  const { data: careerProfile } = useQuery<any>({
    queryKey: ["/api/career"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "", email: "", age: undefined,
      city: "", state: "", zipCode: "", country: "USA", skillLevel: "beginner",
    },
  });

  const ppForm = useForm<PlayerProfileFormData>({
    resolver: zodResolver(playerProfileSchema),
    defaultValues: {
      headline: "", bio: "", heightFeet: undefined, heightInches: undefined,
      weight: undefined, wingspan: "", gradYear: undefined, gpa: "",
      highlightVideoUrl: "", socialTwitter: "", socialInstagram: "",
      socialTiktok: "", socialYoutube: "",
      isPublic: false, isPrivate: false,
      showStats: true, showAchievements: true, showVideos: true,
      showPersonalRecords: true, showTrainingLog: false,
      showSkills: true, showArchetype: true, showLocation: true,
      showPhysical: true, showAcademic: true, showSocialLinks: true, showEmail: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || user?.firstName || "",
        email: (profile as any).email || "",
        age: profile.age || undefined,
        city: profile.city || "",
        state: profile.state || "",
        zipCode: (profile as any).zipCode || "",
        country: profile.country || "USA",
        skillLevel: profile.skillLevel || "beginner",
      });
    }
  }, [profile, user, form]);

  useEffect(() => {
    if (playerProfile) {
      ppForm.reset({
        headline: playerProfile.headline || "",
        bio: playerProfile.bio || "",
        heightFeet: playerProfile.heightFeet ?? undefined,
        heightInches: playerProfile.heightInches ?? undefined,
        weight: playerProfile.weight ?? undefined,
        wingspan: playerProfile.wingspan || "",
        gradYear: playerProfile.gradYear ?? undefined,
        gpa: playerProfile.gpa || "",
        highlightVideoUrl: playerProfile.highlightVideoUrl || "",
        socialTwitter: playerProfile.socialTwitter || "",
        socialInstagram: playerProfile.socialInstagram || "",
        socialTiktok: playerProfile.socialTiktok || "",
        socialYoutube: playerProfile.socialYoutube || "",
        isPublic: playerProfile.isPublic ?? false,
        isPrivate: playerProfile.isPrivate ?? false,
        showStats: playerProfile.showStats ?? true,
        showAchievements: playerProfile.showAchievements ?? true,
        showVideos: playerProfile.showVideos ?? true,
        showPersonalRecords: playerProfile.showPersonalRecords ?? true,
        showTrainingLog: playerProfile.showTrainingLog ?? false,
        showSkills: playerProfile.showSkills ?? true,
        showArchetype: playerProfile.showArchetype ?? true,
        showLocation: playerProfile.showLocation ?? true,
        showPhysical: playerProfile.showPhysical ?? true,
        showAcademic: playerProfile.showAcademic ?? true,
        showSocialLinks: playerProfile.showSocialLinks ?? true,
        showEmail: playerProfile.showEmail ?? false,
      });
    }
  }, [playerProfile, ppForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => apiRequest("PUT", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/location"] });
      toast({ title: "Profile updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" }),
  });

  const updatePlayerProfileMutation = useMutation({
    mutationFn: async (data: PlayerProfileFormData) => {
      const displayName = form.getValues("displayName") || user?.firstName || "player";
      const slug = generateSlug(displayName);
      return apiRequest("PUT", "/api/player-profile", { ...data, slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      toast({ title: "Public profile saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save public profile.", variant: "destructive" }),
  });

  const convertToJpeg = (file: File): Promise<{ blob: Blob; name: string; type: string }> => {
    return new Promise(resolve => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(objectUrl); resolve({ blob: file, name: file.name || "photo.jpg", type: "image/jpeg" }); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(objectUrl);
          resolve({ blob: blob ?? file, name: "photo.jpg", type: "image/jpeg" });
        }, "image/jpeg", 0.88);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve({ blob: file, name: file.name || "photo.jpg", type: "image/jpeg" }); };
      img.src = objectUrl;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg","image/png","image/gif","image/webp","image/heic","image/heif"];
    if (file.type && !allowed.includes(file.type)) { toast({ title: "Invalid file type", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Max 10MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const { blob, name, type } = await convertToJpeg(file);
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", { name, size: blob.size, contentType: type });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": type }, body: blob });
      await apiRequest("PUT", "/api/profile", { ...form.getValues(), profilePhotoUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Photo updated" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
    if (user?.firstName) return user.firstName[0];
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const profilePhotoSrc = profile?.profilePhotoUrl
    ? getObjectUrl(profile.profilePhotoUrl)
    : user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined;

  const isPublicProfile = ppForm.watch("isPublic");
  const isPrivateProfile = ppForm.watch("isPrivate");
  const displayName = form.watch("displayName") || user?.firstName || "player";
  const publicSlug = generateSlug(displayName);

  if (isLoading) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const tabs = [
    { id: "info", label: "Account Info" },
    { id: "public", label: "Public Profile" },
    { id: "visibility", label: "Visibility" },
  ] as const;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account and public presence</p>
        </div>
        {isPublicProfile && publicSlug && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
            <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-view-public-profile">
              <ExternalLink className="w-3.5 h-3.5" />
              View Profile
            </a>
          </Button>
        )}
      </div>

      {/* Profile photo + name header */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profilePhotoSrc} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity" data-testid="button-upload-profile-photo">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate" data-testid="text-profile-name">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.email || "Player"}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-xs capitalize">{profile?.skillLevel || "beginner"}</Badge>
              {profile?.city && profile?.state && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="w-2.5 h-2.5 mr-1" />{profile.city}, {profile.state}
                </Badge>
              )}
              {isPublicProfile && (
                <Badge className="text-xs bg-primary/10 text-primary border border-primary/20">
                  <Globe className="w-2.5 h-2.5 mr-1" />Public
                </Badge>
              )}
              {isPrivateProfile && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="w-2.5 h-2.5 mr-1" />Friends Only
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Info Tab */}
      {activeTab === "info" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Account Info
            </CardTitle>
            <CardDescription>Your basic account details and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => updateProfileMutation.mutate(d))} className="space-y-5">
                <FormField control={form.control} name="displayName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl><Input placeholder="Your name" {...field} data-testid="input-display-name" /></FormControl>
                    <FormDescription>This becomes your public username (e.g. /player/{generateSlug(field.value || "yourname")})</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="age" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Your age" {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-age"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="skillLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-skill-level"><SelectValue placeholder="Select level" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="elite">Elite</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Separator />
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />Location
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Your city" {...field} data-testid="input-city" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state"><SelectValue placeholder="State" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="zipCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl><Input placeholder="30009" {...field} data-testid="input-zip-code" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="gap-2" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                    <Save className="w-4 h-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Public Profile Tab */}
      {activeTab === "public" && (
        <Form {...ppForm}>
          <form onSubmit={ppForm.handleSubmit(d => updatePlayerProfileMutation.mutate(d))} className="space-y-4">
            {/* Privacy mode */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Profile Visibility
                </CardTitle>
                <CardDescription>Control who can see your public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-primary" />Make Profile Public
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Anyone with the link can see your profile</p>
                  </div>
                  <Switch
                    checked={ppForm.watch("isPublic")}
                    onCheckedChange={v => ppForm.setValue("isPublic", v)}
                    data-testid="switch-is-public"
                  />
                </div>
                {isPublicProfile && (
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />Friends Only Mode
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Only accepted connections can view your profile</p>
                    </div>
                    <Switch
                      checked={ppForm.watch("isPrivate")}
                      onCheckedChange={v => ppForm.setValue("isPrivate", v)}
                      data-testid="switch-is-private"
                    />
                  </div>
                )}
                {isPublicProfile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Your public URL: <span className="font-mono text-foreground">/player/{publicSlug}</span>
                    </p>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs gap-1" asChild>
                      <a href={`/player/${publicSlug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />View
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio & Headline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bio & Headline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={ppForm.control} name="headline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline</FormLabel>
                    <FormControl><Input placeholder="e.g. PG | Class of 2026 | ATL" {...field} data-testid="input-headline" /></FormControl>
                    <FormDescription>Short tagline shown under your name</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={ppForm.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell your story — your journey, goals, and what drives you..." className="resize-none h-28" {...field} data-testid="input-bio" />
                    </FormControl>
                    <FormDescription>{(field.value?.length || 0)}/500</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Physical Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="w-4 h-4" />Physical Attributes
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <FormField control={ppForm.control} name="heightFeet" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Height (ft)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="6" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} data-testid="input-height-feet" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={ppForm.control} name="heightInches" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>In</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} data-testid="input-height-inches" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={ppForm.control} name="weight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="180" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} data-testid="input-weight" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={ppForm.control} name="wingspan" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wingspan</FormLabel>
                    <FormControl><Input placeholder="e.g. 6'5&quot;" {...field} data-testid="input-wingspan" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Academic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />Academic
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <FormField control={ppForm.control} name="gradYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Graduation Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2026" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} data-testid="input-grad-year" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={ppForm.control} name="gpa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>GPA</FormLabel>
                    <FormControl><Input placeholder="3.8" {...field} data-testid="input-gpa" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Highlight Video */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-4 h-4" />Highlight Reel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField control={ppForm.control} name="highlightVideoUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Highlight Video URL</FormLabel>
                    <FormControl><Input placeholder="https://youtube.com/..." {...field} data-testid="input-highlight-video" /></FormControl>
                    <FormDescription>YouTube, Hudl, or any video link</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4" />Social Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "socialTwitter" as const, icon: SiX, placeholder: "@handle or full URL" },
                  { name: "socialInstagram" as const, icon: SiInstagram, placeholder: "@handle or full URL" },
                  { name: "socialTiktok" as const, icon: SiTiktok, placeholder: "@handle or full URL" },
                  { name: "socialYoutube" as const, icon: SiYoutube, placeholder: "Channel URL" },
                ].map(({ name, icon: Icon, placeholder }) => (
                  <FormField key={name} control={ppForm.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <Input placeholder={placeholder} {...field} data-testid={`input-${name}`} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" className="gap-2" disabled={updatePlayerProfileMutation.isPending} data-testid="button-save-public-profile">
                <Save className="w-4 h-4" />
                {updatePlayerProfileMutation.isPending ? "Saving..." : "Save Public Profile"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Visibility Tab */}
      {activeTab === "visibility" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />Section Visibility
            </CardTitle>
            <CardDescription>Choose what sections appear on your public profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 divide-y divide-border/50">
            {[
              { field: "showStats" as const, label: "Game Stats", description: "Points, rebounds, assists averages" },
              { field: "showSkills" as const, label: "Skill Ratings", description: "Ball handling, shooting, defense scores" },
              { field: "showArchetype" as const, label: "Player Archetype", description: "Your AI-assessed player type" },
              { field: "showAchievements" as const, label: "Achievements & Awards", description: "Team awards and trophies" },
              { field: "showPersonalRecords" as const, label: "Personal Records", description: "Your drill personal bests" },
              { field: "showVideos" as const, label: "Training Videos", description: "Uploaded training content" },
              { field: "showTrainingLog" as const, label: "Training Log", description: "Recent practice sessions" },
              { field: "showPhysical" as const, label: "Physical Info", description: "Height, weight, wingspan" },
              { field: "showAcademic" as const, label: "Academic Info", description: "GPA and graduation year" },
              { field: "showLocation" as const, label: "Location", description: "City and state" },
              { field: "showSocialLinks" as const, label: "Social Links", description: "Twitter, Instagram, TikTok, YouTube" },
              { field: "showEmail" as const, label: "Email Address", description: "Your contact email (private by default)" },
            ].map(({ field, label, description }) => (
              <VisibilityToggle
                key={field}
                label={label}
                description={description}
                checked={ppForm.watch(field) ?? false}
                onCheckedChange={v => ppForm.setValue(field, v)}
                testId={`switch-${field}`}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "visibility" && (
        <div className="flex justify-end">
          <Button
            className="gap-2"
            disabled={updatePlayerProfileMutation.isPending}
            onClick={ppForm.handleSubmit(d => updatePlayerProfileMutation.mutate(d))}
            data-testid="button-save-visibility"
          >
            <Save className="w-4 h-4" />
            {updatePlayerProfileMutation.isPending ? "Saving..." : "Save Visibility"}
          </Button>
        </div>
      )}

      {/* Settings link at bottom */}
      <Card className="border-dashed">
        <CardContent className="p-0">
          <Link href="/settings">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-xl" data-testid="button-go-to-settings">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Family controls, notifications, account</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
