---
name: Seven-day onboarding direction
description: User's proposed schedule-aware onboarding, Day 1 baseline options, and boundary from the current live flow.
---

The intended new player onboarding is spread across a seven-day journey tailored to each player's stated training frequency. Day 1 should be short: account details, training days per week, next planned training session, and expected session length. Its shooting baseline is completed in one session, with one of three volumes: 100 threes + 40 mid-range pull-ups + 25 free throws (165 attempts); 50 + 40 + 25 (115); or 50 + 20 + 15 (85). Day 1 also includes the PLAYR1 trailer and a motivating progress visualization based on the player's baseline.

The admin preview can demonstrate all seven days, but Days 2–7 need user-approved content. Keep this prototype separate from the current live onboarding until the user explicitly asks to migrate the player-facing flow. The public lead-magnet quiz remains a separate experience.

**Why:** the user wants onboarding short and actionable on Day 1, with follow-on experiences paced to when players actually train. The baseline is deliberately a single-day session with three workload options.

**How to apply:** use the exact baseline counts above; do not change live onboarding or invent Days 2–7 content while iterating on the preview. Treat progress forecasts as illustrative and grounded in measured baseline data.

## Current live flow and lead-magnet boundary

The public lead-magnet quiz happens outside the PLAYR1 app and remains independent. The current in-app setup is still a separate five-step flow, and new accounts are created only at step 5 after player details are collected. Incomplete setup still gates player access after login.

**Why:** the day-based experience is being designed in the admin preview first; the existing live flow remains in place until the user asks for rollout.

**How to apply:** keep quiz data and app-setup completion separate; only use matching quiz answers as optional prefill, never treat quiz completion as app-setup completion.

## Retired setup answers

When a setup field is retired, remove it from the current prompts, validation, and new completion payloads, but preserve its previously saved value when completing setup.

**Why:** the user asked to stop collecting customized-drill email without deleting older saved setup data.

**How to apply:** keep legacy answer keys in storage merges, but do not repopulate them from account data or write new values; keep the public lead-magnet quiz separate.