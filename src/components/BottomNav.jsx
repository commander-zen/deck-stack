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
      icon: (
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* cork */}
          <rect x="8" y="0" width="8" height="4" fill="#c8a46e" />
          <rect x="7" y="1" width="10" height="2" fill="#b8904e" />
          {/* neck */}
          <rect x="9" y="4" width="6" height="4" fill="#c0c0c0" />
          <rect x="10" y="4" width="4" height="4" fill="#e0e0e0" />
          {/* bottle body outline */}
          <rect x="3" y="8" width="18" height="18" rx="4" fill="#c0c0c0" />
          <rect x="4" y="9" width="16" height="16" rx="3" fill="#e8e8e8" />
          {/* liquid fill */}
          <rect x="4" y="16" width="16" height="9" rx="0" fill="#cc2233" />
          <rect x="4" y="22" width="16" height="3" rx="0" fill="#aa1122" style={{borderRadius: "0 0 3px 3px"}} />
          {/* shine */}
          <rect x="6" y="10" width="3" height="8" rx="1" fill="rgba(255,255,255,0.45)" />
          {/* cross */}
          <rect x="10" y="12" width="4" height="1.5" fill="white" opacity="0.9" />
          <rect x="11.25" y="11" width="1.5" height="4" fill="white" opacity="0.9" />
        </svg>
      ),
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
