import './_group.css';
import React, { useState } from "react";
import { Camera, MapPin } from "lucide-react";
type PlayerCardCareerStatKey = "ppg" | "rpg" | "apg" | "spg" | "bpg" | "games" | "record";
type CareerProfile = any;
type CareerStats = {
  totalGames: number;
  wins: number;
  losses: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
};
type PlayerProfile = {
  headline?: string | null;
  bio?: string | null;
  heightFeet?: number | null;
  heightInches?: number | null;
  weight?: number | null;
  wingspan?: string | null;
  schoolName?: string | null;
  gradYear?: number | null;
  gpa?: string | null;
  cardCareerStats?: PlayerCardCareerStatKey[];
};
const COUNTRIES = [{ code: "USA", name: "United States" }, { code: "CAN", name: "Canada" }];
const defaultPlayerImg = "/__mockup/images/default-player.jpg";
const getObjectUrl = (path?: string | null) => path ?? undefined;
const queryClient = { invalidateQueries: (_options: any) => undefined };
const useToast = () => ({ toast: (_options: any) => undefined });
const apiRequest = async (..._args: any[]) => ({ json: async () => ({ uploadURL: "/mock-upload", objectPath: "mock-card-photo.jpg" }) });
const DEFAULT_PLAYER_CARD_STATS: PlayerCardCareerStatKey[] = ["ppg", "rpg", "apg"];

const PLAYER_CARD_STAT_LABELS: Record<PlayerCardCareerStatKey, string> = {
  ppg: "PPG",
  rpg: "RPG",
  apg: "APG",
  spg: "SPG",
  bpg: "BPG",
  games: "GP",
  record: "W-L",
};

function formatPlayerCardLocation(userProfile: any): string {
  const city = typeof userProfile?.city === "string" ? userProfile.city.trim() : "";
  if (!city) return "";
  const countryCode = typeof userProfile?.country === "string" ? userProfile.country : "USA";
  const country = COUNTRIES.find((item) => item.code === countryCode || item.name === countryCode);
  if (country?.code === "USA" || countryCode === "US" || countryCode === "USA") {
    const state = typeof userProfile?.state === "string" ? userProfile.state.trim() : "";
    return [city, state].filter(Boolean).join(", ");
  }
  return [city, country?.name ?? countryCode].filter(Boolean).join(", ");
}

function PlayerCardBack({
  profile,
  careerStats,
  playerProfile,
  userProfile,
  userName,
  positionsText,
  teamLabel,
  location,
  physicalDetails,
  academicDetails,
  selectedCardStats,
  cardStatValues,
}: {
  profile: CareerProfile;
  careerStats?: CareerStats;
  playerProfile?: PlayerProfile | null;
  userProfile?: any;
  userName?: string;
  positionsText: string;
  teamLabel: string;
  location: string;
  physicalDetails: (string | null)[];
  academicDetails: (string | null)[];
  selectedCardStats: PlayerCardCareerStatKey[];
  cardStatValues: Record<PlayerCardCareerStatKey, string>;
}) {
  const portraitPath = userProfile?.profilePhotoUrl || userProfile?.profileImageUrl || profile.cardPhotoUrl;
  const portraitSrc = getObjectUrl(portraitPath) ?? defaultPlayerImg;

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      <div className="flex items-center justify-between border-b border-orange-400/70 px-2.5 py-1.5">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-orange-300">Player profile</span>
        {profile.jerseyNumber != null && (
          <span className="text-[9px] font-black text-orange-300">#{profile.jerseyNumber}</span>
        )}
      </div>

      <div className="flex items-start gap-2.5 px-2.5 pt-2">
        <img
          src={portraitSrc}
          alt={`${userName || "Player"} profile`}
          className="h-12 w-12 shrink-0 rounded-full border-2 border-orange-400 object-cover shadow-[0_0_12px_rgba(249,115,22,0.22)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black uppercase tracking-wide text-white">
            {userName || teamLabel || "Player"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight text-orange-200">
            {playerProfile?.headline || [positionsText, teamLabel].filter(Boolean).join(" — ") || "Player"}
          </p>
          {location && (
            <p className="mt-1 flex items-center gap-1 truncate text-[8px] text-white/55">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-orange-300" />
              {location}
            </p>
          )}
        </div>
      </div>

      <p className="mx-2.5 mt-1.5 line-clamp-2 min-h-[22px] text-[8px] leading-[1.35] text-white/70">
        {playerProfile?.bio?.trim() || "Add a short bio in Player Details."}
      </p>

      <div className="mx-2.5 mt-1.5 grid grid-cols-2 gap-2 border-y border-white/10 py-1.5">
        <div className="min-w-0">
          <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-white/35">Measurements</p>
          <p className="line-clamp-2 text-[8px] font-semibold leading-snug text-white/80">
            {physicalDetails.length ? physicalDetails.join(" · ") : "Not added"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-white/35">Academics</p>
          <p className="line-clamp-2 text-[8px] font-semibold leading-snug text-white/80">
            {academicDetails.length ? academicDetails.join(" · ") : "Not added"}
          </p>
        </div>
      </div>

      <div className="mt-auto px-2.5 pb-1.5 pt-1.5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-white/40">Career highlights</p>
          <span className="text-[7px] text-white/25">{careerStats?.totalGames || 0} games</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${selectedCardStats.length}, minmax(0, 1fr))` }}>
          {selectedCardStats.map((key) => (
            <div key={key} className="rounded-sm border border-orange-400/25 bg-orange-400/[0.07] px-1.5 py-1 text-center">
              <p className="text-[13px] font-black leading-none text-orange-300">
                {cardStatValues[key]}
              </p>
              <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/45">
                {PLAYER_CARD_STAT_LABELS[key]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[7px] text-white/25">
          <span>{teamLabel}</span>
          <span>Tap to flip</span>
        </div>
      </div>
    </div>
  );
}

export function BaseballCard({
  profile,
  careerStats,
  onPhotoUpdated,
  userName,
  playerProfile,
  userProfile,
}: {
  profile: CareerProfile;
  careerStats?: CareerStats;
  onPhotoUpdated?: () => void;
  userName?: string;
  playerProfile?: PlayerProfile | null;
  userProfile?: any;
}) {
  const [isFlipped, setIsFlipped] = useState(() => new URLSearchParams(window.location.search).get("side") === "back");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const frontW = 240;
  const frontH = 340;
  const backW = 320;
  const backH = 286;

  const photoSrc = profile.cardPhotoUrl
    ? (getObjectUrl(profile.cardPhotoUrl) ?? defaultPlayerImg)
    : defaultPlayerImg;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
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

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      await apiRequest("PUT", "/api/career", { cardPhotoUrl: objectPath });
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      onPhotoUpdated?.();
      toast({ title: "Photo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const positionsText = profile.positions && profile.positions.length > 0 ? profile.positions.join(" / ") : "";
  const teamLabel = profile.teamName || profile.schoolName || "";
  const location = formatPlayerCardLocation(userProfile);
  const height = playerProfile?.heightFeet
    ? `${playerProfile.heightFeet}'${playerProfile.heightInches ?? 0}"`
    : null;
  const physicalDetails = [
    height,
    playerProfile?.weight ? `${playerProfile.weight} lb` : null,
    playerProfile?.wingspan ? `${playerProfile.wingspan} span` : null,
  ].filter(Boolean);
  const academicDetails = [
    playerProfile?.schoolName || null,
    playerProfile?.gradYear ? `Class of ${playerProfile.gradYear}` : null,
    playerProfile?.gpa ? `GPA ${playerProfile.gpa}` : null,
  ].filter(Boolean);
  const savedCardStats = Array.isArray(playerProfile?.cardCareerStats)
    ? playerProfile.cardCareerStats.filter((key): key is PlayerCardCareerStatKey =>
        Object.prototype.hasOwnProperty.call(PLAYER_CARD_STAT_LABELS, key),
      ).slice(0, 3)
    : [];
  const selectedCardStats = savedCardStats.length ? savedCardStats : DEFAULT_PLAYER_CARD_STATS;
  const avgValue = (value: number | undefined) =>
    careerStats?.totalGames && Number.isFinite(value) ? value!.toFixed(1) : "—";
  const cardStatValues: Record<PlayerCardCareerStatKey, string> = {
    ppg: avgValue(careerStats?.avgPoints),
    rpg: avgValue(careerStats?.avgRebounds),
    apg: avgValue(careerStats?.avgAssists),
    spg: avgValue(careerStats?.avgSteals),
    bpg: avgValue(careerStats?.avgBlocks),
    games: careerStats?.totalGames ? String(careerStats.totalGames) : "—",
    record: careerStats && careerStats.wins + careerStats.losses > 0
      ? `${careerStats.wins}–${careerStats.losses}`
      : "—",
  };

  const maxW = Math.max(frontW, backW);
  const maxH = Math.max(frontH, backH);

  return (
    <div
      className="cursor-pointer select-none relative"
      style={{
        perspective: "1200px",
        width: maxW,
        height: maxH,
      }}
      onClick={() => setIsFlipped(!isFlipped)}
      data-testid="baseball-card"
    >
      <div
        className="absolute"
        style={{
          width: maxW,
          height: maxH,
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.6s ease",
        }}
      >
        {/* FRONT - Portrait */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            width: frontW,
            height: frontH,
            left: (maxW - frontW) / 2,
            top: 0,
            border: "3px solid #ff8a24",
            boxShadow: "0 0 16px rgba(249, 115, 22, 0.26), inset 0 0 0 1px rgba(255, 188, 112, 0.24)",
          }}
        >
          <div className="relative w-full h-full bg-black">
            <img
              src={photoSrc}
              alt="Player"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {profile.jerseyNumber != null && (
              <div
                className="absolute top-0 left-0 flex items-center justify-center bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.38)]"
                style={{ width: 34, height: 34 }}
              >
                <span className="text-black font-black text-sm leading-none">
                  {profile.jerseyNumber}
                </span>
              </div>
            )}

            <label
              className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              data-testid="button-upload-card-photo"
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

            <div className="absolute bottom-0 left-0 right-0">
              <div className="px-3 py-2 text-left" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 60%, rgba(0,0,0,0.7) 85%, transparent 100%)" }}>
                {userName && (
                  <p className="text-gray-300 font-semibold text-base uppercase tracking-wider leading-none truncate" data-testid="text-card-player-name">
                    {userName}
                  </p>
                )}
                {(profile.schoolName || profile.teamName || positionsText) && (
                  <p className="text-orange-300 font-semibold text-[11px] uppercase tracking-wider leading-none mt-1 truncate [text-shadow:0_0_10px_rgba(249,115,22,0.45)]">
                {[positionsText, teamLabel].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-xs font-medium">Uploading...</div>
              </div>
            )}
          </div>
        </div>

        {/* BACK - Landscape (horizontal) */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            width: backW,
            height: backH,
            top: (maxH - backH) / 2,
            left: (maxW - backW) / 2,
            border: "3px solid #ff8a24",
            boxShadow: "0 0 16px rgba(249, 115, 22, 0.26), inset 0 0 0 1px rgba(255, 188, 112, 0.24)",
          }}
        >
          <PlayerCardBack
            profile={profile}
            careerStats={careerStats}
            playerProfile={playerProfile}
            userProfile={userProfile}
            userName={userName}
            positionsText={positionsText}
            teamLabel={teamLabel}
            location={location}
            physicalDetails={physicalDetails}
            academicDetails={academicDetails}
            selectedCardStats={selectedCardStats}
            cardStatValues={cardStatValues}
          />
        </div>
      </div>
    </div>
  );
}

export function Updated() {
  const stats = { totalGames: 30, totalPoints: 492, totalRebounds: 162, totalAssists: 123, totalSteals: 54, totalBlocks: 18, wins: 22, losses: 8, avgPoints: 16.4, avgRebounds: 5.4, avgAssists: 4.1, avgSteals: 1.8, avgBlocks: 0.6, seasonBreakdown: [] };
  const playerProfile = { headline: "Class of 2027 · Two-way point guard", bio: "A high-motor floor general who creates for teammates, competes on defense, and leads with consistency.", heightFeet: 6, heightInches: 2, weight: 185, wingspan: "6'7\"", schoolName: "Northside High", gradYear: 2027, gpa: "3.7", cardCareerStats: ["ppg", "rpg", "apg"] as PlayerCardCareerStatKey[] };
  const userProfile = { profilePhotoUrl: "/__mockup/images/default-player.jpg", city: "Atlanta", state: "GA", country: "USA" };
  return <main className="min-h-screen flex items-center justify-center bg-[#111] p-8"><BaseballCard profile={{ cardPhotoUrl: null, jerseyNumber: 7, positions: ["PG", "SG"], schoolName: "Northside High", teamName: "Northside Eagles" }} careerStats={stats} playerProfile={playerProfile} userProfile={userProfile} userName="Jordan Davis" /></main>;
}