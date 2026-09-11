---
name: Activity analytics duration estimates
description: The measurement boundary for admin activity usage duration and activity cohorts
---

Usage duration is an estimate derived from authenticated event spans, using a 30-minute inactivity cutoff to sessionize events. Explicit app-open and heartbeat events improve future estimates, but historical periods must remain labeled as estimated rather than presented as exact time-in-app.

**Why:** The existing analytics event stream did not contain a reliable session-duration field, so exact historical duration cannot be reconstructed without inventing precision.

**How to apply:** Keep Activity analytics copy and future reports explicit about the estimate. Treat app opens and heartbeat pings as telemetry, not user actions, when calculating activity depth.