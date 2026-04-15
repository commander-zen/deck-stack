import { useState } from "react";
import { THEMES } from "../lib/edhrec.js";

export default function StrategyScreen({ onNext, onBack }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (slug) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const activeThemes = THEMES.filter(t => selected.has(t.slug));

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
      <div style={{ padding: "20px 20px 16px", flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 12, letterSpacing: 2, cursor: "pointer", padding: 0 }}
        >
          ← BACK
        </button>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: 5,
          color: "var(--primary)",
          marginTop: 14,
          lineHeight: 1,
        }}>
          BUILD BY STRATEGY
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 2, marginTop: 5 }}>
          PICK ONE OR MORE THEMES
        </div>
      </div>

      {/* Theme grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {THEMES.map(theme => {
            const active = selected.has(theme.slug);
            return (
              <button
                key={theme.slug}
                onClick={() => toggle(theme.slug)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: `1px solid ${active ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(91,143,255,0.15)" : "var(--panel)",
                  color: active ? "var(--primary)" : "var(--text)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 15,
                  letterSpacing: 2,
                  cursor: "pointer",
                  transition: "all 0.12s",
                  textAlign: "left",
                }}
              >
                {theme.name}
                {active && <span style={{ float: "right", opacity: 0.7 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 20px", paddingBottom: "max(24px, env(safe-area-inset-bottom))", flexShrink: 0 }}>
        <button
          onClick={() => activeThemes.length > 0 && onNext(activeThemes)}
          disabled={activeThemes.length === 0}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: "none",
            background: activeThemes.length > 0 ? "var(--primary)" : "rgba(255,255,255,0.06)",
            color: activeThemes.length > 0 ? "#fff" : "var(--muted)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            letterSpacing: 4,
            cursor: activeThemes.length > 0 ? "pointer" : "default",
            transition: "all 0.15s",
            boxShadow: activeThemes.length > 0 ? "0 6px 24px rgba(91,143,255,0.3)" : "none",
          }}
        >
          {activeThemes.length > 0
            ? `FIND COMMANDERS (${activeThemes.length} ${activeThemes.length === 1 ? "THEME" : "THEMES"}) →`
            : "SELECT A THEME"}
        </button>
      </div>
    </div>
  );
}
