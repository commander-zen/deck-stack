import { useState, useEffect, useRef } from "react";
import SearchForm from "../components/SearchForm.jsx";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
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
  const [cmdQuery,     setCmdQuery]     = useState("");
  const [cmdResults,   setCmdResults]   = useState([]);
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [cmdFocused,   setCmdFocused]   = useState(false);
  const [currentQuery, setCurrentQuery] = useState("f:commander");
  const [cmdExpanded,  setCmdExpanded]  = useState(false);
const abortRef    = useRef(null);
  const cmdInputRef = useRef(null);

  // Auto-focus commander input when panel opens
  useEffect(() => {
    if (cmdExpanded) setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, [cmdExpanded]);

  // Commander autocomplete
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
    setCmdExpanded(false);
  }

  function handlePillClick() {
    if (commanderCard) {
      onCommanderCardChange(null);
      setCmdExpanded(true);
    } else {
      setCmdExpanded(e => !e);
    }
  }

  function handleSearch() {
    if (loading) return;
    onSearch(currentQuery.trim());
  }

  const artUrl = commanderCard ? getCardImage(commanderCard, "art_crop") : null;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 430,
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}>

        {/* ── Title ── */}
        <div style={{ padding: "48px 0 20px" }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48, lineHeight: 1,
            letterSpacing: "0.04em",
            color: "var(--text)",
          }}>
            DECK STACK
          </div>
        </div>

        {/* ── Hero area ── */}
        <div style={{
          position: "relative",
          width: "100%",
          height: 220,
          background: "var(--panel)",
          borderRadius: 16,
          marginBottom: 36,
          overflow: "visible",
          flexShrink: 0,
        }}>
          {/* Art image — clipped separately so pill can overflow below */}
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: 16, overflow: "hidden",
            background: "var(--panel)",
          }}>
            {artUrl && (
              <img
                src={artUrl}
                alt={commanderCard?.name}
                draggable={false}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center top",
                  display: "block",
                  transition: "opacity 0.3s ease",
                }}
              />
            )}
            {artUrl && (
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, rgba(13,13,15,0.1) 50%, rgba(13,13,15,0.7) 100%)",
              }} />
            )}
          </div>

          {/* Commander pill — floating at bottom edge */}
          <button
            onClick={handlePillClick}
            style={{
              position: "absolute",
              bottom: -18,
              left: "50%",
              transform: "translateX(-50%)",
              background: commanderCard ? "rgba(167,139,250,0.15)" : "rgba(13,13,15,0.92)",
              border: `1px solid ${commanderCard ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.18)"}`,
              borderRadius: 20,
              padding: "8px 16px 8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
              maxWidth: "calc(100% - 40px)",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>👑</span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: commanderCard ? "var(--secondary)" : "var(--muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {commanderCard ? commanderCard.name : "Set commander…"}
            </span>
            {commanderCard && (
              <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, marginLeft: 2 }}>✕</span>
            )}
          </button>
        </div>

        {/* ── Commander search panel (expanded) ── */}
        {cmdExpanded && (
          <div style={{ marginBottom: 16, position: "relative" }}>
            <div style={{
              background: "var(--panel)",
              border: "1px solid rgba(167,139,250,0.35)",
              borderRadius: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                <span style={{
                  fontSize: 16, flexShrink: 0,
                  opacity: cmdFocused || cmdQuery ? 1 : 0.45,
                  transition: "opacity 0.15s",
                }}>
                  👑
                </span>
                <input
                  ref={cmdInputRef}
                  type="text"
                  value={cmdQuery}
                  onChange={e => setCmdQuery(e.target.value)}
                  onFocus={() => { setCmdFocused(true); cmdResults.length > 0 && setCmdOpen(true); }}
                  onBlur={() => { setCmdFocused(false); setTimeout(() => setCmdOpen(false), 150); }}
                  placeholder="Search for a commander…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{
                    flex: 1,
                    background: "none", border: "none", outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 16, color: "var(--text)",
                    caretColor: "var(--secondary)",
                  }}
                />
                <button
                  onClick={() => { setCmdExpanded(false); setCmdQuery(""); setCmdResults([]); }}
                  style={{
                    background: "transparent", border: "none",
                    color: "var(--muted)", cursor: "pointer",
                    fontSize: 14, padding: "4px", lineHeight: 1, flexShrink: 0,
                  }}
                >✕</button>
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

              <div style={{
                fontSize: 11.5,
                color: cmdQuery.trim() ? "var(--secondary)" : "var(--muted)",
                padding: "0 14px 10px",
                transition: "color 0.15s",
              }}>
                {cmdQuery.trim()
                  ? "✦ Color identity filter will be applied"
                  : "Sets color identity filter — only matching cards will appear"
                }
              </div>
            </div>
          </div>
        )}

        {/* ── Scryfall search + Filters ── */}
        <div style={{ marginBottom: 14 }}>
          <SearchForm
            onSearch={onSearch}
            onQueryChange={setCurrentQuery}
            loading={loading}
            error={error}
          />
        </div>

        {/* ── SEARCH CTA ── */}
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={handleSearch}
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
              {loading ? "LOADING…" : "SEARCH"}
            </span>
          </button>
        </div>

        {/* ── Hint text ── */}
        <div style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--muted)",
          marginBottom: 20,
        }}>
          ← swipe left to yeet &nbsp;·&nbsp; swipe right to keep →
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "center",
          gap: 20,
          paddingBottom: 28,
        }}>
          <a
            href="https://bsky.app/profile/commanderzen.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
            onMouseOver={e => e.currentTarget.style.color = "var(--text)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
          >
            reach out @commanderzen
          </a>
          <a
            href="https://github.com/commander-zen/deck-stack/issues/new?labels=bug&template=bug_report.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
            onMouseOver={e => e.currentTarget.style.color = "var(--text)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
          >
            Report a Bug
          </a>
        </div>

      </div>

    </div>
  );
}
