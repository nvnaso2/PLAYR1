---
name: Coach P model budget
description: Completion budget requirements for personalized Coach P chat requests
---

GPT-5-family chat models can spend much of a small completion budget on internal reasoning before producing visible coaching text, causing a valid request to return no message. Use low reasoning effort for normal Coach P chat and a completion budget that leaves room for both reasoning and the requested answer.

**Why:** Personalized Coach P requests with large server-built context, default reasoning effort, and a small completion budget reached the model but returned no visible answer after a long wait.

**How to apply:** When changing Coach P models or prompt length, keep normal requests at low reasoning effort, reserve a larger completion budget for visible output, log finish reason and message length, and run an authenticated smoke test.