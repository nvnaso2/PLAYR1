---
name: Shopify subscription access
description: Scope limits of Replit's Shopify Admin connector for syncing subscription status into PLAYR1
---

Do not treat the generic Replit Shopify connector as a subscription-entitlement source. At the 2026-10-07 check, Shopify returned no granted-scope handles, the connector's OAuth scope set lacked subscription-contract scopes, and querying `subscriptionContracts` was denied. Shopify's `read_own_subscription_contracts` and `write_own_subscription_contracts` scopes apply to contracts owned by that app; they do not make contracts owned by a separate subscription app readable.

**Why:** PLAYR1 must reliably learn when a subscription starts, changes, fails, or ends before changing Pro access. Catalog and order access alone cannot provide that lifecycle.

**How to apply:** Before adding Shopify billing, use a Shopify Partner Dashboard app that owns the subscription contracts and can deliver authenticated lifecycle events to PLAYR1, or choose a billing provider with a supported entitlement webhook integration. Do not switch checkout or Pro entitlements based only on Shopify order reads.
