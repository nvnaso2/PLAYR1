import "./_group.css";
import { BarChart3, Check, ChevronRight, Crown, MapPin, Settings, Settings2, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function PlanCard() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-none">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
              <Crown className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200/70">PLAYR1 training</p>
              <h2 className="text-base font-bold text-white">Pro vs. Free</h2>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Current plan</p>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <Badge className="border border-zinc-700 bg-zinc-800 text-zinc-200">Free</Badge>
              <Button size="sm" className="h-7 bg-orange-500 px-2.5 text-[10px] font-bold text-black hover:bg-orange-400">Upgrade</Button>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">In-person training</p>
            <p className="mt-1 text-2xl font-black leading-none text-zinc-100">$50–$100</p>
            <p className="mt-1 text-[10px] text-zinc-500">per hour</p>
          </div>
          <div className="rounded-xl border border-orange-300/20 bg-orange-400/[0.08] p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-orange-200/70">PLAYR1 Pro</p>
            <p className="mt-1 text-2xl font-black leading-none text-white">$9.99</p>
            <p className="mt-1 text-[10px] text-orange-100/60">for a month</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
          A month of structured workouts and courses plus personalized drills for less than one in-person hour of training.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-zinc-500/60 bg-zinc-800/60 p-3">
            <p className="mb-2 text-xs font-bold text-zinc-200">Free</p>
            <ul className="space-y-1.5 text-[10px] leading-tight text-zinc-400">
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Daily drills + full library access</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />3 Coach P questions / month</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Workouts + game stat tracking</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-zinc-500" />Profile + dashboard analytics</li>
            </ul>
          </div>
          <div className="rounded-xl border border-orange-300/15 bg-black/20 p-3">
            <p className="mb-2 text-xs font-bold text-orange-100">Pro</p>
            <ul className="space-y-1.5 text-[10px] leading-tight text-zinc-300">
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Unlimited Coach P</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Full programs + courses</li>
              <li className="flex gap-1.5"><Check className="h-3 w-3 shrink-0 text-emerald-400" />Full workout library</li>
            </ul>
          </div>
        </div>
        <Button variant="outline" className="mt-3 min-h-10 w-full border-orange-300/25 bg-zinc-950 text-[11px] text-orange-100">
          Choose annual · $99.99/year
        </Button>
        <p className="mt-2 text-center text-[10px] text-zinc-600">Cancel anytime.</p>
      </CardContent>
    </Card>
  );
}

function CareerSection() {
  return (
    <section aria-labelledby="career-heading" className="space-y-2">
      <p id="career-heading" className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">Career</p>
      <Card className="border-zinc-800/60 bg-zinc-900/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
            <BarChart3 className="h-5 w-5 text-orange-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">My Career</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Stats, trophies, training history and milestones</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
        </CardContent>
      </Card>
      <Card className="border-zinc-800/60 bg-zinc-900/40">
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-14 w-14 border-2 border-zinc-700">
            <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80" alt="Jordan Parker" />
            <AvatarFallback className="bg-orange-500/20 text-lg font-bold text-orange-400">JP</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold leading-tight">Jordan Parker</h2>
            <Badge variant="secondary" className="mt-1 text-xs">Sharpshooter</Badge>
            <p className="mt-1 text-xs text-zinc-500">My Profile · View &amp; customize</p>
          </div>
          <UserCircle className="h-4 w-4 shrink-0 text-zinc-600" />
        </CardContent>
      </Card>
    </section>
  );
}

export function Updated() {
  return (
    <div className="dark min-h-screen bg-zinc-950 px-4 py-5 text-white sm:px-6">
      <main className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">Profile</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" className="h-9 bg-orange-500 px-3 text-xs font-bold text-zinc-950 hover:bg-orange-400">Edit Profile</Button>
            <Button variant="ghost" size="sm" className="h-9 gap-1 px-2 text-xs text-zinc-300 sm:gap-1.5 sm:px-2.5">
              <Settings2 className="h-3.5 w-3.5 shrink-0" />Choose stats
            </Button>
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>
        <Card className="overflow-hidden border-zinc-800/60 bg-zinc-900/40">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[80px_minmax(0,1fr)_minmax(190px,0.68fr)] sm:gap-x-4 sm:gap-y-0">
              <Avatar className="row-span-2 h-16 w-16 shrink-0 border-2 border-orange-500 ring-2 ring-orange-500/80 shadow-[0_0_16px_rgba(249,115,22,0.38)] sm:h-20 sm:w-20">
                <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80" alt="Jordan Parker profile photo" />
                <AvatarFallback className="bg-orange-500/20 text-lg font-bold text-orange-300">JP</AvatarFallback>
              </Avatar>
              <div className="min-w-0 pt-1">
                <h2 className="truncate text-lg font-bold leading-tight text-white">Jordan Parker</h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                  <span className="truncate">Atlanta, GA</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-[10px] text-zinc-200 sm:text-xs">Jersey #11</Badge>
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-[10px] text-zinc-200 sm:text-xs">PG · SG</Badge>
                </div>
              </div>
              <div className="min-w-0 sm:col-start-3 sm:row-start-1 sm:pt-1">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px] sm:tracking-[0.16em]">Player stats</p>
                <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-zinc-800 bg-black/25">
                  <div className="px-1 py-2 text-center sm:px-2 sm:py-2.5">
                    <p className="truncate text-sm font-black leading-tight text-white sm:text-base">18.6</p>
                    <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-zinc-500">PPG</p>
                  </div>
                  <div className="border-l border-zinc-800 px-1 py-2 text-center sm:px-2 sm:py-2.5">
                    <p className="truncate text-sm font-black leading-tight text-white sm:text-base">6′2″</p>
                    <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-zinc-500">Height</p>
                  </div>
                  <div className="border-l border-zinc-800 px-1 py-2 text-center sm:px-2 sm:py-2.5">
                    <p className="truncate text-sm font-black leading-tight text-white sm:text-base">185 lb</p>
                    <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-zinc-500">Weight</p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 min-w-0 space-y-1.5 pl-[76px] pt-1 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:pl-0">
                <p className="text-xs font-semibold leading-snug text-zinc-100 sm:text-sm">Crafting winning plays, one rep at a time.</p>
                <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  I love creating shots for my teammates and bringing energy on both ends of the court.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <PlanCard />
        <CareerSection />
      </main>
    </div>
  );
}