import "server-only";

import { createAdminClient } from "./supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 h : le temps d'une session d'atelier

/**
 * URL signée pour consulter ou télécharger un logo client.
 *
 * Le bucket `logos` est privé : sans signature, les fichiers ne sont pas
 * accessibles. À n'appeler que depuis du code déjà protégé par `requireAdmin`.
 */
export async function getSignedLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from("logos")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[storage] Signature impossible :", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[storage] Client indisponible :", error);
    return null;
  }
}

/** Signe plusieurs logos en une passe (liste de production). */
export async function getSignedLogoUrls(
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const signed = new Map<string, string>();

  await Promise.all(
    unique.map(async (path) => {
      const url = await getSignedLogoUrl(path);
      if (url) signed.set(path, url);
    }),
  );

  return signed;
}
