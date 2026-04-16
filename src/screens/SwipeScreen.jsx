import { useState, useEffect, useRef } from "react";
import { getCardImage, formatManaCost, formatPrice } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const SWIPE_THRESHOLD = 60;

export default function SwipeScreen({ cards, pile, onPileChange }) {
  const [idx,     setIdx]     = useState(0);
  const [history, setHistory] = useState([]);

  // drag / animation
  const [offset,   setOffset]  = useState(0);
  const [dragging, setDragging]= useState(false);
  const [badge,    setBadge]   = useState(null);   // "keep" | "pass" | null
  const [animOut,  setAnimOut] = useState(null);   // "right" | "left" | null

  const dragStartRef = useRef(null);

  const card = cards[idx] ?? null;
  const done = idx >= cards.length;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") doResolve(true);
      if (e.key === "ArrowLeft")  doResolve(false);
      if (e.key === "z" || e.key === "Z") doUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // re-registers each render so callbacks close over fresh state

  function doResolve(keep) {
    if (!card || animOut || done) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");
    setTimeout(() => {
      setHistory(h => [...h, { card, kept: keep }]);
      if (keep) onPileChange([...pile, card]);
      setIdx(i => i + 1);
      setOffset(0);
      setBadge(null);
      setAnimOut(null);
    }, 260);
  }

  function doUndo() {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (last.kept) onPileChange(pile.filter(c => c !== last.card));
    setIdx(i => Math.max(0, i - 1));
  }

  // Pointer drag
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

  // Display values
  const artUrl  = card ? getCardImage(card, "art_crop") : null;
  const mainUrl = card ? getCardImage(card, "normal")   : null;
  const price   = card ? formatPrice(card) : null;

  const rotation    = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx          = animOut ? (animOut === "right" ? 560 : -560) : offset;
  const cardOpacity = animOut ? 0 : 1;

  const counterStr = done
    ? `${pile.length} KEPT`
    : `${idx + 1} / ${cards.length} · ${pile.length} KEPT`;

  const NAV_BOTTOM_PAD = `calc(${NAV_HEIGHT}px + max(10px, env(safe-area-inset-bottom)))`;

  return (
    <div style={{
      height: "100dvh",
      maxHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
      position: "relative",
      maxWidth: 600,
      margin: "0 auto",
      width: "100%",
    }}>

      {/* Blurred art background */}
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
        padding: "0 14px",
        height: 52,
        background: "rgba(13,13,15,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        <span style={{
          flex: 1,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18,
          letterSpacing: 4,
          color: "var(--primary)",
        }}>
          DECK STACK
        </span>
      </div>

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
        paddingTop: 14,
        paddingBottom: 8,
      }}>

        {/* Counter */}
        <div style={{
          fontSize: 12,
          color: done ? "var(--success)" : "rgba(255,255,255,0.5)",
          letterSpacing: 2,
          marginBottom: 8,
          flexShrink: 0,
          fontFamily: "'Bebas Neue', sans-serif",
        }}>
          {counterStr}
        </div>

        {done ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            textAlign: "center",
          }}>
            <div style={{
              width: "min(88vw, 300px)",
              aspectRatio: "63/88",
              background: "var(--panel)",
              borderRadius: 14,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 28,
                letterSpacing: 3,
                color: "var(--success)",
              }}>
                ALL CARDS SEEN
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {pile.length} card{pile.length !== 1 ? "s" : ""} kept
              </div>
              <div style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: 1,
                fontFamily: "'Bebas Neue', sans-serif",
              }}>
                TAP PILE TO VIEW YOUR DECK
              </div>
            </div>
          </div>
        ) : (
          /* Swipeable card */
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
                  maxHeight: "65dvh",
                  width: "auto",
                  maxWidth: "min(88vw, 350px)",
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
                color: "rgba(255,255,255,0.5)", fontSize: 14,
                padding: 16, textAlign: "center",
              }}>
                {card?.name}
              </div>
            )}
          </div>
        )}

        {/* Card info */}
        {card && !done && (
          <div style={{ textAlign: "center", marginTop: 10, padding: "0 16px", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{card.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
              {card.type_line}
              {card.mana_cost ? ` · ${formatManaCost(card.mana_cost)}` : ""}
              {price ? ` · ${price}` : ""}
            </div>
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        paddingTop: 10,
        paddingBottom: NAV_BOTTOM_PAD,
      }}>
        <button
          onClick={() => doResolve(false)}
          disabled={done || !!animOut}
          style={{
            width: 54, height: 54, borderRadius: "50%",
            border: "2px solid var(--danger)",
            background: done ? "rgba(255,77,109,0.04)" : "rgba(255,77,109,0.1)",
            color: done ? "rgba(255,77,109,0.3)" : "var(--danger)",
            fontSize: 20,
            cursor: done ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <button
          onClick={doUndo}
          disabled={history.length === 0}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: history.length > 0 ? "var(--secondary)" : "rgba(255,255,255,0.15)",
            fontSize: 13,
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: 2,
            cursor: history.length > 0 ? "pointer" : "default",
          }}
        >UNDO</button>

        <button
          onClick={() => doResolve(true)}
          disabled={done || !!animOut}
          style={{
            width: 54, height: 54, borderRadius: "50%",
            border: "2px solid var(--success)",
            background: done ? "rgba(52,211,153,0.04)" : "rgba(52,211,153,0.1)",
            color: done ? "rgba(52,211,153,0.3)" : "var(--success)",
            fontSize: 20,
            cursor: done ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >♥</button>
      </div>

    </div>
  );
}
