import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { getSignedLogoUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem } from "@/lib/types";

import { ProductionCard } from "./production-card";

export const metadata: Metadata = { title: "Queue de production" };

export const dynamic = "force-dynamic";

type ProductionOrder = Order & {
  order_items: OrderItem[];
  nfc_links: { id: string; slug: string; target_url: string }[];
};

export default async function ProductionPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), nfc_links(id, slug, target_url)")
    .in("status", ["pending", "printing"])
    .order("created_at", { ascending: true }); // le plus ancien d'abord : FIFO

  if (error) {
    console.error("[production] Lecture impossible :", error);
  }

  const orders = (data ?? []) as ProductionOrder[];
  const logoUrls = await getSignedLogoUrls(orders.map((order) => order.logo_url));

  const toProduce = orders.filter((order) => order.status === "pending");
  const printing = orders.filter((order) => order.status === "printing");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Queue de production
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Les plus anciennes en premier. Tout ce qu&apos;il faut pour fabriquer, rien
          d&apos;autre.
        </p>
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          À produire
          <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">
            {toProduce.length}
          </span>
        </h2>

        {toProduce.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
            Rien à fabriquer. Tout est à jour.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {toProduce.map((order) => (
              <li key={order.id}>
                <ProductionCard
                  order={order}
                  logoUrl={order.logo_url ? logoUrls.get(order.logo_url) ?? null : null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {printing.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">
            En impression
            <span className="rounded-full bg-info px-2 py-0.5 text-xs font-bold text-white">
              {printing.length}
            </span>
          </h2>

          <ul className="mt-4 space-y-4">
            {printing.map((order) => (
              <li key={order.id}>
                <ProductionCard
                  order={order}
                  logoUrl={order.logo_url ? logoUrls.get(order.logo_url) ?? null : null}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
