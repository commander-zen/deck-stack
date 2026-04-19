import { useState, useEffect, useRef } from "react";
import { getCardImage, searchCommanders } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const SWIPE_THRESHOLD = 60;
const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };
const TIP_KEY = "deckstack_swipe_tip_seen";

function haptic(pattern = 10) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

export default function SwipeScreen({
  cards, pile, onPileChange,
  onGoToPile, commanderCard, onCommanderCardChange,
  initialIndex, onIndexChange,
}) {
  const [idx,     setIdx]     = useState(initialIndex ?? 0);
  const [history, setHistory] = useState([]);
  const [offset,  setOffset]  = useState(0);
  const [dragging,setDragging]= useState(false);
  const [badge,   setBadge]   = useState(null);
  const [animOut, setAnimOut] = useState(null);

  // Inline commander picker
  const [cmdPickerOpen, setCmdPickerOpen]   = useState(false);
  const [cmdQuery,      setCmdQuery]        = useState("");
  const [cmdResults,    setCmdResults]      = useState([]);
  const cmdAbortRef = useRef(null);
  const cmdInputRef = useRef(null);

  // Onboarding tip
  const [showTip,    setShowTip]    = useState(false);
  const [tipDismiss, setTipDismiss] = useState(false); // permanent dismiss in flight
  const tipShownRef = useRef(false);

  const didMountRef = useRef(false);
  const dragStartRef = useRef(null);

  const card = cards[idx] ?? null;
  const done = idx >= cards.length;

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

  // Commander search autocomplete
  useEffect(() => {
    if (!cmdQuery.trim()) { setCmdResults([]); return; }
    const timer = setTimeout(async () => {
      cmdAbortRef.current?.abort();
      const ctrl = new AbortController();
      cmdAbortRef.current = ctrl;
      try {
        const results = await searchCommanders(cmdQuery, { signal: ctrl.signal });
        if (!ctrl.signal.aborted) setCmdResults(results.slice(0, 5));
      } catch { /* aborted */ }
    }, 280);
    return () => clearTimeout(timer);
  }, [cmdQuery]);

  function openCmdPicker() {
    setCmdPickerOpen(true);
    setCmdQuery("");
    setCmdResults([]);
    setTimeout(() => cmdInputRef.current?.focus(), 50);
  }

  function closeCmdPicker() {
    setCmdPickerOpen(false);
    setCmdQuery("");
    setCmdResults([]);
    cmdAbortRef.current?.abort();
  }

  function selectCommander(c) {
    onCommanderCardChange?.(c);
    closeCmdPicker();
  }

  function clearCommander() {
    onCommanderCardChange?.(null);
    closeCmdPicker();
  }

  // ── Swipe logic ────────────────────────────────────────────────────────────

  function doResolve(keep) {
    if (!card || animOut || done) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");
    const cardEntry = keep ? { ...card, instanceId: crypto.randomUUID() } : card;

    if (keep) {
      haptic(12);
      // Show onboarding tip once
      if (!tipShownRef.current && !localStorage.getItem(TIP_KEY)) {
        tipShownRef.current = true;
        setShowTip(true);
        setTimeout(() => setShowTip(false), 2200);
      }
    } else {
      haptic(6);
    }

    setTimeout(() => {
      setHistory(h => [...h, { card: cardEntry, kept: keep }]);
      if (keep) onPileChange([...pile, cardEntry]);
      setIdx(i => i + 1);
      setOffset(0); setBadge(null); setAnimOut(null);
    }, 260);
  }

  function doUndo() {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (last.kept) onPileChange(pile.filter(c => c !== last.card));
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
    if (animOut || done || cmdPickerOpen) return;
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

  const artUrl  = card ? getCardImage(card, "art_crop") : null;
  const mainUrl = card ? getCardImage(card, "normal")   : null;

  const rotation = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx       = animOut ? (animOut === "right" ? 560 : -560) : offset;

  const counterStr = done
    ? `${pile.length} KEPT`
    : `${idx + 1} / ${cards.length} · ${pile.length} KEPT`;

  return (
    <div style={{
      height: `calc(100dvh - ${NAV_HEIGHT}px)`,
      maxHeight: `calc(100dvh - ${NAV_HEIGHT}px)`,
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

      {/* ── Top bar ── */}
      <div style={{
        position: "relative", zIndex: 20, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 14px", height: 52,
        background: "rgba(13,13,15,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18, letterSpacing: 4, color: "var(--primary)",
          marginRight: 12, flexShrink: 0,
        }}>
          DECK STACK
        </span>

        {/* Inline commander selector */}
        <div style={{ flex: 1, position: "relative" }}>
          {cmdPickerOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                ref={cmdInputRef}
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                onBlur={() => setTimeout(closeCmdPicker, 160)}
                placeholder="Search commander…"
                autoComplete="off"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "5px 10px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13, color: "var(--text)",
                  outline: "none", caretColor: "var(--secondary)",
                }}
              />
              <button
                onMouseDown={closeCmdPicker}
                style={{
                  background: "transparent", border: "none",
                  color: "var(--muted)", cursor: "pointer",
                  fontSize: 14, padding: "4px", lineHeight: 1, flexShrink: 0,
                }}
              >✕</button>

              {/* Dropdown */}
              {cmdResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: "var(--panel2)", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  overflow: "hidden", zIndex: 200,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
                }}>
                  {commanderCard && (
                    <button
                      onMouseDown={clearCommander}
                      style={{
                        width: "100%", padding: "9px 12px",
                        background: "transparent", border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        color: "var(--danger)", cursor: "pointer",
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 12, letterSpacing: 2, textAlign: "left",
                      }}
                    >
                      REMOVE COMMANDER
                    </button>
                  )}
                  {cmdResults.map(c => {
                    const thumb = getCardImage(c, "art_crop");
                    return (
                      <button
                        key={c.id}
                        onMouseDown={() => selectCommander(c)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", padding: "8px 12px",
                          background: "transparent", border: "none",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          cursor: "pointer", textAlign: "left",
                        }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseOut={e => e.currentTarget.style.background = "transparent"}
                      >
                        {thumb && (
                          <img src={thumb} alt={c.name} draggable={false}
                            style={{ width: 42, height: 30, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Commander pill — tap to open picker */
            <button
              onClick={openCmdPicker}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: commanderCard ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${commanderCard ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8, padding: "5px 10px",
                cursor: "pointer", maxWidth: "100%",
              }}
            >
              {commanderCard && getCardImage(commanderCard, "art_crop") && (
                <img
                  src={getCardImage(commanderCard, "art_crop")}
                  alt={commanderCard.name}
                  draggable={false}
                  style={{ width: 28, height: 20, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                />
              )}
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, color: commanderCard ? "rgba(167,139,250,0.9)" : "var(--muted)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {commanderCard ? commanderCard.name : "Set commander…"}
              </span>
              {commanderCard && (
                <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>✎</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Card area ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden", paddingTop: 14, paddingBottom: 14,
      }}>

        {/* Counter + Undo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexShrink: 0 }}>
          <div style={{
            fontSize: 12, letterSpacing: 2,
            color: done ? "var(--success)" : "rgba(255,255,255,0.5)",
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
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
            </div>
          </div>
        ) : (
          <div
            style={{
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
                  maxHeight: "65dvh", width: "auto",
                  maxWidth: "min(88vw, 350px)",
                  borderRadius: 14,
                  boxShadow: "0 18px 56px rgba(0,0,0,0.8)",
                  display: "block", pointerEvents: "none",
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

      {/* ── Onboarding tip overlay ── */}
      {showTip && (
        <div
          onClick={() => setShowTip(false)}
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
                { dir: "← LEFT", label: "MAYBE BOARD", color: "var(--secondary)" },
                { dir: "RIGHT →", label: "KEEP IT", color: "var(--success)" },
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
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.3)", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, padding: "8px 16px",
            }}
          >
            Don't show again
          </button>

          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            Tap anywhere to dismiss
          </div>
        </div>
      )}
    </div>
  );
}
