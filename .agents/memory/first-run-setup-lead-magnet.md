---
name: Seven-day onboarding direction
description: User's proposed schedule-aware onboarding, Day 1 baseline options, and boundary from the current live flow.
---

The intended new player onboarding starts with the familiar sign-in screen. Players choosing to create an account enter email and password first, then complete a separate profile step with their name, training days per week, next planned training session, and expected session length. Completing that step takes them into the Hub.

The seven-day onboarding is embedded in a personalized Hub that gradually reveals content. Day 1 should contain only a one-session shooting baseline followed by its visual result and the PLAYR1 trailer. The baseline has three volumes: 100 threes + 40 mid-range pull-ups + 25 free throws (165 attempts); 50 + 40 + 25 (115); or 50 + 20 + 15 (85).

The current admin preview should focus on the first-session experience inside the existing Hub shell; do not add a seven-day selector or placeholder days unless requested again. Keep this prototype separate from the current live onboarding until the user explicitly asks to migrate the player-facing flow. The public lead-magnet quiz remains a separate experience.

**Why:** the user wants an immersive path that reuses the familiar account-entry aesthetic, asks schedule questions after account credentials, and then keeps Day 1 inside the Hub and focused on two experiences.

**How to apply:** preserve this order and the exact baseline counts above; do not change live onboarding while iterating on the preview. Reuse the existing AuthPage and actual Hub shell, keep the schedule questions between signup and Hub, and make the first-session baseline the Hub’s central interactive graph/logger. Preview submissions stay local and never call auth APIs.

## Current live flow and lead-magnet boundary

The public lead-magnet quiz happens outside the PLAYR1 app and remains independent. The current in-app setup is still a separate five-step flow, and new accounts are created only at step 5 after player details are collected. Incomplete setup still gates player access after login.

**Why:** the day-based experience is being designed in the admin preview first; the existing live flow remains in place until the user asks for rollout.

**How to apply:** keep quiz data and app-setup completion separate; only use matching quiz answers as optional prefill, never treat quiz completion as app-setup completion.

## Retired setup answers

When a setup field is retired, remove it from the current prompts, validation, and new completion payloads, but preserve its previously saved value when completing setup.

**Why:** the user asked to stop collecting customized-drill email without deleting older saved setup data.

**How to apply:** keep legacy answer keys in storage merges, but do not repopulate them from account data or write new values; keep the public lead-magnet quiz separate.