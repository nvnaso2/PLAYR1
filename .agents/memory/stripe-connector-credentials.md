---
name: PLAYR1 Stripe credential model
description: The project-specific choice to use manual Stripe keys with separate test/live environments.
---

PLAYR1 uses direct Stripe API keys because the owner chose to bypass the Replit Stripe Publishing connector after its claim flow failed; the native connector has since been removed. Keep development on a test key and production on a live key. `stripe-replit-sync` can create and persist its managed webhook signing secret in its own schema, so do not make a manually copied webhook secret a second source of truth. Secret presence and a successful generic deployment do not prove the Stripe production path is working.

**Why:** The connector's Publishing claim flow failed, so the owner selected manual keys. Production verification requires the latest published build to initialize Stripe and receive signed lifecycle events; secrets can exist without that path being active.

**How to apply:** Preserve environment-specific key-mode checks and the sync package's managed-webhook flow. Do not treat a key-name check as validation of the key, the webhook, or subscription access.