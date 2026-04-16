import SearchForm from "./SearchForm.jsx";
import { NAV_HEIGHT } from "./BottomNav.jsx";

export default function SearchSheet({ open, onClose, onSearch, loading, error }) {
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

      {/* Sheet — wrapper handles slide animation and centering */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        display: "flex", justifyContent: "center",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: open ? "auto" : "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 600,
          maxHeight: "90dvh",
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
              NEW SEARCH
            </span>
            <div style={{
              padding: "2px 8px", borderRadius: 4,
              background: "rgba(91,143,255,0.15)",
              border: "1px solid rgba(91,143,255,0.35)",
              color: "var(--primary)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11, letterSpacing: 2,
              marginRight: 14,
            }}>
              COMMANDER
            </div>
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

          {/* Scrollable form */}
          <div style={{
            flex: 1, overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "20px 18px",
            paddingBottom: `calc(${NAV_HEIGHT}px + 32px)`,
          }}>
            <SearchForm onSearch={onSearch} loading={loading} error={error} />
          </div>

        </div>
      </div>
    </>
  );
}
