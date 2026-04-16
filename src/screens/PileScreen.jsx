import { useState } from "react";

function buildExportText(pile) {
  return pile.map(c => `1 ${c.name}`).join("\n");
}

export default function PileScreen({ pile: initialPile, onNewSearch }) {
  const [pile,   setPile]   = useState(initialPile);
  const [copied, setCopied] = useState(false);

  function handleRemove(cardId) {
    setPile(prev => prev.filter(c => c.id !== cardId));
  }

  function handleCopy() {
    const text = buildExportText(pile);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleMoxfield() {
    const text = buildExportText(pile);
    window.open(
      `https://www.moxfield.com/import?list=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'IBM Plex Mono', monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>

      {/* ── Header ── */}
      <div style={{
        width: "100%",
        maxWidth: 600,
        padding: "20px 20px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 24,
            letterSpacing: 5,
            color: "var(--primary)",
            lineHeight: 1,
          }}>
            DECK STACK
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
            {pile.length} card{pile.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ width: "100%", maxWidth: 600, padding: "18px 20px 100px" }}>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 10,
              border: `1px solid ${copied ? "var(--success)" : "rgba(91,143,255,0.3)"}`,
              background: copied ? "rgba(52,211,153,0.08)" : "rgba(91,143,255,0.06)",
              color: copied ? "var(--success)" : "var(--primary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: 3,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? "COPIED ✓" : "COPY"}
          </button>

          <button
            onClick={handleMoxfield}
            disabled={pile.length === 0}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 10,
              border: "1px solid rgba(167,139,250,0.3)",
              background: "rgba(167,139,250,0.06)",
              color: "var(--secondary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: 3,
              cursor: pile.length > 0 ? "pointer" : "default",
              opacity: pile.length === 0 ? 0.4 : 1,
            }}
          >
            MOXFIELD ↗
          </button>

          <button
            onClick={onNewSearch}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "var(--muted)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: 2,
              cursor: "pointer",
            }}
          >
            ← NEW
          </button>
        </div>

        {/* Empty state */}
        {pile.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
            color: "var(--muted)",
            fontSize: 12,
            letterSpacing: 2,
          }}>
            YOUR STACK IS EMPTY
            <br />
            <span style={{ opacity: 0.5, fontSize: 10 }}>go back and keep some cards</span>
          </div>
        )}

        {/* Card list */}
        {pile.length > 0 && (
          <div style={{ background: "var(--panel)", borderRadius: 10, padding: "12px 16px" }}>
            {pile.map((card, i) => (
              <div
                key={`${card.id}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: "var(--text)", letterSpacing: 0.3 }}>
                  1 {card.name}
                </span>
                <button
                  onClick={() => handleRemove(card.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.2)",
                    fontSize: 14,
                    cursor: "pointer",
                    padding: "0 4px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
