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
          background: "rgba(0,0,0,0.65)",
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
          background: "var(--bg)",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Drag handle */}
          <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{
              display: "inline-block",
              width: 36, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
            }} />
          </div>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "8px 18px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <span style={{
              flex: 1,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18, letterSpacing: 4,
              color: "var(--primary)",
            }}>
              📚 BREWS
            </span>
            <span style={{
              fontSize: 11, color: "var(--muted)",
              fontFamily: "'DM Sans', sans-serif",
              marginRight: 14,
            }}>
              {decks.length} saved
            </span>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.45)", fontSize: 18,
                cursor: "pointer", padding: "4px 6px", lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Deck list */}
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            {decks.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 20px",
                color: "var(--muted)", fontSize: 14,
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
                      background: isActive ? "rgba(91,143,255,0.06)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 52, height: 36, borderRadius: 6, flexShrink: 0,
                      background: "var(--panel)",
                      overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
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
                        fontSize: 14, fontWeight: 500,
                        color: isActive ? "var(--primary)" : "var(--text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {deck.name || "Untitled Brew"}
                        {isActive && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10, letterSpacing: 1,
                            fontFamily: "'Bebas Neue', sans-serif",
                            color: "var(--primary)", opacity: 0.7,
                          }}>ACTIVE</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: "var(--muted)" }}>
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
                            padding: "5px 10px", borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "transparent",
                            color: "var(--muted)",
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 11, letterSpacing: 1,
                            cursor: "pointer",
                          }}
                        >CANCEL</button>
                        <button
                          onClick={() => handleDelete(deck.id)}
                          style={{
                            padding: "5px 10px", borderRadius: 6,
                            border: "1px solid rgba(255,80,80,0.4)",
                            background: "rgba(255,80,80,0.1)",
                            color: "var(--danger)",
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 11, letterSpacing: 1,
                            cursor: "pointer",
                          }}
                        >DELETE</button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(deck.id); }}
                        style={{
                          background: "transparent", border: "none",
                          color: "var(--muted)", cursor: "pointer",
                          fontSize: 14, padding: "4px 6px", flexShrink: 0,
                          lineHeight: 1,
                          borderRadius: 4,
                        }}
                        onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
                        onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
                      >✕</button>
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
                padding: "13px 20px",
                border: "1.5px solid rgba(91,143,255,0.35)",
                borderRadius: 12,
                background: "transparent",
                color: "var(--primary)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16, letterSpacing: 3,
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
                color: authUser ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.25)",
                fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
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
