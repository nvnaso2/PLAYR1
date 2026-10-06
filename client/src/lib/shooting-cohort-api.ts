import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  ShootingCohortApplicationAnswers,
  ShootingCohortAssessmentInput,
  ShootingCohortAssessmentType,
  ShootingCohortThreePointResults,
  ShootingCohortMidRangeResults,
  ShootingCohortOffDribbleResults,
  ShootingCohortSpotUpResults,
  ShootingCohortStatus,
  AdminShootingCohortStatus,
  ShootingCohortVideoSubmissionInput,
} from "@shared/shooting-cohort";

export type ShootingCohortSettings = {
  capacity: number;
  applicationsOpen: boolean;
  goalThreePointPercent?: number | null;
  goalMidRangePercent?: number | null;
  goalFreeThrowPercent?: number | null;
  activeCount?: number;
  invitedCount?: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type ShootingCohortAssessmentRecord = {
  id: string;
  userId: string;
  type: ShootingCohortAssessmentType;
  protocolVersion: number;
  distanceFeet?: number | null;
  freeThrowsMade: number;
  spotUpResults?: ShootingCohortSpotUpResults | null;
  offDribbleResults?: ShootingCohortOffDribbleResults | null;
  threePointResults?: ShootingCohortThreePointResults | null;
  midRangeResults?: ShootingCohortMidRangeResults | null;
  notes?: string | null;
  createdAt: string;
};

export type ShootingCohortApplicationRecord = {
  id: string;
  userId: string;
  status: ShootingCohortStatus;
  answers: ShootingCohortApplicationAnswers;
  appliedAt: string;
  invitedAt?: string | null;
  acceptedAt?: string | null;
};

export type ShootingCohortPlayerData = {
  settings: ShootingCohortSettings;
  application: ShootingCohortApplicationRecord | null;
  assessments: ShootingCohortAssessmentRecord[];
  waitlistCount: number;
};

export type ShootingCohortAdminApplication = ShootingCohortApplicationRecord & {
  displayName?: string | null;
  email?: string | null;
  profilePhotoUrl?: string | null;
  assessments: ShootingCohortAssessmentRecord[];
};

export type ShootingCohortAdminData = {
  settings: ShootingCohortSettings;
  counts: { active: number; invited: number; waitlisted: number; needsReview: number };
  applications: ShootingCohortAdminApplication[];
};

export type ShootingCohortNotificationCounts = {
  applications: number;
  filmReview: number;
  customRequests: number;
};

export const SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY = [
  "/api/admin/shooting-cohort/notification-counts",
] as const;

export type ShootingCohortChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  displayName: string;
  profilePhotoUrl?: string | null;
};

export type ShootingCohortVideoSubmission = {
  id: string;
  userId: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  description?: string | null;
  createdAt: string;
  workoutRequestId?: string | null;
  founderFeedback?: string | null;
  feedbackUpdatedAt?: string | null;
  displayName?: string | null;
  email?: string | null;
};

async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await apiRequest(method, path, body);
  return response.json() as Promise<T>;
}

export function useShootingCohortQuery() {
  return useQuery<ShootingCohortPlayerData>({
    queryKey: ["/api/shooting-cohort"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useShootingCohortAdminQuery() {
  return useQuery<ShootingCohortAdminData>({
    queryKey: ["/api/admin/shooting-cohort"],
    refetchInterval: 15000,
  });
}

export function useShootingCohortAdminNotificationCounts(enabled = true) {
  return useQuery<ShootingCohortNotificationCounts>({
    queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY,
    enabled,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

export function useShootingCohortMessagesQuery(enabled = true) {
  return useQuery<ShootingCohortChatMessage[]>({
    queryKey: ["/api/shooting-cohort/messages"],
    enabled,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useSubmitShootingCohortApplication() {
  return useMutation({
    mutationFn: (answers: ShootingCohortApplicationAnswers) =>
      requestJson<{ application: ShootingCohortApplicationRecord }>("POST", "/api/shooting-cohort/applications", answers),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/custom-workout-requests"] }),
      ]);
    },
  });
}

export function useUpdateShootingCohortApplication() {
  return useMutation({
    mutationFn: (answers: ShootingCohortApplicationAnswers) =>
      requestJson<{ application: ShootingCohortApplicationRecord }>("PATCH", "/api/shooting-cohort/application", answers),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
      ]);
    },
  });
}

export function useRespondToShootingCohortInvitation() {
  return useMutation({
    mutationFn: (response: "accept" | "decline") =>
      requestJson<{ application: ShootingCohortApplicationRecord }>("POST", "/api/shooting-cohort/invitation-response", { response }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/custom-workout-requests"] }),
      ]);
    },
  });
}

export function useSubmitShootingCohortAssessment() {
  return useMutation({
    mutationFn: (assessment: ShootingCohortAssessmentInput) =>
      requestJson<{ assessment: ShootingCohortAssessmentRecord }>("POST", "/api/shooting-cohort/assessments", assessment),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort/assessments"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
      ]);
    },
  });
}

export function useShootingCohortAssessmentsQuery() {
  return useQuery<ShootingCohortAssessmentRecord[]>({
    queryKey: ["/api/shooting-cohort/assessments"],
  });
}

export function useShootingCohortVideoSubmissionsQuery() {
  return useQuery<ShootingCohortVideoSubmission[]>({
    queryKey: ["/api/shooting-cohort/videos"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminShootingCohortVideoSubmissionsQuery(applicationId: string, enabled: boolean) {
  return useQuery<ShootingCohortVideoSubmission[]>({
    queryKey: [`/api/admin/shooting-cohort/applications/${encodeURIComponent(applicationId)}/videos`],
    enabled,
    refetchInterval: 30000,
  });
}

export function useAllAdminShootingCohortVideoSubmissionsQuery() {
  return useQuery<ShootingCohortVideoSubmission[]>({
    queryKey: ["/api/admin/shooting-cohort/videos"],
    refetchInterval: 30000,
  });
}

export function useUpdateShootingCohortVideoFeedback() {
  return useMutation({
    mutationFn: ({ videoId, feedback }: { videoId: string; feedback: string }) =>
      requestJson<{ video: ShootingCohortVideoSubmission }>(
        "PATCH",
        `/api/admin/shooting-cohort/videos/${encodeURIComponent(videoId)}/feedback`,
        { feedback },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort/videos"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort/videos"] }),
        queryClient.invalidateQueries({ queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY }),
      ]);
    },
  });
}

export function useCreateShootingCohortVideoSubmission() {
  return useMutation({
    mutationFn: (submission: ShootingCohortVideoSubmissionInput) =>
      requestJson<{ id: string }>("POST", "/api/shooting-cohort/videos", submission),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort/videos"] });
    },
  });
}

export function useUpdateShootingCohortSettings() {
  return useMutation({
    mutationFn: (settings: {
      capacity: number;
      applicationsOpen: boolean;
      goalThreePointPercent: number | null;
      goalMidRangePercent: number | null;
      goalFreeThrowPercent: number | null;
    }) =>
      requestJson<{ settings: ShootingCohortSettings }>("PATCH", "/api/admin/shooting-cohort/settings", settings),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY }),
      ]);
    },
  });
}

export function useInviteShootingCohortApplicant() {
  return useMutation({
    mutationFn: (applicationId: string) =>
      requestJson<{ application: ShootingCohortApplicationRecord }>("POST", `/api/admin/shooting-cohort/applications/${encodeURIComponent(applicationId)}/invite`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
      ]);
    },
  });
}

export function useSetShootingCohortApplicationStatus() {
  return useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: AdminShootingCohortStatus }) =>
      requestJson<{ application: ShootingCohortApplicationRecord }>(
        "PATCH",
        `/api/admin/shooting-cohort/applications/${encodeURIComponent(applicationId)}/status`,
        { status },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/custom-workout-requests"] }),
        queryClient.invalidateQueries({ queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY }),
      ]);
    },
  });
}

export function useRemoveShootingCohortApplication() {
  return useMutation({
    mutationFn: (applicationId: string) =>
      requestJson<{ application: ShootingCohortApplicationRecord }>("DELETE", `/api/admin/shooting-cohort/applications/${encodeURIComponent(applicationId)}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/custom-workout-requests"] }),
        queryClient.invalidateQueries({ queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY }),
      ]);
    },
  });
}

export function useSendShootingCohortMessage() {
  return useMutation({
    mutationFn: (content: string) =>
      requestJson<ShootingCohortChatMessage>("POST", "/api/shooting-cohort/messages", { content }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort/messages"] });
    },
  });
}

export function useRemoveShootingCohortMessage() {
  return useMutation({
    mutationFn: (messageId: string) =>
      requestJson<{ success: boolean }>("DELETE", `/api/admin/shooting-cohort/messages/${encodeURIComponent(messageId)}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/shooting-cohort/messages"] });
    },
  });
}