import type { Metadata } from "next";

import { requireMerchant } from "@/lib/auth";
import { fetchPlaques } from "@/lib/merchant";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

import { PlaqueCard } from "./plaque-card";

export const metadata: Metadata = {
  title: "Mes plaques",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PlaquesPage() {
  await requireMerchant();
  const supabase = await createClient();
  const plaques = await fetchPlaques(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Mes plaques</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Vos plaques ne contiennent pas votre lien Google mais une adresse
          AvisTap. Vous pouvez donc changer la destination quand vous voulez —
          la plaque posée sur votre comptoir continue de fonctionner.
        </p>
      </div>

      {plaques.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
          Aucune plaque pour l&apos;instant. Elles apparaissent ici dès que votre
          commande est confirmée.
        </p>
      ) : (
        <ul className="space-y-4">
          {plaques.map((plaque) => (
            <li key={plaque.id}>
              <PlaqueCard plaque={plaque} baseUrl={siteUrl()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
