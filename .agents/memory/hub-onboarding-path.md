---
name: Hub onboarding path
description: Production Hub states and the development-only QA controls for exercising them
---

Production Hub state stays automatic and profile-completion-based: onboarding contains only the intro trailer, Complete Your Profile linking to Edit Profile, and training starts; everyday contains a training snapshot, Custom Drills, training starts, PLAYR1 Tools, and one setup-informed Coach P prompt.

Development may expose a QA switch between the profile-derived, onboarding, and everyday states plus a direct link to the AI welcome workout. Reopening that flow should reuse the saved workout rather than create duplicates.

**Why:** The user wants to test both Hub states and the onboarding-generated workout after setup without restoring a production toggle.

**How to apply:** Keep QA controls gated to development builds. Do not change production state selection, onboarding content, authorization, or the repeat-safe workout behavior.