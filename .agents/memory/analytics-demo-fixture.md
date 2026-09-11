---
name: Analytics demo fixture
description: Boundary and purpose of the seeded analytics sample data
---

The dense analytics fixture is development-only, uses the existing community demo players, and marks generated events as demo data. It exists to make admin analytics visually inspectable before real product traffic accumulates.

**Why:** Analytics screens need realistic cohorts, funnels, user segments, and area usage to be reviewed, but synthetic events must not contaminate production business or engagement metrics.

**How to apply:** Keep the fixture behind the non-production guard, use deterministic IDs so repeated development starts are idempotent, and preserve varied cadence profiles so high, medium, low, and at-risk states remain visible.