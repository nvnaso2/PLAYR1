---
name: PLAYR1 Stripe credential model
description: The project-specific choice to use manual Stripe keys with separate test/live environments.
---

PLAYR1 uses direct Stripe API keys because the owner chose to bypass the Replit Stripe Publishing connector after its claim flow failed. Keep development on a test key and production on a live key. `stripe-replit-sync` can create and persist its managed webhook signing secret in its own schema, so do not make a manually copied webhook secret a second source of truth. Keep the old connector installed until the published app has been verified on the manual production path.

**Why:** The connector's Publishing claim flow blocked the owner's launch, but disconnecting it before the replacement is live and verified could break the existing deployment.

**How to apply:** Preserve environment-specific key-mode checks and the sync package's managed-webhook flow. Do not disconnect the connector until production uses the manual key path successfully.