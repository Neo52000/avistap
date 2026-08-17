import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Commande confirmée",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; simule?: string }>;
}) {
  const { token, simule } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
            ✓
          </span>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
            Merci, c&apos;est noté !
          </h1>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Votre commande part en fabrication. Vous recevez un email de
            confirmation dans quelques instants, avec votre lien de suivi.
          </p>

          {simule === "1" && (
            <p className="mt-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-strong">
              Mode simulé : aucune clé Stripe configurée, aucun paiement réel
              n&apos;a été effectué.
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {token && (
              <Link
                href={`/suivi/${token}`}
                className="touch-target inline-flex items-center rounded-lg bg-ink px-6 font-semibold text-white transition-colors hover:bg-ink-soft"
              >
                Suivre ma commande
              </Link>
            )}
            <Link
              href="/"
              className="touch-target inline-flex items-center rounded-lg border border-border-strong px-6 font-semibold text-ink transition-colors hover:bg-surface"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
