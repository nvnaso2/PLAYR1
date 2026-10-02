import { useState } from "react";
import { Bell, BellOff, Check, ChevronLeft, LogOut, Settings2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function Updated() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [categories, setCategories] = useState<Record<string, boolean>>({});
  const [deleteText, setDeleteText] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const toggleCategory = (key: string, value: boolean) => {
    setCategories((state) => ({ ...state, [key]: value }));
  };

  return (
    <div className="dark min-h-screen bg-zinc-950 px-4 py-5 text-zinc-100 sm:px-6 sm:py-8">
      <main className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            <Settings2 className="h-5 w-5 text-orange-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200/70">PLAYR1 · ACCOUNT</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">Settings</h1>
            <p className="mt-0.5 text-xs text-zinc-500">Manage notifications and account access.</p>
          </div>
        </header>

        <Card className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#101212]/95 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-start gap-3.5">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${pushEnabled ? "border-orange-300/15 bg-orange-400/10 text-orange-300" : "border-zinc-700 bg-zinc-800/70 text-zinc-500"}`}>
                {pushEnabled ? <Bell className="h-[18px] w-[18px]" /> : <BellOff className="h-[18px] w-[18px]" />}
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">01 / Delivery</p>
                <h2 className="mt-1 font-['Bebas_Neue'] text-[25px] leading-none tracking-[0.04em] text-zinc-100">Notifications</h2>
                <p className="mt-1.5 text-xs text-zinc-500">
                  {pushEnabled ? "You're receiving push notifications" : "All notification delivery is paused"}
                </p>
              </div>
            </div>
            <Button
              variant={pushEnabled ? "outline" : "default"}
              size="sm"
              onClick={() => setPushEnabled((enabled) => !enabled)}
              className={pushEnabled
                ? "h-9 min-w-[92px] rounded-lg border-zinc-700 bg-transparent text-xs font-semibold text-zinc-200 hover:border-orange-300/40 hover:bg-orange-300/[0.06] hover:text-orange-100"
                : "h-9 min-w-[92px] rounded-lg bg-orange-500 text-xs font-bold text-black hover:bg-orange-400"}
              aria-label={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
            >
              {pushEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          <CardContent className="p-5 sm:px-6 sm:py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">Player notifications</p>
                <p className="mt-1 text-[11px] text-zinc-500">Choose the updates you want to receive.</p>
              </div>
            </div>

            <div className="grid gap-x-8 md:grid-cols-2">
              {playerGroups.map(([key, label], index) => (
                <div
                  key={key}
                  className={`flex min-h-[48px] items-center justify-between gap-3 border-t border-white/[0.055] py-2.5 ${index === playerGroups.length - 1 ? "md:col-span-2 md:max-w-[calc(50%-16px)]" : ""}`}
                >
                  <span className="pr-2 text-[12px] leading-snug text-zinc-300">{label}</span>
                  <Switch
                    checked={categories[key] !== false}
                    onCheckedChange={(checked) => toggleCategory(key, checked)}
                    disabled={!pushEnabled}
                    aria-label={label}
                    className="shrink-0 data-[state=checked]:bg-orange-500"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#101212]/95 shadow-none">
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/70 bg-zinc-800/50 text-zinc-400">
              <LogOut className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">02 / Access</p>
              <h2 className="mt-0.5 font-['Bebas_Neue'] text-[22px] leading-none tracking-[0.04em] text-zinc-100">Account</h2>
            </div>
          </div>
          <CardContent className="space-y-4 p-5 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">Sign Out</p>
                <p className="mt-1 text-[11px] text-zinc-500">Sign out of your PLAYR1 account</p>
                {signedOut && <p role="status" className="mt-2 text-[10px] font-medium text-orange-300">Signed out for this preview.</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSignedOut(true)}
                disabled={signedOut}
                className="h-9 gap-2 rounded-lg border-zinc-700 bg-transparent px-3.5 text-xs text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/70 disabled:opacity-60"
              >
                {signedOut ? <Check className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                {signedOut ? "Signed out" : "Sign Out"}
              </Button>
            </div>

            <Separator className="bg-white/[0.07]" />

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/15 bg-red-400/[0.06] text-red-300/80">
                  <Trash2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-red-200/90">Delete Account</p>
                  <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-zinc-500">Permanently delete your account and all data</p>
                  {deleted && <p role="status" className="mt-2 text-[10px] font-medium text-red-300">Deletion confirmed in this preview.</p>}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleted} className="h-9 gap-2 rounded-lg px-3.5 text-xs font-semibold">
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-zinc-800 bg-[#111313] text-zinc-100 sm:rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-['Bebas_Neue'] text-2xl tracking-wide">Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 text-zinc-400">
                      <span className="block leading-relaxed">
                        This will permanently delete your PLAYR1 account including all training logs, sessions, videos, achievements, and profile data. This action cannot be undone.
                      </span>
                      <span className="block">Type <strong className="font-mono text-zinc-100">DELETE</strong> below to confirm.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    placeholder="Type DELETE to confirm"
                    value={deleteText}
                    onChange={(event) => setDeleteText(event.target.value)}
                    className="border-zinc-700 bg-black/30 font-mono text-sm tracking-wide placeholder:font-sans placeholder:tracking-normal"
                    aria-label="Type DELETE to confirm account deletion"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteText("")} className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (deleteText === "DELETE") setDeleted(true);
                      }}
                      disabled={deleteText !== "DELETE"}
                      className="bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Delete Account
                    </AlertDialogAction>
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