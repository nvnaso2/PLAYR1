---
name: Drill data publishing
description: Keep development drill edits and the production iOS catalog in sync safely.
---

The user expects drill edits made in the Replit app to appear in the live app automatically when the app is updated, without exporting or uploading files.

**Why:** The Xcode app uses the published production API, and keeping its drill stages and diagrams aligned with Replit is part of the expected release workflow.

**How to apply:** Replit's native development-data overwrite replaces the entire production database, not only drills; do not use it for a drill-only request without explicit consent. Publishing code alone does not copy rows, and the user rejects manual export/import. Do not treat `cap sync ios` as a database transfer; it copies app assets and code only.
