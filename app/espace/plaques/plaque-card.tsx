"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { formatDate } from "@/lib/format";
import type { MerchantPlaque } from "@/lib/merchant";

import { updateMyNfcTarget } from "../actions";

export function PlaqueCard({
  plaque,
  baseUrl,
}: {
  plaque: MerchantPlaque;
  baseUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState(plaque.target_url);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const origin = typeof window !== "undefined" ? window.location.origin : baseUrl;
  const nfcUrl = `${origin}/r/${plaque.slug}`;
  const dirty = target.trim() !== plaque.target_url;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMyNfcTarget(plaque.id, target);
      if (!result.ok) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      setMessage({
        text: "Redirection mise à jour. Vos plaques pointent désormais vers ce lien.",
        ok: true,
      });
      router.refresh();
    });
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-ink">
            {plaque.business_name}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Commande {plaque.order_number}
            {plaque.last_hit_at
              ? ` · dernier scan le ${formatDate(plaque.last_hit_at)}`
              : " · jamais scannée"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
          {plaque.hit_count} scan{plaque.hit_count > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-canvas p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Adresse encodée sur la puce
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="flex-1 break-all font-mono text-sm font-semibold text-ink">
            {nfcUrl}
          </code>
          <CopyButton value={nfcUrl} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label
          htmlFor={`target-${plaque.id}`}
          className="block text-sm font-medium text-ink"
        >
          Redirige vers votre fiche Google
        </label>
        <input
          id={`target-${plaque.id}`}
          type="url"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-ink"
        />
        <p className="text-xs leading-relaxed text-ink-muted">
          Attention : la modification est immédiate et vaut pour{" "}
          <strong>toutes les plaques déjà posées</strong> qui utilisent cette
          adresse.
        </p>

        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="touch-target w-full rounded-lg bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft disabled:opacity-40 sm:w-auto"
        >
          {pending ? "Enregistrement…" : "Enregistrer la redirection"}
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.ok
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {message.text}
        </p>
      )}
    </article>
  );
}
