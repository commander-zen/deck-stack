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

export default function SearchScreen({ onSearch, loading, error, commanderCard, onCommanderCardChange }) {
  const [cmdQuery,   setCmdQuery]   = useState("");
  const [cmdResults, setCmdResults] = useState([]);
  const [cmdOpen,    setCmdOpen]    = useState(false);
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

  const artUrl = commanderCard ? getCardImage(commanderCard, "art_crop") : null;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        padding: "56px 20px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}>

        {/* ── Logo ── */}
        <div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 52, letterSpacing: 6,
            color: "var(--primary)", lineHeight: 1,
          }}>
            DECK STACK
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: 1 }}>
              Swipe cards · Build your deck
            </div>
            <div style={{
              padding: "2px 8px", borderRadius: 4,
              background: "rgba(91,143,255,0.15)",
              border: "1px solid rgba(91,143,255,0.35)",
              color: "var(--primary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11, letterSpacing: 2,
            }}>
              COMMANDER
            </div>
          </div>
        </div>

        {/* ── Commander picker ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 2, fontFamily: "'Bebas Neue', sans-serif" }}>
            COMMANDER (OPTIONAL)
          </div>

          {commanderCard ? (
            /* Selected commander banner */
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--panel)", borderRadius: 10,
              padding: "8px 12px",
              border: "1px solid rgba(91,143,255,0.2)",
            }}>
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
            /* Commander search input + dropdown */
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                onFocus={() => cmdResults.length > 0 && setCmdOpen(true)}
                onBlur={() => setTimeout(() => setCmdOpen(false), 150)}
                placeholder="Search for a commander…"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--panel)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {cmdOpen && cmdResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "var(--panel2)", borderRadius: 10,
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

              {cmdQuery === "" && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, paddingLeft: 2 }}>
                  Leave blank to search all Commander-legal cards
                </div>
              )}
            </div>
          )}
        </div>

        <SearchForm onSearch={onSearch} loading={loading} error={error} />

      </div>

      {/* ── Footer ── */}
      <footer style={{
        width: "100%",
        maxWidth: 480,
        padding: "0 20px 32px",
        marginTop: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>
        {/* Linktree */}
        <div style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {[
            { label: "GitHub", href: "https://github.com/commander-zen/deck-stack" },
            { label: "Report a Bug", href: "https://github.com/commander-zen/deck-stack/issues/new?labels=bug&template=bug_report.md" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: "var(--primary)",
                textDecoration: "none",
                opacity: 0.7,
                letterSpacing: 0.5,
              }}
              onMouseOver={e => e.currentTarget.style.opacity = "1"}
              onMouseOut={e => e.currentTarget.style.opacity = "0.7"}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.5 }}>
          DECK STACK · MTG Commander Deck Builder
        </div>
      </footer>
    </div>
  );
}
