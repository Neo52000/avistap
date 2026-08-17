-- Avistap — déplacement des helpers SECURITY DEFINER hors du schéma exposé
--
-- Toute fonction du schéma `public` est appelable via /rest/v1/rpc/<nom>. Pour
-- des fonctions SECURITY DEFINER comme is_admin(), cela revient à exposer un
-- point d'entrée privilégié à l'API publique (signalé par le linter Supabase).
--
-- On ne peut pas simplement révoquer EXECUTE : les policies RLS évaluent
-- is_admin() avec les droits du rôle appelant, la révocation casserait donc
-- toutes les policies admin. La solution est de sortir ces fonctions du schéma
-- exposé : `private` n'est pas publié par PostgREST, donc inatteignable depuis
-- l'API, tout en restant utilisable par les policies et les triggers.
--
-- `public.get_order_tracking` reste dans `public` : son exposition à anon est
-- volontaire (c'est la page de suivi client) et elle ne renvoie aucune donnée
-- personnelle.

create schema if not exists private;

grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
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

create or replace function private.handle_new_user()
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

create or replace function private.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bascule des triggers
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function private.prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- Bascule des policies vers private.is_admin()
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_admin_all"           on public.profiles;
drop policy if exists "products_select_active"       on public.products;
drop policy if exists "products_admin_write"         on public.products;
drop policy if exists "product_options_select_active" on public.product_options;
drop policy if exists "product_options_admin_write"  on public.product_options;
drop policy if exists "orders_admin_all"             on public.orders;
drop policy if exists "order_items_admin_all"        on public.order_items;
drop policy if exists "order_events_admin_all"       on public.order_events;
drop policy if exists "nfc_links_admin_all"          on public.nfc_links;
drop policy if exists "logos_admin_read"             on storage.objects;
drop policy if exists "logos_admin_write"            on storage.objects;

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "products_select_active"
  on public.products for select
  to anon, authenticated
  using (active or (select private.is_admin()));

create policy "products_admin_write"
  on public.products for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "product_options_select_active"
  on public.product_options for select
  to anon, authenticated
  using (active or (select private.is_admin()));

create policy "product_options_admin_write"
  on public.product_options for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "orders_admin_all"
  on public.orders for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "order_items_admin_all"
  on public.order_items for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "order_events_admin_all"
  on public.order_events for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "nfc_links_admin_all"
  on public.nfc_links for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "logos_admin_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logos' and (select private.is_admin()));

create policy "logos_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'logos' and (select private.is_admin()))
  with check (bucket_id = 'logos' and (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Suppression des versions exposées
-- ---------------------------------------------------------------------------

drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
drop function if exists public.prevent_role_escalation();
