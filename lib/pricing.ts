import type { Product, ProductOption } from "./types";

/**
 * Source unique du calcul de prix.
 *
 * Ce module est importé côté client (affichage temps réel dans le
 * configurateur) ET côté serveur (recalcul avant création de la session
 * Stripe). Le total transmis par le navigateur n'est jamais utilisé comme
 * prix de vente : le serveur relit le catalogue en base et refait le calcul.
 */

/** Frais de port forfaitaires, en centimes. */
export const SHIPPING_CENTS = 590;

/** Au-delà de ce sous-total, les frais de port sont offerts. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 8000;

export type Configuration = {
  productSlug: string;
  optionSlugs: string[];
};

export type Quote = {
  product: Product;
  options: ProductOption[];
  subtotalCents: number;
  shippingCents: number;
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

  const shippingCents =
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CENTS;

  return {
    product,
    options,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

function uniqueSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)];
}
