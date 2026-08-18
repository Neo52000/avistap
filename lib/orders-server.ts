import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendOrderConfirmation } from "./notifications";
import type { Order } from "./types";

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // sans o/l/0/1
const SLUG_LENGTH = 7;

function randomSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  return Array.from(bytes, (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join("");
}

/**
 * Passe une commande de `awaiting_payment` à `pending` (= à produire).
 *
 * Appelé par le webhook Stripe et par le mode simulé. Idempotent : la mise à
 * jour est conditionnée au statut `awaiting_payment`, donc un webhook rejoué
 * par Stripe ne recrée ni événement, ni lien NFC, ni email.
 */
export async function markOrderPaid(
  supabase: SupabaseClient,
  orderId: string,
  stripe?: { sessionId?: string | null; paymentIntentId?: string | null },
): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from("orders")
    .update({
      status: "pending",
      paid_at: new Date().toISOString(),
      stripe_session_id: stripe?.sessionId ?? undefined,
      stripe_payment_intent_id: stripe?.paymentIntentId ?? undefined,
    })
    .eq("id", orderId)
    .eq("status", "awaiting_payment")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[orders] Échec du passage en payé :", error);
    throw error;
  }

  // Aucune ligne mise à jour : la commande était déjà traitée. Rien à refaire.
  if (!order) return null;

  const typedOrder = order as Order;

  await supabase.from("order_events").insert({
    order_id: typedOrder.id,
    from_status: "awaiting_payment",
    to_status: "pending",
    note: "Paiement confirmé",
    actor: stripe?.sessionId ? "stripe" : "system",
  });

  await createNfcLink(supabase, typedOrder);
  await sendOrderConfirmation(typedOrder);

  return typedOrder;
}

/**
 * Crée le lien court encodé sur la puce.
 *
 * C'est cette indirection qui rend la plaque réutilisable : la puce contient
 * l'adresse AvisTap, jamais le lien Google, qu'on peut donc changer plus tard
 * sans toucher au support physique.
 */
async function createNfcLink(
  supabase: SupabaseClient,
  order: Order,
): Promise<void> {
  if (!order.google_business_link) return;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from("nfc_links").insert({
      slug: randomSlug(),
      order_id: order.id,
      target_url: order.google_business_link,
    });

    if (!error) return;

    // 23505 = violation de contrainte d'unicité : collision de slug, on retente.
    if (error.code !== "23505") {
      console.error("[orders] Création du lien NFC impossible :", error);
      return;
    }
  }

  console.error(
    `[orders] Aucun slug NFC libre après 5 tentatives (commande ${order.order_number})`,
  );
}
