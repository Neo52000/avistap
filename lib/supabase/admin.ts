import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Client à privilèges élevés : contourne la RLS.
 *
 * `server-only` en tête de fichier fait échouer la compilation si un composant
 * client l'importe par erreur — ce qui exfiltrerait la clé service role dans
 * le bundle navigateur.
 *
 * Réservé aux opérations que le client n'a pas le droit de faire lui-même :
 * création de commande après recalcul du prix, traitement du webhook Stripe,
 * résolution des liens NFC.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : renseignez-la dans .env.local",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
