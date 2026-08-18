import Link from "next/link";

import { PlaqueVisual } from "@/components/marketing/plaque-visual";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fetchCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Le catalogue change rarement : on met en cache une heure plutôt que de
// requêter la base à chaque visite.
export const revalidate = 3600;

const TRUST = [
  "Sans abonnement",
  "Fabriqué en France",
  "NFC + QR inclus",
  "Livré sous 3 jours",
];

const STEPS = [
  {
    title: "Vous configurez",
    body: "Pack, socle, sticker, votre logo et le lien de votre fiche Google. Cinq minutes, pas de devis à attendre.",
  },
  {
    title: "On fabrique",
    body: "Impression, découpe et encodage de la puce dans notre atelier. Expédition sous 3 jours ouvrés.",
  },
  {
    title: "Vos avis décollent",
    body: "La plaque reste sur le comptoir. Un téléphone approché, et le formulaire d'avis s'ouvre.",
  },
];

const SECTORS = [
  "Restaurants",
  "Coiffeurs",
  "Hôtels",
  "Garages",
  "Instituts",
  "Boulangeries",
  "Cabinets",
  "Commerces",
];

const FAQ = [
  {
    question: "Est-ce que ça marche avec tous les téléphones ?",
    answer:
      "Le NFC est lu par tous les iPhone depuis le XR et la quasi-totalité des Android récents, sans réglage. Pour les rares appareils non compatibles, le QR code gravé sur la plaque prend le relais : personne n'est bloqué.",
  },
  {
    question: "Que se passe-t-il si je change de fiche Google ?",
    answer:
      "Rien à refaire. La puce contient une adresse AvisTap, pas votre lien Google : nous redirigeons cette adresse vers votre nouvelle fiche et vos plaques continuent de fonctionner. Chez la plupart de nos confrères, la puce est encodée en dur avec votre lien — changer de fiche impose de racheter les plaques.",
  },
  {
    question: "Y a-t-il un abonnement ?",
    answer:
      "Non. Vous payez la plaque une fois, elle fonctionne indéfiniment. Les redirections et les mises à jour de lien sont incluses à vie, sans frais récurrents.",
  },
  {
    question: "Quel est le délai de livraison ?",
    answer:
      "Trois jours ouvrés de fabrication, plus l'acheminement. Vous suivez chaque étape depuis votre lien de suivi : commande reçue, en impression, expédiée.",
  },
  {
    question: "Puis-je commander pour plusieurs établissements ?",
    answer:
      "Oui. Prenez le pack 4 plaques, ou passez plusieurs commandes si les fiches Google diffèrent. Écrivez-nous pour un volume plus important.",
  },
  {
    question: "Est-ce autorisé par Google ?",
    answer:
      "Oui. Vous invitez simplement vos clients à laisser un avis, sans filtrer ni conditionner leur retour. Ce qui est interdit, c'est d'acheter des avis ou de n'inviter que les clients satisfaits — la plaque, elle, s'adresse à tout le monde de la même façon.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { products, options } = await fetchCatalog(supabase);

  const cheapest = products.reduce<number | null>(
    (min, product) =>
      min === null ? product.base_price_cents : Math.min(min, product.base_price_cents),
    null,
  );

  // Le pack du milieu est mis en avant : c'est le plus vendu du marché et le
  // plus rentable pour une commande unique.
  const featuredSlug = products[1]?.slug ?? products[0]?.slug;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-strong">
                <span aria-hidden>★★★★★</span> La plaque avis
              </p>

              <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
                Vos clients laissent un avis Google{" "}
                <span className="text-accent-strong">en approchant leur téléphone.</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                Une plaque gravée à votre logo, posée sur le comptoir. Un geste,
                et le formulaire s&apos;ouvre. Fini les « laissez-nous un avis »
                qu&apos;on oublie une fois dehors.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/configurateur"
                  className="touch-target inline-flex items-center rounded-xl bg-ink px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ink-soft"
                >
                  Configurer ma plaque
                </Link>
                {cheapest !== null && (
                  <p className="text-sm text-ink-muted">
                    À partir de{" "}
                    <span className="font-semibold text-ink">{formatPrice(cheapest)}</span>
                    <span className="mx-1.5">·</span>
                    paiement unique
                  </p>
                )}
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
                {TRUST.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span aria-hidden className="text-success">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <PlaqueVisual className="mx-auto w-full max-w-md lg:max-w-none" />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Le différenciateur — bloc sombre, le moment fort de la page       */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-ink-deep">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-bright">
              Ce que les autres ne font pas
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Votre lien Google reste modifiable, à vie.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
              Presque toutes les plaques du marché sont encodées en dur avec
              votre lien Google. Vous changez d&apos;enseigne, de fiche, de
              gérant ? Les plaques deviennent des sous-verres.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm font-semibold text-white/50">
                  Les plaques encodées en dur
                </p>
                <p className="mt-3 font-mono text-sm text-white/80">
                  puce → google.com/…/votre-fiche
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  Le lien change, la plaque est bonne à jeter. Il faut
                  recommander, réimprimer, recoller.
                </p>
              </div>

              <div className="rounded-2xl border border-accent-bright/30 bg-accent-bright/[0.07] p-6">
                <p className="text-sm font-semibold text-accent-bright">
                  AvisTap
                </p>
                <p className="mt-3 font-mono text-sm text-white">
                  puce → avistap.fr/r/k7m2p9 → votre fiche
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/75">
                  On modifie la destination de notre côté, en quelques secondes.
                  La plaque posée sur votre comptoir continue de fonctionner.
                </p>
              </div>
            </div>

            <p className="mt-8 text-sm text-white/45">
              Inclus sans surcoût, sans abonnement, sans limite de modifications.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Comment ça marche                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section id="comment-ca-marche" className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Trois étapes, cinq minutes
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Comparatif des formats                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Pourquoi une plaque, et pas autre chose
            </h2>

            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-strong text-left">
                    <th className="pb-3 pr-4 font-semibold text-ink">&nbsp;</th>
                    <th className="pb-3 pr-4 font-semibold text-ink">
                      AvisTap
                    </th>
                    <th className="pb-3 pr-4 font-medium text-ink-muted">
                      Autocollant QR
                    </th>
                    <th className="pb-3 font-medium text-ink-muted">
                      Carte à abonnement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Coût sur 3 ans", "Paiement unique", "Faible", "150 à 500 €"],
                    ["Sans application", "Oui", "Oui", "Oui"],
                    ["Fonctionne sans NFC", "QR de secours", "Oui", "Variable"],
                    ["Lien modifiable après achat", "Oui, à vie", "Non", "Selon offre"],
                    ["Tient sur un comptoir", "Plaque rigide", "Se décolle", "Format carte"],
                    ["À votre logo", "Gravé", "Imprimé", "Selon offre"],
                  ].map(([label, avistap, sticker, card]) => (
                    <tr key={label}>
                      <td className="py-3 pr-4 font-medium text-ink">{label}</td>
                      <td className="py-3 pr-4 font-semibold text-success">{avistap}</td>
                      <td className="py-3 pr-4 text-ink-muted">{sticker}</td>
                      <td className="py-3 text-ink-muted">{card}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Tarifs                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section id="tarifs" className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Nos packs
          </h2>
          <p className="mt-3 text-ink-soft">
            Paiement unique. Aucun abonnement, aucun frais caché.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {products.map((product) => {
              const featured = product.slug === featuredSlug;
              return (
                <div
                  key={product.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    featured
                      ? "border-ink bg-surface shadow-lg ring-1 ring-ink"
                      : "border-border bg-surface"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                      Le plus choisi
                    </span>
                  )}

                  <h3 className="font-semibold text-ink">{product.name}</h3>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-ink">
                    {formatPrice(product.base_price_cents)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    soit {formatPrice(Math.round(product.base_price_cents / product.plaque_count))}{" "}
                    la plaque
                  </p>

                  {product.description && (
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                      {product.description}
                    </p>
                  )}

                  <Link
                    href={`/configurateur?pack=${product.slug}`}
                    className={`touch-target mt-6 inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                      featured
                        ? "bg-ink text-white hover:bg-ink-soft"
                        : "border border-border-strong text-ink hover:bg-canvas"
                    }`}
                  >
                    Choisir ce pack
                  </Link>
                </div>
              );
            })}
          </div>

          {options.length > 0 && (
            <p className="mt-6 text-sm text-ink-muted">
              Options :{" "}
              {options
                .map((option) => `${option.name} (+${formatPrice(option.price_cents)})`)
                .join(" · ")}
            </p>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Secteurs                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
              Pensée pour les commerces de proximité
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {SECTORS.map((sector) => (
                <li
                  key={sector}
                  className="rounded-full border border-border bg-canvas px-4 py-2 text-sm font-medium text-ink-soft"
                >
                  {sector}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ                                                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Questions fréquentes
          </h2>

          <dl className="mt-10 divide-y divide-border border-y border-border">
            {FAQ.map((item) => (
              <div key={item.question} className="py-5">
                <dt className="font-semibold text-ink">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 rounded-2xl bg-ink p-8 text-center sm:p-10">
            <p className="text-2xl font-bold tracking-tight text-white">
              Prêt à collecter plus d&apos;avis ?
            </p>
            <p className="mx-auto mt-3 max-w-md text-white/65">
              Configurez votre plaque en cinq minutes. Livrée sous trois jours
              ouvrés.
            </p>
            <Link
              href="/configurateur"
              className="touch-target mt-6 inline-flex items-center rounded-xl bg-white px-7 text-base font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Configurer ma plaque
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Barre d'action collante sur mobile : le CTA reste atteignable sans
          remonter toute la page. */}
      <div className="sticky bottom-0 z-20 border-t border-border bg-surface/95 px-5 py-3 backdrop-blur sm:hidden">
        <Link
          href="/configurateur"
          className="touch-target flex w-full items-center justify-center rounded-xl bg-ink font-semibold text-white"
        >
          Configurer ma plaque
          {cheapest !== null && (
            <span className="ml-2 font-normal text-white/70">
              dès {formatPrice(cheapest)}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
