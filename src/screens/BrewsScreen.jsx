import { useState } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import ImportSheet from "../components/ImportSheet.jsx";
import CommanderSearchSheet from "../components/CommanderSearchSheet.jsx";

function pileCount(pile) {
  return (pile ?? []).reduce((sum, c) => sum + (c.qty ?? 1), 0);
}

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

export default function BrewsScreen({ decks, activeDeckId, onSwitch, onNew, onDelete, authUser, onOpenAuth, onImport, onSetCommanderForDeck, onOpenSettings }) {
  const [confirmId,      setConfirmId]      = useState(null);
  const [importOpen,     setImportOpen]     = useState(false);
  const [deleteError,    setDeleteError]    = useState("");
  const [cmdSheetDeckId, setCmdSheetDeckId] = useState(null);

  function handleSwitch(id) {
    onSwitch(id);
  }

  async function handleDelete(id) {
    setDeleteError("");
    try {
      await onDelete(id);
      setConfirmId(null);
    } catch (err) {
      setDeleteError(err?.message || "Failed to delete brew.");
      setConfirmId(null);
    }
  }

  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 18px)`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'Space Grotesk', sans-serif",
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
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, letterSpacing: 4,
            color: "var(--primary)",
          }}>
            BREWS
          </span>
          <span style={{
            fontSize: 11, color: "var(--muted)",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {decks.length} saved
          </span>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
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
                padding: "var(--space-1) var(--space-3)",
                cursor: "pointer",
                borderRadius: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                minWidth: 44, minHeight: 44,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 600, margin: "0 auto", width: "100%",
        paddingBottom: bottomPad,
      }}>

        {/* NEW BREW + IMPORT DECK */}
        <div style={{ padding: "14px 18px 0", display: "flex", gap: 10 }}>
          <button
            onClick={onNew}
            style={{
              flex: 1,
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
              padding: "var(--space-1) var(--space-3)",
              cursor: "pointer",
              borderRadius: 0,
              letterSpacing: 3,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            + NEW BREW
          </button>
          <button
            onClick={() => setImportOpen(true)}
            style={{
              flex: 1,
              background: "var(--color-titlebar)",
              color: "var(--color-titlebar-text)",
              fontFamily: "var(--font-system)",
              fontSize: "var(--font-size-sm)",
              borderStyle: "solid",
              borderWidth: "2px",
              borderTopColor: "#ffffff",
              borderLeftColor: "#ffffff",
              borderBottomColor: "#000040",
              borderRightColor: "#000040",
              padding: "var(--space-1) var(--space-3)",
              cursor: "pointer",
              borderRadius: 0,
              letterSpacing: 3,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            IMPORT
          </button>
        </div>

        {/* Sign-in prompt */}
        <button
          onClick={onOpenAuth}
          style={{
            width: "100%", margin: "8px 0 0",
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
            padding: "var(--space-1) var(--space-3)",
            cursor: "pointer",
            borderRadius: 0,
            textAlign: "center",
          }}
        >
          {authUser ? `Signed in · ${authUser.email}` : "Sign in to sync across devices ↗"}
        </button>

        {/* Delete error */}
        {deleteError && (
          <div style={{
            margin: "8px 18px 0",
            padding: "9px 13px",
            borderRadius: 8,
            background: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.25)",
            fontSize: 12, color: "var(--danger)", lineHeight: 1.4,
          }}>
            {deleteError}
          </div>
        )}

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

            const hasCommander = Boolean(deck.commander_card);

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
                {/* Thumbnail — clickable placeholder when no commander set */}
                <div
                  onClick={e => {
                    if (isConfirm) return;
                    if (!hasCommander && onSetCommanderForDeck) {
                      e.stopPropagation();
                      setCmdSheetDeckId(deck.id);
                    }
                  }}
                  title={hasCommander ? undefined : "Tap to set commander"}
                  style={{
                    width: 56, height: 40, borderRadius: 7, flexShrink: 0,
                    background: "var(--panel)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: !hasCommander && onSetCommanderForDeck ? "pointer" : "default",
                    border: !hasCommander ? "1.5px dashed rgba(255,255,255,0.15)" : "none",
                  }}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={deck.commander_name || deck.name}
                      draggable={false}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 18, color: "var(--muted)", opacity: 0.6 }}>?</span>
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
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "var(--primary)", opacity: 0.7,
                      }}>ACTIVE</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 11, color: "var(--muted)" }}>
                    <span>{pileCount(deck.pile)} cards</span>
                    <span>·</span>
                    <span>{relativeTime(deck.last_opened_at)}</span>
                  </div>
                </div>

                {/* Delete / confirm */}
                {isConfirm ? (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(null); }}
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
                        padding: "var(--space-1) var(--space-3)",
                        cursor: "pointer",
                        borderRadius: 0,
                        letterSpacing: 1,
                      }}
                    >CANCEL</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(deck.id); }}
                      style={{
                        background: "#800000",
                        color: "#ffffff",
                        fontFamily: "var(--font-system)",
                        fontSize: "var(--font-size-sm)",
                        borderStyle: "solid",
                        borderWidth: "2px",
                        borderTopColor: "#ffffff",
                        borderLeftColor: "#ffffff",
                        borderBottomColor: "#400000",
                        borderRightColor: "#400000",
                        padding: "var(--space-1) var(--space-3)",
                        cursor: "pointer",
                        borderRadius: 0,
                        letterSpacing: 1,
                      }}
                    >DELETE</button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmId(deck.id); }}
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
                      padding: "var(--space-1) var(--space-3)",
                      cursor: "pointer",
                      borderRadius: 0,
                      flexShrink: 0, lineHeight: 1,
                    }}
                  >✕</button>
                )}
              </div>
            );
          })
        )}
      </div>

      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(pile, commanderCard) => {
          setImportOpen(false);
          onImport?.(pile, commanderCard);
        }}
      />

      <CommanderSearchSheet
        open={cmdSheetDeckId !== null}
        onClose={() => setCmdSheetDeckId(null)}
        onSelect={card => {
          if (cmdSheetDeckId && onSetCommanderForDeck) {
            onSetCommanderForDeck(cmdSheetDeckId, card);
          }
          setCmdSheetDeckId(null);
        }}
        decks={decks}
        excludeDeckId={cmdSheetDeckId}
      />
    </div>
  );
}
