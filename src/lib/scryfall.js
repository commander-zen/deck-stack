const UA = "DeckStack/1.0 (deck-stack.vercel.app)";

// ── Sleep helper ──────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Image helpers ─────────────────────────────────────────────────────────────
// size: "small" | "normal" | "large" | "art_crop" | "border_crop" | "png"
export function getCardImage(card, size = "normal") {
  if (card.image_uris) return card.image_uris[size] ?? card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris)
    return card.card_faces[0].image_uris[size] ?? card.card_faces[0].image_uris.normal;
  return null;
}

// ── Mana cost → plain text, e.g. {2}{U}{B} → "2UB" ──────────────────────────
export function formatManaCost(cost) {
  if (!cost) return "";
  return cost.replace(/\{([^}]+)\}/g, (_, m) => m).replace(/\//g, "");
}

// ── Price display helper ──────────────────────────────────────────────────────
export function formatPrice(card) {
  const usd = card.prices?.usd;
  if (!usd) return null;
  return `$${parseFloat(usd).toFixed(2)}`;
}

// ── Autocomplete card names (debounce in the component) ───────────────────────
export async function autocompleteCardNames(query, options = {}) {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}&include_extras=false`,
      { headers: { "User-Agent": UA }, signal: options.signal }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []).slice(0, 8);
  } catch {
    return [];
  }
}

// ── Commander name search (type-ahead, returns full card objects) ──────────────
export async function searchCommanders(query, options = {}) {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
        `is:commander name:${query.trim()}`
      )}&order=edhrec&unique=cards`,
      { headers: { "User-Agent": UA }, signal: options.signal }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []).slice(0, 8);
  } catch {
    return [];
  }
}

// ── Random commander ──────────────────────────────────────────────────────────
export async function fetchRandomCommander(options = {}) {
  const res = await fetch(
    "https://api.scryfall.com/cards/random?q=is:commander",
    { headers: { "User-Agent": UA }, signal: options.signal }
  );
  if (!res.ok) throw new Error("The fates are silent.");
  return res.json();
}

// ── Fetch a single card by exact name ────────────────────────────────────────
export async function fetchCardByName(name, options = {}) {
  const res = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
    { headers: { "User-Agent": UA }, signal: options.signal }
  );
  if (res.status === 404) throw new Error(`"${name}" not found.`);
  if (!res.ok) throw new Error(`Scryfall error: ${res.status}`);
  return res.json();
}

// ── Single page fetch (order=edhrec, unique=cards) ────────────────────────────
export async function fetchFirstPage(query, options = {}) {
  const { signal } = options;
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA }, signal });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Network error.");
  }
  if (res.status === 404) return [];
  if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
  if (!res.ok) throw new Error(`Scryfall error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// ── Commander card pool fetch ─────────────────────────────────────────────────
// Runs category queries in parallel, hits tagger API, deduplicates, caps at 120.
// Returns array of card objects with _deckCategory set.

function buildPoolQueries(colorId) {
  const id = colorId || "C";
  return [
    {
      cat: "ramp",
      q:   `(oracletag:ramp OR oracletag:mana-rock OR oracletag:mana-dork) id<=${id}`,
    },
    {
      cat: "card-advantage",
      q:   `(oracletag:card-draw OR oracletag:card-advantage) id<=${id}`,
    },
    {
      cat: "disruption",
      q:   `(oracletag:removal OR oracletag:targeted-removal) id<=${id}`,
    },
    {
      cat: "mass-disruption",
      q:   `oracletag:wrath id<=${id}`,
    },
    {
      cat: "mana-base",
      q:   `(oracletag:fetchland OR oracletag:shockland OR (t:land -is:basic)) id<=${id}`,
    },
  ];
}

function getCommanderPlanTags(commander) {
  const oracle = (commander.oracle_text || '').toLowerCase();
  const tags = new Set();

  // Reanimation
  if (oracle.includes('graveyard') && oracle.includes('battlefield')) tags.add('reanimate-creature');
  if (oracle.includes('reanimate-from-any') || (oracle.includes('graveyard') && oracle.includes('any player'))) tags.add('reanimate-from-any');

  // Protection
  if (oracle.includes('hexproof')) tags.add('gives-hexproof');
  if (oracle.includes('indestructible')) tags.add('gives-indestructible');
  if (oracle.includes('protection from')) tags.add('gives-protection');
  if (oracle.includes('phase') && oracle.includes('out')) tags.add('phasing');

  // Tokens
  if (oracle.includes('create') && oracle.includes('token')) tags.add('token-maker');
  if (oracle.includes('token') && oracle.includes('twice that many')) tags.add('token-doubler');

  // Counters
  if (oracle.includes('proliferate')) tags.add('proliferate');
  if (oracle.includes('+1/+1 counter')) tags.add('plus-counter');
  if (oracle.includes('would put') && oracle.includes('counter') && oracle.includes('instead')) tags.add('counter-doubler');

  // Sacrifice synergy
  if (oracle.includes('whenever') && oracle.includes('dies')) tags.add('death-trigger');
  if (oracle.includes('whenever you sacrifice')) tags.add('sacrifice-payoff');
  if (oracle.includes('sacrifice') && oracle.includes(':') && !oracle.includes('as an additional cost')) tags.add('sacrifice-outlet');

  // Recursion
  if (oracle.includes('graveyard') && oracle.includes('hand') && oracle.includes('return')) tags.add('recursion');
  if (oracle.includes('flashback') || oracle.includes('escape') || oracle.includes('retrace')) tags.add('self-recursion');

  // Stax
  if (oracle.includes('unless') && oracle.includes('pay') && oracle.includes('attack')) tags.add('tax');
  if (oracle.includes('spells cost') && oracle.includes('more')) tags.add('spell-tax');

  // Tribal
  if (oracle.includes('creatures you control') && oracle.includes('get +')) tags.add('tribal-lord');

  // Copy
  if (oracle.includes('copy target') && oracle.includes('spell')) tags.add('spell-copy');
  if (oracle.includes('create a token') && oracle.includes('copy')) tags.add('copy-token');

  // Enchantress
  if (oracle.includes('whenever') && oracle.includes('enchantment') && oracle.includes('draw')) tags.add('enchantress-trigger');

  // Haste / combat
  if (oracle.includes('haste') && (oracle.includes('creatures you control') || oracle.includes('each creature'))) tags.add('haste-grant');

  return tags;
}

export async function fetchCommanderPool(commander, options = {}) {
  const { signal } = options;

  const colorId = commander.color_identity?.length
    ? commander.color_identity.join("")
    : "C";

  const queries = buildPoolQueries(colorId);

  // ── Parallel: category queries + tagger API ──────────────────────────────
  const [catResults, planCards] = await Promise.all([
    // 5 category fetches
    Promise.all(
      queries.map(async ({ cat, q }) => {
        try {
          const cards = await fetchFirstPage(q, { signal });
          return cards.map(c => ({ ...c, _deckCategory: cat }));
        } catch (e) {
          if (e.name === "AbortError") throw e;
          return [];
        }
      })
    ),

    // Oracle text plan matcher — no external API needed
    (async () => {
      try {
        const tags = getCommanderPlanTags(commander);
        if (!tags.size) return [];

        const tagQuery = [...tags].map(s => `oracletag:${s}`).join(' OR ');
        const q = `(${tagQuery}) id<=${colorId}`;
        const cards = await fetchFirstPage(q, { signal });
        return cards.map(c => ({ ...c, _deckCategory: 'plan' }));
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        return [];
      }
    })(),
  ]);

  // ── Merge, deduplicate, exclude commander, cap at 120 ────────────────────
  const all  = [...catResults.flat(), ...planCards];
  const seen = new Set([commander.id]);
  const out  = [];

  for (const card of all) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      out.push(card);
    }
  }

  return out.slice(0, 120);
}

// ── Legacy full-paginator (kept for any existing usage) ──────────────────────

const BACKOFF_429 = 30000;
const PAGE_DELAY  = 500;
export const EJECT_THRESHOLD = 500;
export const HARD_CAP        = 1000;

export async function fetchAllCards(query, onProgress, options = {}) {
  const { signal } = options;
  const all = [];
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  let total = null;

  while (url) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA }, signal });
    } catch (err) {
      if (err.name === "AbortError") throw err;
      throw new Error("Network error fetching cards.");
    }
    if (res.status === 429) { await sleep(BACKOFF_429); continue; }
    if (!res.ok) { if (res.status === 404) break; throw new Error(`Scryfall error: ${res.status}`); }

    const json = await res.json();
    if (total === null) total = json.total_cards ?? null;
    all.push(...(json.data ?? []));

    if (all.length >= HARD_CAP) {
      onProgress?.({ done: all.length, total: total ?? all.length, partial: [...all], finished: true, autoEjected: true });
      return all;
    }

    const ejectable = all.length >= EJECT_THRESHOLD;
    onProgress?.({ done: all.length, total: total ?? all.length, partial: [...all], ejectable, finished: false });
    url = json.has_more ? json.next_page : null;
    if (url) await sleep(PAGE_DELAY);
  }

  onProgress?.({ done: all.length, total: all.length, partial: [...all], finished: true });
  return all;
}

// ── Category query helpers for SwipeScreen syntax inspector ──────────────────
export function buildCategoryQueries(colorId) {
  const id = colorId || "C";
  const map = {};
  for (const { cat, q } of buildPoolQueries(id)) {
    map[cat] = q;
  }
  return map;
}

export function buildPlanQuery(commander, colorId) {
  const id = colorId || "C";
  const tags = getCommanderPlanTags(commander);
  if (!tags.size) return null;
  const tagQuery = [...tags].map(s => `oracletag:${s}`).join(" OR ");
  return `(${tagQuery}) id<=${id}`;
}

// ── Legacy query builder (kept for SearchScreen compatibility) ────────────────
export function buildQuery(filters) {
  const parts = [];
  if (filters.name?.trim())   parts.push(`name:"${filters.name.trim()}"`);
  if (filters.oracle?.trim()) parts.push(`o:"${filters.oracle.trim()}"`);
  if (filters.colorIdentity && filters.colorIdentity.length > 0)
    parts.push(`id:${filters.colorIdentity.join("")}`);
  if (filters.colors && filters.colors.selected.length > 0) {
    const joined = filters.colors.selected.join("");
    const mode   = filters.colors.mode;
    if (mode === "exact")       parts.push(`c=${joined}`);
    else if (mode === "subset") parts.push(`c<=${joined}`);
    else                        parts.push(`c:${joined}`);
  }
  if (filters.colors?.colorless) parts.push("c:c");
  if (filters.tags && filters.tags.length > 0)  filters.tags.forEach(t => parts.push(t));
  if (filters.types && filters.types.length > 0) filters.types.forEach(t => parts.push(`t:${t}`));
  if (filters.cmc?.value !== "" && filters.cmc?.value !== undefined) {
    const op = filters.cmc.op || "=";
    parts.push(`cmc${op}${filters.cmc.value}`);
  }
  if (filters.format)           parts.push(`f:${filters.format}`);
  if (filters.freetext?.trim()) parts.push(filters.freetext.trim());
  return parts.join(" ");
}
