import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clapperboard, Loader2, Play, ScanLine, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, nativeFetch, queryClient } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import type { ManualHoopLocation, ShotSuggestion } from "@/lib/shooting-analysis-types";

type TrackerClip = {
  id: string;
  title: string;
  videoUrl: string;
  notes: string;
  shots: Array<{ id: string; timeSeconds: number; outcome: "made" | "missed" | "uncertain" }>;
  createdAt: string | null;
};

const formatClipTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

export default function ShootingTrackerPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedPath, setUploadedPath] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [analysisClipId, setAnalysisClipId] = useState<string | null>(null);
  const [analysisSuggestions, setAnalysisSuggestions] = useState<ShotSuggestion[]>([]);
  const [analysisHoop, setAnalysisHoop] = useState<{ x: number; y: number; halfWidth: number } | null>(null);
  const [manualHoop, setManualHoop] = useState<ManualHoopLocation | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [videoAspect, setVideoAspect] = useState("16 / 9");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const upload = useUpload({ requestUrl: "/api/shooting-tracker/upload-url", finalizeVideo: false });

  const clipsQuery = useQuery<TrackerClip[]>({
    queryKey: ["/api/shooting-tracker/clips"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a recording first.");
      let objectPath = uploadedPath;
      if (!objectPath) {
        const uploaded = await upload.uploadFile(file);
        if (!uploaded) throw upload.error ?? new Error("Upload did not finish.");
        objectPath = uploaded.objectPath;
        setUploadedPath(objectPath);
      }
      const response = await apiRequest("POST", "/api/shooting-tracker/clips", {
        title: title.trim() || file.name.replace(/\.[^/.]+$/, ""),
        notes: notes.trim(),
        objectPath,
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/shooting-tracker/clips"] });
      setFile(null);
      setTitle("");
      setNotes("");
      setUploadedPath("");
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: "Recording saved", description: "Your private clip is ready for review." });
    },
    onError: (error) => toast({
      title: "Could not save recording",
      description: error instanceof Error ? error.message : "Try again.",
      variant: "destructive",
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shooting-tracker/clips/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/shooting-tracker/clips"] });
      setActiveId(null);
      setPlaybackUrl("");
      toast({ title: "Recording deleted" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ clipId, notes: reviewNotes, shots }: {
      clipId: string;
      notes: string;
      shots: TrackerClip["shots"];
    }) => apiRequest("PATCH", `/api/shooting-tracker/clips/${encodeURIComponent(clipId)}/review`, {
      notes: reviewNotes,
      shots,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/shooting-tracker/clips"] });
    },
    onError: () => toast({
      title: "Review not saved",
      description: "Your marker change could not be saved. Try again.",
      variant: "destructive",
    }),
  });

  const markShot = (clip: TrackerClip, outcome: TrackerClip["shots"][number]["outcome"]) => {
    const timeSeconds = playerRef.current?.currentTime;
    if (timeSeconds === undefined) {
      toast({ title: "Open the clip first", description: "Play the recording and pause near the shot." });
      return;
    }
    reviewMutation.mutate({
      clipId: clip.id,
      notes: clip.notes,
      shots: [...clip.shots, {
        id: globalThis.crypto.randomUUID(),
        timeSeconds: Math.round(timeSeconds * 10) / 10,
        outcome,
      }],
    });
  };

  const removeShot = (clip: TrackerClip, shotId: string) => {
    reviewMutation.mutate({
      clipId: clip.id,
      notes: clip.notes,
      shots: clip.shots.filter((shot) => shot.id !== shotId),
    });
  };

  const chooseClip = async (clip: TrackerClip) => {
    setActiveId(clip.id);
    setPlaybackUrl("");
    setAnalysisHoop(null);
    setManualHoop(null);
    setIsCalibrating(false);
    setVideoAspect("16 / 9");
    try {
      const response = await nativeFetch(`/api/shooting-tracker/clips/${encodeURIComponent(clip.id)}/playback`);
      if (!response.ok) throw new Error("Could not open this recording.");
      const result = await response.json();
      setPlaybackUrl(result.playbackUrl);
    } catch (error) {
      toast({
        title: "Playback unavailable",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const analyzeClip = async (clip: TrackerClip) => {
    setIsAnalyzing(true);
    setIsCalibrating(false);
    setAnalysisClipId(clip.id);
    setAnalysisSuggestions([]);
    setAnalysisHoop(null);
    setAnalysisProgress(0);
    const progressTimer = window.setInterval(() => {
      setAnalysisProgress((progress) => Math.min(95, progress + 2));
    }, 1000);
    try {
      const response = await nativeFetch(
        `/api/shooting-tracker/clips/${encodeURIComponent(clip.id)}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(manualHoop ? { hoop: manualHoop } : {}),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Could not analyze this recording.");
      }
      const result = await response.json() as {
        suggestions: ShotSuggestion[];
        hoop: { x: number; y: number; halfWidth: number };
      };
      setAnalysisProgress(100);
      setAnalysisSuggestions(result.suggestions);
      setAnalysisHoop(result.hoop);
      setActiveId(clip.id);
      toast({
        title: "Local scan finished",
        description: result.suggestions.length
          ? `Found ${result.suggestions.length} possible shot moment${result.suggestions.length === 1 ? "" : "s"}. The marker shows the hoop it found.`
          : "The hoop was found, but no ball sequences through the rim were detected.",
      });
    } catch (error) {
      toast({
        title: "Could not analyze this clip",
        description: error instanceof Error ? error.message : "Try again with this recording.",
        variant: "destructive",
      });
    } finally {
      window.clearInterval(progressTimer);
      setIsAnalyzing(false);
    }
  };

  const isBusy = upload.isUploading || saveMutation.isPending;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 pb-24 sm:p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to training log">
          <Link href="/log"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-orange-600">Recorded video · offline-first</p>
          <h1 className="font-heading text-2xl font-black uppercase sm:text-4xl">Shooting Tracker</h1>
        </div>
      </div>

      <Card className="border-orange-500/30 bg-orange-500/[0.06]">
        <CardContent className="flex gap-3 p-4 sm:p-5">
          <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">Review your uploaded footage privately</p>
            <p className="text-muted-foreground">
              The scan checks the ball’s frame-by-frame sequence around the rim. It estimates the
              hoop from the opening frames; set the center if the marker is off.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="font-heading text-lg font-bold uppercase">Add a recording</h2>
            <p className="text-sm text-muted-foreground">MP4, MOV, WebM, or AVI · up to 4 GB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mov,.mp4,.m4v,.avi,.webm"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-semibold file:text-black"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              if (selected && selected.size > 4 * 1024 * 1024 * 1024) {
                toast({ title: "Recording is too large", description: "Choose a file under 4 GB.", variant: "destructive" });
                event.target.value = "";
                return;
              }
              setFile(selected);
              setUploadedPath("");
              if (selected && !title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
            }}
          />
          {file && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Recording title" aria-label="Recording title" />
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} placeholder="Optional notes" aria-label="Recording notes" className="sm:row-span-2" />
            </div>
          )}
          {(upload.isUploading || upload.status === "error") && (
            <div className="space-y-1">
              <Progress value={upload.progress} />
              <p className="text-xs text-muted-foreground">
                {upload.isUploading ? `Uploading ${upload.progress}%` : upload.error?.message}
              </p>
            </div>
          )}
          {uploadedPath && <p className="text-xs text-emerald-700">Upload complete. Save the recording to finish.</p>}
          <Button onClick={() => saveMutation.mutate()} disabled={!file || isBusy} className="w-full sm:w-auto">
            {isBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{upload.isUploading ? `Uploading ${upload.progress}%` : "Saving…"}</> : <><Upload className="mr-2 h-4 w-4" />Upload and save privately</>}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-heading text-xl font-black uppercase">Your recordings</h2>
            <p className="text-sm text-muted-foreground">Only you can open these clips.</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{clipsQuery.data?.length ?? 0} clips</span>
        </div>
        {clipsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading recordings…</p> :
          clipsQuery.isError ? <Button variant="outline" onClick={() => void clipsQuery.refetch()}>Retry loading clips</Button> :
          !clipsQuery.data?.length ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Your uploaded shooting clips will appear here.</CardContent></Card> :
          <div className="grid gap-4 md:grid-cols-2">
            {clipsQuery.data.map((clip) => (
              <Card key={clip.id} className="overflow-hidden">
                {activeId === clip.id && playbackUrl ? (
                  <div className="relative w-full bg-black" style={{ aspectRatio: videoAspect }}>
                    <video
                      ref={playerRef}
                      className="h-full w-full object-contain"
                      src={playbackUrl}
                      controls
                      playsInline
                      onLoadedMetadata={(event) => {
                        const { videoWidth, videoHeight } = event.currentTarget;
                        if (videoWidth && videoHeight) setVideoAspect(`${videoWidth} / ${videoHeight}`);
                      }}
                    />
                    {activeId === clip.id && analysisHoop && (
                      <div
                        aria-label={manualHoop ? "Marked hoop location" : "Estimated hoop location"}
                        title={manualHoop ? "Marked hoop" : "Estimated hoop — tap to correct"}
                        className={`pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_0_2px_rgba(0,0,0,.65)] ${manualHoop ? "border-lime-400" : "border-amber-400"}`}
                        style={{ left: `${analysisHoop.x * 100}%`, top: `${analysisHoop.y * 100}%` }}
                      />
                    )}
                    {isCalibrating && (
                      <button
                        type="button"
                        aria-label="Set hoop center at this point"
                        className="absolute inset-0 z-20 cursor-crosshair bg-transparent"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          const location = {
                            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
                            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
                          };
                          playerRef.current?.pause();
                          setManualHoop(location);
                          setAnalysisHoop({ ...location, halfWidth: 0.03 });
                          setIsCalibrating(false);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <button type="button" onClick={() => void chooseClip(clip)} className="flex aspect-video w-full items-center justify-center bg-zinc-950 text-white" aria-label={`Play ${clip.title}`}>
                    {activeId === clip.id ? <Loader2 className="h-8 w-8 animate-spin" /> : <Play className="h-9 w-9" />}
                  </button>
                )}
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{clip.title}</h3>
                      {clip.createdAt && <p className="text-xs text-muted-foreground">{new Date(clip.createdAt).toLocaleDateString()}</p>}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${clip.title}`} onClick={() => deleteMutation.mutate(clip.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {clip.notes && <p className="text-sm text-muted-foreground">{clip.notes}</p>}
                  {activeId === clip.id && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="space-y-2">
                        <Button
                          variant={isCalibrating ? "default" : "outline"}
                          className="w-full"
                          onClick={() => {
                            playerRef.current?.pause();
                            setIsCalibrating((active) => !active);
                          }}
                        >
                          {isCalibrating ? "Tap the center of the rim" : manualHoop ? "Adjust hoop location" : "Set hoop location"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Check the hoop marker on your video. Tap the rim center to set it for this camera angle before scanning.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button variant="secondary" className="w-full" onClick={() => void analyzeClip(clip)} disabled={isAnalyzing}>
                          {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing rim sequence {analysisProgress}%</> : <><ScanLine className="mr-2 h-4 w-4" />Analyze this clip locally</>}
                        </Button>
                        {isAnalyzing && <Progress value={analysisProgress} />}
                        {analysisClipId === clip.id && !isAnalyzing && analysisSuggestions.length > 0 && (
                          <div className="space-y-2 rounded-lg border p-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide">Possible shot moments</p>
                              <p className="text-xs text-muted-foreground">These are computer-vision suggestions, not verified results.</p>
                            </div>
                            <ul className="max-h-48 space-y-2 overflow-y-auto">
                              {analysisSuggestions.map((suggestion, index) => (
                                <li key={`${suggestion.startSeconds}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="min-w-0">
                                    <span>
                                      <span className="font-mono">{formatClipTime(suggestion.startSeconds)}</span>
                                      <span className="ml-2 font-semibold">
                                        {suggestion.result === "possible_make" ? "Possible make" : suggestion.result === "possible_miss" ? "Possible miss" : "Uncertain"}
                                      </span>
                                    </span>
                                    <span className="mt-0.5 block text-muted-foreground">{suggestion.reason}</span>
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 shrink-0 px-2"
                                    onClick={() => {
                                      if (playerRef.current) {
                                        playerRef.current.currentTime = suggestion.startSeconds;
                                        playerRef.current.pause();
                                      }
                                    }}
                                  >
                                    Review
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide">Mark the current moment</p>
                        <p className="text-xs text-muted-foreground">Pause near the shot, then add your verified result.</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button size="sm" variant="outline" onClick={() => markShot(clip, "made")} disabled={reviewMutation.isPending}>Make</Button>
                        <Button size="sm" variant="outline" onClick={() => markShot(clip, "missed")} disabled={reviewMutation.isPending}>Miss</Button>
                        <Button size="sm" variant="outline" onClick={() => markShot(clip, "uncertain")} disabled={reviewMutation.isPending}>Unsure</Button>
                      </div>
                      <p className="text-sm font-semibold">
                        Verified: {clip.shots.filter((shot) => shot.outcome === "made").length} makes / {clip.shots.filter((shot) => shot.outcome !== "uncertain").length} attempts
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {clip.shots.filter((shot) => shot.outcome === "uncertain").length} uncertain
                        </span>
                      </p>
                      {clip.shots.length > 0 && (
                        <ol className="max-h-40 space-y-1 overflow-y-auto">
                          {[...clip.shots].sort((a, b) => a.timeSeconds - b.timeSeconds).map((shot) => (
                            <li key={shot.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs">
                              <button
                                type="button"
                                className="font-mono underline"
                                onClick={() => {
                                  if (playerRef.current) {
                                    playerRef.current.currentTime = shot.timeSeconds;
                                    playerRef.current.pause();
                                  }
                                }}
                              >
                                {formatClipTime(shot.timeSeconds)} · {shot.outcome === "made" ? "Make" : shot.outcome === "missed" ? "Miss" : "Uncertain"}
                              </button>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeShot(clip, shot.id)} disabled={reviewMutation.isPending}>Remove</Button>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                  {activeId !== clip.id && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Manual review only; no automatic results</p>}
                </CardContent>
              </Card>
            ))}
          </div>}
      </section>
    </main>
  );
}
