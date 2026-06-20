---
name: Assessment scoring engine
description: PLAYR1 Assessment System — client-side coded scoring replaces OpenAI GPT call
---

## Rule
The onboarding assessment scoring runs entirely client-side in welcome.tsx (computeResults). The backend /api/onboarding/assess receives `{ result: AssessmentResult, answers: Record<string,string> }` and stores it — no AI call.

**Why:** OpenAI call added latency, cost, and non-determinism. Coded engine gives instant, consistent, testable results and lets the spec doc define exact scoring logic.

**How to apply:** Any future changes to scoring logic go in welcome.tsx scoring functions (scoreArchetype, scoreStage, scoreBottleneck, scoreMindset, scoreDedication, scoreExperience). Backend only stores, never computes.
