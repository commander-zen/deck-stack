export default function DoneScreen({ keptCount, onViewPile, onKeepSwiping }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'IBM Plex Mono', monospace",
      padding: 32,
      textAlign: "center",
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(48px, 14vw, 72px)",
        letterSpacing: 8,
        color: "var(--primary)",
        lineHeight: 1,
      }}>
        STACK DONE
      </div>

      {/* Count */}
      <div style={{
        fontSize: 14,
        color: "var(--muted)",
        marginTop: 14,
        marginBottom: 40,
        letterSpacing: 2,
      }}>
        {keptCount} card{keptCount !== 1 ? "s" : ""} kept
      </div>

      {/* Buttons */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        maxWidth: 340,
      }}>
        <button
          onClick={onViewPile}
          style={{
            padding: "16px 32px",
            borderRadius: 14,
            border: "none",
            background: "var(--success)",
            color: "#07160e",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            letterSpacing: 4,
            cursor: "pointer",
            boxShadow: "0 8px 28px rgba(52,211,153,0.3)",
          }}
        >
          VIEW MY DECK STACK →
        </button>

        <button
          onClick={onKeepSwiping}
          style={{
            padding: "14px 32px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent",
            color: "var(--muted)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 3,
            cursor: "pointer",
          }}
        >
          ← KEEP SWIPING
        </button>
      </div>
    </div>
  );
}
