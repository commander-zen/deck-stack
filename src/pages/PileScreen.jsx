import { useState } from "react";
import { getCardImage } from "../lib/scryfall.js";

function buildDecklist(pile) {
  // "1 Card Name\n" format
  return pile.map(c => `1 ${c.name}`).join("\n");
}

function buildMoxfieldUrl(pile) {
  const list = pile.map(c => `1 ${c.name}`).join("\n");
  return `https://www.moxfield.com/import?list=${encodeURIComponent(list)}`;
}

export default function PileScreen({ pile, onNewSearch }) {
  const [cards,   setCards]   = useState(pile);
  const [copied,  setCopied]  = useState(false);

  const removeCard = (idx) => setCards(c => c.filter((_, i) => i !== idx));

  const handleCopy = () => {
    const text = buildDecklist(cards);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const openMoxfield = () => {
    window.open(buildMoxfieldUrl(cards), "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'IBM Plex Mono', monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingBottom: 48,
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 600,
        padding: "28px 20px 16px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={onNewSearch} style={{
          background: "transparent", border: "none",
          color: "var(--muted)", fontSize: 12, letterSpacing: 1, cursor: "pointer",
        }}>
          ← NEW SEARCH
        </button>
        <div style={{ flex: 1, textAlign: "right" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 4, color: "var(--primary)" }}>
            MY PILE
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 10 }}>
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ width: "100%", maxWidth: 600, padding: "0 20px 20px", display: "flex", gap: 10 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 10,
            border: `1px solid ${copied ? "var(--success)" : "rgba(91,143,255,0.3)"}`,
            background: copied ? "rgba(52,211,153,0.1)" : "rgba(91,143,255,0.08)",
            color: copied ? "var(--success)" : "var(--primary)",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 3,
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          {copied ? "COPIED ✓" : "COPY DECKLIST"}
        </button>
        <button
          onClick={openMoxfield}
          disabled={cards.length === 0}
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 10,
            border: "1px solid rgba(167,139,250,0.3)",
            background: "rgba(167,139,250,0.08)",
            color: "var(--secondary)",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 3,
            cursor: cards.length > 0 ? "pointer" : "default",
            opacity: cards.length === 0 ? 0.4 : 1,
          }}
        >
          OPEN MOXFIELD ↗
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)", fontSize: 12, letterSpacing: 2 }}>
          YOUR PILE IS EMPTY<br />
          <span style={{ opacity: 0.5, fontSize: 10 }}>go back and swipe some cards</span>
        </div>
      )}

      {/* Card grid */}
      <div style={{
        width: "100%", maxWidth: 600,
        padding: "0 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 12,
      }}>
        {cards.map((card, idx) => {
          const art = getCardImage(card, "art_crop");
          return (
            <div
              key={`${card.id}-${idx}`}
              style={{
                position: "relative",
                background: "var(--panel)",
                borderRadius: 10,
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
                  fontSize: 10, color: "var(--muted)", padding: 8, textAlign: "center",
                }}>
                  {card.name}
                </div>
              )}
              <div style={{ padding: "6px 8px" }}>
                <div style={{ fontSize: 9, color: "var(--text)", lineHeight: 1.3, fontWeight: 600 }}>
                  {card.name}
                </div>
              </div>
              {/* Remove button */}
              <button
                onClick={() => removeCard(idx)}
                title="Remove from pile"
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 22, height: 22, borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,77,109,0.85)",
                  color: "#fff",
                  fontSize: 12, lineHeight: 1,
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

      {/* Footer */}
      {cards.length > 0 && (
        <div style={{ marginTop: 28, textAlign: "center", padding: "0 20px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: 2 }}>
            TAP ✕ TO REMOVE A CARD
          </div>
        </div>
      )}
    </div>
  );
}
