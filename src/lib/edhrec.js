// ── EDHREC Theme Integration ──────────────────────────────────────────────────
// Provides a curated list of Commander themes and fetches matching commanders
// via Scryfall oracle-text queries.

const UA = "DeckStack/1.0 (deck-stack.vercel.app)";

// Each theme's `criteria` is a Scryfall condition appended to `is:commander`.
// Multi-theme selections combine with OR — broader results, user picks one.
export const THEMES = [
  { name: "Aristocrats",  slug: "aristocrats",  criteria: `o:"whenever a creature dies"` },
  { name: "Tokens",       slug: "tokens",       criteria: `(o:"create" o:"token")` },
  { name: "Counters",     slug: "counters",     criteria: `(o:"+1/+1 counter" o:"whenever")` },
  { name: "Graveyard",    slug: "graveyard",    criteria: `(o:"from your graveyard" o:"battlefield")` },
  { name: "Artifacts",    slug: "artifacts",    criteria: `(o:"artifact" o:"whenever" o:"enters")` },
  { name: "Enchantress",  slug: "enchantress",  criteria: `o:"whenever you cast an enchantment"` },
  { name: "Spellslinger", slug: "spellslinger", criteria: `(o:"whenever you cast" (o:"instant" OR o:"sorcery"))` },
  { name: "Voltron",      slug: "voltron",      criteria: `(o:"equipped creature gets" OR o:"enchanted creature gets")` },
  { name: "Landfall",     slug: "landfall",     criteria: `o:"landfall"` },
  { name: "Tribal",       slug: "tribal",       criteria: `(o:"creatures you control" o:"get +")` },
  { name: "Proliferate",  slug: "proliferate",  criteria: `o:"proliferate"` },
  { name: "Blink",        slug: "blink",        criteria: `(o:"exile" o:"return" o:"beginning of")` },
  { name: "Combat",       slug: "combat",       criteria: `o:"deals combat damage to a player"` },
  { name: "Copy",         slug: "copy",         criteria: `(o:"create a token" o:"copy")` },
  { name: "Reanimator",   slug: "reanimator",   criteria: `(o:"from" o:"graveyard" o:"onto the battlefield")` },
  { name: "Stax",         slug: "stax",         criteria: `(o:"spells cost" o:"more to cast")` },
];

// Fetch commanders matching any of the given themes (OR logic).
export async function fetchCommandersByTheme(themes, options = {}) {
  if (!themes.length) return [];
  const { signal } = options;
  const criteriaPart = themes.map(t => t.criteria).join(" OR ");
  const q = `is:commander (${criteriaPart})`;
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=edhrec&unique=cards`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return [];
  }
}
