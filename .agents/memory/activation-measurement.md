---
name: Activation measurement
description: Definition of the activation funnel's first-open and first-session milestones
---

The activation funnel uses the first authenticated `app_open` for a user as the download/first-open proxy. It then counts onboarding completion and a meaningful event after onboarding within that user's first 30-minute session.

**Why:** The current browser-based app does not emit a reliable app-store installation event, so using first authenticated open is more honest than fabricating download counts or counting later sessions as activation.

**How to apply:** If native install attribution is added later, replace the first-open proxy with the real install event while preserving the onboarding and first-session action definitions.