import { useState } from "react";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

function buildExportText(pile) {
  return pile.map(c => `1 ${c.name}`).join("\n");
}

export default function PileScreen({ pile, onPileChange, onNewSearch }) {
  const [copied, setCopied] = useState(false);

  function handleRemove(cardId) {
    onPileChange(pile.filter(c => c.id !== cardId));
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

  const bottomPad = `calc(${NAV_HEIGHT}px + max(16px, env(safe-area-inset-bottom)))`;

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

      {/* ── Header ── */}
      <div style={{
        width: "100%",
        maxWidth: 600,
        padding: "20px 20px 14px",
        display: "flex",
        alignItems: "center",
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
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
            {pile.length} card{pile.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{
        width: "100%",
        maxWidth: 600,
        padding: "18px 20px",
        paddingBottom: bottomPad,
      }}>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "12px 12px",
              borderRadius: 10,
              border: `1px solid ${copied ? "var(--success)" : "rgba(91,143,255,0.3)"}`,
              background: copied ? "rgba(52,211,153,0.08)" : "rgba(91,143,255,0.06)",
              color: copied ? "var(--success)" : "var(--primary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 3,
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
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid rgba(167,139,250,0.3)",
              background: "rgba(167,139,250,0.06)",
              color: "var(--secondary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 3,
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
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 2,
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
            color: "rgba(255,255,255,0.35)",
            fontSize: 14,
          }}>
            Your stack is empty
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              Go back to swipe and keep some cards
            </span>
          </div>
        )}

        {/* Card list */}
        {pile.length > 0 && (
          <div style={{ background: "var(--panel)", borderRadius: 10, padding: "10px 14px" }}>
            {pile.map((card, i) => (
              <div
                key={`${card.id}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "7px 0",
                  borderBottom: i < pile.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <span style={{ flex: 1, fontSize: 14, color: "var(--text)" }}>
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
