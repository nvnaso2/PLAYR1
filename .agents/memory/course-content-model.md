---
name: Course content model
description: Durable decisions for lesson-driven paid courses built on the existing program system
---

Paid courses use the existing programs and program items system rather than a parallel course database. A content type distinguishes courses from ordinary programs, while lesson takeaways live on day items so they can be authored and shown with the corresponding lesson.

Every course makes Day 1's lesson and workout fully available to all players; Days 2 onward require Pro. Free players may browse locked days and see read-only lesson/workout title previews with the course-cover poster, but do not receive locked video URLs, drill lists, notes, or completion data. Locked lesson and workout controls are disabled; day navigation and the upgrade action remain available. Enrollments store the player's chosen training days per week, and the course schedule spaces its sessions across that pace.

The Mechanical Foundation's initial release has the complete day-by-day workout structure and preview UI, but lesson videos and many course-specific drills still need to be created and added to the drill catalog. The current catalog gaps are listed in `docs/mechanical-foundation-missing-drills.md`.

For Mechanical Foundation, preserve user-verified drill titles and do not link course-specific drills to broad mid-range, catch-and-shoot, or free-throw catalog entries. Link only an explicitly confirmed equivalent, such as Baseline to Baseline 3's to the existing Running 3's drill. Keep new drill creation and tagging deferred until the user approves the workout list.

**Why:** The existing enrollment, completion, progress, and Pro entitlement boundaries already cover the product behavior; duplicating them in a separate course model would create two competing training systems.

**Why:** The user specified a free first day and Pro access for the remaining course, and wants the player's selected weekly frequency to set the course pace.

**Why:** The user later asked that locked days still show the day preview, while keeping all preview content non-interactive.

**Why:** The user said generic catalog matches had replaced distinct drills and asked to preserve the exact corrected course drills before adding them to the library.

**How to apply:** Keep trailer visibility separate from day-content visibility. For free players, return full Day 1 content plus only title-level preview metadata for locked days; never include their video URLs, workout specs, notes, or completion records. Keep completion authorization server-side and expose only the upgrade action and day navigation as interactions. Use the saved enrollment frequency when presenting the expected session dates. For course drill associations, follow the exact verified title and avoid generic aliases unless the user confirms a specific existing equivalent.