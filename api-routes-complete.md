# API Routes — Marketplace Web3 de Fichiers Numériques (Complet)

> Version alignée sur le schéma PostgreSQL. Toutes les routes supposent un prefix `/api/v1`.

---

## 🔐 Authentification & Sécurité

### OAuth2

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/auth/oauth/:provider` | Initier le flow OAuth2 (google, github) | ❌ |
| `GET` | `/auth/oauth/:provider/callback` | Callback OAuth2, crée/relie le compte | ❌ |
| `POST` | `/auth/refresh` | Renouveler access token via refresh token | 🔒 Refresh |
| `POST` | `/auth/logout` | Révoquer la session (invalide le refresh token) | 🔒 |
| `GET` | `/auth/sessions` | Lister mes sessions actives | 🔒 |
| `DELETE` | `/auth/sessions/:id` | Révoquer une session spécifique | 🔒 |

### TOTP (2FA)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/auth/totp/setup` | Générer secret + QR code d'enrollment | 🔒 |
| `POST` | `/auth/totp/verify` | Vérifier un code TOTP (activation ou action sensible) | 🔒 |
| `POST` | `/auth/totp/disable` | Désactiver le 2FA (nécessite code TOTP valide) | 🔒 + 2FA |
| `GET` | `/auth/totp/recovery-codes` | Générer/régénérer les recovery codes | 🔒 + 2FA |
| `POST` | `/auth/totp/recover` | Utiliser un recovery code | 🔒 |

---

## 👤 Utilisateurs

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/users/me` | Mon profil complet (email, wallets, role, stats) | 🔒 |
| `PUT` | `/users/me` | Modifier mon profil (username, display_name, bio, avatar) | 🔒 |
| `DELETE` | `/users/me` | Supprimer mon compte (soft delete + RGPD) | 🔒 + 2FA |
| `GET` | `/users/me/data-export` | Export RGPD de mes données (JSON) | 🔒 + 2FA |
| `GET` | `/users/:username` | Profil public d'un utilisateur | ❌ |
| `GET` | `/users/:username/assets` | Assets publiés par cet utilisateur | ❌ |
| `GET` | `/users/:username/reviews` | Avis laissés par cet utilisateur | ❌ |

---

## 🔗 Wallets

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/wallets/challenge` | Générer un challenge (nonce + expiration) à signer | 🔒 |
| `POST` | `/wallets/verify` | Vérifier la signature et lier le wallet au compte | 🔒 |
| `GET` | `/wallets` | Lister mes wallets liés | 🔒 |
| `PUT` | `/wallets/:id` | Modifier (label, set primary) | 🔒 |
| `DELETE` | `/wallets/:id` | Délier un wallet | 🔒 + 2FA |

**Body de `/wallets/verify` :**
```json
{
  "address": "7xKX...abc",
  "signature": "base58...",
  "nonce": "uuid-nonce",
  "chain": "solana"
}
```

---

## 📦 Assets (Produits / Fichiers)

### CRUD

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets` | Créer un asset (draft) | 🔒 Creator |
| `GET` | `/assets` | Catalogue public (assets publiés, paginé, filtrable) | ❌ |
| `GET` | `/assets/:idOrSlug` | Détails d'un asset (incrémente views si public) | ❌ |
| `PUT` | `/assets/:id` | Modifier un asset (titre, desc, tags, prix...) | 🔒 Owner |
| `DELETE` | `/assets/:id` | Soft delete un asset | 🔒 Owner + 2FA |
| `POST` | `/assets/:id/publish` | Publier (draft → published) | 🔒 Owner + 2FA |
| `POST` | `/assets/:id/unpublish` | Dépublier (published → archived) | 🔒 Owner |

**Body de `POST /assets` :**
```json
{
  "title": "Pack UI Kit Figma",
  "description": "...",
  "shortDescription": "Kit UI complet avec 200+ composants",
  "tags": ["ui", "figma", "design"],
  "categoryIds": ["uuid-cat-1", "uuid-cat-2"],
  "distributionMode": "limited",
  "maxDownloads": 500,
  "isFree": false,
  "basePrice": 2.5,
  "currency": "SOL",
  "royaltyBps": 1000
}
```

### Upload de fichiers

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/files` | Upload du fichier principal (chiffrement AES-256-GCM auto) | 🔒 Owner + 2FA |
| `DELETE` | `/assets/:id/files/:fileId` | Supprimer un fichier uploadé | 🔒 Owner |
| `POST` | `/assets/:id/preview` | Upload du thumbnail | 🔒 Owner |
| `POST` | `/assets/:id/preview-images` | Upload des images de galerie (multi) | 🔒 Owner |
| `DELETE` | `/assets/:id/preview-images/:index` | Supprimer une image de galerie | 🔒 Owner |

### Versions

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/versions` | Publier une nouvelle version (upload + changelog) | 🔒 Owner + 2FA |
| `GET` | `/assets/:id/versions` | Lister les versions d'un asset | ❌ |
| `GET` | `/assets/:id/versions/:versionId` | Détails d'une version | ❌ |

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

## 🏷️ Catégories

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/categories` | Arbre complet des catégories (avec sous-catégories) | ❌ |
| `GET` | `/categories/:slug` | Détails d'une catégorie | ❌ |
| `GET` | `/categories/:slug/assets` | Assets d'une catégorie (paginé) | ❌ |
| `POST` | `/categories` | Créer une catégorie | 🔒 Admin |
| `PUT` | `/categories/:id` | Modifier une catégorie | 🔒 Admin |
| `DELETE` | `/categories/:id` | Désactiver une catégorie | 🔒 Admin |

---

## 💎 License Policies (Tiers de licence)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/assets/:id/policies` | Créer un tier de licence pour cet asset | 🔒 Owner |
| `GET` | `/assets/:id/policies` | Lister les tiers disponibles | ❌ |
| `PUT` | `/policies/:id` | Modifier un tier (prix, conditions) | 🔒 Owner |
| `DELETE` | `/policies/:id` | Désactiver un tier | 🔒 Owner |

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

## 🛒 Orders (Achats)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/orders` | Créer une commande (choisir asset + policy) | 🔒 |
| `GET` | `/orders` | Mes commandes (historique paginé) | 🔒 |
| `GET` | `/orders/:id` | Détails d'une commande | 🔒 Owner |
| `POST` | `/orders/:id/confirm` | Confirmer le paiement on-chain (envoie la tx) | 🔒 + 2FA |
| `POST` | `/orders/:id/cancel` | Annuler une commande pending | 🔒 Owner |

**Body de `POST /orders` :**
```json
{
  "assetId": "uuid-asset",
  "policyId": "uuid-policy"
}
```

**Réponse (inclut les infos pour le paiement on-chain) :**
```json
{
  "id": "uuid-order",
  "status": "pending",
  "amount": 5.0,
  "currency": "SOL",
  "paymentAddress": "7xKX...creator",
  "expiresAt": "2026-03-25T14:30:00Z",
  "platformFeeBps": 250
}
```

---

## 🪙 Licenses & NFT

### Licenses

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/licenses` | Mes licences actives | 🔒 |
| `GET` | `/licenses/:id` | Détails d'une licence (conditions, validité) | 🔒 Owner |
| `GET` | `/licenses/:id/verify` | Vérification on-chain de la détention | 🔒 Owner |

### Mint

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/licenses/mint-intent` | Préparer le mint (payload pour signature wallet) | 🔒 |
| `POST` | `/licenses/mint-confirm` | Confirmer le mint après signature | 🔒 |

**Body de `POST /licenses/mint-intent` :**
```json
{
  "orderId": "uuid-order"
}
```

### NFT (lecture)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/nft/owned` | Mes NFTs de licence | 🔒 |
| `GET` | `/nft/:mintAddress` | Infos d'un NFT (métadonnées on-chain) | ❌ |
| `GET` | `/nft/:mintAddress/owner` | Propriétaire actuel (lecture on-chain) | ❌ |

---

## 💾 Downloads

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/downloads/:assetId/request` | Demander un téléchargement (vérif licence + génère token) | 🔒 |
| `GET` | `/downloads/token/:token` | Télécharger via token signé (lien éphémère) | ❌* |
| `GET` | `/downloads/history` | Mon historique de téléchargements | 🔒 |

> \* Le token est signé et a une expiration courte (1h). Pas besoin d'auth header, le token fait office de preuve.

**Flow complet :**
1. `POST /downloads/:assetId/request` → vérifie OAuth2 + wallet + licence on-chain + validité
2. Retourne `{ "downloadToken": "...", "expiresAt": "...", "version": "2.0.0" }`
3. `GET /downloads/token/:token` → déchiffre le fichier, applique watermark si configuré, stream le fichier

**Query params optionnels sur `/downloads/:assetId/request` :**

| Param | Type | Description |
|-------|------|-------------|
| `versionId` | uuid | Version spécifique (défaut: latest autorisée) |

---

## 🔄 Revente (marché secondaire — licences uniques transférables)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/resale` | Mettre une licence en revente | 🔒 Owner + 2FA |
| `GET` | `/resale` | Annonces de revente actives (paginé, filtrable) | ❌ |
| `GET` | `/resale/:id` | Détails d'une annonce de revente | ❌ |
| `PUT` | `/resale/:id` | Modifier le prix | 🔒 Owner |
| `DELETE` | `/resale/:id` | Annuler la mise en revente | 🔒 Owner |
| `POST` | `/resale/:id/buy` | Acheter en revente (paiement + transfert on-chain) | 🔒 + 2FA |

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

## ⭐ Reviews

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `POST` | `/reviews` | Laisser un avis (1 par user par asset, achat vérifié) | 🔒 |
| `GET` | `/assets/:id/reviews` | Avis d'un asset (paginé, triable) | ❌ |
| `PUT` | `/reviews/:id` | Modifier son avis | 🔒 Owner |
| `DELETE` | `/reviews/:id` | Supprimer son avis | 🔒 Owner |

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

## 💰 Creator (Espace créateur)

### Stats

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/creator/stats` | Stats globales (revenus, ventes, vues, top assets) | 🔒 Creator |
| `GET` | `/creator/stats/assets/:id` | Stats détaillées d'un asset | 🔒 Owner |
| `GET` | `/creator/stats/revenue` | Revenus par période (day/week/month) | 🔒 Creator |

**Query params sur `/creator/stats/revenue` :**

| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `day`, `week`, `month` |
| `from` | date | Date de début |
| `to` | date | Date de fin |

### Balance & Payouts

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/creator/balance` | Solde actuel (disponible, pending, total) | 🔒 Creator |
| `POST` | `/creator/payouts` | Demander un retrait | 🔒 Creator + 2FA |
| `GET` | `/creator/payouts` | Historique des retraits | 🔒 Creator |
| `GET` | `/creator/payouts/:id` | Détails d'un retrait | 🔒 Creator |

**Body de `POST /creator/payouts` :**
```json
{
  "walletId": "uuid-wallet",
  "amount": 10.0,
  "currency": "SOL"
}
```

---

## 🔔 Notifications

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/notifications` | Mes notifications (paginées) | 🔒 |
| `GET` | `/notifications/unread-count` | Nombre de notifications non lues | 🔒 |
| `PUT` | `/notifications/:id/read` | Marquer comme lue | 🔒 |
| `PUT` | `/notifications/read-all` | Tout marquer comme lu | 🔒 |
| `DELETE` | `/notifications/:id` | Supprimer une notification | 🔒 |

---

## 📊 Stats publiques (Marketplace)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/stats/marketplace` | Stats globales (nb assets, nb users, volume total) | ❌ |
| `GET` | `/stats/trending` | Assets tendance (vues/ventes récentes) | ❌ |
| `GET` | `/stats/top-creators` | Top créateurs par revenus/ventes | ❌ |

---

## 🍪 Consents (RGPD)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/consents` | Mes consentements actuels | 🔒 |
| `POST` | `/consents` | Enregistrer/mettre à jour un consentement | 🔒 |
| `DELETE` | `/consents/:category` | Révoquer un consentement | 🔒 |

**Body de `POST /consents` :**
```json
{
  "category": "analytics",
  "isGranted": true,
  "policyVersion": "1.0"
}
```

---

## 🔍 Recherche

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/search` | Recherche full-text globale (assets + créateurs) | ❌ |
| `GET` | `/search/suggestions` | Autocomplétion (titres, tags, créateurs) | ❌ |

**Params sur `GET /search` :**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Terme de recherche |
| `type` | string | `assets`, `creators`, `all` |
| `page` | int | Pagination |
| `limit` | int | Résultats par page |

---

## 🔧 Admin

### Gestion des assets

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/assets` | Tous les assets (tous statuts) | 🔒 Admin |
| `PUT` | `/admin/assets/:id/status` | Changer le statut (suspendre, restaurer) | 🔒 Admin |
| `DELETE` | `/admin/assets/:id` | Forcer la suppression | 🔒 Admin |

### Gestion des utilisateurs

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/users` | Liste des utilisateurs (paginée, filtrable) | 🔒 Admin |
| `GET` | `/admin/users/:id` | Détails complets d'un utilisateur | 🔒 Admin |
| `POST` | `/admin/users/:id/ban` | Bannir un utilisateur | 🔒 Admin |
| `POST` | `/admin/users/:id/unban` | Débannir un utilisateur | 🔒 Admin |
| `PUT` | `/admin/users/:id/role` | Changer le rôle (user → creator, etc.) | 🔒 Admin |

### Modération des reviews

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/reviews` | Reviews signalées / à modérer | 🔒 Admin |
| `PUT` | `/admin/reviews/:id/moderate` | Masquer / restaurer une review | 🔒 Admin |

### Catégories & Settings

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/settings` | Lire la configuration plateforme | 🔒 Admin |
| `PUT` | `/admin/settings/:key` | Modifier un paramètre (commission, taille max...) | 🔒 Admin |

### Logs & Stats

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/admin/audit-logs` | Journal d'audit (paginé, filtrable par action/actor) | 🔒 Admin |
| `GET` | `/admin/stats` | Stats admin (revenus plateforme, users actifs, etc.) | 🔒 Admin |
| `GET` | `/admin/orders` | Toutes les commandes | 🔒 Admin |
| `GET` | `/admin/payouts` | Toutes les demandes de retrait | 🔒 Admin |
| `PUT` | `/admin/payouts/:id/process` | Valider/rejeter un retrait | 🔒 Admin |

---

## 🩺 Health & Infra

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/health` | Healthcheck (DB + blockchain RPC) | ❌ |
| `GET` | `/health/detailed` | Status détaillé (DB, Solana, storage, queues) | 🔒 Admin |

---

## 📝 Notes Techniques

### Légende Auth

| Symbole | Signification |
|---------|---------------|
| ❌ | Aucune authentification requise |
| 🔒 | Access token JWT requis |
| 🔒 + 2FA | Access token + code TOTP requis |
| 🔒 Owner | Auth + doit être le propriétaire de la ressource |
| 🔒 Creator | Auth + rôle `creator` minimum |
| 🔒 Admin | Auth + rôle `admin` |

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

### WebSocket (bonus)

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
