import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BRAND } from "@/lib/site";

import { MagicLinkForm } from "./magic-link-form";

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="block text-center text-lg font-bold tracking-tight text-ink"
        >
          {BRAND}
        </Link>
        <p className="mt-1 text-center text-sm text-ink-muted">
          Votre espace commerçant
        </p>

        <Suspense>
          <MagicLinkForm />
        </Suspense>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-muted">
          Utilisez l&apos;adresse email de votre commande : vos plaques et votre
          historique s&apos;y rattachent automatiquement.
        </p>
      </div>
    </div>
  );
}
