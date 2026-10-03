import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Crown, MapPin, Settings, Settings2 } from "lucide-react";
import type { ProfileDisplayStatKey } from "@shared/schema";
import { COUNTRIES, PROFILE_DISPLAY_STAT_KEYS } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getObjectUrl, queryClient } from "@/lib/queryClient";

type ProfileStat = {
  key: ProfileDisplayStatKey;
  label: string;
  value: string;
};

type ProfileSummaryCardProps = {
  user: any;
  userProfile: any;
  playerProfile: any;
  career: any;
  careerStats: any;
  isLoading: boolean;
  onEditProfile: () => void;
  onOpenPro: () => void;
  onSettings: () => void;
};

const STAT_GROUPS: { label: string; keys: ProfileDisplayStatKey[] }[] = [
  { label: "Game stats", keys: ["ppg", "rpg", "apg", "spg", "bpg", "games", "record"] },
  { label: "Measurements", keys: ["height", "weight", "wingspan"] },
  {
    label: "Skill ratings",
    keys: ["shooting", "ballHandling", "passing", "finishing", "defense", "basketballIq", "athletics"],
  },
  { label: "Academic", keys: ["gradYear", "gpa"] },
];

const RECOMMENDED_STAT_ORDER: ProfileDisplayStatKey[] = [
  "ppg",
  "height",
  "weight",
  "rpg",
  "apg",
  "spg",
  "bpg",
  "wingspan",
  "games",
  "record",
  "shooting",
  "ballHandling",
  "passing",
  "finishing",
  "defense",
  "basketballIq",
  "athletics",
  "gradYear",
  "gpa",
];

function finitePositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function buildAvailableStats(
  playerProfile: any,
  career: any,
  careerStats: any,
): ProfileStat[] {
  const available = new Map<ProfileDisplayStatKey, ProfileStat>();
  const gamesPlayed = finitePositiveNumber(careerStats?.totalGames);

  if (gamesPlayed) {
    const gameStatEntries: Array<[ProfileDisplayStatKey, string, unknown]> = [
      ["ppg", "PPG", careerStats.avgPoints],
      ["rpg", "RPG", careerStats.avgRebounds],
      ["apg", "APG", careerStats.avgAssists],
      ["spg", "SPG", careerStats.avgSteals],
      ["bpg", "BPG", careerStats.avgBlocks],
    ];
    for (const [key, label, rawValue] of gameStatEntries) {
      const value = Number(rawValue);
      if (Number.isFinite(value)) available.set(key, { key, label, value: value.toFixed(1) });
    }

    available.set("games", { key: "games", label: "GP", value: String(gamesPlayed) });
    const wins = Number(careerStats?.wins ?? 0);
    const losses = Number(careerStats?.losses ?? 0);
    if (wins + losses > 0) {
      available.set("record", { key: "record", label: "Record", value: `${wins}–${losses}` });
    }
  }

  const feet = finitePositiveNumber(playerProfile?.heightFeet);
  const inches = finitePositiveNumber(playerProfile?.heightInches) ?? 0;
  if (feet) available.set("height", { key: "height", label: "Height", value: `${feet}'${inches}"` });

  const weight = finitePositiveNumber(playerProfile?.weight);
  if (weight) available.set("weight", { key: "weight", label: "Weight", value: `${weight} lb` });

  const wingspan = typeof playerProfile?.wingspan === "string" ? playerProfile.wingspan.trim() : "";
  if (wingspan) available.set("wingspan", { key: "wingspan", label: "Wingspan", value: wingspan });

  const skillEntries: Array<[ProfileDisplayStatKey, string, unknown]> = [
    ["shooting", "Shot", career?.skillShooting],
    ["ballHandling", "Handle", career?.skillBallHandling],
    ["passing", "Passing", career?.skillPassing],
    ["finishing", "Finishing", career?.skillFinishing],
    ["defense", "Defense", career?.skillDefense],
    ["basketballIq", "Basketball IQ", career?.skillBasketballIQ],
    ["athletics", "Athleticism", career?.skillAthletics],
  ];
  for (const [key, label, rawValue] of skillEntries) {
    const value = finitePositiveNumber(rawValue);
    if (value) available.set(key, { key, label, value: `${value}/10` });
  }

  const gradYear = finitePositiveNumber(playerProfile?.gradYear);
  if (gradYear) available.set("gradYear", { key: "gradYear", label: "Class of", value: String(gradYear) });

  const gpa = typeof playerProfile?.gpa === "string" ? playerProfile.gpa.trim() : "";
  if (gpa) available.set("gpa", { key: "gpa", label: "GPA", value: gpa });

  return PROFILE_DISPLAY_STAT_KEYS
    .filter((key) => available.has(key))
    .map((key) => available.get(key)!);
}

function formatLocation(userProfile: any): string {
  const city = typeof userProfile?.city === "string" ? userProfile.city.trim() : "";
  if (!city) return "";

  const countryCode = typeof userProfile?.country === "string" ? userProfile.country : "USA";
  const country = COUNTRIES.find((item) => item.code === countryCode || item.name === countryCode);
  const isUnitedStates = country?.code === "USA" || countryCode === "US" || countryCode === "USA";
  if (isUnitedStates) {
    const stateValue = typeof userProfile?.state === "string" ? userProfile.state.trim() : "";
    return [city, stateValue].filter(Boolean).join(", ");
  }

  return [city, country?.name ?? countryCode].filter(Boolean).join(", ");
}

function makeProfileSlug(displayName: string, userId?: string): string {
  const namePart = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = userId?.slice(-6).toLowerCase() || "player";
  return `${namePart || "player"}-${suffix}`;
}

export function ProfileSummaryCard({
  user,
  userProfile,
  playerProfile,
  career,
  careerStats,
  isLoading,
  onEditProfile,
  onOpenPro,
  onSettings,
}: ProfileSummaryCardProps) {
  const { toast } = useToast();
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [draftStats, setDraftStats] = useState<ProfileDisplayStatKey[]>([]);

  const displayName =
    userProfile?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Player";
  const initials = displayName
    .split(/\s+/)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarPath = userProfile?.profilePhotoUrl || user?.profileImageUrl;
  const avatarSrc = avatarPath ? getObjectUrl(avatarPath) : undefined;
  const location = formatLocation(userProfile);
  const positions = Array.isArray(career?.positions)
    ? career.positions.filter((position: unknown) => typeof position === "string" && position.trim())
    : [];
  const availableStats = useMemo(
    () => buildAvailableStats(playerProfile, career, careerStats),
    [playerProfile, career, careerStats],
  );
  const availableByKey = new Map<ProfileDisplayStatKey, ProfileStat>(
    availableStats.map((stat) => [stat.key, stat]),
  );
  const savedStats: ProfileDisplayStatKey[] = Array.isArray(playerProfile?.displayStats)
    ? playerProfile.displayStats.filter((key: unknown): key is ProfileDisplayStatKey =>
        PROFILE_DISPLAY_STAT_KEYS.includes(key as ProfileDisplayStatKey) && availableByKey.has(key as ProfileDisplayStatKey),
      )
    : [];
  const selectedStats: ProfileDisplayStatKey[] = savedStats.length
    ? savedStats
    : RECOMMENDED_STAT_ORDER.filter((key) => availableByKey.has(key)).slice(0, 3);
  const selectedStatValues: ProfileStat[] = selectedStats
    .map((key) => availableByKey.get(key))
    .filter((stat): stat is ProfileStat => Boolean(stat));

  const saveStats = useMutation({
    mutationFn: async (displayStats: ProfileDisplayStatKey[]) => {
      const slug = playerProfile?.slug || makeProfileSlug(displayName, user?.id);
      await apiRequest("PUT", "/api/player-profile", { slug, displayStats });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/player-profile"] });
      setStatsDialogOpen(false);
      toast({ title: "Profile stats saved", description: "Your summary now shows the stats you selected." });
    },
    onError: (error: any) => {
      toast({
        title: "Could not save profile stats",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openStatsDialog = () => {
    setDraftStats([...selectedStats]);
    setStatsDialogOpen(true);
  };

  const toggleDraftStat = (key: ProfileDisplayStatKey, checked: boolean) => {
    setDraftStats((current) => {
      if (checked) return current.includes(key) || current.length >= 3 ? current : [...current, key];
      return current.filter((selected) => selected !== key);
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-white">Profile</h1>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-9 bg-orange-500 px-3 text-xs font-bold text-zinc-950 hover:bg-orange-400"
            onClick={onEditProfile}
            data-testid="button-edit-profile"
          >
            Edit Profile
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onOpenPro}
            className="h-9 rounded-full border border-orange-200/70 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-3 text-[11px] font-black text-zinc-950 shadow-[0_0_18px_rgba(249,115,22,0.35)] transition hover:brightness-110 hover:shadow-[0_0_24px_rgba(249,115,22,0.5)]"
            data-testid="button-playr1-pro"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5" />
            PLAYR1 Pro
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 px-2 text-xs text-zinc-300 hover:text-white sm:gap-1.5 sm:px-2.5"
            onClick={openStatsDialog}
            disabled={!availableStats.length}
            data-testid="button-edit-profile-stats"
          >
            <Settings2 className="h-3.5 w-3.5 shrink-0" />
            Choose stats
          </Button>
          <button
            type="button"
            onClick={onSettings}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition hover:border-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            aria-label="Settings"
            data-testid="card-profile-settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      <Card className="overflow-hidden border-zinc-800/60 bg-zinc-900/40" data-testid="card-profile-summary">
      <CardContent className="p-4 sm:p-5">
        {isLoading ? (
          <div
            className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[80px_minmax(0,1fr)_minmax(190px,0.68fr)] sm:gap-x-4 sm:gap-y-0"
            aria-label="Loading player summary"
          >
            <div className="row-span-2 h-16 w-16 animate-pulse rounded-full bg-zinc-800 sm:h-20 sm:w-20" />
            <div className="space-y-2 pt-1">
              <div className="h-5 w-40 max-w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-28 max-w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-32 max-w-full animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="h-14 animate-pulse rounded-xl bg-zinc-800 sm:col-start-3 sm:row-start-1" />
            <div className="col-span-2 space-y-2 pl-[76px] pt-1 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:pl-0">
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-10 w-full animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[80px_minmax(0,1fr)_minmax(190px,0.68fr)] sm:gap-x-4 sm:gap-y-0">
            <Avatar className="row-span-2 h-16 w-16 shrink-0 border-2 border-orange-500 ring-2 ring-orange-500/80 shadow-[0_0_16px_rgba(249,115,22,0.38)] sm:h-20 sm:w-20">
              <AvatarImage src={avatarSrc} alt={`${displayName} profile photo`} />
              <AvatarFallback className="bg-orange-500/20 text-lg font-bold text-orange-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 pt-1">
              <h2 className="truncate text-lg font-bold leading-tight text-white">{displayName}</h2>
              {location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                  <span className="truncate">{location}</span>
                </p>
              )}
              {(career?.jerseyNumber !== null && career?.jerseyNumber !== undefined || positions.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {career?.jerseyNumber !== null && career?.jerseyNumber !== undefined && (
                    <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-[10px] text-zinc-200 sm:text-xs">
                      Jersey #{career.jerseyNumber}
                    </Badge>
                  )}
                  {positions.length > 0 && (
                    <Badge variant="outline" className="border-zinc-700 bg-zinc-950/70 text-[10px] text-zinc-200 sm:text-xs">
                      {positions.join(" · ")}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <section className="min-w-0 sm:col-start-3 sm:row-start-1 sm:pt-1" aria-label="Player stats">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px] sm:tracking-[0.16em]">
                Player stats
              </p>
              {selectedStatValues.length > 0 ? (
                <div
                  className={`grid overflow-hidden rounded-xl border border-zinc-800 bg-black/25 ${
                    selectedStatValues.length === 1 ? "grid-cols-1" : selectedStatValues.length === 2 ? "grid-cols-2" : "grid-cols-3"
                  }`}
                >
                  {selectedStatValues.map((stat, index) => (
                    <div
                      key={stat.key}
                      className={`min-w-0 px-1 py-2 text-center sm:px-2 sm:py-2.5 ${
                        index > 0 ? "border-l border-zinc-800" : ""
                      }`}
                    >
                      <p className="truncate text-xs font-black leading-tight text-white sm:text-base">{stat.value}</p>
                      <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[9px]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-800 px-2 py-3 text-center text-[10px] leading-snug text-zinc-500 sm:px-3 sm:text-xs">
                  Add stats or measurements to choose what appears here.
                </p>
              )}
            </section>

            <div className="col-span-2 min-w-0 space-y-1.5 pl-[76px] pt-1 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:pl-0">
              {(playerProfile?.headline || playerProfile?.bio) ? (
                <>
                  {playerProfile?.headline && (
                    <p className="text-xs font-semibold leading-snug text-zinc-100 sm:text-sm">
                      {playerProfile.headline}
                    </p>
                  )}
                  {playerProfile?.bio && (
                    <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-zinc-400 sm:text-sm">
                      {playerProfile.bio}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500 sm:text-sm">Add a headline and bio to introduce your game.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Choose your profile stats</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Choose up to three stats to show in your Profile summary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {STAT_GROUPS.map((group) => {
              const options = group.keys
                .map((key) => availableByKey.get(key))
                .filter((stat): stat is ProfileStat => Boolean(stat));
              if (!options.length) return null;

              return (
                <fieldset key={group.label} className="space-y-2">
                  <legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {group.label}
                  </legend>
                  {options.map((stat) => {
                    const isSelected = draftStats.includes(stat.key);
                    return (
                      <label
                        key={stat.key}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 transition hover:border-zinc-700"
                      >
                        <span>
                          <span className="block text-sm font-medium text-zinc-100">{stat.label}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">{stat.value}</span>
                        </span>
                        <Checkbox
                          checked={isSelected}
                          disabled={!isSelected && draftStats.length >= 3}
                          onCheckedChange={(checked) => toggleDraftStat(stat.key, checked === true)}
                          aria-label={`Show ${stat.label}`}
                        />
                      </label>
                    );
                  })}
                </fieldset>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setStatsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-orange-500 text-zinc-950 hover:bg-orange-400"
              disabled={!draftStats.length || saveStats.isPending}
              onClick={() => saveStats.mutate(draftStats)}
              data-testid="button-save-profile-stats"
            >
              {saveStats.isPending ? "Saving…" : "Save stats"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Card>
    </div>
  );
}