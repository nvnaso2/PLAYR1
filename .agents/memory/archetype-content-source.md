---
name: Archetype content source
description: The shared description and core characteristics shown across player development surfaces
---

Archetype descriptions and core characteristics should come from the database archetype definitions, not duplicated assessment copy. Keep the visible characteristics limited to the first four traits, and resolve assessment labels through an explicit label-to-definition mapping when names differ.

**Why:** The assessment labels and database archetype names are not always identical, so direct string matching can silently fall back to stale frontend strengths and cause the Archetypes and Development pages to drift.

**How to apply:** Reuse the shared content helpers for any new archetype profile surface; treat static assessment metadata as presentation/fallback data only.