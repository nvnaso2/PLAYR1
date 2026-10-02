import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  markLeadMagnetDraftSaved,
  readLeadMagnetDraft,
  writeLeadMagnetDraft,
  type LeadMagnetDraft,
} from "@/lib/lead-magnet-drafts";
import type { LeadMagnetAnswers, LeadMagnetId } from "@shared/lead-magnet-submissions";

const APP_STORE_URL = "https://apps.apple.com/us/app/playr1/id6760975698";

interface LeadMagnetResultGateProps {
  leadMagnetId: LeadMagnetId;
  resultId: string;
  answers: LeadMagnetAnswers;
  children: React.ReactNode;
}

export function LeadMagnetResultGate({
  leadMagnetId,
  resultId,
  answers,
  children,
}: LeadMagnetResultGateProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const answersJson = useMemo(() => JSON.stringify(answers), [answers]);
  const [draft, setDraft] = useState<LeadMagnetDraft | null>(() => readLeadMagnetDraft(leadMagnetId));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "account-mismatch">("idle");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const current = readLeadMagnetDraft(leadMagnetId);
    const matchesResult = current?.resultId === resultId && JSON.stringify(current.answers) === answersJson;
    const matchingDraft = matchesResult ? current : null;
    setDraft(matchingDraft);

    if (isLoading || !isAuthenticated || !user) {
      setStatus("idle");
      return;
    }

    if (matchingDraft?.userId && matchingDraft.userId !== user.id) {
      setStatus("account-mismatch");
      return;
    }

    if (matchingDraft?.saved && matchingDraft.userId === user.id) {
      setStatus("saved");
      return;
    }

    const submission = matchingDraft ?? writeLeadMagnetDraft(
      leadMagnetId,
      JSON.parse(answersJson) as LeadMagnetAnswers,
      resultId,
    );
    setDraft(submission);
    setStatus("saving");
    let cancelled = false;

    apiRequest("POST", "/api/lead-magnets/submissions", {
      leadMagnetId,
      clientSubmissionId: submission.clientSubmissionId,
      answers: submission.answers,
    })
      .then(() => {
        if (cancelled) return;
        const savedDraft = markLeadMagnetDraftSaved(leadMagnetId, submission.clientSubmissionId, user.id);
        setDraft(savedDraft);
        setStatus("saved");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [answersJson, isAuthenticated, isLoading, leadMagnetId, resultId, retryNonce, user]);

  const openAuth = () => {
    const existing = readLeadMagnetDraft(leadMagnetId);
    const matchingDraft = existing?.resultId === resultId && JSON.stringify(existing.answers) === answersJson
      ? existing
      : null;
    const savedDraft = writeLeadMagnetDraft(
      leadMagnetId,
      JSON.parse(answersJson) as LeadMagnetAnswers,
      resultId,
      matchingDraft,
    );
    setDraft(savedDraft);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const mode = savedDraft.userId ? "login" : "register";
    navigate(`/auth?mode=${mode}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const retrySave = () => {
    const current = readLeadMagnetDraft(leadMagnetId);
    if (!current || !user || current.userId && current.userId !== user.id) return;
    setDraft({ ...current, saved: false });
    setRetryNonce((current) => current + 1);
  };

  const unlocked = !!user && status === "saved" && draft?.userId === user.id;

  return (
    <div className="mt-6">
      {unlocked ? (
        <>
          {children}
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Check className="h-4 w-4 shrink-0" />
              Result saved to your PLAYR1 account.
            </p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-orange-300 underline-offset-4 hover:underline"
            >
              Get PLAYR1 for iPhone or iPad <ArrowRight className="ml-1 inline h-4 w-4" />
            </a>
          </div>
        </>
      ) : (
        <section className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-zinc-950 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-300">
              <LockKeyhole className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Your drills are ready</p>
              <h3 className="mt-1 text-lg font-black text-white">
                {isAuthenticated ? "Saving your result" : "Unlock your personalized drills"}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
                {isAuthenticated
                  ? "Your answers are being saved to your account so you can access these drills."
                  : "Create a free PLAYR1 account or sign in to save this result and access the drills matched to your answers."}
              </p>
              {status === "saving" && (
                <p className="mt-3 text-xs font-semibold text-zinc-400">Saving your result…</p>
              )}
              {status === "error" && (
                <p className="mt-3 text-xs font-semibold text-red-300">
                  We couldn’t save your result. Please try again.
                  <button type="button" onClick={retrySave} className="ml-2 underline underline-offset-2">
                    Retry
                  </button>
                </p>
              )}
              {status === "account-mismatch" && (
                <p className="mt-3 text-xs font-semibold text-amber-200">
                  This result is saved to a different PLAYR1 account. Sign in to that account, or retake the quiz.
                </p>
              )}
              {!isAuthenticated && (
                <Button
                  type="button"
                  onClick={openAuth}
                  disabled={isLoading}
                  className="mt-4 bg-orange-500 font-black text-black hover:bg-orange-400"
                >
                  {draft?.userId ? "Sign in to unlock" : "Continue with email"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {isAuthenticated && status === "error" && (
                <Button type="button" onClick={retrySave} className="mt-4 bg-orange-500 font-black text-black hover:bg-orange-400">
                  Retry saving your result
                </Button>
              )}
              {isAuthenticated && status === "saving" && (
                <span className="sr-only" role="status">Saving your result to your account.</span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}