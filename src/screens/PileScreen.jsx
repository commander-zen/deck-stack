import { useState, useEffect, useRef } from "react";
import { getCardImage } from "../lib/scryfall.js";
import PileSwipeScreen from "../components/PileSwipeScreen.jsx";
import CommanderModal from "../components/CommanderModal.jsx";
import CommanderSearchSheet from "../components/CommanderSearchSheet.jsx";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

// ── Card-type helpers ─────────────────────────────────────────────────────────
const isBasicLand = c => Boolean(c?.type_line?.includes("Basic Land"));
const isAnyNumber = c => Boolean(c?.oracle_text?.includes("A deck can have any number of cards named"));
const isStackable = c => isBasicLand(c) || isAnyNumber(c);

// ── Export ────────────────────────────────────────────────────────────────────
// Accepts the display pile (already collapsed) so stackable quantities print correctly.
function buildExportText(displayPile, commander, rawPile) {
  const cmdCard = commander ? rawPile.find(c => c.instanceId === commander) : null;
  const rows = cmdCard
    ? displayPile.filter(c => c.name !== cmdCard.name)
    : displayPile;
  const lines = rows.map(c => `${c.qty ?? 1} ${c.name}`).join("\n");
  return cmdCard ? `Commander: ${cmdCard.name}\n\n${lines}` : lines;
}

// ── Display pile ──────────────────────────────────────────────────────────────
// - Stackable cards collapsed by name into a single row with qty (summed across any
//   residual multi-entry groups from legacy data or undo edge-cases).
// - Non-stackable cards deduplicated by Scryfall id (fallback: name).
// - Commander card always gets priority in its position.
function buildDisplayPile(pile, commanderInstanceId) {
  const seenStackable    = new Map(); // name → index in result
  const seenNonStackable = new Set(); // id/name key
  const result           = [];

  // Commander first (commanders are never stackable in practice)
  if (commanderInstanceId) {
    const cmd = pile.find(c => c.instanceId === commanderInstanceId);
    if (cmd && !isStackable(cmd)) {
      seenNonStackable.add(cmd.id ?? cmd.name);
      result.push(cmd);
    }
  }

  for (const card of pile) {
    if (commanderInstanceId && card.instanceId === commanderInstanceId) continue;

    if (isStackable(card)) {
      if (seenStackable.has(card.name)) {
        const i = seenStackable.get(card.name);
        result[i] = { ...result[i], qty: result[i].qty + (card.qty ?? 1) };
      } else {
        seenStackable.set(card.name, result.length);
        result.push({ ...card, qty: card.qty ?? 1 });
      }
    } else {
      const key = card.id ?? card.name;
      if (!seenNonStackable.has(key)) {
        seenNonStackable.add(key);
        result.push(card);
      }
    }
  }

  return result;
}

// Total logical card count (stackables contribute their qty, non-stackables contribute 1)
function totalCount(pile) {
  return pile.reduce((sum, c) => sum + (c.qty ?? 1), 0);
}

// ── Deduplicate by oracle_id for pile review ──────────────────────────────────
function dedupeByOracleId(cards) {
  const seen = new Set();
  const duplicates = [];
  const result = [];
  for (const card of cards) {
    const key = card.oracle_id ?? card.id ?? card.name;
    if (seen.has(key)) {
      duplicates.push(card.name);
    } else {
      seen.add(key);
      result.push(card);
    }
  }
  if (duplicates.length > 0) {
    console.warn("Duplicate oracle_ids removed from pile review:", duplicates);
  }
  return result;
}

function ImageIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/>
      <polyline points="21,15 16,10 5,21"/>
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

// NAV_HEIGHT (60) + STACK & SWIPE button (~52px) + gap (18px)
const FAB_CLEARANCE = NAV_HEIGHT + 52 + 18;

const WREC_CHIP = {
  "Ramp":            { label: "RAMP",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)" },
  "Card Advantage":  { label: "CARD ADV", color: "#5b8fff", bg: "rgba(91,143,255,0.12)",  border: "rgba(91,143,255,0.35)" },
  "Disruption":      { label: "DISRUPT",  color: "#ff4d6d", bg: "rgba(255,77,109,0.12)",  border: "rgba(255,77,109,0.35)" },
  "Mass Disruption": { label: "MASS DIS", color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.35)" },
  "Mana Base":       { label: "MANA",     color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)" },
  "Plan":            { label: "PLAN",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)" },
};

export default function PileScreen({
  pile, onPileChange, onClearPile,
  commander, onCommanderChange,
  commanderCard, onCommanderCardChange,
  maybeboard, onMaybeboardChange,
  initialTab,
  decks = [],
  activeDeckId = null,
  onSave,
  onDoubleTag,
  onAssignTag,
  wrecTags = {},
}) {
  const [deckViewMode,   setDeckViewMode]   = useState("list"); // list view by default
  const [maybeViewMode,  setMaybeViewMode]  = useState("list"); // text view by default
  const [activeTab,      setActiveTab]      = useState(initialTab ?? "deck");
  const [reviewMode,     setReviewMode]     = useState(null);
  const [reviewCards,    setReviewCards]    = useState([]);
  const [reviewStartIdx, setReviewStartIdx] = useState(0);
  const [copied,         setCopied]         = useState(false);
  const [cmdModalOpen,   setCmdModalOpen]   = useState(false);
  const [cmdSearchOpen,  setCmdSearchOpen]  = useState(false);
  const [detailCard,     setDetailCard]     = useState(null);

  // Drag-to-reorder (list view, deck tab only)
  const [drag, setDrag] = useState(null);

  const scrollPos = useRef({ deck: 0, maybe: 0 });
  useEffect(() => {
    scrollPos.current[activeTab] = window.scrollY;
    setActiveTab(initialTab ?? "deck");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);
  useEffect(() => {
    window.scrollTo(0, scrollPos.current[activeTab] ?? 0);
  }, [activeTab]);

  const lpTimerRef = useRef(null);
  const lpFiredRef = useRef(false);

  const reviewCommanderCard =
    commanderCard ??
    (commander ? pile.find(c => c.instanceId === commander) : null);

  const commanderName = reviewCommanderCard?.name ?? null;
  const hasCommander  = Boolean(reviewCommanderCard);

  // ── Display piles (render-time only — do not write these back to Supabase) ──
  const displayPile       = buildDisplayPile(pile, commander);
  const displayMaybeboard = buildDisplayPile(maybeboard, null);

  const activeCards       = activeTab === "deck" ? displayPile       : displayMaybeboard;
  const activeCardsRawLen = activeTab === "deck" ? totalCount(pile)  : totalCount(maybeboard);

  // Derived view mode for the active tab
  const viewMode = activeTab === "deck" ? deckViewMode : maybeViewMode;

  // Bottom padding clears the fixed STACK & SWIPE button + nav bar
  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${FAB_CLEARANCE}px + 40px)`;
  const fabBottom  = `calc(max(10px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 8px)`;

  // ── Review entry ───────────────────────────────────────────────────────────

  function enterReview(mode) {
    const raw     = mode === "deck" ? pile : maybeboard;
    const deduped = dedupeByOracleId(raw);
    setReviewCards(deduped);
    setReviewStartIdx(0);
    setReviewMode(mode);
  }

  function enterReviewAt(card, mode) {
    const raw     = mode === "deck" ? pile : maybeboard;
    const deduped = dedupeByOracleId(raw);
    const startIdx = deduped.findIndex(c => c.instanceId === card.instanceId);
    setReviewCards(deduped);
    setReviewStartIdx(Math.max(0, startIdx));
    setReviewMode(mode);
  }

  // ── Card interactions ──────────────────────────────────────────────────────

  function handleRemove(instanceId, e) {
    e?.stopPropagation();
    const newPile = pile.filter(c => c.instanceId !== instanceId);
    onPileChange(newPile);
    onSave?.(newPile, maybeboard);
    if (commander === instanceId) onCommanderChange(null);
  }

  function handleRemoveMaybe(instanceId, e) {
    e?.stopPropagation();
    const newMaybe = maybeboard.filter(c => c.instanceId !== instanceId);
    onMaybeboardChange(newMaybe);
    onSave?.(pile, newMaybe);
  }

  // Qty +/– for stackable cards.
  // For a single entry with explicit qty (import/swipe-new): increment/decrement qty field.
  // For multiple individual entries (legacy data): add/remove individual copies.
  function handleStackableQtyChange(displayCard, delta) {
    const entries = pile.filter(c => c.name === displayCard.name);
    if (entries.length === 0) return;

    let newPile;
    if (entries.length === 1) {
      const entry   = entries[0];
      const current = entry.qty ?? 1;
      const next    = current + delta;
      if (next <= 0) {
        newPile = pile.filter(c => c.name !== displayCard.name);
      } else {
        newPile = pile.map(c => c.name === displayCard.name ? { ...c, qty: next } : c);
      }
    } else {
      // Legacy multi-entry path
      if (delta > 0) {
        const template = entries[0];
        const clone    = { ...template, instanceId: crypto.randomUUID(), qty: undefined };
        newPile = [...pile, clone];
      } else {
        const lastId = entries[entries.length - 1].instanceId;
        newPile = pile.filter(c => c.instanceId !== lastId);
      }
    }
    onPileChange(newPile);
    onSave?.(newPile, maybeboard);
  }

  function onCardPointerDown(card) {
    lpFiredRef.current = false;
    lpTimerRef.current = setTimeout(() => {
      lpFiredRef.current = true;
      onCommanderChange(commander === card.instanceId ? null : card.instanceId);
    }, 500);
  }

  function onCardPointerUp() { clearTimeout(lpTimerRef.current); }

  function getWrecCategory(oracleId) {
    if (!oracleId) return null;
    for (const [cat, ids] of Object.entries(wrecTags)) {
      if ((ids ?? []).includes(oracleId)) return cat;
    }
    return null;
  }

  function handleCardClick(oracleId, card) {
    if (lpFiredRef.current) { lpFiredRef.current = false; return; }
    setDetailCard(card);
  }

  // ── Drag-to-reorder (operates on displayPile indices) ─────────────────────

  function onDragHandleDown(e, srcIdx) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ srcIdx, targetIdx: srcIdx, startY: e.clientY, currentY: e.clientY });
  }

  function onDragMove(e) {
    if (!drag) return;
    const deltaY = e.clientY - drag.startY;
    const ROW_H  = 50;
    const targetIdx = Math.max(0, Math.min(displayPile.length - 1, drag.srcIdx + Math.round(deltaY / ROW_H)));
    setDrag(d => ({ ...d, currentY: e.clientY, targetIdx }));
  }

  function onDragEnd() {
    if (!drag) return;
    if (drag.targetIdx !== drag.srcIdx) {
      const next = [...displayPile];
      const [moved] = next.splice(drag.srcIdx, 1);
      next.splice(drag.targetIdx, 0, moved);
      onPileChange(next);
      onSave?.(next, maybeboard);
    }
    setDrag(null);
  }

  // ── Review handlers ────────────────────────────────────────────────────────

  function handleReviewKeep(card) {
    if (reviewMode !== "deck") {
      const newMaybe = maybeboard.filter(c => c.instanceId !== card.instanceId);
      const newPile  = [...pile, card];
      onMaybeboardChange(newMaybe);
      onPileChange(newPile);
      onSave?.(newPile, newMaybe);
    }
  }

  function handleReviewPass(card) {
    if (reviewMode === "deck") {
      const newPile  = pile.filter(c => c.instanceId !== card.instanceId);
      const newMaybe = [...maybeboard, card];
      onPileChange(newPile);
      onMaybeboardChange(newMaybe);
      onSave?.(newPile, newMaybe);
    } else {
      const newMaybe = maybeboard.filter(c => c.instanceId !== card.instanceId);
      onMaybeboardChange(newMaybe);
      onSave?.(pile, newMaybe);
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  function handleCopy() {
    const text = buildExportText(displayPile, commander, pile);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleMoxfield() {
    navigator.clipboard?.writeText(buildExportText(displayPile, commander, pile));
    window.open("https://www.moxfield.com/import", "_blank", "noopener,noreferrer");
  }

  // ── Renders ────────────────────────────────────────────────────────────────

  function renderListRow(card, isCommander, onRemove, rowIdx, isDraggable, onTap) {
    const stackable    = isStackable(card);
    // Mana cost: strip Scryfall brace notation {8}{R} → "8 R". Plain strings unchanged.
    const mana         = !stackable
      ? (card.mana_cost?.replace(/\{([^}]+)\}/g, "$1 ").trim() ?? "")
      : "";
    const rowOracleId  = card.oracle_id ?? card.id;
    const wrecCat      = !stackable ? getWrecCategory(rowOracleId) : null;
    const wrecChipDef  = wrecCat ? WREC_CHIP[wrecCat] : null;
    const isDragging   = drag?.srcIdx === rowIdx;
    const isDropTarget = drag && drag.targetIdx === rowIdx && drag.srcIdx !== rowIdx;

    return (
      <div
        key={card.instanceId}
        data-row-idx={rowIdx}
        onPointerMove={drag ? onDragMove : undefined}
        onPointerUp={drag ? onDragEnd : undefined}
        onPointerCancel={drag ? onDragEnd : undefined}
        style={{
          display: "flex", alignItems: "center",
          padding: "9px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          borderTop: isDropTarget && drag.targetIdx < drag.srcIdx ? "2px solid var(--primary)" : "none",
          borderBottomColor: isDropTarget && drag.targetIdx > drag.srcIdx ? "var(--primary)" : "rgba(255,255,255,0.05)",
          background: isDragging ? "rgba(91,143,255,0.08)" : isCommander ? "rgba(255,215,0,0.04)" : "transparent",
          opacity: isDragging ? 0.5 : 1,
          cursor: stackable ? "default" : "pointer",
        }}
        onClick={() => !drag && !stackable && handleCardClick(card.oracle_id ?? card.id, card)}
      >
        {isDraggable && (
          <div
            onPointerDown={e => onDragHandleDown(e, rowIdx)}
            style={{
              marginRight: 8, flexShrink: 0,
              color: "rgba(255,255,255,0.2)", cursor: "grab",
              fontSize: 14, lineHeight: 1, padding: "4px 2px",
              touchAction: "none", userSelect: "none",
            }}
          >⠿</div>
        )}
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
          {!stackable && rowOracleId && !isCommander && (
            <button
              onClick={e => { e.stopPropagation(); onDoubleTag?.(rowOracleId); }}
              style={{
                marginTop: 4,
                display: "inline-flex", alignItems: "center",
                padding: "1px 6px",
                borderRadius: 4,
                border: wrecChipDef
                  ? `1px solid ${wrecChipDef.border}`
                  : "1px dashed rgba(255,255,255,0.18)",
                background: wrecChipDef ? wrecChipDef.bg : "transparent",
                color: wrecChipDef ? wrecChipDef.color : "var(--muted)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: 0.5,
                lineHeight: "14px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {wrecChipDef ? wrecChipDef.label : "UNTAG"}
            </button>
          )}
        </div>

        {/* Stackable: qty controls instead of mana cost */}
        {stackable ? (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 0,
              flexShrink: 0, marginLeft: 8, marginRight: 4,
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); handleStackableQtyChange(card, -1); }}
              style={{
                width: 26, height: 26, border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "6px 0 0 6px", background: "rgba(255,255,255,0.04)",
                color: "var(--text)", cursor: "pointer", fontSize: 14, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >−</button>
            <div style={{
              minWidth: 28, height: 26,
              border: "1px solid rgba(255,255,255,0.12)", borderLeft: "none", borderRight: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: "var(--text)",
              background: "rgba(255,255,255,0.02)",
              paddingInline: 4,
            }}>
              {card.qty ?? 1}
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleStackableQtyChange(card, +1); }}
              style={{
                width: 26, height: 26, border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "0 6px 6px 0", background: "rgba(255,255,255,0.04)",
                color: "var(--text)", cursor: "pointer", fontSize: 14, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >+</button>
          </div>
        ) : (
          mana && (
            <span style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)",
              flexShrink: 0, marginLeft: 8, marginRight: 8,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {mana}
            </span>
          )
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
        onClick={() => handleCardClick(card.oracle_id ?? card.id, card)}
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
        {/* Qty badge for stackable cards in grid view */}
        {isStackable(card) && (card.qty ?? 1) > 1 && (
          <div style={{
            position: "absolute", bottom: 5, left: 5,
            background: "rgba(0,0,0,0.78)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 4, padding: "1px 5px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "var(--text)", lineHeight: "16px",
            pointerEvents: "none",
          }}>
            {card.qty}×
          </div>
        )}
        {!isCommander && (() => {
          const cat = getWrecCategory(card.oracle_id ?? card.id);
          const chip = cat ? WREC_CHIP[cat] : null;
          return chip ? (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 4,
              background: chip.bg,
              borderRadius: "0 0 6px 6px",
              pointerEvents: "none",
            }} />
          ) : null;
        })()}
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

      {/* ── Card detail sheet ── */}
      {detailCard && (() => {
        const dc         = detailCard;
        const oracleId   = dc.oracle_id ?? dc.id;
        const mana       = dc.mana_cost?.replace(/\{([^}]+)\}/g, "$1 ").trim() ?? "";
        const currentCat = getWrecCategory(oracleId);

        function assignAndClose(cat) {
          onAssignTag?.(oracleId, cat);
          setDetailCard(null);
        }

        return (
          <>
            <div
              onClick={() => setDetailCard(null)}
              style={{ position: "fixed", inset: 0, zIndex: 398, background: "rgba(0,0,0,0.55)" }}
            />
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400,
              maxWidth: 600, margin: "0 auto",
              background: "var(--panel)",
              borderRadius: "16px 16px 0 0",
              padding: "0 16px calc(max(20px, env(safe-area-inset-bottom)) + 6px)",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {/* Drag handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)", margin: "14px auto 16px" }} />

              {/* Card identity */}
              <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>
                  {dc.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {dc.type_line && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{dc.type_line}</span>
                  )}
                  {mana && (
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>{mana}</span>
                  )}
                </div>
                {dc.oracle_text && (
                  <div style={{
                    fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 8,
                    lineHeight: 1.5, maxHeight: 80, overflow: "hidden",
                    WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                  }}>
                    {dc.oracle_text}
                  </div>
                )}
              </div>

              {/* Category buttons — 2-col grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: currentCat ? 8 : 0 }}>
                {Object.entries(WREC_CHIP).map(([cat, chip]) => {
                  const isActive = cat === currentCat;
                  return (
                    <button
                      key={cat}
                      onClick={() => isActive ? assignAndClose(null) : assignAndClose(cat)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: isActive ? `1px solid ${chip.border}` : "1px solid rgba(255,255,255,0.08)",
                        background: isActive ? chip.bg : "rgba(255,255,255,0.04)",
                        color: isActive ? chip.color : "var(--text)",
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 13, letterSpacing: 2,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <span>{chip.label}</span>
                      {isActive && <span style={{ fontSize: 11, color: chip.color }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Remove tag — only shown when tagged */}
              {currentCat && (
                <button
                  onClick={() => assignAndClose(null)}
                  style={{
                    width: "100%", padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,80,80,0.2)",
                    background: "transparent",
                    color: "rgba(255,80,80,0.6)",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 12, letterSpacing: 2,
                    cursor: "pointer",
                  }}
                >
                  REMOVE TAG
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* PileSwipeScreen overlay */}
      {reviewMode && (
        <PileSwipeScreen
          cards={reviewCards}
          startIndex={reviewStartIdx}
          mode={reviewMode}
          commanderCard={reviewCommanderCard}
          onKeep={handleReviewKeep}
          onPass={handleReviewPass}
          onDone={() => setReviewMode(null)}
        />
      )}

      {/* ── Sticky header ── */}
      <div style={{
        position: "sticky", top: "env(safe-area-inset-top)", zIndex: 100,
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
                  onClick={() => setCmdModalOpen(true)}
                  style={{
                    width: 40, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0,
                    cursor: "pointer",
                  }}
                />
              )}
              <span
                onClick={() => setCmdModalOpen(true)}
                style={{
                  flex: 1,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 18, letterSpacing: 3, color: "var(--text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
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

          {/* Card count — total logical cards (stackable qty summed) */}
          <span style={{
            fontSize: 12, color: "var(--muted)",
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
          }}>
            {activeCardsRawLen}
          </span>

          {/* List/Grid toggle */}
          <button
            onClick={() => {
              if (activeTab === "deck") setDeckViewMode(v => v === "list" ? "grid" : "list");
              else setMaybeViewMode(v => v === "list" ? "grid" : "list");
            }}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.45)", cursor: "pointer",
              padding: "8px", display: "flex", alignItems: "center", borderRadius: 6,
            }}
            title={viewMode === "list" ? "Switch to grid" : "Switch to list"}
          >
            {viewMode === "list" ? <ImageIcon color="rgba(255,255,255,0.45)" /> : <ListIcon color="rgba(255,255,255,0.45)" />}
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

        {/* SET COMMANDER banner — shown when pile has cards but no commander is assigned */}
        {!hasCommander && pile.length > 0 && activeTab === "deck" && onCommanderCardChange && (
          <button
            onClick={() => setCmdSearchOpen(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "9px 18px",
              background: "rgba(91,143,255,0.10)",
              border: "none",
              borderTop: "1px solid rgba(91,143,255,0.2)",
              cursor: "pointer",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: 3,
              color: "var(--primary)",
            }}
          >
            <span style={{ fontSize: 14 }}>👑</span>
            SET COMMANDER
          </button>
        )}
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
            {activeTab === "deck" ? "Your pile is empty" : "Your maybeboard is empty"}
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              {activeTab === "deck"
                ? "Swipe right on the Stack to add cards here"
                : "Swipe left while reviewing your deck to send cards here"}
            </span>
          </div>
        ) : viewMode === "list" ? (
          /* List view */
          activeTab === "deck"
            ? displayPile.map((card, i) => renderListRow(
                card, commander === card.instanceId, handleRemove, i, true,
                (c) => enterReviewAt(c, "deck")
              ))
            : displayMaybeboard.map((card, i) => renderListRow(
                card, false, (id, e) => handleRemoveMaybe(id, e), i, false,
                (c) => enterReviewAt(c, "maybe")
              ))
        ) : (
          /* Grid view */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {activeTab === "deck"
              ? displayPile.map(card => renderGridCard(card, commander === card.instanceId, handleRemove))
              : displayMaybeboard.map(card => renderGridCard(card, false, (id, e) => handleRemoveMaybe(id, e)))
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

      {/* ── STACK & SWIPE — fixed above BottomNav, never inside scroll flow ── */}
      {activeCards.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: fabBottom,
          left: 0, right: 0,
          maxWidth: 600, margin: "0 auto",
          padding: "0 14px",
          zIndex: 80,
          pointerEvents: "auto",
        }}>
          <button
            onClick={() => enterReview(activeTab)}
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

      {/* ── Commander modal ── */}
      <CommanderModal
        card={cmdModalOpen ? reviewCommanderCard : null}
        onClose={() => setCmdModalOpen(false)}
      />

      {/* ── Commander search sheet ── */}
      <CommanderSearchSheet
        open={cmdSearchOpen}
        onClose={() => setCmdSearchOpen(false)}
        onSelect={card => {
          onCommanderCardChange?.(card);
          setCmdSearchOpen(false);
        }}
        decks={decks}
        excludeDeckId={activeDeckId}
      />
    </div>
  );
}
