import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
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
  experienceValue,
  makeUniqueRankings,
  numberValue,
  PLAYER_SETUP_GOALS,
  PLAYER_SETUP_RANK_FIELDS,
  PLAYER_SETUP_SITUATIONS,
  PLAYER_SETUP_SKILLS,
  PLAYER_SETUP_TEAM_ROLES,
} from "@/lib/player-setup-answers";
import type { PlayerSetupAnswers, PlayerSetupResponse } from "@/lib/player-setup-answers";
import {
  ArrowLeft,
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
  UserRound,
} from "lucide-react";
import {
  BASKETBALL_ASPIRATIONS,
  BASKETBALL_POSITIONS,
  CANADIAN_PROVINCES,
  COUNTRIES,
  GRADE_LEVELS,
  PLAYER_CARD_CAREER_STAT_KEYS,
  US_STATES,
} from "@shared/schema";
import type { PlayerCardCareerStatKey, PlayerProfile, Season } from "@shared/schema";

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
  jerseyNumber: z.coerce.number().int().min(0).max(99).default(0),
  positions: z.array(z.string()).default([]),
  gradeLevel: z.string().max(30).optional().or(z.literal("")),
  teamName: z.string().max(100).optional().or(z.literal("")),
  aspiration: z.string().max(40).optional().or(z.literal("")),
  cardCareerStats: z.array(z.enum(PLAYER_CARD_CAREER_STAT_KEYS)).min(1).max(3).default(["ppg", "rpg", "apg"]),
  heightFeet: z.coerce.number().min(3).max(8).optional().or(z.literal(0)),
  heightInches: z.coerce.number().min(0).max(11).optional().or(z.literal(0)),
  weight: z.coerce.number().min(50).max(400).optional().or(z.literal(0)),
  wingspan: z.string().max(20).optional().or(z.literal("")),
  schoolName: z.string().max(200).optional().or(z.literal("")),
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

const gradeLabels: Record<string, string> = {
  elementary: "Elementary",
  "6th": "6th grade",
  "7th": "7th grade",
  "8th": "8th grade",
  freshman: "High school freshman",
  sophomore: "High school sophomore",
  junior: "High school junior",
  senior: "High school senior",
  "college-freshman": "College freshman",
  "college-sophomore": "College sophomore",
  "college-junior": "College junior",
  "college-senior": "College senior",
  "post-college": "Post-college",
};

const aspirationLabels: Record<string, string> = {
  recreational: "Recreational",
  "feeder-team": "Feeder team",
  aau: "AAU",
  "middle-school": "Middle school",
  "high-school": "High school",
  college: "College",
  "professional-non-nba": "Professional",
  nba: "NBA",
};

const cardCareerStatLabels: Record<PlayerCardCareerStatKey, string> = {
  ppg: "PPG",
  rpg: "RPG",
  apg: "APG",
  spg: "SPG",
  bpg: "BPG",
  games: "GP",
  record: "W-L",
};

const conciseProfileSteps = [
  { title: "Player", detail: "Your name, current level, and positions." },
  { title: "Development", detail: "Your skill strengths, goals, and training experience." },
  { title: "Team & Location", detail: "Your team, pathway, and where you play." },
  { title: "Physical & Academics", detail: "Your measurements, school, and graduation details." },
  { title: "About", detail: "Introduce yourself and how you play." },
  { title: "Card Stats", detail: "Choose the career numbers shown on your player card." },
] as const;

type PlayerProfileFormData = z.infer<typeof playerProfileFormSchema>;

function makeProfileSlug(name: string, userId?: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player";
  return `${base}${userId ? `-${userId.slice(-5)}` : ""}`;
}

function normalizeBasketballPositions(value: unknown): Array<(typeof BASKETBALL_POSITIONS)[number]> {
  if (!Array.isArray(value)) return [];
  return value.filter((position): position is (typeof BASKETBALL_POSITIONS)[number] =>
    typeof position === "string" &&
    BASKETBALL_POSITIONS.includes(position as (typeof BASKETBALL_POSITIONS)[number])
  );
}

export function PlayerProfileSection({
  concise = false,
  onSaved,
}: {
  concise?: boolean;
  onSaved?: () => void;
} = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const profileName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "player";
  const fallbackSlug = makeProfileSlug(profileName, user?.id);
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [uploading, setUploading] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const { data: profile, isLoading } = useQuery<PlayerProfile | null>({
    queryKey: ["/api/player-profile"],
  });

  const { data: userProfile, isLoading: isUserProfileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const { data: careerProfile, isLoading: isCareerProfileLoading } = useQuery<any>({
    queryKey: ["/api/career"],
    enabled: concise,
  });

  const {
    data: playerSetupResponse,
    isLoading: isPlayerSetupLoading,
    isError: isPlayerSetupError,
    refetch: refetchPlayerSetup,
  } = useQuery<PlayerSetupResponse>({
    queryKey: ["/api/player-setup"],
    enabled: concise,
  });
  const [setupDraft, setSetupDraft] = useState<PlayerSetupAnswers | null>(null);
  function updateSetupDraft<K extends keyof PlayerSetupAnswers>(
    key: K,
    value: PlayerSetupAnswers[K],
  ) {
    setSetupDraft((current) => current ? { ...current, [key]: value } : current);
  }

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
      jerseyNumber: 0,
      positions: [],
      gradeLevel: "",
      teamName: "",
      aspiration: "",
      cardCareerStats: ["ppg", "rpg", "apg"],
      heightFeet: 0,
      heightInches: 0,
      weight: 0,
      wingspan: "",
      schoolName: "",
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
    if (!concise || !playerSetupResponse || isCareerProfileLoading) return;
    const answers = playerSetupResponse.answers ?? {};
    const positions = answers.positions !== undefined
      ? normalizeBasketballPositions(answers.positions)
      : normalizeBasketballPositions(careerProfile?.positions);
    setSetupDraft({
      firstName: answers.firstName ?? user?.firstName ?? "",
      lastName: answers.lastName ?? user?.lastName ?? "",
      currentSituation: answers.currentSituation ?? PLAYER_SETUP_SITUATIONS[0],
      skillRankings: makeUniqueRankings(answers.skillRankings),
      skillRoles: [],
      primaryGoal: answers.primaryGoal ?? PLAYER_SETUP_GOALS[0],
      trainingDaysPerUnit: numberValue(answers.trainingDaysPerUnit, 3),
      trainingPeriodUnit: answers.trainingPeriodUnit === "month" ? "month" : "week",
      experienceYears: experienceValue(answers.experienceYears),
      competitiveExperienceYears: numberValue(answers.competitiveExperienceYears, 0),
      teamName: answers.teamName ?? careerProfile?.teamName ?? "",
      teamRole: answers.teamRole ?? PLAYER_SETUP_TEAM_ROLES[0],
      positions,
      aspiration: careerProfile?.aspiration ?? "",
    });
  }, [
    concise,
    playerSetupResponse,
    isCareerProfileLoading,
    careerProfile,
    user?.firstName,
    user?.lastName,
  ]);

  useEffect(() => {
    form.reset({
      slug: profile?.slug || fallbackSlug,
      headline: profile?.headline || "",
      bio: profile?.bio || "",
      country: userProfile?.country || "USA",
      city: userProfile?.city || "",
      state: userProfile?.state || "",
      zipCode: (userProfile as any)?.zipCode || "",
      jerseyNumber: careerProfile?.jerseyNumber ?? 0,
      positions: concise && playerSetupResponse?.answers?.positions !== undefined
        ? normalizeBasketballPositions(playerSetupResponse.answers.positions)
        : normalizeBasketballPositions(careerProfile?.positions),
      gradeLevel: careerProfile?.gradeLevel ?? "",
      teamName: concise && typeof playerSetupResponse?.answers?.teamName === "string"
        ? playerSetupResponse.answers.teamName
        : careerProfile?.teamName ?? "",
      aspiration: careerProfile?.aspiration ?? "",
      cardCareerStats: profile?.cardCareerStats?.length
        ? profile.cardCareerStats.slice(0, 3)
        : ["ppg", "rpg", "apg"],
      heightFeet: profile?.heightFeet || 0,
      heightInches: profile?.heightInches || 0,
      weight: profile?.weight || 0,
      wingspan: profile?.wingspan || "",
      schoolName: profile?.schoolName || "",
      gradYear: profile?.gradYear || 0,
      gpa: profile?.gpa || "",
      highlightVideoUrl: profile?.highlightVideoUrl || "",
      socialTwitter: profile?.socialTwitter || "",
      socialInstagram: profile?.socialInstagram || "",
      socialTiktok: profile?.socialTiktok || "",
      socialYoutube: profile?.socialYoutube || "",
      isPublic: profile?.isPublic ?? false,
      showStats: profile?.showStats ?? false,
      showAchievements: profile?.showAchievements ?? false,
      showVideos: profile?.showVideos ?? false,
      showPersonalRecords: (profile as any)?.showPersonalRecords ?? false,
      showTrainingLog: profile?.showTrainingLog ?? false,
    });
  }, [profile, userProfile, careerProfile, playerSetupResponse, concise, form, fallbackSlug]);

  useEffect(() => {
    if (!profile?.slug && !form.getValues("slug")) {
      form.setValue("slug", fallbackSlug);
    }
  }, [profile?.slug, fallbackSlug, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: PlayerProfileFormData) => {
      if (concise && !setupDraft) {
        throw new Error("Player setup answers could not be loaded. Reload the page and try again.");
      }
      const {
        city,
        state,
        zipCode,
        country,
        jerseyNumber,
        positions,
        gradeLevel,
        teamName,
        aspiration,
        ...playerFields
      } = data;
      const payload: any = { ...playerFields };
      if (payload.heightFeet === 0) payload.heightFeet = null;
      if (payload.heightInches === 0) payload.heightInches = null;
      if (payload.weight === 0) payload.weight = null;
      if (payload.gradYear === 0) payload.gradYear = null;
      if (payload.headline === "") payload.headline = null;
      if (payload.bio === "") payload.bio = null;
      if (payload.wingspan === "") payload.wingspan = null;
      if (payload.schoolName === "") payload.schoolName = null;
      if (payload.gpa === "") payload.gpa = null;
      if (payload.highlightVideoUrl === "") payload.highlightVideoUrl = null;
      if (payload.socialTwitter === "") payload.socialTwitter = null;
      if (payload.socialInstagram === "") payload.socialInstagram = null;
      if (payload.socialTiktok === "") payload.socialTiktok = null;
      if (payload.socialYoutube === "") payload.socialYoutube = null;
      if (concise && setupDraft) {
        await apiRequest("PUT", "/api/player-setup", {
          answers: {
            firstName: setupDraft.firstName.trim(),
            lastName: setupDraft.lastName.trim(),
            currentSituation: setupDraft.currentSituation,
            skillRankings: setupDraft.skillRankings,
            skillRoles: PLAYER_SETUP_RANK_FIELDS.map(({ key }) => setupDraft.skillRankings[key]),
            primaryGoal: setupDraft.primaryGoal,
            trainingDaysPerUnit: setupDraft.trainingDaysPerUnit,
            trainingPeriodUnit: setupDraft.trainingPeriodUnit,
            experienceYears: setupDraft.experienceYears,
            competitiveExperienceYears: setupDraft.competitiveExperienceYears,
            teamName: teamName?.trim() || "",
            teamRole: setupDraft.teamRole,
            positions,
          },
        });
      }
      await apiRequest("PUT", "/api/profile", {
        ...(userProfile || {}),
        country: country || "USA",
        city: city || "",
        state: state || "",
        zipCode: zipCode || "",
      });
      if (concise) {
        await apiRequest("PUT", "/api/career", {
          jerseyNumber,
          positions,
          gradeLevel: gradeLevel || null,
          teamName: teamName || null,
          aspiration: aspiration || null,
          schoolName: payload.schoolName,
        });
      }
      const savedPlayerProfile = await apiRequest("PUT", "/api/player-profile", payload);
      return await savedPlayerProfile.json() as PlayerProfile;
    },
    onSuccess: async (savedPlayerProfile: PlayerProfile) => {
      queryClient.setQueryData(["/api/player-profile"], savedPlayerProfile);
      const keysToRefresh = ["/api/player-profile", "/api/profile", "/api/user/location"];
      if (concise) {
        keysToRefresh.push("/api/career", "/api/stats/career", "/api/player-setup", "/api/auth/user");
      }
      if (profile?.slug) {
        queryClient.invalidateQueries({ queryKey: ["/api/player", profile.slug] });
      }
      await Promise.all(keysToRefresh.map(queryKey =>
        queryClient.invalidateQueries({ queryKey: [queryKey] }),
      ));
      toast({
        title: "Profile Saved",
        description: "Your player profile has been updated.",
      });
      if (concise) {
        onSaved?.();
      }
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
    if (concise) {
      if (!setupDraft) {
        toast({
          title: "Player setup still loading",
          description: "Wait for your setup answers to load, then try saving again.",
          variant: "destructive",
        });
        return;
      }
      if (!setupDraft.firstName.trim() || !setupDraft.lastName.trim()) {
        toast({
          title: "Add your name",
          description: "First and last name are required.",
          variant: "destructive",
        });
        return;
      }
      if (new Set(Object.values(setupDraft.skillRankings)).size !== 4) {
        toast({
          title: "Choose four different skills",
          description: "Each skill rank must be unique.",
          variant: "destructive",
        });
        return;
      }
      const maxTrainingDays = setupDraft.trainingPeriodUnit === "week" ? 7 : 31;
      if (
        !Number.isInteger(setupDraft.trainingDaysPerUnit) ||
        setupDraft.trainingDaysPerUnit < 0 ||
        setupDraft.trainingDaysPerUnit > maxTrainingDays
      ) {
        toast({
          title: "Check your training schedule",
          description: `Training days must be a whole number from 0 to ${maxTrainingDays} per ${setupDraft.trainingPeriodUnit}.`,
          variant: "destructive",
        });
        return;
      }
      const experience = String(setupDraft.experienceYears).trim();
      const isExperienceRange = ["0", "1 to 3", "4 to 6", "7 to 10", "10+"].includes(experience);
      const numericExperience = Number(experience);
      if (
        !experience ||
        (!isExperienceRange && (!Number.isFinite(numericExperience) || numericExperience < 0 || numericExperience > 100)) ||
        !Number.isFinite(setupDraft.competitiveExperienceYears) ||
        setupDraft.competitiveExperienceYears < 0 ||
        setupDraft.competitiveExperienceYears > 100
      ) {
        toast({
          title: "Check your playing experience",
          description: "Enter years from 0 to 100 for both experience fields.",
          variant: "destructive",
        });
        return;
      }
    }
    saveMutation.mutate(data);
  };

  const slugValue = form.watch("slug");
  const isPublicValue = form.watch("isPublic");
  const profileUrl = slugValue ? `${window.location.origin}/player/${slugValue}` : "";

  if (concise && isPlayerSetupError) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-zinc-950 p-4" role="alert">
        <p className="text-sm font-semibold text-zinc-100">Player setup answers could not be loaded.</p>
        <p className="mt-1 text-xs text-zinc-400">Retry before editing so your saved answers are not overwritten.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refetchPlayerSetup()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (
    isLoading ||
    isUserProfileLoading ||
    (concise && (isCareerProfileLoading || isPlayerSetupLoading || !setupDraft))
  ) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={concise ? "space-y-3" : "space-y-6"}>
      {concise && (
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-400">Player profile setup</p>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-zinc-500" data-testid="text-profile-step-count">
              {wizardStep + 1} of {conciseProfileSteps.length}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5" aria-label={`Step ${wizardStep + 1} of ${conciseProfileSteps.length}`}>
            {conciseProfileSteps.map((step, index) => (
              <span
                key={step.title}
                aria-current={index === wizardStep ? "step" : undefined}
                className={`h-1.5 rounded-full transition-colors ${
                  index <= wizardStep ? "bg-orange-400" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">{conciseProfileSteps[wizardStep].detail}</p>
        </div>
      )}
      {!concise && (
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
      )}

      {!concise && false && profile?.slug && isPublicValue && (
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
                url={`/player/${profile?.slug || ""}`}
                title={`${user?.firstName || ""} ${user?.lastName || ""} - PLAYR1 Player Profile`.trim()}
                description="Check out my basketball profile on PLAYR1!"
                testId="button-share-player-profile"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/player/${profile?.slug || ""}?returnTo=${encodeURIComponent(search ? `${location}?${search}` : location)}`)}
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
        <form
          onSubmit={(event) => {
            if (concise) {
              const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
              if (
                wizardStep !== conciseProfileSteps.length - 1 ||
                submitter?.dataset.testid !== "button-save-profile"
              ) {
                event.preventDefault();
                return;
              }
            }
            void form.handleSubmit(onSubmit)(event);
          }}
          onKeyDown={(event) => {
            if (!concise || event.key !== "Enter") return;
            const target = event.target as HTMLElement;
            const isMultilineOrSelect = target.tagName === "TEXTAREA" || target.getAttribute("role") === "combobox";
            const isSaveButton = target.closest("button")?.dataset.testid === "button-save-profile";
            if (!isMultilineOrSelect && !isSaveButton) event.preventDefault();
          }}
          className={concise ? "space-y-3" : "space-y-6"}
        >
          {!concise && <Card>
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
          </Card>}

          {!concise && <Card>
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
          </Card>}

          <Card className={concise ? "border-zinc-800/70 bg-zinc-900/60 shadow-none" : "contents"}>
            {concise && (
              <CardHeader className="px-3 pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 text-orange-400" />
                  {conciseProfileSteps[wizardStep].title}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={concise ? "space-y-2 px-3 pb-3 pt-0" : "contents"}>
              {concise && (
                <>
                  {wizardStep === 0 && <section className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Player basics</p>
                    {setupDraft && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[11px] text-zinc-400">First name</span>
                          <Input
                            className="h-8 text-xs"
                            value={setupDraft.firstName}
                            onChange={(event) => updateSetupDraft("firstName", event.target.value)}
                            maxLength={80}
                            autoComplete="given-name"
                            data-testid="input-setup-first-name"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-zinc-400">Last name</span>
                          <Input
                            className="h-8 text-xs"
                            value={setupDraft.lastName}
                            onChange={(event) => updateSetupDraft("lastName", event.target.value)}
                            maxLength={80}
                            autoComplete="family-name"
                            data-testid="input-setup-last-name"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-zinc-400">Where are you in basketball?</span>
                          <Select
                            value={setupDraft.currentSituation}
                            onValueChange={(value) => updateSetupDraft("currentSituation", value)}
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid="select-current-situation">
                              <SelectValue placeholder="Select your level" />
                            </SelectTrigger>
                            <SelectContent>
                              {PLAYER_SETUP_SITUATIONS.map((situation) => (
                                <SelectItem key={situation} value={situation}>{situation}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <FormField
                          control={form.control}
                          name="jerseyNumber"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[11px] text-zinc-400">Jersey #</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-8 text-xs"
                                  type="number"
                                  min={0}
                                  max={99}
                                  placeholder="0"
                                  data-testid="input-jersey-number"
                                  {...field}
                                  onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-zinc-400">Position(s)</p>
                      <div className="flex flex-wrap gap-1">
                        {BASKETBALL_POSITIONS.map((position) => {
                          const selected = form.watch("positions").includes(position);
                          return (
                            <button
                              key={position}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                const positions = form.getValues("positions");
                                const nextPositions = positions.includes(position)
                                  ? positions.filter((item) => item !== position)
                                  : [...positions, position];
                                form.setValue("positions", nextPositions, { shouldDirty: true });
                                updateSetupDraft("positions", nextPositions);
                              }}
                              className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                                selected
                                  ? "border-orange-400 bg-orange-500/15 text-orange-200"
                                  : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500"
                              }`}
                              data-testid={`button-setup-position-${position.toLowerCase()}`}
                            >
                              {position}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>}
                  {wizardStep === 1 && setupDraft && <section className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Skills & goals</p>
                    <fieldset className="space-y-2">
                      <legend className="text-[11px] font-medium text-zinc-400">Rank your skills</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {PLAYER_SETUP_RANK_FIELDS.map(({ key, label }) => (
                          <label key={key} className="min-w-0 space-y-1">
                            <span className="text-[10px] text-zinc-500">{label}</span>
                            <Select
                              value={setupDraft.skillRankings[key]}
                              onValueChange={(value) => updateSetupDraft("skillRankings", {
                                ...setupDraft.skillRankings,
                                [key]: value,
                              })}
                            >
                              <SelectTrigger className="h-8 text-xs" data-testid={`select-skill-${key}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PLAYER_SETUP_SKILLS.map((skill) => (
                                  <SelectItem
                                    key={skill}
                                    value={skill}
                                    disabled={Object.entries(setupDraft.skillRankings).some(([otherKey, otherValue]) =>
                                      otherKey !== key && otherValue === skill
                                    )}
                                  >
                                    {skill}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="min-w-0 space-y-1">
                        <span className="text-[11px] text-zinc-400">Main goal</span>
                        <Select
                          value={setupDraft.primaryGoal}
                          onValueChange={(value) => updateSetupDraft("primaryGoal", value)}
                        >
                          <SelectTrigger className="h-8 text-xs" data-testid="select-primary-goal">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAYER_SETUP_GOALS.map((goal) => (
                              <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="min-w-0 space-y-1">
                        <span className="text-[11px] text-zinc-400">Training days per</span>
                        <div className="flex gap-1">
                          <Input
                            className="h-8 min-w-0 text-xs"
                            type="number"
                            min={0}
                            max={setupDraft.trainingPeriodUnit === "week" ? 7 : 31}
                            step={1}
                            value={setupDraft.trainingDaysPerUnit}
                            onChange={(event) => updateSetupDraft("trainingDaysPerUnit", Number(event.target.value))}
                            data-testid="input-training-days"
                          />
                          <Select
                            value={setupDraft.trainingPeriodUnit}
                            onValueChange={(value: "week" | "month") => updateSetupDraft("trainingPeriodUnit", value)}
                          >
                            <SelectTrigger className="h-8 w-[88px] shrink-0 px-2 text-[10px]" data-testid="select-training-period">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="week">week</SelectItem>
                              <SelectItem value="month">month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </label>
                      <label className="min-w-0 space-y-1">
                        <span className="text-[11px] text-zinc-400">Years playing basketball</span>
                        <Input
                          className="h-8 text-xs"
                          type="text"
                          inputMode="numeric"
                          value={String(setupDraft.experienceYears)}
                          onChange={(event) => {
                            const value = event.target.value;
                            const numeric = Number(value);
                            updateSetupDraft(
                              "experienceYears",
                              value !== "" && Number.isFinite(numeric) ? numeric : value,
                            );
                          }}
                          data-testid="input-experience-years"
                        />
                      </label>
                      <label className="min-w-0 space-y-1">
                        <span className="text-[11px] text-zinc-400">Years playing competitively</span>
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={setupDraft.competitiveExperienceYears}
                          onChange={(event) => updateSetupDraft("competitiveExperienceYears", Number(event.target.value))}
                          data-testid="input-competitive-experience-years"
                        />
                      </label>
                    </div>
                  </section>}
                  {wizardStep === 2 && setupDraft && <section className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Team & pathway</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="teamName"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-zinc-400">Team name</FormLabel>
                            <FormControl>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Team name"
                                maxLength={120}
                                {...field}
                                onChange={(event) => {
                                  field.onChange(event);
                                  updateSetupDraft("teamName", event.target.value);
                                }}
                                data-testid="input-setup-team-name"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <label className="min-w-0 space-y-1">
                        <span className="text-[11px] text-zinc-400">Current team role</span>
                        <Select
                          value={setupDraft.teamRole}
                          onValueChange={(value) => updateSetupDraft("teamRole", value)}
                        >
                          <SelectTrigger className="h-8 text-xs" data-testid="select-team-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAYER_SETUP_TEAM_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <FormField
                        control={form.control}
                        name="aspiration"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-zinc-400">Basketball pathway</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs" data-testid="select-basketball-goal">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {BASKETBALL_ASPIRATIONS.map((goal) => (
                                  <SelectItem key={goal} value={goal}>{aspirationLabels[goal] || goal}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>}
                  {wizardStep === 4 && <section className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">About</p>
                    <FormField
                      control={form.control}
                      name="headline"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-zinc-400">Headline</FormLabel>
                          <FormControl>
                            <Input className="h-8 text-xs" placeholder="A quick introduction" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-zinc-400">Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={2}
                              className="min-h-[52px] resize-y text-xs"
                              placeholder="A few lines about your game and goals"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </section>}
                  {wizardStep === 5 && <section className="space-y-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
                        Card stats
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">Choose up to 3 to show on the back of your player card.</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PLAYER_CARD_CAREER_STAT_KEYS.map((key) => {
                        const selectedStats = form.watch("cardCareerStats") || [];
                        const selected = selectedStats.includes(key);
                        const atLimit = selectedStats.length >= 3;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={selected}
                            disabled={!selected && atLimit}
                            onClick={() => {
                              const current = form.getValues("cardCareerStats") || [];
                              const next = current.includes(key)
                                ? current.filter((stat) => stat !== key)
                                : current.length < 3
                                  ? [...current, key]
                                  : current;
                              form.setValue("cardCareerStats", next, { shouldDirty: true, shouldValidate: true });
                            }}
                            className={`rounded-md border px-2 py-1.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              selected
                                ? "border-orange-400 bg-orange-500/15 text-orange-200"
                                : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500"
                            }`}
                            data-testid={`button-card-stat-${key}`}
                          >
                            {cardCareerStatLabels[key]}
                          </button>
                        );
                      })}
                    </div>
                  </section>}
                </>
              )}

          {(!concise || wizardStep === 2) && <Card className={concise ? "contents" : undefined}>
            <CardHeader className={concise ? "px-0 pb-0 pt-0" : undefined}>
              <CardTitle className={`flex items-center gap-2 ${concise ? "text-xs" : "text-lg"}`}>
                <MapPin className={concise ? "h-4 w-4 text-orange-400" : "h-5 w-5"} />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className={concise ? "space-y-2 p-0" : "space-y-4"}>
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className={concise ? "space-y-1" : undefined}>
                    <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Country</FormLabel>
                    <Select onValueChange={v => { field.onChange(v); form.setValue("state", ""); }} value={field.value || "USA"}>
                      <FormControl>
                        <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-country">
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
              <div className={`grid grid-cols-2 ${concise ? "gap-2" : "gap-4"}`}>
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className={concise ? "space-y-1" : undefined}>
                      <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>City</FormLabel>
                      <FormControl>
                        <Input className={concise ? "h-8 text-xs" : undefined} placeholder="Your city" data-testid="input-city" {...field} />
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
                      <FormItem className={concise ? "space-y-1" : undefined}>
                        <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>
                          {countryVal === "USA" ? "State" : countryVal === "CAN" ? "Province" : "Region / Province"}
                        </FormLabel>
                        {countryVal === "USA" ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-state">
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
                              <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-province">
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
                            <Input className={concise ? "h-8 text-xs" : undefined} placeholder="Region / Province (optional)" data-testid="input-region" {...field} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>}

          {(!concise || wizardStep === 3) && <Card className={concise ? "contents" : undefined}>
            <CardHeader className={concise ? "px-0 pb-0 pt-0" : undefined}>
              <CardTitle className={`flex items-center gap-2 ${concise ? "text-xs" : "text-lg"}`}>
                <Ruler className={concise ? "h-4 w-4 text-orange-400" : "h-5 w-5"} />
                Physical Attributes
              </CardTitle>
            </CardHeader>
            <CardContent className={concise ? "space-y-2 p-0" : "space-y-4"}>
              <div className={`grid grid-cols-2 ${concise ? "gap-2" : "gap-4"}`}>
                <FormField
                  control={form.control}
                  name="heightFeet"
                  render={({ field }) => (
                    <FormItem className={concise ? "space-y-1" : undefined}>
                      <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Height (ft)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(parseInt(val) || 0)}
                        >
                          <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-height-feet">
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
                    <FormItem className={concise ? "space-y-1" : undefined}>
                      <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Height (in)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value !== undefined ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(parseInt(val))}
                        >
                          <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-height-inches">
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

              <div className={`grid grid-cols-2 ${concise ? "gap-2" : "gap-4"}`}>
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className={concise ? "space-y-1" : undefined}>
                      <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Weight (lbs)</FormLabel>
                      <FormControl>
                        <Input
                          className={concise ? "h-8 text-xs" : undefined}
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
                    <FormItem className={concise ? "space-y-1" : undefined}>
                      <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Wingspan</FormLabel>
                      <FormControl>
                        <Input
                          className={concise ? "h-8 text-xs" : undefined}
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
          </Card>}

          {(!concise || wizardStep === 3) && <Card className={concise ? "contents" : undefined}>
            <CardHeader className={concise ? "px-0 pb-0 pt-0" : undefined}>
              <CardTitle className={`flex items-center gap-2 ${concise ? "text-xs" : "text-lg"}`}>
                <GraduationCap className={concise ? "h-4 w-4 text-orange-400" : "h-5 w-5"} />
                Academics
              </CardTitle>
            </CardHeader>
            <CardContent className={concise ? "space-y-2 p-0" : "space-y-4"}>
              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem className={concise ? "space-y-1" : undefined}>
                    <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Grade / year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-grade-level">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADE_LEVELS.map((grade) => (
                          <SelectItem key={grade} value={grade}>{gradeLabels[grade] || grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem className={concise ? "space-y-1" : undefined}>
                    <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>{concise ? "School" : "School Name"}</FormLabel>
                    <FormControl>
                      <Input
                        className={concise ? "h-8 text-xs" : undefined}
                        placeholder="e.g., Lincoln High School"
                        data-testid="input-school-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className={`grid grid-cols-2 ${concise ? "gap-3" : "gap-4"}`}>
                <FormField
                  control={form.control}
                  name="gradYear"
                  render={({ field }) => (
                      <FormItem className={concise ? "space-y-1" : undefined}>
                        <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>Graduation Year</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => field.onChange(parseInt(val) || 0)}
                        >
                          <SelectTrigger className={concise ? "h-8 text-xs" : undefined} data-testid="select-grad-year">
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
                    <FormItem className={concise ? "space-y-1" : undefined}>
                      <FormLabel className={concise ? "text-[11px] text-zinc-400" : undefined}>GPA</FormLabel>
                      <FormControl>
                        <Input
                          className={concise ? "h-8 text-xs" : undefined}
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
          </Card>}
            </CardContent>
          </Card>

          {!concise && <Card>
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
          </Card>}

          {!concise && <Card>
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
          </Card>}

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

          {!concise && userSeasons.length > 0 && (
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

          {concise ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {wizardStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    disabled={saveMutation.isPending}
                    data-testid="button-profile-step-back"
                  >
                    Back
                  </Button>
                )}
              </div>
              <Button
                type={wizardStep === conciseProfileSteps.length - 1 ? "submit" : "button"}
                onClick={wizardStep < conciseProfileSteps.length - 1 ? () => setWizardStep(wizardStep + 1) : undefined}
                disabled={saveMutation.isPending || isCareerProfileLoading}
                className="bg-orange-500 font-bold text-white shadow-[0_0_18px_rgba(249,115,22,0.2)] hover:bg-orange-600"
                data-testid={wizardStep === conciseProfileSteps.length - 1 ? "button-save-profile" : "button-profile-step-next"}
              >
                {wizardStep === conciseProfileSteps.length - 1 ? (
                  <><Save className="mr-1 h-4 w-4" />{saveMutation.isPending ? "Saving..." : "Save"}</>
                ) : "Next"}
              </Button>
            </div>
          ) : (
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
          )}
        </form>
      </Form>
    </div>
  );
}

export default function PlayerProfilePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search.replace(/^\?/, ""));
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = ["/hub", "/profile", "/profile-hub"].includes(requestedReturnTo ?? "")
    ? requestedReturnTo!
    : "/hub";

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      <header className="mb-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setLocation(returnTo)}
          className="-ml-2 mb-2 gap-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          data-testid="button-back-edit-profile"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">
          Edit Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your player details and profile card in one six-step flow.
        </p>
      </header>
      <PlayerProfileSection concise onSaved={() => setLocation(returnTo)} />
    </div>
  );
}
