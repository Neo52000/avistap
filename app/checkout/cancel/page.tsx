import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Paiement interrompu",
  robots: { index: false, follow: false },
};

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Paiement interrompu
          </h1>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Aucun montant n&apos;a été débité. Votre configuration n&apos;a pas été
            perdue : reprenez où vous en étiez quand vous voulez.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/configurateur"
              className="touch-target inline-flex items-center rounded-lg bg-ink px-6 font-semibold text-white transition-colors hover:bg-ink-soft"
            >
              Reprendre ma commande
            </Link>
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
