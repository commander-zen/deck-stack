import { useState, useEffect, useRef } from "react";
import {
  getCardImage,
  formatManaCost,
  formatPrice,
  autocompleteCardNames,
  fetchCardByName,
  fetchFirstPage,
  buildCategoryQueries,
  buildPlanQuery,
} from "../lib/scryfall.js";
import { CATEGORY_META } from "../lib/wrec.js";
import DeckReviewPill from "../components/DeckReviewPill.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;
const BOTTOM_BAR_H   = 60;

// Tab order per spec: ramp → draw → removal → wrath → plan → lands
const TAB_ORDER = ["ramp", "card-advantage", "disruption", "mass-disruption", "plan", "mana-base"];

const TAB_LABELS = {
  "ramp":           "RAMP",
  "card-advantage": "DRAW",
  "disruption":     "REMOVAL",
  "mass-disruption":"WRATH",
  "plan":           "PLAN",
  "mana-base":      "LANDS",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueues(cards) {
  const groups = {};
  for (const cat of TAB_ORDER) groups[cat] = [];
  for (const card of cards) {
    const cat = card._deckCategory ?? "plan";
    if (groups[cat]) groups[cat].push(card);
    else groups["plan"].push(card);
  }
  const result = {};
  for (const cat of TAB_ORDER) {
    // Take top 30 by EDHREC order (already sorted), then shuffle
    result[cat] = shuffle(groups[cat].slice(0, 30));
  }
  return result;
}

function initCatIdx() {
  return Object.fromEntries(TAB_ORDER.map(c => [c, 0]));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SwipeScreen({
  commander,
  swipeState,   // { initialCards?, queues?, catIdx?, pile?, history?, activeTab? }
  onComplete,   // (pile, savedState) — user clicked I'M DONE or all tabs exhausted
}) {
  const colorId = commander?.color_identity?.join("") || "C";

  // ── Core state ────────────────────────────────────────────────────────────
  const [queues,    setQueues]    = useState(() =>
    swipeState?.queues ?? buildQueues(swipeState?.initialCards ?? [])
  );
  const [catIdx,    setCatIdx]    = useState(() => swipeState?.catIdx ?? initCatIdx());
  const [pile,      setPile]      = useState(() => swipeState?.pile    ?? []);
  const [history,   setHistory]   = useState(() => swipeState?.history ?? []);
  const [activeTab, setActiveTab] = useState(() => swipeState?.activeTab ?? TAB_ORDER[0]);

  // ── Drag / animation ──────────────────────────────────────────────────────
  const [offset,   setOffset]  = useState(0);
  const [dragging, setDragging]= useState(false);
  const [badge,    setBadge]   = useState(null);  // "keep" | "pass" | null
  const [animOut,  setAnimOut] = useState(null);  // "right" | "left" | null

  // ── Syntax inspector ──────────────────────────────────────────────────────
  const [inspOpen,    setInspOpen]    = useState(false);
  const [queryText,   setQueryText]   = useState("");
  const [refetching,  setRefetching]  = useState(false);

  // ── Bottom search bar ─────────────────────────────────────────────────────
  const [searchVal,   setSearchVal]  = useState("");
  const [searchSuggs, setSearchSuggs]= useState([]);
  const [searchOpen,  setSearchOpen] = useState(false);
  const [searchBusy,  setSearchBusy] = useState(false);

  const dragStartRef = useRef(null);
  const searchRef    = useRef(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const queue   = queues[activeTab] ?? [];
  const idx     = catIdx[activeTab] ?? 0;
  const card    = queue[idx] ?? null;
  const tabDone = idx >= queue.length;

  // ── Sync query text when tab changes ─────────────────────────────────────
  useEffect(() => {
    const catQueries = buildCategoryQueries(colorId);
    if (activeTab === "plan") {
      setQueryText(buildPlanQuery(commander, colorId) ?? "");
    } else {
      setQueryText(catQueries[activeTab] ?? "");
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") doResolve(true);
      if (e.key === "ArrowLeft")  doResolve(false);
      if (e.key === "z" || e.key === "Z") doUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // intentionally re-registers every render so callbacks close over fresh state

  // ── Autocomplete debounce ─────────────────────────────────────────────────
  useEffect(() => {
    if (!searchVal.trim()) { setSearchSuggs([]); setSearchOpen(false); return; }
    const timer = setTimeout(async () => {
      const names = await autocompleteCardNames(searchVal);
      setSearchSuggs(names);
      setSearchOpen(names.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // ── Resolve (keep / pass) ─────────────────────────────────────────────────
  function doResolve(keep) {
    if (!card || animOut || tabDone) return;
    setAnimOut(keep ? "right" : "left");
    setBadge(keep ? "keep" : "pass");
    setTimeout(() => {
      setHistory(h => [...h, { card, cat: activeTab, kept: keep }]);
      if (keep) setPile(p => [...p, card]);
      setCatIdx(prev => ({ ...prev, [activeTab]: (prev[activeTab] ?? 0) + 1 }));
      setOffset(0);
      setBadge(null);
      setAnimOut(null);
    }, 260);
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  function doUndo() {
    if (history.length === 0 || animOut) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (last.kept) setPile(p => p.filter(c => c !== last.card));
    setCatIdx(prev => ({ ...prev, [last.cat]: Math.max(0, (prev[last.cat] ?? 0) - 1) }));
    setActiveTab(last.cat);
  }

  // ── I'M DONE ─────────────────────────────────────────────────────────────
  function handleDone() {
    onComplete(pile, { queues, catIdx, pile, history, activeTab });
  }

  // ── Refetch current tab ───────────────────────────────────────────────────
  async function handleRefetch() {
    if (!queryText.trim() || refetching) return;
    setRefetching(true);
    try {
      const cards = await fetchFirstPage(queryText);
      const tagged = cards.map(c => ({ ...c, _deckCategory: activeTab }));
      const newQueue = shuffle(tagged).slice(0, 30);
      setQueues(prev => ({ ...prev, [activeTab]: newQueue }));
      setCatIdx(prev => ({ ...prev, [activeTab]: 0 }));
    } catch (e) {
      if (e.name === "AbortError") return;
      // silently swallow other errors
    } finally {
      setRefetching(false);
    }
  }

  // ── Add card to front of active tab queue ─────────────────────────────────
  async function addCardToQueue(name) {
    setSearchVal("");
    setSearchSuggs([]);
    setSearchOpen(false);
    setSearchBusy(true);
    try {
      const fetched = await fetchCardByName(name);
      const tagged  = { ...fetched, _deckCategory: activeTab };
      setQueues(prev => {
        const q       = prev[activeTab] ?? [];
        const current = catIdx[activeTab] ?? 0;
        const newQueue = [...q.slice(0, current), tagged, ...q.slice(current)];
        return { ...prev, [activeTab]: newQueue };
      });
    } catch {
      // card not found — silently ignore
    } finally {
      setSearchBusy(false);
      searchRef.current?.focus();
    }
  }

  // ── Pile remove (for DeckReviewPill) ──────────────────────────────────────
  function handlePileRemove(cardId, cat) {
    setPile(prev => prev.filter(c => !(c.id === cardId && (c._deckCategory ?? "plan") === cat)));
  }

  // ── Pointer drag ──────────────────────────────────────────────────────────
  function onPointerDown(e) {
    if (animOut || tabDone) return;
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

  // ── Display values ────────────────────────────────────────────────────────
  const commanderArt = commander ? getCardImage(commander, "art_crop") : null;
  const artUrl       = card ? getCardImage(card, "art_crop")  : null;
  const mainUrl      = card ? getCardImage(card, "normal")    : null;
  const price        = card ? formatPrice(card) : null;

  const rotation   = animOut ? (animOut === "right" ? 14 : -14) : offset / 22;
  const tx         = animOut ? (animOut === "right" ? 560 : -560) : offset;
  const cardOpacity = animOut ? 0 : 1;

  const catMeta    = activeTab ? CATEGORY_META[activeTab] : null;
  const counterStr = tabDone
    ? `ALL ${TAB_LABELS[activeTab]} SEEN`
    : `${idx + 1} / ${queue.length} · ${pile.length} KEPT`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100dvh",
      maxHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'IBM Plex Mono', monospace",
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
        padding: "0 12px",
        gap: 10,
        height: 52,
        background: "rgba(13,13,15,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      }}>
        {commanderArt && (
          <img
            src={commanderArt}
            alt=""
            style={{ height: 30, width: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
          />
        )}
        <span style={{
          flex: 1,
          fontSize: 11,
          color: "var(--text)",
          letterSpacing: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {commander?.name ?? "DECK STACK"}
        </span>
        <button
          onClick={handleDone}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--success)",
            background: "rgba(52,211,153,0.08)",
            color: "var(--success)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13,
            letterSpacing: 3,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ✓ I'M DONE
        </button>
      </div>

      {/* ── Category tab bar ── */}
      <div style={{
        position: "relative",
        zIndex: 15,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        background: "rgba(13,13,15,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {TAB_ORDER.map(cat => {
          const active   = cat === activeTab;
          const tabQueue = queues[cat] ?? [];
          const tabIdx   = catIdx[cat] ?? 0;
          const remaining = tabQueue.length - tabIdx;
          const exhausted = remaining <= 0;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 4px",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`,
                background: "transparent",
                color: active
                  ? "var(--primary)"
                  : exhausted ? "rgba(255,255,255,0.2)" : "var(--muted)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 11,
                letterSpacing: 1,
                cursor: "pointer",
                position: "relative",
                transition: "color 0.12s, border-color 0.12s",
                textAlign: "center",
              }}
            >
              {TAB_LABELS[cat]}
              {!exhausted && (
                <span style={{
                  marginLeft: 3,
                  fontSize: 8,
                  opacity: active ? 0.8 : 0.4,
                }}>
                  {remaining}
                </span>
              )}
            </button>
          );
        })}
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
        paddingBottom: 8,
      }}>

        {/* Counter */}
        <div style={{
          fontSize: 10,
          color: tabDone ? "var(--active)" : "var(--muted)",
          letterSpacing: 2,
          marginBottom: 8,
          flexShrink: 0,
        }}>
          {counterStr}
        </div>

        {tabDone ? (
          /* Tab exhausted placeholder */
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "0 32px",
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
                fontSize: 28,
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: 3,
                color: "rgba(255,255,255,0.2)",
              }}>
                {catMeta?.emoji ?? ""} DONE
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
                ALL {TAB_LABELS[activeTab]} CARDS SEEN
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>
              Pick another tab or refetch with a new query ↓
            </div>
          </div>
        ) : (
          /* Swipeable card */
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
                  maxHeight: "68dvh",
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
                color: "var(--muted)", fontSize: 13,
                padding: 16, textAlign: "center",
              }}>
                {card?.name}
              </div>
            )}
          </div>
        )}

        {/* Card info */}
        {card && !tabDone && (
          <div style={{ textAlign: "center", marginTop: 10, padding: "0 16px", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{card.name}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
              {card.type_line}
              {card.mana_cost ? ` · ${formatManaCost(card.mana_cost)}` : ""}
              {price ? ` · ${price}` : ""}
            </div>
          </div>
        )}
      </div>

      {/* ── Action buttons (always visible, outside scrollable card area) ── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "10px 0 6px",
      }}>
        <button
          onClick={() => doResolve(false)}
          disabled={tabDone || !!animOut}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            border: "2px solid var(--danger)",
            background: tabDone ? "rgba(255,77,109,0.04)" : "rgba(255,77,109,0.1)",
            color: tabDone ? "rgba(255,77,109,0.3)" : "var(--danger)",
            fontSize: 20,
            cursor: tabDone ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <button
          onClick={doUndo}
          disabled={history.length === 0}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: history.length > 0 ? "var(--secondary)" : "rgba(255,255,255,0.15)",
            fontSize: 11, letterSpacing: 1,
            cursor: history.length > 0 ? "pointer" : "default",
          }}
        >UNDO</button>

        <button
          onClick={() => doResolve(true)}
          disabled={tabDone || !!animOut}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            border: "2px solid var(--success)",
            background: tabDone ? "rgba(52,211,153,0.04)" : "rgba(52,211,153,0.1)",
            color: tabDone ? "rgba(52,211,153,0.3)" : "var(--success)",
            fontSize: 20,
            cursor: tabDone ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >♥</button>
      </div>

      {/* ── Syntax inspector toggle row ── */}
      <div style={{
        position: "relative",
        zIndex: 20,
        flexShrink: 0,
        background: "rgba(13,13,15,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={() => setInspOpen(v => !v)}
          style={{
            width: "100%",
            padding: "7px 14px",
            background: "transparent",
            border: "none",
            borderBottom: inspOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
            color: "var(--muted)",
            fontSize: 10,
            letterSpacing: 2,
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>⌕ QUERY</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.5 }}>
            {!inspOpen && queryText}
          </span>
          <span>{inspOpen ? "▼" : "▶"}</span>
        </button>

        {inspOpen && (
          <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
            <textarea
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                color: "var(--text)",
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: 0.5,
                padding: "6px 8px",
                resize: "vertical",
                outline: "none",
                caretColor: "var(--primary)",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleRefetch}
              disabled={refetching || !queryText.trim()}
              style={{
                alignSelf: "flex-end",
                padding: "5px 14px",
                borderRadius: 6,
                border: "1px solid rgba(91,143,255,0.3)",
                background: "rgba(91,143,255,0.08)",
                color: refetching ? "var(--muted)" : "var(--primary)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 12,
                letterSpacing: 2,
                cursor: refetching ? "default" : "pointer",
              }}
            >
              {refetching ? "FETCHING…" : "REFETCH ↺"}
            </button>
          </div>
        )}
      </div>

      {/* ── Fixed bottom search bar ── */}
      <div style={{
        position: "relative",
        zIndex: 20,
        flexShrink: 0,
        height: BOTTOM_BAR_H,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(22,22,26,0.98)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 10,
      }}>
        {/* Autocomplete dropdown */}
        {searchOpen && searchSuggs.length > 0 && (
          <div style={{
            position: "absolute",
            bottom: BOTTOM_BAR_H,
            left: 0, right: 0,
            background: "var(--panel)",
            borderTop: "1px solid rgba(91,143,255,0.15)",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
            maxHeight: 260,
            overflowY: "auto",
          }}>
            {searchSuggs.map(name => (
              <button
                key={name}
                onMouseDown={e => { e.preventDefault(); addCardToQueue(name); }}
                style={{
                  width: "100%",
                  display: "block",
                  padding: "11px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  letterSpacing: 0.4,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <span style={{ color: "var(--muted)", fontSize: 16, flexShrink: 0, lineHeight: 1 }}>+</span>
        <input
          ref={searchRef}
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          onFocus={() => searchSuggs.length > 0 && setSearchOpen(true)}
          placeholder=""
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 13,
            caretColor: "var(--primary)",
          }}
        />
        {searchBusy && <span style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>…</span>}
      </div>

      {/* DeckReviewPill */}
      <DeckReviewPill pile={pile} onRemove={handlePileRemove} />
    </div>
  );
}
