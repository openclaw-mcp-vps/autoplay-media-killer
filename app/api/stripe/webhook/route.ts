import { NextResponse } from "next/server";
import Stripe from "stripe";

import { setSubscriptionState } from "@/lib/store";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

function extractEmailFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  return (
    session.customer_details?.email ??
    session.customer_email ??
    (typeof session.customer === "string" ? null : null)
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = extractEmailFromCheckoutSession(session);

    if (email && session.payment_status === "paid") {
      setSubscriptionState({
        email,
        active: true,
        source: "stripe_webhook",
        stripeEventId: event.id,
      });
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = extractEmailFromCheckoutSession(session);

    if (email) {
      setSubscriptionState({
        email,
        active: false,
        source: "stripe_webhook",
        stripeEventId: event.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
