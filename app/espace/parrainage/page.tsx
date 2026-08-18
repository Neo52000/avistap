import type { Metadata } from "next";

import { CopyButton } from "@/components/copy-button";
import { requireMerchant } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { REFERRAL_DISCOUNT_PERCENT, REFERRAL_REWARD_CENTS } from "@/lib/pricing";
import { getCreditBalance, getOrCreateReferralCode } from "@/lib/referrals";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Credit, Referral } from "@/lib/types";

export const metadata: Metadata = {
  title: "Parrainage",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ParrainagePage() {
  const merchant = await requireMerchant();
  const supabase = await createClient();

  // La création du code est la seule écriture de cette page ; la RLS n'autorise
  // au commerçant que la lecture de sa ligne, on passe donc par le service role
  // pour l'insertion initiale — après avoir vérifié l'identité via
  // `requireMerchant()`.
  const code = await getOrCreateReferralCode(createAdminClient(), merchant.id);

  const [{ data: referralRows }, { data: creditRows }, balance] = await Promise.all([
    supabase.from("referrals").select("*").order("created_at", { ascending: false }),
    supabase.from("credits").select("*").order("created_at", { ascending: false }),
    getCreditBalance(supabase, merchant.id),
  ]);

  const referrals = (referralRows ?? []) as Referral[];
  const credits = (creditRows ?? []) as Credit[];
  const shareUrl = code ? `${siteUrl()}/configurateur?code=${code}` : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Parrainage</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Un confrère commande avec votre code : il obtient{" "}
          {REFERRAL_DISCOUNT_PERCENT} % de remise, vous recevez un avoir de{" "}
          {formatPrice(REFERRAL_REWARD_CENTS)} déduit de votre prochaine commande.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        {code ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Votre code
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-ink">
              {code}
            </p>

            {shareUrl && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Lien à partager
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code className="flex-1 break-all font-mono text-sm text-ink">
                    {shareUrl}
                  </code>
                  <CopyButton value={shareUrl} label="Copier le lien" />
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Votre code sera disponible d&apos;ici quelques instants. Rechargez la
            page.
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Avoirs disponibles
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
            {formatPrice(balance)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Filleuls
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
            {referrals.length}
          </p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Historique des avoirs
        </h2>

        {credits.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
            Aucun avoir pour l&apos;instant. Partagez votre code pour commencer.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {credits.map((credit) => (
              <li
                key={credit.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {credit.reason}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(credit.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    credit.amount_cents >= 0 ? "text-success" : "text-ink-soft"
                  }`}
                >
                  {credit.amount_cents >= 0 ? "+" : "−"}
                  {formatPrice(Math.abs(credit.amount_cents))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
