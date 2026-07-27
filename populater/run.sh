#!/usr/bin/env bash
# One-click launcher: closes Brave, reopens it with remote debugging enabled,
# waits for you to log back in as admin, then runs the CSV import.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== ACTIFY populater ==="
echo
echo "1) Fermeture de Brave (toutes les fenetres)..."
pkill brave 2>/dev/null || true
sleep 2

echo "2) Relance de Brave avec le debogage distant (port 9222)..."
brave-browser --remote-debugging-port=9222 >/dev/null 2>&1 &
disown
sleep 3

echo
echo "3) Connecte-toi a ACTIFY (https://actify.yohan-georgelin.fr) avec ton compte admin"
echo "   dans la fenetre Brave qui vient de s'ouvrir."
read -r -p "   Appuie sur Entree ici une fois connecte et pret a lancer l'import... "

echo
echo "4) Lancement de l'import..."
source .venv/bin/activate
python3 populate.py

echo
echo "=== Termine ==="
