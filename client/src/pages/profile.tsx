import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { queryClient, apiRequest, getObjectUrl, clearAuthToken } from "@/lib/queryClient";
import { 
  User, 
  MapPin, 
  Calendar,
  Award,
  Settings,
  LogOut,
  Save,
  Camera,
  Bell,
  BellOff,
  Shield,
  Users,
  Copy,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import type { UserProfile } from "@shared/schema";

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  age: z.number().min(5, "Age must be at least 5").max(100).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().max(10).optional().or(z.literal("")),
  country: z.string().default("USA"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast({ title: "Notifications disabled" });
    } else {
      const ok = await subscribe();
      if (ok) {
        toast({ title: "Notifications enabled", description: "You'll receive push notifications for important updates." });
      } else {
        toast({ title: "Permission denied", description: "Please allow notifications in your browser settings.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div>
        <p className="font-medium">Push Notifications</p>
        <p className="text-sm text-muted-foreground">
          {isSubscribed ? "You're receiving push notifications" : "Get notified about sessions, messages, and more"}
        </p>
      </div>
      <Button
        variant={isSubscribed ? "outline" : "default"}
        className="gap-2"
        onClick={handleToggle}
        disabled={isLoading}
        data-testid="button-push-notifications"
      >
        {isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {isLoading ? "..." : isSubscribed ? "Disable" : "Enable"}
      </Button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/profile'],
  });

  const { data: careerProfile } = useQuery<any>({
    queryKey: ['/api/career'],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      age: undefined,
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
      skillLevel: "beginner",
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
    } else if (user) {
      form.reset({
        displayName: user.firstName || "",
        email: "",
        age: undefined,
        city: "",
        state: "",
        zipCode: "",
        country: "USA",
        skillLevel: "beginner",
      });
    }
  }, [profile, user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/location'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/auth/me");
    },
    onSuccess: () => {
      clearAuthToken();
      queryClient.clear();
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      setLocation("/auth");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete account. Please try again.", variant: "destructive" });
    },
  });

  const isMinor = careerProfile?.isMinor === true;
  const parentInviteCode = careerProfile?.parentInviteCode;

  const copyInviteCode = () => {
    if (parentInviteCode) {
      navigator.clipboard.writeText(parentInviteCode);
      toast({ title: "Copied!", description: "Parent invite code copied to clipboard." });
    }
  };

  const [uploading, setUploading] = useState(false);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.firstName) return user.firstName[0];
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  // Convert any image (including HEIC from iOS camera) to JPEG via canvas
  const convertToJpeg = (file: File): Promise<{ blob: Blob; name: string; type: string }> => {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(objectUrl); resolve({ blob: file, name: file.name || "photo.jpg", type: "image/jpeg" }); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          resolve({ blob: blob ?? file, name: "photo.jpg", type: "image/jpeg" });
        }, "image/jpeg", 0.88);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ blob: file, name: file.name || "photo.jpg", type: "image/jpeg" });
      };
      img.src = objectUrl;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
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
      // Convert to JPEG (handles HEIC from iOS cameras and normalises all formats)
      const { blob, name, type } = await convertToJpeg(file);

      const urlRes = await apiRequest("POST", "/api/user/uploads/photo-url", {
        name,
        size: blob.size,
        contentType: type,
      });
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": type },
        body: blob,
      });

      await apiRequest("PUT", "/api/profile", { ...form.getValues(), profilePhotoUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: "Photo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const profilePhotoSrc = profile?.profilePhotoUrl
    ? getObjectUrl(profile.profilePhotoUrl)
    : (user?.profileImageUrl ? getObjectUrl(user.profileImageUrl) : undefined);

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <div className="space-y-4 mt-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">PLAYR1 Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your account and training preferences
        </p>
      </div>

      <Card>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePhotoSrc} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <label
                className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
                data-testid="button-upload-profile-photo"
              >
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
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
          </div>
          <CardTitle data-testid="text-profile-name">
            {user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user?.firstName || user?.email || "Player"
            }
          </CardTitle>
          <CardDescription>{user?.email}</CardDescription>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant="secondary">
              <Award className="w-3 h-3 mr-1" />
              {profile?.skillLevel || "beginner"}
            </Badge>
            {profile?.city && profile?.state && (
              <Badge variant="outline">
                <MapPin className="w-3 h-3 mr-1" />
                {profile.city}, {profile.state}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Separator className="mb-6" />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your name"
                        {...field}
                        data-testid="input-display-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="your@email.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>Used for session notifications and updates</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Your age"
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-age"
                        />
                      </FormControl>
                      <FormDescription>
                        Used for benchmarking comparisons
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skillLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-skill-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
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
                  )}
                />
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your city"
                            {...field}
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 30009"
                            {...field}
                            data-testid="input-zip-code"
                          />
                        </FormControl>
                        <FormDescription>Used for finding nearby teams, leagues, and trainers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} disabled data-testid="input-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="submit" 
                  className="gap-2"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  <Save className="w-4 h-4" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card data-testid="card-family-privacy">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Family &amp; Privacy
          </CardTitle>
          <CardDescription>
            Age assurance and parental oversight controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <p className="font-medium text-sm">Age Assurance</p>
              {isMinor ? (
                <Badge variant="secondary" className="text-xs">Minor Account</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Adult Account</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isMinor
                ? "This account is registered as a minor (under 18). A parent or guardian can link their account to monitor training activity, sessions, and communications."
                : "Your account is registered as an adult. PLAYR1 collects birth year during onboarding to provide age-appropriate parental oversight for minor users."}
            </p>
          </div>

          {isMinor && (
            <div className="p-4 rounded-lg border space-y-3" data-testid="section-parental-controls">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="font-medium text-sm">Parent / Guardian Access</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this invite code with a parent or guardian. They can create a PLAYR1 account and use this code to link to your profile for read-only oversight.
              </p>
              {parentInviteCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm tracking-widest" data-testid="text-parent-invite-code">
                    {parentInviteCode}
                  </div>
                  <Button size="icon" variant="outline" onClick={copyInviteCode} data-testid="button-copy-invite-code">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Complete your player profile to generate a parent invite code.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Parents access your training logs, sessions, messages, and trainer connections in read-only mode.
              </p>
            </div>
          )}

          {!isMinor && (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium text-sm">Parent Dashboard</p>
                <p className="text-sm text-muted-foreground">View linked children's activity</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setLocation("/parent")} data-testid="button-parent-dashboard">
                Open <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PushNotificationToggle />
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your PLAYR1 account
              </p>
            </div>
            <Button variant="outline" className="gap-2" data-testid="button-signout" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" data-testid="button-delete-account">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <span className="block">
                      This will permanently delete your PLAYR1 account including all training logs, sessions, videos, achievements, and profile data. This action cannot be undone.
                    </span>
                    <span className="block mt-3">
                      Type <strong>DELETE</strong> below to confirm.
                    </span>
                    <Input
                      className="mt-2"
                      placeholder="Type DELETE to confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      data-testid="input-delete-confirm"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText("")} data-testid="button-cancel-delete">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                    onClick={() => deleteAccountMutation.mutate()}
                    data-testid="button-confirm-delete"
                  >
                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
