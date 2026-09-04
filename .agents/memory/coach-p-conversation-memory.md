---
name: Coach P conversation memory
description: Persistent Coach P history, rolling summaries, and usage accounting
---

Coach P conversations are player-owned persistent records. The complete message history is stored, but each AI request should use a compact rolling coaching summary plus only the recent message window rather than replaying the entire transcript.

**Why:** Players may use Coach P for months, so a hard transcript cap is the wrong product behavior. Replaying all history would also make latency and provider cost grow with every turn.

**How to apply:** Keep conversation content private and deletable. Keep token, model, latency, and estimated-cost records in separate request analytics so admins can audit usage without exposing message text.