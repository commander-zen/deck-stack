import { useState, useRef } from "react";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { getCardImage } from "../lib/scryfall.js";

function buildExportText(pile) {
  return pile.map(c => `1 ${c.name}`).join("\n");
}

export default function PileScreen({ pile, onPileChange, onClearPile, onGoToSearch, onOpenSearch }) {
  const [copied,    setCopied]    = useState(false);
  const [lightbox,  setLightbox]  = useState(null);  // card object or null

  // Lightbox swipe-down dismiss
  const lbDragStartY = useRef(null);
  const [lbDragY,    setLbDragY]   = useState(0);
  const [lbDragging, setLbDragging] = useState(false);

  function handleRemove(cardId, e) {
    e.stopPropagation();
    onPileChange(pile.filter(c => c.id !== cardId));
    if (lightbox?.id === cardId) setLightbox(null);
  }

  function handleCopy() {
    const text = buildExportText(pile);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleMoxfield() {
    const text = buildExportText(pile);
    navigator.clipboard?.writeText(text);
    window.open("https://www.moxfield.com/import", "_blank", "noopener,noreferrer");
  }

  function openLightbox(card) {
    setLightbox(card);
    setLbDragY(0);
  }

  function closeLightbox() {
    setLightbox(null);
    setLbDragY(0);
    setLbDragging(false);
    lbDragStartY.current = null;
  }

  function onLbPointerDown(e) {
    lbDragStartY.current = e.clientY;
    setLbDragging(true);
    setLbDragY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onLbPointerMove(e) {
    if (!lbDragging || lbDragStartY.current === null) return;
    const dy = e.clientY - lbDragStartY.current;
    setLbDragY(Math.max(0, dy));
  }

  function onLbPointerUp() {
    lbDragStartY.current = null;
    setLbDragging(false);
    if (lbDragY > 100) {
      closeLightbox();
    } else {
      setLbDragY(0);
    }
  }

  const bottomPad = `calc(${NAV_HEIGHT}px + max(16px, env(safe-area-inset-bottom)))`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif",
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
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 24, letterSpacing: 5,
            color: "var(--primary)", lineHeight: 1,
          }}>
            DECK STACK
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
            {pile.length} card{pile.length !== 1 ? "s" : ""}
          </div>
        </div>
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

      {/* ── Content ── */}
      <div style={{
        width: "100%",
        maxWidth: 600,
        padding: "18px 20px",
        paddingBottom: bottomPad,
      }}>

        {/* Row 1: export actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, padding: "12px 12px", borderRadius: 10,
              border: `1px solid ${copied ? "var(--success)" : "rgba(91,143,255,0.3)"}`,
              background: copied ? "rgba(52,211,153,0.08)" : "rgba(91,143,255,0.06)",
              color: copied ? "var(--success)" : "var(--primary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 3, cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {copied ? "COPIED ✓" : "COPY"}
          </button>

          <button
            onClick={handleMoxfield}
            disabled={pile.length === 0}
            style={{
              flex: 1, padding: "12px 12px", borderRadius: 10,
              border: "1px solid rgba(167,139,250,0.3)",
              background: "rgba(167,139,250,0.06)",
              color: "var(--secondary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 3,
              cursor: pile.length > 0 ? "pointer" : "default",
              opacity: pile.length === 0 ? 0.4 : 1,
            }}
          >
            COPY + MOXFIELD ↗
          </button>
        </div>

        {/* Row 2: navigation actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={onGoToSearch}
            style={{
              flex: 1, padding: "12px 12px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 2, cursor: "pointer",
            }}
          >
            ← SEARCH
          </button>

          <button
            onClick={onClearPile}
            style={{
              flex: 1, padding: "12px 12px", borderRadius: 10,
              border: "1px solid rgba(255,77,109,0.3)",
              background: "rgba(255,77,109,0.06)",
              color: "var(--danger)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 2, cursor: "pointer",
            }}
          >
            CLEAR PILE
          </button>
        </div>

        {/* Empty state */}
        {pile.length === 0 && (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            color: "rgba(255,255,255,0.35)", fontSize: 14,
          }}>
            Your stack is empty
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              Go back to swipe and keep some cards
            </span>
          </div>
        )}

        {/* Visual card grid */}
        {pile.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}>
            {pile.map((card, i) => {
              const imgUrl = getCardImage(card, "normal");
              return (
                <div
                  key={`${card.id}-${i}`}
                  onClick={() => openLightbox(card)}
                  style={{
                    position: "relative",
                    aspectRatio: "63 / 88",
                    borderRadius: 10,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "var(--panel)",
                  }}
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={card.name}
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        pointerEvents: "none",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "rgba(255,255,255,0.4)",
                      padding: 8, textAlign: "center",
                    }}>
                      {card.name}
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemove(card.id, e)}
                    style={{
                      position: "absolute", top: 5, right: 5,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)",
                      border: "none",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 10, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: `rgba(0,0,0,${Math.max(0.92 - lbDragY / 300, 0.3)})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,0.12)",
              border: "none", borderRadius: "50%",
              width: 36, height: 36,
              color: "rgba(255,255,255,0.8)",
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10,
            }}
          >
            ✕
          </button>

          {/* Card image — drag to dismiss */}
          <img
            src={getCardImage(lightbox, "normal")}
            alt={lightbox.name}
            draggable={false}
            onPointerDown={onLbPointerDown}
            onPointerMove={onLbPointerMove}
            onPointerUp={onLbPointerUp}
            onPointerCancel={onLbPointerUp}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(90vw, 400px)",
              maxHeight: "85dvh",
              objectFit: "contain",
              borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.9)",
              transform: `translateY(${lbDragY}px)`,
              transition: lbDragging ? "none" : "transform 0.22s ease",
              cursor: lbDragging ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
              opacity: Math.max(1 - lbDragY / 250, 0.2),
            }}
          />
        </div>
      )}
    </div>
  );
}
