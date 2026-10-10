---
name: Capacitor API requests
description: Avoid local-file URL failures for API reads in the native iOS and Android shells.
---

Use the app's native-aware request helper for API reads from Capacitor pages; do not use plain relative `fetch("/api/...")` there.

**Why:** In a packaged app, relative URLs can resolve against the bundled `capacitor://` file origin instead of the configured backend. A valid feature route can then appear as “not found” even though the web route and database record exist.

**How to apply:** When adding or fixing data queries in screens reachable from iOS or Android, use `nativeFetch` (or the established query helper) so the configured API base and auth headers are applied.
