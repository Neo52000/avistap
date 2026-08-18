import { z } from "zod";

/**
 * Schéma du panier envoyé au serveur.
 *
 * Aucun montant n'y figure volontairement : le serveur relit le catalogue et
 * recalcule le total via `computeQuote`. Un prix envoyé par le navigateur
 * serait un prix choisi par le client.
 */

/** Hôtes acceptés pour un lien de fiche Google. */
const GOOGLE_HOSTS = [
  "g.page",
  "goo.gl",
  "maps.app.goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "search.google.com",
  "business.google.com",
];

export function isGoogleBusinessLink(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const host = url.hostname.toLowerCase();
  return GOOGLE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export const googleBusinessLinkSchema = z
  .string()
  .trim()
  .min(1, "Le lien de votre fiche Google est nécessaire pour encoder la puce.")
  .refine(isGoogleBusinessLink, {
    message:
      "Ce lien ne ressemble pas à une fiche Google. Copiez l'adresse depuis Google Maps ou votre fiche d'établissement.",
  });

export const shippingAddressSchema = z.object({
  line1: z.string().trim().min(1, "Adresse requise").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Code postal à 5 chiffres"),
  city: z.string().trim().min(1, "Ville requise").max(120),
  country: z.string().trim().min(2).max(60).default("France"),
});

export const checkoutSchema = z.object({
  productSlug: z.string().trim().min(1, "Choisissez un pack"),
  optionSlugs: z.array(z.string().trim().min(1)).max(20).default([]),

  businessName: z
    .string()
    .trim()
    .min(1, "Le nom de votre établissement est requis")
    .max(160),
  customerName: z.string().trim().min(1, "Votre nom est requis").max(160),
  customerEmail: z.string().trim().email("Adresse email invalide").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),

  googleBusinessLink: googleBusinessLinkSchema,
  logoPath: z.string().trim().max(400).optional().or(z.literal("")),

  shippingAddress: shippingAddressSchema,

  /** Code de parrainage saisi par le filleul. Revalidé côté serveur. */
  referralCode: z.string().trim().max(32).optional().or(z.literal("")),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;
