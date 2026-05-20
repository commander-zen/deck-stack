import { useState, useEffect, useRef } from "react";
import { getCardImage, fetchFirstPage } from "../lib/scryfall.js";

// ── Win98 segmented progress bar ──────────────────────────────────────────────
function ProgressBar() {
  const N = 10;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLit(n => (n + 1) % (N + 1)), 130);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ padding: "0 40px" }}>
      <div style={{
        borderStyle: "solid", borderWidth: "2px",
        borderTopColor: "var(--bevel-dark)",
        borderLeftColor: "var(--bevel-dark)",
        borderBottomColor: "var(--bevel-light)",
        borderRightColor: "var(--bevel-light)",
        background: "var(--color-surface)",
        padding: 3,
        display: "flex",
        gap: 3,
      }}>
        {Array.from({ length: N }, (_, i) => (
          <div key={i} style={{
            flex: 1,
            height: 18,
            background: i < lit ? "var(--color-titlebar)" : "transparent",
          }} />
        ))}
      </div>
      <div style={{
        textAlign: "center",
        marginTop: 8,
        fontFamily: "var(--font-system)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
      }}>
        Loading cards…
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "absolute",
      top: 52,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 10,
      background: "var(--color-chrome)",
      color: "var(--color-text-chrome)",
      fontFamily: "var(--font-system)",
      fontSize: "var(--font-size-sm)",
      borderStyle: "solid",
      borderWidth: "2px",
      borderTopColor: "var(--bevel-light)",
      borderLeftColor: "var(--bevel-light)",
      borderBottomColor: "var(--bevel-dark)",
      borderRightColor: "var(--bevel-dark)",
      padding: "5px 14px",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    }}>
      {msg}
    </div>
  );
}

// ── CardBrowserScreen ─────────────────────────────────────────────────────────
export default function CardBrowserScreen({ query, brewCards = [], onAddCard, onClose }) {
  const [cards,     setCards]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging,  setDragging]  = useState(false);
  const [flyingIdx, setFlyingIdx] = useState(null);
  const [toast,     setToast]     = useState(null);

  const gestureRef = useRef(null); // { x, y, time, axis, pointerId }
  const toastTimer = useRef(null);

  // Keep a live set of oracle_ids already in the brew for deduplication
  const brewSet = useRef(new Set());
  useEffect(() => {
    brewSet.current = new Set(
      (brewCards ?? []).map(c => c.oracle_id).filter(Boolean)
    );
  }, [brewCards]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query?.trim()) { setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true); setError(null); setCards([]); setActiveIdx(0);

    fetchFirstPage(query, { signal: ctrl.signal })
      .then(raw => {
        setCards(raw.filter(c => !brewSet.current.has(c.oracle_id)));
        setLoading(false);
      })
      .catch(err => {
        if (err.name === "AbortError") return;
        setError(err.message ?? "Failed to load cards.");
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  // ── Carousel geometry (computed each render from live viewport width) ───────
  const vw     = window.innerWidth;
  const CARD_W = Math.round(vw * 0.78);
  const GAP    = 14;
  const SLOT   = CARD_W + GAP;
  const inset  = Math.round((vw - CARD_W) / 2);
  const baseX  = inset - activeIdx * SLOT;
  const trackX = baseX + (dragging ? dragOffset : 0);
  const trackTransition = dragging
    ? "none"
    : "transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  // ── Flick-up handler ───────────────────────────────────────────────────────
  function handleFlickUp() {
    const card = cards[activeIdx];
    if (!card || flyingIdx !== null) return;

    if (brewSet.current.has(card.oracle_id)) {
      showToast("Already in brew");
      return;
    }

    const flickedIdx = activeIdx;
    const lenBefore  = cards.length;

    onAddCard?.(card);
    showToast("Added to brew");
    setFlyingIdx(flickedIdx);

    setTimeout(() => {
      setFlyingIdx(null);
      setCards(prev => prev.filter((_, i) => i !== flickedIdx));
      setActiveIdx(prev =>
        prev > flickedIdx   ? prev - 1 :
        prev === flickedIdx ? Math.min(prev, lenBefore - 2) :
        prev
      );
    }, 340);
  }

  // ── Pointer handlers ───────────────────────────────────────────────────────
  function onPD(e) {
    if (cards.length === 0 || flyingIdx !== null) return;
    e.preventDefault();
    gestureRef.current = {
      x: e.clientX, y: e.clientY,
      time: Date.now(), axis: null,
      pointerId: e.pointerId,
    };
  }

  function onPM(e) {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;

    if (g.axis === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        g.axis = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
        if (g.axis === "h") {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
        }
      }
      return;
    }

    if (g.axis === "h") {
      setDragging(true);
      setDragOffset(dx);
    }
  }

  function onPU(e) {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.pointerId) return;
    gestureRef.current = null;

    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    const dt = Math.max(Date.now() - g.time, 1);

    setDragging(false);
    setDragOffset(0);

    // Flick up: upward, fast, mostly vertical
    if (dy < -50 && Math.abs(dy) > Math.abs(dx) && (Math.abs(dy) / dt) > 0.35) {
      handleFlickUp();
      return;
    }

    // Horizontal snap
    if (g.axis === "h") {
      const threshold = CARD_W * 0.22;
      if (dx < -threshold && activeIdx < cards.length - 1) setActiveIdx(i => i + 1);
      else if (dx > threshold && activeIdx > 0)             setActiveIdx(i => i - 1);
    }
  }

  function onPCancel() {
    gestureRef.current = null;
    setDragging(false);
    setDragOffset(0);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 300,
      background: "#000",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* Title bar */}
      <div style={{
        background: "var(--color-titlebar)",
        color: "var(--color-titlebar-text)",
        fontFamily: "var(--font-system)",
        fontSize: "var(--font-size-base)",
        fontWeight: "bold",
        padding: "var(--space-1) var(--space-2)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        flexShrink: 0,
      }}>
        <span style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "var(--font-size-sm)",
          opacity: 0.9,
        }}>
          {query}
        </span>

        {!loading && !error && cards.length > 0 && (
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "var(--font-size-sm)",
            opacity: 0.65,
            flexShrink: 0,
            letterSpacing: 1,
          }}>
            {activeIdx + 1}/{cards.length}
          </span>
        )}

        <button
          onClick={onClose}
          style={{
            background: "var(--color-chrome)",
            color: "var(--color-text-chrome)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-sm)",
            lineHeight: 1,
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: "var(--bevel-light)",
            borderLeftColor: "var(--bevel-light)",
            borderBottomColor: "var(--bevel-dark)",
            borderRightColor: "var(--bevel-dark)",
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 0,
            padding: 0,
            flexShrink: 0,
          }}
        >✕</button>
      </div>

      {/* Content area — centered vertically */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}>

        {loading ? (
          <ProgressBar />
        ) : error ? (
          <div style={{
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-base)",
            padding: "0 40px",
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        ) : cards.length === 0 ? (
          <div style={{
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-base)",
          }}>
            No cards found
          </div>
        ) : (
          <>
            {/* Carousel track */}
            <div
              style={{
                width: "100%",
                overflow: "hidden",
                touchAction: "none",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onPointerDown={onPD}
              onPointerMove={onPM}
              onPointerUp={onPU}
              onPointerCancel={onPCancel}
            >
              <div style={{
                display: "flex",
                gap: GAP,
                transform: `translateX(${trackX}px)`,
                transition: trackTransition,
                willChange: "transform",
              }}>
                {cards.map((card, i) => {
                  const imgUrl   = getCardImage(card, "normal");
                  const isActive = i === activeIdx;
                  const isFlying = i === flyingIdx;

                  return (
                    <div
                      key={card.id ?? i}
                      style={{
                        width: CARD_W,
                        flexShrink: 0,
                        opacity: isActive ? 1 : 0.4,
                        transform: isFlying ? "translateY(-130vh)" : "none",
                        transition: isFlying
                          ? "transform 340ms cubic-bezier(0.4, 0, 0.2, 1)"
                          : "opacity 180ms ease",
                        willChange: isFlying ? "transform" : "auto",
                      }}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={card.name}
                          draggable={false}
                          style={{
                            width: "100%",
                            display: "block",
                            borderRadius: 10,
                            pointerEvents: "none",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%",
                          aspectRatio: "5/7",
                          background: "var(--color-surface)",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-text-secondary)",
                          fontFamily: "var(--font-system)",
                          fontSize: "var(--font-size-sm)",
                          textAlign: "center",
                          padding: 16,
                        }}>
                          {card.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gesture hint */}
            <div style={{
              textAlign: "center",
              marginTop: 16,
              color: "rgba(255,255,255,0.22)",
              fontFamily: "var(--font-system)",
              fontSize: "var(--font-size-sm)",
              letterSpacing: 1,
              userSelect: "none",
            }}>
              FLICK UP TO ADD · SWIPE TO BROWSE
            </div>
          </>
        )}

        {/* Toast sits inside the positioned parent so it layers above the carousel */}
        <Toast msg={toast} />
      </div>
    </div>
  );
}
