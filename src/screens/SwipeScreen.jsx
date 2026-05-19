import { useState, useEffect, useRef, useMemo } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const isBasicLand = c => Boolean(c?.type_line?.includes("Basic Land"));
const isAnyNumber = c => Boolean(c?.oracle_text?.includes("A deck can have any number of cards named"));
const isStackable  = c => isBasicLand(c) || isAnyNumber(c);

const SWIPE_THRESHOLD = 60;
const TIP_KEY = "ds_swipe_hint_shown";

const SORT_OPTIONS = [
  { value: "name",   label: "NAME" },
  { value: "cmc",    label: "CMC" },
  { value: "edhrec", label: "EDHREC" },
];



function haptic(pattern = 10) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

export default function SwipeScreen({
  cards, pile, onPileChange,
  maybeboard, onMaybeboardChange,
  onGoToPile, onGoToSearch, onSearchMore, commanderCard, onCommanderCardChange,
  initialIndex, onIndexChange,
  swipeOrder = "name", swipeDir = "desc", onSortChange,
  onGoToBrews,
  activeDeckId, onSavePile,
  onDoubleTag,
}) {
  const effectiveCards = useMemo(() => {
    const pileIds = new Set(pile.filter(c => !isStackable(c) && c.oracle_id).map(c => c.oracle_id));
    const seen = new Set(pileIds);
    const result = [];
    for (const c of cards) {
      if (isStackable(c)) { result.push(c); continue; }
      if (c.oracle_id && seen.has(c.oracle_id)) continue;
      if (c.oracle_id) seen.add(c.oracle_id);
      result.push(c);
    }
    return result;
  }, [cards, pile]);

  const [idx,          setIdx]          = useState(initialIndex ?? 0);
  const [history,      setHistory]      = useState([]);
  const [offset,       setOffset]       = useState(0);
  const [dragging,     setDragging]     = useState(false);
  const [animOut,      setAnimOut]      = useState(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [imgError,     setImgError]     = useState(false);
  const [showTip,      setShowTip]      = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [flipped,      setFlipped]      = useState(false);

  const didMountRef       = useRef(false);
  const dragStartRef      = useRef(null);
  const saveTimerRef      = useRef(null);
  const longPressTimerRef = useRef(null);

  const card = effectiveCards[idx] ?? null;
  const done = idx >= effectiveCards.length;

  useEffect(() => {
    setImgError(false);
    setCardExpanded(false);
    setFlipped(false);
    clearTimeout(longPressTimerRef.current);
  }, [idx]);

  // Preload next 4 art_crop images
  useEffect(() => {
    effectiveCards.slice(idx + 1, idx + 5).forEach(c => {
      const url = getCardImage(c, "large");
      if (url) { const img = new Image(); img.src = url; }
    });
  }, [idx, effectiveCards]);

  useEffect(() => {
    if (!localStorage.getItem(TIP_KEY)) setShowTip(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    onIndexChange?.(idx);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") doResolve(true);
      if (e.key === "ArrowLeft")  doResolve(false);
      if (e.key === "z" || e.key === "Z") doUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => {
    if (!activeDeckId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onSavePile?.(pile), 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [pile, activeDeckId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  function doResolve(keep) {
    if (!card || animOut || done) return;
    dismissTipForever();
    setAnimOut(keep ? "right" : "left");
    haptic(keep ? 12 : 6);
    setTimeout(() => {
      if (keep) {
        const alreadyInPile = !isStackable(card) && card.oracle_id &&
          pile.some(c => c.oracle_id === card.oracle_id);
        if (!alreadyInPile) {
          const cardEntry = { ...card, instanceId: crypto.randomUUID() };
          setHistory(h => [...h, { card: cardEntry, kept: true, maybe: false }]);
          onPileChange(prev => [...prev, cardEntry]);
        }
      } else {
        setHistory(h => [...h, { card, kept: false, maybe: false }]);
      }
      setIdx(i => i + 1);
      setOffset(0); setAnimOut(null);
    }, 260);
  }

  function doMaybe() {
    if (!card || animOut || done) return;
    dismissTipForever();
    setAnimOut("maybe");
    haptic(8);
    setTimeout(() => {
      const cardEntry = { ...card, instanceId: crypto.randomUUID() };
      setHistory(h => [...h, { card: cardEntry, kept: false, maybe: true }]);
      onMaybeboardChange(prev => [...prev, cardEntry]);
      setIdx(i => i + 1);
      setOffset(0); setAnimOut(null);
    }, 260);
  }

  function doUndo() {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (last.kept) {
      onPileChange(pile.filter(c => c.instanceId !== last.card.instanceId));
    } else if (last.maybe) {
      onMaybeboardChange(prev => prev.filter(c => c.instanceId !== last.card.instanceId));
    }
    setIdx(i => Math.max(0, i - 1));
    haptic([4, 20, 4]);
  }

  function dismissTipForever() {
    localStorage.setItem(TIP_KEY, "1");
    setShowTip(false);
  }

  // ── Pointer events ───────────────────────────────────────────────────────────

  function onPointerDown(e) {
    if (animOut || done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = e.clientX;
    setDragging(true);
    const pressedCard = card;
    longPressTimerRef.current = setTimeout(() => {
      onDoubleTag?.(pressedCard?.oracle_id);
    }, 400);
  }

  function onPointerMove(e) {
    if (!dragging || dragStartRef.current === null) return;
    const dx = e.clientX - dragStartRef.current;
    setOffset(dx);
    if (Math.abs(dx) > 5) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onPointerUp(e) {
    if (!dragging) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    setDragging(false);
    const dx = dragStartRef.current !== null ? e.clientX - dragStartRef.current : 0;
    dragStartRef.current = null;
    if (dx > SWIPE_THRESHOLD)       doResolve(true);
    else if (dx < -SWIPE_THRESHOLD) doResolve(false);
    else {
      setOffset(0);
      if (Math.abs(dx) < 10) setCardExpanded(v => !v);
    }
  }

  // ── Derived visuals ──────────────────────────────────────────────────────────

  const artUrl = card ? (flipped ? getCardImage({ ...card, image_uris: card.card_faces?.[1]?.image_uris }, "large") : getCardImage(card, "large") ?? getCardImage(card, "normal")) : null;

  const rotation = animOut === "right" ? 14 : animOut === "left" ? -14 : offset / 22;
  const tx       = animOut === "right" ? 560 : animOut === "left" ? -560 : offset;

  const artTransform = animOut === "maybe"
    ? "translateY(-30px) scale(0.97)"
    : `translateX(${tx}px) rotate(${rotation}deg)`;

  const artOpacity   = animOut ? 0 : 1;
  const artTransition = animOut
    ? "transform 0.26s ease, opacity 0.26s ease"
    : dragging ? "none" : "transform 0.18s ease";

  const commanderName = commanderCard?.name ?? null;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000",
      fontFamily: "'Space Grotesk', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Art layer (the draggable) ── */}
      {!done && (
        <div
          style={{
            position: "absolute", inset: 0,
            transform: artTransform,
            transition: artTransition,
            opacity: artOpacity,
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none", userSelect: "none",
            zIndex: 0,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Art image */}
          {artUrl && !imgError ? (
            <img
              src={artUrl}
              alt={card?.name}
              draggable={false}
              onError={() => setImgError(true)}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "contain", objectPosition: "center center",
                pointerEvents: "none",
              }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              background: "#0d0d0f",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 28, color: "#ffffff", letterSpacing: 2,
                textAlign: "center", padding: "0 32px",
              }}>{card?.name}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.92) 100%)",
            pointerEvents: "none",
          }} />

          {/* Drag intent labels — opacity driven by offset/animOut */}
          <div style={{
            position: "absolute", top: 28, left: 20, zIndex: 5,
            opacity: animOut === "right" ? 0.9 : animOut ? 0 :
                     Math.min(0.85, Math.max(0, (offset - 20) / 60)),
            padding: "5px 12px",
            border: "2.5px solid #6BFF9E", borderRadius: 8,
            color: "#6BFF9E",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 24, letterSpacing: 3,
            transform: "rotate(-12deg)",
            background: "rgba(0,0,0,0.5)",
            pointerEvents: "none",
            transition: dragging ? "none" : "opacity 0.15s ease",
          }}>KEEP</div>
          <div style={{
            position: "absolute", top: 28, right: 20, zIndex: 5,
            opacity: animOut === "left" ? 0.9 : animOut ? 0 :
                     Math.min(0.85, Math.max(0, (-offset - 20) / 60)),
            padding: "5px 12px",
            border: "2.5px solid #FF6B6B", borderRadius: 8,
            color: "#FF6B6B",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 24, letterSpacing: 3,
            transform: "rotate(12deg)",
            background: "rgba(0,0,0,0.5)",
            pointerEvents: "none",
            transition: dragging ? "none" : "opacity 0.15s ease",
          }}>PASS</div>

          {/* Flip button — double-faced cards only */}
          {card?.card_faces?.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setFlipped(f => !f); }}
              style={{
                position: "absolute", bottom: 16, right: 16, zIndex: 5,
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 20,
                padding: "6px 14px",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13, letterSpacing: 2,
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
              }}
            >{flipped ? "FRONT" : "BACK"}</button>
          )}
        </div>
      )}

      {/* ── Stack info strip (top) ── */}
      <div style={{
        position: "absolute",
        top: "env(safe-area-inset-top)",
        left: 0, right: 0,
        zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
        pointerEvents: "none",
      }}>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          {done
            ? `${pile.length} KEPT`
            : `${effectiveCards.length - idx} IN STACK${commanderName ? ` · ${commanderName.toUpperCase()}` : ""}`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          {history.length > 0 && !animOut && (
            <button
              onClick={doUndo}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 11, letterSpacing: 2, cursor: "pointer",
                padding: "2px 6px",
              }}
            >UNDO</button>
          )}
          <button
            onClick={e => { e.stopPropagation(); setSortMenuOpen(o => !o); }}
            style={{
              padding: "3px 8px", borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.5)",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 10, letterSpacing: 1, cursor: "pointer", lineHeight: 1,
            }}
          >
            {SORT_OPTIONS.find(o => o.value === swipeOrder)?.label ?? "SORT"}{" "}
            {swipeDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Sort dropdown */}
      {sortMenuOpen && (
        <div style={{
          position: "absolute",
          top: `calc(env(safe-area-inset-top) + 42px)`,
          right: 20, zIndex: 10,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.9)",
          minWidth: 120,
        }}>
          {SORT_OPTIONS.map(opt => {
            const active = swipeOrder === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onSortChange?.(opt.value, active ? (swipeDir === "asc" ? "desc" : "asc") : swipeDir);
                  setSortMenuOpen(false);
                }}
                style={{
                  display: "block", width: "100%",
                  padding: "10px 14px",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 12, letterSpacing: 2,
                  cursor: "pointer", textAlign: "left",
                }}
              >{opt.label}</button>
            );
          })}
        </div>
      )}



      {/* ── Done state ── */}
      {done && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 16,
        }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32, letterSpacing: 4, color: "#ffffff",
          }}>ALL CARDS SEEN</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
            {pile.length} card{pile.length !== 1 ? "s" : ""} kept
          </div>
          <button
            onClick={onGoToPile}
            style={{
              marginTop: 8, padding: "12px 28px", borderRadius: 10,
              border: "1px solid rgba(91,143,255,0.5)",
              background: "rgba(91,143,255,0.12)",
              color: "var(--primary)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 16, letterSpacing: 3, cursor: "pointer",
            }}
          >VIEW PILE</button>
          <button
            onClick={onSearchMore}
            style={{
              padding: "12px 28px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.45)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 16, letterSpacing: 3, cursor: "pointer",
            }}
          >SEARCH MORE</button>
        </div>
      )}

      {/* ── First-run swipe hint (subtle arrow) ── */}
      {showTip && !done && idx === 0 && !dragging && !animOut && (
        <div style={{
          position: "absolute",
          bottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom) + 32px)`,
          left: 0, right: 0, zIndex: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <style>{`
            @keyframes swipeHint {
              0%   { transform: translateX(-18px); opacity: 0.35; }
              50%  { transform: translateX(18px);  opacity: 0.75; }
              100% { transform: translateX(-18px); opacity: 0.35; }
            }
          `}</style>
          <div style={{
            animation: "swipeHint 1.8s ease-in-out infinite",
            fontSize: 26, color: "rgba(255,255,255,0.65)",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: 4,
          }}>← →</div>
        </div>
      )}
    </div>
  );
}
