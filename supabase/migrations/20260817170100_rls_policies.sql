-- Avistap — Row Level Security
--
-- Principe : le catalogue est public en lecture, tout le reste est fermé.
-- Les données de commande ne sont JAMAIS lisibles avec la clé anon ; elles
-- transitent soit par le service role (code serveur), soit par la RPC de suivi
-- qui filtre les champs personnels.

alter table public.profiles        enable row level security;
alter table public.products        enable row level security;
alter table public.product_options enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.order_events    enable row level security;
alter table public.nfc_links       enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- L'escalade de privilège est bloquée par trigger et non dans la policy :
-- interroger public.profiles depuis une policy sur public.profiles provoque
-- une récursion infinie.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Catalogue : lecture publique des entrées actives, écriture admin
-- ---------------------------------------------------------------------------

create policy "products_select_active"
  on public.products for select
  to anon, authenticated
  using (active or (select public.is_admin()));

create policy "products_admin_write"
  on public.products for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "product_options_select_active"
  on public.product_options for select
  to anon, authenticated
  using (active or (select public.is_admin()));

create policy "product_options_admin_write"
  on public.product_options for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Commandes : admin uniquement
--
-- Aucune policy pour anon : la création de commande passe par le service role
-- (route /api/checkout) qui recalcule le prix côté serveur. Laisser anon
-- insérer dans orders reviendrait à laisser fixer son propre prix.
-- ---------------------------------------------------------------------------

create policy "orders_admin_all"
  on public.orders for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "order_items_admin_all"
  on public.order_items for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "order_events_admin_all"
  on public.order_events for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- nfc_links : admin en lecture/écriture. La redirection publique passe par la
-- route serveur (/r/[slug]) avec le service role.
-- ---------------------------------------------------------------------------

create policy "nfc_links_admin_all"
  on public.nfc_links for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Suivi public de commande
--
-- Expose le strict nécessaire à partir du jeton : statut, dates, transporteur.
-- Jamais l'email, l'adresse, les montants ni le lien Google.
-- ---------------------------------------------------------------------------

create or replace function public.get_order_tracking(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number',    o.order_number,
    'business_name',   o.business_name,
    'status',          o.status,
    'created_at',      o.created_at,
    'tracking_number', o.tracking_number,
    'carrier',         o.carrier,
    'events', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'to_status',  e.to_status,
            'note',       e.note,
            'created_at', e.created_at
          )
          order by e.created_at
        )
        from public.order_events e
        where e.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  from public.orders o
  where o.public_token = p_token
    and o.status <> 'awaiting_payment';
$$;

revoke all on function public.get_order_tracking(uuid) from public;
grant execute on function public.get_order_tracking(uuid) to anon, authenticated;

-- Les helpers de génération ne doivent pas être appelables par les clients.
revoke all on function public.generate_nfc_slug() from public, anon, authenticated;
revoke all on function public.generate_order_number() from public, anon, authenticated;
