import { WREC_CHIP } from "../constants/wrec.js";

export default function WrecCategoryButtons({ currentCat, onAssign }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {Object.entries(WREC_CHIP).map(([cat, chip]) => {
          const isActive = cat === currentCat;
          return (
            <button
              key={cat}
              onClick={() => onAssign(isActive ? null : cat)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: isActive ? `1px solid ${chip.border}` : "1px solid rgba(255,255,255,0.08)",
                background: isActive ? chip.bg : "rgba(255,255,255,0.04)",
                color: isActive ? chip.color : "var(--text)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13, letterSpacing: 2,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span>{chip.label}</span>
              {isActive && <span style={{ fontSize: 11, color: chip.color }}>✓</span>}
            </button>
          );
        })}
      </div>

      {currentCat && (
        <button
          onClick={() => onAssign(null)}
          style={{
            width: "100%", padding: "10px 14px",
            marginTop: 8,
            borderRadius: 10,
            border: "1px solid rgba(255,80,80,0.2)",
            background: "transparent",
            color: "rgba(255,80,80,0.6)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 12, letterSpacing: 2,
            cursor: "pointer",
          }}
        >
          REMOVE TAG
        </button>
      )}
    </>
  );
}
