import { useState, useMemo } from "react";

const COLORS = ["W", "U", "B", "R", "G", "C"];

const COLOR_STYLE = {
  W: { active: "#f9fafb", label: "#f9fafb" },
  U: { active: "#60a5fa", label: "#60a5fa" },
  B: { active: "#c084fc", label: "#c084fc" },
  R: { active: "#f87171", label: "#f87171" },
  G: { active: "#4ade80", label: "#4ade80" },
  C: { active: "#9ca3af", label: "#9ca3af" },
};

const RARITIES  = ["C", "U", "R", "M"];
const RARITY_LABELS = { C: "COMMON", U: "UNCOMMON", R: "RARE", M: "MYTHIC" };
const FORMATS   = ["commander", "pioneer", "modern", "standard"];

function chipStyle(active, color = "var(--primary)") {
  return {
    padding: "5px 11px",
    borderRadius: 6,
    border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
    background: active ? `${color}18` : "transparent",
    color: active ? color : "var(--muted)",
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 12,
    letterSpacing: 1.5,
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.12s",
  };
}

function sectionLabel(text) {
  return (
    <div style={{
      fontSize: 9,
      color: "var(--muted)",
      letterSpacing: 3,
      marginBottom: 8,
    }}>
      {text}
    </div>
  );
}

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

export default function SearchScreen({ onSearch, loading, error }) {
  const [rawQuery,        setRawQuery]        = useState("");
  const [advOpen,         setAdvOpen]         = useState(false);
  const [moreOpen,        setMoreOpen]        = useState(false);
  const [selectedColors,  setSelectedColors]  = useState([]);
  const [colorMode,       setColorMode]       = useState("at");   // "at" | "exactly" | "subset"
  const [typeText,        setTypeText]        = useState("");
  const [oracleText,      setOracleText]      = useState("");
  const [cmcMin,          setCmcMin]          = useState("");
  const [cmcMax,          setCmcMax]          = useState("");
  const [selectedRarities,setSelectedRarities]= useState([]);
  const [format,          setFormat]          = useState(null);

  const advancedQuery = useMemo(() => buildAdvancedQuery({
    selectedColors, colorMode, typeText, oracleText,
    cmcMin, cmcMax, selectedRarities, format,
  }), [selectedColors, colorMode, typeText, oracleText, cmcMin, cmcMax, selectedRarities, format]);

  const assembledQuery = [rawQuery.trim(), advancedQuery].filter(Boolean).join(" ").trim();

  function toggleColor(c) {
    setSelectedColors(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  }

  function toggleRarity(r) {
    setSelectedRarities(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!assembledQuery.trim() || loading) return;
    onSearch(assembledQuery.trim());
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 13,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "10px 12px",
    outline: "none",
    caretColor: "var(--primary)",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'IBM Plex Mono', monospace",
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
          gap: 20,
        }}
      >
        {/* Logo */}
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
          <div style={{
            fontSize: 10,
            color: "var(--muted)",
            letterSpacing: 3,
            marginTop: 4,
          }}>
            SWIPE CARDS · BUILD YOUR DECK
          </div>
        </div>

        {/* Main search input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            value={rawQuery}
            onChange={e => setRawQuery(e.target.value)}
            placeholder="Search cards… (Scryfall syntax)"
            autoComplete="off"
            spellCheck={false}
            style={inputStyle}
          />
          {error && (
            <div style={{
              fontSize: 11,
              color: "var(--danger)",
              letterSpacing: 0.5,
              padding: "2px 2px",
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Advanced search toggle */}
        <button
          type="button"
          onClick={() => setAdvOpen(v => !v)}
          style={{
            alignSelf: "flex-start",
            padding: "6px 14px",
            borderRadius: 8,
            border: advOpen ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
            background: advOpen ? "var(--panel)" : "transparent",
            color: advOpen ? "var(--text)" : "var(--muted)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 12,
            letterSpacing: 2,
            cursor: "pointer",
          }}
        >
          ADVANCED SEARCH {advOpen ? "▼" : "▶"}
        </button>

        {/* Advanced panel */}
        {advOpen && (
          <div style={{
            background: "var(--panel)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "16px 16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}>

            {/* COLORS */}
            <div>
              {sectionLabel("COLORS")}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {COLORS.map(c => {
                  const active = selectedColors.includes(c);
                  const col = COLOR_STYLE[c].active;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColor(c)}
                      style={chipStyle(active, col)}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["at", "AT LEAST"], ["exactly", "EXACTLY"], ["subset", "SUBSET"]].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setColorMode(val)}
                    style={chipStyle(colorMode === val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* TYPE */}
            <div>
              {sectionLabel("TYPE")}
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
              {sectionLabel("ORACLE TEXT")}
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
              {sectionLabel("CMC")}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  value={cmcMin}
                  onChange={e => setCmcMin(e.target.value)}
                  placeholder="min"
                  type="number"
                  min="0"
                  style={{ ...inputStyle, width: 80 }}
                />
                <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                <input
                  value={cmcMax}
                  onChange={e => setCmcMax(e.target.value)}
                  placeholder="max"
                  type="number"
                  min="0"
                  style={{ ...inputStyle, width: 80 }}
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
                  color: "var(--muted)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 11,
                  letterSpacing: 2,
                  cursor: "pointer",
                  padding: "0 0 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                MORE {moreOpen ? "▼" : "▶"}
              </button>

              {moreOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* RARITY */}
                  <div>
                    {sectionLabel("RARITY")}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {RARITIES.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleRarity(r)}
                          style={chipStyle(selectedRarities.includes(r))}
                        >
                          {RARITY_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FORMAT */}
                  <div>
                    {sectionLabel("FORMAT")}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {FORMATS.map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormat(prev => prev === f ? null : f)}
                          style={chipStyle(format === f)}
                        >
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

        {/* Query preview */}
        {advOpen && advancedQuery && (
          <div style={{
            background: "var(--panel)",
            borderRadius: 8,
            padding: "10px 12px",
          }}>
            <div style={{
              fontSize: 9,
              color: "var(--muted)",
              letterSpacing: 3,
              marginBottom: 6,
            }}>
              QUERY PREVIEW
            </div>
            <div style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.6)",
              wordBreak: "break-all",
              letterSpacing: 0.3,
            }}>
              {assembledQuery || <span style={{ opacity: 0.3 }}>—</span>}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!assembledQuery.trim() || loading}
          style={{
            padding: "14px 24px",
            borderRadius: 10,
            border: "1px solid var(--primary)",
            background: assembledQuery.trim() && !loading
              ? "rgba(91,143,255,0.12)"
              : "transparent",
            color: assembledQuery.trim() && !loading ? "var(--primary)" : "rgba(255,255,255,0.2)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 4,
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
