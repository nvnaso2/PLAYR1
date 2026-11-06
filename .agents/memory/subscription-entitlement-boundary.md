---
name: Subscription entitlement boundary
description: Where billing plan data is authoritative and how the admin-granted Pro Infinity entitlement works
---

The authoritative subscription plan and Stripe status live on the `users` record. Admin plan changes must update that record; writing only to a player profile does not affect shared entitlement checks.

**Why:** The shared entitlement helper reads the authenticated user’s billing fields, so a profile-only plan update can look successful in admin UI while leaving Pro-gated features locked.

**How to apply:** Treat `pro-infinity` as an admin-granted non-Stripe entitlement in the shared Pro access helper. Keep normal Free/Pro billing behavior tied to Stripe status, and do not send Pro Infinity users through Stripe’s customer portal.

Coach P can also be granted unlimited usage independently of Pro, using the dedicated account-level Coach P override. Do not use `pro-infinity` when the requested access is Coach P only.

**Why:** The user requested unlimited Coach P for a test account without asking to unlock every paid feature.

**How to apply:** Keep the Coach P override limited to Coach P quota checks; do not treat it as Pro access for workouts, programs, or other entitlements.