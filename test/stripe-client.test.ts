import assert from "node:assert/strict";
import test from "node:test";
import { getStripeSecretKey } from "../server/stripeClient";

test("manual Stripe credentials require a secret key", () => {
  assert.throws(
    () => getStripeSecretKey({ NODE_ENV: "development" }),
    /Set STRIPE_SECRET_KEY/,
  );
});

test("development accepts test keys", () => {
  assert.equal(
    getStripeSecretKey({ NODE_ENV: "development", STRIPE_SECRET_KEY: "sk_test_placeholder" }),
    "sk_test_placeholder",
  );
});

test("production accepts live keys", () => {
  assert.equal(
    getStripeSecretKey({ NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_live_placeholder" }),
    "sk_live_placeholder",
  );
});

test("development rejects live keys", () => {
  assert.throws(
    () => getStripeSecretKey({ NODE_ENV: "development", STRIPE_SECRET_KEY: "sk_live_placeholder" }),
    /development requires an sk_test_ key/,
  );
});

test("production rejects test keys", () => {
  assert.throws(
    () => getStripeSecretKey({ NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_test_placeholder" }),
    /production requires an sk_live_ key/,
  );
});
