import { useRef } from "react";

export const NAV_HEIGHT = 60;

export default function BottomNav({ screen, onSearch, onBrew, onSearchDoubleTap, onBrewDoubleTap }) {
  const isGhost = screen === "swipe";
  const lastTapRef = useRef({ tab: null, time: 0 });

  const activeColor   = isGhost ? "rgba(201,168,76,0.8)"  : "#c0c0c0";
  const inactiveColor = isGhost ? "rgba(255,255,255,0.15)" : "#808080";

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
        background: isGhost ? "transparent" : "var(--color-chrome)",
        borderTop:    isGhost ? "0.5px solid rgba(255,255,255,0.04)" : "2px solid var(--bevel-light)",
        borderLeft:   isGhost ? "none" : "2px solid var(--bevel-light)",
        borderRight:  isGhost ? "none" : "2px solid var(--bevel-dark)",
        borderBottom: isGhost ? "none" : "2px solid var(--bevel-dark)",
        backdropFilter: "none",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(({ id, label, icon, isActive, onClick }) => {
          const color = isActive ? activeColor : inactiveColor;
          return (
            <button
              key={id}
              onClick={onClick}
              style={{
                flex: 1,
                height: NAV_HEIGHT,
                background: isGhost ? "transparent" : isActive ? "var(--color-surface-raised)" : "var(--color-chrome)",
                borderTop:    (!isGhost && isActive) ? "2px solid var(--bevel-dark)"  : "none",
                borderLeft:   (!isGhost && isActive) ? "2px solid var(--bevel-dark)"  : "none",
                borderRight:  (!isGhost && isActive) ? "2px solid var(--bevel-light)" : "none",
                borderBottom: (!isGhost && isActive) ? "2px solid var(--bevel-light)" : "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                paddingTop: 4,
                position: "relative",
              }}
            >
              {/* ghost mode active indicator */}
              {isActive && isGhost && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 1.5,
                  height: 1.5,
                  background: "rgba(201,168,76,0.5)",
                  borderRadius: 1,
                }}/>
              )}
              <span style={{
                fontSize: 20, lineHeight: 1,
                opacity: isGhost ? 0.6 : 1,
                filter: isActive && !isGhost ? "grayscale(0)" : "grayscale(0.3)",
              }}>{icon}</span>
              {!isGhost && (
                <span style={{
                  fontFamily: "var(--font-system)",
                  fontSize: "var(--font-size-sm)",
                  letterSpacing: "0.05em",
                  color: isActive ? "var(--color-chrome)" : "var(--color-text-chrome)",
                  transition: "color 0.15s",
                }}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
