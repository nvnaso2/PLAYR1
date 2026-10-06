import { useEffect, useState } from "react";
import { Film, MessageSquareText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useAllAdminShootingCohortVideoSubmissionsQuery,
  useUpdateShootingCohortVideoFeedback,
  type ShootingCohortVideoSubmission,
} from "@/lib/shooting-cohort-api";

function FilmReviewCard({
  submission,
  saving,
  onSave,
}: {
  submission: ShootingCohortVideoSubmission;
  saving: boolean;
  onSave: (feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState(submission.founderFeedback ?? "");
  useEffect(() => setFeedback(submission.founderFeedback ?? ""), [submission.founderFeedback]);
  const playerName = submission.displayName?.trim() || "Cohort player";

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151411]">
      <video controls playsInline preload="metadata" src={submission.mediaUrl} className="aspect-video w-full bg-black" aria-label={submission.title} />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-orange-200">{playerName}</p>
            <h3 className="mt-1 break-words font-heading text-lg font-semibold text-stone-100">{submission.title}</h3>
            {submission.email && <p className="mt-1 break-all text-[10px] text-stone-500">{submission.email}</p>}
          </div>
          <time className="shrink-0 rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[9px] text-stone-500">
            {new Date(submission.createdAt).toLocaleDateString()}
          </time>
        </div>
        {submission.description && <p className="whitespace-pre-wrap text-xs leading-5 text-stone-400">{submission.description}</p>}
        {submission.workoutRequestId && (
          <p className="rounded-lg border border-orange-300/10 bg-orange-300/[0.04] px-3 py-2 text-[10px] text-orange-100/80">
            Attached to a custom workout request
          </p>
        )}
        <div className="space-y-2 border-t border-white/[0.07] pt-3">
          <label htmlFor={`film-feedback-${submission.id}`} className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-400">
            <MessageSquareText className="h-3.5 w-3.5 text-orange-200" />Feedback for player
          </label>
          <Textarea
            id={`film-feedback-${submission.id}`}
            value={feedback}
            maxLength={2000}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Add a shooting cue or next step…"
            className="min-h-24 resize-y border-white/10 bg-[#0d0d0c] text-sm leading-5 text-stone-200 placeholder:text-stone-600 focus-visible:ring-orange-400"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] text-stone-600">
              {submission.feedbackUpdatedAt
                ? `Last updated ${new Date(submission.feedbackUpdatedAt).toLocaleDateString()}`
                : "Feedback is private to this player"}
            </p>
            <Button
              onClick={() => onSave(feedback)}
              disabled={saving || feedback.trim() === (submission.founderFeedback ?? "").trim()}
              className="h-9 bg-orange-400 px-3 text-xs font-bold text-[#17120d] hover:bg-orange-300"
            >
              {saving ? "Saving…" : "Save feedback"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminShootingCohortFilmReview() {
  const { toast } = useToast();
  const query = useAllAdminShootingCohortVideoSubmissionsQuery();
  const updateFeedback = useUpdateShootingCohortVideoFeedback();

  const saveFeedback = async (videoId: string, feedback: string) => {
    try {
      await updateFeedback.mutateAsync({ videoId, feedback: feedback.trim() });
      toast({ title: "Feedback saved", description: "The player can now see your notes in Film Room." });
    } catch (error) {
      toast({
        title: "Feedback not saved",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="space-y-4" aria-label="Shooting Cohort film review">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-200"><Film className="h-3.5 w-3.5" />Private cohort submissions</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-stone-100">Film Review</h2>
          <p className="mt-1 text-xs text-stone-500">Review active members’ clips and leave feedback visible only to that player.</p>
        </div>
        <span className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[9px] text-stone-500">
          {query.data?.length ?? 0} clips
        </span>
      </header>
      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading cohort video submissions">
          {[0, 1, 2].map((item) => <div key={item} className="aspect-video animate-pulse rounded-2xl border border-white/[0.07] bg-[#151411]" />)}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.04] p-5 text-center">
          <p className="text-sm font-semibold text-rose-200">Film submissions could not load.</p>
          <Button variant="ghost" onClick={() => void query.refetch()} className="mt-1 text-rose-200">Retry</Button>
        </div>
      ) : !query.data?.length ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#131310] px-5 py-12 text-center">
          <Video className="mx-auto h-6 w-6 text-orange-200/70" />
          <p className="mt-3 font-heading text-lg font-semibold text-stone-200">No active member clips yet</p>
          <p className="mt-1 text-xs text-stone-600">New Film Room submissions will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.map((submission) => (
            <FilmReviewCard
              key={submission.id}
              submission={submission}
              saving={updateFeedback.isPending && updateFeedback.variables?.videoId === submission.id}
              onSave={(feedback) => void saveFeedback(submission.id, feedback)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
