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

function GridIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5"/>
      <rect x="14" y="3" width="7" height="9" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}

function ListIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  );
}

export default function PileScreen({
  pile, onPileChange, onClearPile,
  commander, onCommanderChange,
  commanderCard,
  maybeboard, onMaybeboardChange,
  initialTab,
}) {
  const [viewMode,   setViewMode]   = useState("list");
  const [activeTab,  setActiveTab]  = useState(initialTab ?? "deck");
  const [reviewMode, setReviewMode] = useState(null);
  const [lightbox,   setLightbox]   = useState(null);
  const [copied,     setCopied]     = useState(false);

  const lbDragStartY = useRef(null);
  const [lbDragY,    setLbDragY]   = useState(0);
  const [lbDragging, setLbDragging] = useState(false);

  const lpTimerRef = useRef(null);
  const lpFiredRef = useRef(false);

  const activeCards = activeTab === "deck" ? pile : maybeboard;

  const reviewCommanderCard =
    commanderCard ??
    (commander ? pile.find(c => c.instanceId === commander) : null);

  const commanderName = reviewCommanderCard?.name ?? null;

  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 76px)`;
  const fabBottom  = `calc(max(14px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 10px)`;

  // ── Card interactions ──────────────────────────────────────────────────────

  function handleRemove(instanceId, e) {
    e?.stopPropagation();
    onPileChange(pile.filter(c => c.instanceId !== instanceId));
    if (lightbox?.instanceId === instanceId) setLightbox(null);
    if (commander === instanceId) onCommanderChange(null);
  }

  function handleRemoveMaybe(instanceId, e) {
    e?.stopPropagation();
    if (lightbox?.instanceId === instanceId) setLightbox(null);
    onMaybeboardChange(m => m.filter(c => c.instanceId !== instanceId));
  }

  function onCardPointerDown(card) {
    lpFiredRef.current = false;
    lpTimerRef.current = setTimeout(() => {
      lpFiredRef.current = true;
      onCommanderChange(commander === card.instanceId ? null : card.instanceId);
    }, 500);
  }

  function onCardPointerUp() { clearTimeout(lpTimerRef.current); }

  function onCardClick(card) {
    if (lpFiredRef.current) { lpFiredRef.current = false; return; }
    openLightbox(card);
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────

  function openLightbox(card) { setLightbox(card); setLbDragY(0); }

  function closeLightbox() {
    setLightbox(null); setLbDragY(0);
    setLbDragging(false); lbDragStartY.current = null;
  }

  function onLbPointerDown(e) {
    lbDragStartY.current = e.clientY;
    setLbDragging(true); setLbDragY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onLbPointerMove(e) {
    if (!lbDragging || lbDragStartY.current === null) return;
    setLbDragY(Math.max(0, e.clientY - lbDragStartY.current));
  }

  function onLbPointerUp() {
    lbDragStartY.current = null; setLbDragging(false);
    if (lbDragY > 100) closeLightbox(); else setLbDragY(0);
  }

  // ── Review handlers ────────────────────────────────────────────────────────

  function handleReviewKeep(card) {
    if (reviewMode !== "deck") {
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

  // ── Export ─────────────────────────────────────────────────────────────────

  function handleCopy() {
    navigator.clipboard?.writeText(buildExportText(pile, commander)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleMoxfield() {
    navigator.clipboard?.writeText(buildExportText(pile, commander));
    window.open("https://www.moxfield.com/import", "_blank", "noopener,noreferrer");
  }

  // ── Renders ────────────────────────────────────────────────────────────────

  function renderListRow(card, isCommander, onRemove) {
    const mana = card.mana_cost?.replace(/\{([^}]+)\}/g, "$1 ").trim() ?? "";
    return (
      <div
        key={card.instanceId}
        style={{
          display: "flex", alignItems: "center",
          padding: "9px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: isCommander ? "rgba(255,215,0,0.04)" : "transparent",
          cursor: "pointer",
        }}
        onClick={() => openLightbox(card)}
      >
        {isCommander && (
          <span style={{ fontSize: 12, marginRight: 6, flexShrink: 0 }}>👑</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, color: isCommander ? "gold" : "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontWeight: isCommander ? 500 : 400,
          }}>
            {card.name}
          </div>
          {card.type_line && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
              {card.type_line}
            </div>
          )}
        </div>
        {mana && (
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.4)",
            flexShrink: 0, marginLeft: 8, marginRight: 8,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {mana}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRemove(card.instanceId, e); }}
          style={{
            background: "transparent", border: "none",
            color: "rgba(255,255,255,0.25)", cursor: "pointer",
            fontSize: 12, padding: "4px 6px", flexShrink: 0, lineHeight: 1,
          }}
          onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
          onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
        >✕</button>
      </div>
    );
  }

  function renderGridCard(card, isCommander, onRemove) {
    const imgUrl = getCardImage(card, "normal");
    return (
      <div
        key={card.instanceId}
        onPointerDown={() => activeTab === "deck" && onCardPointerDown(card)}
        onPointerUp={onCardPointerUp}
        onPointerCancel={onCardPointerUp}
        onClick={() => onCardClick(card)}
        style={{
          position: "relative", aspectRatio: "63/88",
          borderRadius: 10, overflow: "hidden", cursor: "pointer",
          background: "var(--panel)",
          outline: isCommander ? "2px solid gold" : "none",
          outlineOffset: isCommander ? 2 : 0,
        }}
      >
        {imgUrl ? (
          <img src={imgUrl} alt={card.name} draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "rgba(255,255,255,0.4)", padding: 8, textAlign: "center",
          }}>{card.name}</div>
        )}
        {isCommander && (
          <div style={{ position: "absolute", top: 4, left: 5, fontSize: 14, lineHeight: 1, pointerEvents: "none",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}>👑</div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRemove(card.instanceId, e); }}
          style={{
            position: "absolute", top: 5, right: 5,
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(0,0,0,0.7)", border: "none",
            color: "rgba(255,255,255,0.7)", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}
        >✕</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}>

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

      {/* ── Sticky header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        maxWidth: 600, margin: "0 auto", width: "100%",
        background: "rgba(13,13,15,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 10px 0 16px", height: 52, gap: 8,
        }}>
          {/* Commander art + name */}
          {reviewCommanderCard ? (
            <>
              {getCardImage(reviewCommanderCard, "art_crop") && (
                <img
                  src={getCardImage(reviewCommanderCard, "art_crop")}
                  alt={commanderName}
                  draggable={false}
                  style={{ width: 40, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <span style={{
                flex: 1,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18, letterSpacing: 3, color: "var(--text)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {commanderName}
              </span>
            </>
          ) : (
            <span style={{
              flex: 1,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18, letterSpacing: 4, color: "var(--primary)",
            }}>
              {activeTab === "deck" ? "PILE" : "MAYBE"}
            </span>
          )}

          {/* Count */}
          <span style={{
            fontSize: 12, color: "var(--muted)",
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
          }}>
            {activeCards.length}
          </span>

          {/* List/Grid toggle */}
          <button
            onClick={() => setViewMode(v => v === "list" ? "grid" : "list")}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.45)", cursor: "pointer",
              padding: "8px", display: "flex", alignItems: "center", borderRadius: 6,
            }}
            title={viewMode === "list" ? "Switch to grid" : "Switch to list"}
          >
            {viewMode === "list" ? <GridIcon color="rgba(255,255,255,0.45)" /> : <ListIcon color="rgba(255,255,255,0.45)" />}
          </button>

          {/* Export button */}
          {activeTab === "deck" && pile.length > 0 && (
            <button
              onClick={handleCopy}
              style={{
                background: "transparent", border: "none",
                color: copied ? "var(--success)" : "rgba(255,255,255,0.45)",
                cursor: "pointer", padding: "8px",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 11, letterSpacing: 1.5, borderRadius: 6,
                transition: "color 0.2s",
                flexShrink: 0,
              }}
            >
              {copied ? "✓" : "COPY"}
            </button>
          )}
        </div>
      </div>

      {/* ── Card list / grid ── */}
      <div style={{
        maxWidth: 600, margin: "0 auto", width: "100%",
        padding: viewMode === "grid" ? "10px 10px" : "0",
        paddingBottom: bottomPad,
      }}>

        {activeCards.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "72px 20px",
            color: "rgba(255,255,255,0.35)", fontSize: 14,
          }}>
            {activeTab === "deck" ? "Your stack is empty" : "Your maybeboard is empty"}
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              {activeTab === "deck"
                ? "Swipe right to keep cards"
                : "Swipe left while reviewing your deck to send cards here"}
            </span>
          </div>
        ) : viewMode === "list" ? (
          /* List view */
          activeTab === "deck"
            ? pile.map(card => renderListRow(card, commander === card.instanceId, handleRemove))
            : maybeboard.map(card => renderListRow(card, false, (id, e) => handleRemoveMaybe(id, e)))
        ) : (
          /* Grid view */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {activeTab === "deck"
              ? pile.map(card => renderGridCard(card, commander === card.instanceId, handleRemove))
              : maybeboard.map(card => renderGridCard(card, false, (id, e) => handleRemoveMaybe(id, e)))
            }
          </div>
        )}

        {/* Moxfield export row (deck tab only) */}
        {activeTab === "deck" && pile.length > 0 && (
          <div style={{ padding: "14px 16px 0" }}>
            <button
              onClick={handleMoxfield}
              style={{
                width: "100%", padding: "10px 16px",
                background: "transparent",
                border: "1px solid rgba(167,139,250,0.25)",
                borderRadius: 10, cursor: "pointer",
                color: "var(--secondary)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13, letterSpacing: 2,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              OPEN IN MOXFIELD ↗
            </button>
          </div>
        )}

        {/* Clear pile (deck tab only, at bottom) */}
        {activeTab === "deck" && pile.length > 0 && (
          <div style={{ padding: "8px 16px 0" }}>
            <button
              onClick={onClearPile}
              style={{
                width: "100%", padding: "10px 16px",
                background: "transparent",
                border: "1px solid rgba(255,80,80,0.2)",
                borderRadius: 10, cursor: "pointer",
                color: "rgba(255,80,80,0.55)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13, letterSpacing: 2,
              }}
            >
              CLEAR PILE
            </button>
          </div>
        )}
      </div>

      {/* ── STACK & SWIPE full-width button ── */}
      {activeCards.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: `calc(max(10px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 8px)`,
          left: 0, right: 0,
          maxWidth: 600, margin: "0 auto",
          padding: "0 14px",
          zIndex: 80,
        }}>
          <button
            onClick={() => setReviewMode(activeTab)}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 14,
              border: `1px solid ${activeTab === "deck" ? "rgba(91,143,255,0.45)" : "rgba(167,139,250,0.45)"}`,
              background: activeTab === "deck" ? "rgba(91,143,255,0.12)" : "rgba(167,139,250,0.12)",
              color: activeTab === "deck" ? "var(--primary)" : "var(--secondary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 17, letterSpacing: 3,
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
            STACK &amp; SWIPE
          </button>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: `rgba(0,0,0,${Math.max(0.92 - lbDragY / 300, 0.3)})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <button
            onClick={closeLightbox}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
              width: 36, height: 36, color: "rgba(255,255,255,0.8)",
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
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
              maxWidth: "min(90vw, 400px)", maxHeight: "85dvh",
              objectFit: "contain", borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.9)",
              transform: `translateY(${lbDragY}px)`,
              transition: lbDragging ? "none" : "transform 0.22s ease",
              cursor: lbDragging ? "grabbing" : "grab",
              touchAction: "none", userSelect: "none",
              opacity: Math.max(1 - lbDragY / 250, 0.2),
            }}
          />
        </div>
      )}
    </div>
  );
}
