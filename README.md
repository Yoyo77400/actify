# ACTIFY – Frontend

---

## Présentation

**ACTIFY** est une application web conçue pour gérer, explorer et interagir avec des actifs numériques via une interface moderne et évolutive.

Ce dépôt contient l'**application frontend**, développée avec **Nuxt 3**, offrant une base performante, modulaire et extensible pour une plateforme orientée marketplace.

Le projet est structuré pour prendre en charge :

* la découverte et l'interaction avec les actifs,
* des outils de gestion administrative,
* une intégration fluide avec des API externes ou des backends basés sur la blockchain.

---

## Architecture

L'application suit une architecture modulaire et maintenable :

```text
.
├── components/        # Composants UI réutilisables
├── pages/             # Routes de l'application (routage basé sur les fichiers de Nuxt)
├── layouts/           # Modèles de mise en page (Layouts)
├── assets/            # Fichiers statiques (styles, images)
├── public/            # Fichiers publics
├── server/            # Logique côté serveur (si utilisée)
├── error.vue          # Gestion globale des erreurs
└── app.vue            # Composant racine
```

### Principes clés

* **Développement orienté composants**
* **Séparation des préoccupations (UI / logique / données)**
* **Évolutivité pour les cas d'usage de type marketplace**
* **Extensibilité pour l'intégration de la blockchain**

---

## Installation

### Prérequis

* Node.js ≥ 18
* Gestionnaire de paquets : npm / pnpm / yarn / bun

### Initialisation

```bash
git clone <repository-url>
cd FRONT_ACTIFY
npm install
```

### Configuration de l'environnement

```bash
cp .env.example .env
```

> Mettez à jour les variables d'environnement en fonction de la configuration de votre backend/API.

### Développement

```bash
npm run dev
```

L'application tourne sur :

```text
http://localhost:3000
```

### Build de production

```bash
npm run build
npm run preview
```

---

## Fonctionnalités

### Côté utilisateur

* Interface de navigation des actifs
* Interface utilisateur (UI) moderne et responsive
* Navigation fluide (expérience SPA)

### Panneau d'administration

* Gestion des actifs
* Gestion des ventes
* Système de traitement des signalements
* Modales de confirmation pour les actions critiques
* États vides (empty states) pour une meilleure UX

### Fonctionnalités techniques

* Rendu hybride SSR/CSR avec Nuxt 3
* Réutilisabilité des composants
* Gestion des limites d'erreurs (Error boundaries)
* Structure UI propre avec des *design tokens*

---

## Captures d'écran


### Vue d'accueil / Marketplace
![Vue de l'accueil](https://i.ibb.co/W4rQ3RQS/accueil.png)

### Tableau de bord d'administration
![Vue du dashboard admin](https://i.ibb.co/qLVXgcWg/admin-dashboard.png)

### Ajout d'un actif
![Créaction d'actifs](https://i.ibb.co/hFS06fCJ/new-asset.png)

### Page de connexion
![Page de connexion](https://i.ibb.co/0RLQr7RR/login-page.png)

### Page de profil utilisateur
![Profil Utilisateur](https://i.ibb.co/NnWz53Ff/user-profile.png)

### Page d'artiste
![Vue d'un asset](https://i.ibb.co/GfMRLk77/artist.png)

### Vue d'un asset
![Vue d'un asset](https://i.ibb.co/0VfRGngY/asset.png)

### Page d'erreur
![Erreur 404](https://i.ibb.co/HLsdhQWP/error-page.png)

---

## Limites actuelles

* L'intégration du backend est partielle ou simulée (*mockée*) par JSON hébergés sur IPFS
* Le système d'authentification n'est pas entièrement implémenté
* Pas de contrôle d'accès basé sur les rôles (RBAC)
* Aucune suite de tests automatisés
* Stratégie de gestion d'état limitée

---

## 🔧 Feuille de route & Améliorations

### Court terme

* Intégration complète de l'API
* Authentification (JWT / OAuth)
* Validation des formulaires et gestion des erreurs
* Amélioration des retours UX (états de chargement, alertes)

### Moyen terme

* Gestion d'état (Pinia)
* Tests unitaires et de bout en bout (E2E)
* Optimisation des performances (*lazy loading, code splitting*)
* Pagination & filtrage

### Long terme

* Intégration blockchain (*minting*, transactions)
* Système de paiement
* Fonctionnalités en temps réel (notifications, mises à jour)
* Tableau de bord analytique

---

## Déploiement

Le projet inclut une configuration basée sur Docker.

### Construire l'image

```bash
docker build -t actify-frontend .
```

### Lancer le conteneur

```bash
docker run -p 3000:80 actify-frontend
```

---

## Tests

### Tests end-to-end (Playwright)

```bash
cd FRONT_ACTIFY
npx playwright install        # 1re fois seulement : télécharge le navigateur chromium (local)

npm run test:e2e              # headless (tout démarre/s'arrête automatiquement)
npm run test:e2e:headed       # Chrome visible + ralenti (pour observer les clics)
npm run test:e2e:ui           # mode interactif (timeline, re-run)
npm run test:e2e:report       # rapport HTML du dernier run
```

Ne lancer qu'**un seul test** 

```bash
# -- passe l'option à Playwright ; -g = --grep (filtre sur le titre du test)
npm run test:e2e -- -g "newWalletCreatesAccountAndOpensSession"
```

---

## Licence

Ce projet est développé dans le cadre d'une initiative académique.

### Notre Équipe

> - Alameda Guillaume
> - Hassanein Fouad
> - Gunzburger Ethan
> - Georgelin Yohan