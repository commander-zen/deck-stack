import { useState } from "react";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { getSettings, updateSetting } from "../lib/settings.js";

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        flexShrink: 0,
        width: 44,
        height: 26,
        borderRadius: 13,
        border: "none",
        cursor: "pointer",
        background: on ? "var(--primary)" : "rgba(255,255,255,0.12)",
        position: "relative",
        transition: "background 0.2s ease",
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: on ? 21 : 3,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

function SettingRow({ label, subtitle, value, onChange }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          color: "var(--text)",
          letterSpacing: "0.02em",
          marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 12,
          color: "var(--muted)",
          lineHeight: 1.4,
        }}>
          {subtitle}
        </div>
      </div>
      <Toggle on={value} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11,
      letterSpacing: "0.18em",
      color: "var(--muted)",
      paddingTop: 24,
      paddingBottom: 6,
    }}>
      {title}
    </div>
  );
}

export default function SettingsScreen({ onBack }) {
  const [settings, setSettings] = useState(getSettings);

  function toggle(key) {
    const next = updateSetting(key, !settings[key]);
    setSettings(next);
  }

  const bottomPad = `calc(max(18px, env(safe-area-inset-bottom)) + ${NAV_HEIGHT}px + 18px)`;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        maxWidth: 600, margin: "0 auto", width: "100%",
        background: "rgba(13,13,15,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 18px", height: 56, gap: 10,
        }}>
          <button
            onClick={onBack}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 8px 8px 0", color: "var(--muted)",
              display: "flex", alignItems: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{
            flex: 1,
            fontSize: 22, letterSpacing: 4,
            color: "var(--primary)",
          }}>
            SETTINGS
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 600, margin: "0 auto", width: "100%",
        padding: "0 18px",
        paddingBottom: bottomPad,
      }}>

        <SectionHeader title="SWIPE EXPERIENCE" />
        <SettingRow
          label="Haptics"
          subtitle="Vibrate on card swipe."
          value={settings.haptics}
          onChange={() => toggle("haptics")}
        />
        <SettingRow
          label="Swipe Animations"
          subtitle="Animate cards sliding off the stack."
          value={settings.swipeAnimations}
          onChange={() => toggle("swipeAnimations")}
        />

        <SectionHeader title="SEARCH" />
        <SettingRow
          label="Loading Animation"
          subtitle="Show the full loading animation during search."
          value={settings.fullLoadingAnimation}
          onChange={() => toggle("fullLoadingAnimation")}
        />
        <SettingRow
          label="Raw Query Mode"
          subtitle="Type Scryfall syntax directly instead of natural language."
          value={settings.rawQueryMode}
          onChange={() => toggle("rawQueryMode")}
        />

      </div>
    </div>
  );
}
