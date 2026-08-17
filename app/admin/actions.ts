"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { sendShippingNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * Mutations du back office.
 *
 * Chaque action refait `requireAdmin()` : une server action est un point
 * d'entrée HTTP à part entière, la protection du layout ne la couvre pas. La
 * RLS constitue le dernier rempart côté base.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Transitions autorisées : évite qu'un double-clic ne fasse reculer un statut. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["pending", "cancelled"],
  pending: ["printing", "cancelled"],
  printing: ["shipped", "pending", "cancelled"],
  shipped: ["delivered", "printing"],
  delivered: [],
  cancelled: ["pending"],
};

async function transition(
  orderId: string,
  toStatus: OrderStatus,
  extra: Partial<Order> = {},
  note?: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (readError || !current) {
    return { ok: false, error: "Commande introuvable." };
  }

  const order = current as Order;

  if (order.status === toStatus) {
    return { ok: true }; // Déjà à jour : double-clic, rien à faire.
  }

  if (!ALLOWED_TRANSITIONS[order.status].includes(toStatus)) {
    return {
      ok: false,
      error: `Passage de « ${order.status} » à « ${toStatus} » impossible.`,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: toStatus, ...extra })
    .eq("id", orderId)
    .eq("status", order.status) // garde-fou contre deux validations simultanées
    .select("*")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[admin] Changement de statut impossible :", updateError);
    return { ok: false, error: "Le statut n'a pas pu être mis à jour." };
  }

  await supabase.from("order_events").insert({
    order_id: orderId,
    from_status: order.status,
    to_status: toStatus,
    note: note ?? null,
    actor: admin.email,
  });

  if (toStatus === "shipped") {
    await sendShippingNotification(updated as Order);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/production");
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${orderId}`);

  return { ok: true };
}

export async function startPrinting(orderId: string): Promise<ActionResult> {
  return transition(orderId, "printing", {}, "Passée en impression");
}

export async function backToQueue(orderId: string): Promise<ActionResult> {
  return transition(orderId, "pending", {}, "Remise dans la file");
}

export async function markShipped(
  orderId: string,
  trackingNumber: string,
  carrier: string,
): Promise<ActionResult> {
  return transition(
    orderId,
    "shipped",
    {
      tracking_number: trackingNumber.trim() || null,
      carrier: carrier.trim() || null,
    },
    "Colis expédié",
  );
}

export async function markDelivered(orderId: string): Promise<ActionResult> {
  return transition(orderId, "delivered", {}, "Livraison confirmée");
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  return transition(orderId, "cancelled", {}, "Commande annulée");
}

export async function saveAdminNotes(
  orderId: string,
  notes: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ admin_notes: notes.trim() || null })
    .eq("id", orderId);

  if (error) {
    return { ok: false, error: "Note non enregistrée." };
  }

  revalidatePath(`/admin/commandes/${orderId}`);
  return { ok: true };
}

/**
 * Met à jour la cible d'un lien NFC.
 *
 * C'est l'opération qui sauve une plaque déjà livrée quand le client change de
 * fiche Google : le support physique n'est jamais à refaire.
 */
export async function updateNfcTarget(
  linkId: string,
  targetUrl: string,
): Promise<ActionResult> {
  await requireAdmin();

  const trimmed = targetUrl.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, error: "Le lien doit commencer par https://" };
    }
  } catch {
    return { ok: false, error: "Lien invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("nfc_links")
    .update({ target_url: trimmed })
    .eq("id", linkId);

  if (error) {
    return { ok: false, error: "Lien non mis à jour." };
  }

  revalidatePath("/admin/commandes");
  return { ok: true };
}

// --- Catalogue --------------------------------------------------------------

export async function updateProductPrice(
  productId: string,
  priceEuros: number,
): Promise<ActionResult> {
  await requireAdmin();

  if (!Number.isFinite(priceEuros) || priceEuros < 0) {
    return { ok: false, error: "Prix invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ base_price_cents: Math.round(priceEuros * 100) })
    .eq("id", productId);

  if (error) {
    return { ok: false, error: "Prix non enregistré." };
  }

  revalidatePath("/admin/produits");
  revalidatePath("/", "layout"); // le catalogue est en cache sur la vitrine
  return { ok: true };
}

export async function updateOptionPrice(
  optionId: string,
  priceEuros: number,
): Promise<ActionResult> {
  await requireAdmin();

  if (!Number.isFinite(priceEuros) || priceEuros < 0) {
    return { ok: false, error: "Prix invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_options")
    .update({ price_cents: Math.round(priceEuros * 100) })
    .eq("id", optionId);

  if (error) {
    return { ok: false, error: "Prix non enregistré." };
  }

  revalidatePath("/admin/produits");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleCatalogItem(
  table: "products" | "product_options",
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ active }).eq("id", id);

  if (error) {
    return { ok: false, error: "Modification impossible." };
  }

  revalidatePath("/admin/produits");
  revalidatePath("/", "layout");
  return { ok: true };
}
