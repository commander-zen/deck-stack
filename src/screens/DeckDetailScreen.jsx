import { NAV_HEIGHT } from "../components/BottomNav.jsx";

export default function DeckDetailScreen({ deck, onBack }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--color-bg)",
      fontFamily: "var(--font-system)",
      display: "flex",
      flexDirection: "column",
      paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
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
        alignItems: "center",
        gap: "var(--space-2)",
        position: "sticky",
        top: 0,
        zIndex: 10,
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
          ← BACK
        </button>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {deck?.name ?? "Brew"}
        </span>
      </div>

      {/* Stub body */}
      <div style={{ padding: "var(--space-4)" }}>
        <h1 style={{
          fontFamily: "var(--font-system)",
          fontSize: "var(--font-size-xl)",
          color: "var(--color-text-primary)",
          margin: 0,
        }}>
          {deck?.name ?? "Brew"}
        </h1>
      </div>
    </div>
  );
}
