---
name: Lead magnet result privacy
description: Lead-magnet quiz history is private backend context for Coach P, not a player-facing saved-results section.
---

Store authenticated lead-magnet submissions server-side and keep all attempts available to Coach P for relevant coaching requests. Do not add a player-facing saved-results/history panel to the Lead Magnets page unless the user changes this direction.

**Why:** the user requested that quiz results be saved behind the scenes and accessible to Coach P for reference.

**How to apply:** preserve per-user persistence and only load a player's own submissions into Coach P context; don't expose a history UI.