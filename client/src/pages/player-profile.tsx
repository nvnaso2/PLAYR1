import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareMenu } from "@/components/share-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest, getObjectUrl } from "@/lib/queryClient";
import {
  Save,
  ExternalLink,
  Eye,
  Globe,
  BarChart3,
  Trophy,
  Medal,
  Video,
  ClipboardList,
  Link as LinkIcon,
  Ruler,
  GraduationCap,
  Calendar,
  Camera,
  MapPin,
} from "lucide-react";
import { US_STATES, COUNTRIES, CANADIAN_PROVINCES } from "@shared/schema";
import type { PlayerProfile, Season } from "@shared/schema";

interface UserProfile {
  profilePhotoUrl: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  displayName: string | null;
}

const playerProfileFormSchema = z.object({
  slug: z.string()
    .min(3, "URL slug must be at least 3 characters")
    .max(50, "URL slug must be at most 50 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  headline: z.string().max(120, "Headline must be under 120 characters").optional().or(z.literal("")),
  bio: z.string().max(1000, "Bio must be under 1000 characters").optional().or(z.literal("")),
  country: z.string().max(10).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  zipCode: z.string().max(20).optional().or(z.literal("")),
  heightFeet: z.coerce.number().min(3).max(8).optional().or(z.literal(0)),
  heightInches: z.coerce.number().min(0).max(11).optional().or(z.literal(0)),
  weight: z.coerce.number().min(50).max(400).optional().or(z.literal(0)),
  wingspan: z.string().max(20).optional().or(z.literal("")),
  gradYear: z.coerce.number().min(2020).max(2040).optional().or(z.literal(0)),
  gpa: z.string().max(10).optional().or(z.literal("")),
  highlightVideoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  socialTwitter: z.string().max(100).optional().or(z.literal("")),
  socialInstagram: z.string().max(100).optional().or(z.literal("")),
  socialTiktok: z.string().max(100).optional().or(z.literal("")),
  socialYoutube: z.string().max(200).optional().or(z.literal("")),
  isPublic: z.boolean().default(false),
  showStats: z.boolean().default(false),
  showAchievements: z.boolean().default(false),
  showVideos: z.boolean().default(false),
  showPersonalRecords: z.boolean().default(false),
  showTrainingLog: z.boolean().default(false),
});

type PlayerProfileFormData = z.infer<typeof playerProfileFormSchema>;

export function PlayerProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery<PlayerProfile | null>({
    queryKey: ["/api/player-profile"],
  });

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const { data: userSeasons = [] } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
  });

  const toggleSeasonVisibility = useMutation({
    mutationFn: async ({ seasonId, isPublicProfile }: { seasonId: string; isPublicProfile: boolean }) => {
      return await apiRequest("PUT", `/api/seasons/${seasonId}`, { isPublicProfile });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      if (profile?.slug) {
        queryClient.invalidateQueries({ queryKey: ["/api/player", profile.slug] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update season visibility.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<PlayerProfileFormData>({
    resolver: zodResolver(playerProfileFormSchema),
    defaultValues: {
      slug: "",
      headline: "",
      bio: "",
      country: "USA",
      city: "",
      state: "",
      zipCode: "",
      heightFeet: 0,
      heightInches: 0,
      weight: 0,
      wingspan: "",
      gradYear: 0,
      gpa: "",
      highlightVideoUrl: "",
      socialTwitter: "",
      socialInstagram: "",
      socialTiktok: "",
      socialYoutube: "",
      isPublic: false,
      showStats: false,
      showAchievements: false,
      showVideos: false,
      showPersonalRecords: false,
      showTrainingLog: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        slug: profile.slug || "",
        headline: profile.headline || "",
        bio: profile.bio || "",
        country: userProfile?.country || "USA",
        city: userProfile?.city || "",
        state: userProfile?.state || "",
        zipCode: (userProfile as any)?.zipCode || "",
        heightFeet: profile.heightFeet || 0,
        heightInches: profile.heightInches || 0,
        weight: profile.weight || 0,
        wingspan: profile.wingspan || "",
        gradYear: profile.gradYear || 0,
        gpa: profile.gpa || "",
        highlightVideoUrl: profile.highlightVideoUrl || "",
        socialTwitter: profile.socialTwitter || "",
        socialInstagram: profile.socialInstagram || "",
        socialTiktok: profile.socialTiktok || "",
        socialYoutube: profile.socialYoutube || "",
        isPublic: profile.isPublic ?? false,
        showStats: profile.showStats ?? false,
        showAchievements: profile.showAchievements ?? false,
        showVideos: profile.showVideos ?? false,
        showPersonalRecords: (profile as any).showPersonalRecords ?? false,
        showTrainingLog: profile.showTrainingLog ?? false,
      });
    }
  }, [profile, userProfile, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: PlayerProfileFormData) => {
      const { city, state, zipCode, country, ...playerFields } = data;
      const payload: any = { ...playerFields };
      if (payload.heightFeet === 0) payload.heightFeet = null;
      if (payload.heightInches === 0) payload.heightInches = null;
      if (payload.weight === 0) payload.weight = null;
      if (payload.gradYear === 0) payload.gradYear = null;
      if (payload.headline === "") payload.headline = null;
      if (payload.bio === "") payload.bio = null;
      if (payload.wingspan === "") payload.wingspan = null;
      if (payload.gpa === "") payload.gpa = null;
      if (payload.highlightVideoUrl === "") payload.highlightVideoUrl = null;
      if (payload.socialTwitter === "") payload.socialTwitter = null;
      if (payload.socialInstagram === "") payload.socialInstagram = null;
      if (payload.socialTiktok === "") payload.socialTiktok = null;
      if (payload.socialYoutube === "") payload.socialYoutube = null;
      await apiRequest("PUT", "/api/profile", {
        ...(userProfile || {}),
        country: country || "USA",
        city: city || "",
        state: state || "",
        zipCode: zipCode || "",
      });
      return await apiRequest("PUT", "/api/player-profile", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/location"] });
      if (profile?.slug) {
        queryClient.invalidateQueries({ queryKey: ["/api/player", profile.slug] });
      }
      toast({
        title: "Profile Saved",
        description: "Your player profile has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
    const contentType = file.type || "image/jpeg";
    const fileName = file.name || "photo.jpg";
    if (file.type && !allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, GIF, WebP, or HEIC image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name: fileName,
        size: file.size,
        contentType,
      });
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      await apiRequest("PUT", "/api/profile", { ...(userProfile || {}), profilePhotoUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Photo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const profilePhotoSrc = userProfile?.profilePhotoUrl
    ? getObjectUrl(userProfile.profilePhotoUrl)
    : (user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
    if (user?.firstName) return user.firstName[0];
    return "?";
  };

  const onSubmit = (data: PlayerProfileFormData) => {
    saveMutation.mutate(data);
  };

  const slugValue = form.watch("slug");
  const isPublicValue = form.watch("isPublic");
  const profileUrl = slugValue ? `${window.location.origin}/player/${slugValue}` : "";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePhotoSrc} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <label
                className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
                data-testid="button-upload-player-photo"
              >
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <div className="text-white text-[10px] font-medium">...</div>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg" data-testid="text-player-name">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || "Player"}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {false && profile?.slug && isPublicValue && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm text-muted-foreground truncate" data-testid="text-profile-url">
                {profileUrl}
              </span>
            </div>
            <div className="flex gap-2">
              <ShareMenu
                url={`/player/${profile.slug}`}
                title={`${user?.firstName || ""} ${user?.lastName || ""} - PLAYR1 Player Profile`.trim()}
                description="Check out my basketball profile on PLAYR1!"
                testId="button-share-player-profile"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/player/${profile.slug}`)}
                data-testid="button-preview-profile"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile URL</CardTitle>
              <CardDescription>Choose a unique URL-friendly username for your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Slug</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">/player/</span>
                        <Input
                          placeholder="john-smith"
                          data-testid="input-slug"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Only lowercase letters, numbers, and hyphens</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
              <CardDescription>Tell coaches and recruiters about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. "Class of 2027 | Point Guard | Dallas, TX"'
                        data-testid="input-headline"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write a short bio about your basketball journey, goals, and what makes you stand out..."
                        className="min-h-[100px] resize-none"
                        data-testid="input-bio"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={v => { field.onChange(v); form.setValue("state", ""); }} value={field.value || "USA"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Your city" data-testid="input-city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => {
                    const countryVal = form.watch("country") || "USA";
                    return (
                      <FormItem>
                        <FormLabel>
                          {countryVal === "USA" ? "State" : countryVal === "CAN" ? "Province" : "Region / Province"}
                        </FormLabel>
                        {countryVal === "USA" ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map(st => (
                                <SelectItem key={st} value={st}>{st}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : countryVal === "CAN" ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-province">
                                <SelectValue placeholder="Select province" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CANADIAN_PROVINCES.map(p => (
                                <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input placeholder="Region / Province (optional)" data-testid="input-region" {...field} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => {
                  const countryVal = form.watch("country") || "USA";
                  return (
                    <FormItem>
                      <FormLabel>{countryVal === "USA" ? "Zip Code" : "Postal Code"}</FormLabel>
                      <FormControl>
                        <Input placeholder={countryVal === "USA" ? "e.g. 30009" : "Postal code"} data-testid="input-zip-code" {...field} />
                      </FormControl>
                      <FormDescription>Used for finding nearby teams, leagues, and trainers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Physical Attributes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="heightFeet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (ft)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(parseInt(val) || 0)}
                        >
                          <SelectTrigger data-testid="select-height-feet">
                            <SelectValue placeholder="Feet" />
                          </SelectTrigger>
                          <SelectContent>
                            {[3, 4, 5, 6, 7].map((ft) => (
                              <SelectItem key={ft} value={String(ft)}>
                                {ft}'
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="heightInches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (in)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value !== undefined ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(parseInt(val))}
                        >
                          <SelectTrigger data-testid="select-height-inches">
                            <SelectValue placeholder="Inches" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i}"
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (lbs)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="175"
                          data-testid="input-weight"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wingspan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wingspan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`6'8"`}
                          data-testid="input-wingspan"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gradYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graduation Year</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(parseInt(val) || 0)}
                        >
                          <SelectTrigger data-testid="select-grad-year">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 15 }, (_, i) => 2024 + i).map((yr) => (
                              <SelectItem key={yr} value={String(yr)}>
                                {yr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gpa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPA</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="3.5"
                          data-testid="input-gpa"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Highlight Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="highlightVideoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Highlight Video URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        data-testid="input-highlight-video"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>YouTube, Hudl, or other video link</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Social Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="socialTwitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter / X</FormLabel>
                    <FormControl>
                      <Input placeholder="@handle" data-testid="input-social-twitter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialInstagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="@handle" data-testid="input-social-instagram" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialTiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input placeholder="@handle" data-testid="input-social-tiktok" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialYoutube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input placeholder="Channel URL" data-testid="input-social-youtube" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {false && <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visibility Settings
              </CardTitle>
              <CardDescription>Control what visitors can see on your public profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public Profile
                      </FormLabel>
                      <FormDescription>Make your profile visible to anyone with the link</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-public"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="showStats"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Career Stats
                      </FormLabel>
                      <FormDescription>Show game averages and season stats</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-stats"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="showAchievements"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Awards
                      </FormLabel>
                      <FormDescription>Show team awards and achievements</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-achievements"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="showPersonalRecords"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Medal className="h-4 w-4" />
                        Personal Records
                      </FormLabel>
                      <FormDescription>Show your personal best scores and records</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-personal-records"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="showVideos"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Videos
                      </FormLabel>
                      <FormDescription>Show your public training videos</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-videos"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Separator />
              <FormField
                control={form.control}
                name="showTrainingLog"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Training Log
                      </FormLabel>
                      <FormDescription>Show your training activity</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-training-log"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>}

          {userSeasons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Season Visibility
                </CardTitle>
                <CardDescription>Choose which seasons appear on your public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {userSeasons.map((season) => (
                  <div
                    key={season.id}
                    className="flex items-center justify-between gap-4"
                    data-testid={`season-visibility-${season.id}`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{season.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {season.teamName && `${season.teamName} - `}{season.year}
                      </div>
                    </div>
                    <Switch
                      checked={season.isPublicProfile ?? false}
                      onCheckedChange={(checked) => {
                        toggleSeasonVisibility.mutate({ seasonId: season.id, isPublicProfile: checked });
                      }}
                      data-testid={`switch-season-${season.id}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-profile"
            >
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function PlayerProfilePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">
          Player Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile photo, location, and public recruiting profile
        </p>
      </div>
      <PlayerProfileSection />
    </div>
  );
}
