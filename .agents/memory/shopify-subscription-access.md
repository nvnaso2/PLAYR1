---
name: Shopify subscription access
description: Scope limits of Replit's Shopify Admin connector for syncing subscription status into PLAYR1
---

Do not treat the generic Replit Shopify connector as a subscription-entitlement source. At the 2026-10-07 check, Shopify returned no granted-scope handles, the connector's OAuth scope set lacked subscription-contract scopes, and querying `subscriptionContracts` was denied. Shopify's `read_own_subscription_contracts` and `write_own_subscription_contracts` scopes apply to contracts owned by that app; they do not make contracts owned by a separate subscription app readable.

Shopify Flow is a separate documented bridge for the first-party Shopify Subscriptions app: its triggers include subscription billing-attempt success/failure, contract updated, and refund created. The success trigger supplies an order and contract; the contract-updated trigger can expose contract status. Flow's Send HTTP request action can forward selected fields using a secret header, but is limited to Grow, Advanced, and Plus plans. Configure retries and make the receiver idempotent; Flow retries eligible HTTP errors for up to 24 hours. Scheduled Get subscription contract data can return up to 100 contracts per run for status reconciliation.

**Why:** PLAYR1 must reliably learn when a subscription starts, changes, fails, or ends before changing Pro access. Catalog and order access alone cannot provide that lifecycle, while Shopify Flow can expose the needed events without granting the Replit connector access to another app's contracts.

**How to apply:** Prefer Shopify Flow event forwarding when the merchant plan supports its HTTP action; authenticate it with a Flow secret, deduplicate events, and use paid attempts—not contract creation or email alone—to extend access. Use a Shopify Partner Dashboard app for a direct signed-webhook route if stronger source authentication or other capabilities are required. Do not switch checkout or Pro entitlements based only on Shopify order reads.
