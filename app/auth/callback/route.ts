import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien magique.
 *
 * Échange le code contre une session, puis déclenche `claim_my_orders` : les
 * commandes passées en invité avec le même email vérifié sont rattachées au
 * compte. C'est ce qui rend l'espace utile dès la première connexion, sans
 * avoir imposé une inscription au moment de l'achat.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/espace";

  if (!code) {
    return NextResponse.redirect(new URL("/espace/connexion?error=lien", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] Échange du code impossible :", error);
    return NextResponse.redirect(new URL("/espace/connexion?error=expire", url.origin));
  }

  const { error: claimError } = await supabase.rpc("claim_my_orders");
  if (claimError) {
    // Non bloquant : la connexion a réussi, seul le rattachement a échoué.
    console.error("[auth] Rattachement des commandes impossible :", claimError);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
