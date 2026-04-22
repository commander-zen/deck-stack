import { useState, useEffect } from "react";

function resolveImage(card, faceIdx) {
  if (!card) return null;
  if ((card.card_faces?.length ?? 0) >= 2) {
    return card.card_faces[faceIdx]?.image_uris?.normal ?? card.image_uris?.normal ?? null;
  }
  return card.image_uris?.normal ?? null;
}

export default function CommanderModal({ card, onClose }) {
  const [faceIdx, setFaceIdx] = useState(0);

  useEffect(() => { setFaceIdx(0); }, [card]);

  if (!card) return null;

  const hasFaces = (card.card_faces?.length ?? 0) >= 2;
  const imgUrl = resolveImage(card, faceIdx);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 450,
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute", top: 16, right: 16,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.8)", fontSize: 16,
          cursor: "pointer", lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >✕</button>

      <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        {imgUrl && (
          <img
            src={imgUrl}
            alt={card.name}
            draggable={false}
            style={{
              maxWidth: "min(88vw, 360px)",
              maxHeight: "calc(100dvh - 120px)",
              width: "auto", height: "auto",
              borderRadius: 16,
              boxShadow: "0 24px 72px rgba(0,0,0,0.9)",
              display: "block",
            }}
          />
        )}
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

      <div style={{
        marginTop: 12,
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 13, letterSpacing: 3,
        color: "rgba(255,255,255,0.4)",
      }}>
        {card.name}
      </div>
    </div>
  );
}
