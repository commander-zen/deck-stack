import { useState, useEffect, useRef } from "react";
import { searchCommanders, fetchRandomCommander, getCardImage, formatManaCost } from "../lib/scryfall.js";

const TAGLINE = "SORTED BY EDHREC RANK · SWIPE RIGHT TO KEEP · LEFT TO PASS";

export default function LandingScreen({ onCommanderSelected }) {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);
  const [luckyBusy,  setLuckyBusy] = useState(false);
  const [error,      setError]      = useState(null);

  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // ── Debounced commander search ────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setDropOpen(false);
      return;
    }
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
        if (e.name !== "AbortError") {
          setResults([]);
          setDropOpen(false);
        }
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
    setError(null);
    onCommanderSelected(card);
  };

  const handleLucky = async () => {
    setLuckyBusy(true);
    setError(null);
    try {
      const card = await fetchRandomCommander();
      onCommanderSelected(card);
    } catch (e) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLuckyBusy(false);
    }
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

      {/* ── Title ── */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(52px, 14vw, 80px)",
          letterSpacing: 8,
          color: "var(--primary)",
          lineHeight: 1,
        }}>
          DECK STACK
        </div>
        <div style={{
          fontSize: 10,
          color: "var(--muted)",
          letterSpacing: 3,
          marginTop: 8,
          lineHeight: 1.6,
        }}>
          {TAGLINE}
        </div>
      </div>

      {/* ── Search box ── */}
      <div style={{ width: "100%", maxWidth: 480, marginTop: 40, position: "relative" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "var(--panel)",
          border: "1px solid rgba(91,143,255,0.25)",
          borderRadius: 12,
          padding: "0 16px",
          gap: 10,
          transition: "border-color 0.15s",
        }}>
          <span style={{ color: "var(--muted)", fontSize: 16, flexShrink: 0 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setError(null); }}
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
          {loading && (
            <span style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>…</span>
          )}
        </div>

        {/* Dropdown */}
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
                    <img
                      src={art}
                      alt=""
                      style={{
                        width: 52, height: 37,
                        objectFit: "cover",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 37,
                      background: "var(--panel2)",
                      borderRadius: 4,
                      flexShrink: 0,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      color: "var(--text)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
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

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          background: "rgba(255,77,109,0.08)",
          border: "1px solid rgba(255,77,109,0.25)",
          borderRadius: 8,
          color: "var(--danger)",
          fontSize: 11,
          width: "100%",
          maxWidth: 480,
        }}>
          {error}
        </div>
      )}

      {/* ── Buttons ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 480,
        marginTop: 20,
      }}>
        {/* I'm Feeling Lucky */}
        <button
          onClick={handleLucky}
          disabled={luckyBusy}
          style={{
            padding: "14px 24px",
            borderRadius: 12,
            border: "1px dashed rgba(245,158,11,0.5)",
            background: "rgba(245,158,11,0.05)",
            color: luckyBusy ? "rgba(245,158,11,0.4)" : "var(--active)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 4,
            cursor: luckyBusy ? "default" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {luckyBusy ? "CONSULTING THE BLIND ETERNITIES…" : "I'M FEELING LUCKY"}
        </button>

        {/* Advanced Search */}
        <button
          onClick={() => window.open("https://scryfall.com/advanced", "_blank", "noopener,noreferrer")}
          style={{
            padding: "11px 24px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "var(--muted)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14,
            letterSpacing: 3,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          ADVANCED SEARCH ↗
        </button>
      </div>
    </div>
  );
}
