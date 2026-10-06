import { Redirect } from "wouter";

export default function SubscriptionPage() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get("checkout");
  const isCheckoutReturn = checkout === "success" || checkout === "cancelled";

  if (isCheckoutReturn) {
    return <Redirect to={`/profile-hub?checkout=${checkout}`} replace />;
  }

  params.delete("checkout");
  params.set("showPro", "1");
  return <Redirect to={`/profile-hub?${params.toString()}`} replace />;
}
