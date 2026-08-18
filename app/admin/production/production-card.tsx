"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { formatDate } from "@/lib/format";
import { siteUrl as configuredSiteUrl } from "@/lib/site";
import type { Order, OrderItem } from "@/lib/types";

import { markShipped, startPrinting } from "../actions";

type Props = {
  order: Order & {
    order_items: OrderItem[];
    nfc_links: { id: string; slug: string; target_url: string }[];
  };
  logoUrl: string | null;
};

/**
 * Une tâche d'atelier, pas une ligne comptable.
 *
 * Conçue pour être lue et validée depuis un smartphone posé près de la presse :
 * nom lisible de loin, boutons pleine largeur, aucun montant.
 */
export function ProductionCard({ order, logoUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("Colissimo");

  const item = order.order_items[0];
  const options = item?.customizations?.options ?? [];
  const plaqueCount = item?.customizations?.plaque_count;
  const nfcLink = order.nfc_links[0];

  // L'origine du navigateur d'abord (utile en préproduction), sinon la valeur
  // configurée — jamais un domaine codé en dur.
  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : configuredSiteUrl();
  const nfcUrl = nfcLink ? `${siteUrl}/r/${nfcLink.slug}` : null;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      {/* En-tête : ce qu'on lit à un mètre de distance */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold leading-tight tracking-tight text-ink sm:text-2xl">
            {order.business_name}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {order.order_number} · reçue le {formatDate(order.created_at)}
          </p>
        </div>

        {order.status === "printing" && (
          <span className="rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-info">
            En impression
          </span>
        )}
      </div>

      {/* Ce qu'il faut fabriquer */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
          {plaqueCount ? `${plaqueCount} plaque${plaqueCount > 1 ? "s" : ""}` : item?.product_name}
        </span>
        {options.map((option) => (
          <span
            key={option.slug}
            className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-strong"
          >
            {option.name}
          </span>
        ))}
      </div>

      {/* Logo */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        {logoUrl ? (
          <>
            {/* Fichier client de dimensions inconnues, éventuellement un PDF :
                un <img> simple est plus fiable ici que next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={`Logo ${order.business_name}`}
              className="size-20 rounded-lg border border-border bg-canvas object-contain p-1.5"
            />
            <a
              href={logoUrl}
              download
              className="touch-target inline-flex items-center rounded-lg border border-border-strong px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Télécharger le logo
            </a>
          </>
        ) : (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            Aucun logo fourni — à réclamer au client
          </p>
        )}
      </div>

      {/* Lien à encoder sur la puce */}
      <div className="mt-5 rounded-lg border border-border bg-canvas p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          À encoder sur la puce
        </p>
        {nfcUrl ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="flex-1 break-all font-mono text-sm font-semibold text-ink">
              {nfcUrl}
            </code>
            <CopyButton value={nfcUrl} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-danger">
            Lien NFC non généré — vérifiez la fiche commande.
          </p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          Redirige vers la fiche Google du client. Ne jamais encoder le lien
          Google directement.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="mt-5 space-y-3">
        {order.status === "pending" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => startPrinting(order.id))}
            className="touch-target w-full rounded-lg bg-ink px-5 font-semibold text-white transition-colors hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? "…" : "Passer en impression"}
          </button>
        )}

        {order.status === "printing" &&
          (shippingOpen ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-ink">
                    Transporteur
                  </span>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none focus:border-ink"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-ink">
                    Numéro de suivi
                  </span>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="touch-target w-full rounded-lg border border-border bg-surface px-3 font-mono text-ink outline-none focus:border-ink"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => markShipped(order.id, trackingNumber, carrier))
                  }
                  className="touch-target flex-1 rounded-lg bg-success px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "…" : "Confirmer l'expédition"}
                </button>
                <button
                  type="button"
                  onClick={() => setShippingOpen(false)}
                  className="touch-target rounded-lg border border-border-strong px-5 font-semibold text-ink transition-colors hover:bg-canvas"
                >
                  Annuler
                </button>
              </div>

              <p className="text-xs text-ink-muted">
                La confirmation envoie l&apos;email d&apos;expédition au client.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShippingOpen(true)}
              className="touch-target w-full rounded-lg bg-success px-5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Marquer expédiée
            </button>
          ))}

        <Link
          href={`/admin/commandes/${order.id}`}
          className="touch-target flex w-full items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        >
          Voir la fiche complète
        </Link>
      </div>
    </article>
  );
}
