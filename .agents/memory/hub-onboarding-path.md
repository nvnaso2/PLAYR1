---
name: Hub onboarding path
description: Production Hub states and the development-only QA controls for exercising them
---

The normal production Hub remains automatic and profile-completion-based: onboarding contains only the intro trailer, Complete Your Profile linking to Edit Profile, and training starts; everyday contains a training snapshot, Custom Drills, training starts, PLAYR1 Tools, and one setup-informed Coach P prompt. The welcome-workout chat may offer a temporary onboarding Hub preview; it must not change the player's saved profile or normal Hub state, and the preview needs a clear return to the normal Hub.

Development may expose only Onboarding and Everyday as QA state choices; the initial state remains profile-derived. The post-setup welcome action opens a Coach P conversation with a personalized snapshot from completed setup answers and relevant saved lead-magnet answers, followed by an immediate catalog-backed starter workout. Players can continue chatting, explicitly save and start the workout, or open the temporary onboarding Hub preview. Keep the old welcome-workout route as a redirect, not a separate recap or auto-save path.

**Why:** The user wants Coach P to use onboarding and prior quiz data to make the player feel understood before generating a first workout, while preserving the automatic default Hub state and avoiding silent workout saves.

**How to apply:** Keep the default Hub profile-derived and QA controls gated to development builds with only Onboarding and Everyday choices. Allow the onboarding preview only through its explicit welcome-chat action, and keep the real profile state unchanged.