import "server-only";

import { formatPrice } from "./format";
import { BRAND, siteUrl, SUPPORT_EMAIL } from "./site";
import type { Order } from "./types";

/**
 * Emails transactionnels via Brevo.
 *
 * Sans `BREVO_API_KEY`, les envois sont journalisés puis ignorés : un email
 * qui échoue ne doit jamais empêcher un changement de statut en atelier.
 */

type SendArgs = {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
};

async function sendEmail({ to, toName, subject, html }: SendArgs): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.info(`[notifications] BREVO_API_KEY absente — email ignoré : « ${subject} » → ${to}`);
    return;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL ?? SUPPORT_EMAIL,
          name: process.env.BREVO_SENDER_NAME ?? BRAND,
        },
        to: [{ email: to, name: toName ?? undefined }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      console.error(
        `[notifications] Brevo a répondu ${response.status} : ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error("[notifications] Envoi Brevo impossible :", error);
  }
}

function trackingUrl(order: Order): string {
  return `${siteUrl()}/suivi/${order.public_token}`;
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f6f6f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1c1a;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.01em;">${BRAND}</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${title}</h1>
      ${body}
      <p style="margin:32px 0 0;font-size:13px;color:#6b6b64;">
        Une question ? Répondez simplement à cet email.
      </p>
    </div>
  </body>
</html>`;
}

/** Envoyé dès le paiement confirmé. */
export async function sendOrderConfirmation(order: Order): Promise<void> {
  await sendEmail({
    to: order.customer_email,
    toName: order.customer_name,
    subject: `Votre commande ${order.order_number} est confirmée`,
    html: layout(
      "Merci pour votre commande !",
      `<p style="margin:0 0 16px;line-height:1.6;">
         Nous avons bien reçu votre commande <strong>${order.order_number}</strong>
         pour <strong>${order.business_name}</strong>, d'un montant de
         <strong>${formatPrice(order.total_amount_cents)}</strong>.
       </p>
       <p style="margin:0 0 24px;line-height:1.6;">
         Votre plaque part en fabrication dans notre atelier. Vous pouvez suivre
         son avancement à tout moment :
       </p>
       <p style="margin:0;">
         <a href="${trackingUrl(order)}"
            style="display:inline-block;background:#1c1c1a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
           Suivre ma commande
         </a>
       </p>`,
    ),
  });
}

/** Envoyé au passage en « expédiée ». */
export async function sendShippingNotification(order: Order): Promise<void> {
  const trackingBlock = order.tracking_number
    ? `<p style="margin:0 0 24px;line-height:1.6;">
         Numéro de suivi ${order.carrier ? `(${order.carrier})` : ""} :
         <strong>${order.tracking_number}</strong>
       </p>`
    : "";

  await sendEmail({
    to: order.customer_email,
    toName: order.customer_name,
    subject: `Votre commande ${order.order_number} est en route`,
    html: layout(
      "Votre plaque est expédiée",
      `<p style="margin:0 0 16px;line-height:1.6;">
         Bonne nouvelle : la commande <strong>${order.order_number}</strong> vient
         de quitter notre atelier.
       </p>
       ${trackingBlock}
       <p style="margin:0 0 24px;line-height:1.6;">
         À réception, posez la plaque à votre comptoir : vos clients n'auront
         qu'à approcher leur téléphone pour laisser un avis.
       </p>
       <p style="margin:0;">
         <a href="${trackingUrl(order)}"
            style="display:inline-block;background:#1c1c1a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
           Voir ma commande
         </a>
       </p>`,
    ),
  });
}
