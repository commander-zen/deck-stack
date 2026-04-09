const UA = "DeckSwipe/1.0 (deck-swipe.vercel.app)";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── Query builder ─────────────────────────────────────────────────────────────

export function buildQuery(filters) {
  const parts = [];

  if (filters.name?.trim())   parts.push(`name:"${filters.name.trim()}"`);
  if (filters.oracle?.trim()) parts.push(`o:"${filters.oracle.trim()}"`);

  // Color identity (id: operator — for commander identity filtering)
  if (filters.colorIdentity && filters.colorIdentity.length > 0) {
    parts.push(`id:${filters.colorIdentity.join("")}`);
  }

  // Colors (c: operator — legacy advanced search)
  if (filters.colors && filters.colors.selected.length > 0) {
    const joined = filters.colors.selected.join("");
    const mode   = filters.colors.mode; // "include" | "exact" | "subset"
    if (mode === "exact")   parts.push(`c=${joined}`);
    else if (mode === "subset") parts.push(`c<=${joined}`);
    else                    parts.push(`c:${joined}`);
  }
  if (filters.colors?.colorless) parts.push("c:c");

  // Tags (strategy + function chips)
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(t => parts.push(t));
  }

  // Types
  if (filters.types && filters.types.length > 0) {
    filters.types.forEach(t => parts.push(`t:${t}`));
  }

  // CMC
  if (filters.cmc?.value !== "" && filters.cmc?.value !== undefined) {
    const op = filters.cmc.op || "=";
    parts.push(`cmc${op}${filters.cmc.value}`);
  }

  // Format
  if (filters.format) parts.push(`f:${filters.format}`);

  // Freetext (raw Scryfall syntax)
  if (filters.freetext?.trim()) parts.push(filters.freetext.trim());

  return parts.join(" ");
}

// ── SessionStorage cache ──────────────────────────────────────────────────────

function cacheKey(query) {
  return `ds-cache:${query}`;
}

export function getCachedResults(query) {
  try {
    const raw = sessionStorage.getItem(cacheKey(query));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(cacheKey(query)); return null; }
    return data;
  } catch { return null; }
}

function cacheResults(query, data) {
  try {
    sessionStorage.setItem(cacheKey(query), JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded — ignore */ }
}

// ── Card fetcher with pagination + backoff ────────────────────────────────────

const PAGE_DELAY   = 500;   // ms between pages
const BACKOFF_429  = 30000; // ms on 429
export const EJECT_THRESHOLD = 500;  // show eject warning after this many cards
export const HARD_CAP        = 1000; // auto-eject at this count

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// options: { signal?: AbortSignal }
// onProgress: ({ done, total, partial, ejectable, autoEjected }) => void
//   partial   — snapshot of all cards fetched so far
//   ejectable — true once done >= EJECT_THRESHOLD
//   autoEjected — true when hard cap hit (fetch stopped automatically)
export async function fetchAllCards(query, onProgress, options = {}) {
  const { signal } = options;

  const cached = getCachedResults(query);
  if (cached) {
    onProgress?.({ done: cached.length, total: cached.length, partial: cached, finished: true });
    return cached;
  }

  const all = [];
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  let total = null;

  while (url) {
    // Check abort before each page fetch
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA }, signal });
    } catch (err) {
      if (err.name === "AbortError") throw err;
      throw new Error("Network error fetching cards.");
    }

    if (res.status === 429) {
      await sleep(BACKOFF_429);
      continue;
    }
    if (!res.ok) {
      if (res.status === 404) break; // no results
      throw new Error(`Scryfall error: ${res.status}`);
    }

    const json = await res.json();
    if (total === null) total = json.total_cards ?? null;

    all.push(...(json.data ?? []));

    // Hard cap — auto-eject
    if (all.length >= HARD_CAP) {
      onProgress?.({ done: all.length, total: total ?? all.length, partial: [...all], finished: true, autoEjected: true });
      cacheResults(query, all);
      return all;
    }

    const ejectable = all.length >= EJECT_THRESHOLD;
    onProgress?.({ done: all.length, total: total ?? all.length, partial: [...all], ejectable, finished: false });

    url = json.has_more ? json.next_page : null;
    if (url) await sleep(PAGE_DELAY);
  }

  cacheResults(query, all);
  onProgress?.({ done: all.length, total: all.length, partial: [...all], finished: true });
  return all;
}

// ── Image helpers ─────────────────────────────────────────────────────────────

export function getCardImage(card, size = "normal") {
  // size: "small" | "normal" | "large" | "art_crop" | "border_crop" | "png"
  if (card.image_uris) return card.image_uris[size] ?? card.image_uris.normal;
  // Double-faced: use front face
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size] ?? card.card_faces[0].image_uris.normal;
  return null;
}

// ── Mana cost formatter ───────────────────────────────────────────────────────
// Returns a plain-text representation, e.g. {2}{U}{B} → "2UB"

export function formatManaCost(cost) {
  if (!cost) return "";
  return cost.replace(/\{([^}]+)\}/g, (_, m) => m).replace(/\//g, "");
}
