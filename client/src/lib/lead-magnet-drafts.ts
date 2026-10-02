import type { LeadMagnetAnswers, LeadMagnetId } from "@shared/lead-magnet-submissions";

export interface LeadMagnetDraft {
  clientSubmissionId: string;
  leadMagnetId: LeadMagnetId;
  answers: LeadMagnetAnswers;
  resultId: string;
  userId?: string;
  saved?: boolean;
}

const draftKey = (leadMagnetId: LeadMagnetId) => `playr1_lead_magnet_draft:${leadMagnetId}`;

export function readLeadMagnetDraft(leadMagnetId: LeadMagnetId): LeadMagnetDraft | null {
  try {
    const value = localStorage.getItem(draftKey(leadMagnetId));
    if (!value) return null;
    const draft = JSON.parse(value) as LeadMagnetDraft;
    if (
      draft?.leadMagnetId !== leadMagnetId ||
      typeof draft.clientSubmissionId !== "string" ||
      typeof draft.resultId !== "string" ||
      !draft.answers ||
      typeof draft.answers !== "object"
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeLeadMagnetDraft(
  leadMagnetId: LeadMagnetId,
  answers: LeadMagnetAnswers,
  resultId: string,
  existing?: LeadMagnetDraft | null,
): LeadMagnetDraft {
  const answersJson = JSON.stringify(answers);
  const draft = existing?.resultId === resultId && JSON.stringify(existing.answers) === answersJson
    ? existing
    : {
        clientSubmissionId: crypto.randomUUID(),
        leadMagnetId,
        answers,
        resultId,
      };
  localStorage.setItem(draftKey(leadMagnetId), JSON.stringify(draft));
  return draft;
}

export function markLeadMagnetDraftSaved(
  leadMagnetId: LeadMagnetId,
  clientSubmissionId: string,
  userId: string,
): LeadMagnetDraft | null {
  const existing = readLeadMagnetDraft(leadMagnetId);
  if (!existing || existing.clientSubmissionId !== clientSubmissionId) return null;
  const saved = { ...existing, userId, saved: true };
  localStorage.setItem(draftKey(leadMagnetId), JSON.stringify(saved));
  return saved;
}

export function clearLeadMagnetDraft(leadMagnetId: LeadMagnetId): void {
  localStorage.removeItem(draftKey(leadMagnetId));
}