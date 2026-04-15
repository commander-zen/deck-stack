import { useState } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { CATEGORY_ORDER, CATEGORY_META } from "../lib/wrec.js";

// ── Text view ─────────────────────────────────────────────────────────────────

function TextList({ pile, onRemove }) {
  const grouped = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const card of pile) {
    const cat = card._deckCategory ?? "plan";
    if (grouped[cat]) grouped[cat].push(card);
    else grouped["plan"].push(card);
  }

  return (
    <div>
      {CATEGORY_ORDER.map(cat => {
        const cards = grouped[cat];
        if (!cards.length) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10,
              color: "var(--muted)",
              letterSpacing: 2,
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              {meta.emoji} {meta.label.toUpperCase()} — {cards.length}
            </div>
            {cards.map((card, i) => (
              <div
                key={`${card.id}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: "var(--text)", letterSpacing: 0.3 }}>
                  1 {card.name}
                </span>
                <button
                  onClick={() => onRemove(card.id, cat)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.25)",
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
        );
      })}
    </div>
  );
}

// ── Visual view ───────────────────────────────────────────────────────────────

function VisualGrid({ pile, onRemove }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
      {pile.map((card, i) => {
        const art = getCardImage(card, "art_crop");
        return (
          <div
            key={`${card.id}-${i}`}
            style={{
              position: "relative",
              background: "var(--panel)",
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {art ? (
              <img src={art} alt={card.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                width: "100%", aspectRatio: "4/3",
                background: "var(--panel2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 7, color: "var(--muted)", padding: 4, textAlign: "center",
              }}>
                {card.name}
              </div>
            )}
            <div style={{
              padding: "2px 4px 3px",
              fontSize: 7,
              color: "var(--muted)",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}>
              {card.name}
            </div>
            <button
              onClick={() => onRemove(card.id, card._deckCategory ?? "plan")}
              style={{
                position: "absolute",
                top: 3, right: 3,
                width: 16, height: 16,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,77,109,0.85)",
                color: "#fff",
                fontSize: 9,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Pill + slide-up sheet ─────────────────────────────────────────────────────

export default function DeckReviewPill({ pile, onRemove }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("text");

  if (!pile || pile.length === 0) return null;

  return (
    <>
      {/* Floating pill */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 72,
          right: 16,
          zIndex: 50,
          background: "var(--primary)",
          border: "none",
          borderRadius: 20,
          padding: "8px 16px",
          color: "#fff",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 14,
          letterSpacing: 2,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(91,143,255,0.45)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          userSelect: "none",
        }}
      >
        ▪ {pile.length} KEPT
      </button>

      {/* Slide-up sheet */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            width: "100%",
            maxHeight: "80dvh",
            background: "var(--panel)",
            borderRadius: "18px 18px 0 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Sheet header */}
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16,
                letterSpacing: 3,
                flex: 1,
                color: "var(--text)",
              }}>
                YOUR STACK · {pile.length} CARDS
              </span>

              {/* Text / Visual toggle */}
              <div style={{ display: "flex", gap: 3 }}>
                {["text", "visual"].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: view === v ? "var(--primary)" : "rgba(255,255,255,0.07)",
                      color: view === v ? "#fff" : "var(--muted)",
                      fontSize: 10,
                      letterSpacing: 1,
                      cursor: "pointer",
                      fontFamily: "'Bebas Neue', sans-serif",
                    }}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: "0 2px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Sheet content */}
            <div style={{ overflowY: "auto", flex: 1, padding: "14px 20px 32px" }}>
              {view === "text" ? (
                <TextList pile={pile} onRemove={onRemove} />
              ) : (
                <VisualGrid pile={pile} onRemove={onRemove} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
