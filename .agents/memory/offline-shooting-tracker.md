---
name: Offline shooting tracker
description: Product constraints and rollout order for PLAYR1 computer-vision shot tracking.
---

For the first PLAYR1 shooting tracker, do not use paid AI/API inference or extend the old sparse-frame GPT analyzer. Start over with local, offline computer vision and validate against recorded fixed-camera clips before adding live camera tracking. Analyze only the short ball sequence around the calibrated rim; some uploaded MOV/HEVC clips cannot be decoded by the browser, so frame extraction must run server-side. Run long scans as background jobs and poll their status instead of keeping an HTTP request open.

**Why:** the user wants the feature to be affordable, accurate, and easy to test; they have long clips filmed from a consistent position. The browser decoder rejected a real MOV upload, and long synchronous scans were interrupted before returning.

**How to apply:** use local server-side OpenCV for clip decoding and rim-zone analysis, run scans asynchronously, keep make/miss decisions reviewable, and add live capture only after clip-based accuracy is measured.
