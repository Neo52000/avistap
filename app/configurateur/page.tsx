import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fetchCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

import { Configurator } from "./configurator";

export const metadata: Metadata = {
  title: "Configurer ma plaque",
  description:
    "Choisissez votre pack, vos options et votre logo. Prix calculé en temps réel.",
};

export default async function ConfiguratorPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const [{ pack }, supabase] = await Promise.all([searchParams, createClient()]);
  const { products, options } = await fetchCatalog(supabase);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Configurez votre plaque
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Tout se règle ici : le pack, les options, votre logo et le lien de
            votre fiche Google. Le prix se met à jour en direct.
          </p>

          <Configurator
            products={products}
            options={options}
            initialProductSlug={pack}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
