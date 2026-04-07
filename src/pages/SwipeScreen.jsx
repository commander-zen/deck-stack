import { useState, useEffect, useRef, useCallback } from "react";
import { getCardImage, formatManaCost } from "../lib/scryfall.js";

const SWIPE_THRESHOLD = 40; // px

export default function SwipeScreen({ cards, onDone, onBack }) {
  const [index,   setIndex]   = useState(0);
  const [pile,    setPile]    = useState([]);
  const [history, setHistory] = useState([]); // [{card, kept}] for undo
  const [badge,   setBadge]   = useState(null); // "keep" | "pass" | null
  const [offset,  setOffset]  = useState(0);   // current drag x offset
  const [dragging,setDragging]= useState(false);
  const [animOut, setAnimOut] = useState(null); // "left" | "right" | null

  const dragStart = useRef(null);
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
    setHistory(h => h.slice(0, -1));
    if (last.kept) setPile(p => p.filter(c => c !== last.card));
    setIndex(i => i - 1);
  }, [history, animOut]);

  // ── Pointer drag ──────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    dragStart.current = e.clientX;
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!dragging || dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    setOffset(dx);
    if (dx > SWIPE_THRESHOLD)      setBadge("keep");
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
  const artUrl  = card ? getCardImage(card, "art_crop")  : null;
  const mainUrl = card ? getCardImage(card, "normal")    : null;

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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
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
  const tx = animOut ? (animOut === "right" ? 500 : -500) : offset;
  const opacity = animOut ? 0 : 1;

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

      {/* Top bar */}
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
          {index + 1} / {cards.length}
        </div>
        <button onClick={handleUndo} disabled={history.length === 0} style={{
          background: "transparent", border: "none",
          color: history.length > 0 ? "var(--secondary)" : "rgba(255,255,255,0.15)",
          fontSize: 12, letterSpacing: 1, cursor: history.length > 0 ? "pointer" : "default",
        }}>
          UNDO ↺
        </button>
      </div>

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
            padding: "8px 16px",
            borderRadius: 8,
            border: `3px solid ${badge === "keep" ? "var(--success)" : "var(--danger)"}`,
            color: badge === "keep" ? "var(--success)" : "var(--danger)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 4,
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
            width: 280, height: 390,
            background: "var(--panel)", borderRadius: 16,
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
      </div>

      {/* Swipe buttons */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", gap: 32, marginTop: 28,
      }}>
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
