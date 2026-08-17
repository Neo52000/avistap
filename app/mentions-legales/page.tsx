import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Mentions légales",
};

export default function MentionsLegalesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Mentions légales
          </h1>

          <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-strong">
            À compléter avant la mise en ligne : ces mentions sont obligatoires
            (article 6 de la loi pour la confiance dans l&apos;économie numérique).
          </div>

          <div className="mt-8 space-y-8 text-ink-soft">
            <Section title="Éditeur du site">
              Dénomination sociale, forme juridique, capital social, adresse du
              siège, numéro RCS, numéro de TVA intracommunautaire, adresse email
              et numéro de téléphone.
            </Section>

            <Section title="Directeur de la publication">
              Nom et prénom du responsable de la publication.
            </Section>

            <Section title="Hébergement">
              Nom, adresse et numéro de téléphone de l&apos;hébergeur du site.
            </Section>

            <Section title="Propriété intellectuelle">
              L&apos;ensemble des contenus de ce site (textes, visuels, marques,
              logos) est protégé. Toute reproduction sans autorisation écrite
              préalable est interdite.
            </Section>

            <Section title="Données personnelles">
              Identité du responsable de traitement, finalités, base légale,
              durées de conservation, destinataires, et modalités d&apos;exercice des
              droits d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition et de
              portabilité. Coordonnées de la CNIL pour toute réclamation.
            </Section>

            <Section title="Cookies">
              Nature des cookies déposés, finalités et moyens de s&apos;y opposer.
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-2 leading-relaxed">{children}</p>
    </section>
  );
}
