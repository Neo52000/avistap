import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_STATUS_LABELS, formatDateTime, formatPrice } from "@/lib/format";
import { getSignedLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { NfcLink, Order, OrderEvent, OrderItem } from "@/lib/types";

import { OrderActions } from "./order-actions";

export const metadata: Metadata = { title: "Fiche commande" };

export const dynamic = "force-dynamic";

type FullOrder = Order & {
  order_items: OrderItem[];
  order_events: OrderEvent[];
  nfc_links: NfcLink[];
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_events(*), nfc_links(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("[commande] Lecture impossible :", error);
  if (!data) notFound();

  const order = data as FullOrder;
  const logoUrl = await getSignedLogoUrl(order.logo_url);
  const events = [...order.order_events].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const address = order.shipping_address;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/commandes"
        className="inline-flex text-sm font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        ← Toutes les commandes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {order.business_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {order.order_number} · {formatDateTime(order.created_at)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-5">
          {/* Fabrication */}
          <Panel title="Fabrication">
            <dl className="space-y-3 text-sm">
              {order.order_items.map((item) => (
                <div key={item.id}>
                  <dt className="font-medium text-ink">{item.product_name}</dt>
                  <dd className="mt-1 text-ink-soft">
                    {(item.customizations?.options ?? []).length > 0
                      ? `Options : ${(item.customizations.options ?? [])
                          .map((o) => o.name)
                          .join(", ")}`
                      : "Aucune option"}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Logo
              </p>
              {logoUrl ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={`Logo ${order.business_name}`}
                    className="size-20 rounded-lg border border-border bg-canvas object-contain p-1.5"
                  />
                  <a
                    href={logoUrl}
                    download
                    className="touch-target inline-flex items-center rounded-lg border border-border-strong px-4 text-sm font-semibold text-ink hover:bg-canvas"
                  >
                    Télécharger
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-sm text-danger">Aucun logo fourni.</p>
              )}
            </div>
          </Panel>

          {/* Client */}
          <Panel title="Client et livraison">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Nom" value={order.customer_name} />
              <Row label="Email" value={order.customer_email} />
              <Row label="Téléphone" value={order.phone} />
              <Row
                label="Adresse"
                value={
                  address
                    ? [
                        address.line1,
                        address.line2,
                        `${address.postal_code} ${address.city}`,
                        address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : null
                }
              />
              <Row
                label="Suivi transporteur"
                value={
                  order.tracking_number
                    ? `${order.carrier ?? ""} ${order.tracking_number}`.trim()
                    : null
                }
              />
              <Row
                label="Lien de suivi client"
                value={`/suivi/${order.public_token}`}
              />
            </dl>
          </Panel>

          {/* Historique */}
          <Panel title="Historique">
            {events.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucun événement.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {events.map((event) => (
                  <li key={event.id} className="flex flex-wrap justify-between gap-2">
                    <span className="text-ink-soft">
                      {ADMIN_STATUS_LABELS[event.to_status]}
                      {event.note ? ` — ${event.note}` : ""}
                      {event.actor ? ` (${event.actor})` : ""}
                    </span>
                    <span className="text-ink-muted">
                      {formatDateTime(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Montant">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Sous-total</dt>
                <dd className="font-medium text-ink">
                  {formatPrice(order.subtotal_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Livraison</dt>
                <dd className="font-medium text-ink">
                  {order.shipping_cents === 0
                    ? "Offerte"
                    : formatPrice(order.shipping_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="text-lg font-bold text-ink">
                  {formatPrice(order.total_amount_cents)}
                </dd>
              </div>
            </dl>
          </Panel>

          <OrderActions
            order={order}
            nfcLink={order.nfc_links[0] ?? null}
            googleLink={order.google_business_link}
          />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value || "—"}</dd>
    </div>
  );
}
