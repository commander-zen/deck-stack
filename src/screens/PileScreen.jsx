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
import DeckReviewPill from "../components/DeckReviewPill.jsx";

// ── WREC Score Panel (collapsible) ────────────────────────────────────────────

function WRECPanel({ pile }) {
  const [open, setOpen] = useState(false);
  const { score, ratios } = useMemo(() => computeWREC(pile), [pile]);
  const scoreColor = ratioColor(score);

  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      marginBottom: 20,
      overflow: "hidden",
    }}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
        }}
      >
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 32,
          letterSpacing: 2,
          color: scoreColor,
          lineHeight: 1,
          flexShrink: 0,
        }}>
          {formatScore(score)}
        </span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 14,
          letterSpacing: 3,
          color: "var(--muted)",
          flex: 1,
        }}>
          WREC SCORE
        </span>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▼" : "▶"}</span>
      </button>

      {/* Expanded details */}
      {open && (
        <div style={{ padding: "0 18px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ratios.map(({ cat, count, target, ratio }) => {
              const meta  = CATEGORY_META[cat];
              const color = ratioColor(ratio);
              const ind   = ratioIndicator(ratio);
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, flexShrink: 0, width: 18 }}>{meta.emoji}</span>
                  <span style={{ fontSize: 10, color: "var(--muted)", flex: 1, letterSpacing: 0.5 }}>
                    {meta.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                    {count}/{target}
                  </span>
                  <span style={{ fontSize: 10, color, flexShrink: 0, minWidth: 40, textAlign: "right" }}>
                    {ratio.toFixed(3)}
                  </span>
                  <span style={{ fontSize: 9, color, flexShrink: 0, minWidth: 52, textAlign: "right", letterSpacing: 0.5 }}>
                    {ind}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            fontSize: 9,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: 1,
            textAlign: "center",
          }}>
            1.000 IS PERFECT · GREEN ±0.08 · AMBER ±0.20 · RED OUTSIDE
          </div>
        </div>
      )}
    </div>
  );
}

// ── Text view ─────────────────────────────────────────────────────────────────

function TextView({ pile, grouped, onRemove }) {
  const lines = useMemo(() => buildExport(null, pile).split("\n"), [pile]);
  return (
    <div style={{ background: "var(--panel)", borderRadius: 10, padding: "12px 16px" }}>
      {CATEGORY_ORDER.map(cat => {
        const cards = grouped[cat];
        if (!cards.length) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
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
                  padding: "4px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: "var(--text)", letterSpacing: 0.3 }}>
                  1 {card.name}
                </span>
                <button
                  onClick={() => onRemove(cat, card.id)}
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
        );
      })}
    </div>
  );
}

// ── Visual view ───────────────────────────────────────────────────────────────

function CategorySection({ cat, cards, onRemove }) {
  const meta   = CATEGORY_META[cat];
  const target = meta.target;
  if (!cards.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        marginBottom: 10,
        padding: "0 2px",
      }}>
        <span style={{ fontSize: 15 }}>{meta.emoji}</span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 15,
          letterSpacing: 3,
          color: "var(--text)",
        }}>
          {meta.label.toUpperCase()}
        </span>
        <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 1 }}>TARGET {target}</span>
        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>{cards.length}</span>
      </div>

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
                <img src={art} alt={card.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{
                  width: "100%", aspectRatio: "4/3",
                  background: "var(--panel2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "var(--muted)", padding: 6, textAlign: "center",
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
                style={{
                  position: "absolute", top: 3, right: 3,
                  width: 20, height: 20, borderRadius: "50%",
                  border: "none", background: "rgba(255,77,109,0.85)",
                  color: "#fff", fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
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

export default function PileScreen({ commander, pile: initialPile, onNewSearch, onAddMore }) {
  const [pile,   setPile]   = useState(initialPile);
  const [view,   setView]   = useState("visual"); // "visual" | "text"
  const [copied, setCopied] = useState(false);

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

  function handlePillRemove(cardId, cat) {
    handleRemove(cat, cardId);
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
            {commander && <span style={{ opacity: 0.6 }}> · {commander.name}</span>}
          </div>
        </div>
        <button
          onClick={onNewSearch}
          style={{
            padding: "7px 12px",
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
      <div style={{ width: "100%", maxWidth: 600, padding: "18px 20px 100px" }}>

        {/* WREC Score panel (collapsed by default) */}
        <WRECPanel pile={pile} />

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

          {onAddMore && (
            <button
              onClick={() => onAddMore(pile)}
              style={{
                flex: 1,
                padding: "11px 12px",
                borderRadius: 10,
                border: "1px solid rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.06)",
                color: "var(--active)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13, letterSpacing: 2,
                cursor: "pointer",
              }}
            >
              + MORE
            </button>
          )}
        </div>

        {/* Text / Visual toggle */}
        <div style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
        }}>
          {[["visual", "VISUAL"], ["text", "TEXT"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: view === v ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                background: view === v ? "var(--panel)" : "transparent",
                color: view === v ? "var(--text)" : "var(--muted)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 12,
                letterSpacing: 2,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
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

        {/* Deck content */}
        {pile.length > 0 && view === "visual" && (
          CATEGORY_ORDER.map(cat => (
            <CategorySection
              key={cat}
              cat={cat}
              cards={grouped[cat] ?? []}
              onRemove={handleRemove}
            />
          ))
        )}

        {pile.length > 0 && view === "text" && (
          <TextView pile={pile} grouped={grouped} onRemove={handleRemove} />
        )}
      </div>

      {/* DeckReviewPill */}
      <DeckReviewPill pile={pile} onRemove={handlePillRemove} />
    </div>
  );
}
