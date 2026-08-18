import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatDate, formatDateTime, STATUS_LABELS, TRACKING_STEPS } from "@/lib/format";
import { SUPPORT_EMAIL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { OrderTracking } from "@/lib/types";

export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // La RPC `get_order_tracking` est le seul accès public aux commandes : elle
  // ne renvoie ni email, ni adresse, ni montant.
  const { data, error } = await supabase.rpc("get_order_tracking", {
    p_token: token,
  });

  if (error) {
    console.error("[suivi] Lecture impossible :", error);
  }

  const tracking = data as OrderTracking | null;
  if (!tracking) notFound();

  const currentIndex = TRACKING_STEPS.findIndex(
    (step) => step.status === tracking.status,
  );
  // « Livrée » vient après la dernière étape affichée : tout est franchi.
  const reachedIndex =
    tracking.status === "delivered" ? TRACKING_STEPS.length - 1 : currentIndex;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <p className="text-sm font-medium text-ink-muted">
            Commande {tracking.order_number}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {tracking.business_name}
          </h1>
          <p className="mt-2 text-ink-soft">
            Commandée le {formatDate(tracking.created_at)}
          </p>

          {tracking.status === "cancelled" ? (
            <div className="mt-8 rounded-xl border border-danger bg-danger-soft p-6">
              <p className="font-semibold text-danger">Commande annulée</p>
              <p className="mt-1 text-sm text-ink-soft">
                Une question ? Écrivez-nous à {SUPPORT_EMAIL}.
              </p>
            </div>
          ) : (
            <ol className="mt-10 space-y-0">
              {TRACKING_STEPS.map((step, index) => {
                const done = index <= reachedIndex;
                const current = index === reachedIndex;
                const last = index === TRACKING_STEPS.length - 1;

                return (
                  <li key={step.status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                          done
                            ? "border-ink bg-ink text-white"
                            : "border-border-strong bg-surface text-ink-muted"
                        }`}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      {!last && (
                        <span
                          className={`w-0.5 flex-1 ${
                            index < reachedIndex ? "bg-ink" : "bg-border"
                          }`}
                        />
                      )}
                    </div>

                    <div className={last ? "pb-0" : "pb-8"}>
                      <p
                        className={`font-semibold ${
                          done ? "text-ink" : "text-ink-muted"
                        }`}
                      >
                        {step.label}
                      </p>
                      {current && (
                        <p className="mt-1 text-sm text-ink-soft">
                          {stepHint(step.status)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {tracking.tracking_number && (
            <div className="mt-8 rounded-xl border border-border bg-surface p-6">
              <p className="font-semibold text-ink">Suivi du colis</p>
              <p className="mt-1 text-sm text-ink-soft">
                {tracking.carrier ? `${tracking.carrier} — ` : ""}
                <span className="font-mono">{tracking.tracking_number}</span>
              </p>
            </div>
          )}

          {tracking.events.length > 0 && (
            <details className="mt-8 rounded-xl border border-border bg-surface p-6">
              <summary className="cursor-pointer font-semibold text-ink">
                Historique détaillé
              </summary>
              <ul className="mt-4 space-y-2 text-sm">
                {tracking.events.map((event, index) => (
                  <li key={index} className="flex justify-between gap-4">
                    <span className="text-ink-soft">
                      {STATUS_LABELS[event.to_status]}
                      {event.note ? ` — ${event.note}` : ""}
                    </span>
                    <span className="shrink-0 text-ink-muted">
                      {formatDateTime(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="mt-10 text-sm text-ink-muted">
            Conservez ce lien : il vous donne l&apos;état de votre commande à tout
            moment.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function stepHint(status: string): string {
  switch (status) {
    case "pending":
      return "Votre commande est dans notre file de production.";
    case "printing":
      return "Impression et encodage de la puce en cours dans notre atelier.";
    case "shipped":
      return "Votre colis est en route.";
    default:
      return "";
  }
}
