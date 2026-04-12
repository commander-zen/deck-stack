import { getCardImage, formatManaCost } from "../lib/scryfall.js";

export default function ConfirmScreen({ commander, onBuild, onBack, loadError }) {
  const art     = getCardImage(commander, "normal");
  const artCrop = getCardImage(commander, "art_crop");
  const ci      = commander.color_identity ?? [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'IBM Plex Mono', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Blurred art background */}
      {artCrop && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${artCrop})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(28px) brightness(0.12)",
          transform: "scale(1.12)",
          pointerEvents: "none",
        }} />
      )}

      {/* ← CHOOSE ANOTHER */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: 480,
        padding: "20px 20px 0",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontSize: 12,
            letterSpacing: 2,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← CHOOSE ANOTHER
        </button>
      </div>

      {/* Card image */}
      <div style={{
        position: "relative",
        zIndex: 10,
        marginTop: 24,
        padding: "0 20px",
      }}>
        {art ? (
          <img
            src={art}
            alt={commander.name}
            style={{
              width: "min(88vw, 340px)",
              borderRadius: 18,
              boxShadow: "0 28px 80px rgba(0,0,0,0.85)",
              display: "block",
            }}
          />
        ) : (
          <div style={{
            width: 280,
            height: 390,
            background: "var(--panel)",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            fontSize: 13,
          }}>
            {commander.name}
          </div>
        )}
      </div>

      {/* Card info */}
      <div style={{
        position: "relative",
        zIndex: 10,
        textAlign: "center",
        marginTop: 20,
        padding: "0 24px",
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: 3,
          color: "var(--text)",
          lineHeight: 1.1,
        }}>
          {commander.name}
        </div>
        <div style={{
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 6,
          letterSpacing: 1,
        }}>
          {commander.type_line}
        </div>
        <div style={{
          fontSize: 12,
          color: "var(--secondary)",
          marginTop: 4,
          letterSpacing: 1,
        }}>
          {formatManaCost(commander.mana_cost) || "—"}
          {ci.length > 0 && (
            <span style={{ marginLeft: 8, color: "var(--muted)" }}>
              · {ci.join("")}
            </span>
          )}
        </div>
      </div>

      {/* BUILD AROUND THIS */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: 480,
        padding: "24px 20px 40px",
      }}>
        {loadError && (
          <div style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.25)",
            borderRadius: 10,
            color: "var(--danger)",
            fontSize: 11,
            letterSpacing: 0.5,
          }}>
            {loadError}
          </div>
        )}
        <button
          onClick={onBuild}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: 14,
            border: "none",
            background: "var(--primary)",
            color: "#fff",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            letterSpacing: 5,
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(91,143,255,0.35)",
            transition: "transform 0.1s, box-shadow 0.1s",
          }}
          onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
          onMouseUp={e => { e.currentTarget.style.transform = ""; }}
        >
          BUILD AROUND THIS →
        </button>
      </div>
    </div>
  );
}
