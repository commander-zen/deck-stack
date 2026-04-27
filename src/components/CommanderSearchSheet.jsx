import { useState, useEffect, useRef } from "react";
import { searchCommanders, getCardImage } from "../lib/scryfall.js";

export default function CommanderSearchSheet({
  open,
  onClose,
  onSelect,
  decks = [],
  excludeDeckId = null,
}) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [dupError, setDupError] = useState("");
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setDupError("");
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      abortRef.current?.abort();
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const data = await searchCommanders(query, { signal: ctrl.signal });
        if (!ctrl.signal.aborted) setResults(data);
      } catch { /* aborted or network error */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(card) {
    const duplicate = decks.find(d => {
      if (!d.commander_card) return false;
      if (d.id === excludeDeckId) return false;
      return card.id && d.commander_card.id
        ? d.commander_card.id   === card.id
        : d.commander_card.name === card.name;
    });
    if (duplicate) {
      setDupError(`You already have a brew for ${card.name}`);
      return;
    }
    setDupError("");
    onSelect(card);
    handleClose();
  }

  function handleClose() {
    setQuery("");
    setResults([]);
    setDupError("");
    abortRef.current?.abort();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 210,
          background: "rgba(0,0,0,0.65)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 211,
        display: "flex", justifyContent: "center",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: open ? "auto" : "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 600,
          maxHeight: "80dvh",
          background: "var(--bg)",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Drag handle */}
          <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{
              display: "inline-block", width: 36, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
            }} />
          </div>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "8px 18px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <span style={{
              flex: 1,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18, letterSpacing: 4,
              color: "var(--primary)",
            }}>
              SET COMMANDER
            </span>
            <button
              onClick={handleClose}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.45)", fontSize: 18,
                cursor: "pointer", padding: "4px 6px", lineHeight: 1,
              }}
            >✕</button>
          </div>

          {/* Search input */}
          <div style={{ padding: "12px 18px 8px", flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setDupError(""); }}
              placeholder="Search for a legend…"
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "var(--panel)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10, padding: "12px 14px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16, color: "var(--text)",
                outline: "none", caretColor: "var(--primary)",
              }}
            />
          </div>

          {/* Duplicate error */}
          {dupError && (
            <div style={{
              margin: "0 18px 8px",
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(255,80,80,0.09)",
              border: "1px solid rgba(255,80,80,0.25)",
              fontSize: 13, color: "#ff6868", flexShrink: 0,
            }}>
              {dupError}
            </div>
          )}

          {/* Results */}
          <div style={{
            flex: 1, overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}>
            {results.map(card => {
              const thumb = getCardImage(card, "art_crop");
              return (
                <button
                  key={card.id}
                  onClick={() => handleSelect(card)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "10px 18px",
                    background: "transparent", border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer", textAlign: "left",
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                >
                  {thumb ? (
                    <img
                      src={thumb} alt={card.name} draggable={false}
                      style={{ width: 52, height: 37, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 37, borderRadius: 4, flexShrink: 0,
                      background: "rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 18, opacity: 0.3 }}>👑</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {card.name}
                    </div>
                    {card.type_line && (
                      <div style={{
                        fontSize: 11, color: "var(--muted)", marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {card.type_line}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
