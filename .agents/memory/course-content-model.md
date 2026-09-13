---
name: Course content model
description: Durable decisions for lesson-driven paid courses built on the existing program system
---

Paid courses use the existing programs and program items system rather than a parallel course database. A content type distinguishes courses from ordinary programs, while lesson takeaways live on day items so they can be authored and shown with the corresponding lesson.

**Why:** The existing enrollment, completion, progress, and Pro entitlement boundaries already cover the product behavior; duplicating them in a separate course model would create two competing training systems.

**How to apply:** Keep trailer visibility separate from day-content visibility. The public detail response may expose course metadata and trailer information to free players, but item content, enrollment, completions, lesson videos, workouts, and takeaways must remain server-locked until the player has Pro access.