import WrecCategoryButtons from "./WrecCategoryButtons.jsx";

export default function WrecTagPicker({ card, wrecTags, onAssign, onClose }) {
  const oracleId = card.oracle_id ?? card.id;

  const currentTags = Object.entries(wrecTags)
    .filter(([, ids]) => ids.includes(oracleId))
    .map(([cat]) => cat);

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
        fontFamily: "'Space Grotesk', sans-serif",
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
        </div>

        <WrecCategoryButtons
          currentTags={currentTags}
          onToggle={cat => onAssign(oracleId, cat)}
        />
      </div>
    </>
  );
}
