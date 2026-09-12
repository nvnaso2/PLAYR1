---
name: Training analytics measurement
description: The source-of-truth boundary for drill, workout, and program analytics
---

Training analytics separates discovery from completion: views and starts come from analytics events, while finished drills and sessions come from persisted training logs, grouped by workout session ID. Program completion comes from enrollment and item-completion records.

**Why:** Client events can be duplicated or arrive without a successful save, so they are useful for funnel behavior but should not be presented as completed training.

**How to apply:** Keep view-to-completion metrics explicitly windowed, use persisted records for durable totals, and classify legacy metricless sessions as quick-complete-style only when a direct session-mode event is unavailable.