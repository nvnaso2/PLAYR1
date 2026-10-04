---
name: First-run setup and lead-magnet quiz
description: The product boundary between the external lead-magnet quiz and authenticated player setup.
---

The public lead-magnet quiz happens outside the PLAYR1 app and remains independent. In-app player setup is its own five-step flow, and new accounts are created only at step 5 after player details are collected. Incomplete setup still gates player access after login.

**Why:** the user wants account creation deferred until player details are ready, while the public quiz must not replace app setup.

**How to apply:** keep quiz data and app-setup completion separate; only use matching quiz answers as optional prefill, never treat quiz completion as app-setup completion, and do not add an earlier account-creation path.