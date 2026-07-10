-- ============================================================================
-- Tracking comportement utilisateur (complément à Clarity, mais interrogeable
-- directement en SQL et lié à un compte/client précis).
-- Insert-only pour les users : ils peuvent logger leurs propres events, mais
-- ne peuvent RIEN lire (pas de policy select pour "authenticated" -> accès
-- uniquement via toi, dashboard/SQL Editor, qui bypass la RLS).
-- ============================================================================

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  scope_key  text,                 -- snapshot du client au moment de l'event
  event_type text not null,        -- ex: prospect_consulte, prospect_sauvegarde,
                                    -- geojson_charge, csv_exporte, lightbox_ouverte,
                                    -- dimensionnement_ouvert
  payload    jsonb,                -- détail libre (ex: {"prospect_rang": 12})
  created_at timestamptz not null default now()
);

create index if not exists events_user_id_idx   on public.events (user_id);
create index if not exists events_scope_key_idx on public.events (scope_key);
create index if not exists events_type_idx      on public.events (event_type);

alter table public.events enable row level security;

drop policy if exists "users insert own events" on public.events;
create policy "users insert own events"
  on public.events for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================================
-- Requêtes utiles (SQL Editor) :
--
-- Activité par client sur les 7 derniers jours :
--   select scope_key, event_type, count(*)
--   from public.events
--   where created_at > now() - interval '7 days'
--   group by 1, 2 order by 1, 3 desc;
--
-- Funnel d'un user précis :
--   select event_type, payload, created_at
--   from public.events
--   where user_id = '<uuid>'
--   order by created_at desc limit 100;
-- ============================================================================
