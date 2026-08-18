import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Credit, Referral, ReferralCode } from "@/lib/types";

export const metadata: Metadata = { title: "Parrainage" };

export const dynamic = "force-dynamic";

export default async function AdminParrainagePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [codesResult, referralsResult, creditsResult, profilesResult] =
    await Promise.all([
      supabase.from("referral_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("referrals").select("*").order("created_at", { ascending: false }),
      supabase.from("credits").select("*"),
      supabase.from("profiles").select("id, email, full_name"),
    ]);

  if (codesResult.error) {
    console.error("[parrainage] Lecture impossible :", codesResult.error);
  }

  const codes = (codesResult.data ?? []) as ReferralCode[];
  const referrals = (referralsResult.data ?? []) as Referral[];
  const credits = (creditsResult.data ?? []) as Credit[];
  const profiles = (profilesResult.data ?? []) as {
    id: string;
    email: string | null;
    full_name: string | null;
  }[];

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Le solde est la somme du grand livre : positif = avoir dû au parrain.
  const balanceByProfile = new Map<string, number>();
  for (const credit of credits) {
    balanceByProfile.set(
      credit.profile_id,
      (balanceByProfile.get(credit.profile_id) ?? 0) + credit.amount_cents,
    );
  }

  const referralsByProfile = new Map<string, number>();
  for (const referral of referrals) {
    referralsByProfile.set(
      referral.referrer_profile_id,
      (referralsByProfile.get(referral.referrer_profile_id) ?? 0) + 1,
    );
  }

  const outstanding = [...balanceByProfile.values()]
    .filter((v) => v > 0)
    .reduce((sum, v) => sum + v, 0);

  const rows = codes
    .map((code) => ({
      code,
      profile: profileById.get(code.profile_id),
      referrals: referralsByProfile.get(code.profile_id) ?? 0,
      balance: balanceByProfile.get(code.profile_id) ?? 0,
    }))
    .sort((a, b) => b.referrals - a.referrals);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Parrainage</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {referrals.length} parrainage{referrals.length > 1 ? "s" : ""} validé
          {referrals.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Codes émis" value={String(codes.length)} />
        <Stat label="Filleuls" value={String(referrals.length)} />
        <Stat
          label="Avoirs à honorer"
          value={formatPrice(outstanding)}
          hint="Déduits automatiquement des prochaines commandes"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-ink-muted">
          Aucun code émis. Un code est créé à la première visite de l&apos;espace
          parrainage par un commerçant.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-strong text-left">
                <th className="pb-3 pr-4 font-semibold text-ink">Parrain</th>
                <th className="pb-3 pr-4 font-semibold text-ink">Code</th>
                <th className="pb-3 pr-4 font-semibold text-ink">Filleuls</th>
                <th className="pb-3 font-semibold text-ink">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.code.id}>
                  <td className="py-3 pr-4">
                    <span className="block font-medium text-ink">
                      {row.profile?.full_name ?? "—"}
                    </span>
                    <span className="block break-all text-xs text-ink-muted">
                      {row.profile?.email ?? "compte supprimé"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono font-semibold text-ink">
                    {row.code.code}
                  </td>
                  <td className="py-3 pr-4 text-ink">{row.referrals}</td>
                  <td className="py-3 font-semibold text-ink">
                    {formatPrice(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Derniers parrainages
        </h2>
        {referrals.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Aucun pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {referrals.slice(0, 20).map((referral) => (
              <li
                key={referral.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {profileById.get(referral.referrer_profile_id)?.email ?? "—"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(referral.created_at)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-success">
                  +{formatPrice(referral.reward_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
