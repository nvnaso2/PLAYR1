---
name: Workout tracking presentation
description: Visual constraints for the full-screen active workout and Track Stats cards.
---

Show the active workout as an inset, rounded white surface with visible dark space above it and around its edges, matching the rounded workout preview modal rather than running flush to the screen top. Keep Track Stats cards white and rounded, omit drill descriptions, and keep the removed fixed bottom summary/action bar out. Anchor the workout-preview total and Log Workout action to the bottom of its rounded panel.

**Why:** The user repeatedly called out the flush, clipped top and overlapping lower edge as unacceptable and explicitly asked for the preview-modal shape.

**How to apply:** Preserve safe-area spacing and the rounded shell when changing the active workout layout. Keep the header's Complete Workout action; the removed bottom bar is not needed. Let preview content scroll above its pinned footer.

Workout previews, including generator results, should follow the Hub Day 2/3 format: an inset rounded off-white shell, bold condensed header with a black divider, scrollable white drill cards with artwork beside the details, and a pinned dark footer with the workout summary and primary action.

**Why:** The user asked for generated workouts across the app to match the Hub Day 2/3 presentation.

**How to apply:** Reuse this preview structure for new workout-generation and workout-preview experiences; preserve each flow's own summary and action.
