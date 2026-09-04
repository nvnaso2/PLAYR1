---
name: Onboarding copy and scoring maps
description: Quiz option copy is also used as the key for client-side assessment scoring
---

When changing visible onboarding answer text, update every corresponding scoring lookup key in the same change or the answer can stop contributing to archetype, bottleneck, dedication, or experience results.

**Why:** The assessment currently uses answer text as the lookup key instead of stable option IDs, so cosmetic copy changes can silently change scoring.

**How to apply:** Search for the original option string across the quiz definitions, scoring maps, and normalization logic before editing it.