# API ActiFy

Node.js + TypeScript + Prisma + PostgreSQL.

## Setup

Installer les dépendances :

```bash
npm install
```

Créer un `.env` :

```env
DATABASE_URL="postgresql://actify:actify@localhost:5432/actify"
```

Lancer la base de données (depuis la racine du repo) :

```bash
docker compose up -d
```

Appliquer les migrations :

```bash
npx prisma migrate dev
```

## Utile

```bash
npx prisma studio    # interface graphique pour voir les données
docker compose ps    # vérifier que le container tourne
```
