---
name: Drill data publishing
description: Keep development drill edits and the production iOS catalog in sync safely.
---

Drill changes made in the Replit development database should be transferred to production; publishing application code alone does not copy database rows.

**Why:** The Xcode app uses the published production API, and the user expects edited drill stages and diagrams to reach that live app.

**How to apply:** For a development-to-production drill transfer, preview the rows and conflicts first, then apply the approved updates. Do not treat `cap sync ios` as a database transfer; it copies app assets and code only.
