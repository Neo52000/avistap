import type { Metadata } from "next";
import Link from "next/link";

import { ScanBars } from "@/components/charts/scan-bars";
import { requireMerchant } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { fetchPlaques, fetchScanSeries } from "@/lib/merchant";
import { getCreditBalance } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EspacePage() {
  const merchant = await requireMerchant();
  const supabase = await createClient();

  const [series, plaques, credit] = await Promise.all([
    fetchScanSeries(supabase, 30),
    fetchPlaques(supabase),
    getCreditBalance(supabase, merchant.id),
  ]);

  const total30 = series.reduce((sum, p) => sum + p.count, 0);
  const total7 = series.slice(-7).reduce((sum, p) => sum + p.count, 0);
  const previous7 = series.slice(-14, -7).reduce((sum, p) => sum + p.count, 0);
  const totalAllTime = plaques.reduce((sum, p) => sum + p.hit_count, 0);

  const trend =
    previous7 === 0 ? null : Math.round(((total7 - previous7) / previous7) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Votre activité
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Chaque scan est un client qui a approché son téléphone de votre plaque.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Scans (7 jours)"
          value={String(total7)}
          hint={
            trend === null
              ? undefined
              : `${trend >= 0 ? "+" : ""}${trend} % vs 7 jours précédents`
          }
        />
        <Stat label="Scans (30 jours)" value={String(total30)} />
        <Stat label="Depuis le début" value={String(totalAllTime)} />
        <Stat
          label="Avoirs disponibles"
          value={formatPrice(credit)}
          hint={credit > 0 ? "Déduit de votre prochaine commande" : undefined}
          href="/espace/parrainage"
        />
      </div>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Scans par jour</h2>
        <p className="mt-1 text-sm text-ink-soft">30 derniers jours</p>

        {totalAllTime === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-ink-muted">
            Aucun scan pour l&apos;instant. Dès que votre plaque est posée et
            utilisée, la courbe se remplit ici.
          </p>
        ) : (
          <ScanBars points={series} className="mt-6" />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Vos plaques
          </h2>
          <Link
            href="/espace/plaques"
            className="text-sm font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Gérer
          </Link>
        </div>

        {plaques.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
            Aucune plaque active. Vos plaques apparaissent ici dès que votre
            commande est confirmée.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {plaques.slice(0, 5).map((plaque) => (
              <li
                key={plaque.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {plaque.business_name}
                  </p>
                  <p className="font-mono text-xs text-ink-muted">/r/{plaque.slug}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {plaque.hit_count} scan{plaque.hit_count > 1 ? "s" : ""}
                </span>
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
