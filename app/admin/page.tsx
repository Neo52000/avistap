import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Tableau de bord" };

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [ordersResult, monthResult, toProduceResult, printingResult] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, business_name, status, total_amount_cents, created_at")
        .neq("status", "awaiting_payment")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("orders")
        .select("total_amount_cents, status")
        .gte("paid_at", startOfMonth.toISOString())
        .neq("status", "cancelled"),
      // `head: true` : on ne veut que le compte, pas les lignes.
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "printing"),
    ]);

  const recent = (ordersResult.data ?? []) as Pick<
    Order,
    "id" | "order_number" | "business_name" | "status" | "total_amount_cents" | "created_at"
  >[];

  const monthOrders = (monthResult.data ?? []) as { total_amount_cents: number }[];
  const revenueCents = monthOrders.reduce((sum, o) => sum + o.total_amount_cents, 0);
  const averageCents =
    monthOrders.length > 0 ? Math.round(revenueCents / monthOrders.length) : 0;

  const toProduce = toProduceResult.count ?? 0;
  const printing = printingResult.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Vue d&apos;ensemble du mois en cours.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CA du mois" value={formatPrice(revenueCents)} />
        <Stat label="Commandes du mois" value={String(monthOrders.length)} />
        <Stat label="Panier moyen" value={formatPrice(averageCents)} />
        <Stat
          label="Dans l'atelier"
          value={`${toProduce + printing}`}
          hint={`${toProduce} à produire · ${printing} en impression`}
          href="/admin/production"
        />
      </div>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Dernières commandes
          </h2>
          <Link
            href="/admin/commandes"
            className="text-sm font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Tout voir
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
            Aucune commande pour l&apos;instant.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {recent.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {order.business_name}
                    </p>
                    <p className="text-xs text-ink-muted">{order.order_number}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-ink">
                    {formatPrice(order.total_amount_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </>
  );

  const className = "rounded-xl border border-border bg-surface p-5";

  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-canvas`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
