import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

export function getStripeSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in this environment's Secrets.");
  }

  const keyMode = secretKey.startsWith("sk_test_")
    ? "test"
    : secretKey.startsWith("sk_live_")
      ? "live"
      : null;
  if (!keyMode) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe secret key beginning with sk_test_ or sk_live_.");
  }

  const expectedMode = env.NODE_ENV === "production"
    ? "live"
    : env.NODE_ENV === "development"
      ? "test"
      : null;
  if (expectedMode && keyMode !== expectedMode) {
    throw new Error(
      `Stripe key mode mismatch: ${env.NODE_ENV} requires an sk_${expectedMode}_ key. ` +
      "Use a test key in development and a live key in production.",
    );
  }

  return secretKey;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(getStripeSecretKey());
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Stripe sync.");
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: getStripeSecretKey(),
    backfillRelatedEntities: true,
    revalidateObjectsViaStripeApi: ["product", "price", "subscription"],
  });
}
