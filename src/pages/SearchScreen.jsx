import { useState, useEffect, useRef } from "react";
import { getCardImage } from "../lib/scryfall.js";

const UA = "DeckSwipe/1.0 (deck-swipe.vercel.app)";
const BAR_HEIGHT = 60; // px — fixed bottom bar

export default function SearchScreen({ onCardsReady }) {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [dropOpen,    setDropOpen]    = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [stack,       setStack]       = useState([]);
  const [fetching,    setFetching]    = useState(false);
  const [error,       setError]       = useState(null);

  const inputRef  = useRef(null);
  const abortRef  = useRef(null);

  // ── Autocomplete (debounced 250ms) ────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setDropOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`,
          { headers: { "User-Agent": UA } }
        );
        const json = await res.json();
        const data = (json.data ?? []).slice(0, 8);
        setSuggestions(data);
        setDropOpen(data.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
        setDropOpen(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Add card by exact name ────────────────────────────────────────────────
  const addCard = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Close dropdown immediately
    setQuery("");
    setSuggestions([]);
    setDropOpen(false);
    setActiveIdx(-1);

    // Duplicate check
    if (stack.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      inputRef.current?.focus();
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setFetching(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(trimmed)}`,
        { headers: { "User-Agent": UA }, signal: ctrl.signal }
      );
      if (res.status === 404) throw new Error(`"${trimmed}" not found.`);
      if (!res.ok)            throw new Error(`Scryfall error: ${res.status}`);
      const card = await res.json();
      setStack(prev => [...prev, card]);
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message ?? "Failed to add card.");
    } finally {
      setFetching(false);
      inputRef.current?.focus();
    }
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = activeIdx >= 0 ? suggestions[activeIdx] : suggestions[0] ?? query;
      if (pick) addCard(pick);
    } else if (e.key === "Escape") {
      setDropOpen(false);
      setActiveIdx(-1);
    }
  };

  const removeCard  = (id)   => setStack(prev => prev.filter(c => c.id !== id));
  const handleStart = ()     => { if (stack.length > 0) onCardsReady(stack, ""); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'IBM Plex Mono', monospace",
      display: "flex",
      flexDirection: "column",
      paddingBottom: BAR_HEIGHT,
    }}>

      {/* ── Title ── */}
      <div style={{ textAlign: "center", padding: "32px 20px 8px" }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 48, letterSpacing: 6,
          color: "var(--primary)", lineHeight: 1,
        }}>
          DECK SWIPE
        </div>
        <div style={{
          fontSize: 11, color: "var(--muted)",
          letterSpacing: 3, marginTop: 4,
        }}>
          SEARCH · SWIPE · BUILD
        </div>
      </div>

      {/* ── Stack ── */}
      <div style={{ flex: 1, padding: "24px 20px 0" }}>

        {stack.length === 0 && !fetching && (
          <div style={{
            textAlign: "center",
            marginTop: 48,
            fontSize: 11, color: "rgba(255,255,255,0.15)",
            letterSpacing: 2, lineHeight: 2,
          }}>
            SEARCH FOR CARDS BELOW<br />
            <span style={{ fontSize: 10, opacity: 0.6 }}>your stack will appear here</span>
          </div>
        )}

        {fetching && (
          <div style={{
            textAlign: "center", marginTop: 48,
            fontSize: 11, color: "var(--muted)", letterSpacing: 2,
          }}>
            FETCHING…
          </div>
        )}

        {stack.length > 0 && (
          <>
            {/* Card thumbnails */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
              gap: 10,
            }}>
              {stack.map(card => {
                const art = getCardImage(card, "art_crop");
                return (
                  <div
                    key={card.id}
                    style={{
                      position: "relative",
                      background: "var(--panel)",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {art ? (
                      <img
                        src={art}
                        alt={card.name}
                        style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", aspectRatio: "4/3",
                        background: "var(--panel2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "var(--muted)",
                        padding: 6, textAlign: "center",
                      }}>
                        {card.name}
                      </div>
                    )}
                    <div style={{ padding: "4px 6px", fontSize: 8, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {card.name}
                    </div>
                    <button
                      onClick={() => removeCard(card.id)}
                      title="Remove"
                      style={{
                        position: "absolute", top: 3, right: 3,
                        width: 18, height: 18, borderRadius: "50%",
                        border: "none", background: "rgba(255,77,109,0.85)",
                        color: "#fff", fontSize: 10, lineHeight: 1,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Start swiping */}
            <button
              onClick={handleStart}
              style={{
                width: "100%", marginTop: 20,
                padding: "16px",
                borderRadius: 12, border: "none",
                background: "var(--primary)", color: "#fff",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16, letterSpacing: 5,
                cursor: "pointer",
              }}
            >
              START SWIPING ({stack.length}) →
            </button>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.25)",
            borderRadius: 8, color: "var(--danger)", fontSize: 11,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Fixed bottom search bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: BAR_HEIGHT,
        background: "var(--bg)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "0 16px",
        display: "flex", alignItems: "center",
        zIndex: 500,
      }}>

        {/* Autocomplete dropdown (anchored above bar) */}
        {dropOpen && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            bottom: BAR_HEIGHT,
            left: 0, right: 0,
            background: "var(--panel)",
            borderTop: "1px solid rgba(91,143,255,0.15)",
            overflow: "hidden",
          }}>
            {suggestions.map((name, i) => (
              <button
                key={name}
                onMouseDown={(e) => { e.preventDefault(); addCard(name); }}
                style={{
                  width: "100%", display: "block",
                  padding: "10px 16px",
                  background: i === activeIdx ? "rgba(91,143,255,0.12)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  color: i === activeIdx ? "var(--primary)" : "var(--text)",
                  fontSize: 12, textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: 0.5,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setDropOpen(false), 150)}
          placeholder="search cards..."
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: 0.5,
            caretColor: "var(--primary)",
          }}
        />

        {fetching && (
          <div style={{ fontSize: 10, color: "var(--muted)", marginLeft: 8, letterSpacing: 1 }}>
            …
          </div>
        )}
      </div>

    </div>
  );
}