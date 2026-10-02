import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCoachPWorkoutIntake,
  normalizeCoachPWorkoutAnswers,
  normalizeCoachPWorkoutResponse,
  recommendCoachPWorkoutFocus,
} from "../server/coach-p-workouts";

const catalog = [
  { id: "drill-1", title: "Change of Pace" },
  { id: "drill-2", title: "Corner Threes" },
];

describe("Coach P workout contract", () => {
  it("prioritizes a profile-based focus in the workout clarification flow", () => {
    assert.equal(recommendCoachPWorkoutFocus(["Shooting is the main assessment bottleneck"]), "shooting");
    assert.equal(recommendCoachPWorkoutFocus(["Ball Handling", "Shooting"]), "ball-handling");
    assert.equal(recommendCoachPWorkoutFocus(["Decision-making", "Passing"]), "decision-making");
    const intake = createCoachPWorkoutIntake({
      intro: "I reviewed your recent sessions.",
      recommendedFocus: "shooting",
    });
    const focusQuestion = intake.questions.find((question) => question.id === "primaryFocus");
    assert.equal(intake.intro, "I reviewed your recent sessions.");
    assert.equal(intake.questions[0].id, "primaryFocus");
    assert.match(focusQuestion?.question ?? "", /Shooting and shot-making/);
    assert.equal(focusQuestion?.options[0].value, "shooting");
  });

  it("normalizes the required workout intake and rejects invalid combinations", () => {
    assert.deepEqual(normalizeCoachPWorkoutAnswers({
      durationMinutes: "45",
      setting: "partner",
      primaryFocus: "shooting",
      secondaryFocuses: ["finishing", "footwork"],
    }), {
      durationMinutes: 45,
      setting: "partner",
      primaryFocus: "shooting",
      secondaryFocuses: ["finishing", "footwork"],
    });
    assert.throws(
      () => normalizeCoachPWorkoutAnswers({
        durationMinutes: 30,
        setting: "solo",
        primaryFocus: "shooting",
        secondaryFocuses: ["shooting", "footwork"],
      }),
      /two different secondary focuses/,
    );
  });

  it("normalizes a catalog-backed workout and preserves order and guidance", () => {
    const result = normalizeCoachPWorkoutResponse(JSON.stringify({
      response: "This session targets your first-step scoring.",
      workout: {
        title: "First-Step Scoring",
        description: "Build a sharper attack.",
        selectionRationale: "These drills connect the first step to a balanced finish.",
        durationMinutes: 35,
        success: "Finish at least 7 of 10 attacks with balance.",
        drills: [
          { id: "drill-2", duration: 12, sets: 3, reps: 8, notes: "Land balanced." },
          { drillId: "drill-1", durationMinutes: 18, reps: 10, coachingNotes: "Change speed after the read." },
        ],
      },
    }), catalog);

    assert.equal(result.workout?.name, "First-Step Scoring");
    assert.equal(result.workout?.selectionRationale, "These drills connect the first step to a balanced finish.");
    assert.deepEqual(result.workout?.drills.map((drill) => drill.drillId), ["drill-2", "drill-1"]);
    assert.equal(result.workout?.drills[0].title, "Corner Threes");
    assert.equal(result.workout?.drills[0].sets, 3);
    assert.equal(result.workout?.drills[1].reps, 10);
  });

  it("supports one focused clarification without creating a workout", () => {
    const result = normalizeCoachPWorkoutResponse({
      response: "I can build this around your shooting goal.",
      followUpQuestion: "How much time do you have for this session?",
      workout: null,
    }, catalog);

    assert.equal(result.workout, null);
    assert.equal(result.followUpQuestion, "How much time do you have for this session?");
  });

  it("rejects empty, malformed, and unavailable-drill output", () => {
    assert.throws(
      () => normalizeCoachPWorkoutResponse("", catalog),
      /empty workout output/,
    );
    assert.throws(
      () => normalizeCoachPWorkoutResponse("not json", catalog),
      /malformed workout output/,
    );
    assert.throws(
      () => normalizeCoachPWorkoutResponse({
        response: "Here is your plan.",
        workout: {
          name: "Invalid",
          purpose: "Test",
          successMeasure: "Test",
          drills: [{ drillId: "not-in-catalog", durationMinutes: 10 }],
        },
      }, catalog),
      /unavailable drill/,
    );
  });
});