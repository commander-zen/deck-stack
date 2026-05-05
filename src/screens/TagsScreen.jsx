import { useState } from "react";
import { WREC_CATEGORIES, WREC_TARGETS, calcWrecScore } from "../constants/wrec.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const BOTTOM_PAD = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 20px)`;

function formatMana(card) {
  return card.mana_cost?.replace(/\{([^}]+)\}/g, "$1 ").trim() ?? "";
}

function buildOracleMap(pile) {
  const map = new Map();
  for (const card of pile) {
    const key = card.oracle_id ?? card.id ?? card.name;
    if (!map.has(key)) map.set(key, card);
  }
  return map;
}

function getUntagged(pile, wrecTags) {
  const tagged = new Set(Object.values(wrecTags).flat());
  const seen   = new Set();
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

function scoreColor(score) {
  const n = parseFloat(score);
  if (n >= 0.9 && n <= 1.1)  return "var(--success)";
  if (n >= 0.7 && n <= 1.3)  return "var(--active)";
  return "var(--danger)";
}

export default function TagsScreen({ pile, wrecTags, autoTagged }) {
  const oracleMap  = buildOracleMap(pile);
  const score      = calcWrecScore(wrecTags, pile);
  const color      = scoreColor(score);
  const untagged   = getUntagged(pile, wrecTags);
  const [collapsed, setCollapsed] = useState({});

  function renderProgressBar(count, target) {
    const ratio      = Math.min(count / target, 1);
    const isOver     = count > target;
    const overCount  = isOver ? count - target : 0;
    const barColor   = count >= target ? "var(--success)" : "var(--primary)";

    return (
      <div style={{
        height: 4, borderRadius: 2,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        position: "relative",
        marginTop: 4,
      }}>
        {/* Normal fill */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${ratio * 100}%`,
          background: isOver ? "var(--success)" : barColor,
          borderRadius: 2,
          transition: "width 0.3s ease",
        }} />
        {/* Overflow indicator — a red notch at the right edge when over target */}
        {isOver && (
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0,
            width: `${Math.min((overCount / target) * 100, 30)}%`,
            background: "var(--danger)",
            borderRadius: "0 2px 2px 0",
          }} />
        )}
      </div>
    );
  }

  function renderCardRow(card, isPlan) {
    if (!card) return null;
    const oracleId  = card.oracle_id ?? card.id ?? card.name;
    const mana      = formatMana(card);
    const isAuto    = autoTagged?.has(oracleId);
    return (
      <div
        key={oracleId}
        style={{
          display: "flex", alignItems: "center",
          padding: "7px 14px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {card.name}
          </div>
        </div>
        {isAuto && (
          <span style={{
            fontSize: 10, color: "var(--muted)",
            fontFamily: "'IBM Plex Mono', monospace",
            marginRight: 8, flexShrink: 0,
          }}>
            ✦ auto
          </span>
        )}
        {mana && (
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.35)",
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
          }}>
            {mana}
          </span>
        )}
      </div>
    );
  }

  function renderBucket(cat) {
    const target    = WREC_TARGETS[cat];
    const ids       = wrecTags[cat] ?? [];
    const count     = ids.length;
    const cards     = ids.map(id => oracleMap.get(id)).filter(Boolean);
    const isCollapsed = collapsed[cat] ?? false;

    return (
      <div key={cat} style={{
        background: "var(--panel)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        marginBottom: 8,
        overflow: "hidden",
      }}>
        {/* Bucket header — tappable */}
        <div
          onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
          style={{ padding: "10px 14px 8px", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: 2, color: "var(--text)",
              flex: 1,
            }}>
              {cat}
            </span>
            <span style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1 }}>
              {isCollapsed ? "▸" : "▾"}
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: count >= target ? "var(--success)" : count === 0 ? "var(--muted)" : "var(--text)",
            }}>
              {count} / {target}
            </span>
          </div>
          {renderProgressBar(count, target)}
        </div>

        {/* Card list — hidden when collapsed */}
        {!isCollapsed && (
          cards.length > 0 ? (
            <div style={{ paddingBottom: 4 }}>
              {cards.map(card => renderCardRow(card, false))}
            </div>
          ) : (
            <div style={{ padding: "8px 14px 10px", fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
              No cards — double-tap any card to assign
            </div>
          )
        )}
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
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 16px", height: 52, gap: 12,
        }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 4, color: "var(--primary)", flex: 1 }}>
            WREC SCORE
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 20, color,
            letterSpacing: 1,
          }}>
            {score}
          </span>
        </div>

        {/* Warning banner — always visible */}
        <div style={{
          padding: "7px 16px",
          background: "rgba(245,158,11,0.08)",
          borderTop: "1px solid rgba(245,158,11,0.15)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span style={{ fontSize: 12, color: "rgba(245,158,11,0.7)", fontFamily: "'DM Sans', sans-serif" }}>
            Auto-generated — review tags for accuracy
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%", padding: "12px 12px", paddingBottom: BOTTOM_PAD }}>
        {pile.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 20px", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
            No cards in pile yet
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              Swipe right on the Stack to start building
            </span>
          </div>
        ) : (
          <>
            {WREC_CATEGORIES.map(cat => renderBucket(cat))}

            {/* Untagged section */}
            {untagged.length > 0 && (
              <div style={{
                background: "var(--panel)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "10px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 2, color: "var(--muted)" }}>
                    UNTAGGED
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)" }}>
                    {untagged.length}
                  </span>
                </div>
                <div style={{ paddingBottom: 4 }}>
                  {untagged.map(card => renderCardRow(card, false))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
