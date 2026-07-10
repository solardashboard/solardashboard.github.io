# Setup Supabase — prospection

Projet : `occceleohepinqnrbvxj` (URL + publishable key déjà branchés dans `prospection/js/config.js`).

## 1. Schéma

Deux façons d'appliquer `migrations/20260710120000_init_schema.sql` :

- **Intégration GitHub** (Project Settings → Integrations → GitHub, chemin relatif `supabase`) : la migration s'applique automatiquement au push/merge sur la branche liée.
- **Manuel** : SQL Editor → coller le contenu du fichier → Run.

Crée les tables `clients` / `profiles` + les policies RLS (branding public, leads strictement scopés par user via storage RLS).

Toute évolution du schéma doit passer par un nouveau fichier dans `migrations/` (`supabase migration new <nom>` si tu utilises la CLI, sinon un fichier `YYYYMMDDHHMMSS_nom.sql` à la main) — ne pas modifier une migration déjà appliquée.

## 3. Bucket Storage

Storage → New bucket → nom `leads`, **Private** (pas public).

## 4. Onboarder un client (à chaque nouveau client)

1. **SQL Editor** :
   ```sql
   insert into public.clients (scope_key, name, accent_color)
   values ('voltare', 'Voltare', 'F59E0B');
   ```

2. **Authentication → Add user** :
   - email : `voltare@leads.solardashboard.app` (ou un vrai email si tu préfères — le front accepte les deux, il ajoute le domaine automatiquement si le login tapé ne contient pas de `@`)
   - mot de passe : génère-le ou laisse le client le définir via un lien d'invite Supabase

3. **SQL Editor** — lier le user au client (récupère l'UUID du user créé à l'étape 2, visible dans Authentication) :
   ```sql
   insert into public.profiles (id, scope_key)
   values ('<uuid-du-user>', 'voltare');
   ```

4. **Storage → leads → Upload** : dépose le fichier de sortie du pipeline `proto-identification-toitures` pour ce client, renommé en `voltare.geojson` (le nom doit matcher exactement `{scope_key}.geojson`).

## 4bis. Compte admin/test (voit tous les clients)

Après avoir appliqué `migrations/20260710130000_admin_role.sql` :

1. Authentication → Add user : `admin@leads.solardashboard.app`, mot de passe fort (ce compte lit les leads de tous les clients — ne pas le partager).
2. SQL Editor :
   ```sql
   insert into public.profiles (id, scope_key, is_admin)
   values ('<uuid-du-user>', null, true);
   ```

Login `admin` côté front → charge et fusionne tous les `.geojson` du bucket.

## Clients "départements + top N" (recommandé pour les nouveaux clients)

`migrations/20260710150000_leads_table.sql` : une table `leads` unique (tous les prospects, tous départements confondus), filtrée dynamiquement par la RLS selon `profiles.depts` (liste de départements) et `profiles.leads_limit_per_dept` (défaut 50, top N par score). Plus besoin de pré-découper un geojson par client à chaque onboarding ou changement de critère.

1. **Charger les leads une fois** : Table Editor → `leads` → Insert → "Import data via spreadsheet" → `leads_seed.csv`.
2. **Onboarder un client** (aucun fichier à uploader) :
   ```sql
   insert into public.clients (scope_key, name, accent_color)
     values ('evolusun', 'Evolusun', 'F59E0B');

   insert into public.profiles (id, scope_key, depts)
     values ('<uuid-du-user>', 'evolusun', array['07','42','38','69']);
   ```
3. **Ajuster sans re-export** :
   ```sql
   update public.profiles set leads_limit_per_dept = 75 where scope_key = 'evolusun';
   update public.profiles set depts = array_append(depts, '43') where scope_key = 'evolusun';
   ```

Les comptes `demo` / `beta_testeurs` / `admin` restent sur l'ancien modèle fichier (Storage) — pas de migration nécessaire pour eux, et l'admin voit désormais les deux sources fusionnées.

### Ajouter des leads après coup

Il n'y a pas d' "assignation" manuelle par lead : la visibilité vient uniquement de `dept` (+ `score` pour le rang). Insérer une ligne avec le bon `dept` suffit — elle apparaît automatiquement chez tout user dont `depts` contient ce département, si son score la classe dans le top `leads_limit_per_dept`.

```sql
insert into public.leads (dept, score, rank_in_dept, properties, geometry) values
  ('69', 275, 0, '{"nom": "...", "adresse": "...", ...}'::jsonb, '{"type":"Polygon","coordinates":[...]}'::jsonb);
```

`rank_in_dept` mis à 0 ici est temporaire — après un ajout (ou une mise à jour de score), recalcule toujours le rang pour rester cohérent :

```sql
-- recalcule le rang de TOUS les leads (sûr à relancer après n'importe quel insert/update)
update public.leads l
set rank_in_dept = sub.rn
from (
  select id, row_number() over (partition by dept order by score desc) as rn
  from public.leads
) sub
where l.id = sub.id;
```

Si un jour tu as besoin d'assigner un lead précis à un user précis (hors logique dept/score), c'est un modèle différent (table de liaison lead↔user) — pas construit pour l'instant, à voir si le besoin se confirme.

## Tracking (events)

`migrations/20260710140000_events_table.sql` : table `events`, insert-only pour les users (RLS), lisible seulement par toi (SQL Editor / Table editor, bypass la RLS). Log automatiquement à chaque `_track(...)` déjà présent dans le code (consultation prospect, sauvegarde, chargement geojson, export CSV, ouverture lightbox/dimensionnement) — aucune instrumentation supplémentaire à faire.

## Compte démo

Même routine que les autres clients, avec `demo.geojson` (polygones réels, tout le reste factice — généré pour les captures d'écran) et `scope_key = 'demo'`.

## 5. Test

Va sur `prospection/index.html`, connecte-toi avec `voltare` / le mot de passe défini à l'étape 2 — les leads doivent se charger automatiquement, sans upload manuel.

## Notes

- Un user ne voit que le fichier `{son scope_key}.geojson` — appliqué par une RLS policy sur `storage.objects`, pas par le front. Même en bidouillant le JS côté client, impossible de lire le fichier d'un autre client.
- Le drag & drop manuel reste disponible après connexion (utile pour tester un fichier ponctuel), il ne remplace pas le chargement auto.
- Si un client doit voir plusieurs zones/critères différents un jour, le modèle actuel (1 scope_key = 1 fichier) suffit tant que chaque combinaison a son propre login. Si ça devient trop fin (filtres dynamiques par user), il faudra remplacer le fichier statique par une vraie table `leads` + RLS par colonne — pas nécessaire pour l'instant.
