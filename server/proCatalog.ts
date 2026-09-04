import { getUncachableStripeClient } from "./stripeClient";

export const PRO_PRODUCT_METADATA = {
  playr1_plan: "pro",
  entitlements: "coach_p_unlimited,full_programs",
};

export async function ensureProCatalog(): Promise<void> {
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.search({ query: "metadata['playr1_plan']:'pro'" });
  const product = products.data[0] ?? await stripe.products.create({
    name: "PLAYR1 Pro",
    description: "Full programs and unlimited Coach P access",
    metadata: PRO_PRODUCT_METADATA,
  });
  const existing = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const definitions = [
    { interval: "month" as const, amount: 999, lookupKey: "playr1_pro_monthly" },
    { interval: "year" as const, amount: 9999, lookupKey: "playr1_pro_annual" },
  ];
  for (const definition of definitions) {
    if (existing.data.some((price) => price.lookup_key === definition.lookupKey)) continue;
    await stripe.prices.create({
      product: product.id,
      unit_amount: definition.amount,
      currency: "usd",
      recurring: { interval: definition.interval },
      lookup_key: definition.lookupKey,
      metadata: { ...PRO_PRODUCT_METADATA, billing_interval: definition.interval },
    });
  }
}