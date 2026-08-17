"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  value: string;
  onChange: (path: string) => void;
};

/**
 * Envoie le fichier à /api/upload-logo, qui écrit dans le bucket privé avec le
 * service role. Le composant ne manipule que le chemin retourné : aucune clé
 * Supabase privilégiée ne descend dans le navigateur.
 */
export function LogoUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("Fichier trop lourd : 5 Mo maximum.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/upload-logo", { method: "POST", body });
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Envoi impossible. Réessayez.");
        return;
      }

      onChange(result.path);
      setFileName(file.name);
    } catch {
      setError("Envoi impossible. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    onChange("");
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="hidden"
      />

      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success bg-success-soft px-3 py-2.5">
          <span className="flex-1 text-sm font-medium text-success">
            {fileName ?? "Logo envoyé"}
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Changer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="touch-target w-full rounded-lg border border-dashed border-border-strong bg-surface px-3 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {uploading ? "Envoi en cours…" : "Choisir un fichier"}
        </button>
      )}

      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
