---
name: Community feed baseline
description: The current Community activity feed treatment to preserve as a rollback reference while testing single-activity browsing.
---

The current approved baseline is a uniform multi-item activity feed: no date grouping or vertical timeline rail, consistent card height/padding/icon/avatar treatment, a restrained event-color rail, and event stats in a reserved area. It is intentionally not ranked by card size.

**Why:** The user said this is the best-liked version so far and may want to revert after testing a one-at-a-time feed.

**How to apply:** Keep this treatment recoverable when introducing single-activity browsing. A future rollback should restore the uniform list rather than the older variable-size spotlight timeline.