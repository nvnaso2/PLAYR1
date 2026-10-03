import './_group.css';
import React, { useState } from "react";
import { Camera, BarChart3 } from "lucide-react";
type CareerProfile = any;
type SeasonRow = {
  seasonId: string;
  seasonName: string;
  seasonType: string;
  year: string;
  gamesPlayed: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
};
type CareerStats = { seasonBreakdown: SeasonRow[] };
const defaultPlayerImg = "/__mockup/images/default-player.jpg";
const getObjectUrl = (path?: string | null) => path ?? undefined;
const queryClient = { invalidateQueries: (_options: any) => undefined };
const useToast = () => ({ toast: (_options: any) => undefined });
const apiRequest = async (..._args: any[]) => ({ json: async () => ({ uploadURL: "/mock-upload", objectPath: "mock-card-photo.jpg" }) });
const SEASON_TYPE_LABELS: Record<string, string> = { "middle-school": "Middle School", "high-school": "High School", "aau-travel-club": "AAU / Travel / Club", recreational: "Recreational" };
function BaseballCard({ profile, careerStats, onPhotoUpdated, userName }: { profile: CareerProfile; careerStats?: CareerStats; onPhotoUpdated?: () => void; userName?: string }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const allSeasons = careerStats?.seasonBreakdown || [];
  const seasonBreakdown = seasonFilter === "all"
    ? allSeasons
    : allSeasons.filter(s => s.seasonType === seasonFilter);
  const frontW = 240;
  const frontH = 340;
  const backW = 320;
  const backH = 240;

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
                    {[profile.schoolName || profile.teamName, positionsText].filter(Boolean).join(" \u00B7 ")}
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
          <div className="w-full h-full flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-orange-400/70 shadow-[0_1px_8px_rgba(249,115,22,0.1)]">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-white font-bold text-xs uppercase tracking-wide leading-tight truncate">
                  {userName || profile.schoolName || profile.teamName || "Player"}
                </p>
                {profile.jerseyNumber != null && (
                   <span className="text-orange-300 font-black text-xs [text-shadow:0_0_8px_rgba(249,115,22,0.4)]">#{profile.jerseyNumber}</span>
                )}
                {positionsText && (
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">
                    {positionsText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {[
                    { key: "all", label: "ALL" },
                    { key: "aau-travel-club", label: "AAU" },
                    { key: "high-school", label: "SCH" },
                    { key: "recreational", label: "REC" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      data-testid={`filter-${f.key}`}
                      className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-sm transition-colors ${
                        seasonFilter === f.key
                           ? "bg-orange-400 text-zinc-950 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                          : "bg-white/10 text-white/50 hover:bg-white/20"
                      }`}
                      onClick={(e) => { e.stopPropagation(); setSeasonFilter(f.key); }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-white/30 text-[9px]">Tap to flip</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-3 py-1.5">
              <div>
                <div className="grid gap-0.5 text-[8px] font-bold uppercase text-white/40 border-b border-white/10 pb-1 mb-0.5"
                  style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                  <span>Season</span>
                  <span className="text-center">GP</span>
                   <span className="text-center text-orange-300/90">PTS</span>
                   <span className="text-center text-orange-300/90">REB</span>
                   <span className="text-center text-orange-300/90">AST</span>
                   <span className="text-center text-orange-300/90">STL</span>
                   <span className="text-center text-orange-300/90">BLK</span>
                  <span className="text-center">PTS</span>
                  <span className="text-center">REB</span>
                  <span className="text-center">AST</span>
                  <span className="text-center">STL</span>
                  <span className="text-center">BLK</span>
                </div>
                <div className="grid gap-0.5 text-[7px] uppercase text-white/25 mb-0.5"
                  style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                  <span></span>
                  <span></span>
                   <span className="text-center col-span-5 border-b border-orange-400/35 pb-0.5">Averages</span>
                  <span className="text-center col-span-5 border-b border-white/10 pb-0.5">Totals</span>
                </div>

                {seasonBreakdown.length > 0 ? (
                  <>
                    {seasonBreakdown.map((s, i) => (
                      <div key={i} className="grid gap-0.5 text-[9px] py-0.5 border-b border-white/5 last:border-0"
                        style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                        <span className="font-medium truncate text-white/70" title={s.seasonName}>
                          {SEASON_TYPE_LABELS[s.seasonType] ? SEASON_TYPE_LABELS[s.seasonType].split(" ")[0] : s.seasonType} '{s.year?.slice(-2) || ""}
                        </span>
                        <span className="text-center text-white/60">{s.gamesPlayed}</span>
                       <span className="text-center font-semibold text-orange-300 [text-shadow:0_0_8px_rgba(249,115,22,0.32)]">{s.avgPoints?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgRebounds?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgAssists?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgSteals?.toFixed(1)}</span>
                        <span className="text-center text-white/60">{s.avgBlocks?.toFixed(1)}</span>
                        <span className="text-center text-white/50">{s.totalPoints}</span>
                        <span className="text-center text-white/50">{s.totalRebounds}</span>
                        <span className="text-center text-white/50">{s.totalAssists}</span>
                        <span className="text-center text-white/50">{s.totalSteals}</span>
                        <span className="text-center text-white/50">{s.totalBlocks}</span>
                      </div>
                    ))}

                    {(() => {
                      const filteredGames = seasonBreakdown.reduce((sum, s) => sum + s.gamesPlayed, 0);
                      const filteredTotalPts = seasonBreakdown.reduce((sum, s) => sum + s.totalPoints, 0);
                      const filteredTotalReb = seasonBreakdown.reduce((sum, s) => sum + s.totalRebounds, 0);
                      const filteredTotalAst = seasonBreakdown.reduce((sum, s) => sum + s.totalAssists, 0);
                      const filteredTotalStl = seasonBreakdown.reduce((sum, s) => sum + s.totalSteals, 0);
                      const filteredTotalBlk = seasonBreakdown.reduce((sum, s) => sum + s.totalBlocks, 0);
                      if (filteredGames === 0) return null;
                      return (
                         <div className="grid gap-0.5 text-[9px] py-1 mt-0.5 border-t-2 border-orange-400/75 font-bold shadow-[0_-2px_8px_rgba(249,115,22,0.1)]"
                          style={{ gridTemplateColumns: "minmax(50px, 1.2fr) 28px repeat(5, 1fr) repeat(5, 1fr)" }}>
                           <span className="text-orange-300 uppercase">Total</span>
                          <span className="text-center">{filteredGames}</span>
                           <span className="text-center text-orange-300">{filteredGames > 0 ? (filteredTotalPts / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalReb / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalAst / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalStl / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredGames > 0 ? (filteredTotalBlk / filteredGames).toFixed(1) : "0.0"}</span>
                          <span className="text-center">{filteredTotalPts}</span>
                          <span className="text-center">{filteredTotalReb}</span>
                          <span className="text-center">{filteredTotalAst}</span>
                          <span className="text-center">{filteredTotalStl}</span>
                          <span className="text-center">{filteredTotalBlk}</span>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <BarChart3 className="w-5 h-5 text-white/20 mb-1" />
                    <p className="text-[10px] text-white/40">No seasons yet -- add seasons in the Stats tab</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3 py-1.5 bg-neutral-900 border-t border-white/10 flex items-center justify-between">
              <span className="text-[9px] text-white/30">
                {profile.schoolName || profile.teamName || ""}
              </span>
              <span className="text-[9px] text-white/30">'{new Date().getFullYear().toString().slice(-2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Current() {
  const sampleStats = { seasonBreakdown: [
    { seasonId: "hs-2025", seasonName: "Varsity", seasonType: "high-school", year: "2025-2026", gamesPlayed: 18, avgPoints: 16.8, avgRebounds: 5.4, avgAssists: 4.2, avgSteals: 1.8, avgBlocks: 0.7, totalPoints: 302, totalRebounds: 97, totalAssists: 76, totalSteals: 32, totalBlocks: 13, wins: 13, losses: 5 },
    { seasonId: "aau-2025", seasonName: "Metro Select", seasonType: "aau-travel-club", year: "2025-2026", gamesPlayed: 12, avgPoints: 14.1, avgRebounds: 4.8, avgAssists: 5.1, avgSteals: 2.0, avgBlocks: 0.5, totalPoints: 169, totalRebounds: 58, totalAssists: 61, totalSteals: 24, totalBlocks: 6, wins: 9, losses: 3 },
  ] };
  return <main className="min-h-screen flex items-center justify-center bg-[#111] p-8"><BaseballCard profile={{ cardPhotoUrl: null, jerseyNumber: 7, positions: ["PG", "SG"], schoolName: "Northside High", teamName: "Northside Eagles" }} careerStats={sampleStats} userName="Jordan Davis" /></main>;
}