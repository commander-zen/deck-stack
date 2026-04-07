import { useState, useCallback } from "react";
import { buildQuery, fetchAllCards } from "../lib/scryfall.js";

const COLOR_OPTIONS = [
  { id: "W", label: "W", title: "White" },
  { id: "U", label: "U", title: "Blue"  },
  { id: "B", label: "B", title: "Black" },
  { id: "R", label: "R", title: "Red"   },
  { id: "G", label: "G", title: "Green" },
];

const TYPE_OPTIONS = [
  "Creature", "Instant", "Sorcery", "Enchantment",
  "Artifact", "Planeswalker", "Land", "Battle",
];

const CMC_OPS = ["=", "<=", ">=", "<", ">"];

const FORMAT_OPTIONS = [
  "commander", "standard", "modern", "legacy", "vintage",
  "pioneer", "pauper", "historic", "explorer",
];

const defaultFilters = {
  name:      "",
  oracle:    "",
  colors:    { selected: [], mode: "include", colorless: false },
  types:     [],
  cmc:       { op: "=", value: "" },
  format:    "commander",
  freetext:  "",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'IBM Plex Mono', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 0 48px",
  },
  header: {
    width: "100%",
    maxWidth: 600,
    padding: "32px 20px 16px",
    textAlign: "center",
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 48,
    letterSpacing: 6,
    color: "var(--primary)",
    lineHeight: 1,
  },
  subtitle: {
    fontSize: 11,
    color: "var(--muted)",
    letterSpacing: 3,
    marginTop: 4,
  },
  card: {
    width: "100%",
    maxWidth: 600,
    background: "var(--panel)",
    border: "1px solid rgba(91,143,255,0.12)",
    borderRadius: 16,
    padding: "20px 20px",
    margin: "0 20px 16px",
  },
  label: {
    fontSize: 10,
    color: "var(--muted)",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    background: "var(--panel2)",
    border: "1px solid rgba(91,143,255,0.2)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--text)",
    fontSize: 13,
    outline: "none",
  },
  colorBtn: (active) => ({
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(91,143,255,0.18)" : "transparent",
    color: active ? "var(--primary)" : "var(--muted)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
  }),
  modeBtn: (active) => ({
    padding: "6px 12px",
    borderRadius: 6,
    border: `1px solid ${active ? "var(--secondary)" : "rgba(255,255,255,0.08)"}`,
    background: active ? "rgba(167,139,250,0.15)" : "transparent",
    color: active ? "var(--secondary)" : "var(--muted)",
    fontSize: 10,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: 1,
  }),
  typeChip: (active) => ({
    padding: "7px 13px",
    borderRadius: 20,
    border: `1px solid ${active ? "var(--active)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(0,201,255,0.12)" : "transparent",
    color: active ? "var(--active)" : "var(--muted)",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
  }),
  select: {
    background: "var(--panel2)",
    border: "1px solid rgba(91,143,255,0.2)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
  },
  queryPreview: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(91,143,255,0.15)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 11,
    color: "var(--secondary)",
    wordBreak: "break-all",
    lineHeight: 1.6,
    minHeight: 36,
  },
  searchBtn: (loading) => ({
    width: "100%",
    maxWidth: 600,
    margin: "0 20px",
    padding: "16px",
    borderRadius: 12,
    border: "none",
    background: loading ? "rgba(91,143,255,0.3)" : "var(--primary)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: 4,
    cursor: loading ? "default" : "pointer",
    transition: "background 0.2s",
  }),
  progressBar: {
    width: "100%",
    maxWidth: 600,
    margin: "12px 20px 0",
  },
  errorBox: {
    width: "100%",
    maxWidth: 600,
    margin: "12px 20px 0",
    padding: "12px 16px",
    background: "rgba(255,77,109,0.1)",
    border: "1px solid rgba(255,77,109,0.3)",
    borderRadius: 10,
    color: "var(--danger)",
    fontSize: 12,
  },
};

export default function SearchScreen({ onCardsReady }) {
  const [filters,  setFilters]  = useState(defaultFilters);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [error,    setError]    = useState(null);

  const query = buildQuery(filters);

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const setField = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const toggleColor = (id) => {
    setFilters(f => {
      const sel = f.colors.selected;
      const next = sel.includes(id) ? sel.filter(c => c !== id) : [...sel, id];
      return { ...f, colors: { ...f.colors, selected: next } };
    });
  };

  const setColorMode = (mode) => setFilters(f => ({ ...f, colors: { ...f.colors, mode } }));
  const toggleColorless = () => setFilters(f => ({ ...f, colors: { ...f.colors, colorless: !f.colors.colorless } }));

  const toggleType = (t) => {
    setFilters(f => {
      const types = f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t];
      return { ...f, types };
    });
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: null });
    try {
      const cards = await fetchAllCards(query, ({ done, total }) => {
        setProgress({ done, total });
      });
      if (cards.length === 0) { setError("No cards found. Try broadening your search."); setLoading(false); return; }
      onCardsReady(cards);
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [query, loading, onCardsReady]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>DECK SWIPE</div>
        <div style={S.subtitle}>SEARCH · SWIPE · BUILD</div>
      </div>

      {/* Name */}
      <div style={{ width: "100%", maxWidth: 600, padding: "0 20px 16px" }}>
        <div style={S.card}>
          <div style={S.label}>Card Name</div>
          <input
            style={S.input}
            placeholder='e.g. "Sol Ring"'
            value={filters.name}
            onChange={e => setField("name", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>

        {/* Oracle text */}
        <div style={S.card}>
          <div style={S.label}>Rules Text Contains</div>
          <input
            style={S.input}
            placeholder='e.g. "draw a card"'
            value={filters.oracle}
            onChange={e => setField("oracle", e.target.value)}
          />
        </div>

        {/* Colors */}
        <div style={S.card}>
          <div style={S.label}>Colors</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {COLOR_OPTIONS.map(c => (
              <button key={c.id} title={c.title} style={S.colorBtn(filters.colors.selected.includes(c.id))} onClick={() => toggleColor(c.id)}>
                {c.label}
              </button>
            ))}
            <button title="Colorless" style={S.colorBtn(filters.colors.colorless)} onClick={toggleColorless}>
              C
            </button>
          </div>
          {filters.colors.selected.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              {["include", "exact", "subset"].map(m => (
                <button key={m} style={S.modeBtn(filters.colors.mode === m)} onClick={() => setColorMode(m)}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Types */}
        <div style={S.card}>
          <div style={S.label}>Card Type</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t} style={S.typeChip(filters.types.includes(t))} onClick={() => toggleType(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* CMC + Format row */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ ...S.card, flex: 1 }}>
            <div style={S.label}>Mana Value (CMC)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...S.select, width: 60 }} value={filters.cmc.op} onChange={e => setField("cmc", { ...filters.cmc, op: e.target.value })}>
                {CMC_OPS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <input
                style={{ ...S.input, width: 70 }}
                type="number"
                min="0"
                placeholder="0"
                value={filters.cmc.value}
                onChange={e => setField("cmc", { ...filters.cmc, value: e.target.value })}
              />
            </div>
          </div>
          <div style={{ ...S.card, flex: 1 }}>
            <div style={S.label}>Format</div>
            <select style={{ ...S.select, width: "100%" }} value={filters.format} onChange={e => setField("format", e.target.value)}>
              {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Freetext */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={S.label}>Extra Scryfall Syntax</div>
            <a
              href="https://scryfall.com/docs/syntax"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 10, color: "var(--secondary)", textDecoration: "none", letterSpacing: 1 }}
            >
              DOCS ↗
            </a>
          </div>
          <input
            style={S.input}
            placeholder='e.g. "is:commander pow>=3"'
            value={filters.freetext}
            onChange={e => setField("freetext", e.target.value)}
          />
        </div>

        {/* Query preview */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...S.label, marginBottom: 6 }}>Live Query Preview</div>
          <div style={S.queryPreview}>
            {query || <span style={{ opacity: 0.4 }}>Add filters above to build your query…</span>}
          </div>
        </div>
      </div>

      {/* Search button */}
      <button
        style={S.searchBtn(loading || !query.trim())}
        onClick={handleSearch}
        disabled={loading || !query.trim()}
      >
        {loading ? "FETCHING…" : "BUILD MY STACK"}
      </button>

      {/* Progress */}
      {loading && progress && (
        <div style={S.progressBar}>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, marginBottom: 6, textAlign: "center" }}>
            Building your stack… {progress.done}{progress.total ? ` / ${progress.total}` : ""} cards
          </div>
          {progress.total && (
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (progress.done / progress.total) * 100)}%`,
                background: "var(--primary)",
                borderRadius: 2,
                transition: "width 0.3s",
              }} />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && <div style={S.errorBox}>{error}</div>}
    </div>
  );
}
