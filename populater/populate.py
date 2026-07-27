#!/usr/bin/env python3
"""ACTIFY populater — creates assets from populater/list.csv through the real /asset/new form.

Setup (one-time):
  1. pip install -r populater/requirements.txt
  2. sudo apt install python3-tk        (Tkinter is not bundled on this system)
  3. Fully quit your browser, then relaunch it with remote debugging enabled so
     this script can attach to YOUR real profile (session + wallet extensions):
       google-chrome --remote-debugging-port=9222
     (swap google-chrome for chromium/brave-browser/... to match what you use)
  4. In that browser, log in to ACTIFY as usual. No need to open /asset/new
     yourself — the script navigates there.

Usage:
  python3 populater/populate.py

CSV columns (see list.csv):
  title, shortDescription, description, tags, distributionMode, maxDownloads,
  isFree, basePrice, royaltyPercent, image
  - `image` is a filename living in populater/Assets/, reused as both the
    asset file and its thumbnail.

Flow:
  - Every row's text/number/checkbox/file fields are filled and submitted
    automatically (Playwright drives the real page — no coordinates, no
    manual typing), for every row including the first.
  - Once the first row reaches the wallet step, control is handed to YOU:
    pick your wallet, approve + sign in its extension popup, wait for the
    publish to go through, then press Ctrl. That sequence of clicks and the
    delays between them becomes "the macro".
  - A small window then shows a single "Demarrer" button. Clicking it
    auto-fills + submits each remaining row, then replays that exact macro
    to finish the wallet step — fully unattended after that.
  - Safety net: if the mouse moves more than MOUSE_ABORT_PX during a replay
    in a way the script didn't cause, the whole run aborts immediately so
    you always keep the ability to take back control.
"""

from __future__ import annotations

import csv
import re
import sys
import time
import tkinter as tk
from dataclasses import dataclass
from pathlib import Path

from playwright.sync_api import Page, TimeoutError as PWTimeoutError, sync_playwright
from pynput import keyboard, mouse

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "list.csv"
ASSETS_DIR = BASE_DIR / "Assets"

FRONTEND_URL = "https://actify.yohan-georgelin.fr"
CDP_URL = "http://localhost:9222"

MOUSE_ABORT_PX = 80
MIN_STEP_DELAY = 0.05
POLL_INTERVAL = 0.05
SUBMIT_TIMEOUT_MS = 15_000
PUBLISH_TIMEOUT_MS = 60_000

DISTRIBUTION_LABELS = {
    "unlimited": "Illimité",
    "limited": "Limité",
    "unique": "Unique",
}


def to_bool(value: str) -> bool:
    return value.strip().lower() in ("1", "true", "vrai", "yes", "oui", "y")


@dataclass
class Product:
    title: str
    short_description: str
    description: str
    tags: str
    distribution_mode: str
    max_downloads: str
    is_free: bool
    base_price: str
    royalty_percent: str
    image: str

    @property
    def image_path(self) -> Path:
        return ASSETS_DIR / self.image


def load_products() -> list[Product]:
    if not CSV_PATH.exists():
        sys.exit(f"Introuvable : {CSV_PATH}")

    products: list[Product] = []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for line_no, row in enumerate(reader, start=2):
            title = (row.get("title") or "").strip()
            if not title:
                continue

            distribution_mode = (row.get("distributionMode") or "unlimited").strip() or "unlimited"
            if distribution_mode not in DISTRIBUTION_LABELS:
                sys.exit(
                    f"list.csv ligne {line_no} ('{title}') : distributionMode invalide "
                    f"'{distribution_mode}' (attendu: unlimited, limited ou unique)"
                )

            is_free = to_bool(row.get("isFree") or "")
            base_price = (row.get("basePrice") or "").strip()
            if not is_free:
                if not base_price:
                    sys.exit(f"list.csv ligne {line_no} ('{title}') : basePrice manquant (isFree=false)")
                try:
                    if float(base_price) <= 0:
                        raise ValueError
                except ValueError:
                    sys.exit(f"list.csv ligne {line_no} ('{title}') : basePrice invalide '{base_price}'")

            if not (3 <= len(title) <= 200):
                sys.exit(f"list.csv ligne {line_no} : title doit faire 3 à 200 caractères ('{title}')")

            image = (row.get("image") or "").strip()
            if not image:
                sys.exit(f"list.csv ligne {line_no} ('{title}') : colonne image vide")

            product = Product(
                title=title,
                short_description=(row.get("shortDescription") or "").strip(),
                description=(row.get("description") or "").strip(),
                tags=(row.get("tags") or "").strip(),
                distribution_mode=distribution_mode,
                max_downloads=(row.get("maxDownloads") or "").strip(),
                is_free=is_free,
                base_price=base_price,
                royalty_percent=(row.get("royaltyPercent") or "").strip(),
                image=image,
            )
            if not product.image_path.is_file():
                sys.exit(f"list.csv ligne {line_no} ('{title}') : image introuvable : {product.image_path}")
            products.append(product)

    if not products:
        sys.exit("list.csv ne contient aucun produit exploitable (vérifie l'en-tête et les lignes).")
    return products


def fill_product(page: Page, product: Product) -> None:
    """Auto-fills and submits one product through the 3-step wizard, stopping
    right as the wallet-selection step appears."""
    page.goto(f"{FRONTEND_URL}/asset/new")
    page.wait_for_selector("#title")

    # Step 1 - Contenu
    page.fill("#title", product.title)
    if product.short_description:
        page.fill("#shortDescription", product.short_description)
    if product.description:
        page.fill("#description", product.description)
    page.get_by_role("button", name="Suivant").click()

    # Step 2 - Distribution & prix
    # Anchored regex: "Illimité" contains "limité" as a substring, so a plain
    # name="Limité" match would hit both buttons and fail (strict mode).
    label = DISTRIBUTION_LABELS[product.distribution_mode]
    page.get_by_role("button", name=re.compile(rf"^{re.escape(label)}", re.IGNORECASE)).click()
    if product.distribution_mode == "limited" and product.max_downloads:
        page.fill("#maxDownloads", product.max_downloads)
    if product.is_free:
        page.get_by_label("Asset gratuit").check()
    elif product.base_price:
        page.fill("#basePrice", product.base_price)
    if product.royalty_percent:
        page.fill("#royalty", product.royalty_percent)
    page.get_by_role("button", name="Suivant").click()

    # Step 3 - Fichiers
    if product.tags:
        page.fill("#tags", product.tags)
    image_path = str(product.image_path)
    page.set_input_files("#file", image_path)
    page.set_input_files("#thumbnail", image_path)
    page.get_by_role("button", name="Créer et publier").click()

    page.wait_for_selector("text=Choisissez le wallet", timeout=SUBMIT_TIMEOUT_MS)


@dataclass
class Macro:
    steps: list[tuple[int, int, float]]


def record_macro() -> Macro:
    print("\n--- Enregistrement de la macro de signature ---")
    print("Choisis ton wallet, approuve/signe dans la popup, attends la publication.")
    print("Appuie sur Ctrl (gauche ou droit) une fois terminé pour arrêter l'enregistrement.\n")

    steps: list[tuple[int, int, float]] = []
    last_ts = time.monotonic()

    def on_click(x, y, button, pressed):
        nonlocal last_ts
        if pressed and button == mouse.Button.left:
            now = time.monotonic()
            delay = max(now - last_ts, 0.0)
            steps.append((int(x), int(y), delay))
            last_ts = now
            print(f"  clic #{len(steps)} enregistré à ({int(x)}, {int(y)}) après {delay:.2f}s")

    def on_key_press(key):
        if key in (keyboard.Key.ctrl_l, keyboard.Key.ctrl_r):
            return False  # stops this listener

    mouse_listener = mouse.Listener(on_click=on_click)
    mouse_listener.start()
    with keyboard.Listener(on_press=on_key_press) as keyboard_listener:
        keyboard_listener.join()
    mouse_listener.stop()

    if not steps:
        sys.exit("Aucun clic enregistré, arrêt.")
    print(f"--- Macro enregistrée : {len(steps)} clic(s) ---\n")
    return Macro(steps)


class AbortReplay(Exception):
    pass


def _sleep_with_watch(duration: float, controller: mouse.Controller, reference: tuple[int, int]) -> None:
    end = time.monotonic() + duration
    while True:
        remaining = end - time.monotonic()
        if remaining <= 0:
            return
        x, y = controller.position
        if abs(x - reference[0]) > MOUSE_ABORT_PX or abs(y - reference[1]) > MOUSE_ABORT_PX:
            raise AbortReplay()
        time.sleep(min(POLL_INTERVAL, remaining))


def replay_macro(macro: Macro) -> None:
    controller = mouse.Controller()
    last_pos = controller.position
    for x, y, delay in macro.steps:
        _sleep_with_watch(max(delay, MIN_STEP_DELAY), controller, last_pos)
        controller.position = (x, y)
        time.sleep(0.03)  # let the OS/page register the move before clicking
        last_pos = controller.position
        if abs(last_pos[0] - x) > MOUSE_ABORT_PX or abs(last_pos[1] - y) > MOUSE_ABORT_PX:
            raise AbortReplay()
        controller.click(mouse.Button.left, 1)


def get_page(browser) -> Page:
    context = browser.contexts[0] if browser.contexts else browser.new_context()
    for p in context.pages:
        if FRONTEND_URL in p.url:
            return p
    return context.pages[0] if context.pages else context.new_page()


def run_gui(page: Page, remaining: list[Product], macro: Macro) -> None:
    root = tk.Tk()
    root.title("ACTIFY populater")
    root.attributes("-topmost", True)

    status = tk.StringVar(value=f"{len(remaining)} produit(s) restant(s)")
    tk.Label(root, textvariable=status, padx=24, pady=16, font=("sans-serif", 11)).pack()

    def set_status(text: str) -> None:
        # Runs on the main thread (same as Playwright's sync API below), so a
        # plain set + forced repaint is enough - no cross-thread marshaling.
        status.set(text)
        root.update_idletasks()

    def worker() -> None:
        start_btn.config(state="disabled")
        root.update_idletasks()
        for i, product in enumerate(remaining, start=2):
            set_status(f"Produit {i} : {product.title}")
            print(f"\n=== Produit {i} : {product.title} ===")
            try:
                fill_product(page, product)
                replay_macro(macro)
                page.wait_for_url("**/assets/**", timeout=PUBLISH_TIMEOUT_MS)
            except AbortReplay:
                set_status("Arrêté : mouvement de souris détecté.")
                print("\n[ABORT] Mouvement de souris détecté pendant la macro — arrêt du script.")
                return
            except PWTimeoutError:
                set_status(f"Erreur sur '{product.title}' — arrêt.")
                print(f"\n[ERREUR] Timeout en attendant la publication de '{product.title}'.")
                return
            except Exception as exc:  # noqa: BLE001 - surface any unexpected error to the user
                set_status(f"Erreur sur '{product.title}' — arrêt.")
                print(f"\n[ERREUR] {exc!r}")
                return
        set_status("Terminé.")
        print("\nTous les produits ont été traités.")

    def on_start() -> None:
        # Deliberately synchronous: Playwright's sync API is pinned to the
        # thread that started it (the one running this whole script), so the
        # automation loop must run here too, not on a separate thread. The
        # window will look unresponsive while a product is in flight; the
        # forced update_idletasks() calls in set_status() still repaint the
        # status label between products.
        worker()

    start_btn = tk.Button(root, text="Démarrer", command=on_start, padx=24, pady=12, font=("sans-serif", 11, "bold"))
    start_btn.pack(pady=(0, 20))

    root.mainloop()


def main() -> None:
    products = load_products()
    print(f"{len(products)} produit(s) chargé(s) depuis {CSV_PATH.name}")

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.connect_over_cdp(CDP_URL)
        except Exception:
            sys.exit(
                f"Impossible de se connecter à {CDP_URL}.\n"
                "Quitte complètement ton navigateur puis relance-le avec, par exemple :\n"
                "  google-chrome --remote-debugging-port=9222"
            )

        page = get_page(browser)
        first, *rest = products

        print(f"\n=== Produit 1/{len(products)} : {first.title} ===")
        fill_product(page, first)

        macro = record_macro()

        try:
            page.wait_for_url("**/assets/**", timeout=PUBLISH_TIMEOUT_MS)
            print("Produit 1 publié.")
        except PWTimeoutError:
            print("[ATTENTION] Publication du produit 1 non confirmée (continue si tout va bien côté navigateur).")

        if rest:
            print("\nUne fenêtre va s'ouvrir : clique sur \"Démarrer\" pour enchaîner les produits restants.")
            run_gui(page, rest, macro)
        else:
            print("\nAucun autre produit à traiter.")


if __name__ == "__main__":
    main()
