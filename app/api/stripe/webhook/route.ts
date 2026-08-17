import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { markOrderPaid } from "@/lib/orders-server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Stripe — seule source de vérité du paiement.
 *
 * La page de succès ne prouve rien (le client peut l'ouvrir directement) :
 * c'est cet événement signé qui fait basculer la commande en production.
 *
 * Runtime Node obligatoire : la signature est calculée sur le corps brut.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("[stripe] Webhook reçu alors que Stripe n'est pas configuré");
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe] Signature invalide :", error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) {
    console.error("[stripe] Session sans order_id :", session.id);
    return NextResponse.json({ received: true });
  }

  try {
    const supabase = createAdminClient();
    const order = await markOrderPaid(supabase, orderId, {
      sessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    });

    if (order) {
      console.info(`[stripe] Commande ${order.order_number} passée en production`);
    }
  } catch (error) {
    // On renvoie une erreur pour que Stripe rejoue l'événement : la mise à
    // jour est idempotente, un rejeu ne produira pas de doublon.
    console.error("[stripe] Traitement du paiement impossible :", error);
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
