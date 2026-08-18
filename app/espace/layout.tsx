import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { BRAND } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/espace", label: "Tableau de bord" },
  { href: "/espace/plaques", label: "Mes plaques" },
  { href: "/espace/commandes", label: "Mes commandes" },
  { href: "/espace/parrainage", label: "Parrainage" },
];

/**
 * Coquille de l'espace commerçant.
 *
 * La navigation n'apparaît que pour une session ouverte : `/espace/connexion`
 * vit sous ce layout et doit s'afficher nu. Ce n'est pas une garde de sécurité
 * — chaque page authentifiée appelle `requireMerchant()`, et la RLS filtre les
 * données par `profile_id`.
 */
export default async function EspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/espace" className="font-bold tracking-tight text-ink">
            {BRAND}
            <span className="ml-1.5 text-xs font-medium text-ink-muted">
              mon espace
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-muted sm:block">
              {user.email}
            </span>
            <SignOutButton redirectTo="/espace/connexion" />
          </div>
        </div>

        <nav className="mx-auto max-w-5xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
