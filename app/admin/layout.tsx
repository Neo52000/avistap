import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/auth";
import { BRAND } from "@/lib/site";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/production", label: "Production" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/parrainage", label: "Parrainage" },
  { href: "/admin/liens", label: "Liens NFC" },
  { href: "/admin/statistiques", label: "Statistiques" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Deuxième couche de contrôle : le middleware ne vérifie que la session,
  // c'est ici qu'on exige réellement le rôle admin.
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="font-bold tracking-tight text-ink">
            {BRAND}<span className="ml-1.5 text-xs font-medium text-ink-muted">atelier</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-muted sm:block">
              {admin.email}
            </span>
            <SignOutButton />
          </div>
        </div>

        {/* Navigation défilante horizontalement sur mobile : on la consulte
            depuis un téléphone posé près de la presse. */}
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
