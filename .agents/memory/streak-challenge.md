---
name: Streak Challenge Feature
description: Self-reported ongoing leaderboard challenge, separate from statChallenges and challenges tables.
---

## Key decisions

**Why new tables, not reuse existing:** `statChallenges` auto-score from training logs (automated, time-boxed). `challenges` are drill-based. The streak challenge is self-reported, open-ended, personal-goal based — fundamentally different paradigm. Tables: `streak_challenges`, `streak_challenge_participants`, `streak_challenge_attempts`.

**Why direct SQL for migration:** `drizzle-kit push` is interactive when it detects similar existing tables (leaderboard_challenges, lc_participants) and asks if you want to rename. Use `node -e` with pg Pool to CREATE TABLE IF NOT EXISTS to bypass the prompt.

**Why:**
- The interactive drizzle-kit prompt cannot be bypassed with `--force` alone when it sees potentially-related tables
- Direct SQL is safe since we use `IF NOT EXISTS`

**Route used:** `/streak-challenges/:slug` (distinct from `/compete/challenges/:slug` which points to StatChallengePage)

**Leaderboard sort modes:** best (bestRecord DESC), closest (goal - record ASC), percent (record/goal DESC)

**Video sharing:** URL only (YouTube/TikTok/Instagram) — no direct upload. Field is `videoUrl` on attempts.

**Seed slug:** `fifty-in-a-row` — the "50-in-a-Row 3-Point Challenge"
