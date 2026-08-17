import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Réception du logo client.
 *
 * L'upload ne va jamais directement du navigateur au Storage : le bucket est
 * privé et cette route valide le type et la taille avant d'écrire avec le
 * service role. Le navigateur ne reçoit qu'un chemin opaque.
 */

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop lourd : 5 Mo maximum." },
      { status: 413 },
    );
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Format non accepté. Utilisez PNG, JPG, WEBP, SVG ou PDF." },
      { status: 415 },
    );
  }

  // Chemin aléatoire : deux clients qui envoient « logo.png » ne se marchent
  // pas dessus, et le nom d'origine n'est pas exposé.
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error("[upload-logo] Échec de l'écriture Storage :", error);
      return NextResponse.json(
        { error: "Envoi impossible pour le moment." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[upload-logo] Erreur inattendue :", error);
    return NextResponse.json(
      { error: "Envoi impossible pour le moment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ path });
}
