---
name: Business analytics sources
description: Source boundaries and honest fallback behavior for financial analytics
---

Business analytics should keep billing truth, product state, and operating-cost telemetry separate: Stripe sync is the source for paid invoices, prices, subscription history, and processing estimates; the application users table is the source for the current free/paid/Infinity access mix; Coach P request records are the source for tracked AI cost estimates. Replit hosting, object storage, and database billing must be labeled unavailable unless a real usage or billing source is connected.

**Why:** The application database does not expose Replit plan or infrastructure charges, so substituting zeros or invented estimates would make revenue and profitability dashboards misleading.

**How to apply:** Prefer explicit “not connected” states for missing platform costs, and label derived values such as Stripe fees and LTV as estimates with their formula or source.