import { useState, useMemo } from "react";
import { getCardImage } from "../lib/scryfall.js";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  computeWREC,
  ratioColor,
  ratioIndicator,
  formatScore,
  buildExport,
} from "../lib/wrec.js";

// ── WREC Score Panel ──────────────────────────────────────────────────────────

function WRECPanel({ pile }) {
  const { score, ratios } = useMemo(() => computeWREC(pile), [pile]);
  const scoreColor = ratioColor(score);

  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: "16px 20px",
      marginBottom: 24,
    }}>
      {/* Score header */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 42,
          letterSpacing: 2,
          color: scoreColor,
          lineHeight: 1,
        }}>
          {formatScore(score)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14,
            letterSpacing: 3,
            color: "var(--muted)",
          }}>
            WREC SCORE
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, marginTop: 2 }}>
            WACHEL REEKS EFFECTIVENESS COEFFICIENT
          </div>
        </div>
      </div>

      {/* Per-category rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ratios.map(({ cat, count, target, ratio }) => {
          const meta  = CATEGORY_META[cat];
          const color = ratioColor(ratio);
          const ind   = ratioIndicator(ratio);
          return (
            <div key={cat} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ fontSize: 12, flexShrink: 0, width: 18 }}>{meta.emoji}</span>
              <span style={{
                fontSize: 10,
                color: "var(--muted)",
                flex: 1,
                letterSpacing: 0.5,
              }}>
                {meta.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                {count}/{target}
              </span>
              <span style={{
                fontSize: 10,
                color,
                flexShrink: 0,
                minWidth: 40,
                textAlign: "right",
              }}>
                {ratio.toFixed(3)}
              </span>
              <span style={{
                fontSize: 9,
                color,
                flexShrink: 0,
                minWidth: 52,
                textAlign: "right",
                letterSpacing: 0.5,
              }}>
                {ind}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 9,
        color: "rgba(255,255,255,0.2)",
        letterSpacing: 1,
        textAlign: "center",
      }}>
        1.000 IS PERFECT · GREEN ±0.08 · AMBER ±0.20 · RED OUTSIDE ±0.20
      </div>
    </div>
  );
}

// ── Category Section ──────────────────────────────────────────────────────────

function CategorySection({ cat, cards, onRemove }) {
  const meta   = CATEGORY_META[cat];
  const target = meta.target;

  if (cards.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        marginBottom: 12,
        padding: "0 2px",
      }}>
        <span style={{ fontSize: 16 }}>{meta.emoji}</span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: 3,
          color: "var(--text)",
        }}>
          {meta.label.toUpperCase()}
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>
          TARGET {target}
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
          {cards.length}
        </span>
      </div>

      {/* Card grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
        gap: 8,
      }}>
        {cards.map((card, i) => {
          const art = getCardImage(card, "art_crop");
          return (
            <div
              key={`${card.id}-${i}`}
              style={{
                position: "relative",
                background: "var(--panel)",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.05)",
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
                  width: "100%",
                  aspectRatio: "4/3",
                  background: "var(--panel2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  color: "var(--muted)",
                  padding: 6,
                  textAlign: "center",
                }}>
                  {card.name}
                </div>
              )}
              <div style={{
                padding: "3px 5px 4px",
                fontSize: 7.5,
                color: "var(--muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {card.name}
              </div>
              <button
                onClick={() => onRemove(cat, card.id)}
                title="Remove"
                style={{
                  position: "absolute",
                  top: 3, right: 3,
                  width: 20, height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,77,109,0.85)",
                  color: "#fff",
                  fontSize: 11,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main PileScreen ───────────────────────────────────────────────────────────

export default function PileScreen({ commander, pile: initialPile, onNewSearch }) {
  const [pile,   setPile]   = useState(initialPile);
  const [copied, setCopied] = useState(false);

  // Group cards by category
  const grouped = useMemo(() => {
    const groups = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    for (const card of pile) {
      const cat = card._deckCategory ?? "plan";
      if (groups[cat]) groups[cat].push(card);
      else groups["plan"].push(card);
    }
    return groups;
  }, [pile]);

  function handleRemove(cat, cardId) {
    setPile(prev => prev.filter(c => !(c.id === cardId && (c._deckCategory ?? "plan") === cat)));
  }

  function handleCopy() {
    const text = buildExport(commander, pile);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleMoxfield() {
    const text = buildExport(commander, pile);
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
        padding: "24px 20px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
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
        <button
          onClick={onNewSearch}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: 11,
            letterSpacing: 2,
            cursor: "pointer",
            fontFamily: "'Bebas Neue', sans-serif",
          }}
        >
          ← NEW SEARCH
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ width: "100%", maxWidth: 600, padding: "20px 20px 60px" }}>

        {/* WREC Score panel */}
        <WRECPanel pile={pile} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "12px 16px",
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
            {copied ? "COPIED ✓" : "COPY DECKLIST"}
          </button>
          <button
            onClick={handleMoxfield}
            disabled={pile.length === 0}
            style={{
              flex: 1,
              padding: "12px 16px",
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
            OPEN IN MOXFIELD ↗
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

        {/* Category sections */}
        {CATEGORY_ORDER.map(cat => (
          <CategorySection
            key={cat}
            cat={cat}
            cards={grouped[cat] ?? []}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
