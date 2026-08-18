import type { Product, ProductOption } from "./types";

/**
 * Source unique du calcul de prix.
 *
 * Ce module est importé côté client (affichage temps réel dans le
 * configurateur) ET côté serveur (recalcul avant création de la session
 * Stripe). Le total transmis par le navigateur n'est jamais utilisé comme
 * prix de vente : le serveur relit le catalogue en base, revalide le code de
 * parrainage et le solde d'avoirs, puis refait le calcul.
 */

/** Frais de port forfaitaires, en centimes. */
export const SHIPPING_CENTS = 590;

/** Au-delà de ce sous-total, les frais de port sont offerts. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 8000;

/** Remise accordée au filleul qui saisit un code de parrainage. */
export const REFERRAL_DISCOUNT_PERCENT = 10;

/** Avoir crédité au parrain quand la commande du filleul est payée. */
export const REFERRAL_REWARD_CENTS = 1000;

export type Configuration = {
  productSlug: string;
  optionSlugs: string[];
};

export type QuoteAdjustments = {
  /** Vrai seulement si le serveur a validé le code — jamais déduit du client. */
  referralApplies?: boolean;
  /** Solde d'avoirs disponible, en centimes. */
  creditCents?: number;
};

export type Quote = {
  product: Product;
  options: ProductOption[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  creditAppliedCents: number;
  totalCents: number;
};

export class PricingError extends Error {}

/**
 * Calcule le devis à partir du catalogue fourni.
 *
 * Les options inconnues ou désactivées sont rejetées plutôt qu'ignorées
 * silencieusement : mieux vaut une erreur explicite qu'une commande dont le
 * client croit avoir payé une option qui n'existe plus.
 */
export function computeQuote(
  config: Configuration,
  products: Product[],
  availableOptions: ProductOption[],
  adjustments: QuoteAdjustments = {},
): Quote {
  const product = products.find((p) => p.slug === config.productSlug && p.active);
  if (!product) {
    throw new PricingError(`Pack inconnu ou indisponible : ${config.productSlug}`);
  }

  const options = uniqueSlugs(config.optionSlugs).map((slug) => {
    const option = availableOptions.find((o) => o.slug === slug && o.active);
    if (!option) {
      throw new PricingError(`Option inconnue ou indisponible : ${slug}`);
    }
    return option;
  });

  const subtotalCents =
    product.base_price_cents +
    options.reduce((sum, option) => sum + option.price_cents, 0);

  const discountCents = adjustments.referralApplies
    ? Math.round((subtotalCents * REFERRAL_DISCOUNT_PERCENT) / 100)
    : 0;

  // Le seuil de port offert s'applique au sous-total affiché, avant remise :
  // une remise de parrainage ne doit pas faire réapparaître des frais de port.
  const shippingCents =
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CENTS;

  const beforeCredit = subtotalCents - discountCents + shippingCents;
  const creditAppliedCents = Math.min(
    Math.max(adjustments.creditCents ?? 0, 0),
    beforeCredit,
  );

  return {
    product,
    options,
    subtotalCents,
    discountCents,
    shippingCents,
    creditAppliedCents,
    totalCents: beforeCredit - creditAppliedCents,
  };
}

function uniqueSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)];
}
