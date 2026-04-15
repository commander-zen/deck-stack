import { useState, useEffect, useRef } from "react";
import { searchCommanders, getCardImage, formatManaCost } from "../lib/scryfall.js";

export default function LandingScreen({ onCommanderSelected, onStrategyFlow }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setDropOpen(false); return; }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const cards = await searchCommanders(query, { signal: ctrl.signal });
        setResults(cards);
        setDropOpen(cards.length > 0);
      } catch (e) {
        if (e.name !== "AbortError") { setResults([]); setDropOpen(false); }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const selectCommander = (card) => {
    setDropOpen(false);
    setQuery("");
    setResults([]);
    onCommanderSelected(card);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
      fontFamily: "'IBM Plex Mono', monospace",
      maxWidth: 600,
      margin: "0 auto",
      width: "100%",
    }}>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(52px, 14vw, 80px)",
          letterSpacing: 8,
          color: "var(--primary)",
          lineHeight: 1,
        }}>
          DECK STACK
        </div>
      </div>

      {/* Search box */}
      <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "var(--panel)",
          border: "1px solid rgba(91,143,255,0.25)",
          borderRadius: 12,
          padding: "0 16px",
          gap: 10,
        }}>
          <span style={{ color: "var(--muted)", fontSize: 16, flexShrink: 0 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setDropOpen(false), 150)}
            onFocus={() => results.length > 0 && setDropOpen(true)}
            placeholder="Search commanders…"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: 15,
              padding: "16px 0",
              caretColor: "var(--primary)",
            }}
          />
          {loading && <span style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>…</span>}
        </div>

        {dropOpen && results.length > 0 && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0, right: 0,
            background: "var(--panel)",
            border: "1px solid rgba(91,143,255,0.2)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
            zIndex: 100,
          }}>
            {results.map(card => {
              const art = getCardImage(card, "art_crop");
              const ci  = card.color_identity ?? [];
              return (
                <button
                  key={card.id}
                  onMouseDown={() => selectCommander(card)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {art ? (
                    <img src={art} alt="" style={{ width: 52, height: 37, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 37, background: "var(--panel2)", borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {card.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                      {ci.join("") || "C"} · {formatManaCost(card.mana_cost) || "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* BUILD BY STRATEGY */}
      <div style={{ width: "100%", maxWidth: 480, marginTop: 16 }}>
        <button
          onClick={onStrategyFlow}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 12,
            border: "1px solid rgba(91,143,255,0.3)",
            background: "rgba(91,143,255,0.08)",
            color: "var(--primary)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 4,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          BUILD BY STRATEGY →
        </button>
      </div>
    </div>
  );
}
