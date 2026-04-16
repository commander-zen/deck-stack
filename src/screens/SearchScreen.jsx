import { useState, useMemo } from "react";

// ── Color pip config ──────────────────────────────────────────────────────────
const COLORS = ["W", "U", "B", "R", "G", "C"];
const COLOR_STYLE = {
  W: "#f1f5f9",
  U: "#60a5fa",
  B: "#c084fc",
  R: "#f87171",
  G: "#4ade80",
  C: "#94a3b8",
};

const RARITIES = ["C", "U", "R", "M"];
const RARITY_LABELS = { C: "COMMON", U: "UNCOMMON", R: "RARE", M: "MYTHIC" };
const FORMATS = ["commander", "pioneer", "modern", "standard"];

// ── Style helpers ─────────────────────────────────────────────────────────────
function chip(active, color = "var(--primary)") {
  return {
    padding: "9px 18px",
    borderRadius: 8,
    border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.15)",
    background: active ? `${color}22` : "transparent",
    color: active ? color : "rgba(255,255,255,0.6)",
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 14,
    letterSpacing: 1.5,
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.12s",
  };
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: 16,
  fontFamily: "'DM Sans', sans-serif",
  padding: "12px 14px",
  outline: "none",
  caretColor: "var(--primary)",
};

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 13,
      fontFamily: "'Bebas Neue', sans-serif",
      letterSpacing: 2,
      color: "var(--text)",
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ── Query assembly ────────────────────────────────────────────────────────────
function buildAdvancedQuery({ selectedColors, colorMode, typeText, oracleText, cmcMin, cmcMax, selectedRarities, format }) {
  const parts = [];
  const letters = selectedColors.filter(c => c !== "C").join("");
  if (letters) {
    const op = colorMode === "exactly" ? "=" : colorMode === "subset" ? "<=" : ":";
    parts.push(`c${op}${letters}`);
  }
  if (selectedColors.includes("C")) parts.push("c:c");
  if (typeText.trim())   parts.push(`t:${typeText.trim()}`);
  if (oracleText.trim()) parts.push(`o:"${oracleText.trim()}"`);
  if (cmcMin.trim())     parts.push(`cmc>=${cmcMin.trim()}`);
  if (cmcMax.trim())     parts.push(`cmc<=${cmcMax.trim()}`);
  if (selectedRarities.length > 0) {
    const MAP = { C: "common", U: "uncommon", R: "rare", M: "mythic" };
    const rarParts = selectedRarities.map(r => `r:${MAP[r]}`);
    parts.push(rarParts.length === 1 ? rarParts[0] : `(${rarParts.join(" OR ")})`);
  }
  if (format) parts.push(`f:${format}`);
  return parts.join(" ");
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SearchScreen({ onSearch, loading, error }) {
  const [rawQuery,         setRawQuery]         = useState("");
  const [advOpen,          setAdvOpen]           = useState(false);
  const [moreOpen,         setMoreOpen]          = useState(false);
  const [selectedColors,   setSelectedColors]    = useState([]);
  const [colorMode,        setColorMode]         = useState("at");
  const [typeText,         setTypeText]          = useState("");
  const [oracleText,       setOracleText]        = useState("");
  const [cmcMin,           setCmcMin]            = useState("");
  const [cmcMax,           setCmcMax]            = useState("");
  const [selectedRarities, setSelectedRarities]  = useState([]);
  const [format,           setFormat]            = useState(null);

  const advancedQuery = useMemo(() => buildAdvancedQuery({
    selectedColors, colorMode, typeText, oracleText,
    cmcMin, cmcMax, selectedRarities, format,
  }), [selectedColors, colorMode, typeText, oracleText, cmcMin, cmcMax, selectedRarities, format]);

  const assembledQuery = [rawQuery.trim(), advancedQuery].filter(Boolean).join(" ").trim();

  function toggleColor(c) {
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  function toggleRarity(r) {
    setSelectedRarities(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!assembledQuery.trim() || loading) return;
    onSearch(assembledQuery.trim());
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "56px 20px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* ── Logo ── */}
        <div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 52,
            letterSpacing: 6,
            color: "var(--primary)",
            lineHeight: 1,
          }}>
            DECK STACK
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 5, letterSpacing: 1 }}>
            Swipe cards · Build your deck
          </div>
        </div>

        {/* ── Main search input ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={rawQuery}
            onChange={e => setRawQuery(e.target.value)}
            placeholder="Search cards… (Scryfall syntax)"
            autoComplete="off"
            spellCheck={false}
            style={{ ...inputStyle, fontSize: 18 }}
          />
          {error && (
            <div style={{ fontSize: 14, color: "var(--danger)", paddingLeft: 2 }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Advanced search toggle ── */}
        <button
          type="button"
          onClick={() => setAdvOpen(v => !v)}
          style={{
            alignSelf: "flex-start",
            padding: "8px 16px",
            borderRadius: 8,
            border: advOpen ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.1)",
            background: advOpen ? "var(--panel)" : "transparent",
            color: advOpen ? "var(--text)" : "rgba(255,255,255,0.6)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 16,
            letterSpacing: 2,
            cursor: "pointer",
          }}
        >
          ADVANCED SEARCH {advOpen ? "▼" : "▶"}
        </button>

        {/* ── Advanced panel ── */}
        {advOpen && (
          <div style={{
            background: "var(--panel)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "20px 18px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}>

            {/* COLORS */}
            <div>
              <SectionLabel>COLORS</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {COLORS.map(c => {
                  const active = selectedColors.includes(c);
                  const col = COLOR_STYLE[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColor(c)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        border: active ? `2px solid ${col}` : "1px solid rgba(255,255,255,0.15)",
                        background: active ? `${col}22` : "rgba(255,255,255,0.03)",
                        color: active ? col : "rgba(255,255,255,0.55)",
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 20,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.12s",
                        flexShrink: 0,
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["at", "AT LEAST"], ["exactly", "EXACTLY"], ["subset", "SUBSET"]].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setColorMode(val)} style={chip(colorMode === val)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* TYPE */}
            <div>
              <SectionLabel>TYPE</SectionLabel>
              <input
                value={typeText}
                onChange={e => setTypeText(e.target.value)}
                placeholder="e.g. creature, instant"
                autoComplete="off"
                style={inputStyle}
              />
            </div>

            {/* ORACLE TEXT */}
            <div>
              <SectionLabel>ORACLE TEXT</SectionLabel>
              <input
                value={oracleText}
                onChange={e => setOracleText(e.target.value)}
                placeholder="e.g. draw a card"
                autoComplete="off"
                style={inputStyle}
              />
            </div>

            {/* CMC */}
            <div>
              <SectionLabel>CMC</SectionLabel>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  value={cmcMin}
                  onChange={e => setCmcMin(e.target.value)}
                  placeholder="min"
                  type="number"
                  min="0"
                  style={{ ...inputStyle, width: 90 }}
                />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>—</span>
                <input
                  value={cmcMax}
                  onChange={e => setCmcMax(e.target.value)}
                  placeholder="max"
                  type="number"
                  min="0"
                  style={{ ...inputStyle, width: 90 }}
                />
              </div>
            </div>

            {/* MORE subsection */}
            <div>
              <button
                type="button"
                onClick={() => setMoreOpen(v => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 14,
                  letterSpacing: 2,
                  cursor: "pointer",
                  padding: "0 0 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                MORE {moreOpen ? "▼" : "▶"}
              </button>

              {moreOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <SectionLabel>RARITY</SectionLabel>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {RARITIES.map(r => (
                        <button key={r} type="button" onClick={() => toggleRarity(r)} style={chip(selectedRarities.includes(r))}>
                          {RARITY_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>FORMAT</SectionLabel>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {FORMATS.map(f => (
                        <button key={f} type="button" onClick={() => setFormat(p => p === f ? null : f)} style={chip(format === f)}>
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Query preview ── */}
        {advOpen && advancedQuery && (
          <div style={{
            background: "var(--panel)",
            borderRadius: 10,
            padding: "12px 14px",
          }}>
            <div style={{
              fontSize: 11,
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: 2,
              color: "rgba(255,255,255,0.5)",
              marginBottom: 6,
            }}>
              QUERY PREVIEW
            </div>
            <div style={{
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
              color: "rgba(255,255,255,0.7)",
              wordBreak: "break-all",
            }}>
              {assembledQuery}
            </div>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={!assembledQuery.trim() || loading}
          style={{
            width: "100%",
            padding: "18px 24px",
            borderRadius: 12,
            border: assembledQuery.trim() && !loading
              ? "1px solid var(--primary)"
              : "1px solid rgba(255,255,255,0.1)",
            background: assembledQuery.trim() && !loading
              ? "rgba(91,143,255,0.14)"
              : "transparent",
            color: assembledQuery.trim() && !loading
              ? "var(--primary)"
              : "rgba(255,255,255,0.2)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            letterSpacing: 5,
            cursor: assembledQuery.trim() && !loading ? "pointer" : "default",
            transition: "all 0.15s",
          }}
        >
          {loading ? "LOADING…" : "SWIPE →"}
        </button>
      </form>
    </div>
  );
}
