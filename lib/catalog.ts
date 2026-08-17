import type { SupabaseClient } from "@supabase/supabase-js";

import type { Product, ProductOption } from "./types";

/**
 * Lit le catalogue actif. Fonctionne avec n'importe quel client Supabase
 * (navigateur, serveur ou service role) : les packs et options actifs sont
 * lisibles publiquement par la RLS.
 */
export async function fetchCatalog(client: SupabaseClient): Promise<{
  products: Product[];
  options: ProductOption[];
}> {
  const [productsResult, optionsResult] = await Promise.all([
    client.from("products").select("*").eq("active", true).order("sort_order"),
    client
      .from("product_options")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (optionsResult.error) throw optionsResult.error;

  return {
    products: (productsResult.data ?? []) as Product[],
    options: (optionsResult.data ?? []) as ProductOption[],
  };
}
