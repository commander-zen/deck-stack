import { useState, useEffect, useRef } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const SWIPE_THRESHOLD = 60;
const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };

export default function SwipeScreen({ cards, pile, onPileChange, onOpenSearch, onGoToPile, commanderCard, initialIndex, onIndexChange }) {
  const [idx,     setIdx]     = useState(initialIndex ?? 0);
  const [history, setHistory] = useState([]);

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    onIndexChange?.(idx);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const [offset,   setOffset]  = useState(0);
  const [dragging, setDragging]= useState(false);
  const [badge,    setBadge]   = useState(null);
  const [animOut,  setAnimOut] = useState(null);

  const dragStartRef = useRef(null);

  const card = cards[idx] ?? null;
  const done = idx >= cards.length;

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") doResolve(true);
      if (e.key === "ArrowLeft")  doResolve(false);
      if (e.key === "z" || e.key === "Z") doUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function doResolve(keep) {
    if (!card || animOut || done) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");
    const cardEntry = keep ? { ...card, instanceId: crypto.randomUUID() } : card;
    setTimeout(() => {
      setHistory(h => [...h, { card: cardEntry, kept: keep }]);
      if (keep) onPileChange([...pile, cardEntry]);
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

  const artUrl  = card ? getCardImage(card, "art_crop") : null;
  const mainUrl = card ? getCardImage(card, "normal")   : null;

  const rotation    = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx          = animOut ? (animOut === "right" ? 560 : -560) : offset;
  const cardOpacity = animOut ? 0 : 1;

  const counterStr = done
    ? `${pile.length} KEPT`
    : `${idx + 1} / ${cards.length} · ${pile.length} KEPT`;

  return (
    <div style={{
      height: `calc(100dvh - ${NAV_HEIGHT}px)`,
      maxHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
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
        <button
          onClick={onOpenSearch}
          style={{
            background: "transparent", border: "none",
            color: "rgba(255,255,255,0.55)", cursor: "pointer",
            padding: "8px", display: "flex", alignItems: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      </div>

      {/* ── Commander banner ── */}
      {commanderCard && (
        <div style={{
          position: "relative", zIndex: 20, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 14px",
          background: "rgba(13,13,15,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
        }}>
          {getCardImage(commanderCard, "art_crop") && (
            <img
              src={getCardImage(commanderCard, "art_crop")}
              alt={commanderCard.name}
              draggable={false}
              style={{ width: 52, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, fontFamily: "'Bebas Neue', sans-serif" }}>
              COMMANDER
            </div>
            <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {commanderCard.name}
            </div>
          </div>
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {commanderCard.color_identity?.map(c => (
              <div key={c} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: COLOR_DOT[c] ?? "#888",
                border: "1px solid rgba(255,255,255,0.2)",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab bar: SWIPE / PILE ── */}
      <div style={{
        position: "relative", zIndex: 20, flexShrink: 0,
        display: "flex",
        background: "rgba(13,13,15,0.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* SWIPE — always active */}
        <div style={{
          flex: 1,
          padding: "9px 12px",
          textAlign: "center",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 13, letterSpacing: 2,
          color: "var(--primary)",
          borderBottom: "2px solid var(--primary)",
        }}>
          SWIPE
        </div>

        {/* PILE — navigates away */}
        <button
          onClick={onGoToPile}
          style={{
            flex: 1,
            padding: "9px 12px",
            background: "transparent", border: "none",
            borderBottom: "2px solid transparent",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13, letterSpacing: 2,
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}
        >
          PILE
          <span style={{
            fontSize: 11,
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.35)",
            padding: "1px 7px",
            borderRadius: 10,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            letterSpacing: 0,
          }}>
            {pile.length}
          </span>
        </button>
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
        paddingBottom: 14,
      }}>

        {/* Counter + Undo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 12,
            color: done ? "var(--success)" : "rgba(255,255,255,0.5)",
            letterSpacing: 2,
            fontFamily: "'Bebas Neue', sans-serif",
          }}>
            {counterStr}
          </div>
          <button
            onClick={doUndo}
            disabled={history.length === 0 || !!animOut}
            style={{
              background: "transparent", border: "none",
              color: history.length > 0 ? "var(--secondary)" : "rgba(255,255,255,0.15)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11, letterSpacing: 2,
              cursor: history.length > 0 ? "pointer" : "default",
              padding: "2px 6px",
            }}
          >
            UNDO
          </button>
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
              <button
                onClick={onGoToPile}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  border: "1px solid var(--primary)",
                  background: "rgba(91,143,255,0.1)",
                  color: "var(--primary)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 15, letterSpacing: 3, cursor: "pointer",
                }}
              >
                VIEW PILE
              </button>
            </div>
          </div>
        ) : (
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

      </div>
    </div>
  );
}
