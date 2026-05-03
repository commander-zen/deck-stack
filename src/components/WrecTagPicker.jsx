import { WREC_CATEGORIES } from "../constants/wrec.js";

export default function WrecTagPicker({ card, wrecTags, onAssign, onClose }) {
  const oracleId = card.oracle_id ?? card.id;

  let currentCat = null;
  for (const [cat, ids] of Object.entries(wrecTags)) {
    if (ids.includes(oracleId)) { currentCat = cat; break; }
  }

  const mana = card.mana_cost?.replace(/\{([^}]+)\}/g, "$1 ").trim() ?? "";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 398, background: "rgba(0,0,0,0.55)" }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400,
        maxWidth: 600, margin: "0 auto",
        background: "var(--panel)",
        borderRadius: "16px 16px 0 0",
        padding: "0 16px calc(max(20px, env(safe-area-inset-bottom)) + 6px)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)", margin: "14px auto 16px" }} />

        {/* Card identity */}
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>
            {card.name}
          </div>
          {mana && (
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {mana}
            </div>
          )}
          {currentCat && (
            <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 4, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>
              {currentCat}
            </div>
          )}
        </div>

        {/* Category buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {WREC_CATEGORIES.map(cat => {
            const isActive = cat === currentCat;
            const isPlan   = cat === "Plan";
            return (
              <button
                key={cat}
                onClick={() => !isPlan && onAssign(oracleId, cat)}
                disabled={isPlan}
                style={{
                  width: "100%", padding: "11px 14px",
                  borderRadius: 10,
                  border: isActive
                    ? "1px solid var(--primary)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? "rgba(91,143,255,0.15)"
                    : isPlan
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.04)",
                  color: isActive ? "var(--primary)" : isPlan ? "var(--muted)" : "var(--text)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 13, letterSpacing: 2,
                  cursor: isPlan ? "default" : "pointer",
                  textAlign: "left",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span>{cat}{isPlan ? "  —  COMING SOON" : ""}</span>
                {isActive && <span style={{ fontSize: 12 }}>✓</span>}
              </button>
            );
          })}

          {currentCat && (
            <button
              onClick={() => onAssign(oracleId, null)}
              style={{
                width: "100%", padding: "10px 14px",
                marginTop: 4,
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
        </div>
      </div>
    </>
  );
}
