"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  lien: "Ce lien est incomplet. Demandez-en un nouveau ci-dessous.",
  expire: "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.",
};

export function MagicLinkForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    ERRORS[searchParams.get("error") ?? ""] ?? null,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSubmitting(false);

    if (signInError) {
      setError("Envoi impossible pour le moment. Réessayez dans un instant.");
      return;
    }

    // On confirme sans révéler si l'adresse existe : la réponse est la même
    // pour un compte connu et pour une adresse inconnue.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 rounded-xl border border-success bg-success-soft p-6 text-center">
        <p className="font-semibold text-success">Lien envoyé</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Ouvrez l&apos;email envoyé à <strong>{email}</strong> et cliquez sur le
          lien pour accéder à votre espace. Il est valable une heure.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Utiliser une autre adresse
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-6"
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Votre email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="vous@votre-commerce.fr"
          className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="touch-target w-full rounded-lg bg-ink px-5 font-semibold text-white transition-colors hover:bg-ink-soft disabled:opacity-50"
      >
        {submitting ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>

      <p className="text-center text-xs text-ink-muted">
        Pas de mot de passe à retenir.
      </p>
    </form>
  );
}
