---
name: Long project type-checks
description: Running full TypeScript checks reliably when the workspace is under heavy load
---

When `npm run check` appears to hang or hits the synchronous shell timeout during a busy session, launch one background check and monitor its final exit marker rather than starting additional parallel checks.

**Why:** The full project compiler consumed substantial CPU and produced no intermediate output; synchronous calls timed out, but the same check completed successfully when allowed to continue in the background.

**How to apply:** Use one background `npm run check` during heavy editing or subagent work, wait for its exit status, and only rerun if source changes after that completed check.