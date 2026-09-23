/**
 * Würfeldeck – 15 Tasten im Stream-Deck-Layout (3 Reihen x 5 Slots).
 *
 * Beim Laden werden alle 15 Würfel geworfen. Ein Druck auf eine beliebige
 * Taste wirft alle 15 neu.
 *
 * Ausnahme R1S5: zeigt wie jede andere Taste einen Würfel und wird
 * mitgewürfelt, löst aber selbst keinen Wurf aus. Der Slot ist auf dem
 * echten Stream Deck als Zurücktaste belegt.
 *
 * Diese Quelle wird kompiliert und als <script> in wuerfeldeck.html eingebettet,
 * damit die Seite als einzelne Datei offline funktioniert.
 */

type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

interface DeckKey {
  readonly id: string;
  readonly row: number;
  readonly slot: number;
  /** Löst ein Druck auf diese Taste einen Wurf aus? */
  readonly triggers: boolean;
  readonly element: HTMLButtonElement;
}

const ROWS = 3;
const SLOTS = 5;

/** Slot ohne auslösende Funktion – auf dem echten Stream Deck die Zurücktaste. */
const INERT_ID = "R1S5";

/** Versatz zwischen den Würfeln in Millisekunden, damit der Wurf über das Deck läuft. */
const STAGGER_MS = 10;

/** Besetzte Felder im 3x3-Raster der Würfelaugen, von links oben (0) nach rechts unten (8). */
const PIP_LAYOUT: Record<DiceValue, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * Ein Zufallsbyte. crypto.getRandomValues ist der gute Weg, fehlt aber in
 * manchen Kontexten (z. B. beim Öffnen aus der Dateien-App) – dann Math.random.
 */
function randomByte(): number {
  const source = window.crypto;
  if (source && typeof source.getRandomValues === "function") {
    const buffer = new Uint8Array(1);
    source.getRandomValues(buffer);
    return buffer[0];
  }
  return Math.floor(Math.random() * 256);
}

/**
 * Fairer Wurf: Werte ab 252 werden verworfen, damit die sechs Ergebnisse
 * exakt gleich wahrscheinlich bleiben (252 = 6 * 42).
 */
function rollDie(): DiceValue {
  let byte: number;
  do {
    byte = randomByte();
  } while (byte >= 252);
  return ((byte % 6) + 1) as DiceValue;
}

function pipMarkup(value: DiceValue): string {
  const lit = PIP_LAYOUT[value];
  let markup = "";
  for (let cell = 0; cell < 9; cell++) {
    markup += '<span class="pip' + (lit.indexOf(cell) === -1 ? "" : " on") + '"></span>';
  }
  return markup;
}

function createKey(row: number, slot: number, index: number): DeckKey {
  const id = "R" + row + "S" + slot;
  const element = document.createElement("button");
  element.type = "button";
  element.id = id;
  element.className = "key";
  element.style.setProperty("--delay", index * STAGGER_MS + "ms");
  element.innerHTML = '<span class="face"></span>';
  if (id === INERT_ID) {
    element.setAttribute("aria-disabled", "true");
  }
  return { id: id, row: row, slot: slot, triggers: id !== INERT_ID, element: element };
}

function showDie(key: DeckKey): void {
  const value = rollDie();
  const face = key.element.querySelector(".face") as HTMLElement;
  face.innerHTML = pipMarkup(value);
  key.element.dataset.value = String(value);
  key.element.setAttribute(
    "aria-label",
    key.id + ": Würfel zeigt " + value + (key.triggers ? "" : ", ohne Funktion"),
  );
}

/** Wirft alle Würfel neu, inklusive R1S5. */
function rollAll(keys: readonly DeckKey[], deck: HTMLElement): void {
  keys.forEach(showDie);
  deck.classList.remove("rolling");
  void deck.offsetWidth; // erzwingt Reflow, damit die Animation neu startet
  deck.classList.add("rolling");
}

function buildDeck(container: HTMLElement): DeckKey[] {
  const keys: DeckKey[] = [];
  let index = 0;
  for (let row = 1; row <= ROWS; row++) {
    for (let slot = 1; slot <= SLOTS; slot++) {
      const key = createKey(row, slot, index);
      container.appendChild(key.element);
      keys.push(key);
      index++;
    }
  }

  keys.forEach(function (key) {
    if (!key.triggers) {
      return;
    }
    key.element.addEventListener("click", function () {
      rollAll(keys, container);
    });
  });

  return keys;
}

const deck = document.getElementById("deck");
if (deck !== null) {
  const keys = buildDeck(deck);
  rollAll(keys, deck);
}
