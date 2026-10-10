---
name: Portable npm lockfiles
description: Replit's package firewall can write internal tarball URLs into package-lock.json that cannot resolve outside Replit.
---

Inspect lockfile `resolved` URLs before asking someone to install a cloned project on a local machine. Internal `package-firewall.replit.local` and `.internal` URLs are not resolvable from a Mac; use public npm registry URLs for packages intended to be installed outside the Replit environment.

**Why:** A cloned Capacitor project stalled during `npm ci` because npm retried Replit-only tarball hosts.

**How to apply:** Before pushing dependency lockfile changes for a local build, confirm no `package-firewall.replit.*` hosts remain.
