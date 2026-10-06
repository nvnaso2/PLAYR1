---
name: Workout builder flow
description: Captures the confirmed low-friction entry pattern for selecting drills and deciding what to do with them.
---

Start Workout and Create Workout should both enter the same Drill Library card-selection experience. After visually browsing and selecting drills, the player can save the combination, start Quick Complete, or start detailed stat tracking.

**Why:** The user confirmed that visual drill cards and multi-select provide the right context and remove the friction of remembering drill names in a separate builder.

**How to apply:** Keep workout entry points converged on the shared library selector rather than creating new name-only drill pickers or divergent selection dialogs.

All of a player's saved workout templates, including Coach P-generated workouts, should be visible in Training Log whether or not they are favorites, with a direct way to start each one. Keep favorite drills in their own section.

**Why:** The user noticed saved workouts were being created but were not discoverable because the Training Log only surfaced favorite workouts.

**How to apply:** Show the authenticated player's complete personal workout list and launch each saved template through the existing workout-start flow.

Detailed stat tracking should omit per-round notes and per-round challenge selectors. Show timer entry only for drills with a required timer metric; keep challenge assignment at the workout or drill level.

**Why:** The user asked to simplify round entry and show time only for actual required time drills.

**How to apply:** Keep each round focused on its required performance metrics and shot location, without optional notes or individual challenge controls.