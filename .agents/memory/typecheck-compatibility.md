---
name: Type-check compatibility boundaries
description: How to contain drift between validated input types, inferred database types, and legacy integrations.
---

When runtime validation schemas or legacy integrations drift from the current database schema, keep the compatibility boundary local to the adapter or persistence call rather than weakening shared application types.

**Why:** The project combines generated/inferred Drizzle types with older integration code, so broad global exclusions would hide regressions in active application and analytics code.

**How to apply:** Preserve the root project coverage and isolate unavoidable compatibility casts or declarations in the specific stale adapter, seed path, or database write that needs them.