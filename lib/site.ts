/**
 * Identité de marque — source unique.
 *
 * La marque se lit « AvisTap » (T majuscule) et s'accompagne du descripteur
 * « La plaque avis » : le nom porte la mémorisation publicitaire, le
 * descripteur porte la réassurance et le référencement.
 *
 * Tout ce qui est affiché ou envoyé au client passe par ici : un changement de
 * nom, de domaine ou d'email de contact se fait à un seul endroit.
 */

export const BRAND = "AvisTap";
export const TAGLINE = "La plaque avis";

/** Nom complet, tel qu'il apparaît en pied de page et dans les emails. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? `${BRAND} — ${TAGLINE}`;

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contact@avistap.fr";

/**
 * URL publique du site.
 *
 * Sert aux URL de retour Stripe, aux liens de suivi et surtout aux liens NFC
 * encodés sur les puces : une valeur erronée ici produit des plaques qui
 * pointent au mauvais endroit, définitivement.
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
