-- AvisTap — espace commerçant : comptes, scans, parrainage, avoirs
--
-- Jusqu'ici le tunnel était en invité : une commande n'appartenait à personne.
-- On rattache les commandes à un profil, on mesure les scans, et on ouvre le
-- parrainage.

-- ---------------------------------------------------------------------------
-- Rattachement des commandes à un compte
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0),
  add column if not exists referral_code text;

create index if not exists orders_profile_idx
  on public.orders (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Scans : rollup journalier
--
-- Volontairement sans IP ni user-agent : on ne collecte aucune donnée
-- personnelle, et un agrégat par jour suffit à tracer une courbe tout en
-- restant rapide à lire.
-- ---------------------------------------------------------------------------

create table if not exists public.nfc_scan_daily (
  nfc_link_id uuid not null references public.nfc_links (id) on delete cascade,
  day         date not null,
  count       integer not null default 0 check (count >= 0),
  primary key (nfc_link_id, day)
);

create index if not exists nfc_scan_daily_day_idx on public.nfc_scan_daily (day);

-- Incrément atomique, appelé par la route de redirection avec le service role.
create or replace function public.record_nfc_scan(p_link_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.nfc_scan_daily (nfc_link_id, day, count)
  values (p_link_id, (now() at time zone 'utc')::date, 1)
  on conflict (nfc_link_id, day)
  do update set count = public.nfc_scan_daily.count + 1;
$$;

-- Réservé au service role : la route de redirection est le seul appelant.
revoke all on function public.record_nfc_scan(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Parrainage
-- ---------------------------------------------------------------------------

create type public.referral_status as enum ('pending', 'validated', 'cancelled');

-- Un code par commerçant. Il sert à la fois de code de réduction pour le
-- filleul et de clé d'attribution pour le parrain : un seul objet à comprendre.
create table if not exists public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  code       text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.profiles (id) on delete cascade,
  -- `unique` : une commande ne peut créditer qu'une seule fois un parrain,
  -- même si le webhook Stripe est rejoué.
  referred_order_id   uuid not null unique references public.orders (id) on delete cascade,
  status              public.referral_status not null default 'validated',
  reward_cents        integer not null default 0 check (reward_cents >= 0),
  created_at          timestamptz not null default now()
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_profile_id, created_at desc);

-- Grand livre des avoirs : positif = crédité, négatif = consommé.
-- Le solde est une somme, jamais une colonne mutée — pas de dérive possible.
create table if not exists public.credits (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  reason       text not null,
  order_id     uuid references public.orders (id) on delete set null,
  referral_id  uuid references public.referrals (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists credits_profile_idx on public.credits (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Rattachement des commandes passées en invité
--
-- Exposée dans `public` à dessein : c'est le commerçant connecté qui l'appelle
-- après sa connexion. Elle n'accepte aucun argument et se fonde sur `auth.uid()`
-- puis sur l'email **vérifié** de `auth.users` — impossible de réclamer les
-- commandes d'autrui en manipulant un paramètre.
-- ---------------------------------------------------------------------------

create or replace function public.claim_my_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_count integer;
begin
  if v_uid is null then
    return 0;
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;

  if v_email is null then
    return 0;
  end if;

  update public.orders o
     set profile_id = v_uid
   where o.profile_id is null
     and lower(o.customer_email) = lower(v_email);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_my_orders() from public, anon;
grant execute on function public.claim_my_orders() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.nfc_scan_daily  enable row level security;
alter table public.referral_codes  enable row level security;
alter table public.referrals       enable row level security;
alter table public.credits         enable row level security;

-- Helper : les liens NFC appartenant au commerçant connecté.
create or replace function private.owns_nfc_link(p_link_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.nfc_links n
    join public.orders o on o.id = n.order_id
    where n.id = p_link_id
      and o.profile_id = auth.uid()
  );
$$;

-- --- Commandes du commerçant ------------------------------------------------

create policy "orders_select_own"
  on public.orders for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.profile_id = (select auth.uid())
    )
  );

create policy "order_events_select_own"
  on public.order_events for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and o.profile_id = (select auth.uid())
    )
  );

-- --- Liens NFC : lecture, et mise à jour de la seule cible -------------------

create policy "nfc_links_select_own"
  on public.nfc_links for select
  to authenticated
  using ((select private.owns_nfc_link(id)));

create policy "nfc_links_update_own_target"
  on public.nfc_links for update
  to authenticated
  using ((select private.owns_nfc_link(id)))
  with check ((select private.owns_nfc_link(id)));

-- La RLS ne sait pas restreindre des colonnes : c'est le privilège au niveau
-- colonne qui garantit qu'un commerçant ne peut toucher que `target_url`.
-- Sans cela, il pourrait désactiver son lien ou le rattacher à une autre
-- commande via une simple requête PostgREST.
revoke update on public.nfc_links from authenticated;
grant update (target_url) on public.nfc_links to authenticated;

-- --- Scans, parrainage, avoirs ----------------------------------------------

create policy "nfc_scan_daily_select_own"
  on public.nfc_scan_daily for select
  to authenticated
  using ((select private.owns_nfc_link(nfc_link_id)));

create policy "nfc_scan_daily_admin_all"
  on public.nfc_scan_daily for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "referral_codes_select_own"
  on public.referral_codes for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "referral_codes_admin_all"
  on public.referral_codes for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "referrals_select_own"
  on public.referrals for select
  to authenticated
  using (referrer_profile_id = (select auth.uid()));

create policy "referrals_admin_all"
  on public.referrals for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "credits_select_own"
  on public.credits for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "credits_admin_all"
  on public.credits for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
