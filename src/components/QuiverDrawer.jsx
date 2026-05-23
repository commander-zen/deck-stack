import { useState } from "react";
import { getCardImage } from "../lib/scryfall.js";

function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QuiverDrawer({ open, onClose, decks, activeDeckId, onSwitch, onNew, onDelete, authUser, onOpenAuth }) {
  const [confirmId, setConfirmId] = useState(null);

  function handleSwitch(id) {
    if (id === activeDeckId) { onClose(); return; }
    onSwitch(id);
    onClose();
  }

  function handleDelete(id) {
    onDelete(id);
    setConfirmId(null);
    if (decks.length <= 1) onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0, 0, 0, 0.75)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        display: "flex", justifyContent: "center",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: open ? "auto" : "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 600,
          maxHeight: "85dvh",
          background: "var(--color-surface)",
          borderStyle: "solid",
          borderWidth: "2px",
          borderTopColor: "var(--bevel-light)",
          borderLeftColor: "var(--bevel-light)",
          borderBottomColor: "var(--bevel-dark)",
          borderRightColor: "var(--bevel-dark)",
          borderRadius: 0,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Drag handle */}
          <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{
              display: "inline-block",
              width: 36, height: 4, borderRadius: 0,
              background: "var(--color-chrome-mid)",
            }} />
          </div>

          {/* Title bar */}
          <div style={{
            background: "var(--color-titlebar)",
            color: "var(--color-titlebar-text)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-base)",
            fontWeight: "bold",
            padding: "var(--space-1) var(--space-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}>
            <span>BREWS ({decks.length})</span>
            <button
              onClick={onClose}
              style={{
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
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: 0,
                padding: 0,
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>close</span>
            </button>
          </div>

          {/* Deck list */}
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            {decks.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 20px",
                color: "var(--color-text-secondary)", fontSize: "var(--font-size-base)",
                fontFamily: "var(--font-system)",
              }}>
                No saved brews yet
              </div>
            ) : (
              decks.map(deck => {
                const isActive = deck.id === activeDeckId;
                const thumb = deck.commander_card ? getCardImage(deck.commander_card, "art_crop") : null;
                const isConfirm = confirmId === deck.id;

                return (
                  <div
                    key={deck.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isActive ? "rgba(0,0,128,0.12)" : "transparent",
                      borderLeft: isActive ? `3px solid var(--color-titlebar)` : "3px solid transparent",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 52, height: 36, borderRadius: 0, flexShrink: 0,
                      background: "var(--color-chrome-dark)",
                      overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderStyle: "solid",
                      borderWidth: "2px",
                      borderTopColor: "var(--bevel-dark)",
                      borderLeftColor: "var(--bevel-dark)",
                      borderBottomColor: "var(--bevel-light)",
                      borderRightColor: "var(--bevel-light)",
                    }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={deck.commander_name || deck.name}
                          draggable={false}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: 18, opacity: 0.4 }}>🃏</span>
                      )}
                    </div>

                    {/* Info */}
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => !isConfirm && handleSwitch(deck.id)}
                    >
                      <div style={{
                        fontSize: "var(--font-size-base)", fontWeight: "bold",
                        fontFamily: "var(--font-system)",
                        color: isActive ? "var(--color-titlebar-text)" : "var(--color-text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {deck.name || "Untitled Brew"}
                        {isActive && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: "var(--font-size-sm)",
                            fontFamily: "var(--font-system)",
                            color: "var(--color-text-secondary)",
                          }}>ACTIVE</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontFamily: "var(--font-system)" }}>
                        <span>{deck.pile?.length ?? 0} cards</span>
                        <span>·</span>
                        <span>{relativeTime(deck.last_opened_at)}</span>
                      </div>
                    </div>

                    {/* Delete / Confirm */}
                    {isConfirm ? (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{
                            padding: "var(--space-1) var(--space-2)",
                            borderStyle: "solid",
                            borderWidth: "2px",
                            borderTopColor: "var(--bevel-light)",
                            borderLeftColor: "var(--bevel-light)",
                            borderBottomColor: "var(--bevel-dark)",
                            borderRightColor: "var(--bevel-dark)",
                            background: "var(--color-chrome)",
                            color: "var(--color-text-chrome)",
                            fontFamily: "var(--font-system)",
                            fontSize: "var(--font-size-sm)",
                            cursor: "pointer",
                            borderRadius: 0,
                            minHeight: 44,
                          }}
                        >CANCEL</button>
                        <button
                          onClick={() => handleDelete(deck.id)}
                          style={{
                            padding: "var(--space-1) var(--space-2)",
                            borderStyle: "solid",
                            borderWidth: "2px",
                            borderTopColor: "#ffffff",
                            borderLeftColor: "#ffffff",
                            borderBottomColor: "#400000",
                            borderRightColor: "#400000",
                            background: "#800000",
                            color: "#ffffff",
                            fontFamily: "var(--font-system)",
                            fontSize: "var(--font-size-sm)",
                            cursor: "pointer",
                            borderRadius: 0,
                            minHeight: 44,
                          }}
                        >DELETE</button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(deck.id); }}
                        style={{
                          background: "var(--color-chrome)",
                          color: "var(--color-text-chrome)",
                          borderStyle: "solid",
                          borderWidth: "2px",
                          borderTopColor: "var(--bevel-light)",
                          borderLeftColor: "var(--bevel-light)",
                          borderBottomColor: "var(--bevel-dark)",
                          borderRightColor: "var(--bevel-dark)",
                          cursor: "pointer",
                          fontSize: "var(--font-size-sm)",
                          padding: 0, flexShrink: 0,
                          lineHeight: 1,
                          borderRadius: 0,
                          fontFamily: "var(--font-system)",
                          minWidth: 44, minHeight: 44,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      ><span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>close</span></button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* NEW BREW button */}
          <div style={{
            padding: "14px 18px",
            paddingBottom: `calc(14px + env(safe-area-inset-bottom))`,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <button
              onClick={() => { onNew(); onClose(); }}
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-4)",
                borderStyle: "solid",
                borderWidth: "2px",
                borderTopColor: "var(--bevel-light)",
                borderLeftColor: "var(--bevel-light)",
                borderBottomColor: "var(--bevel-dark)",
                borderRightColor: "var(--bevel-dark)",
                borderRadius: 0,
                background: "var(--color-chrome)",
                color: "var(--color-text-chrome)",
                fontFamily: "var(--font-system)",
                fontSize: "var(--font-size-base)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              + NEW BREW
            </button>
            <button
              onClick={onOpenAuth}
              style={{
                width: "100%", marginTop: 10,
                background: "transparent", border: "none",
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-system)",
                cursor: "pointer",
                padding: "4px 0",
                textAlign: "center",
              }}
            >
              {authUser ? `Signed in · ${authUser.email}` : "Sign in to sync across devices"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
