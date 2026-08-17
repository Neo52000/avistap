"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Product, ProductOption } from "@/lib/types";

import {
  toggleCatalogItem,
  updateOptionPrice,
  updateProductPrice,
  type ActionResult,
} from "../actions";

type Props = {
  products: Product[];
  options: ProductOption[];
};

export function CatalogEditor({ products, options }: Props) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  return (
    <div className="space-y-8">
      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Packs
        </h2>
        <ul className="mt-3 space-y-3">
          {products.map((product) => (
            <li key={product.id}>
              <CatalogRow
                name={product.name}
                description={product.description}
                priceCents={product.base_price_cents}
                active={product.active}
                onSavePrice={(euros) => updateProductPrice(product.id, euros)}
                onToggle={(active) => toggleCatalogItem("products", product.id, active)}
                onResult={setMessage}
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Options
        </h2>
        <ul className="mt-3 space-y-3">
          {options.map((option) => (
            <li key={option.id}>
              <CatalogRow
                name={option.name}
                description={option.description}
                priceCents={option.price_cents}
                active={option.active}
                onSavePrice={(euros) => updateOptionPrice(option.id, euros)}
                onToggle={(active) =>
                  toggleCatalogItem("product_options", option.id, active)
                }
                onResult={setMessage}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CatalogRow({
  name,
  description,
  priceCents,
  active,
  onSavePrice,
  onToggle,
  onResult,
}: {
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  onSavePrice: (euros: number) => Promise<ActionResult>;
  onToggle: (active: boolean) => Promise<ActionResult>;
  onResult: (message: { text: string; ok: boolean }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState((priceCents / 100).toFixed(2));

  const dirty = Math.round(Number(price.replace(",", ".")) * 100) !== priceCents;

  function run(action: () => Promise<ActionResult>, successText: string) {
    startTransition(async () => {
      const result = await action();
      onResult(
        result.ok
          ? { text: successText, ok: true }
          : { text: result.error, ok: false },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border bg-surface p-4 ${
        active ? "border-border" : "border-dashed border-border-strong opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{name}</p>
          {description && (
            <p className="mt-1 text-sm text-ink-soft">{description}</p>
          )}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => onToggle(!active),
              active ? "Désactivé — masqué de la vitrine." : "Réactivé.",
            )
          }
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
        >
          {active ? "Désactiver" : "Réactiver"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-ink-muted">
            Prix TTC (€)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="touch-target w-32 rounded-lg border border-border bg-surface px-3 font-semibold text-ink outline-none focus:border-ink"
          />
        </label>

        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            run(
              () => onSavePrice(Number(price.replace(",", "."))),
              `Prix de « ${name} » enregistré.`,
            )
          }
          className="touch-target rounded-lg bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
