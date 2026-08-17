import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

export type AdminUser = {
  id: string;
  email: string;
};

/**
 * Contrôle serveur du rôle admin.
 *
 * Le middleware ne vérifie que l'existence d'une session ; c'est ici qu'on
 * vérifie réellement le rôle. À appeler dans chaque page ou server action du
 * back office.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // La RLS de `profiles` n'autorise la lecture que de sa propre ligne : un
  // compte non-admin lit bien son profil et se voit refuser l'accès ci-dessous.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/login?error=forbidden");
  }

  return { id: user.id, email: user.email ?? "" };
}
