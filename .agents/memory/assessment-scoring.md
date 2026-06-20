---
name: Assessment scoring engine
description: PLAYR1 Assessment System — client-side coded scoring, no AI
---

## Rule
Scoring runs entirely client-side in welcome.tsx (computeResults). Backend /api/onboarding/assess receives { result, answers } and stores — no AI call.

**Archetype**: Uses Q1 (×4), Q2 (×3), Q5 (×2), Q6 (×1), Q4 (×1), Q14 (×1). Tie-break: distinct question count, then Q2 priority.

**Stage**: Uses Q4 (0-8) + Q16 (0-8) + Q3 (0-4) + Q14 (0-4) = 0-24 pts → 6 thresholds. Adding more questions here makes results more answer-sensitive.

**Bottleneck**: Q6 (×4), Q7 (×3), Q8 (×3) across 8 categories.

**Preview mode bug fixed**: In preview mode, computeResults(answers) is used (not hardcoded MOCK_RESULTS) so results actually reflect the answers given.

**Why:** OpenAI call was costly, slow, non-deterministic. Coded engine is instant and testable.
