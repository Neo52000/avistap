import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductOption } from "@/lib/types";

import { CatalogEditor } from "./catalog-editor";

export const metadata: Metadata = { title: "Produits et tarifs" };

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Sans filtre `active` : l'admin doit voir aussi ce qui est désactivé pour
  // pouvoir le réactiver.
  const [productsResult, optionsResult] = await Promise.all([
    supabase.from("products").select("*").order("sort_order"),
    supabase.from("product_options").select("*").order("sort_order"),
  ]);

  if (productsResult.error) {
    console.error("[produits] Lecture impossible :", productsResult.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Produits et tarifs
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Les prix s&apos;appliquent immédiatement aux nouvelles commandes. Les
          commandes déjà passées conservent leur montant.
        </p>
      </div>

      <CatalogEditor
        products={(productsResult.data ?? []) as Product[]}
        options={(optionsResult.data ?? []) as ProductOption[]}
      />
    </div>
  );
}
