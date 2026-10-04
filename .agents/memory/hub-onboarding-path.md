---
name: Hub onboarding path
description: Production Hub states and the development-only QA controls for exercising them
---

Production Hub state stays automatic and profile-completion-based: onboarding contains only the intro trailer, Complete Your Profile linking to Edit Profile, and training starts; everyday contains a training snapshot, Custom Drills, training starts, PLAYR1 Tools, and one setup-informed Coach P prompt.

Development may expose only Onboarding and Everyday as QA state choices; the initial state remains profile-derived. The post-setup welcome action opens Coach P's workout-builder chat, using completed setup answers and relevant saved lead-magnet answers to build a catalog-backed preview that players explicitly save or start. Keep the old welcome-workout route as a redirect, not a separate recap or auto-save path.

**Why:** The user rejected the static welcome recap and asked for a real Coach P conversation that follows the existing Build a Workout flow; explicit saving avoids silently creating another workout on each visit.

**How to apply:** Keep QA controls gated to development builds and limit the manual state choices to Onboarding and Everyday. Do not change production state selection or authorization, and route onboarding completion into Coach P instead of auto-generating a workout.