import { NextResponse } from "next/server";

import { BRAND, SUPPORT_EMAIL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Redirection NFC — l'adresse encodée sur la puce.
 *
 * `avistap.fr/r/{slug}` → fiche Google du client. Toute la valeur est dans
 * cette indirection : le jour où le client change de fiche, on met à jour
 * `target_url` et la plaque continue de fonctionner.
 *
 * Passe par le service role : `nfc_links` n'est pas lisible publiquement.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: link, error } = await supabase
    .from("nfc_links")
    .select("id, target_url, active, hit_count")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[nfc] Lecture du lien impossible :", error);
    return notFound();
  }

  if (!link || !link.active) {
    return notFound();
  }

  // Compteur indicatif : on ne bloque pas la redirection dessus. Une écriture
  // concurrente peut perdre un incrément, ce qui est sans conséquence ici.
  void supabase
    .from("nfc_links")
    .update({ hit_count: link.hit_count + 1, last_hit_at: new Date().toISOString() })
    .eq("id", link.id)
    .then(({ error: updateError }) => {
      if (updateError) console.error("[nfc] Incrément impossible :", updateError);
    });

  // Rollup journalier, qui alimente les courbes de l'espace commerçant.
  // Comme le compteur : on n'attend pas, et un échec ne casse pas la
  // redirection.
  void supabase
    .rpc("record_nfc_scan", { p_link_id: link.id })
    .then(({ error: scanError }) => {
      if (scanError) console.error("[nfc] Rollup impossible :", scanError);
    });

  // 302 : la cible peut changer, elle ne doit jamais être mise en cache
  // durablement par le navigateur.
  return NextResponse.redirect(link.target_url, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}

function notFound() {
  return new NextResponse(
    `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Lien introuvable · ${BRAND}</title>
  </head>
  <body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#faf8f3;color:#17160f;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:24px;">
    <div>
      <p style="font-size:18px;font-weight:700;margin:0 0 12px;">${BRAND}</p>
      <h1 style="font-size:20px;margin:0 0 8px;">Ce lien n'est plus actif</h1>
      <p style="color:#4a4840;margin:0;">Contactez l'établissement ou écrivez-nous à ${SUPPORT_EMAIL}.</p>
    </div>
  </body>
</html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
