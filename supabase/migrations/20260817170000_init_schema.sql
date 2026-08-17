-- Avistap — schéma initial
-- Plateforme e-commerce de plaques NFC « avis Google ».

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('customer', 'admin');

-- Cycle de vie d'une commande.
--   awaiting_payment : créée, paiement non confirmé (invisible pour l'atelier)
--   pending          : payée, EN ATTENTE DE PRODUCTION -> Queue de Production
--   printing         : en cours d'impression / découpe
--   shipped          : expédiée (déclenche l'email client)
--   delivered        : livrée
--   cancelled        : annulée / remboursée
create type public.order_status as enum (
  'awaiting_payment',
  'pending',
  'printing',
  'shipped',
  'delivered',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — lié à auth.users, porte le rôle admin
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper réutilisé par toutes les policies admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

-- Packs vendus (1, 2 ou 4 plaques).
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  description      text,
  base_price_cents integer not null check (base_price_cents >= 0),
  plaque_count     integer not null default 1 check (plaque_count > 0),
  image_url        text,
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index products_active_sort_idx on public.products (active, sort_order);

-- Options à la carte (socle, sticker, ...). En table plutôt qu'en dur dans le
-- code : ajouter une option ne demande pas de redéploiement.
create table public.product_options (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger product_options_set_updated_at
  before update on public.product_options
  for each row execute function public.set_updated_at();

create index product_options_active_sort_idx on public.product_options (active, sort_order);

-- ---------------------------------------------------------------------------
-- Commandes
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq;

-- Numéro lisible du type AVT-2026-0042.
create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'AVT-'
      || to_char(now(), 'YYYY')
      || '-'
      || lpad(nextval('public.order_number_seq')::text, 4, '0');
$$;

create table public.orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text not null unique default public.generate_order_number(),
  -- Jeton de la page de suivi publique : impossible à deviner, contrairement
  -- à un id séquentiel.
  public_token             uuid not null unique default gen_random_uuid(),

  customer_email           text not null,
  customer_name            text,
  business_name            text not null,
  phone                    text,
  shipping_address         jsonb,

  subtotal_cents           integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents           integer not null default 0 check (shipping_cents >= 0),
  total_amount_cents       integer not null default 0 check (total_amount_cents >= 0),

  status                   public.order_status not null default 'awaiting_payment',
  google_business_link     text,
  logo_url                 text,

  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  paid_at                  timestamptz,

  tracking_number          text,
  carrier                  text,
  admin_notes              text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Index principal de la Queue de Production (status = 'pending').
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_email_idx on public.orders (customer_email);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  product_name     text not null,          -- figé : le catalogue peut changer après la vente
  quantity         integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  -- Options retenues et personnalisations, ex :
  -- {"options": [{"slug": "socle", "name": "Socle", "price_cents": 900}]}
  customizations   jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- Journal des changements de statut : alimente la page de suivi client et
-- l'historique du back office.
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  note        text,
  actor       text,                        -- 'system', 'stripe' ou l'email admin
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Redirection NFC
-- ---------------------------------------------------------------------------

-- On encode avistap.fr/r/{slug} sur la puce, jamais le lien Google directement :
-- si le client change de fiche Google plus tard, on met à jour target_url sans
-- toucher à la plaque physique.
create table public.nfc_links (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  order_id     uuid references public.orders (id) on delete set null,
  target_url   text not null,
  active       boolean not null default true,
  hit_count    integer not null default 0,
  last_hit_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger nfc_links_set_updated_at
  before update on public.nfc_links
  for each row execute function public.set_updated_at();

create index nfc_links_order_idx on public.nfc_links (order_id);

-- Slug court aléatoire (base36, 7 caractères), avec quelques tentatives en cas
-- de collision.
create or replace function public.generate_nfc_slug()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789'; -- sans o/l/0/1
  candidate text;
  i integer;
  attempt integer := 0;
begin
  loop
    attempt := attempt + 1;
    candidate := '';
    for i in 1..7 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    if not exists (select 1 from public.nfc_links n where n.slug = candidate) then
      return candidate;
    end if;

    if attempt >= 10 then
      raise exception 'Impossible de générer un slug NFC unique';
    end if;
  end loop;
end;
$$;
