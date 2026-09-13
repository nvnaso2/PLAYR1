---
name: Direct custom workout assignments
description: Admin-built workouts can be assigned without creating a player request.
---

Direct admin workout builds use a nullable request link, while request-created workouts keep their request lifecycle.

**Why:** Treating every admin-built workout as a synthetic player request pollutes request history and incorrectly blocks duplicate request submission.

**How to apply:** Keep direct assignment ownership scoped to the selected player, expose direct assignments through player/admin assignment queries, and only update request status when the assignment has a request link.