"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.refresh();
        router.push("/login");
      }}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
    >
      Déconnexion
    </button>
  );
}
