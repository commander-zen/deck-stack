import { useState, useCallback, useRef } from "react";
import { buildQuery, fetchAllCards } from "../lib/scryfall.js";

const CAP = 500;

// ── Data ──────────────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { id: "W", label: "W", title: "White"     },
  { id: "U", label: "U", title: "Blue"      },
  { id: "B", label: "B", title: "Black"     },
  { id: "R", label: "R", title: "Red"       },
  { id: "G", label: "G", title: "Green"     },
  { id: "C", label: "C", title: "Colorless" },
];

const STRATEGY_CHIPS = [
  { label: "+1/+1 counters", tag: "tag:counters"    },
  { label: "blink",          tag: "tag:blink"        },
  { label: "aristocrats",    tag: "tag:aristocrats"  },
  { label: "tokens",         tag: "tag:tokens"       },
  { label: "spellslinger",   tag: "tag:spellslinger" },
  { label: "voltron",        tag: "tag:voltron"      },
  { label: "graveyard",      tag: "tag:graveyard"    },
  { label: "theft",          tag: "tag:theft"        },
  { label: "stax",           tag: "tag:stax"         },
  { label: "lands",          tag: "tag:lands"        },
  { label: "tribal",         tag: "tag:tribal"       },
  { label: "combo",          tag: "tag:combo"        },
];

const FUNCTION_CHIPS = [
  { label: "card advantage",   tag: "tag:card-draw" },
  { label: "ramp",             tag: "tag:ramp"      },
  { label: "disruption",       tag: "tag:removal"   },
  { label: "mass disruption",  tag: "tag:wrath"     },
];

const LAND_CHIPS = [
  { label: "basic lands",    tag: "type:land is:basic"   },
  { label: "nonbasic lands", tag: "type:land -is:basic"  },
  { label: "fetch lands",    tag: "tag:fetchland"        },
  { label: "shock lands",    tag: "tag:shockland"        },
  { label: "dual lands",     tag: "tag:dual"             },
];

const CMC_OPS      = ["=", "<=", ">=", "<", ">"];
const FORMAT_OPTIONS = [
  "commander","standard","modern","legacy","vintage",
  "pioneer","pauper","historic","explorer",
];

// ── Default state ─────────────────────────────────────────────────────────────

const defaultFilters = {
  // simple
  colorIdentity: [],   // ["W","U",...] — uses id: operator
  tags:          [],   // ["tag:counters", ...]
  // advanced (hidden by default)
  name:     "",
  oracle:   "",
  cmc:      { op: "=", value: "" },
  format:   "commander",
  freetext: "",
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
    padding: "0 0 56px",
  },
  header: {
    width: "100%",
    maxWidth: 560,
    padding: "32px 20px 8px",
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
  section: {
    width: "100%",
    maxWidth: 560,
    padding: "0 20px",
    marginTop: 28,
  },
  sectionLabel: {
    fontSize: 10,
    color: "var(--muted)",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 10,
    color: "rgba(139,168,204,0.5)",
    letterSpacing: 1,
    marginBottom: 10,
    fontStyle: "italic",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  colorBtn: (active) => ({
    width: 40,
    height: 40,
    borderRadius: 8,
    border: `1px solid ${active ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(91,143,255,0.18)" : "transparent",
    color: active ? "var(--primary)" : "var(--muted)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  chip: (active, accent = "var(--active)") => ({
    padding: "7px 14px",
    borderRadius: 20,
    border: `1px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
    background: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : "transparent",
    color: active ? accent : "var(--muted)",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  }),
  divider: {
    width: "100%",
    maxWidth: 560,
    margin: "28px 20px 0",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  escapeBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(139,168,204,0.45)",
    fontSize: 11,
    letterSpacing: 1,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "10px 0",
    textDecoration: "underline",
    textDecorationColor: "rgba(139,168,204,0.2)",
  },
  advCard: {
    width: "100%",
    background: "var(--panel)",
    border: "1px solid rgba(91,143,255,0.1)",
    borderRadius: 14,
    padding: "18px 18px",
    marginTop: 14,
  },
  advLabel: {
    fontSize: 10,
    color: "var(--muted)",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    background: "var(--panel2)",
    border: "1px solid rgba(91,143,255,0.18)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  select: {
    background: "var(--panel2)",
    border: "1px solid rgba(91,143,255,0.18)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  queryPreview: {
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(91,143,255,0.12)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 11,
    color: "var(--secondary)",
    wordBreak: "break-all",
    lineHeight: 1.7,
    minHeight: 38,
  },
  searchBtn: (disabled) => ({
    width: "100%",
    maxWidth: 560,
    margin: "0 20px",
    padding: "16px",
    borderRadius: 12,
    border: "none",
    background: disabled ? "rgba(91,143,255,0.25)" : "var(--primary)",
    color: disabled ? "rgba(255,255,255,0.4)" : "#fff",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: 5,
    cursor: disabled ? "default" : "pointer",
    transition: "background 0.2s",
  }),
  progressWrap: {
    width: "100%",
    maxWidth: 560,
    margin: "14px 20px 0",
    textAlign: "center",
  },
  errorBox: {
    width: "100%",
    maxWidth: 560,
    margin: "14px 20px 0",
    padding: "12px 16px",
    background: "rgba(255,77,109,0.08)",
    border: "1px solid rgba(255,77,109,0.25)",
    borderRadius: 10,
    color: "var(--danger)",
    fontSize: 12,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchScreen({ onCardsReady }) {
  const [filters,   setFilters]   = useState(defaultFilters);
  const [advanced,  setAdvanced]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(null);   // { done, total, ejectable, autoEjected }
  const [error,     setError]     = useState(null);

  // Refs so cancel/auto-stop handlers can read current values without stale closures
  const abortCtrlRef    = useRef(null);
  const partialCardsRef = useRef([]);
  const autoStopRef     = useRef(false);

  const query = buildQuery(filters);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleColor = (id) => {
    setFilters(f => {
      const sel = f.colorIdentity;
      return { ...f, colorIdentity: sel.includes(id) ? sel.filter(c => c !== id) : [...sel, id] };
    });
  };

  const toggleTag = (tag) => {
    setFilters(f => {
      const tags = f.tags;
      return { ...f, tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag] };
    });
  };

  const setAdv = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  // ── Cancel (abort, discard partial, back to idle) ──────────────────────────

  const handleCancel = useCallback(() => {
    autoStopRef.current = false;
    abortCtrlRef.current?.abort();
    partialCardsRef.current = [];
    setLoading(false);
    setProgress(null);
    setError(null);
  }, []);

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!query.trim() || loading) return;

    // Fresh abort controller for this fetch run
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    partialCardsRef.current = [];

    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: null });

    try {
      const cards = await fetchAllCards(
        query,
        ({ done, total, partial, finished }) => {
          partialCardsRef.current = partial ?? [];
          setProgress({ done, total });
          if (!finished && (partial ?? []).length >= CAP) {
            autoStopRef.current = true;
            ctrl.abort();
          }
        },
        { signal: ctrl.signal },
      );
      if (cards.length === 0) {
        setError("No cards found. Try broadening your search.");
        setLoading(false);
        return;
      }
      onCardsReady(cards.slice(0, CAP), query);
    } catch (err) {
      if (err.name === "AbortError") {
        if (autoStopRef.current) {
          const partial = partialCardsRef.current;
          autoStopRef.current = false;
          setLoading(false);
          setProgress(null);
          if (partial.length > 0) onCardsReady(partial, query);
        }
        return;
      }
      setError(err.message ?? "Something went wrong.");
      setLoading(false);
    }
  }, [query, loading, onCardsReady]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.title}>DECK SWIPE</div>
        <div style={S.subtitle}>SEARCH · SWIPE · BUILD</div>
      </div>

      {/* ── Section 1: Color identity ── */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Commander color identity</div>
        <div style={S.chipRow}>
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.id}
              title={c.title}
              style={S.colorBtn(filters.colorIdentity.includes(c.id))}
              onClick={() => toggleColor(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 2: Strategy ── */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Strategy</div>
        <div style={S.chipRow}>
          {STRATEGY_CHIPS.map(({ label, tag }) => (
            <button
              key={tag}
              style={S.chip(filters.tags.includes(tag), "var(--active)")}
              onClick={() => toggleTag(tag)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 3: Function ── */}
      <div style={S.section}>
        <div style={S.sectionLabel}>the veggies</div>
        <div style={S.sectionSub}>core deckbuilding food groups</div>
        <div style={S.chipRow}>
          {FUNCTION_CHIPS.map(({ label, tag }) => (
            <button
              key={tag}
              style={S.chip(filters.tags.includes(tag), "var(--secondary)")}
              onClick={() => toggleTag(tag)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ ...S.sectionLabel, marginTop: 16 }}>lands</div>
        <div style={S.chipRow}>
          {LAND_CHIPS.map(({ label, tag }) => (
            <button
              key={tag}
              style={S.chip(filters.tags.includes(tag), "#4ade80")}
              onClick={() => toggleTag(tag)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Escape hatch ── */}
      <div style={{ ...S.section, marginTop: 20, display: "flex", justifyContent: "center" }}>
        <button
          style={S.escapeBtn}
          onClick={() => setAdvanced(v => !v)}
        >
          {advanced ? "▲ hide advanced filters" : "no thanks, I got my veggies →"}
        </button>
      </div>

      {/* ── Advanced fields (collapsible) ── */}
      {advanced && (
        <div style={{ ...S.section, marginTop: 4 }}>
          <div style={S.advCard}>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <div style={S.advLabel}>Card Name</div>
              <input style={S.input} placeholder='e.g. "Sol Ring"'
                value={filters.name} onChange={e => setAdv("name", e.target.value)} />
            </div>

            {/* Oracle */}
            <div style={{ marginBottom: 16 }}>
              <div style={S.advLabel}>Rules Text Contains</div>
              <input style={S.input} placeholder='e.g. "draw a card"'
                value={filters.oracle} onChange={e => setAdv("oracle", e.target.value)} />
            </div>

            {/* CMC + Format row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={S.advLabel}>Mana Value (CMC)</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    style={{ ...S.select, width: 56 }}
                    value={filters.cmc.op}
                    onChange={e => setAdv("cmc", { ...filters.cmc, op: e.target.value })}
                  >
                    {CMC_OPS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input
                    style={{ ...S.input, width: 64 }}
                    type="number" min="0" placeholder="0"
                    value={filters.cmc.value}
                    onChange={e => setAdv("cmc", { ...filters.cmc, value: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={S.advLabel}>Format</div>
                <select style={{ ...S.select, width: "100%" }}
                  value={filters.format} onChange={e => setAdv("format", e.target.value)}>
                  {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Freetext */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={S.advLabel}>Extra Scryfall Syntax</div>
                <a href="https://scryfall.com/docs/syntax" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: "var(--secondary)", textDecoration: "none", letterSpacing: 1 }}>
                  DOCS ↗
                </a>
              </div>
              <input style={S.input} placeholder='e.g. "is:commander pow>=3"'
                value={filters.freetext} onChange={e => setAdv("freetext", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Query preview ── */}
      <div style={{ ...S.section, marginTop: 24 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 6 }}>Query Preview</div>
        <div style={S.queryPreview}>
          {query
            ? query
            : <span style={{ opacity: 0.35 }}>Select colors or strategy chips above…</span>
          }
        </div>
      </div>

      {/* ── Search button ── */}
      <div style={{ width: "100%", maxWidth: 560, padding: "20px 20px 0" }}>
        <button
          style={S.searchBtn(loading || !query.trim())}
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? "FETCHING…" : "START SWIPING"}
        </button>
      </div>

      {/* ── Progress + eject ── */}
      {loading && progress && (
        <div style={{ ...S.progressWrap, padding: "0 20px" }}>
          {/* Progress text */}
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, marginBottom: 8, marginTop: 14 }}>
            Building your stack… {progress.done}{progress.total ? ` / ${progress.total}` : ""} cards
          </div>

          {/* Progress bar */}
          {progress.total && (
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 14 }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (progress.done / Math.min(progress.total, CAP)) * 100)}%`,
                background: "var(--primary)",
                borderRadius: 2,
                transition: "width 0.3s",
              }} />
            </div>
          )}

          {/* Cancel button */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleCancel}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(139,168,204,0.4)",
                fontSize: 11,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                textDecoration: "underline",
                textDecorationColor: "rgba(139,168,204,0.2)",
              }}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ width: "100%", maxWidth: 560, padding: "0 20px" }}>
          <div style={{ ...S.errorBox, margin: "14px 0 0" }}>{error}</div>
        </div>
      )}

    </div>
  );
}
