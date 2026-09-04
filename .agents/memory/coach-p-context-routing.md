---
name: Coach P context routing
description: Coach P should load only context relevant to the current question and invalidate cached catalog data after edits
---

Coach P requests use deterministic intent routing: core profile context is always available, while training catalogs, programs, game statistics, and reflections are loaded only for relevant questions. Cached principles, drills, and programs need short TTLs plus invalidation after admin or authoring changes.

**Why:** Sending every player dataset and catalog on every request increases latency and provider cost, while stale training content can produce recommendations that no longer match the app.

**How to apply:** Preserve the routing boundary when adding new context sources, and add cache invalidation alongside any new mutation that changes Coach P-visible content.