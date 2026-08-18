"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { siteUrl as configuredSiteUrl } from "@/lib/site";
import type { NfcLink, Order } from "@/lib/types";

import {
  backToQueue,
  cancelOrder,
  markDelivered,
  markShipped,
  saveAdminNotes,
  startPrinting,
  updateNfcTarget,
  type ActionResult,
} from "../../actions";

type Props = {
  order: Order;
  nfcLink: NfcLink | null;
  googleLink: string | null;
};

export function OrderActions({ order, nfcLink, googleLink }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "Colissimo");
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [target, setTarget] = useState(nfcLink?.target_url ?? googleLink ?? "");

  // L'origine du navigateur d'abord (utile en préproduction), sinon la valeur
  // configurée — jamais un domaine codé en dur.
  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : configuredSiteUrl();

  function run(action: () => Promise<ActionResult>, successText: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      setMessage({ text: successText, ok: true });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Lien NFC */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Lien NFC
        </h2>

        {nfcLink ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all font-mono text-sm font-semibold text-ink">
                {siteUrl}/r/{nfcLink.slug}
              </code>
              <CopyButton value={`${siteUrl}/r/${nfcLink.slug}`} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {nfcLink.hit_count} scan{nfcLink.hit_count > 1 ? "s" : ""} enregistré
              {nfcLink.hit_count > 1 ? "s" : ""}
            </p>

            <label className="mt-4 block space-y-1.5">
              <span className="block text-sm font-medium text-ink">
                Redirige vers
              </span>
              <input
                type="url"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => updateNfcTarget(nfcLink.id, target), "Redirection mise à jour.")
              }
              className="touch-target mt-2 w-full rounded-lg border border-border-strong px-4 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
            >
              Mettre à jour la redirection
            </button>
            <p className="mt-2 text-xs text-ink-muted">
              Le client a changé de fiche Google ? Modifiez ici : la plaque déjà
              livrée continue de fonctionner.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Aucun lien NFC généré pour cette commande.
          </p>
        )}
      </section>

      {/* Statut */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Statut
        </h2>

        <div className="space-y-3">
          {order.status === "pending" && (
            <Action
              label="Passer en impression"
              primary
              disabled={pending}
              onClick={() => run(() => startPrinting(order.id), "Passée en impression.")}
            />
          )}

          {order.status === "printing" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-ink">
                    Transporteur
                  </span>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="touch-target w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-ink"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-ink">
                    N° de suivi
                  </span>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="touch-target w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm text-ink outline-none focus:border-ink"
                  />
                </label>
              </div>

              <Action
                label="Marquer expédiée"
                primary
                disabled={pending}
                onClick={() =>
                  run(
                    () => markShipped(order.id, trackingNumber, carrier),
                    "Commande expédiée, email envoyé.",
                  )
                }
              />
              <Action
                label="Remettre dans la file"
                disabled={pending}
                onClick={() => run(() => backToQueue(order.id), "Remise dans la file.")}
              />
            </>
          )}

          {order.status === "shipped" && (
            <Action
              label="Marquer livrée"
              primary
              disabled={pending}
              onClick={() => run(() => markDelivered(order.id), "Livraison confirmée.")}
            />
          )}

          {["pending", "printing"].includes(order.status) && (
            <Action
              label="Annuler la commande"
              danger
              disabled={pending}
              onClick={() => run(() => cancelOrder(order.id), "Commande annulée.")}
            />
          )}

          {order.status === "delivered" && (
            <p className="text-sm text-ink-muted">
              Commande terminée. Aucune action restante.
            </p>
          )}
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Notes d&apos;atelier
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Réglages laser, remarques particulières…"
          className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-ink outline-none focus:border-ink"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveAdminNotes(order.id, notes), "Note enregistrée.")}
          className="touch-target mt-2 w-full rounded-lg border border-border-strong px-4 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
        >
          Enregistrer la note
        </button>
      </section>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function Action({
  label,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const style = primary
    ? "bg-ink text-white hover:bg-ink-soft"
    : danger
      ? "border border-danger text-danger hover:bg-danger-soft"
      : "border border-border-strong text-ink hover:bg-canvas";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`touch-target w-full rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-50 ${style}`}
    >
      {label}
    </button>
  );
}
