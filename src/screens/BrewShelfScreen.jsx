import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { getCardImage } from "../lib/scryfall.js";

const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };

function ColorPip({ color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: "50%",
      background: COLOR_DOT[color] ?? "#888",
      border: "1px solid rgba(255,255,255,0.2)",
      flexShrink: 0,
    }} />
  );
}

function relativeTime(iso) {
  if (!iso) return "";
  const hrs = (Date.now() - new Date(iso)) / 3600000;
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BrewShelfScreen({ decks, activeDeckId, onSelectDeck, onNewBrew }) {
  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 18px)`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--color-bg)",
      fontFamily: "var(--font-system)",
      paddingBottom: bottomPad,
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
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <span>Brews</span>
        <button
          onClick={onNewBrew}
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
          }}
        >
          + NEW BREW
        </button>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-2)",
        padding: "var(--space-2)",
        maxWidth: 600,
        margin: "0 auto",
      }}>
        {decks.length === 0 && (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-base)",
            padding: "var(--space-6)",
          }}>
            No brews yet. Hit + NEW BREW to start one.
          </div>
        )}

        {decks.map(deck => {
          const isActive = deck.id === activeDeckId;
          const thumb = deck.commander_card ? getCardImage(deck.commander_card, "art_crop") : null;
          const colors = deck.commander_card?.color_identity ?? [];
          const pileCount = (deck.pile ?? []).length;

          return (
            <button
              key={deck.id}
              onClick={() => onSelectDeck(deck.id)}
              style={{
                background: "var(--color-surface)",
                borderStyle: "solid",
                borderWidth: "2px",
                borderTopColor: isActive ? "var(--color-titlebar)" : "var(--bevel-light)",
                borderLeftColor: isActive ? "var(--color-titlebar)" : "var(--bevel-light)",
                borderBottomColor: "var(--bevel-dark)",
                borderRightColor: "var(--bevel-dark)",
                borderRadius: 0,
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Art thumbnail */}
              <div style={{
                width: "100%",
                aspectRatio: "16/9",
                background: "var(--color-surface-raised)",
                overflow: "hidden",
                flexShrink: 0,
              }}>
                {thumb && (
                  <img
                    src={thumb}
                    alt={deck.commander_card?.name}
                    draggable={false}
                    style={{
                      width: "100%", height: "100%",
                      objectFit: "cover", objectPosition: "center top",
                      display: "block",
                      borderRadius: 0,
                    }}
                  />
                )}
              </div>

              {/* Card info */}
              <div style={{ padding: "var(--space-1) var(--space-2)", flex: 1 }}>
                <div style={{
                  fontFamily: "var(--font-system)",
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: isActive ? "bold" : "normal",
                }}>
                  {deck.name || "New Brew"}
                </div>

                {deck.commander_card?.name && (
                  <div style={{
                    fontFamily: "var(--font-system)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}>
                    {deck.commander_card.name}
                  </div>
                )}

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  marginTop: "var(--space-1)",
                  flexWrap: "wrap",
                }}>
                  {colors.map(c => <ColorPip key={c} color={c} />)}
                  <span style={{
                    fontFamily: "var(--font-system)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    marginLeft: colors.length ? "var(--space-1)" : 0,
                  }}>
                    {pileCount}c · {relativeTime(deck.last_opened_at)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
