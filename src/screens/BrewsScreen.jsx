import { useState } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

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

export default function BrewsScreen({ decks, activeDeckId, onSwitch, onNew, onDelete, authUser, onOpenAuth }) {
  const [confirmId, setConfirmId] = useState(null);

  function handleSwitch(id) {
    onSwitch(id);
  }

  function handleDelete(id) {
    onDelete(id);
    setConfirmId(null);
  }

  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 18px)`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        maxWidth: 600, margin: "0 auto", width: "100%",
        background: "rgba(13,13,15,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 18px", height: 56, gap: 10,
        }}>
          <span style={{
            flex: 1,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22, letterSpacing: 4,
            color: "var(--primary)",
          }}>
            BREWS
          </span>
          <span style={{
            fontSize: 11, color: "var(--muted)",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {decks.length} saved
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 600, margin: "0 auto", width: "100%",
        paddingBottom: bottomPad,
      }}>

        {/* NEW BREW */}
        <div style={{ padding: "14px 18px 0" }}>
          <button
            onClick={onNew}
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
        </div>

        {/* Sign-in prompt */}
        <button
          onClick={onOpenAuth}
          style={{
            width: "100%", margin: "8px 0 0",
            background: "transparent", border: "none",
            color: authUser ? "rgba(255,255,255,0.35)" : "rgba(91,143,255,0.6)",
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer",
            padding: "6px 18px",
            textAlign: "center",
          }}
        >
          {authUser ? `Signed in · ${authUser.email}` : "Sign in to sync across devices ↗"}
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 0 0" }} />

        {/* Deck list */}
        {decks.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "72px 20px",
            color: "var(--muted)", fontSize: 14,
          }}>
            No saved brews yet
            <br />
            <span style={{ opacity: 0.6, fontSize: 12, marginTop: 6, display: "block" }}>
              Start a search to create your first brew
            </span>
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
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: isActive ? "rgba(91,143,255,0.06)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 56, height: 40, borderRadius: 7, flexShrink: 0,
                  background: "var(--panel)", overflow: "hidden",
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
                    <span style={{ fontSize: 20, opacity: 0.35 }}>🃏</span>
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
                        marginLeft: 8, fontSize: 10, letterSpacing: 1,
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

                {/* Delete / confirm */}
                {isConfirm ? (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setConfirmId(null)}
                      style={{
                        padding: "5px 10px", borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "transparent", color: "var(--muted)",
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 11, letterSpacing: 1, cursor: "pointer",
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
                        fontSize: 11, letterSpacing: 1, cursor: "pointer",
                      }}
                    >DELETE</button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmId(deck.id); }}
                    style={{
                      background: "transparent", border: "none",
                      color: "var(--muted)", cursor: "pointer",
                      fontSize: 14, padding: "6px", flexShrink: 0, lineHeight: 1, borderRadius: 4,
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
    </div>
  );
}
