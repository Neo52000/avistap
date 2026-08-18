import type { Metadata } from "next";

import { ScanBars } from "@/components/charts/scan-bars";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { buildDailySeries } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Statistiques" };

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function StatistiquesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (WINDOW_DAYS - 1));
  const sinceIso = since.toISOString();

  const [ordersResult, scansResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, customer_email, total_amount_cents, discount_cents, status, paid_at, created_at")
      .neq("status", "awaiting_payment")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("nfc_scan_daily")
      .select("day, count")
      .gte("day", sinceIso.slice(0, 10)),
  ]);

  if (ordersResult.error) {
    console.error("[statistiques] Lecture impossible :", ordersResult.error);
  }

  const orders = (ordersResult.data ?? []) as Pick<
    Order,
    | "id"
    | "customer_email"
    | "total_amount_cents"
    | "discount_cents"
    | "status"
    | "paid_at"
    | "created_at"
  >[];

  const paid = orders.filter((o) => o.status !== "cancelled");
  const recent = paid.filter((o) => (o.paid_at ?? o.created_at) >= sinceIso);

  const revenueCents = paid.reduce((sum, o) => sum + o.total_amount_cents, 0);
  const recentRevenueCents = recent.reduce((sum, o) => sum + o.total_amount_cents, 0);
  const averageCents = paid.length > 0 ? Math.round(revenueCents / paid.length) : 0;
  const discountCents = paid.reduce((sum, o) => sum + (o.discount_cents ?? 0), 0);

  // Taux de réachat : part des clients ayant commandé plus d'une fois.
  const ordersByEmail = new Map<string, number>();
  for (const order of paid) {
    const key = order.customer_email.toLowerCase();
    ordersByEmail.set(key, (ordersByEmail.get(key) ?? 0) + 1);
  }
  const customers = ordersByEmail.size;
  const repeatCustomers = [...ordersByEmail.values()].filter((n) => n > 1).length;
  const repeatRate =
    customers > 0 ? Math.round((repeatCustomers / customers) * 100) : 0;

  // Scans agrégés, toutes plaques confondues.
  const scanTotals = new Map<string, number>();
  for (const row of (scansResult.data ?? []) as { day: string; count: number }[]) {
    scanTotals.set(row.day, (scanTotals.get(row.day) ?? 0) + row.count);
  }
  const scanSeries = buildDailySeries(
    [...scanTotals].map(([day, count]) => ({ day, count })),
    WINDOW_DAYS,
  );
  const scanTotal = scanSeries.reduce((sum, p) => sum + p.count, 0);

  // Commandes par jour, sur la même fenêtre.
  const orderTotals = new Map<string, number>();
  for (const order of recent) {
    const day = (order.paid_at ?? order.created_at).slice(0, 10);
    orderTotals.set(day, (orderTotals.get(day) ?? 0) + 1);
  }
  const orderSeries = buildDailySeries(
    [...orderTotals].map(([day, count]) => ({ day, count })),
    WINDOW_DAYS,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Statistiques</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Fenêtre glissante de {WINDOW_DAYS} jours, sauf mention contraire.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`CA (${WINDOW_DAYS} j)`} value={formatPrice(recentRevenueCents)} />
        <Stat
          label="CA total"
          value={formatPrice(revenueCents)}
          hint={`${paid.length} commande${paid.length > 1 ? "s" : ""}`}
        />
        <Stat label="Panier moyen" value={formatPrice(averageCents)} />
        <Stat
          label="Taux de réachat"
          value={`${repeatRate} %`}
          hint={`${repeatCustomers} sur ${customers} client${customers > 1 ? "s" : ""}`}
        />
      </div>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Commandes par jour</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {recent.length} sur la période
        </p>
        <ScanBars points={orderSeries} className="mt-6" />
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Scans par jour, toutes plaques</h2>
        <p className="mt-1 text-sm text-ink-soft">{scanTotal} sur la période</p>
        {scanTotal === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-ink-muted">
            Aucun scan enregistré. Les plaques livrées n&apos;ont peut-être pas
            encore été posées — voir l&apos;écran Liens NFC.
          </p>
        ) : (
          <ScanBars points={scanSeries} className="mt-6" />
        )}
      </section>

      {discountCents > 0 && (
        <p className="text-sm text-ink-muted">
          Remises de parrainage accordées à ce jour :{" "}
          <span className="font-semibold text-ink">{formatPrice(discountCents)}</span>
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
