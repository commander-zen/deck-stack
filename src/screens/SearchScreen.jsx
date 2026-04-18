import { useState, useEffect, useRef } from "react";
import SearchForm from "../components/SearchForm.jsx";
import { searchCommanders, getCardImage } from "../lib/scryfall.js";

const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };

function ColorPip({ color }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      background: COLOR_DOT[color] ?? "#888",
      border: "1px solid rgba(255,255,255,0.2)",
      flexShrink: 0,
    }} />
  );
}

function StepLabel({ number, children }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      marginBottom: 8,
      paddingLeft: 2,
    }}>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 10, fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}>
        {number} —
      </span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 10, fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}>
        {children}
      </span>
    </div>
  );
}

export default function SearchScreen({ onSearch, loading, error, commanderCard, onCommanderCardChange }) {
  const [cmdQuery,      setCmdQuery]      = useState("");
  const [cmdResults,    setCmdResults]    = useState([]);
  const [cmdOpen,       setCmdOpen]       = useState(false);
  const [cmdFocused,    setCmdFocused]    = useState(false);
  const [currentQuery,  setCurrentQuery]  = useState("f:commander");
  const abortRef = useRef(null);

  useEffect(() => {
    if (!cmdQuery.trim()) {
      setCmdResults([]);
      setCmdOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const results = await searchCommanders(cmdQuery, { signal: ctrl.signal });
      if (!ctrl.signal.aborted) {
        setCmdResults(results.slice(0, 5));
        setCmdOpen(results.length > 0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cmdQuery]);

  function selectCommander(card) {
    onCommanderCardChange(card);
    setCmdQuery("");
    setCmdResults([]);
    setCmdOpen(false);
  }

  function handleSwipe() {
    if (loading) return;
    onSearch(currentQuery.trim());
  }

  const artUrl = commanderCard ? getCardImage(commanderCard, "art_crop") : null;
  const hasCommander = !!commanderCard || cmdQuery.trim().length > 0;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 430,
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}>

        {/* ── Header ── */}
        <div style={{ padding: "52px 0 32px" }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 56, lineHeight: 1,
            letterSpacing: "0.04em",
            color: "var(--text)",
            marginBottom: 6,
          }}>
            DECK STACK
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text2)", letterSpacing: "0.01em" }}>
              Swipe cards · Build your deck
            </span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10, fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--primary)",
              border: "1px solid rgba(91,143,255,0.35)",
              borderRadius: 4,
              padding: "2px 7px",
            }}>
              Commander
            </span>
          </div>
        </div>

        {/* ── Step 1: Commander ── */}
        <div style={{ marginBottom: 20 }}>
          <StepLabel number="1">
            Commander{" "}
            <span style={{ color: "rgba(85,85,102,0.7)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
              (optional)
            </span>
          </StepLabel>

          {/* Commander card */}
          <div style={{
            background: hasCommander
              ? "linear-gradient(135deg, #1a1730 0%, #16161a 60%)"
              : "var(--panel)",
            border: `1px solid ${hasCommander ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 14,
            overflow: "visible",
            transition: "border-color 0.2s, background 0.2s",
          }}>
            {commanderCard ? (
              /* Selected state */
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                {artUrl && (
                  <img
                    src={artUrl}
                    alt={commanderCard.name}
                    draggable={false}
                    style={{ width: 68, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, color: "var(--text)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {commanderCard.name}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                    {commanderCard.color_identity?.length > 0
                      ? commanderCard.color_identity.map(c => <ColorPip key={c} color={c} />)
                      : <span style={{ fontSize: 11, color: "var(--muted)" }}>Colorless</span>
                    }
                  </div>
                </div>
                <button
                  onClick={() => onCommanderCardChange(null)}
                  style={{
                    background: "transparent", border: "none",
                    color: "var(--muted)", cursor: "pointer",
                    fontSize: 16, padding: "4px", lineHeight: 1, flexShrink: 0,
                  }}
                >✕</button>
              </div>
            ) : (
              /* Search input state */
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
                  <span style={{
                    fontSize: 18, flexShrink: 0,
                    opacity: cmdFocused || cmdQuery ? 1 : 0.45,
                    transition: "opacity 0.15s",
                  }}>
                    👑
                  </span>
                  <input
                    type="text"
                    value={cmdQuery}
                    onChange={e => setCmdQuery(e.target.value)}
                    onFocus={() => { setCmdFocused(true); cmdResults.length > 0 && setCmdOpen(true); }}
                    onBlur={() => { setCmdFocused(false); setTimeout(() => setCmdOpen(false), 150); }}
                    placeholder="Search for a commander…"
                    autoComplete="off"
                    style={{
                      flex: 1,
                      background: "none", border: "none", outline: "none",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15, color: "var(--text)",
                      caretColor: "var(--secondary)",
                    }}
                  />
                </div>

                {/* Dropdown */}
                {cmdOpen && cmdResults.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "var(--panel2)", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden", zIndex: 50,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}>
                    {cmdResults.map(card => {
                      const thumb = getCardImage(card, "art_crop");
                      return (
                        <div
                          key={card.id}
                          onMouseDown={() => selectCommander(card)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", cursor: "pointer",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}
                        >
                          {thumb && (
                            <img
                              src={thumb}
                              alt={card.name}
                              draggable={false}
                              style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, color: "var(--text)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {card.name}
                            </div>
                            <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                              {card.color_identity?.map(c => <ColorPip key={c} color={c} />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hint text */}
                <div style={{
                  fontSize: 11.5,
                  color: cmdQuery.trim() ? "var(--secondary)" : "var(--text2)",
                  padding: "0 16px 12px",
                  transition: "color 0.15s",
                }}>
                  {cmdQuery.trim()
                    ? "✦ Color identity filter will be applied"
                    : "Sets color identity filter — only matching cards will appear"
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Step 2: Search ── */}
        <div style={{ marginBottom: 20 }}>
          <StepLabel number="2">What cards to swipe</StepLabel>
          <SearchForm
            onSearch={onSearch}
            onQueryChange={setCurrentQuery}
            loading={loading}
            error={error}
          />
        </div>

        {/* ── CTA ── */}
        <div style={{ marginTop: "auto", padding: "16px 0 28px" }}>
          <button
            onClick={handleSwipe}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "transparent" : "rgba(91,143,255,0.12)",
              border: loading ? "1.5px solid rgba(255,255,255,0.1)" : "1.5px solid var(--primary)",
              borderRadius: 16,
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: loading ? "default" : "pointer",
              transition: "background 0.15s",
            }}
          >
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22, letterSpacing: "0.12em",
              color: loading ? "rgba(255,255,255,0.2)" : "var(--primary)",
            }}>
              {loading ? "LOADING…" : "SWIPE"}
            </span>
            {!loading && (
              <span style={{ fontSize: 18, color: "var(--primary)" }}>→</span>
            )}
          </button>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          paddingBottom: 28,
        }}>
          {[
            { label: "GitHub",       href: "https://github.com/commander-zen/deck-stack" },
            { label: "Report a Bug", href: "https://github.com/commander-zen/deck-stack/issues/new?labels=bug&template=bug_report.md" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
              onMouseOver={e => e.currentTarget.style.color = "var(--text2)"}
              onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
            >
              {label}
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
