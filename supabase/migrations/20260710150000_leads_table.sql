-- ============================================================================
-- Table leads unique + filtrage dynamique par département et par rang de score.
-- Remplace le modèle "1 fichier par client" pour les clients définis par une
-- liste de départements + un nombre de leads max par département : plus
-- besoin de repasser par un export/upload à chaque nouveau client ou
-- changement de critère, tout se règle en SQL sur profiles.
--
-- Les comptes existants (demo, beta_testeurs, admin) restent sur le modèle
-- fichier (Storage) — pas touchés par cette migration. L'admin voit en plus
-- désormais le contenu de cette table (voir auth.js).
-- ============================================================================

create table if not exists public.leads (
  id           bigint generated always as identity primary key,
  dept         text not null,
  score        numeric not null default 0,
  rank_in_dept int not null,        -- 1 = meilleur score du département (calculé à l'import)
  properties   jsonb not null,      -- nom, adresse, code_postal, commune, puissance_kwc, ...
  geometry     jsonb not null,      -- geometry GeoJSON brute (Polygon/MultiPolygon/Point)
  created_at   timestamptz not null default now()
);

create index if not exists leads_dept_rank_idx on public.leads (dept, rank_in_dept);

alter table public.leads enable row level security;

alter table public.profiles
  add column if not exists depts text[],
  add column if not exists leads_limit_per_dept int not null default 50;

-- Un user avec depts=['38','69'] et leads_limit_per_dept=50 voit les 50
-- meilleurs leads (par score) de chaque département listé. Un admin
-- (is_admin=true) voit tout, sans restriction de dept ni de rang.
drop policy if exists "read leads scoped by depts and rank" on public.leads;
create policy "read leads scoped by depts and rank"
  on public.leads for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and public.leads.dept = any(p.depts)
        and public.leads.rank_in_dept <= p.leads_limit_per_dept
    )
  );

-- ============================================================================
-- 1. Charger les leads : Table Editor > leads > Insert > "Import data via
--    spreadsheet" > leads_seed.csv (fourni à côté de cette migration).
--
-- 2. Onboarder un client dept-based (aucun upload de fichier requis) :
--
--    insert into public.clients (scope_key, name, accent_color)
--      values ('evolusun', 'Evolusun', 'F59E0B');
--
--    insert into public.profiles (id, scope_key, depts)
--      values ('<uuid>', 'evolusun', array['07','42','38','69']);
--
-- 3. Ajuster à tout moment sans re-export :
--
--    update public.profiles set leads_limit_per_dept = 75 where scope_key = 'evolusun';
--    update public.profiles set depts = array_append(depts, '43') where scope_key = 'evolusun';
-- ============================================================================
