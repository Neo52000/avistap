import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { REFERRAL_REWARD_CENTS } from "./pricing";

/**
 * Parrainage et avoirs.
 *
 * Le code de parrainage est à la fois le code de réduction du filleul et la
 * clé d'attribution du parrain : un seul objet à comprendre côté commerçant.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1
const CODE_LENGTH = 6;

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Normalise la saisie client : majuscules, sans espaces. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Récupère le code du commerçant, en le créant à la première demande.
 * Idempotent : deux appels concurrents ne créent pas deux codes (contrainte
 * d'unicité sur `profile_id`, on relit en cas de collision).
 */
export async function getOrCreateReferralCode(
  supabase: SupabaseClient,
  profileId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("referral_codes")
      .insert({ profile_id: profileId, code: randomCode() })
      .select("code")
      .maybeSingle();

    if (!error && data?.code) return data.code;

    // 23505 = unicité violée : soit le code tiré existe déjà, soit un appel
    // concurrent a créé la ligne du profil. On relit avant de retenter.
    if (error?.code === "23505") {
      const { data: race } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("profile_id", profileId)
        .maybeSingle();
      if (race?.code) return race.code;
      continue;
    }

    console.error("[referrals] Création du code impossible :", error);
    return null;
  }

  return null;
}

/**
 * Résout un code saisi au configurateur vers le profil du parrain.
 * Renvoie `null` si le code est inconnu ou désactivé.
 */
export async function resolveReferralCode(
  supabase: SupabaseClient,
  code: string,
): Promise<{ profileId: string; code: string } | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const { data } = await supabase
    .from("referral_codes")
    .select("profile_id, code, active")
    .eq("code", normalized)
    .maybeSingle();

  if (!data || !data.active) return null;
  return { profileId: data.profile_id as string, code: data.code as string };
}

/** Solde d'avoirs : somme du grand livre, jamais une colonne mutée. */
export async function getCreditBalance(
  supabase: SupabaseClient,
  profileId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("credits")
    .select("amount_cents")
    .eq("profile_id", profileId);

  if (error) {
    console.error("[referrals] Lecture du solde impossible :", error);
    return 0;
  }

  return (data ?? []).reduce(
    (sum, row) => sum + ((row as { amount_cents: number }).amount_cents ?? 0),
    0,
  );
}

/**
 * Crédite le parrain pour une commande payée.
 *
 * L'unicité de `referrals.referred_order_id` rend l'opération idempotente :
 * un webhook Stripe rejoué ne crédite pas deux fois.
 */
export async function creditReferrer(
  supabase: SupabaseClient,
  args: { referrerProfileId: string; orderId: string },
): Promise<void> {
  const { data: referral, error } = await supabase
    .from("referrals")
    .insert({
      referrer_profile_id: args.referrerProfileId,
      referred_order_id: args.orderId,
      status: "validated",
      reward_cents: REFERRAL_REWARD_CENTS,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Déjà crédité pour cette commande : rien à faire.
    if (error.code !== "23505") {
      console.error("[referrals] Enregistrement du parrainage impossible :", error);
    }
    return;
  }

  const { error: creditError } = await supabase.from("credits").insert({
    profile_id: args.referrerProfileId,
    amount_cents: REFERRAL_REWARD_CENTS,
    reason: "Parrainage validé",
    order_id: args.orderId,
    referral_id: referral?.id ?? null,
  });

  if (creditError) {
    console.error("[referrals] Crédit de l'avoir impossible :", creditError);
  }
}

/** Consomme une partie du solde du filleul sur sa propre commande. */
export async function consumeCredit(
  supabase: SupabaseClient,
  args: { profileId: string; orderId: string; amountCents: number },
): Promise<void> {
  if (args.amountCents <= 0) return;

  const { error } = await supabase.from("credits").insert({
    profile_id: args.profileId,
    amount_cents: -args.amountCents,
    reason: "Avoir utilisé sur commande",
    order_id: args.orderId,
  });

  if (error) {
    console.error("[referrals] Consommation de l'avoir impossible :", error);
  }
}
