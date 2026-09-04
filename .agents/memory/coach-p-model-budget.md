---
name: Coach P model budget
description: Completion budget requirements for personalized Coach P chat requests
---

GPT chat models can spend much of a small completion budget on internal reasoning before producing visible coaching text, causing a valid request to return no message. Use a completion budget that leaves room for both reasoning and the requested answer.

**Why:** A personalized Coach P request with a large server-built context and a 900-token completion budget reached the model but returned no visible answer after a long wait.

**How to apply:** When changing Coach P models or prompt length, verify that the completion budget supports the expected answer length and run an authenticated smoke test.