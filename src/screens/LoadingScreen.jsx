import { useState, useEffect, useRef } from "react";
import { fetchCommanderPool, getCardImage } from "../lib/scryfall.js";

const FLAVOR_TEXTS = [
  "CONSULTING THE ARCHIVES…",
  "SIFTING THROUGH THE MULTIVERSE…",
  "INTERROGATING THE ORACLE…",
  "COMMUNING WITH EMRAKUL…",
  "SHUFFLING THE BLIND ETERNITIES…",
];

export default function LoadingScreen({ commander, onReady, onError }) {
  const [flavor, setFlavor] = useState(FLAVOR_TEXTS[0]);
  const abortRef = useRef(null);

  // Cycle flavor text
  useEffect(() => {
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % FLAVOR_TEXTS.length;
      setFlavor(FLAVOR_TEXTS[idx]);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  // Fetch card pool on mount
  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchCommanderPool(commander, { signal: ctrl.signal })
      .then(cards => {
        if (!ctrl.signal.aborted) onReady(cards);
      })
      .catch(err => {
        if (err.name !== "AbortError") onError(err.message ?? "Failed to build card pool.");
      });

    return () => ctrl.abort();
  }, [commander, onReady, onError]);

  const artCrop = getCardImage(commander, "art_crop");

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
          filter: "blur(32px) brightness(0.08)",
          transform: "scale(1.12)",
          pointerEvents: "none",
        }} />
      )}

      {/* Spinner dots */}
      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        gap: 8,
        marginBottom: 32,
      }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--primary)",
              opacity: 0.6,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Flavor text */}
      <div style={{
        position: "relative",
        zIndex: 1,
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(20px, 5vw, 28px)",
        letterSpacing: 4,
        color: "var(--primary)",
        lineHeight: 1.3,
        minHeight: "2.6em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {flavor}
      </div>

      {/* Commander name */}
      <div style={{
        position: "relative",
        zIndex: 1,
        marginTop: 12,
        fontSize: 11,
        color: "var(--muted)",
        letterSpacing: 2,
      }}>
        building around {commander.name}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%       { transform: scale(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
