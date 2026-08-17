-- Avistap — bucket de logos + catalogue initial

-- ---------------------------------------------------------------------------
-- Storage : logos clients
--
-- Bucket privé. L'upload passe par /api/upload-logo (service role, validation
-- du type MIME et de la taille) et le back office affiche les fichiers via des
-- URL signées à durée limitée. Aucune policy anon : un bucket public exposerait
-- les logos de tous les clients à qui devine un chemin.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  false,
  5242880, -- 5 Mo
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do nothing;

create policy "logos_admin_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logos' and (select public.is_admin()));

create policy "logos_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'logos' and (select public.is_admin()))
  with check (bucket_id = 'logos' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Catalogue initial
--
-- TARIFS PROVISOIRES : à ajuster depuis /admin/produits, sans redéploiement.
-- ---------------------------------------------------------------------------

insert into public.products (slug, name, description, base_price_cents, plaque_count, sort_order)
values
  ('pack-1', 'Pack Solo — 1 plaque',    'Une plaque NFC personnalisée à votre logo. Idéal pour un comptoir unique. (Tarif provisoire)',            2900, 1, 10),
  ('pack-2', 'Pack Duo — 2 plaques',    'Deux plaques : une en caisse, une en salle. Le plus demandé. (Tarif provisoire)',                          4900, 2, 20),
  ('pack-4', 'Pack Pro — 4 plaques',    'Quatre plaques pour couvrir tous vos points de contact client. (Tarif provisoire)',                         8900, 4, 30)
on conflict (slug) do nothing;

insert into public.product_options (slug, name, description, price_cents, sort_order)
values
  ('socle',   'Socle de présentation', 'Socle incliné pour poser la plaque sur un comptoir. (Tarif provisoire)', 900, 10),
  ('sticker', 'Sticker vitrine',       'Sticker NFC assorti à coller en vitrine. (Tarif provisoire)',            500, 20)
on conflict (slug) do nothing;
