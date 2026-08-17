import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-lg font-bold tracking-tight text-ink">
          Avistap
        </p>
        <h1 className="mt-1 text-center text-sm text-ink-muted">
          Accès atelier
        </h1>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
