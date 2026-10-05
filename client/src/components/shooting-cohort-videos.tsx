import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, FileVideo, Film, Loader2, LockKeyhole, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { nativeFetch } from "@/lib/queryClient";
import {
  useCreateShootingCohortVideoSubmission,
  useShootingCohortVideoSubmissionsQuery,
} from "@/lib/shooting-cohort-api";

const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]);

export function ShootingCohortVideos() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const videosQuery = useShootingCohortVideoSubmissionsQuery();
  const createSubmission = useCreateShootingCohortVideoSubmission();
  const {
    uploadFile,
    cancelUpload,
    isUploading,
    progress,
    status: uploadStatus,
    error: uploadError,
  } = useUpload({
    requestUrl: "/api/shooting-cohort/videos/upload-url",
    finalizeVideo: false,
    onSuccess: (response) => setUploadedPath(response.objectPath),
    onError: (error) => toast({
      title: "Upload failed",
      description: error.message,
      variant: "destructive",
    }),
  });

  const resetUpload = () => {
    cancelUpload();
    setSelectedFile(null);
    setUploadedPath(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      toast({
        title: "Unsupported video",
        description: "Choose an MP4, WebM, QuickTime, or AVI file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast({
        title: "Video is too large",
        description: "Cohort videos must be under 4GB.",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    setUploadedPath(null);
    if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    void uploadFile(file);
  };

  const submit = async () => {
    if (!uploadedPath || !title.trim() || createSubmission.isPending) return;
    try {
      const saved = await createSubmission.mutateAsync({
        title: title.trim(),
        videoUrl: uploadedPath,
        description: notes.trim(),
      });
      setTitle("");
      setNotes("");
      resetUpload();
      toast({ title: "Video sent to the founder", description: "Your private cohort submission is saved." });
      void nativeFetch(`/api/shooting-cohort/videos/${encodeURIComponent(saved.id)}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    } catch (error) {
      toast({
        title: "Could not submit video",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="rounded-[24px] border border-[#493a2c] bg-[#17130f] p-4 sm:p-5" aria-label="Cohort film submissions">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bf753f]/25 bg-[#bf753f]/10 text-[#e79960]"><Film className="h-4 w-4" /></span>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d89156]">Cohort film room</p>
            <h2 className="mt-1 font-heading text-2xl uppercase text-[#fff1de]">Send a rep for review</h2>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5b4934] bg-[#100e0b] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#c3a98c]">
          <LockKeyhole className="h-3 w-3" />Private to you and the founder
        </span>
      </div>
      <p className="mt-3 max-w-2xl text-xs leading-5 text-[#9d8f7e]">Upload a shooting clip for founder feedback. Cohort submissions are private and separate from your public player video library.</p>

      <div className="mt-4 rounded-2xl border border-[#493e32] bg-[#100e0b] p-3.5 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d2c2ae]">Video title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              placeholder="e.g. Catch-and-shoot reps"
              className="h-10 w-full rounded-md border border-[#493e32] bg-[#17130f] px-3 text-sm text-[#f3e6d5] placeholder:text-[#675d51] focus:outline-none focus:ring-2 focus:ring-[#ef8a43]"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d2c2ae]">Notes for the founder <span className="font-normal normal-case tracking-normal text-[#817567]">optional</span></span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="What would you like feedback on?"
              className="h-10 w-full rounded-md border border-[#493e32] bg-[#17130f] px-3 text-sm text-[#f3e6d5] placeholder:text-[#675d51] focus:outline-none focus:ring-2 focus:ring-[#ef8a43]"
            />
          </label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          className="sr-only"
          aria-label="Choose a cohort video"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="border-[#68482e] bg-[#21180f] text-[#f0b17d] hover:bg-[#352416]">
            <FileVideo className="mr-2 h-4 w-4" />{selectedFile ? "Choose another video" : "Choose video"}
          </Button>
          {selectedFile && <span className="max-w-full truncate text-xs text-[#9d8f7e]">{selectedFile.name}</span>}
          {selectedFile && !isUploading && uploadStatus === "error" && (
            <Button type="button" variant="ghost" onClick={() => void uploadFile(selectedFile)} className="text-[#e8a16a] hover:text-white">Retry upload</Button>
          )}
          {selectedFile && <Button type="button" variant="ghost" onClick={resetUpload} disabled={isUploading} className="text-[#9d8f7e] hover:text-white">Clear</Button>}
          <Button type="button" onClick={() => void submit()} disabled={!uploadedPath || !title.trim() || createSubmission.isPending} className="ml-auto bg-[#ef8a43] font-bold text-[#21150c] hover:bg-[#ff9e5b]">
            {createSubmission.isPending ? "Sending…" : "Send for review"} <Upload className="ml-2 h-4 w-4" />
          </Button>
        </div>
        {isUploading && <div className="mt-3 space-y-2" aria-live="polite"><div className="flex items-center justify-between text-xs text-[#d4a47a]"><span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading video</span><span className="font-mono">{progress}%</span></div><Progress value={progress} className="h-1.5 bg-[#29231c] [&>div]:bg-[#ef8a43]" /></div>}
        {uploadedPath && uploadStatus === "success" && <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-200"><Check className="h-3.5 w-3.5" />Upload complete. Submit it to the founder when ready.</p>}
        {uploadStatus === "error" && uploadError && <p className="mt-3 flex items-center gap-1.5 text-xs text-red-200"><AlertCircle className="h-3.5 w-3.5" />{uploadError.message}</p>}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg uppercase text-[#e8dccb]">Your submissions</h3>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#817567]">{videosQuery.data?.length ?? 0} clips</span>
        </div>
        {videosQuery.isLoading
          ? <p className="rounded-xl border border-[#3b3228] bg-[#100e0b] p-4 text-xs text-[#887c6e]">Loading your submissions…</p>
          : videosQuery.isError
            ? <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] p-4 text-xs text-red-200"><p>Your submissions could not load.</p><Button variant="ghost" onClick={() => videosQuery.refetch()} className="mt-1 px-0 text-red-200">Retry</Button></div>
            : !videosQuery.data?.length
              ? <div className="rounded-xl border border-dashed border-[#514333] bg-[#100e0b] px-4 py-7 text-center"><Video className="mx-auto h-5 w-5 text-[#8e6847]" /><p className="mt-2 text-sm font-semibold text-[#dfd0bd]">No clips submitted yet</p><p className="mt-1 text-xs text-[#817567]">Your founder-only video history will appear here.</p></div>
              : <div className="grid gap-3 sm:grid-cols-2">
                {videosQuery.data.map((video) => (
                  <article key={video.id} className="overflow-hidden rounded-xl border border-[#41372d] bg-[#100e0b]">
                    <video controls playsInline preload="metadata" src={video.mediaUrl} className="aspect-video w-full bg-black" aria-label={video.title} />
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="min-w-0 break-words text-sm font-semibold text-[#f0e3d2]">{video.title}</h4>
                        <span className="shrink-0 font-mono text-[9px] text-[#817567]">{new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                      {video.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#9d8f7e]">{video.description}</p>}
                    </div>
                  </article>
                ))}
              </div>}
      </div>
    </section>
  );
}
