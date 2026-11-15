---
name: Course content model
description: Durable decisions for lesson-driven paid courses built on the existing program system
---

Paid courses use the existing programs and program items system rather than a parallel course database. A content type distinguishes courses from ordinary programs, while lesson takeaways live on day items so they can be authored and shown with the corresponding lesson.

Every course makes Day 1's lesson and workout available to all players; Days 2 onward require Pro. Enrollments store the player's chosen training days per week, and the course schedule spaces its sessions across that pace.

**Why:** The existing enrollment, completion, progress, and Pro entitlement boundaries already cover the product behavior; duplicating them in a separate course model would create two competing training systems.

**Why:** The user specified a free first day and Pro access for the remaining course, and wants the player's selected weekly frequency to set the course pace.

**How to apply:** Keep trailer visibility separate from day-content visibility. The public detail response may expose course metadata and trailer information to free players, but only Day 1's items and completions may be returned to free players; all later days must remain server-locked. Use the saved enrollment frequency when presenting the expected session dates.