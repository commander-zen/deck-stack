const UA = "DeckStack/1.0 (deck-stack.vercel.app)";

// ── Sleep helper ──────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Image helpers ─────────────────────────────────────────────────────────────
export function getCardImage(card, size = "normal") {
  if (card.image_uris) return card.image_uris[size] ?? card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris)
    return card.card_faces[0].image_uris[size] ?? card.card_faces[0].image_uris.normal;
  return null;
}

// ── Mana cost → plain text ────────────────────────────────────────────────────
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

// ── Autocomplete card names ───────────────────────────────────────────────────
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

// ── Commander name search ─────────────────────────────────────────────────────
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

// ── Single page fetch ─────────────────────────────────────────────────────────
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

// ── Swipe screen fetch — up to 175 cards, paginated ──────────────────────────
export async function fetchForSwipe(query, commanderCard = null, options = {}) {
  const { signal } = options;
  const CAP = 175;
  const results = [];
  let baseQuery = query;
  if (commanderCard?.color_identity?.length > 0) {
    baseQuery = `${query} id<=${commanderCard.color_identity.join("")}`;
  }
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(baseQuery)}&order=edhrec&unique=cards`;

  while (url && results.length < CAP) {
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA }, signal });
    } catch (err) {
      if (err.name === "AbortError") throw err;
      throw new Error("Network error.");
    }
    if (res.status === 404) throw new Error("No cards found for that query.");
    if (res.status === 422) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.details ?? "Invalid query syntax.");
    }
    if (!res.ok) throw new Error(`Scryfall error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data ?? []));
    url = json.has_more && results.length < CAP ? json.next_page : null;
    if (url) await sleep(100);
  }

  return results.slice(0, CAP);
}

// ── Full paginator (kept for existing usage) ──────────────────────────────────
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

// ── Query builder ─────────────────────────────────────────────────────────────
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
