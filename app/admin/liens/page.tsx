import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Liens NFC" };

export const dynamic = "force-dynamic";

type LinkRow = {
  id: string;
  slug: string;
  target_url: string;
  active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  orders: {
    id: string;
    order_number: string;
    business_name: string;
    status: string;
  } | null;
};

export default async function LiensPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtre?: string }>;
}) {
  await requireAdmin();
  const { q, filtre } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("nfc_links")
    .select("id, slug, target_url, active, hit_count, last_hit_at, created_at, orders(id, order_number, business_name, status)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (q?.trim()) {
    query = query.ilike("slug", `%${q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) console.error("[liens] Lecture impossible :", error);

  let links = (data ?? []) as unknown as LinkRow[];

  // Un lien à zéro scan sur une commande expédiée signale une plaque mal
  // encodée, jamais posée, ou un client qui n'a pas compris l'usage. C'est le
  // signal SAV le plus utile de cet écran.
  const isSilent = (link: LinkRow) =>
    link.hit_count === 0 &&
    ["shipped", "delivered"].includes(link.orders?.status ?? "");

  if (filtre === "muets") {
    links = links.filter(isSilent);
  }

  const silentCount = ((data ?? []) as unknown as LinkRow[]).filter(isSilent).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Liens NFC</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {links.length} lien{links.length > 1 ? "s" : ""} affiché
          {links.length > 1 ? "s" : ""}
        </p>
      </div>

      <form className="flex flex-wrap gap-3" action="/admin/liens">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un slug…"
          className="touch-target flex-1 rounded-lg border border-border bg-surface px-3 font-mono text-sm text-ink outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="touch-target rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft"
        >
          Chercher
        </button>
      </form>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/admin/liens"
          className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filtre !== "muets"
              ? "bg-ink text-white"
              : "border border-border bg-surface text-ink-soft hover:text-ink"
          }`}
        >
          Tous
        </Link>
        <Link
          href="/admin/liens?filtre=muets"
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filtre === "muets"
              ? "bg-ink text-white"
              : "border border-border bg-surface text-ink-soft hover:text-ink"
          }`}
        >
          Jamais scannés après livraison
          {silentCount > 0 && (
            <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
              {silentCount}
            </span>
          )}
        </Link>
      </nav>

      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
          Aucun lien pour ce filtre.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {links.map((link) => (
            <li key={link.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-ink">
                    {siteUrl()}/r/{link.slug}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {link.orders?.business_name ?? "—"}
                    {link.orders ? ` · ${link.orders.order_number}` : ""}
                  </p>
                  <p className="mt-1 break-all text-xs text-ink-soft">
                    → {link.target_url}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      isSilent(link) ? "text-danger" : "text-ink"
                    }`}
                  >
                    {link.hit_count} scan{link.hit_count > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {link.last_hit_at
                      ? formatDate(link.last_hit_at)
                      : `créé le ${formatDate(link.created_at)}`}
                  </p>
                  {link.orders && (
                    <Link
                      href={`/admin/commandes/${link.orders.id}`}
                      className="mt-1 inline-flex text-xs font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
                    >
                      Fiche commande
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
