export const NAV_HEIGHT = 60;

function DiscoverIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 12l10 10 10-10L12 2z"/>
      <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" opacity="0.6"/>
    </svg>
  );
}

function BuildIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 12l10 5 10-5" opacity="0.6"/>
      <path d="M2 17l10 5 10-5" opacity="0.35"/>
    </svg>
  );
}

function DecksIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6"/>
      <path d="M9 3v5l-4.5 7A2 2 0 0 0 6.22 18h11.56a2 2 0 0 0 1.72-3L15 8V3"/>
      <path d="M6.5 13.5h11" opacity="0.5"/>
    </svg>
  );
}

export default function BottomNav({ screen, onGoToStack, onGoToPile, onGoToMaybe, onGoToTags, onGoToProfile }) {
  const isGhost = screen === "swipe";

  const gold          = "#C9A84C";
  const activeColor   = isGhost ? "rgba(201,168,76,0.8)"  : "#c0c0c0";
  const inactiveColor = isGhost ? "rgba(255,255,255,0.15)" : "#808080";

  const tabs = [
    {
      id: "discover",
      label: "DISCOVER",
      Icon: DiscoverIcon,
      isActive: screen === "search" || screen === "swipe",
      onClick: onGoToStack,
    },
    {
      id: "build",
      label: "BUILD",
      Icon: BuildIcon,
      isActive: screen === "pile" || screen === "maybe",
      onClick: onGoToPile,
    },
    {
      id: "decks",
      label: "DECKS",
      Icon: DecksIcon,
      isActive: screen === "brews",
      onClick: onGoToProfile,
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
        {tabs.map(({ id, label, Icon, isActive, onClick }) => {
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
              {/* active indicator — ghost mode only (replaced by bevel in chrome mode) */}
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
              <Icon color={color} />
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
