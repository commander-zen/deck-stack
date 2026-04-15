import { useState, useEffect } from "react";
import { fetchCommandersByTheme } from "../lib/edhrec.js";
import { getCardImage, formatManaCost } from "../lib/scryfall.js";

export default function CommanderPickerScreen({ themes, onCommanderSelected, onBack }) {
  const [commanders, setCommanders] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchCommandersByTheme(themes, { signal: ctrl.signal })
      .then(cards => { setCommanders(cards); setLoading(false); })
      .catch(e => {
        if (e.name !== "AbortError") {
          setError("Couldn't load commanders — check your connection.");
          setLoading(false);
        }
      });
    return () => ctrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'IBM Plex Mono', monospace",
      maxWidth: 600,
      margin: "0 auto",
      width: "100%",
    }}>

      {/* Header */}
      <div style={{
        padding: "20px 20px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 12, letterSpacing: 2, cursor: "pointer", padding: 0 }}
        >
          ← BACK
        </button>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 22,
          letterSpacing: 4,
          color: "var(--primary)",
          marginTop: 12,
          lineHeight: 1,
        }}>
          CHOOSE YOUR COMMANDER
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginTop: 4 }}>
          {themes.map(t => t.name).join(" · ")}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 40px" }}>
        {loading && (
          <div style={{ textAlign: "center", paddingTop: 60, color: "var(--muted)", fontSize: 11, letterSpacing: 2 }}>
            FINDING COMMANDERS…
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", paddingTop: 60, color: "var(--danger)", fontSize: 11, letterSpacing: 1 }}>
            {error}
          </div>
        )}

        {!loading && !error && commanders.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 60, color: "var(--muted)", fontSize: 11, letterSpacing: 2 }}>
            NO COMMANDERS FOUND
            <br />
            <span style={{ opacity: 0.5, fontSize: 9 }}>try different themes</span>
          </div>
        )}

        {!loading && commanders.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {commanders.map(card => {
              const art     = getCardImage(card, "normal");
              const artCrop = getCardImage(card, "art_crop");
              const ci      = card.color_identity ?? [];
              return (
                <button
                  key={card.id}
                  onClick={() => onCommanderSelected(card)}
                  style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{
                    background: "var(--panel)",
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transition: "border-color 0.15s, transform 0.15s",
                  }}>
                    {art ? (
                      <img
                        src={art}
                        alt={card.name}
                        style={{ width: "100%", display: "block", borderRadius: "10px 10px 0 0" }}
                      />
                    ) : artCrop ? (
                      <img
                        src={artCrop}
                        alt={card.name}
                        style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", aspectRatio: "3/4",
                        background: "var(--panel2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "var(--muted)",
                        padding: 8, textAlign: "center",
                      }}>
                        {card.name}
                      </div>
                    )}
                    <div style={{ padding: "6px 8px 8px" }}>
                      <div style={{
                        fontSize: 10,
                        color: "var(--text)",
                        fontWeight: 600,
                        lineHeight: 1.3,
                        letterSpacing: 0.3,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {card.name}
                      </div>
                      <div style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>
                        {ci.join("") || "C"} · {formatManaCost(card.mana_cost) || "—"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
