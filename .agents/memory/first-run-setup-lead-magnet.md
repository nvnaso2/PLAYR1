---
name: Seven-day onboarding direction
description: User's proposed schedule-aware onboarding, Day 1 baseline options, and boundary from the current live flow.
---

The intended new player onboarding starts with the familiar sign-in screen. Players choosing to create an account enter email and password first, then complete a separate profile step with their name, training frequency as a count per week or month, usual session length, and next planned session date/time. The preview uses a calendar popover for scheduling. Completing that step takes them into the Hub.

The seven-day journey is embedded in a personalized Hub; schedule each step from the player's training frequency and next-session date rather than assuming consecutive calendar days. Keep the seven dated progress bars full-width and visually blended into the background, without labeling the experience as onboarding; the active bar should have a bright PLAYR1 Pro-orange glow. Place the training rhythm at the upper right with a circular editor for frequency and session length, and show the next session as a prominent orange pill that opens a calendar and time picker. Keep the calendar control beside the day strip. Day 1 opens with “Welcome to The PLAYR1 Project,” then a borderless YouTube-like trailer preview whose channel name is “The PLAYR1 Project” and whose avatar, title, and views/date metadata are editable. Follow it with a responsive holographic shooting chart titled “Here's where your shooting could be,” with highlighted possible endpoints of 80% threes, 70% mid-range, and 90% free throws; show varied month-by-month points, not a smooth straight climb. Keep the three baseline volumes with Balanced (115 attempts) selected by default, let the selected volume affect the projection curve, and use a bottom-sheet stepper for recording makes. Completing the baseline reveals its real starting points and teases the next diagnostic. Baseline volumes are 100 threes + 40 mid-range pull-ups + 25 free throws (165 attempts); 50 + 40 + 25 (115); or 50 + 20 + 15 (85). The colorful one-year chart is illustrative and must not imply guaranteed results.

The current admin preview should focus on the first-session experience inside the existing Hub shell; do not add a seven-day selector or placeholder days unless requested again. Keep the preview immersive by hiding app navigation and using a compact page selector to move between sign-in, account creation, profile, and the Day 1 Hub, with a nearby X to exit back to Admin. Keep the Day 1 Hub visually consistent with PLAYR1's black-and-orange app experience, with clear hierarchy and interactive baseline feedback. Keep this prototype separate from the current live onboarding until the user explicitly asks to migrate the player-facing flow. The public lead-magnet quiz remains a separate experience.

**Why:** the user wants an immersive path that reuses the familiar account-entry aesthetic, asks schedule questions after account credentials, and then keeps the first-session experience inside the Hub with an motivating progress visualization and useful first-day interactions.

**How to apply:** preserve the exact baseline counts above; do not change live onboarding while iterating on the preview. Reuse the existing AuthPage and actual Hub shell, keep account creation and profile questions visually consistent with the sign-in screen, use styled dropdowns and a calendar popover for schedule answers, keep every preview page under the onboarding-preview route, and use the page selector plus its adjacent exit control as the only preview controls. Preview submissions stay local and never call auth APIs.

## Current live flow and lead-magnet boundary

The public lead-magnet quiz happens outside the PLAYR1 app and remains independent. The current in-app setup is still a separate five-step flow, and new accounts are created only at step 5 after player details are collected. Incomplete setup still gates player access after login.

**Why:** the day-based experience is being designed in the admin preview first; the existing live flow remains in place until the user asks for rollout.

**How to apply:** keep quiz data and app-setup completion separate; only use matching quiz answers as optional prefill, never treat quiz completion as app-setup completion.

## Retired setup answers

When a setup field is retired, remove it from the current prompts, validation, and new completion payloads, but preserve its previously saved value when completing setup.

**Why:** the user asked to stop collecting customized-drill email without deleting older saved setup data.

**How to apply:** keep legacy answer keys in storage merges, but do not repopulate them from account data or write new values; keep the public lead-magnet quiz separate.