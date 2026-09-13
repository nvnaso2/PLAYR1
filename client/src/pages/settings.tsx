import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, clearAuthToken } from "@/lib/queryClient";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  Shield, Users, Mail, Send, Copy, LogOut, Trash2, Bell, BellOff,
  ChevronLeft, Loader2, Settings, ChevronRight,
} from "lucide-react";

function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();
  const { data: preferences } = useQuery<any>({ queryKey: ["/api/notifications/preferences"] });
  const updatePreferences = useMutation({
    mutationFn: async (pushEnabled: boolean) => apiRequest("PATCH", "/api/notifications/preferences", { pushEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] }),
  });
  if (!isSupported) return null;
  const enabled = preferences?.pushEnabled ?? isSubscribed;
  const toggle = async (next: boolean) => {
    if (next) {
      const subscribed = await subscribe();
      if (subscribed) {
        updatePreferences.mutate(true);
      } else if (error) {
        toast({ title: "Notifications could not be enabled", description: error, variant: "destructive" });
      }
    } else {
      await unsubscribe();
      updatePreferences.mutate(false);
    }
  };
  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
        {isSubscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="font-medium text-sm">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
          {enabled ? "You're receiving push notifications" : "All notification delivery is paused"}
          </p>
        </div>
        </div>
        <Button
          variant={enabled ? "outline" : "default"}
          size="sm"
          onClick={() => toggle(!enabled)}
          disabled={isLoading || updatePreferences.isPending}
          data-testid="button-push-notifications"
        >
          {isLoading || updatePreferences.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : enabled ? "Disable" : "Enable"}
        </Button>
      </div>
      {error && (
        <p className="mt-3 text-xs leading-relaxed text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const PLAYER_NOTIFICATION_GROUPS = [
  ["connections", "Friend and connection invites"],
  ["challengeInvites", "Challenge invitations"],
  ["challengeUpdates", "Challenge updates"],
  ["messages", "Direct and group messages"],
  ["support", "PLAYR1 support messages"],
  ["drills", "Workouts and drills sent by PLAYR1"],
  ["programs", "New published programs"],
  ["friendActivity", "Friend community activity"],
  ["weeklySummary", "Weekly completed-work summary"],
  ["streakReminders", "Streak continuation reminders"],
  ["trainingSuggestions", "Suggested drill and workout reminders"],
] as const;

const ADMIN_NOTIFICATION_GROUPS = [
  ["adminInbox", "Player inbox messages"],
  ["adminCustomWorkouts", "Custom workout requests"],
  ["adminCommunity", "Community 3-pointer activity"],
  ["adminFeedback", "New feedback posts"],
  ["adminWeeklyDigest", "Weekly growth, usage, subscription, and revenue summary"],
] as const;

function NotificationCategorySettings({ isAdmin }: { isAdmin: boolean }) {
  const { data: preferences, isLoading } = useQuery<any>({ queryKey: ["/api/notifications/preferences"] });
  const updateCategory = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) =>
      apiRequest("PATCH", "/api/notifications/preferences", { categories: { [key]: value } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] }),
  });

  if (isLoading || !preferences) return <div className="text-sm text-muted-foreground p-4">Loading notification categories…</div>;

  const group = (title: string, items: readonly (readonly [string, string])[]) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span className="text-sm">{label}</span>
          <Switch
            checked={preferences.categories?.[key] !== false}
            onCheckedChange={(value) => updateCategory.mutate({ key, value })}
            disabled={!preferences.pushEnabled || updateCategory.isPending}
            aria-label={label}
            data-testid={`switch-notification-${key}`}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 mt-4">
      {group("Player notifications", PLAYER_NOTIFICATION_GROUPS)}
      {isAdmin && group("Admin notifications", ADMIN_NOTIFICATION_GROUPS)}
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  const { data: careerProfile } = useQuery<any>({ queryKey: ["/api/career"] });
  const isMinor = careerProfile?.isMinor === true;
  const parentInviteCode = careerProfile?.parentInviteCode;

  const sendInviteMutation = useMutation({
    mutationFn: async (parentEmail: string) => apiRequest("POST", "/api/parent/send-invite", { parentEmail }),
    onSuccess: () => { setInviteSent(true); queryClient.invalidateQueries({ queryKey: ["/api/career"] }); },
    onError: () => toast({ title: "Failed to send invite", variant: "destructive" }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", "/api/auth/me"),
    onSuccess: () => {
      clearAuthToken();
      queryClient.clear();
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      setLocation("/auth");
    },
    onError: () => toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" }),
  });

  const copyInviteCode = () => {
    if (parentInviteCode) {
      navigator.clipboard.writeText(parentInviteCode);
      toast({ title: "Copied!", description: "Parent invite code copied to clipboard." });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">Privacy, family controls, and account</p>
        </div>
      </div>

      <Card data-testid="card-family-privacy">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Family &amp; Privacy
          </CardTitle>
          <CardDescription>Age assurance and parental oversight controls</CardDescription>
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
                ? "Your account is registered as a minor (under 18). You can invite a parent or guardian to follow your training in read-only mode."
                : "Your account is registered as an adult. PLAYR1 collects birth year during onboarding to provide age-appropriate parental oversight for minor users."}
            </p>
          </div>

          {isMinor && (
            <div className="p-4 rounded-lg border space-y-4" data-testid="section-parental-controls">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Parent / Guardian Access</p>
                </div>
                <Button
                  size="sm" variant="outline" className="gap-1.5"
                  onClick={() => { setInviteSent(false); setInviteEmail(""); setInviteDialogOpen(true); }}
                  data-testid="button-invite-parent"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Invite Parent
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Send your parent or guardian an email invite. They'll get a link to create a simple parent account and connect to your profile automatically.
              </p>
              {parentInviteCode && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Manual invite code (share directly if needed)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm tracking-widest" data-testid="text-parent-invite-code">
                      {parentInviteCode}
                    </div>
                    <Button size="icon" variant="outline" onClick={copyInviteCode} data-testid="button-copy-invite-code">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
          <NotificationCategorySettings isAdmin={Boolean(userProfile?.isAdmin)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your PLAYR1 account</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-signout" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <p className="font-medium text-destructive text-sm">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
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
                    <span className="block mt-3">Type <strong>DELETE</strong> below to confirm.</span>
                    <Input
                      className="mt-2"
                      placeholder="Type DELETE to confirm"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      data-testid="input-delete-confirm"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText("")} data-testid="button-cancel-delete">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

      <Dialog open={inviteDialogOpen} onOpenChange={open => { setInviteDialogOpen(open); if (!open) setInviteSent(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a Parent or Guardian</DialogTitle>
            <DialogDescription>
              We'll send them an email with a private link to create a parent account and connect to your profile.
            </DialogDescription>
          </DialogHeader>
          {inviteSent ? (
            <div className="py-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Send className="w-5 h-5 text-green-500" />
              </div>
              <p className="font-medium">Invite sent!</p>
              <p className="text-sm text-muted-foreground">They'll receive an email shortly with a link to set up their parent account.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="invite-email" className="text-sm font-medium">Parent / Guardian Email</Label>
                  <Input
                    id="invite-email" type="email" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="parent@example.com" className="mt-1.5"
                    data-testid="input-invite-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
                      toast({ title: "Please enter a valid email address", variant: "destructive" });
                      return;
                    }
                    sendInviteMutation.mutate(inviteEmail.trim());
                  }}
                  disabled={sendInviteMutation.isPending}
                  data-testid="button-send-invite"
                >
                  {sendInviteMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Send Invite</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
