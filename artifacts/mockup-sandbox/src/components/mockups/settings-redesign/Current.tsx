import { useState } from "react";
import { Bell, BellOff, ChevronLeft, ChevronRight, LogOut, Settings, Shield, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import "./_group.css";

const playerGroups = [
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

export function Current() {
  const [enabled, setEnabled] = useState(true);
  const [categories, setCategories] = useState<Record<string, boolean>>({});
  const [deleteText, setDeleteText] = useState("");

  return (
    <div className="dark min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <main className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />Back
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Settings className="h-5 w-5" />Settings
            </h1>
            <p className="text-sm text-muted-foreground">Privacy, family controls, and account</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />Family &amp; Privacy
            </CardTitle>
            <CardDescription>Age assurance and parental oversight controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Age Assurance</p>
                <Badge variant="outline" className="text-xs">Adult Account</Badge>
              </div>
              <p className="text-sm text-muted-foreground">PLAYR1 collects birth year during onboarding to provide age-appropriate parental oversight for minor users.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Parent Dashboard</p>
                <p className="text-sm text-muted-foreground">View linked children's activity</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1">Open <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" />Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">{enabled ? "You're receiving push notifications" : "All notification delivery is paused"}</p>
                  </div>
                </div>
                <Button variant={enabled ? "outline" : "default"} size="sm" onClick={() => setEnabled(!enabled)}>{enabled ? "Disable" : "Enable"}</Button>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Player notifications</p>
                {playerGroups.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <span className="text-sm">{label}</span>
                    <Switch checked={categories[key] !== false} onCheckedChange={(checked) => setCategories((state) => ({ ...state, [key]: checked }))} aria-label={label} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><LogOut className="h-4 w-4" />Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Sign Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your PLAYR1 account</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2"><LogOut className="h-4 w-4" />Sign Out</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="gap-2"><Trash2 className="h-4 w-4" />Delete</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">This will permanently delete your PLAYR1 account including all training logs, sessions, videos, achievements, and profile data. This action cannot be undone.</span>
                      <span className="block">Type <strong>DELETE</strong> below to confirm.</span>
                      <Input placeholder="Type DELETE to confirm" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteText("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={deleteText !== "DELETE"}>Delete Account</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}