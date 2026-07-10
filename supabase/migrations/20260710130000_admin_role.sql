-- ============================================================================
-- Compte admin/test — voit les leads de tous les clients.
-- Complète 20260710120000_init_schema.sql, ne le modifie pas (migration déjà
-- appliquée).
-- ============================================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Un compte admin n'est rattaché à aucun client en particulier.
alter table public.profiles
  alter column scope_key drop not null;

-- Policy additive (OR'd avec "read own client geojson") : un profile
-- is_admin=true peut lire tous les fichiers du bucket "leads", peu importe
-- leur scope_key. Les users normaux ne sont pas affectés : ils restent
-- limités à leur propre fichier par l'autre policy.
drop policy if exists "admin reads all leads" on storage.objects;
create policy "admin reads all leads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'leads'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin
    )
  );

-- ============================================================================
-- Pour créer le compte admin :
--
-- 1. Authentication > Add user
--      email: admin@leads.solardashboard.app
--      password: (mot de passe fort, à ne pas partager — ce compte lit tout)
--
-- 2. insert into public.profiles (id, scope_key, is_admin)
--      values ('<uuid du user créé à l'étape 1>', null, true);
-- ============================================================================
