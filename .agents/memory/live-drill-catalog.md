---
name: Live drill catalog boundary
description: The player-facing production drill count and the correct filter for development imports.
---

The canonical player-facing production catalog contains 105 drills: `user_id IS NULL AND COALESCE(is_ai_generated, false) = false`. The earlier count of 206 included 101 AI-generated drills.

**Why:** The user specified that the live player catalog has 105 drills and development imports must not change production.

**How to apply:** Read the canonical catalog with this filter and write imported data only to the development database.
