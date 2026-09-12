---
name: Retention measurement
description: Definition of Day-N retention and development fixture behavior
---

Day-N retention is reported as retained users divided by all registered users. A user counts as retained only when they are old enough to reach that milestone and have a second app open within N days of their own signup. The dashboard also exposes how many users have reached each milestone.

**Why:** Using only users old enough for Day 30 made the denominator look like a rolling-window signup count and did not match the product question about the full user base.

**How to apply:** Keep the denominator and maturity context separate. Development analytics must not generate activity before signup, or first-open and activation calculations become invalid.