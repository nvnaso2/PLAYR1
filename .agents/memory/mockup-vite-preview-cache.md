---
name: Mockup Vite preview cache
description: Diagnose stale dependency prebundling in the mockup preview server.
---

When the mockup preview returns a Vite `Outdated Optimize Dep` 504 after a workflow restart, the sandbox's optimized-dependency metadata may still point into an old package-store layout. Check the workflow log and installed package first; if the package is present but the optimizer references a missing store path, clear only `artifacts/mockup-sandbox/node_modules/.vite` and restart the managed preview workflow.

**Why:** restarting the workflow does not necessarily invalidate Vite's persisted optimizer metadata, and reinstalling dependencies can make a stale-cache problem wider.

**How to apply:** confirm the missing path is under the mockup sandbox's Vite cache, then clear that cache before touching package manifests or reinstalling modules.
