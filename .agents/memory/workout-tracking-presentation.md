---
name: Workout tracking presentation
description: Visual constraints for the full-screen active workout and Track Stats cards.
---

Show the active workout as an inset, rounded white surface with visible dark space above it and around its edges, matching the rounded workout preview modal rather than running flush to the screen top. Keep Track Stats cards white and rounded, omit drill descriptions, and remove the fixed bottom summary/action bar.

**Why:** The user repeatedly called out the flush, clipped top and overlapping lower edge as unacceptable and explicitly asked for the preview-modal shape.

**How to apply:** Preserve safe-area spacing and the floating rounded shell when changing the active workout layout. Keep the header's Complete Workout action; the removed bottom bar is not needed.
