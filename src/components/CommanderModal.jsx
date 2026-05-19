import { useState, useEffect } from "react";
import { getCardImage } from "../lib/scryfall.js";

export default function CommanderModal({ card, onClose }) {
  const [faceIdx, setFaceIdx] = useState(0);

  useEffect(() => { setFaceIdx(0); }, [card]);

  if (!card) return null;

  const hasFaces = (card.card_faces?.length ?? 0) >= 2;
  const artUrl   = getCardImage(card, "art_crop");
  const fullUrl  = hasFaces
    ? (card.card_faces[faceIdx]?.image_uris?.normal ?? getCardImage(card, "normal"))
    : getCardImage(card, "normal");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 450,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(16px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute", top: 16, right: 16,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "rgba(255,255,255,0.8)", fontSize: 16,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
      >✕</button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(88vw, 380px)",
          background: "#0d0d0f",
          border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* Art crop as full-width hero image */}
        {artUrl && (
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
            <img
              src={artUrl}
              alt={card.name}
              draggable={false}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                display: "block",
                borderRadius: "16px 16px 0 0",
              }}
            />
            {/* Flip button for DFCs */}
            {hasFaces && (
              <button
                onClick={() => setFaceIdx(f => f === 0 ? 1 : 0)}
                style={{
                  position: "absolute", bottom: 10, right: 10,
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(0,0,0,0.75)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >↻</button>
            )}
          </div>
        )}

        {/* Full card image below for DFCs or as fallback */}
        {!artUrl && fullUrl && (
          <img
            src={fullUrl}
            alt={card.name}
            draggable={false}
            style={{
              width: "100%", display: "block",
              borderRadius: "16px 16px 0 0",
            }}
          />
        )}

        {/* Commander name */}
        <div style={{
          padding: "14px 16px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 24, letterSpacing: 3,
          color: "#ffffff",
        }}>
          {card.name}
        </div>
      </div>
    </div>
  );
}
