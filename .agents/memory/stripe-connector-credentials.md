---
name: Stripe connector credential shape
description: Compatibility rule for resolving Stripe credentials from Replit's connector response.
---

The installed Stripe connector may expose the API credential as `settings.secret`, while older integration templates expect `settings.secret_key`. Resolve either field and never persist or log its value.

**Why:** The connector response shape can differ from the published template even when the connection is healthy. Assuming only the legacy field makes catalog seeding and startup fail with a misleading “not connected” error.

**How to apply:** Any Stripe client factory that reads the Replit connection endpoint should support both names. Let managed webhooks store their signing secret in the sync library's private Stripe schema rather than copying it into application state.