import { confidenceRealityQuestions, confidenceRealityResults } from "@/lib/confidence-reality-check";
import {
  footworkCourtRoles,
  footworkFollowUpQuestions,
  footworkResults,
  footworkShotSources,
} from "@/lib/footwork-open-shots-diagnostic";
import { shootingMechanicsBranches, shootingMechanicsResults } from "@/lib/shooting-mechanics-diagnostic";

export type LeadMagnetAnalyticsOption = { id: string; label: string };
export type LeadMagnetAnalyticsQuestion = {
  id: string;
  title: string;
  answers: LeadMagnetAnalyticsOption[];
};
export type LeadMagnetAnalyticsDefinition = {
  id: string;
  title: string;
  questions: LeadMagnetAnalyticsQuestion[];
  results: LeadMagnetAnalyticsOption[];
};

export const leadMagnetAnalyticsCatalog: LeadMagnetAnalyticsDefinition[] = [
  {
    id: "shooting-mechanics",
    title: "Shooting Mechanics",
    questions: [
      {
        id: "q1",
        title: "Primary shooting concern",
        answers: [
          { id: "spray", label: "Misses left/right (spray)" },
          { id: "short", label: "Shot feels like a chore; misses short" },
          { id: "clunky", label: "Robotic or clunky shooting motion" },
        ],
      },
      ...Object.entries(shootingMechanicsBranches).map(([branch, question]) => ({
        id: `q2-${branch}`,
        title: question.question,
        answers: question.answers.map((answer) => ({ id: answer.id, label: answer.text })),
      })),
    ],
    results: Object.entries(shootingMechanicsResults).map(([id, result]) => ({
      id,
      label: result.cue,
    })),
  },
  {
    id: "footwork-open-shots",
    title: "Footwork That Leads to Open Shots",
    questions: [
      {
        id: "q1",
        title: "Court role",
        answers: footworkCourtRoles.map((role) => ({ id: role.id, label: role.label })),
      },
      {
        id: "q2",
        title: "Preferred scoring situation",
        answers: footworkShotSources.map((source) => ({ id: source.id, label: source.label })),
      },
      ...Object.entries(footworkFollowUpQuestions).map(([source, question]) => ({
        id: `q3-${source}`,
        title: question.question,
        answers: question.answers.map((answer) => ({ id: answer.id, label: answer.text })),
      })),
    ],
    results: Object.entries(footworkResults).map(([id, result]) => ({
      id,
      label: result.title,
    })),
  },
  {
    id: "confidence-reality-check",
    title: "Confidence Reality Check",
    questions: [
      {
        id: "q1",
        title: confidenceRealityQuestions.q1.question,
        answers: confidenceRealityQuestions.q1.answers.map((answer) => ({
          id: answer.id,
          label: `${answer.label} — ${answer.description}`,
        })),
      },
      {
        id: "q2",
        title: confidenceRealityQuestions.q2.question,
        answers: confidenceRealityQuestions.q2.answers.map((answer) => ({
          id: answer.id,
          label: `${answer.label} — ${answer.description}`,
        })),
      },
      {
        id: "q3",
        title: confidenceRealityQuestions.q3.question,
        answers: confidenceRealityQuestions.q3.answers.map((answer) => ({
          id: answer.id,
          label: answer.text,
        })),
      },
    ],
    results: Object.entries(confidenceRealityResults).map(([id, result]) => ({
      id,
      label: result.title,
    })),
  },
];