import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, clearAuthToken } from "@/lib/queryClient";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  Bell, BellOff, ChevronLeft, Loader2, LogOut, Settings, ShieldAlert, Trash2,
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
    <div className="rounded-xl border border-white/[0.07] bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            {isSubscribed
              ? <Bell className="h-4 w-4 text-orange-300" />
              : <BellOff className="h-4 w-4 text-zinc-500" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100">Push Notifications</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {enabled ? "You're receiving push notifications" : "All notification delivery is paused"}
            </p>
          </div>
        </div>
        <Button
          variant={enabled ? "outline" : "default"}
          size="sm"
          onClick={() => toggle(!enabled)}
          disabled={isLoading || updatePreferences.isPending}
          className={enabled
            ? "shrink-0 border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-orange-400/40 hover:bg-zinc-800 hover:text-white"
            : "shrink-0 bg-orange-500 text-zinc-950 hover:bg-orange-400"}
          data-testid="button-push-notifications"
        >
          {isLoading || updatePreferences.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : enabled ? "Disable" : "Enable"}
        </Button>
      </div>
      {error && (
        <p className="mt-3 text-xs leading-relaxed text-red-300" role="alert">
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

  if (isLoading || !preferences) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-500">
        Loading notification categories…
      </div>
    );
  }

  const group = (title: string, items: readonly (readonly [string, string])[]) => (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200/70">{title}</p>
      {items.map(([key, label]) => (
        <div key={key} className="flex min-h-12 items-center justify-between gap-4 border-b border-white/[0.06] px-1 py-3 last:border-0">
          <span className="text-sm text-zinc-300">{label}</span>
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
    <div className="mt-5 space-y-6">
      {group("Player notifications", PLAYER_NOTIFICATION_GROUPS)}
      {isAdmin && group("Admin notifications", ADMIN_NOTIFICATION_GROUPS)}
    </div>
  );
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: userProfile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="shrink-0 gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
          <Settings className="h-5 w-5 text-orange-300" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200/70">PLAYR1 · ACCOUNT</p>
          <h1 className="mt-0.5 text-xl font-bold text-white">Settings</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Manage notifications and account access.</p>
        </div>
      </header>

      <Card
        className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-100 shadow-none"
        data-testid="card-settings-notifications"
      >
        <CardHeader className="border-b border-zinc-800/80 px-4 pb-4 pt-5 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
              <Bell className="h-4 w-4 text-orange-300" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">Notifications</CardTitle>
              <CardDescription className="mt-1 text-xs text-zinc-500">
                Control push delivery and the updates you receive.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <PushNotificationToggle />
          <NotificationCategorySettings isAdmin={Boolean(userProfile?.isAdmin)} />
        </CardContent>
      </Card>

      <Card
        className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-100 shadow-none"
        data-testid="card-settings-account"
      >
        <CardHeader className="border-b border-zinc-800/80 px-4 pb-4 pt-5 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
              <LogOut className="h-4 w-4 text-orange-300" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">Account</CardTitle>
              <CardDescription className="mt-1 text-xs text-zinc-500">
                Manage access to your PLAYR1 account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Sign Out</p>
              <p className="mt-0.5 text-xs text-zinc-500">Sign out of your PLAYR1 account</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-orange-400/40 hover:bg-zinc-800 hover:text-white"
              data-testid="button-signout"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <Separator className="bg-zinc-800/80" />

          <div className="flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <ShieldAlert className="h-4 w-4 text-red-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-200">Delete Account</p>
                <p className="mt-0.5 text-xs text-zinc-500">Permanently delete your account and all data</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0 gap-2 border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-zinc-400">
                    <span className="block">
                      This will permanently delete your PLAYR1 account including all training logs, sessions, videos, achievements, and profile data. This action cannot be undone.
                    </span>
                    <span className="block">Type <strong className="text-zinc-100">DELETE</strong> below to confirm.</span>
                    <Input
                      className="mt-2 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
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
                    className="bg-red-600 text-white hover:bg-red-500"
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

    </main>
  );
}
