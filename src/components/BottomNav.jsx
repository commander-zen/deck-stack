export const NAV_HEIGHT = 56;

export default function BottomNav({ screen, pileCount, onTab, onBrews }) {
  const tabs = [
    { id: "swipe", label: "SWIPE",  onClick: () => onTab("swipe") },
    { id: "pile",  label: "PILE",   onClick: () => onTab("pile"), count: pileCount },
    { id: "brews", label: "BREWS",  onClick: onBrews, icon: "📚" },
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        background: "rgba(13,13,15,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(({ id, label, onClick, count, icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={onClick}
              style={{
                flex: 1,
                height: NAV_HEIGHT,
                background: "transparent",
                border: "none",
                borderTop: active
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
                color: active ? "var(--primary)" : "rgba(255,255,255,0.38)",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13,
                letterSpacing: 3,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                paddingTop: 4,
              }}
            >
              {icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {label}
                {count != null && (
                  <span style={{
                    fontSize: 10,
                    background: active ? "rgba(91,143,255,0.2)" : "rgba(255,255,255,0.07)",
                    color: active ? "var(--primary)" : "rgba(255,255,255,0.35)",
                    padding: "0px 5px",
                    borderRadius: 8,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    letterSpacing: 0,
                    minWidth: 16,
                    textAlign: "center",
                  }}>
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
