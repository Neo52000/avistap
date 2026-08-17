import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Commandes" };

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "À produire" },
  { value: "printing", label: "En impression" },
  { value: "shipped", label: "Expédiées" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requireAdmin();
  const { statut } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (statut && statut !== "all") {
    query = query.eq("status", statut);
  } else {
    // Les commandes jamais payées ne sont pas des commandes : on les masque
    // par défaut pour ne pas polluer la liste.
    query = query.neq("status", "awaiting_payment");
  }

  const { data, error } = await query;
  if (error) console.error("[commandes] Lecture impossible :", error);

  const orders = (data ?? []) as Order[];
  const active = statut ?? "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Commandes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {orders.length} commande{orders.length > 1 ? "s" : ""} affichée
          {orders.length > 1 ? "s" : ""}.
        </p>
      </div>

      <nav className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          {FILTERS.map((filter) => (
            <li key={filter.value}>
              <Link
                href={
                  filter.value === "all"
                    ? "/admin/commandes"
                    : `/admin/commandes?statut=${filter.value}`
                }
                className={`inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active === filter.value
                    ? "bg-ink text-white"
                    : "border border-border bg-surface text-ink-soft hover:text-ink"
                }`}
              >
                {filter.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
          Aucune commande pour ce filtre.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/commandes/${order.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-canvas"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {order.business_name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {order.order_number} · {formatDate(order.created_at)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <span className="w-20 shrink-0 text-right font-semibold text-ink">
                  {formatPrice(order.total_amount_cents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
