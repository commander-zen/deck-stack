import { useState, useEffect, useRef, useMemo } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { useDoubleTap } from "../hooks/useDoubleTap.js";

const isBasicLand = c => Boolean(c?.type_line?.includes("Basic Land"));
const isAnyNumber = c => Boolean(c?.oracle_text?.includes("A deck can have any number of cards named"));
const isStackable  = c => isBasicLand(c) || isAnyNumber(c);

const SWIPE_THRESHOLD = 60;
const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };
const SORT_OPTIONS = [
  { value: "name",   label: "NAME" },
  { value: "cmc",    label: "CMC" },
  { value: "edhrec", label: "EDHREC" },
];
const TIP_KEY = "deckstack_swipe_tip_seen";

function haptic(pattern = 10) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

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
  // Deduplicate swipe queue: skip oracle_id already seen in the queue or kept in pile.
  // Stackables (basic lands + any-number cards) are always allowed through.
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
  const [badge,        setBadge]        = useState(null);
  const [animOut,      setAnimOut]      = useState(null);
  const [faceIdx,      setFaceIdx]      = useState(0);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Onboarding tip
  const [showTip,    setShowTip]    = useState(false);
  const [tipDismiss, setTipDismiss] = useState(false);
  const tipShownRef = useRef(false);

  const didMountRef   = useRef(false);
  const dragStartRef  = useRef(null);
  const saveTimerRef  = useRef(null);

  const card = effectiveCards[idx] ?? null;
  const done = idx >= effectiveCards.length;

  // Preload next 4 card images to eliminate lag between swipes
  useEffect(() => {
    effectiveCards.slice(idx + 1, idx + 5).forEach(c => {
      const url = getCardImage(c, "normal");
      if (url) { const img = new Image(); img.src = url; }
    });
  }, [idx, effectiveCards]);

  // Reset face to front when card changes
  useEffect(() => { setFaceIdx(0); }, [idx]);

  useEffect(() => {
    if (!localStorage.getItem(TIP_KEY)) {
      tipShownRef.current = true;
      setShowTip(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    onIndexChange?.(idx);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
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

  // Debounced pile save — only updates an existing brew record, never creates
  useEffect(() => {
    if (!activeDeckId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onSavePile?.(pile), 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [pile, activeDeckId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swipe logic ────────────────────────────────────────────────────────────

  function doResolve(keep) {
    if (!card || animOut || done) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");

    haptic(keep ? 12 : 6);

    setTimeout(() => {
      if (keep) {
        const alreadyInPile = !isStackable(card) && card.oracle_id &&
          pile.some(c => c.oracle_id === card.oracle_id);
        if (!alreadyInPile) {
          const cardEntry = { ...card, instanceId: crypto.randomUUID() };
          setHistory(h => [...h, { card: cardEntry, kept: true }]);
          onPileChange(prev => [...prev, cardEntry]);
        }
      } else {
        // Left swipe on Stack = discard entirely — not saved anywhere
        setHistory(h => [...h, { card, kept: false }]);
      }
      setIdx(i => i + 1);
      setOffset(0); setBadge(null); setAnimOut(null);
    }, 260);
  }

  function doUndo() {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (last.kept) {
      onPileChange(pile.filter(c => c.instanceId !== last.card.instanceId));
    }
    // kept === false: card was discarded, nothing to remove from state
    setIdx(i => Math.max(0, i - 1));
    haptic([4, 20, 4]);
  }

  function dismissTipForever() {
    localStorage.setItem(TIP_KEY, "1");
    setShowTip(false);
    setTipDismiss(true);
  }

  // ── Pointer events ─────────────────────────────────────────────────────────

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
    else                            setBadge(null);
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

  const handleDoubleTap = useDoubleTap(() => {
    if (card?.oracle_id) onDoubleTag?.(card.oracle_id);
  });

  const artUrl   = card ? getCardImage(card, "art_crop") : null;
  const cmdArt   = commanderCard ? getCardImage(commanderCard, "art_crop") : null;
  const hasFaces = (card?.card_faces?.length ?? 0) >= 2;
  const isBattle = (card?.type_line ?? "").toLowerCase().includes("battle");
  const mainUrl  = card
    ? (hasFaces
        ? (card.card_faces[faceIdx]?.image_uris?.normal ?? getCardImage(card, "normal"))
        : getCardImage(card, "normal"))
    : null;

  const rotation = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx       = animOut ? (animOut === "right" ? 560 : -560) : offset;

  const counterStr = done
    ? `${pile.length} KEPT`
    : `${idx + 1} / ${effectiveCards.length} · ${pile.length} KEPT`;

  return (
    <div style={{
      height: `calc(100dvh - ${NAV_HEIGHT}px - env(safe-area-inset-bottom))`,
      maxHeight: `calc(100dvh - ${NAV_HEIGHT}px - env(safe-area-inset-bottom))`,
      boxSizing: "border-box",
      paddingTop: "env(safe-area-inset-top)",
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
      position: "relative",
      maxWidth: 600, margin: "0 auto", width: "100%",
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

      {/* ── Commander row — display only ── */}
      <div style={{
        position: "relative", zIndex: 20, flexShrink: 0,
        background: "rgba(13,13,15,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "6px 8px",
        }}>
          {/* ← Back to Search */}
          <button
            onClick={() => onGoToSearch?.()}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
              fontSize: 18, lineHeight: 1,
              padding: "4px 4px", flexShrink: 0,
            }}
          >←</button>

          {/* Commander thumbnail */}
          {cmdArt ? (
            <img
              src={cmdArt}
              alt={commanderCard.name}
              draggable={false}
              style={{ width: 52, height: 37, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 52, height: 37, borderRadius: 4, flexShrink: 0,
              background: "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 16, opacity: 0.4 }}>👑</span>
            </div>
          )}

          {/* Commander name */}
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            {commanderCard ? (
              <>
                <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 1, fontFamily: "'Bebas Neue', sans-serif" }}>
                  COMMANDER
                </div>
                <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {commanderCard.name}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>No commander</div>
            )}
          </div>

          {/* Color pips */}
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {commanderCard?.color_identity?.map(c => <ColorPip key={c} color={c} />)}
          </div>

          {/* Dir toggle — desc ↔ asc only, no neutral state */}
          <button
            onClick={e => {
              e.stopPropagation();
              const next = swipeDir === "asc" ? "desc" : "asc";
              onSortChange?.(swipeOrder, next);
            }}
            style={{
              flexShrink: 0,
              width: 26, height: 26, borderRadius: 5,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "var(--text)",
              cursor: "pointer", fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {swipeDir === "asc" ? "↑" : "↓"}
          </button>

          {/* Sort menu button */}
          <button
            onClick={e => { e.stopPropagation(); setSortMenuOpen(o => !o); }}
            style={{
              flexShrink: 0,
              padding: "3px 7px", borderRadius: 5,
              border: sortMenuOpen ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
              background: sortMenuOpen ? "rgba(91,143,255,0.12)" : "transparent",
              color: sortMenuOpen ? "var(--primary)" : "rgba(255,255,255,0.4)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 10, letterSpacing: 1, cursor: "pointer", lineHeight: 1,
              marginRight: 2,
            }}
          >
            {SORT_OPTIONS.find(o => o.value === swipeOrder)?.label ?? "SORT"}
          </button>
        </div>

        {/* Sort dropdown */}
        {sortMenuOpen && (
          <div style={{
            position: "absolute", top: "100%", right: 8, zIndex: 30,
            background: "var(--panel2)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
            minWidth: 110,
          }}>
            {SORT_OPTIONS.map(opt => {
              const active = swipeOrder === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onSortChange?.(opt.value, swipeDir); setSortMenuOpen(false); }}
                  style={{
                    display: "block", width: "100%",
                    padding: "10px 14px",
                    background: active ? "rgba(91,143,255,0.12)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    color: active ? "var(--primary)" : "var(--text)",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 12, letterSpacing: 2,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Card area ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center",
        overflow: "hidden", paddingTop: 10, paddingBottom: 4,
      }}>

        {done ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 14, textAlign: "center",
          }}>
            <div style={{
              width: "min(88vw, 300px)", aspectRatio: "63/88",
              background: "var(--panel)", borderRadius: 14,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 28, letterSpacing: 3, color: "var(--success)",
              }}>ALL CARDS SEEN</div>
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
              <button
                onClick={onSearchMore}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "var(--muted)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 15, letterSpacing: 3, cursor: "pointer",
                }}
              >
                SEARCH MORE
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Counter + Undo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexShrink: 0 }}>
              <div style={{
                fontSize: 12, letterSpacing: 2,
                color: "rgba(255,255,255,0.5)",
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

            {/* Card */}
            <div
              style={{
                marginTop: "auto",
                transform: `translateX(${tx}px) rotate(${rotation}deg)`,
                transition: animOut
                  ? "transform 0.26s ease, opacity 0.26s ease"
                  : dragging ? "none" : "transform 0.18s ease",
                opacity: animOut ? 0 : 1,
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none", userSelect: "none",
                position: "relative", flexShrink: 0,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onTouchStart={handleDoubleTap}
              onTouchEnd={(e) => e.preventDefault()}
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
                }}>PILE</div>
              )}
              {badge === "pass" && (
                <div style={{
                  position: "absolute", top: 14, left: 14, zIndex: 20,
                  padding: "6px 14px",
                  border: "3px solid var(--secondary)", borderRadius: 8,
                  color: "var(--secondary)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 26, letterSpacing: 4,
                  transform: "rotate(15deg)",
                  background: "rgba(0,0,0,0.55)",
                }}>SKIP</div>
              )}

              {mainUrl ? (
                <>
                  <img
                    src={mainUrl}
                    alt={card?.name}
                    draggable={false}
                    style={{
                      maxHeight: isBattle
                        ? undefined
                        : `calc(100dvh - ${NAV_HEIGHT}px - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 140px)`,
                      width: "auto",
                      maxWidth: isBattle ? "min(55vw, 220px)" : "min(88vw, 350px)",
                      borderRadius: 14,
                      boxShadow: "0 18px 56px rgba(0,0,0,0.8)",
                      display: "block", pointerEvents: "none",
                      transform: isBattle ? "rotate(90deg)" : undefined,
                    }}
                  />
                  {hasFaces && (
                    <button
                      onPointerDown={e => { e.stopPropagation(); setFaceIdx(f => f === 0 ? 1 : 0); }}
                      style={{
                        position: "absolute", bottom: 10, right: 10,
                        width: 34, height: 34, borderRadius: "50%",
                        background: "rgba(0,0,0,0.75)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        color: "white", cursor: "pointer", fontSize: 18,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >↻</button>
                  )}
                </>
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
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      {!done && (
        <div style={{
          position: "relative", zIndex: 10, flexShrink: 0,
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: 36,
          paddingTop: 10, paddingBottom: 24,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => doResolve(false)}
              disabled={!!animOut}
              style={{
                width: 54, height: 54, borderRadius: "50%",
                border: "2px solid var(--secondary)",
                background: "rgba(167,139,250,0.1)",
                color: "var(--secondary)",
                fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, fontFamily: "'Bebas Neue', sans-serif" }}>
              SKIP
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
              PILE
            </span>
          </div>
        </div>
      )}

      {/* ── Onboarding tip overlay ── */}
      {showTip && (
        <div
          onClick={dismissTipForever}
          style={{
            position: "absolute", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.72)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 20,
            animation: "tipFadeIn 0.2s ease both",
          }}
        >
          <style>{`@keyframes tipFadeIn { from { opacity:0; } to { opacity:1; } }`}</style>

          <div style={{ textAlign: "center", padding: "0 32px" }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28, letterSpacing: 4, color: "var(--text)",
              marginBottom: 24,
            }}>
              HOW TO SWIPE
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { dir: "← LEFT", label: "SKIP", color: "var(--secondary)" },
                { dir: "RIGHT →", label: "ADD TO PILE", color: "var(--success)" },
              ].map(({ dir, label, color }) => (
                <div key={dir} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12, padding: "14px 20px", gap: 16,
                }}>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 20, letterSpacing: 3, color,
                  }}>{dir}</span>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 14, letterSpacing: 2, color: "rgba(255,255,255,0.7)",
                  }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={e => { e.stopPropagation(); dismissTipForever(); }}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, color: "rgba(255,255,255,0.7)", cursor: "pointer",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 14, letterSpacing: 3, padding: "10px 28px",
            }}
          >
            GOT IT
          </button>
        </div>
      )}
    </div>
  );
}
