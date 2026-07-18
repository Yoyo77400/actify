# Optimisation des requêtes SQL

Migration : `prisma/migrations/20260718110000_add_query_indexes/migration.sql`
(déclarée dans `prisma/schema.prisma` via `@@index` + extension `pg_trgm`).

Démarche : inventaire des `where` / `orderBy` réellement exécutés par les
services, puis un index par chemin d'accès constaté — **aucun index
spéculatif**. Preuves `EXPLAIN (ANALYZE, BUFFERS)` avant/après ci-dessous,
mesurées sur un jeu de données volumétrique (50 000 listings, 100 000
purchases, 50 000 reviews/favorites/downloads, 200 users).

## 1. Index ajoutés et requêtes servies

### B-tree (recherches par égalité + tri)

| Index | Requête servie (service:ligne) | Justification |
|---|---|---|
| `listings(seller_id, created_at)` | `assets.service.ts:323` (listMyListings), `users.service.ts:207` (listUserAssets), `creator.service.ts:18` (stats), `admin.service.ts:91` (filtre sellerId) | Listings d'un vendeur triés par récence : le filtre `seller_id =` et le `ORDER BY created_at DESC LIMIT n` sont servis par un seul parcours d'index (backward scan), sans tri. |
| `listings(status, created_at)` | `assets.service.ts:385` (listAssets, tri par défaut), `admin.service.ts:87` (listAllAssets), `stats.service.ts:48` (count) | Catalogue publié paginé par date. La sélectivité de `status` est faible (~90 % Published) mais l'index sert surtout le **tri** : top-24 lu directement dans l'ordre de l'index au lieu de trier 45 000 lignes. |
| `purchases(buyer_id, purchased_at)` | `orders.service.ts:157` (listOrders), `users.service.ts:91` (count) | Historique d'achats d'un buyer, plus récent d'abord. |
| `purchases(listing_id, status)` | `orders.service.ts:95` (stock check), `downloads.service.ts:25` (entitlement), `reviews.service.ts:95` (achat vérifié), `creator.service.ts:70` (revenue), `stats.service.ts:60` (groupBy) | Ventes confirmées d'un listing. `status` en 2e colonne permet un **Index Only Scan** sur le count du stock check exécuté à chaque création/confirmation de commande. |
| `reviews(listing_id, created_at)` | `reviews.service.ts:142` (listAssetReviews), `assets.service.ts:308` (aggregate rating) | Avis d'un asset avec tri par défaut `createdAt`. |
| `reviews(reviewer_id)` | `users.service.ts:241` (listUserReviews), `users.service.ts:93` (count) | Avis écrits par un utilisateur. |
| `favorites(listing_id)` | `creator.service.ts:76` (count favoris d'un asset) | La PK composite `(user_id, listing_id)` couvre les lookups par `user_id` (préfixe) mais **pas** par `listing_id` seul. |
| `downloads(user_id, downloaded_at)` | `downloads.service.ts:107` (listMyDownloads), `downloads.service.ts:51` (alreadyDownloaded) | Historique de téléchargements, plus récent d'abord. |
| `downloads(listing_id)` | `downloads.service.ts:53` (cap distinct downloaders), `creator.service.ts:75` (count) | Téléchargements d'un asset. |
| `listing_categories(category_id)` | `categories.service.ts:124` (findCategoryListings), `categories.service.ts:171` (removeCategory) | Même asymétrie que favorites : la PK `(listing_id, category_id)` ne sert pas les lookups par `category_id` seul. |
| `listing_tags(tag_id)` | `assets.service.ts:356` (filtre tags du catalogue) | Résolution tag → listings. |
| `wallets(user_id)` | `orders.service.ts:84` (wallet primaire du vendeur, à chaque commande), `wallets.service.ts:186` (listWallets) | L'unique `(address)` ne sert pas les lookups par `user_id`. |
| `nfts(current_owner_id)` | `users.service.ts:179` (exportMyData) | NFTs détenus par un utilisateur. |

Non indexé, délibérément :
- `resales(seller_id)` : requêté uniquement dans l'export RGPD
  (`users.service.ts:180`) et aucune écriture n'existe encore (pas de service
  de resale) — table vide, index inutile aujourd'hui.
- `users.username` / `users.display_name` en trigram : la table users reste
  petite (des centaines de lignes) ; un seq scan y est déjà optimal. À
  réévaluer si la base utilisateurs dépasse ~10⁵ lignes.
- `wallet_challenges(address, chain)` : déjà indexé par une migration
  antérieure.

### GIN trigram (recherche plein-texte `ILIKE '%q%'`)

| Index | Requête servie |
|---|---|
| `listings(title gin_trgm_ops)` USING GIN | `search.service.ts:77`, `search.service.ts:154`, `assets.service.ts:343` |
| `listings(description gin_trgm_ops)` USING GIN | `search.service.ts:78`, `assets.service.ts:344` |

## 2. Pourquoi pg_trgm pour `ILIKE '%q%'`

Un index B-tree trie les valeurs entières : il ne peut servir que les motifs
**ancrés à gauche** (`q%`). Or la recherche du marketplace fait du
« contient » (`contains` Prisma → `ILIKE '%q%'`) : préfixe inconnu, le B-tree
est inutilisable et Postgres retombe sur un seq scan de toute la table.

`pg_trgm` découpe chaque valeur en **trigrammes** (séquences de 3 caractères :
`dragon` → `  d`, ` dr`, `dra`, `rag`, `ago`, `gon`, `on `). L'index GIN
inverse trigramme → lignes. Pour `ILIKE '%neon dragon%'`, Postgres intersecte
les listes de lignes des trigrammes du motif, puis revérifie le motif complet
sur les seules lignes candidates (« Recheck »). Aucun changement de code : le
planner choisit l'index pour le même SQL généré par Prisma.

**Seuil de pertinence** : le gain croît avec la sélectivité du motif.
- Motif rare (`%neon dragon%`, 0,3 % des lignes) : ~9× ici, et l'écart se
  creuse avec le volume (le seq scan est O(taille table), le GIN ~O(résultat)).
- Motif fréquent (`%dragon%`, ~20 % des lignes) : encore ~3× ici ; au-delà, le
  planner rebascule de lui-même sur un seq scan quand lire toute la table
  devient moins cher que l'index + recheck.
- Contrainte : le motif doit contenir au moins un trigramme, donc **q ≥ 3
  caractères** ; en dessous, seq scan (comportement inchangé).

## 3. Preuves EXPLAIN (ANALYZE, BUFFERS)

Mesures : PostgreSQL 16 (conteneur `actify_db_dev`), base jetable
`actify_wf_check`, seed volumétrique reproductible (`setseed(0.42)`), plans
« avant » capturés via `BEGIN; DROP INDEX …; EXPLAIN …; ROLLBACK;` — donc à
données strictement identiques.

| Requête | Avant | Après | Gain |
|---|---:|---:|---:|
| Q1a — recherche `%dragon%` (motif fréquent, ~20 %) | 63,6 ms | 20,5 ms | ×3 |
| Q1b — recherche `%neon dragon%` (motif rare, 0,3 %) | 62,2 ms | 7,0 ms | ×9 |
| Q2 — listings d'un vendeur, tri date | 5,38 ms | 0,064 ms | ×84 |
| Q3 — commandes d'un acheteur, tri date | 7,27 ms | 0,199 ms | ×37 |
| Q4 — avis d'un asset, tri date | 7,55 ms | 0,170 ms | ×44 |
| Q5 — catalogue publié, tri date, LIMIT 24 | 14,6 ms | 0,063 ms | ×232 |
| Q6 — count ventes confirmées d'un listing | 6,89 ms | 0,058 ms | ×119 |

### Q1b — recherche `ILIKE '%neon dragon%'` (search.service.searchAssets)

Avant (seq scan, 50 000 lignes lues) :

```
Limit  (actual time=62.192..62.197 rows=20)
  ->  Sort  (Sort Key: views_count DESC, top-N heapsort)
        ->  Seq Scan on listings  (actual time=0.901..62.098 rows=147)
              Filter: ((deleted_at IS NULL) AND (status = 'Published') AND
                       ((title ~~* '%neon dragon%') OR (description ~~* '%neon dragon%')))
              Rows Removed by Filter: 49853
              Buffers: shared hit=1386
Execution Time: 62.249 ms
```

Après — BitmapOr des deux index GIN : ~1 650 entrées candidates (74 via
title + 1 574 via description, recouvrement possible), 147 lignes après
recheck, au lieu de 50 000 lignes lues :

```
Limit  (actual time=6.857..6.861 rows=20)
  ->  Sort  (Sort Key: views_count DESC, top-N heapsort)
        ->  Bitmap Heap Scan on listings  (actual time=3.906..6.824 rows=147)
              Recheck Cond: ((title ~~* '%neon dragon%') OR (description ~~* '%neon dragon%'))
              ->  BitmapOr
                    ->  Bitmap Index Scan on listings_title_idx        (rows=74)
                    ->  Bitmap Index Scan on listings_description_idx  (rows=1574)
Execution Time: 6.984 ms
```

### Q2 — listings d'un vendeur (assets.service.listMyListings)

Avant : seq scan de 50 000 lignes + tri des 250 lignes du vendeur.

```
Limit  (actual time=5.337..5.340 rows=20)
  ->  Sort  (Sort Key: created_at DESC, top-N heapsort)
        ->  Seq Scan on listings  (rows=250)
              Filter: ((deleted_at IS NULL) AND (seller_id = 'user-42'))
              Rows Removed by Filter: 49750
              Buffers: shared hit=1386
Execution Time: 5.377 ms
```

Après : le parcours arrière de `(seller_id, created_at)` rend les lignes déjà
triées — le nœud Sort disparaît, 23 pages lues au lieu de 1 389.

```
Limit  (actual time=0.023..0.050 rows=20)
  ->  Index Scan Backward using listings_seller_id_created_at_idx on listings
        Index Cond: (seller_id = 'user-42')
        Filter: (deleted_at IS NULL)
        Buffers: shared hit=23
Execution Time: 0.064 ms
```

### Q3 — commandes d'un acheteur (orders.service.listOrders)

```
Avant : Seq Scan on purchases (Rows Removed by Filter: 99500) + top-N heapsort
        Execution Time: 7.274 ms
Après : Index Scan Backward using purchases_buyer_id_purchased_at_idx
        Buffers: shared hit=23 — Execution Time: 0.199 ms
```

### Q4 — avis d'un asset (reviews.service.listAssetReviews)

```
Avant : Seq Scan on reviews (Rows Removed by Filter: 49993)
        Execution Time: 7.547 ms
Après : Bitmap Index Scan on reviews_listing_id_created_at_idx (rows=7)
        Execution Time: 0.170 ms
```

### Q5 — catalogue publié trié par date (assets.service.listAssets)

Le cas le plus parlant : `status = 'Published'` matche 90 % de la table, un
index sur le seul statut serait inutile. C'est le **tri** que l'index sert :
le top-24 par date est lu directement dans l'ordre de `(status, created_at)`.

```
Avant : Seq Scan (rows=45000) + top-N heapsort — Execution Time: 14.619 ms
Après : Index Scan Backward using listings_status_created_at_idx (24 lignes lues)
        Buffers: shared hit=27 — Execution Time: 0.063 ms
```

### Q6 — ventes confirmées d'un listing (orders.service.assertLimitedStockAvailable)

`(listing_id, status)` contient toutes les colonnes utiles au count → **Index
Only Scan**, zéro accès à la table (`Heap Fetches: 0`).

```
Avant : Seq Scan on purchases (Rows Removed by Filter: 99992) — 6.890 ms
Après : Index Only Scan using purchases_listing_id_status_idx, Heap Fetches: 0 — 0.058 ms
```

## 4. Rejouer la démo

Depuis `API_ACTIFY_NODE/`, avec le conteneur db de dev lancé
(`docker compose up -d db` à la racine du repo) :

```bash
# 1. Base jetable + chaîne complète de migrations
docker exec actify_db_dev psql -U actify -d postgres -c "CREATE DATABASE actify_wf_check"
DATABASE_URL=postgresql://actify:actify@localhost:5432/actify_wf_check npx prisma migrate deploy

# 2. Seed volumétrique (~20 s) puis plans avant/après
docker exec -i actify_db_dev psql -U actify -d actify_wf_check -v ON_ERROR_STOP=1 < seed.sql
docker exec -i actify_db_dev psql -U actify -d actify_wf_check < explain_before.sql
docker exec -i actify_db_dev psql -U actify -d actify_wf_check < explain_after.sql

# 3. Nettoyage
docker exec actify_db_dev psql -U actify -d postgres -c "DROP DATABASE actify_wf_check"
```

`seed.sql` insère les volumes ci-dessus en `generate_series` (titres et
descriptions composés de mots aléatoires d'un pool de 60, pour donner du grain
au `ILIKE`). `explain_before.sql` droppe les nouveaux index dans une
transaction, exécute les `EXPLAIN (ANALYZE, BUFFERS)`, puis `ROLLBACK` ;
`explain_after.sql` exécute les mêmes requêtes avec les index. Les trois
scripts sont reproduits en annexe ci-dessous.

<details>
<summary>seed.sql</summary>

```sql
\timing on
SET client_min_messages TO WARNING;
SELECT setseed(0.42);

INSERT INTO roles (name) VALUES ('user');

-- 200 users
INSERT INTO users (id, role_id, username, display_name, created_at)
SELECT 'user-' || i, 1, 'creator_' || i, 'Creator ' || i,
       now() - (random() * interval '400 days')
FROM generate_series(1, 200) AS i;

-- 50 000 listings : titres 3 mots, descriptions 12 mots (pool de 60), ~90% Published
WITH w(arr) AS (
  SELECT ARRAY['neon','pixel','synth','cyber','forest','dragon','ocean','retro',
               'galaxy','shadow','crystal','ember','vector','quantum','lofi','aurora',
               'desert','noir','pastel','glitch','marble','velvet','solar','lunar',
               'frost','blaze','echo','drift','prism','orbit','nebula','canyon',
               'mirage','onyx','coral','zephyr','raven','tundra','saffron','indigo',
               'bamboo','obsidian','meadow','harbor','summit','willow','falcon','amber',
               'cascade','dune','fjord','grove','haze','isle','jade','krypton',
               'lagoon','moss','nectar','opal']::text[]
)
INSERT INTO listings (id, seller_id, slug, title, description, is_free, price, currency,
                      status, views_count, sales_count, created_at)
SELECT
  'listing-' || i,
  'user-' || (1 + (i % 200)),
  'listing-' || i,
  arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int] || ' '
    || arr[1 + floor(random()*60)::int],
  arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int] || ' '
    || arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int] || ' '
    || arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int] || ' '
    || arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int] || ' '
    || arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int] || ' '
    || arr[1 + floor(random()*60)::int] || ' ' || arr[1 + floor(random()*60)::int],
  (i % 10 = 0),
  round((random() * 500)::numeric, 2),
  'XRP',
  CASE WHEN i % 100 < 90 THEN 'Published' WHEN i % 100 < 98 THEN 'Draft' ELSE 'Archived' END,
  floor(random() * 5000)::int,
  0,
  now() - (random() * interval '365 days')
FROM generate_series(1, 50000) AS i, w;

-- 100 000 purchases (85% Confirmed)
INSERT INTO purchases (id, buyer_id, listing_id, tx_hash, amount_paid, status, purchased_at)
SELECT
  'purchase-' || i,
  'user-' || (1 + floor(random()*200)::int),
  'listing-' || (1 + floor(random()*50000)::int),
  'tx-' || i,
  round((random() * 500)::numeric, 2),
  CASE WHEN i % 100 < 85 THEN 'Confirmed' WHEN i % 100 < 95 THEN 'Pending' ELSE 'Cancelled' END,
  now() - (random() * interval '365 days')
FROM generate_series(1, 100000) AS i;

-- 50 000 reviews
INSERT INTO reviews (id, listing_id, reviewer_id, rating, comment, created_at)
SELECT
  'review-' || i,
  'listing-' || (1 + floor(random()*50000)::int),
  'user-' || (1 + floor(random()*200)::int),
  1 + floor(random()*5)::int,
  'avis numero ' || i,
  now() - (random() * interval '365 days')
FROM generate_series(1, 50000) AS i;

-- 50 000 favorites (paires distinctes pour la PK composite)
INSERT INTO favorites (user_id, listing_id, added_at)
SELECT
  'user-' || (1 + (i % 200)),
  'listing-' || i,
  now() - (random() * interval '365 days')
FROM generate_series(1, 50000) AS i;

-- 50 000 downloads
INSERT INTO downloads (id, user_id, listing_id, downloaded_at)
SELECT
  'download-' || i,
  'user-' || (1 + floor(random()*200)::int),
  'listing-' || (1 + floor(random()*50000)::int),
  now() - (random() * interval '365 days')
FROM generate_series(1, 50000) AS i;

ANALYZE;
```

</details>

<details>
<summary>explain_before.sql</summary>

```sql
-- Plans AVANT : drop des nouveaux index dans une transaction puis ROLLBACK,
-- pour mesurer sur exactement les memes donnees.
BEGIN;
DROP INDEX listings_title_idx;
DROP INDEX listings_description_idx;
DROP INDEX listings_seller_id_created_at_idx;
DROP INDEX listings_status_created_at_idx;
DROP INDEX purchases_buyer_id_purchased_at_idx;
DROP INDEX purchases_listing_id_status_idx;
DROP INDEX reviews_listing_id_created_at_idx;

\echo ===Q1a recherche ILIKE mot courant (dragon)===
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM listings
WHERE status = 'Published' AND deleted_at IS NULL
  AND (title ILIKE '%dragon%' OR description ILIKE '%dragon%')
ORDER BY views_count DESC LIMIT 20;

\echo ===Q1b recherche ILIKE expression rare (neon dragon)===
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM listings
WHERE status = 'Published' AND deleted_at IS NULL
  AND (title ILIKE '%neon dragon%' OR description ILIKE '%neon dragon%')
ORDER BY views_count DESC LIMIT 20;

\echo ===Q2 listings d un vendeur===
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, status, created_at FROM listings
WHERE seller_id = 'user-42' AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 20;

\echo ===Q3 commandes d un acheteur===
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, status, amount_paid, purchased_at FROM purchases
WHERE buyer_id = 'user-42'
ORDER BY purchased_at DESC LIMIT 20;

\echo ===Q4 avis d un asset===
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, rating, comment, created_at FROM reviews
WHERE listing_id = 'listing-9234'
ORDER BY created_at DESC LIMIT 20;

\echo ===Q5 catalogue publie tri par date===
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM listings
WHERE status = 'Published' AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 24;

\echo ===Q6 ventes confirmees d un listing (stock check)===
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM purchases
WHERE listing_id = 'listing-42384' AND status = 'Confirmed';

ROLLBACK;
```

</details>

`explain_after.sql` = les mêmes requêtes, sans le `BEGIN`/`DROP INDEX`/`ROLLBACK`.

Note : les ids « chauds » (`listing-9234`, `listing-42384`) dépendent du seed ;
avec un autre seed, les retrouver via
`SELECT listing_id FROM reviews GROUP BY 1 ORDER BY count(*) DESC LIMIT 1`.

## 5. Notes d'implémentation

- Tout est déclaré dans `schema.prisma` (Prisma 7, preview feature
  `postgresqlExtensions` pour `extensions = [pg_trgm]`, index GIN via
  `@@index([title(ops: raw("gin_trgm_ops"))], type: Gin)`) ; le SQL de la
  migration est celui généré par `prisma migrate diff` — aucun écart
  schéma/migration sur les index. Seul écart résiduel détecté par `migrate
  diff` : la FK `nfts.license_id` (drift préexistant de la migration XRPL, qui
  a rendu la colonne nullable sans recréer la FK en `ON DELETE SET NULL`),
  indépendant de cette migration.
- Pas de `CREATE INDEX CONCURRENTLY` : `prisma migrate deploy` exécute chaque
  migration dans une transaction, où `CONCURRENTLY` est interdit. La création
  des index pose donc de brefs verrous `SHARE` qui bloquent les écritures le
  temps du build — acceptable aux volumétries actuelles.
- Les index accélèrent les lectures au prix d'une écriture légèrement plus
  chère (maintenance de l'index à chaque INSERT/UPDATE). Le ratio
  lecture/écriture d'un marketplace (catalogue consulté en permanence,
  écritures rares) rend l'échange largement favorable.
