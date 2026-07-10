-- ============================================================================
-- Prospection — backend Supabase
-- Modèle : 1 client = 1 fichier geojson dans Storage. 1 login = 1 profile
-- pointant vers un client. Le login (email) est fixé par l'admin (toi),
-- seul le mot de passe est choisi par l'utilisateur (flow "invite" Supabase).
-- ============================================================================

-- ── Table clients ────────────────────────────────────────────────────────
-- Remplace l'objet CLIENTS codé en dur dans prospection/js/config.js.
-- scope_key = nom du fichier geojson dans le bucket "leads" (sans extension).
create table if not exists public.clients (
  scope_key    text primary key,
  name         text not null,
  accent_color text not null default 'F59E0B',  -- hex sans #
  logo_url     text,
  website      text,
  created_at   timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Les infos de branding ne sont pas sensibles : tout user connecté peut les lire.
-- (Le filtrage sensible se fait sur les leads eux-mêmes, via storage.)
drop policy if exists "clients readable by authenticated" on public.clients;
create policy "clients readable by authenticated"
  on public.clients for select
  to authenticated
  using (true);

-- ── Table profiles ───────────────────────────────────────────────────────
-- 1 ligne par compte Supabase Auth. Lie un user à un client.
-- L'utilisateur ne peut PAS modifier scope_key lui-même (pas de policy update/insert
-- pour "authenticated" -> seul toi, via le dashboard ou service_role, gères ça).
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  scope_key  text not null references public.clients(scope_key),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- ── Storage bucket "leads" ───────────────────────────────────────────────
-- Créer le bucket depuis le dashboard (Storage > New bucket > "leads", PRIVÉ).
-- Convention de nommage : un fichier par client, nommé "{scope_key}.geojson"
-- à la racine du bucket (pas de sous-dossier).

-- Un user connecté ne peut lire QUE le fichier correspondant à son scope_key.
drop policy if exists "read own client geojson" on storage.objects;
create policy "read own client geojson"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'leads'
    and name = (
      select scope_key from public.profiles where id = auth.uid()
    ) || '.geojson'
  );

-- ============================================================================
-- Usage pour onboarder un nouveau client / user (à faire manuellement ou via
-- un petit script admin — PAS depuis le front) :
--
-- 1. insert into public.clients (scope_key, name, accent_color)
--      values ('voltare', 'Voltare', 'F59E0B');
--
-- 2. Dashboard > Authentication > Add user
--      email: voltare@leads.solardashboard.app   (ou vrai email si tu préfères)
--      password: laissé au client / lien d'invite
--
-- 3. insert into public.profiles (id, scope_key)
--      values ('<uuid du user créé à l'étape 2>', 'voltare');
--
-- 4. Storage > leads > upload "voltare.geojson"
--      (sortie du pipeline proto-identification-toitures pour ce client)
-- ============================================================================
