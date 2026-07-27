# ACTIFY populater

Crée des assets sur `/asset/new` (prod) à partir de `list.csv`, en pilotant le
vrai navigateur (Brave) déjà connecté en admin. Le remplissage du formulaire
est automatique ; la signature wallet reste manuelle une fois puis est rejouée.

## Setup (une fois)

```bash
cd populater
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
sudo apt install python3-tk   # requis pour le bouton "Démarrer"
```

## Lancer

### En un clic
Double-clique **ACTIFY Populater** sur le Bureau (`~/Desktop/ACTIFY-populater.desktop`).
Ça fait tout : ferme Brave, le relance en mode debug, attend ta confirmation,
lance l'import.

### Manuellement
```bash
pkill brave
brave-browser --remote-debugging-port=9222   # attendre que Brave soit ouvert
# se reconnecter en admin sur https://actify.yohan-georgelin.fr
cd populater
source .venv/bin/activate
python3 populate.py
```

Vérifier que le débogage distant est bien actif :
```bash
curl -s http://localhost:9222/json/version   # doit répondre du JSON
```

## Fonctionnement

1. Le script lit `list.csv`, valide chaque ligne (prix, image présente dans `Assets/`, etc.).
2. Il se connecte au Brave déjà ouvert (CDP, port 9222) — pas de navigateur fantôme.
3. **Produit 1** : remplit tout le formulaire (titre, description, prix,
   distribution, royalties, checkbox gratuit, upload fichier + miniature) et
   soumet. Dès que l'écran "Choisissez le wallet" apparaît, le script s'arrête.
4. **Enregistrement de la macro** : à toi de choisir le wallet, approuver et
   signer dans la popup de l'extension, jusqu'à publication. Chaque clic
   gauche (position + délai depuis le précédent) est enregistré. **Ctrl**
   arrête l'enregistrement.
5. Une fenêtre "Démarrer" apparaît. Un clic dessus enchaîne les produits
   restants : remplissage auto + soumission, puis rejeu exact de la macro
   pour la signature — sans intervention.
6. Sécurité : si la souris bouge de plus de 80px pendant un rejeu sans que
   le script l'ait causé, tout s'arrête immédiatement.

## `list.csv` — colonnes

| colonne            | valeurs                                  | notes                                  |
|---------------------|-------------------------------------------|-----------------------------------------|
| `title`             | texte                                      | 3–200 caractères, obligatoire           |
| `shortDescription`  | texte                                      | optionnel                               |
| `description`       | texte                                      | optionnel                               |
| `tags`              | `tag1,tag2,...`                            | optionnel                               |
| `distributionMode`  | `unlimited` / `limited` / `unique`         | défaut `unlimited`                      |
| `maxDownloads`      | nombre                                     | utilisé seulement si `limited`          |
| `isFree`            | `true` / `false`                           |                                          |
| `basePrice`         | nombre > 0                                 | requis si `isFree=false`                |
| `royaltyPercent`    | nombre 0–100                                | optionnel, défaut 0                     |
| `image`             | nom de fichier dans `Assets/`              | réutilisé comme fichier ET miniature    |

## À savoir pendant l'enregistrement de la macro

- N'utilise **Ctrl** pour rien d'autre à ce moment (Ctrl+C/V arrête tout).
- Le script enregistre **tous** les clics gauche system-wide (même hors
  navigateur) — ne clique que ce qui fait partie du flow de signature.
- Les délais enregistrés sont rejoués tels quels : si une confirmation
  blockchain traîne plus que d'habitude, un clic peut arriver trop tôt.

## Fichiers

- `populate.py` — le script principal
- `list.csv` — les produits à importer
- `Assets/` — les images référencées par la colonne `image`
- `run.sh` / `ACTIFY-populater.desktop` — lanceur en un clic
- `requirements.txt` — dépendances Python (`playwright`, `pynput`)

## Config à ajuster si besoin (en haut de `populate.py`)

- `FRONTEND_URL` — URL de la prod (actuellement `https://actify.yohan-georgelin.fr`)
- `CDP_URL` — port de débogage Brave (`http://localhost:9222`)
- `MOUSE_ABORT_PX` — seuil du kill-switch souris (80px)
- `PUBLISH_TIMEOUT_MS` — délai max d'attente de la publication après un rejeu
