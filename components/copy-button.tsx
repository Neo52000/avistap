"use client";

import { useState } from "react";

/** Copie une valeur dans le presse-papier — utilisé pour le lien à encoder. */
export function CopyButton({
  value,
  label = "Copier",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Presse-papier refusé (contexte non sécurisé) : la valeur reste
          // affichée en clair et sélectionnable à côté du bouton.
        }
      }}
      className={`touch-target shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors ${
        copied
          ? "bg-success-soft text-success"
          : "bg-ink text-white hover:bg-ink-soft"
      }`}
    >
      {copied ? "Copié ✓" : label}
    </button>
  );
}
