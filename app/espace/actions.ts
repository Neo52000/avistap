"use server";

import { revalidatePath } from "next/cache";

import { requireMerchant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isGoogleBusinessLink } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Le commerçant change lui-même la cible de sa plaque.
 *
 * C'est le service que les plaques encodées en dur ne peuvent pas rendre. Trois
 * couches de contrôle :
 *   1. `requireMerchant()` — une server action est un point d'entrée HTTP,
 *      la garde du layout ne la couvre pas ;
 *   2. la RLS `nfc_links_update_own_target` — il ne voit que ses liens ;
 *   3. le privilège au niveau colonne — même en forgeant une requête, il ne
 *      peut écrire que `target_url`, jamais `slug`, `order_id` ou `active`.
 */
export async function updateMyNfcTarget(
  linkId: string,
  targetUrl: string,
): Promise<ActionResult> {
  await requireMerchant();

  const trimmed = targetUrl.trim();

  if (!isGoogleBusinessLink(trimmed)) {
    return {
      ok: false,
      error:
        "Ce lien ne ressemble pas à une fiche Google. Copiez l'adresse depuis Google Maps ou votre fiche d'établissement.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nfc_links")
    .update({ target_url: trimmed })
    .eq("id", linkId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[espace] Mise à jour de la cible impossible :", error);
    return { ok: false, error: "La redirection n'a pas pu être mise à jour." };
  }

  // Aucune ligne : la RLS a filtré, le lien n'appartient pas à ce commerçant.
  if (!data) {
    return { ok: false, error: "Cette plaque est introuvable dans votre espace." };
  }

  revalidatePath("/espace/plaques");
  revalidatePath("/espace");
  return { ok: true };
}
