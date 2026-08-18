"use client";

import { useMemo, useState } from "react";

import { formatPrice } from "@/lib/format";
import { computeQuote, PricingError, type Quote } from "@/lib/pricing";
import type { Product, ProductOption } from "@/lib/types";
import { checkoutSchema } from "@/lib/validation";

import { LogoUpload } from "./logo-upload";

type Props = {
  products: Product[];
  options: ProductOption[];
  initialProductSlug?: string;
  initialReferralCode?: string;
};

type FieldErrors = Record<string, string>;

export function Configurator({
  products,
  options,
  initialProductSlug,
  initialReferralCode,
}: Props) {
  const [productSlug, setProductSlug] = useState(
    () =>
      products.find((p) => p.slug === initialProductSlug)?.slug ??
      products[1]?.slug ??
      products[0]?.slug ??
      "",
  );
  const [optionSlugs, setOptionSlugs] = useState<string[]>([]);

  const [businessName, setBusinessName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [googleBusinessLink, setGoogleBusinessLink] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? "");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Même fonction de calcul que le serveur : l'affichage ne peut pas diverger
  // du montant réellement facturé.
  const quote = useMemo<Quote | null>(() => {
    try {
      return computeQuote({ productSlug, optionSlugs }, products, options);
    } catch (error) {
      if (error instanceof PricingError) return null;
      throw error;
    }
  }, [productSlug, optionSlugs, products, options]);

  function toggleOption(slug: string) {
    setOptionSlugs((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      productSlug,
      optionSlugs,
      businessName,
      customerName,
      customerEmail,
      phone,
      googleBusinessLink,
      logoPath,
      referralCode,
      shippingAddress: {
        line1,
        line2,
        postal_code: postalCode,
        city,
        country: "France",
      },
    };

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      document
        .querySelector("[data-field-error]")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(
          result?.error ?? "La commande n'a pas pu être créée. Réessayez.",
        );
        return;
      }

      window.location.href = result.url;
    } catch {
      setSubmitError(
        "Connexion impossible. Vérifiez votre réseau puis réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start"
    >
      <div className="space-y-10">
        {/* Pack */}
        <Section title="1. Votre pack">
          <div className="grid gap-3 sm:grid-cols-3">
            {products.map((product) => {
              const selected = product.slug === productSlug;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setProductSlug(product.slug)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-ink bg-accent-soft"
                      : "border-border bg-surface hover:border-border-strong"
                  }`}
                >
                  <span className="block font-semibold text-ink">
                    {product.plaque_count}{" "}
                    {product.plaque_count > 1 ? "plaques" : "plaque"}
                  </span>
                  <span className="mt-1 block text-2xl font-bold text-ink">
                    {formatPrice(product.base_price_cents)}
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {product.name}
                  </span>
                </button>
              );
            })}
          </div>
          <FieldError message={errors.productSlug} />
        </Section>

        {/* Options */}
        {options.length > 0 && (
          <Section title="2. Options">
            <div className="space-y-3">
              {options.map((option) => {
                const checked = optionSlugs.includes(option.slug);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      checked
                        ? "border-ink bg-accent-soft"
                        : "border-border bg-surface hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(option.slug)}
                      className="mt-1 size-4 accent-ink"
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-ink">
                          {option.name}
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          +{formatPrice(option.price_cents)}
                        </span>
                      </span>
                      {option.description && (
                        <span className="mt-1 block text-sm text-ink-soft">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </Section>
        )}

        {/* Personnalisation */}
        <Section title="3. Votre établissement">
          <Field
            label="Nom de l'établissement"
            hint="Tel qu'il apparaîtra sur la plaque et dans notre atelier."
            error={errors.businessName}
          >
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Le Café des Sports"
              className={inputClass}
            />
          </Field>

          <Field
            label="Lien de votre fiche Google"
            hint="Depuis Google Maps : bouton Partager, puis Copier le lien."
            error={errors.googleBusinessLink}
          >
            <input
              type="url"
              value={googleBusinessLink}
              onChange={(e) => setGoogleBusinessLink(e.target.value)}
              placeholder="https://g.page/votre-etablissement"
              className={inputClass}
            />
          </Field>

          <Field
            label="Votre logo"
            hint="PNG, JPG, SVG ou PDF — 5 Mo maximum. Un fichier vectoriel donne le plus beau rendu."
            error={errors.logoPath}
          >
            <LogoUpload value={logoPath} onChange={setLogoPath} />
          </Field>
        </Section>

        {/* Livraison */}
        <Section title="4. Livraison et contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Votre nom" error={errors.customerName}>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="name"
                className={inputClass}
              />
            </Field>

            <Field label="Email" error={errors.customerEmail}>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                autoComplete="email"
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Code de parrainage (facultatif)"
            hint="Un confrère vous a donné un code ? Saisissez-le pour obtenir votre remise."
            error={errors.referralCode}
          >
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              className={`${inputClass} font-mono uppercase`}
            />
          </Field>

          <Field label="Téléphone (facultatif)" error={errors.phone}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className={inputClass}
            />
          </Field>

          <Field label="Adresse" error={errors["shippingAddress.line1"]}>
            <input
              type="text"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              autoComplete="address-line1"
              className={inputClass}
            />
          </Field>

          <Field
            label="Complément d'adresse (facultatif)"
            error={errors["shippingAddress.line2"]}
          >
            <input
              type="text"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              autoComplete="address-line2"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
            <Field
              label="Code postal"
              error={errors["shippingAddress.postal_code"]}
            >
              <input
                type="text"
                inputMode="numeric"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                autoComplete="postal-code"
                className={inputClass}
              />
            </Field>

            <Field label="Ville" error={errors["shippingAddress.city"]}>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="address-level2"
                className={inputClass}
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Récapitulatif — collant sur desktop, en bas de page sur mobile */}
      <aside className="lg:sticky lg:top-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Récapitulatif</h2>

          {quote ? (
            <>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{quote.product.name}</dt>
                  <dd className="font-medium text-ink">
                    {formatPrice(quote.product.base_price_cents)}
                  </dd>
                </div>

                {quote.options.map((option) => (
                  <div key={option.id} className="flex justify-between gap-4">
                    <dt className="text-ink-soft">{option.name}</dt>
                    <dd className="font-medium text-ink">
                      {formatPrice(option.price_cents)}
                    </dd>
                  </div>
                ))}

                {referralCode.trim() !== "" && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Code de parrainage</dt>
                    <dd className="font-medium text-success">
                      vérifié au paiement
                    </dd>
                  </div>
                )}

                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="text-ink-soft">Livraison</dt>
                  <dd className="font-medium text-ink">
                    {quote.shippingCents === 0
                      ? "Offerte"
                      : formatPrice(quote.shippingCents)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-2xl font-bold tracking-tight text-ink">
                  {formatPrice(quote.totalCents)}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Sélectionnez un pack pour voir le total.
            </p>
          )}

          {submitError && (
            <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !quote}
            className="touch-target mt-6 inline-flex w-full items-center justify-center rounded-lg bg-ink px-5 font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Redirection…" : "Passer au paiement"}
          </button>

          <p className="mt-3 text-center text-xs text-ink-muted">
            Paiement sécurisé · Fabrication sous 3 jours ouvrés
          </p>
        </div>
      </aside>
    </form>
  );
}

const inputClass =
  "touch-target w-full rounded-lg border border-border bg-surface px-3 text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">{label}</label>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p data-field-error className="text-sm text-danger">
      {message}
    </p>
  );
}
