import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

export const dynamic = "force-dynamic";

type Customer = {
  email: string;
  name: string | null;
  businessNames: Set<string>;
  orders: Order[];
  totalCents: number;
  lastOrderAt: string;
  hasAccount: boolean;
};

export default async function ClientsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .neq("status", "awaiting_payment")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) console.error("[clients] Lecture impossible :", error);

  // Le regroupement se fait par email : c'est la clé qui relie une commande en
  // invité au compte créé plus tard.
  const byEmail = new Map<string, Customer>();

  for (const row of (data ?? []) as Order[]) {
    const key = row.customer_email.toLowerCase();
    const existing = byEmail.get(key);

    if (existing) {
      existing.orders.push(row);
      existing.totalCents += row.total_amount_cents;
      existing.businessNames.add(row.business_name);
      existing.hasAccount ||= Boolean(row.profile_id);
    } else {
      byEmail.set(key, {
        email: row.customer_email,
        name: row.customer_name,
        businessNames: new Set([row.business_name]),
        orders: [row],
        totalCents: row.total_amount_cents,
        lastOrderAt: row.created_at,
        hasAccount: Boolean(row.profile_id),
      });
    }
  }

  const customers = [...byEmail.values()].sort((a, b) =>
    b.lastOrderAt.localeCompare(a.lastOrderAt),
  );

  const repeat = customers.filter((c) => c.orders.length > 1).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Clients</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {customers.length} client{customers.length > 1 ? "s" : ""} ·{" "}
          {repeat} ayant recommandé
        </p>
      </div>

      {customers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
          Aucun client pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {customers.map((customer) => (
            <li
              key={customer.email}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {[...customer.businessNames].join(" · ")}
                  </p>
                  <p className="mt-0.5 break-all text-xs text-ink-muted">
                    {customer.name ? `${customer.name} — ` : ""}
                    {customer.email}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {customer.hasAccount ? (
                    <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                      Compte actif
                    </span>
                  ) : (
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-muted">
                      Sans compte
                    </span>
                  )}
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-muted">Commandes</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {customer.orders.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Total dépensé</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {formatPrice(customer.totalCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Dernière commande</dt>
                  <dd className="mt-0.5 text-ink">
                    {formatDate(customer.lastOrderAt)}
                  </dd>
                </div>
              </dl>

              <ul className="mt-4 flex flex-wrap gap-2">
                {customer.orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/commandes/${order.id}`}
                      className="inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
                    >
                      {order.order_number}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
