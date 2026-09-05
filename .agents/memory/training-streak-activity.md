---
name: Training streak activity
description: Defines how workout completion modes affect streaks without weakening Daily Challenge semantics.
---

Any successfully saved workout counts toward the player's training streak once per server-authoritative day, whether it uses Quick Complete or detailed stat tracking. Daily Challenge completion remains separate and only occurs when the assigned challenge drill is actually completed.

**Why:** Completion-only workouts should receive the same engagement credit as tracked workouts, while client-supplied dates must not allow streak fabrication or early challenge completion.

**How to apply:** Keep streak updates idempotent and monotonic, derive the streak date on the server, and do not make metric entry a prerequisite for streak credit.