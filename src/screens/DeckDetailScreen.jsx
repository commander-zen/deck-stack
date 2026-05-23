import { useState, useEffect, useRef } from "react";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { getCardImage } from "../lib/scryfall.js";
import { WREC_CHIP } from "../constants/wrec.js";
import CardBrowserScreen from "./CardBrowserScreen.jsx";

const TYPE_GROUPS = [
  { label: "Creatures",     test: t => t.includes("Creature") },
  { label: "Planeswalkers", test: t => t.includes("Planeswalker") },
  { label: "Instants",      test: t => t.includes("Instant") },
  { label: "Sorceries",     test: t => t.includes("Sorcery") },
  { label: "Enchantments",  test: t => t.includes("Enchantment") },
  { label: "Artifacts",     test: t => t.includes("Artifact") },
  { label: "Lands",         test: t => t.includes("Land") },
];

function groupCards(cards) {
  const groups = TYPE_GROUPS.map(g => ({ label: g.label, test: g.test, cards: [] }));
  const other = [];

  for (const card of cards) {
    const typeLine = card.type_line ?? "";
    let placed = false;
    for (const g of groups) {
      if (g.test(typeLine)) {
        g.cards.push(card);
        placed = true;
        break;
      }
    }
    if (!placed) other.push(card);
  }

  const result = groups.filter(g => g.cards.length > 0);
  if (other.length > 0) result.push({ label: "Other", cards: other });
  return result;
}

function SectionBar({ children }) {
  return (
    <div style={{
      background: "var(--color-titlebar)",
      color: "var(--color-titlebar-text)",
      fontFamily: "var(--font-system)",
      fontSize: "var(--font-size-sm)",
      fontWeight: "bold",
      padding: "3px var(--space-2)",
      letterSpacing: 1,
      marginTop: "var(--space-2)",
    }}>
      {children}
    </div>
  );
}

function CardRow({ card, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 14px",
        background: "var(--color-surface)",
        borderStyle: "solid",
        borderWidth: "2px",
        borderTopColor: "var(--bevel-light)",
        borderLeftColor: "var(--bevel-light)",
        borderBottomColor: "var(--bevel-dark)",
        borderRightColor: "var(--bevel-dark)",
        marginBottom: "var(--space-1)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span style={{
        fontFamily: "var(--font-system)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
        marginRight: 10,
        flexShrink: 0,
        width: 14,
        textAlign: "right",
      }}>
        1
      </span>
      <span style={{
        fontFamily: "var(--font-system)",
        fontSize: "var(--font-size-base)",
        color: "var(--color-text-primary)",
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {card.name}
      </span>
      <span style={{
        color: "var(--color-text-secondary)",
        fontSize: 12,
        flexShrink: 0,
        marginLeft: 8,
      }}>▾</span>
    </div>
  );
}

export default function DeckDetailScreen({ deck, onBack, onUpdateDeck, onDeleteDeck }) {
  const [lightboxCard,  setLightboxCard]  = useState(null);
  const [browserQuery,  setBrowserQuery]  = useState(null); // null = closed
  const [localPile,     setLocalPile]     = useState(() => deck?.pile ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const searchInputRef = useRef(null);

  // Reset local pile when navigating to a different deck
  useEffect(() => {
    setLocalPile(deck?.pile ?? []);
  }, [deck?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!deck) return null;

  const pile = localPile;
  const commanderInstanceId = deck.commander_instance_id ?? null;
  const commanderCard =
    (commanderInstanceId ? pile.find(c => c.instanceId === commanderInstanceId) : null)
    ?? deck.commander_card
    ?? null;
  const wrecTags = deck.tags ?? {};

  const nonCmdPile = pile.filter(c =>
    commanderCard ? c.instanceId !== commanderInstanceId && c.name !== commanderCard.name : true
  );
  const grouped = groupCards(nonCmdPile);
  const totalCards = pile.length;

  function getWrecCats(oracleId) {
    if (!oracleId) return [];
    return Object.entries(wrecTags)
      .filter(([, ids]) => (ids ?? []).includes(oracleId))
      .map(([cat]) => cat);
  }

  function handleSubmitSearch() {
    const raw = searchInputRef.current?.value?.trim();
    if (!raw) return;
    const colorId = commanderCard?.color_identity;
    const suffix = colorId?.length ? ` id<=${colorId.join("")}` : "";
    setBrowserQuery(raw + suffix);
  }

  function handleConfirmDelete() {
    onDeleteDeck?.(deck.id);
    onBack();
  }

  function handleAddCard(card) {
    const newCard = { ...card, instanceId: crypto.randomUUID() };
    const newPile = [...localPile, newCard];
    setLocalPile(newPile);
    onUpdateDeck?.({ ...deck, pile: newPile });
  }

  function handleCloseBrowser() {
    setBrowserQuery(null);
    if (searchInputRef.current) searchInputRef.current.value = "";
  }

  const scrollPadBottom = `calc(${NAV_HEIGHT}px + max(env(safe-area-inset-bottom), 8px) + 12px)`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--color-bg)",
      fontFamily: "var(--font-system)",
    }}>
      {/* Sticky header — title bar + search bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
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
      }}>
        <button
          onClick={onBack}
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
            padding: "var(--space-1) var(--space-2)",
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
          <span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1 }}>arrow_back</span> BACK
        </button>
        <span style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {deck.name ?? "Brew"}
        </span>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            background: "#8b1a1a",
            color: "#ffffff",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-sm)",
            letterSpacing: 1,
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: "#cc4444",
            borderLeftColor: "#cc4444",
            borderBottomColor: "#400000",
            borderRightColor: "#400000",
            padding: "2px 8px",
            cursor: "pointer",
            borderRadius: 0,
            flexShrink: 0,
          }}
        >
          DEL
        </button>
      </div>

      {/* Search bar */}
      <div style={{
        display: "flex",
        gap: "var(--space-1)",
        padding: "var(--space-1) var(--space-2)",
        background: "var(--color-chrome)",
        borderBottom: "2px solid var(--bevel-dark)",
      }}>
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search Scryfall..."
          defaultValue=""
          onKeyDown={e => e.key === "Enter" && handleSubmitSearch()}
          style={{
            flex: 1,
            fontFamily: "var(--font-system)",
            fontSize: 16,
            padding: "3px 6px",
            background: "var(--color-chrome-light)",
            color: "var(--color-text-chrome)",
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: "var(--bevel-dark)",
            borderLeftColor: "var(--bevel-dark)",
            borderBottomColor: "var(--bevel-light)",
            borderRightColor: "var(--bevel-light)",
            borderRadius: 0,
            outline: "none",
            minWidth: 0,
          }}
        />
        <button
          onClick={handleSubmitSearch}
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
            padding: "var(--space-1) var(--space-2)",
            cursor: "pointer",
            borderRadius: 0,
            flexShrink: 0,
            letterSpacing: 1,
          }}
        >
          SEARCH
        </button>
      </div>
      </div>{/* end sticky header */}

      {/* Scrollable body */}
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "0 0",
        paddingBottom: scrollPadBottom,
      }}>
        {/* Commander section */}
        <SectionBar>COMMANDER (1)</SectionBar>

        {commanderCard ? (
          <div
            onClick={() => setLightboxCard(commanderCard)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 14px",
              background: "var(--color-surface)",
              borderStyle: "solid",
              borderWidth: "2px",
              borderTopColor: "var(--bevel-light)",
              borderLeftColor: "var(--bevel-light)",
              borderBottomColor: "var(--bevel-dark)",
              borderRightColor: "var(--bevel-dark)",
              marginBottom: "var(--space-1)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1, fontSize: 16, marginRight: 6, flexShrink: 0, color: "gold" }}>crown</span>
            <span style={{
              fontFamily: "var(--font-system)",
              fontSize: "var(--font-size-base)",
              color: "gold",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}>
              {commanderCard.name}
            </span>
            <span style={{
              color: "var(--color-text-secondary)",
              fontSize: 12,
              flexShrink: 0,
              marginLeft: 8,
            }}><span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1 }}>expand_more</span></span>
          </div>
        ) : (
          <div style={{
            padding: "8px 14px",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-sm)",
            fontStyle: "italic",
            marginBottom: "var(--space-1)",
          }}>
            No commander set
          </div>
        )}

        {/* Grouped card list */}
        {grouped.map(group => (
          <div key={group.label}>
            <SectionBar>{group.label.toUpperCase()} ({group.cards.length})</SectionBar>
            {group.cards.map(card => (
              <CardRow
                key={card.instanceId}
                card={card}
                onClick={() => setLightboxCard(card)}
              />
            ))}
          </div>
        ))}

        {pile.length === 0 && (
          <div style={{
            padding: "48px 20px",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-sm)",
          }}>
            No cards in this brew yet.
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <>
          <div
            onClick={() => setConfirmDelete(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 500,
              background: "rgba(0,0,0,0.55)",
            }}
          />
          <div style={{
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 501,
            width: "min(88vw, 320px)",
            background: "var(--color-chrome)",
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: "var(--bevel-light)",
            borderLeftColor: "var(--bevel-light)",
            borderBottomColor: "var(--bevel-dark)",
            borderRightColor: "var(--bevel-dark)",
          }}>
            {/* Dialog title bar */}
            <div style={{
              background: "var(--color-titlebar)",
              color: "var(--color-titlebar-text)",
              fontFamily: "var(--font-system)",
              fontSize: "var(--font-size-base)",
              fontWeight: "bold",
              padding: "var(--space-1) var(--space-2)",
            }}>
              Confirm Delete
            </div>
            {/* Dialog body */}
            <div style={{
              padding: "var(--space-4) var(--space-3)",
              fontFamily: "var(--font-system)",
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-chrome)",
              lineHeight: 1.5,
            }}>
              Delete this brew? This cannot be undone.
            </div>
            {/* Dialog buttons */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-2)",
              padding: "0 var(--space-3) var(--space-3)",
            }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: "var(--color-chrome)",
                  color: "var(--color-text-chrome)",
                  fontFamily: "var(--font-system)",
                  fontSize: "var(--font-size-base)",
                  borderStyle: "solid",
                  borderWidth: "2px",
                  borderTopColor: "var(--bevel-light)",
                  borderLeftColor: "var(--bevel-light)",
                  borderBottomColor: "var(--bevel-dark)",
                  borderRightColor: "var(--bevel-dark)",
                  padding: "var(--space-1) var(--space-4)",
                  cursor: "pointer",
                  borderRadius: 0,
                  minWidth: 72,
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  background: "#800000",
                  color: "#ffffff",
                  fontFamily: "var(--font-system)",
                  fontSize: "var(--font-size-base)",
                  borderStyle: "solid",
                  borderWidth: "2px",
                  borderTopColor: "#ffffff",
                  borderLeftColor: "#ffffff",
                  borderBottomColor: "#400000",
                  borderRightColor: "#400000",
                  padding: "var(--space-1) var(--space-4)",
                  cursor: "pointer",
                  borderRadius: 0,
                  minWidth: 72,
                }}
              >
                DELETE
              </button>
            </div>
          </div>
        </>
      )}

      {/* Card browser overlay */}
      {browserQuery && (
        <CardBrowserScreen
          query={browserQuery}
          brewCards={localPile}
          onAddCard={handleAddCard}
          onClose={handleCloseBrowser}
        />
      )}

      {/* Card lightbox */}
      {lightboxCard && (() => {
        const card = lightboxCard;
        const oracleId = card.oracle_id ?? card.id;
        const imgUrl = getCardImage(card, "normal");
        const wrecCats = getWrecCats(oracleId);

        return (
          <div
            onClick={() => setLightboxCard(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 450,
              background: "rgba(0,0,0,0.80)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 20px",
              overflowY: "auto",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: "min(88vw, 340px)" }}
            >
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
              }}>
                <span style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}>
                  {card.name}
                </span>
                <button
                  onClick={() => setLightboxCard(null)}
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
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    borderRadius: 0,
                    padding: 0,
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                ><span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1 }}>close</span></button>
              </div>

              {/* Card image + WREC tags */}
              <div style={{
                background: "var(--color-surface)",
                borderStyle: "solid",
                borderWidth: "2px",
                borderTopColor: "var(--bevel-light)",
                borderLeftColor: "var(--bevel-light)",
                borderBottomColor: "var(--bevel-dark)",
                borderRightColor: "var(--bevel-dark)",
              }}>
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={card.name}
                    draggable={false}
                    style={{ width: "100%", display: "block", borderRadius: 0 }}
                  />
                ) : (
                  <div style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-system)",
                    fontSize: "var(--font-size-sm)",
                  }}>
                    No image available
                  </div>
                )}

                {wrecCats.length > 0 && (
                  <div style={{
                    padding: "8px 12px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    {wrecCats.map(cat => {
                      const chip = WREC_CHIP[cat];
                      return chip ? (
                        <span key={cat} style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          border: `1px solid ${chip.border}`,
                          background: chip.bg,
                          color: chip.color,
                          fontFamily: "var(--font-system)",
                          fontSize: "var(--font-size-sm)",
                          letterSpacing: 1,
                          borderRadius: 0,
                        }}>
                          {chip.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
