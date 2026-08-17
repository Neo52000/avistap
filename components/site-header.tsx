import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          Avistap
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/#comment-ca-marche"
            className="hidden text-ink-soft transition-colors hover:text-ink sm:block"
          >
            Comment ça marche
          </Link>
          <Link
            href="/#tarifs"
            className="hidden text-ink-soft transition-colors hover:text-ink sm:block"
          >
            Tarifs
          </Link>
          <Link
            href="/configurateur"
            className="touch-target inline-flex items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
          >
            Commander
          </Link>
        </nav>
      </div>
    </header>
  );
}
