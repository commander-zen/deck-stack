import { useState, useEffect, useRef, useCallback } from "react";
import {
  getCardImage,
  formatManaCost,
  formatPrice,
  autocompleteCardNames,
  fetchCardByName,
} from "../lib/scryfall.js";
import { CATEGORY_META, CATEGORY_ORDER } from "../lib/wrec.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60; // px
const BOTTOM_BAR_H   = 60; // px

const SORT_OPTIONS = [
  { key: "edhrec",     label: "EDHREC"  },
  { key: "cmc-asc",    label: "MV ↑"    },
  { key: "cmc-desc",   label: "MV ↓"    },
  { key: "alpha",      label: "A→Z"     },
  { key: "price-asc",  label: "$ ↑"     },
  { key: "price-desc", label: "$ ↓"     },
];

const FILTER_CHIPS = CATEGORY_ORDER.map(cat => ({
  key:   cat,
  label: `${CATEGORY_META[cat].emoji} ${CATEGORY_META[cat].label}`,
}));

function sortCards(cards, key) {
  switch (key) {
    case "cmc-asc":    return [...cards].sort((a, b) => (a.cmc ?? 0) - (b.cmc ?? 0));
    case "cmc-desc":   return [...cards].sort((a, b) => (b.cmc ?? 0) - (a.cmc ?? 0));
    case "alpha":      return [...cards].sort((a, b) => a.name.localeCompare(b.name));
    case "price-asc":  return [...cards].sort((a, b) => (parseFloat(a.prices?.usd) || 0) - (parseFloat(b.prices?.usd) || 0));
    case "price-desc": return [...cards].sort((a, b) => (parseFloat(b.prices?.usd) || 0) - (parseFloat(a.prices?.usd) || 0));
    default:           return cards;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SwipeScreen({
  commander,
  resumeState,   // { cards, index, pile, history } — optional, to resume after Done screen
  initialCards,
  onComplete,    // (pile, savedState) — called when user clicks I'M DONE or all cards exhausted
}) {
  // ── Core swipe state ──────────────────────────────────────────────────────
  const [cards,   setCards]   = useState(() => resumeState?.cards   ?? initialCards ?? []);
  const [index,   setIndex]   = useState(() => resumeState?.index   ?? 0);
  const [pile,    setPile]    = useState(() => resumeState?.pile    ?? []);
  const [history, setHistory] = useState(() => resumeState?.history ?? []);

  // ── Drag / animation ──────────────────────────────────────────────────────
  const [offset,   setOffset]  = useState(0);
  const [dragging, setDragging]= useState(false);
  const [badge,    setBadge]   = useState(null);  // "keep" | "pass" | null
  const [animOut,  setAnimOut] = useState(null);  // "right" | "left" | null

  // ── Sort / filter ─────────────────────────────────────────────────────────
  const [sortKey,       setSortKey]      = useState("edhrec");
  const [activeFilters, setActiveFilters]= useState(new Set());
  const [filterOpen,    setFilterOpen]  = useState(false);

  // ── Bottom search bar ─────────────────────────────────────────────────────
  const [searchVal,   setSearchVal]  = useState("");
  const [searchSuggs, setSearchSuggs]= useState([]);
  const [searchOpen,  setSearchOpen] = useState(false);
  const [searchBusy,  setSearchBusy] = useState(false);

  const originalRef  = useRef([...(resumeState?.cards ?? initialCards ?? [])]);
  // Seed swipedIds from history when resuming, so EDHREC sort excludes already-seen cards
  const swipedIds    = useRef(
    new Set((resumeState?.history ?? []).map(h => h.card.id))
  );
  const dragStartRef = useRef(null);
  const searchRef    = useRef(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const done = index >= cards.length;
  const card = cards[index] ?? null;

  // Notify parent when all cards exhausted
  useEffect(() => {
    if (done) {
      onComplete(pile, { cards, index, pile, history });
    }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") doResolve(true);
      if (e.key === "ArrowLeft")  doResolve(false);
      if (e.key === "z" || e.key === "Z") doUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // intentionally re-registers every render so callbacks capture fresh state

  // ── Autocomplete debounce ─────────────────────────────────────────────────
  useEffect(() => {
    if (!searchVal.trim()) { setSearchSuggs([]); setSearchOpen(false); return; }
    const timer = setTimeout(async () => {
      const names = await autocompleteCardNames(searchVal);
      setSearchSuggs(names);
      setSearchOpen(names.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // ── Resolve (keep / pass) ─────────────────────────────────────────────────
  function doResolve(keep) {
    if (!card || animOut || done) return;
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
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  function doUndo() {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    swipedIds.current.delete(last.card.id);
    setHistory(h => h.slice(0, -1));
    if (last.kept) setPile(p => p.filter(c => c !== last.card));
    setIndex(i => i - 1);
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  function handleSort(key) {
    setSortKey(key);
    setCards(prev => {
      const swiped    = prev.slice(0, index);
      const remaining = key === "edhrec"
        ? originalRef.current.filter(c => !swipedIds.current.has(c.id))
        : sortCards(prev.slice(index), key);
      return [...swiped, ...remaining];
    });
  }

  // ── Category filter ───────────────────────────────────────────────────────
  function handleFilterToggle(cat) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      setCards(cardsPrev => {
        const swiped    = cardsPrev.slice(0, index);
        const remaining = cardsPrev.slice(index);
        if (next.size === 0) return [...swiped, ...remaining];
        const matching = remaining.filter(c => next.has(c._deckCategory ?? "plan"));
        const other    = remaining.filter(c => !next.has(c._deckCategory ?? "plan"));
        return [...swiped, ...matching, ...other];
      });
      return next;
    });
  }

  function handleFilterClear() {
    setActiveFilters(new Set());
    setCards(prev => [...prev.slice(0, index), ...prev.slice(index)]);
  }

  // ── Insert card at front of queue ─────────────────────────────────────────
  async function addCardToFront(name) {
    setSearchVal("");
    setSearchSuggs([]);
    setSearchOpen(false);
    setSearchBusy(true);
    try {
      const fetched = await fetchCardByName(name);
      const tagged  = { ...fetched, _deckCategory: "plan" };
      originalRef.current = [tagged, ...originalRef.current];
      setCards(prev => {
        const swiped    = prev.slice(0, index);
        const remaining = prev.slice(index);
        return [...swiped, tagged, ...remaining];
      });
    } catch {
      // card not found — silently ignore
    } finally {
      setSearchBusy(false);
      searchRef.current?.focus();
    }
  }

  // ── I'M DONE (manual trigger) ─────────────────────────────────────────────
  function handleDone() {
    onComplete(pile, { cards, index, pile, history });
  }

  // ── Pointer drag ──────────────────────────────────────────────────────────
  function onPointerDown(e) {
    if (animOut || done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = e.clientX;
    setDragging(true);
  }

  function onPointerMove(e) {
    if (!dragging || dragStartRef.current === null) return;
    const dx = e.clientX - dragStartRef.current;
    setOffset(dx);
    if (dx > SWIPE_THRESHOLD)       setBadge("keep");
    else if (dx < -SWIPE_THRESHOLD) setBadge("pass");
    else                             setBadge(null);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    setDragging(false);
    const dx = dragStartRef.current !== null ? e.clientX - dragStartRef.current : 0;
    dragStartRef.current = null;
    if (dx > SWIPE_THRESHOLD)       doResolve(true);
    else if (dx < -SWIPE_THRESHOLD) doResolve(false);
    else { setOffset(0); setBadge(null); }
  }

  // ── Images / display values ───────────────────────────────────────────────
  const commanderArt = commander ? getCardImage(commander, "art_crop") : null;
  const artUrl       = card ? getCardImage(card, "art_crop") : null;
  const mainUrl      = card ? getCardImage(card, "normal")   : null;

  const rotation = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx       = animOut ? (animOut === "right" ? 560 : -560) : offset;
  const cardOpacity = animOut ? 0 : 1;

  const catKey   = card?._deckCategory ?? "plan";
  const catMeta  = CATEGORY_META[catKey];
  const catLabel = catMeta ? `${catMeta.emoji} ${catMeta.label}` : "";
  const price    = card ? formatPrice(card) : null;
  const counterStr = `${Math.min(index + 1, cards.length)} / ${cards.length} · ${pile.length} kept`;

  if (done) return null; // parent handles transition

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100dvh",
      maxHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'IBM Plex Mono', monospace",
      overflow: "hidden",
      position: "relative",
      maxWidth: 600,
      margin: "0 auto",
      width: "100%",
    }}>

      {/* Blurred background */}
      {artUrl && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${artUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(28px) brightness(0.12)",
          transform: "scale(1.1)",
          pointerEvents: "none",
        }} />
      )}

      {/* ── Top bar ── */}
      <div style={{
        position: "relative",
        zIndex: 20,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 10,
        height: 52,
        background: "rgba(13,13,15,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        {commanderArt && (
          <img
            src={commanderArt}
            alt=""
            style={{ height: 30, width: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
          />
        )}
        <span style={{
          flex: 1,
          fontSize: 11,
          color: "var(--text)",
          letterSpacing: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {commander?.name ?? "DECK STACK"}
        </span>
        <button
          onClick={handleDone}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--success)",
            background: "rgba(52,211,153,0.08)",
            color: "var(--success)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13,
            letterSpacing: 3,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ✓ I'M DONE
        </button>
      </div>

      {/* ── Sort chips ── */}
      <div style={{
        position: "relative",
        zIndex: 15,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        overflowX: "auto",
        scrollbarWidth: "none",
        background: "rgba(13,13,15,0.7)",
      }}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => handleSort(opt.key)}
            style={{
              whiteSpace: "nowrap",
              padding: "5px 12px",
              borderRadius: 20,
              flexShrink: 0,
              border: `1px solid ${sortKey === opt.key ? "var(--secondary)" : "rgba(255,255,255,0.1)"}`,
              background: sortKey === opt.key ? "rgba(167,139,250,0.18)" : "transparent",
              color: sortKey === opt.key ? "var(--secondary)" : "var(--muted)",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setFilterOpen(v => !v)}
          style={{
            marginLeft: "auto",
            whiteSpace: "nowrap",
            padding: "5px 12px",
            borderRadius: 20,
            flexShrink: 0,
            border: `1px solid ${filterOpen || activeFilters.size > 0 ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
            background: filterOpen || activeFilters.size > 0 ? "rgba(91,143,255,0.15)" : "transparent",
            color: filterOpen || activeFilters.size > 0 ? "var(--primary)" : "var(--muted)",
            fontSize: 11,
            cursor: "pointer",
            transition: "all 0.12s",
          }}
        >
          FILTER{activeFilters.size > 0 ? ` (${activeFilters.size})` : ""}
        </button>
      </div>

      {/* ── Filter drawer ── */}
      {filterOpen && (
        <div style={{
          position: "relative",
          zIndex: 15,
          flexShrink: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          padding: "8px 12px",
          background: "rgba(22,22,26,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          {FILTER_CHIPS.map(({ key, label }) => {
            const active = activeFilters.has(key);
            return (
              <button
                key={key}
                onClick={() => handleFilterToggle(key)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  border: `1px solid ${active ? "var(--active)" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(245,158,11,0.15)" : "transparent",
                  color: active ? "var(--active)" : "var(--muted)",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                {label}
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={handleFilterClear}
              style={{
                padding: "5px 11px",
                borderRadius: 20,
                border: "1px solid rgba(255,77,109,0.3)",
                background: "transparent",
                color: "var(--danger)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* ── Card area ── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        paddingBottom: 8,
      }}>
        {/* Counter */}
        <div style={{
          fontSize: 11,
          color: "var(--muted)",
          letterSpacing: 2,
          marginBottom: 8,
          flexShrink: 0,
        }}>
          {counterStr}
        </div>

        {/* Card (swipeable) */}
        <div
          style={{
            transform: `translateX(${tx}px) rotate(${rotation}deg)`,
            transition: animOut
              ? "transform 0.26s ease, opacity 0.26s ease"
              : dragging ? "none" : "transform 0.18s ease",
            opacity: cardOpacity,
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
            position: "relative",
            flexShrink: 0,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {badge === "keep" && (
            <div style={{
              position: "absolute", top: 14, right: 14, zIndex: 20,
              padding: "6px 14px",
              border: "3px solid var(--success)", borderRadius: 8,
              color: "var(--success)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26, letterSpacing: 4,
              transform: "rotate(-15deg)",
              background: "rgba(0,0,0,0.55)",
            }}>KEEP</div>
          )}
          {badge === "pass" && (
            <div style={{
              position: "absolute", top: 14, left: 14, zIndex: 20,
              padding: "6px 14px",
              border: "3px solid var(--danger)", borderRadius: 8,
              color: "var(--danger)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26, letterSpacing: 4,
              transform: "rotate(15deg)",
              background: "rgba(0,0,0,0.55)",
            }}>PASS</div>
          )}

          {mainUrl ? (
            <img
              src={mainUrl}
              alt={card?.name}
              draggable={false}
              style={{
                width: "min(82vw, 300px)",
                borderRadius: 14,
                boxShadow: "0 18px 56px rgba(0,0,0,0.8)",
                display: "block",
                pointerEvents: "none",
              }}
            />
          ) : (
            <div style={{
              width: 260, height: 362,
              background: "var(--panel)", borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted)", fontSize: 13,
              padding: 16, textAlign: "center",
            }}>
              {card?.name}
            </div>
          )}
        </div>

        {/* Card info */}
        <div style={{ textAlign: "center", marginTop: 12, padding: "0 16px", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{card?.name}</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
            {card?.type_line}
            {card?.mana_cost ? ` · ${formatManaCost(card.mana_cost)}` : ""}
            {price ? ` · ${price}` : ""}
          </div>
          {catLabel && (
            <div style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.2)",
              marginTop: 3,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}>
              {catLabel}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 14,
          flexShrink: 0,
        }}>
          <button
            onClick={() => doResolve(false)}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "2px solid var(--danger)",
              background: "rgba(255,77,109,0.1)",
              color: "var(--danger)", fontSize: 22,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>

          <button
            onClick={doUndo}
            disabled={history.length === 0}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: history.length > 0 ? "var(--secondary)" : "rgba(255,255,255,0.15)",
              fontSize: 11, letterSpacing: 1,
              cursor: history.length > 0 ? "pointer" : "default",
            }}
          >UNDO</button>

          <button
            onClick={() => doResolve(true)}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "2px solid var(--success)",
              background: "rgba(52,211,153,0.1)",
              color: "var(--success)", fontSize: 22,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >♥</button>
        </div>

        {/* Keyboard hint */}
        <div style={{
          marginTop: 8,
          fontSize: 9,
          color: "rgba(255,255,255,0.16)",
          letterSpacing: 2,
          flexShrink: 0,
        }}>
          ← PASS &nbsp;&nbsp; KEEP → &nbsp;&nbsp; Z UNDO
        </div>
      </div>

      {/* ── Fixed bottom search bar ── */}
      <div style={{
        position: "relative",
        zIndex: 20,
        flexShrink: 0,
        height: BOTTOM_BAR_H,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(22,22,26,0.98)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 10,
      }}>
        {/* Autocomplete dropdown */}
        {searchOpen && searchSuggs.length > 0 && (
          <div style={{
            position: "absolute",
            bottom: BOTTOM_BAR_H,
            left: 0, right: 0,
            background: "var(--panel)",
            borderTop: "1px solid rgba(91,143,255,0.15)",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
            overflow: "hidden",
            maxHeight: 280,
            overflowY: "auto",
          }}>
            {searchSuggs.map(name => (
              <button
                key={name}
                onMouseDown={e => { e.preventDefault(); addCardToFront(name); }}
                style={{
                  width: "100%",
                  display: "block",
                  padding: "11px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  letterSpacing: 0.4,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <span style={{ color: "var(--muted)", fontSize: 16, flexShrink: 0, lineHeight: 1 }}>+</span>
        <input
          ref={searchRef}
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          onFocus={() => searchSuggs.length > 0 && setSearchOpen(true)}
          placeholder="Add a card to your queue…"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 13,
            caretColor: "var(--primary)",
          }}
        />
        {searchBusy && (
          <span style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>…</span>
        )}
      </div>
    </div>
  );
}
