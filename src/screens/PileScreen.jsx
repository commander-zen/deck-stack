import { useState, useRef } from "react";
import { getCardImage } from "../lib/scryfall.js";
import PileSwipeScreen from "../components/PileSwipeScreen.jsx";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

function buildExportText(pile, commander) {
  const cmdCard = commander ? pile.find(c => c.instanceId === commander) : null;
  const rest = cmdCard ? pile.filter(c => c.instanceId !== commander) : pile;
  if (cmdCard) {
    return `Commander: ${cmdCard.name}\n\n${rest.map(c => `1 ${c.name}`).join("\n")}`;
  }
  return pile.map(c => `1 ${c.name}`).join("\n");
}

export default function PileScreen({
  pile, onPileChange, onClearPile, onGoToSearch, onOpenSearch,
  commander, onCommanderChange,
  commanderCard,
  maybeboard, onMaybeboardChange,
  initialTab,
}) {
  const [copied,    setCopied]    = useState(false);
  const [lightbox,  setLightbox]  = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab ?? "deck");
  const [reviewMode,setReviewMode]= useState(null);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const lbDragStartY = useRef(null);
  const [lbDragY,    setLbDragY]   = useState(0);
  const [lbDragging, setLbDragging] = useState(false);

  const lpTimerRef = useRef(null);
  const lpFiredRef = useRef(false);

  function handleRemove(instanceId, e) {
    e.stopPropagation();
    onPileChange(pile.filter(c => c.instanceId !== instanceId));
    if (lightbox?.instanceId === instanceId) setLightbox(null);
    if (commander === instanceId) onCommanderChange(null);
  }

  function handleCopy() {
    const text = buildExportText(pile, commander);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setMenuOpen(false);
  }

  function handleMoxfield() {
    const text = buildExportText(pile, commander);
    navigator.clipboard?.writeText(text);
    window.open("https://www.moxfield.com/import", "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  function handleClearPileClick() {
    setMenuOpen(false);
    onClearPile();
  }

  function onCardPointerDown(card) {
    lpFiredRef.current = false;
    lpTimerRef.current = setTimeout(() => {
      lpFiredRef.current = true;
      onCommanderChange(commander === card.instanceId ? null : card.instanceId);
    }, 500);
  }

  function onCardPointerUp() {
    clearTimeout(lpTimerRef.current);
  }

  function onCardClick(card) {
    if (lpFiredRef.current) { lpFiredRef.current = false; return; }
    openLightbox(card);
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
    if (lbDragY > 100) closeLightbox();
    else setLbDragY(0);
  }

  function handleReviewKeep(card) {
    if (reviewMode === "deck") {
      // no-op: card stays in deck
    } else {
      onMaybeboardChange(m => m.filter(c => c.instanceId !== card.instanceId));
      onPileChange(p => [...p, card]);
    }
  }

  function handleReviewPass(card) {
    if (reviewMode === "deck") {
      onPileChange(p => p.filter(c => c.instanceId !== card.instanceId));
      onMaybeboardChange(m => [...m, card]);
    } else {
      onMaybeboardChange(m => m.filter(c => c.instanceId !== card.instanceId));
    }
  }

  const reviewCommanderCard =
    commanderCard ??
    (commander ? pile.find(c => c.instanceId === commander) : null);

  const activeCards = activeTab === "deck" ? pile : maybeboard;
  const fabColor    = activeTab === "deck" ? "var(--primary)"   : "var(--secondary)";
  const fabBg       = activeTab === "deck" ? "rgba(91,143,255,0.14)" : "rgba(167,139,250,0.14)";
  const fabBorder   = activeTab === "deck" ? "rgba(91,143,255,0.38)" : "rgba(167,139,250,0.38)";

  const fabBottom  = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 18px)`;
  const bottomPad  = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 84px)`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* PileSwipeScreen overlay */}
      {reviewMode && (
        <PileSwipeScreen
          cards={reviewMode === "deck" ? pile : maybeboard}
          mode={reviewMode}
          commanderCard={reviewCommanderCard}
          onKeep={handleReviewKeep}
          onPass={handleReviewPass}
          onDone={() => setReviewMode(null)}
        />
      )}

      {/* Backdrop to close overflow menu */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90 }}
        />
      )}

      {/* ── Sticky header: top bar + tabs ── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        maxWidth: 600,
        margin: "0 auto",
        width: "100%",
        background: "rgba(13,13,15,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>

        {/* Top bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "0 8px 0 4px",
          height: 52,
          gap: 2,
        }}>

          {/* ← back */}
          <button
            onClick={onGoToSearch}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.55)", cursor: "pointer",
              padding: "10px", display: "flex", alignItems: "center",
              borderRadius: 8, flexShrink: 0,
            }}
            aria-label="Back to search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          {/* Title */}
          <span style={{
            flex: 1,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20, letterSpacing: 4,
            color: "var(--primary)",
            paddingLeft: 2,
          }}>
            DECK STACK
          </span>

          {/* Search icon */}
          <button
            onClick={onOpenSearch}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.55)", cursor: "pointer",
              padding: "10px", display: "flex", alignItems: "center",
              borderRadius: 8,
            }}
            aria-label="Search cards"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>

          {/* ··· overflow */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: menuOpen ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                color: "rgba(255,255,255,0.55)", cursor: "pointer",
                padding: "10px 12px", display: "flex", alignItems: "center",
                borderRadius: 8,
                fontSize: 20, letterSpacing: 3, lineHeight: 0.5,
              }}
              aria-label="More options"
            >
              ···
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0,
                background: "var(--panel2, #1a1a20)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                overflow: "hidden",
                zIndex: 110,
                boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                minWidth: 210,
              }}>
                <MenuBtn
                  onClick={handleCopy}
                  color={copied ? "var(--success)" : "var(--primary)"}
                  border
                >
                  {copied ? "COPIED ✓" : "COPY LIST"}
                </MenuBtn>
                <MenuBtn
                  onClick={handleMoxfield}
                  color="var(--secondary)"
                  disabled={pile.length === 0}
                  border
                >
                  COPY + MOXFIELD ↗
                </MenuBtn>
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                <MenuBtn onClick={handleClearPileClick} color="var(--danger)">
                  CLEAR PILE
                </MenuBtn>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {[
            { key: "deck",  label: "DECK",  count: pile.length },
            { key: "maybe", label: "MAYBE", count: maybeboard.length },
          ].map(({ key, label, count }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                  color: active ? "var(--primary)" : "rgba(255,255,255,0.35)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 13, letterSpacing: 2,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {label}
                <span style={{
                  fontSize: 11,
                  background: active ? "rgba(91,143,255,0.2)" : "rgba(255,255,255,0.07)",
                  color: active ? "var(--primary)" : "rgba(255,255,255,0.35)",
                  padding: "1px 7px",
                  borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  letterSpacing: 0,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        width: "100%",
        padding: "14px 14px",
        paddingBottom: bottomPad,
      }}>

        {/* DECK tab */}
        {activeTab === "deck" && (
          <>
            {pile.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "72px 20px",
                color: "rgba(255,255,255,0.35)", fontSize: 14,
              }}>
                Your stack is empty
                <br />
                <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
                  Swipe right to keep cards
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {pile.map((card, i) => {
                  const imgUrl = getCardImage(card, "normal");
                  const isCommander = commander === card.instanceId;
                  return (
                    <div
                      key={card.instanceId || `${card.id}-${i}`}
                      onPointerDown={() => onCardPointerDown(card)}
                      onPointerUp={onCardPointerUp}
                      onPointerCancel={onCardPointerUp}
                      onClick={() => onCardClick(card)}
                      style={{
                        position: "relative",
                        aspectRatio: "63 / 88",
                        borderRadius: 10,
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "var(--panel)",
                        outline: isCommander ? "2px solid gold" : "none",
                        outlineOffset: isCommander ? "2px" : "0",
                      }}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={card.name}
                          draggable={false}
                          style={{
                            width: "100%", height: "100%",
                            objectFit: "cover", display: "block",
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

                      {isCommander && (
                        <div style={{
                          position: "absolute", top: 4, left: 5,
                          fontSize: 14, lineHeight: 1,
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
                          pointerEvents: "none",
                        }}>
                          👑
                        </div>
                      )}

                      <button
                        onClick={e => handleRemove(card.instanceId, e)}
                        style={{
                          position: "absolute", top: 5, right: 5,
                          width: 22, height: 22, borderRadius: "50%",
                          background: "rgba(0,0,0,0.7)", border: "none",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* MAYBE tab */}
        {activeTab === "maybe" && (
          <>
            {maybeboard.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "72px 20px",
                color: "rgba(255,255,255,0.35)", fontSize: 14,
              }}>
                Your maybeboard is empty
                <br />
                <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
                  Swipe left while reviewing your deck to send cards here
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {maybeboard.map((card, i) => {
                  const imgUrl = getCardImage(card, "normal");
                  return (
                    <div
                      key={card.instanceId || `${card.id}-${i}`}
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
                            width: "100%", height: "100%",
                            objectFit: "cover", display: "block",
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

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (lightbox?.instanceId === card.instanceId) setLightbox(null);
                          onMaybeboardChange(m => m.filter(c => c.instanceId !== card.instanceId));
                        }}
                        style={{
                          position: "absolute", top: 5, right: 5,
                          width: 22, height: 22, borderRadius: "50%",
                          background: "rgba(0,0,0,0.7)", border: "none",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FAB: Review ── */}
      {activeCards.length > 0 && (
        <button
          onClick={() => setReviewMode(activeTab)}
          style={{
            position: "fixed",
            right: 18,
            bottom: fabBottom,
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            borderRadius: 28,
            border: `1px solid ${fabBorder}`,
            background: fabBg,
            color: fabColor,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14, letterSpacing: 2,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3l14 9-14 9V3z"/>
          </svg>
          REVIEW
        </button>
      )}

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
          >✕</button>

          <img
            src={getCardImage(lightbox, "normal")}
            alt={lightbox.name}
            draggable={false}
            onPointerDown={onLbPointerDown}
            onPointerMove={onLbPointerMove}
            onPointerUp={onLbPointerUp}
            onPointerCancel={onLbPointerUp}
            onClick={e => e.stopPropagation()}
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

function MenuBtn({ onClick, color, disabled, border, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "13px 18px",
        background: "transparent", border: "none",
        borderBottom: border ? "1px solid rgba(255,255,255,0.06)" : "none",
        color,
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 14, letterSpacing: 2,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textAlign: "left",
        display: "block",
      }}
    >
      {children}
    </button>
  );
}
