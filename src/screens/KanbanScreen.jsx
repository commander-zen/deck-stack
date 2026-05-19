import { useState, useRef, useEffect } from "react";
import { getCardImage } from "../lib/scryfall.js";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";

const STATUSES   = ['created', 'brewing', 'done'];
const STATUS_NEXT = { created: 'brewing', brewing: 'done', done: 'created' };

const COL_STYLE = {
  created: { accent: '#c8b8f0', bg: 'rgba(200,184,240,0.05)', border: 'rgba(200,184,240,0.18)' },
  brewing: { accent: '#00e5cc', bg: 'rgba(0,229,204,0.05)',   border: 'rgba(0,229,204,0.18)'   },
  done:    { accent: '#34d399', bg: 'rgba(52,211,153,0.05)',  border: 'rgba(52,211,153,0.18)'  },
};

const COL_LABEL = { created: 'CREATED', brewing: 'BREWING', done: 'DONE' };

const COLOR_DOT = { W: '#e8d5a0', U: '#4080d0', B: '#888', R: '#cc2200', G: '#1a7035' };

function pileCount(pile) {
  return (pile ?? []).reduce((sum, c) => sum + (c.qty ?? 1), 0);
}

function ColorPip({ color }) {
  return (
    <div style={{
      width: 9, height: 9, borderRadius: '50%',
      background: COLOR_DOT[color] ?? '#888',
      border: '1px solid rgba(255,255,255,0.25)',
      flexShrink: 0,
    }} />
  );
}

function DeckCard({ deck, isActive, onOpen, onAdvance, isDragging, onPointerDown }) {
  const thumb = deck.commander_card ? getCardImage(deck.commander_card, 'art_crop') : null;
  const ci    = deck.commander_card?.color_identity ?? [];
  const count = pileCount(deck.pile);
  const col   = COL_STYLE[deck.status ?? 'brewing'];

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={() => !isDragging && onOpen(deck.id)}
      style={{
        background: isActive ? 'rgba(0,229,204,0.07)' : 'var(--panel)',
        border: `1px solid ${isActive ? 'rgba(0,229,204,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '11px 12px',
        cursor: 'pointer',
        opacity: isDragging ? 0.3 : 1,
        userSelect: 'none',
        touchAction: 'none',
        transition: 'opacity 0.1s',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        {/* Thumbnail */}
        <div style={{
          width: 50, height: 36, borderRadius: 6, flexShrink: 0,
          background: 'var(--panel2)', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {thumb
            ? <img src={thumb} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 16, opacity: 0.3 }}>?</span>
          }
        </div>

        {/* Name + commander */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14, letterSpacing: 0.8,
            color: isActive ? 'var(--primary)' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {deck.name || 'Untitled Brew'}
            {isActive && (
              <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--primary)', opacity: 0.7, letterSpacing: 1 }}>
                ACTIVE
              </span>
            )}
          </div>
          {deck.commander_name && (
            <div style={{
              fontSize: 10, color: 'var(--muted)', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {deck.commander_name}
            </div>
          )}
        </div>
      </div>

      {/* Footer: pips + count + advance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {ci.length > 0
            ? ci.map(c => <ColorPip key={c} color={c} />)
            : <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>C</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {count}
          </span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onAdvance(deck.id, deck.status ?? 'brewing'); }}
            title={`Move to ${COL_LABEL[STATUS_NEXT[deck.status ?? 'brewing']]}`}
            style={{
              background: 'transparent',
              border: `1px solid ${col.border}`,
              borderRadius: 4,
              color: col.accent,
              fontSize: 10,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: 0.5,
              padding: '1px 7px',
              cursor: 'pointer',
              lineHeight: '16px',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanScreen({ decks, activeDeckId, onOpenDeck, onNewBrew, onUpdateStatus, onImport, authUser, onOpenAuth }) {
  // Local deck list for optimistic status updates
  const [localDecks, setLocalDecks] = useState(() =>
    decks.map(d => ({ ...d, status: d.status ?? 'brewing' }))
  );

  // Drag state
  const [dragging, setDragging]         = useState(null);   // { deckId, name }
  const [dragOver, setDragOver]         = useState(null);   // status string
  const [dragPos, setDragPos]           = useState({ x: 0, y: 0 });
  const colRefs = useRef({});
  const didDragRef = useRef(false);

  // Sync parent decks prop → local (preserve optimistic status if it hasn't been superseded)
  useEffect(() => {
    setLocalDecks(decks.map(d => ({ ...d, status: d.status ?? 'brewing' })));
  }, [decks]);

  const grouped = {
    created: localDecks.filter(d => d.status === 'created'),
    brewing: localDecks.filter(d => d.status === 'brewing'),
    done:    localDecks.filter(d => d.status === 'done'),
  };

  function advanceStatus(deckId, currentStatus) {
    commitStatus(deckId, STATUS_NEXT[currentStatus] ?? 'brewing');
  }

  function commitStatus(deckId, newStatus) {
    setLocalDecks(ds => ds.map(d => d.id === deckId ? { ...d, status: newStatus } : d));
    onUpdateStatus(deckId, newStatus);
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────
  function handlePointerDown(e, deck) {
    if (e.button !== undefined && e.button !== 0) return; // left click / touch only
    didDragRef.current = false;
    setDragging({ deckId: deck.id, name: deck.name || 'Untitled Brew', fromStatus: deck.status ?? 'brewing' });
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    didDragRef.current = true;
    setDragPos({ x: e.clientX, y: e.clientY });

    // Determine column under pointer
    let found = null;
    for (const status of STATUSES) {
      const el = colRefs.current[status];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom) {
        found = status;
        break;
      }
    }
    setDragOver(found);
  }

  function handlePointerUp() {
    if (!dragging) return;
    if (dragOver && dragOver !== dragging.fromStatus) {
      commitStatus(dragging.deckId, dragOver);
    }
    setDragging(null);
    setDragOver(null);
    didDragRef.current = false;
  }

  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 18px)`;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "'Space Grotesk', sans-serif",
        touchAction: dragging ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'auto',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        maxWidth: 600, margin: '0 auto', width: '100%',
        background: 'rgba(18,8,42,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(200,184,240,0.1)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 18px', height: 54, gap: 10,
        }}>
          <span style={{
            flex: 1,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, letterSpacing: 4,
            color: 'var(--primary)',
          }}>
            DECK STACK
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {localDecks.length} brew{localDecks.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onOpenAuth}
            style={{
              background: 'transparent', border: 'none',
              color: authUser ? 'var(--primary)' : 'var(--muted)',
              fontSize: 11, cursor: 'pointer', padding: '4px 0',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {authUser ? '●' : '○'} {authUser ? 'synced' : 'sign in'}
          </button>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 18px 0', display: 'flex', gap: 10 }}>
        <button
          onClick={onNewBrew}
          style={{
            flex: 1, padding: '11px 16px',
            border: '1.5px solid rgba(0,229,204,0.3)',
            borderRadius: 12, background: 'transparent',
            color: 'var(--primary)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15, letterSpacing: 3, cursor: 'pointer',
          }}
        >
          + NEW BREW
        </button>
      </div>

      {/* ── Kanban columns ── */}
      <div style={{
        display: 'flex',
        gap: 10,
        padding: '14px 14px 0',
        maxWidth: 600,
        margin: '0 auto',
        overflowX: 'auto',
        paddingBottom: bottomPad,
        WebkitOverflowScrolling: 'touch',
      }}>
        {STATUSES.map(status => {
          const col    = COL_STYLE[status];
          const cards  = grouped[status] ?? [];
          const isOver = dragOver === status;

          return (
            <div
              key={status}
              ref={el => colRefs.current[status] = el}
              style={{
                flex: '1 0 160px',
                minWidth: 160,
                background: isOver ? col.bg : 'transparent',
                border: `1px solid ${isOver ? col.accent : col.border}`,
                borderRadius: 14,
                padding: '10px 10px 6px',
                transition: 'border-color 0.15s, background 0.15s',
                alignSelf: 'flex-start',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13, letterSpacing: 2,
                  color: col.accent,
                }}>
                  {COL_LABEL[status]}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, color: 'var(--muted)',
                }}>
                  {cards.length}
                </span>
              </div>

              {/* Deck cards */}
              {cards.length === 0 ? (
                <div style={{
                  padding: '20px 8px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 11,
                  opacity: isOver ? 0.8 : 0.4,
                  borderRadius: 8,
                  border: `1px dashed ${col.border}`,
                }}>
                  {isOver ? 'drop here' : 'empty'}
                </div>
              ) : (
                cards.map(deck => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    isActive={deck.id === activeDeckId}
                    onOpen={id => { if (!didDragRef.current) onOpenDeck(id); }}
                    onAdvance={advanceStatus}
                    isDragging={dragging?.deckId === deck.id}
                    onPointerDown={e => handlePointerDown(e, deck)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* ── Drag ghost ── */}
      {dragging && (
        <div
          style={{
            position: 'fixed',
            left: dragPos.x - 70,
            top:  dragPos.y - 22,
            zIndex: 999,
            background: 'var(--panel2)',
            border: '1px solid var(--primary)',
            borderRadius: 8,
            padding: '6px 12px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13, letterSpacing: 1,
            color: 'var(--primary)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {dragging.name}
        </div>
      )}
    </div>
  );
}
