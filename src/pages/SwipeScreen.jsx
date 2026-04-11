import { useState, useEffect, useRef, useCallback } from "react";
import { getCardImage, formatManaCost } from "../lib/scryfall.js";

const SWIPE_THRESHOLD = 40; // px

// ── Sort ──────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "edhrec",     label: "EDHREC"  },
  { key: "cmc-asc",    label: "MV ↑"    },
  { key: "cmc-desc",   label: "MV ↓"    },
  { key: "alpha",      label: "A→Z"     },
  { key: "price-asc",  label: "$ ↑"     },
  { key: "price-desc", label: "$ ↓"     },
];

function sortComparator(a, b, key) {
  switch (key) {
    case "cmc-asc":    return (a.cmc ?? 0) - (b.cmc ?? 0);
    case "cmc-desc":   return (b.cmc ?? 0) - (a.cmc ?? 0);
    case "alpha":      return a.name.localeCompare(b.name);
    case "price-asc":  return (parseFloat(a.prices?.usd) || 0) - (parseFloat(b.prices?.usd) || 0);
    case "price-desc": return (parseFloat(b.prices?.usd) || 0) - (parseFloat(a.prices?.usd) || 0);
    default:           return 0;
  }
}

// ── Veggie filter categories ──────────────────────────────────────────────────

const VEG_CHIPS = [
  { key: "ramp",           label: "🌱 Ramp"           },
  { key: "card-advantage", label: "📖 Card Advantage"  },
  { key: "disruption",     label: "✂️ Disruption"      },
  { key: "mass-disruption",label: "💥 Mass Disruption" },
  { key: "lands",          label: "🗺️ Lands"           },
  { key: "affiliated",     label: "⭐ Affiliated"      },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SwipeScreen({ initialCards, onDone, onBack, onLoadMore, commander = null, vegCategories = null }) {
  const [cards,   setCards]   = useState(initialCards);
  const [index,   setIndex]   = useState(0);
  const [pile,    setPile]    = useState([]);
  const [history, setHistory] = useState([]); // [{card, kept}] for undo
  const [badge,   setBadge]   = useState(null); // "keep" | "pass" | null
  const [offset,  setOffset]  = useState(0);   // current drag x offset
  const [dragging,setDragging]= useState(false);
  const [animOut, setAnimOut] = useState(null); // "left" | "right" | null

  // Commander-mode state
  const [sortOrder,        setSortOrder]        = useState("edhrec");
  const [activeVegFilters, setActiveVegFilters] = useState(new Set());
  const [filterOpen,       setFilterOpen]       = useState(false);

  // Refs for sort/filter operations
  const originalCardsRef = useRef([...initialCards]);
  const swipedIds        = useRef(new Set());
  const dragStart        = useRef(null);

  const card = cards[index] ?? null;
  const done = index >= cards.length;

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") resolve(true);
      if (e.key === "ArrowLeft")  resolve(false);
      if (e.key === "z" || e.key === "Z") handleUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Core resolve ──────────────────────────────────────────────────────────
  const resolve = useCallback((keep) => {
    if (!card || animOut) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");
    setTimeout(() => {
      swipedIds.current.add(card.id);
      setHistory(h => [...h, { card, kept: keep }]);
      if (keep) setPile(p => [...p, card]);
      setIndex(i => i + 1);
      setOffset(0);
      setBadge(null);
      setAnimOut(null);
    }, 260);
  }, [card, animOut]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    swipedIds.current.delete(last.card.id);
    setHistory(h => h.slice(0, -1));
    if (last.kept) setPile(p => p.filter(c => c !== last.card));
    setIndex(i => i - 1);
  }, [history, animOut]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    setSortOrder(key);
    setCards(prev => {
      const swiped    = prev.slice(0, index);
      let remaining;
      if (key === "edhrec") {
        // Restore original fetch order for unswiped cards
        remaining = originalCardsRef.current.filter(c => !swipedIds.current.has(c.id));
      } else {
        remaining = [...prev.slice(index)].sort((a, b) => sortComparator(a, b, key));
      }
      return [...swiped, ...remaining];
    });
  };

  // ── Veggie filter ─────────────────────────────────────────────────────────
  const handleVegFilterToggle = (cat) => {
    setActiveVegFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      // Reorder: matching-first, then non-matching
      setCards(cardsPrev => {
        const swiped    = cardsPrev.slice(0, index);
        const remaining = cardsPrev.slice(index);
        if (next.size === 0) return [...swiped, ...remaining];
        const matching  = remaining.filter(c => next.has(c._vegCategory));
        const other     = remaining.filter(c => !next.has(c._vegCategory));
        return [...swiped, ...matching, ...other];
      });
      return next;
    });
  };

  // ── Load more (preserves original order ref) ──────────────────────────────
  const addMoreCards = (moreCards) => {
    originalCardsRef.current = [...originalCardsRef.current, ...moreCards];
    setCards(prev => [...prev, ...moreCards]);
  };

  // ── Pointer drag ──────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    dragStart.current = e.clientX;
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!dragging || dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    setOffset(dx);
    if (dx > SWIPE_THRESHOLD)       setBadge("keep");
    else if (dx < -SWIPE_THRESHOLD) setBadge("pass");
    else                             setBadge(null);
  };
  const onPointerUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (dx > SWIPE_THRESHOLD)       resolve(true);
    else if (dx < -SWIPE_THRESHOLD) resolve(false);
    else { setOffset(0); setBadge(null); }
  };

  // ── Images ────────────────────────────────────────────────────────────────
  const artUrl  = card ? getCardImage(card, "art_crop") : null;
  const mainUrl = card ? getCardImage(card, "normal")   : null;

  // ── Commander badge art ───────────────────────────────────────────────────
  const commanderArt = commander ? getCardImage(commander, "art_crop") : null;

  // ── Counter (reflects active filter) ─────────────────────────────────────
  const isFiltered      = activeVegFilters.size > 0;
  const filteredTotal   = isFiltered
    ? cards.filter(c => activeVegFilters.has(c._vegCategory)).length
    : cards.length;
  const filteredSwiped  = isFiltered
    ? cards.slice(0, index).filter(c => activeVegFilters.has(c._vegCategory)).length
    : index;
  const counterDisplay  = `${filteredSwiped + 1} / ${filteredTotal}`;

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace", padding: 32, textAlign: "center",
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 6, color: "var(--primary)", lineHeight: 1 }}>
          STACK DONE
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", margin: "12px 0 32px", letterSpacing: 1 }}>
          {pile.length} card{pile.length !== 1 ? "s" : ""} kept out of {cards.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          <button
            onClick={() => onDone(pile)}
            style={{
              padding: "14px 32px", borderRadius: 12, border: "none",
              background: "var(--success)", color: "#0a1a0f",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3, cursor: "pointer",
            }}
          >
            REVIEW PILE →
          </button>
          {onLoadMore && (
            <button
              onClick={() => onLoadMore(addMoreCards)}
              style={{
                padding: "14px 32px", borderRadius: 12,
                border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.07)", color: "#fbbf24",
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3, cursor: "pointer",
              }}
            >
              I'M A SICKO, MORE CARDS
            </button>
          )}
          <button
            onClick={onBack}
            style={{
              padding: "14px 32px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--muted)",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3, cursor: "pointer",
            }}
          >
            NEW SEARCH
          </button>
        </div>
      </div>
    );
  }

  // ── Swipe card ────────────────────────────────────────────────────────────
  const rotation = (animOut ? (animOut === "right" ? 12 : -12) : offset / 20);
  const tx       = animOut ? (animOut === "right" ? 500 : -500) : offset;
  const opacity  = animOut ? 0 : 1;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex",
      flexDirection: "column", alignItems: "center",
      fontFamily: "'IBM Plex Mono', monospace", overflow: "hidden", position: "relative",
    }}>
      {/* Blurred art background */}
      {artUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: `url(${artUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(24px) brightness(0.18)",
          transform: "scale(1.1)",
        }} />
      )}

      {/* ── Commander badge strip (easy mode only) ── */}
      {commander && (
        <div style={{
          position: "relative", zIndex: 11,
          width: "100%", height: 36,
          background: "rgba(6,4,15,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          gap: 10, padding: "0 14px",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {commanderArt && (
            <img
              src={commanderArt}
              alt=""
              style={{ height: 26, width: 38, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
            />
          )}
          <span style={{ fontSize: 11, color: "var(--text)", letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {commander.name}
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 2, whiteSpace: "nowrap" }}>
            COMMANDER
          </span>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: 480,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none", color: "var(--muted)",
          fontSize: 12, letterSpacing: 1, cursor: "pointer",
        }}>
          ← BACK
        </button>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 2 }}>
          {counterDisplay}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={handleUndo} disabled={history.length === 0} style={{
            background: "transparent", border: "none",
            color: history.length > 0 ? "var(--secondary)" : "rgba(255,255,255,0.15)",
            fontSize: 12, letterSpacing: 1, cursor: history.length > 0 ? "pointer" : "default",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            UNDO ↺
          </button>
          <button onClick={() => onDone(pile)} style={{
            background: "transparent", border: "none", color: "var(--danger)",
            fontSize: 12, letterSpacing: 1, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            EJECT ⏏
          </button>
        </div>
      </div>

      {/* ── Sort row (easy mode only) ── */}
      {commander && (
        <div style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 480,
          display: "flex", alignItems: "center",
          gap: 6, padding: "0 16px 8px",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          flexShrink: 0,
        }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleSort(opt.key)}
              style={{
                whiteSpace: "nowrap", padding: "5px 11px",
                borderRadius: 20, flexShrink: 0,
                border: `1px solid ${sortOrder === opt.key ? "var(--secondary)" : "rgba(255,255,255,0.1)"}`,
                background: sortOrder === opt.key ? "rgba(167,139,250,0.15)" : "transparent",
                color: sortOrder === opt.key ? "var(--secondary)" : "var(--muted)",
                fontSize: 11, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
          {/* Filter toggle */}
          <button
            onClick={() => setFilterOpen(v => !v)}
            style={{
              marginLeft: "auto", whiteSpace: "nowrap", padding: "5px 11px",
              borderRadius: 20, flexShrink: 0,
              border: `1px solid ${filterOpen || activeVegFilters.size > 0 ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
              background: filterOpen || activeVegFilters.size > 0 ? "rgba(91,143,255,0.15)" : "transparent",
              color: filterOpen || activeVegFilters.size > 0 ? "var(--primary)" : "var(--muted)",
              fontSize: 11, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              transition: "all 0.15s",
            }}
          >
            FILTER ☰{activeVegFilters.size > 0 ? ` (${activeVegFilters.size})` : ""}
          </button>
        </div>
      )}

      {/* ── Filter drawer (easy mode only) ── */}
      {commander && filterOpen && (
        <div style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 480,
          padding: "0 16px 12px",
          display: "flex", flexWrap: "wrap", gap: 8,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginBottom: 4,
        }}>
          {VEG_CHIPS.map(({ key, label }) => {
            const available = !vegCategories || vegCategories.includes(key);
            const active    = activeVegFilters.has(key);
            return (
              <button
                key={key}
                disabled={!available}
                onClick={() => available && handleVegFilterToggle(key)}
                style={{
                  padding: "6px 13px", borderRadius: 20, whiteSpace: "nowrap",
                  border: `1px solid ${active ? "var(--active)" : available ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
                  background: active ? "color-mix(in srgb, var(--active) 15%, transparent)" : "transparent",
                  color: active ? "var(--active)" : available ? "var(--muted)" : "rgba(255,255,255,0.2)",
                  fontSize: 11, cursor: available ? "pointer" : "default",
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
          {activeVegFilters.size > 0 && (
            <button
              onClick={() => {
                setActiveVegFilters(new Set());
                // Restore all remaining cards (no filtering)
                setCards(prev => {
                  const swiped    = prev.slice(0, index);
                  const remaining = prev.slice(index);
                  return [...swiped, ...remaining];
                });
              }}
              style={{
                padding: "6px 13px", borderRadius: 20,
                border: "1px solid rgba(255,77,109,0.3)",
                background: "transparent", color: "var(--danger)",
                fontSize: 11, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* Pile counter */}
      <div style={{
        position: "relative", zIndex: 10, fontSize: 11, color: "var(--success)",
        letterSpacing: 2, marginBottom: 12,
      }}>
        {pile.length} KEPT
      </div>

      {/* Card */}
      <div
        style={{
          position: "relative", zIndex: 10,
          transform: `translateX(${tx}px) rotate(${rotation}deg)`,
          transition: animOut ? "transform 0.25s ease, opacity 0.25s ease" : dragging ? "none" : "transform 0.2s ease",
          opacity,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Badge */}
        {badge && (
          <div style={{
            position: "absolute", top: 16, zIndex: 20,
            ...(badge === "keep" ? { right: 16 } : { left: 16 }),
            padding: "8px 16px", borderRadius: 8,
            border: `3px solid ${badge === "keep" ? "var(--success)" : "var(--danger)"}`,
            color: badge === "keep" ? "var(--success)" : "var(--danger)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28, letterSpacing: 4,
            transform: `rotate(${badge === "keep" ? -15 : 15}deg)`,
            background: "rgba(0,0,0,0.6)",
          }}>
            {badge === "keep" ? "KEEP" : "PASS"}
          </div>
        )}

        {mainUrl ? (
          <img
            src={mainUrl}
            alt={card.name}
            draggable={false}
            style={{
              width: "min(90vw, 380px)",
              borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
              display: "block",
            }}
          />
        ) : (
          <div style={{
            width: 280, height: 390, background: "var(--panel)", borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted)", fontSize: 12,
          }}>
            {card.name}
          </div>
        )}
      </div>

      {/* Card info */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", marginTop: 16, padding: "0 20px" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{card.name}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          {card.type_line}
          {card.mana_cost ? ` · ${formatManaCost(card.mana_cost)}` : ""}
        </div>
        {commander && card._vegCategory && (
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 3, letterSpacing: 2 }}>
            {card._vegCategory.toUpperCase()}
          </div>
        )}
      </div>

      {/* Swipe buttons */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", gap: 32, marginTop: 28 }}>
        <button
          onClick={() => resolve(false)}
          style={{
            width: 64, height: 64, borderRadius: "50%",
            border: "2px solid var(--danger)",
            background: "rgba(255,77,109,0.1)", color: "var(--danger)",
            fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>
        <button
          onClick={() => resolve(true)}
          style={{
            width: 64, height: 64, borderRadius: "50%",
            border: "2px solid var(--success)",
            background: "rgba(52,211,153,0.1)", color: "var(--success)",
            fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ♥
        </button>
      </div>

      {/* Keyboard hint */}
      <div style={{ position: "relative", zIndex: 10, marginTop: 16, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
        ← PASS &nbsp;&nbsp; KEEP → &nbsp;&nbsp; Z UNDO
      </div>
    </div>
  );
}
