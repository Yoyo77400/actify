# API Routes — Marketplace Web3 de Fichiers Numériques (Complet)

> Version alignée sur le schéma PostgreSQL. Toutes les routes supposent un prefix `/api/v1`.

## Statut d'implémentation (2026-07-11)

| Module | Statut |
|---|---|
| Auth (refresh), Users, Wallets (login/link XRPL) | ✅ Implémenté |
| Assets (CRUD + publish/unpublish + filtres) | ✅ Implémenté |
| Catégories, Reviews, Favoris | ✅ Implémenté |
| Orders (+ vérification paiement on-chain XRPL Testnet) | ✅ Implémenté |
| Downloads (token signé 1h → redirect IPFS) | ✅ Implémenté |
| Recherche, Stats publiques, Stats créateur | ✅ Implémenté |
| Admin (assets, users, orders, stats) | ✅ Implémenté |
| TOTP, logout/sessions (révocation serveur) | ⏳ Différé — lot "Auth2" |
| Policies, versions, upload fichiers (AES), notifications, consents, reports, resale, mint NFT, payouts, WebSocket, rate limiting | ⏳ Différé — pas de modèle/infra en base pour l'instant |

---

## Authentification & Sécurité

> Connexion exclusivement via wallet (signature à la Metamask/Phantom). Voir la section [Wallets](#wallets) pour le flow de connexion. Pas d'OAuth2, pas de mot de passe.

### Sessions

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/auth/refresh` | Renouveler access token via refresh token | Bearer token (refresh) |
| `POST` | `/auth/logout` | Révoquer la session (invalide le refresh token) | Bearer token |
| `GET` | `/auth/sessions` | Lister mes sessions actives | Bearer token |
| `DELETE` | `/auth/sessions/:id` | Révoquer une session spécifique | Bearer token |

### TOTP (2FA)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/auth/totp/setup` | Générer secret + QR code d'enrollment | Bearer token |
| `POST` | `/auth/totp/verify` | Vérifier un code TOTP (activation ou action sensible) | Bearer token |
| `POST` | `/auth/totp/disable` | Désactiver le 2FA (nécessite code TOTP valide) | Bearer token + TOTP |
| `GET` | `/auth/totp/recovery-codes` | Générer/régénérer les recovery codes | Bearer token + TOTP |
| `POST` | `/auth/totp/recover` | Utiliser un recovery code | Bearer token |

---

## Utilisateurs

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/users/me` | Mon profil complet (email, wallets, role, stats) | Bearer token |
| `PUT` | `/users/me` | Modifier mon profil (username, display_name, bio, avatar) | Bearer token |
| `DELETE` | `/users/me` | Supprimer mon compte (soft delete + RGPD) | Bearer token + TOTP |
| `GET` | `/users/me/data-export` | Export RGPD de mes données (JSON) | Bearer token + TOTP |
| `GET` | `/users/:username` | Profil public d'un utilisateur | None |
| `GET` | `/users/:username/assets` | Assets publiés par cet utilisateur | None |
| `GET` | `/users/:username/reviews` | Avis laissés par cet utilisateur | None |

---

## Wallets

Le wallet est l'unique moyen de connexion : `challenge` + `verify` font office de login/signup (pas d'OAuth2, pas de mot de passe). Chaîne supportée actuellement : `xrpl`. La vérification de signature est branchée par chaîne (`services/chains/*`) pour pouvoir en ajouter d'autres plus tard sans toucher au reste du flow.

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/wallets/challenge` | Générer un challenge (nonce + message + expiration 5 min) à signer | None |
| `POST` | `/wallets/verify` | Vérifier la signature : connexion (+ création de compte si nouveau wallet) ou liaison si déjà authentifié | None* |
| `GET` | `/wallets` | Lister mes wallets liés | Bearer token |
| `PUT` | `/wallets/:id` | Modifier (label, set primary) | Bearer token |
| `DELETE` | `/wallets/:id` | Délier un wallet | Bearer token + TOTP** |

> \* Si un access token valide est fourni en header, le wallet vérifié est lié au compte authentifié (multi-wallet). Sinon, la signature fait foi d'identité : connexion si le wallet est déjà lié à un compte, création de compte sinon. Impossible de délier son dernier wallet (`LAST_WALLET`) : ce serait perdre l'accès au compte puisqu'il n'y a pas d'autre moyen de connexion.
>
> \*\* Le 2FA n'existe pas encore (Auth2) : cette route n'est protégée que par `Bearer token` pour l'instant.

**Body de `POST /wallets/challenge` :**
```json
{
  "address": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
  "chain": "xrpl"
}
```

**Réponse de `POST /wallets/challenge` :**
```json
{
  "success": true,
  "data": {
    "nonce": "hex-nonce",
    "message": "Actify wallet verification\naddress: rPT1Sjq2YGr...\nnonce: hex-nonce\nissued: 2026-07-10T06:48:13.569Z",
    "expiresAt": "2026-07-10T06:53:13.569Z"
  }
}
```

`message` est la chaîne exacte à faire signer par le wallet (encodée en hex avant signature, convention XRPL). Le wallet renvoie une signature hex sur `messageHex = hex(utf8(message))`.

**Body de `POST /wallets/verify` :**
```json
{
  "address": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
  "publicKey": "hex-public-key",
  "signature": "hex-signature",
  "nonce": "hex-nonce",
  "chain": "xrpl"
}
```

> `publicKey` est requis car une adresse XRPL est un hash de la clé publique (pas la clé elle-même, contrairement à Solana) : le serveur re-dérive l'adresse depuis `publicKey` et rejette si elle ne correspond pas à `address`, avant même de vérifier la signature.

**Réponse de `POST /wallets/verify` — connexion ou création de compte (aucun token fourni) :**
```json
{
  "success": true,
  "data": {
    "mode": "authenticated",
    "isNewAccount": false,
    "accessToken": "...",
    "refreshToken": "...",
    "user": { "id": "uuid-user", "username": null, "role": "user" }
  }
}
```

**Réponse de `POST /wallets/verify` — liaison d'un wallet supplémentaire (access token fourni) :**
```json
{
  "success": true,
  "data": { "mode": "linked" }
}
```

---

## Assets (Produits / Fichiers)

### CRUD

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets` | Créer un asset (draft) | Bearer token + Creator |
| `GET` | `/assets` | Catalogue public (assets publiés, paginé, filtrable) | None |
| `GET` | `/assets/:idOrSlug` | Détails d'un asset (incrémente views si publié) | None* |
| `PUT` | `/assets/:id` | Modifier un asset (titre, desc, tags, prix...) | Bearer token + Owner |
| `DELETE` | `/assets/:id` | Soft delete un asset | Bearer token + Owner + TOTP** |
| `POST` | `/assets/:id/publish` | Publier (draft → published) | Bearer token + Owner + TOTP** |
| `POST` | `/assets/:id/unpublish` | Dépublier (published → archived) | Bearer token + Owner |

> \* Un asset `Draft`/`Archived` n'est visible que par son propriétaire (404 pour tout le monde sinon, même signature que "n'existe pas").
>
> \*\* Le 2FA n'existe pas encore (Auth2) : ces routes ne sont protégées que par `Bearer token + Owner` pour l'instant.

**Body de `POST /assets` :**
```json
{
  "title": "Pack UI Kit Figma",
  "description": "...",
  "shortDescription": "Kit UI complet avec 200+ composants",
  "tags": ["ui", "figma", "design"],
  "categoryIds": [1, 2],
  "distributionMode": "limited",
  "maxDownloads": 500,
  "isFree": false,
  "basePrice": 2.5,
  "currency": "XRP",
  "royaltyBps": 1000
}
```

`categoryIds` référence des catégories existantes (`GET /categories`), plusieurs catégories par asset possibles. `royaltyBps` est en points de base (1000 = 10%). `currency` est un champ libre (pas d'enum) : "XRP" pour l'instant, prêt pour du multi-devise plus tard. `slug` est généré automatiquement à partir de `title` (et régénéré si le titre change) — c'est lui ou `id` qui identifie l'asset dans `GET/PUT/DELETE /assets/:idOrSlug|:id`.

### Upload de fichiers

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/files` | Upload du fichier principal (chiffrement AES-256-GCM auto) | Bearer token + Owner + TOTP |
| `DELETE` | `/assets/:id/files/:fileId` | Supprimer un fichier uploadé | Bearer token + Owner |
| `POST` | `/assets/:id/preview` | Upload du thumbnail | Bearer token + Owner |
| `POST` | `/assets/:id/preview-images` | Upload des images de galerie (multi) | Bearer token + Owner |
| `DELETE` | `/assets/:id/preview-images/:index` | Supprimer une image de galerie | Bearer token + Owner |

### Versions

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/versions` | Publier une nouvelle version (upload + changelog) | Bearer token + Owner + TOTP |
| `GET` | `/assets/:id/versions` | Lister les versions d'un asset | None |
| `GET` | `/assets/:id/versions/:versionId` | Détails d'une version | None |

**Body de `POST /assets/:id/versions` :**
```json
{
  "version": "2.0.0",
  "changelog": "Ajout de 50 nouveaux composants, fix responsive",
  "file": "<multipart>"
}
```

### Filtres sur `GET /assets`

| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | int | Page (défaut: 1) |
| `limit` | int | Par page (défaut: 20, max: 100) |
| `sort` | string | `createdAt`, `price`, `rating`, `sales`, `views` |
| `order` | string | `asc` ou `desc` |
| `q` | string | Recherche full-text (titre + description) |
| `category` | string | Slug de catégorie |
| `tags` | string | Tags séparés par virgule |
| `isFree` | boolean | Gratuit ou payant |
| `mode` | enum | `unlimited`, `limited`, `unique` |
| `minPrice` | number | Prix minimum |
| `maxPrice` | number | Prix maximum |
| `creator` | string | Username du créateur |

---

## Catégories

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/categories` | Arbre complet des catégories (avec sous-catégories) | None |
| `GET` | `/categories/:slug` | Détails d'une catégorie | None |
| `GET` | `/categories/:slug/assets` | Assets d'une catégorie (paginé) | None |
| `POST` | `/categories` | Créer une catégorie | Bearer token + Admin |
| `PUT` | `/categories/:id` | Modifier une catégorie | Bearer token + Admin |
| `DELETE` | `/categories/:id` | Désactiver une catégorie | Bearer token + Admin |

---

## License Policies (Tiers de licence)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/policies` | Créer un tier de licence pour cet asset | Bearer token + Owner |
| `GET` | `/assets/:id/policies` | Lister les tiers disponibles | None |
| `PUT` | `/policies/:id` | Modifier un tier (prix, conditions) | Bearer token + Owner |
| `DELETE` | `/policies/:id` | Désactiver un tier | Bearer token + Owner |

**Body de `POST /assets/:id/policies` :**
```json
{
  "licenseType": "commercial",
  "name": "Commercial License",
  "description": "Usage commercial illimité, 5 sièges",
  "price": 5.0,
  "currency": "SOL",
  "durationDays": null,
  "maxSeats": 5,
  "transferAllowed": false,
  "royaltyBps": 0,
  "updatesIncludedUntil": "3.x",
  "maxSupply": null
}
```

---

## Orders (Achats)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/orders` | Créer une commande (choisir asset + policy) | Bearer token |
| `GET` | `/orders` | Mes commandes (historique paginé) | Bearer token |
| `GET` | `/orders/:id` | Détails d'une commande | Bearer token + Owner |
| `POST` | `/orders/:id/confirm` | Confirmer le paiement on-chain (envoie la tx) | Bearer token + TOTP |
| `POST` | `/orders/:id/cancel` | Annuler une commande pending | Bearer token + Owner |

**Body de `POST /orders` :**
```json
{
  "assetId": "uuid-asset"
}
```

> Pas de `policyId` tant que les License Policies ne sont pas implémentées : le prix est celui du listing.

> Seuls les listings en `currency: "XRP"` et de prix > 0 sont commandables (seul XRP natif est vérifiable on-chain aujourd'hui).

**Réponse (inclut les infos pour le paiement on-chain) :**
```json
{
  "id": "uuid-order",
  "status": "Pending",
  "amount": 5.0,
  "currency": "XRP",
  "paymentAddress": "rXXX...sellerPrimaryWallet",
  "paymentTag": 3829104733,
  "expiresAt": "2026-07-11T14:30:00Z"
}
```

> `paymentAddress` et `paymentTag` sont **figés à la création** de la commande. L'acheteur DOIT envoyer le paiement XRP avec ce **DestinationTag** : c'est lui qui lie le paiement à cette commande précise (sans tag, n'importe quel paiement vers le vendeur pourrait être rejoué pour confirmer une commande).

**`POST /orders/:id/confirm`** — body `{ "txHash": "..." }` (64 caractères hexadécimaux, normalisé en majuscules). Le serveur vérifie la transaction **on-chain** via le JSON-RPC XRPL (`XRPL_RPC_URL`, Testnet par défaut) : tx validée (`tesSUCCESS`), type `Payment`, destination = `paymentAddress` figée, **`DestinationTag` = `paymentTag`**, `delivered_amount` ≥ prix en drops. Le stock d'un asset `limited` est re-vérifié au confirm (anti-survente). Un `txHash` déjà utilisé est rejeté (409 `TX_ALREADY_USED`).

---

## Licenses & NFT

### Licenses

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/licenses` | Mes licences actives | Bearer token |
| `GET` | `/licenses/:id` | Détails d'une licence (conditions, validité) | Bearer token + Owner |
| `GET` | `/licenses/:id/verify` | Vérification on-chain de la détention | Bearer token + Owner |

### Mint

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/licenses/mint-intent` | Préparer le mint (payload pour signature wallet) | Bearer token |
| `POST` | `/licenses/mint-confirm` | Confirmer le mint après signature | Bearer token |

**Body de `POST /licenses/mint-intent` :**
```json
{
  "orderId": "uuid-order"
}
```

### NFT (lecture)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/nft/owned` | Mes NFTs de licence | Bearer token |
| `GET` | `/nft/:mintAddress` | Infos d'un NFT (métadonnées on-chain) | None |
| `GET` | `/nft/:mintAddress/owner` | Propriétaire actuel (lecture on-chain) | None |

---

## Downloads

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/downloads/:assetId/request` | Demander un téléchargement (vérif licence + génère token) | Bearer token |
| `GET` | `/downloads/token/:token` | Télécharger via token signé (lien éphémère) | None* |
| `GET` | `/downloads/history` | Mon historique de téléchargements | Bearer token |

> \* Le token est signé et a une expiration courte (1h). Pas besoin d'auth header, le token fait office de preuve.

**Flow complet :**
1. `POST /downloads/:assetId/request` → vérifie l'authentification (wallet) + licence on-chain + validité
2. Retourne `{ "downloadToken": "...", "expiresAt": "...", "version": "2.0.0" }`
3. `GET /downloads/token/:token` → déchiffre le fichier, applique watermark si configuré, stream le fichier

**Query params optionnels sur `/downloads/:assetId/request` :**

| Param | Type | Description |
|-------|------|-------------|
| `versionId` | uuid | Version spécifique (défaut: latest autorisée) |

---

## Revente (marché secondaire — licences uniques transférables)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/resale` | Mettre une licence en revente | Bearer token + Owner + TOTP |
| `GET` | `/resale` | Annonces de revente actives (paginé, filtrable) | None |
| `GET` | `/resale/:id` | Détails d'une annonce de revente | None |
| `PUT` | `/resale/:id` | Modifier le prix | Bearer token + Owner |
| `DELETE` | `/resale/:id` | Annuler la mise en revente | Bearer token + Owner |
| `POST` | `/resale/:id/buy` | Acheter en revente (paiement + transfert on-chain) | Bearer token + TOTP |

**Body de `POST /resale` :**
```json
{
  "licenseId": "uuid-license",
  "price": 3.0,
  "currency": "SOL"
}
```

**Filtres sur `GET /resale` :**

| Param | Type | Description |
|-------|------|-------------|
| `assetId` | uuid | Filtrer par asset |
| `minPrice` | number | Prix minimum |
| `maxPrice` | number | Prix maximum |
| `sort` | string | `price`, `createdAt` |

---

## Reviews

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/reviews` | Laisser un avis (1 par user par asset, achat vérifié) | Bearer token |
| `GET` | `/assets/:id/reviews` | Avis d'un asset (paginé, triable) | None |
| `PUT` | `/reviews/:id` | Modifier son avis | Bearer token + Owner |
| `DELETE` | `/reviews/:id` | Supprimer son avis | Bearer token + Owner |

**Body de `POST /reviews` :**
```json
{
  "assetId": "uuid-asset",
  "rating": 5,
  "title": "Excellent kit",
  "body": "Très complet, bien organisé..."
}
```

**Filtres sur `GET /assets/:id/reviews` :**

| Param | Type | Description |
|-------|------|-------------|
| `sort` | string | `createdAt`, `rating` |
| `rating` | int | Filtrer par note (1-5) |

---

## Favoris (Wishlist)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/favorite` | Ajouter un asset à mes favoris | Bearer token |
| `DELETE` | `/assets/:id/favorite` | Retirer un asset de mes favoris | Bearer token |
| `GET` | `/users/me/favorites` | Mes assets favoris (paginé) | Bearer token |

---

## Signalements (Reports)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/reports` | Signaler un asset ou une review (contenu inapproprié, piraté, spam...) | Bearer token |
| `GET` | `/reports/reasons` | Liste des motifs de signalement disponibles | None |

**Body de `POST /reports` :**
```json
{
  "targetType": "asset",
  "targetId": "uuid-asset",
  "reason": "copyright",
  "details": "Ce fichier reprend sans autorisation un asset déjà publié ailleurs"
}
```

**Motifs (`reason`) :**

| Valeur | Description |
|--------|-------------|
| `copyright` | Violation de droits d'auteur / contenu piraté |
| `inappropriate` | Contenu inapproprié |
| `spam` | Spam / publicité non désirée |
| `scam` | Arnaque / tromperie sur le contenu |
| `other` | Autre (voir `details`) |

---

## Creator (Espace créateur)

### Stats

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/creator/stats` | Stats globales (revenus, ventes, vues, top assets) | Bearer token + Creator |
| `GET` | `/creator/stats/assets/:id` | Stats détaillées d'un asset | Bearer token + Owner |
| `GET` | `/creator/stats/revenue` | Revenus par période (day/week/month) | Bearer token + Creator |

**Query params sur `/creator/stats/revenue` :**

| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `day`, `week`, `month` |
| `from` | date | Date de début |
| `to` | date | Date de fin |

### Balance & Payouts

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/creator/balance` | Solde actuel (disponible, pending, total) | Bearer token + Creator |
| `POST` | `/creator/payouts` | Demander un retrait | Bearer token + Creator + TOTP |
| `GET` | `/creator/payouts` | Historique des retraits | Bearer token + Creator |
| `GET` | `/creator/payouts/:id` | Détails d'un retrait | Bearer token + Creator |

**Body de `POST /creator/payouts` :**
```json
{
  "walletId": "uuid-wallet",
  "amount": 10.0,
  "currency": "SOL"
}
```

---

## Notifications

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/notifications` | Mes notifications (paginées) | Bearer token |
| `GET` | `/notifications/unread-count` | Nombre de notifications non lues | Bearer token |
| `PUT` | `/notifications/:id/read` | Marquer comme lue | Bearer token |
| `PUT` | `/notifications/read-all` | Tout marquer comme lu | Bearer token |
| `DELETE` | `/notifications/:id` | Supprimer une notification | Bearer token |

---

## Stats publiques (Marketplace)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/stats/marketplace` | Stats globales (nb assets, nb users, volume total) | None |
| `GET` | `/stats/trending` | Assets tendance (vues/ventes récentes) | None |
| `GET` | `/stats/top-creators` | Top créateurs par revenus/ventes | None |

---

## Consents (RGPD)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/consents` | Mes consentements actuels | Bearer token |
| `POST` | `/consents` | Enregistrer/mettre à jour un consentement | Bearer token |
| `DELETE` | `/consents/:category` | Révoquer un consentement | Bearer token |

**Body de `POST /consents` :**
```json
{
  "category": "analytics",
  "isGranted": true,
  "policyVersion": "1.0"
}
```

---

## Recherche

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/search` | Recherche full-text globale (assets + créateurs) | None |
| `GET` | `/search/suggestions` | Autocomplétion (titres, tags, créateurs) | None |

**Params sur `GET /search` :**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Terme de recherche |
| `type` | string | `assets`, `creators`, `all` |
| `page` | int | Pagination |
| `limit` | int | Résultats par page |

---

## Admin

### Gestion des assets

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/assets` | Tous les assets (tous statuts) | Bearer token + Admin |
| `PUT` | `/admin/assets/:id/status` | Changer le statut (suspendre, restaurer) | Bearer token + Admin |
| `DELETE` | `/admin/assets/:id` | Forcer la suppression | Bearer token + Admin |

### Gestion des utilisateurs

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/users` | Liste des utilisateurs (paginée, filtrable) | Bearer token + Admin |
| `GET` | `/admin/users/:id` | Détails complets d'un utilisateur | Bearer token + Admin |
| `POST` | `/admin/users/:id/ban` | Bannir un utilisateur | Bearer token + Admin |
| `POST` | `/admin/users/:id/unban` | Débannir un utilisateur | Bearer token + Admin |
| `PUT` | `/admin/users/:id/role` | Changer le rôle (user → creator, etc.) | Bearer token + Admin |

### Modération des reviews

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/reviews` | Reviews signalées / à modérer | Bearer token + Admin |
| `PUT` | `/admin/reviews/:id/moderate` | Masquer / restaurer une review | Bearer token + Admin |

### Signalements

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/reports` | Tous les signalements (paginé, filtrable par type/statut) | Bearer token + Admin |
| `PUT` | `/admin/reports/:id/resolve` | Traiter un signalement (action prise, statut résolu/rejeté) | Bearer token + Admin |

### Catégories & Settings

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/settings` | Lire la configuration plateforme | Bearer token + Admin |
| `PUT` | `/admin/settings/:key` | Modifier un paramètre (commission, taille max...) | Bearer token + Admin |

### Logs & Stats

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/audit-logs` | Journal d'audit (paginé, filtrable par action/actor) | Bearer token + Admin |
| `GET` | `/admin/stats` | Stats admin (revenus plateforme, users actifs, etc.) | Bearer token + Admin |
| `GET` | `/admin/orders` | Toutes les commandes | Bearer token + Admin |
| `GET` | `/admin/payouts` | Toutes les demandes de retrait | Bearer token + Admin |
| `PUT` | `/admin/payouts/:id/process` | Valider/rejeter un retrait | Bearer token + Admin |

---

## Health & Infra

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/health` | Healthcheck (DB + blockchain RPC) | None |
| `GET` | `/health/detailed` | Status détaillé (DB, Solana, storage, queues) | Bearer token + Admin |

---

## Notes Techniques

### Légende Auth

| Auth | Signification |
|------|----------------|
| None | Aucune authentification requise |
| Bearer token | Access token JWT requis |
| Bearer token (refresh) | Refresh token requis (endpoint de renouvellement) |
| Bearer token + TOTP | Access token + code TOTP requis pour une action sensible |
| Bearer token + Owner | Access token + doit être le propriétaire de la ressource |
| Bearer token + Owner + TOTP | Access token + propriétaire de la ressource + code TOTP |
| Bearer token + Creator | Access token + rôle `creator` minimum |
| Bearer token + Creator + TOTP | Access token + rôle `creator` + code TOTP |
| Bearer token + Admin | Access token + rôle `admin` |

### Réponses standard

**Succès :**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

**Erreur :**
```json
{
  "success": false,
  "error": {
    "code": "LICENSE_EXPIRED",
    "message": "Votre licence a expiré le 2026-01-15",
    "details": {}
  }
}
```

### Codes d'erreur métier

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_REQUIRED` | 401 | Token manquant ou invalide |
| `TOTP_REQUIRED` | 403 | Action sensible, code 2FA requis |
| `FORBIDDEN` | 403 | Pas les droits |
| `NOT_FOUND` | 404 | Ressource introuvable |
| `WALLET_NOT_LINKED` | 400 | Aucun wallet lié au compte |
| `LICENSE_EXPIRED` | 403 | Licence expirée |
| `LICENSE_NOT_FOUND` | 403 | Aucune licence valide on-chain |
| `MAX_DOWNLOADS_REACHED` | 410 | Limite de téléchargements atteinte |
| `ORDER_EXPIRED` | 410 | Commande non payée dans le délai |
| `INSUFFICIENT_BALANCE` | 400 | Solde insuffisant pour le retrait |
| `MINT_FAILED` | 500 | Échec du mint on-chain |
| `FILE_TOO_LARGE` | 413 | Fichier dépasse la taille max |
| `DUPLICATE_REVIEW` | 409 | Déjà un avis sur cet asset |
| `TRANSFER_NOT_ALLOWED` | 403 | Licence non transférable |
| `ASSET_NOT_PUBLISHED` | 400 | Asset non publié |
| `USER_BANNED` | 403 | Compte banni |
| `VALIDATION_ERROR` | 400 | Corps de requête invalide |
| `USERNAME_TAKEN` | 409 | Ce username est déjà pris |
| `UNSUPPORTED_CHAIN` | 400 | Chaîne non supportée pour la connexion wallet |
| `CHALLENGE_INVALID` | 400 | Challenge introuvable ou déjà utilisé |
| `CHALLENGE_EXPIRED` | 400 | Challenge expiré, en redemander un |
| `INVALID_SIGNATURE` | 401 | Signature de wallet invalide |
| `WALLET_ALREADY_LINKED` | 409 | Ce wallet est déjà lié à un autre compte |
| `LAST_WALLET` | 400 | Impossible de délier son dernier wallet |
| `INVALID_ASSET_STATUS` | 409 | Transition de statut invalide (ex: publier un asset déjà publié) |
| `CATEGORY_EXISTS` | 409 | Slug de catégorie déjà pris |
| `CATEGORY_IN_USE` | 409 | Catégorie référencée par des assets, suppression bloquée |
| `ORDER_NOT_PENDING` | 409 | La commande n'est plus en attente (déjà confirmée/annulée) |
| `TX_NOT_FOUND` | 404 | Transaction introuvable sur le ledger |
| `TX_NOT_VALIDATED` | 400 | Transaction pas encore validée par le ledger |
| `TX_NOT_PAYMENT` | 400 | La transaction n'est pas un paiement XRPL |
| `TX_WRONG_DESTINATION` | 400 | Le paiement ne cible pas le wallet du vendeur |
| `TX_WRONG_TAG` | 400 | Le DestinationTag ne correspond pas à cette commande |
| `TX_FAILED` | 400 | La transaction a échoué sur le ledger (résultat ≠ tesSUCCESS) |
| `TX_AMOUNT_TOO_LOW` | 400 | Montant on-chain inférieur au prix |
| `TX_ALREADY_USED` | 409 | Ce hash de transaction a déjà confirmé une commande |
| `TX_LOOKUP_FAILED` | 502 | Nœud XRPL injoignable / réponse invalide |

### Headers personnalisés

| Header | Direction | Description |
|--------|-----------|-------------|
| `X-Request-Id` | Response | UUID unique par requête (traçabilité) |
| `X-RateLimit-Limit` | Response | Limite de requêtes par fenêtre |
| `X-RateLimit-Remaining` | Response | Requêtes restantes |
| `X-TOTP-Required` | Response | Présent si l'action nécessite un code 2FA |

### Rate Limiting

| Scope | Limite |
|-------|--------|
| Global (non-auth) | 60 req/min |
| Authentifié | 120 req/min |
| Upload | 10 req/h |
| Download token | 30 req/h |
| Mint | 5 req/h |
| Search | 30 req/min |

### WebSocket (Événements temps réel)

Endpoint : `wss://api.domain.com/ws`

**Events émis :**

| Event | Payload | Description |
|-------|---------|-------------|
| `upload:processing` | `{ assetId, progress }` | Progression du traitement fichier |
| `upload:complete` | `{ assetId, fileId }` | Upload terminé |
| `mint:pending` | `{ orderId, txSignature }` | Mint en attente de confirmation |
| `mint:confirmed` | `{ orderId, licenseId, mintAddress }` | Mint confirmé on-chain |
| `order:status` | `{ orderId, status }` | Changement de statut commande |
| `version:available` | `{ assetId, version }` | Nouvelle version disponible |
| `notification:new` | `{ notification }` | Nouvelle notification |
