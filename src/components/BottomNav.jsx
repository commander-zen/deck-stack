import { useRef } from "react";

export const NAV_HEIGHT = 60;

export default function BottomNav({ screen, onSearch, onBrew, onSearchDoubleTap, onBrewDoubleTap }) {
  const lastTapRef = useRef({ tab: null, time: 0 });

  function handleTap(tabId, singleAction, doubleTapAction) {
    const now = Date.now();
    const { tab, time } = lastTapRef.current;
    if (tab === tabId && now - time < 400) {
      lastTapRef.current = { tab: null, time: 0 };
      doubleTapAction?.();
    } else {
      lastTapRef.current = { tab: tabId, time: now };
      singleAction?.();
    }
  }

  const tabs = [
    {
      id: "search",
      label: "SEARCH",
      icon: "🔍",
      isActive: screen === "search" || screen === "swipe",
      onClick: () => handleTap("search", onSearch, onSearchDoubleTap),
    },
    {
      id: "brew",
      label: "BREW",
      icon: "⚗️",
      isActive: screen === "pile" || screen === "maybe" || screen === "brews" || screen === "settings" || screen === "deck-detail",
      onClick: () => handleTap("brew", onBrew, onBrewDoubleTap),
    },
  ];

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        background: "var(--color-chrome)",
        borderTop:    "2px solid var(--bevel-light)",
        borderLeft:   "2px solid var(--bevel-light)",
        borderRight:  "2px solid var(--bevel-dark)",
        borderBottom: "2px solid var(--bevel-dark)",
        backdropFilter: "none",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(({ id, label, icon, isActive, onClick }) => (
          <button
            key={id}
            onClick={onClick}
            style={{
              flex: 1,
              height: NAV_HEIGHT,
              background: isActive ? "var(--color-surface-raised)" : "var(--color-chrome)",
              borderTop:    isActive ? "2px solid var(--bevel-dark)"  : "none",
              borderLeft:   isActive ? "2px solid var(--bevel-dark)"  : "none",
              borderRight:  isActive ? "2px solid var(--bevel-light)" : "none",
              borderBottom: isActive ? "2px solid var(--bevel-light)" : "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingTop: 4,
            }}
          >
            <span style={{
              fontSize: 20, lineHeight: 1,
              filter: isActive ? "grayscale(0)" : "grayscale(0.3)",
            }}>{icon}</span>
            <span style={{
              fontFamily: "var(--font-system)",
              fontSize: "var(--font-size-sm)",
              letterSpacing: "0.05em",
              color: isActive ? "var(--color-chrome)" : "var(--color-text-chrome)",
              transition: "color 0.15s",
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
