import { useState, useRef } from "react";
import { getCardImage } from "../lib/scryfall.js";

const SWIPE_THRESHOLD = 60;
const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };

function ColorPip({ color }) {
  return (
    <div style={{
      width: 13, height: 13, borderRadius: "50%",
      background: COLOR_DOT[color] ?? "#888",
      border: "1px solid rgba(255,255,255,0.25)",
      flexShrink: 0,
    }} />
  );
}

export default function PileSwipeScreen({ cards: cardsProp, onKeep, onPass, onDone, commanderCard, mode }) {
  const [snapshot]  = useState(() => [...cardsProp]);
  const [idx,       setIdx]     = useState(0);
  const [offset,    setOffset]  = useState(0);
  const [dragging,  setDragging]= useState(false);
  const [badge,     setBadge]   = useState(null);
  const [animOut,   setAnimOut] = useState(null);

  const dragStartRef = useRef(null);

  const card = snapshot[idx] ?? null;
  const done = idx >= snapshot.length;

  const keepLabel = "KEEP";
  const passLabel = mode === "deck" ? "MAYBE" : "CUT";
  const passColor = mode === "deck" ? "var(--active)" : "var(--danger)";
  const passBg    = mode === "deck" ? "rgba(245,158,11,0.1)" : "rgba(255,77,109,0.1)";

  function doResolve(keep) {
    if (!card || animOut || done) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");
    setTimeout(() => {
      if (keep) onKeep(card);
      else onPass(card);
      setIdx(i => i + 1);
      setOffset(0);
      setBadge(null);
      setAnimOut(null);
    }, 260);
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

  const mainUrl = card ? getCardImage(card, "normal")   : null;
  const artUrl  = card ? getCardImage(card, "art_crop") : null;

  const rotation    = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx          = animOut ? (animOut === "right" ? 560 : -560) : offset;
  const cardOpacity = animOut ? 0 : 1;

  const cmdArt = commanderCard ? getCardImage(commanderCard, "art_crop") : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
    }}>

      {/* Blurred art background */}
      {artUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: `url(${artUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(28px) brightness(0.12)",
          transform: "scale(1.1)", pointerEvents: "none",
        }} />
      )}

      {/* Top bar */}
      <div style={{
        position: "relative", zIndex: 20, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 14px", height: 52,
        background: "rgba(13,13,15,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        <span style={{
          flex: 1,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 14, letterSpacing: 3,
          color: mode === "deck" ? "var(--primary)" : "var(--secondary)",
        }}>
          {mode === "deck" ? "REVIEWING DECK" : "REVIEWING MAYBEBOARD"}
        </span>
        <button
          onClick={onDone}
          style={{
            padding: "6px 14px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13, letterSpacing: 2, cursor: "pointer",
          }}
        >DONE</button>
      </div>

      {/* Commander banner */}
      {commanderCard && (
        <div style={{
          position: "relative", zIndex: 20, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 14px",
          background: "rgba(13,13,15,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          {cmdArt && (
            <img
              src={cmdArt}
              alt={commanderCard.name}
              draggable={false}
              style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
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
            {commanderCard.color_identity?.map(c => <ColorPip key={c} color={c} />)}
          </div>
        </div>
      )}

      {/* Card area */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden", paddingTop: 14, paddingBottom: 8,
      }}>
        {/* Counter */}
        <div style={{
          fontSize: 12,
          color: done ? "var(--success)" : "rgba(255,255,255,0.5)",
          letterSpacing: 2, marginBottom: 8, flexShrink: 0,
          fontFamily: "'Bebas Neue', sans-serif",
        }}>
          {done ? "REVIEW COMPLETE" : `${idx + 1} / ${snapshot.length}`}
        </div>

        {done ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 14, textAlign: "center",
          }}>
            <div style={{
              width: "min(88vw, 300px)", aspectRatio: "63/88",
              background: "var(--panel)", borderRadius: 14,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 14,
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 24, letterSpacing: 3, color: "var(--success)",
              }}>
                ALL CARDS REVIEWED
              </div>
              <button
                onClick={onDone}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  border: "1px solid var(--primary)",
                  background: "rgba(91,143,255,0.1)",
                  color: "var(--primary)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, letterSpacing: 3, cursor: "pointer",
                }}
              >BACK TO PILE</button>
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
              touchAction: "none", userSelect: "none",
              position: "relative", flexShrink: 0,
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
              }}>{keepLabel}</div>
            )}
            {badge === "pass" && (
              <div style={{
                position: "absolute", top: 14, left: 14, zIndex: 20,
                padding: "6px 14px",
                border: `3px solid ${passColor}`, borderRadius: 8,
                color: passColor,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 26, letterSpacing: 4,
                transform: "rotate(15deg)",
                background: "rgba(0,0,0,0.55)",
              }}>{passLabel}</div>
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
              }}>{card?.name}</div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!done && (
        <div style={{
          position: "relative", zIndex: 10, flexShrink: 0,
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: 36,
          paddingTop: 10, paddingBottom: 32,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => doResolve(false)}
              disabled={!!animOut}
              style={{
                width: 54, height: 54, borderRadius: "50%",
                border: `2px solid ${passColor}`,
                background: passBg,
                color: passColor,
                fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, fontFamily: "'Bebas Neue', sans-serif" }}>
              {passLabel}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => doResolve(true)}
              disabled={!!animOut}
              style={{
                width: 54, height: 54, borderRadius: "50%",
                border: "2px solid var(--success)",
                background: "rgba(52,211,153,0.1)",
                color: "var(--success)",
                fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >♥</button>
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, fontFamily: "'Bebas Neue', sans-serif" }}>
              {keepLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
