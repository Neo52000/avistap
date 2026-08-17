import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
};

export default function CgvPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Conditions générales de vente
          </h1>

          <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-strong">
            À compléter avant la mise en ligne. La vente en ligne à des
            consommateurs impose des mentions obligatoires (articles L. 221-5 et
            suivants du Code de la consommation) : faites relire ce texte.
          </div>

          <div className="mt-8 space-y-8 text-ink-soft">
            <Article title="1. Identité du vendeur">
              Dénomination sociale, forme juridique, capital, adresse du siège,
              numéro RCS, numéro de TVA intracommunautaire, email et téléphone de
              contact, directeur de la publication.
            </Article>

            <Article title="2. Produits">
              Description des plaques NFC, des packs et des options. Les visuels
              sont non contractuels. Les caractéristiques essentielles sont
              présentées sur la page de configuration.
            </Article>

            <Article title="3. Prix">
              Prix en euros toutes taxes comprises, hors frais de livraison
              indiqués séparément avant validation de la commande. Le prix
              applicable est celui affiché au moment de la commande.
            </Article>

            <Article title="4. Commande et paiement">
              Le processus de commande, l&apos;étape de validation, les moyens de
              paiement acceptés et le prestataire de paiement utilisé.
            </Article>

            <Article title="5. Livraison">
              Zones desservies, délais de fabrication et d&apos;acheminement,
              transporteurs, traitement des retards et des colis endommagés.
            </Article>

            <Article title="6. Droit de rétractation">
              Délai de quatorze jours et modalités d&apos;exercice. Attention : les
              plaques étant personnalisées à la demande du client (logo, lien),
              l&apos;exception prévue à l&apos;article L. 221-28 3° du Code de la
              consommation est susceptible de s&apos;appliquer — à faire valider.
            </Article>

            <Article title="7. Garanties">
              Garantie légale de conformité et garantie des vices cachés,
              modalités de mise en œuvre et de retour.
            </Article>

            <Article title="8. Données personnelles">
              Finalités de traitement, durées de conservation, sous-traitants et
              exercice des droits RGPD.
            </Article>

            <Article title="9. Litiges">
              Droit applicable, médiateur de la consommation et plateforme
              européenne de règlement en ligne des litiges.
            </Article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Article({
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
