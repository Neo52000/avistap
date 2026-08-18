import { NextResponse } from "next/server";

import { fetchCatalog } from "@/lib/catalog";
import { markOrderPaid } from "@/lib/orders-server";
import { computeQuote, PricingError } from "@/lib/pricing";
import {
  consumeCredit,
  getCreditBalance,
  resolveReferralCode,
} from "@/lib/referrals";
import { getStripe, siteUrl } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation";

/**
 * Création de commande + ouverture du paiement.
 *
 * Le total n'est jamais lu depuis la requête : le catalogue est relu en base
 * et `computeQuote` refait le calcul. Sans clé Stripe, la commande est marquée
 * payée immédiatement (mode simulé) pour garder le parcours testable.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Formulaire incomplet." },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const supabase = createAdminClient();

  // --- Qui commande ? -------------------------------------------------------
  // Le tunnel reste ouvert aux invités ; si une session existe, on rattache la
  // commande et on autorise l'usage du solde d'avoirs.
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const profileId = user?.id ?? null;
  const creditCents = profileId ? await getCreditBalance(supabase, profileId) : 0;

  // Le code est revalidé en base : celui envoyé par le navigateur ne prouve
  // rien, et un code inconnu ne doit pas silencieusement offrir la remise.
  const referrer = payload.referralCode
    ? await resolveReferralCode(supabase, payload.referralCode)
    : null;

  // On ne se parraine pas soi-même.
  const referralApplies = Boolean(referrer) && referrer!.profileId !== profileId;

  // --- Prix faisant foi -----------------------------------------------------
  let quote;
  try {
    const { products, options } = await fetchCatalog(supabase);
    quote = computeQuote(
      { productSlug: payload.productSlug, optionSlugs: payload.optionSlugs },
      products,
      options,
      { referralApplies, creditCents },
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[checkout] Lecture du catalogue impossible :", error);
    return NextResponse.json(
      { error: "Catalogue indisponible. Réessayez dans un instant." },
      { status: 503 },
    );
  }

  // --- Commande -------------------------------------------------------------
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_email: payload.customerEmail,
      customer_name: payload.customerName,
      business_name: payload.businessName,
      phone: payload.phone || null,
      shipping_address: payload.shippingAddress,
      subtotal_cents: quote.subtotalCents,
      shipping_cents: quote.shippingCents,
      discount_cents: quote.discountCents,
      total_amount_cents: quote.totalCents,
      status: "awaiting_payment",
      profile_id: profileId,
      referral_code: referralApplies ? referrer!.code : null,
      google_business_link: payload.googleBusinessLink,
      logo_url: payload.logoPath || null,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    console.error("[checkout] Création de commande impossible :", orderError);
    return NextResponse.json(
      { error: "La commande n'a pas pu être enregistrée." },
      { status: 500 },
    );
  }

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: quote.product.id,
    product_name: quote.product.name,
    quantity: 1,
    unit_price_cents: quote.product.base_price_cents,
    customizations: {
      plaque_count: quote.product.plaque_count,
      options: quote.options.map((option) => ({
        slug: option.slug,
        name: option.name,
        price_cents: option.price_cents,
      })),
    },
  });

  if (itemError) {
    console.error("[checkout] Enregistrement des lignes impossible :", itemError);
  }

  // L'avoir est consommé dès la création de la commande : le montant est déjà
  // déduit du total envoyé à Stripe, le laisser disponible permettrait de le
  // dépenser deux fois.
  if (profileId && quote.creditAppliedCents > 0) {
    await consumeCredit(supabase, {
      profileId,
      orderId: order.id,
      amountCents: quote.creditAppliedCents,
    });
  }

  // --- Paiement -------------------------------------------------------------
  const stripe = getStripe();

  if (!stripe) {
    // Mode simulé : sans clé Stripe on marque la commande payée pour que
    // l'atelier et la page de suivi restent testables de bout en bout.
    await markOrderPaid(supabase, order.id);
    return NextResponse.json({
      url: `/checkout/success?token=${order.public_token}&simule=1`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: payload.customerEmail,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: order.order_number },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.max(
              quote.subtotalCents - quote.discountCents - quote.creditAppliedCents,
              0,
            ),
            product_data: {
              name: quote.product.name,
              description:
                quote.options.length > 0
                  ? `Options : ${quote.options.map((o) => o.name).join(", ")}`
                  : undefined,
            },
          },
        },
      ],
      shipping_options:
        quote.shippingCents > 0
          ? [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  display_name: "Livraison",
                  fixed_amount: { amount: quote.shippingCents, currency: "eur" },
                },
              },
            ]
          : undefined,
      success_url: `${siteUrl()}/checkout/success?token=${order.public_token}`,
      cancel_url: `${siteUrl()}/checkout/cancel`,
    });

    if (!session.url) {
      throw new Error("Stripe n'a pas renvoyé d'URL de session");
    }

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] Création de la session Stripe impossible :", error);
    return NextResponse.json(
      { error: "Le paiement est indisponible. Réessayez dans un instant." },
      { status: 502 },
    );
  }
}
