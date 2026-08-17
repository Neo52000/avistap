import "server-only";

import Stripe from "stripe";

/**
 * Stripe est optionnel en développement : sans clé secrète, le tunnel bascule
 * en mode simulé (voir /api/checkout). Cela permet de tester le parcours
 * complet, back office compris, sans compte Stripe.
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  // Pas d'apiVersion explicite : on suit la version épinglée par le SDK
  // installé, ce qui évite de désynchroniser les types à chaque mise à jour.
  return new Stripe(secretKey);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
