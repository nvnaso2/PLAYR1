---
name: Streak Challenge DB setup
description: How streak challenge tables were created and are maintained
---
Tables: streak_challenges, streak_challenge_participants, streak_challenge_attempts
Created via direct SQL (drizzle-kit push is interactive, was skipped).
Seed slug: "fifty-in-a-row". Seed skips if already exists.
joinStreakChallenge storage method accepts `initialBestRecord` extra field (not in schema) to seed bestRecord on first join.

**Why:** drizzle push requires TTY interaction; direct SQL avoids the prompt.
**How to apply:** Any new streak-related tables must also be created via direct SQL or a migration script.
