import Stripe from 'stripe';

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string } | null> {
  // Prefer direct env var secrets (simpler and more reliable)
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  const envSecret = process.env.STRIPE_SECRET_KEY;
  if (envPublishable && envSecret) {
    return { publishableKey: envPublishable, secretKey: envSecret };
  }

  // Fall back to Replit connector if env vars not set
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) return null;

  try {
    const connectorName = 'stripe';
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const targetEnvironment = isProduction ? 'production' : 'development';

    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', connectorName);
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'X-Replit-Token': xReplitToken }
    });

    const data = await response.json();
    const settings = data.items?.[0];
    if (!settings?.settings?.publishable || !settings?.settings?.secret) return null;

    return { publishableKey: settings.settings.publishable, secretKey: settings.settings.secret };
  } catch {
    return null;
  }
}

export async function isStripeConfigured(): Promise<boolean> {
  return (await getCredentials()) !== null;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const creds = await getCredentials();
  if (!creds) throw new Error('Stripe is not configured');
  return new Stripe(creds.secretKey, { apiVersion: '2025-08-27.basil' as any });
}

export async function getStripePublishableKey(): Promise<string | null> {
  return (await getCredentials())?.publishableKey ?? null;
}

export async function getStripeSecretKey(): Promise<string | null> {
  return (await getCredentials())?.secretKey ?? null;
}

let stripeSync: any = null;

export async function getStripeSync(): Promise<any | null> {
  if (!stripeSync) {
    const secretKey = await getStripeSecretKey();
    if (!secretKey) return null;

    const { StripeSync } = await import('stripe-replit-sync');
    stripeSync = new StripeSync({
      poolConfig: { connectionString: process.env.DATABASE_URL!, max: 2 },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
