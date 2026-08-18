import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lectures de l'espace commerçant.
 *
 * Toutes les requêtes passent par le client porteur de la session : la RLS
 * filtre par `profile_id`, ce module n'ajoute aucun filtre de sécurité de son
 * côté. Si une policy manquait, la donnée ne fuiterait pas ici — elle ne
 * remonterait tout simplement pas.
 */

export type MerchantPlaque = {
  id: string;
  slug: string;
  target_url: string;
  active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  order_number: string;
  business_name: string;
};

/** Série journalière continue, zéros compris — sinon la courbe ment. */
export function buildDailySeries(
  rows: { day: string; count: number }[],
  days: number,
): { day: string; count: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const series: { day: string; count: number }[] = [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    series.push({ day: key, count: byDay.get(key) ?? 0 });
  }

  return series;
}

export async function fetchPlaques(
  supabase: SupabaseClient,
): Promise<MerchantPlaque[]> {
  const { data, error } = await supabase
    .from("nfc_links")
    .select("id, slug, target_url, active, hit_count, last_hit_at, orders(order_number, business_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[espace] Lecture des plaques impossible :", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const link = row as unknown as {
      id: string;
      slug: string;
      target_url: string;
      active: boolean;
      hit_count: number;
      last_hit_at: string | null;
      orders: { order_number: string; business_name: string } | null;
    };

    return {
      id: link.id,
      slug: link.slug,
      target_url: link.target_url,
      active: link.active,
      hit_count: link.hit_count,
      last_hit_at: link.last_hit_at,
      order_number: link.orders?.order_number ?? "—",
      business_name: link.orders?.business_name ?? "—",
    };
  });
}

/** Scans agrégés sur une fenêtre glissante, tous liens du commerçant confondus. */
export async function fetchScanSeries(
  supabase: SupabaseClient,
  days: number,
): Promise<{ day: string; count: number }[]> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const { data, error } = await supabase
    .from("nfc_scan_daily")
    .select("day, count")
    .gte("day", since.toISOString().slice(0, 10));

  if (error) {
    console.error("[espace] Lecture des scans impossible :", error);
    return buildDailySeries([], days);
  }

  // Plusieurs plaques peuvent avoir scanné le même jour : on additionne.
  const totals = new Map<string, number>();
  for (const row of (data ?? []) as { day: string; count: number }[]) {
    totals.set(row.day, (totals.get(row.day) ?? 0) + row.count);
  }

  return buildDailySeries(
    [...totals].map(([day, count]) => ({ day, count })),
    days,
  );
}
