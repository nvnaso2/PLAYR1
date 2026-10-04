---
name: First-run setup and lead-magnet quiz
description: The product boundary between the external lead-magnet quiz and authenticated player setup.
---

The public lead-magnet quiz happens outside the PLAYR1 app and remains independent. In-app player setup is its own five-step flow, and new accounts are created only at step 5 after player details are collected. Incomplete setup still gates player access after login.

**Why:** the user wants account creation deferred until player details are ready, while the public quiz must not replace app setup.

**How to apply:** keep quiz data and app-setup completion separate; only use matching quiz answers as optional prefill, never treat quiz completion as app-setup completion, and do not add an earlier account-creation path.

## Retired setup answers

When a setup field is retired, remove it from the current prompts, validation, and new completion payloads, but preserve its previously saved value when completing setup.

**Why:** the user asked to stop collecting customized-drill email without deleting older saved setup data.

**How to apply:** keep legacy answer keys in storage merges, but do not repopulate them from account data or write new values; keep the public lead-magnet quiz separate.