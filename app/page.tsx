import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fetchCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Le catalogue change rarement : on met en cache une heure plutôt que de
// requêter la base à chaque visite de la landing.
export const revalidate = 3600;

const STEPS = [
  {
    title: "Vous configurez",
    body: "Choisissez votre pack, ajoutez le socle ou le sticker, envoyez votre logo et collez le lien de votre fiche Google.",
  },
  {
    title: "On fabrique",
    body: "Impression et découpe dans notre atelier, puis encodage de la puce NFC. Expédition sous 3 jours ouvrés.",
  },
  {
    title: "Vos avis décollent",
    body: "Posez la plaque au comptoir. Un téléphone approché, et le formulaire d'avis Google s'ouvre tout seul.",
  },
];

const BENEFITS = [
  {
    title: "Aucune application",
    body: "La technologie NFC est native sur tous les smartphones récents. Rien à installer, ni pour vous ni pour vos clients.",
  },
  {
    title: "Votre lien reste modifiable",
    body: "La puce pointe vers une adresse Avistap qui redirige vers votre fiche. Vous changez de fiche Google ? On met à jour la redirection, la plaque reste la même.",
  },
  {
    title: "À votre image",
    body: "Votre logo gravé sur une plaque finition premium, pensée pour rester posée sur un comptoir sans jurer avec votre décoration.",
  },
  {
    title: "Rentabilisée vite",
    body: "Quelques avis supplémentaires par mois suffisent à faire remonter votre établissement dans les résultats locaux.",
  },
];

const FAQ = [
  {
    question: "Est-ce que ça marche avec tous les téléphones ?",
    answer:
      "Oui pour l'immense majorité : tous les iPhone depuis le XR et la quasi-totalité des Android récents lisent le NFC sans réglage. Pour les rares appareils non compatibles, le sticker vitrine avec QR code prend le relais.",
  },
  {
    question: "Que se passe-t-il si je change de fiche Google ?",
    answer:
      "Rien à refaire. La puce contient une adresse Avistap, pas votre lien Google. Nous redirigeons cette adresse vers votre nouvelle fiche et vos plaques continuent de fonctionner.",
  },
  {
    question: "Quel est le délai de livraison ?",
    answer:
      "Comptez 3 jours ouvrés de fabrication, plus l'acheminement. Vous suivez chaque étape depuis votre lien de suivi : commande reçue, en impression, expédiée.",
  },
  {
    question: "Puis-je commander pour plusieurs établissements ?",
    answer:
      "Oui. Prenez le pack 4 plaques, ou passez plusieurs commandes si les fiches Google diffèrent. Écrivez-nous pour un volume plus important.",
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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
            <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-strong">
              La plaque avis
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Vos clients laissent un avis Google en approchant leur téléphone.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Une plaque NFC gravée à votre logo, posée sur votre comptoir. Un
              geste, et le formulaire d&apos;avis s&apos;ouvre. Plus de « laissez-nous
              un avis » qu&apos;on oublie une fois dehors.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/configurateur"
                className="touch-target inline-flex items-center rounded-lg bg-ink px-6 text-base font-semibold text-white transition-colors hover:bg-ink-soft"
              >
                Configurer ma plaque
              </Link>
              {cheapest !== null && (
                <p className="text-sm text-ink-muted">
                  À partir de{" "}
                  <span className="font-semibold text-ink">
                    {formatPrice(cheapest)}
                  </span>{" "}
                  — livraison en 3 jours ouvrés
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment-ca-marche" className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Comment ça marche
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-border bg-surface p-6"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Bénéfices */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Pourquoi une plaque plutôt qu&apos;un QR code imprimé
            </h2>
            <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title}>
                  <h3 className="font-semibold text-ink">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {benefit.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Nos packs
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col rounded-xl border border-border bg-surface p-6"
              >
                <h3 className="font-semibold text-ink">{product.name}</h3>
                <p className="mt-3 text-3xl font-bold tracking-tight text-ink">
                  {formatPrice(product.base_price_cents)}
                </p>
                {product.description && (
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                    {product.description}
                  </p>
                )}
                <Link
                  href={`/configurateur?pack=${product.slug}`}
                  className="touch-target mt-6 inline-flex items-center justify-center rounded-lg border border-border-strong px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                >
                  Choisir ce pack
                </Link>
              </div>
            ))}
          </div>

          {options.length > 0 && (
            <p className="mt-6 text-sm text-ink-muted">
              Options disponibles :{" "}
              {options
                .map((option) => `${option.name} (+${formatPrice(option.price_cents)})`)
                .join(" · ")}
            </p>
          )}
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-3xl px-5 py-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Questions fréquentes
            </h2>
            <dl className="mt-8 divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <div key={item.question} className="py-5">
                  <dt className="font-semibold text-ink">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 rounded-xl bg-ink p-8 text-center">
              <p className="text-xl font-semibold text-white">
                Prêt à collecter plus d&apos;avis ?
              </p>
              <Link
                href="/configurateur"
                className="touch-target mt-5 inline-flex items-center rounded-lg bg-white px-6 text-base font-semibold text-ink transition-colors hover:bg-canvas"
              >
                Configurer ma plaque
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
