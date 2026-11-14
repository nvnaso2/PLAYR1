---
name: Offline shooting tracker
description: Product constraints and rollout order for PLAYR1 computer-vision shot tracking.
---

For the first PLAYR1 shooting tracker, do not use paid AI/API inference or extend the old sparse-frame GPT analyzer. Start over with local, offline computer vision and validate against recorded fixed-camera clips before adding live camera tracking.

**Why:** the user wants the feature to be affordable, accurate, and easy to test; they have long clips filmed from a consistent position.

**How to apply:** use local OpenCV-based analysis first, keep make/miss decisions reviewable, and add live capture only after clip-based accuracy is measured.
