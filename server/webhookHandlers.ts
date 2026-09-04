import Stripe from "stripe";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

function stateFor(subscription: Stripe.Subscription) {
  const active = subscription.status === "active" || subscription.status === "trialing";
  return {
    subscriptionPlan: active ? "pro" : "free",
    subscriptionStatus: subscription.status,
    subscriptionPriceInterval: subscription.items.data[0]?.price.recurring?.interval ?? null,
    subscriptionCurrentPeriodEnd: (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : null,
    subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    updatedAt: new Date(),
  };
}

async function syncApplicationSubscription(subscription: Stripe.Subscription, userId?: string) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await db.update(users)
    .set(stateFor(subscription))
    .where(userId ? eq(users.id, userId) : eq(users.stripeCustomerId, customerId));
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Stripe webhook payload must be a raw Buffer.");
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const event = JSON.parse(payload.toString()) as Stripe.Event;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const stripe = await getUncachableStripeClient();
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );
        await syncApplicationSubscription(
          subscription,
          session.metadata?.userId || session.client_reference_id || undefined,
        );
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncApplicationSubscription(event.data.object as Stripe.Subscription);
    } else if (event.type === "invoice.payment_failed") {
      const subscriptionId = (event.data.object as any).subscription;
      if (subscriptionId) {
        const stripe = await getUncachableStripeClient();
        const subscription = await stripe.subscriptions.retrieve(
          typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id,
        );
        await syncApplicationSubscription(subscription);
      }
    }
  }
}
