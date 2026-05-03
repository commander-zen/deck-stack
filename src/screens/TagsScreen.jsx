import { useState, useRef } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const PRESET_TAGS = ["Ramp", "Card Advantage", "Disruption", "Mass Disruption", "Lands", "Plan"];
const BOTTOM_PAD  = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 20px)`;

// Build oracle_id → first matching card object from pile
function buildOracleMap(pile) {
  const map = new Map();
  for (const card of pile) {
    const key = card.oracle_id ?? card.id ?? card.name;
    if (!map.has(key)) map.set(key, card);
  }
  return map;
}

// Cards whose oracle_id appears in no tag array
function getUntaggedCards(pile, brewTags, allTagNames) {
  const tagged = new Set();
  allTagNames.forEach(tag => (brewTags[tag] ?? []).forEach(id => tagged.add(id)));
  const seen = new Set();
  const result = [];
  for (const card of pile) {
    const key = card.oracle_id ?? card.id ?? card.name;
    if (!tagged.has(key) && !seen.has(key)) {
      seen.add(key);
      result.push(card);
    }
  }
  return result;
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function TagsScreen({
  pile,
  brewTags,
  setBrewTags,
  customTagNames,
  setCustomTagNames,
}) {
  const [dragOver,        setDragOver]        = useState(null);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagInput,     setNewTagInput]     = useState("");
  const newTagRef = useRef(null);

  const oracleMap    = buildOracleMap(pile);
  const allTagNames  = [...PRESET_TAGS, ...customTagNames];
  const untaggedCards = getUntaggedCards(pile, brewTags, allTagNames);

  function getTagCards(tagName) {
    return (brewTags[tagName] ?? []).map(id => oracleMap.get(id)).filter(Boolean);
  }

  // ── Drag handlers ────────────────────────────────────────────────────────

  function onDragStart(e, oracleId, sourceTag) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("oracle_id", oracleId);
    e.dataTransfer.setData("source_tag", sourceTag);
  }

  function onDragOver(e, targetTag) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== targetTag) setDragOver(targetTag);
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
  }

  function onDrop(e, targetTag) {
    e.preventDefault();
    setDragOver(null);
    const oracleId  = e.dataTransfer.getData("oracle_id");
    const sourceTag = e.dataTransfer.getData("source_tag");
    if (!oracleId || sourceTag === targetTag) return;

    const next = { ...brewTags };

    // Remove from source (Untagged is virtual — nothing to remove from next)
    if (sourceTag !== "Untagged") {
      next[sourceTag] = (next[sourceTag] ?? []).filter(id => id !== oracleId);
    }

    if (targetTag === "Untagged") {
      // Drop into Untagged = remove from every tag
      allTagNames.forEach(tag => {
        next[tag] = (next[tag] ?? []).filter(id => id !== oracleId);
      });
    } else {
      const existing = next[targetTag] ?? [];
      if (!existing.includes(oracleId)) {
        next[targetTag] = [...existing, oracleId];
      }
    }

    setBrewTags(next);
  }

  // ── Custom tag management ───────────────────────────────────────────────

  function commitNewTag() {
    const name = newTagInput.trim();
    if (name && !allTagNames.includes(name) && name !== "Untagged") {
      setCustomTagNames(prev => [...prev, name]);
    }
    setNewTagInput("");
    setShowNewTagInput(false);
  }

  function deleteCustomTag(tagName) {
    setCustomTagNames(prev => prev.filter(n => n !== tagName));
    const { [tagName]: _removed, ...rest } = brewTags;
    setBrewTags(rest);
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  function renderCardTile(card, tagName) {
    const imgUrl   = getCardImage(card, "normal");
    const oracleId = card.oracle_id ?? card.id ?? card.name;
    return (
      <div
        key={oracleId}
        draggable
        onDragStart={e => onDragStart(e, oracleId, tagName)}
        style={{
          position: "relative",
          width: 64,
          aspectRatio: "63/88",
          borderRadius: 7,
          overflow: "hidden",
          cursor: "grab",
          flexShrink: 0,
          background: "var(--panel2)",
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={card.name}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "rgba(255,255,255,0.4)", padding: 4, textAlign: "center",
          }}>
            {card.name}
          </div>
        )}
      </div>
    );
  }

  function renderBucket(tagName, cards, isCustom, isUntagged) {
    const isOver = dragOver === tagName;
    return (
      <div
        key={tagName}
        onDragOver={e => onDragOver(e, tagName)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, tagName)}
        style={{
          borderRadius: 12,
          border: isOver
            ? "1px solid var(--primary)"
            : "1px solid rgba(255,255,255,0.07)",
          background: isOver ? "rgba(91,143,255,0.06)" : "var(--panel)",
          transition: "border-color 0.15s, background 0.15s",
          marginBottom: 8,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "10px 14px",
          borderBottom: cards.length > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>
          <span style={{
            flex: 1,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13, letterSpacing: 2,
            color: isUntagged ? "var(--muted)" : "var(--text)",
          }}>
            {tagName}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "var(--muted)",
            marginRight: isCustom ? 10 : 0,
          }}>
            {cards.length}
          </span>
          {isCustom && (
            <button
              onClick={() => deleteCustomTag(tagName)}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.25)", cursor: "pointer",
                padding: "2px 3px", lineHeight: 1, display: "flex", alignItems: "center",
              }}
              onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
              onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
              title={`Delete ${tagName}`}
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {/* Card tiles */}
        {cards.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px" }}>
            {cards.map(card => renderCardTile(card, tagName))}
          </div>
        ) : !isUntagged ? (
          <div style={{ padding: "12px 14px", color: "var(--muted)", fontSize: 12, fontStyle: "italic" }}>
            Drop cards here
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: "env(safe-area-inset-top)", zIndex: 100,
        maxWidth: 600, margin: "0 auto", width: "100%",
        background: "rgba(13,13,15,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center",
        padding: "0 16px", height: 52, gap: 10,
      }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 4, color: "var(--primary)" }}>
          TAGS
        </span>
        {pile.length > 0 && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)" }}>
            {pile.length} cards
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%", padding: "12px 12px", paddingBottom: BOTTOM_PAD }}>
        {pile.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 20px", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
            No cards in pile yet
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              Swipe right on the Stack to add cards
            </span>
          </div>
        ) : (
          <>
            {/* Preset + custom buckets */}
            {allTagNames.map(tagName =>
              renderBucket(tagName, getTagCards(tagName), customTagNames.includes(tagName), false)
            )}

            {/* Untagged — always last */}
            {renderBucket("Untagged", untaggedCards, false, true)}

            {/* Add custom tag */}
            <div style={{ paddingTop: 4 }}>
              {showNewTagInput ? (
                <input
                  ref={newTagRef}
                  autoFocus
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  commitNewTag();
                    if (e.key === "Escape") { setShowNewTagInput(false); setNewTagInput(""); }
                  }}
                  onBlur={commitNewTag}
                  placeholder="Tag name…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--panel2)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, padding: "11px 14px",
                    color: "var(--text)", fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                  }}
                />
              ) : (
                <button
                  onClick={() => setShowNewTagInput(true)}
                  style={{
                    width: "100%", padding: "12px 14px",
                    background: "transparent",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    borderRadius: 12, cursor: "pointer",
                    color: "var(--muted)",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 13, letterSpacing: 2,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  ＋ NEW TAG
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
