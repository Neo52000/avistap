import Link from "next/link";

import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {SITE_NAME}</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/cgv" className="transition-colors hover:text-ink">
            CGV
          </Link>
          <Link
            href="/mentions-legales"
            className="transition-colors hover:text-ink"
          >
            Mentions légales
          </Link>
          <Link href="/configurateur" className="transition-colors hover:text-ink">
            Commander
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="transition-colors hover:text-ink"
          >
            {SUPPORT_EMAIL}
          </a>
        </nav>
      </div>
    </footer>
  );
}
