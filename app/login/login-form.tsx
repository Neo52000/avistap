"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "forbidden"
      ? "Ce compte n'a pas accès au back office."
      : null,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setSubmitting(false);
      return;
    }

    // `refresh` fait relire la session côté serveur avant la navigation.
    router.refresh();
    router.push(searchParams.get("redirect") ?? "/admin");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-6"
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors focus:border-ink"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors focus:border-ink"
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
        {submitting ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
