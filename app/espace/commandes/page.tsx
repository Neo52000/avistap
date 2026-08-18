import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { requireMerchant } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mes commandes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CommandesPage() {
  await requireMerchant();
  const supabase = await createClient();

  // La RLS filtre par `profile_id` : pas de `.eq()` à ajouter ici.
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .neq("status", "awaiting_payment")
    .order("created_at", { ascending: false });

  if (error) console.error("[espace] Lecture des commandes impossible :", error);
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Mes commandes</h1>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
          Aucune commande rattachée à ce compte. Si vous avez commandé avec une
          autre adresse email, connectez-vous avec celle-ci.
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{order.business_name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {order.order_number} · {formatDate(order.created_at)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-muted">Montant</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {formatPrice(order.total_amount_cents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Suivi transporteur</dt>
                  <dd className="mt-0.5 text-ink">
                    {order.tracking_number
                      ? `${order.carrier ?? ""} ${order.tracking_number}`.trim()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Détail</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/suivi/${order.public_token}`}
                      className="font-medium text-ink underline underline-offset-2 hover:text-ink-soft"
                    >
                      Voir le suivi
                    </Link>
                  </dd>
                </div>
              </dl>

              {order.discount_cents > 0 && (
                <p className="mt-3 text-xs text-success">
                  Remise parrainage appliquée :{" "}
                  {formatPrice(order.discount_cents)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
